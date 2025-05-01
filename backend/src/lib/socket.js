import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { getUnreadCountsForUser } from "../controllers/message.controller.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
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
      
      // For delete for everyone, notify the recipient
      if (deleteType === 'everyone') {
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
      }
    } catch (error) {
      console.error("Error handling message deletion:", error);
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

export { io, app, server };