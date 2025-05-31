import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { useChatStore } from "./useChatStore";

export const useGroupStore = create((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  isGroupsLoading: false,
  isGroupMessagesLoading: false,
  isCreatingGroup: false,
  groupTypingUsers: {}, // { groupId: [userIds] }

  // Get user's groups
  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");

      // Sort groups to show pinned ones first
      const sortedGroups = [...res.data].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });

      set({ groups: sortedGroups });
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast.error(error.response?.data?.message || "Failed to load groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  // Create a new group
  createGroup: async (groupData) => {
    set({ isCreatingGroup: true });
    try {
      const res = await axiosInstance.post("/groups", groupData);
      const newGroup = res.data;

      set(state => ({
        groups: [newGroup, ...state.groups]
      }));

      toast.success("Group created successfully!");
      return newGroup;
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error(error.response?.data?.message || "Failed to create group");
      throw error;
    } finally {
      set({ isCreatingGroup: false });
    }
  },

  // Get group messages
  getGroupMessages: async (groupId) => {
    set({ isGroupMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      set({ groupMessages: res.data });
    } catch (error) {
      console.error("Error fetching group messages:", error);
      toast.error(error.response?.data?.message || "Failed to load group messages");
    } finally {
      set({ isGroupMessagesLoading: false });
    }
  },

  // Send group message with Socket.IO optimization
  sendGroupMessage: async (groupId, messageData) => {
    const { selectedGroup, groupMessages } = get();
    const socket = useAuthStore.getState().socket;


    try {
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const pendingMessage = {
        _id: tempId,
        senderId: {
          _id: useAuthStore.getState().authUser._id,
          fullName: useAuthStore.getState().authUser.fullName,
          username: useAuthStore.getState().authUser.username,
          profilePic: useAuthStore.getState().authUser.profilePic
        },
        groupId: groupId,
        messageType: 'group',
        text: messageData.text || "",
        image: messageData.image,
        mediaType: messageData.mediaType,
        mentions: messageData.mentions || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'sending',
        reactions: [],
        isPending: true
      };

      // Instantly add message to UI for immediate feedback
      set({ groupMessages: [...groupMessages, pendingMessage] });

      // Try Socket.IO first for instant delivery
      let socketSuccess = false;
      if (socket && socket.connected) {
        try {


          // Send with acknowledgment for reliability
          const ackPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Socket timeout')), 5000);

            socket.emit("sendGroupMessage", {
              ...messageData,
              groupId: groupId,
              tempId: tempId
            }, (acknowledgment) => {
              clearTimeout(timeout);
              if (acknowledgment && acknowledgment.success) {
                resolve(acknowledgment);
              } else {
                reject(new Error(acknowledgment?.error || 'Socket send failed'));
              }
            });
          });

          const ack = await ackPromise;

          // Replace temp message with server response
          set(state => ({
            groupMessages: state.groupMessages.map(msg =>
              msg._id === tempId ? ack.message : msg
            )
          }));

          socketSuccess = true;
        } catch (socketError) {
          // Fallback to HTTP on socket failure
        }
      }

      // Fallback to HTTP if Socket.IO failed or unavailable
      if (!socketSuccess) {
        const res = await axiosInstance.post(`/groups/${groupId}/messages`, messageData);

        // Replace pending message with server response
        set({
          groupMessages: groupMessages
            .filter(msg => msg._id !== tempId)
            .concat(res.data)
        });
      }

      // Update group's last activity in groups list
      set(state => ({
        groups: state.groups.map(group =>
          group._id === groupId
            ? { ...group, lastActivity: new Date().toISOString() }
            : group
        )
      }));

    } catch (error) {
      console.error("Error sending group message:", error);
      toast.error("Failed to send message. Please try again.");

      // Update UI to show failed message
      set({
        groupMessages: groupMessages.map(msg =>
          msg.isPending ? { ...msg, status: 'failed', isPending: false } : msg
        )
      });
    }
  },

  // Add members to group
  addGroupMembers: async (groupId, memberIds) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/members`, { memberIds });
      const updatedGroup = res.data;

      // Update the group in the groups list
      set(state => ({
        groups: state.groups.map(group =>
          group._id === groupId ? updatedGroup : group
        ),
        selectedGroup: state.selectedGroup?._id === groupId ? updatedGroup : state.selectedGroup
      }));

      toast.success("Members added successfully!");
      return updatedGroup;
    } catch (error) {
      console.error("Error adding group members:", error);
      toast.error(error.response?.data?.message || "Failed to add members");
      throw error;
    }
  },

  // Remove member from group
  removeGroupMember: async (groupId, memberId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}/members/${memberId}`);

      // Update the group in the groups list
      set(state => ({
        groups: state.groups.map(group => {
          if (group._id === groupId) {
            return {
              ...group,
              members: group.members.filter(member => member.user._id !== memberId)
            };
          }
          return group;
        }),
        selectedGroup: state.selectedGroup?._id === groupId
          ? {
              ...state.selectedGroup,
              members: state.selectedGroup.members.filter(member => member.user._id !== memberId)
            }
          : state.selectedGroup
      }));

      toast.success("Member removed successfully!");
    } catch (error) {
      console.error("Error removing group member:", error);
      toast.error(error.response?.data?.message || "Failed to remove member");
      throw error;
    }
  },

  // Update group settings
  updateGroupSettings: async (groupId, settings) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}`, settings);
      const updatedGroup = res.data;

      // Update the group in the groups list
      set(state => ({
        groups: state.groups.map(group =>
          group._id === groupId ? updatedGroup : group
        ),
        selectedGroup: state.selectedGroup?._id === groupId ? updatedGroup : state.selectedGroup
      }));

      toast.success("Group settings updated successfully!");
      return updatedGroup;
    } catch (error) {
      console.error("Error updating group settings:", error);
      toast.error(error.response?.data?.message || "Failed to update group settings");
      throw error;
    }
  },

  // Set selected group
  setSelectedGroup: async (group) => {
    if (!group) {
      set({ selectedGroup: null });
      return;
    }

    // Reset unread counts and mark mentions as read for this group
    // The backend will handle unread count updates via Socket.IO events

    // Mark group chat as read using WhatsApp-style system
    try {
      await useChatStore.getState().markChatAsRead('group', group._id);
      await axiosInstance.post(`/messages/mentions/${group._id}/read`);

      // Force refresh groups list to update unread/mention badges
      console.log("🔄 Force refreshing groups list after marking as read");
      setTimeout(() => {
        get().getGroups();
      }, 200);
    } catch (error) {
      console.error("Error marking group as read:", error);
    }

    // If group doesn't have populated members, fetch full group details
    if (!group.members || !Array.isArray(group.members) ||
        group.members.length === 0 || !group.members[0]?.user?.username) {
      try {
        const res = await axiosInstance.get(`/groups/${group._id}`);
        const fullGroup = res.data;
        set({ selectedGroup: fullGroup });

        // Join the group room via socket
        if (socket) {
          console.log("🔗 Joining group room:", fullGroup._id);
          socket.emit("joinGroup", { groupId: fullGroup._id });
        } else {
          console.error("❌ No socket available to join group room");
        }
      } catch (error) {
        console.error("Error fetching group details:", error);
        set({ selectedGroup: group }); // Fallback to original group
      }
    } else {
      set({ selectedGroup: group });

      // Join the group room via socket
      if (socket) {
        console.log("🔗 Joining group room:", group._id);
        socket.emit("joinGroup", { groupId: group._id });
      } else {
        console.error("❌ No socket available to join group room");
      }
    }
  },

  // Subscribe to group-related socket events
  subscribeToGroupEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) {
      console.error("❌ No socket available for group events subscription");
      return;
    }

    console.log("✅ Subscribing to group events...", {
      socketId: socket.id,
      connected: socket.connected
    });

    // Listen for new group messages
    socket.on("newGroupMessage", ({ message, groupId }) => {
      console.log("📨 Received new group message:", { message, groupId });
      const currentSelectedGroup = get().selectedGroup;
      const currentUserId = useAuthStore.getState().authUser._id;

      // Play notification sound for new group messages
      try {
        // Only play notification if the message is from someone else
        if (message.senderId && 
            (typeof message.senderId === 'object' ? message.senderId._id !== currentUserId : message.senderId !== currentUserId)) {
          const notificationSound = new Audio('/sounds/message.mp3');
          notificationSound.volume = 0.5;
          notificationSound.play().catch(e => console.log("Audio play error:", e));
        }
      } catch (error) {
        console.error("Error playing group notification sound:", error);
      }

      // If this is the selected group, add message to current messages
      if (currentSelectedGroup && currentSelectedGroup._id === groupId) {
        console.log("✅ Adding message to current group conversation");
        
        set(state => ({
          groupMessages: [...state.groupMessages.filter(m => m._id !== message._id), message]
        }));

        // If we're not the sender, mark as seen after a delay and clear unread/mention badges
        if ((typeof message.senderId === 'object' ? message.senderId._id !== currentUserId : message.senderId !== currentUserId)) {
          setTimeout(async () => {
            // Mark as seen via socket
            const socket = useAuthStore.getState().socket;
            if (socket) {
              socket.emit("messageSeen", { messageIds: [message._id] });
              console.log("✓ Emitted messageSeen for group message:", message._id);
            }

            // Mark chat as read to clear unread badges
            try {
              console.log("📨 Marking group chat as read:", groupId);
              await useChatStore.getState().markChatAsRead('group', groupId);

              // If this message has mentions, mark them as read too
              const isMentioned = message.mentions && message.mentions.some(mention =>
                (typeof mention.user === 'object' ? mention.user._id : mention.user) === currentUserId
              );

              if (isMentioned) {
                console.log("🏷️ Auto-marking mention as read for viewed message");
                await axiosInstance.post(`/messages/mentions/${groupId}/read`);
              }

              // Force refresh groups list to immediately update badges
              console.log("🔄 Auto-clearing badges for viewed group message");
              setTimeout(() => {
                get().getGroups();
              }, 100);
            } catch (error) {
              console.error("Error auto-marking group as read:", error);
            }
          }, 1000);
        }
      } else {
        // If we're not viewing this group and we're not the sender,
        // Show a notification toast
        const messageSenderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
        if (messageSenderId !== currentUserId) {
          try {
            // Find the group name
            const group = get().groups.find(g => g._id === groupId);
            const groupName = group ? group.name : 'Group chat';
            
            // Find the sender's name
            const senderName = typeof message.senderId === 'object' 
              ? (message.senderId.fullName || message.senderId.username) 
              : 'Someone';
              
            // Create message preview
            const messagePreview = message.text 
              ? (message.text.length > 30 ? `${message.text.slice(0, 30)}...` : message.text)
              : (message.image ? 'Sent an image' : 'New message');
              
            // Check if the user is mentioned
            const isMentioned = message.mentions && message.mentions.some(mention => 
              (typeof mention.user === 'object' ? mention.user._id : mention.user) === currentUserId);
            
            // Show appropriate toast with different styling if mentioned
            if (isMentioned) {
              toast.success(`${senderName} mentioned you in ${groupName}`, {
                duration: 5000,
                position: 'top-right',
                icon: '🔔',
                style: { background: '#FEF3C7', color: '#92400E' }
              });
            } else {
              toast.success(`${groupName}: ${senderName} - ${messagePreview}`, {
                duration: 4000,
                position: 'top-right',
                icon: '👥'
              });
            }
          } catch (error) {
            console.error("Error showing group message notification:", error);
          }
        }
      }

      // Update group's last activity in groups list
      set(state => ({
        groups: state.groups.map(group =>
          group._id === groupId
            ? { ...group, lastActivity: new Date().toISOString() }
            : group
        )
      }));

      // Force refresh groups list to update sidebar with latest message info
      console.log("🔄 Force refreshing groups list due to new message");
      setTimeout(() => {
        get().getGroups();
      }, 100);
    });

    // Listen for new groups
    socket.on("newGroup", (group) => {
      set(state => ({
        groups: [group, ...state.groups]
      }));
      toast.success(`You've been added to group: ${group.name}`);
    });

    // Listen for group updates
    socket.on("groupUpdated", (updatedGroup) => {
      set(state => ({
        groups: state.groups.map(group =>
          group._id === updatedGroup._id ? updatedGroup : group
        ),
        selectedGroup: state.selectedGroup?._id === updatedGroup._id ? updatedGroup : state.selectedGroup
      }));
    });

    // Listen for group deletion
    socket.on("groupDeleted", ({ groupId, deletedBy }) => {
      set(state => ({
        groups: state.groups.filter(group => group._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup
      }));
    });

    // Listen for member additions
    socket.on("groupMembersAdded", ({ groupId, newMembers, addedBy }) => {
      set(state => ({
        groups: state.groups.map(group => {
          if (group._id === groupId) {
            return {
              ...group,
              members: [...group.members, ...newMembers]
            };
          }
          return group;
        })
      }));
    });

    // Listen for member removals
    socket.on("groupMemberRemoved", ({ groupId, removedMemberId, removedBy }) => {
      const currentUserId = useAuthStore.getState().authUser._id;

      // If current user was removed, remove group from list
      if (removedMemberId === currentUserId) {
        set(state => ({
          groups: state.groups.filter(group => group._id !== groupId),
          selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup
        }));
        toast.info("You have been removed from the group");
      } else {
        // Update group member list
        set(state => ({
          groups: state.groups.map(group => {
            if (group._id === groupId) {
              return {
                ...group,
                members: group.members.filter(member => member.user._id !== removedMemberId)
              };
            }
            return group;
          })
        }));
      }
    });

    // Listen for typing indicators
    // socket.on("userTyping", ({ userId, groupId, isTyping }) => {
    //   const state = get();
    //   const currentTyping = state.groupTypingUsers[groupId] || [];
    //   let newTyping;

    //   if (isTyping) {
    //     newTyping = currentTyping.includes(userId) ? currentTyping : [...currentTyping, userId];
    //   } else {
    //     newTyping = currentTyping.filter(id => id !== userId);
    //   }

    //   set({
    //     groupTypingUsers: {
    //       ...state.groupTypingUsers,
    //       [groupId]: newTyping
    //     }
    //   });
    // });

    // Listen for group key rotation events
    socket.on("groupKeyRotated", async ({ groupId, newKeyVersion, rotatedBy }) => {
      try {
        // Import encryption utilities
        const { rotateGroupKey } = await import('../utils/encryption');

        // Rotate the local encryption key
        await rotateGroupKey(groupId);

        // Show notification if current user didn't rotate the key
        const currentUserId = useAuthStore.getState().authUser._id;
        if (rotatedBy !== currentUserId) {
          toast.info("Group encryption key has been rotated for enhanced security");
        }
      } catch (error) {
        console.error("Error handling group key rotation:", error);
      }
    });

    // Listen for unread count updates (shared with chat store)
    socket.on("unreadCountUpdate", (unreadCounts) => {
      console.log("📊 Received unread count update in group store:", unreadCounts);
      // Update the chat store's unread counts since it's the source of truth
      // Import at runtime to avoid circular dependency
      import('./useChatStore').then(({ useChatStore }) => {
        useChatStore.setState({ unreadCounts });
      });

      // Force refresh groups list to update sidebar with latest unread counts
      setTimeout(() => {
        get().getGroups();
      }, 100);
    });

    // Listen for message status updates
    socket.on("messageStatusUpdate", ({ messageIds, status, timestamp }) => {
      const currentGroupMessages = get().groupMessages;

      // Update the status of specific group messages
      const updatedMessages = currentGroupMessages.map(message => {
        if (messageIds.includes(message._id)) {
          return {
            ...message,
            status,
            ...(status === 'delivered' ? { deliveredAt: timestamp } : {}),
            ...(status === 'seen' ? { seenAt: timestamp } : {})
          };
        }
        return message;
      });

      set({ groupMessages: updatedMessages });
    });

    // Listen for mention notifications
    socket.on("userMentioned", ({ messageId, groupId, senderName, timestamp }) => {

      const currentSelectedGroup = get().selectedGroup;

      // If we're currently viewing this group, auto-mark the mention as read
      if (currentSelectedGroup && currentSelectedGroup._id === groupId) {
        console.log("🏷️ Auto-marking mention as read (currently viewing group)");
        setTimeout(async () => {
          try {
            await axiosInstance.post(`/messages/mentions/${groupId}/read`);
            // Force refresh to clear mention badge immediately
            get().getGroups();
          } catch (error) {
            console.error("Error auto-marking mention as read:", error);
          }
        }, 500);
      } else {
        // Force refresh groups list to update mention badges
        console.log("🔄 Force refreshing groups list due to mention");
        setTimeout(() => {
          get().getGroups();
        }, 100);
      }
    });
  },

  // Unsubscribe from group events
  unsubscribeFromGroupEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newGroupMessage");
      socket.off("newGroup");
      socket.off("groupUpdated");
      socket.off("groupMembersAdded");
      socket.off("groupMemberRemoved");
      // socket.off("userTyping");
      socket.off("groupKeyRotated");
      socket.off("unreadCountUpdate");
      socket.off("userMentioned");
    }
  },

  // Join group via invite link
  joinGroupViaLink: async (groupId, token) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/join`, { token });
      const joinedGroup = res.data;

      // Add group to groups list if not already there
      set(state => {
        const existingGroup = state.groups.find(g => g._id === groupId);
        if (!existingGroup) {
          return {
            groups: [joinedGroup, ...state.groups]
          };
        }
        return {
          groups: state.groups.map(g => g._id === groupId ? joinedGroup : g)
        };
      });

      toast.success(`Welcome to ${joinedGroup.name}!`);
      return joinedGroup;
    } catch (error) {
      console.error("Error joining group:", error);
      toast.error(error.response?.data?.message || "Failed to join group");
      throw error;
    }
  },

  // Promote member to admin
  promoteToAdmin: async (groupId, memberId) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/members/${memberId}/promote`);
      const updatedGroup = res.data;

      // Update the group in the groups list
      set(state => ({
        groups: state.groups.map(group =>
          group._id === groupId ? updatedGroup : group
        ),
        selectedGroup: state.selectedGroup?._id === groupId ? updatedGroup : state.selectedGroup
      }));

      toast.success("Member promoted to admin successfully!");
      return updatedGroup;
    } catch (error) {
      console.error("Error promoting to admin:", error);
      toast.error(error.response?.data?.message || "Failed to promote member");
      throw error;
    }
  },

  // Demote admin to member
  demoteFromAdmin: async (groupId, memberId) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/members/${memberId}/demote`);
      const updatedGroup = res.data;

      // Update the group in the groups list
      set(state => ({
        groups: state.groups.map(group =>
          group._id === groupId ? updatedGroup : group
        ),
        selectedGroup: state.selectedGroup?._id === groupId ? updatedGroup : state.selectedGroup
      }));

      toast.success("Admin demoted to member successfully!");
      return updatedGroup;
    } catch (error) {
      console.error("Error demoting from admin:", error);
      toast.error(error.response?.data?.message || "Failed to demote admin");
      throw error;
    }
  },

  // Generate invite link
  generateInviteLink: async (groupId, expiresIn = 7) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/invite-link`, { expiresIn });
      toast.success("Invite link generated successfully!");
      return res.data;
    } catch (error) {
      console.error("Error generating invite link:", error);
      toast.error(error.response?.data?.message || "Failed to generate invite link");
      throw error;
    }
  },

  // Revoke invite link
  revokeInviteLink: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}/invite-link`);
      toast.success("Invite link revoked successfully!");
    } catch (error) {
      console.error("Error revoking invite link:", error);
      toast.error(error.response?.data?.message || "Failed to revoke invite link");
      throw error;
    }
  },

  // Delete group
  deleteGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}`);

      // Remove group from state
      set(state => ({
        groups: state.groups.filter(group => group._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup
      }));

      toast.success("Group deleted successfully!");
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error(error.response?.data?.message || "Failed to delete group");
      throw error;
    }
  },

  // Join group via invite link
  joinGroupViaLink: async (groupId, token) => {
    try {
      // Validate inputs
      if (!groupId || !token) {
        throw new Error("Group ID and token are required");
      }

      const res = await axiosInstance.post(`/groups/${groupId}/join`, { token });
      const joinedGroup = res.data;

      // Add to groups list if not already there
      set(state => {
        const existingGroup = state.groups.find(g => g._id === groupId);
        if (!existingGroup) {
          return {
            groups: [joinedGroup, ...state.groups]
          };
        }
        return {
          groups: state.groups.map(g => g._id === groupId ? joinedGroup : g)
        };
      });

      // Join the group room via socket for real-time updates
      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("joinGroup", { groupId: joinedGroup._id });
      }

      toast.success(`Welcome to ${joinedGroup.name}!`);
      return joinedGroup;
    } catch (error) {
      console.error("Error joining group:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to join group";
      toast.error(errorMessage);
      throw error;
    }
  },

  // Navigate to first unread mention in a group
  navigateToFirstMention: async (groupId) => {
    try {
      const res = await axiosInstance.get(`/messages/mentions/${groupId}/first`);
      const firstMention = res.data;

      if (firstMention && firstMention.messageId) {
        // Return the message ID to scroll to
        return firstMention.messageId._id;
      }

      return null;
    } catch (error) {
      console.error("Error getting first mention:", error);
      return null;
    }
  },

  // Extract mentions from text for replies
  extractMentionsFromText: (messageText) => {
    const { selectedGroup } = get();
    if (!selectedGroup?.members) return [];

    const mentions = [];
    const mentionRegex = /@(\w+)/g;
    let match;

    while ((match = mentionRegex.exec(messageText)) !== null) {
      const username = match[1];
      const offset = match.index;
      const length = match[0].length;

      // Find the user in group members
      const member = selectedGroup.members.find(m =>
        m.user.username === username ||
        m.user.fullName.toLowerCase().replace(/\s+/g, '') === username.toLowerCase()
      );

      if (member) {
        mentions.push({
          user: member.user._id,
          username: member.user.username,
          offset,
          length
        });
      }
    }

    return mentions;
  },

  // Reply to a group message
  replyToGroupMessage: async (messageId, replyText, image = null, mediaType = null) => {
    const { selectedGroup, groupMessages } = get();

    try {
      // Get the original message from current messages
      const replyingTo = groupMessages.find(msg => msg._id === messageId);

      // Extract mentions from reply text
      const mentions = get().extractMentionsFromText(replyText || "");

      // Optimistically update UI with pending reply message
      const tempId = `temp-group-reply-${Date.now()}`;
      const pendingReply = {
        _id: tempId,
        senderId: {
          _id: useAuthStore.getState().authUser._id,
          fullName: useAuthStore.getState().authUser.fullName,
          username: useAuthStore.getState().authUser.username,
          profilePic: useAuthStore.getState().authUser.profilePic
        },
        groupId: selectedGroup._id,
        messageType: 'group',
        text: replyText || "",
        image: image,
        mediaType: mediaType,
        replyTo: replyingTo, // Use the full replyingTo object
        isReply: true,
        mentions: mentions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'sending',
        reactions: [],
        isPending: true
      };

      // Add pending reply to state
      set({ groupMessages: [...groupMessages, pendingReply] });

      const messageData = {
        text: replyText,
        image,
        mediaType,
        groupId: selectedGroup._id,
        mentions: mentions
      };

      const res = await axiosInstance.post(`/messages/reply/${messageId}`, messageData);

      // Replace pending message with server response
      set({
        groupMessages: groupMessages
          .filter(msg => msg._id !== tempId) // Remove temporary message
          .concat(res.data) // Add confirmed message
      });

      return res.data;
    } catch (error) {
      console.error("Error replying to group message:", error);
      toast.error("Failed to send reply");

      // Update UI to show failed message
      set({
        groupMessages: groupMessages.map(msg =>
          msg.isPending ? { ...msg, status: 'failed', isPending: false } : msg
        )
      });

      throw error;
    }
  },

  // Clear group data
  clearGroupData: () => {
    set({
      groups: [],
      selectedGroup: null,
      groupMessages: [],
      groupTypingUsers: {}
    });
  }
}));
