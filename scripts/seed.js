const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedDatabase() {
  let connection;

  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'wheredjsplay_news',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connected to database');

    // Hash password for admin user
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash('admin123', saltRounds);

    // Insert default admin user
    await connection.execute(`
      INSERT IGNORE INTO users (name, email, password, role, status)
      VALUES ('Admin User', 'admin@wheredjsplay.com', ?, 'admin', 'active')
    `, [hashedPassword]);
    console.log('✅ Admin user created');

    // Insert sample categories
    const categories = [
      {
        name: 'Artist News',
        slug: 'artist-news',
        description: 'Latest news about DJs and electronic music artists',
        color: '#09afdf'
      },
      {
        name: 'Event Reports',
        slug: 'event-reports',
        description: 'Festival coverage and event reviews',
        color: '#10b981'
      },
      {
        name: 'Gear & Tech',
        slug: 'gear-tech',
        description: 'Equipment reviews and technology updates',
        color: '#f59e0b'
      },
      {
        name: 'Trending Tracks',
        slug: 'trending-tracks',
        description: 'Popular tracks and chart updates',
        color: '#ef4444'
      },
      {
        name: 'Industry News',
        slug: 'industry-news',
        description: 'Business updates and industry insights',
        color: '#8b5cf6'
      },
      {
        name: 'Education News',
        slug: 'education-news',
        description: 'Learning resources and tutorials',
        color: '#06b6d4'
      }
    ];

    for (const category of categories) {
      await connection.execute(`
        INSERT IGNORE INTO categories (name, slug, description, color)
        VALUES (?, ?, ?, ?)
      `, [category.name, category.slug, category.description, category.color]);
    }
    console.log('✅ Sample categories created');

    // Insert sample users
    const users = [
      {
        name: 'Sarah Martinez',
        email: 'sarah@wheredjsplay.com',
        password: 'password123',
        role: 'editor'
      },
      {
        name: 'Mike Johnson',
        email: 'mike@wheredjsplay.com',
        password: 'password123',
        role: 'author'
      },
      {
        name: 'Lisa Rodriguez',
        email: 'lisa@wheredjsplay.com',
        password: 'password123',
        role: 'author'
      }
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, saltRounds);
      await connection.execute(`
        INSERT IGNORE INTO users (name, email, password, role, status)
        VALUES (?, ?, ?, ?, 'active')
      `, [user.name, user.email, hashedPassword, user.role]);
    }
    console.log('✅ Sample users created');

    // Insert sample articles
    const articles = [
      {
        title: 'Carl Cox Announces Revolutionary 2024 World Tour with Cutting-Edge Holographic Technology',
        excerpt: 'The legendary techno pioneer reveals his most ambitious tour yet, featuring cutting-edge holographic technology and immersive 360-degree sound systems that will redefine the festival experience.',
        content: `<p>The legendary techno pioneer Carl Cox has just announced his most ambitious world tour to date, featuring cutting-edge holographic technology and immersive 360-degree sound systems that promise to redefine the festival experience for electronic music fans worldwide.</p>
        
        <p>In an exclusive interview with WhereDJsPlay, Cox revealed that the tour will span 50 cities across six continents, with each show featuring a completely unique stage design that incorporates advanced holographic projections, AI-powered lighting systems, and revolutionary spatial audio technology.</p>
        
        <h3>Revolutionary Technology</h3>
        <p>"We're not just playing music anymore," Cox explained during our conversation at his Ibiza studio. "We're creating immersive experiences that transport people to another dimension. The technology we're using has never been seen in electronic music before."</p>
        
        <p>The tour's centerpiece is a custom-built stage that features a 360-degree holographic projection system, allowing Cox to appear as multiple versions of himself throughout the performance. The system, developed in partnership with leading tech companies, creates the illusion that the DJ is performing from multiple positions simultaneously.</p>`,
        category_id: 1,
        author_id: 1,
        image: '/images/articles/37_wNdv100.jpg',
        featured: true,
        status: 'published',
        tags: 'carl cox, techno, world tour, holographic, electronic music',
        seo_title: 'Carl Cox 2024 World Tour - Revolutionary Holographic Technology',
        seo_description: 'Carl Cox announces his most ambitious world tour featuring cutting-edge holographic technology and immersive sound systems.',
        views: 2400
      },
      {
        title: 'Pioneer Unveils Next-Gen CDJ-4000: AI-Powered Beat Matching and Holographic Displays',
        excerpt: 'Revolutionary new features include AI-powered beat matching, holographic displays, and wireless streaming capabilities that will change how DJs perform.',
        content: `<p>Pioneer has just unveiled their most advanced CDJ model yet, the CDJ-4000, featuring groundbreaking AI-powered beat matching technology and holographic displays that promise to revolutionize the DJ industry.</p>
        
        <p>The new flagship player incorporates machine learning algorithms that can analyze tracks in real-time, providing intelligent beat matching suggestions and automatic tempo synchronization. This represents a significant leap forward in DJ technology, making it easier for both beginners and professionals to create seamless mixes.</p>
        
        <h3>AI-Powered Features</h3>
        <p>The CDJ-4000's AI system can analyze thousands of tracks per second, identifying key musical elements like BPM, key, and energy levels. This allows the system to suggest optimal track combinations and provide real-time mixing assistance.</p>
        
        <p>"We've essentially created a co-pilot for DJs," said Pioneer's lead engineer. "The AI doesn't replace the DJ's creativity, but it enhances their ability to focus on the artistic aspects of their performance."</p>`,
        category_id: 3,
        author_id: 2,
        image: '/images/articles/46_JC6vzus.jpg',
        featured: false,
        status: 'published',
        tags: 'pioneer, cdj-4000, ai, beat matching, dj equipment',
        seo_title: 'Pioneer CDJ-4000 - AI-Powered Beat Matching Technology',
        seo_description: 'Pioneer unveils the CDJ-4000 with AI-powered beat matching and holographic displays.',
        views: 1800
      },
      {
        title: 'Tomorrowland 2024: Record-Breaking Attendance and Groundbreaking Stage Designs',
        excerpt: 'This year\'s festival exceeded all expectations with groundbreaking stage designs, surprise collaborations, and performances that will be talked about for years.',
        content: `<p>Tomorrowland 2024 has officially become the most successful edition in the festival's history, with record-breaking attendance and groundbreaking stage designs that have set new standards for electronic music festivals worldwide.</p>
        
        <p>Over 400,000 attendees from 200 countries gathered in Boom, Belgium, for the two-weekend extravaganza, which featured 16 stages and more than 1,000 artists. The festival's innovative approach to stage design and production technology created an immersive experience unlike anything seen before.</p>
        
        <h3>Revolutionary Stage Technology</h3>
        <p>The main stage, designed by renowned architect Arne Quinze, featured a 50-meter-high structure with integrated LED panels, laser systems, and pyrotechnics that synchronized perfectly with the music. The stage's design was inspired by nature and technology, creating a futuristic yet organic atmosphere.</p>
        
        <p>"We wanted to create something that would transport people to another dimension," said Tomorrowland's creative director. "The combination of cutting-edge technology and artistic vision has resulted in an experience that goes beyond just music."</p>`,
        category_id: 2,
        author_id: 3,
        image: '/images/articles/img_0002.jpg',
        featured: true,
        status: 'published',
        tags: 'tomorrowland, festival, electronic music, belgium, stage design',
        seo_title: 'Tomorrowland 2024 - Record-Breaking Festival Success',
        seo_description: 'Tomorrowland 2024 sets new records with groundbreaking stage designs and record attendance.',
        views: 3200
      }
    ];

    for (const article of articles) {
      await connection.execute(`
        INSERT IGNORE INTO articles (
          title, excerpt, content, category_id, author_id, image,
          featured, status, tags, seo_title, seo_description, views,
          publish_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        article.title, article.excerpt, article.content, article.category_id,
        article.author_id, article.image, article.featured, article.status,
        article.tags, article.seo_title, article.seo_description, article.views
      ]);
    }
    console.log('✅ Sample articles created');

    // Insert default site settings
    const settings = [
      { key: 'site_name', value: 'WhereDJsPlay' },
      { key: 'site_description', value: 'Your Ultimate Source for DJ & Electronic Music News' },
      { key: 'site_url', value: 'https://wheredjsplay.com' },
      { key: 'contact_email', value: 'contact@wheredjsplay.com' },
      { key: 'social_facebook', value: 'https://facebook.com/wheredjsplay' },
      { key: 'social_twitter', value: 'https://twitter.com/wheredjsplay' },
      { key: 'social_instagram', value: 'https://instagram.com/wheredjsplay' }
    ];

    for (const setting of settings) {
      await connection.execute(`
        INSERT IGNORE INTO site_settings (setting_key, setting_value)
        VALUES (?, ?)
      `, [setting.key, setting.value]);
    }
    console.log('✅ Default site settings created');

    console.log('🎉 Database seeding completed successfully!');
    console.log('📝 Default admin credentials:');
    console.log('   Email: admin@wheredjsplay.com');
    console.log('   Password: admin123');
    console.log('📊 Sample data has been added to all tables.');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run seeding
seedDatabase();
