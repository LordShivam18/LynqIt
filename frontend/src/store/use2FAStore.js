import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

export const use2FAStore = create((set, get) => ({
  is2FAEnabled: false,
  backupCodesRemaining: 0,
  qrCode: null,
  secret: null,
  backupCodes: [],
  isLoading: false,
  isSetupLoading: false,
  isVerifying: false,

  // Get 2FA status
  get2FAStatus: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/2fa/status");
      set({
        is2FAEnabled: res.data.enabled,
        backupCodesRemaining: res.data.backupCodesRemaining
      });
    } catch (error) {
      console.error("Error fetching 2FA status:", error);
      toast.error("Failed to load 2FA status");
    } finally {
      set({ isLoading: false });
    }
  },

  // Generate 2FA setup
  generate2FASetup: async () => {
    set({ isSetupLoading: true });
    try {
      const res = await axiosInstance.post("/2fa/setup");
      set({
        qrCode: res.data.qrCode,
        secret: res.data.secret
      });
      return res.data;
    } catch (error) {
      console.error("Error generating 2FA setup:", error);
      toast.error(error.response?.data?.message || "Failed to generate 2FA setup");
      throw error;
    } finally {
      set({ isSetupLoading: false });
    }
  },

  // Enable 2FA
  enable2FA: async (token) => {
    set({ isVerifying: true });
    try {
      const res = await axiosInstance.post("/2fa/enable", { token });
      set({
        is2FAEnabled: true,
        backupCodes: res.data.backupCodes,
        backupCodesRemaining: res.data.backupCodes.length,
        qrCode: null,
        secret: null
      });
      toast.success("2FA enabled successfully!");
      return res.data.backupCodes;
    } catch (error) {
      console.error("Error enabling 2FA:", error);
      toast.error(error.response?.data?.message || "Failed to enable 2FA");
      throw error;
    } finally {
      set({ isVerifying: false });
    }
  },

  // Disable 2FA
  disable2FA: async (token, password) => {
    set({ isVerifying: true });
    try {
      await axiosInstance.post("/2fa/disable", { token, password });
      set({
        is2FAEnabled: false,
        backupCodesRemaining: 0,
        backupCodes: [],
        qrCode: null,
        secret: null
      });
      toast.success("2FA disabled successfully!");
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      toast.error(error.response?.data?.message || "Failed to disable 2FA");
      throw error;
    } finally {
      set({ isVerifying: false });
    }
  },

  // Verify 2FA (for login)
  verify2FA: async (email, token) => {
    set({ isVerifying: true });
    try {
      const res = await axiosInstance.post("/2fa/verify", { email, token });
      return res.data;
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      toast.error(error.response?.data?.message || "Invalid 2FA code");
      throw error;
    } finally {
      set({ isVerifying: false });
    }
  },

  // Regenerate backup codes
  regenerateBackupCodes: async (password) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.post("/2fa/backup-codes", { password });
      set({
        backupCodes: res.data.backupCodes,
        backupCodesRemaining: res.data.backupCodes.length
      });
      toast.success("Backup codes regenerated successfully!");
      return res.data.backupCodes;
    } catch (error) {
      console.error("Error regenerating backup codes:", error);
      toast.error(error.response?.data?.message || "Failed to regenerate backup codes");
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Clear 2FA data
  clear2FAData: () => {
    set({
      is2FAEnabled: false,
      backupCodesRemaining: 0,
      qrCode: null,
      secret: null,
      backupCodes: [],
      isLoading: false,
      isSetupLoading: false,
      isVerifying: false
    });
  },

  // Reset setup state
  resetSetupState: () => {
    set({
      qrCode: null,
      secret: null,
      backupCodes: []
    });
  }
}));
