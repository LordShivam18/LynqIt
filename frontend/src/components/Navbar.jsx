import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore } from "../store/useThemeStore";
import { LogOut, MessageSquare, Settings, Sun, Moon, Clock, Search } from "lucide-react";
import { useEffect, useState } from "react";
import GlobalSearchModal from "./GlobalSearchModal";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const { theme, autoThemeEnabled, toggleAutoTheme, setTheme, checkAutoTheme } = useThemeStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      // Check if we need to update the theme based on time
      if (autoThemeEnabled) {
        checkAutoTheme();
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [autoThemeEnabled, checkAutoTheme]);

  // Keyboard shortcut for global search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
      if (e.key === 'Escape') {
        setShowGlobalSearch(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cycle through theme modes: auto → light → dark → auto
  const cycleThemeMode = () => {
    if (autoThemeEnabled) {
      // Currently in auto mode, switch to manual light
      toggleAutoTheme(); // Turn off auto
      setTheme("light"); // Force light theme
    } else if (theme === "light") {
      // Currently in light mode, switch to dark
      setTheme("dark");
    } else {
      // Currently in dark mode, switch back to auto
      toggleAutoTheme(); // Turn on auto
      checkAutoTheme(); // Set the correct theme based on time
    }
  };

  // Determine the icon to show based on current theme and auto mode
  const getThemeIcon = () => {
    if (autoThemeEnabled) {
      // Auto mode - show a different icon (clock) to indicate auto mode
      return <Clock className="w-4 h-4" />;
    } else {
      // Manual mode - show sun or moon based on current theme
      return theme === "light" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />;
    }
  };

  // Get tooltip text for the theme button
  const getThemeTooltip = () => {
    if (autoThemeEnabled) {
      const hour = currentTime.getHours();
      const timeBasedMode = (hour >= 6 && hour < 18) ? "light" : "dark";
      return `Auto theme (currently ${timeBasedMode} mode)`;
    } else {
      return theme === "light" ? "Light mode (click to toggle)" : "Dark mode (click to toggle)";
    }
  };

  return (
    <header
      className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40
    backdrop-blur-lg bg-base-100/80"
    >
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-lg font-bold">LynqIt</h1>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Global Search button */}
            <button
              onClick={() => setShowGlobalSearch(true)}
              className="btn btn-sm btn-ghost tooltip tooltip-bottom"
              data-tip="Global Search (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Theme toggle button */}
            <button
              onClick={cycleThemeMode}
              className="btn btn-sm btn-ghost tooltip tooltip-bottom"
              data-tip={getThemeTooltip()}
            >
              {getThemeIcon()}
            </button>

            <Link
              to={"/settings"}
              className={`
              btn btn-sm gap-2 transition-colors

              `}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>



            {authUser && (
              <button className="flex gap-2 items-center" onClick={logout}>
                <LogOut className="size-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
      />
    </header>
  );
};
export default Navbar;