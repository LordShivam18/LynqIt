import crypto from 'crypto';
import User from '../models/user.model.js';

// Input sanitization middleware
export const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            // Remove potential XSS patterns
            return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                     .replace(/javascript:/gi, '')
                     .replace(/on\w+\s*=/gi, '');
        }

        if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    obj[key] = sanitize(obj[key]);
                }
            }
        }

        return obj;
    };

    if (req.body) {
        req.body = sanitize(req.body);
    }

    if (req.query && Object.keys(req.query).length > 0) {
        // Create a new sanitized query object and replace individual properties
        const sanitizedQuery = sanitize(req.query);
        Object.keys(req.query).forEach(key => {
            delete req.query[key];
        });
        Object.assign(req.query, sanitizedQuery);
    }

    next();
};

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


