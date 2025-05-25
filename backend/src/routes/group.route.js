import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";

import {
    createGroup,
    getUserGroups,
    getGroupDetails,
    addGroupMembers,
    removeGroupMember,
    updateGroupSettings,
    getGroupInfo,
    joinGroupViaLink,
    promoteToAdmin,
    demoteFromAdmin,
    generateInviteLink,
    revokeInviteLink,
    deleteGroup,
    rotateGroupKey
} from "../controllers/group.controller.js";
import {
    getGroupMessages,
    sendGroupMessage,
    updateGroupMessageStatus,
    getGroupMessageInfo
} from "../controllers/message.controller.js";

const router = express.Router();

// Group management routes
router.get("/", protectRoute, getUserGroups);
router.post("/", protectRoute, createGroup);
router.get("/:groupId", protectRoute, getGroupDetails);
router.put("/:groupId", protectRoute, updateGroupSettings);
router.delete("/:groupId", protectRoute, deleteGroup);

// Group member management
router.post("/:groupId/members", protectRoute, addGroupMembers);
router.delete("/:groupId/members/:memberId", protectRoute, removeGroupMember);

// Admin management
router.post("/:groupId/members/:memberId/promote", protectRoute, promoteToAdmin);
router.post("/:groupId/members/:memberId/demote", protectRoute, demoteFromAdmin);

// Invite link management
router.post("/:groupId/invite-link", protectRoute, generateInviteLink);
router.delete("/:groupId/invite-link", protectRoute, revokeInviteLink);

// Encryption management
router.post("/:groupId/rotate-key", protectRoute, rotateGroupKey);

// Group messaging routes
router.get("/:groupId/messages", protectRoute, getGroupMessages);
router.post("/:groupId/messages", protectRoute, sendGroupMessage);
router.post("/messages/status/:status", protectRoute, updateGroupMessageStatus);
router.get("/messages/:messageId/info", protectRoute, getGroupMessageInfo);

// Group invite routes
router.get("/:groupId/info", getGroupInfo);
router.post("/:groupId/join", protectRoute, joinGroupViaLink);

export default router;
