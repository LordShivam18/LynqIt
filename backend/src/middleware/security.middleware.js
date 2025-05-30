import crypto from 'crypto';
import User from '../models/user.model.js';

// IP whitelist middleware (for admin operations)
export const ipWhitelist = (allowedIPs = []) => {
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress;

        // In development, allow all IPs
        if (process.env.NODE_ENV === 'development') {
            return next();
        }

        if (allowedIPs.length === 0 || allowedIPs.includes(clientIP)) {
            return next();
        }

        console.log(`SECURITY: Blocked request from unauthorized IP: ${clientIP}`);
        return res.status(403).json({ message: "Access denied from this IP address" });
    };
};


