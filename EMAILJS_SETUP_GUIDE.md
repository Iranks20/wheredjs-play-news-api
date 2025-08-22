# EmailJS Setup Guide for WhereDJsPlay

## 🔧 Quick Setup

### 1. Get Your EmailJS Credentials

1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Sign up/Login to your account
3. Get your credentials from the dashboard:
   - **Service ID**: From Email Services tab
   - **Template ID**: From Email Templates tab
   - **User ID**: From Account tab (Public Key)

### 2. Configure Your Credentials

**Option A: Update Config File (Recommended)**
Edit `config/emailjs.js` and replace the placeholder values:

```javascript
const emailjsConfig = {
  serviceId: 'your_actual_service_id_here',
  templateId: 'your_actual_template_id_here',
  newsletterTemplateId: 'your_actual_newsletter_template_id_here',
  userId: 'your_actual_user_id_here',
  frontendUrl: 'http://localhost:3000'
};
```

**Option B: Use Environment Variables**
Add to your `.env` file:

```env
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_template_id
EMAILJS_NEWSLETTER_TEMPLATE_ID=your_newsletter_template_id
EMAILJS_USER_ID=your_user_id
FRONTEND_URL=http://localhost:3000
```

### 3. Test Your Configuration

Run the test script to verify everything works:

```bash
node test-emailjs.js
```

## 📧 EmailJS Template Setup

### User Invitation Template

Create a template in EmailJS with these variables:

**Required Variables:**
- `{{to_name}}` - Recipient's name
- `{{to_email}}` - Recipient's email
- `{{user_password}}` - Generated password
- `{{user_role}}` - User role (Admin/Editor/Author/Writer)
- `{{role_description}}` - Role description
- `{{login_url}}` - Login URL
- `{{from_name}}` - Sender name

**Example Template:**
```html
<h2>Welcome to WhereDJsPlay!</h2>
<p>Hello {{to_name}},</p>
<p>You have been invited to join WhereDJsPlay as a {{user_role}}.</p>
<p><strong>Role Description:</strong> {{role_description}}</p>
<p><strong>Your Login Credentials:</strong></p>
<ul>
  <li>Email: {{to_email}}</li>
  <li>Password: {{user_password}}</li>
</ul>
<p><a href="{{login_url}}">Click here to login</a></p>
<p>Best regards,<br>{{from_name}}</p>
```

## 🐛 Troubleshooting

### Common Issues

1. **"Invalid service ID"**
   - Check your Service ID in EmailJS dashboard
   - Make sure the service is active

2. **"Invalid template ID"**
   - Check your Template ID in EmailJS dashboard
   - Make sure the template is published

3. **"Invalid user ID"**
   - Check your User ID (Public Key) in EmailJS dashboard
   - Make sure you're using the Public Key, not Private Key

4. **"Email not sending"**
   - Check EmailJS dashboard for any service limits
   - Verify your email service is properly configured
   - Check browser console for detailed error messages

### Debug Steps

1. **Run the test script:**
   ```bash
   node test-emailjs.js
   ```

2. **Check server logs:**
   When inviting a user, look for these log messages:
   ```
   📧 Starting invitation email process...
   ✅ EmailJS credentials loaded: {...}
   📧 EmailJS template parameters: {...}
   📧 Attempting to send email via EmailJS...
   ✅ Invitation email sent successfully: {...}
   ```

3. **Verify credentials:**
   - Service ID: Should be a string like "service_abc123"
   - Template ID: Should be a string like "template_xyz789"
   - User ID: Should be a string like "user_def456"

### EmailJS Dashboard Checklist

- [ ] Email Service is active
- [ ] Email Template is published
- [ ] Template variables match the code
- [ ] Account has sufficient credits
- [ ] No rate limiting issues

## 🔒 Security Notes

- Never commit real EmailJS credentials to git
- Use environment variables in production
- The config file is for development only
- User ID (Public Key) is safe to expose in frontend code

## 📞 Support

If you're still having issues:

1. Check EmailJS documentation: https://www.emailjs.com/docs/
2. Verify your EmailJS account status
3. Test with EmailJS's built-in testing tools
4. Check the server logs for detailed error messages
