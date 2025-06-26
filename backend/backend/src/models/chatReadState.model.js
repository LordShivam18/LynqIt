import mongoose from "mongoose";

const chatReadStateSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        chatId: {
            type: String,
            required: true
        },
        chatType: {
            type: String,
            enum: ['direct', 'group'],
            required: true
        },
        // For direct chats: other user's ID, for groups: group ID
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        lastSeenMessageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null
        },
        lastSeenTimestamp: {
            type: Date,
            default: null
        },
        // Client-side unread count (synced from client)
        unreadCount: {
            type: Number,
            default: 0
        },
        // Last time user was active in this chat
        lastActiveAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

// Compound index for efficient queries
chatReadStateSchema.index({ userId: 1, chatId: 1 }, { unique: true });
chatReadStateSchema.index({ userId: 1, chatType: 1 });
chatReadStateSchema.index({ userId: 1, targetId: 1 });
chatReadStateSchema.index({ lastSeenTimestamp: 1 });

// Helper method to generate chat ID
chatReadStateSchema.statics.generateChatId = function(chatType, userId, targetId) {
    if (chatType === 'direct') {
        // For direct chats, create consistent ID regardless of order
        const ids = [userId.toString(), targetId.toString()].sort();
        return `direct_${ids[0]}_${ids[1]}`;
    } else {
        // For group chats, use group ID
        return `group_${targetId.toString()}`;
    }
};

const ChatReadState = mongoose.model("ChatReadState", chatReadStateSchema);

export default ChatReadState;
