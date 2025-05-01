import { create } from "zustand";

const getTimeBasedTheme = () => {
  const currentHour = new Date().getHours();
  return (currentHour >= 6 && currentHour < 18) ? "light" : "dark"; // Day: 6am-6pm, Night: 6pm-6am
};

// Set default theme based on time if auto theme hasn't been configured yet
const initializeAutoTheme = () => {
  // If autoTheme setting doesn't exist in local storage yet
  if (localStorage.getItem("chat-auto-theme") === null) {
    // Enable auto theme by default
    localStorage.setItem("chat-auto-theme", "true");
    
    // Set initial theme based on time
    const timeBasedTheme = getTimeBasedTheme();
    localStorage.setItem("chat-theme", timeBasedTheme);
    
    return true; // Auto theme is enabled
  }
  
  // Otherwise use the existing setting
  return JSON.parse(localStorage.getItem("chat-auto-theme") || "false");
};

// Initialize auto theme setting before creating the store
const defaultAutoThemeEnabled = initializeAutoTheme();

export const useThemeStore = create((set, get) => ({
  theme: localStorage.getItem("chat-theme") || getTimeBasedTheme(),
  autoThemeEnabled: defaultAutoThemeEnabled,
  
  setTheme: (theme) => {
    localStorage.setItem("chat-theme", theme);
    set({ theme });
  },
  
  toggleAutoTheme: () => {
    const currentValue = get().autoThemeEnabled;
    const newValue = !currentValue;
    localStorage.setItem("chat-auto-theme", JSON.stringify(newValue));
    
    // If enabling auto theme, immediately set the time-based theme
    if (newValue) {
      const timeBasedTheme = getTimeBasedTheme();
      localStorage.setItem("chat-theme", timeBasedTheme);
      set({ autoThemeEnabled: newValue, theme: timeBasedTheme });
    } else {
      set({ autoThemeEnabled: newValue });
    }
  },
  
  checkAutoTheme: () => {
    const { autoThemeEnabled } = get();
    if (autoThemeEnabled) {
      const timeBasedTheme = getTimeBasedTheme();
      localStorage.setItem("chat-theme", timeBasedTheme);
      set({ theme: timeBasedTheme });
    }
  }
}));