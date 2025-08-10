const express = require('express');
const db = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const { validate, articleSchema, articleUpdateSchema } = require('../utils/validation');

const router = express.Router();

// @route   GET /api/v1/articles
// @desc    Get all articles with filtering and pagination
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = 'published',
      category,
      search,
      featured,
      author_id,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Simple query without complex WHERE conditions for testing
    const articlesQuery = `
      SELECT 
        a.*,
        c.name as category_name,
        c.slug as category_slug,
        c.color as category_color,
        u.name as author_name,
        u.email as author_email
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      ORDER BY a.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    console.log('SQL Query:', articlesQuery);
    const [articles] = await db.promise.execute(articlesQuery);

    // Get total count
    const [countResult] = await db.promise.execute('SELECT COUNT(*) as total FROM articles');
    const total = countResult[0].total;

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
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/v1/articles/:id
// @desc    Get single article by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [articles] = await db.promise.execute(`
      SELECT 
        a.*,
        c.name as category_name,
        c.slug as category_slug,
        c.color as category_color,
        u.name as author_name,
        u.email as author_email
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.id = ?
    `, [id]);

    if (articles.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Article not found'
      });
    }

    const article = articles[0];

    // Increment view count if article is published
    if (article.status === 'published') {
      await db.promise.execute(
        'UPDATE articles SET views = views + 1 WHERE id = ?',
        [id]
      );
      article.views += 1;
    }

    // Format article
    const formattedArticle = {
      ...article,
      featured: Boolean(article.featured),
      created_at: article.created_at.toISOString(),
      updated_at: article.updated_at ? article.updated_at.toISOString() : null,
      publish_date: article.publish_date ? article.publish_date.toISOString() : null
    };

    res.json({
      error: false,
      data: formattedArticle
    });
  } catch (error) {
    console.error('Get article error:', error);
    
    // More specific error handling
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(400).json({
        error: true,
        message: 'Invalid article data'
      });
    }
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        error: true,
        message: 'Database configuration error'
      });
    }
    
    res.status(500).json({
      error: true,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/v1/articles
// @desc    Create new article
// @access  Private (Author, Editor, Admin)
router.post('/', auth, authorize('author', 'editor', 'admin'), validate(articleSchema), async (req, res) => {
  try {
    const {
      title,
      excerpt,
      content,
      category_id,
      image,
      featured = false,
      status = 'draft',
      tags,
      seo_title,
      seo_description,
      publish_date
    } = req.body;

    // Check if category exists
    const [categories] = await db.promise.execute(
      'SELECT id FROM categories WHERE id = ?',
      [category_id]
    );

    if (categories.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Category not found'
      });
    }

    // Create article
    const [result] = await db.promise.execute(`
      INSERT INTO articles (
        title, excerpt, content, category_id, author_id, image, 
        featured, status, tags, seo_title, seo_description, 
        publish_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      title, excerpt, content, category_id, req.user.id, image,
      featured ? 1 : 0, status, tags, seo_title, seo_description,
      publish_date || null
    ]);

    // Get the created article
    const [newArticle] = await db.promise.execute(`
      SELECT 
        a.*,
        c.name as category_name,
        c.slug as category_slug,
        u.name as author_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.id = ?
    `, [result.insertId]);

    const formattedArticle = {
      ...newArticle[0],
      featured: Boolean(newArticle[0].featured),
      created_at: newArticle[0].created_at.toISOString()
    };

    res.status(201).json({
      error: false,
      message: 'Article created successfully',
      data: formattedArticle
    });
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   PUT /api/v1/articles/:id
// @desc    Update article
// @access  Private (Author, Editor, Admin)
router.put('/:id', auth, authorize('author', 'editor', 'admin'), validate(articleUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if article exists
    const [articles] = await db.promise.execute(
      'SELECT author_id FROM articles WHERE id = ?',
      [id]
    );

    if (articles.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Article not found'
      });
    }

    // Check permissions (author can only edit their own articles unless they're admin/editor)
    if (req.user.role === 'author' && articles[0].author_id !== req.user.id) {
      return res.status(403).json({
        error: true,
        message: 'You can only edit your own articles'
      });
    }

    // Build update query
    const updateFields = [];
    const updateParams = [];

    Object.keys(updateData).forEach(key => {
      if (key !== 'id' && updateData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateParams.push(updateData[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'No fields to update'
      });
    }

    updateFields.push('updated_at = NOW()');
    updateParams.push(id);

    // Update article
    await db.promise.execute(
      `UPDATE articles SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    // Get updated article
    const [updatedArticle] = await db.promise.execute(`
      SELECT 
        a.*,
        c.name as category_name,
        c.slug as category_slug,
        u.name as author_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.id = ?
    `, [id]);

    const formattedArticle = {
      ...updatedArticle[0],
      featured: Boolean(updatedArticle[0].featured),
      created_at: updatedArticle[0].created_at.toISOString(),
      updated_at: updatedArticle[0].updated_at.toISOString()
    };

    res.json({
      error: false,
      message: 'Article updated successfully',
      data: formattedArticle
    });
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   DELETE /api/v1/articles/:id
// @desc    Delete article
// @access  Private (Editor, Admin)
router.delete('/:id', auth, authorize('editor', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if article exists
    const [articles] = await db.promise.execute(
      'SELECT id FROM articles WHERE id = ?',
      [id]
    );

    if (articles.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Article not found'
      });
    }

    // Delete article
    await db.promise.execute('DELETE FROM articles WHERE id = ?', [id]);

    res.json({
      error: false,
      message: 'Article deleted successfully'
    });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/v1/articles/:id/publish
// @desc    Publish article
// @access  Private (Editor, Admin)
router.post('/:id/publish', auth, authorize('editor', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.promise.execute(
      'UPDATE articles SET status = "published", publish_date = NOW() WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: true,
        message: 'Article not found'
      });
    }

    res.json({
      error: false,
      message: 'Article published successfully'
    });
  } catch (error) {
    console.error('Publish article error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/v1/articles/:id/unpublish
// @desc    Unpublish article
// @access  Private (Editor, Admin)
router.post('/:id/unpublish', auth, authorize('editor', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.promise.execute(
      'UPDATE articles SET status = "draft" WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: true,
        message: 'Article not found'
      });
    }

    res.json({
      error: false,
      message: 'Article unpublished successfully'
    });
  } catch (error) {
    console.error('Unpublish article error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/v1/articles/:id/feature
// @desc    Toggle article featured status
// @access  Private (Editor, Admin)
router.post('/:id/feature', auth, authorize('editor', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get current featured status
    const [articles] = await db.promise.execute(
      'SELECT featured FROM articles WHERE id = ?',
      [id]
    );

    if (articles.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Article not found'
      });
    }

    const newFeaturedStatus = !articles[0].featured;

    await db.promise.execute(
      'UPDATE articles SET featured = ? WHERE id = ?',
      [newFeaturedStatus ? 1 : 0, id]
    );

    res.json({
      error: false,
      message: `Article ${newFeaturedStatus ? 'featured' : 'unfeatured'} successfully`,
      data: { featured: newFeaturedStatus }
    });
  } catch (error) {
    console.error('Toggle featured error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/v1/articles/featured
// @desc    Get featured articles
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const [articles] = await db.promise.execute(`
      SELECT 
        a.*,
        c.name as category_name,
        c.slug as category_slug,
        u.name as author_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.featured = 1 AND a.status = 'published'
      ORDER BY a.publish_date DESC
      LIMIT ?
    `, [parseInt(limit)]);

    const formattedArticles = articles.map(article => ({
      ...article,
      featured: Boolean(article.featured),
      created_at: article.created_at.toISOString(),
      publish_date: article.publish_date ? article.publish_date.toISOString() : null
    }));

    res.json({
      error: false,
      data: formattedArticles
    });
  } catch (error) {
    console.error('Get featured articles error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
