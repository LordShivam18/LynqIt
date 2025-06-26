import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
    {
        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        reportedUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        reportType: {
            type: String,
            enum: ['user', 'message'],
            required: true,
            default: 'user'
        },
        messageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null
        },
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            default: null
        },
        reason: {
            type: String,
            enum: [
                'spam',
                'harassment',
                'hate_speech',
                'violence',
                'inappropriate_content',
                'impersonation',
                'scam',
                'other'
            ],
            required: true
        },
        description: {
            type: String,
            maxlength: 500,
            default: ""
        },
        status: {
            type: String,
            enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
            default: 'pending'
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        reviewedAt: {
            type: Date,
            default: null
        },
        adminNotes: {
            type: String,
            maxlength: 1000,
            default: ""
        },
        actionTaken: {
            type: String,
            enum: ['none', 'warning', 'temporary_ban', 'permanent_ban', 'message_deleted'],
            default: 'none'
        }
    },
    {
        timestamps: true
    }
);

// Indexes for efficient queries
reportSchema.index({ reportedUser: 1, status: 1 });
reportSchema.index({ reportedBy: 1 });
reportSchema.index({ messageId: 1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reportType: 1, status: 1 });

const Report = mongoose.model("Report", reportSchema);

export default Report;
