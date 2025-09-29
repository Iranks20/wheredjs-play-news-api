// Email Configuration - Brevo API Only
// This provides a clean, reliable email solution using Brevo API

const https = require('https');

// Brevo API configuration
const brevoConfig = {
  apiKey: process.env.BREVO_API_KEY,
  senderEmail: process.env.BREVO_SENDER_EMAIL || 'noreply@wheredjsplay.com',
  senderName: process.env.BREVO_SENDER_NAME || 'wheredjsplay'
};

// Debug logging to check environment variables






// Send email using Brevo API
async function sendEmailViaBrevo(toEmail, toName, subject, htmlContent, textContent = null) {
  return new Promise((resolve, reject) => {
    // Validate API key before proceeding
    if (!brevoConfig.apiKey) {
      reject(new Error('BREVO_API_KEY environment variable is not set. Please check your .env file.'));
      return;
    }
    
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
                  
                  <!-- DJLink.me Advertisement -->
                  <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center; color: white;">
                      <div style="margin-bottom: 20px;">
                          <h3 style="margin: 0 0 10px 0; font-size: 22px; color: #fff;">🎧 Are You a DJ?</h3>
                          <p style="margin: 0; color: #ccc; font-size: 16px;">Create your professional DJ profile and connect with venues, promoters, and fans worldwide.</p>
                      </div>
                      
                      <div style="display: flex; justify-content: center; align-items: center; gap: 15px; margin: 20px 0; flex-wrap: wrap;">
                          <div style="display: flex; align-items: center; gap: 8px; color: #ccc; font-size: 14px;">
                              <span style="color: #ff5500;">👥</span>
                              <span>50K+ DJs</span>
                          </div>
                          <div style="display: flex; align-items: center; gap: 8px; color: #ccc; font-size: 14px;">
                              <span style="color: #ff5500;">⭐</span>
                              <span>4.9/5 Rating</span>
                          </div>
                          <div style="display: flex; align-items: center; gap: 8px; color: #ccc; font-size: 14px;">
                              <span style="color: #ff5500;">🌍</span>
                              <span>Global Network</span>
                          </div>
                      </div>
                      
                      <a href="https://djlink.me" 
                         style="background: linear-gradient(135deg, #ff5500 0%, #ff3300 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px; margin-top: 10px; transition: all 0.3s ease;">
                          Create Your DJ Profile
                      </a>
                      
                      <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
                          Join the largest DJ community and get booked worldwide
                      </p>
                  </div>
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

🎧 Are You a DJ?
Create your professional DJ profile and connect with venues, promoters, and fans worldwide.
Join 50K+ DJs on the largest DJ community platform.

Create Your DJ Profile: https://djlink.me

Unsubscribe: ${data.unsubscribeUrl}
    `
  }),

  articleNotification: (data) => ({
    subject: `🎵 New Article: ${data.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Article: ${data.title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="margin: 0; font-size: 28px;">🎵 wheredjsplay</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Latest Electronic Music News</p>
              </div>
              
              <!-- Article Content -->
              <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                  <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      ${data.image ? `
                      <div style="text-align: center; margin-bottom: 20px;">
                          <img src="${data.image}" alt="${data.title}" style="max-width: 100%; height: auto; border-radius: 8px;">
                      </div>
                      ` : ''}
                      
                      <div style="margin-bottom: 15px;">
                          <span style="background: #667eea; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">${data.category}</span>
                      </div>
                      
                      <h2 style="color: #333; margin: 0 0 15px 0; font-size: 24px; line-height: 1.3;">${data.title}</h2>
                      
                      <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${data.excerpt}</p>
                      
                      <div style="text-align: center; margin: 25px 0;">
                          <a href="${data.articleUrl}" 
                             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px;">
                              Read Full Article
                          </a>
                      </div>
                      
                      <div style="border-top: 1px solid #e9ecef; padding-top: 15px; margin-top: 20px; color: #666; font-size: 14px;">
                          <p style="margin: 0;">By <strong>${data.author}</strong> • ${data.publishDate}</p>
                      </div>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                      <a href="${data.websiteUrl}" 
                         style="color: #667eea; text-decoration: none; font-weight: bold;">
                          Visit wheredjsplay.com for more news
                      </a>
                  </div>
                  
                  <!-- DJLink.me Advertisement -->
                  <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center; color: white;">
                      <div style="margin-bottom: 20px;">
                          <h3 style="margin: 0 0 10px 0; font-size: 22px; color: #fff;">🎧 Are You a DJ?</h3>
                          <p style="margin: 0; color: #ccc; font-size: 16px;">Create your professional DJ profile and connect with venues, promoters, and fans worldwide.</p>
                      </div>
                      
                      <div style="display: flex; justify-content: center; align-items: center; gap: 15px; margin: 20px 0; flex-wrap: wrap;">
                          <div style="display: flex; align-items: center; gap: 8px; color: #ccc; font-size: 14px;">
                              <span style="color: #ff5500;">👥</span>
                              <span>50K+ DJs</span>
                          </div>
                          <div style="display: flex; align-items: center; gap: 8px; color: #ccc; font-size: 14px;">
                              <span style="color: #ff5500;">⭐</span>
                              <span>4.9/5 Rating</span>
                          </div>
                          <div style="display: flex; align-items: center; gap: 8px; color: #ccc; font-size: 14px;">
                              <span style="color: #ff5500;">🌍</span>
                              <span>Global Network</span>
                          </div>
                      </div>
                      
                      <a href="https://djlink.me" 
                         style="background: linear-gradient(135deg, #ff5500 0%, #ff3300 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px; margin-top: 10px; transition: all 0.3s ease;">
                          Create Your DJ Profile
                      </a>
                      
                      <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
                          Join the largest DJ community and get booked worldwide
                      </p>
                  </div>
              </div>
              
              <!-- Footer -->
              <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px; padding: 20px;">
                  <p><a href="${data.unsubscribeUrl}" style="color: #666;">Unsubscribe from these notifications</a></p>
                  <p>This email was sent because you subscribed to wheredjsplay newsletter.</p>
              </div>
          </div>
      </body>
      </html>
    `,
    text: `
🎵 wheredjsplay - Latest Electronic Music News

New Article: ${data.title}

${data.excerpt}

Read the full article: ${data.articleUrl}

By ${data.author} • ${data.publishDate}

Visit wheredjsplay.com for more news: ${data.websiteUrl}

🎧 Are You a DJ?
Create your professional DJ profile and connect with venues, promoters, and fans worldwide.
Join 50K+ DJs on the largest DJ community platform.

Create Your DJ Profile: https://djlink.me

Unsubscribe: ${data.unsubscribeUrl}
    `
  })
};

// Send email function
async function sendEmail(to, template, data) {
  try {
    const emailTemplate = emailTemplates[template](data);
    


    
    const result = await sendEmailViaBrevo(
      to,
      data.name || 'User',
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text
    );
    

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

// Send automated article notification email
async function sendArticleNotificationEmail(to, articleData, unsubscribeUrl) {
  const data = {
    title: articleData.title,
    excerpt: articleData.excerpt,
    image: articleData.image,
    category: articleData.category,
    author: articleData.author,
    publishDate: articleData.publishDate,
    articleUrl: articleData.articleUrl,
    websiteUrl: articleData.websiteUrl,
    unsubscribeUrl: unsubscribeUrl
  };

  return sendEmail(to, 'articleNotification', data);
}

module.exports = {
  sendEmail,
  sendUserInvitationEmail,
  sendNewsletterEmail,
  sendArticleNotificationEmail,
  emailTemplates
};
