// auth.route.js
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
    resetPassword,
    checkEmailExists,
    savePublicKey,
    getPublicKey,
    saveFaceEmbedding,
    faceLogin
} from "../controllers/auth.controller.js";

import {
    requestOTP,
    verifyUserOTP,
    resendOTP
} from "../controllers/otp.controller.js";

import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

/* ============================== */
/* === AUTHENTICATION ROUTES ==== */
/* ============================== */
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/google", googleAuth);
router.get("/google/health", (_req, res) =>
  res.status(200).json({
    message: "Google OAuth endpoint is accessible",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  })
);

/* ==================== */
/* === OTP ROUTES ===== */
/* ==================== */
router.post("/request-otp", requestOTP);
router.post("/verify-otp", verifyUserOTP);
router.post("/resend-otp", resendOTP);

/* ========================== */
/* === PASSWORD RECOVERY ==== */
/* ========================== */
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/check-email", checkEmailExists);

/* ========================== */
/* === USER MANAGEMENT ====== */
/* ========================== */
router.put("/update-profile", protectRoute, updateProfile);
router.get("/check", protectRoute, checkAuth);
router.get("/users", protectRoute, getAllUsers);
router.delete("/delete-account", protectRoute, deleteAccount);

/* ============================ */
/* === ENCRYPTION / KEYS ===== */
/* ============================ */
router.post("/save-public-key", protectRoute, savePublicKey);
router.get("/get-public-key/:userId", protectRoute, getPublicKey);

/* =========================== */
/* === FACE AUTH ROUTES ===== */
/* =========================== */
router.post("/save-embedding", protectRoute, saveFaceEmbedding); // Requires JWT
router.post("/face-login", faceLogin);                           // Public

export default router;