const express = require('express');
const db = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for short link generation
const shortLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    error: true,
    message: 'Too many short link generation requests, please try again later.'
  }
});

// Rate limiting for short link clicks (more permissive)
const clickLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // 1000 clicks per minute
  message: {
    error: true,
    message: 'Too many requests, please try again later.'
  }
});

// Utility function to get client IP
const getClientIP = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         '127.0.0.1';
};

// Utility function to sanitize referrer
const sanitizeReferrer = (referrer) => {
  if (!referrer) return null;
  
  // Remove any potentially malicious content
  const cleanReferrer = referrer
    .replace(/[<>'"]/g, '') // Remove HTML/script injection attempts
    .substring(0, 500); // Limit length
  
  // Basic URL validation
  try {
    new URL(cleanReferrer);
    return cleanReferrer;
  } catch {
    return null;
  }
};

// Utility function to extract UTM parameters
const extractUTMParams = (query) => {
  return {
    utm_source: query.utm_source || null,
    utm_medium: query.utm_medium || null,
    utm_campaign: query.utm_campaign || null,
    utm_term: query.utm_term || null,
    utm_content: query.utm_content || null
  };
};

// Utility function to perform basic geo lookup (simplified)
const getGeoData = (ip) => {
  // In a real implementation, you would use a service like MaxMind GeoIP2
  // For now, we'll return basic data
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return {
      country: 'Local',
      city: 'Local',
      region: 'Local'
    };
  }
  
  // For production, integrate with a real geo service
  return {
    country: 'Unknown',
    city: 'Unknown', 
    region: 'Unknown'
  };
};

// @route   POST /api/v1/short-links/generate
// @desc    Generate a short link for an article
// @access  Private (Admin, Editor, Author)
router.post('/generate', auth, authorize('admin', 'editor', 'author'), shortLinkLimiter, async (req, res) => {
  try {
    const { article_id, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = req.body;

    if (!article_id) {
      return res.status(400).json({
        error: true,
        message: 'Article ID is required'
      });
    }

    // Verify article exists
    const [articles] = await db.promise.execute(
      'SELECT id, title, slug FROM articles WHERE id = ?',
      [article_id]
    );

    if (articles.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Article not found'
      });
    }

    const article = articles[0];
    
    // Generate short slug based on article slug
    const shortSlug = article.slug || `article-${article_id}`;
    
    // Check if short link already exists
    const [existingLinks] = await db.promise.execute(
      'SELECT id FROM short_links WHERE short_slug = ? AND is_active = TRUE',
      [shortSlug]
    );

    if (existingLinks.length > 0) {
      // Return existing short link
      const [links] = await db.promise.execute(
        'SELECT * FROM short_links WHERE short_slug = ? AND is_active = TRUE',
        [shortSlug]
      );
      
      return res.json({
        error: false,
        data: {
          short_link: `${req.protocol}://${req.get('host')}/s/${shortSlug}`,
          short_slug: shortSlug,
          full_url: links[0].full_url,
          click_count: links[0].click_count,
          created_at: links[0].created_at
        }
      });
    }

    // Create new short link
    const fullUrl = `${req.protocol}://${req.get('host')}/wdjpnews/article/${article.slug}`;
    
    const [result] = await db.promise.execute(
      `INSERT INTO short_links 
       (article_id, short_slug, full_url, utm_source, utm_medium, utm_campaign, utm_term, utm_content) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [article_id, shortSlug, fullUrl, utm_source, utm_medium, utm_campaign, utm_term, utm_content]
    );

    res.json({
      error: false,
      data: {
        short_link: `${req.protocol}://${req.get('host')}/s/${shortSlug}`,
        short_slug: shortSlug,
        full_url: fullUrl,
        click_count: 0,
        created_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Generate short link error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to generate short link'
    });
  }
});

// @route   GET /api/v1/short-links/analytics/:articleId
// @desc    Get analytics for a specific article's short links
// @access  Private (Admin, Editor, Author)
router.get('/analytics/:articleId', auth, authorize('admin', 'editor', 'author'), async (req, res) => {
  try {
    const { articleId } = req.params;
    const { period = '30' } = req.query;

    // Get analytics summary
    const [summary] = await db.promise.execute(
      `SELECT 
         sl.article_id,
         a.title as article_title,
         a.slug as article_slug,
         sl.short_slug,
         COUNT(la.id) as total_clicks,
         COUNT(DISTINCT la.ip_address) as unique_visitors,
         COUNT(DISTINCT DATE(la.clicked_at)) as active_days,
         MAX(la.clicked_at) as last_clicked,
         MIN(la.clicked_at) as first_clicked,
         COUNT(CASE WHEN la.clicked_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN 1 END) as clicks_last_30_days
       FROM short_links sl
       LEFT JOIN link_analytics la ON sl.id = la.short_link_id
       JOIN articles a ON sl.article_id = a.id
       WHERE sl.article_id = ?
       GROUP BY sl.article_id, sl.short_slug, a.title, a.slug
       ORDER BY clicks_last_30_days DESC`,
      [parseInt(period), articleId]
    );

    // Get top referrers
    const [referrers] = await db.promise.execute(
      `SELECT 
         la.referrer,
         COUNT(la.id) as click_count,
         COUNT(DISTINCT la.ip_address) as unique_visitors,
         MAX(la.clicked_at) as last_referral
       FROM short_links sl
       JOIN link_analytics la ON sl.id = la.short_link_id
       WHERE sl.article_id = ? 
         AND la.referrer IS NOT NULL 
         AND la.referrer != ''
       GROUP BY la.referrer
       ORDER BY click_count DESC 
       LIMIT 10`,
      [articleId]
    );

    // Get daily clicks for the period
    const [dailyClicks] = await db.promise.execute(
      `SELECT 
         DATE(la.clicked_at) as date,
         COUNT(la.id) as clicks,
         COUNT(DISTINCT la.ip_address) as unique_visitors
       FROM short_links sl
       JOIN link_analytics la ON sl.id = la.short_link_id
       WHERE sl.article_id = ? 
         AND la.clicked_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(la.clicked_at)
       ORDER BY date DESC`,
      [articleId, parseInt(period)]
    );

    // Get geo distribution
    const [geoData] = await db.promise.execute(
      `SELECT 
         la.country,
         COUNT(la.id) as clicks,
         COUNT(DISTINCT la.ip_address) as unique_visitors
       FROM short_links sl
       JOIN link_analytics la ON sl.id = la.short_link_id
       WHERE sl.article_id = ? 
         AND la.clicked_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY la.country
       ORDER BY clicks DESC
       LIMIT 10`,
      [articleId, parseInt(period)]
    );

    res.json({
      error: false,
      data: {
        summary: summary[0] || null,
        referrers,
        dailyClicks,
        geoData
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get analytics data'
    });
  }
});

// @route   GET /api/v1/short-links/article/:articleId
// @desc    Get existing short links for a specific article
// @access  Private (Admin, Editor, Author)
router.get('/article/:articleId', auth, authorize('admin', 'editor', 'author'), async (req, res) => {
    const { articleId } = req.params;

    try {
        const [shortLinks] = await db.promise.execute(
            `SELECT id, short_slug, full_url, utm_source, utm_medium, utm_campaign, utm_term, utm_content, created_at,
                    (SELECT COUNT(*) FROM link_analytics la WHERE la.short_link_id = sl.id) as click_count
             FROM short_links sl
             WHERE sl.article_id = ?
             ORDER BY sl.created_at DESC`,
            [articleId]
        );

        res.json({
            error: false,
            data: shortLinks.map(link => ({
                ...link,
                short_link: `${process.env.BASE_URL || 'http://localhost:3001'}/s/${link.short_slug}`,
                click_count: parseInt(link.click_count) || 0
            }))
        });

    } catch (error) {
        console.error('Error fetching article short links:', error);
        res.status(500).json({ error: true, message: 'Internal server error' });
    }
});

// @route   GET /api/v1/short-links/dashboard
// @desc    Get dashboard analytics for all short links
// @access  Private (Admin, Editor)
router.get('/dashboard', auth, authorize('admin', 'editor'), async (req, res) => {
  try {
    const { period = '30' } = req.query;

    // Get total clicks in period
    const [totalClicks] = await db.promise.execute(
      `SELECT COUNT(la.id) as total_clicks,
              COUNT(DISTINCT la.ip_address) as unique_visitors,
              COUNT(DISTINCT sl.article_id) as articles_with_clicks
       FROM link_analytics la
       JOIN short_links sl ON la.short_link_id = sl.id
       WHERE la.clicked_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [parseInt(period)]
    );

    // Get top performing articles
    const [topArticles] = await db.promise.execute(
      `SELECT 
         a.id, a.title, a.slug,
         COUNT(la.id) as clicks,
         COUNT(DISTINCT la.ip_address) as unique_visitors
       FROM articles a
       JOIN short_links sl ON a.id = sl.article_id
       JOIN link_analytics la ON sl.id = la.short_link_id
       WHERE la.clicked_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY a.id, a.title, a.slug
       ORDER BY clicks DESC
       LIMIT 10`,
      [parseInt(period)]
    );

    // Get top referrers
    const [topReferrers] = await db.promise.execute(
      `SELECT 
         referrer,
         COUNT(*) as clicks,
         COUNT(DISTINCT ip_address) as unique_visitors
       FROM link_analytics 
       WHERE clicked_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         AND referrer IS NOT NULL 
         AND referrer != ''
       GROUP BY referrer
       ORDER BY clicks DESC
       LIMIT 10`,
      [parseInt(period)]
    );

    // Get daily clicks trend
    const [dailyTrend] = await db.promise.execute(
      `SELECT 
         DATE(clicked_at) as date,
         COUNT(*) as clicks,
         COUNT(DISTINCT ip_address) as unique_visitors
       FROM link_analytics 
       WHERE clicked_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(clicked_at)
       ORDER BY date DESC`,
      [parseInt(period)]
    );

    // Get geo distribution
    const [geoData] = await db.promise.execute(
      `SELECT 
         la.country,
         la.city,
         COUNT(la.id) as clicks,
         COUNT(DISTINCT la.ip_address) as unique_visitors
       FROM link_analytics la
       JOIN short_links sl ON la.short_link_id = sl.id
       WHERE la.clicked_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         AND la.country IS NOT NULL
       GROUP BY la.country, la.city
       ORDER BY clicks DESC
       LIMIT 20`,
      [parseInt(period)]
    );

    res.json({
      error: false,
      data: {
        totalClicks: totalClicks[0],
        topArticles,
        topReferrers,
        dailyTrend,
        geoData
      }
    });

  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get dashboard analytics'
    });
  }
});

// @route   GET /api/v1/short-links/detailed-clicks
// @desc    Get detailed click analytics with user information
// @access  Private (Admin, Editor)
router.get('/detailed-clicks', auth, authorize('admin', 'editor'), async (req, res) => {
  try {
    const { period = '30', page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get detailed click information
    const [detailedClicks] = await db.promise.execute(
      `SELECT 
         la.id,
         la.ip_address,
         la.user_agent,
         la.referrer,
         la.country,
         la.city,
         la.clicked_at,
         a.title as article_title,
         a.slug as article_slug,
         sl.short_slug,
         sl.utm_source,
         sl.utm_medium,
         sl.utm_campaign
       FROM link_analytics la
       JOIN short_links sl ON la.short_link_id = sl.id
       JOIN articles a ON sl.article_id = a.id
       WHERE la.clicked_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       ORDER BY la.clicked_at DESC
       LIMIT ? OFFSET ?`,
      [parseInt(period), parseInt(limit), offset]
    );

    // Get total count for pagination
    const [totalCount] = await db.promise.execute(
      `SELECT COUNT(*) as total
       FROM link_analytics la
       JOIN short_links sl ON la.short_link_id = sl.id
       WHERE la.clicked_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [parseInt(period)]
    );

    res.json({
      error: false,
      data: {
        clicks: detailedClicks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount[0].total,
          pages: Math.ceil(totalCount[0].total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get detailed clicks error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get detailed click data'
    });
  }
});

module.exports = router;
