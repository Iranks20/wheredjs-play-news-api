const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupLinkAnalytics() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'ec2-13-60-95-22.eu-north-1.compute.amazonaws.com',
      user: process.env.DB_USER || 'wheredjsplay',
      password: process.env.DB_PASSWORD || 'wheredjsplay',
      database: process.env.DB_NAME || 'wheredjsplay_news',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connected to database');

    // Read and execute the SQL file
    const sqlFile = path.join(__dirname, 'add-link-analytics.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    // Split SQL content by semicolons and execute each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await connection.execute(statement);
        console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_KEYNAME') {
          console.log(`⚠️  Statement ${i + 1}/${statements.length} skipped (already exists): ${error.message}`);
        } else {
          console.error(`❌ Statement ${i + 1}/${statements.length} failed:`, error.message);
          throw error;
        }
      }
    }

    console.log('🎉 Link analytics setup completed successfully!');
    console.log('');
    console.log('📊 Created tables:');
    console.log('  - link_analytics: Tracks short link clicks with geo data');
    console.log('  - short_links: Manages canonical short links with UTM parameters');
    console.log('  - link_analytics_summary: View for analytics summary');
    console.log('  - top_referrers: View for top referrers');
    console.log('');
    console.log('🔗 API endpoints available:');
    console.log('  - POST /api/v1/short-links/generate: Generate short links');
    console.log('  - GET /api/v1/short-links/analytics/:articleId: Get article analytics');
    console.log('  - GET /api/v1/short-links/dashboard: Get dashboard analytics');
    console.log('  - GET /s/:slug: Redirect short links with tracking');
    console.log('');
    console.log('🚀 Ready to track short link analytics!');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the setup
setupLinkAnalytics();
