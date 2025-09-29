const express = require('express');
const db = require('../config/database');
const rateLimit = require('express-rate-limit');

const router = express.Router();

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

// Utility function to extract UTM parameters from query string
const extractUTMParams = (query) => {
  return {
    utm_source: query.utm_source || null,
    utm_medium: query.utm_medium || null,
    utm_campaign: query.utm_campaign || null,
    utm_term: query.utm_term || null,
    utm_content: query.utm_content || null
  };
};

// Simple geo lookup (you can enhance this with a proper geo service)
const getGeoData = (ip) => {
  // For now, return null - you can integrate with a geo service later
  return {
    country: null,
    city: null
  };
};

// @route   GET /s/:slug
// @desc    Redirect short link to full article URL with analytics tracking
// @access  Public
router.get('/:slug', clickLimiter, async (req, res) => {
  try {
    const { slug } = req.params;
    const clientIP = getClientIP(req);
    const userAgent = req.get('User-Agent') || '';
    const referrer = sanitizeReferrer(req.get('Referer'));
    const utmParams = extractUTMParams(req.query);
    const geoData = getGeoData(clientIP);

    // Find the short link
    const [links] = await db.promise.execute(
      'SELECT * FROM short_links WHERE short_slug = ?',
      [slug]
    );

    if (links.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Short link not found'
      });
    }

    const shortLink = links[0];

    // Log the click analytics
    await db.promise.execute(
      `INSERT INTO link_analytics (short_link_id, ip_address, user_agent, referrer, country, city)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [shortLink.id, clientIP, userAgent, referrer, geoData.country, geoData.city]
    );

    // Note: Click count is tracked in link_analytics table, no need to update short_links

    // Build redirect URL with UTM parameters
    let redirectUrl = shortLink.full_url;
    const urlParams = new URLSearchParams();
    
    if (utmParams.utm_source) urlParams.append('utm_source', utmParams.utm_source);
    if (utmParams.utm_medium) urlParams.append('utm_medium', utmParams.utm_medium);
    if (utmParams.utm_campaign) urlParams.append('utm_campaign', utmParams.utm_campaign);
    if (utmParams.utm_term) urlParams.append('utm_term', utmParams.utm_term);
    if (utmParams.utm_content) urlParams.append('utm_content', utmParams.utm_content);

    if (urlParams.toString()) {
      redirectUrl += (redirectUrl.includes('?') ? '&' : '?') + urlParams.toString();
    }

    // Perform 301 redirect
    res.redirect(301, redirectUrl);

  } catch (error) {
    console.error('Short link redirect error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to process short link'
    });
  }
});

module.exports = router;
