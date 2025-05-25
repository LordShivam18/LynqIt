import Navbar from "./components/Navbar";
import ErrorBoundary from "./components/ErrorBoundary";

import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import SecuritySettings from "./components/SecuritySettings";
import ProfilePage from "./pages/ProfilePage";
import OTPVerificationPage from "./pages/OTPVerificationPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import JoinGroupPage from "./pages/JoinGroupPage";

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useChatStore } from "./store/useChatStore";
import { useGroupStore } from "./store/useGroupStore";
import { useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { initializeEncryption } from "./utils/encryption";
import { getGoogleClientId } from "./config/environment";

import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();
  const { theme, autoThemeEnabled, checkAutoTheme } = useThemeStore();
  const { subscribeToMessages, unsubscribeFromMessages, getUnreadCounts } = useChatStore();
  const { subscribeToGroupEvents, unsubscribeFromGroupEvents } = useGroupStore();

  console.log({ onlineUsers });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Initialize encryption when user is authenticated
  useEffect(() => {
    if (authUser) {
      // Store current user ID for encryption
      localStorage.setItem('currentUserId', authUser._id);

      initializeEncryption().then(() => {
        console.log('Encryption initialized successfully');
      }).catch(error => {
        console.error('Failed to initialize encryption:', error);
      });
    }
  }, [authUser]);

  // Subscribe to real-time messages and group events when logged in
  useEffect(() => {
    if (authUser) {
      subscribeToMessages();
      subscribeToGroupEvents();
      // Fetch initial unread counts
      getUnreadCounts();
    }

    return () => {
      if (authUser) {
        unsubscribeFromMessages();
        unsubscribeFromGroupEvents();
      }
    };
  }, [authUser, subscribeToMessages, unsubscribeFromMessages, subscribeToGroupEvents, unsubscribeFromGroupEvents, getUnreadCounts]);

  // Set up automatic theme checking
  useEffect(() => {
    // Check theme immediately on app load
    checkAutoTheme();

    // Set up an interval to check every minute
    const themeCheckInterval = setInterval(() => {
      if (autoThemeEnabled) {
        checkAutoTheme();
      }
    }, 60000); // Check every minute

    return () => clearInterval(themeCheckInterval);
  }, [autoThemeEnabled, checkAutoTheme]);

  console.log({ authUser });
  console.log('Google Client ID:', getGoogleClientId());
  console.log('Environment Config:', ENV);

  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );

  return (
    <GoogleOAuthProvider clientId={getGoogleClientId()}>
      <div data-theme={theme}>
        <Navbar />

        <Routes>
          <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
          <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
          <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/verify-otp" element={!authUser ? <OTPVerificationPage /> : <Navigate to="/" />} />
          <Route path="/forgot-password" element={!authUser ? <ForgotPasswordPage /> : <Navigate to="/" />} />
          <Route path="/reset-password" element={!authUser ? <ResetPasswordPage /> : <Navigate to="/" />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/security" element={authUser ? <SecuritySettings /> : <Navigate to="/login" />} />
          <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
          <Route path="/join-group/:groupId" element={
            <ErrorBoundary>
              <JoinGroupPage />
            </ErrorBoundary>
          } />
        </Routes>

        <Toaster />
      </div>
    </GoogleOAuthProvider>
  );
};
export default App;