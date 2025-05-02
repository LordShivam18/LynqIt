import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  getMessages, 
  getUsersForSidebar, 
  sendMessage, 
  reactToMessage, 
  updateMessageStatus,
  updateLastSeen,
  getUnreadCounts,
  deleteMessage,
  editMessage
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/unread", protectRoute, getUnreadCounts);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);
router.post("/react/:messageId", protectRoute, reactToMessage);
router.post("/status/:status", protectRoute, updateMessageStatus);
router.post("/lastseen", protectRoute, updateLastSeen);

router.put("/:id", protectRoute, editMessage);
router.delete("/:id", protectRoute, deleteMessage);

export default router;