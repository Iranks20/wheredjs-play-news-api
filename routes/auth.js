const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { auth } = require('../middleware/auth');
const { validate, loginSchema, registerSchema } = require('../utils/validation');

const router = express.Router();

// Helper function to convert relative avatar URL to full URL
const getFullAvatarUrl = (avatar, req) => {
  if (!avatar) return null;
  
  // If it's already a full URL, return as is
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  
  // Convert relative path to full URL
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}${avatar}`;
};

// JWT Secret with fallback
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_wheredjsplay_2024_change_in_production';
console.log('JWT_SECRET loaded:', JWT_SECRET ? 'Yes' : 'No', 'Length:', JWT_SECRET?.length);

// @route   POST /api/v1/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const [users] = await db.promise.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: true,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({
        error: true,
        message: 'Account is inactive. Please contact administrator.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: true,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    await db.promise.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Generate JWT token
    console.log('Generating JWT with secret:', JWT_SECRET ? 'Available' : 'Missing');
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Remove password from response and format user data
    const { password: _, ...userWithoutPassword } = user;
    const formattedUser = {
      ...userWithoutPassword,
      avatar: getFullAvatarUrl(user.avatar, req),
      created_at: user.created_at.toISOString(),
      last_login: user.last_login ? user.last_login.toISOString() : null
    };

    res.json({
      error: false,
      message: 'Login successful',
      data: {
        user: formattedUser,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/v1/auth/register
// @desc    Register new user
// @access  Public (admin only in production)
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { name, email, password, role = 'author' } = req.body;

    // Check if user already exists
    const [existingUsers] = await db.promise.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        error: true,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const [result] = await db.promise.execute(
      'INSERT INTO users (name, email, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [name, email, hashedPassword, role, 'active']
    );

    // Get the created user
    const [newUser] = await db.promise.execute(
      'SELECT id, name, email, role, status, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser[0].id, email: newUser[0].email, role: newUser[0].role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      error: false,
      message: 'User registered successfully',
      data: {
        user: newUser[0],
        token
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/v1/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const [users] = await db.promise.execute(
      'SELECT id, name, email, role, status, avatar, created_at, last_login FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    const user = users[0];
    const formattedUser = {
      ...user,
      avatar: getFullAvatarUrl(user.avatar, req),
      created_at: user.created_at.toISOString(),
      last_login: user.last_login ? user.last_login.toISOString() : null
    };

    res.json({
      error: false,
      data: formattedUser
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/v1/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', auth, (req, res) => {
  res.json({
    error: false,
    message: 'Logged out successfully'
  });
});

// @route   POST /api/v1/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', auth, async (req, res) => {
  try {
    // Generate new token
    const token = jwt.sign(
      { userId: req.user.id, email: req.user.email, role: req.user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      error: false,
      message: 'Token refreshed successfully',
      data: { token }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   PUT /api/v1/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: true,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: true,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get current user with password
    const [users] = await db.promise.execute(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, users[0].password);
    if (!isPasswordValid) {
      return res.status(400).json({
        error: true,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await db.promise.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.user.id]
    );

    res.json({
      error: false,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
