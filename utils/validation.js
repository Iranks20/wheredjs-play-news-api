const Joi = require('joi');

// Article validation schemas
const articleSchema = Joi.object({
  title: Joi.string().min(10).max(200).required(),
  excerpt: Joi.string().min(20).max(500).required(),
  content: Joi.string().min(100).required(),
  category_id: Joi.number().integer().positive().required(),
  author_id: Joi.number().integer().positive().required(),
  image: Joi.string().allow('', null).optional(),
  embedded_media: Joi.string().uri().allow('', null).optional(),
  media_type: Joi.string().valid('image', 'spotify', 'youtube', 'soundcloud', 'beatport').default('image'),
  featured: Joi.boolean().default(false),
  status: Joi.string().valid('draft', 'pending', 'published').default('draft'),
  tags: Joi.string().allow('', null).optional(),
  seo_title: Joi.string().max(60).allow('', null).optional(),
  seo_description: Joi.string().max(160).allow('', null).optional(),
  publish_date: Joi.date().allow(null).optional()
});

const articleUpdateSchema = Joi.object({
  title: Joi.string().min(10).max(200).optional(),
  excerpt: Joi.string().min(20).max(500).optional(),
  content: Joi.string().min(100).optional(),
  category_id: Joi.number().integer().positive().optional(),
  author_id: Joi.number().integer().positive().optional(),
  image: Joi.string().allow('', null).optional(),
  embedded_media: Joi.string().uri().allow('', null).optional(),
  media_type: Joi.string().valid('image', 'spotify', 'youtube', 'soundcloud', 'beatport').optional(),
  featured: Joi.boolean().optional(),
  status: Joi.string().valid('draft', 'pending', 'published').optional(),
  tags: Joi.string().allow('', null).optional(),
  seo_title: Joi.string().max(60).allow('', null).optional(),
  seo_description: Joi.string().max(160).allow('', null).optional(),
  publish_date: Joi.date().allow(null).optional()
});

// Category validation schemas
const categorySchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  slug: Joi.string().min(2).max(50).required(),
  description: Joi.string().max(200).optional(),
  color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional()
});

// User validation schemas
const userSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('author', 'editor', 'admin', 'writer').default('author'),
  status: Joi.string().valid('active', 'inactive').default('active'),
  avatar: Joi.string().optional()
});

const userUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional(),
  role: Joi.string().valid('author', 'editor', 'admin', 'writer').optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
  avatar: Joi.string().optional()
});

// Auth validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('author', 'editor', 'admin', 'writer').default('author')
});

// Newsletter validation
const newsletterSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).optional()
});

// Search validation
const searchSchema = Joi.object({
  q: Joi.string().min(2).required(),
  category: Joi.string().optional(),
  status: Joi.string().valid('draft', 'pending', 'published').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: true,
        message: error.details[0].message
      });
    }
    next();
  };
};

// Query validation middleware
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: true,
        message: error.details[0].message
      });
    }
    next();
  };
};

module.exports = {
  articleSchema,
  articleUpdateSchema,
  categorySchema,
  userSchema,
  userUpdateSchema,
  loginSchema,
  registerSchema,
  newsletterSchema,
  searchSchema,
  validate,
  validateQuery
};
