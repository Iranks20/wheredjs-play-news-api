const db = require('../config/database');

async function checkShortLinkData() {
  try {
    console.log('🔍 Checking short link data...');
    
    const [rows] = await db.promise.execute('SELECT * FROM short_links WHERE short_slug = ?', ['test091176']);
    
    if (rows.length > 0) {
      console.log('✅ Short link found:');
      console.log(JSON.stringify(rows[0], null, 2));
    } else {
      console.log('❌ Short link not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkShortLinkData();
