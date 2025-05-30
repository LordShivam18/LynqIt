import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import MentionNotification from "../models/mention.model.js";
import ChatReadState from "../models/chatReadState.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { incrementUnreadCount, getUnreadCountsForUser } from "./unreadCounter.controller.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // Get current user with pinned chats and blocked users
    const currentUser = await User.findById(loggedInUserId);

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
      // Check if senderId exists and is not the logged-in user
      if (message.senderId && message.senderId.toString() !== loggedInUserId.toString()) {
        userIds.add(message.senderId);
      }
      // Check if receiverId exists and is not the logged-in user
      if (message.receiverId && message.receiverId.toString() !== loggedInUserId.toString()) {
        userIds.add(message.receiverId);
      }
    });

    // Filter out blocked users from the user IDs
    const filteredUserIds = Array.from(userIds).filter(userId =>
      !currentUser.blockedUsers.includes(userId)
    );

    // Get user details for all users we've communicated with (excluding blocked users)
    const users = await User.find({
      _id: { $in: filteredUserIds }
    }).select("-password");

    // Sort users: pinned chats first, then by latest message timestamp
    const sortedUsers = users.sort((a, b) => {
      const aIsPinned = currentUser.pinnedChats.includes(a._id);
      const bIsPinned = currentUser.pinnedChats.includes(b._id);

      // If both are pinned or both are not pinned, sort by latest message
      if (aIsPinned === bIsPinned) {
        // Find latest message for each user
        const aLatestMessage = messages
          .filter(msg =>
            (msg.senderId && msg.senderId.toString() === a._id.toString()) ||
            (msg.receiverId && msg.receiverId.toString() === a._id.toString())
          )
          .sort((m1, m2) => new Date(m2.createdAt) - new Date(m1.createdAt))[0];

        const bLatestMessage = messages
          .filter(msg =>
            (msg.senderId && msg.senderId.toString() === b._id.toString()) ||
            (msg.receiverId && msg.receiverId.toString() === b._id.toString())
          )
          .sort((m1, m2) => new Date(m2.createdAt) - new Date(m1.createdAt))[0];

        const aTime = aLatestMessage ? new Date(aLatestMessage.createdAt) : new Date(0);
        const bTime = bLatestMessage ? new Date(bLatestMessage.createdAt) : new Date(0);

        return bTime - aTime; // Latest first
      }

      // Pinned chats come first
      return bIsPinned - aIsPinned;
    });

    // Add pinned status to each user object
    const usersWithPinnedStatus = sortedUsers.map(user => ({
      ...user.toObject(),
      isPinned: currentUser.pinnedChats.includes(user._id)
    }));

    res.status(200).json(usersWithPinnedStatus);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Note: getUnreadCounts is now handled by unreadCounter.controller.js

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
    }).populate({
      path: 'replyTo',
      populate: {
        path: 'senderId',
        select: 'fullName username profilePic'
      }
    }).populate('statusReply.statusId');

    // Add status reply information to messages
    const messagesWithStatusInfo = messages.map(message => {
      const messageObj = message.toObject();

      if (messageObj.statusReply && messageObj.statusReply.statusId) {
        messageObj.isStatusReply = true;
        messageObj.statusInfo = {
          type: messageObj.statusReply.statusType,
          content: messageObj.statusReply.statusContent,
          caption: messageObj.statusReply.statusCaption,
          backgroundColor: messageObj.statusReply.backgroundColor,
          fontFamily: messageObj.statusReply.fontFamily
        };
      }

      return messageObj;
    });

    res.status(200).json(messagesWithStatusInfo);
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

    // Check if either user has blocked the other
    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({ error: "Receiver not found" });
    }

    // Check if sender has blocked receiver or receiver has blocked sender
    if (sender.blockedUsers.includes(receiverId) || receiver.blockedUsers.includes(senderId)) {
      return res.status(403).json({ error: "Cannot send message to this user" });
    }

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
      console.log(`📤 Sending message to receiver: ${receiver.fullName} (${receiverId})`);
      // For first message, send full sender details to add to sidebar
      if (isFirstMessage) {
        console.log(`🆕 First message - sending newChat event`);
        io.to(receiverSocketId).emit("newChat", {
          message: newMessage,
          user: senderDetails
        });
      } else {
        console.log(`📨 Regular message - sending newMessage event`);
        io.to(receiverSocketId).emit("newMessage", newMessage);
      }

      // Increment unread count for receiver using new system
      await incrementUnreadCount(receiverId, 'direct', senderId, newMessage._id);
    } else {
      console.log(`❌ No socket found for receiver: ${receiver.fullName} (${receiverId})`);
    }

    // Also emit to the sender to ensure conversation shows in sender's sidebar
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      console.log(`📤 Sending message to sender for multi-device sync: ${sender.fullName} (${senderId})`);
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
    } else {
      console.log(`❌ No socket found for sender: ${sender.fullName} (${senderId})`);
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
    const otherUserId = message.senderId && message.senderId.toString() === userId.toString()
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
    const uniqueSenderIds = [...new Set(messages
      .filter(message => message.senderId) // Filter out messages without senderId
      .map(message => message.senderId.toString())
    )];

    // For each sender, notify about their messages that were updated
    uniqueSenderIds.forEach(senderId => {
      const senderSocketId = getReceiverSocketId(senderId);

      if (senderSocketId) {
        const updatedMessagesForSender = messages
          .filter(message => message.senderId && message.senderId.toString() === senderId)
          .map(message => message._id);

        io.to(senderSocketId).emit("messageStatusUpdate", {
          messageIds: updatedMessagesForSender,
          status,
          timestamp: updateData.deliveredAt || updateData.seenAt
        });
      }
    });

    // If status is 'seen', update ChatReadState unread counts for the receiver
    if (status === 'seen') {
      // Import the unread counter functions
      const { getOrCreateChatReadState, getUnreadCountsForUser } = await import('./unreadCounter.controller.js');

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

      // Get updated unread counts after updating read states
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

// Helper function to parse mentions from message text
const parseMentions = async (text, groupId) => {
  if (!text || !groupId) return [];

  // Get group members for validation
  const group = await Group.findById(groupId).populate('members.user', 'username fullName');
  if (!group) return [];

  const mentions = [];
  const mentionRegex = /@(\w+)/g;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1];
    const offset = match.index;
    const length = match[0].length;

    // Find the user in group members
    const member = group.members.find(m =>
      m.user.username === username ||
      m.user.fullName.toLowerCase().replace(/\s+/g, '') === username.toLowerCase()
    );

    if (member) {
      mentions.push({
        user: member.user._id,
        username: member.user.username,
        offset,
        length
      });
    }
  }

  return mentions;
};

// Helper function to create mention notifications
const createMentionNotifications = async (messageId, mentions, senderId, groupId) => {
  const notifications = [];

  for (const mention of mentions) {
    // Don't create notification if user mentions themselves
    if (mention.user.toString() === senderId.toString()) continue;

    const notification = new MentionNotification({
      messageId,
      mentionedUserId: mention.user,
      mentionedByUserId: senderId,
      groupId,
      mentionOffset: mention.offset,
      mentionLength: mention.length
    });

    await notification.save();
    notifications.push(notification);
  }

  return notifications;
};

// Note: getUnreadCountsForUser is now imported from unreadCounter.controller.js

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

// Reply to a message
export const replyToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text, image, mediaType, groupId, receiverId } = req.body;
    const senderId = req.user._id;

    console.log("💬 Reply to message request:", {
      messageId,
      senderId,
      receiverId,
      groupId,
      text: text?.substring(0, 50) + "...",
      hasImage: !!image
    });

    // Find the original message
    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      console.log("❌ Original message not found:", messageId);
      return res.status(404).json({ error: "Original message not found" });
    }

    console.log("✅ Found original message:", originalMessage._id);

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Create reply message
    const replyMessage = new Message({
      senderId,
      receiverId: groupId ? null : receiverId,
      groupId: groupId || null,
      text,
      image: imageUrl,
      mediaType,
      messageType: groupId ? 'group' : 'direct',
      replyTo: messageId,
      isReply: true
    });

    await replyMessage.save();
    console.log("✅ Reply message saved:", replyMessage._id);

    // Populate the reply message with sender and original message details
    await replyMessage.populate('senderId', 'fullName username profilePic');
    await replyMessage.populate({
      path: 'replyTo',
      populate: {
        path: 'senderId',
        select: 'fullName username profilePic'
      }
    });

    console.log("✅ Reply message populated with details");

    // Emit to appropriate recipients
    if (groupId) {
      // Group message reply
      console.log(`📤 Sending group reply message to group: ${groupId}`);
      const group = await Group.findById(groupId);
      if (group) {
        group.members.forEach(member => {
          const memberSocketId = getReceiverSocketId(member.user.toString());
          if (memberSocketId) {
            console.log(`📤 Sending group reply to member: ${member.user.toString()}`);
            io.to(memberSocketId).emit("newGroupMessage", {
              message: replyMessage,
              groupId
            });
          } else {
            console.log(`❌ No socket found for group member: ${member.user.toString()}`);
          }
        });
      }
    } else {
      // Direct message reply
      console.log(`📤 Sending direct reply message from ${senderId} to ${receiverId}`);
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        console.log(`📤 Sending reply to receiver: ${receiverId}`);
        io.to(receiverSocketId).emit("newMessage", replyMessage);
      } else {
        console.log(`❌ No socket found for receiver: ${receiverId}`);
      }

      // Also emit to sender for multi-device sync
      const senderSocketId = getReceiverSocketId(senderId);
      if (senderSocketId) {
        console.log(`📤 Sending reply to sender for multi-device sync: ${senderId}`);
        io.to(senderSocketId).emit("newMessage", replyMessage);
      } else {
        console.log(`❌ No socket found for sender: ${senderId}`);
      }
    }

    res.status(201).json(replyMessage);
  } catch (error) {
    console.log("Error in replyToMessage controller: ", error.message);
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
    if ((!message.senderId || message.senderId.toString() !== userId.toString()) &&
        (!message.receiverId || message.receiverId.toString() !== userId.toString())) {
      return res.status(403).json({ error: "Not authorized to delete this message" });
    }

    // For "delete for everyone", check if it's within 24 hours and sender is the one deleting
    if (deleteType === 'everyone') {
      // Only the sender can delete for everyone
      if (!message.senderId || message.senderId.toString() !== userId.toString()) {
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
      const otherUserId = message.senderId && message.senderId.toString() === userId.toString()
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

// Get group messages
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Check if user is a member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!group.isMember(userId)) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    // Get group messages
    const messages = await Message.find({
      groupId: groupId,
      messageType: 'group',
      // Don't fetch messages that this user deleted for themselves
      $nor: [
        {
          isDeleted: true,
          deletedFor: 'me',
          deletedBy: userId
        }
      ]
    }).populate('senderId', 'fullName username profilePic')
      .populate('mentions.user', 'fullName username')
      .populate({
        path: 'replyTo',
        populate: {
          path: 'senderId',
          select: 'fullName username profilePic'
        }
      })
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getGroupMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Send group message
// Mark mentions as read for a user in a specific group
export const markMentionsAsRead = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Mark all unread mentions for this user in this group as read
    await MentionNotification.updateMany(
      {
        mentionedUserId: userId,
        groupId: groupId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    // Get updated unread counts
    const unreadCounts = await getUnreadCountsForUser(userId);

    // Emit updated counts to user
    const userSocketId = getReceiverSocketId(userId);
    if (userSocketId) {
      io.to(userSocketId).emit("unreadCountUpdate", unreadCounts);
    }

    res.status(200).json({ message: "Mentions marked as read" });
  } catch (error) {
    console.error("Error marking mentions as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get first unread mention in a group
export const getFirstUnreadMention = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const firstMention = await MentionNotification.findOne({
      mentionedUserId: userId,
      groupId: groupId,
      isRead: false
    })
    .populate('messageId')
    .sort({ createdAt: 1 });

    if (!firstMention) {
      return res.status(404).json({ message: "No unread mentions found" });
    }

    res.status(200).json(firstMention);
  } catch (error) {
    console.error("Error getting first unread mention:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update group message status for individual members
export const updateGroupMessageStatus = async (req, res) => {
  try {
    const { messageIds, status } = req.body;
    const userId = req.user._id;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: "Message IDs are required" });
    }

    if (!['delivered', 'seen'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Find group messages where user is a recipient
    const messages = await Message.find({
      _id: { $in: messageIds },
      messageType: 'group',
      senderId: { $ne: userId }, // Not sent by this user
      'groupReadReceipts.userId': userId // User is in the recipients list
    });

    if (messages.length === 0) {
      return res.status(404).json({ error: "No valid messages found" });
    }

    const updateData = {};
    if (status === 'delivered') {
      updateData['groupReadReceipts.$.status'] = 'delivered';
      updateData['groupReadReceipts.$.deliveredAt'] = new Date();
    } else if (status === 'seen') {
      updateData['groupReadReceipts.$.status'] = 'seen';
      updateData['groupReadReceipts.$.seenAt'] = new Date();
    }

    // Update each message's read receipt for this user
    const updatePromises = messages.map(message =>
      Message.updateOne(
        {
          _id: message._id,
          'groupReadReceipts.userId': userId
        },
        { $set: updateData }
      )
    );

    await Promise.all(updatePromises);

    // Notify senders about status updates with user details
    const senderIds = [...new Set(messages.map(msg => msg.senderId.toString()))];

    // Get user details for the person who read the message
    const User = await import('../models/user.model.js');
    const reader = await User.default.findById(userId).select('fullName username profilePic');

    senderIds.forEach(senderId => {
      const senderSocketId = getReceiverSocketId(senderId);
      if (senderSocketId) {
        const senderMessages = messages
          .filter(msg => msg.senderId.toString() === senderId)
          .map(msg => msg._id);

        io.to(senderSocketId).emit("groupMessageStatusUpdate", {
          messageIds: senderMessages,
          user: reader, // Include user details
          status,
          timestamp: new Date()
        });
      }
    });

    // Also notify all group members about the read receipt update
    const groupIds = [...new Set(messages.map(msg => msg.groupId.toString()))];
    for (const groupId of groupIds) {
      const Group = await import('../models/group.model.js');
      const group = await Group.default.findById(groupId);

      if (group) {
        group.members.forEach(member => {
          if (member.user.toString() !== userId.toString()) {
            const memberSocketId = getReceiverSocketId(member.user);
            if (memberSocketId) {
              io.to(memberSocketId).emit("groupReadReceiptUpdate", {
                groupId,
                messageIds: messages.map(msg => msg._id),
                reader: reader,
                status,
                timestamp: new Date()
              });
            }
          }
        });
      }
    }

    // If status is 'seen', update unread counts
    if (status === 'seen') {
      const { getOrCreateChatReadState, getUnreadCountsForUser } = await import('./unreadCounter.controller.js');

      // Get unique group IDs
      const groupIds = [...new Set(messages.map(msg => msg.groupId.toString()))];

      // Update ChatReadState for each group
      for (const groupId of groupIds) {
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
      const userSocketId = getReceiverSocketId(userId);
      if (userSocketId) {
        io.to(userSocketId).emit("unreadCountUpdate", unreadCounts);
      }
    }

    res.json({
      message: `Group message status updated to ${status}`,
      updatedCount: messages.length
    });

  } catch (error) {
    console.error("Error updating group message status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get group message read receipts info
export const getGroupMessageInfo = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    // Find the group message with read receipts
    const message = await Message.findById(messageId)
      .populate('senderId', 'fullName username profilePic')
      .populate('groupReadReceipts.userId', 'fullName username profilePic')
      .populate('groupId', 'name members');

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.messageType !== 'group') {
      return res.status(400).json({ error: "This endpoint is only for group messages" });
    }

    // Check if user is a member of the group
    const group = message.groupId;
    const isMember = group.members.some(member =>
      member.user.toString() === userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    // Organize read receipts by status
    const deliveredTo = [];
    const readBy = [];
    const notDelivered = [];

    // Get all group members except sender
    const allMembers = group.members.filter(member =>
      member.user.toString() !== message.senderId._id.toString()
    );

    // Check each member's status
    allMembers.forEach(member => {
      const receipt = message.groupReadReceipts.find(receipt =>
        receipt.userId._id.toString() === member.user.toString()
      );

      if (receipt) {
        if (receipt.status === 'seen') {
          readBy.push({
            user: receipt.userId,
            seenAt: receipt.seenAt
          });
        } else if (receipt.status === 'delivered') {
          deliveredTo.push({
            user: receipt.userId,
            deliveredAt: receipt.deliveredAt
          });
        } else {
          notDelivered.push({
            user: receipt.userId,
            status: receipt.status
          });
        }
      } else {
        // If no receipt found, user hasn't received the message
        notDelivered.push({
          user: member.user,
          status: 'sent'
        });
      }
    });

    res.json({
      message: {
        _id: message._id,
        text: message.text,
        image: message.image,
        sender: message.senderId,
        createdAt: message.createdAt,
        groupName: group.name
      },
      readReceipts: {
        deliveredTo: deliveredTo.sort((a, b) => new Date(b.deliveredAt) - new Date(a.deliveredAt)),
        readBy: readBy.sort((a, b) => new Date(b.seenAt) - new Date(a.seenAt)),
        notDelivered: notDelivered,
        totalMembers: allMembers.length,
        deliveredCount: deliveredTo.length,
        readCount: readBy.length
      }
    });

  } catch (error) {
    console.error("Error getting group message info:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image, mediaType } = req.body;
    const { groupId } = req.params;
    const senderId = req.user._id;

    // Check if group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!group.isMember(senderId)) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Parse mentions from text using the new structured approach
    const mentions = await parseMentions(text, groupId);

    // Initialize group read receipts for all members except sender
    const groupReadReceipts = group.members
      .filter(member => member.user.toString() !== senderId.toString())
      .map(member => ({
        userId: member.user,
        status: 'sent',
        deliveredAt: null,
        seenAt: null
      }));

    const newMessage = new Message({
      senderId,
      groupId,
      messageType: 'group',
      text,
      image: imageUrl,
      mediaType,
      mentions,
      groupReadReceipts
    });

    await newMessage.save();

    // Populate sender details
    await newMessage.populate('senderId', 'fullName username profilePic');
    await newMessage.populate('mentions.user', 'fullName username');

    // Create mention notifications for mentioned users
    if (mentions.length > 0) {
      await createMentionNotifications(newMessage._id, mentions, senderId, groupId);
    }

    // Update group's last activity
    group.lastActivity = new Date();
    await group.save();

    // Emit to all group members
    console.log(`📤 Emitting group message to ${group.members.length} members for group: ${group.name}`);
    group.members.forEach(member => {
      const memberSocketId = getReceiverSocketId(member.user);
      if (memberSocketId) {
        console.log(`📤 Sending group message to member: ${member.user.toString()}, socket: ${memberSocketId}`);
        io.to(memberSocketId).emit("newGroupMessage", {
          message: newMessage,
          groupId: group._id
        });
      } else {
        console.log(`❌ No socket found for group member: ${member.user.toString()}`);
      }
    });

    // Send mention notifications to mentioned users
    if (mentions.length > 0) {
      mentions.forEach(mention => {
        const mentionedUserSocketId = getReceiverSocketId(mention.user);
        if (mentionedUserSocketId) {
          io.to(mentionedUserSocketId).emit("userMentioned", {
            messageId: newMessage._id,
            groupId: group._id,
            senderName: newMessage.senderId.fullName,
            groupName: group.name,
            timestamp: new Date()
          });
        }
      });
    }

    // Update unread counts for all group members (except sender)
    const unreadCountPromises = group.members
      .filter(member => member.user.toString() !== senderId.toString())
      .map(member => incrementUnreadCount(member.user, 'group', groupId, newMessage._id));

    // Wait for all unread count updates to complete
    await Promise.all(unreadCountPromises);

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendGroupMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Forward message to another user or group
export const forwardMessage = async (req, res) => {
  try {
    const { messageId, targetId, targetType } = req.body;
    const userId = req.user._id;

    if (!messageId || !targetId || !targetType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify the target exists
    if (targetType === 'user') {
      const targetUser = await User.findById(targetId);
      if (!targetUser) {
        return res.status(404).json({ error: "Target user not found" });
      }
    } else if (targetType === 'group') {
      const targetGroup = await Group.findById(targetId);
      if (!targetGroup) {
        return res.status(404).json({ error: "Target group not found" });
      }

      // Check if user is a member of the group
      const isMember = targetGroup.members.some(m => m.user.toString() === userId.toString());
      if (!isMember) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
    } else {
      return res.status(400).json({ error: "Invalid target type" });
    }

    // Get the original message
    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      return res.status(404).json({ error: "Original message not found" });
    }

    // Create a new message based on the original
    const newMessage = new Message({
      senderId: userId,
      ...(targetType === 'user' ? { receiverId: targetId, messageType: 'direct' } : 
                                { groupId: targetId, messageType: 'group' }),
      text: originalMessage.text,
      image: originalMessage.image,
      mediaType: originalMessage.mediaType,
      status: 'sent',
      isForwarded: true,
      originalMessageId: messageId
    });

    // Save the new message
    await newMessage.save();

    // If it's a group message, add read receipts for all members
    if (targetType === 'group') {
      const group = await Group.findById(targetId);
      const readReceipts = group.members
        .filter(member => member.user.toString() !== userId.toString())
        .map(member => ({
          userId: member.user,
          status: 'sent'
        }));

      // Add the read receipts
      newMessage.groupReadReceipts = readReceipts;
      await newMessage.save();
    }

    // Emit socket event for real-time update
    if (targetType === 'user') {
      const recipientSocketId = getReceiverSocketId(targetId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("newMessage", { message: newMessage });
      }
    } else {
      // Emit to group room
      io.to(`group_${targetId}`).emit("newGroupMessage", { message: newMessage });
    }

    res.status(200).json(newMessage);
  } catch (error) {
    console.error("Error forwarding message:", error);
    res.status(500).json({ error: "Failed to forward message" });
  }
};