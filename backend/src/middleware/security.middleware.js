import crypto from 'crypto';
import User from '../models/user.model.js';



// CSRF Protection Middleware
export const csrfProtection = (req, res, next) => {
    // Skip CSRF for GET requests and Socket.IO
    if (req.method === 'GET' || req.path.startsWith('/socket.io')) {
        return next();
    }

    const token = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionToken = req.cookies['csrf-token'];

    if (!token || !sessionToken || token !== sessionToken) {
        return res.status(403).json({
            message: "Invalid CSRF token",
            csrfError: true
        });
    }

    next();
};

// Generate CSRF token
export const generateCSRFToken = (req, res, next) => {
    if (!req.cookies['csrf-token']) {
        const token = crypto.randomBytes(32).toString('hex');
        res.cookie('csrf-token', token, {
            httpOnly: false, // Allow client-side access for CSRF token
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
    }
    next();
};



// Security headers middleware
export const securityHeaders = (req, res, next) => {
    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https: blob:; " +
        "connect-src 'self' https: wss: ws:; " +
        "media-src 'self' https: blob:; " +
        "object-src 'none'; " +
        "base-uri 'self';"
    );

    next();
};



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


