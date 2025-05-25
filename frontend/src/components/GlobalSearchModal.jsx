import { useState, useEffect, useRef } from "react";
import { Search, X, MessageCircle, Users, Clock, ArrowRight } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../utils/dateUtils";

const GlobalSearchModal = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({
    messages: [],
    users: [],
    groups: []
  });
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const searchInputRef = useRef(null);

  const { messages, users, allUsers, setSelectedUser, getAllUsers } = useChatStore();
  const { groups, groupMessages, setSelectedGroup } = useGroupStore();
  const { authUser } = useAuthStore();

  // Focus search input when modal opens and load all users
  useEffect(() => {
    if (isOpen) {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }

      // Load all users for search if not already loaded
      if (!allUsers || allUsers.length === 0) {
        getAllUsers();
      }
    }
  }, [isOpen]);

  // Perform search when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ messages: [], users: [], groups: [] });
      setIsSearching(false);
      return;
    }

    if (searchQuery.trim().length < 1) { // Allow single character search
      return;
    }

    setIsSearching(true);

    // Add a small delay to avoid too many searches while typing
    const searchTimeout = setTimeout(() => {
      performSearch(searchQuery.trim());
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, messages, users, allUsers, groups, groupMessages]);

  const performSearch = (query) => {
    const lowerQuery = query.toLowerCase();



    // Search users - use allUsers for comprehensive search, fallback to users
    const usersToSearch = allUsers && allUsers.length > 0 ? allUsers : users;
    const userResults = usersToSearch.filter(user =>
      user._id !== authUser._id && (
        user.fullName?.toLowerCase().includes(lowerQuery) ||
        user.username?.toLowerCase().includes(lowerQuery) ||
        user.email?.toLowerCase().includes(lowerQuery)
      )
    ).slice(0, 10);

    // Search groups
    const groupResults = groups.filter(group =>
      group.name?.toLowerCase().includes(lowerQuery) ||
      group.description?.toLowerCase().includes(lowerQuery)
    ).slice(0, 10);

    // Search personal messages
    const personalMessageResults = messages.filter(message =>
      message.text?.toLowerCase().includes(lowerQuery) && !message.isDeleted
    ).slice(0, 15);

    // Search group messages
    const groupMessageResults = groupMessages.filter(message =>
      message.text?.toLowerCase().includes(lowerQuery) && !message.isDeleted
    ).slice(0, 15);

    // Combine and sort messages by date, but keep track of type
    const allMessages = [
      ...personalMessageResults.map(msg => ({ ...msg, messageType: 'personal' })),
      ...groupMessageResults.map(msg => ({ ...msg, messageType: 'group' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
     .slice(0, 20);



    setSearchResults({
      messages: allMessages,
      users: userResults,
      groups: groupResults
    });
    setIsSearching(false);
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    onClose();
  };

  const handleGroupClick = (group) => {
    setSelectedGroup(group);
    onClose();
  };

  const handleMessageClick = (message) => {
    // Navigate to the chat/group containing this message
    if (message.groupId) {
      const group = groups.find(g => g._id === message.groupId);
      if (group) {
        setSelectedGroup(group);
      }
    } else {
      const otherUserId = message.senderId === authUser._id ? message.receiverId : message.senderId;
      const user = users.find(u => u._id === otherUserId);
      if (user) {
        setSelectedUser(user);
      }
    }
    onClose();
  };

  const getFilteredResults = () => {
    switch (activeTab) {
      case "messages":
        return { messages: searchResults.messages, users: [], groups: [] };
      case "users":
        return { messages: [], users: searchResults.users, groups: [] };
      case "groups":
        return { messages: [], users: [], groups: searchResults.groups };
      default:
        return searchResults;
    }
  };

  const getTotalResults = () => {
    return searchResults.messages.length + searchResults.users.length + searchResults.groups.length;
  };

  if (!isOpen) return null;

  const filteredResults = getFilteredResults();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-base-300">
          <div className="flex items-center gap-3 mb-4">
            <Search className="w-5 h-5 text-base-content/60" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search messages, users, and groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-lg focus:outline-none"
            />
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                activeTab === "all"
                  ? "bg-primary text-primary-content"
                  : "bg-base-200 hover:bg-base-300"
              }`}
            >
              All ({getTotalResults()})
            </button>
            <button
              onClick={() => setActiveTab("messages")}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                activeTab === "messages"
                  ? "bg-primary text-primary-content"
                  : "bg-base-200 hover:bg-base-300"
              }`}
            >
              Messages ({searchResults.messages.length})
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                activeTab === "users"
                  ? "bg-primary text-primary-content"
                  : "bg-base-200 hover:bg-base-300"
              }`}
            >
              Users ({searchResults.users.length})
            </button>
            <button
              onClick={() => setActiveTab("groups")}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                activeTab === "groups"
                  ? "bg-primary text-primary-content"
                  : "bg-base-200 hover:bg-base-300"
              }`}
            >
              Groups ({searchResults.groups.length})
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {!searchQuery.trim() ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-base-content/30 mx-auto mb-4" />
              <p className="text-base-content/60">Start typing to search messages, users, and groups</p>
            </div>
          ) : isSearching ? (
            <div className="text-center py-12">
              <div className="loading loading-spinner loading-lg"></div>
              <p className="text-base-content/60 mt-4">Searching...</p>
            </div>
          ) : getTotalResults() === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-base-content/30 mx-auto mb-4" />
              <p className="text-base-content/60">No results found for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Messages */}
              {filteredResults.messages.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-base-content/70 mb-3 flex items-center gap-2">
                    <MessageCircle size={16} />
                    Messages ({filteredResults.messages.length})
                  </h3>

                  {/* Separate personal and group messages */}
                  {(() => {
                    const personalMessages = filteredResults.messages.filter(msg => !msg.groupId);
                    const groupMessages = filteredResults.messages.filter(msg => msg.groupId);

                    return (
                      <>
                        {/* Personal Messages */}
                        {personalMessages.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-xs font-medium text-success mb-2 flex items-center gap-1">
                              <span>💬</span>
                              Personal Messages ({personalMessages.length})
                            </h4>
                            <div className="space-y-2">
                              {personalMessages.map((message) => (
                                <button
                                  key={message._id}
                                  onClick={() => handleMessageClick(message)}
                                  className="w-full p-3 bg-base-200 hover:bg-base-300 rounded-lg text-left transition-colors border-l-2 border-success"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="relative">
                                      <img
                                        src={message.senderId?.profilePic || "/avatar.png"}
                                        alt="Sender"
                                        className="w-8 h-8 rounded-full flex-shrink-0"
                                      />
                                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success text-success-content rounded-full flex items-center justify-center text-xs">
                                        💬
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-sm">
                                          {message.senderId?.fullName || "Unknown User"}
                                        </span>
                                        <span className="text-xs text-base-content/60">
                                          {formatMessageTime(message.createdAt)}
                                        </span>
                                        <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
                                          Personal
                                        </span>
                                      </div>
                                      <p className="text-sm text-base-content/80 truncate">
                                        {message.text}
                                      </p>
                                    </div>
                                    <ArrowRight size={16} className="text-base-content/40 flex-shrink-0" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Group Messages */}
                        {groupMessages.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
                              <span>👥</span>
                              Group Messages ({groupMessages.length})
                            </h4>
                            <div className="space-y-2">
                              {groupMessages.map((message) => {
                                const groupInfo = groups.find(g => g._id === message.groupId);

                                return (
                                  <button
                                    key={message._id}
                                    onClick={() => handleMessageClick(message)}
                                    className="w-full p-3 bg-base-200 hover:bg-base-300 rounded-lg text-left transition-colors border-l-2 border-primary"
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="relative">
                                        <img
                                          src={message.senderId?.profilePic || "/avatar.png"}
                                          alt="Sender"
                                          className="w-8 h-8 rounded-full flex-shrink-0"
                                        />
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary text-primary-content rounded-full flex items-center justify-center text-xs">
                                          👥
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-medium text-sm">
                                            {message.senderId?.fullName || "Unknown User"}
                                          </span>
                                          <span className="text-xs text-base-content/60">
                                            {formatMessageTime(message.createdAt)}
                                          </span>
                                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                            Group
                                          </span>
                                        </div>
                                        <p className="text-sm text-base-content/80 truncate">
                                          {message.text}
                                        </p>
                                        {groupInfo && (
                                          <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                            <span>👥</span>
                                            <span>in {groupInfo.name}</span>
                                          </p>
                                        )}
                                      </div>
                                      <ArrowRight size={16} className="text-base-content/40 flex-shrink-0" />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Users */}
              {filteredResults.users.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-base-content/70 mb-3 flex items-center gap-2">
                    <Users size={16} />
                    Users ({filteredResults.users.length})
                  </h3>
                  <div className="space-y-2">
                    {filteredResults.users.map((user) => (
                      <button
                        key={user._id}
                        onClick={() => handleUserClick(user)}
                        className="w-full p-3 bg-base-200 hover:bg-base-300 rounded-lg text-left transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={user.profilePic || "/avatar.png"}
                            alt={user.fullName}
                            className="w-10 h-10 rounded-full flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user.fullName}</p>
                            <p className="text-sm text-base-content/60 truncate">@{user.username}</p>
                          </div>
                          <ArrowRight size={16} className="text-base-content/40 flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Groups */}
              {filteredResults.groups.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-base-content/70 mb-3 flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    Groups ({filteredResults.groups.length})
                  </h3>
                  <div className="space-y-2">
                    {filteredResults.groups.map((group) => (
                      <button
                        key={group._id}
                        onClick={() => handleGroupClick(group)}
                        className="w-full p-3 bg-base-200 hover:bg-base-300 rounded-lg text-left transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {group.avatar ? (
                            <img
                              src={group.avatar}
                              alt={group.name}
                              className="w-10 h-10 rounded-full flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-primary text-lg">👥</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{group.name}</p>
                            <p className="text-sm text-base-content/60 truncate">
                              {group.members?.length || 0} members
                            </p>
                          </div>
                          <ArrowRight size={16} className="text-base-content/40 flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;
