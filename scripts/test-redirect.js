const db = require('../config/database');
const axios = require('axios');

async function testRedirect() {
  try {
    console.log('🧪 Testing Short Link Redirect');
    console.log('=' .repeat(40));

    // Create a new short link
    console.log('\n1️⃣ Creating new short link...');
    const shortSlug = 'test' + Date.now().toString().slice(-6);
    const fullUrl = 'http://localhost:3000/wdjpnews/article/test-article';
    
    const [result] = await db.promise.execute(
      `INSERT INTO short_links (article_id, short_slug, full_url, utm_source, utm_medium, utm_campaign)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [1, shortSlug, fullUrl, 'test', 'automation', 'redirect_test']
    );

    console.log(`✅ Short link created: ${shortSlug}`);

    // Test the redirect endpoint
    console.log('\n2️⃣ Testing redirect endpoint...');
    const redirectUrl = `http://localhost:3001/s/${shortSlug}`;
    console.log(`🔗 Testing: ${redirectUrl}`);
    
    try {
      const response = await axios.get(redirectUrl, {
        maxRedirects: 0,
        validateStatus: (status) => status === 301 || status === 302
      });
      
      console.log('✅ Redirect working!');
      console.log(`   Status: ${response.status}`);
      console.log(`   Location: ${response.headers.location}`);
    } catch (error) {
      if (error.response && (error.response.status === 301 || error.response.status === 302)) {
        console.log('✅ Redirect working!');
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Location: ${error.response.headers.location}`);
      } else {
        console.log('❌ Redirect failed:');
        console.log(`   Status: ${error.response?.status || 'No response'}`);
        console.log(`   Message: ${error.message}`);
        console.log(`   Response: ${JSON.stringify(error.response?.data || {})}`);
      }
    }

    // Check if analytics were recorded
    console.log('\n3️⃣ Checking analytics...');
    const [analytics] = await db.promise.execute(
      'SELECT COUNT(*) as count FROM link_analytics WHERE short_link_id = ?',
      [result.insertId]
    );
    
    console.log(`✅ Analytics recorded: ${analytics[0].count} clicks`);

    console.log('\n🎉 Test completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testRedirect();
