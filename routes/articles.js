const express = require('express');
const db = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const { validate, articleSchema, articleUpdateSchema } = require('../utils/validation');
const { validateAndFormatDate } = require('../utils/datetime');
const { handleRouteError } = require('../utils/errorHandler');
const { validateAndProcessMedia, detectMediaType } = require('../utils/mediaUtils');

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
      is_breaking_news: Boolean(article.is_breaking_news || false),
      is_latest_headline: Boolean(article.is_latest_headline || false),
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
    handleRouteError(error, res, 'Get articles');
  }
});

// @route   GET /api/v1/articles/featured
// @desc    Get featured articles
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

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
      LIMIT 5
    `);

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

// @route   GET /api/v1/articles/breaking-news
// @desc    Get breaking news articles
// @access  Public
router.get('/breaking-news', async (req, res) => {
  try {
    console.log('Breaking news request - query:', req.query);
    const limit = parseInt(req.query.limit) || 6;
    console.log('Parsed limit:', limit, 'Type:', typeof limit);

    const [articles] = await db.promise.execute(`
      SELECT 
        a.*,
        c.name as category_name,
        c.slug as category_slug,
        u.name as author_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.is_breaking_news = 1 AND a.status = 'published'
      ORDER BY a.created_at DESC
      LIMIT 6
    `);

    const formattedArticles = articles.map(article => ({
      ...article,
      featured: Boolean(article.featured),
      is_breaking_news: Boolean(article.is_breaking_news),
      is_latest_headline: Boolean(article.is_latest_headline || false),
      created_at: article.created_at ? article.created_at.toISOString() : null,
      publish_date: article.publish_date ? article.publish_date.toISOString() : null
    }));

    res.json({
      error: false,
      data: formattedArticles
    });
  } catch (error) {
    console.error('Get breaking news error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/v1/articles/latest-headlines
// @desc    Get latest headline articles
// @access  Public
router.get('/latest-headlines', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    const [articles] = await db.promise.execute(`
      SELECT 
        a.*,
        c.name as category_name,
        c.slug as category_slug,
        u.name as author_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.is_latest_headline = 1 AND a.status = 'published'
      ORDER BY a.created_at DESC
      LIMIT 8
    `);

    const formattedArticles = articles.map(article => ({
      ...article,
      featured: Boolean(article.featured),
      is_breaking_news: Boolean(article.is_breaking_news || false),
      is_latest_headline: Boolean(article.is_latest_headline),
      created_at: article.created_at ? article.created_at.toISOString() : null,
      publish_date: article.publish_date ? article.publish_date.toISOString() : null
    }));

    res.json({
      error: false,
      data: formattedArticles
    });
  } catch (error) {
    console.error('Get latest headlines error:', error);
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

    // Check if the parameter is a number (ID) or string (slug)
    const isNumeric = !isNaN(id) && !isNaN(parseFloat(id));
    
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
      WHERE ${isNumeric ? 'a.id = ?' : 'a.slug = ?'}
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
        `UPDATE articles SET views = views + 1 WHERE ${isNumeric ? 'id = ?' : 'slug = ?'}`,
        [id]
      );
      article.views += 1;
    }

    // Get related articles from the same category (max 3)
    const [relatedArticles] = await db.promise.execute(`
      SELECT 
        a.id,
        a.title,
        a.excerpt,
        a.image,
        a.embedded_media,
        a.media_type,
        a.slug,
        a.created_at,
        a.views,
        c.name as category_name,
        c.slug as category_slug,
        u.name as author_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.category_id = ? 
        AND a.id != ? 
        AND a.status = 'published'
      ORDER BY a.created_at DESC
      LIMIT 3
    `, [article.category_id, id]);

    // Format related articles
    const formattedRelatedArticles = relatedArticles.map(related => ({
      ...related,
      created_at: related.created_at.toISOString(),
      publishedAt: getTimeAgo(related.created_at)
    }));

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
      data: {
        article: formattedArticle,
        relatedArticles: formattedRelatedArticles
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Get single article');
  }
});

// Helper function to get time ago
function getTimeAgo(date) {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now - past) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
}

// @route   POST /api/v1/articles
// @desc    Create new article
// @access  Private (Author, Editor, Admin, Writer)
router.post('/', auth, authorize('author', 'editor', 'admin', 'writer'), validate(articleSchema), async (req, res) => {
  try {
    const {
      title,
      excerpt,
      content,
      category_id,
      image,
      embedded_media,
      media_type = 'image',
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

    // Handle datetime conversion for publish_date
    let formattedPublishDate = null;
    if (publish_date) {
      try {
        formattedPublishDate = validateAndFormatDate(publish_date);
      } catch (error) {
        return res.status(400).json({
          error: true,
          message: error.message
        });
      }
    }

    // Handle embedded media validation and mutual exclusivity
    let processedMedia = null;
    let finalMediaType = media_type;
    let finalImage = image;
    
    if (embedded_media && embedded_media.trim()) {
      // Auto-detect media type if not specified
      if (media_type === 'image') {
        finalMediaType = detectMediaType(embedded_media) || 'image';
      }
      
      // Validate and process the media URL
      processedMedia = validateAndProcessMedia(embedded_media, finalMediaType);
      
      if (!processedMedia) {
        return res.status(400).json({
          error: true,
          message: `Invalid ${finalMediaType} URL format`
        });
      }
      
      // Clear image when embedded media is provided
      finalImage = null;
    } else if (image && image.trim()) {
      // Clear embedded media when image is provided
      finalMediaType = 'image';
    }

    // Create article
    const [result] = await db.promise.execute(`
      INSERT INTO articles (
        title, excerpt, content, category_id, author_id, image, 
        embedded_media, media_type, featured, status, tags, seo_title, seo_description, 
        publish_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      title, excerpt, content, category_id, req.user.id, finalImage,
      processedMedia ? processedMedia.originalUrl : null,
      finalMediaType,
      featured ? 1 : 0, status, tags, seo_title, seo_description,
      formattedPublishDate
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
    handleRouteError(error, res, 'Create article');
  }
});

// @route   PUT /api/v1/articles/:id
// @desc    Update article
// @access  Private (Author, Editor, Admin, Writer)
router.put('/:id', auth, authorize('author', 'editor', 'admin', 'writer'), validate(articleUpdateSchema), async (req, res) => {
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

    // Check permissions (author/writer can only edit their own articles unless they're admin/editor)
    if ((req.user.role === 'author' || req.user.role === 'writer') && articles[0].author_id !== req.user.id) {
      return res.status(403).json({
        error: true,
        message: 'You can only edit your own articles'
      });
    }

    // Handle embedded media validation and mutual exclusivity
    if (updateData.embedded_media && updateData.embedded_media.trim()) {
      const mediaType = updateData.media_type || 'image';
      let finalMediaType = mediaType;
      
      // Auto-detect media type if not specified
      if (mediaType === 'image') {
        finalMediaType = detectMediaType(updateData.embedded_media) || 'image';
      }
      
      // Validate and process the media URL
      const processedMedia = validateAndProcessMedia(updateData.embedded_media, finalMediaType);
      
      if (!processedMedia) {
        return res.status(400).json({
          error: true,
          message: `Invalid ${finalMediaType} URL format`
        });
      }
      
      // Update the data with processed values
      updateData.embedded_media = processedMedia.originalUrl;
      updateData.media_type = finalMediaType;
      
      // Clear image when embedded media is provided
      updateData.image = null;
    } else if (updateData.image && updateData.image.trim()) {
      // Clear embedded media when image is provided
      updateData.embedded_media = null;
      updateData.media_type = 'image';
    }

    // Build update query
    const updateFields = [];
    const updateParams = [];

    Object.keys(updateData).forEach(key => {
      if (key !== 'id' && updateData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        
        // Handle datetime conversion for publish_date
        if (key === 'publish_date' && updateData[key]) {
          try {
            updateParams.push(validateAndFormatDate(updateData[key]));
          } catch (error) {
            return res.status(400).json({
              error: true,
              message: error.message
            });
          }
        } else {
          updateParams.push(updateData[key]);
        }
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
    handleRouteError(error, res, 'Update article');
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

    // Check if article has a future publish_date
    const [articles] = await db.promise.execute(
      'SELECT publish_date FROM articles WHERE id = ?',
      [id]
    );

    if (articles.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Article not found'
      });
    }

    const article = articles[0];
    const now = new Date();
    const publishDate = article.publish_date ? new Date(article.publish_date) : null;

    // If article has a future publish_date, don't publish immediately
    if (publishDate && publishDate > now) {
      return res.status(400).json({
        error: true,
        message: 'Article is scheduled for future publication. It will be published automatically at the scheduled time.'
      });
    }

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

// @route   POST /api/v1/articles/:id/schedule
// @desc    Schedule article for future publication
// @access  Private (Editor, Admin, Author)
router.post('/:id/schedule', auth, authorize('editor', 'admin', 'author'), async (req, res) => {
  try {
    const { id } = req.params;
    const { publish_date } = req.body;

    if (!publish_date) {
      return res.status(400).json({
        error: true,
        message: 'Publish date is required'
      });
    }

    const scheduledDate = new Date(publish_date);
    const now = new Date();

    if (scheduledDate <= now) {
      return res.status(400).json({
        error: true,
        message: 'Publish date must be in the future'
      });
    }

    const [result] = await db.promise.execute(
      'UPDATE articles SET status = "draft", publish_date = ? WHERE id = ?',
      [scheduledDate, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: true,
        message: 'Article not found'
      });
    }

    res.json({
      error: false,
      message: 'Article scheduled successfully',
      data: { publish_date: scheduledDate.toISOString() }
    });
  } catch (error) {
    console.error('Schedule article error:', error);
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

// @route   POST /api/v1/articles/:id/breaking-news
// @desc    Toggle article breaking news status
// @access  Private (Editor, Admin)
router.post('/:id/breaking-news', auth, authorize('editor', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if is_breaking_news column exists
    const [columns] = await db.promise.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'wheredjsplay_news' 
      AND TABLE_NAME = 'articles' 
      AND COLUMN_NAME = 'is_breaking_news'
    `);

    if (columns.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Breaking news functionality not available. Please run database migration first.'
      });
    }

    // Get current breaking news status
    const [articles] = await db.promise.execute(
      'SELECT is_breaking_news FROM articles WHERE id = ?',
      [id]
    );

    if (articles.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Article not found'
      });
    }

    const newBreakingNewsStatus = !articles[0].is_breaking_news;

    await db.promise.execute(
      'UPDATE articles SET is_breaking_news = ? WHERE id = ?',
      [newBreakingNewsStatus ? 1 : 0, id]
    );

    res.json({
      error: false,
      message: `Article ${newBreakingNewsStatus ? 'added to' : 'removed from'} breaking news successfully`,
      data: { is_breaking_news: newBreakingNewsStatus }
    });
  } catch (error) {
    console.error('Toggle breaking news error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/v1/articles/:id/latest-headline
// @desc    Toggle article latest headline status
// @access  Private (Editor, Admin)
router.post('/:id/latest-headline', auth, authorize('editor', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if is_latest_headline column exists
    const [columns] = await db.promise.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'wheredjsplay_news' 
      AND TABLE_NAME = 'articles' 
      AND COLUMN_NAME = 'is_latest_headline'
    `);

    if (columns.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Latest headlines functionality not available. Please run database migration first.'
      });
    }

    // Get current latest headline status
    const [articles] = await db.promise.execute(
      'SELECT is_latest_headline FROM articles WHERE id = ?',
      [id]
    );

    if (articles.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Article not found'
      });
    }

    const newLatestHeadlineStatus = !articles[0].is_latest_headline;

    await db.promise.execute(
      'UPDATE articles SET is_latest_headline = ? WHERE id = ?',
      [newLatestHeadlineStatus ? 1 : 0, id]
    );

    res.json({
      error: false,
      message: `Article ${newLatestHeadlineStatus ? 'added to' : 'removed from'} latest headlines successfully`,
      data: { is_latest_headline: newLatestHeadlineStatus }
    });
  } catch (error) {
    console.error('Toggle latest headline error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
