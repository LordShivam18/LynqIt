import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [], // Users with existing conversations
  allUsers: [], // All users for search
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  userStatuses: {}, // Holds online status and last seen times
  unreadCounts: {}, // Tracks number of unread messages per user
  isDeletingMessage: false,
  connectionStatus: 'connected', // 'connected', 'connecting', 'disconnected'
  lastMessageTimestamp: null, // Track last message received time for auto-refresh

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
      
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
      const res = await axiosInstance.get("/messages/unread");
      set({ unreadCounts: res.data });
    } catch (error) {
      console.error("Error fetching unread counts:", error);
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
      
      // Mark all as seen if chat is currently open
      setTimeout(() => {
        if (get().selectedUser?._id === userId) {
          get().markMessagesAsSeen(messagesToMark);
          
          // Reset unread count for this user
          get().resetUnreadCount(userId);
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
  
  resetUnreadCount: (userId) => {
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: 0
      }
    }));
  },
  
  incrementUnreadCount: (userId) => {
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: (state.unreadCounts[userId] || 0) + 1
      }
    }));
  },
  
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      // Optimistically update UI with pending message
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
        isPending: true // Flag to identify optimistic updates
      };
      
      // Add pending message to state
      set({ messages: [...messages, pendingMessage] });
      
      // Send to server
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      
      // Replace pending message with server response
      set({ 
        messages: messages
          .filter(msg => msg._id !== tempId) // Remove temporary message
          .concat(res.data), // Add confirmed message
        lastMessageTimestamp: new Date(res.data.createdAt).getTime()
      });
      
      // Automatically refresh users list to update sidebar with latest conversation
      get().getUsers();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
      
      // Update UI to show failed message
      set({
        messages: messages.map(msg => 
          msg.isPending ? { ...msg, status: 'failed', isPending: false } : msg
        )
      });
      
      // Try to reconnect if we failed to send message
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
      // Update UI optimistically
      const currentMessages = get().messages;
      const updatedMessages = currentMessages.map(message => {
        if (message._id === messageId) {
          return {
            ...message,
            isDeleted: true,
            deletedFor: deleteType,
            deletedBy: useAuthStore.getState().authUser._id,
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
      
      // Emit socket event for real-time updates if deleting for everyone
      if (deleteType === 'everyone') {
        const socket = useAuthStore.getState().socket;
        if (socket && socket.connected) {
          socket.emit("messageDeleted", { messageId, deleteType });
        }
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
      const currentUserId = useAuthStore.getState().authUser._id;
      const currentSelectedUser = get().selectedUser;

      // If sender is the selected user, add to current messages
      if (currentSelectedUser && newMessage.senderId === currentSelectedUser._id) {
        // Update last message timestamp for polling comparison
        set(state => ({
          messages: [...state.messages.filter(m => m._id !== newMessage._id), newMessage],
          lastMessageTimestamp: new Date(newMessage.createdAt).getTime()
        }));
        
        // Mark message as delivered
        get().markMessagesAsDelivered([newMessage._id]);
        
        // Mark message as seen after a short delay
        setTimeout(() => {
          get().markMessagesAsSeen([newMessage._id]);
        }, 1000);
      } 
      // If we're the receiver but not on this chat, increment unread count
      else if (newMessage.receiverId === currentUserId) {
        get().incrementUnreadCount(newMessage.senderId);
        
        // If we receive a message from someone other than the selected user,
        // update the users list to show the latest message in the sidebar
        get().getUsers();
      }
      // If we're the sender of this message in a different tab/window
      else if (newMessage.senderId === currentUserId) {
        // If we're viewing the conversation with the recipient
        if (currentSelectedUser && newMessage.receiverId === currentSelectedUser._id) {
          set(state => ({
            messages: [...state.messages.filter(m => m._id !== newMessage._id), newMessage],
            lastMessageTimestamp: new Date(newMessage.createdAt).getTime()
          }));
        }
        
        // Update users list to show latest conversation
        get().getUsers();
      }
    });
    
    // Listen for new chats (first message from someone)
    socket.on("newChat", ({ message, user }) => {
      // Add the new user to our users list
      const currentUsers = get().users;
      const currentUserId = useAuthStore.getState().authUser._id;
      const currentSelectedUser = get().selectedUser;
      
      // Check if user already exists in users list
      const userExists = currentUsers.some(existingUser => existingUser._id === user._id);
      
      if (!userExists) {
        set({ users: [...currentUsers, user] });
      }
      
      // If this is the selected user, add message to current messages
      if (currentSelectedUser && 
         (message.senderId === currentSelectedUser._id || message.receiverId === currentSelectedUser._id)) {
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
        get().incrementUnreadCount(message.senderId);
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
    
    // Listen for message deleted events
    socket.on("messageDeleted", ({ messageId, deleteType }) => {
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
    });
    
    // Request initial user statuses when connected
    if (socket.connected) {
      socket.emit("getUserStatuses");
    }
    
    // Start heartbeat interval to update last seen
    const heartbeatInterval = setInterval(() => {
      get().updateLastSeen();
      
      // Also periodically request user statuses
      if (socket.connected) {
        socket.emit("getUserStatuses");
      }
    }, 15000); // Every 15 seconds
    
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
      
      // Reset unread count for this user
      get().resetUnreadCount(selectedUser._id);
      
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
  }
}));