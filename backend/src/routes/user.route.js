import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  togglePinChat,
  togglePinGroup,
  getPinnedItems,
  blockUser,
  unblockUser,
  getBlockedUsers,
  reportUser,
  reportMessage,
  getReports
} from "../controllers/user.controller.js";

const router = express.Router();

// Pinned chats and groups routes
router.post("/pin/chat/:chatId", protectRoute, togglePinChat);
router.post("/pin/group/:groupId", protectRoute, togglePinGroup);
router.get("/pinned", protectRoute, getPinnedItems);

// Block/unblock user routes
router.post("/block/:userId", protectRoute, blockUser);
router.post("/unblock/:userId", protectRoute, unblockUser);
router.get("/blocked", protectRoute, getBlockedUsers);

// Report routes
router.post("/report/user", protectRoute, reportUser);
router.post("/report/message", protectRoute, reportMessage);
router.get("/reports", protectRoute, getReports); // Admin only - add admin middleware later

export default router;
