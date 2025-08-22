// Email Configuration - Brevo API Only
// This provides a clean, reliable email solution using Brevo API

const https = require('https');

// Brevo API configuration
const brevoConfig = {
  apiKey: process.env.BREVO_API_KEY,
  senderEmail: process.env.BREVO_SENDER_EMAIL || 'noreply@wheredjsplay.com',
  senderName: process.env.BREVO_SENDER_NAME || 'wheredjsplay'
};

// Send email using Brevo API
async function sendEmailViaBrevo(toEmail, toName, subject, htmlContent, textContent = null) {
  return new Promise((resolve, reject) => {
    const emailData = {
      sender: {
        name: brevoConfig.senderName,
        email: brevoConfig.senderEmail
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
        'api-key': brevoConfig.apiKey
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

// Email templates
const emailTemplates = {
  userInvitation: (data) => ({
    subject: 'Welcome to wheredjsplay - Your Account Details',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to wheredjsplay</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="margin: 0; font-size: 28px;">🎵 Welcome to wheredjsplay!</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Your account has been created successfully</p>
              </div>
              
              <!-- Content -->
              <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                  <h2 style="color: #333; margin-top: 0;">Hello ${data.name},</h2>
                  
                  <p style="color: #666; line-height: 1.6;">
                      You have been invited to join the wheredjsplay team as a <strong>${data.role}</strong>. 
                      This role gives you ${data.roleDescription}.
                  </p>
                  
                  <!-- Login Details Box -->
                  <div style="background: white; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0;">
                      <h3 style="color: #333; margin-top: 0;">🔐 Your Login Details:</h3>
                      <p style="margin: 10px 0;"><strong>Email:</strong> ${data.email}</p>
                      <p style="margin: 10px 0;"><strong>Password:</strong> ${data.password}</p>
                      <p style="margin: 10px 0;"><strong>Role:</strong> ${data.role}</p>
                  </div>
                  
                  <!-- Security Warning -->
                  <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
                      <p style="color: #856404; margin: 0; font-size: 14px;">
                          <strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.
                      </p>
                  </div>
                  
                  <!-- Login Button -->
                  <div style="text-align: center; margin: 30px 0;">
                      <a href="${data.loginUrl}" 
                         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
                          Login to Your Account
                      </a>
                  </div>
                  
                  <p style="color: #666; line-height: 1.6;">
                      If you have any questions or need assistance, please don't hesitate to contact our support team.
                  </p>
                  
                  <p style="color: #666; line-height: 1.6;">
                      Welcome aboard!<br>
                      The wheredjsplay Team
                  </p>
              </div>
              
              <!-- Footer -->
              <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px; padding: 20px;">
                  <p>This is an automated message. Please do not reply to this email.</p>
              </div>
          </div>
      </body>
      </html>
    `,
    text: `
Welcome to wheredjsplay!

Hello ${data.name},

You have been invited to join the wheredjsplay team as a ${data.role}. 
This role gives you ${data.roleDescription}.

Your Login Details:
Email: ${data.email}
Password: ${data.password}
Role: ${data.role}

Important: Please change your password after your first login for security purposes.

Login URL: ${data.loginUrl}

If you have any questions or need assistance, please don't hesitate to contact our support team.

Welcome aboard!
The wheredjsplay Team
    `
  }),
  
  newsletter: (data) => ({
    subject: data.subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${data.subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="margin: 0; font-size: 28px;">🎵 wheredjsplay Newsletter</h1>
              </div>
              
              <!-- Content -->
              <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                  ${data.content}
              </div>
              
              <!-- Footer -->
              <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px; padding: 20px;">
                  <p><a href="${data.unsubscribeUrl}" style="color: #666;">Unsubscribe</a></p>
              </div>
          </div>
      </body>
      </html>
    `,
    text: `
${data.subject}

${data.content}

Unsubscribe: ${data.unsubscribeUrl}
    `
  })
};

// Send email function
async function sendEmail(to, template, data) {
  try {
    const emailTemplate = emailTemplates[template](data);
    
    console.log('📧 Sending email to:', to);
    console.log('📧 Email subject:', emailTemplate.subject);
    
    const result = await sendEmailViaBrevo(
      to,
      data.name || 'User',
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text
    );
    
    console.log('✅ Email sent successfully:', {
      messageId: result.messageId
    });
    
    return result;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
}

// Send user invitation email
async function sendUserInvitationEmail(email, name, password, role) {
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

  const data = {
    name: name,
    email: email,
    password: password,
    role: roleDisplayNames[role],
    roleDescription: roleDescription[role],
    loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/login`
  };

  return sendEmail(email, 'userInvitation', data);
}

// Send newsletter email
async function sendNewsletterEmail(to, subject, content, unsubscribeUrl) {
  const data = {
    subject: subject,
    content: content,
    unsubscribeUrl: unsubscribeUrl
  };

  return sendEmail(to, 'newsletter', data);
}

module.exports = {
  sendEmail,
  sendUserInvitationEmail,
  sendNewsletterEmail,
  emailTemplates
};
