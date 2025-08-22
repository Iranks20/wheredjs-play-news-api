# Brevo (formerly Sendinblue) Setup Guide

This guide will help you set up Brevo as your email service provider for the WhereDJsPlay API.

## 🚀 Getting Started with Brevo

### 1. Create a Brevo Account

1. Go to [Brevo's website](https://www.brevo.com/)
2. Click "Get Started Free" or "Sign Up"
3. Create your account (you can use the free tier which includes 300 emails/day)

### 2. Verify Your Sender Email

1. Log in to your Brevo dashboard
2. Go to **Settings** → **Senders & IP**
3. Click **Add a new sender**
4. Enter your sender email (e.g., `noreply@wheredjsplay.com`)
5. Verify your email by clicking the link sent to your inbox
6. Wait for Brevo to approve your sender (usually instant for verified domains)

### 3. Get Your API Key

1. In your Brevo dashboard, go to **Settings** → **API Keys**
2. Click **Create a new API key**
3. Give it a name (e.g., "WhereDJsPlay API")
4. Select the appropriate permissions:
   - **SMTP** (for sending emails)
   - **Contacts** (if you plan to use contact management)
5. Copy the generated API key (you won't be able to see it again)

## 🔧 Configuration

### Environment Variables

Add these variables to your `.env` file:

```env
# Brevo Configuration
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_EMAIL=your_verified_sender_email@domain.com
BREVO_SENDER_NAME=WhereDJsPlay Team
FRONTEND_URL=http://your-frontend-url.com

# Optional: Template IDs (if using Brevo templates)
BREVO_INVITATION_TEMPLATE_ID=your_invitation_template_id
BREVO_NEWSLETTER_TEMPLATE_ID=your_newsletter_template_id
```

### Update Configuration File

The configuration is already set up in `config/brevo.js`. You can modify the default values if needed:

```javascript
const brevoConfig = {
  apiKey: process.env.BREVO_API_KEY || 'your_brevo_api_key_here',
  senderEmail: process.env.BREVO_SENDER_EMAIL || 'noreply@wheredjsplay.com',
  senderName: process.env.BREVO_SENDER_NAME || 'WhereDJsPlay Team',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  // ... other settings
};
```

## 🧪 Testing Your Setup

### Run the Test Script

1. Make sure your environment variables are set
2. Run the test script:

```bash
node test-brev.js
```

This will:
- Validate your credentials
- Send a test email
- Show you if everything is working correctly

### Expected Output

If successful, you should see:
```
🧪 Testing Brevo Configuration...

✅ Brevo credentials validated successfully
✅ Brevo credentials loaded: {
  senderEmail: 'your-email@domain.com',
  senderName: 'WhereDJsPlay Team',
  apiKey: '***abcd'
}

📧 Attempting to send test email via Brevo...
To: test@example.com
Subject: Test Email from WhereDJsPlay

🎉 SUCCESS! Brevo is working correctly
Response: { messageId: 'xxx' }
Message ID: xxx

✅ Brevo configuration test completed
```

## 📧 Email Templates

### User Invitation Email

The system automatically generates beautiful HTML emails for user invitations with:
- Professional styling
- Role-specific information
- Login credentials
- Security reminders
- Login button

### Newsletter Emails

Newsletter emails include:
- Customizable content
- Unsubscribe links
- Responsive design
- Both HTML and text versions

## 🔄 Migration from EmailJS

The system has been updated to use Brevo instead of EmailJS:

### What Changed

1. **Configuration**: `config/emailjs.js` → `config/brevo.js`
2. **User Invitations**: Updated in `routes/users.js`
3. **Newsletter Sending**: Updated in `routes/subscribers.js`
4. **Dependencies**: Removed `@emailjs/nodejs` from `package.json`

### Benefits of Brevo

- **Better Deliverability**: Higher email delivery rates
- **More Features**: Advanced analytics, templates, automation
- **Cost Effective**: Free tier with 300 emails/day
- **Professional**: Enterprise-grade email service
- **API First**: Better API documentation and support

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Missing or invalid Brevo credentials"

**Solution**: Check your environment variables:
```bash
echo $BREVO_API_KEY
echo $BREVO_SENDER_EMAIL
```

#### 2. "401 Unauthorized" or "403 Forbidden"

**Solution**: 
- Verify your API key is correct
- Check if your Brevo account is active
- Ensure your sender email is verified

#### 3. "400 Bad Request"

**Solution**:
- Check email format (must be valid)
- Verify HTML content is properly formatted
- Ensure sender email is verified in Brevo

#### 4. Emails not being delivered

**Solution**:
- Check your Brevo dashboard for delivery status
- Verify your sender domain reputation
- Check spam folder
- Review Brevo's sending limits

### Getting Help

1. **Brevo Documentation**: [https://developers.brevo.com/](https://developers.brevo.com/)
2. **Brevo Support**: Available in your dashboard
3. **API Status**: [https://status.brevo.com/](https://status.brevo.com/)

## 📊 Monitoring

### Brevo Dashboard

Monitor your email performance in the Brevo dashboard:
- **Activity**: Track email opens, clicks, bounces
- **Statistics**: View delivery rates, engagement metrics
- **Logs**: Check detailed sending logs
- **Reports**: Generate performance reports

### API Logs

The application logs all email activities:
- Successful sends
- Failed attempts
- Error details
- Performance metrics

## 🔒 Security Best Practices

1. **API Key Security**: Never commit API keys to version control
2. **Environment Variables**: Use `.env` files for sensitive data
3. **Sender Verification**: Always verify sender emails in Brevo
4. **Rate Limiting**: Respect Brevo's sending limits
5. **Monitoring**: Regularly check email delivery reports

## 🎯 Next Steps

1. **Test thoroughly**: Send test emails to verify everything works
2. **Monitor performance**: Check delivery rates and engagement
3. **Customize templates**: Modify email templates as needed
4. **Set up analytics**: Configure tracking for better insights
5. **Scale up**: Upgrade your Brevo plan as needed

---

**Need help?** Check the troubleshooting section above or contact Brevo support directly.
