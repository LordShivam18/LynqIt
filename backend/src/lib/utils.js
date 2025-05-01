import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { 
        expiresIn: "60d" 
    });

    res.cookie("jwt", token, { 
        maxAge: 60 * 24 * 60 * 60 * 1000, // 30 days in milisecons
        httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
        sameSite: "strict", // Helps prevent CSRF attacks  
        secure: process.env.NODE_ENV !== "development", // Set to true in production
    });

    return token;
};