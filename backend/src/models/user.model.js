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
            maxlength: 150, // Limit bio to 150 characters
        },
        username: {
            type: String,
            required: true,
            unique: true,
            match: [/^[a-zA-Z0-9._]+$/, "Username can only contain letters, numbers, and characters like . and _"],
        },
        lastUsernameChange: {
            type: Date,
            default: null
        },
        isOnline: {
            type: Boolean,
            default: false
        },
        lastSeen: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);

export default User;
