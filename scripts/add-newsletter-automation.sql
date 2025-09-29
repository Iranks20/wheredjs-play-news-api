-- Add newsletter automation functionality
-- This script adds the necessary database changes for automated newsletter functionality

-- Add campaign_type column to newsletter_campaigns table
ALTER TABLE `newsletter_campaigns` 
ADD COLUMN `campaign_type` enum('manual','automated') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'manual' AFTER `content`;

-- Add newsletter automation settings
INSERT INTO `site_settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`) VALUES
('newsletter_automation_enabled', 'true', NOW(), NOW()),
('newsletter_automation_categories', 'all', NOW(), NOW()),
('newsletter_automation_exclude_featured', 'false', NOW(), NOW()),
('newsletter_automation_exclude_breaking', 'false', NOW(), NOW());

-- Add index for campaign_type for better performance
ALTER TABLE `newsletter_campaigns` 
ADD INDEX `idx_newsletter_campaigns_type` (`campaign_type`);

-- Update existing campaigns to have 'manual' type
UPDATE `newsletter_campaigns` SET `campaign_type` = 'manual' WHERE `campaign_type` IS NULL;
