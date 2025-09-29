const db = require('../config/database');
const { sendAutomatedNewsletterForArticle, shouldSendAutomatedNewsletter } = require('./newsletterAutomation');

/**
 * Publish scheduled articles that have reached their publish date
 */
async function publishScheduledArticles() {
  try {
    const now = new Date();
    
    // Find articles that are scheduled and have reached their publish date
    const [articles] = await db.promise.execute(`
      SELECT 
        a.id, a.title, a.publish_date,
        a.excerpt, a.image, a.author_id,
        c.name as category_name,
        c.slug as category_slug,
        u.name as author_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.status = 'draft' 
      AND a.publish_date IS NOT NULL 
      AND a.publish_date <= ?
    `, [now]);

    if (articles.length === 0) {

      return;
    }



    // Publish each article
    for (const article of articles) {
      try {
        await db.promise.execute(
          'UPDATE articles SET status = "published" WHERE id = ?',
          [article.id]
        );
        


        // Send automated newsletter if conditions are met
        const shouldSend = await shouldSendAutomatedNewsletter(article);
        if (shouldSend) {
          const newsletterResult = await sendAutomatedNewsletterForArticle(article, article.id);

        }
      } catch (error) {
        console.error(`Error publishing scheduled article ${article.id}:`, error);
      }
    }


  } catch (error) {
    console.error('Error in publishScheduledArticles:', error);
  }
}

/**
 * Start the scheduler to check for scheduled articles every minute
 */
function startScheduler() {

  // Check for scheduled articles every minute
  setInterval(publishScheduledArticles, 60000); // 60 seconds
  // Also check immediately on startup
  publishScheduledArticles();
}

module.exports = {
  publishScheduledArticles,
  startScheduler
};
