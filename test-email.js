// Simple Email Test Script
// Tests the cleaned-up Brevo email configuration

const { sendUserInvitationEmail } = require('./config/email');

async function testEmail() {
  console.log('🧪 Testing Brevo Email Configuration...\n');

  const testEmail = 'test@example.com';
  const testName = 'Test User';
  const testPassword = 'test123456';
  const testRole = 'writer';

  console.log('📧 Test Parameters:');
  console.log('To:', testEmail);
  console.log('Name:', testName);
  console.log('Role:', testRole);
  console.log('Password:', testPassword);

  try {
    console.log('\n📧 Sending test invitation email...');
    
    const result = await sendUserInvitationEmail(
      testEmail,
      testName,
      testPassword,
      testRole
    );

    console.log('\n🎉 SUCCESS! Email sent successfully');
    console.log('Message ID:', result.messageId);
    console.log('Response:', result.response);

  } catch (error) {
    console.error('\n❌ FAILED to send email');
    console.error('Error:', error.message);
  }

  console.log('\n✅ Email test completed');
}

testEmail().catch(console.error);
