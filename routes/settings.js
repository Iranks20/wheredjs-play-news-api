const express = require('express');
const db = require('../config/database');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/v1/settings
// @desc    Get site settings
// @access  Public
router.get('/', async (req, res) => {
  try {
    const [settings] = await db.promise.execute(`
      SELECT * FROM site_settings
      ORDER BY setting_key ASC
    `);

    // Convert to key-value object
    const settingsObject = {};
    settings.forEach(setting => {
      settingsObject[setting.setting_key] = setting.setting_value;
    });

    res.json({
      error: false,
      data: settingsObject
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   PUT /api/v1/settings
// @desc    Update site settings
// @access  Private (Admin)
router.put('/', auth, authorize('admin'), async (req, res) => {
  try {
    const settings = req.body;

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      await db.promise.execute(`
        INSERT INTO site_settings (setting_key, setting_value, updated_at)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE
        setting_value = VALUES(setting_value),
        updated_at = NOW()
      `, [key, value]);
    }

    res.json({
      error: false,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
