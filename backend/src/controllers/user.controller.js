import User from "../models/user.model.js";
import Group from "../models/group.model.js";
import Message from "../models/message.model.js";
import Report from "../models/report.model.js";

// Toggle pin status for a chat (user)
export const togglePinChat = async (req, res) => {
  try {
    console.log("togglePinChat called with:", { chatId: req.params.chatId, userId: req.user._id });

    const { chatId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      console.log("User not found:", userId);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Current pinned chats:", user.pinnedChats);
    const isPinned = user.pinnedChats.includes(chatId);
    console.log("Is currently pinned:", isPinned);

    if (isPinned) {
      // Unpin the chat
      user.pinnedChats = user.pinnedChats.filter(id => id.toString() !== chatId);
      console.log("Unpinning chat, new pinned chats:", user.pinnedChats);
    } else {
      // Pin the chat (limit to 5 pinned chats)
      if (user.pinnedChats.length >= 5) {
        console.log("Maximum pin limit reached:", user.pinnedChats.length);
        return res.status(400).json({ error: "Maximum 5 chats can be pinned" });
      }
      user.pinnedChats.push(chatId);
      console.log("Pinning chat, new pinned chats:", user.pinnedChats);
    }

    await user.save();
    console.log("User saved successfully");

    res.status(200).json({
      message: isPinned ? "Chat unpinned" : "Chat pinned",
      isPinned: !isPinned,
      pinnedChats: user.pinnedChats
    });
  } catch (error) {
    console.log("Error in togglePinChat controller: ", error.message);
    console.log("Full error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Toggle pin status for a group
export const togglePinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isPinned = user.pinnedGroups.includes(groupId);

    if (isPinned) {
      // Unpin the group
      user.pinnedGroups = user.pinnedGroups.filter(id => id.toString() !== groupId);
    } else {
      // Pin the group (limit to 5 pinned groups)
      if (user.pinnedGroups.length >= 5) {
        return res.status(400).json({ error: "Maximum 5 groups can be pinned" });
      }
      user.pinnedGroups.push(groupId);
    }

    await user.save();

    res.status(200).json({
      message: isPinned ? "Group unpinned" : "Group pinned",
      isPinned: !isPinned,
      pinnedGroups: user.pinnedGroups
    });
  } catch (error) {
    console.log("Error in togglePinGroup controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get user's pinned chats and groups
export const getPinnedItems = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .populate('pinnedChats', 'fullName username profilePic isOnline lastSeen')
      .populate('pinnedGroups', 'name description avatar lastActivity');

    res.status(200).json({
      pinnedChats: user.pinnedChats || [],
      pinnedGroups: user.pinnedGroups || []
    });
  } catch (error) {
    console.log("Error in getPinnedItems controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Block a user
export const blockUser = async (req, res) => {
  try {
    console.log("blockUser called with:", { userToBlockId: req.params.userId, currentUserId: req.user._id });

    const { userId: userToBlockId } = req.params;
    const currentUserId = req.user._id;

    if (currentUserId.toString() === userToBlockId) {
      console.log("User trying to block themselves");
      return res.status(400).json({ error: "Cannot block yourself" });
    }

    const user = await User.findById(currentUserId);
    const userToBlock = await User.findById(userToBlockId);

    if (!userToBlock) {
      console.log("User to block not found:", userToBlockId);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Current blocked users:", user.blockedUsers);
    const isAlreadyBlocked = user.blockedUsers.includes(userToBlockId);
    console.log("Is already blocked:", isAlreadyBlocked);

    if (isAlreadyBlocked) {
      console.log("User is already blocked");
      return res.status(400).json({ error: "User is already blocked" });
    }

    user.blockedUsers.push(userToBlockId);
    await user.save();
    console.log("User blocked successfully, new blocked users:", user.blockedUsers);

    res.status(200).json({
      message: "User blocked successfully",
      blockedUsers: user.blockedUsers
    });
  } catch (error) {
    console.log("Error in blockUser controller: ", error.message);
    console.log("Full error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Unblock a user
export const unblockUser = async (req, res) => {
  try {
    const { userId: userToUnblockId } = req.params;
    const currentUserId = req.user._id;

    const user = await User.findById(currentUserId);

    const isBlocked = user.blockedUsers.includes(userToUnblockId);

    if (!isBlocked) {
      return res.status(400).json({ error: "User is not blocked" });
    }

    user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== userToUnblockId);
    await user.save();

    res.status(200).json({
      message: "User unblocked successfully",
      blockedUsers: user.blockedUsers
    });
  } catch (error) {
    console.log("Error in unblockUser controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get blocked users
export const getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .populate('blockedUsers', 'fullName username profilePic');

    res.status(200).json({
      blockedUsers: user.blockedUsers || []
    });
  } catch (error) {
    console.log("Error in getBlockedUsers controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Report a user
export const reportUser = async (req, res) => {
  try {
    console.log("reportUser called with:", req.body);

    const { reportedUserId, reason, description } = req.body;
    const reportedBy = req.user._id;

    // Validate required fields
    if (!reportedUserId || !reason) {
      return res.status(400).json({ error: "Reported user ID and reason are required" });
    }

    // Check if reported user exists
    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({ error: "Reported user not found" });
    }

    // Get reporter details
    const reporter = await User.findById(reportedBy);

    // Create the report
    const report = new Report({
      reportedBy,
      reportedUser: reportedUserId,
      reportType: 'user',
      messageId: null,
      reason,
      description: description || "",
      status: "pending"
    });

    await report.save();

    // Send email notification to admin
    try {
      const { sendEmail } = await import('../lib/email.js');

      const emailContent = `
        <h2>🚨 User Report Notification</h2>
        <p><strong>A user has been reported on LynqIt Chat Platform</strong></p>

        <h3>Report Details:</h3>
        <ul>
          <li><strong>Reporter:</strong> ${reporter.fullName} (@${reporter.username})</li>
          <li><strong>Reporter Email:</strong> ${reporter.email}</li>
          <li><strong>Reported User:</strong> ${reportedUser.fullName} (@${reportedUser.username})</li>
          <li><strong>Reported User Email:</strong> ${reportedUser.email}</li>
          <li><strong>Reason:</strong> ${reason}</li>
          <li><strong>Description:</strong> ${description || 'No additional description provided'}</li>
          <li><strong>Report ID:</strong> ${report._id}</li>
          <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
        </ul>

        <p><strong>Action Required:</strong> Please review this report and take appropriate action.</p>

        <hr>
        <p><em>This is an automated notification from LynqIt Chat Platform</em></p>
      `;

      await sendEmail(
        'slynqit@gmail.com',
        `🚨 User Report: ${reportedUser.username} reported for ${reason}`,
        emailContent
      );

      console.log("Report email sent successfully to admin");
    } catch (emailError) {
      console.error("Failed to send report email:", emailError);
      // Don't fail the request if email fails
    }

    // Auto-block the reported user (as requested)
    try {
      const currentUser = await User.findById(reportedBy);
      if (!currentUser.blockedUsers.includes(reportedUserId)) {
        currentUser.blockedUsers.push(reportedUserId);
        await currentUser.save();
        console.log("Reported user automatically blocked");
      }
    } catch (blockError) {
      console.error("Failed to auto-block reported user:", blockError);
    }

    res.status(201).json({
      message: "Report submitted successfully. User has been blocked.",
      reportId: report._id
    });
  } catch (error) {
    console.log("Error in reportUser controller: ", error.message);
    console.log("Full error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Report a message
export const reportMessage = async (req, res) => {
  try {
    const { messageId, reason, description } = req.body;
    const reportedBy = req.user._id;

    // Find the message to get the sender
    const message = await Message.findById(messageId).populate('senderId');
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user is trying to report their own message
    if (message.senderId._id.toString() === reportedBy.toString()) {
      return res.status(400).json({ error: "Cannot report your own message" });
    }

    // Check if user has already reported this message
    const existingReport = await Report.findOne({
      reportedBy,
      messageId
    });

    if (existingReport) {
      return res.status(400).json({ error: "You have already reported this message" });
    }

    // Create the report
    const report = new Report({
      reportedBy,
      reportedUser: message.senderId._id,
      reportType: 'message',
      messageId,
      groupId: message.groupId || null,
      reason,
      description: description || ""
    });

    await report.save();

    res.status(201).json({
      message: "Message reported successfully",
      reportId: report._id
    });
  } catch (error) {
    console.log("Error in reportMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get reports (admin only)
export const getReports = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;

    const reports = await Report.find({ status })
      .populate('reportedBy', 'fullName username profilePic')
      .populate('reportedUser', 'fullName username profilePic')
      .populate('messageId')
      .populate('groupId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalReports = await Report.countDocuments({ status });

    res.status(200).json({
      reports,
      totalPages: Math.ceil(totalReports / limit),
      currentPage: page,
      totalReports
    });
  } catch (error) {
    console.log("Error in getReports controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
