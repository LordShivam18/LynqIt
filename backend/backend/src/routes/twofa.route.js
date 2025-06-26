import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";

import {
    generate2FASetup,
    enable2FA,
    disable2FA,
    verify2FA,
    get2FAStatus,
    regenerateBackupCodes
} from "../controllers/twofa.controller.js";

const router = express.Router();

// 2FA setup and management routes (require authentication)
router.get("/status", protectRoute, get2FAStatus);
router.post("/setup", protectRoute, generate2FASetup);
router.post("/enable", protectRoute, enable2FA);
router.post("/disable", protectRoute, disable2FA);
router.post("/backup-codes", protectRoute, regenerateBackupCodes);

// 2FA verification route (for login process - no auth required)
router.post("/verify", verify2FA);

export default router;
