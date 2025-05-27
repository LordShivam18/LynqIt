import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: "60d"
    });

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("jwt", token, {
        maxAge: 60 * 24 * 60 * 60 * 1000, // 60 days in milliseconds
        httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
        sameSite: isProduction ? "lax" : "strict", // Use lax for better compatibility in production
        secure: isProduction, // Set to true in production for HTTPS
        domain: isProduction ? undefined : undefined, // Let browser handle domain
    });

    return token;
};

// Function to get the appropriate frontend URL based on environment
export const getFrontendUrl = () => {
    const nodeEnv = process.env.NODE_ENV || 'development';

    if (nodeEnv === 'production') {
        return process.env.PRODUCTION_URL || 'https://lynqit.onrender.com';
    } else {
        return process.env.LOCAL_URL || 'http://localhost:5173';
    }
};