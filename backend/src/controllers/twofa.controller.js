import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import User from '../models/user.model.js';
import crypto from 'crypto';

// Generate 2FA setup
export const generate2FASetup = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.twoFactorEnabled) {
            return res.status(400).json({ message: "2FA is already enabled" });
        }

        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `LynqIt (${user.email})`,
            issuer: 'LynqIt Chat',
            length: 32
        });

        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        // Store temporary secret (not yet enabled)
        user.twoFactorSecret = secret.base32;
        await user.save();

        res.status(200).json({
            secret: secret.base32,
            qrCode: qrCodeUrl,
            manualEntryKey: secret.base32
        });
    } catch (error) {
        console.error("Error generating 2FA setup:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Verify and enable 2FA
export const enable2FA = async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user._id;

        if (!token) {
            return res.status(400).json({ message: "2FA token is required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.twoFactorEnabled) {
            return res.status(400).json({ message: "2FA is already enabled" });
        }

        if (!user.twoFactorSecret) {
            return res.status(400).json({ message: "2FA setup not initiated. Please generate setup first." });
        }

        // Verify the token
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token,
            window: 2 // Allow 2 time steps (60 seconds) tolerance
        });

        if (!verified) {
            return res.status(400).json({ message: "Invalid 2FA token" });
        }

        // Generate backup codes
        const backupCodes = [];
        for (let i = 0; i < 10; i++) {
            backupCodes.push({
                code: crypto.randomBytes(4).toString('hex').toUpperCase(),
                used: false
            });
        }

        // Enable 2FA
        user.twoFactorEnabled = true;
        user.backupCodes = backupCodes;
        await user.save();



        res.status(200).json({
            message: "2FA enabled successfully",
            backupCodes: backupCodes.map(bc => bc.code)
        });
    } catch (error) {
        console.error("Error enabling 2FA:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Disable 2FA
export const disable2FA = async (req, res) => {
    try {
        const { token, password } = req.body;
        const userId = req.user._id;

        if (!token || !password) {
            return res.status(400).json({ message: "2FA token and password are required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.twoFactorEnabled) {
            return res.status(400).json({ message: "2FA is not enabled" });
        }

        // Verify password
        const bcrypt = await import('bcryptjs');
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid password" });
        }

        // Verify 2FA token or backup code
        let verified = false;

        // Try TOTP first
        if (token.length === 6 && /^\d+$/.test(token)) {
            verified = speakeasy.totp.verify({
                secret: user.twoFactorSecret,
                encoding: 'base32',
                token: token,
                window: 2
            });
        } else {
            // Try backup code
            const backupCode = user.backupCodes.find(bc =>
                bc.code === token.toUpperCase() && !bc.used
            );
            if (backupCode) {
                verified = true;
                backupCode.used = true;
                backupCode.usedAt = new Date();
            }
        }

        if (!verified) {
            return res.status(400).json({ message: "Invalid 2FA token or backup code" });
        }

        // Disable 2FA
        user.twoFactorEnabled = false;
        user.twoFactorSecret = null;
        user.backupCodes = [];
        await user.save();



        res.status(200).json({ message: "2FA disabled successfully" });
    } catch (error) {
        console.error("Error disabling 2FA:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Verify 2FA token (for login)
export const verify2FA = async (req, res) => {
    try {
        const { email, token } = req.body;

        if (!email || !token) {
            return res.status(400).json({ message: "Email and 2FA token are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        if (!user.twoFactorEnabled) {
            return res.status(400).json({ message: "2FA is not enabled for this account" });
        }

        let verified = false;

        // Try TOTP first
        if (token.length === 6 && /^\d+$/.test(token)) {
            verified = speakeasy.totp.verify({
                secret: user.twoFactorSecret,
                encoding: 'base32',
                token: token,
                window: 2
            });
        } else {
            // Try backup code
            const backupCode = user.backupCodes.find(bc =>
                bc.code === token.toUpperCase() && !bc.used
            );
            if (backupCode) {
                verified = true;
                backupCode.used = true;
                backupCode.usedAt = new Date();
                await user.save();
            }
        }

        if (!verified) {
            return res.status(400).json({ message: "Invalid 2FA token" });
        }

        res.status(200).json({
            message: "2FA verification successful",
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                username: user.username,
                profilePic: user.profilePic
            }
        });
    } catch (error) {
        console.error("Error verifying 2FA:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get 2FA status
export const get2FAStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            enabled: user.twoFactorEnabled,
            backupCodesRemaining: user.backupCodes ? user.backupCodes.filter(bc => !bc.used).length : 0
        });
    } catch (error) {
        console.error("Error getting 2FA status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Regenerate backup codes
export const regenerateBackupCodes = async (req, res) => {
    try {
        const { password } = req.body;
        const userId = req.user._id;
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');

        if (!password) {
            return res.status(400).json({ message: "Password is required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.twoFactorEnabled) {
            return res.status(400).json({ message: "2FA is not enabled" });
        }

        // Verify password
        const bcrypt = await import('bcryptjs');
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid password" });
        }

        // Generate new backup codes
        const backupCodes = [];
        for (let i = 0; i < 10; i++) {
            backupCodes.push({
                code: crypto.randomBytes(4).toString('hex').toUpperCase(),
                used: false
            });
        }

        user.backupCodes = backupCodes;
        await user.save();

        // Log security event
        await user.addSecurityEvent('profile_update', ip, userAgent, 'Backup codes regenerated');

        res.status(200).json({
            message: "Backup codes regenerated successfully",
            backupCodes: backupCodes.map(bc => bc.code)
        });
    } catch (error) {
        console.error("Error regenerating backup codes:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
