// Test script to test email functionality
require('dotenv').config();

const { sendUserInvitationEmail } = require('./config/email');

async function testEmail() {
  console.log('🧪 Testing Email Functionality');
  console.log('==============================');
  
  try {
    console.log('📧 Attempting to send test invitation email...');
    
    const result = await sendUserInvitationEmail(
      'test@example.com',
      'Test User',
      'testpassword123',
      'writer'
    );
    
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', result.messageId);
    console.log('Response:', result);
    
  } catch (error) {
    console.error('❌ Email test failed:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testEmail();
