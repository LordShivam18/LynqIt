import User from "../models/user.model.js";
import { generateOTP, saveOTP, verifyOTP, deleteOTPs } from "../lib/otp.js";
import { sendOTPEmail, sendWelcomeEmail } from "../lib/email.js";
import { generateToken } from "../lib/utils.js";
import bcrypt from "bcryptjs";

/**
 * Request OTP for email verification during signup
 * @route POST /api/auth/request-otp
 */
export const requestOTP = async (req, res) => {
    try {
        const { email, fullName, username, password } = req.body;

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

        // Username format check
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

        // Generate OTP
        const otp = generateOTP();
        
        // Save OTP to database (hashed)
        await saveOTP(email, otp);
        
        // Send OTP email
        await sendOTPEmail(email, otp);
        
        // Return success response (don't include OTP in response)
        res.status(200).json({ 
            message: "OTP sent successfully",
            email
        });
    } catch (error) {
        console.error("Error in requestOTP controller:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/**
 * Verify OTP and complete user registration
 * @route POST /api/auth/verify-otp
 */
export const verifyUserOTP = async (req, res) => {
    try {
        const { email, otp, fullName, username, password } = req.body;
        
        if (!email || !otp || !fullName || !username || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        
        // Verify OTP
        const isValid = await verifyOTP(email, otp);
        
        if (!isValid) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }
        
        // OTP is valid, create the user
        
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
        
        // Delete all OTPs for this email
        await deleteOTPs(email);
        
        // Send welcome email
        await sendWelcomeEmail(email, fullName);
        
        res.status(201).json({
            _id: newUser._id,
            fullName: newUser.fullName,
            email: newUser.email,
            username: newUser.username,
            profilePic: newUser.profilePic,
        });
    } catch (error) {
        console.error("Error in verifyOTP controller:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/**
 * Resend OTP if expired
 * @route POST /api/auth/resend-otp
 */
export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }
        
        // Generate new OTP
        const otp = generateOTP();
        
        // Save OTP to database (hashed)
        await saveOTP(email, otp);
        
        // Send OTP email
        await sendOTPEmail(email, otp);
        
        // Return success response
        res.status(200).json({ 
            message: "OTP resent successfully",
            email
        });
    } catch (error) {
        console.error("Error in resendOTP controller:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
