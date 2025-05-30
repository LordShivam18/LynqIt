import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import { getUnreadCountsForUser } from "../controllers/unreadCounter.controller.js";
import cloudinary from "../lib/cloudinary.js";

const app = express();
const server = http.createServer(app);

// Configure Socket.io with optimized settings for real-time performance
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production"
      ? [
          process.env.PRODUCTION_URL || 'https://lynqit.onrender.com',
          'https://lynqit.onrender.com',
          'https://www.lynqit.onrender.com'
        ]
      : ["http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  },
  // Optimized settings for real-time performance
  pingTimeout: 30000,        // Reduced from 60s to 30s for faster detection
  pingInterval: 10000,       // Ping every 10 seconds
  upgradeTimeout: 10000,     // Faster upgrade timeout
  allowEIO3: true,           // Allow Engine.IO v3 clients
  transports: ['websocket', 'polling'], // Prefer websocket, fallback to polling
  allowUpgrades: true,       // Allow transport upgrades
  perMessageDeflate: false,  // Disable compression for lower latency
  httpCompression: false,    // Disable HTTP compression for real-time
  maxHttpBufferSize: 1e6,    // 1MB max buffer size
  connectTimeout: 5000       // 5 second connection timeout
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
      // Find personal messages and update their status
      const personalMessages = await Message.find({
        _id: { $in: messageIds },
        receiverId: userId,
        messageType: 'direct',
        status: 'sent'
      });

      // Find group messages and update their status
      const groupMessages = await Message.find({
        _id: { $in: messageIds },
        messageType: 'group',
        'groupReadReceipts.userId': userId,
        'groupReadReceipts.status': { $in: ['sent', 'delivered'] }
      });

      // Update personal messages
      if (personalMessages.length > 0) {
        await Message.updateMany(
          { _id: { $in: personalMessages.map(m => m._id) } },
          { $set: { status: 'delivered', deliveredAt: new Date() } }
        );

        // Group messages by sender and notify each sender
        const messagesBySender = {};
        personalMessages.forEach(msg => {
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

      // Update group messages
      if (groupMessages.length > 0) {
        const updatePromises = groupMessages.map(message =>
          Message.updateOne(
            {
              _id: message._id,
              'groupReadReceipts.userId': userId
            },
            {
              $set: {
                'groupReadReceipts.$.status': 'delivered',
                'groupReadReceipts.$.deliveredAt': new Date()
              }
            }
          )
        );

        await Promise.all(updatePromises);

        // Notify senders about group message delivery
        const senderIds = [...new Set(groupMessages.map(msg => msg.senderId.toString()))];
        const User = mongoose.model('User');
        const reader = await User.findById(userId).select('fullName username profilePic');

        senderIds.forEach(senderId => {
          const senderSocketId = userSocketMap[senderId];
          if (senderSocketId) {
            const senderMessages = groupMessages
              .filter(msg => msg.senderId.toString() === senderId)
              .map(msg => msg._id);

            io.to(senderSocketId).emit("groupMessageStatusUpdate", {
              messageIds: senderMessages,
              user: reader,
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
      // Find personal messages and update their status
      const personalMessages = await Message.find({
        _id: { $in: messageIds },
        receiverId: userId,
        messageType: 'direct',
        status: { $ne: 'seen' }
      });

      // Find group messages and update their status
      const groupMessages = await Message.find({
        _id: { $in: messageIds },
        messageType: 'group',
        'groupReadReceipts.userId': userId,
        'groupReadReceipts.status': { $ne: 'seen' }
      });

      // Update personal messages
      if (personalMessages.length > 0) {
        await Message.updateMany(
          { _id: { $in: personalMessages.map(m => m._id) } },
          { $set: { status: 'seen', seenAt: new Date() } }
        );

        // Group messages by sender and notify each sender
        const messagesBySender = {};
        personalMessages.forEach(msg => {
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

        // Update ChatReadState unread counts for personal messages
        const { getOrCreateChatReadState, getUnreadCountsForUser } = await import('../controllers/unreadCounter.controller.js');

        // Get unique sender IDs
        const uniqueSenderIds = [...new Set(personalMessages.map(msg => msg.senderId.toString()))];

        // Update ChatReadState for each sender's chat
        for (const senderId of uniqueSenderIds) {
          // Get the latest message from this sender to the receiver
          const latestMessage = await Message.findOne({
            senderId: senderId,
            receiverId: userId
          }).sort({ createdAt: -1 });

          if (latestMessage) {
            // Update the read state for this direct chat
            const readState = await getOrCreateChatReadState(userId, 'direct', senderId);

            // Update read state with the latest seen message
            readState.lastSeenMessageId = latestMessage._id;
            readState.lastSeenTimestamp = latestMessage.createdAt;
            readState.unreadCount = 0; // Reset unread count since messages are now seen
            readState.lastActiveAt = new Date();

            await readState.save();
          }
        }

        // Get updated unread counts and emit to user
        const unreadCounts = await getUnreadCountsForUser(userId);
        const userSocketId = userSocketMap[userId];
        if (userSocketId) {
          io.to(userSocketId).emit("unreadCountUpdate", unreadCounts);
        }
      }

      // Update group messages
      if (groupMessages.length > 0) {
        const updatePromises = groupMessages.map(message =>
          Message.updateOne(
            {
              _id: message._id,
              'groupReadReceipts.userId': userId
            },
            {
              $set: {
                'groupReadReceipts.$.status': 'seen',
                'groupReadReceipts.$.seenAt': new Date()
              }
            }
          )
        );

        await Promise.all(updatePromises);

        // Notify senders about group message seen status
        const senderIds = [...new Set(groupMessages.map(msg => msg.senderId.toString()))];
        const User = mongoose.model('User');
        const reader = await User.findById(userId).select('fullName username profilePic');

        senderIds.forEach(senderId => {
          const senderSocketId = userSocketMap[senderId];
          if (senderSocketId) {
            const senderMessages = groupMessages
              .filter(msg => msg.senderId.toString() === senderId)
              .map(msg => msg._id);

            io.to(senderSocketId).emit("groupMessageStatusUpdate", {
              messageIds: senderMessages,
              user: reader,
              status: 'seen',
              timestamp: new Date()
            });
          }
        });

        // Also notify all group members about the read receipt update
        const groupIds = [...new Set(groupMessages.map(msg => msg.groupId.toString()))];
        for (const groupId of groupIds) {
          const group = await Group.findById(groupId);

          if (group) {
            group.members.forEach(member => {
              if (member.user.toString() !== userId.toString()) {
                const memberSocketId = userSocketMap[member.user.toString()];
                if (memberSocketId) {
                  io.to(memberSocketId).emit("groupReadReceiptUpdate", {
                    groupId,
                    messageIds: groupMessages.map(msg => msg._id),
                    reader: reader,
                    status: 'seen',
                    timestamp: new Date()
                  });
                }
              }
            });
          }
        }

        // Update ChatReadState unread counts for group messages
        const { getOrCreateChatReadState, getUnreadCountsForUser } = await import('../controllers/unreadCounter.controller.js');

        // Get unique group IDs
        const groupIds2 = [...new Set(groupMessages.map(msg => msg.groupId.toString()))];

        // Update ChatReadState for each group
        for (const groupId of groupIds2) {
          // Get the latest message from this group
          const latestMessage = await Message.findOne({
            groupId: groupId
          }).sort({ createdAt: -1 });

          if (latestMessage) {
            // Update the read state for this group chat
            const readState = await getOrCreateChatReadState(userId, 'group', groupId);

            // Update read state with the latest seen message
            readState.lastSeenMessageId = latestMessage._id;
            readState.lastSeenTimestamp = latestMessage.createdAt;
            readState.unreadCount = 0; // Reset unread count since messages are now seen
            readState.lastActiveAt = new Date();

            await readState.save();
          }
        }

        // Get updated unread counts and emit to user
        const unreadCounts = await getUnreadCountsForUser(userId);
        const userSocketId = userSocketMap[userId];
        if (userSocketId) {
          io.to(userSocketId).emit("unreadCountUpdate", unreadCounts);
        }
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

  // Handle message deletion for both personal and group messages
  socket.on("messageDeleted", async ({ messageId, deleteType }) => {
    try {
      const message = await Message.findById(messageId);

      if (!message) {
        return;
      }

      // Check if user has permission to delete
      const canDelete = message.senderId.toString() === userId.toString();
      if (!canDelete) {
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

        // Handle group vs direct message notifications
        if (message.messageType === 'group' && message.groupId) {
          // Notify all group members
          const group = await Group.findById(message.groupId);
          if (group) {
            group.members.forEach(member => {
              const memberSocketId = userSocketMap[member.user.toString()];
              if (memberSocketId) {
                io.to(memberSocketId).emit("messageDeleted", {
                  messageId,
                  deleteType,
                  groupId: message.groupId
                });
              }
            });
          }
        } else {
          // Direct message - notify the other user
          const otherUserId = message.senderId.toString() === userId.toString()
            ? message.receiverId.toString()
            : message.senderId.toString();

          const receiverSocketId = userSocketMap[otherUserId];
          if (receiverSocketId) {
            io.to(receiverSocketId).emit("messageDeleted", {
              messageId,
              deleteType
            });
          }
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

      // Handle group vs direct message notifications
      if (message.messageType === 'group' && message.groupId) {
        // Notify all group members
        const group = await Group.findById(message.groupId);
        if (group) {
          group.members.forEach(member => {
            const memberSocketId = userSocketMap[member.user.toString()];
            if (memberSocketId) {
              io.to(memberSocketId).emit("messageEdited", updatedMessage);
            }
          });
        }
      } else {
        // Notify the recipient about the edit (direct message)
        const receiverSocketId = userSocketMap[message.receiverId.toString()];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("messageEdited", updatedMessage);
        }

        // Also notify the sender on all devices
        io.to(socket.id).emit("messageEdited", updatedMessage);
      }
    } catch (error) {
      console.error("Error handling message editing:", error);
    }
  });

  // Handle joining group rooms
  socket.on("joinGroup", async ({ groupId }) => {
    try {
      if (!userId) {
        console.log("❌ No userId provided for joinGroup");
        return;
      }

      const group = await Group.findById(groupId);
      if (!group) {
        console.log(`❌ Group not found: ${groupId}`);
        return;
      }

      if (!group.isMember(userId)) {
        console.log(`❌ User ${userId} is not a member of group ${groupId}`);
        return;
      }

      socket.join(`group_${groupId}`);
      console.log(`✅ User ${userId} joined group room: group_${groupId}`);
    } catch (error) {
      console.error("Error joining group:", error);
    }
  });

  // Handle leaving group rooms
  socket.on("leaveGroup", ({ groupId }) => {
    socket.leave(`group_${groupId}`);
    console.log(`User ${userId} left group room: group_${groupId}`);
  });

  // Handle message replies
  socket.on("messageReply", async ({ messageId, replyText, groupId, receiverId }) => {
    try {
      const originalMessage = await Message.findById(messageId);
      if (!originalMessage) return;

      // Create reply message
      const replyMessage = {
        senderId: userId,
        text: replyText,
        replyTo: messageId,
        messageType: groupId ? 'group' : 'direct',
        groupId: groupId || null,
        receiverId: receiverId || null,
        createdAt: new Date()
      };

      // Save to database
      const savedReply = await Message.create(replyMessage);
      await savedReply.populate('senderId', 'fullName username profilePic');
      await savedReply.populate('replyTo');

      // Emit to appropriate recipients
      if (groupId) {
        // Group message reply
        const group = await Group.findById(groupId);
        if (group) {
          group.members.forEach(member => {
            const memberSocketId = userSocketMap[member.user.toString()];
            if (memberSocketId) {
              io.to(memberSocketId).emit("newGroupMessage", {
                message: savedReply,
                groupId
              });
            }
          });
        }
      } else {
        // Direct message reply
        const receiverSocketId = userSocketMap[receiverId];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("newMessage", savedReply);
        }
        // Also emit to sender for multi-device sync
        io.to(socket.id).emit("newMessage", savedReply);
      }
    } catch (error) {
      console.error("Error handling message reply:", error);
    }
  });

  // Handle mention notifications
  socket.on("mentionNotification", ({ mentionedUserIds, messageId, groupId, senderName }) => {
    mentionedUserIds.forEach(mentionedUserId => {
      const mentionedUserSocketId = userSocketMap[mentionedUserId];
      if (mentionedUserSocketId) {
        io.to(mentionedUserSocketId).emit("userMentioned", {
          messageId,
          groupId,
          senderName,
          timestamp: new Date()
        });
      }
    });
  });

  // Handle real-time message sending with acknowledgment
  socket.on("sendMessage", async (messageData, callback) => {
    try {
      console.log("📤 Received message via Socket.IO:", messageData);

      const { text, image, mediaType, receiverId, tempId } = messageData;

      // Validate required fields
      if (!receiverId) {
        return callback({ success: false, error: "Receiver ID is required" });
      }

      // Import Message model and cloudinary
      const Message = (await import("../models/message.model.js")).default;
      const cloudinary = (await import("./cloudinary.js")).default;

      let imageUrl;
      if (image) {
        try {
          const uploadResponse = await cloudinary.uploader.upload(image);
          imageUrl = uploadResponse.secure_url;
        } catch (uploadError) {
          console.error("Error uploading image:", uploadError);
          return callback({ success: false, error: "Failed to upload image" });
        }
      }

      // Create message in database
      const newMessage = new Message({
        senderId: userId,
        receiverId,
        text: text || "",
        image: imageUrl,
        mediaType
      });

      await newMessage.save();

      // Populate sender info for real-time delivery
      await newMessage.populate("senderId", "username fullName profilePic");

      console.log("✅ Message saved via Socket.IO:", newMessage._id);

      // Send acknowledgment to sender
      callback({
        success: true,
        message: newMessage,
        tempId
      });

      // Emit to receiver if online
      const receiverSocketId = userSocketMap[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", newMessage);

        // Auto-mark as delivered since receiver is online
        setTimeout(async () => {
          try {
            await Message.findByIdAndUpdate(newMessage._id, {
              status: 'delivered',
              deliveredAt: new Date()
            });

            // Notify sender about delivery
            socket.emit("messageStatusUpdate", {
              messageIds: [newMessage._id],
              status: 'delivered',
              timestamp: new Date()
            });
          } catch (error) {
            console.error("Error updating delivery status:", error);
          }
        }, 100);

        // Increment unread count for receiver (real-time update)
        try {
          const { incrementUnreadCount } = await import('../controllers/unreadCounter.controller.js');
          await incrementUnreadCount(receiverId, 'direct', userId, newMessage._id);
        } catch (error) {
          console.error("Error incrementing unread count:", error);
        }
      }

      // Also emit to sender for multi-device sync
      socket.emit("newMessage", newMessage);

    } catch (error) {
      console.error("Error handling Socket.IO message:", error);
      callback({
        success: false,
        error: error.message || "Failed to send message"
      });
    }
  });

  // Handle real-time group message sending with acknowledgment
  socket.on("sendGroupMessage", async (messageData, callback) => {
    try {
      console.log("📤 Received group message via Socket.IO:", messageData);

      const { text, image, mediaType, groupId, tempId, mentions } = messageData;

      // Validate required fields
      if (!groupId) {
        return callback({ success: false, error: "Group ID is required" });
      }

      // Import required models
      const Message = (await import("../models/message.model.js")).default;
      const Group = (await import("../models/group.model.js")).default;
      const cloudinary = (await import("./cloudinary.js")).default;

      // Check if user is member of the group
      const group = await Group.findById(groupId);
      if (!group) {
        return callback({ success: false, error: "Group not found" });
      }

      const isMember = group.members.some(member =>
        member.user.toString() === userId
      );

      if (!isMember) {
        return callback({ success: false, error: "You are not a member of this group" });
      }

      let imageUrl;
      if (image) {
        try {
          const uploadResponse = await cloudinary.uploader.upload(image);
          imageUrl = uploadResponse.secure_url;
        } catch (uploadError) {
          console.error("Error uploading group message image:", uploadError);
          return callback({ success: false, error: "Failed to upload image" });
        }
      }

      // Create group message in database
      const newMessage = new Message({
        senderId: userId,
        groupId,
        messageType: 'group',
        text: text || "",
        image: imageUrl,
        mediaType,
        mentions: mentions || []
      });

      await newMessage.save();

      // Populate sender info for real-time delivery
      await newMessage.populate("senderId", "username fullName profilePic");

      console.log("✅ Group message saved via Socket.IO:", newMessage._id);

      // Send acknowledgment to sender
      callback({
        success: true,
        message: newMessage,
        tempId
      });

      // Send mention notifications to mentioned users
      if (mentions && mentions.length > 0) {
        const { handleMentionNotification } = await import('../controllers/unreadCounter.controller.js');

        mentions.forEach(async (mention) => {
          const mentionedUserSocketId = userSocketMap[mention.user];
          if (mentionedUserSocketId) {
            // Send real-time mention notification
            io.to(mentionedUserSocketId).emit("userMentioned", {
              messageId: newMessage._id,
              groupId: group._id,
              senderName: newMessage.senderId.fullName,
              groupName: group.name,
              timestamp: new Date()
            });

            // Handle mention notification in database and update unread counts
            await handleMentionNotification(
              mention.user,
              newMessage._id,
              group._id,
              newMessage.senderId.fullName,
              group.name
            );
          }
        });
      }

      // Emit to all group members and update unread counts
      const groupMembers = group.members.map(member => member.user.toString());
      groupMembers.forEach(async (memberId) => {
        const memberSocketId = userSocketMap[memberId];
        if (memberSocketId) {
          io.to(memberSocketId).emit("newGroupMessage", {
            message: newMessage,
            groupId
          });

          // Increment unread count for group members (except sender)
          if (memberId !== userId) {
            try {
              const { incrementUnreadCount } = await import('../controllers/unreadCounter.controller.js');
              await incrementUnreadCount(memberId, 'group', groupId, newMessage._id);
            } catch (error) {
              console.error("Error incrementing group unread count:", error);
            }
          }
        }
      });

    } catch (error) {
      console.error("Error handling Socket.IO group message:", error);
      callback({
        success: false,
        error: error.message || "Failed to send group message"
      });
    }
  });

  // Handle unread count updates
  socket.on("updateUnreadCounts", async () => {
    try {
      const unreadCounts = await getUnreadCountsForUser(userId);
      socket.emit("unreadCountUpdate", unreadCounts);
    } catch (error) {
      console.error("Error updating unread counts:", error);
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