-- =====================================================
-- WhereDJsPlay News Database Setup
-- Complete SQL file for setting up the database
-- =====================================================

-- Create database
CREATE DATABASE IF NOT EXISTS wheredjsplay_news;
USE wheredjsplay_news;

-- =====================================================
-- Create Tables
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('author', 'editor', 'admin') DEFAULT 'author',
  status ENUM('active', 'inactive') DEFAULT 'active',
  avatar VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(191) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#09afdf',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(191) NOT NULL,
  excerpt TEXT NOT NULL,
  content LONGTEXT NOT NULL,
  category_id INT NOT NULL,
  author_id INT NOT NULL,
  image VARCHAR(191),
  featured BOOLEAN DEFAULT FALSE,
  status ENUM('draft', 'pending', 'published') DEFAULT 'draft',
  tags TEXT,
  seo_title VARCHAR(60),
  seo_description VARCHAR(160),
  views INT DEFAULT 0,
  publish_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_status (status),
  INDEX idx_featured (featured),
  INDEX idx_publish_date (publish_date),
  INDEX idx_views (views)
);

-- Newsletter subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  name VARCHAR(100),
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

-- Site settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(191) NOT NULL UNIQUE,
  setting_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_setting_key (setting_key)
);

-- =====================================================
-- Insert Initial Data
-- =====================================================

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO users (name, email, password, role, status) VALUES 
('Admin User', 'admin@wheredjsplay.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6', 'admin', 'active');

-- Insert sample categories
INSERT IGNORE INTO categories (name, slug, description, color) VALUES 
('Artist News', 'artist-news', 'Latest news about DJs and electronic music artists', '#09afdf'),
('Event Reports', 'event-reports', 'Festival coverage and event reviews', '#10b981'),
('Gear & Tech', 'gear-tech', 'Equipment reviews and technology updates', '#f59e0b'),
('Trending Tracks', 'trending-tracks', 'Popular tracks and chart updates', '#ef4444'),
('Industry News', 'industry-news', 'Business updates and industry insights', '#8b5cf6'),
('Education News', 'education-news', 'Learning resources and tutorials', '#06b6d4');

-- Insert sample users
INSERT IGNORE INTO users (name, email, password, role, status) VALUES 
('Sarah Martinez', 'sarah@wheredjsplay.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6', 'editor', 'active'),
('Mike Johnson', 'mike@wheredjsplay.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6', 'author', 'active'),
('Lisa Rodriguez', 'lisa@wheredjsplay.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6', 'author', 'active');

-- Insert sample articles
INSERT IGNORE INTO articles (title, excerpt, content, category_id, author_id, image, featured, status, tags, seo_title, seo_description, views, publish_date) VALUES 
(
  'Carl Cox Announces Revolutionary 2024 World Tour with Cutting-Edge Holographic Technology',
  'The legendary techno pioneer reveals his most ambitious tour yet, featuring cutting-edge holographic technology and immersive 360-degree sound systems that will redefine the festival experience.',
  '<p>The legendary techno pioneer Carl Cox has just announced his most ambitious world tour to date, featuring cutting-edge holographic technology and immersive 360-degree sound systems that promise to redefine the festival experience for electronic music fans worldwide.</p><p>In an exclusive interview with WhereDJsPlay, Cox revealed that the tour will span 50 cities across six continents, with each show featuring a completely unique stage design that incorporates advanced holographic projections, AI-powered lighting systems, and revolutionary spatial audio technology.</p><h3>Revolutionary Technology</h3><p>"We''re not just playing music anymore," Cox explained during our conversation at his Ibiza studio. "We''re creating immersive experiences that transport people to another dimension. The technology we''re using has never been seen in electronic music before."</p><p>The tour''s centerpiece is a custom-built stage that features a 360-degree holographic projection system, allowing Cox to appear as multiple versions of himself throughout the performance. The system, developed in partnership with leading tech companies, creates the illusion that the DJ is performing from multiple positions simultaneously.</p>',
  1, 1, '/images/articles/37_wNdv100.jpg', 1, 'published', 'carl cox, techno, world tour, holographic, electronic music', 'Carl Cox 2024 World Tour - Revolutionary Holographic Technology', 'Carl Cox announces his most ambitious world tour featuring cutting-edge holographic technology and immersive sound systems.', 2400, NOW()
),
(
  'Pioneer Unveils Next-Gen CDJ-4000: AI-Powered Beat Matching and Holographic Displays',
  'Revolutionary new features include AI-powered beat matching, holographic displays, and wireless streaming capabilities that will change how DJs perform.',
  '<p>Pioneer has just unveiled their most advanced CDJ model yet, the CDJ-4000, featuring groundbreaking AI-powered beat matching technology and holographic displays that promise to revolutionize the DJ industry.</p><p>The new flagship player incorporates machine learning algorithms that can analyze tracks in real-time, providing intelligent beat matching suggestions and automatic tempo synchronization. This represents a significant leap forward in DJ technology, making it easier for both beginners and professionals to create seamless mixes.</p><h3>AI-Powered Features</h3><p>The CDJ-4000''s AI system can analyze thousands of tracks per second, identifying key musical elements like BPM, key, and energy levels. This allows the system to suggest optimal track combinations and provide real-time mixing assistance.</p><p>"We''ve essentially created a co-pilot for DJs," said Pioneer''s lead engineer. "The AI doesn''t replace the DJ''s creativity, but it enhances their ability to focus on the artistic aspects of their performance."</p>',
  3, 2, '/images/articles/46_JC6vzus.jpg', 0, 'published', 'pioneer, cdj-4000, ai, beat matching, dj equipment', 'Pioneer CDJ-4000 - AI-Powered Beat Matching Technology', 'Pioneer unveils the CDJ-4000 with AI-powered beat matching and holographic displays.', 1800, NOW()
),
(
  'Tomorrowland 2024: Record-Breaking Attendance and Groundbreaking Stage Designs',
  'This year''s festival exceeded all expectations with groundbreaking stage designs, surprise collaborations, and performances that will be talked about for years.',
  '<p>Tomorrowland 2024 has officially become the most successful edition in the festival''s history, with record-breaking attendance and groundbreaking stage designs that have set new standards for electronic music festivals worldwide.</p><p>Over 400,000 attendees from 200 countries gathered in Boom, Belgium, for the two-weekend extravaganza, which featured 16 stages and more than 1,000 artists. The festival''s innovative approach to stage design and production technology created an immersive experience unlike anything seen before.</p><h3>Revolutionary Stage Technology</h3><p>The main stage, designed by renowned architect Arne Quinze, featured a 50-meter-high structure with integrated LED panels, laser systems, and pyrotechnics that synchronized perfectly with the music. The stage''s design was inspired by nature and technology, creating a futuristic yet organic atmosphere.</p><p>"We wanted to create something that would transport people to another dimension," said Tomorrowland''s creative director. "The combination of cutting-edge technology and artistic vision has resulted in an experience that goes beyond just music."</p>',
  2, 3, '/images/articles/img_0002.jpg', 1, 'published', 'tomorrowland, festival, electronic music, belgium, stage design', 'Tomorrowland 2024 - Record-Breaking Festival Success', 'Tomorrowland 2024 sets new records with groundbreaking stage designs and record attendance.', 3200, NOW()
);

-- Insert default site settings
INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES 
('site_name', 'WhereDJsPlay'),
('site_description', 'Your Ultimate Source for DJ & Electronic Music News'),
('site_url', 'https://wheredjsplay.com'),
('contact_email', 'contact@wheredjsplay.com'),
('social_facebook', 'https://facebook.com/wheredjsplay'),
('social_twitter', 'https://twitter.com/wheredjsplay'),
('social_instagram', 'https://instagram.com/wheredjsplay');

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check if tables were created successfully
SELECT 'Tables created successfully' as status;

-- Show table information
SHOW TABLES;

-- Count records in each table
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'articles', COUNT(*) FROM articles
UNION ALL
SELECT 'newsletter_subscribers', COUNT(*) FROM newsletter_subscribers
UNION ALL
SELECT 'site_settings', COUNT(*) FROM site_settings;

-- =====================================================
-- Default Login Credentials
-- =====================================================
-- 
-- Admin User:
-- Email: admin@wheredjsplay.com
-- Password: admin123
-- 
-- Sample Users:
-- Email: sarah@wheredjsplay.com, Password: admin123, Role: editor
-- Email: mike@wheredjsplay.com, Password: admin123, Role: author
-- Email: lisa@wheredjsplay.com, Password: admin123, Role: author
-- 
-- =====================================================
