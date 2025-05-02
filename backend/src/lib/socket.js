import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { getUnreadCountsForUser } from "../controllers/message.controller.js";
import cloudinary from "../lib/cloudinary.js";

const app = express();
const server = http.createServer(app);

// Configure Socket.io with appropriate CORS settings
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" 
      ? true // Allow any origin in production
      : ["http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000 // Increase timeout for better connection stability
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", async (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    
    // Update user status to online
    try {
      await User.findByIdAndUpdate(userId, { 
        isOnline: true,
        lastSeen: new Date()
      });
      
      // Notify all users about this user coming online
      io.emit("userStatusUpdate", {
        userId,
        isOnline: true,
        lastSeen: new Date()
      });
      
      // Send unread message counts to the user
      const unreadCounts = await getUnreadCountsForUser(userId);
      socket.emit("unreadCountUpdate", unreadCounts);
    } catch (error) {
      console.error("Error updating user online status:", error);
    }
  }

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));
  
  // Handle client requesting to refresh sidebar
  socket.on("requestChatUpdate", async () => {
    if (userId) {
      socket.emit("refreshChats");
      
      // Also refresh unread counts
      const unreadCounts = await getUnreadCountsForUser(userId);
      socket.emit("unreadCountUpdate", unreadCounts);
    }
  });
  
  // Handle message delivery status updates
  socket.on("messageDelivered", async ({ messageIds }) => {
    try {
      // Find messages and update their status
      const messages = await Message.find({
        _id: { $in: messageIds },
        receiverId: userId,
        status: 'sent'
      });
      
      if (messages.length > 0) {
        await Message.updateMany(
          { _id: { $in: messages.map(m => m._id) } },
          { $set: { status: 'delivered', deliveredAt: new Date() } }
        );
        
        // Group messages by sender and notify each sender
        const messagesBySender = {};
        messages.forEach(msg => {
          const senderId = msg.senderId.toString();
          if (!messagesBySender[senderId]) messagesBySender[senderId] = [];
          messagesBySender[senderId].push(msg._id);
        });
        
        // Notify each sender
        Object.entries(messagesBySender).forEach(([senderId, msgIds]) => {
          const senderSocketId = userSocketMap[senderId];
          if (senderSocketId) {
            io.to(senderSocketId).emit("messageStatusUpdate", {
              messageIds: msgIds,
              status: 'delivered',
              timestamp: new Date()
            });
          }
        });
      }
    } catch (error) {
      console.error("Error updating message delivery status:", error);
    }
  });
  
  // Handle message seen status updates
  socket.on("messageSeen", async ({ messageIds }) => {
    try {
      // Find messages and update their status
      const messages = await Message.find({
        _id: { $in: messageIds },
        receiverId: userId,
        status: { $ne: 'seen' }
      });
      
      if (messages.length > 0) {
        await Message.updateMany(
          { _id: { $in: messages.map(m => m._id) } },
          { $set: { status: 'seen', seenAt: new Date() } }
        );
        
        // Group messages by sender and notify each sender
        const messagesBySender = {};
        messages.forEach(msg => {
          const senderId = msg.senderId.toString();
          if (!messagesBySender[senderId]) messagesBySender[senderId] = [];
          messagesBySender[senderId].push(msg._id);
        });
        
        // Notify each sender
        Object.entries(messagesBySender).forEach(([senderId, msgIds]) => {
          const senderSocketId = userSocketMap[senderId];
          if (senderSocketId) {
            io.to(senderSocketId).emit("messageStatusUpdate", {
              messageIds: msgIds,
              status: 'seen',
              timestamp: new Date()
            });
          }
        });
      }
    } catch (error) {
      console.error("Error updating message seen status:", error);
    }
  });
  
  // Handle heartbeat to update last seen
  socket.on("heartbeat", async () => {
    if (userId) {
      try {
        await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
      } catch (error) {
        console.error("Error updating last seen:", error);
      }
    }
  });
  
  // Handle message deletion
  socket.on("messageDeleted", async ({ messageId, deleteType }) => {
    try {
      const message = await Message.findById(messageId);
      
      if (!message) {
        return;
      }
      
      // Process the deletion based on type
      if (deleteType === 'everyone') {
        // For "delete for everyone", delete the message and associated media
        if (message.image) {
          try {
            // Extract public ID from Cloudinary URL
            const publicId = extractCloudinaryPublicId(message.image);
            if (publicId) {
              await cloudinary.uploader.destroy(publicId);
              console.log(`[Socket] Deleted media from Cloudinary: ${publicId}`);
            }
          } catch (error) {
            console.error("[Socket] Error deleting media from Cloudinary:", error);
          }
        }
        
        // Delete the message from database
        await Message.findByIdAndDelete(messageId);
        
        // Get the other user's ID
        const otherUserId = message.senderId.toString() === userId.toString() 
          ? message.receiverId.toString() 
          : message.senderId.toString();
        
        // Notify the other user
        const receiverSocketId = userSocketMap[otherUserId];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("messageDeleted", {
            messageId,
            deleteType
          });
        }
      } else if (deleteType === 'me') {
        // For "delete for me", check if both users have deleted the message
        if (message.deletedFor === 'me' && message.deletedBy && message.deletedBy.toString() !== userId) {
          // Both users have deleted the message, so delete it entirely and its media
          if (message.image) {
            try {
              // Extract public ID from Cloudinary URL
              const publicId = extractCloudinaryPublicId(message.image);
              if (publicId) {
                await cloudinary.uploader.destroy(publicId);
                console.log(`[Socket] Deleted media from Cloudinary after both users deleted: ${publicId}`);
              }
            } catch (error) {
              console.error("[Socket] Error deleting media from Cloudinary:", error);
            }
          }
          
          // Delete the message from database
          await Message.findByIdAndDelete(messageId);
        } else {
          // Just mark as deleted for this user
          message.isDeleted = true;
          message.deletedFor = 'me';
          message.deletedBy = userId;
          message.deletedAt = new Date();
          
          await message.save();
        }
      }
    } catch (error) {
      console.error("Error handling message deletion in socket:", error);
    }
  });

  // Handle message editing
  socket.on("messageEdited", async ({ messageId, text }) => {
    try {
      const message = await Message.findById(messageId);
      
      if (!message) {
        return;
      }
      
      // Verify that the sender is the one editing
      if (message.senderId.toString() !== userId) {
        console.error("Unauthorized attempt to edit message:", messageId);
        return;
      }
      
      // Check if message is deleted
      if (message.isDeleted) {
        return;
      }
      
      // Check if it's within 15 minutes
      const messageDate = new Date(message.createdAt);
      const now = new Date();
      const minutesDiff = (now - messageDate) / (1000 * 60);
      
      if (minutesDiff > 15) {
        return;
      }
      
      // If this is the first edit, save the original text
      const originalText = !message.isEdited ? message.text : message.originalText;
      
      // Update the message
      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        {
          text,
          isEdited: true,
          editedAt: new Date(),
          originalText
        },
        { new: true }
      );
      
      // Notify the recipient about the edit
      const receiverSocketId = userSocketMap[message.receiverId.toString()];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageEdited", updatedMessage);
      }
      
      // Also notify the sender on all devices
      io.to(socket.id).emit("messageEdited", updatedMessage);
    } catch (error) {
      console.error("Error handling message editing:", error);
    }
  });

  socket.on("disconnect", async () => {
    console.log("A user disconnected", socket.id);
    
    if (userId) {
      delete userSocketMap[userId];
      
      // Update user status to offline with last seen timestamp
      try {
        await User.findByIdAndUpdate(userId, { 
          isOnline: false,
          lastSeen: new Date()
        });
        
        // Notify all users about this user going offline
        io.emit("userStatusUpdate", {
          userId,
          isOnline: false,
          lastSeen: new Date()
        });
      } catch (error) {
        console.error("Error updating user offline status:", error);
      }
    }
    
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// Helper function to extract Cloudinary public ID from URL
function extractCloudinaryPublicId(url) {
  try {
    // Handle different Cloudinary URL formats
    if (!url) return null;
    
    // Format: https://res.cloudinary.com/cloud-name/image/upload/v1234567890/folder/public_id.ext
    const regex = /\/v\d+\/(?:.*\/)?(.+?)\./;
    const match = url.match(regex);
    
    if (match && match[1]) {
      return match[1];
    }
    
    // Alternative approach for different URL formats
    const urlParts = url.split('/');
    const filenamePart = urlParts[urlParts.length - 1];
    const publicId = filenamePart.split('.')[0];
    
    return publicId;
  } catch (error) {
    console.error("Error extracting Cloudinary public ID:", error);
    return null;
  }
}

export { io, app, server };