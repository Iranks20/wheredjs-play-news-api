const db = require('../config/database');
const { sendArticleNotificationEmail } = require('../config/email');

/**
 * Send automated newsletter notification for a published article
 * @param {Object} article - The published article data
 * @param {number} articleId - The article ID
 * @returns {Promise<Object>} - Result of the newsletter sending process
 */
async function sendAutomatedNewsletterForArticle(article, articleId) {
  try {





    // Check if automated newsletters are enabled
    const [settings] = await db.promise.execute(
      'SELECT setting_value FROM site_settings WHERE setting_key = "newsletter_automation_enabled"'
    );

    const isAutomationEnabled = settings.length > 0 && settings[0].setting_value === 'true';
    
    if (!isAutomationEnabled) {

      return {
        success: false,
        message: 'Newsletter automation is disabled',
        sentCount: 0,
        failedCount: 0
      };
    }

    // Get active subscribers
    const [subscribers] = await db.promise.execute(
      'SELECT email, name FROM subscribers WHERE status = "active"'
    );



    if (subscribers.length === 0) {

      return {
        success: false,
        message: 'No active subscribers found',
        sentCount: 0,
        failedCount: 0
      };
    }

    // Prepare article data for email template
    const articleData = {
      title: article.title,
      excerpt: article.excerpt || 'Read the full article to learn more...',
      image: article.image ? `${process.env.API_URL || 'http://13.60.95.22:3001'}/uploads/${article.image}` : null,
      category: article.category_name || 'News',
      author: article.author_name || 'Editor',
      publishDate: new Date(article.publish_date || article.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      articleUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/article/${article.slug || articleId}`,
      websiteUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
    };

    // Create campaign record for tracking
    const [campaignResult] = await db.promise.execute(
      'INSERT INTO newsletter_campaigns (subject, content, sent_by, total_subscribers, status, campaign_type) VALUES (?, ?, ?, ?, "sending", "automated")',
      [
        `🎵 New Article: ${article.title}`,
        `Automated newsletter for article: ${article.title}`,
        article.author_id || 1, // Use article author or default to admin
        subscribers.length
      ]
    );

    const campaignId = campaignResult.insertId;
    const batchSize = 10; // Send in smaller batches to avoid rate limiting
    let sentCount = 0;
    let failedCount = 0;






    // Send emails in batches
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      
      for (const subscriber of batch) {
        try {

          const unsubscribeUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/unsubscribe?email=${encodeURIComponent(subscriber.email)}`;
          
          await sendArticleNotificationEmail(
            subscriber.email,
            articleData,
            unsubscribeUrl
          );

          // Update subscriber stats
          await db.promise.execute(
            'UPDATE subscribers SET last_email_sent = CURRENT_TIMESTAMP, email_count = email_count + 1 WHERE email = ?',
            [subscriber.email]
          );

          sentCount++;

        } catch (emailError) {
          console.error(`❌ FAILED: Newsletter to ${subscriber.email} - ${emailError.message}`);
          failedCount++;
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update campaign status
    await db.promise.execute(
      'UPDATE newsletter_campaigns SET status = "sent", sent_at = CURRENT_TIMESTAMP, sent_count = ?, failed_count = ? WHERE id = ?',
      [sentCount, failedCount, campaignId]
    );









    return {
      success: true,
      message: `Automated newsletter sent successfully! Sent: ${sentCount}, Failed: ${failedCount}`,
      sentCount,
      failedCount,
      totalSubscribers: subscribers.length,
      campaignId
    };

  } catch (error) {
    console.error('📧 Error sending automated newsletter:', error);
    return {
      success: false,
      message: 'Failed to send automated newsletter',
      error: error.message,
      sentCount: 0,
      failedCount: 0
    };
  }
}

/**
 * Check if an article should trigger automated newsletter
 * @param {Object} article - The article data
 * @returns {Promise<boolean>} - Whether to send automated newsletter
 */
async function shouldSendAutomatedNewsletter(article) {
  try {
    // Check if automation is enabled
    const [settings] = await db.promise.execute(
      'SELECT setting_value FROM site_settings WHERE setting_key = "newsletter_automation_enabled"'
    );

    const isAutomationEnabled = settings.length > 0 && settings[0].setting_value === 'true';
    
    if (!isAutomationEnabled) {
      return false;
    }

    // Check if this is a new publication (not an update)
    const [existingCampaigns] = await db.promise.execute(
      'SELECT id FROM newsletter_campaigns WHERE campaign_type = "automated" AND content LIKE ?',
      [`%article: ${article.title}%`]
    );

    // If we already sent a newsletter for this article, don't send again
    if (existingCampaigns.length > 0) {

      return false;
    }

    // Check if article has required fields
    if (!article.title || !article.excerpt) {

      return false;
    }

    return true;
  } catch (error) {
    console.error('📧 Error checking if should send automated newsletter:', error);
    return false;
  }
}

module.exports = {
  sendAutomatedNewsletterForArticle,
  shouldSendAutomatedNewsletter
};
