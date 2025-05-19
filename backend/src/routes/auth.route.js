import express from "express";
import {
    checkAuth,
    login,
    logout,
    signup,
    updateProfile,
    getAllUsers,
    googleAuth,
    deleteAccount,
    forgotPassword,
    resetPassword
} from "../controllers/auth.controller.js";
import { requestOTP, verifyUserOTP, resendOTP } from "../controllers/otp.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Standard auth routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/google", googleAuth);

// OTP verification routes
router.post("/request-otp", requestOTP);
router.post("/verify-otp", verifyUserOTP);
router.post("/resend-otp", resendOTP);

// Password reset routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.put("/update-profile", protectRoute, updateProfile);

router.get("/check", protectRoute, checkAuth);
router.get("/users", protectRoute, getAllUsers);

router.delete("/delete-account", protectRoute, deleteAccount);

export default router;