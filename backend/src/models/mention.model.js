import mongoose from "mongoose";

const mentionNotificationSchema = new mongoose.Schema(
    {
        messageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            required: true
        },
        mentionedUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        mentionedByUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            required: true
        },
        isRead: {
            type: Boolean,
            default: false
        },
        readAt: {
            type: Date,
            default: null
        },
        // Store the mention details for quick access
        mentionOffset: {
            type: Number,
            required: true
        },
        mentionLength: {
            type: Number,
            required: true
        }
    },
    { timestamps: true }
);

// Indexes for efficient queries
mentionNotificationSchema.index({ mentionedUserId: 1, isRead: 1 });
mentionNotificationSchema.index({ groupId: 1, mentionedUserId: 1 });
mentionNotificationSchema.index({ messageId: 1 });
mentionNotificationSchema.index({ mentionedUserId: 1, groupId: 1, isRead: 1 });

const MentionNotification = mongoose.model("MentionNotification", mentionNotificationSchema);

export default MentionNotification;
