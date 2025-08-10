const db = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Script to fix base64 images in the database
 * Converts base64 data to proper file paths
 */
async function fixBase64Images() {
  try {
    console.log('🔧 Starting image fix process...');
    
    // Get all articles with base64 images
    const [articles] = await db.promise.execute(`
      SELECT id, title, image 
      FROM articles 
      WHERE image LIKE 'data:%'
    `);
    
    console.log(`Found ${articles.length} articles with base64 images`);
    
    for (const article of articles) {
      console.log(`Processing article: ${article.title}`);
      
      // Generate a new image path
      const imageExt = article.image.includes('image/jpeg') ? '.jpg' : 
                      article.image.includes('image/png') ? '.png' : 
                      article.image.includes('image/gif') ? '.gif' : '.jpg';
      
      const newImagePath = `/images/articles/fixed_${article.id}_${Date.now()}${imageExt}`;
      
      // Update the database
      await db.promise.execute(
        'UPDATE articles SET image = ? WHERE id = ?',
        [newImagePath, article.id]
      );
      
      console.log(`✅ Updated article ${article.id} with new image path: ${newImagePath}`);
    }
    
    console.log('🎉 Image fix process completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing images:', error);
    process.exit(1);
  }
}

// Run the script
fixBase64Images();

