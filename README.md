# LynqIt Chat Application

A real-time chat application built with React, Socket.IO, and Node.js. Features include real-time messaging, profile management, theme customization, and more.

## Features

- Real-time messaging with Socket.IO
- User authentication with email verification
- Secure account management with OTP verification
- Profile customization with bio and avatar
- Light/dark mode with automatic time-based switching
- End-to-end encryption for messages
- GIF support and media sharing
- Responsive design for all devices

## Project Structure

```
.
├── backend/            # Node.js Express server
│   ├── src/            # Server source code
│   └── package.json    # Backend dependencies
├── frontend/           # React frontend application
│   ├── src/            # Frontend source code
│   └── package.json    # Frontend dependencies
└── package.json        # Root package.json for deployment
```

## Development Setup

To run the application locally:

1. Clone the repository
2. Create a `.env` file in the `backend` directory (see `.env.example` for reference)
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the backend server:
   ```bash
   npm run dev:server
   ```
5. Run the frontend development server:
   ```bash
   npm run dev:client
   ```
6. Open http://localhost:5173 in your browser

## Email Verification Setup

The application uses email verification with OTP (One-Time Password) for secure user registration:

### Local Development Setup

1. Create a Gmail account or use an existing one
2. Enable 2-Step Verification in your Google Account settings
3. Generate an App Password:
   - Go to your Google Account > Security > App passwords
   - Select "Mail" as the app and "Other" as the device (name it "LynqIt")
   - Copy the 16-character password
4. Update your `.env` file:
   ```
   EMAIL_USER=your_gmail_address@gmail.com
   EMAIL_PASSWORD=your_16_character_app_password
   ```

### Production Deployment (Render)

When deploying to Render:

1. The email configuration variables are defined in `render.yaml`
2. Set the actual values in the Render dashboard:
   - Go to your service > Environment
   - Add the `EMAIL_USER` and `EMAIL_PASSWORD` variables
   - Use the same Gmail App Password setup as described above

### How It Works

1. When a user signs up, a 6-digit OTP is generated and sent to their email
2. The OTP is stored in MongoDB with a TTL index (expires after 10 minutes)
3. The user enters the OTP to verify their email address
4. Upon successful verification, the user account is created and a welcome email is sent

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License.
