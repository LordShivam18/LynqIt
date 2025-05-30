import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";

import {
  getMessages,
  getUsersForSidebar,
  sendMessage,
  reactToMessage,
  updateMessageStatus,
  updateLastSeen,
  deleteMessage,
  editMessage,
  replyToMessage,
  markMentionsAsRead,
  getFirstUnreadMention,
  forwardMessage
} from "../controllers/message.controller.js";

import {
  markChatAsRead,
  getUnreadCounts,
  syncUnreadCounts
} from "../controllers/unreadCounter.controller.js";

const router = express.Router();

// Specific routes MUST come before parameterized routes
// Unread counter routes (WhatsApp-style)
router.get("/unread-counts", protectRoute, getUnreadCounts);
router.post("/read", protectRoute, markChatAsRead);
router.post("/sync-counts", protectRoute, syncUnreadCounts);

// Mention management routes
router.post("/mentions/:groupId/read", protectRoute, markMentionsAsRead);
router.get("/mentions/:groupId/first", protectRoute, getFirstUnreadMention);

// Message retrieval routes
router.get("/users", protectRoute, getUsersForSidebar);
router.get("/unread", protectRoute, getUnreadCounts); // Legacy route
router.get("/:id", protectRoute, getMessages);

// Message sending and interaction routes
router.post("/send/:id", protectRoute, sendMessage);
router.post("/reply/:messageId", protectRoute, replyToMessage);
router.post("/react/:messageId", protectRoute, reactToMessage);
router.post("/status/:status", protectRoute, updateMessageStatus);
router.post("/lastseen", protectRoute, updateLastSeen);
router.post("/reaction", protectRoute, reactToMessage);
router.post("/reply", protectRoute, replyToMessage);
router.post("/forward", protectRoute, forwardMessage);

// Message modification routes
router.put("/:id", protectRoute, editMessage);
router.delete("/:id", protectRoute, deleteMessage);

export default router;