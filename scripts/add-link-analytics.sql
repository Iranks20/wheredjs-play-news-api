-- Create link_analytics table for tracking short link clicks
CREATE TABLE IF NOT EXISTS link_analytics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  short_link_id INT NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  referrer VARCHAR(500),
  country VARCHAR(100),
  city VARCHAR(100),
  clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (short_link_id) REFERENCES short_links(id) ON DELETE CASCADE,
  INDEX idx_short_link_id (short_link_id),
  INDEX idx_clicked_at (clicked_at),
  INDEX idx_referrer (referrer(100)),
  INDEX idx_country (country)
);

-- Create short_links table for managing canonical short links
CREATE TABLE IF NOT EXISTS short_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL,
  short_slug VARCHAR(255) NOT NULL UNIQUE,
  full_url VARCHAR(500) NOT NULL,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_term VARCHAR(100),
  utm_content VARCHAR(100),
  click_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  INDEX idx_article_id (article_id),
  INDEX idx_short_slug (short_slug),
  INDEX idx_is_active (is_active),
  INDEX idx_click_count (click_count)
);

-- Add slug column to articles if it doesn't exist
ALTER TABLE articles ADD COLUMN IF NOT EXISTS slug VARCHAR(255) NULL AFTER title;
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles (slug);

-- Update existing articles to have slugs if they don't
UPDATE articles 
SET slug = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(title, ' ', '-'), '''', ''), '"', ''), ',', ''), '.', '')) 
WHERE slug IS NULL OR slug = '';

-- Create a view for analytics summary
CREATE OR REPLACE VIEW link_analytics_summary AS
SELECT 
  sl.article_id,
  a.title as article_title,
  a.slug as article_slug,
  sl.short_slug,
  COUNT(la.id) as total_clicks,
  COUNT(DISTINCT la.ip_address) as unique_visitors,
  COUNT(DISTINCT DATE(la.clicked_at)) as active_days,
  MAX(la.clicked_at) as last_clicked,
  MIN(la.clicked_at) as first_clicked,
  COUNT(CASE WHEN la.clicked_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as clicks_last_30_days,
  COUNT(CASE WHEN la.clicked_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as clicks_last_7_days,
  COUNT(CASE WHEN la.clicked_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 END) as clicks_last_24_hours
FROM short_links sl
LEFT JOIN link_analytics la ON sl.id = la.short_link_id
JOIN articles a ON sl.article_id = a.id
GROUP BY sl.article_id, sl.short_slug, a.title, a.slug;

-- Create a view for top referrers
CREATE OR REPLACE VIEW top_referrers AS
SELECT 
  sl.article_id,
  a.title as article_title,
  la.referrer,
  COUNT(la.id) as click_count,
  COUNT(DISTINCT la.ip_address) as unique_visitors,
  MAX(la.clicked_at) as last_referral
FROM short_links sl
LEFT JOIN link_analytics la ON sl.id = la.short_link_id
JOIN articles a ON sl.article_id = a.id
WHERE la.referrer IS NOT NULL AND la.referrer != ''
GROUP BY sl.article_id, la.referrer, a.title
ORDER BY click_count DESC;
