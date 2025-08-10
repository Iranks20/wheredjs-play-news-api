const express = require('express');
const db = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const { validate, categorySchema } = require('../utils/validation');

const router = express.Router();

// @route   GET /api/v1/categories
// @desc    Get all categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const [categories] = await db.promise.execute(`
      SELECT 
        c.*,
        COUNT(a.id) as article_count,
        SUM(a.views) as total_views
      FROM categories c
      LEFT JOIN articles a ON c.id = a.category_id AND a.status = 'published'
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    res.json({
      error: false,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/v1/categories/:id
// @desc    Get single category
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [categories] = await db.promise.execute(`
      SELECT 
        c.*,
        COUNT(a.id) as article_count,
        SUM(a.views) as total_views
      FROM categories c
      LEFT JOIN articles a ON c.id = a.category_id AND a.status = 'published'
      WHERE c.id = ?
      GROUP BY c.id
    `, [id]);

    if (categories.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Category not found'
      });
    }

    res.json({
      error: false,
      data: categories[0]
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/v1/categories
// @desc    Create new category
// @access  Private (Editor, Admin)
router.post('/', auth, authorize('editor', 'admin'), validate(categorySchema), async (req, res) => {
  try {
    const { name, slug, description, color } = req.body;

    // Check if category with same slug exists
    const [existingCategories] = await db.promise.execute(
      'SELECT id FROM categories WHERE slug = ?',
      [slug]
    );

    if (existingCategories.length > 0) {
      return res.status(400).json({
        error: true,
        message: 'Category with this slug already exists'
      });
    }

    // Create category
    const [result] = await db.promise.execute(`
      INSERT INTO categories (name, slug, description, color, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `, [name, slug, description, color]);

    // Get the created category
    const [newCategory] = await db.promise.execute(
      'SELECT * FROM categories WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      error: false,
      message: 'Category created successfully',
      data: newCategory[0]
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   PUT /api/v1/categories/:id
// @desc    Update category
// @access  Private (Editor, Admin)
router.put('/:id', auth, authorize('editor', 'admin'), validate(categorySchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, color } = req.body;

    // Check if category exists
    const [categories] = await db.promise.execute(
      'SELECT id FROM categories WHERE id = ?',
      [id]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Category not found'
      });
    }

    // Check if slug is already used by another category
    const [existingCategories] = await db.promise.execute(
      'SELECT id FROM categories WHERE slug = ? AND id != ?',
      [slug, id]
    );

    if (existingCategories.length > 0) {
      return res.status(400).json({
        error: true,
        message: 'Category with this slug already exists'
      });
    }

    // Update category
    await db.promise.execute(`
      UPDATE categories 
      SET name = ?, slug = ?, description = ?, color = ?, updated_at = NOW()
      WHERE id = ?
    `, [name, slug, description, color, id]);

    // Get updated category
    const [updatedCategory] = await db.promise.execute(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );

    res.json({
      error: false,
      message: 'Category updated successfully',
      data: updatedCategory[0]
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   DELETE /api/v1/categories/:id
// @desc    Delete category
// @access  Private (Admin)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const [categories] = await db.promise.execute(
      'SELECT id FROM categories WHERE id = ?',
      [id]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Category not found'
      });
    }

    // Check if category has articles
    const [articles] = await db.promise.execute(
      'SELECT COUNT(*) as count FROM articles WHERE category_id = ?',
      [id]
    );

    if (articles[0].count > 0) {
      return res.status(400).json({
        error: true,
        message: 'Cannot delete category with existing articles'
      });
    }

    // Delete category
    await db.promise.execute('DELETE FROM categories WHERE id = ?', [id]);

    res.json({
      error: false,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/v1/categories/:id/articles
// @desc    Get articles by category
// @access  Public
router.get('/:id/articles', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, status = 'published' } = req.query;

    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM articles a
      WHERE a.category_id = ? ${status !== 'all' ? 'AND a.status = ?' : ''}
    `;
    const countParams = status !== 'all' ? [id, status] : [id];
    const [countResult] = await db.promise.execute(countQuery, countParams);
    const total = countResult[0].total;

    // Get articles
    const articlesQuery = `
      SELECT 
        a.*,
        c.name as category_name,
        c.slug as category_slug,
        u.name as author_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.category_id = ? ${status !== 'all' ? 'AND a.status = ?' : ''}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const articlesParams = status !== 'all' ? [id, status, parseInt(limit), offset] : [id, parseInt(limit), offset];
    const [articles] = await db.promise.execute(articlesQuery, articlesParams);

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
        }
      }
    });
  } catch (error) {
    console.error('Get category articles error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
