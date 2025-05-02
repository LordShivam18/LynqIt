import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    
    // Find all unique users who have had a conversation with the logged-in user
    // and where not all messages are deleted by the current user
    const messages = await Message.find({
      $or: [
        { senderId: loggedInUserId },
        { receiverId: loggedInUserId }
      ],
      // Exclude messages that have been deleted by this user for themselves
      $nor: [
        {
          isDeleted: true,
          deletedFor: 'me',
          deletedBy: loggedInUserId
        }
      ]
    });
    
    // Extract unique user IDs from messages
    const userIds = new Set();
    messages.forEach(message => {
      if (message.senderId.toString() !== loggedInUserId.toString()) {
        userIds.add(message.senderId);
      }
      if (message.receiverId.toString() !== loggedInUserId.toString()) {
        userIds.add(message.receiverId);
      }
    });
    
    // Get user details for all users we've communicated with
    const filteredUsers = await User.find({ 
      _id: { $in: Array.from(userIds) } 
    }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUnreadCounts = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Find all messages sent to this user that have not been seen
    const messages = await Message.find({
      receiverId: userId,
      status: { $ne: 'seen' },
    });
    
    // Count unread messages by sender
    const unreadCounts = {};
    messages.forEach(message => {
      const senderId = message.senderId.toString();
      unreadCounts[senderId] = (unreadCounts[senderId] || 0) + 1;
    });
    
    res.status(200).json(unreadCounts);
  } catch (error) {
    console.error("Error in getUnreadCounts: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    // Find messages between the two users
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      // Don't fetch messages that this user deleted for themselves
      $nor: [
        {
          isDeleted: true,
          deletedFor: 'me',
          deletedBy: myId
        }
      ]
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, mediaType } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Check if this is the first message between these users
    const existingMessages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    });
    
    const isFirstMessage = existingMessages.length === 0;

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      mediaType,
    });

    await newMessage.save();

    // Get full user details for sender to send to receiver
    const senderDetails = await User.findById(senderId).select("-password");

    // Emit to the receiver
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      // For first message, send full sender details to add to sidebar
      if (isFirstMessage) {
        io.to(receiverSocketId).emit("newChat", {
          message: newMessage,
          user: senderDetails
        });
      } else {
      io.to(receiverSocketId).emit("newMessage", newMessage);
      }
      
      // Get updated unread counts for receiver
      const unreadCounts = await getUnreadCountsForUser(receiverId);
      io.to(receiverSocketId).emit("unreadCountUpdate", unreadCounts);
    }
    
    // Also emit to the sender to ensure conversation shows in sender's sidebar
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      // For first message, get receiver details to add to sender's sidebar
      if (isFirstMessage) {
        const receiverDetails = await User.findById(receiverId).select("-password");
        io.to(senderSocketId).emit("newChat", {
          message: newMessage,
          user: receiverDetails
        });
      } else {
        io.to(senderSocketId).emit("newMessage", newMessage);
      }
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji) {
      return res.status(400).json({ error: "Emoji is required" });
    }

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user already reacted with this specific emoji
    const existingReactionWithSameEmoji = message.reactions.find(
      reaction => reaction.userId.toString() === userId.toString() && reaction.emoji === emoji
    );

    if (existingReactionWithSameEmoji) {
      // Remove the reaction (toggle off) if it's the same emoji
      message.reactions = message.reactions.filter(
        reaction => !(reaction.userId.toString() === userId.toString() && reaction.emoji === emoji)
      );
    } else {
      // Remove any previous reactions from this user (limit to one reaction per user)
      message.reactions = message.reactions.filter(
        reaction => reaction.userId.toString() !== userId.toString()
      );
      
      // Add the new reaction
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    // Get the receiver and sender IDs to notify them about the reaction
    const otherUserId = message.senderId.toString() === userId.toString() 
      ? message.receiverId 
      : message.senderId;

    // Emit to the other user
    const otherUserSocketId = getReceiverSocketId(otherUserId);
    if (otherUserSocketId) {
      io.to(otherUserSocketId).emit("messageReaction", {
        messageId: message._id,
        reactions: message.reactions
      });
    }

    // Also emit to the current user (to update multiple devices)
    const currentUserSocketId = getReceiverSocketId(userId);
    if (currentUserSocketId) {
      io.to(currentUserSocketId).emit("messageReaction", {
        messageId: message._id,
        reactions: message.reactions
      });
    }

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in reactToMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateMessageStatus = async (req, res) => {
  try {
    const { messageIds } = req.body;
    const { status } = req.params; // 'delivered' or 'seen'
    const userId = req.user._id;
    
    if (!messageIds || !messageIds.length) {
      return res.status(400).json({ error: "Message IDs are required" });
    }
    
    if (!['delivered', 'seen'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    // Find messages that are sent to this user and update their status
    const updateData = { 
      status,
      ...(status === 'delivered' ? { deliveredAt: new Date() } : {}),
      ...(status === 'seen' ? { seenAt: new Date() } : {})
    };
    
    const messages = await Message.find({
      _id: { $in: messageIds },
      receiverId: userId,
      status: status === 'seen' ? { $ne: 'seen' } : { $eq: 'sent' } // Only update if current status is lower
    });
    
    if (messages.length === 0) {
      return res.status(200).json({ message: "No messages to update" });
    }
    
    await Message.updateMany(
      { 
        _id: { $in: messages.map(m => m._id) }
      },
      { $set: updateData }
    );
    
    // Notify senders about the updated status
    const uniqueSenderIds = [...new Set(messages.map(message => message.senderId.toString()))];
    
    // For each sender, notify about their messages that were updated
    uniqueSenderIds.forEach(senderId => {
      const senderSocketId = getReceiverSocketId(senderId);
      
      if (senderSocketId) {
        const updatedMessagesForSender = messages
          .filter(message => message.senderId.toString() === senderId)
          .map(message => message._id);
          
        io.to(senderSocketId).emit("messageStatusUpdate", {
          messageIds: updatedMessagesForSender,
          status,
          timestamp: updateData.deliveredAt || updateData.seenAt
        });
      }
    });
    
    // If status is 'seen', update unread counts for the receiver
    if (status === 'seen') {
      // Get updated unread counts
      const unreadCounts = await getUnreadCountsForUser(userId);
      
      // Emit to receiver to update their unread counts
      const receiverSocketId = getReceiverSocketId(userId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("unreadCountUpdate", unreadCounts);
      }
    }
    
    res.status(200).json({ 
      message: `Messages marked as ${status} successfully` 
    });
  } catch (error) {
    console.log("Error in updateMessageStatus controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Helper function to get unread counts
export const getUnreadCountsForUser = async (userId) => {
  try {
    // Find all messages sent to this user that have not been seen
    const messages = await Message.find({
      receiverId: userId,
      status: { $ne: 'seen' },
      // Don't count messages that are deleted for this user
      $or: [
        { isDeleted: { $ne: true } },
        { 
          isDeleted: true, 
          deletedFor: 'everyone'  // Show "This message was deleted" placeholder
        },
        {
          isDeleted: true,
          deletedFor: 'me',
          deletedBy: { $ne: userId } // Not deleted by this user
        }
      ]
    });
    
    // Count unread messages by sender
    const unreadCounts = {};
    messages.forEach(message => {
      const senderId = message.senderId.toString();
      unreadCounts[senderId] = (unreadCounts[senderId] || 0) + 1;
    });
    
    return unreadCounts;
  } catch (error) {
    console.error("Error in getUnreadCountsForUser:", error);
    return {};
  }
};

export const updateLastSeen = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Update last seen time for the user
    await User.findByIdAndUpdate(userId, { 
      lastSeen: new Date(),
      isOnline: true
    });
    
    // Emit to all connected users
    io.emit("userStatusUpdate", {
      userId: userId.toString(),
      isOnline: true,
      lastSeen: new Date()
    });
    
    res.status(200).json({ message: "Last seen updated" });
  } catch (error) {
    console.log("Error in updateLastSeen controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { deleteType } = req.body; // 'everyone' or 'me'
    const userId = req.user._id;
    
    if (!['everyone', 'me'].includes(deleteType)) {
      return res.status(400).json({ error: "Invalid delete type" });
    }
    
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    
    // Check if user is authorized to delete this message
    if (message.senderId.toString() !== userId.toString() && 
        message.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized to delete this message" });
    }
    
    // For "delete for everyone", check if it's within 24 hours and sender is the one deleting
    if (deleteType === 'everyone') {
      // Only the sender can delete for everyone
      if (message.senderId.toString() !== userId.toString()) {
        return res.status(403).json({ error: "Only the sender can delete for everyone" });
      }
      
      // Check if it's within 24 hours
      const messageDate = new Date(message.createdAt);
      const now = new Date();
      const hoursDiff = (now - messageDate) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        return res.status(400).json({ error: "Cannot delete for everyone after 24 hours" });
      }
      
      // Handle media deletion in Cloudinary if this message has an image/media
      if (message.image) {
        try {
          // Extract public ID from Cloudinary URL
          const publicId = extractCloudinaryPublicId(message.image);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
            console.log(`Deleted media from Cloudinary: ${publicId}`);
          }
        } catch (error) {
          console.error("Error deleting media from Cloudinary:", error);
          // Continue with message deletion even if image deletion fails
        }
      }
      
      // For "delete for everyone", actually delete the message from the database
      await Message.findByIdAndDelete(messageId);
      
      // Notify the other user
      const otherUserId = message.senderId.toString() === userId.toString() 
        ? message.receiverId 
        : message.senderId;
        
      const receiverSocketId = getReceiverSocketId(otherUserId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", {
          messageId: message._id,
          deleteType: 'everyone'
        });
      }
    } else {
      // For "delete for me", we need to determine if both users have deleted the message
      if (message.isDeleted && message.deletedFor === 'me' && 
          message.deletedBy && message.deletedBy.toString() !== userId.toString()) {
        // Both users have now deleted the message, so we can remove it entirely
        // Handle media deletion in Cloudinary if this message has an image/media
        if (message.image) {
          try {
            // Extract public ID from Cloudinary URL
            const publicId = extractCloudinaryPublicId(message.image);
            if (publicId) {
              await cloudinary.uploader.destroy(publicId);
              console.log(`Deleted media from Cloudinary: ${publicId}`);
            }
          } catch (error) {
            console.error("Error deleting media from Cloudinary:", error);
            // Continue with message deletion even if image deletion fails
          }
        }
        
        // Delete the message entirely from the database
        await Message.findByIdAndDelete(messageId);
      } else {
        // Only one user has deleted it, so mark as deleted for this user
        await Message.findByIdAndUpdate(messageId, {
          isDeleted: true,
          deletedFor: 'me',
          deletedBy: userId,
          deletedAt: new Date()
        });
      }
    }
    
    res.status(200).json({ message: "Message deleted successfully" });
    
  } catch (error) {
    console.error("Error in deleteMessage controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

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

export const editMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: "Message text cannot be empty" });
    }
    
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    
    // Only the sender can edit their own message
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Only the sender can edit this message" });
    }
    
    // Check if message is already deleted
    if (message.isDeleted) {
      return res.status(400).json({ error: "Cannot edit a deleted message" });
    }
    
    // Check if it's within 15 minutes
    const messageDate = new Date(message.createdAt);
    const now = new Date();
    const minutesDiff = (now - messageDate) / (1000 * 60);
    
    if (minutesDiff > 15) {
      return res.status(400).json({ error: "Cannot edit messages after 15 minutes" });
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
    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageEdited", updatedMessage);
    }
    
    // Also notify the sender (for multiple devices/windows)
    const senderSocketId = getReceiverSocketId(userId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageEdited", updatedMessage);
    }
    
    res.status(200).json(updatedMessage);
  } catch (error) {
    console.error("Error in editMessage controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};