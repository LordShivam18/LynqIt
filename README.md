# LynqIt Chat Application

A real-time chat application built with React, Socket.IO, and Node.js. Features include real-time messaging, profile management, theme customization, and more.

## Features

- Real-time messaging with Socket.IO
- User authentication and account management
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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License. 
