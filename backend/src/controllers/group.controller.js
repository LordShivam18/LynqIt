import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { getFrontendUrl } from "../lib/utils.js";
import crypto from "crypto";

// Create a new group
export const createGroup = async (req, res) => {
    try {
        const { name, description, memberIds = [] } = req.body;
        const creatorId = req.user._id;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({ message: "Group name is required" });
        }

        if (name.length > 50) {
            return res.status(400).json({ message: "Group name must be 50 characters or less" });
        }

        // Validate member IDs
        if (memberIds.length > 0) {
            const validMembers = await User.find({ _id: { $in: memberIds } });
            if (validMembers.length !== memberIds.length) {
                return res.status(400).json({ message: "Some selected users are invalid" });
            }
        }

        // Create group with creator as admin and selected members
        const members = [
            {
                user: creatorId,
                role: 'admin',
                addedBy: creatorId
            },
            ...memberIds.map(memberId => ({
                user: memberId,
                role: 'member',
                addedBy: creatorId
            }))
        ];

        const group = new Group({
            name: name.trim(),
            description: description?.trim() || "",
            createdBy: creatorId,
            members
        });

        await group.save();

        // Populate the group with member details
        await group.populate('members.user', 'fullName username profilePic isOnline lastSeen');
        await group.populate('createdBy', 'fullName username profilePic');

        // Notify all members about the new group via Socket.IO
        members.forEach(member => {
            const memberSocketId = getReceiverSocketId(member.user);
            if (memberSocketId) {
                io.to(memberSocketId).emit("newGroup", group);
            }
        });

        res.status(201).json(group);
    } catch (error) {
        console.error("Error creating group:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get user's groups
export const getUserGroups = async (req, res) => {
    try {
        const userId = req.user._id;

        const groups = await Group.findByUser(userId);

        res.status(200).json(groups);
    } catch (error) {
        console.error("Error fetching user groups:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get group details
export const getGroupDetails = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId)
            .populate('members.user', 'fullName username profilePic isOnline lastSeen')
            .populate('createdBy', 'fullName username profilePic');

        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        if (!group.isMember(userId)) {
            return res.status(403).json({ message: "You are not a member of this group" });
        }

        res.status(200).json(group);
    } catch (error) {
        console.error("Error fetching group details:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Add members to group
export const addGroupMembers = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { memberIds } = req.body;
        const userId = req.user._id;

        if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
            return res.status(400).json({ message: "Member IDs are required" });
        }

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Check if user has permission to add members
        if (!group.isAdmin(userId) && !group.settings.allowMemberInvites) {
            return res.status(403).json({ message: "You don't have permission to add members" });
        }

        if (!group.isMember(userId)) {
            return res.status(403).json({ message: "You are not a member of this group" });
        }

        // Validate new member IDs
        const validMembers = await User.find({ _id: { $in: memberIds } });
        if (validMembers.length !== memberIds.length) {
            return res.status(400).json({ message: "Some selected users are invalid" });
        }

        // Filter out users who are already members
        const existingMemberIds = group.members.map(m => m.user.toString());
        const newMemberIds = memberIds.filter(id => !existingMemberIds.includes(id));

        if (newMemberIds.length === 0) {
            return res.status(400).json({ message: "All selected users are already members" });
        }

        // Add new members
        const newMembers = newMemberIds.map(memberId => ({
            user: memberId,
            role: 'member',
            addedBy: userId
        }));

        group.members.push(...newMembers);
        group.lastActivity = new Date();
        await group.save();

        // Populate and return updated group
        await group.populate('members.user', 'fullName username profilePic isOnline lastSeen');
        await group.populate('createdBy', 'fullName username profilePic');

        // Notify all group members about new additions
        group.members.forEach(member => {
            const memberSocketId = getReceiverSocketId(member.user._id);
            if (memberSocketId) {
                io.to(memberSocketId).emit("groupMembersAdded", {
                    groupId: group._id,
                    newMembers: newMembers,
                    addedBy: userId
                });
            }
        });

        res.status(200).json(group);
    } catch (error) {
        console.error("Error adding group members:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Remove member from group
export const removeGroupMember = async (req, res) => {
    try {
        const { groupId, memberId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        if (!group.isMember(userId)) {
            return res.status(403).json({ message: "You are not a member of this group" });
        }

        // Check permissions: admins can remove anyone, members can only remove themselves
        const isAdmin = group.isAdmin(userId);
        const isSelfRemoval = userId.toString() === memberId;

        if (!isAdmin && !isSelfRemoval) {
            return res.status(403).json({ message: "You don't have permission to remove this member" });
        }

        // Prevent removing the group creator unless they're removing themselves
        if (group.createdBy.toString() === memberId && !isSelfRemoval) {
            return res.status(403).json({ message: "Cannot remove the group creator" });
        }

        // Remove the member
        group.members = group.members.filter(m => m.user.toString() !== memberId);
        group.lastActivity = new Date();
        await group.save();

        // If group becomes empty, mark as inactive
        if (group.members.length === 0) {
            group.isActive = false;
            await group.save();
        }

        // Notify all remaining members and the removed member
        const allAffectedUsers = [...group.members.map(m => m.user), memberId];
        allAffectedUsers.forEach(affectedUserId => {
            const socketId = getReceiverSocketId(affectedUserId);
            if (socketId) {
                io.to(socketId).emit("groupMemberRemoved", {
                    groupId: group._id,
                    removedMemberId: memberId,
                    removedBy: userId
                });
            }
        });

        res.status(200).json({ message: "Member removed successfully" });
    } catch (error) {
        console.error("Error removing group member:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update group settings
export const updateGroupSettings = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name, description, avatar, settings } = req.body;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Check permissions for different types of updates
        const isOwner = group.createdBy.toString() === userId.toString();
        const isAdmin = group.isAdmin(userId);
        const isMember = group.isMember(userId);

        if (!isMember) {
            return res.status(403).json({ message: "You are not a member of this group" });
        }

        // Check specific permissions for each field
        if (name !== undefined) {
            const canChangeName = isOwner || isAdmin || group.settings.allowMemberNameChange;
            if (!canChangeName) {
                return res.status(403).json({ message: "You don't have permission to change the group name" });
            }
        }

        if (description !== undefined) {
            const canChangeDescription = isOwner || isAdmin || group.settings.allowMemberDescriptionChange;
            if (!canChangeDescription) {
                return res.status(403).json({ message: "You don't have permission to change the group description" });
            }
        }

        if (avatar !== undefined) {
            const canChangeAvatar = isOwner || isAdmin || group.settings.allowMemberAvatarChange;
            if (!canChangeAvatar) {
                return res.status(403).json({ message: "You don't have permission to change the group avatar" });
            }
        }

        if (settings !== undefined) {
            // Only admins and owners can change group settings
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ message: "Only admins can update group settings" });
            }
        }

        // Update fields if provided
        if (name !== undefined) {
            if (!name || name.trim().length === 0) {
                return res.status(400).json({ message: "Group name cannot be empty" });
            }
            if (name.length > 50) {
                return res.status(400).json({ message: "Group name must be 50 characters or less" });
            }
            group.name = name.trim();
        }

        if (description !== undefined) {
            if (description.length > 200) {
                return res.status(400).json({ message: "Description must be 200 characters or less" });
            }
            group.description = description.trim();
        }

        if (avatar !== undefined) {
            if (avatar) {
                // Upload new avatar to cloudinary
                const uploadResponse = await cloudinary.uploader.upload(avatar);
                group.avatar = uploadResponse.secure_url;
            } else {
                group.avatar = "";
            }
        }

        if (settings) {
            group.settings = { ...group.settings, ...settings };
        }

        group.lastActivity = new Date();
        await group.save();

        // Populate and return updated group
        await group.populate('members.user', 'fullName username profilePic isOnline lastSeen');
        await group.populate('createdBy', 'fullName username profilePic');

        // Notify all group members about the update
        group.members.forEach(member => {
            const memberSocketId = getReceiverSocketId(member.user._id);
            if (memberSocketId) {
                io.to(memberSocketId).emit("groupUpdated", group);
            }
        });

        res.status(200).json(group);
    } catch (error) {
        console.error("Error updating group settings:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get group info for invite page (public route)
export const getGroupInfo = async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await Group.findById(groupId)
            .populate('createdBy', 'fullName username profilePic')
            .populate('members.user', 'fullName username profilePic')
            .select('name description avatar createdAt createdBy members');

        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        res.status(200).json(group);
    } catch (error) {
        console.error("Error in getGroupInfo:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Join group via invite link
export const joinGroupViaLink = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { token } = req.body;
        const userId = req.user._id;

        // Validate inputs
        if (!groupId || !token) {
            return res.status(400).json({ message: "Group ID and token are required" });
        }

        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const group = await Group.findById(groupId)
            .populate('members.user', 'fullName username profilePic')
            .populate('createdBy', 'fullName username profilePic');

        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        if (!group.isActive) {
            return res.status(400).json({ message: "This group is no longer active" });
        }

        // Validate invite link
        if (!group.inviteLink || !group.inviteLink.isActive || !group.inviteLink.token) {
            return res.status(400).json({ message: "Invalid or expired invite link" });
        }

        if (group.inviteLink.token !== token) {
            return res.status(400).json({ message: "Invalid invite token" });
        }

        if (new Date() > group.inviteLink.expiresAt) {
            // Automatically deactivate expired links
            group.inviteLink.isActive = false;
            await group.save();
            return res.status(400).json({ message: "Invite link has expired" });
        }

        // Check if user is already a member
        const isAlreadyMember = group.members.some(member =>
            member.user._id.toString() === userId.toString()
        );

        if (isAlreadyMember) {
            return res.status(400).json({ message: "You are already a member of this group" });
        }

        // Add user to group
        group.members.push({
            user: userId,
            role: 'member',
            joinedAt: new Date(),
            addedBy: group.inviteLink.createdBy // Track who created the invite link
        });

        group.lastActivity = new Date();
        await group.save();

        // Populate the updated group
        const updatedGroup = await Group.findById(groupId)
            .populate('createdBy', 'fullName username profilePic')
            .populate('members.user', 'fullName username profilePic');

        // Emit socket event for new member
        const io = req.app.get('io');
        if (io) {
            // Notify all group members about the new member
            group.members.forEach(member => {
                if (member.user._id.toString() !== userId.toString()) {
                    io.to(member.user._id.toString()).emit('groupMembersAdded', {
                        groupId: group._id,
                        newMembers: [{
                            user: req.user,
                            role: 'member',
                            joinedAt: new Date()
                        }],
                        addedBy: req.user
                    });
                }
            });

            // Send join message to group
            const joinMessage = {
                _id: new Date().getTime().toString(),
                senderId: {
                    _id: 'system',
                    fullName: 'System',
                    username: 'system'
                },
                groupId: group._id,
                messageType: 'system',
                text: `${req.user.fullName} joined using the invitation link`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Emit to all group members
            group.members.forEach(member => {
                io.to(member.user._id.toString()).emit('newGroupMessage', {
                    message: joinMessage,
                    groupId: group._id
                });
            });
        }

        res.status(200).json(updatedGroup);
    } catch (error) {
        console.error("Error in joinGroupViaLink:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Promote member to admin
export const promoteToAdmin = async (req, res) => {
    try {
        const { groupId, memberId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Check if current user is admin or owner
        const isOwner = group.createdBy.toString() === userId.toString();
        const isAdmin = group.isAdmin(userId);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Only admins can promote members" });
        }

        // Find the member to promote
        const memberIndex = group.members.findIndex(m => m.user.toString() === memberId);
        if (memberIndex === -1) {
            return res.status(404).json({ message: "Member not found in group" });
        }

        // Check if member is already admin
        if (group.members[memberIndex].role === 'admin') {
            return res.status(400).json({ message: "Member is already an admin" });
        }

        // Promote to admin
        group.members[memberIndex].role = 'admin';
        group.lastActivity = new Date();
        await group.save();

        // Populate and return updated group
        await group.populate('members.user', 'fullName username profilePic isOnline lastSeen');
        await group.populate('createdBy', 'fullName username profilePic');

        // Notify all group members
        group.members.forEach(member => {
            const memberSocketId = getReceiverSocketId(member.user._id);
            if (memberSocketId) {
                io.to(memberSocketId).emit("groupUpdated", group);
            }
        });

        // Send system message
        const promotionMessage = {
            _id: new Date().getTime().toString(),
            senderId: {
                _id: 'system',
                fullName: 'System',
                username: 'system'
            },
            groupId: group._id,
            messageType: 'system',
            text: `${group.members[memberIndex].user.fullName} was promoted to admin by ${req.user.fullName}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Emit to all group members
        group.members.forEach(member => {
            io.to(member.user._id.toString()).emit('newGroupMessage', {
                message: promotionMessage,
                groupId: group._id
            });
        });

        res.status(200).json(group);
    } catch (error) {
        console.error("Error promoting to admin:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Demote admin to member
export const demoteFromAdmin = async (req, res) => {
    try {
        const { groupId, memberId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Check if current user is owner (only owner can demote admins)
        const isOwner = group.createdBy.toString() === userId.toString();
        if (!isOwner) {
            return res.status(403).json({ message: "Only the group owner can demote admins" });
        }

        // Find the member to demote
        const memberIndex = group.members.findIndex(m => m.user.toString() === memberId);
        if (memberIndex === -1) {
            return res.status(404).json({ message: "Member not found in group" });
        }

        // Check if member is admin
        if (group.members[memberIndex].role !== 'admin') {
            return res.status(400).json({ message: "Member is not an admin" });
        }

        // Prevent demoting the owner
        if (group.createdBy.toString() === memberId) {
            return res.status(403).json({ message: "Cannot demote the group owner" });
        }

        // Demote to member
        group.members[memberIndex].role = 'member';
        group.lastActivity = new Date();
        await group.save();

        // Populate and return updated group
        await group.populate('members.user', 'fullName username profilePic isOnline lastSeen');
        await group.populate('createdBy', 'fullName username profilePic');

        // Notify all group members
        group.members.forEach(member => {
            const memberSocketId = getReceiverSocketId(member.user._id);
            if (memberSocketId) {
                io.to(memberSocketId).emit("groupUpdated", group);
            }
        });

        // Send system message
        const demotionMessage = {
            _id: new Date().getTime().toString(),
            senderId: {
                _id: 'system',
                fullName: 'System',
                username: 'system'
            },
            groupId: group._id,
            messageType: 'system',
            text: `${group.members[memberIndex].user.fullName} was demoted from admin by ${req.user.fullName}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Emit to all group members
        group.members.forEach(member => {
            io.to(member.user._id.toString()).emit('newGroupMessage', {
                message: demotionMessage,
                groupId: group._id
            });
        });

        res.status(200).json(group);
    } catch (error) {
        console.error("Error demoting from admin:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Generate invite link
export const generateInviteLink = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { expiresIn = 7 } = req.body; // Default 7 days
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Check if user is admin or owner
        const isOwner = group.createdBy.toString() === userId.toString();
        const isAdmin = group.isAdmin(userId);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Only admins can generate invite links" });
        }

        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresIn);

        // Update group with invite link
        group.inviteLink = {
            token,
            expiresAt,
            createdBy: userId,
            isActive: true
        };

        await group.save();

        // Generate the full invite URL
        const baseUrl = getFrontendUrl();
        const inviteUrl = `${baseUrl}/join-group/${groupId}?token=${token}`;

        res.status(200).json({
            inviteUrl,
            token,
            expiresAt,
            expiresIn
        });
    } catch (error) {
        console.error("Error generating invite link:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Revoke invite link
export const revokeInviteLink = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Check if user is admin or owner
        const isOwner = group.createdBy.toString() === userId.toString();
        const isAdmin = group.isAdmin(userId);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Only admins can revoke invite links" });
        }

        // Revoke the invite link
        group.inviteLink = {
            token: null,
            expiresAt: null,
            createdBy: null,
            isActive: false
        };

        await group.save();

        res.status(200).json({ message: "Invite link revoked successfully" });
    } catch (error) {
        console.error("Error revoking invite link:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Delete group
export const deleteGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Only the group owner can delete the group
        const isOwner = group.createdBy.toString() === userId.toString();
        if (!isOwner) {
            return res.status(403).json({ message: "Only the group owner can delete the group" });
        }

        // Notify all group members about group deletion
        group.members.forEach(member => {
            const memberSocketId = getReceiverSocketId(member.user);
            if (memberSocketId) {
                io.to(memberSocketId).emit("groupDeleted", {
                    groupId: group._id,
                    deletedBy: userId
                });
            }
        });

        // Delete all messages in the group
        await Message.deleteMany({ groupId: group._id });

        // Delete the group
        await Group.findByIdAndDelete(groupId);

        res.status(200).json({ message: "Group deleted successfully" });
    } catch (error) {
        console.error("Error deleting group:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Rotate group encryption key
export const rotateGroupKey = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        // Find the group
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        // Check if user is admin or owner
        const member = group.members.find(m => m.user.toString() === userId.toString());
        if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
            return res.status(403).json({ error: "Only admins and owners can rotate encryption keys" });
        }

        // Update encryption key version
        const newKeyVersion = (group.encryption?.keyVersion || 1) + 1;

        await Group.findByIdAndUpdate(groupId, {
            'encryption.keyVersion': newKeyVersion,
            'encryption.lastKeyRotation': new Date()
        });

        // Emit key rotation event to all group members
        group.members.forEach(member => {
            const memberSocketId = getReceiverSocketId(member.user);
            if (memberSocketId) {
                io.to(memberSocketId).emit('groupKeyRotated', {
                    groupId: groupId,
                    newKeyVersion: newKeyVersion,
                    rotatedBy: userId
                });
            }
        });

        res.status(200).json({
            message: "Encryption key rotated successfully",
            newKeyVersion: newKeyVersion
        });
    } catch (error) {
        console.error("Error rotating group key:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
