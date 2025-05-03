import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { Camera, Mail, User, Eye, EyeOff, Check, X, Info, Save, Edit, Lock, FileText, QrCode, RefreshCw, MessageSquare } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useThemeStore } from "../store/useThemeStore";
import bcrypt from "bcryptjs-react";
import { toast } from "react-hot-toast";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const { messages, users, getMessages } = useChatStore();
  const { theme } = useThemeStore(); // Get current theme
  const [activeTab, setActiveTab] = useState("profile");
  const [selectedImg, setSelectedImg] = useState(null);
  const [editMode, setEditMode] = useState({
    fullName: false,
    username: false,
    password: false,
    bio: false
  });
  
  const [profileData, setProfileData] = useState({
    fullName: authUser?.fullName || "",
    username: authUser?.username || "",
    currentPassword: "",
    newPassword: "",
    bio: authUser?.bio || ""
  });
  
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false
  });
  
  const [isLoadingChatHistory, setIsLoadingChatHistory] = useState(false);
  const [chatHistorySummary, setChatHistorySummary] = useState({
    totalContacts: 0,
    totalMessages: 0,
    lastActive: null
  });
  
  // Username change tracking
  const [usernameChangeInfo, setUsernameChangeInfo] = useState({
    canChangeUsername: true,
    daysRemaining: 0,
    lastChanged: null
  });
  
  // QR code styling based on theme
  const [qrCodeStyles, setQrCodeStyles] = useState({
    fgColor: "#7B5CF0",
    logoOpacity: 1
  });
  
  // State for QR code data and expiration
  const [qrCodeData, setQrCodeData] = useState("");
  const [nextRotation, setNextRotation] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState("");
  
  // Load chat history summary data when tab is switched to QR code
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (activeTab === 'qrcode' && !chatHistorySummary.lastActive) {
        setIsLoadingChatHistory(true);
        
        try {
          // Get recent conversations summary
          const userCount = users?.length || 0;
          
          // Get approx message count from recent conversations
          let totalMessageCount = 0;
          let lastMessageDate = null;
          
          // For each conversation, fetch last few messages to include in summary
          for (const user of users.slice(0, 5)) {  // Limit to 5 most recent contacts
            if (user && user._id) {
              await getMessages(user._id);
              
              // Count messages from this conversation
              if (messages && messages.length) {
                totalMessageCount += messages.length;
                
                // Track most recent message date
                const latestMsg = messages[messages.length - 1];
                if (latestMsg && latestMsg.createdAt) {
                  const msgDate = new Date(latestMsg.createdAt);
                  if (!lastMessageDate || msgDate > lastMessageDate) {
                    lastMessageDate = msgDate;
                  }
                }
              }
            }
          }
          
          setChatHistorySummary({
            totalContacts: userCount,
            totalMessages: totalMessageCount,
            lastActive: lastMessageDate
          });
        } catch (error) {
          console.error("Error fetching chat history:", error);
        } finally {
          setIsLoadingChatHistory(false);
        }
      }
    };
    
    fetchChatHistory();
  }, [activeTab, users]);
  
  // Generate new QR code data and set next rotation time
  const generateQrCodeData = () => {
    if (!authUser) return;
    
    // Create profile data object with expanded user information
    const profileDataObj = {
      userId: authUser._id,
      username: authUser.username,
      fullName: authUser.fullName,
      email: authUser.email,
      profilePicture: authUser.profilePic || "",
      bio: authUser.bio || "",
      memberSince: authUser.createdAt || new Date().toISOString(),
      accountStatus: "Active",
      phoneNumber: authUser.phoneNumber || "",
      address: authUser.address || "",
      preferences: authUser.preferences || {},
      
      // Include chat summary data
      chatHistory: {
        totalContacts: chatHistorySummary.totalContacts,
        totalMessages: chatHistorySummary.totalMessages,
        lastActive: chatHistorySummary.lastActive ? chatHistorySummary.lastActive.toISOString() : null,
        recentConversations: users.slice(0, 5).map(user => ({
          userId: user._id,
          username: user.username,
          fullName: user.fullName
        })),
        // Include last 10 messages from most recent chat
        recentMessages: messages.slice(-10).map(msg => ({
          id: msg._id,
          sender: msg.senderId === authUser._id ? "me" : "other",
          timestamp: msg.createdAt,
          textPreview: msg.text ? (msg.text.length > 20 ? `${msg.text.substring(0, 20)}...` : msg.text) : "(Media)"
        }))
      }
    };
    
    // Calculate current time and next rotation time (15 minutes instead of 1 hour)
    const now = new Date();
    
    // Create next rotation date (15 minutes from now)
    const nextRotation = new Date(now);
    nextRotation.setMinutes(now.getMinutes() + 15, 0, 0);
    
    // Store next rotation timestamp
    setNextRotation(nextRotation.getTime());
    
    // Add rotation info to QR data
    const qrData = {
      ...profileDataObj,
      rotationTime: now.toTimeString(),
      rotationDate: now.toDateString(),
      expiresAt: nextRotation.toISOString(),
      createdAt: now.toISOString()
    };
    
    // Encrypt the data using bcrypt
    const dataString = JSON.stringify(qrData);
    const salt = bcrypt.genSaltSync(10);
    const hashedData = bcrypt.hashSync(dataString, salt);
    
    setQrCodeData(hashedData);
  };
  
  // Calculate and format the time remaining until next rotation
  const updateTimeRemaining = () => {
    if (!nextRotation) return;
    
    const now = new Date().getTime();
    const remaining = nextRotation - now;
    
    if (remaining <= 0) {
      // Time to generate a new QR code
      generateQrCodeData();
      return;
    }
    
    // Format the remaining time
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    setTimeRemaining(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
  };
  
  // Generate QR code on first render
  useEffect(() => {
    generateQrCodeData();
  }, [authUser]);
  
  // Set up timer to update time remaining display
  useEffect(() => {
    const timer = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(timer);
  }, [nextRotation]);
  
  // Update QR code styling when theme changes
  useEffect(() => {
    // Theme-specific colors
    const themeColors = {
      light: "#7B5CF0", // purple
      dark: "#A78BFA", // lighter purple
      cupcake: "#EAB308", // yellow
      bumblebee: "#F59E0B", // amber
      emerald: "#10B981", // emerald
      corporate: "#2563EB", // blue
      synthwave: "#E779C1", // pink
      retro: "#F87171", // red
      cyberpunk: "#0EA5E9", // cyan
      valentine: "#EC4899", // pink
      halloween: "#F97316", // orange
      garden: "#22C55E", // green
      forest: "#22C55E", // green
      aqua: "#06B6D4", // cyan
      lofi: "#374151", // gray
      pastel: "#FB7185", // light red
      fantasy: "#8B5CF6", // violet
      wireframe: "#374151", // gray
      luxury: "#D4AA70", // gold
      dracula: "#FF79C6", // pink
      cmyk: "#0891B2", // cyan
      autumn: "#D97706", // amber
      acid: "#84CC16", // lime
      lemonade: "#EAB308", // yellow
      night: "#C084FC", // purple
      coffee: "#A16207", // yellow-brown
      winter: "#38BDF8", // sky blue
    };
    
    setQrCodeStyles({
      fgColor: themeColors[theme] || "#7B5CF0", // Default to purple if theme not found
      logoOpacity: theme === "dark" ? 0.9 : 1
    });
  }, [theme]);
  
  // Password validation criteria
  const passwordCriteria = [
    { id: 'length', label: 'At least 8 characters', regex: /.{8,}/ },
    { id: 'uppercase', label: 'At least one uppercase letter', regex: /[A-Z]/ },
    { id: 'lowercase', label: 'At least one lowercase letter', regex: /[a-z]/ },
    { id: 'number', label: 'At least one number', regex: /[0-9]/ },
    { id: 'special', label: 'At least one special character', regex: /[!@#$%^&*()_+]/ }
  ];
  
  const validatePasswordCriteria = (password) => {
    return passwordCriteria.map(criteria => ({
      ...criteria,
      valid: criteria.regex.test(password)
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData({
      ...profileData,
      [name]: value
    });
    
    // Clear error when typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };
  
  const toggleEditMode = (field) => {
    // Prevent editing username if the user can't change it yet
    if (field === 'username' && !usernameChangeInfo.canChangeUsername) {
      toast.error(`You can only change your username once every 10 days. You can change it again in ${usernameChangeInfo.daysRemaining} days.`);
      return;
    }
    
    setEditMode({
      ...editMode,
      [field]: !editMode[field]
    });
    
    // Reset field to original value when canceling edit
    if (editMode[field]) {
      setProfileData({
        ...profileData,
        [field]: authUser[field] || ""
      });
      setErrors({});
    }
  };
  
  const validateUsername = () => {
    // Username format check
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(profileData.username)) {
      setErrors({
        ...errors,
        username: "Username can only include letters, numbers, and characters like . and _"
      });
      return false;
    }
    return true;
  };
  
  const validateBio = () => {
    if (profileData.bio.length > 150) {
      setErrors({
        ...errors,
        bio: "Bio must be 150 characters or less"
      });
      return false;
    }
    return true;
  };
  
  const handleSaveField = async (field) => {
    // Validate specific field
    if (field === 'username' && !validateUsername()) {
      return;
    }
    
    if (field === 'bio' && !validateBio()) {
      return;
    }
    
    try {
      // Only send the field being edited
      const dataToUpdate = { [field]: profileData[field] };
      await updateProfile(dataToUpdate);
      toggleEditMode(field);
    } catch (error) {
      // Error will be handled by the store and displayed via toast
    }
  };
  
  const handlePasswordSave = async () => {
    // Validate password
    const criteria = validatePasswordCriteria(profileData.newPassword);
    const allValid = criteria.every(c => c.valid);
    
    if (!allValid) {
      setErrors({
        ...errors,
        newPassword: "Password doesn't meet all requirements"
      });
      return;
    }
    
    if (!profileData.currentPassword) {
      setErrors({
        ...errors,
        currentPassword: "Current password is required"
      });
      return;
    }
    
    try {
      await updateProfile({
        currentPassword: profileData.currentPassword,
        newPassword: profileData.newPassword
      });
      
      // Reset password fields and exit edit mode on success
      setProfileData({
        ...profileData,
        currentPassword: "",
        newPassword: ""
      });
      toggleEditMode('password');
    } catch (error) {
      // Error will be handled by the store and displayed via toast
    }
  };
  
  // Force generate new QR code
  const handleRefreshQrCode = () => {
    generateQrCodeData();
  };

  // Update profile data when auth user changes
  useEffect(() => {
    if (authUser) {
      setProfileData({
        fullName: authUser.fullName || "",
        username: authUser.username || "",
        currentPassword: "",
        newPassword: "",
        bio: authUser.bio || ""
      });
      
      // Calculate username change availability
      if (authUser.lastUsernameChange) {
        const lastChangeDate = new Date(authUser.lastUsernameChange);
        const currentDate = new Date();
        const diffTime = currentDate - lastChangeDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 10) {
          setUsernameChangeInfo({
            canChangeUsername: false,
            daysRemaining: 10 - diffDays,
            lastChanged: lastChangeDate
          });
        } else {
          setUsernameChangeInfo({
            canChangeUsername: true,
            daysRemaining: 0,
            lastChanged: lastChangeDate
          });
        }
      } else {
        setUsernameChangeInfo({
          canChangeUsername: true,
          daysRemaining: 0,
          lastChanged: null
        });
      }
    }
  }, [authUser]);

  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold ">Profile</h1>
            <p className="mt-2">Manage your profile information and QR code</p>
          </div>

          {/* Tabs */}
          <div className="tabs tabs-boxed justify-center">
            <button 
              className={`tab ${activeTab === 'profile' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={16} className="mr-2" />
              Profile
            </button>
            <button 
              className={`tab ${activeTab === 'qrcode' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('qrcode')}
            >
              <QrCode size={16} className="mr-2" />
              Your QR Code
            </button>
          </div>

          {activeTab === 'profile' ? (
            <>
          {/* avatar upload section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={selectedImg || authUser.profilePic || "/avatar.png"}
                alt="Profile"
                className="size-32 rounded-full object-cover border-4 "
              />
              <label
                htmlFor="avatar-upload"
                className={`
                  absolute bottom-0 right-0 
                  bg-base-content hover:scale-105
                  p-2 rounded-full cursor-pointer 
                  transition-all duration-200
                  ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}
                `}
              >
                <Camera className="w-5 h-5 text-base-200" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUpdatingProfile}
                />
              </label>
            </div>
            <p className="text-sm text-zinc-400">
              {isUpdatingProfile ? "Uploading..." : "Click the camera icon to update your photo"}
            </p>
          </div>

          <div className="space-y-6">
                {/* Bio */}
                <div className="space-y-1.5">
                  <div className="text-sm text-zinc-400 flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      About Me
                    </div>
                    <button 
                      onClick={() => toggleEditMode('bio')}
                      className="btn btn-sm btn-ghost btn-circle"
                    >
                      {editMode.bio ? <X size={16} /> : <Edit size={16} />}
                    </button>
                  </div>
                  
                  {editMode.bio ? (
                    <div className="space-y-2">
                      <div className="flex flex-col gap-2">
                        <textarea
                          name="bio"
                          value={profileData.bio}
                          onChange={handleInputChange}
                          className={`px-4 py-2.5 bg-base-200 rounded-lg border w-full ${errors.bio ? 'border-red-500' : ''}`}
                          placeholder="Write something about yourself..."
                          rows={4}
                          maxLength={150}
                        />
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-zinc-400">{profileData.bio.length}/150 characters</span>
                          <button 
                            onClick={() => handleSaveField('bio')}
                            className="btn btn-sm btn-primary"
                            disabled={isUpdatingProfile}
                          >
                            {isUpdatingProfile ? <span className="loading loading-spinner loading-xs"></span> : <Save size={16} className="mr-1" />}
                            Save
                          </button>
                        </div>
                      </div>
                      
                      {errors.bio && (
                        <div className="text-error text-xs flex items-start gap-1.5">
                          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{errors.bio}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-base-200 rounded-lg p-4">
                      <p className="text-sm">
                        {profileData.bio || "Add a bio to tell people more about yourself..."}
                      </p>
                    </div>
                  )}
                </div>

                {/* Full Name */}
            <div className="space-y-1.5">
                  <div className="text-sm text-zinc-400 flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </div>
                    <button 
                      onClick={() => toggleEditMode('fullName')}
                      className="btn btn-sm btn-ghost btn-circle"
                    >
                      {editMode.fullName ? <X size={16} /> : <Edit size={16} />}
                    </button>
            </div>

                  {editMode.fullName ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name="fullName"
                          value={profileData.fullName}
                          onChange={handleInputChange}
                          className="px-4 py-2.5 bg-base-200 rounded-lg border w-full"
                          placeholder="Your full name"
                        />
                        <button 
                          onClick={() => handleSaveField('fullName')}
                          className="btn btn-sm btn-primary"
                          disabled={isUpdatingProfile}
                        >
                          {isUpdatingProfile ? <span className="loading loading-spinner loading-xs"></span> : <Save size={16} />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-base-200 rounded-lg p-4">
                      <p className="text-sm">{profileData.fullName}</p>
                    </div>
                  )}
                </div>

                {/* Username */}
            <div className="space-y-1.5">
                  <div className="text-sm text-zinc-400 flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Username
              </div>
                    <button 
                      onClick={() => toggleEditMode('username')}
                      className={`btn btn-sm btn-ghost btn-circle ${!usernameChangeInfo.canChangeUsername ? 'text-base-content/30 cursor-not-allowed' : ''}`}
                      disabled={!usernameChangeInfo.canChangeUsername}
                    >
                      {editMode.username ? <X size={16} /> : <Edit size={16} />}
                    </button>
                  </div>
                  
                  {editMode.username ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name="username"
                          value={profileData.username}
                          onChange={handleInputChange}
                          className={`px-4 py-2.5 bg-base-200 rounded-lg border w-full ${errors.username ? 'border-red-500' : ''}`}
                          placeholder="your_username"
                        />
                        <button 
                          onClick={() => handleSaveField('username')}
                          className="btn btn-sm btn-primary"
                          disabled={isUpdatingProfile}
                        >
                          {isUpdatingProfile ? <span className="loading loading-spinner loading-xs"></span> : <Save size={16} />}
                        </button>
            </div>

                      {errors.username && (
                        <div className="text-error text-xs flex items-start gap-1.5">
                          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{errors.username}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-base-200 rounded-lg p-4">
                        <p className="text-sm">@{profileData.username}</p>
                      </div>
                      
                      {/* Username change restriction info */}
                      {!usernameChangeInfo.canChangeUsername && (
                        <div className="text-warning text-xs flex items-start gap-1.5 p-2 bg-warning/10 rounded-lg">
                          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>
                            Username can only be changed once every 10 days. 
                            You can change it again in {usernameChangeInfo.daysRemaining} day(s).
                          </span>
                        </div>
                      )}
                      
                      {usernameChangeInfo.lastChanged && usernameChangeInfo.canChangeUsername && (
                        <div className="text-info text-xs flex items-start gap-1.5 p-2 bg-info/10 rounded-lg">
                          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>
                            Last changed on {new Date(usernameChangeInfo.lastChanged).toLocaleDateString()}. 
                            You can change your username now.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Email (readonly) */}
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                    Email
                  </div>
                  <div className="bg-base-200 rounded-lg p-4">
                    <p className="text-sm">{authUser.email || "No email set"}</p>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="text-sm text-zinc-400 flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Password
                    </div>
                    <button 
                      onClick={() => toggleEditMode('password')}
                      className="btn btn-sm btn-ghost btn-circle"
                    >
                      {editMode.password ? <X size={16} /> : <Edit size={16} />}
                    </button>
                  </div>
                  
                  {editMode.password ? (
                    <div className="space-y-4">
                      {/* Current Password */}
                      <div className="space-y-2">
                        <label className="text-sm">Current Password</label>
                        <div className="relative">
                          <input
                            type={showPassword.current ? "text" : "password"}
                            name="currentPassword"
                            value={profileData.currentPassword}
                            onChange={handleInputChange}
                            className={`px-4 py-2.5 bg-base-200 rounded-lg border w-full pr-10 ${errors.currentPassword ? 'border-red-500' : ''}`}
                            placeholder="Your current password"
                          />
                          <button 
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            onClick={() => setShowPassword({...showPassword, current: !showPassword.current})}
                          >
                            {showPassword.current ? 
                              <EyeOff className="w-4 h-4 text-zinc-400" /> : 
                              <Eye className="w-4 h-4 text-zinc-400" />
                            }
                          </button>
                        </div>
                        {errors.currentPassword && (
                          <div className="text-error text-xs flex items-start gap-1.5">
                            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{errors.currentPassword}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* New Password */}
                      <div className="space-y-2">
                        <label className="text-sm">New Password</label>
                        <div className="relative">
                          <input
                            type={showPassword.new ? "text" : "password"}
                            name="newPassword"
                            value={profileData.newPassword}
                            onChange={handleInputChange}
                            className={`px-4 py-2.5 bg-base-200 rounded-lg border w-full pr-10 ${errors.newPassword ? 'border-red-500' : ''}`}
                            placeholder="Your new password"
                          />
                          <button 
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            onClick={() => setShowPassword({...showPassword, new: !showPassword.new})}
                          >
                            {showPassword.new ? 
                              <EyeOff className="w-4 h-4 text-zinc-400" /> : 
                              <Eye className="w-4 h-4 text-zinc-400" />
                            }
                          </button>
                        </div>
                        {errors.newPassword && (
                          <div className="text-error text-xs flex items-start gap-1.5">
                            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{errors.newPassword}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Password Validation */}
                      <div className="bg-base-200 rounded-lg p-3 space-y-2">
                        <h4 className="text-xs font-medium">Password requirements:</h4>
                        <ul className="space-y-1">
                          {validatePasswordCriteria(profileData.newPassword || "").map(criteria => (
                            <li 
                              key={criteria.id} 
                              className="flex items-center gap-2 text-xs"
                            >
                              {criteria.valid ? 
                                <Check className="w-3.5 h-3.5 text-success" /> : 
                                <div className="w-3.5 h-3.5 border border-base-content/30 rounded-full"></div>
                              }
                              <span className={criteria.valid ? 'text-success' : ''}>{criteria.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex justify-end">
                        <button 
                          onClick={handlePasswordSave}
                          className="btn btn-sm btn-primary"
                          disabled={isUpdatingProfile}
                        >
                          {isUpdatingProfile ? <span className="loading loading-spinner loading-xs"></span> : <Save size={16} className="mr-1" />}
                          Change Password
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-base-200 rounded-lg p-4">
                      <p className="text-sm">••••••••</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            // QR Code Tab
            <div className="flex flex-col items-center gap-6 py-4">
              {isLoadingChatHistory && (
                <div className="absolute inset-0 bg-base-300/80 flex items-center justify-center z-10">
                  <div className="flex flex-col items-center gap-2">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                    <p>Loading your chat history...</p>
            </div>
          </div>
              )}

              <div className="bg-white p-8 rounded-xl shadow-lg">
                <QRCodeSVG 
                  value={qrCodeData}
                  size={240}
                  level="H"
                  fgColor={qrCodeStyles.fgColor}
                  imageSettings={{
                    src: "/logo.svg",
                    x: undefined,
                    y: undefined,
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              </div>
              
              <div className="max-w-md text-center space-y-2">
                <h3 className="text-lg font-semibold">Your Personal QR Code</h3>
                <p className="text-sm opacity-70">
                  This QR code changes every 15 minutes for enhanced security.
                  When scanned, it will reveal your complete profile and chat history.
                </p>
                <div className="flex gap-2 justify-center items-center flex-wrap">
                  <div className="badge badge-primary">Auto-rotates every 15 minutes</div>
                  <div className="badge badge-secondary">
                    Next rotation: {timeRemaining}
                  </div>
                </div>
              </div>
              
              <div className="bg-base-200 p-4 rounded-lg w-full max-w-md">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <MessageSquare size={16} />
                  Included Data Summary
                </h4>
                <ul className="text-sm space-y-1 opacity-80">
                  <li>• Full profile (name, username, email, bio, photo)</li>
                  <li>• Account details (member since, status)</li>
                  <li>• Chat history summary ({chatHistorySummary.totalContacts} contacts, {chatHistorySummary.totalMessages} messages)</li>
                  <li>• Recent conversations and messages</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 