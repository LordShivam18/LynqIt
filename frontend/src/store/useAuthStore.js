import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,
  googleAuthInfo: null, // Store Google info temporarily when username is needed
  socketReconnectAttempts: 0,
  socketReconnectTimer: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);

      // Login success - 2FA is no longer enforced during login
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
      return { error: true };
    } finally {
      set({ isLoggingIn: false });
    }
  },

  loginWithGoogle: async (credential) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/google", { credential });

      // Check if we need to collect a username
      if (res.data.needsUsername) {
        set({
          googleAuthInfo: {
            credential,
            ...res.data.googleInfo
          },
          isLoggingIn: false
        });
        toast.success("Please create a username to complete your account");
        return { needsUsername: true };
      }

      // Regular login success
      set({
        authUser: res.data,
        googleAuthInfo: null // Clear any existing google auth info
      });
      toast.success("Logged in successfully");

      get().connectSocket();
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Google login failed";
      toast.error(errorMessage);
      throw error;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  completeGoogleSignup: async (username) => {
    const { googleAuthInfo } = get();

    if (!googleAuthInfo || !googleAuthInfo.credential) {
      toast.error("Google authentication information is missing");
      return false;
    }

    set({ isSigningUp: true });

    try {
      const res = await axiosInstance.post("/auth/google", {
        credential: googleAuthInfo.credential,
        username
      });

      set({
        authUser: res.data,
        googleAuthInfo: null  // Clear google auth info after successful signup
      });

      toast.success("Account created successfully");
      get().connectSocket();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to complete Google signup");
      return false;
    } finally {
      set({ isSigningUp: false });
    }
  },

  // Generate token after 2FA verification
  generateToken: (userId) => {
    // This is called after successful 2FA verification
    // The backend has already set the JWT cookie
    // We just need to check auth to get the user data
    get().checkAuth();
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({
        authUser: null,
        googleAuthInfo: null // Also clear google auth info on logout
      });
      toast.success("Logged out successfully");
      get().disconnectSocket();
      return true; // Return success status
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to logout";
      toast.error(errorMessage);
      console.error("Logout error:", error);
      throw error; // Rethrow the error to be caught by the caller
    }
  },

  updateProfile: async (userData) => {
    try {
      set({ isUpdatingProfile: true });

      const res = await axiosInstance.put("/auth/update-profile", userData);

      // Update authUser with the returned user data
      set({
        authUser: res.data,
        isUpdatingProfile: false
      });

      toast.success("Profile updated!");
      return true;
    } catch (error) {
      set({ isUpdatingProfile: false });
      toast.error(error.response?.data?.message || "Failed to update profile");
      return false;
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser) return;

    // Clear any existing reconnect timer
    if (get().socketReconnectTimer) {
      clearTimeout(get().socketReconnectTimer);
      set({ socketReconnectTimer: null });
    }

    // If there's an existing connected socket, don't create a new one
    if (get().socket?.connected) return;

    // Disconnect any existing socket
    if (get().socket) {
      get().socket.disconnect();
    }

    // Determine the appropriate socket URL based on environment
    const isProduction = import.meta.env.MODE === "production";
    const socketURL = isProduction ? "/" : BASE_URL;
    
    console.log(`🔌 Connecting to Socket.IO server at: ${socketURL}`);

    // Create new socket with optimized real-time settings
    const socket = io(socketURL, {
      query: {
        userId: authUser._id,
      },
      // Optimized reconnection settings
      reconnection: true,
      reconnectionAttempts: 15,        // More attempts
      reconnectionDelay: 500,          // Faster initial reconnect
      reconnectionDelayMax: 3000,      // Lower max delay
      timeout: 10000,                  // Faster timeout
      forceNew: false,                 // Reuse existing connection

      // Transport optimization
      transports: ['websocket', 'polling'], // Prefer websocket
      upgrade: true,                   // Allow transport upgrades
      rememberUpgrade: true,           // Remember successful upgrades

      // Performance settings
      autoConnect: true,               // Auto connect on creation
      multiplex: true,                 // Allow multiplexing
      
      // Explicit path
      path: '/socket.io'
    });

    set({ socket: socket });

    // Connect handlers
    socket.on("connect", () => {
      console.log("✅ Socket connected successfully, ID:", socket.id);
      // Reset reconnect attempts on successful connection
      set({ socketReconnectAttempts: 0 });

      // Get initial online users and request statuses
      socket.emit("getOnlineUsers");
      socket.emit("getUserStatuses");
      
      // Set up a heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit("heartbeat");
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 30000); // Send heartbeat every 30 seconds
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      get().handleSocketReconnect();
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);

      // If the disconnection wasn't intentional, try to reconnect
      if (reason !== "io client disconnect") {
        get().handleSocketReconnect();
      }
    });

    // Event listeners
    socket.on("getOnlineUsers", (userIds) => {
      console.log("📊 Received online users:", userIds.length);
      set({ onlineUsers: userIds });
    });

    // Connect the socket
    socket.connect();
  },

  handleSocketReconnect: () => {
    const currentAttempts = get().socketReconnectAttempts;

    // If we've tried too many times, stop trying
    if (currentAttempts >= 10) {
      console.error("Maximum socket reconnection attempts reached");
      return;
    }

    // Clear any existing timer
    if (get().socketReconnectTimer) {
      clearTimeout(get().socketReconnectTimer);
    }

    // Increase backoff time with each attempt (1s, 2s, 4s, etc.)
    const delay = Math.min(1000 * Math.pow(2, currentAttempts), 30000);

    // Set up new reconnect timer
    const timer = setTimeout(() => {
      console.log(`Attempting to reconnect socket (attempt ${currentAttempts + 1})`);
      get().connectSocket();
    }, delay);

    set({
      socketReconnectAttempts: currentAttempts + 1,
      socketReconnectTimer: timer
    });
  },

  disconnectSocket: () => {
    // Clear any reconnect timer
    if (get().socketReconnectTimer) {
      clearTimeout(get().socketReconnectTimer);
      set({ socketReconnectTimer: null });
    }

    // Disconnect socket
    if (get().socket) {
      get().socket.disconnect();
      set({ socket: null, socketReconnectAttempts: 0 });
    }
  },
}));
