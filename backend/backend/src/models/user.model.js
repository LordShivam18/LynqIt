import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      match: [/^[a-zA-Z0-9._]+$/, "Username can only contain letters, numbers, and characters like . and _"],
    },
    lastUsernameChange: {
      type: Date,
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },

    // ✅ Face recognition embedding field
    faceEmbedding: {
      type: [Number], // 128-dimensional face vector
      default: [],
    },

    // 2FA fields
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      default: null,
    },
    backupCodes: [
      {
        code: String,
        used: {
          type: Boolean,
          default: false,
        },
        usedAt: Date,
      },
    ],

    // Pinned chats and groups
    pinnedChats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    pinnedGroups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
      },
    ],

    // Blocked users
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // End-to-end encryption public key
    publicKey: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
