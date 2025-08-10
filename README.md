# WhereDJsPlay API

A complete Node.js REST API for the WhereDJsPlay news platform, built with Express.js and MySQL.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Article Management**: Full CRUD operations for news articles
- **Category Management**: Organize articles by categories
- **User Management**: Admin, Editor, and Author roles
- **File Upload**: Image upload with processing and optimization
- **Search & Filtering**: Advanced search with pagination
- **Analytics**: Dashboard statistics and view tracking
- **Newsletter**: Subscription management
- **Security**: Rate limiting, CORS, helmet, input validation

## 📋 Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   cd wheredjsplay-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your database credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=wheredjsplay_news
   JWT_SECRET=your_super_secret_jwt_key_here
   ```

4. **Set up the database**
   ```bash
   npm run migrate
   npm run seed
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📊 Database Schema

### Tables
- **users**: User accounts with roles and authentication
- **categories**: Article categories with metadata
- **articles**: News articles with full content and metadata
- **newsletter_subscribers**: Email subscription management
- **site_settings**: Application configuration

### Default Admin Credentials
- Email: `admin@wheredjsplay.com`
- Password: `admin123`

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh JWT token

### Articles
- `GET /api/v1/articles` - Get all articles (with filtering)
- `GET /api/v1/articles/:id` - Get single article
- `POST /api/v1/articles` - Create article
- `PUT /api/v1/articles/:id` - Update article
- `DELETE /api/v1/articles/:id` - Delete article
- `POST /api/v1/articles/:id/publish` - Publish article
- `POST /api/v1/articles/:id/feature` - Toggle featured status

### Categories
- `GET /api/v1/categories` - Get all categories
- `GET /api/v1/categories/:id` - Get single category
- `POST /api/v1/categories` - Create category
- `PUT /api/v1/categories/:id` - Update category
- `DELETE /api/v1/categories/:id` - Delete category

### Users
- `GET /api/v1/users` - Get all users (admin only)
- `GET /api/v1/users/:id` - Get single user
- `POST /api/v1/users` - Create user (admin only)
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user (admin only)

### File Upload
- `POST /api/v1/upload/image` - Upload article image
- `POST /api/v1/upload/avatar` - Upload user avatar
- `DELETE /api/v1/upload/:filename` - Delete uploaded file

### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard statistics
- `GET /api/v1/analytics/articles` - Article analytics
- `GET /api/v1/analytics/views` - View statistics
- `GET /api/v1/analytics/popular` - Popular articles

### Search
- `GET /api/v1/search/articles` - Search articles
- `GET /api/v1/search/suggestions` - Get search suggestions

### Newsletter
- `POST /api/v1/newsletter/subscribe` - Subscribe to newsletter
- `POST /api/v1/newsletter/unsubscribe` - Unsubscribe from newsletter

### Settings
- `GET /api/v1/settings` - Get site settings
- `PUT /api/v1/settings` - Update site settings (admin only)

## 🔐 Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### User Roles
- **admin**: Full access to all features
- **editor**: Can manage articles and categories
- **author**: Can create and edit their own articles

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | - |
| `DB_NAME` | Database name | `wheredjsplay_news` |
| `DB_PORT` | MySQL port | `3306` |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `UPLOAD_PATH` | File upload directory | `./uploads` |
| `MAX_FILE_SIZE` | Maximum file size (bytes) | `5242880` |

## 🚀 Deployment

### Production Setup

1. **Set environment variables for production**
   ```env
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=your_production_secret_key
   ```

2. **Install PM2 for process management**
   ```bash
   npm install -g pm2
   ```

3. **Start the application**
   ```bash
   pm2 start server.js --name "wheredjsplay-api"
   ```

4. **Set up reverse proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 🧪 Testing

```bash
npm test
```

## 📚 API Documentation

The API follows RESTful conventions and returns JSON responses. All responses include an `error` boolean field and appropriate HTTP status codes.

### Response Format
```json
{
  "error": false,
  "message": "Success message",
  "data": {
    // Response data
  }
}
```

### Error Format
```json
{
  "error": true,
  "message": "Error description"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email contact@wheredjsplay.com or create an issue in the repository.
