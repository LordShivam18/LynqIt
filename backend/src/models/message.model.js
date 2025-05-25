import mongoose from "mongoose";
const messageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: function() {
                return !this.groupId; // Required only if not a group message
            }
        },
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            required: function() {
                return !this.receiverId; // Required only if not a direct message
            }
        },
        messageType: {
            type: String,
            enum: ['direct', 'group'],
            required: true,
            default: 'direct'
        },
        text: {
            type: String,
        },
        image: {
            type: String,
        },
        mediaType: {
            type: String,
            enum: ['image', 'video', 'document', 'gif', null],
            default: null
        },
        mentions: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            username: String,
            offset: {
                type: Number,
                required: true
            },
            length: {
                type: Number,
                required: true
            }
        }],
        status: {
            type: String,
            enum: ['sending', 'sent', 'delivered', 'seen', 'failed'],
            default: 'sent'
        },
        deliveredAt: {
            type: Date,
            default: null
        },
        seenAt: {
            type: Date,
            default: null
        },
        // Group message read receipts - track delivery and seen status per member
        groupReadReceipts: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
            },
            status: {
                type: String,
                enum: ['sending', 'sent', 'delivered', 'seen', 'failed'],
                default: 'sent'
            },
            deliveredAt: {
                type: Date
            },
            seenAt: {
                type: Date
            }
        }],
        isDeleted: {
            type: Boolean,
            default: false
        },
        deletedFor: {
            type: String,
            enum: ['everyone', 'me', null],
            default: null
        },
        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        deletedAt: {
            type: Date,
            default: null
        },
        isEdited: {
            type: Boolean,
            default: false
        },
        editedAt: {
            type: Date,
            default: null
        },
        originalText: {
            type: String,
            default: null
        },
        reactions: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
            },
            emoji: {
                type: String,
                required: true
            }
        }],
        replyTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null
        },
        isReply: {
            type: Boolean,
            default: false
        },
        // Status reply functionality
        statusReply: {
            statusId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Status',
                default: null
            },
            statusType: {
                type: String,
                enum: ['text', 'image'],
                default: null
            },
            statusContent: {
                type: String, // text content or image URL
                default: null
            },
            statusCaption: {
                type: String,
                default: null
            },
            backgroundColor: {
                type: String,
                default: null
            },
            fontFamily: {
                type: String,
                default: null
            }
        },
        isEncrypted: {
            type: Boolean,
            default: false
        },
        encryptionKeyVersion: {
            type: Number,
            default: 1
        }
    },
    { timestamps: true }
);

// Indexes for efficient queries
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ groupId: 1, createdAt: -1 });
messageSchema.index({ messageType: 1 });
messageSchema.index({ 'mentions.user': 1 });
messageSchema.index({ replyTo: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;