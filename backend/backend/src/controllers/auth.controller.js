import User from "../models/user.model.js";
import { generateToken, verifyToken } from "../lib/utils.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import jwt from "jsonwebtoken";
import Message from "../models/message.model.js";
import OTP from "../models/otp.model.js";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

/* === CORE UTILITIES === */

const euclideanDistance = (v1, v2) => {
    if (!Array.isArray(v1) || !Array.isArray(v2) || v1.length !== v2.length) {
        return Infinity;
    }
    let sum = 0;
    for (let i = 0; i < v1.length; i++) {
        const diff = v1[i] - v2[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
};

/* === FACE AUTH SYSTEM === */

export const saveFaceEmbedding = async (req, res) => {
    try {
        const { userId, faceEmbedding } = req.body;
        const currentUserId = req.user._id;

        if (userId !== currentUserId.toString()) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        if (!faceEmbedding || !Array.isArray(faceEmbedding) || faceEmbedding.length < 128) {
            return res.status(400).json({ 
                message: "Valid face embedding array with at least 128 elements is required",
                example: Array(128).fill(0.0).map(() => (Math.random() * 2 - 1).toFixed(4))
            });
        }

        await User.findByIdAndUpdate(currentUserId, {
            faceEmbedding: faceEmbedding,
            faceAuthEnabled: true
        });

        res.status(200).json({ 
            message: "Face authentication successfully configured",
            nextSteps: "You can now login using face recognition"
        });

    } catch (error) {
        console.error("Face enrollment error:", error);
        res.status(500).json({ 
            message: "Face setup failed",
            systemMessage: error.message,
            referenceId: `FACE-ENROLL-${Date.now()}`
        });
    }
};

export const faceLogin = async (req, res) => {
    try {
        const { email, faceEmbedding } = req.body;

        if (!email || !faceEmbedding) {
            return res.status(400).json({ 
                message: "Email and face data are required",
                solution: "Ensure both fields are provided"
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ 
                message: "Account not found",
                action: "Try traditional login or sign up"
            });
        }

        if (!user.faceEmbedding || !user.faceAuthEnabled) {
            return res.status(403).json({
                message: "Face login not configured for this account",
                solution: "Set up face authentication in your account settings"
            });
        }

        const distance = euclideanDistance(faceEmbedding, user.faceEmbedding);
        const THRESHOLD = 0.6;

        if (distance > THRESHOLD) {
            console.warn(`Face authentication failed for ${email}. Distance: ${distance.toFixed(4)}`);
            return res.status(401).json({
                message: "Face verification failed",
                similarity: (1 - distance).toFixed(4),
                solution: "Try again with better lighting or setup face authentication again"
            });
        }

        generateToken(user._id, res);
        
        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            username: user.username,
            profilePic: user.profilePic,
            authMethod: "face",
            is2FAEnabled: user.is2FAEnabled
        });

    } catch (error) {
        console.error("Face authentication error:", error);
        res.status(500).json({ 
            message: "Authentication system error",
            referenceId: `FACE-LOGIN-${Date.now()}`
        });
    }
};


/* === TRADITIONAL AUTH === */


export const signup = async (req, res) => {
    const { fullName, email, password, username } = req.body;

    try {
        // Check if all fields are provided
        if (!fullName || !email || !password || !username) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Email validation - only allow Gmail and Outlook emails
        const validEmailDomains = ['gmail.com', 'outlook.com', 'hotmail.com'];
        const emailDomain = email.split('@')[1]?.toLowerCase();

        if (!emailDomain || !validEmailDomains.includes(emailDomain)) {
            return res.status(400).json({
                message: "Only Gmail and Outlook email addresses are allowed"
            });
        }

        // Password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character"
            });
        }

        // Username format check (letters, numbers, periods, max 25 chars)
        const usernameRegex = /^[a-zA-Z0-9._]+$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                message: "Username can only include letters, numbers, and characters like . and _"
            });
        }

        // Enforce username length limit
        if (username.length > 25) {
            return res.status(400).json({
                message: "Username must not exceed 25 characters"
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
            faceAuthEnabled: false,
            is2FAEnabled: false
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
            authMethods: ["password"],
            is2FAEnabled: false
        });

    } catch (error) {
        console.error("Error in signup controller:", error.message);
        res.status(500).json({ 
            message: "Account creation failed",
            systemError: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Email validation - only allow Gmail and Outlook emails
        const validEmailDomains = ['gmail.com', 'outlook.com', 'hotmail.com'];
        const emailDomain = email.split('@')[1]?.toLowerCase();

        if (!emailDomain || !validEmailDomains.includes(emailDomain)) {
            return res.status(400).json({
                message: "Only Gmail and Outlook email addresses are allowed"
            });
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

        // Handle 2FA if enabled
        if (user.is2FAEnabled) {
            // Return a flag indicating 2FA is required
            return res.status(202).json({
                message: "2FA verification required",
                userId: user._id,
                authMethods: [
                    "password",
                    ...(user.faceAuthEnabled ? ["face"] : [])
                ]
            });
        }

        generateToken(user._id, res);

        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            username: user.username,
            profilePic: user.profilePic,
            authMethods: [
                "password",
                ...(user.faceAuthEnabled ? ["face"] : [])
            ],
            is2FAEnabled: false
        });
    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({ 
            message: "Authentication system error",
            contactSupport: true,
            referenceId: `LOGIN-ERROR-${Date.now()}`
        });
    }
};

// Endpoint for 2FA verification after initial login
export const verify2FA = async (req, res) => {
    try {
        const { userId, token } = req.body;

        if (!userId || !token) {
            return res.status(400).json({ message: "User ID and token are required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.is2FAEnabled) {
            return res.status(400).json({ message: "2FA is not enabled for this account" });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 1
        });

        if (!verified) {
            return res.status(401).json({ message: "Invalid 2FA token" });
        }

        generateToken(user._id, res);

        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            username: user.username,
            profilePic: user.profilePic,
            authMethods: [
                "password",
                ...(user.faceAuthEnabled ? ["face"] : [])
            ],
            is2FAEnabled: true
        });
    } catch (error) {
        console.error("2FA verification error:", error);
        res.status(500).json({ 
            message: "2FA verification failed",
            referenceId: `2FA-VERIFY-${Date.now()}`
        });
    }
};


/* === GOOGLE OAUTH & 2FA === */
/* ========================== */

export const googleAuth = async (req, res) => {
    try {
        const { credential, username } = req.body;

        if (!credential) {
            return res.status(400).json({ message: "Google credential is required" });
        }

        let decodedToken;

        // Handle both JWT tokens and JSON credential objects
        if (typeof credential === 'string') {
            try {
                // Try to parse as JSON first (new format)
                decodedToken = JSON.parse(credential);
            } catch (e) {
                // If JSON parsing fails, try JWT decode (old format)
                decodedToken = jwt.decode(credential);
            }
        } else {
            // Already an object
            decodedToken = credential;
        }

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
            // User exists, check if 2FA is enabled
            if (user.is2FAEnabled) {
                return res.status(202).json({
                    message: "2FA verification required",
                    userId: user._id
                });
            }

            // Login user
            generateToken(user._id, res);

            return res.status(200).json({
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                username: user.username,
                profilePic: user.profilePic,
                is2FAEnabled: user.is2FAEnabled
            });
        } else {
            // New user from Google auth
            if (username) {
                // Validate username
                const usernameRegex = /^[a-zA-Z0-9._]+$/;
                if (!usernameRegex.test(username)) {
                    return res.status(400).json({
                        message: "Username can only include letters, numbers, and characters like . and _"
                    });
                }

                // Enforce username length limit
                if (username.length > 25) {
                    return res.status(400).json({
                        message: "Username must not exceed 25 characters",
                        needsUsername: true,
                        googleInfo: { email, name, picture }
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

                // Generate a random password
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
                    profilePic: picture || undefined,
                    faceAuthEnabled: false,
                    is2FAEnabled: false
                });

                generateToken(newUser._id, res);
                await newUser.save();

                // Import the sendWelcomeEmail function
                const { sendWelcomeEmail } = await import("../lib/email.js");

                try {
                    // Send welcome email to the new user
                    await sendWelcomeEmail(email, name || 'Google User');
                    console.log(`Welcome email sent to Google OAuth user: ${email}`);
                } catch (emailError) {
                    // Log the error but don't fail the registration process
                    console.error("Error sending welcome email to Google OAuth user:", emailError);
                }

                return res.status(201).json({
                    _id: newUser._id,
                    fullName: newUser.fullName,
                    email: newUser.email,
                    username: newUser.username,
                    profilePic: newUser.profilePic,
                    is2FAEnabled: false
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
        res.status(500).json({ 
            message: "Google authentication failed",
            systemError: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
/* === ACCOUNT MANAGEMENT === */

export const updateProfile = async (req, res) => {
    try {
        const { profilePic, fullName, username, currentPassword, newPassword, bio, faceAuthEnabled, is2FAEnabled } = req.body;
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
            if (bio.length > 150) {
                return res.status(400).json({ message: "Bio must be 150 characters or less" });
            }
            updateObj.bio = bio;
        }

        // Handle faceAuthEnabled toggle
        if (typeof faceAuthEnabled === 'boolean') {
            // If enabling, require face embedding to be already set
            if (faceAuthEnabled) {
                const user = await User.findById(userId);
                if (!user.faceEmbedding || user.faceEmbedding.length === 0) {
                    return res.status(400).json({
                        message: "You must register your face first before enabling face authentication"
                    });
                }
            }
            updateObj.faceAuthEnabled = faceAuthEnabled;
        }

        // Handle 2FA toggle
        if (typeof is2FAEnabled === 'boolean') {
            if (is2FAEnabled && !req.user.twoFactorSecret) {
                return res.status(400).json({
                    message: "You must set up 2FA before enabling it"
                });
            }
            updateObj.is2FAEnabled = is2FAEnabled;
        }

        // Handle username update
        if (username) {
            // Username format check (letters, numbers, periods, max 15 chars)
            const usernameRegex = /^[a-zA-Z0-9._]+$/;
            if (!usernameRegex.test(username)) {
                return res.status(400).json({
                    message: "Username can only include letters, numbers, and characters like . and _"
                });
            }

            // Enforce username length limit
            if (username.length > 25) {
                return res.status(400).json({
                    message: "Username must not exceed 25 characters"
                });
            }

            // Check if the username is different from the current one
            const user = await User.findById(userId);
            if (user.username !== username) {
                // Check if 10 days have passed since the last username change
                if (user.lastUsernameChange) {
                    const daysSinceLastChange = Math.floor((new Date() - new Date(user.lastUsernameChange)) / (1000 * 60 * 60 * 24));

                    if (daysSinceLastChange < 10) {
                        return res.status(400).json({
                            message: `You can only change your username once every 10 days. You can change it again in ${10 - daysSinceLastChange} days.`
                        });
                    }
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

                // Update the lastUsernameChange date
                updateObj.username = username;
                updateObj.lastUsernameChange = new Date();
            }
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
        ).select("-password -twoFactorSecret");

        res.status(200).json(updatedUser);
    } catch (error) {
        console.log("Error in update profile:", error);
        res.status(500).json({ message: "Profile update failed" });
    }
};

/* ===================== */
/* === 2FA MANAGEMENT === */
/* ===================== */

export const setup2FA = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        
        if (user.twoFactorSecret) {
            return res.status(400).json({ message: "2FA is already set up for this account" });
        }

        // Generate a secret
        const secret = speakeasy.generateSecret({
            name: `LynqIt:${user.email}`
        });

        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        // Save the secret temporarily (don't enable 2FA yet)
        await User.findByIdAndUpdate(userId, {
            twoFactorSecret: secret.base32
        });

        res.status(200).json({
            qrCodeUrl,
            secret: secret.base32, // For manual entry
            message: "Scan the QR code with your authenticator app"
        });
    } catch (error) {
        console.error("2FA setup error:", error);
        res.status(500).json({ message: "Failed to set up 2FA" });
    }
};

export const verify2FASetup = async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user._id;
        
        const user = await User.findById(userId);
        if (!user.twoFactorSecret) {
            return res.status(400).json({ message: "2FA not initialized for this account" });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 1
        });

        if (!verified) {
            return res.status(401).json({ message: "Invalid verification code" });
        }

        // Enable 2FA
        await User.findByIdAndUpdate(userId, {
            is2FAEnabled: true
        });

        res.status(200).json({
            message: "2FA enabled successfully",
            backupCodes: generateBackupCodes() // Implement this function
        });
    } catch (error) {
        console.error("2FA verification error:", error);
        res.status(500).json({ message: "2FA verification failed" });
    }
};

export const disable2FA = async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user._id;
        
        const user = await User.findById(userId);
        if (!user.is2FAEnabled) {
            return res.status(400).json({ message: "2FA is not enabled for this account" });
        }

        // Verify token before disabling
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 1
        });

        if (!verified) {
            return res.status(401).json({ message: "Invalid verification code" });
        }

        // Disable 2FA and clear secret
        await User.findByIdAndUpdate(userId, {
            is2FAEnabled: false,
            twoFactorSecret: null
        });

        res.status(200).json({ message: "2FA disabled successfully" });
    } catch (error) {
        console.error("2FA disable error:", error);
        res.status(500).json({ message: "Failed to disable 2FA" });
    }
};

/* ===================== */
/* === PASSWORD & OTP === */
/* ===================== */

export const checkEmailExists = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        // Email validation - only allow Gmail and Outlook emails
        const validEmailDomains = ['gmail.com', 'outlook.com', 'hotmail.com'];
        const emailDomain = email.split('@')[1]?.toLowerCase();

        if (!emailDomain || !validEmailDomains.includes(emailDomain)) {
            return res.status(400).json({
                message: "Only Gmail and Outlook email addresses are allowed"
            });
        }

        // Check if user exists with this email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "No account found with this email address"
            });
        }

        res.status(200).json({
            message: "Email exists",
            email
        });
    } catch (error) {
        console.error("Error in checkEmailExists controller:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        // Email validation - only allow Gmail and Outlook emails
        const validEmailDomains = ['gmail.com', 'outlook.com', 'hotmail.com'];
        const emailDomain = email.split('@')[1]?.toLowerCase();

        if (!emailDomain || !validEmailDomains.includes(emailDomain)) {
            return res.status(400).json({
                message: "Only Gmail and Outlook email addresses are allowed"
            });
        }

        // Check if user exists with this email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "No account found with this email address"
            });
        }

        // Generate OTP (6-digit code)
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Save OTP to database
        const otpRecord = new OTP({
            email,
            code: otpCode,
            expiresAt: otpExpiry
        });

        await otpRecord.save();

        // Send email with OTP
        const { sendPasswordResetEmail } = await import("../lib/email.js");
        await sendPasswordResetEmail(email, otpCode);

        res.status(200).json({
            message: "Password reset code sent successfully",
            email
        });
    } catch (error) {
        console.error("Error in forgotPassword controller:", error);

        if (error.message === 'Email service configuration error') {
            return res.status(500).json({
                message: "Email service is currently unavailable. Please try again later.",
                error: "email_service_error"
            });
        }

        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Find valid OTP record
        const otpRecord = await OTP.findOne({
            email,
            code,
            expiresAt: { $gt: new Date() }
        });

        if (!otpRecord) {
            return res.status(400).json({ message: "Invalid or expired verification code" });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "No account found with this email address" });
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

        // Update password
        user.password = hashedPassword;
        await user.save();

        // Delete OTP record
        await OTP.deleteMany({ email });

        // Send confirmation email
        const { sendPasswordResetConfirmationEmail } = await import("../lib/email.js");
        await sendPasswordResetConfirmationEmail(email, user.fullName);

        res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
        console.error("Error in resetPassword controller:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/* === OTHER METHODS === */

export const logout = (req, res) => {
    try {
        res.cookie("jwt", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 0
        });
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.log("Error in logout controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const checkAuth = (req, res) => {
    try {
        res.status(200).json({
            _id: req.user._id,
            fullName: req.user.fullName,
            email: req.user.email,
            username: req.user.username,
            profilePic: req.user.profilePic,
            faceAuthEnabled: req.user.faceAuthEnabled,
            is2FAEnabled: req.user.is2FAEnabled
        });
    } catch (error) {
        console.log("Error in checkAuth controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const users = await User.find({ _id: { $ne: currentUserId } }).select("-password -twoFactorSecret -faceEmbedding");

        res.status(200).json(users);
    } catch (error) {
        console.log("Error in getAllUsers controller", error.message);
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
        console.error("Error in delete Account controller:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const savePublicKey = async (req, res) => {
    try {
        const { userId, publicKey } = req.body;
        const currentUserId = req.user._id;

        // Ensure user can only save their own public key
        if (userId !== currentUserId.toString()) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        if (!publicKey) {
            return res.status(400).json({ message: "Public key is required" });
        }

        // Update user's public key
        await User.findByIdAndUpdate(currentUserId, {
            publicKey: publicKey
        });

        res.status(200).json({ message: "Public key saved successfully" });
    } catch (error) {
        console.log("Error in savePublicKey controller", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getPublicKey = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const user = await User.findById(userId).select('publicKey');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.publicKey) {
            return res.status(404).json({ message: "Public key not found for this user" });
        }

        res.status(200).json({
            publicKey: user.publicKey
        });
    } catch (error) {
        console.log("Error in getPublicKey controller", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Helper function to generate backup codes for 2FA
function generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
        codes.push(Math.random().toString(36).slice(2, 10).toUpperCase());
    }
    return codes;
}