import { useState } from "react";
import { THEMES } from "../constants";
import { useThemeStore } from "../store/useThemeStore";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { 
  ArrowLeft, Send, User, Lock, MessageSquare, Bell, Palette, 
  HelpCircle, ChevronRight, Eye, EyeOff, Clock, ShieldAlert, LinkIcon, 
  Users, Ban, Smartphone, Volume, Volume2, VolumeX, Trash2, LogOut, UserX, Sun, Moon
} from "lucide-react";
import { Link } from "react-router-dom";

const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey! How's it going?", isSent: false },
  { id: 2, content: "I'm doing great! Just working on some new features.", isSent: true },
];

const SettingsTabs = {
  ACCOUNT: "account",
  PRIVACY: "privacy",
  CHATS: "chats",
  NOTIFICATION: "notification",
  THEMES: "themes",
  HELP: "help",
};

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();
  const { deleteAccount } = useChatStore();
  const { logout, authUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState(SettingsTabs.THEMES);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  // Toggle states for switches
  const [privacySettings, setPrivacySettings] = useState({
    lastSeen: "everyone",
    onlineStatus: "everyone",
    profilePhoto: "everyone",
    about: "everyone",
    readReceipts: true,
    defaultMessageTimer: "off",
    blockUnknownMessages: false,
    disableLinkPreviews: false,
    groups: "everyone",
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    messageNotifications: false,
    showPreviews: false,
    reactionNotifications: false,
    backgroundSync: false,
    incomingSounds: true,
    outgoingSounds: false,
  });
  
  const handleToggle = (section, setting) => {
    if (section === 'privacy') {
      setPrivacySettings({
        ...privacySettings,
        [setting]: !privacySettings[setting]
      });
    } else if (section === 'notification') {
      setNotificationSettings({
        ...notificationSettings,
        [setting]: !notificationSettings[setting]
      });
    }
  };
  
  // Function to update privacy settings
  const updatePrivacySetting = (setting, value) => {
    setPrivacySettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };
  
  const handleDeleteAccount = async () => {
    const success = await deleteAccount();
    if (success) {
      // Redirect to signup page after successful deletion
      window.location.href = "/signup";
    }
  };
  
  const handleLogout = async () => {
    await logout();
    // Redirect to login page after logout
    window.location.href = "/login";
  };
  
  // Render the tab content based on the active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case SettingsTabs.ACCOUNT:
        return <AccountSettings 
          onDeleteAccount={handleDeleteAccount} 
          onLogout={handleLogout}
          user={authUser}
          showConfirmDelete={showConfirmDelete}
          setShowConfirmDelete={setShowConfirmDelete}
        />;
      case SettingsTabs.PRIVACY:
        return <PrivacySettings 
          settings={privacySettings} 
          handleToggle={handleToggle} 
          updatePrivacySetting={updatePrivacySetting}
        />;
      case SettingsTabs.CHATS:
        return <ChatsSettings />;
      case SettingsTabs.NOTIFICATION:
        return <NotificationSettings settings={notificationSettings} handleToggle={handleToggle} />;
      case SettingsTabs.THEMES:
        return <ThemeSettings theme={theme} setTheme={setTheme} />;
      case SettingsTabs.HELP:
        return <HelpSettings />;
      default:
        return <ThemeSettings theme={theme} setTheme={setTheme} />;
    }
  };

  return (
    <div className="h-screen pt-16">
      <div className="container mx-auto px-4 max-w-5xl h-full">
        <div className="flex h-full">
          {/* Sidebar Tabs */}
          <div className="w-64 border-r border-base-300 py-4 pr-4 hidden md:block">
            <h2 className="text-xl font-bold mb-6">Settings</h2>
            <div className="space-y-1">
              <TabButton 
                icon={<User size={18} />} 
                label="Account" 
                active={activeTab === SettingsTabs.ACCOUNT}
                onClick={() => setActiveTab(SettingsTabs.ACCOUNT)}
              />
              <TabButton 
                icon={<Lock size={18} />} 
                label="Privacy" 
                active={activeTab === SettingsTabs.PRIVACY}
                onClick={() => setActiveTab(SettingsTabs.PRIVACY)}
              />
              <TabButton 
                icon={<MessageSquare size={18} />} 
                label="Chats" 
                active={activeTab === SettingsTabs.CHATS}
                onClick={() => setActiveTab(SettingsTabs.CHATS)}
              />
              <TabButton 
                icon={<Bell size={18} />} 
                label="Notification" 
                active={activeTab === SettingsTabs.NOTIFICATION}
                onClick={() => setActiveTab(SettingsTabs.NOTIFICATION)}
              />
              <TabButton 
                icon={<Palette size={18} />} 
                label="Themes" 
                active={activeTab === SettingsTabs.THEMES}
                onClick={() => setActiveTab(SettingsTabs.THEMES)}
              />
              <TabButton 
                icon={<HelpCircle size={18} />} 
                label="Help" 
                active={activeTab === SettingsTabs.HELP}
                onClick={() => setActiveTab(SettingsTabs.HELP)}
              />
            </div>
          </div>
          
          {/* Mobile Tabs */}
          <div className="md:hidden w-full pt-4">
            <div className="flex overflow-x-auto pb-2 mb-4 gap-1 no-scrollbar">
              <MobileTabButton 
                icon={<User size={16} />} 
                label="Account" 
                active={activeTab === SettingsTabs.ACCOUNT}
                onClick={() => setActiveTab(SettingsTabs.ACCOUNT)}
              />
              <MobileTabButton 
                icon={<Lock size={16} />} 
                label="Privacy" 
                active={activeTab === SettingsTabs.PRIVACY}
                onClick={() => setActiveTab(SettingsTabs.PRIVACY)}
              />
              <MobileTabButton 
                icon={<MessageSquare size={16} />} 
                label="Chats" 
                active={activeTab === SettingsTabs.CHATS}
                onClick={() => setActiveTab(SettingsTabs.CHATS)}
              />
              <MobileTabButton 
                icon={<Bell size={16} />} 
                label="Notifications" 
                active={activeTab === SettingsTabs.NOTIFICATION}
                onClick={() => setActiveTab(SettingsTabs.NOTIFICATION)}
              />
              <MobileTabButton 
                icon={<Palette size={16} />} 
                label="Themes" 
                active={activeTab === SettingsTabs.THEMES}
                onClick={() => setActiveTab(SettingsTabs.THEMES)}
              />
              <MobileTabButton 
                icon={<HelpCircle size={16} />} 
                label="Help" 
                active={activeTab === SettingsTabs.HELP}
                onClick={() => setActiveTab(SettingsTabs.HELP)}
              />
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="flex-1 py-4 px-4 md:pl-8 overflow-y-auto">
            <div className="md:hidden mb-4">
              <h2 className="text-xl font-bold">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h2>
            </div>
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Tab button component for desktop sidebar
const TabButton = ({ icon, label, active, onClick }) => (
  <button
    className={`flex items-center gap-3 w-full py-2.5 px-3 rounded-lg transition-colors ${
      active ? "bg-primary text-primary-content" : "hover:bg-base-200"
    }`}
    onClick={onClick}
  >
    {icon}
    <span>{label}</span>
  </button>
);

// Tab button component for mobile
const MobileTabButton = ({ icon, label, active, onClick }) => (
  <button
    className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg whitespace-nowrap transition-colors ${
      active ? "bg-primary text-primary-content" : "hover:bg-base-200"
    }`}
    onClick={onClick}
  >
    {icon}
    <span className="text-xs">{label}</span>
  </button>
);

// Setting item with toggle switch
const SettingToggle = ({ label, description, value, onChange }) => (
  <div className="flex items-center justify-between py-3 border-b border-base-200">
    <div>
      <h3 className="font-medium">{label}</h3>
      {description && <p className="text-sm text-base-content/60 mt-0.5">{description}</p>}
    </div>
    <label className="cursor-pointer">
      <input 
        type="checkbox" 
        checked={value} 
        onChange={onChange} 
        className="toggle toggle-primary" 
      />
    </label>
  </div>
);

// Setting item with link/forwarding arrow
const SettingLink = ({ label, value, onClick }) => (
  <div className="flex items-center justify-between py-3 border-b border-base-200">
    <h3 className="font-medium">{label}</h3>
    <div className="flex items-center gap-2">
      {value && <span className="text-sm text-base-content/60">{value}</span>}
      <button 
        onClick={onClick} 
        className="btn btn-ghost btn-sm btn-circle"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  </div>
);

// Account Settings
const AccountSettings = ({ onDeleteAccount, onLogout, user, showConfirmDelete, setShowConfirmDelete }) => (
  <div className="space-y-6">
    <section>
      <h2 className="text-lg font-semibold mb-4">Account Information</h2>
      
      <div className="bg-base-200 p-6 rounded-xl flex flex-col sm:flex-row items-center gap-6 mb-6">
        <div className="relative">
          <img 
            src={user?.profilePic || "/avatar.png"} 
            alt={user?.username} 
            className="w-24 h-24 rounded-full object-cover"
          />
        </div>
        
        <div className="text-center sm:text-left">
          <h3 className="text-xl font-medium">{user?.fullName}</h3>
          <p className="text-base-content/70">@{user?.username}</p>
          <p className="text-sm text-base-content/60 mt-1">{user?.email}</p>
        </div>
      </div>
    </section>
    
    <section>
      <h2 className="text-lg font-semibold mb-4">Account Actions</h2>
      
      <div className="space-y-2">
        <Link to="/profile">
          <button className="btn btn-outline w-full justify-start gap-3">
            <User size={18} />
            Edit Profile
          </button>
        </Link>
        
        <button 
          className="btn btn-outline w-full justify-start gap-3"
          onClick={onLogout}
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </section>
    
    <section>
      <h2 className="text-lg font-semibold mb-4 text-error">Danger Zone</h2>
      
      {!showConfirmDelete ? (
        <button 
          className="btn btn-error w-full justify-start gap-3"
          onClick={() => setShowConfirmDelete(true)}
        >
          <UserX size={18} />
          Delete My Account
        </button>
      ) : (
        <div className="space-y-3 bg-base-200 p-4 rounded-lg">
          <p className="font-medium text-error">Are you sure you want to delete your account?</p>
          <p className="text-sm">This action cannot be undone. All your data will be permanently removed.</p>
          <div className="flex gap-2 mt-2">
            <button 
              className="btn btn-error flex-1"
              onClick={onDeleteAccount}
            >
              Yes, Delete My Account
            </button>
            <button 
              className="btn btn-outline flex-1"
              onClick={() => setShowConfirmDelete(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  </div>
);

// Privacy Settings Tab
const PrivacySettings = ({ settings, handleToggle, updatePrivacySetting }) => {
  const [showLastSeenOptions, setShowLastSeenOptions] = useState(false);
  const [showOnlineOptions, setShowOnlineOptions] = useState(false);
  const [showProfilePhotoOptions, setShowProfilePhotoOptions] = useState(false);
  const [showAboutOptions, setShowAboutOptions] = useState(false);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold mb-2">Who can see my personal info</h2>
        
        {/* Last seen option */}
        <div className="relative">
          <div 
            className="flex items-center justify-between py-3 border-b border-base-200 cursor-pointer"
            onClick={() => setShowLastSeenOptions(!showLastSeenOptions)}
          >
            <h3 className="font-medium">Last seen</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-base-content/60">
                {settings.lastSeen === 'everyone' ? 'Everyone' : 
                 settings.lastSeen === 'contacts' ? 'My contacts' : 'Nobody'}
              </span>
              <button className="btn btn-ghost btn-sm btn-circle">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          
          {showLastSeenOptions && (
            <div className="absolute z-10 mt-1 w-full bg-base-100 rounded-lg shadow-lg border border-base-300">
              <div className="p-2">
                <button 
                  className="w-full text-left px-4 py-2 rounded-md hover:bg-base-200"
                  onClick={() => {
                    updatePrivacySetting('lastSeen', 'everyone');
                    setShowLastSeenOptions(false);
                  }}
                >
                  Everyone
                </button>
                <button 
                  className="w-full text-left px-4 py-2 rounded-md hover:bg-base-200"
                  onClick={() => {
                    updatePrivacySetting('lastSeen', 'contacts');
                    setShowLastSeenOptions(false);
                  }}
                >
                  My contacts
                </button>
                <button 
                  className="w-full text-left px-4 py-2 rounded-md hover:bg-base-200"
                  onClick={() => {
                    updatePrivacySetting('lastSeen', 'nobody');
                    setShowLastSeenOptions(false);
                  }}
                >
                  Nobody
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Online status option */}
        <div className="relative">
          <div 
            className="flex items-center justify-between py-3 border-b border-base-200 cursor-pointer"
            onClick={() => setShowOnlineOptions(!showOnlineOptions)}
          >
            <h3 className="font-medium">Who can see when I'm online</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-base-content/60">
                {settings.onlineStatus === 'everyone' ? 'Everyone' : 'Same as last seen'}
              </span>
              <button className="btn btn-ghost btn-sm btn-circle">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          
          {showOnlineOptions && (
            <div className="absolute z-10 mt-1 w-full bg-base-100 rounded-lg shadow-lg border border-base-300">
              <div className="p-2">
                <button 
                  className="w-full text-left px-4 py-2 rounded-md hover:bg-base-200"
                  onClick={() => {
                    updatePrivacySetting('onlineStatus', 'everyone');
                    setShowOnlineOptions(false);
                  }}
                >
                  Everyone
                </button>
                <button 
                  className="w-full text-left px-4 py-2 rounded-md hover:bg-base-200"
                  onClick={() => {
                    updatePrivacySetting('onlineStatus', 'lastSeen');
                    setShowOnlineOptions(false);
                  }}
                >
                  Same as last seen
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Profile photo option */}
        <div className="relative">
          <div 
            className="flex items-center justify-between py-3 border-b border-base-200 cursor-pointer"
            onClick={() => setShowProfilePhotoOptions(!showProfilePhotoOptions)}
          >
            <h3 className="font-medium">Profile photo</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-base-content/60">
                {settings.profilePhoto === 'everyone' ? 'Everyone' : 
                 settings.profilePhoto === 'contacts' ? 'My contacts' : 'Nobody'}
              </span>
              <button className="btn btn-ghost btn-sm btn-circle">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          
          {showProfilePhotoOptions && (
            <div className="absolute z-10 mt-1 w-full bg-base-100 rounded-lg shadow-lg border border-base-300">
              <div className="p-2">
                <button 
                  className="w-full text-left px-4 py-2 rounded-md hover:bg-base-200"
                  onClick={() => {
                    updatePrivacySetting('profilePhoto', 'everyone');
                    setShowProfilePhotoOptions(false);
                  }}
                >
                  Everyone
                </button>
                <button 
                  className="w-full text-left px-4 py-2 rounded-md hover:bg-base-200"
                  onClick={() => {
                    updatePrivacySetting('profilePhoto', 'contacts');
                    setShowProfilePhotoOptions(false);
                  }}
                >
                  My contacts
                </button>
                <button 
                  className="w-full text-left px-4 py-2 rounded-md hover:bg-base-200"
                  onClick={() => {
                    updatePrivacySetting('profilePhoto', 'nobody');
                    setShowProfilePhotoOptions(false);
                  }}
                >
                  Nobody
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* About option */}
        <div className="relative">
          <div 
            className="flex items-center justify-between py-3 border-b border-base-200 cursor-pointer"
            onClick={() => setShowAboutOptions(!showAboutOptions)}
          >
            <h3 className="font-medium">About</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-base-content/60">
                {settings.about === 'everyone' ? 'Everyone' : 
                 settings.about === 'contacts' ? 'My contacts' : 'Nobody'}
              </span>
              <button className="btn btn-ghost btn-sm btn-circle">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          
          {showAboutOptions && (
            <div className="absolute z-10 mt-1 w-full bg-base-100 rounded-lg shadow-lg border border-base-300">
              <div className="p-2">
                <button 
                  className="w-full text-left px-4 py-2 rounded-md hover:bg-base-200"
                  onClick={() => {
                    updatePrivacySetting('about', 'everyone');
                    setShowAboutOptions(false);
                  }}
                >
                  Everyone
                </button>
                <button 
                  className="w-full text-left px-4 py-2 rounded-md hover:bg-base-200"
                  onClick={() => {
                    updatePrivacySetting('about', 'contacts');
                    setShowAboutOptions(false);
                  }}
                >
                  My contacts
                </button>
                <button 
                  className="w-full text-left px-4 py-2 rounded-md hover:bg-base-200"
                  onClick={() => {
                    updatePrivacySetting('about', 'nobody');
                    setShowAboutOptions(false);
                  }}
                >
                  Nobody
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
      
      <section>
        <SettingToggle 
          label="Read receipts" 
          description="If turned off, you won't send or receive read receipts. Read receipts are always sent for group chats. Note: This feature is not yet implemented." 
          value={settings.readReceipts} 
          onChange={() => handleToggle('privacy', 'readReceipts')} 
        />
      </section>
      
      <section>
        <h2 className="text-lg font-semibold mb-2">Disappearing messages</h2>
        
        <SettingLink 
          label="Default message timer" 
          value={settings.defaultMessageTimer} 
          onClick={() => {}} 
        />
      </section>
      
      <section>
        <h2 className="text-lg font-semibold mb-2">Advanced</h2>
        
        <SettingToggle 
          label="Block unknown account messages" 
          description="To protect your account and improve device performance, messages from unknown accounts will be blocked if they exceed a certain volume." 
          value={settings.blockUnknownMessages} 
          onChange={() => handleToggle('privacy', 'blockUnknownMessages')} 
        />
        
        <SettingToggle 
          label="Disable link previews" 
          description="To help protect your IP address from being inferred by third-party websites, previews for the links you share in chats will no longer be generated." 
          value={settings.disableLinkPreviews} 
          onChange={() => handleToggle('privacy', 'disableLinkPreviews')} 
        />
      </section>
      
      <section>
        <SettingLink 
          label="Groups" 
          value={settings.groups === 'everyone' ? 'Everyone' : 'My contacts'} 
          onClick={() => {}} 
        />
        
        <SettingLink 
          label="Blocked contacts" 
          value="0" 
          onClick={() => {}} 
        />
        
        <SettingLink 
          label="App lock" 
          value="Require password to unlock app" 
          onClick={() => {}} 
        />
      </section>
    </div>
  );
};

// Chats Settings Tab
const ChatsSettings = () => (
  <div className="space-y-6">
    <section>
      <h2 className="text-lg font-semibold mb-4">Chat Display</h2>
      
      <SettingToggle 
        label="Show media in chat" 
        description="Automatically display images, videos and GIFs in chat" 
        value={true} 
        onChange={() => {}} 
      />
      
      <SettingToggle 
        label="Show link previews" 
        description="Generate previews for links shared in chats" 
        value={true} 
        onChange={() => {}} 
      />
    </section>
  </div>
);

// Notification Settings Tab
const NotificationSettings = ({ settings, handleToggle }) => (
  <div className="space-y-6">
    <section>
      <h2 className="text-lg font-semibold mb-2">Messages</h2>
      
      <SettingToggle 
        label="Message notifications" 
        description="Show notifications for new messages" 
        value={settings.messageNotifications} 
        onChange={() => handleToggle('notification', 'messageNotifications')} 
      />
      
      <SettingToggle 
        label="Show previews" 
        description="Show message content in notifications" 
        value={settings.showPreviews} 
        onChange={() => handleToggle('notification', 'showPreviews')} 
      />
      
      <SettingToggle 
        label="Show reaction notifications" 
        description="Get notified when people react to your messages" 
        value={settings.reactionNotifications} 
        onChange={() => handleToggle('notification', 'reactionNotifications')} 
      />
    </section>
    
    <section>
      <SettingToggle 
        label="Background sync" 
        description="Get faster performance by syncing messages in the background" 
        value={settings.backgroundSync} 
        onChange={() => handleToggle('notification', 'backgroundSync')} 
      />
    </section>
    
    <section>
      <SettingToggle 
        label="Incoming sounds" 
        description="Play sounds for incoming messages" 
        value={settings.incomingSounds} 
        onChange={() => handleToggle('notification', 'incomingSounds')} 
      />
      
      <SettingToggle 
        label="Outgoing sounds" 
        description="Play sounds for outgoing messages" 
        value={settings.outgoingSounds} 
        onChange={() => handleToggle('notification', 'outgoingSounds')} 
      />
    </section>
  </div>
);

// Theme Settings Tab (using existing theme selector)
const ThemeSettings = ({ theme, setTheme }) => {
  const { autoThemeEnabled } = useThemeStore();
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Theme</h2>
        <p className="text-sm text-base-content/70">Choose a theme for your chat interface</p>
      </div>

      <div className="alert alert-info mb-4">
        <div className="flex gap-2 items-center">
          <Sun className="w-4 h-4" />
          <Moon className="w-4 h-4" />
          <p>
            Quick theme toggle is available in the top navigation bar.
            {autoThemeEnabled && " Auto theme mode (day/night) is currently enabled."}
          </p>
        </div>
      </div>
      
      <div className={autoThemeEnabled ? "opacity-50 pointer-events-none" : ""}>
        <h3 className="text-sm font-medium mb-2">
          {autoThemeEnabled ? "Manual theme selection (disabled while auto theme is on)" : "Select a theme"}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              className={`
                group flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors
                ${theme === t ? "bg-base-200" : "hover:bg-base-200/50"}
              `}
              onClick={() => setTheme(t)}
              disabled={autoThemeEnabled}
            >
              <div className="relative h-8 w-full rounded-md overflow-hidden" data-theme={t}>
                <div className="absolute inset-0 grid grid-cols-4 gap-px p-1">
                  <div className="rounded bg-primary"></div>
                  <div className="rounded bg-secondary"></div>
                  <div className="rounded bg-accent"></div>
                  <div className="rounded bg-neutral"></div>
                </div>
              </div>
              <span className="text-[11px] font-medium truncate w-full text-center">
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview Section */}
      <h3 className="text-lg font-semibold mb-3">Preview</h3>
      <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100 shadow-lg">
        <div className="p-4 bg-base-200">
          <div className="max-w-lg mx-auto">
            {/* Mock Chat UI */}
            <div className="bg-base-100 rounded-xl shadow-sm overflow-hidden">
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-base-300 bg-base-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content font-medium">
                    E
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Elon Musk</h3>
                    <p className="text-xs text-base-content/70">Online</p>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="p-4 space-y-4 min-h-[200px] max-h-[200px] overflow-y-auto bg-base-100">
                {PREVIEW_MESSAGES.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`
                        max-w-[80%] rounded-xl p-3 shadow-sm
                        ${message.isSent ? "bg-primary text-primary-content" : "bg-base-200"}
                      `}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={`
                          text-[10px] mt-1.5
                          ${message.isSent ? "text-primary-content/70" : "text-base-content/70"}
                        `}
                      >
                        12:00 PM
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-base-300 bg-base-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered flex-1 text-sm h-10"
                    placeholder="Type a message..."
                    value="This is a preview"
                    readOnly
                  />
                  <button className="btn btn-primary h-10 min-h-0">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Placeholder for Help Settings
const HelpSettings = () => (
  <div className="space-y-6">
    <div className="bg-base-200 p-12 rounded-xl flex flex-col items-center justify-center">
      <HelpCircle size={48} className="text-base-content/30 mb-4" />
      <h3 className="text-lg font-medium">Help & Support</h3>
      <p className="text-center text-base-content/60 mt-2">
        Help and support options will be implemented in future updates
      </p>
      </div>
    </div>
  );

export default SettingsPage;