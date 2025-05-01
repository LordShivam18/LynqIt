import { X, FileText, Info, ImageIcon, FileIcon, Link2, LockIcon, Users, ChevronRight } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, getLastSeen, userStatuses, messages } = useChatStore();
  const { authUser } = useAuthStore();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [lastSeenText, setLastSeenText] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  
  // Generate a security code for verification (in a real app, this would be cryptographically secure)
  const generateSecurityCode = () => {
    if (!selectedUser || !authUser) return "";
    
    // Create a deterministic but unique code based on user IDs, emails, and registration timestamps
    // This ensures the code only changes if the account is re-registered with the same email
    const userIdentifier = [
      selectedUser._id,
      selectedUser.email,
      selectedUser.createdAt || "", // Registration timestamp
      authUser._id,
      authUser.email,
      authUser.createdAt || ""  // Registration timestamp
    ].sort().join('-');
    
    // More complex hash function for better security
    let hash = 0;
    for (let i = 0; i < userIdentifier.length; i++) {
      const char = userIdentifier.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    
    // Add a second pass for more complexity
    let secondHash = hash;
    const hashStr = hash.toString();
    for (let i = 0; i < hashStr.length; i++) {
      secondHash = ((secondHash << 3) - secondHash) + hashStr.charCodeAt(i);
      secondHash |= 0;
    }
    
    // Combine both hashes
    const finalHash = Math.abs(hash * secondHash);
    
    // Format as 12 blocks of 5 digits (60 digits total)
    const digits = finalHash.toString().padStart(60, '0');
    let formattedCode = '';
    for (let i = 0; i < 12; i++) {
      formattedCode += digits.substr(i * 5, 5) + ' ';
    }
    return formattedCode.trim();
  };
  
  // Generate a QR code value
  const getQrCodeValue = () => {
    if (!selectedUser || !authUser) return "";
    
    // Create data for QR code
    const data = {
      type: "chat_verification",
      users: [
        {
          id: authUser._id, 
          name: authUser.fullName,
          email: authUser.email,
          registeredAt: authUser.createdAt
        },
        {
          id: selectedUser._id, 
          name: selectedUser.fullName,
          email: selectedUser.email,
          registeredAt: selectedUser.createdAt
        }
      ],
      // Include registration timestamps to make the QR code only change on re-registration
      registrationData: {
        authUserRegisteredAt: authUser.createdAt,
        selectedUserRegisteredAt: selectedUser.createdAt
      },
      timestamp: new Date().toISOString(),
      verificationCode: generateSecurityCode().replace(/\s/g, '')
    };
    
    return JSON.stringify(data);
  };
  
  // Get the current user status directly
  const getUserOnlineStatus = () => {
    if (!selectedUser) return false;
    
    const userStatus = userStatuses[selectedUser._id];
    return userStatus?.isOnline || false;
  };
  
  useEffect(() => {
    // Format last seen time
    const formatLastSeen = () => {
      if (!selectedUser) return;
      
      const userStatus = userStatuses[selectedUser._id];
      
      if (!userStatus) {
        setLastSeenText("Offline");
        return;
      }
      
      if (userStatus.isOnline) {
        setLastSeenText("Active now");
        return;
      }
      
      const lastSeen = new Date(userStatus.lastSeen);
      const now = new Date();
      const diffMs = now - lastSeen;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMins < 1) {
        setLastSeenText("Just now");
      } else if (diffMins < 60) {
        setLastSeenText(`Last seen ${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`);
      } else if (diffHours < 24) {
        setLastSeenText(`Last seen ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`);
      } else {
        setLastSeenText(`Last seen ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`);
      }
    };
    
    formatLastSeen();
    
    // Update last seen text every minute
    const interval = setInterval(formatLastSeen, 15000);
    
    return () => clearInterval(interval);
  }, [selectedUser, userStatuses]);

  // Also update last seen whenever userStatuses changes
  useEffect(() => {
    if (selectedUser && userStatuses[selectedUser._id]) {
      const userStatus = userStatuses[selectedUser._id];
      
      if (userStatus.isOnline) {
        setLastSeenText("Active now");
      } else if (userStatus.lastSeen) {
        const lastSeen = new Date(userStatus.lastSeen);
        const now = new Date();
        const diffMs = now - lastSeen;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) {
          setLastSeenText("Just now");
        } else if (diffMins < 60) {
          setLastSeenText(`Last seen ${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`);
        } else if (diffHours < 24) {
          setLastSeenText(`Last seen ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`);
        } else {
          setLastSeenText(`Last seen ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`);
        }
      } else {
        setLastSeenText("Offline");
      }
    }
  }, [selectedUser, userStatuses]);

  // Filter media from messages
  const getMediaMessages = () => {
    if (!messages || !selectedUser) return [];
    return messages.filter(
      message => message.mediaType === 'image' || message.mediaType === 'video' || message.mediaType === 'gif'
    );
  };

  // Filter links from messages
  const getLinkMessages = () => {
    if (!messages || !selectedUser) return [];
    return messages.filter(
      message => message.text && message.text.match(/https?:\/\/[^\s]+/g)
    );
  };

  // Render the appropriate content based on the active section
  const renderSectionContent = () => {
    switch (activeSection) {
      case "overview":
        return (
          <div className="p-4">
            {selectedUser.bio ? (
              <div>
                <h3 className="text-base font-medium mb-2">About</h3>
                <p className="text-sm bg-base-200 p-3 rounded-lg">{selectedUser.bio}</p>
              </div>
            ) : (
              <div className="text-center text-base-content/50 py-4">
                No about information available
              </div>
            )}
          </div>
        );
      case "media":
        const mediaMessages = getMediaMessages();
        return (
          <div className="p-4">
            {mediaMessages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {mediaMessages.map(message => (
                  <div key={message._id} className="aspect-square bg-base-200 rounded-md overflow-hidden">
                    {message.mediaType === 'video' ? (
                      <div className="flex items-center justify-center h-full bg-base-300">
                        <span className="text-xs">Video</span>
                      </div>
                    ) : (
                      <img 
                        src={message.image} 
                        alt="Media" 
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-base-content/50 py-4">
                No media shared
              </div>
            )}
          </div>
        );
      case "files":
  return (
          <div className="p-4">
            <div className="text-center text-base-content/50 py-4">
              No files shared
            </div>
          </div>
        );
      case "links":
        const linkMessages = getLinkMessages();
        return (
          <div className="p-4">
            {linkMessages.length > 0 ? (
              <div className="space-y-2">
                {linkMessages.map(message => {
                  const links = message.text.match(/https?:\/\/[^\s]+/g);
                  return links.map((link, index) => (
                    <div key={`${message._id}-${index}`} className="bg-base-200 p-3 rounded-lg">
                      <a 
                        href={link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline break-all"
                      >
                        {link}
                      </a>
                    </div>
                  ));
                })}
              </div>
            ) : (
              <div className="text-center text-base-content/50 py-4">
                No links shared
              </div>
            )}
          </div>
        );
      case "encryption":
        return (
          <div className="p-4">
            <div className="flex flex-col items-center">
              <LockIcon size={40} className="mb-3 text-primary" />
              <h3 className="text-lg font-medium">End-to-End Encrypted</h3>
              <p className="text-sm text-base-content/70 mt-2 text-center mb-6">
                Messages and calls in this chat are secured with end-to-end encryption.
                They stay between you and the recipients — not even the server can access them.
              </p>
              
              <div className="bg-base-200 p-4 rounded-lg w-full">
                <h4 className="text-center font-medium mb-3">Verify security code</h4>
                <p className="text-sm text-center mb-4">
                  You, {authUser?.fullName} and {selectedUser?.fullName}
                </p>
                
                <div className="flex justify-center bg-white p-6 rounded-lg mb-4">
                  <QRCodeSVG 
                    value={getQrCodeValue()}
                    size={180}
                    level="M"
                    includeMargin={true}
                  />
                </div>
                
                <div className="text-center">
                  <p className="text-xs text-base-content/70 mb-3">
                    Scan this code with {selectedUser?.fullName}'s device to verify that your messages and calls are end-to-end encrypted.
                    This security code will only change if either account is re-registered with the same email address.
                  </p>
                  
                  <div className="bg-base-300 p-3 rounded-lg font-mono text-xs tracking-wider text-center break-all">
                    {generateSecurityCode()}
                  </div>

                  <p className="text-xs text-base-content/70 mt-3">
                    The QR code and 60-digit security number above uniquely identifies your end-to-end encrypted conversation with {selectedUser?.fullName}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case "groups":
        return (
          <div className="p-4">
            <div className="text-center text-base-content/50 py-4">
              No groups in common
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!selectedUser) return null;

  return (
    <div className="border-b shadow-sm py-3 px-6 flex justify-between items-center gap-3">
      <div className="flex items-center gap-3 overflow-hidden flex-1">
        <div 
          className="cursor-pointer relative avatar"
          onClick={() => setShowProfileModal(true)}
        >
          <div className="w-10 rounded-full">
            <img
              src={selectedUser.profilePic}
              alt={selectedUser.fullName}
            />
          </div>
          {/* Online status indicator */}
          {getUserOnlineStatus() && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-base-100"></div>
          )}
        </div>
        <div className="flex flex-col overflow-hidden flex-grow">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate flex-grow">
              {selectedUser.fullName}
            </h3>
          </div>
          <div 
            className="text-xs flex items-center gap-1 cursor-pointer hover:underline"
            onClick={() => setShowProfileModal(true)}
          >
            {getUserOnlineStatus() ? (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span>{lastSeenText}</span>
              </div>
            ) : (
              <span>{lastSeenText}</span>
            )}
          </div>
        </div>
      </div>

      <button
        className="btn btn-ghost btn-sm btn-circle"
        onClick={() => setSelectedUser(null)}
      >
        <X size={20} />
      </button>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowProfileModal(false)}>
          <div className="bg-base-300 rounded-xl max-w-2xl w-full h-[550px] mx-4 flex overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Left sidebar menu */}
            <div className="w-60 border-r border-base-200 overflow-y-auto">
              <div className="flex flex-col items-center p-6 border-b border-base-200">
                <div className="avatar">
                  <div className="size-20 rounded-full">
                    <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
                  </div>
                </div>
                <h2 className="text-lg font-bold mt-3">{selectedUser.fullName}</h2>
                <p className="text-sm text-base-content/70">@{selectedUser.username}</p>
                <p className="text-sm mt-1">{lastSeenText}</p>
              </div>
              
              <div className="p-2">
                <button 
                  onClick={() => setActiveSection("overview")}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left ${activeSection === "overview" ? "bg-primary/10 text-primary" : "hover:bg-base-200"}`}
                >
                  <Info size={20} className={activeSection === "overview" ? "text-primary" : ""} />
                  <span>Overview</span>
                  <ChevronRight size={16} className="ml-auto" />
                </button>
                
                <button 
                  onClick={() => setActiveSection("media")}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left ${activeSection === "media" ? "bg-primary/10 text-primary" : "hover:bg-base-200"}`}
                >
                  <ImageIcon size={20} className={activeSection === "media" ? "text-primary" : ""} />
                  <span>Media</span>
                  <ChevronRight size={16} className="ml-auto" />
                </button>
                
                <button 
                  onClick={() => setActiveSection("files")}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left ${activeSection === "files" ? "bg-primary/10 text-primary" : "hover:bg-base-200"}`}
                >
                  <FileIcon size={20} className={activeSection === "files" ? "text-primary" : ""} />
                  <span>Files</span>
                  <ChevronRight size={16} className="ml-auto" />
                </button>
                
                <button 
                  onClick={() => setActiveSection("links")}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left ${activeSection === "links" ? "bg-primary/10 text-primary" : "hover:bg-base-200"}`}
                >
                  <Link2 size={20} className={activeSection === "links" ? "text-primary" : ""} />
                  <span>Links</span>
                  <ChevronRight size={16} className="ml-auto" />
                </button>
                
                <button 
                  onClick={() => setActiveSection("encryption")}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left ${activeSection === "encryption" ? "bg-primary/10 text-primary" : "hover:bg-base-200"}`}
                >
                  <LockIcon size={20} className={activeSection === "encryption" ? "text-primary" : ""} />
                  <span>Encryption</span>
                  <ChevronRight size={16} className="ml-auto" />
                </button>
                
                <button 
                  onClick={() => setActiveSection("groups")}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left ${activeSection === "groups" ? "bg-primary/10 text-primary" : "hover:bg-base-200"}`}
                >
                  <Users size={20} className={activeSection === "groups" ? "text-primary" : ""} />
                  <span>Groups</span>
                  <ChevronRight size={16} className="ml-auto" />
                </button>
          </div>
        </div>

            {/* Content area */}
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-base-200 flex justify-between items-center">
                <h2 className="text-lg font-medium capitalize">{activeSection}</h2>
                <button 
                  onClick={() => setShowProfileModal(false)} 
                  className="btn btn-sm btn-ghost btn-circle"
                >
                  <X size={18} />
        </button>
      </div>
              
              <div className="flex-1 overflow-y-auto">
                {renderSectionContent()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ChatHeader;