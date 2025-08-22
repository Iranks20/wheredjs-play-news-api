-- Fix Writer Role Issue
-- This script updates the users table to include 'writer' in the role enum

-- 1. Update the role enum to include 'writer'
ALTER TABLE `users` MODIFY COLUMN `role` enum('author','editor','admin','writer') COLLATE utf8mb4_unicode_ci DEFAULT 'author';

-- 2. Fix any existing users with empty roles (like the writer@gmail.com user)
UPDATE `users` SET `role` = 'writer' WHERE `role` = '' OR `role` IS NULL;

-- 3. Verify the change
SHOW COLUMNS FROM `users` LIKE 'role';

-- 4. Check if there are any users with empty roles
SELECT id, name, email, role FROM `users` WHERE `role` = '' OR `role` IS NULL;

-- 5. Show all users to verify the fix
SELECT id, name, email, role, status FROM `users` ORDER BY id;
