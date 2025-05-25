# LynqIt Chat Application

A comprehensive real-time chat application built with React, Socket.IO, and Node.js. LynqIt provides a WhatsApp-like experience with advanced features including personal and group messaging, status updates, media sharing, and robust security features.

## 🚀 Key Features

### 💬 **Real-Time Messaging**
- **Instant messaging** with Socket.IO for both personal and group chats
- **Message status indicators**: Single tick (sent), double tick (delivered), blue tick (seen)
- **Typing indicators** to show when users are typing
- **Message reactions** with emoji support
- **Reply to messages** with context preservation
- **Message editing** and deletion (for everyone or just yourself)
- **Message forwarding** between chats
- **@ Mentions** in group chats
- **Media sharing**: Images and GIFs
- **Message search** across all conversations

### 👥 **Group Chat Management**
- **Create and manage groups** with up to unlimited members
- **Role-based permissions**: Owner, Admin, Member roles
- **Group settings**: Name, description, profile picture
- **Member management**: Add/remove members, promote/demote admins
- **Group invite links** with expiration and access control
- **Group permissions**: Control who can change settings
- **Group notifications** and mention tracking

### 📱 **Status Updates (WhatsApp-style)**
- **Text and image status** posts with 24-hour auto-expiry
- **Status privacy controls**: Contacts, contacts except, only share with
- **Status reactions** and replies
- **Viewer tracking** with timestamps
- **Status muting** and reporting
- **Background colors** and font styling for text status

### 🔐 **Security & Privacy**
- **Two-Factor Authentication (2FA)** with TOTP and backup codes
- **Email verification** with OTP for account creation
- **Account lockout** protection against brute force attacks
- **CSRF protection** and security headers
- **Input sanitization** and validation
- **Audit logging** for security events
- **Block/unblock users** functionality
- **Message reporting** system with admin moderation

### 🎨 **User Experience**
- **UI design** with modern, clean interface
- **Light/dark mode** with automatic time-based switching
- **Responsive design** for all devices (mobile, tablet, desktop) {upcoming}
- **Profile customization** with bio, avatar, and status
- **Pinned chats** (up to 5 chats/groups)
- **Unread message counters** with real-time updates
- **Online/offline status** indicators
- **Last seen** timestamps
- **Message timestamps** with smart formatting
- **Emoji picker** for reactions and messages

### 🔍 **Advanced Features**
- **Global search** across messages, users, and groups
- **Message encryption** support (can be enabled/disabled)
- **File upload** with drag-and-drop support
- **Image previews** with full-screen viewing
- **Connection status** indicators
- **Offline message queuing** with automatic retry
- **Real-time notifications** for mentions and messages
- **Keyboard shortcuts** for quick actions

## 🏗️ Tech Stack

### **Frontend**
- **React 18** with Hooks and Context API
- **Zustand** for state management
- **Socket.IO Client** for real-time communication
- **Tailwind CSS** with DaisyUI for styling
- **Vite** for fast development and building
- **Lucide React** for icons
- **React Hot Toast** for notifications
- **Emoji Picker React** for emoji support

### **Backend**
- **Node.js** with Express.js framework
- **Socket.IO** for real-time bidirectional communication
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Bcrypt** for password hashing
- **Speakeasy** for 2FA TOTP generation
- **Nodemailer** for email services
- **Cloudinary** for media storage
- **Helmet** for security headers

## 📁 Project Structure

```
LynqIt-Chat-App/
├── backend/                    # Node.js Express server
│   ├── src/
│   │   ├── controllers/        # Route controllers
│   │   ├── middleware/         # Custom middleware
│   │   ├── models/            # MongoDB models
│   │   ├── routes/            # API routes
│   │   ├── lib/               # Utilities (DB, Socket.IO, etc.)
│   │   ├── utils/             # Helper functions
│   │   └── index.js           # Server entry point
│   └── package.json
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── store/             # Zustand stores
│   │   ├── utils/             # Frontend utilities
│   │   ├── lib/               # Frontend libraries
│   │   └── App.jsx            # Main App component
│   └── package.json
├── scripts/                    # Deployment scripts
└── package.json               # Root package.json
```

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+
- MongoDB database
- Gmail account (for email verification)
- Cloudinary account (for media storage)

### **Production Deployment**

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

3. **Using deployment script**
   ```bash
   npm run deploy
   ```

## 📧 Email Configuration

### **Gmail Setup for Email Verification**

1. **Create or use existing Gmail account**
2. **Enable 2-Step Verification**:
   - Go to Google Account > Security > 2-Step Verification
   - Follow the setup process

3. **Generate App Password**:
   - Go to Google Account > Security > App passwords
   - Select "Mail" and "Other" (name it "LynqIt")
   - Copy the 16-character password


### **How Email Verification Works**
- 6-digit OTP sent to user's email during registration
- OTP expires after 10 minutes (TTL index in MongoDB)
- Welcome email sent after successful verification
- Password reset functionality with secure tokens

## 🔧 Available Scripts

```bash
# Development
npm run dev:server          # Start backend development server
npm run dev:client          # Start frontend development server

# Production
npm run build               # Build frontend for production
npm start                   # Start production server
npm run deploy              # Run deployment script

# Utilities
npm run production-check    # Validate production environment
npm install                 # Install all dependencies
```

## 🌐 API Endpoints

### **Authentication**
- `POST /api/auth/signup` - User registration with email verification
- `POST /api/auth/verify-email` - Verify email with OTP
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### **Messages**
- `GET /api/messages/users` - Get all users for chat
- `GET /api/messages/:id` - Get messages with specific user
- `POST /api/messages/send/:id` - Send message to user
- `PUT /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message

### **Groups**
- `GET /api/groups` - Get user's groups
- `POST /api/groups` - Create new group
- `GET /api/groups/:id` - Get group details
- `POST /api/groups/:id/messages` - Send group message
- `POST /api/groups/:id/members` - Add group members
- `DELETE /api/groups/:id/members/:userId` - Remove group member

### **Status**
- `GET /api/status` - Get all status updates
- `POST /api/status` - Create new status
- `POST /api/status/:id/view` - Mark status as viewed
- `POST /api/status/:id/react` - React to status

## 🔒 Security Features

### **Authentication & Authorization**
- JWT-based authentication with secure HTTP-only cookies
- Password hashing with bcrypt (12 rounds)
- Email verification with OTP
- Two-Factor Authentication (2FA) with TOTP
- Account lockout after failed login attempts

### **Data Protection**
- Input sanitization and validation
- CSRF protection
- Security headers with Helmet.js
- Rate limiting on sensitive endpoints
- Audit logging for security events

### **Privacy Controls**
- Block/unblock users
- Message reporting system
- Status privacy settings
- Group permission controls

## 🚀 Performance Optimizations

### **Frontend**
- Code splitting with Vite
- Lazy loading of components
- Optimistic UI updates
- Image optimization and caching
- Bundle size optimization

### **Backend**
- MongoDB indexing for fast queries
- Socket.IO connection pooling
- Cloudinary for media optimization
- Efficient database queries
- Memory usage optimization

## 🐛 Troubleshooting

### **Common Issues**

1. **Socket.IO Connection Issues**
   - Check if ports 5001 and 5173 are available
   - Verify CORS configuration
   - Check firewall settings

2. **Email Not Sending**
   - Verify Gmail App Password is correct
   - Check if 2-Step Verification is enabled
   - Ensure EMAIL_USER and EMAIL_PASSWORD are set

3. **Database Connection**
   - Verify MongoDB is running
   - Check MONGODB_URI format
   - Ensure database permissions

4. **Media Upload Issues**
   - Verify Cloudinary credentials
   - Check file size limits
   - Ensure proper CORS settings

### **Debug Mode**
Set `NODE_ENV=development` to enable debug logs and detailed error messages.


## 📄 License

This project is licensed under the **ISC License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Socket.IO** for real-time communication
- **MongoDB** for flexible data storage
- **Cloudinary** for media management
- **React** and **Node.js** communities
- **DaisyUI** for beautiful UI components

---

**Built with ❤️ by the LynqIt Team**

For support or questions, please open an issue on GitHub.
