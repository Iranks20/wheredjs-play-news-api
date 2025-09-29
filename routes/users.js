const express = require('express');
const db = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const { validate, userSchema, userUpdateSchema } = require('../utils/validation');
const bcrypt = require('bcryptjs');
const { sendUserInvitationEmail } = require('../config/email');

const router = express.Router();

// Helper function to generate secure random password
function generateSecurePassword() {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one character from each category
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase
  password += '0123456789'[Math.floor(Math.random() * 10)]; // number
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // special char
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Helper function to send invitation email
async function sendInvitationEmail(email, name, password, role) {

  
  try {

    // Send email using Brevo
    const result = await sendUserInvitationEmail(email, name, password, role);

    return {
      success: true,
      messageId: result.messageId,
      response: result.response
    };
  } catch (error) {
    console.error('❌ Failed to send invitation email:', error.message);
    throw new Error(`Failed to send invitation email: ${error.message}`);
  }
}

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

// @route   GET /api/v1/users
// @desc    Get all users
// @access  Private (Admin, Editor)
router.get('/', auth, authorize('admin', 'editor'), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM users`;
    const [countResult] = await db.promise.execute(countQuery);
    const total = countResult[0].total;

    // Get users
    const usersQuery = `
      SELECT 
        u.id, u.name, u.email, u.role, u.status, u.avatar, u.created_at, u.last_login,
        COUNT(a.id) as article_count
      FROM users u
      LEFT JOIN articles a ON u.id = a.author_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;

    const [users] = await db.promise.execute(usersQuery);

    // Format users
    const formattedUsers = users.map(user => ({
      ...user,
      avatar: getFullAvatarUrl(user.avatar, req),
      created_at: user.created_at.toISOString(),
      last_login: user.last_login ? user.last_login.toISOString() : null
    }));

    res.json({
      error: false,
      data: {
        users: formattedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/v1/users/authors
// @desc    Get all authors (for article creation)
// @access  Private (Admin, Editor, Author, Writer)
router.get('/authors', auth, authorize('admin', 'editor', 'author', 'writer'), async (req, res) => {
  try {
    const [users] = await db.promise.execute(`
      SELECT 
        u.id, u.name, u.email, u.role, u.status, u.avatar, u.created_at,
        COUNT(a.id) as article_count
      FROM users u
      LEFT JOIN articles a ON u.id = a.author_id
      WHERE u.role IN ('author', 'editor', 'admin', 'writer') AND u.status = 'active'
      GROUP BY u.id
      ORDER BY u.name ASC
    `);

    // Format users
    const formattedUsers = users.map(user => ({
      ...user,
      avatar: getFullAvatarUrl(user.avatar, req),
      created_at: user.created_at.toISOString()
    }));

    res.json({
      error: false,
      data: {
        users: formattedUsers
      }
    });
  } catch (error) {
    console.error('Get authors error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/v1/users/:id
// @desc    Get single user
// @access  Private (Admin, or own profile)
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check permissions
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({
        error: true,
        message: 'Access denied'
      });
    }

    const [users] = await db.promise.execute(`
      SELECT 
        u.id, u.name, u.email, u.role, u.status, u.avatar, u.created_at, u.last_login,
        COUNT(a.id) as article_count
      FROM users u
      LEFT JOIN articles a ON u.id = a.author_id
      WHERE u.id = ?
      GROUP BY u.id
    `, [id]);

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

// @route   POST /api/v1/users
// @desc    Create new user
// @access  Private (Admin)
router.post('/', auth, authorize('admin'), validate(userSchema), async (req, res) => {
  try {
    const { name, email, password, role = 'author', status = 'active', avatar } = req.body;

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
    const [result] = await db.promise.execute(`
      INSERT INTO users (name, email, password, role, status, avatar, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [name, email, hashedPassword, role, status, avatar || null]);

    // Get the created user
    const [newUser] = await db.promise.execute(`
      SELECT id, name, email, role, status, avatar, created_at
      FROM users WHERE id = ?
    `, [result.insertId]);

    res.status(201).json({
      error: false,
      message: 'User created successfully',
      data: {
        ...newUser[0],
        avatar: getFullAvatarUrl(newUser[0].avatar, req),
        created_at: newUser[0].created_at.toISOString()
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/v1/users/invite
// @desc    Invite a new user (Editor, Admin)
// @access  Private (Editor, Admin)
router.post('/invite', auth, authorize('editor', 'admin'), async (req, res) => {
  try {
    const { name, email, role = 'writer' } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        error: true,
        message: 'Name and email are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid email format'
      });
    }

    // Check if user already exists
    const [existingUsers] = await db.promise.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: true,
        message: 'User with this email already exists'
      });
    }

    // Generate a secure random password
    const password = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const [result] = await db.promise.execute(
      'INSERT INTO users (name, email, password, role, status, created_at) VALUES (?, ?, ?, ?, "active", NOW())',
      [name, email, hashedPassword, role]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({
        error: true,
        message: 'Failed to create user'
      });
    }

    const userId = result.insertId;

    // Send invitation email
    try {

      await sendInvitationEmail(email, name, password, role);

    } catch (emailError) {
      console.error('❌ Failed to send invitation email:', {
        error: emailError.message,
        code: emailError.code,
        stack: emailError.stack
      });
      
      // Don't fail the request if email fails, but log it
      // You might want to add this to a retry queue

    }

    res.status(201).json({
      error: false,
      message: 'User invited successfully',
      data: {
        id: userId,
        name,
        email,
        role,
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   PUT /api/v1/users/:id
// @desc    Update user
// @access  Private (Admin, or own profile)
router.put('/:id', auth, validate(userUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check permissions
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({
        error: true,
        message: 'Access denied'
      });
    }

    // Check if user exists
    const [users] = await db.promise.execute(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    // Build update query
    const updateFields = [];
    const updateParams = [];

    Object.keys(updateData).forEach(key => {
      if (key !== 'id' && key !== 'password' && updateData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateParams.push(updateData[key]);
      }
    });

    // Handle password update separately
    if (updateData.password) {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(updateData.password, saltRounds);
      updateFields.push('password = ?');
      updateParams.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'No fields to update'
      });
    }

    updateFields.push('updated_at = NOW()');
    updateParams.push(id);

    // Update user
    await db.promise.execute(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    // Get updated user
    const [updatedUser] = await db.promise.execute(`
      SELECT id, name, email, role, status, avatar, created_at, updated_at
      FROM users WHERE id = ?
    `, [id]);

    const formattedUser = {
      ...updatedUser[0],
      avatar: getFullAvatarUrl(updatedUser[0].avatar, req),
      created_at: updatedUser[0].created_at.toISOString(),
      updated_at: updatedUser[0].updated_at ? updatedUser[0].updated_at.toISOString() : null
    };

    res.json({
      error: false,
      message: 'User updated successfully',
      data: formattedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   DELETE /api/v1/users/:id
// @desc    Delete user
// @access  Private (Admin)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const [users] = await db.promise.execute(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    // Check if user has articles
    const [articles] = await db.promise.execute(
      'SELECT COUNT(*) as count FROM articles WHERE author_id = ?',
      [id]
    );

    if (articles[0].count > 0) {
      return res.status(400).json({
        error: true,
        message: 'Cannot delete user with existing articles'
      });
    }

    // Delete user
    await db.promise.execute('DELETE FROM users WHERE id = ?', [id]);

    res.json({
      error: false,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   PUT /api/v1/users/:id/status
// @desc    Update user status
// @access  Private (Admin)
router.put('/:id/status', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        error: true,
        message: 'Status must be "active" or "inactive"'
      });
    }

    const [result] = await db.promise.execute(
      'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    res.json({
      error: false,
      message: `User status updated to ${status}`
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/v1/users/:id/articles
// @desc    Get articles by user
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
      WHERE a.author_id = ? ${status !== 'all' ? 'AND a.status = ?' : ''}
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
      WHERE a.author_id = ? ${status !== 'all' ? 'AND a.status = ?' : ''}
      ORDER BY a.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;
    const articlesParams = status !== 'all' ? [id, status] : [id];
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
    console.error('Get user articles error:', error);
    res.status(500).json({
      error: true,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
