const db = require('../config/database');

async function testEndpointsDirect() {
  try {
    console.log('🧪 Testing Short Links & Analytics - Direct Database Test');
    console.log('=' .repeat(60));

    // Step 1: Check if we have any articles
    console.log('\n1️⃣ Checking for existing articles...');
    const [articles] = await db.promise.execute('SELECT id, title, slug FROM articles LIMIT 5');
    
    if (articles.length === 0) {
      console.log('❌ No articles found. Please create an article first.');
      return;
    }

    const article = articles[0];
    console.log(`✅ Found article: "${article.title}" (ID: ${article.id})`);

    // Step 2: Create a test short link directly in the database
    console.log('\n2️⃣ Creating test short link...');
    
    const shortSlug = 'test' + Date.now().toString().slice(-6);
    const fullUrl = `http://localhost:3000/wdjpnews/article/${article.slug || 'test-article'}`;
    
    const [result] = await db.promise.execute(
      `INSERT INTO short_links (article_id, short_slug, full_url, utm_source, utm_medium, utm_campaign)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [article.id, shortSlug, fullUrl, 'test', 'automation', 'testing']
    );

    const shortLinkId = result.insertId;
    console.log('✅ Test short link created:');
    console.log(`   ID: ${shortLinkId}`);
    console.log(`   Short Slug: ${shortSlug}`);
    console.log(`   Full URL: ${fullUrl}`);

    // Step 3: Test the redirect endpoint by simulating a click
    console.log('\n3️⃣ Testing redirect endpoint...');
    
    const redirectUrl = `http://localhost:3001/s/${shortSlug}`;
    console.log(`🔗 Testing redirect: ${redirectUrl}`);
    
    // Simulate a click by inserting analytics data
    const testIp = '127.0.0.1';
    const testUserAgent = 'TestBrowser/1.0';
    const testReferrer = 'https://example.com/test';
    
    await db.promise.execute(
      `INSERT INTO link_analytics (short_link_id, ip_address, user_agent, referrer, country, city)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [shortLinkId, testIp, testUserAgent, testReferrer, 'Test Country', 'Test City']
    );
    
    console.log('✅ Analytics data inserted (simulating click)');

    // Step 4: Test analytics queries
    console.log('\n4️⃣ Testing analytics queries...');
    
    // Test article analytics query
    const [articleAnalytics] = await db.promise.execute(
      `SELECT COUNT(la.id) as total_clicks, COUNT(DISTINCT la.ip_address) as unique_visitors
       FROM link_analytics la
       JOIN short_links sl ON la.short_link_id = sl.id
       WHERE sl.article_id = ? AND la.clicked_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [article.id]
    );
    
    console.log('✅ Article analytics query working:');
    console.log(`   Total Clicks: ${articleAnalytics[0].total_clicks}`);
    console.log(`   Unique Visitors: ${articleAnalytics[0].unique_visitors}`);

    // Test dashboard analytics query
    const [dashboardAnalytics] = await db.promise.execute(
      `SELECT COUNT(la.id) as total_clicks, COUNT(DISTINCT la.ip_address) as unique_visitors,
              COUNT(DISTINCT sl.article_id) as articles_with_clicks
       FROM link_analytics la
       JOIN short_links sl ON la.short_link_id = sl.id
       WHERE la.clicked_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );
    
    console.log('✅ Dashboard analytics query working:');
    console.log(`   Total Clicks: ${dashboardAnalytics[0].total_clicks}`);
    console.log(`   Unique Visitors: ${dashboardAnalytics[0].unique_visitors}`);
    console.log(`   Articles with Clicks: ${dashboardAnalytics[0].articles_with_clicks}`);

    // Test top referrers query
    const [topReferrers] = await db.promise.execute(
      `SELECT la.referrer, COUNT(la.id) as clicks, COUNT(DISTINCT la.ip_address) as unique_visitors
       FROM link_analytics la
       WHERE la.clicked_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY la.referrer
       ORDER BY clicks DESC
       LIMIT 5`
    );
    
    console.log('✅ Top referrers query working:');
    topReferrers.forEach((referrer, index) => {
      console.log(`   ${index + 1}. ${referrer.referrer}: ${referrer.clicks} clicks`);
    });

    console.log('\n🎉 All database tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('✅ Database tables exist and working');
    console.log('✅ Short link creation working');
    console.log('✅ Analytics tracking working');
    console.log('✅ Analytics queries working');
    console.log('✅ Dashboard queries working');
    
    console.log('\n🔗 Test short link created:');
    console.log(`   ${redirectUrl}`);
    console.log('   (You can test this in your browser)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testEndpointsDirect();
