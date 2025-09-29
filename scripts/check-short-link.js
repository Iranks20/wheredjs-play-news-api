const db = require('../config/database');

async function checkShortLink() {
  try {
    console.log('🔍 Checking short link in database...');
    
    const [rows] = await db.promise.execute('SELECT * FROM short_links WHERE short_slug = ?', ['test371182']);
    
    if (rows.length > 0) {
      console.log('✅ Short link found:');
      console.log('   ID:', rows[0].id);
      console.log('   Slug:', rows[0].short_slug);
      console.log('   Full URL:', rows[0].full_url);
      console.log('   Article ID:', rows[0].article_id);
      console.log('   Active:', rows[0].is_active);
    } else {
      console.log('❌ Short link not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkShortLink();
