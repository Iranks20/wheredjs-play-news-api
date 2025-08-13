const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const path = require('path'); // Added for path.join
const fs = require('fs'); // Added for file system operations

const db = require('./config/database');
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const categoryRoutes = require('./routes/categories');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');
const analyticsRoutes = require('./routes/analytics');
const newsletterRoutes = require('./routes/newsletter');
const searchRoutes = require('./routes/search');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3001;

// Test database connection
db.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('✅ Database connected successfully');
  connection.release();
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false, // Disable CSP completely for development
}));

// Rate limiting - Disabled by default, can be enabled via env var
const enableRateLimit = process.env.ENABLE_RATE_LIMIT === 'true'; // Must be explicitly enabled

if (enableRateLimit) {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // 1000 requests per 15 minutes
    message: {
      error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Skip rate limiting for certain paths
    skip: (req) => {
      // Skip rate limiting for health checks and static files
      return req.path === '/health' || 
             req.path.startsWith('/uploads/') || 
             req.path.startsWith('/images/') ||
             req.path === '/test-image' ||
             req.path === '/list-images';
    }
  });

  // Apply rate limiting to API routes only
  app.use('/api/', limiter);
  console.log('🛡️ Rate limiting enabled: 1000 requests per 15 minutes');
} else {
  console.log('✅ Rate limiting disabled by default');
}

// CORS configuration
// const corsOptions = {
//   origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [
//     'http://localhost:3000', 
//     'http://127.0.0.1:3000',
//     'http://localhost:5173', 
//     'http://127.0.0.1:5173',
//     'http://localhost:3001',
//     'http://13.60.95.22',
//     'http://13.60.95.22:3001',
//     'http://13.60.95.22:80',
//     'http://13.60.95.22/wdjpnews'
//   ],
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
//   allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
//   credentials: true,
//   optionsSuccessStatus: 200
// };
// app.use(cors(corsOptions));

app.use(cors({ origin: '*' }));


// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware with error handling
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        error: true,
        message: 'Invalid JSON payload'
      });
      return;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Special CORS for static files (images) - Apply before static file serving
app.use('/uploads', (req, res, next) => {
  console.log('📸 Image request:', req.method, req.url);
  console.log('📸 Request headers:', req.headers);
  
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('📸 Handling OPTIONS preflight request');
    res.status(200).end();
    return;
  }
  
  next();
});

// Static files with debugging
app.use('/uploads', (req, res, next) => {
  console.log('📁 Static file request:', req.method, req.url);
  console.log('📁 File path:', path.join(__dirname, 'uploads', req.url));
  
  // Check if file exists
  const filePath = path.join(__dirname, 'uploads', req.url);
  if (fs.existsSync(filePath)) {
    console.log('✅ File exists:', filePath);
  } else {
    console.log('❌ File not found:', filePath);
  }
  
  next();
}, express.static('uploads'));

// Special CORS for public images
app.use('/images', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Serve public images from the frontend directory
app.use('/images', express.static(path.join(__dirname, '../wheredjsplay-unified/public/images')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'WhereDJsPlay API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Test image serving endpoint
app.get('/test-image/:filename', (req, res) => {
  const { filename } = req.params;
  const imagePath = path.join(__dirname, 'uploads/images/articles', filename);
  
  console.log('🧪 Testing image:', filename);
  console.log('🧪 Full path:', imagePath);
  
  if (fs.existsSync(imagePath)) {
    console.log('✅ Image found, serving...');
    res.sendFile(imagePath);
  } else {
    console.log('❌ Image not found');
    res.status(404).json({
      error: true,
      message: 'Image not found',
      path: imagePath
    });
  }
});

// List available images endpoint
app.get('/list-images', (req, res) => {
  const uploadsDir = path.join(__dirname, 'uploads/images/articles');
  
  try {
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      res.json({
        success: true,
        directory: uploadsDir,
        files: files,
        count: files.length
      });
    } else {
      res.json({
        success: false,
        message: 'Uploads directory not found',
        directory: uploadsDir
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reading directory',
      error: error.message
    });
  }
});

// API Routes
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/articles`, articleRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/upload`, uploadRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/newsletter`, newsletterRoutes);
app.use(`${API_PREFIX}/search`, searchRoutes);
app.use(`${API_PREFIX}/settings`, settingsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🚨 Global Error Handler:', err);
  
  // Handle specific database errors
  if (err.code === 'ER_TRUNCATED_WRONG_VALUE') {
    console.error('📅 Database datetime error:', err.sqlMessage);
    return res.status(400).json({
      error: true,
      message: 'Invalid date format provided',
      details: process.env.NODE_ENV === 'development' ? err.sqlMessage : undefined
    });
  }
  
  if (err.code === 'ER_DUP_ENTRY') {
    console.error('🔑 Database duplicate entry error:', err.sqlMessage);
    return res.status(409).json({
      error: true,
      message: 'Duplicate entry found',
      details: process.env.NODE_ENV === 'development' ? err.sqlMessage : undefined
    });
  }
  
  if (err.code && err.code.startsWith('ER_')) {
    console.error('🗄️ Database error:', err.code, err.sqlMessage);
    return res.status(500).json({
      error: true,
      message: 'Database operation failed',
      details: process.env.NODE_ENV === 'development' ? err.sqlMessage : undefined
    });
  }
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: true,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}${API_PREFIX}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  console.error('📊 Error details:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Log to file if needed (optional)
  // fs.appendFileSync('error.log', `${new Date().toISOString()} - Uncaught Exception: ${error.stack}\n`);
  
  // Don't exit the process, just log the error and continue
  console.log('🔄 Server continuing to run despite uncaught exception');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise);
  console.error('📊 Rejection reason:', reason);
  console.error('📊 Error details:', {
    reason: reason instanceof Error ? {
      name: reason.name,
      message: reason.message,
      stack: reason.stack
    } : reason,
    timestamp: new Date().toISOString()
  });
  
  // Log to file if needed (optional)
  // fs.appendFileSync('error.log', `${new Date().toISOString()} - Unhandled Rejection: ${reason}\n`);
  
  // Don't exit the process, just log the error and continue
  console.log('🔄 Server continuing to run despite unhandled rejection');
});

module.exports = app;
