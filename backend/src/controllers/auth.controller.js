import User from "../models/user.model.js";
import { generateToken } from "../lib/utils.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import jwt from "jsonwebtoken";
import Message from "../models/message.model.js";

export const signup = async (req, res) => {
    const { fullName, email, password, username } = req.body;

    try {
        // Check if all fields are provided
        if (!fullName || !email || !password || !username) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character"
            });
        }

        // Username format check (letters, numbers, periods, max 15 chars)
        const usernameRegex = /^[a-zA-Z0-9._]+$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                message: "Username can only include letters, numbers, and characters like . and _"
            });
        }

        // Check if email already exists
        const emailExists = await User.findOne({ email });
        if (emailExists) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // Check if username already exists
        const usernameExists = await User.findOne({ username });
        if (usernameExists) {
            return res.status(400).json({ message: "Username already exists. Please choose a different one." });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = new User({
            fullName,
            email,
            password: hashedPassword,
            username,
        });

        // Generate JWT and save user
        generateToken(newUser._id, res);
        await newUser.save();

        res.status(201).json({
            _id: newUser._id,
            fullName: newUser.fullName,
            email: newUser.email,
            username: newUser.username,
            profilePic: newUser.profilePic,
        });

    } catch (error) {
        console.error("Error in signup controller:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Find the user by email
        const user = await User.findOne({ email });
            
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        generateToken(user._id, res);

        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            username: user.username,
            profilePic: user.profilePic,
        });
    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const logout = (req, res) => {
    try {
        res.cookie("jwt", "", { maxAge: 0 });
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.log("Error in logout controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { profilePic, fullName, username, currentPassword, newPassword, bio } = req.body;
        const userId = req.user._id;
        
        // Prepare update object
        const updateObj = {};
        
        // Handle profile pic update
        if (profilePic) {
            const uploadResponse = await cloudinary.uploader.upload(profilePic);
            updateObj.profilePic = uploadResponse.secure_url;
        }
        
        // Handle fullName update
        if (fullName) {
            updateObj.fullName = fullName;
        }
        
        // Handle bio update
        if (bio !== undefined) {
            if (bio.length > 200) {
                return res.status(400).json({ message: "Bio must be 200 characters or less" });
            }
            updateObj.bio = bio;
        }
        
        // Handle username update
        if (username) {
            // Username format check
            const usernameRegex = /^[a-zA-Z0-9._]+$/;
            if (!usernameRegex.test(username)) {
                return res.status(400).json({
                    message: "Username can only include letters, numbers, and characters like . and _"
                });
            }
            
            // Check if username is already taken (excluding current user)
            const existingUser = await User.findOne({ 
                username, 
                _id: { $ne: userId } 
            });
            
            if (existingUser) {
                return res.status(400).json({ 
                    message: "Username already exists. Please choose a different one." 
                });
            }
            
            updateObj.username = username;
        }
        
        // Handle password update
        if (currentPassword && newPassword) {
            // Get user with password
            const user = await User.findById(userId);
            
            // Verify current password
            const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
            if (!isPasswordCorrect) {
                return res.status(400).json({ message: "Current password is incorrect" });
            }
            
            // Password strength validation
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                return res.status(400).json({
                    message: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character"
                });
            }
            
            // Hash new password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            updateObj.password = hashedPassword;
        }
        
        // Update user
        if (Object.keys(updateObj).length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }
        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateObj,
            { new: true }
        ).select("-password");

        res.status(200).json(updatedUser);
    } catch (error) {
        console.log("Error in update profile:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const checkAuth = (req, res) => {
    try {
        res.status(200).json(req.user);
    } catch (error) {
        console.log("Error in checkAuth controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const users = await User.find({ _id: { $ne: currentUserId } }).select("-password");
        
        res.status(200).json(users);
    } catch (error) {
        console.log("Error in getAllUsers controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const googleAuth = async (req, res) => {
    try {
        const { credential, username } = req.body;
        
        if (!credential) {
            return res.status(400).json({ message: "Google credential is required" });
        }
        
        // Decode the JWT from Google to get user info
        const decodedToken = jwt.decode(credential);
        
        if (!decodedToken) {
            return res.status(400).json({ message: "Invalid Google credential" });
        }
        
        const { email, name, picture, sub } = decodedToken;
        
        if (!email) {
            return res.status(400).json({ message: "Email not provided in Google account" });
        }
        
        // Check if user exists with this email
        let user = await User.findOne({ email });
        
        if (user) {
            // User exists, login
            generateToken(user._id, res);
            
            return res.status(200).json({
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                username: user.username,
                profilePic: user.profilePic,
            });
        } else {
            // New user from Google auth
            
            // If username is provided, create the account
            if (username) {
                // Validate username
                const usernameRegex = /^[a-zA-Z0-9._]+$/;
                if (!usernameRegex.test(username)) {
                    return res.status(400).json({
                        message: "Username can only include letters, numbers, and characters like . and _"
                    });
                }
                
                // Check if username is already taken
                const usernameExists = await User.findOne({ username });
                if (usernameExists) {
                    return res.status(400).json({ 
                        message: "Username already exists. Please choose a different one.",
                        needsUsername: true,
                        googleInfo: { email, name, picture }
                    });
                }
                
                // Generate a random password (user won't need this since they'll login with Google)
                const randomPassword = Math.random().toString(36).slice(-10) + 
                                     Math.random().toString(36).toUpperCase().slice(-2) + 
                                     Math.random().toString(21).slice(-1) + 
                                     '!';
                
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(randomPassword, salt);
                
                // Create new user
                const newUser = new User({
                    fullName: name || 'Google User',
                    email,
                    username,
                    password: hashedPassword,
                    profilePic: picture || undefined, // Use Google profile picture if available
                });
                
                generateToken(newUser._id, res);
                await newUser.save();
                
                return res.status(201).json({
                    _id: newUser._id,
                    fullName: newUser.fullName,
                    email: newUser.email,
                    username: newUser.username,
                    profilePic: newUser.profilePic,
                });
            } else {
                // No username provided, return that we need a username
                return res.status(200).json({
                    needsUsername: true,
                    googleInfo: { email, name, picture }
                });
            }
        }
    } catch (error) {
        console.error("Error in Google auth controller:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const deleteAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Find the user
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        // Delete profile picture from Cloudinary if it exists
        if (user.profilePic && !user.profilePic.includes("avatar.png")) {
            try {
                const publicId = user.profilePic.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            } catch (error) {
                console.error("Error deleting profile image from Cloudinary:", error);
                // Continue with account deletion even if image deletion fails
            }
        }
        
        // Delete all messages and media associated with this user
        const messages = await Message.find({
            $or: [
                { senderId: userId },
                { receiverId: userId }
            ]
        });
        
        // Delete media files from Cloudinary
        for (const message of messages) {
            if (message.image) {
                try {
                    const publicId = message.image.split('/').pop().split('.')[0];
                    await cloudinary.uploader.destroy(publicId);
                } catch (error) {
                    console.error("Error deleting message image from Cloudinary:", error);
                    // Continue with message deletion even if image deletion fails
                }
            }
        }
        
        // Delete all messages
        await Message.deleteMany({
            $or: [
                { senderId: userId },
                { receiverId: userId }
            ]
        });
        
        // Finally, delete the user
        await User.findByIdAndDelete(userId);
        
        // Clear the JWT cookie
        res.cookie("jwt", "", {
            httpOnly: true,
            maxAge: 0
        });
        
        res.status(200).json({ message: "Account deleted successfully" });
        
    } catch (error) {
        console.error("Error in deleteAccount controller:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
