import ChatReadState from "../models/chatReadState.model.js";
import Message from "../models/message.model.js";
import MentionNotification from "../models/mention.model.js";
import Group from "../models/group.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// Get or create chat read state
export const getOrCreateChatReadState = async (userId, chatType, targetId) => {
    const chatId = ChatReadState.generateChatId(chatType, userId, targetId);

    let readState = await ChatReadState.findOne({ userId, chatId });

    if (!readState) {
        readState = new ChatReadState({
            userId,
            chatId,
            chatType,
            targetId,
            unreadCount: 0
        });
        await readState.save();
    }

    return readState;
};

// Update read state when user opens a chat
export const markChatAsRead = async (req, res) => {
    try {
        const { chatType, targetId, messageId } = req.body;
        const userId = req.user._id;

        const chatId = ChatReadState.generateChatId(chatType, userId, targetId);

        // Get or create read state
        let readState = await getOrCreateChatReadState(userId, chatType, targetId);

        // Find the message to get timestamp
        let lastMessage = null;
        if (messageId) {
            lastMessage = await Message.findById(messageId);
        } else {
            // Get the latest message in this chat
            if (chatType === 'direct') {
                lastMessage = await Message.findOne({
                    $or: [
                        { senderId: userId, receiverId: targetId },
                        { senderId: targetId, receiverId: userId }
                    ]
                }).sort({ createdAt: -1 });
            } else {
                lastMessage = await Message.findOne({
                    groupId: targetId
                }).sort({ createdAt: -1 });
            }
        }

        // Update read state
        readState.lastSeenMessageId = lastMessage?._id || readState.lastSeenMessageId;
        readState.lastSeenTimestamp = lastMessage?.createdAt || new Date();
        readState.unreadCount = 0;
        readState.lastActiveAt = new Date();

        await readState.save();

        // Mark messages as read
        if (chatType === 'direct') {
            await Message.updateMany(
                {
                    receiverId: userId,
                    senderId: targetId,
                    status: { $ne: 'seen' }
                },
                { status: 'seen' }
            );
        } else {
            // For groups, mark mentions as read
            await MentionNotification.updateMany(
                {
                    mentionedUserId: userId,
                    groupId: targetId,
                    isRead: false
                },
                {
                    isRead: true,
                    readAt: new Date()
                }
            );
        }

        // Emit read receipt to other users
        const readReceipt = {
            type: "read",
            chatId,
            chatType,
            targetId,
            messageId: lastMessage?._id,
            timestamp: new Date(),
            userId
        };

        if (chatType === 'direct') {
            // Notify the other user
            const otherUserSocketId = getReceiverSocketId(targetId);
            if (otherUserSocketId) {
                io.to(otherUserSocketId).emit("messageRead", readReceipt);
            }
        } else {
            // Notify all group members
            const group = await Group.findById(targetId);
            if (group) {
                group.members.forEach(member => {
                    if (member.user.toString() !== userId.toString()) {
                        const memberSocketId = getReceiverSocketId(member.user);
                        if (memberSocketId) {
                            io.to(memberSocketId).emit("messageRead", readReceipt);
                        }
                    }
                });
            }
        }

        // Send updated unread counts to user
        const unreadCounts = await getUnreadCountsForUser(userId);
        const userSocketId = getReceiverSocketId(userId);
        if (userSocketId) {
            io.to(userSocketId).emit("unreadCountUpdate", unreadCounts);
        }

        res.status(200).json({
            message: "Chat marked as read",
            readState,
            unreadCounts
        });
    } catch (error) {
        console.error("Error marking chat as read:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Increment unread count for a chat
export const incrementUnreadCount = async (userId, chatType, targetId, messageId) => {
    try {
        const readState = await getOrCreateChatReadState(userId, chatType, targetId);

        // Only increment if user hasn't seen this message
        if (!readState.lastSeenMessageId ||
            !readState.lastSeenTimestamp ||
            (messageId && readState.lastSeenMessageId.toString() !== messageId.toString())) {

            readState.unreadCount += 1;
            await readState.save();

            // Emit updated count to user
            const userSocketId = getReceiverSocketId(userId);
            if (userSocketId) {
                const unreadCounts = await getUnreadCountsForUser(userId);
                io.to(userSocketId).emit("unreadCountUpdate", unreadCounts);
            }
        }

        return readState;
    } catch (error) {
        console.error("Error incrementing unread count:", error);
        return null;
    }
};

// Handle mention notifications
export const handleMentionNotification = async (mentionedUserId, messageId, groupId, senderName, groupName) => {
    try {
        // Create mention notification record
        const mentionNotification = new MentionNotification({
            mentionedUserId,
            messageId,
            groupId,
            senderName,
            groupName,
            isRead: false
        });

        await mentionNotification.save();

        // Emit updated unread counts to the mentioned user
        const userSocketId = getReceiverSocketId(mentionedUserId);
        if (userSocketId) {
            const unreadCounts = await getUnreadCountsForUser(mentionedUserId);
            io.to(userSocketId).emit("unreadCountUpdate", unreadCounts);
        }

        return mentionNotification;
    } catch (error) {
        console.error("Error handling mention notification:", error);
        return null;
    }
};

// Get comprehensive unread counts for a user
export const getUnreadCountsForUser = async (userId) => {
    try {
        // Get all read states for this user
        const readStates = await ChatReadState.find({ userId })
            .populate('targetId')
            .lean();

        const personalCounts = {};
        const groupCounts = {};
        let totalPersonal = 0;
        let totalGroups = 0;

        // Process read states
        readStates.forEach(state => {
            if (state.chatType === 'direct') {
                personalCounts[state.targetId._id] = state.unreadCount;
                totalPersonal += state.unreadCount;
            } else {
                groupCounts[state.targetId._id] = state.unreadCount;
                totalGroups += state.unreadCount;
            }
        });

        // Get mention counts separately
        const mentionCounts = {};
        const unreadMentions = await MentionNotification.find({
            mentionedUserId: userId,
            isRead: false
        }).lean();

        let totalMentions = 0;
        unreadMentions.forEach(mention => {
            const groupId = mention.groupId.toString();
            mentionCounts[groupId] = (mentionCounts[groupId] || 0) + 1;
            totalMentions += 1;
        });

        return {
            personal: personalCounts,
            groups: groupCounts,
            mentions: mentionCounts,
            totalPersonal,
            totalGroups,
            totalMentions
        };
    } catch (error) {
        console.error("Error getting unread counts:", error);
        return {
            personal: {},
            groups: {},
            mentions: {},
            totalPersonal: 0,
            totalGroups: 0,
            totalMentions: 0
        };
    }
};

// Get unread counts API endpoint
export const getUnreadCounts = async (req, res) => {
    try {
        const userId = req.user._id;
        const unreadCounts = await getUnreadCountsForUser(userId);
        res.status(200).json(unreadCounts);
    } catch (error) {
        console.error("Error in getUnreadCounts:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Sync unread counts from client (for offline sync)
export const syncUnreadCounts = async (req, res) => {
    try {
        const { chatStates } = req.body;
        const userId = req.user._id;

        for (const clientState of chatStates) {
            const { chatType, targetId, unreadCount, lastSeenMessageId, lastSeenTimestamp } = clientState;

            const readState = await getOrCreateChatReadState(userId, chatType, targetId);

            // Update with client data if client is more recent
            if (!readState.lastSeenTimestamp ||
                new Date(lastSeenTimestamp) > readState.lastSeenTimestamp) {

                readState.unreadCount = unreadCount;
                readState.lastSeenMessageId = lastSeenMessageId;
                readState.lastSeenTimestamp = new Date(lastSeenTimestamp);
                readState.lastActiveAt = new Date();

                await readState.save();
            }
        }

        // Return updated server state
        const unreadCounts = await getUnreadCountsForUser(userId);
        res.status(200).json(unreadCounts);
    } catch (error) {
        console.error("Error syncing unread counts:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
