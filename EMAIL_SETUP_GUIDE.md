# Email Setup Guide for WhereDJsPlay

This guide covers how to configure email functionality for user invitations and newsletters in the WhereDJsPlay platform.

## 🔧 Quick Setup Options

### Option 1: Nodemailer with Gmail (Recommended for Development)

**Step 1: Enable 2-Factor Authentication on Gmail**
1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Generate an App Password for "Mail"

**Step 2: Configure Environment Variables**
Add to your `.env` file:
```env
EMAIL_PROVIDER=gmail
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
EMAIL_FROM=WhereDJsPlay <noreply@wheredjsplay.com>
FRONTEND_URL=http://localhost:3000
```

**Step 3: Test Configuration**
```bash
node test-email.js
```

### Option 2: Nodemailer with SendGrid (Recommended for Production)

**Step 1: Create SendGrid Account**
1. Sign up at [SendGrid](https://sendgrid.com/)
2. Create an API key
3. Verify your sender domain

**Step 2: Configure Environment Variables**
Add to your `.env` file:
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=WhereDJsPlay <noreply@yourdomain.com>
FRONTEND_URL=https://yourdomain.com
```

**Step 3: Test Configuration**
```bash
node test-email.js
```

### Option 3: EmailJS (Alternative)

**Step 1: Get EmailJS Credentials**
1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Sign up/Login to your account
3. Get your credentials:
   - Service ID: From Email Services tab
   - Template ID: From Email Templates tab
   - User ID/Public Key: From Account tab

**Step 2: Configure Environment Variables**
Add to your `.env` file:
```env
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_template_id
EMAILJS_USER_ID=your_user_id
EMAILJS_PUBLIC_KEY=your_public_key
FRONTEND_URL=http://localhost:3000
```

**Step 3: Test Configuration**
```bash
node test-emailjs.js
```

## 📧 Email Templates

### User Invitation Template

The system includes a beautiful HTML template for user invitations with:
- Professional styling with WhereDJsPlay branding
- Login credentials display
- Security warning
- Login button
- Responsive design

### Newsletter Template

For newsletters, the system supports custom HTML content with:
- Subject line customization
- Rich HTML content
- Responsive design

## 🔄 Fallback System

The system includes a smart fallback mechanism:

1. **Primary**: EmailJS (if configured)
2. **Fallback**: Nodemailer (if EmailJS fails)
3. **Error Handling**: Graceful error handling with detailed logging

## 🐛 Troubleshooting

### Common Issues

#### Gmail Authentication Error
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```
**Solution**: Use an App Password, not your regular Gmail password

#### SendGrid Connection Error
```
Error: connect ECONNREFUSED
```
**Solution**: Check your API key and ensure SendGrid service is active

#### EmailJS Public Key Error
```
Error: The public key is required
```
**Solution**: Get the correct Public Key from EmailJS dashboard

### Debug Steps

1. **Check Environment Variables**
   ```bash
   # Verify your .env file has the correct values
   cat .env | grep EMAIL
   ```

2. **Test Email Configuration**
   ```bash
   # Test Nodemailer
   node test-email.js
   
   # Test EmailJS
   node test-emailjs.js
   ```

3. **Check Server Logs**
   Look for these log messages:
   ```
   📧 Starting invitation email process...
   ✅ EmailJS credentials loaded: {...}
   📧 Attempting to send email via EmailJS...
   ✅ Invitation email sent successfully
   ```

## 🔒 Security Best Practices

1. **Never commit credentials to git**
   - Use environment variables
   - Add `.env` to `.gitignore`

2. **Use App Passwords for Gmail**
   - Don't use your regular password
   - Generate app-specific passwords

3. **Verify sender domains**
   - For production, verify your domain with email providers
   - Use consistent sender addresses

4. **Rate limiting**
   - EmailJS has rate limits
   - SendGrid has daily quotas
   - Monitor usage to avoid hitting limits

## 📊 Email Service Comparison

| Feature | Gmail | SendGrid | EmailJS |
|---------|-------|----------|---------|
| Setup Difficulty | Easy | Medium | Easy |
| Cost | Free (limited) | Free tier available | Free tier available |
| Reliability | High | Very High | Medium |
| Templates | Custom | Custom | Built-in |
| Rate Limits | 500/day | 100/day (free) | 200/month (free) |
| Best For | Development | Production | Simple use cases |

## 🚀 Production Deployment

### Recommended Setup for Production

1. **Use SendGrid** for reliable email delivery
2. **Verify your domain** with SendGrid
3. **Set up SPF/DKIM records** for better deliverability
4. **Monitor email metrics** in SendGrid dashboard
5. **Set up webhooks** for delivery tracking

### Environment Variables for Production

```env
# Production Email Configuration
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-production-api-key
EMAIL_FROM=WhereDJsPlay <noreply@wheredjsplay.com>
FRONTEND_URL=https://wheredjsplay.com

# Optional: Email tracking
SENDGRID_WEBHOOK_SECRET=your-webhook-secret
```

## 📞 Support

If you're still having issues:

1. Check the server logs for detailed error messages
2. Verify your email provider's status page
3. Test with a simple email first
4. Check your firewall/network settings
5. Contact your email provider's support

## 📝 Example .env File

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=wheredjsplay_news
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Email Configuration (Choose one option)
EMAIL_PROVIDER=gmail
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
EMAIL_FROM=WhereDJsPlay <noreply@wheredjsplay.com>
FRONTEND_URL=http://localhost:3000

# Other configurations...
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
CORS_ORIGIN=http://localhost:3000,http://13.60.95.22:3001,http://localhost:5173
API_PREFIX=/api/v1
```
