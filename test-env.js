// Test script to check environment variables
require('dotenv').config();

console.log('🔍 Environment Variables Test');
console.log('=============================');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('JWT_SECRET loaded:', process.env.JWT_SECRET ? 'Yes' : 'No');
console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);

console.log('\n📧 Email Configuration:');
console.log('BREVO_API_KEY loaded:', process.env.BREVO_API_KEY ? 'Yes' : 'No');
console.log('BREVO_API_KEY length:', process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.length : 0);
console.log('BREVO_SENDER_EMAIL:', process.env.BREVO_SENDER_EMAIL);
console.log('BREVO_SENDER_NAME:', process.env.BREVO_SENDER_NAME);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

console.log('\n🔧 Testing email config import:');
try {
  const { sendEmailViaBrevo } = require('./config/email');
  console.log('✅ Email config imported successfully');
} catch (error) {
  console.error('❌ Error importing email config:', error.message);
}

console.log('\n✅ Environment test completed');
