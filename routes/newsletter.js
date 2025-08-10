const express = require('express');
const db = require('../config/database');
const { validate, newsletterSchema } = require('../utils/validation');

const router = express.Router();

// @route   POST /api/v1/newsletter/subscribe
// @desc    Subscribe to newsletter
// @access  Public
router.post('/subscribe', validate(newsletterSchema), async (req, res) => {
  try {
    const { email, name } = req.body;

    // Check if already subscribed
    const [existingSubscribers] = await db.promise.execute(
      'SELECT id FROM newsletter_subscribers WHERE email = ?',
      [email]
    );

    if (existingSubscribers.length > 0) {
      return res.status(400).json({
        error: true,
        message: 'Email is already subscribed to the newsletter'
      });
    }

    // Add subscriber
    await db.promise.execute(`
      INSERT INTO newsletter_subscribers (email, name, subscribed_at)
      VALUES (?, ?, NOW())
    `, [email, name]);

    res.status(201).json({
      error: false,
      message: 'Successfully subscribed to newsletter'
    });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/v1/newsletter/unsubscribe
// @desc    Unsubscribe from newsletter
// @access  Public
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: true,
        message: 'Email is required'
      });
    }

    const [result] = await db.promise.execute(
      'DELETE FROM newsletter_subscribers WHERE email = ?',
      [email]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: true,
        message: 'Email not found in newsletter subscribers'
      });
    }

    res.json({
      error: false,
      message: 'Successfully unsubscribed from newsletter'
    });
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
