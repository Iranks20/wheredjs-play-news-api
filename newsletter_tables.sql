-- Newsletter Subscription System Tables
-- Run these queries on your existing wheredjsplay_news database

-- 1. Create subscribers table
CREATE TABLE IF NOT EXISTS `subscribers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `status` enum('active','unsubscribed') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `subscribed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `unsubscribed_at` timestamp NULL DEFAULT NULL,
  `last_email_sent` timestamp NULL DEFAULT NULL,
  `email_count` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create newsletter_campaigns table
CREATE TABLE IF NOT EXISTS `newsletter_campaigns` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subject` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `status` enum('draft','sending','sent','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `sent_by` int(11) DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `total_subscribers` int(11) DEFAULT 0,
  `sent_count` int(11) DEFAULT 0,
  `failed_count` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `sent_by` (`sent_by`),
  CONSTRAINT `newsletter_campaigns_ibfk_1` FOREIGN KEY (`sent_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Update users table to include 'writer' role (if not already done)
-- This query will modify the existing role enum to include 'writer'
ALTER TABLE `users` MODIFY COLUMN `role` enum('author','editor','admin','writer') COLLATE utf8mb4_unicode_ci DEFAULT 'author';

-- 4. Add indexes for better performance
CREATE INDEX `idx_subscribers_status` ON `subscribers` (`status`);
CREATE INDEX `idx_subscribers_subscribed_at` ON `subscribers` (`subscribed_at`);
CREATE INDEX `idx_newsletter_campaigns_status` ON `newsletter_campaigns` (`status`);
CREATE INDEX `idx_newsletter_campaigns_created_at` ON `newsletter_campaigns` (`created_at`);

-- 5. Insert some sample subscribers for testing (optional)
-- Uncomment the lines below if you want to add test data

/*
INSERT INTO `subscribers` (`email`, `name`, `status`, `subscribed_at`) VALUES
('test1@example.com', 'Test User 1', 'active', NOW()),
('test2@example.com', 'Test User 2', 'active', NOW()),
('test3@example.com', 'Test User 3', 'unsubscribed', NOW());
*/

-- 6. Verify the tables were created successfully
-- Run these queries to check if everything is working:

-- Check subscribers table structure
DESCRIBE `subscribers`;

-- Check newsletter_campaigns table structure  
DESCRIBE `newsletter_campaigns`;

-- Check if writer role is available in users table
SHOW COLUMNS FROM `users` LIKE 'role';

-- Count existing subscribers (should be 0 initially)
SELECT COUNT(*) as total_subscribers FROM `subscribers`;

-- Count existing campaigns (should be 0 initially)
SELECT COUNT(*) as total_campaigns FROM `newsletter_campaigns`;
