const mysql = require('mysql2/promise');

async function testSlugs() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'your_password_here', // Replace with your actual password
    database: 'wheredjsplay_news'
  });

  try {
    const [rows] = await connection.execute('SELECT id, title, slug FROM articles LIMIT 10');
    console.log('Articles with slugs:');
    rows.forEach(row => {
      console.log(`ID: ${row.id}, Title: ${row.title}, Slug: ${row.slug}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

testSlugs();
