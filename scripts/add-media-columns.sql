-- Migration script to add embedded media support to articles table
-- Run this script on existing databases to add the new columns

-- Add embedded_media column
ALTER TABLE articles ADD COLUMN embedded_media TEXT NULL AFTER image;

-- Add media_type column with default value
ALTER TABLE articles ADD COLUMN media_type ENUM('image', 'spotify', 'youtube', 'soundcloud') DEFAULT 'image' AFTER embedded_media;

-- Update existing articles to have 'image' as media_type if they have an image
UPDATE articles SET media_type = 'image' WHERE image IS NOT NULL AND image != '';

-- Add index for media_type for better query performance
CREATE INDEX idx_media_type ON articles(media_type);

-- Verify the changes
DESCRIBE articles;
