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
            required: true,
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
        status: {
            type: String,
            enum: ['sent', 'delivered', 'seen'],
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
        }]
    },
    { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;