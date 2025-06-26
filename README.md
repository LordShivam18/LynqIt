# LynqIt Chat Application

A comprehensive real-time chat application built with React, Socket.IO, and Node.js. LynqIt provides an experience full of advanced features including personal and group messaging, status updates, media sharing, and more.

## 🚀 Key Features

### 💬 **Real-Time Messaging**
- **Instant messaging** with Socket.IO for both personal and group chats
- **Message status indicators**: Single tick (sent), double tick (delivered), blue tick (seen)
- **Message reactions** with emoji support
- **Reply to messages** with context preservation
- **Message editing** and deletion (for everyone or just yourself)
- **Message forwarding** between chats
- **@ Mentions** in group chats
- **Media sharing**: Images and GIFs
- **Multi-device synchronization** for a seamless experience across devices

### 👥 **Group Chat Management**
- **Create and manage groups** with unlimited members
- **Role-based permissions**: Owner, Admin, Member roles
- **Group settings**: Name, description, profile picture
- **Member management**: Add/remove members, promote/demote admins
- **Group invite links** with expiration
- **Group notifications** and mention tracking

### 📱 **Status Updates**
- **Text and image status** posts with 24-hour auto-expiry
- **Status privacy controls**: Contacts, contacts except, only share with
- **Status reactions** and replies
- **Viewer tracking** with timestamps
- **Background colors** and font styling for text status
- **Font family selection** and text alignment options

### 🎨 **User Experience**
- **UI design** with modern, clean interface
- **Light/dark mode** with automatic time-based switching
- **Responsive design** for desktop (mobile coming soon)
- **Profile customization** with bio and avatar
- **Pinned chats** for important conversations
- **Unread message counters** with real-time updates
- **Online/offline status** indicators with last seen timestamps
- **Sound notifications** for new messages
- **Toast notifications** for messages when chat isn't open

## 🛠️ Recent Updates & Improvements

### Real-Time Functionality
- **Enhanced Socket.IO connection** with improved reliability
- **Global user socket mapping** for consistent message delivery
- **Optimized heartbeat mechanism** to maintain connections
- **Advanced reconnection logic** for connection disruptions
- **Improved real-time status updates** across all clients

### User Experience
- **Sound notifications** for new messages and group mentions
- **Toast notifications** with message previews
- **Faster message delivery** with Socket.IO optimizations
- **Improved message status updates** in real-time
- **Enhanced group message experience** with better mention handling

### Backend Optimizations
- **Socket connection pooling** for better performance
- **Reduced latency** with optimized socket settings
- **Improved error handling** and connection recovery
- **Better cross-device synchronization** of messages and status

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
- **Nodemailer** for email services
- **Cloudinary** for media storage

## 📁 Project Structure

```
LynqIt/
├── backend/                    # Node.js Express server
│   ├── src/
│   │   ├── controllers/        # Route controllers
│   │   ├── middleware/         # Custom middleware
│   │   ├── models/            # MongoDB models
│   │   ├── routes/            # API routes
│   │   ├── lib/               # Utilities (DB, Socket.IO, etc.)
│   │   └── index.js           # Server entry point
│   └── package.json
├── frontend/                   # React frontend
│   ├── public/                # Static assets
│   │   └── sounds/            # Notification sounds
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── store/             # Zustand stores
│   │   ├── utils/             # Frontend utilities
│   │   ├── lib/               # Frontend libraries
│   │   ├── pages/             # Page components
│   │   └── App.jsx            # Main App component
│   └── package.json
└── README.md                  # Project documentation
```

## 🌐 API Endpoints

### **Authentication**
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/check` - Check authentication status
- `POST /api/auth/google` - Google OAuth login

### **Messages**
- `GET /api/messages/users` - Get all users for chat
- `GET /api/messages/:id` - Get messages with specific user
- `POST /api/messages/send/:id` - Send message to user
- `PUT /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message
- `POST /api/messages/forward` - Forward messages
- `POST /api/messages/react/:id` - React to message

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

## 🛠️ Troubleshooting

### **Common Issues**

1. **Socket.IO Connection Issues**
   - Check if ports 5001 and 5173 are available
   - Verify CORS configuration is correct
   - Check browser console for connection errors
   - Ensure both backend and frontend are running

2. **Media Upload Issues**
   - Verify Cloudinary credentials in backend .env
   - Check file size limits (default: 1MB)
   - Check browser console for upload errors

3. **Real-Time Chat Not Working**
   - Verify Socket.IO connection in browser console
   - Check for any firewall or network restrictions
   - Ensure user IDs are correctly passed to socket connections

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Contact

For any questions or support, please contact [lordshivam2224@gmail.com](mailto:lordshivam2224@gmai.com).
