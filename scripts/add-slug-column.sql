-- Add slug column to articles table
ALTER TABLE `articles` ADD COLUMN `slug` VARCHAR(255) NULL AFTER `title`;

-- Create index for slug column for better performance
CREATE INDEX `idx_slug` ON `articles` (`slug`);

-- Update existing articles to have slugs based on their titles
UPDATE `articles` SET `slug` = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(title, ' ', '-'), '''', ''), '"', ''), ',', '')) WHERE `slug` IS NULL;
