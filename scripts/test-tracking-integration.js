require('dotenv').config({ path: '../.env' });
const db = require('../config/database');

async function testTrackingIntegration() {
  console.log('🧪 Testing Link Tracking Integration');
  console.log('=' .repeat(50));

  try {
    console.log('✅ Database connected successfully');

    // 1. Check if we have any existing short links
    console.log('\n1️⃣ Checking existing short links...');
    const [shortLinks] = await db.promise.execute(
      'SELECT * FROM short_links ORDER BY created_at DESC LIMIT 5'
    );
    
    if (shortLinks.length > 0) {
      console.log(`✅ Found ${shortLinks.length} existing short links:`);
      shortLinks.forEach((link, index) => {
        console.log(`   ${index + 1}. ${link.short_slug} -> ${link.full_url}`);
        console.log(`      UTM: source=${link.utm_source}, medium=${link.utm_medium}, campaign=${link.utm_campaign}`);
      });
    } else {
      console.log('❌ No existing short links found');
    }

    // 2. Check analytics data
    console.log('\n2️⃣ Checking analytics data...');
    const [analytics] = await db.promise.execute(
      `SELECT 
         la.id,
         la.ip_address,
         la.country,
         la.city,
         la.referrer,
         la.clicked_at,
         sl.short_slug,
         sl.utm_source,
         sl.utm_medium,
         sl.utm_campaign,
         a.title as article_title
       FROM link_analytics la
       JOIN short_links sl ON la.short_link_id = sl.id
       JOIN articles a ON sl.article_id = a.id
       ORDER BY la.clicked_at DESC
       LIMIT 10`
    );

    if (analytics.length > 0) {
      console.log(`✅ Found ${analytics.length} click records:`);
      analytics.forEach((click, index) => {
        console.log(`   ${index + 1}. ${click.article_title}`);
        console.log(`      Location: ${click.city || 'Unknown'}, ${click.country || 'Unknown'}`);
        console.log(`      Referrer: ${click.referrer || 'Direct'}`);
        console.log(`      UTM: ${click.utm_source}/${click.utm_medium}/${click.utm_campaign}`);
        console.log(`      Time: ${click.clicked_at}`);
        console.log(`      IP: ${click.ip_address}`);
        console.log('');
      });
    } else {
      console.log('❌ No analytics data found');
    }

    // 3. Test UTM parameter tracking
    console.log('\n3️⃣ Testing UTM parameter tracking...');
    const [utmStats] = await db.promise.execute(
      `SELECT 
         utm_source,
         utm_medium,
         utm_campaign,
         COUNT(*) as click_count,
         COUNT(DISTINCT la.ip_address) as unique_visitors
       FROM short_links sl
       JOIN link_analytics la ON sl.id = la.short_link_id
       WHERE sl.utm_source IS NOT NULL
       GROUP BY utm_source, utm_medium, utm_campaign
       ORDER BY click_count DESC`
    );

    if (utmStats.length > 0) {
      console.log('✅ UTM parameter tracking is working:');
      utmStats.forEach((stat, index) => {
        console.log(`   ${index + 1}. ${stat.utm_source}/${stat.utm_medium}/${stat.utm_campaign}`);
        console.log(`      Clicks: ${stat.click_count}, Unique: ${stat.unique_visitors}`);
      });
    } else {
      console.log('❌ No UTM tracking data found');
    }

    // 4. Test geographic tracking
    console.log('\n4️⃣ Testing geographic tracking...');
    const [geoStats] = await db.promise.execute(
      `SELECT 
         country,
         city,
         COUNT(*) as click_count,
         COUNT(DISTINCT ip_address) as unique_visitors
       FROM link_analytics 
       WHERE country IS NOT NULL
       GROUP BY country, city
       ORDER BY click_count DESC
       LIMIT 5`
    );

    if (geoStats.length > 0) {
      console.log('✅ Geographic tracking is working:');
      geoStats.forEach((geo, index) => {
        console.log(`   ${index + 1}. ${geo.city || 'Unknown'}, ${geo.country}`);
        console.log(`      Clicks: ${geo.click_count}, Unique: ${geo.unique_visitors}`);
      });
    } else {
      console.log('❌ No geographic tracking data found');
    }

    console.log('\n🎉 Tracking integration test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (db.promise.connection) {
      await db.promise.connection.end();
    }
  }
}

testTrackingIntegration();
