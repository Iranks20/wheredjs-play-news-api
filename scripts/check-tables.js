const db = require('../config/database');

async function checkTables() {
  try {
    console.log('🔍 Checking database tables...');
    
    // Check if short_links table exists
    const [shortLinksRows] = await db.promise.execute('SHOW TABLES LIKE "short_links"');
    console.log('short_links table:', shortLinksRows.length > 0 ? '✅ EXISTS' : '❌ MISSING');
    
    // Check if link_analytics table exists
    const [analyticsRows] = await db.promise.execute('SHOW TABLES LIKE "link_analytics"');
    console.log('link_analytics table:', analyticsRows.length > 0 ? '✅ EXISTS' : '❌ MISSING');
    
    // Check short_links count
    if (shortLinksRows.length > 0) {
      const [countRows] = await db.promise.execute('SELECT COUNT(*) as count FROM short_links');
      console.log('short_links count:', countRows[0].count);
    }
    
    // Check link_analytics count
    if (analyticsRows.length > 0) {
      const [countRows] = await db.promise.execute('SELECT COUNT(*) as count FROM link_analytics');
      console.log('link_analytics count:', countRows[0].count);
    }
    
    console.log('✅ Database check completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    process.exit(1);
  }
}

checkTables();
