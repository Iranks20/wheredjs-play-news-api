const db = require('../config/database');

async function createTables() {
  try {
    console.log('🔧 Creating tables directly...');
    
    // Create short_links table
    console.log('Creating short_links table...');
    await db.promise.execute(`
      CREATE TABLE IF NOT EXISTS short_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        article_id INT NOT NULL,
        short_slug VARCHAR(255) NOT NULL UNIQUE,
        full_url TEXT NOT NULL,
        utm_source VARCHAR(255),
        utm_medium VARCHAR(255),
        utm_campaign VARCHAR(255),
        utm_term VARCHAR(255),
        utm_content VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        INDEX idx_short_slug (short_slug)
      )
    `);
    console.log('✅ short_links table created');
    
    // Create link_analytics table
    console.log('Creating link_analytics table...');
    await db.promise.execute(`
      CREATE TABLE IF NOT EXISTS link_analytics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        short_link_id INT NOT NULL,
        clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT,
        referrer TEXT,
        country VARCHAR(255),
        city VARCHAR(255),
        FOREIGN KEY (short_link_id) REFERENCES short_links(id) ON DELETE CASCADE,
        INDEX idx_clicked_at (clicked_at),
        INDEX idx_referrer (referrer),
        INDEX idx_country (country)
      )
    `);
    console.log('✅ link_analytics table created');
    
    console.log('🎉 Tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    process.exit(1);
  }
}

createTables();
