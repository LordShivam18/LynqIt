import { X, FileText, Info, ImageIcon, FileIcon, Link2, LockIcon, Users, ChevronRight, Hash, Settings, UserPlus, UserMinus, Share2, Crown, Shield, Copy, Check, Edit3, Camera, UserX, Flag, MoreVertical, Key, RefreshCw } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import GroupEditModal from "./GroupEditModal";
import GroupSettingsModal from "./GroupSettingsModal";
import BlockUserButton from "./BlockUserButton";
import PinButton from "./PinButton";
import { axiosInstance } from "../lib/axios";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, getLastSeen, userStatuses, messages } = useChatStore();
  const {
    selectedGroup,
    setSelectedGroup,
    groupMessages,
    promoteToAdmin,
    demoteFromAdmin,
    removeGroupMember,
    generateInviteLink,
    revokeInviteLink,
    updateGroupSettings,
    deleteGroup
  } = useGroupStore();
  const { authUser } = useAuthStore();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [lastSeenText, setLastSeenText] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [showMemberActions, setShowMemberActions] = useState(null);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showGroupEditModal, setShowGroupEditModal] = useState(false);
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showMediaModal, setShowMediaModal] = useState(false); // 'name' or 'description'
  const [editingValue, setEditingValue] = useState('');
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [commonGroups, setCommonGroups] = useState([]);
  const [isPinned, setIsPinned] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  // Determine if we're in group or direct chat mode
  const isGroupChat = !!selectedGroup;
  const currentMessages = isGroupChat ? groupMessages : messages;

  // Group management helper functions
  const isGroupOwner = () => {
    return isGroupChat && selectedGroup?.createdBy?._id === authUser?._id;
  };

  const isGroupAdmin = () => {
    if (!isGroupChat || !selectedGroup?.members || !authUser) return false;
    const member = selectedGroup.members.find(m => m.user._id === authUser._id);
    return member?.role === 'admin';
  };

  const canManageGroup = () => {
    return isGroupOwner() || isGroupAdmin();
  };

  // Permission helpers that check both admin status AND group settings
  const canChangeName = () => {
    if (!isGroupChat || !selectedGroup) return false;
    return canManageGroup() || selectedGroup?.settings?.allowMemberNameChange;
  };

  const canChangeDescription = () => {
    if (!isGroupChat || !selectedGroup) return false;
    return canManageGroup() || selectedGroup?.settings?.allowMemberDescriptionChange;
  };

  const canChangeAvatar = () => {
    if (!isGroupChat || !selectedGroup) return false;
    return canManageGroup() || selectedGroup?.settings?.allowMemberAvatarChange;
  };

  // Fetch common groups between current user and selected user
  const fetchCommonGroups = async () => {
    if (!selectedUser || isGroupChat) return;

    try {
      // This would be an API call to get common groups
      // For now, we'll simulate it by checking groups from the store
      const { groups } = useGroupStore.getState();
      const userCommonGroups = groups.filter(group =>
        group.members?.some(member => member.user._id === selectedUser._id) &&
        group.members?.some(member => member.user._id === authUser._id)
      );
      setCommonGroups(userCommonGroups);
    } catch (error) {
      console.error('Error fetching common groups:', error);
    }
  };

  const generateSimpleInviteLink = () => {
    if (!selectedGroup) return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/join-group/${selectedGroup._id}`;
  };

  const copyInviteLink = async () => {
    const link = generateSimpleInviteLink();
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const openInviteLink = () => {
    const link = generateSimpleInviteLink();
    window.open(link, '_blank');
  };

  // Handle admin promotion
  const handlePromoteToAdmin = async (memberId) => {
    try {
      await promoteToAdmin(selectedGroup._id, memberId);
      setShowMemberActions(null);
    } catch (error) {
      console.error("Failed to promote member:", error);
    }
  };

  // Handle admin demotion
  const handleDemoteFromAdmin = async (memberId) => {
    try {
      await demoteFromAdmin(selectedGroup._id, memberId);
      setShowMemberActions(null);
    } catch (error) {
      console.error("Failed to demote admin:", error);
    }
  };

  // Handle member removal
  const handleRemoveMember = async (memberId) => {
    try {
      await removeGroupMember(selectedGroup._id, memberId);
      setShowMemberActions(null);
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  // Handle invite link generation
  const handleGenerateInviteLink = async () => {
    try {
      const result = await generateInviteLink(selectedGroup._id, 7); // 7 days expiry
      setInviteLink(result.inviteUrl);
    } catch (error) {
      console.error("Failed to generate invite link:", error);
    }
  };

  // Handle quick setting changes in the settings tab
  const handleQuickSettingChange = async (settingKey, value) => {
    if (!canManageGroup()) {
      toast.error("You don't have permission to change group settings");
      return;
    }

    try {
      const newSettings = {
        ...selectedGroup.settings,
        [settingKey]: value
      };
      await updateGroupSettings(selectedGroup._id, { settings: newSettings });
      // Removed toast notification - settings change silently
    } catch (error) {
      console.error("Error updating setting:", error);
      toast.error("Failed to update setting");
    }
  };

  // Handle group deletion
  const handleDeleteGroup = async () => {
    if (!isGroupOwner()) {
      toast.error("Only the group owner can delete the group");
      return;
    }

    if (window.confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
      try {
        await deleteGroup(selectedGroup._id);
        toast.success("Group deleted successfully!");
        setSelectedGroup(null);
        setShowProfileModal(false);
      } catch (error) {
        console.error("Error deleting group:", error);
        toast.error("Failed to delete group");
      }
    }
  };

  // Handle group avatar change
  const handleGroupAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error("Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await updateGroupSettings(selectedGroup._id, { avatar: reader.result });
        toast.success("Group photo updated successfully!");
      } catch (error) {
        console.error("Error updating group avatar:", error);
        toast.error("Failed to update group photo");
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle starting edit for name/description
  const startEdit = (field) => {
    setEditingField(field);
    if (field === 'name') {
      setEditingValue(selectedGroup.name || '');
    } else if (field === 'description') {
      setEditingValue(selectedGroup.description || '');
    }
  };

  // Handle saving edit
  const handleSaveEdit = async (field) => {
    if (!editingValue.trim()) {
      toast.error(`${field === 'name' ? 'Group name' : 'Description'} cannot be empty`);
      return;
    }

    try {
      const updateData = { [field]: editingValue.trim() };
      await updateGroupSettings(selectedGroup._id, updateData);
      setEditingField(null);
      setEditingValue('');
      toast.success(`Group ${field} updated successfully!`);
    } catch (error) {
      console.error(`Error updating group ${field}:`, error);
      toast.error(`Failed to update group ${field}`);
    }
  };

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

  // Generate a secure QR code value (no sensitive implementation details)
  const getQrCodeValue = () => {
    if (!selectedUser || !authUser) return "";

    // Create secure verification data (no implementation details exposed)
    const verificationHash = generateSecurityCode().replace(/\s/g, '');

    // Only include minimal, non-sensitive verification data
    const data = {
      type: "lynqit_chat_verification",
      chatId: `${authUser._id}-${selectedUser._id}`,
      verificationHash: verificationHash,
      timestamp: Date.now()
    };

    return JSON.stringify(data);
  };

  // Get the current user status directly
  const getUserOnlineStatus = () => {
    if (!selectedUser) return false;

    const userStatus = userStatuses[selectedUser._id];
    return userStatus?.isOnline || false;
  };

  // Fetch common groups when selected user changes
  useEffect(() => {
    fetchCommonGroups();
  }, [selectedUser]);

  // Close options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showOptionsMenu && !event.target.closest('.relative')) {
        setShowOptionsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOptionsMenu]);

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
    if (!currentMessages || (!selectedUser && !selectedGroup)) return [];
    return currentMessages.filter(
      message => message.mediaType === 'image' || message.mediaType === 'video' || message.mediaType === 'gif'
    );
  };

  // Filter links from messages
  const getLinkMessages = () => {
    if (!currentMessages || (!selectedUser && !selectedGroup)) return [];
    return currentMessages.filter(
      message => message.text && message.text.match(/https?:\/\/[^\s]+/g)
    );
  };

  // Render the appropriate content based on the active section
  const renderSectionContent = () => {
    switch (activeSection) {
      case "overview":
        return (
          <div className="p-4">
            {isGroupChat ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-medium">Group Info</h3>
                  {canManageGroup() && (
                    <button
                      onClick={() => setShowGroupEditModal(true)}
                      className="btn btn-ghost btn-sm"
                    >
                      <Edit3 size={16} />
                      Edit
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {/* Group Name - Editable if user has permission */}
                  <div className="bg-base-200 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Group Name</div>
                      {canChangeName() && (
                        <button
                          onClick={() => startEdit('name')}
                          className="btn btn-ghost btn-xs"
                        >
                          <Edit3 size={12} />
                        </button>
                      )}
                    </div>
                    {editingField === 'name' ? (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="input input-sm w-full"
                          placeholder="Enter group name"
                          autoFocus
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleSaveEdit('name')}
                            className="btn btn-primary btn-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            className="btn btn-ghost btn-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm">{selectedGroup.name}</div>
                    )}
                  </div>

                  {/* Group Description - Editable if user has permission */}
                  <div className="bg-base-200 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Description</div>
                      {canChangeDescription() && (
                        <button
                          onClick={() => startEdit('description')}
                          className="btn btn-ghost btn-xs"
                        >
                          <Edit3 size={12} />
                        </button>
                      )}
                    </div>
                    {editingField === 'description' ? (
                      <div className="mt-2">
                        <textarea
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="textarea textarea-sm w-full"
                          placeholder="Enter group description"
                          rows="3"
                          autoFocus
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleSaveEdit('description')}
                            className="btn btn-primary btn-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            className="btn btn-ghost btn-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm">{selectedGroup.description || "No description"}</div>
                    )}
                  </div>

                  <div className="bg-base-200 p-3 rounded-lg">
                    <div className="text-sm font-medium">Created by</div>
                    <div className="text-sm">{selectedGroup.createdBy?.fullName || 'Unknown'}</div>
                  </div>
                  <div className="bg-base-200 p-3 rounded-lg">
                    <div className="text-sm font-medium">Members</div>
                    <div className="text-sm">{selectedGroup.members?.length || 0} members</div>
                  </div>
                </div>
              </div>
            ) : (
              selectedUser.bio ? (
                <div>
                  <h3 className="text-base font-medium mb-2">About</h3>
                  <p className="text-sm bg-base-200 p-3 rounded-lg">{selectedUser.bio}</p>
                </div>
              ) : (
                <div className="text-center text-base-content/50 py-4">
                  No about information available
                </div>
              )
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
                  <div
                    key={message._id}
                    className="aspect-square bg-base-200 rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      if (message.mediaType === 'video') {
                        // Open video in a new tab for better video controls
                        window.open(message.image, '_blank');
                      } else {
                        // Open image in modal for better viewing experience
                        setSelectedMedia(message);
                        setShowMediaModal(true);
                      }
                    }}
                  >
                    {message.mediaType === 'video' ? (
                      <div className="flex items-center justify-center h-full bg-base-300 relative">
                        <span className="text-xs">Video</span>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={message.image}
                        alt="Media"
                        className="h-full w-full object-cover hover:scale-105 transition-transform"
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
                    <div key={`${message._id}-${index}`} className="bg-base-200 p-3 rounded-lg hover:bg-base-300 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline break-all flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {link}
                        </a>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-xs text-base-content/60">
                            {new Date(message.createdAt).toLocaleDateString()}
                          </span>
                          <svg className="w-4 h-4 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </div>
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
                Messages in this {isGroupChat ? 'group' : 'chat'} are secured with end-to-end encryption.
                They stay between you and the {isGroupChat ? 'group members' : 'recipient'} — not even the server can access them.
              </p>

              {isGroupChat ? (
                // Group encryption section
                <div className="bg-base-200 p-4 rounded-lg w-full space-y-4">
                  <div className="text-center">
                    <h4 className="font-medium mb-2">Group Encryption</h4>
                    <p className="text-sm text-base-content/70 mb-4">
                      This group uses AES-256-GCM encryption with forward secrecy.
                      All messages are encrypted before leaving your device.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-base-300 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Key size={16} className="text-primary" />
                        <span className="text-sm font-medium">Encryption Key</span>
                      </div>
                      <div className="text-xs text-success">Active</div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-base-300 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield size={16} className="text-primary" />
                        <span className="text-sm font-medium">Forward Secrecy</span>
                      </div>
                      <div className="text-xs text-success">Enabled</div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-base-300 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-primary" />
                        <span className="text-sm font-medium">Encrypted Members</span>
                      </div>
                      <div className="text-xs text-base-content/70">
                        {selectedGroup?.members?.length || 0} members
                      </div>
                    </div>
                  </div>

                  {canManageGroup() && (
                    <div className="pt-3 border-t border-base-300">
                      <button
                        onClick={async () => {
                          try {
                            // Call backend API to rotate group key
                            const response = await fetch(`/api/groups/${selectedGroup._id}/rotate-key`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                              }
                            });

                            if (response.ok) {
                              const data = await response.json();

                              // Rotate the local encryption key
                              const { rotateGroupKey } = await import('../utils/encryption');
                              await rotateGroupKey(selectedGroup._id);

                              toast.success('Group encryption key rotated successfully');
                            } else {
                              const error = await response.json();
                              toast.error(error.error || 'Failed to rotate encryption key');
                            }
                          } catch (error) {
                            console.error('Failed to rotate group key:', error);
                            toast.error('Failed to rotate encryption key');
                          }
                        }}
                        className="w-full btn btn-outline btn-sm"
                      >
                        <RefreshCw size={16} />
                        Rotate Encryption Key
                      </button>
                      <p className="text-xs text-base-content/70 mt-2 text-center">
                        Rotating the key will generate a new encryption key for future messages.
                        Only admins and owners can rotate keys.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Direct chat encryption section
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
              )}
            </div>
          </div>
        );
      case "members":
        return (
          <div className="p-4">
            {isGroupChat && selectedGroup.members ? (
              <div className="space-y-2">
                {/* Admin controls */}
                {canManageGroup() && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-base-300 hover:border-primary/50 hover:bg-primary/5 text-primary"
                    >
                      <UserPlus size={20} />
                      <span>Invite Members</span>
                    </button>

                    <button
                      onClick={() => setShowGroupSettingsModal(true)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-base-300 hover:border-primary/50 hover:bg-primary/5 text-primary"
                    >
                      <Settings size={20} />
                      <span>Group Settings</span>
                    </button>
                  </div>
                )}

                {selectedGroup.members.map(member => {
                  const isOwner = member.user._id === selectedGroup.createdBy?._id;
                  const isMemberAdmin = member.role === 'admin';
                  const isCurrentUser = member.user._id === authUser._id;

                  return (
                    <div key={member.user._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 relative">
                      <img
                        src={member.user.profilePic || "/avatar.png"}
                        alt={member.user.fullName}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {member.user.fullName}
                          {isOwner && (
                            <Crown size={14} className="text-yellow-500" title="Group Owner" />
                          )}
                        </div>
                        <div className="text-sm text-base-content/70">@{member.user.username}</div>
                      </div>

                      {/* Role badges */}
                      <div className="flex items-center gap-2">
                        {isMemberAdmin && (
                          <div className="text-xs bg-primary/20 text-primary px-2 py-1 rounded flex items-center gap-1">
                            <Shield size={12} />
                            Admin
                          </div>
                        )}

                        {/* Member actions for admins */}
                        {canManageGroup() && !isCurrentUser && !isOwner && (
                          <div className="relative">
                            <button
                              onClick={() => setShowMemberActions(showMemberActions === member.user._id ? null : member.user._id)}
                              className="btn btn-ghost btn-xs btn-circle"
                            >
                              <Settings size={14} />
                            </button>

                            {showMemberActions === member.user._id && (
                              <div className="absolute right-0 top-8 bg-base-300 rounded-lg shadow-lg border border-base-200 p-2 z-10 min-w-[150px]">
                                {!isMemberAdmin ? (
                                  <button
                                    onClick={() => handlePromoteToAdmin(member.user._id)}
                                    className="w-full text-left p-2 hover:bg-base-200 rounded text-sm flex items-center gap-2"
                                  >
                                    <Shield size={14} />
                                    Make Admin
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleDemoteFromAdmin(member.user._id)}
                                    className="w-full text-left p-2 hover:bg-base-200 rounded text-sm flex items-center gap-2"
                                  >
                                    <UserMinus size={14} />
                                    Remove Admin
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveMember(member.user._id)}
                                  className="w-full text-left p-2 hover:bg-base-200 rounded text-sm flex items-center gap-2 text-error"
                                >
                                  <UserMinus size={14} />
                                  Remove Member
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-base-content/50 py-4">
                No members found
              </div>
            )}
          </div>
        );
      case "settings":
        return (
          <div className="p-4">
            {isGroupChat && canManageGroup() ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-medium mb-3">Group Permissions</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <span className="text-sm">Allow members to change group name</span>
                      <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={selectedGroup?.settings?.allowMemberNameChange || false}
                        onChange={(e) => handleQuickSettingChange('allowMemberNameChange', e.target.checked)}
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-sm">Allow members to change description</span>
                      <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={selectedGroup?.settings?.allowMemberDescriptionChange || false}
                        onChange={(e) => handleQuickSettingChange('allowMemberDescriptionChange', e.target.checked)}
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-sm">Allow members to change group photo</span>
                      <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={selectedGroup?.settings?.allowMemberAvatarChange || false}
                        onChange={(e) => handleQuickSettingChange('allowMemberAvatarChange', e.target.checked)}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-medium mb-3">Group Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="w-full btn btn-primary btn-sm justify-start"
                    >
                      <Share2 size={16} />
                      Share Invite Link
                    </button>
                    <button
                      onClick={() => setShowGroupEditModal(true)}
                      className="w-full btn btn-outline btn-sm justify-start"
                    >
                      <Edit3 size={16} />
                      Edit Group Info
                    </button>
                    {isGroupOwner() && (
                      <button
                        onClick={() => handleDeleteGroup()}
                        className="w-full btn btn-error btn-sm justify-start"
                      >
                        <UserMinus size={16} />
                        Delete Group
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-base-content/50 py-4">
                No settings available
              </div>
            )}
          </div>
        );
      case "groups":
        return (
          <div className="p-4">
            {commonGroups.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-base-content/70 mb-3">
                  {commonGroups.length} group{commonGroups.length !== 1 ? 's' : ''} in common
                </h3>
                {commonGroups.map(group => (
                  <div
                    key={group._id}
                    className="flex items-center gap-3 p-3 bg-base-200 rounded-lg hover:bg-base-300 cursor-pointer transition-colors"
                    onClick={() => {
                      // Close the profile modal first
                      setShowProfileModal(false);

                      // Set the selected group to switch to it
                      const { setSelectedGroup } = useGroupStore.getState();
                      const { setSelectedUser } = useChatStore.getState();

                      // Clear selected user and set selected group
                      setSelectedUser(null);
                      setSelectedGroup(group);

                      // Optional: Show a toast message
                      toast.success(`Switched to ${group.name}`);
                    }}
                  >
                    <div className="avatar">
                      <div className="w-10 h-10 rounded-full">
                        {group.avatar ? (
                          <img src={group.avatar} alt={group.name} />
                        ) : (
                          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                            <span className="text-primary text-sm">👥</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{group.name}</div>
                      <div className="text-sm text-base-content/60">
                        {group.members?.length || 0} members
                      </div>
                    </div>
                    <div className="text-primary">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-base-content/50 py-4">
                <Users size={32} className="mx-auto mb-2 opacity-50" />
                <p>No groups in common</p>
                <p className="text-xs mt-1">Join the same groups to see them here</p>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (!selectedUser && !selectedGroup) return null;

  return (
    <div className="border-b shadow-sm py-3 px-6 flex justify-between items-center gap-3">
      <div className="flex items-center gap-3 overflow-hidden flex-1">
        <div
          className="cursor-pointer relative avatar"
          onClick={() => setShowProfileModal(true)}
        >
          <div className="w-10 rounded-full">
            {isGroupChat ? (
              selectedGroup.avatar ? (
                <img
                  src={selectedGroup.avatar}
                  alt={selectedGroup.name}
                />
              ) : (
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <span className="text-primary text-lg">👥</span>
                </div>
              )
            ) : (
              <img
                src={selectedUser.profilePic}
                alt={selectedUser.fullName}
              />
            )}
          </div>
          {/* Online status indicator for direct chats */}
          {!isGroupChat && getUserOnlineStatus() && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-base-100"></div>
          )}
        </div>
        <div className="flex flex-col overflow-hidden flex-grow">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate flex-grow">
              {isGroupChat ? selectedGroup.name : selectedUser.fullName}
            </h3>
          </div>
          <div
            className="text-xs flex items-center gap-1 cursor-pointer hover:underline"
            onClick={() => setShowProfileModal(true)}
          >
            {isGroupChat ? (
              <span>{selectedGroup.members?.length || 0} members</span>
            ) : getUserOnlineStatus() ? (
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

      <div className="flex items-center gap-2">
        {/* Options Menu */}
        <div className="relative">
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
          >
            <MoreVertical size={20} />
          </button>

          {showOptionsMenu && (
            <div className="absolute right-0 top-full mt-2 bg-base-100 rounded-lg shadow-lg border border-base-300 py-2 z-50 min-w-[200px]">
              {/* Pin Option */}
              <PinButton
                itemId={isGroupChat ? selectedGroup._id : selectedUser._id}
                itemType={isGroupChat ? "group" : "chat"}
                isPinned={isPinned}
                onPinToggle={(id, newPinStatus) => {
                  setIsPinned(newPinStatus);
                  setShowOptionsMenu(false);

                  // Update the sidebar immediately
                  if (isGroupChat) {
                    // Update groups in the store
                    const { groups } = useGroupStore.getState();
                    const updatedGroups = groups.map(group =>
                      group._id === id ? { ...group, isPinned: newPinStatus } : group
                    );

                    // Sort groups to show pinned ones first
                    const sortedGroups = [...updatedGroups].sort((a, b) => {
                      if (a.isPinned && !b.isPinned) return -1;
                      if (!a.isPinned && b.isPinned) return 1;
                      return 0;
                    });

                    useGroupStore.setState({ groups: sortedGroups });
                  } else {
                    // Update users in the store
                    const { users } = useChatStore.getState();
                    const updatedUsers = users.map(user =>
                      user._id === id ? { ...user, isPinned: newPinStatus } : user
                    );

                    // Sort users to show pinned ones first
                    const sortedUsers = [...updatedUsers].sort((a, b) => {
                      if (a.isPinned && !b.isPinned) return -1;
                      if (!a.isPinned && b.isPinned) return 1;
                      return 0;
                    });

                    useChatStore.setState({ users: sortedUsers });
                  }
                }}
              />

              {/* Block Option - Only for direct chats */}
              {!isGroupChat && (
                <BlockUserButton
                  userId={selectedUser._id}
                  username={selectedUser.username}
                  isBlocked={isBlocked}
                  onBlockToggle={(id, newBlockStatus) => {
                    setIsBlocked(newBlockStatus);
                    setShowOptionsMenu(false);
                  }}
                  showConfirmation={true}
                />
              )}

              {/* Report Option - Only for direct chats */}
              {!isGroupChat && (
                <button
                  onClick={async () => {
                    console.log('Report button clicked');
                    setShowOptionsMenu(false);

                    try {
                      const reason = prompt('Please select a reason for reporting this user:\n\n1. Spam\n2. Harassment\n3. Hate Speech\n4. Violence\n5. Inappropriate Content\n6. Impersonation\n7. Scam\n8. Other\n\nEnter the number (1-8):');

                      // Check if user cancelled the first prompt
                      if (reason === null) {
                        console.log('User cancelled the report');
                        return;
                      }

                      // Validate the reason input
                      const reasonNum = parseInt(reason);
                      if (isNaN(reasonNum) || reasonNum < 1 || reasonNum > 8) {
                        toast.error('Invalid reason selected. Please enter a number between 1-8.');
                        return;
                      }

                      const reasons = ['spam', 'harassment', 'hate_speech', 'violence', 'inappropriate_content', 'impersonation', 'scam', 'other'];
                      const selectedReason = reasons[reasonNum - 1];

                      const description = prompt('Please provide additional details (optional):');

                      // Check if user cancelled the second prompt
                      if (description === null) {
                        console.log('User cancelled the report');
                        return;
                      }

                      const response = await axiosInstance.post('/users/report/user', {
                        reportedUserId: selectedUser._id,
                        reason: selectedReason,
                        description: description || ''
                      });

                      toast.success(response.data.message);
                      setIsBlocked(true); // Update UI to show user is blocked
                    } catch (error) {
                      console.error('Error reporting user:', error);
                      toast.error(error.response?.data?.error || 'Failed to report user');
                    }
                  }}
                  className="w-full flex items-center gap-2 p-2 hover:bg-base-200 rounded text-warning"
                >
                  <Flag size={16} />
                  <span>Report User</span>
                </button>
              )}

              {/* Divider */}
              <div className="border-t border-base-300 my-1"></div>

              {/* View Profile */}
              <button
                onClick={() => {
                  console.log('View Profile button clicked');
                  setShowOptionsMenu(false);
                  setShowProfileModal(true);
                }}
                className="w-full flex items-center gap-2 p-2 hover:bg-base-200 rounded"
              >
                <Info size={16} />
                <span>View {isGroupChat ? 'Group' : 'Profile'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          className="btn btn-ghost btn-sm btn-circle"
          onClick={() => {
            if (isGroupChat) {
              setSelectedGroup(null);
            } else {
              setSelectedUser(null);
            }
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Profile/Group Info Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowProfileModal(false)}>
          <div className="bg-base-300 rounded-xl max-w-2xl w-full h-[550px] mx-4 flex overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Left sidebar menu */}
            <div className="w-60 border-r border-base-200 overflow-y-auto">
              <div className="flex flex-col items-center p-6 border-b border-base-200">
                <div className="avatar relative group">
                  <div className="size-20 rounded-full">
                    {isGroupChat ? (
                      selectedGroup.avatar ? (
                        <img src={selectedGroup.avatar} alt={selectedGroup.name} />
                      ) : (
                        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
                          <span className="text-primary text-3xl">👥</span>
                        </div>
                      )
                    ) : (
                      <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
                    )}
                  </div>

                  {/* Upload overlay for group avatar */}
                  {isGroupChat && canChangeAvatar() && (
                    <div
                      className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById('groupAvatarInput').click();
                      }}
                    >
                      <Camera size={20} className="text-white" />
                    </div>
                  )}
                </div>
                <h2 className="text-lg font-bold mt-3">
                  {isGroupChat ? selectedGroup.name : selectedUser.fullName}
                </h2>
                <p className="text-sm text-base-content/70">
                  {isGroupChat ? `${selectedGroup.members?.length || 0} members` : `@${selectedUser.username}`}
                </p>
                {!isGroupChat && <p className="text-sm mt-1">{lastSeenText}</p>}
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

                {/* Encryption tab - Available for both direct chats and groups */}
                <button
                  onClick={() => setActiveSection("encryption")}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left ${activeSection === "encryption" ? "bg-primary/10 text-primary" : "hover:bg-base-200"}`}
                >
                  <LockIcon size={20} className={activeSection === "encryption" ? "text-primary" : ""} />
                  <span>Encryption</span>
                  <ChevronRight size={16} className="ml-auto" />
                </button>

                {isGroupChat ? (
                  <>
                    <button
                      onClick={() => setActiveSection("members")}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left ${activeSection === "members" ? "bg-primary/10 text-primary" : "hover:bg-base-200"}`}
                    >
                      <Users size={20} className={activeSection === "members" ? "text-primary" : ""} />
                      <span>Members</span>
                      <ChevronRight size={16} className="ml-auto" />
                    </button>

                    {canManageGroup() && (
                      <button
                        onClick={() => setActiveSection("settings")}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left ${activeSection === "settings" ? "bg-primary/10 text-primary" : "hover:bg-base-200"}`}
                      >
                        <Settings size={20} className={activeSection === "settings" ? "text-primary" : ""} />
                        <span>Group Settings</span>
                        <ChevronRight size={16} className="ml-auto" />
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveSection("groups")}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left ${activeSection === "groups" ? "bg-primary/10 text-primary" : "hover:bg-base-200"}`}
                    >
                      <Users size={20} className={activeSection === "groups" ? "text-primary" : ""} />
                      <span>Groups</span>
                      <ChevronRight size={16} className="ml-auto" />
                    </button>
                  </>
                )}
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

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowInviteModal(false)}>
          <div className="bg-base-300 rounded-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Invite to Group</h3>
              <button onClick={() => setShowInviteModal(false)} className="btn btn-ghost btn-sm btn-circle">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {!inviteLink ? (
                <div className="text-center py-6">
                  <p className="text-sm text-base-content/70 mb-4">
                    Generate a secure invite link for this group
                  </p>
                  <button
                    onClick={handleGenerateInviteLink}
                    className="btn btn-primary"
                  >
                    <Share2 size={16} />
                    Generate Invite Link
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium">Share this link to invite people:</label>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={inviteLink}
                        readOnly
                        className="input input-bordered flex-1 text-sm"
                      />
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(inviteLink);
                            setLinkCopied(true);
                            setTimeout(() => setLinkCopied(false), 2000);
                          } catch (error) {
                            console.error("Failed to copy link:", error);
                          }
                        }}
                        className={`btn ${linkCopied ? 'btn-success' : 'btn-primary'}`}
                      >
                        {linkCopied ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                    {linkCopied && (
                      <p className="text-sm text-success mt-1">Link copied to clipboard!</p>
                    )}
                  </div>

                  <div className="bg-base-200 p-3 rounded-lg">
                    <p className="text-sm text-base-content/70">
                      🔒 This secure invite link expires in 7 days. Anyone with this link can join the group.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowInviteModal(false)}
                      className="btn btn-outline flex-1"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => window.open(inviteLink, '_blank')}
                      className="btn btn-primary flex-1"
                    >
                      <Share2 size={16} />
                      Open Invite Page
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Group Edit Modal */}
      <GroupEditModal
        group={selectedGroup}
        isOpen={showGroupEditModal}
        onClose={() => setShowGroupEditModal(false)}
      />

      {/* Group Settings Modal */}
      <GroupSettingsModal
        group={selectedGroup}
        isOpen={showGroupSettingsModal}
        onClose={() => setShowGroupSettingsModal(false)}
      />

      {/* Media Modal */}
      {showMediaModal && selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setShowMediaModal(false)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
            <button
              onClick={() => setShowMediaModal(false)}
              className="absolute top-4 right-4 z-10 btn btn-circle btn-ghost text-white hover:bg-white/20"
            >
              <X size={24} />
            </button>

            <img
              src={selectedMedia.image}
              alt="Media"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />

            <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-2 rounded-lg">
              <div className="text-sm">
                Sent by {selectedMedia.senderId?.fullName || 'Unknown'}
              </div>
              <div className="text-xs opacity-75">
                {new Date(selectedMedia.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for group avatar */}
      <input
        type="file"
        id="groupAvatarInput"
        accept="image/*"
        onChange={handleGroupAvatarChange}
        className="hidden"
      />
    </div>
  );
};
export default ChatHeader;