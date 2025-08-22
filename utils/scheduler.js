const db = require('../config/database');

/**
 * Publish scheduled articles that have reached their publish date
 */
async function publishScheduledArticles() {
  try {
    const now = new Date();
    
    // Find articles that are scheduled and have reached their publish date
    const [articles] = await db.promise.execute(`
      SELECT id, title, publish_date 
      FROM articles 
      WHERE status = 'draft' 
      AND publish_date IS NOT NULL 
      AND publish_date <= ?
    `, [now]);

    if (articles.length === 0) {
      console.log('No scheduled articles to publish');
      return;
    }

    console.log(`Found ${articles.length} scheduled articles to publish`);

    // Publish each article
    for (const article of articles) {
      try {
        await db.promise.execute(
          'UPDATE articles SET status = "published" WHERE id = ?',
          [article.id]
        );
        
        console.log(`Published scheduled article: ${article.title} (ID: ${article.id})`);
      } catch (error) {
        console.error(`Error publishing scheduled article ${article.id}:`, error);
      }
    }

    console.log(`Successfully published ${articles.length} scheduled articles`);
  } catch (error) {
    console.error('Error in publishScheduledArticles:', error);
  }
}

/**
 * Start the scheduler to check for scheduled articles every minute
 */
function startScheduler() {
  console.log('Starting article scheduler...');
  
  // Check for scheduled articles every minute
  setInterval(publishScheduledArticles, 60000); // 60 seconds
  
  // Also check immediately on startup
  publishScheduledArticles();
}

module.exports = {
  publishScheduledArticles,
  startScheduler
};
