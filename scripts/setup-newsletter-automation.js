const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupNewsletterAutomation() {
  let connection;
  
  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'wheredjsplay_news'
    });
    
    console.log('✅ Connected to database');
    
    // Add campaign_type column to newsletter_campaigns table
    try {
      await connection.execute(`
        ALTER TABLE newsletter_campaigns 
        ADD COLUMN campaign_type enum('manual','automated') 
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci 
        DEFAULT 'manual' AFTER content
      `);
      console.log('✅ Added campaign_type column to newsletter_campaigns');
    } catch (error) {
      console.log('⚠️  campaign_type column may already exist:', error.message);
    }
    
    // Add newsletter automation settings
    const settings = [
      ['newsletter_automation_enabled', 'true'],
      ['newsletter_automation_categories', 'all'],
      ['newsletter_automation_exclude_featured', 'false'],
      ['newsletter_automation_exclude_breaking', 'false']
    ];
    
    for (const [key, value] of settings) {
      try {
        await connection.execute(`
          INSERT INTO site_settings (setting_key, setting_value, created_at, updated_at) 
          VALUES (?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE 
          setting_value = VALUES(setting_value),
          updated_at = NOW()
        `, [key, value]);
        console.log(`✅ Added/Updated setting: ${key} = ${value}`);
      } catch (error) {
        console.log(`⚠️  Error with setting ${key}:`, error.message);
      }
    }
    
    // Add index for campaign_type
    try {
      await connection.execute(`
        ALTER TABLE newsletter_campaigns 
        ADD INDEX idx_newsletter_campaigns_type (campaign_type)
      `);
      console.log('✅ Added index for campaign_type');
    } catch (error) {
      console.log('⚠️  Index may already exist:', error.message);
    }
    
    // Update existing campaigns to have 'manual' type
    try {
      const [result] = await connection.execute(`
        UPDATE newsletter_campaigns 
        SET campaign_type = 'manual' 
        WHERE campaign_type IS NULL
      `);
      console.log(`✅ Updated ${result.affectedRows} existing campaigns to 'manual' type`);
    } catch (error) {
      console.log('⚠️  Error updating existing campaigns:', error.message);
    }
    
    console.log('🎉 Newsletter automation setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

setupNewsletterAutomation();
