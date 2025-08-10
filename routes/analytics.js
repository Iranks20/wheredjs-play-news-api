const express = require('express');
const db = require('../config/database');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/v1/analytics/dashboard
// @desc    Get dashboard analytics
// @access  Private (Admin, Editor)
router.get('/dashboard', auth, authorize('admin', 'editor'), async (req, res) => {
  try {
    // Get total articles count
    const [totalArticles] = await db.promise.execute(
      'SELECT COUNT(*) as total FROM articles'
    );

    // Get published articles count
    const [publishedArticles] = await db.promise.execute(
      'SELECT COUNT(*) as total FROM articles WHERE status = "published"'
    );

    // Get total views
    const [totalViews] = await db.promise.execute(
      'SELECT SUM(views) as total FROM articles WHERE status = "published"'
    );

    // Get total users
    const [totalUsers] = await db.promise.execute(
      'SELECT COUNT(*) as total FROM users'
    );

    // Get recent articles (last 7 days)
    const [recentArticles] = await db.promise.execute(`
      SELECT COUNT(*) as total 
      FROM articles 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    // Get popular articles
    const [popularArticles] = await db.promise.execute(`
      SELECT 
        a.id, a.title, a.views, a.created_at,
        c.name as category_name,
        u.name as author_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.status = 'published'
      ORDER BY a.views DESC
      LIMIT 5
    `);

    // Get category statistics
    const [categoryStats] = await db.promise.execute(`
      SELECT 
        c.name, c.slug,
        COUNT(a.id) as article_count,
        SUM(a.views) as total_views
      FROM categories c
      LEFT JOIN articles a ON c.id = a.category_id AND a.status = 'published'
      GROUP BY c.id
      ORDER BY article_count DESC
    `);

    // Get user statistics
    const [userStats] = await db.promise.execute(`
      SELECT 
        u.name, u.role,
        COUNT(a.id) as article_count,
        SUM(a.views) as total_views
      FROM users u
      LEFT JOIN articles a ON u.id = a.author_id AND a.status = 'published'
      GROUP BY u.id
      ORDER BY article_count DESC
      LIMIT 5
    `);

    // Format dates
    const formattedPopularArticles = popularArticles.map(article => ({
      ...article,
      created_at: article.created_at.toISOString()
    }));

    res.json({
      error: false,
      data: {
        overview: {
          totalArticles: totalArticles[0].total,
          publishedArticles: publishedArticles[0].total,
          totalViews: totalViews[0].total || 0,
          totalUsers: totalUsers[0].total,
          recentArticles: recentArticles[0].total
        },
        popularArticles: formattedPopularArticles,
        categoryStats,
        userStats
      }
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/v1/analytics/articles
// @desc    Get article analytics
// @access  Private (Admin, Editor)
router.get('/articles', auth, authorize('admin', 'editor'), async (req, res) => {
  try {
    const { period = '30' } = req.query;

    // Get articles by status
    const [statusStats] = await db.promise.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM articles
      GROUP BY status
    `);

    // Get articles by category
    const [categoryStats] = await db.promise.execute(`
      SELECT 
        c.name,
        COUNT(a.id) as count,
        SUM(a.views) as total_views
      FROM categories c
      LEFT JOIN articles a ON c.id = a.category_id
      GROUP BY c.id
      ORDER BY count DESC
    `);

    // Get articles by author
    const [authorStats] = await db.promise.execute(`
      SELECT 
        u.name,
        COUNT(a.id) as count,
        SUM(a.views) as total_views
      FROM users u
      LEFT JOIN articles a ON u.id = a.author_id
      GROUP BY u.id
      ORDER BY count DESC
    `);

    // Get articles created in the last period days
    const [recentArticles] = await db.promise.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM articles
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [parseInt(period)]);

    res.json({
      error: false,
      data: {
        statusStats,
        categoryStats,
        authorStats,
        recentArticles
      }
    });
  } catch (error) {
    console.error('Get article analytics error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/v1/analytics/views
// @desc    Get view statistics
// @access  Private (Admin, Editor)
router.get('/views', auth, authorize('admin', 'editor'), async (req, res) => {
  try {
    const { period = '30' } = req.query;

    // Get total views by day
    const [dailyViews] = await db.promise.execute(`
      SELECT 
        DATE(publish_date) as date,
        SUM(views) as total_views
      FROM articles
      WHERE status = 'published' 
        AND publish_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(publish_date)
      ORDER BY date DESC
    `, [parseInt(period)]);

    // Get most viewed articles
    const [mostViewed] = await db.promise.execute(`
      SELECT 
        a.id, a.title, a.views, a.publish_date,
        c.name as category_name,
        u.name as author_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.status = 'published'
      ORDER BY a.views DESC
      LIMIT 10
    `);

    // Format dates
    const formattedMostViewed = mostViewed.map(article => ({
      ...article,
      publish_date: article.publish_date ? article.publish_date.toISOString() : null
    }));

    res.json({
      error: false,
      data: {
        dailyViews,
        mostViewed: formattedMostViewed
      }
    });
  } catch (error) {
    console.error('Get view analytics error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/v1/analytics/popular
// @desc    Get popular articles
// @access  Public
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10, period = '30' } = req.query;

    const [articles] = await db.promise.execute(`
      SELECT 
        a.id, a.title, a.excerpt, a.views, a.publish_date, a.image,
        c.name as category_name,
        c.slug as category_slug,
        u.name as author_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.status = 'published'
        AND a.publish_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY a.views DESC
      LIMIT ?
    `, [parseInt(period), parseInt(limit)]);

    // Format articles
    const formattedArticles = articles.map(article => ({
      ...article,
      publish_date: article.publish_date ? article.publish_date.toISOString() : null
    }));

    res.json({
      error: false,
      data: formattedArticles
    });
  } catch (error) {
    console.error('Get popular articles error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
