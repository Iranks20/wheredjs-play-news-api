const express = require('express');
const db = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const { validate } = require('../utils/validation');
const Joi = require('joi');
const { sendNewsletterEmail } = require('../config/email');

const router = express.Router();

// Validation schemas
const subscribeSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().optional().allow('')
});

const campaignSchema = Joi.object({
  subject: Joi.string().required().min(1).max(255),
  content: Joi.string().required().min(1)
});

// @route   POST /api/v1/subscribers/subscribe
// @desc    Subscribe to newsletter (public)
// @access  Public
router.post('/subscribe', validate(subscribeSchema), async (req, res) => {
  try {
    const { email, name } = req.body;

    // Check if already subscribed
    const [existing] = await db.promise.execute(
      'SELECT id, status FROM subscribers WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      if (existing[0].status === 'active') {
        return res.status(400).json({
          error: true,
          message: 'This email is already subscribed to our newsletter.'
        });
      } else {
        // Reactivate subscription
        await db.promise.execute(
          'UPDATE subscribers SET status = "active", unsubscribed_at = NULL WHERE email = ?',
          [email]
        );
        return res.json({
          error: false,
          message: 'Welcome back! Your subscription has been reactivated.'
        });
      }
    }

    // Add new subscriber
    await db.promise.execute(
      'INSERT INTO subscribers (email, name) VALUES (?, ?)',
      [email, name || null]
    );

    res.json({
      error: false,
      message: 'Thank you for subscribing to our newsletter!'
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to subscribe. Please try again.'
    });
  }
});

// @route   POST /api/v1/subscribers/unsubscribe
// @desc    Unsubscribe from newsletter (public)
// @access  Public
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: true,
        message: 'Email is required.'
      });
    }

    const [result] = await db.promise.execute(
      'UPDATE subscribers SET status = "unsubscribed", unsubscribed_at = CURRENT_TIMESTAMP WHERE email = ?',
      [email]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: true,
        message: 'Email not found in our subscription list.'
      });
    }

    res.json({
      error: false,
      message: 'You have been successfully unsubscribed from our newsletter.'
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to unsubscribe. Please try again.'
    });
  }
});

// @route   GET /api/v1/subscribers
// @desc    Get all subscribers (Admin/Editor)
// @access  Private (Admin, Editor)
router.get('/', auth, authorize('admin', 'editor'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    let whereClause = '';
    let params = [];

    if (status && status.trim() !== '') {
      whereClause += ' WHERE status = ?';
      params.push(status);
    }

    if (search && search.trim() !== '') {
      const searchWhere = status && status.trim() !== '' ? ' AND' : ' WHERE';
      whereClause += `${searchWhere} (email LIKE ? OR name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Get total count
    const [countResult] = await db.promise.execute(
      `SELECT COUNT(*) as total FROM subscribers${whereClause}`,
      params
    );

    // Debug logging

      page: pageNum, limit: limitNum, status, search,
      offset,
      whereClause,
      params: [...params, limitNum, offset]
    });

    // Get subscribers
    const [subscribers] = await db.promise.execute(
      `SELECT * FROM subscribers${whereClause} ORDER BY subscribed_at DESC LIMIT ${limitNum} OFFSET ${offset}`,
      params
    );

    res.json({
      error: false,
      data: subscribers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch subscribers.'
    });
  }
});

// @route   GET /api/v1/subscribers/stats
// @desc    Get subscriber statistics (Admin/Editor)
// @access  Private (Admin, Editor)
router.get('/stats', auth, authorize('admin', 'editor'), async (req, res) => {
  try {
    const [stats] = await db.promise.execute(`
      SELECT 
        COUNT(*) as total_subscribers,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscribers,
        COUNT(CASE WHEN status = 'unsubscribed' THEN 1 END) as unsubscribed_subscribers,
        COUNT(CASE WHEN subscribed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_this_week,
        COUNT(CASE WHEN subscribed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_this_month
      FROM subscribers
    `);

    res.json({
      error: false,
      data: stats[0]
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch statistics.'
    });
  }
});

// @route   DELETE /api/v1/subscribers/:id
// @desc    Delete subscriber (Admin/Editor)
// @access  Private (Admin, Editor)
router.delete('/:id', auth, authorize('admin', 'editor'), async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.promise.execute(
      'DELETE FROM subscribers WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: true,
        message: 'Subscriber not found.'
      });
    }

    res.json({
      error: false,
      message: 'Subscriber deleted successfully.'
    });
  } catch (error) {
    console.error('Delete subscriber error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to delete subscriber.'
    });
  }
});

// @route   POST /api/v1/subscribers/send-campaign
// @desc    Send newsletter campaign (Admin/Editor)
// @access  Private (Admin, Editor)
router.post('/send-campaign', auth, authorize('admin', 'editor'), validate(campaignSchema), async (req, res) => {
  try {
    const { subject, content } = req.body;
    const userId = req.user.id;

    // Get active subscribers
    const [subscribers] = await db.promise.execute(
      'SELECT email, name FROM subscribers WHERE status = "active"'
    );

    if (subscribers.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'No active subscribers found.'
      });
    }

    // Create campaign record
    const [campaignResult] = await db.promise.execute(
      'INSERT INTO newsletter_campaigns (subject, content, sent_by, total_subscribers, status) VALUES (?, ?, ?, ?, "sending")',
      [subject, content, userId, subscribers.length]
    );

    const campaignId = campaignResult.insertId;

    // Send emails in batches
    const batchSize = 10;
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      
      for (const subscriber of batch) {
                try {
          // Send email using Brevo
          const unsubscribeUrl = `${process.env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(subscriber.email)}`;
          
          await sendNewsletterEmail(
            subscriber.email,
            subject,
            content,
            unsubscribeUrl
          );

          // Update subscriber stats
          await db.promise.execute(
            'UPDATE subscribers SET last_email_sent = CURRENT_TIMESTAMP, email_count = email_count + 1 WHERE email = ?',
            [subscriber.email]
          );

          sentCount++;
        } catch (emailError) {
          console.error('Failed to send email to:', subscriber.email, emailError);
          failedCount++;
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update campaign status
    await db.promise.execute(
      'UPDATE newsletter_campaigns SET status = "sent", sent_at = CURRENT_TIMESTAMP, sent_count = ?, failed_count = ? WHERE id = ?',
      [sentCount, failedCount, campaignId]
    );

    res.json({
      error: false,
      message: `Newsletter sent successfully! Sent: ${sentCount}, Failed: ${failedCount}`,
      data: {
        campaignId,
        sentCount,
        failedCount,
        totalSubscribers: subscribers.length
      }
    });
  } catch (error) {
    console.error('Send campaign error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to send newsletter campaign.'
    });
  }
});

// @route   GET /api/v1/subscribers/campaigns
// @desc    Get newsletter campaigns (Admin/Editor)
// @access  Private (Admin, Editor)
router.get('/campaigns', auth, authorize('admin', 'editor'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    // Get total count
    const [countResult] = await db.promise.execute(
      'SELECT COUNT(*) as total FROM newsletter_campaigns'
    );

    // Get campaigns with sender info
    const [campaigns] = await db.promise.execute(`
      SELECT c.*, u.name as sender_name 
      FROM newsletter_campaigns c 
      LEFT JOIN users u ON c.sent_by = u.id 
      ORDER BY c.created_at DESC 
      LIMIT ${limitNum} OFFSET ${offset}
    `);

    res.json({
      error: false,
      data: campaigns,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch campaigns.'
    });
  }
});

module.exports = router;
