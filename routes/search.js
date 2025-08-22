const express = require('express');
const db = require('../config/database');
const { validateQuery, searchSchema } = require('../utils/validation');

const router = express.Router();

// @route   GET /api/v1/search/articles
// @desc    Search articles
// @access  Public
router.get('/articles', validateQuery(searchSchema), async (req, res) => {
  try {
    const { q, category, status = 'published', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    // Search query
    conditions.push('(a.title LIKE ? OR a.excerpt LIKE ? OR a.content LIKE ?)');
    const searchTerm = `%${q}%`;
    params.push(searchTerm, searchTerm, searchTerm);

    // Status filter
    if (status !== 'all') {
      conditions.push('a.status = ?');
      params.push(status);
    }

    // Category filter
    if (category) {
      conditions.push('c.slug = ?');
      params.push(category);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      ${whereClause}
    `;

    const [countResult] = await db.promise.execute(countQuery, params);
    const total = countResult[0].total;

    // Get articles
    const articlesQuery = `
      SELECT 
        a.*,
        c.name as category_name,
        c.slug as category_slug,
        c.color as category_color,
        u.name as author_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;

    const [articles] = await db.promise.execute(articlesQuery, params);

    // Format articles
    const formattedArticles = articles.map(article => ({
      ...article,
      featured: Boolean(article.featured),
      created_at: article.created_at.toISOString(),
      updated_at: article.updated_at ? article.updated_at.toISOString() : null,
      publish_date: article.publish_date ? article.publish_date.toISOString() : null
    }));

    res.json({
      error: false,
      data: {
        articles: formattedArticles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        search: {
          query: q,
          category,
          status
        }
      }
    });
  } catch (error) {
    console.error('Search articles error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/v1/search/suggestions
// @desc    Get search suggestions
// @access  Public
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        error: false,
        data: []
      });
    }

    const searchTerm = `%${q}%`;

    // Get article title suggestions
    const [titleSuggestions] = await db.promise.execute(`
      SELECT DISTINCT title
      FROM articles
      WHERE title LIKE ? AND status = 'published'
      LIMIT 5
    `, [searchTerm]);

    // Get category suggestions
    const [categorySuggestions] = await db.promise.execute(`
      SELECT DISTINCT name, slug
      FROM categories
      WHERE name LIKE ?
      LIMIT 5
    `, [searchTerm]);

    // Get author suggestions
    const [authorSuggestions] = await db.promise.execute(`
      SELECT DISTINCT name
      FROM users
      WHERE name LIKE ? AND status = 'active'
      LIMIT 5
    `, [searchTerm]);

    const suggestions = [
      ...titleSuggestions.map(item => ({ type: 'title', value: item.title })),
      ...categorySuggestions.map(item => ({ type: 'category', value: item.name, slug: item.slug })),
      ...authorSuggestions.map(item => ({ type: 'author', value: item.name }))
    ];

    res.json({
      error: false,
      data: suggestions.slice(0, 10) // Limit to 10 total suggestions
    });
  } catch (error) {
    console.error('Get search suggestions error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
