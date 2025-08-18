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

// Completely disable security middleware for images
// app.use(helmet({
//   crossOriginEmbedderPolicy: false,
//   crossOriginResourcePolicy: { policy: "cross-origin" },
//   contentSecurityPolicy: false,
// }));

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
//     'http://localhost:3001',
//     'http://13.60.95.22:80',
//     'http://13.60.95.22/wdjpnews'
//   ],
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
//   allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
//   credentials: true,
//   optionsSuccessStatus: 200
// };
// app.use(cors(corsOptions));

// Completely unrestricted global CORS - NO restrictions
app.use((req, res, next) => {
  // Remove ALL security headers that could block anything
  res.removeHeader('Cross-Origin-Resource-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  res.removeHeader('Cross-Origin-Opener-Policy');
  
  // Set completely permissive CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Max-Age', '86400');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Completely disable cors middleware - NO restrictions
// app.use(cors({ origin: '*' }));


// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware with error handling
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    // Skip verification for empty bodies
    if (!buf || buf.length === 0) {
      return;
    }
    
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

// Completely unrestricted image serving - NO CORS restrictions
app.use('/uploads', (req, res, next) => {
  // Remove ALL security headers that could block images
  res.removeHeader('Cross-Origin-Resource-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  res.removeHeader('Cross-Origin-Opener-Policy');
  
  // Set permissive CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Max-Age', '86400');
  res.header('Cache-Control', 'public, max-age=31536000');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Log image requests
  console.log('📁 Unrestricted image request:', req.method, req.url);

  next();
}, express.static(path.join(__dirname, 'uploads')));

// Alternative unrestricted image serving endpoint - Fixed URL structure
app.get('/images-unrestricted/*', (req, res) => {
  const requestedPath = req.params[0]; // Get everything after /images-unrestricted/
  let actualPath = requestedPath;
  
  // If the path starts with /uploads/, remove it to avoid double path
  if (requestedPath.startsWith('uploads/')) {
    actualPath = requestedPath;
  } else if (requestedPath.startsWith('/uploads/')) {
    actualPath = requestedPath.substring(1); // Remove leading slash
  }
  
  const fullPath = path.join(__dirname, 'uploads', actualPath);
  
  console.log('🖼️ Alternative endpoint - Requested:', requestedPath);
  console.log('🖼️ Alternative endpoint - Actual path:', actualPath);
  console.log('🖼️ Alternative endpoint - Full path:', fullPath);
  
  // Remove ALL security headers
  res.removeHeader('Cross-Origin-Resource-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  res.removeHeader('Cross-Origin-Opener-Policy');
  
  // Set completely permissive headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cache-Control', 'public, max-age=31536000');
  
  if (fs.existsSync(fullPath)) {
    console.log('✅ Image found via alternative endpoint, serving:', fullPath);
    res.sendFile(fullPath);
  } else {
    console.log('❌ Image not found via alternative endpoint:', fullPath);
    res.status(404).json({ 
      error: 'Image not found', 
      requestedPath,
      actualPath,
      fullPath 
    });
  }
});

// Serve public images with open CORS
app.use('/images', (req, res, next) => {
  // Set CORS headers for all image requests
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  res.header('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Log image requests in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📁 Public image request:', req.method, req.url);
  }
  
  next();
}, express.static(path.join(__dirname, '../wheredjsplay-unified/public/images')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'WhereDJsPlay API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Completely unrestricted image proxy - NO restrictions at all
app.get('/image-proxy/:path(*)', (req, res) => {
  const imagePath = req.params.path;
  const fullPath = path.join(__dirname, 'uploads', imagePath);
  
  console.log('🖼️ Proxy serving image:', imagePath);
  console.log('🖼️ Full path:', fullPath);
  
  // Remove ALL security headers
  res.removeHeader('Cross-Origin-Resource-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  res.removeHeader('Cross-Origin-Opener-Policy');
  
  // Set completely permissive headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cache-Control', 'public, max-age=31536000');
  
  if (fs.existsSync(fullPath)) {
    console.log('✅ Image found, serving via proxy without restrictions');
    res.sendFile(fullPath);
  } else {
    console.log('❌ Image not found via proxy:', fullPath);
    res.status(404).json({ error: 'Image not found' });
  }
});

// Completely unrestricted direct image serving - NO restrictions at all
app.get('/uploads/images/articles/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, 'uploads/images/articles', filename);
  
  console.log('🖼️ Serving image:', filename);
  console.log('🖼️ Full path:', imagePath);
  
  // Remove ALL security headers
  res.removeHeader('Cross-Origin-Resource-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  res.removeHeader('Cross-Origin-Opener-Policy');
  
  // Set completely permissive headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cache-Control', 'public, max-age=31536000');
  
  if (fs.existsSync(imagePath)) {
    console.log('✅ Image found, serving without restrictions');
    res.sendFile(imagePath);
  } else {
    console.log('❌ Image not found:', imagePath);
    res.status(404).json({ error: 'Image not found', path: imagePath });
  }
});

// Avatar image serving - NO restrictions at all
app.get('/uploads/images/avatars/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, 'uploads/images/avatars', filename);
  
  console.log('👤 Serving avatar:', filename);
  console.log('👤 Full path:', imagePath);
  
  // Remove ALL security headers
  res.removeHeader('Cross-Origin-Resource-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  res.removeHeader('Cross-Origin-Opener-Policy');
  
  // Set completely permissive headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cache-Control', 'public, max-age=31536000');
  
  if (fs.existsSync(imagePath)) {
    console.log('✅ Avatar found, serving without restrictions');
    res.sendFile(imagePath);
  } else {
    console.log('❌ Avatar not found:', imagePath);
    res.status(404).json({ error: 'Avatar not found', path: imagePath });
  }
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

// Test avatar serving endpoint
app.get('/test-avatar/:filename', (req, res) => {
  const { filename } = req.params;
  const imagePath = path.join(__dirname, 'uploads/images/avatars', filename);
  
  console.log('🧪 Testing avatar:', filename);
  console.log('🧪 Full path:', imagePath);
  
  if (fs.existsSync(imagePath)) {
    console.log('✅ Avatar found, serving...');
    res.sendFile(imagePath);
  } else {
    console.log('❌ Avatar not found');
    res.status(404).json({
      error: true,
      message: 'Avatar not found',
      path: imagePath
    });
  }
});

// List available images endpoint
app.get('/list-images', (req, res) => {
  const articlesDir = path.join(__dirname, 'uploads/images/articles');
  const avatarsDir = path.join(__dirname, 'uploads/images/avatars');
  
  try {
    const result = {
      success: true,
      articles: {
        directory: articlesDir,
        files: [],
        count: 0
      },
      avatars: {
        directory: avatarsDir,
        files: [],
        count: 0
      }
    };
    
    if (fs.existsSync(articlesDir)) {
      result.articles.files = fs.readdirSync(articlesDir);
      result.articles.count = result.articles.files.length;
    }
    
    if (fs.existsSync(avatarsDir)) {
      result.avatars.files = fs.readdirSync(avatarsDir);
      result.avatars.count = result.avatars.files.length;
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reading directories',
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
