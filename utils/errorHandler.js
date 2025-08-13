/**
 * Centralized error handling utilities
 */

/**
 * Handle database errors and return appropriate response
 * @param {Error} error - The error object
 * @param {Object} res - Express response object
 * @param {string} operation - Description of the operation that failed
 * @returns {boolean} - True if error was handled, false if it should be passed to global handler
 */
function handleDatabaseError(error, res, operation = 'Database operation') {
  console.error(`🗄️ ${operation} error:`, error);
  
  // Handle specific MySQL errors
  if (error.code === 'ER_TRUNCATED_WRONG_VALUE') {
    console.error('📅 Database datetime error:', error.sqlMessage);
    res.status(400).json({
      error: true,
      message: 'Invalid date format provided',
      details: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
    });
    return true;
  }
  
  if (error.code === 'ER_DUP_ENTRY') {
    console.error('🔑 Database duplicate entry error:', error.sqlMessage);
    res.status(409).json({
      error: true,
      message: 'Duplicate entry found',
      details: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
    });
    return true;
  }
  
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    console.error('🔗 Foreign key constraint error:', error.sqlMessage);
    res.status(400).json({
      error: true,
      message: 'Referenced record not found',
      details: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
    });
    return true;
  }
  
  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    console.error('🔗 Foreign key constraint error (referenced):', error.sqlMessage);
    res.status(400).json({
      error: true,
      message: 'Cannot delete record as it is referenced by other records',
      details: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
    });
    return true;
  }
  
  if (error.code && error.code.startsWith('ER_')) {
    console.error('🗄️ Database error:', error.code, error.sqlMessage);
    res.status(500).json({
      error: true,
      message: 'Database operation failed',
      details: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
    });
    return true;
  }
  
  // Handle connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    console.error('🔌 Database connection error:', error.message);
    res.status(503).json({
      error: true,
      message: 'Database service unavailable',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
    return true;
  }
  
  // Handle timeout errors
  if (error.code === 'ETIMEDOUT') {
    console.error('⏰ Database timeout error:', error.message);
    res.status(504).json({
      error: true,
      message: 'Database operation timed out',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
    return true;
  }
  
  return false; // Let global handler deal with it
}

/**
 * Handle validation errors
 * @param {Error} error - The error object
 * @param {Object} res - Express response object
 * @returns {boolean} - True if error was handled
 */
function handleValidationError(error, res) {
  if (error.name === 'ValidationError' || error.message.includes('validation')) {
    console.error('✅ Validation error:', error.message);
    res.status(400).json({
      error: true,
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    return true;
  }
  return false;
}

/**
 * Handle authentication/authorization errors
 * @param {Error} error - The error object
 * @param {Object} res - Express response object
 * @returns {boolean} - True if error was handled
 */
function handleAuthError(error, res) {
  if (error.name === 'JsonWebTokenError' || error.message.includes('jwt')) {
    console.error('🔐 JWT error:', error.message);
    res.status(401).json({
      error: true,
      message: 'Invalid or expired token'
    });
    return true;
  }
  
  if (error.name === 'TokenExpiredError') {
    console.error('⏰ Token expired:', error.message);
    res.status(401).json({
      error: true,
      message: 'Token has expired'
    });
    return true;
  }
  
  return false;
}

/**
 * Generic error handler for route handlers
 * @param {Error} error - The error object
 * @param {Object} res - Express response object
 * @param {string} operation - Description of the operation that failed
 */
function handleRouteError(error, res, operation = 'Operation') {
  console.error(`🚨 ${operation} error:`, error);
  
  // Try specific error handlers first
  if (handleDatabaseError(error, res, operation)) return;
  if (handleValidationError(error, res)) return;
  if (handleAuthError(error, res)) return;
  
  // Default error response
  res.status(500).json({
    error: true,
    message: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

/**
 * Async route wrapper to catch errors
 * @param {Function} fn - Async route handler function
 * @param {string} operation - Description of the operation
 * @returns {Function} - Express route handler
 */
function asyncHandler(fn, operation = 'Route operation') {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(error => {
      handleRouteError(error, res, operation);
    });
  };
}

module.exports = {
  handleDatabaseError,
  handleValidationError,
  handleAuthError,
  handleRouteError,
  asyncHandler
};
