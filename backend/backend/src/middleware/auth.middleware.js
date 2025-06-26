// middleware/auth.middleware.js
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
try {
let token;
// Check for token in Authorization header
if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
  token = req.headers.authorization.split(" ")[1];
}
// If not in header, check for cookie
else if (req.cookies?.jwt) {
  token = req.cookies.jwt;
}

// No token found
if (!token) {
  return res.status(401).json({ message: "Unauthorized - No Token Provided" });
}

// Verify token
const decoded = jwt.verify(token, process.env.JWT_SECRET);
if (!decoded) {
  return res.status(401).json({ message: "Unauthorized - Invalid Token" });
}

// Find user in database
const user = await User.findById(decoded.userId).select("-password");
if (!user) {
  return res.status(404).json({ message: "User not found" });
}

// Attach user to request
req.user = user;
next();
} catch (error) {
console.error("Error in protectRoute middleware:", error.message);
res.status(500).json({ message: "Internal server error" });
}
};
