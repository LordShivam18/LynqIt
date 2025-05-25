import Status from "../models/status.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

// Create text status
export const createTextStatus = async (req, res) => {
  try {
    const { text, backgroundColor, fontStyle, visibility, specificUsers } = req.body;

    // Validate text length
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Status text is required" });
    }

    if (text.length > 700) {
      return res.status(400).json({ error: "Status text cannot exceed 700 characters" });
    }

    // Create status
    const status = new Status({
      userId: req.user._id,
      type: "text",
      text: text.trim(),
      backgroundColor: backgroundColor || "#075E54",
      fontStyle: fontStyle || "normal",
      visibility: visibility || "contacts",
      specificUsers: specificUsers || []
    });

    await status.save();

    // Populate user details
    await status.populate('userId', 'fullName username profilePic');

    // Emit real-time status update to ALL contacts who have chatted with this user
    const contacts = await Status.getUserContacts(req.user._id);
    console.log(`📡 Emitting status to ${contacts.length} contacts`);

    contacts.forEach(contact => {
      const contactSocketId = getReceiverSocketId(contact._id);
      if (contactSocketId) {
        console.log(`📤 Sending status to contact: ${contact.fullName} (${contact._id})`);
        io.to(contactSocketId).emit("newStatus", {
          user: status.userId,
          status: status,
          type: "new"
        });
      } else {
        console.log(`❌ No socket found for contact: ${contact.fullName} (${contact._id})`);
      }
    });

    // Also emit to the status creator for multi-device sync
    const creatorSocketId = getReceiverSocketId(req.user._id);
    if (creatorSocketId) {
      console.log(`📤 Sending status to creator for multi-device sync`);
      io.to(creatorSocketId).emit("newStatus", {
        user: status.userId,
        status: status,
        type: "new"
      });
    }

    res.status(201).json({
      message: "Text status created successfully",
      status
    });
  } catch (error) {
    console.error("Error creating text status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create image status
export const createImageStatus = async (req, res) => {
  try {
    const { caption, visibility, specificUsers } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Image is required for image status" });
    }

    // Validate caption length if provided
    if (caption && caption.length > 700) {
      return res.status(400).json({ error: "Caption cannot exceed 700 characters" });
    }

    // Upload image to Cloudinary using buffer (since we're using memory storage)
    const uploadResponse = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      {
        folder: "lynqit_status",
        resource_type: "auto",
        transformation: [
          { width: 1080, height: 1920, crop: "limit" }, // Limit to story dimensions
          { quality: "auto:good" }
        ]
      }
    );

    // Create status
    const status = new Status({
      userId: req.user._id,
      type: "image",
      image: uploadResponse.secure_url,
      caption: caption?.trim() || "",
      visibility: visibility || "contacts",
      specificUsers: specificUsers || []
    });

    await status.save();

    // Populate user details
    await status.populate('userId', 'fullName username profilePic');

    // Emit real-time status update to ALL contacts who have chatted with this user
    const contacts = await Status.getUserContacts(req.user._id);
    console.log(`📡 Emitting image status to ${contacts.length} contacts`);

    contacts.forEach(contact => {
      const contactSocketId = getReceiverSocketId(contact._id);
      if (contactSocketId) {
        console.log(`📤 Sending image status to contact: ${contact.fullName} (${contact._id})`);
        io.to(contactSocketId).emit("newStatus", {
          user: status.userId,
          status: status,
          type: "new"
        });
      } else {
        console.log(`❌ No socket found for contact: ${contact.fullName} (${contact._id})`);
      }
    });

    // Also emit to the status creator for multi-device sync
    const creatorSocketId = getReceiverSocketId(req.user._id);
    if (creatorSocketId) {
      console.log(`📤 Sending image status to creator for multi-device sync`);
      io.to(creatorSocketId).emit("newStatus", {
        user: status.userId,
        status: status,
        type: "new"
      });
    }

    res.status(201).json({
      message: "Image status created successfully",
      status
    });
  } catch (error) {
    console.error("Error creating image status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get my statuses
export const getMyStatuses = async (req, res) => {
  try {
    const statuses = await Status.find({
      userId: req.user._id,
      expiresAt: { $gt: new Date() }, // Only non-expired statuses
      isActive: true
    })
    .populate('userId', 'fullName username profilePic')
    .populate('viewers.userId', 'fullName username profilePic')
    .sort({ timestamp: -1 });

    res.json(statuses);
  } catch (error) {
    console.error("Error fetching my statuses:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get contact statuses (from users I have conversations with)
export const getContactStatuses = async (req, res) => {
  try {
    // Get user's contacts (users with existing conversations)
    const contacts = await Status.getUserContacts(req.user._id);
    const contactIds = contacts.map(contact => contact._id);

    if (contactIds.length === 0) {
      return res.json([]);
    }

    // Get all active statuses from contacts
    const statuses = await Status.find({
      userId: { $in: contactIds },
      expiresAt: { $gt: new Date() },
      isActive: true
    })
    .populate('userId', 'fullName username profilePic')
    .sort({ timestamp: 1 }); // Sort oldest first (like WhatsApp stories)

    // Filter statuses based on privacy settings and group by user
    const filteredStatuses = statuses.filter(status => {
      return status.canUserView(req.user._id, contacts);
    });

    // Group statuses by user
    const groupedStatuses = {};
    filteredStatuses.forEach(status => {
      const userId = status.userId._id.toString();
      if (!groupedStatuses[userId]) {
        groupedStatuses[userId] = {
          user: status.userId,
          statuses: [],
          hasUnviewed: false
        };
      }

      // Check if user has viewed this status
      const hasViewed = status.viewers.some(viewer =>
        viewer.userId.toString() === req.user._id.toString()
      );

      if (!hasViewed) {
        groupedStatuses[userId].hasUnviewed = true;
      }

      // Remove timestamps and other sensitive data from status response
      const statusData = {
        _id: status._id,
        type: status.type,
        text: status.text,
        image: status.image,
        caption: status.caption,
        backgroundColor: status.backgroundColor,
        fontFamily: status.fontFamily,
        visibility: status.visibility,
        specificUsers: status.specificUsers,
        viewCount: status.viewCount,
        viewers: status.viewers,
        reactions: status.reactions,
        messages: status.messages,
        isActive: status.isActive,
        isExpired: status.isExpired,
        userId: status.userId,
        hasViewed
      };

      groupedStatuses[userId].statuses.push(statusData);
    });

    // Convert to array and sort by unviewed status first, then by user name
    const result = Object.values(groupedStatuses).sort((a, b) => {
      // Prioritize users with unviewed statuses
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;

      // If both have same viewed status, sort by user name
      return a.user.fullName.localeCompare(b.user.fullName);
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching contact statuses:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// View a status (mark as viewed)
export const viewStatus = async (req, res) => {
  try {
    const { statusId } = req.params;

    const status = await Status.findById(statusId)
      .populate('userId', 'fullName username profilePic');

    if (!status) {
      return res.status(404).json({ error: "Status not found" });
    }

    // Check if user can view this status
    const contacts = await Status.getUserContacts(req.user._id);
    if (!status.canUserView(req.user._id, contacts)) {
      // Instead of returning an error, return 404 to hide the existence of the status
      return res.status(404).json({ error: "Status not found" });
    }

    // Mark as viewed
    await status.markAsViewed(req.user._id);

    res.json({
      message: "Status viewed successfully",
      status
    });
  } catch (error) {
    console.error("Error viewing status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get viewers of a status
export const getStatusViewers = async (req, res) => {
  try {
    const { statusId } = req.params;

    const status = await Status.findById(statusId)
      .populate('viewers.userId', 'fullName username profilePic');

    if (!status) {
      return res.status(404).json({ error: "Status not found" });
    }

    // Only status owner can see viewers
    if (status.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can only view your own status viewers" });
    }

    res.json({
      viewers: status.viewers,
      viewCount: status.viewCount
    });
  } catch (error) {
    console.error("Error fetching status viewers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete status
export const deleteStatus = async (req, res) => {
  try {
    const { statusId } = req.params;

    const status = await Status.findById(statusId);

    if (!status) {
      return res.status(404).json({ error: "Status not found" });
    }

    // Only status owner can delete
    if (status.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can only delete your own status" });
    }

    // If it's an image status, delete from Cloudinary
    if (status.type === "image" && status.image) {
      try {
        // Extract public_id from Cloudinary URL
        const publicId = status.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`lynqit_status/${publicId}`);
      } catch (cloudinaryError) {
        console.error("Error deleting image from Cloudinary:", cloudinaryError);
        // Continue with status deletion even if Cloudinary deletion fails
      }
    }

    await Status.findByIdAndDelete(statusId);

    res.json({ message: "Status deleted successfully" });
  } catch (error) {
    console.error("Error deleting status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add reaction to status
export const addReaction = async (req, res) => {
  try {
    const { statusId } = req.params;
    const { emoji } = req.body;

    if (!emoji || emoji.trim().length === 0) {
      return res.status(400).json({ error: "Emoji is required" });
    }

    const status = await Status.findById(statusId)
      .populate('userId', 'fullName username profilePic');

    if (!status) {
      return res.status(404).json({ error: "Status not found" });
    }

    // Check if user can view this status
    const contacts = await Status.getUserContacts(req.user._id);
    if (!status.canUserView(req.user._id, contacts)) {
      return res.status(404).json({ error: "Status not found" });
    }

    // Add reaction
    await status.addReaction(req.user._id, emoji.trim());

    // Populate the reaction user details
    await status.populate('reactions.userId', 'fullName username profilePic');

    // Emit real-time reaction update
    io.to(`user_${status.userId._id}`).emit("statusReaction", {
      statusId: status._id,
      reaction: {
        userId: req.user,
        emoji: emoji.trim(),
        reactedAt: new Date()
      },
      type: "add"
    });

    res.json({
      message: "Reaction added successfully",
      reactions: status.reactions
    });
  } catch (error) {
    console.error("Error adding reaction:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Remove reaction from status
export const removeReaction = async (req, res) => {
  try {
    const { statusId } = req.params;

    const status = await Status.findById(statusId)
      .populate('userId', 'fullName username profilePic');

    if (!status) {
      return res.status(404).json({ error: "Status not found" });
    }

    // Check if user can view this status
    const contacts = await Status.getUserContacts(req.user._id);
    if (!status.canUserView(req.user._id, contacts)) {
      return res.status(404).json({ error: "Status not found" });
    }

    // Remove reaction
    await status.removeReaction(req.user._id);

    // Emit real-time reaction update
    io.to(`user_${status.userId._id}`).emit("statusReaction", {
      statusId: status._id,
      userId: req.user._id,
      type: "remove"
    });

    res.json({
      message: "Reaction removed successfully",
      reactions: status.reactions
    });
  } catch (error) {
    console.error("Error removing reaction:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get status reactions
export const getStatusReactions = async (req, res) => {
  try {
    const { statusId } = req.params;

    const status = await Status.findById(statusId)
      .populate('reactions.userId', 'fullName username profilePic');

    if (!status) {
      return res.status(404).json({ error: "Status not found" });
    }

    // Only status owner can see reactions
    if (status.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can only view reactions on your own status" });
    }

    res.json({
      reactions: status.reactions,
      reactionCount: status.reactions.length
    });
  } catch (error) {
    console.error("Error fetching status reactions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Reply to status (creates a direct message with status reference)
export const replyToStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const { message } = req.body;
    const senderId = req.user._id;

    // Find the status
    const status = await Status.findById(statusId).populate('userId', 'fullName username profilePic');
    if (!status) {
      return res.status(404).json({ error: "Status not found" });
    }

    // Can't reply to your own status
    if (status.userId._id.toString() === senderId.toString()) {
      return res.status(400).json({ error: "Cannot reply to your own status" });
    }

    // Check if status is expired
    if (status.isExpired) {
      return res.status(400).json({ error: "Cannot reply to expired status" });
    }

    // Create a direct message as reply with status reference
    const Message = mongoose.model('Message');
    const newMessage = new Message({
      senderId,
      receiverId: status.userId._id,
      text: message,
      messageType: 'direct',
      statusReply: {
        statusId: status._id,
        statusType: status.type,
        statusContent: status.type === 'text' ? status.text : status.image,
        statusCaption: status.caption || null,
        backgroundColor: status.backgroundColor || null,
        fontFamily: status.fontFamily || null
      },
      createdAt: new Date()
    });

    await newMessage.save();
    await newMessage.populate('senderId', 'fullName username profilePic');

    // Emit real-time message to the status owner with status reply indicator
    const receiverSocketId = getReceiverSocketId(status.userId._id);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", {
        ...newMessage.toObject(),
        isStatusReply: true,
        statusInfo: {
          type: status.type,
          content: status.type === 'text' ? status.text : status.image,
          caption: status.caption,
          backgroundColor: status.backgroundColor,
          fontFamily: status.fontFamily
        }
      });
    }

    // Also emit to sender for multi-device sync
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("newMessage", {
        ...newMessage.toObject(),
        isStatusReply: true,
        statusInfo: {
          type: status.type,
          content: status.type === 'text' ? status.text : status.image,
          caption: status.caption,
          backgroundColor: status.backgroundColor,
          fontFamily: status.fontFamily
        }
      });
    }

    res.status(201).json({
      message: "Reply sent successfully",
      messageId: newMessage._id
    });

  } catch (error) {
    console.error("Error replying to status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add message to status
export const addStatusMessage = async (req, res) => {
  try {
    const { statusId } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (message.length > 500) {
      return res.status(400).json({ error: "Message cannot exceed 500 characters" });
    }

    const status = await Status.findById(statusId)
      .populate('userId', 'fullName username profilePic');

    if (!status) {
      return res.status(404).json({ error: "Status not found" });
    }

    // Check if user can view this status
    const contacts = await Status.getUserContacts(req.user._id);
    if (!status.canUserView(req.user._id, contacts)) {
      return res.status(404).json({ error: "Status not found" });
    }

    // Add message
    await status.addMessage(req.user._id, message.trim());

    // Populate the message user details
    await status.populate('messages.userId', 'fullName username profilePic');

    // Emit real-time message update
    io.to(`user_${status.userId._id}`).emit("statusMessage", {
      statusId: status._id,
      message: {
        userId: req.user,
        message: message.trim(),
        sentAt: new Date()
      },
      type: "new"
    });

    res.json({
      message: "Message sent successfully",
      messages: status.messages
    });
  } catch (error) {
    console.error("Error adding message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get status messages
export const getStatusMessages = async (req, res) => {
  try {
    const { statusId } = req.params;

    const status = await Status.findById(statusId)
      .populate('userId', 'fullName username profilePic')
      .populate('messages.userId', 'fullName username profilePic');

    if (!status) {
      return res.status(404).json({ error: "Status not found" });
    }

    // Only status owner can see messages
    if (status.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can only view messages on your own status" });
    }

    res.json({
      messages: status.messages,
      messageCount: status.messages.length
    });
  } catch (error) {
    console.error("Error fetching status messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Mute status for user
export const muteStatus = async (req, res) => {
  try {
    const { statusId } = req.params;

    const status = await Status.findById(statusId);

    if (!status) {
      return res.status(404).json({ error: "Status not found" });
    }

    // Users cannot mute their own status
    if (status.userId.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: "You cannot mute your own status" });
    }

    await status.muteForUser(req.user._id);

    res.json({ message: "Status muted successfully" });
  } catch (error) {
    console.error("Error muting status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Unmute status for user
export const unmuteStatus = async (req, res) => {
  try {
    const { statusId } = req.params;

    const status = await Status.findById(statusId);

    if (!status) {
      return res.status(404).json({ error: "Status not found" });
    }

    await status.unmuteForUser(req.user._id);

    res.json({ message: "Status unmuted successfully" });
  } catch (error) {
    console.error("Error unmuting status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Report status
export const reportStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const { reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Report reason is required" });
    }

    const validReasons = ["inappropriate", "spam", "harassment", "violence", "other"];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: "Invalid report reason" });
    }

    const status = await Status.findById(statusId)
      .populate('userId', 'fullName username profilePic');

    if (!status) {
      return res.status(404).json({ error: "Status not found" });
    }

    // Users cannot report their own status
    if (status.userId._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: "You cannot report your own status" });
    }

    await status.reportStatus(req.user._id, reason, description || "");

    // TODO: Send email notification to admin
    // You can implement email notification here using nodemailer

    res.json({ message: "Status reported successfully" });
  } catch (error) {
    console.error("Error reporting status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
