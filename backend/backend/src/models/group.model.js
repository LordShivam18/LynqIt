import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50
        },
        description: {
            type: String,
            trim: true,
            maxlength: 200,
            default: ""
        },
        avatar: {
            type: String,
            default: ""
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        members: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
            },
            role: {
                type: String,
                enum: ['admin', 'member'],
                default: 'member'
            },
            joinedAt: {
                type: Date,
                default: Date.now
            },
            addedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        }],
        settings: {
            allowMemberInvites: {
                type: Boolean,
                default: true
            },
            allowMemberNameChange: {
                type: Boolean,
                default: false
            },
            allowMemberDescriptionChange: {
                type: Boolean,
                default: false
            },
            allowMemberAvatarChange: {
                type: Boolean,
                default: false
            },
            messageDeleteTimeLimit: {
                type: Number,
                default: 15 // minutes
            }
        },
        inviteLink: {
            token: {
                type: String,
                default: null
            },
            expiresAt: {
                type: Date,
                default: null
            },
            createdBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: null
            },
            isActive: {
                type: Boolean,
                default: false
            }
        },
        isActive: {
            type: Boolean,
            default: true
        },
        lastActivity: {
            type: Date,
            default: Date.now
        },
        encryption: {
            isEnabled: {
                type: Boolean,
                default: true
            },
            keyVersion: {
                type: Number,
                default: 1
            },
            lastKeyRotation: {
                type: Date,
                default: Date.now
            }
        }
    },
    {
        timestamps: true
    }
);

// Index for efficient queries
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ createdBy: 1 });
groupSchema.index({ isActive: 1 });

// Virtual for member count
groupSchema.virtual('memberCount').get(function() {
    return this.members.length;
});

// Method to check if user is admin
groupSchema.methods.isAdmin = function(userId) {
    const member = this.members.find(m => m.user.toString() === userId.toString());
    return member && member.role === 'admin';
};

// Method to check if user is member
groupSchema.methods.isMember = function(userId) {
    return this.members.some(m => m.user.toString() === userId.toString());
};

// Method to get member role
groupSchema.methods.getMemberRole = function(userId) {
    const member = this.members.find(m => m.user.toString() === userId.toString());
    return member ? member.role : null;
};

// Static method to find groups by user
groupSchema.statics.findByUser = function(userId) {
    return this.find({
        'members.user': userId,
        isActive: true
    }).populate('members.user', 'fullName username profilePic isOnline lastSeen')
      .populate('createdBy', 'fullName username profilePic')
      .sort({ lastActivity: -1 });
};

const Group = mongoose.model("Group", groupSchema);

export default Group;
