const mysql = require('mysql2');

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'ec2-13-60-95-22.eu-north-1.compute.amazonaws.com',
  user: process.env.DB_USER || 'wheredjsplay',
  password: process.env.DB_PASSWORD || 'wheredjsplay',
  // host: process.env.DB_HOST || 'localhost',
  //  user: process.env.DB_USER || 'root',
  // password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wheredjsplay_news',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    return;
  }

  connection.release();
});

module.exports = pool;
module.exports.promise = pool.promise();
