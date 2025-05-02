import Navbar from "./components/Navbar";

import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useChatStore } from "./store/useChatStore";
import { useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";

import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();
  const { theme, autoThemeEnabled, checkAutoTheme } = useThemeStore();
  const { subscribeToMessages, unsubscribeFromMessages } = useChatStore();

  console.log({ onlineUsers });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Subscribe to real-time messages when logged in
  useEffect(() => {
    if (authUser) {
      subscribeToMessages();
    }
    
    return () => {
      if (authUser) {
        unsubscribeFromMessages();
      }
    };
  }, [authUser, subscribeToMessages, unsubscribeFromMessages]);

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

  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );

  return (
    <GoogleOAuthProvider clientId="461128965954-90fcltci30rissdg8825l3lv5e0ifpfd.apps.googleusercontent.com">
      <div data-theme={theme}>
        <Navbar />

        <Routes>
          <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
          <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
          <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
        </Routes>

        <Toaster />
      </div>
    </GoogleOAuthProvider>
  );
};
export default App;