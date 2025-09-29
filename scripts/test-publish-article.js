const mysql = require('mysql2/promise');
const { sendAutomatedNewsletterForArticle, shouldSendAutomatedNewsletter } = require('../utils/newsletterAutomation');
require('dotenv').config();

async function testPublishArticle() {
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
    
    // Create a test article
    console.log('\n📝 Creating test article...');
    const [result] = await connection.execute(`
      INSERT INTO articles (
        title, excerpt, content, category_id, author_id, 
        status, created_at, publish_date
      ) VALUES (?, ?, ?, ?, ?, 'draft', NOW(), NOW())
    `, [
      'Test Newsletter Automation Article',
      'This is a test article to verify newsletter automation is working correctly.',
      '<p>This is a test article content to verify that the automated newsletter system is working properly when articles are published.</p>',
      1, // Assuming category ID 1 exists
      1  // Assuming author ID 1 exists
    ]);
    
    const articleId = result.insertId;
    console.log(`✅ Created test article with ID: ${articleId}`);
    
    // Get the full article data
    const [articles] = await connection.execute(`
      SELECT 
        a.*,
        c.name as category_name,
        c.slug as category_slug,
        u.name as author_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.id = ?
    `, [articleId]);
    
    if (articles.length === 0) {
      console.log('❌ Article not found after creation');
      return;
    }
    
    const article = articles[0];
    console.log(`📰 Article: "${article.title}"`);
    
    // Publish the article (simulate the publish endpoint)
    console.log('\n🚀 Publishing article...');
    await connection.execute(
      'UPDATE articles SET status = "published", publish_date = NOW() WHERE id = ?',
      [articleId]
    );
    console.log('✅ Article published');
    
    // Test newsletter automation
    console.log('\n📧 Testing newsletter automation...');
    const shouldSend = await shouldSendAutomatedNewsletter(article);
    console.log(`  Should send newsletter: ${shouldSend}`);
    
    if (shouldSend) {
      console.log('\n📬 Sending automated newsletter...');
      const result = await sendAutomatedNewsletterForArticle(article, articleId);
      
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
      console.log('⚠️  Newsletter will not be sent');
    }
    
    // Clean up - delete the test article
    console.log('\n🧹 Cleaning up test article...');
    await connection.execute('DELETE FROM articles WHERE id = ?', [articleId]);
    console.log('✅ Test article deleted');
    
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

testPublishArticle();
