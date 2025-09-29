const mysql = require('mysql2/promise');
require('dotenv').config();

async function testNewsletterAutomation() {
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
    
    // Check newsletter automation settings
    console.log('\n📧 Newsletter Automation Settings:');
    const [settings] = await connection.execute(`
      SELECT setting_key, setting_value 
      FROM site_settings 
      WHERE setting_key LIKE 'newsletter_automation_%'
    `);
    
    settings.forEach(setting => {
      console.log(`  ${setting.setting_key}: ${setting.setting_value}`);
    });
    
    // Check subscribers
    console.log('\n👥 Subscribers:');
    const [subscribers] = await connection.execute(`
      SELECT email, name, status, email_count 
      FROM subscribers 
      WHERE status = 'active'
    `);
    
    console.log(`  Total active subscribers: ${subscribers.length}`);
    subscribers.forEach(sub => {
      console.log(`  - ${sub.email} (${sub.name || 'No name'}) - ${sub.email_count} emails sent`);
    });
    
    // Check recent articles
    console.log('\n📰 Recent Articles:');
    const [articles] = await connection.execute(`
      SELECT id, title, status, publish_date, created_at
      FROM articles 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    articles.forEach(article => {
      console.log(`  - ID: ${article.id}, Title: ${article.title}, Status: ${article.status}, Published: ${article.publish_date || 'Not published'}`);
    });
    
    // Check newsletter campaigns
    console.log('\n📬 Newsletter Campaigns:');
    const [campaigns] = await connection.execute(`
      SELECT id, subject, status, campaign_type, sent_count, total_subscribers, created_at
      FROM newsletter_campaigns 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log(`  Total campaigns: ${campaigns.length}`);
    campaigns.forEach(campaign => {
      console.log(`  - ID: ${campaign.id}, Subject: ${campaign.subject}, Type: ${campaign.campaign_type || 'manual'}, Status: ${campaign.status}, Sent: ${campaign.sent_count}/${campaign.total_subscribers}`);
    });
    
    // Test the automation logic
    console.log('\n🔧 Testing Automation Logic:');
    
    // Check if automation is enabled
    const [automationSetting] = await connection.execute(`
      SELECT setting_value FROM site_settings 
      WHERE setting_key = 'newsletter_automation_enabled'
    `);
    
    const isAutomationEnabled = automationSetting.length > 0 && automationSetting[0].setting_value === 'true';
    console.log(`  Automation enabled: ${isAutomationEnabled}`);
    
    if (isAutomationEnabled && subscribers.length > 0) {
      console.log('  ✅ Newsletter automation is ready to work!');
      console.log('  📝 When you publish an article, it will automatically send newsletters to subscribers.');
    } else if (!isAutomationEnabled) {
      console.log('  ⚠️  Newsletter automation is disabled in settings.');
    } else if (subscribers.length === 0) {
      console.log('  ⚠️  No active subscribers found. Add some subscribers to test automation.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

testNewsletterAutomation();
