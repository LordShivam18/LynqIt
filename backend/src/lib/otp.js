import bcrypt from 'bcryptjs';
import OTP from '../models/otp.model.js';

/**
 * Generate a secure 6-digit OTP
 * @returns {string} 6-digit OTP
 */
export const generateOTP = () => {
    // Generate a random 6-digit number
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash an OTP for secure storage
 * @param {string} otp - The OTP to hash
 * @returns {Promise<string>} Hashed OTP
 */
export const hashOTP = async (otp) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(otp, salt);
};

/**
 * Verify if the provided OTP matches the stored OTP for the email
 * @param {string} email - User's email
 * @param {string} otp - OTP to verify
 * @returns {Promise<boolean>} True if OTP is valid, false otherwise
 */
export const verifyOTP = async (email, otp) => {
    try {
        // Find the most recent OTP for this email
        const otpRecord = await OTP.findOne({ email }).sort({ createdAt: -1 });
        
        if (!otpRecord) {
            return false; // No OTP found for this email
        }
        
        // Check if OTP has expired
        if (otpRecord.expiresAt < new Date()) {
            return false; // OTP has expired
        }
        
        // Verify the OTP
        const isValid = await bcrypt.compare(otp, otpRecord.otp);
        return isValid;
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return false;
    }
};

/**
 * Save a new OTP for the given email
 * @param {string} email - User's email
 * @param {string} otp - Plain text OTP (will be hashed before saving)
 * @param {number} expiryMinutes - Minutes until OTP expires (default: 10)
 * @returns {Promise<Object>} Saved OTP record
 */
export const saveOTP = async (email, otp, expiryMinutes = 10) => {
    try {
        // Hash the OTP
        const hashedOTP = await hashOTP(otp);
        
        // Calculate expiry time
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);
        
        // Delete any existing OTPs for this email
        await OTP.deleteMany({ email });
        
        // Create and save new OTP
        const newOTP = new OTP({
            email,
            otp: hashedOTP,
            expiresAt
        });
        
        await newOTP.save();
        return newOTP;
    } catch (error) {
        console.error('Error saving OTP:', error);
        throw error;
    }
};

/**
 * Delete all OTPs for a given email
 * @param {string} email - User's email
 * @returns {Promise<void>}
 */
export const deleteOTPs = async (email) => {
    try {
        await OTP.deleteMany({ email });
    } catch (error) {
        console.error('Error deleting OTPs:', error);
        throw error;
    }
};
