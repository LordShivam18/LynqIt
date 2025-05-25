import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { useStatusStore } from "./useStatusStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [], // Users with existing conversations
  allUsers: [], // All users for search
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  userStatuses: {}, // Holds online status and last seen times
  unreadCounts: {
    personal: {},
    groups: {},
    mentions: {},
    totalPersonal: 0,
    totalGroups: 0,
    totalMentions: 0
  },
  replyingTo: null, // Tracks number of unread messages per user
  isDeletingMessage: false,
  connectionStatus: 'connected', // 'connected', 'connecting', 'disconnected'
  lastMessageTimestamp: null, // Track last message received time for auto-refresh

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");

      // Sort users to show pinned ones first
      const sortedUsers = [...res.data].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });

      set({ users: sortedUsers });

      // Get unread count for each user
      await get().getUnreadCounts();
    } catch (error) {
      console.error("Error in getUsers:", error);
      toast.error(error.response?.data?.message || "Failed to load contacts");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getUnreadCounts: async () => {
    try {
      const res = await axiosInstance.get("/messages/unread-counts");
      set({ unreadCounts: res.data });
      return res.data;
    } catch (error) {
      console.error("Error fetching unread counts:", error);
      return {
        personal: {},
        groups: {},
        mentions: {},
        totalPersonal: 0,
        totalGroups: 0,
        totalMentions: 0
      };
    }
  },

  getAllUsers: async () => {
    try {
      const res = await axiosInstance.get("/auth/users");
      set({ allUsers: res.data });
    } catch (error) {
      console.error("Error fetching all users:", error);
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });

      // Set the timestamp of the latest message for auto-refresh comparison
      if (res.data && res.data.length > 0) {
        const latestMessage = [...res.data].sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        )[0];
        set({ lastMessageTimestamp: new Date(latestMessage.createdAt).getTime() });
      }

      // Mark received messages as delivered
      const messagesToMark = res.data
        .filter(msg =>
          msg.receiverId === useAuthStore.getState().authUser._id &&
          msg.status === 'sent'
        )
        .map(msg => msg._id);

      if (messagesToMark.length > 0) {
        get().markMessagesAsDelivered(messagesToMark);
      }

      // Mark all as seen if chat is currently open and mark chat as read
      setTimeout(() => {
        if (get().selectedUser?._id === userId) {
          get().markMessagesAsSeen(messagesToMark);

          // Mark chat as read using the proper API
          get().markChatAsRead('direct', userId);
        }
      }, 1000);
    } catch (error) {
      console.error("Error in getMessages:", error);
      toast.error(error.response?.data?.message || "Failed to load messages");

      // If there was an error loading messages, try to reconnect socket
      get().handleSocketReconnect();
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // Handle socket disconnection and reconnection
  handleSocketReconnect: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      // Check socket status
      if (!socket.connected) {
        set({ connectionStatus: 'connecting' });

        // Try to reconnect
        socket.connect();

        // Re-subscribe to messages
        get().resubscribeToMessages();

        toast.success("Reconnecting to chat server...");
      }
    } else {
      // No socket, try to create a new one
      useAuthStore.getState().connectSocket();
      set({ connectionStatus: 'connecting' });

      setTimeout(() => {
        const newSocket = useAuthStore.getState().socket;
        if (newSocket && newSocket.connected) {
          set({ connectionStatus: 'connected' });
          get().resubscribeToMessages();
          toast.success("Chat connection restored");
        } else {
          set({ connectionStatus: 'disconnected' });
          toast.error("Could not connect to chat server. Please refresh the page.");
        }
      }, 2000);
    }
  },

  // Re-subscribe to message events
  resubscribeToMessages: () => {
    get().unsubscribeFromMessages();
    get().subscribeToMessages();

    // Refresh current conversation if any
    if (get().selectedUser) {
      get().getMessages(get().selectedUser._id);
    }
  },

  // Mark chat as read (WhatsApp-style)
  markChatAsRead: async (chatType, targetId, messageId = null) => {
    try {
      const res = await axiosInstance.post("/messages/read", {
        chatType,
        targetId,
        messageId
      });

      // Update local unread counts
      set({ unreadCounts: res.data.unreadCounts });
      return res.data;
    } catch (error) {
      console.error("Error marking chat as read:", error);
    }
  },

  resetUnreadCount: (userId) => {
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        personal: {
          ...state.unreadCounts.personal,
          [userId]: 0
        },
        totalPersonal: Math.max(0, (state.unreadCounts.totalPersonal || 0) - (state.unreadCounts.personal?.[userId] || 0))
      }
    }));
  },

  incrementUnreadCount: (userId) => {
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        personal: {
          ...state.unreadCounts.personal,
          [userId]: (state.unreadCounts.personal?.[userId] || 0) + 1
        },
        totalPersonal: (state.unreadCounts.totalPersonal || 0) + 1
      }
    }));
  },

  // Group unread count functions
  resetGroupUnreadCount: (groupId) => {
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        groups: {
          ...state.unreadCounts.groups,
          [groupId]: 0
        },
        mentions: {
          ...state.unreadCounts.mentions,
          [groupId]: 0
        },
        totalGroups: Math.max(0, (state.unreadCounts.totalGroups || 0) - (state.unreadCounts.groups?.[groupId] || 0)),
        totalMentions: Math.max(0, (state.unreadCounts.totalMentions || 0) - (state.unreadCounts.mentions?.[groupId] || 0))
      }
    }));
  },

  incrementGroupUnreadCount: (groupId) => {
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        groups: {
          ...state.unreadCounts.groups,
          [groupId]: (state.unreadCounts.groups?.[groupId] || 0) + 1
        },
        totalGroups: (state.unreadCounts.totalGroups || 0) + 1
      }
    }));
  },

  incrementMentionCount: (groupId) => {
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        mentions: {
          ...state.unreadCounts.mentions,
          [groupId]: (state.unreadCounts.mentions?.[groupId] || 0) + 1
        },
        totalMentions: (state.unreadCounts.totalMentions || 0) + 1
      }
    }));
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const socket = useAuthStore.getState().socket;

    try {
      // Optimistically update UI with instant feedback
      const tempId = `temp-${Date.now()}`;
      const pendingMessage = {
        _id: tempId,
        senderId: useAuthStore.getState().authUser._id,
        receiverId: selectedUser._id,
        text: messageData.text || "",
        image: messageData.image,
        mediaType: messageData.mediaType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'sending',
        reactions: [],
        isPending: true
      };

      // Instantly add message to UI for immediate feedback
      set({ messages: [...messages, pendingMessage] });

      // Try Socket.IO first for instant delivery
      let socketSuccess = false;
      if (socket && socket.connected) {
        try {
          console.log("📤 Sending message via Socket.IO for instant delivery");

          // Send with acknowledgment for reliability
          const ackPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Socket timeout')), 5000);

            socket.emit("sendMessage", {
              ...messageData,
              receiverId: selectedUser._id,
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
          console.log("✅ Message sent via Socket.IO:", ack);

          // Replace temp message with server response
          set(state => ({
            messages: state.messages.map(msg =>
              msg._id === tempId ? ack.message : msg
            ),
            lastMessageTimestamp: new Date(ack.message.createdAt).getTime()
          }));

          socketSuccess = true;
        } catch (socketError) {
          console.warn("⚠️ Socket.IO send failed, falling back to HTTP:", socketError);
        }
      }

      // Fallback to HTTP if Socket.IO failed or unavailable
      if (!socketSuccess) {
        console.log("📤 Sending message via HTTP");
        const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);

        // Replace pending message with server response
        set({
          messages: messages
            .filter(msg => msg._id !== tempId)
            .concat(res.data),
          lastMessageTimestamp: new Date(res.data.createdAt).getTime()
        });
      }

      // Refresh users list for sidebar update
      get().getUsers();

    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");

      // Update UI to show failed message with retry option
      set({
        messages: messages.map(msg =>
          msg.isPending ? { ...msg, status: 'failed', isPending: false } : msg
        )
      });

      // Try to reconnect if connection issues
      get().handleSocketReconnect();
    }
  },

  // Try to resend a failed message
  resendMessage: async (failedMessageId) => {
    const { messages, selectedUser } = get();
    const failedMessage = messages.find(msg => msg._id === failedMessageId);

    if (!failedMessage) return;

    // Remove the failed message from the list
    set({
      messages: messages.filter(msg => msg._id !== failedMessageId)
    });

    // Reconstruct message data
    const messageData = {
      text: failedMessage.text || "",
      image: failedMessage.image,
      mediaType: failedMessage.mediaType
    };

    // Send it again
    await get().sendMessage(messageData);
  },

  // Set reply target
  setReplyingTo: (message) => {
    set({ replyingTo: message });
  },

  // Clear reply target
  clearReplyingTo: () => {
    set({ replyingTo: null });
  },

  // Reply to a message
  replyToMessage: async (messageId, replyText, image = null, mediaType = null) => {
    const { selectedUser, replyingTo, messages } = get();

    try {
      // Optimistically update UI with pending reply message
      const tempId = `temp-reply-${Date.now()}`;
      const pendingReply = {
        _id: tempId,
        senderId: useAuthStore.getState().authUser._id,
        receiverId: selectedUser._id,
        text: replyText || "",
        image: image,
        mediaType: mediaType,
        replyTo: replyingTo, // Use the full replyingTo object
        isReply: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'sending',
        reactions: [],
        isPending: true
      };

      // Add pending reply to state
      set({ messages: [...messages, pendingReply] });

      const messageData = {
        text: replyText,
        image,
        mediaType,
        receiverId: selectedUser?._id
      };

      const res = await axiosInstance.post(`/messages/reply/${messageId}`, messageData);

      // Replace pending message with server response
      set({
        messages: messages
          .filter(msg => msg._id !== tempId) // Remove temporary message
          .concat(res.data), // Add confirmed message
        replyingTo: null // Clear reply state
      });

      // Automatically refresh users list to update sidebar with latest conversation
      get().getUsers();

      return res.data;
    } catch (error) {
      console.error("Error replying to message:", error);
      toast.error("Failed to send reply");

      // Update UI to show failed message
      set({
        messages: messages.map(msg =>
          msg.isPending ? { ...msg, status: 'failed', isPending: false } : msg
        )
      });

      throw error;
    }
  },

  reactToMessage: async (messageId, emoji) => {
    try {
      // Optimistic update
      const currentMessages = get().messages;
      const userId = useAuthStore.getState().authUser._id;

      // Check if already reacted with same emoji
      const messageToUpdate = currentMessages.find(m => m._id === messageId);

      if (!messageToUpdate) return;

      const existingReactionWithSameEmoji = messageToUpdate.reactions?.find(
        r => r.userId === userId && r.emoji === emoji
      );

      let updatedReactions;

      if (existingReactionWithSameEmoji) {
        // Remove reaction
        updatedReactions = messageToUpdate.reactions.filter(
          r => !(r.userId === userId && r.emoji === emoji)
        );
      } else {
        // Remove any previous reaction from same user
        const filteredReactions = messageToUpdate.reactions?.filter(
          r => r.userId !== userId
        ) || [];

        // Add new reaction
        updatedReactions = [...filteredReactions, { userId, emoji }];
      }

      // Update message in state
      const updatedMessages = currentMessages.map(msg =>
        msg._id === messageId ? { ...msg, reactions: updatedReactions } : msg
      );

      set({ messages: updatedMessages });

      // Send to server
      await axiosInstance.post(`/messages/react/${messageId}`, { emoji });
      // The UI will be updated via the socket event
    } catch (error) {
      console.error("Error adding reaction:", error);
      toast.error(error.response?.data?.message || "Failed to add reaction");
      // Revert optimistic update by refreshing messages
      if (get().selectedUser) {
        get().getMessages(get().selectedUser._id);
      }
    }
  },

  markMessagesAsDelivered: (messageIds) => {
    if (!messageIds || messageIds.length === 0) return;

    const socket = useAuthStore.getState().socket;
    if (socket && socket.connected) {
      socket.emit("messageDelivered", { messageIds });
    }

    // Also update via API for reliability
    axiosInstance.post("/messages/status/delivered", { messageIds })
      .catch(error => console.error("Error marking messages as delivered:", error));
  },

  markMessagesAsSeen: (messageIds) => {
    if (!messageIds || messageIds.length === 0) return;

    const socket = useAuthStore.getState().socket;
    if (socket && socket.connected) {
      socket.emit("messageSeen", { messageIds });
    }

    // Also update via API for reliability
    axiosInstance.post("/messages/status/seen", { messageIds })
      .catch(error => console.error("Error marking messages as seen:", error));
  },

  updateLastSeen: () => {
    // Send heartbeat to update last seen
    const socket = useAuthStore.getState().socket;
    if (socket && socket.connected) {
      socket.emit("heartbeat");
      // Also request updated statuses
      socket.emit("getUserStatuses");
    }

    // Also update via API for reliability
    axiosInstance.post("/messages/lastseen")
      .catch(error => console.error("Error updating last seen:", error));
  },

  deleteMessage: async (messageId, deleteType) => {
    set({ isDeletingMessage: true });

    try {
      // Optimistically update UI first
      const currentMessages = get().messages;

      // Update the messages in the UI
      const updatedMessages = currentMessages.map(message => {
        if (message._id === messageId) {
          return {
            ...message,
            isDeleted: true,
            deletedFor: deleteType,
            deletedAt: new Date()
          };
        }
        return message;
      });

      set({ messages: updatedMessages });

      // Call API to delete the message
      await axiosInstance.delete(`/messages/${messageId}`, {
        data: { deleteType }
      });

      // For 'everyone' deletion, remove the message entirely from UI after a delay
      if (deleteType === 'everyone') {
        // Wait a moment for the animation/transition
        setTimeout(() => {
          set(state => ({
            messages: state.messages.filter(m => m._id !== messageId)
          }));
        }, 3000);
      }

      // Emit socket event for real-time updates
      const socket = useAuthStore.getState().socket;
      if (socket && socket.connected) {
        socket.emit("messageDeleted", { messageId, deleteType });
      }

    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");

      // Revert changes if the deletion failed
      await get().getMessages(get().selectedUser._id);
    } finally {
      set({ isDeletingMessage: false });
    }
  },

  deleteAccount: async () => {
    try {
      const response = await axiosInstance.delete('/auth/delete-account');

      if (response.status !== 200) {
        throw new Error(response.data?.message || "Failed to delete account");
      }

      // Clear all local data
      set({
        messages: [],
        users: [],
        allUsers: [],
        selectedUser: null,
        unreadCounts: {}
      });

      // Call logout from auth store (this will clear the auth cookie)
      useAuthStore.getState().logout();

      toast.success("Your account has been deleted");
      return true;
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error(error.response?.data?.message || "Failed to delete account");
      return false;
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;

    if (!socket) {
      console.error("Socket connection not available");
      set({ connectionStatus: 'disconnected' });
      return;
    }

    set({ connectionStatus: socket.connected ? 'connected' : 'connecting' });

    // Handle socket connection events
    socket.on('connect', () => {
      set({ connectionStatus: 'connected' });
      console.log("Socket connected");

      // Refresh data after reconnection
      get().getUsers();
      get().getUnreadCounts();
      if (get().selectedUser) {
        get().getMessages(get().selectedUser._id);
      }
    });

    socket.on('disconnect', () => {
      console.log("Socket disconnected");
      set({ connectionStatus: 'disconnected' });
    });

    socket.on('connect_error', (error) => {
      console.error("Socket connection error:", error);
      set({ connectionStatus: 'disconnected' });
    });

    // Listen for new regular messages
    socket.on("newMessage", (newMessage) => {
      console.log("📨 Received new message via Socket.IO:", newMessage);
      const currentUserId = useAuthStore.getState().authUser._id;
      const currentSelectedUser = get().selectedUser;

      // Check if this is a reply message
      if (newMessage.isReply || newMessage.replyTo) {
        console.log("💬 This is a reply message:", newMessage.replyTo);
      }

      // Extract sender ID (handle both string and object formats)
      const messageSenderId = typeof newMessage.senderId === 'object'
        ? newMessage.senderId._id
        : newMessage.senderId;

      console.log("🔍 Message sender ID:", messageSenderId);
      console.log("🔍 Current user ID:", currentUserId);
      console.log("🔍 Selected user ID:", currentSelectedUser?._id);

      // If sender is the selected user, add to current messages
      if (currentSelectedUser && messageSenderId === currentSelectedUser._id) {
        console.log("✅ Adding message to current conversation (sender is selected user)");
        // Update last message timestamp for polling comparison
        set(state => ({
          messages: [...state.messages.filter(m => m._id !== newMessage._id), newMessage],
          lastMessageTimestamp: new Date(newMessage.createdAt).getTime()
        }));

        // Mark message as delivered immediately
        get().markMessagesAsDelivered([newMessage._id]);

        // Mark message as seen after a short delay (simulating reading time)
        setTimeout(() => {
          get().markMessagesAsSeen([newMessage._id]);
        }, 2000);
      }
      // If we're the receiver but not on this chat, don't manually increment
      // The server will handle unread count updates via socket events
      else if (newMessage.receiverId === currentUserId) {
        console.log("📬 Received message from different user, updating sidebar");
        // If we receive a message from someone other than the selected user,
        // update the users list to show the latest message in the sidebar
        get().getUsers();

        // The unread counts will be updated via socket event "unreadCountUpdate"
        // No need to manually call getUnreadCounts() here
      }
      // If we're the sender of this message in a different tab/window
      else if (messageSenderId === currentUserId) {
        console.log("📤 Received own message from different tab/window");
        // If we're viewing the conversation with the recipient
        if (currentSelectedUser && newMessage.receiverId === currentSelectedUser._id) {
          console.log("✅ Adding own message to current conversation (multi-device sync)");
          set(state => ({
            messages: [...state.messages.filter(m => m._id !== newMessage._id), newMessage],
            lastMessageTimestamp: new Date(newMessage.createdAt).getTime()
          }));
        }

        // Update users list to show latest conversation
        get().getUsers();
      }

      console.log("🔄 Finished processing new message");
    });

    // Listen for new chats (first message from someone)
    socket.on("newChat", ({ message, user }) => {
      console.log("🆕 Received new chat via Socket.IO:", { message, user });
      // Add the new user to our users list
      const currentUsers = get().users;
      const currentUserId = useAuthStore.getState().authUser._id;
      const currentSelectedUser = get().selectedUser;

      // Extract sender ID (handle both string and object formats)
      const messageSenderId = typeof message.senderId === 'object'
        ? message.senderId._id
        : message.senderId;

      // Check if user already exists in users list
      const userExists = currentUsers.some(existingUser => existingUser._id === user._id);

      if (!userExists) {
        console.log("✅ Adding new user to users list:", user.fullName);
        set({ users: [...currentUsers, user] });
      }

      // If this is the selected user, add message to current messages
      if (currentSelectedUser &&
         (messageSenderId === currentSelectedUser._id || message.receiverId === currentSelectedUser._id)) {
        console.log("✅ Adding new chat message to current conversation");
        set(state => ({
          messages: [...state.messages.filter(m => m._id !== message._id), message],
          lastMessageTimestamp: new Date(message.createdAt).getTime()
        }));

        // Mark as delivered and seen if we're the receiver
        if (message.receiverId === currentUserId) {
          get().markMessagesAsDelivered([message._id]);
          setTimeout(() => {
            get().markMessagesAsSeen([message._id]);
          }, 1000);
        }
      }
      // If we're the receiver but not on this chat, increment unread count
      else if (message.receiverId === currentUserId) {
        console.log("📬 Received new chat from different user, incrementing unread count");
        get().incrementUnreadCount(messageSenderId);
      }

      // Automatically refresh the users list to update sidebar
      get().getUsers();
    });

    // Listen for refreshChats events from the server
    socket.on("refreshChats", () => {
      get().getUsers();

      // If a chat is currently open, refresh messages
      if (get().selectedUser) {
        get().getMessages(get().selectedUser._id);
      }
    });

    // Listen for message reactions
    socket.on("messageReaction", ({ messageId, reactions }) => {
      const currentMessages = get().messages;

      // Update the specific message with new reactions
      const updatedMessages = currentMessages.map(message =>
        message._id === messageId
          ? { ...message, reactions }
          : message
      );

      set({ messages: updatedMessages });
    });

    // Listen for message status updates
    socket.on("messageStatusUpdate", ({ messageIds, status, timestamp }) => {
      const currentMessages = get().messages;

      // Update the status of specific messages
      const updatedMessages = currentMessages.map(message => {
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

      set({ messages: updatedMessages });

      // Also update group messages if we're in a group chat
      const { selectedGroup, groupMessages } = useGroupStore.getState();
      if (selectedGroup) {
        const updatedGroupMessages = groupMessages.map(message => {
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

        useGroupStore.setState({ groupMessages: updatedGroupMessages });
      }
    });

    // Listen for user status updates
    socket.on("userStatusUpdate", ({ userId, isOnline, lastSeen }) => {
      set(state => ({
        userStatuses: {
          ...state.userStatuses,
          [userId]: { isOnline, lastSeen }
        }
      }));
    });

    // Listen for initial user statuses
    socket.on("initialUserStatuses", (statuses) => {
      set({ userStatuses: statuses });
    });

    // Listen for unread count updates
    socket.on("unreadCountUpdate", (unreadCounts) => {
      set({ unreadCounts });
    });

    // Listen for mention notifications
    socket.on("userMentioned", ({ messageId, groupId, senderName, timestamp }) => {
      // Update mention counts
      set(state => ({
        unreadCounts: {
          ...state.unreadCounts,
          mentions: {
            ...state.unreadCounts.mentions,
            [groupId]: (state.unreadCounts.mentions[groupId] || 0) + 1
          },
          totalMentions: state.unreadCounts.totalMentions + 1
        }
      }));

      // Show notification
      toast.info(`${senderName} mentioned you in a group`);
    });

    // Listen for new status updates
    socket.on("newStatus", (statusData) => {
      console.log("📱 Received new status via Socket.IO:", statusData);
      const { handleNewStatus } = useStatusStore.getState();
      handleNewStatus(statusData);
    });

    // Listen for status reactions
    socket.on("statusReaction", (reactionData) => {
      console.log("👍 Received status reaction via Socket.IO:", reactionData);
      const { handleStatusReaction } = useStatusStore.getState();
      handleStatusReaction(reactionData);
    });

    // Listen for status messages
    socket.on("statusMessage", (messageData) => {
      console.log("💬 Received status message via Socket.IO:", messageData);
      const { handleStatusMessage } = useStatusStore.getState();
      handleStatusMessage(messageData);
    });

    // Listen for message deleted events
    socket.on("messageDeleted", ({ messageId, deleteType }) => {
      const currentMessages = get().messages;

      if (deleteType === 'everyone') {
        // For delete for everyone, we'll completely remove the message after a delay
        const updatedMessages = currentMessages.map(message => {
          if (message._id === messageId) {
            return {
              ...message,
              isDeleted: true,
              deletedFor: deleteType,
              deletedAt: new Date()
            };
          }
          return message;
        });

        set({ messages: updatedMessages });

        // Remove the message completely after a delay
        setTimeout(() => {
          set(state => ({
            messages: state.messages.filter(m => m._id !== messageId)
          }));
        }, 3000);
      } else {
        // For delete for me, just mark as deleted
        const updatedMessages = currentMessages.map(message => {
          if (message._id === messageId) {
            return {
              ...message,
              isDeleted: true,
              deletedFor: deleteType,
              deletedAt: new Date()
            };
          }
          return message;
        });

        set({ messages: updatedMessages });
      }

      // Update users list to reflect changes in recent messages
      get().getUsers();
    });

    // Listen for message editing
    socket.on("messageEdited", (updatedMessage) => {
      const currentMessages = get().messages;

      // Update the specific message
      const updatedMessages = currentMessages.map(message =>
        message._id === updatedMessage._id ? updatedMessage : message
      );

      set({ messages: updatedMessages });
    });

    // Request initial user statuses when connected
    if (socket.connected) {
      socket.emit("getUserStatuses");
    }

    // Start heartbeat interval to update last seen (reduced frequency)
    const heartbeatInterval = setInterval(() => {
      get().updateLastSeen();

      // Also periodically request user statuses and unread counts
      if (socket.connected) {
        socket.emit("getUserStatuses");
        socket.emit("updateUnreadCounts");
      }
    }, 60000); // Every 60 seconds (reduced from 15 seconds)

    // Set up periodic polling for new messages as a backup to sockets
    const messagePollingInterval = setInterval(() => {
      // Only poll if we're in a conversation and socket is not connected
      if (get().selectedUser && get().connectionStatus !== 'connected') {
        // Re-fetch messages for current conversation
        get().getMessages(get().selectedUser._id);
      }
    }, 10000); // Poll every 10 seconds if socket disconnected

    // Store the interval IDs for cleanup
    set({
      heartbeatInterval,
      messagePollingInterval
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("newMessage");
      socket.off("newChat");
      socket.off("messageReaction");
      socket.off("messageStatusUpdate");
      socket.off("userStatusUpdate");
      socket.off("unreadCountUpdate");
      socket.off("messageDeleted");
      socket.off("refreshChats");
      socket.off("messageEdited");
      socket.off("newStatus");
      socket.off("statusReaction");
      socket.off("statusMessage");
    }

    // Clear heartbeat interval
    if (get().heartbeatInterval) {
      clearInterval(get().heartbeatInterval);
    }

    // Clear message polling interval
    if (get().messagePollingInterval) {
      clearInterval(get().messagePollingInterval);
    }
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser });

    // If selecting a user, mark all their messages as seen
    if (selectedUser) {
      const messagesToMark = get().messages
        .filter(msg =>
          msg.senderId === selectedUser._id &&
          msg.receiverId === useAuthStore.getState().authUser._id &&
          msg.status !== 'seen'
        )
        .map(msg => msg._id);

      if (messagesToMark.length > 0) {
        get().markMessagesAsSeen(messagesToMark);
      }

      // Mark chat as read using WhatsApp-style system
      get().markChatAsRead('direct', selectedUser._id);

      // Check connection status and reconnect if needed
      if (get().connectionStatus !== 'connected') {
        get().handleSocketReconnect();
      } else {
        // Request updated status for this user
        const socket = useAuthStore.getState().socket;
        if (socket && socket.connected) {
          socket.emit("getUserStatus", { userId: selectedUser._id });
        }
      }
    }
  },

  getLastSeen: (userId) => {
    const status = get().userStatuses[userId];
    if (!status) return null;
    return status;
  },

  editMessage: async (messageId, text) => {
    try {
      // Check if message can be edited (within 15 minutes)
      const message = get().messages.find(m => m._id === messageId);

      if (!message) {
        toast.error("Message not found");
        return false;
      }

      // Only the sender can edit
      if (message.senderId !== useAuthStore.getState().authUser._id) {
        toast.error("You can only edit your own messages");
        return false;
      }

      // Check if already deleted
      if (message.isDeleted) {
        toast.error("Cannot edit a deleted message");
        return false;
      }

      // Check if within 15 minutes
      const messageDate = new Date(message.createdAt);
      const now = new Date();
      const minutesDiff = (now - messageDate) / (1000 * 60);

      if (minutesDiff > 15) {
        toast.error("Cannot edit messages after 15 minutes");
        return false;
      }

      // Optimistically update UI
      const currentMessages = get().messages;
      const updatedMessages = currentMessages.map(msg => {
        if (msg._id === messageId) {
          return {
            ...msg,
            text,
            isEdited: true,
            editedAt: new Date(),
            originalText: !msg.isEdited ? msg.text : msg.originalText
          };
        }
        return msg;
      });

      set({ messages: updatedMessages });

      // Call API to update the message
      const res = await axiosInstance.put(`/messages/${messageId}`, { text });

      // Emit socket event for real-time updates
      const socket = useAuthStore.getState().socket;
      if (socket && socket.connected) {
        socket.emit("messageEdited", { messageId, text });
      }

      return true;
    } catch (error) {
      console.error("Error editing message:", error);
      toast.error(error.response?.data?.message || "Failed to edit message");

      // Revert changes on error
      if (get().selectedUser) {
        await get().getMessages(get().selectedUser._id);
      }

      return false;
    }
  }
}));