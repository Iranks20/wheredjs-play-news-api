// Brevo (formerly Sendinblue) Configuration
// Replace these values with your actual Brevo credentials

const brevoConfig = {
  // Your Brevo API Key - Get this from https://app.brevo.com/settings/keys/api
  apiKey: process.env.BREVO_API_KEY,
  
  // Your Brevo Sender Email (must be verified in Brevo)
  senderEmail: process.env.BREVO_SENDER_EMAIL || 'noreply@wheredjsplay.com',
  
  // Your Brevo Sender Name
  senderName: process.env.BREVO_SENDER_NAME || 'wheredjsplay',
  
  // Frontend URL for login links
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Template IDs (if using Brevo templates)
  invitationTemplateId: process.env.BREVO_INVITATION_TEMPLATE_ID || null,
  newsletterTemplateId: process.env.BREVO_NEWSLETTER_TEMPLATE_ID || null
};

// Helper function to get Brevo credentials
function getBrevoCredentials() {
  return {
    apiKey: brevoConfig.apiKey,
    senderEmail: brevoConfig.senderEmail,
    senderName: brevoConfig.senderName,
    frontendUrl: brevoConfig.frontendUrl,
    invitationTemplateId: brevoConfig.invitationTemplateId,
    newsletterTemplateId: brevoConfig.newsletterTemplateId
  };
}

// Helper function to validate Brevo credentials
function validateBrevoCredentials() {
  const credentials = getBrevoCredentials();
  const missing = [];
  
  // Check if API key is valid (should be a reasonable length)
  if (!credentials.apiKey || credentials.apiKey.length < 20) {
    missing.push('BREVO_API_KEY');
  }
  
  // Check if sender email is valid (but allow the default value)
  if (!credentials.senderEmail) {
    missing.push('BREVO_SENDER_EMAIL');
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing or invalid Brevo credentials:', missing.join(', '));
    console.error('Please update the config/brevo.js file or set environment variables');
    return false;
  }
  
  return true;
}

// Send email using Brevo API
async function sendEmailViaBrevo(toEmail, toName, subject, htmlContent, textContent = null) {
  const https = require('https');
  
  return new Promise((resolve, reject) => {
    const credentials = getBrevoCredentials();
    
    const emailData = {
      sender: {
        name: credentials.senderName,
        email: credentials.senderEmail
      },
      to: [
        {
          email: toEmail,
          name: toName
        }
      ],
      subject: subject,
      htmlContent: htmlContent
    };

    // Add text content if provided
    if (textContent) {
      emailData.textContent = textContent;
    }

    const postData = JSON.stringify(emailData);

    const options = {
      hostname: 'api.brevo.com',
      port: 443,
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'api-key': credentials.apiKey
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 201) {
            const response = JSON.parse(data);
            resolve(response);
          } else {
            const errorResponse = JSON.parse(data);
            reject(new Error(`Brevo API error: ${errorResponse.message || 'Unknown error'}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse Brevo response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Brevo request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

// Send invitation email using Brevo
async function sendInvitationEmailViaBrevo(email, name, password, role) {
  const credentials = getBrevoCredentials();
  
  const roleDisplayNames = {
    'admin': 'Administrator',
    'editor': 'Editor',
    'author': 'Author',
    'writer': 'Writer'
  };

  const roleDescription = {
    'admin': 'full access to all features and user management',
    'editor': 'can edit and publish articles, manage content',
    'author': 'can create and publish articles',
    'writer': 'can write articles and submit for review'
  };

  const subject = `Welcome to WhereDJsPlay - Your Account Details`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to WhereDJsPlay</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .credentials { background: #e8f4fd; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎵 Welcome to WhereDJsPlay!</h1>
          <p>Your account has been created successfully</p>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          
          <p>Welcome to WhereDJsPlay! You've been invited to join our team as a <strong>${roleDisplayNames[role]}</strong>.</p>
          
          <p>As a ${roleDisplayNames[role]}, you ${roleDescription[role]}.</p>
          
          <div class="credentials">
            <h3>🔐 Your Login Credentials:</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
            <p><strong>Role:</strong> ${roleDisplayNames[role]}</p>
          </div>
          
          <div class="warning">
            <p><strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.</p>
          </div>
          
          <a href="${credentials.frontendUrl}/admin/login" class="button">Login to Your Account</a>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br>The wheredjsplay Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Welcome to WhereDJsPlay!

Hello ${name},

Welcome to WhereDJsPlay! You've been invited to join our team as a ${roleDisplayNames[role]}.

As a ${roleDisplayNames[role]}, you ${roleDescription[role]}.

Your Login Credentials:
Email: ${email}
Password: ${password}
Role: ${roleDisplayNames[role]}

Important: Please change your password after your first login for security purposes.

Login URL: ${credentials.frontendUrl}/admin/login

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
The wheredjsplay Team
  `;

  return sendEmailViaBrevo(email, name, subject, htmlContent, textContent);
}

module.exports = {
  brevoConfig,
  getBrevoCredentials,
  validateBrevoCredentials,
  sendEmailViaBrevo,
  sendInvitationEmailViaBrevo
};