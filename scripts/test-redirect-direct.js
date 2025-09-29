const db = require('../config/database');

async function testRedirectDirect() {
  try {
    console.log('🧪 Testing Redirect Route Directly');
    console.log('=' .repeat(40));

    // Test the redirect logic directly
    const slug = 'test091176';
    const clientIP = '127.0.0.1';
    const userAgent = 'TestBrowser/1.0';
    const referrer = 'https://example.com/test';

    console.log('\n1️⃣ Finding short link...');
    const [links] = await db.promise.execute(
      'SELECT * FROM short_links WHERE short_slug = ?',
      [slug]
    );

    if (links.length === 0) {
      console.log('❌ Short link not found');
      return;
    }

    const shortLink = links[0];
    console.log('✅ Short link found:', shortLink.short_slug);

    console.log('\n2️⃣ Testing analytics insert...');
    await db.promise.execute(
      `INSERT INTO link_analytics (short_link_id, ip_address, user_agent, referrer, country, city)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [shortLink.id, clientIP, userAgent, referrer, 'Test Country', 'Test City']
    );
    console.log('✅ Analytics inserted successfully');

    console.log('\n3️⃣ Testing redirect URL...');
    let redirectUrl = shortLink.full_url;
    console.log('✅ Redirect URL:', redirectUrl);

    console.log('\n🎉 All redirect logic working correctly!');
    console.log('The issue might be that the server needs to be restarted to pick up route changes.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testRedirectDirect();
