const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/images/articles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = 'article-' + uniqueSuffix + ext;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
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

// @route   POST /api/v1/upload/image
// @desc    Upload an image file for articles
// @access  Private
router.post('/image', auth, (req, res) => {
  const uploadSingle = upload.single('image');
  
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
      const optimizedPath = path.join(uploadsDir, optimizedFilename);
      
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

// @route   DELETE /api/v1/upload/image/:filename
// @desc    Delete an uploaded image
// @access  Private
router.delete('/image/:filename', auth, (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);
    
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

// @route   GET /api/v1/upload/test
// @desc    Test upload endpoint
// @access  Public
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Upload endpoint is working',
    uploadsDir: uploadsDir,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;