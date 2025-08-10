const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Default JWT secret for development (should be set via environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_wheredjsplay_2024_change_in_production';

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: true, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const [rows] = await db.promise.execute(
      'SELECT id, name, email, role, status FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ 
        error: true, 
        message: 'Invalid token. User not found.' 
      });
    }

    const user = rows[0];
    
    if (user.status !== 'active') {
      return res.status(401).json({ 
        error: true, 
        message: 'Account is inactive.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      error: true, 
      message: 'Invalid token.' 
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: true, 
        message: 'Access denied. Authentication required.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: true, 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

module.exports = { auth, authorize };
