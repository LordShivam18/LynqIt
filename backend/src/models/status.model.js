import mongoose from "mongoose";

const statusSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "image"],
      required: true,
    },
    // For text status
    text: {
      type: String,
      maxlength: 700,
      required: function() {
        return this.type === "text";
      }
    },
    backgroundColor: {
      type: String,
      default: "#075E54", // WhatsApp green
      validate: {
        validator: function(v) {
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: "Invalid hex color format"
      }
    },
    fontStyle: {
      type: String,
      enum: ["normal", "bold", "italic", "bold-italic"],
      default: "normal"
    },
    // For image status
    image: {
      type: String, // Cloudinary URL
      required: function() {
        return this.type === "image";
      }
    },
    caption: {
      type: String,
      maxlength: 700,
    },
    // Status metadata
    timestamp: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: function() {
        return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      },
      index: { expireAfterSeconds: 0 } // MongoDB TTL index
    },
    // Viewers tracking
    viewers: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      viewedAt: {
        type: Date,
        default: Date.now,
      }
    }],
    // Reactions to status
    reactions: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },
      emoji: {
        type: String,
        required: true,
        maxlength: 10
      },
      reactedAt: {
        type: Date,
        default: Date.now
      }
    }],
    // Messages/replies to status
    messages: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },
      message: {
        type: String,
        required: true,
        maxlength: 500
      },
      sentAt: {
        type: Date,
        default: Date.now
      }
    }],
    // Privacy settings
    visibility: {
      type: String,
      enum: ["contacts", "contactsExcept", "onlyShareWith"],
      default: "contacts"
    },
    // For contactsExcept and onlyShareWith
    specificUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    // Status statistics
    viewCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Mute and report tracking
    mutedBy: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      mutedAt: {
        type: Date,
        default: Date.now
      }
    }],
    reports: [{
      reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      reason: {
        type: String,
        enum: ["inappropriate", "spam", "harassment", "violence", "other"],
        required: true
      },
      description: {
        type: String,
        maxlength: 500
      },
      reportedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
statusSchema.index({ userId: 1, expiresAt: 1 });
statusSchema.index({ expiresAt: 1 }); // For cleanup
statusSchema.index({ "viewers.userId": 1 });

// Virtual for checking if status is expired
statusSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

// Method to check if user can view this status
statusSchema.methods.canUserView = function(viewerUserId, userContacts) {
  try {
    // Validate inputs
    if (!viewerUserId) {
      return false;
    }

    if (!userContacts) {
      return false;
    }

    // Status owner can always view their own status
    if (this.userId.toString() === viewerUserId.toString()) {
      return true;
    }

    // Check if status is expired
    if (this.isExpired) {
      return false;
    }

    // Check if viewer has existing conversation with status owner
    const hasConversation = userContacts.some(contact => {
      return contact._id.toString() === this.userId.toString();
    });

    // For now, allow all contacts to see statuses (like WhatsApp)
    // Later we can make this more restrictive if needed
    if (!hasConversation) {
      // Still allow if they're in the same group or have any connection
      return true; // Temporarily allow all for testing
    }

    // Apply privacy settings
    switch (this.visibility) {
      case "contacts":
        return true;
      case "contactsExcept":
        const isExcluded = this.specificUsers.includes(viewerUserId);
        return !isExcluded;
      case "onlyShareWith":
        const isIncluded = this.specificUsers.includes(viewerUserId);
        return isIncluded;
      default:
        return false;
    }
  } catch (error) {
    console.error(`Error in canUserView:`, error);
    return false;
  }
};

// Method to mark status as viewed
statusSchema.methods.markAsViewed = function(viewerUserId) {
  // Check if user already viewed this status
  const existingView = this.viewers.find(viewer =>
    viewer.userId.toString() === viewerUserId.toString()
  );

  if (!existingView) {
    this.viewers.push({
      userId: viewerUserId,
      viewedAt: new Date()
    });
    this.viewCount += 1;
  }

  return this.save();
};

// Method to add reaction to status
statusSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(reaction =>
    reaction.userId.toString() !== userId.toString()
  );

  // Add new reaction
  this.reactions.push({
    userId,
    emoji,
    reactedAt: new Date()
  });

  return this.save();
};

// Method to remove reaction from status
statusSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(reaction =>
    reaction.userId.toString() !== userId.toString()
  );

  return this.save();
};

// Method to add message to status
statusSchema.methods.addMessage = function(userId, message) {
  this.messages.push({
    userId,
    message,
    sentAt: new Date()
  });

  return this.save();
};

// Method to mute status for a user
statusSchema.methods.muteForUser = function(userId) {
  // Check if already muted
  const alreadyMuted = this.mutedBy.some(mute =>
    mute.userId.toString() === userId.toString()
  );

  if (!alreadyMuted) {
    this.mutedBy.push({
      userId,
      mutedAt: new Date()
    });
  }

  return this.save();
};

// Method to unmute status for a user
statusSchema.methods.unmuteForUser = function(userId) {
  this.mutedBy = this.mutedBy.filter(mute =>
    mute.userId.toString() !== userId.toString()
  );

  return this.save();
};

// Method to report status
statusSchema.methods.reportStatus = function(reportedBy, reason, description = "") {
  // Check if already reported by this user
  const alreadyReported = this.reports.some(report =>
    report.reportedBy.toString() === reportedBy.toString()
  );

  if (!alreadyReported) {
    this.reports.push({
      reportedBy,
      reason,
      description,
      reportedAt: new Date()
    });
  }

  return this.save();
};

// Static method to get user's contacts (users with existing conversations)
statusSchema.statics.getUserContacts = async function(userId) {
  const Message = mongoose.model('Message');
  const User = mongoose.model('User');

  // Get all users who have exchanged messages with this user (both personal and group messages)
  const personalContacts = await Message.aggregate([
    {
      $match: {
        $and: [
          { groupId: { $exists: false } }, // Only personal messages
          {
            $or: [
              { senderId: new mongoose.Types.ObjectId(userId) },
              { receiverId: new mongoose.Types.ObjectId(userId) }
            ]
          }
        ]
      }
    },
    {
      $group: {
        _id: null,
        contacts: {
          $addToSet: {
            $cond: [
              { $eq: ["$senderId", new mongoose.Types.ObjectId(userId)] },
              "$receiverId",
              "$senderId"
            ]
          }
        }
      }
    }
  ]);

  // Get all users from groups where this user is a member
  const Group = mongoose.model('Group');
  const userGroups = await Group.find({
    'members.user': new mongoose.Types.ObjectId(userId)
  }).select('members');

  let groupContactIds = [];
  userGroups.forEach(group => {
    group.members.forEach(member => {
      if (member.user.toString() !== userId.toString()) {
        groupContactIds.push(member.user);
      }
    });
  });

  // Combine personal and group contacts
  const personalContactIds = personalContacts.length > 0 ? personalContacts[0].contacts : [];
  const allContactIds = [...new Set([...personalContactIds, ...groupContactIds])];

  // Populate contact details
  const contacts = await User.find({ _id: { $in: allContactIds } }).select('fullName username profilePic');

  return contacts;
};

// Static method to cleanup expired statuses
statusSchema.statics.cleanupExpiredStatuses = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });

  console.log(`Cleaned up ${result.deletedCount} expired statuses`);
  return result;
};

const Status = mongoose.model("Status", statusSchema);

export default Status;
