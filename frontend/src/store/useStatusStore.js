import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useStatusStore = create((set, get) => ({
  // State
  myStatuses: [],
  contactStatuses: [],
  isLoadingMyStatuses: false,
  isLoadingContactStatuses: false,
  isCreatingStatus: false,
  selectedStatus: null,
  statusViewers: [],
  statusMessages: [],
  statusReactions: [],
  isLoadingMessages: false,

  // Create text status
  createTextStatus: async (statusData) => {
    set({ isCreatingStatus: true });
    try {
      const res = await axiosInstance.post("/status/text", statusData);

      // Add new status to my statuses
      set(state => ({
        myStatuses: [res.data.status, ...state.myStatuses],
        isCreatingStatus: false
      }));

      toast.success("Status posted successfully!");
      return res.data.status;
    } catch (error) {
      console.error("Error creating text status:", error);
      toast.error(error.response?.data?.error || "Failed to post status");
      set({ isCreatingStatus: false });
      throw error;
    }
  },

  // Create image status
  createImageStatus: async (formData) => {
    set({ isCreatingStatus: true });
    try {
      const res = await axiosInstance.post("/status/image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Add new status to my statuses
      set(state => ({
        myStatuses: [res.data.status, ...state.myStatuses],
        isCreatingStatus: false
      }));

      toast.success("Status posted successfully!");
      return res.data.status;
    } catch (error) {
      console.error("Error creating image status:", error);
      toast.error(error.response?.data?.error || "Failed to post status");
      set({ isCreatingStatus: false });
      throw error;
    }
  },

  // Get my statuses
  getMyStatuses: async () => {
    set({ isLoadingMyStatuses: true });
    try {
      const res = await axiosInstance.get("/status/my-statuses");
      set({
        myStatuses: res.data,
        isLoadingMyStatuses: false
      });
    } catch (error) {
      console.error("Error fetching my statuses:", error);
      set({ isLoadingMyStatuses: false });
    }
  },

  // Get contact statuses
  getContactStatuses: async () => {
    set({ isLoadingContactStatuses: true });
    try {
      const res = await axiosInstance.get("/status/contacts");
      set({
        contactStatuses: res.data,
        isLoadingContactStatuses: false
      });
    } catch (error) {
      console.error("Error fetching contact statuses:", error);
      set({ isLoadingContactStatuses: false });
    }
  },

  // View a status
  viewStatus: async (statusId) => {
    try {
      const res = await axiosInstance.post(`/status/view/${statusId}`);

      // Update the status as viewed in contact statuses
      set(state => ({
        contactStatuses: state.contactStatuses.map(contact => ({
          ...contact,
          statuses: contact.statuses.map(status =>
            status._id === statusId
              ? { ...status, hasViewed: true }
              : status
          ),
          hasUnviewed: contact.statuses.some(status =>
            status._id !== statusId && !status.hasViewed
          )
        }))
      }));

      return res.data.status;
    } catch (error) {
      console.error("Error viewing status:", error);
      toast.error(error.response?.data?.error || "Failed to view status");
      throw error;
    }
  },

  // Get status viewers
  getStatusViewers: async (statusId) => {
    try {
      const res = await axiosInstance.get(`/status/viewers/${statusId}`);
      set({ statusViewers: res.data.viewers });
      return res.data;
    } catch (error) {
      console.error("Error fetching status viewers:", error);
      toast.error(error.response?.data?.error || "Failed to load viewers");
      throw error;
    }
  },

  // Delete status
  deleteStatus: async (statusId) => {
    try {
      await axiosInstance.delete(`/status/${statusId}`);

      // Remove from my statuses
      set(state => ({
        myStatuses: state.myStatuses.filter(status => status._id !== statusId)
      }));

      toast.success("Status deleted successfully");
    } catch (error) {
      console.error("Error deleting status:", error);
      toast.error(error.response?.data?.error || "Failed to delete status");
      throw error;
    }
  },

  // Set selected status for viewing
  setSelectedStatus: (status) => {
    set({ selectedStatus: status });
  },

  // Clear selected status
  clearSelectedStatus: () => {
    set({ selectedStatus: null });
  },

  // Refresh all statuses
  refreshStatuses: async () => {
    console.log("🔄 Refreshing all statuses...");
    try {
      await Promise.all([
        get().getMyStatuses(),
        get().getContactStatuses()
      ]);
      console.log("✅ All statuses refreshed successfully");
    } catch (error) {
      console.error("❌ Error refreshing statuses:", error);
    }
  },

  // Force refresh statuses (for real-time updates)
  forceRefreshStatuses: async () => {
    console.log("🔄 Force refreshing statuses for real-time update...");
    set({
      isLoadingMyStatuses: true,
      isLoadingContactStatuses: true
    });

    try {
      const [myStatuses, contactStatuses] = await Promise.all([
        get().getMyStatuses(),
        get().getContactStatuses()
      ]);
      console.log("✅ Force refresh completed");
      return { myStatuses, contactStatuses };
    } catch (error) {
      console.error("❌ Error in force refresh:", error);
      set({
        isLoadingMyStatuses: false,
        isLoadingContactStatuses: false
      });
    }
  },

  // Check for new statuses (can be called periodically)
  checkForNewStatuses: async () => {
    try {
      const res = await axiosInstance.get("/status/contacts");
      const newContactStatuses = res.data;

      // Check if there are any new statuses
      const currentStatuses = get().contactStatuses;
      const hasNewStatuses = newContactStatuses.some(contact =>
        contact.hasUnviewed &&
        !currentStatuses.find(current =>
          current.user._id === contact.user._id && current.hasUnviewed
        )
      );

      set({ contactStatuses: newContactStatuses });

      if (hasNewStatuses) {
        // You can add a notification here if needed
        console.log("New status updates available");
      }
    } catch (error) {
      console.error("Error checking for new statuses:", error);
    }
  },

  // Get status count for notifications
  getUnviewedStatusCount: () => {
    const { contactStatuses } = get();
    return contactStatuses.filter(contact => contact.hasUnviewed).length;
  },

  // Add reaction to status
  addReaction: async (statusId, emoji) => {
    try {
      const res = await axiosInstance.post(`/status/${statusId}/reaction`, { emoji });

      // Update the status in contact statuses
      set(state => ({
        contactStatuses: state.contactStatuses.map(contact => ({
          ...contact,
          statuses: contact.statuses.map(status =>
            status._id === statusId
              ? { ...status, reactions: res.data.reactions }
              : status
          )
        }))
      }));

      return res.data.reactions;
    } catch (error) {
      console.error("Error adding reaction:", error);
      toast.error(error.response?.data?.error || "Failed to add reaction");
      throw error;
    }
  },

  // Remove reaction from status
  removeReaction: async (statusId) => {
    try {
      const res = await axiosInstance.delete(`/status/${statusId}/reaction`);

      // Update the status in contact statuses
      set(state => ({
        contactStatuses: state.contactStatuses.map(contact => ({
          ...contact,
          statuses: contact.statuses.map(status =>
            status._id === statusId
              ? { ...status, reactions: res.data.reactions }
              : status
          )
        }))
      }));

      return res.data.reactions;
    } catch (error) {
      console.error("Error removing reaction:", error);
      toast.error(error.response?.data?.error || "Failed to remove reaction");
      throw error;
    }
  },

  // Add message to status
  addStatusMessage: async (statusId, message) => {
    try {
      const res = await axiosInstance.post(`/status/${statusId}/message`, { message });

      toast.success("Message sent successfully!");
      return res.data.messages;
    } catch (error) {
      console.error("Error adding message:", error);
      toast.error(error.response?.data?.error || "Failed to send message");
      throw error;
    }
  },

  // Get status messages
  getStatusMessages: async (statusId) => {
    set({ isLoadingMessages: true });
    try {
      const res = await axiosInstance.get(`/status/${statusId}/messages`);
      set({
        statusMessages: res.data.messages,
        isLoadingMessages: false
      });
      return res.data;
    } catch (error) {
      console.error("Error fetching status messages:", error);
      set({ isLoadingMessages: false });
      throw error;
    }
  },

  // Get status reactions
  getStatusReactions: async (statusId) => {
    try {
      const res = await axiosInstance.get(`/status/${statusId}/reactions`);
      set({ statusReactions: res.data.reactions });
      return res.data;
    } catch (error) {
      console.error("Error fetching status reactions:", error);
      toast.error(error.response?.data?.error || "Failed to load reactions");
      throw error;
    }
  },

  // Handle real-time status updates
  handleNewStatus: (statusData) => {
    const { authUser } = useAuthStore.getState();
    console.log("🔄 Handling new status:", statusData);

    set(state => {
      // If it's my own status, add to myStatuses as well
      if (statusData.user._id === authUser._id) {
        console.log("✅ Adding my own status to myStatuses");
        return {
          myStatuses: [statusData.status, ...state.myStatuses]
        };
      }

      // Check if user already exists in contact statuses
      const existingContactIndex = state.contactStatuses.findIndex(
        contact => contact.user._id === statusData.user._id
      );

      if (existingContactIndex !== -1) {
        // Update existing contact - add new status and sort by timestamp (oldest first)
        const updatedContactStatuses = [...state.contactStatuses];
        const existingStatuses = updatedContactStatuses[existingContactIndex].statuses;
        const newStatuses = [...existingStatuses, statusData.status];

        // Sort statuses by timestamp (oldest first, like WhatsApp)
        newStatuses.sort((a, b) => new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp));

        updatedContactStatuses[existingContactIndex] = {
          ...updatedContactStatuses[existingContactIndex],
          statuses: newStatuses,
          hasUnviewed: true
        };

        console.log("✅ Updated existing contact with new status");
        return { contactStatuses: updatedContactStatuses };
      } else {
        // Add new contact
        const newContact = {
          user: statusData.user,
          statuses: [statusData.status],
          hasUnviewed: true
        };

        console.log("✅ Added new contact with status");
        return {
          contactStatuses: [newContact, ...state.contactStatuses]
        };
      }
    });

    // Force refresh to ensure consistency
    console.log("🔄 Force refreshing statuses for consistency");
    setTimeout(() => {
      get().forceRefreshStatuses();
    }, 300);
  },

  // Handle real-time reaction updates
  handleStatusReaction: (reactionData) => {
    set(state => ({
      contactStatuses: state.contactStatuses.map(contact => ({
        ...contact,
        statuses: contact.statuses.map(status => {
          if (status._id === reactionData.statusId) {
            if (reactionData.type === "add") {
              // Add or update reaction
              const existingReactionIndex = status.reactions?.findIndex(
                r => r.userId._id === reactionData.reaction.userId._id
              ) ?? -1;

              const updatedReactions = [...(status.reactions || [])];
              if (existingReactionIndex !== -1) {
                updatedReactions[existingReactionIndex] = reactionData.reaction;
              } else {
                updatedReactions.push(reactionData.reaction);
              }

              return { ...status, reactions: updatedReactions };
            } else {
              // Remove reaction
              return {
                ...status,
                reactions: (status.reactions || []).filter(
                  r => r.userId._id !== reactionData.userId
                )
              };
            }
          }
          return status;
        })
      }))
    }));
  },

  // Handle real-time message updates
  handleStatusMessage: (messageData) => {
    // Update status messages if viewing the same status
    const { selectedStatus } = get();
    if (selectedStatus && selectedStatus._id === messageData.statusId) {
      set(state => ({
        statusMessages: [...state.statusMessages, messageData.message]
      }));
    }
  },

  // Mute status
  muteStatus: async (statusId) => {
    try {
      await axiosInstance.post(`/status/${statusId}/mute`);
      toast.success("Status muted successfully");
    } catch (error) {
      console.error("Error muting status:", error);
      toast.error(error.response?.data?.error || "Failed to mute status");
      throw error;
    }
  },

  // Unmute status
  unmuteStatus: async (statusId) => {
    try {
      await axiosInstance.delete(`/status/${statusId}/mute`);
      toast.success("Status unmuted successfully");
    } catch (error) {
      console.error("Error unmuting status:", error);
      toast.error(error.response?.data?.error || "Failed to unmute status");
      throw error;
    }
  },

  // Report status
  reportStatus: async (statusId, reason, description = "") => {
    try {
      await axiosInstance.post(`/status/${statusId}/report`, { reason, description });
      toast.success("Status reported successfully");
    } catch (error) {
      console.error("Error reporting status:", error);
      toast.error(error.response?.data?.error || "Failed to report status");
      throw error;
    }
  },

  // Clear all data (for logout)
  clearStatusData: () => {
    set({
      myStatuses: [],
      contactStatuses: [],
      selectedStatus: null,
      statusViewers: [],
      statusMessages: [],
      statusReactions: [],
      isLoadingMyStatuses: false,
      isLoadingContactStatuses: false,
      isCreatingStatus: false,
      isLoadingMessages: false
    });
  }
}));
