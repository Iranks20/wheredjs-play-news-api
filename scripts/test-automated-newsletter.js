const mysql = require('mysql2/promise');
const { sendAutomatedNewsletterForArticle, shouldSendAutomatedNewsletter } = require('../utils/newsletterAutomation');
require('dotenv').config();

async function testAutomatedNewsletter() {
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
    
    // Get a recent published article to test with
    const [articles] = await connection.execute(`
      SELECT 
        a.*,
        c.name as category_name,
        c.slug as category_slug,
        u.name as author_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.status = 'published'
      ORDER BY a.created_at DESC
      LIMIT 1
    `);
    
    if (articles.length === 0) {
      console.log('❌ No published articles found. Please publish an article first.');
      return;
    }
    
    const article = articles[0];
    console.log(`\n📰 Testing with article: "${article.title}" (ID: ${article.id})`);
    
    // Test if newsletter should be sent
    console.log('\n🔍 Checking if newsletter should be sent...');
    const shouldSend = await shouldSendAutomatedNewsletter(article);
    console.log(`  Should send newsletter: ${shouldSend}`);
    
    if (shouldSend) {
      console.log('\n📧 Sending automated newsletter...');
      const result = await sendAutomatedNewsletterForArticle(article, article.id);
      
      console.log('\n📊 Newsletter Result:');
      console.log(`  Success: ${result.success}`);
      console.log(`  Message: ${result.message}`);
      console.log(`  Sent Count: ${result.sentCount}`);
      console.log(`  Failed Count: ${result.failedCount}`);
      
      if (result.campaignId) {
        console.log(`  Campaign ID: ${result.campaignId}`);
      }
      
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
    } else {
      console.log('⚠️  Newsletter will not be sent (automation disabled or already sent)');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

testAutomatedNewsletter();
