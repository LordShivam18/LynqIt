import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createTextStatus,
  createImageStatus,
  getMyStatuses,
  getContactStatuses,
  viewStatus,
  deleteStatus,
  getStatusViewers,
  addReaction,
  removeReaction,
  getStatusReactions,
  addStatusMessage,
  getStatusMessages,
  replyToStatus,
  muteStatus,
  unmuteStatus,
  reportStatus
} from "../controllers/status.controller.js";
import { uploadMemory } from "../middleware/multer.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Create text status
router.post("/text", createTextStatus);

// Create image status with file upload
router.post("/image", uploadMemory.single("image"), createImageStatus);

// Get my statuses
router.get("/my-statuses", getMyStatuses);

// Get contact statuses (statuses from users I have conversations with)
router.get("/contacts", getContactStatuses);

// View a specific status (marks as viewed)
router.post("/view/:statusId", viewStatus);

// Get viewers of a specific status
router.get("/viewers/:statusId", getStatusViewers);

// Delete my status
router.delete("/:statusId", deleteStatus);

// Add reaction to status
router.post("/:statusId/reaction", addReaction);

// Remove reaction from status
router.delete("/:statusId/reaction", removeReaction);

// Get status reactions
router.get("/:statusId/reactions", getStatusReactions);

// Add message to status
router.post("/:statusId/message", addStatusMessage);

// Reply to status (creates direct message)
router.post("/:statusId/reply", replyToStatus);

// Get status messages
router.get("/:statusId/messages", getStatusMessages);

// Mute status
router.post("/:statusId/mute", muteStatus);

// Unmute status
router.delete("/:statusId/mute", unmuteStatus);

// Report status
router.post("/:statusId/report", reportStatus);

export default router;
