import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: "60d"
    });

    res.cookie("jwt", token, {
        maxAge: 60 * 24 * 60 * 60 * 1000, // 60 days in milliseconds
        httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict", // Allow cross-site cookies in production
        secure: process.env.NODE_ENV === "production", // Set to true in production for HTTPS
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