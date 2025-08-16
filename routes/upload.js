const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directories exist
const articlesUploadsDir = path.join(__dirname, '../uploads/images/articles');
const avatarsUploadsDir = path.join(__dirname, '../uploads/images/avatars');

if (!fs.existsSync(articlesUploadsDir)) {
  fs.mkdirSync(articlesUploadsDir, { recursive: true });
}

if (!fs.existsSync(avatarsUploadsDir)) {
  fs.mkdirSync(avatarsUploadsDir, { recursive: true });
}

// Configure multer for article image uploads
const articleStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, articlesUploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = 'article-' + uniqueSuffix + ext;
    cb(null, filename);
  }
});

// Configure multer for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsUploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = 'avatar-' + uniqueSuffix + ext;
    cb(null, filename);
  }
});

const uploadArticle = multer({
  storage: articleStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed!'), false);
    }
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for avatars
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed!'), false);
    }
  }
});

// @route   POST /api/v1/upload/image
// @desc    Upload an image file for articles
// @access  Private
router.post('/image', auth, (req, res) => {
  const uploadSingle = uploadArticle.single('image');
  
  uploadSingle(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading image'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    try {
      // Optimize the image using Sharp
      const optimizedFilename = `optimized-${req.file.filename}`;
      const optimizedPath = path.join(articlesUploadsDir, optimizedFilename);
      
      await sharp(req.file.path)
        .resize(1200, 800, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 85, progressive: true })
        .toFile(optimizedPath);
      
      // Remove the original file
      fs.unlinkSync(req.file.path);
      
      // Create the URL path for the optimized file
      const imageUrl = `/uploads/images/articles/${optimizedFilename}`;
      
      console.log('Image uploaded and optimized successfully:', {
        filename: optimizedFilename,
        originalname: req.file.originalname,
        size: fs.statSync(optimizedPath).size,
        mimetype: 'image/jpeg',
        url: imageUrl
      });

      res.json({
        success: true,
        message: 'Image uploaded and optimized successfully',
        data: {
          filename: optimizedFilename,
          originalName: req.file.originalname,
          mimetype: 'image/jpeg',
          size: fs.statSync(optimizedPath).size,
          url: imageUrl,
          fullUrl: `${req.protocol}://${req.get('host')}${imageUrl}`
        }
      });
    } catch (optimizeError) {
      console.error('Image optimization error:', optimizeError);
      
      // If optimization fails, return the original file
      const imageUrl = `/uploads/images/articles/${req.file.filename}`;
      
      res.json({
        success: true,
        message: 'Image uploaded successfully (optimization failed)',
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          url: imageUrl,
          fullUrl: `${req.protocol}://${req.get('host')}${imageUrl}`
        }
      });
    }
  });
});

// @route   POST /api/v1/upload/avatar
// @desc    Upload an avatar image for user profiles
// @access  Private
router.post('/avatar', auth, (req, res) => {
  const uploadSingle = uploadAvatar.single('avatar');
  
  uploadSingle(req, res, async (err) => {
    if (err) {
      console.error('Avatar upload error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading avatar'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No avatar file provided'
      });
    }

    try {
      // Optimize the avatar using Sharp (square format, smaller size)
      const optimizedFilename = `optimized-${req.file.filename}`;
      const optimizedPath = path.join(avatarsUploadsDir, optimizedFilename);
      
      await sharp(req.file.path)
        .resize(300, 300, { 
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 85, progressive: true })
        .toFile(optimizedPath);
      
      // Remove the original file
      fs.unlinkSync(req.file.path);
      
      // Create the URL path for the optimized file
      const avatarUrl = `/uploads/images/avatars/${optimizedFilename}`;
      
      console.log('Avatar uploaded and optimized successfully:', {
        filename: optimizedFilename,
        originalname: req.file.originalname,
        size: fs.statSync(optimizedPath).size,
        mimetype: 'image/jpeg',
        url: avatarUrl
      });

      res.json({
        success: true,
        message: 'Avatar uploaded and optimized successfully',
        data: {
          filename: optimizedFilename,
          originalName: req.file.originalname,
          mimetype: 'image/jpeg',
          size: fs.statSync(optimizedPath).size,
          url: avatarUrl,
          fullUrl: `${req.protocol}://${req.get('host')}${avatarUrl}`
        }
      });
    } catch (optimizeError) {
      console.error('Avatar optimization error:', optimizeError);
      
      // If optimization fails, return the original file
      const avatarUrl = `/uploads/images/avatars/${req.file.filename}`;
      
      res.json({
        success: true,
        message: 'Avatar uploaded successfully (optimization failed)',
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          url: avatarUrl,
          fullUrl: `${req.protocol}://${req.get('host')}${avatarUrl}`
        }
      });
    }
  });
});

// @route   DELETE /api/v1/upload/image/:filename
// @desc    Delete an uploaded image
// @access  Private
router.delete('/image/:filename', auth, (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(articlesUploadsDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    // Delete the file
    fs.unlinkSync(filePath);
    
    console.log('Image deleted:', filename);
    
    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting image'
    });
  }
});

// @route   DELETE /api/v1/upload/avatar/:filename
// @desc    Delete an uploaded avatar
// @access  Private
router.delete('/avatar/:filename', auth, (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(avatarsUploadsDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found'
      });
    }
    
    // Delete the file
    fs.unlinkSync(filePath);
    
    console.log('Avatar deleted:', filename);
    
    res.json({
      success: true,
      message: 'Avatar deleted successfully'
    });
  } catch (error) {
    console.error('Delete avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting avatar'
    });
  }
});

// @route   GET /api/v1/upload/test
// @desc    Test upload endpoint
// @access  Public
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Upload endpoint is working',
    articlesUploadsDir: articlesUploadsDir,
    avatarsUploadsDir: avatarsUploadsDir,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;