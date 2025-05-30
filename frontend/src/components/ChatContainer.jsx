import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime, groupMessagesByDate, formatStatusTime } from "../utils/dateUtils";
import DateSeparator from "./DateSeparator";
import { X, FileText, Film, Smile, Check, Info, Trash2, MoreVertical, AlertCircle, AlertTriangle, RefreshCw, Edit, Hash, AtSign, Reply, Flag, Send } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import EditMessageModal from "./EditMessageModal";
import ForwardMessageModal from "./ForwardMessageModal";
import ReplyMessage from "./ReplyMessage";
import ReportMessageButton from "./ReportMessageButton";
import MessageStatusIndicator from "./MessageStatusIndicator";
import toast from "react-hot-toast";
// Encryption imports removed - encryption disabled

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    reactToMessage,
    deleteMessage,
    connectionStatus,
    handleSocketReconnect,
    isDeletingMessage,
    setReplyingTo
  } = useChatStore();

  const {
    selectedGroup,
    groupMessages,
    getGroupMessages,
    isGroupMessagesLoading,
    sendGroupMessage
  } = useGroupStore();

  // Decryption removed - all messages are plain text

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const emojiPickerRef = useRef(null);
  const moreOptionsRef = useRef(null);
  const contextMenuRef = useRef(null);
  const [showMessageOptions, setShowMessageOptions] = useState(null);
  const [timeFormatKey, setTimeFormatKey] = useState(0); // Force re-render when time format changes
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  // Encryption and decryption removed - all messages are plain text

  // Common reaction emojis for quick access
  const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "😡"];

  // Determine if we're in group or direct chat mode
  const isGroupChat = !!selectedGroup;
  const currentMessages = isGroupChat ? groupMessages : messages;
  const isCurrentMessagesLoading = isGroupChat ? isGroupMessagesLoading : isMessagesLoading;

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id);
    }
  }, [selectedUser, getMessages]);

  useEffect(() => {
    if (selectedGroup) {
      getGroupMessages(selectedGroup._id);
    }
  }, [selectedGroup, getGroupMessages]);

  useEffect(() => {
    if (messageEndRef.current && currentMessages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMessages]);

  // Decryption removed - all messages are processed as plain text
  useEffect(() => {
    // Handle click outside for emoji picker and message options
    const handleClickOutside = (e) => {
      // Close emoji picker if clicked outside
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowReactionPicker(null);
      }

      // Close message options if clicked outside
      if (showMessageOptions && moreOptionsRef.current && !moreOptionsRef.current.contains(e.target)) {
        // Check if the click was on a menu toggle button
        const isMenuToggleClick = e.target.closest('[data-message-menu-toggle]');
        if (!isMenuToggleClick) {
          console.log("Clicked outside message options, closing menu");
          setShowMessageOptions(null);
        }
      }

      // Close context menu if clicked outside
      if (showContextMenu && contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setShowContextMenu(null);
      }
    };

    // Add event listener when any menu is open
    if (showReactionPicker || showMessageOptions || showContextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showReactionPicker, showMessageOptions, showContextMenu]);

  useEffect(() => {
    // If connection is lost, try to reconnect after a delay
    if (connectionStatus === 'disconnected') {
      const reconnectTimer = setTimeout(() => {
        handleSocketReconnect();
      }, 3000);

      return () => clearTimeout(reconnectTimer);
    }
  }, [connectionStatus, handleSocketReconnect]);

  // Add polling for messages when the socket is disconnected but we have an active chat
  useEffect(() => {
    let pollingInterval;

    if (connectionStatus !== 'connected' && (selectedUser || selectedGroup)) {
      // Poll for new messages every 5 seconds when socket is disconnected
      pollingInterval = setInterval(() => {
        console.log("Polling for new messages due to disconnected socket");
        if (selectedUser) {
          getMessages(selectedUser._id);
        } else if (selectedGroup) {
          getGroupMessages(selectedGroup._id);
        }
      }, 5000);
    }

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [connectionStatus, selectedUser, selectedGroup, getMessages, getGroupMessages]);

  // Check for connection and active chat after component mounts
  useEffect(() => {
    if ((selectedUser || selectedGroup) && connectionStatus !== 'connected') {
      // Try to reconnect if we have a selected user/group but no connection
      handleSocketReconnect();
    }
  }, [selectedUser, selectedGroup, connectionStatus, handleSocketReconnect]);

  // Listen for time format changes
  useEffect(() => {
    const handleTimeFormatChange = () => {
      setTimeFormatKey(prev => prev + 1);
    };

    window.addEventListener('timeFormatChanged', handleTimeFormatChange);
    return () => window.removeEventListener('timeFormatChanged', handleTimeFormatChange);
  }, []);

  // Encryption completely removed

  const handleMediaClick = (url, type) => {
    setPreviewMedia({ url, type });
  };

  const closePreview = () => {
    setPreviewMedia(null);
  };

  const handleMessageInfo = (message) => {
    setSelectedMessage(message);
    setShowInfoModal(true);
  };
  const openDeleteModal = (message) => {
    console.log("Opening delete modal for message:", message);
    // First close the dropdown menu
    setShowMessageOptions(null);
    // Then set up the delete modal
    setTimeout(() => {
      setSelectedMessage(message);
      setShowDeleteModal(true);
    }, 10);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedMessage(null);
  };
  const handleDeleteMessage = (deleteType) => {
    if (selectedMessage) {
      console.log(`Deleting message ${selectedMessage._id} with type: ${deleteType}`);
      // Show an alert for debugging
      alert(`Attempting to delete message: ${deleteType}`);
      // Call the deleteMessage function from useChatStore
      deleteMessage(selectedMessage._id, deleteType);
      closeDeleteModal();
    } else {
      console.error("No message selected for deletion");
      alert("Error: No message selected for deletion");
    }
  };
    const toggleMessageOptions = (messageId, event) => {
    event.stopPropagation();
    console.log("Toggle menu for message:", messageId, "Current state:", showMessageOptions);

    // If this message's menu is already open, close it
    if (showMessageOptions === messageId) {
      setShowMessageOptions(null);
    } else {
      // Otherwise, close any open menu and open this one
      setShowMessageOptions(messageId);
    }
  };

  const closeInfoModal = () => {
    setSelectedMessage(null);
    setShowInfoModal(false);
  };

  const handleReaction = (messageId, emoji) => {
    reactToMessage(messageId, emoji);
    setShowReactionPicker(null);
  };

  const handleQuickReaction = (messageId, emoji) => {
    reactToMessage(messageId, emoji);
  };

  const getReactionCount = (reactions) => {
    if (!reactions || reactions.length === 0) return {};

    // Count each emoji type
    const counts = {};
    reactions.forEach(reaction => {
      counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
    });

    return counts;
  };

  const getUserReaction = (reactions) => {
    if (!reactions || !authUser) return null;

    const userReaction = reactions.find(reaction =>
      reaction.userId.toString() === authUser._id.toString()
    );

    return userReaction ? userReaction.emoji : null;
  };

  // hasUserReacted function removed as it's not used

  // Check if message is deletable for everyone (within 24 hours)
  const canDeleteForEveryone = (message) => {
    if (message.senderId !== authUser._id) return false;

    const messageDate = new Date(message.createdAt);
    const now = new Date();
    const hoursDiff = (now - messageDate) / (1000 * 60 * 60);

    return hoursDiff <= 24; // Can delete for everyone within 24 hours
  };

  // Check if message is editable (within 15 minutes)
  const canEditMessage = (message) => {
    if (message.senderId !== authUser._id) return false;
    if (message.isDeleted) return false;

    const messageDate = new Date(message.createdAt);
    const now = new Date();
    const minutesDiff = (now - messageDate) / (1000 * 60);

    return minutesDiff <= 15; // Can edit within 15 minutes
  };

  const handleEditMessage = (message) => {
    setSelectedMessage(message);
    setShowEditModal(true);
    setShowMessageOptions(null);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedMessage(null);
  };

  // Handle right-click context menu
  const handleRightClick = (e, message) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(message._id);
    setSelectedMessage(message);
  };

  // Handle reply to message
  const handleReplyToMessage = (message) => {
    setReplyingTo(message);
    setShowContextMenu(null);
    // Ensure we have proper sender information for the reply preview
    const enhancedMessage = { ...message };

    // If senderId is just a string, try to get the full user info
    if (typeof message.senderId === 'string') {
      // Check if it's the current user
      if (message.senderId === authUser._id) {
        enhancedMessage.senderId = {
          _id: authUser._id,
          fullName: authUser.fullName,
          username: authUser.username,
          profilePic: authUser.profilePic
        };
      } else if (isGroupChat && selectedGroup?.members) {
        // For group chats, find the member info
        const member = selectedGroup.members.find(m =>
          m.user._id === message.senderId
        );
        if (member) {
          enhancedMessage.senderId = {
            _id: member.user._id,
            fullName: member.user.fullName,
            username: member.user.username,
            profilePic: member.user.profilePic
          };
        }
      } else if (!isGroupChat && selectedUser) {
        // For direct chats, use the selected user info
        enhancedMessage.senderId = {
          _id: selectedUser._id,
          fullName: selectedUser.fullName,
          username: selectedUser.username,
          profilePic: selectedUser.profilePic
        };
      }
    }

    setReplyingTo(enhancedMessage);
    setShowContextMenu(null);
    setShowMessageOptions(null);
  };

  // Handle forward message
  const handleForwardMessage = (message) => {
    setMessageToForward(message);
    setShowForwardModal(true);
    setShowContextMenu(null);
    setShowMessageOptions(null);
  };

  // Scroll to a specific message
  const scrollToMessage = (messageId) => {
    console.log('🔍 Scrolling to message:', messageId);

    // Find the message element by ID
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);

    if (messageElement) {
      // Scroll to the message with smooth behavior
      messageElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });

      // Add a temporary highlight effect
      messageElement.classList.add('bg-primary/20', 'transition-colors', 'duration-1000');

      // Remove highlight after animation
      setTimeout(() => {
        messageElement.classList.remove('bg-primary/20', 'transition-colors', 'duration-1000');
      }, 2000);

      console.log('✅ Scrolled to message:', messageId);
    } else {
      console.warn('⚠️ Message not found in DOM:', messageId);

      // If message is not in current view, we might need to load more messages
      // For now, just show a toast notification
      toast.info('Message not visible in current chat history');
    }
  };



  const formatDetailedTime = (timestamp) => {
    if (!timestamp) return "Pending";
    return formatStatusTime(timestamp);
  };

  // Render message text with mentions highlighted (no decryption needed)
  const renderMessageText = (message) => {
    if (!message.text) return null;

    // All messages are plain text now
    const displayText = message.text;

    // If it's a group message with mentions, highlight them
    if (isGroupChat && message.mentions && message.mentions.length > 0) {
      let text = displayText;

      // Replace mentions with highlighted spans
      message.mentions.forEach(mention => {
        const mentionRegex = new RegExp(`@${mention.username}`, 'gi');
        text = text.replace(mentionRegex, `<span class="bg-primary/20 text-primary px-1 rounded">@${mention.username}</span>`);
      });

      return (
        <div
          className="break-words"
          dangerouslySetInnerHTML={{ __html: text }}
        />
      );
    }

    return <div className="break-words">{displayText}</div>;
  };

  const renderMediaContent = (message) => {
    if (!message.image) return null;

    switch (message.mediaType) {
      case 'video':
        return (
          <div
            className="relative rounded-md mb-2 cursor-pointer hover:opacity-90 transition-opacity bg-base-300 p-2 flex items-center gap-2"
            onClick={() => handleMediaClick(message.image, 'video')}
          >
            <Film size={20} />
            <span className="text-sm">Video attachment</span>
          </div>
        );
      case 'document':
        return (
          <div
            className="relative rounded-md mb-2 cursor-pointer hover:opacity-90 transition-opacity bg-base-300 p-2 flex items-center gap-2"
            onClick={() => handleMediaClick(message.image, 'document')}
          >
            <FileText size={20} />
            <span className="text-sm">Document attachment</span>
          </div>
        );
      case 'gif':
      case 'image':
      default:
        return (
          <img
            src={message.image}
            alt="Attachment"
            className="sm:max-w-[200px] rounded-md mb-2 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => handleMediaClick(message.image, message.mediaType || 'image')}
          />
        );
    }
  };

  const renderReactions = (message) => {
    if (!message.reactions || message.reactions.length === 0) return null;

    const reactionCounts = getReactionCount(message.reactions);
    const userReaction = getUserReaction(message.reactions);
    const isMyMessage = message.senderId === authUser._id;

    return (
      <div className={`flex flex-wrap gap-1 mt-1 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
        {Object.entries(reactionCounts).map(([emoji, count]) => {
          const isUserReaction = userReaction === emoji;

          return (
            <button
              key={emoji}
              className={`text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1
                ${isUserReaction ? 'bg-primary/20 font-medium' : 'bg-base-300 hover:bg-base-200'}`}
              onClick={() => handleQuickReaction(message._id, emoji)}
            >
              <span>{emoji}</span>
              {count > 1 && <span>{count}</span>}
            </button>
          );
        })}
      </div>
    );
  };



  const renderConnectionStatus = () => {
    if (connectionStatus === 'disconnected') {
      return (
        <div className="flex items-center justify-center my-2">
          <div className="bg-error/20 text-error px-4 py-2 rounded-full flex items-center gap-2 text-sm">
            <AlertTriangle size={16} />
            <span>Connection lost. Reconnecting...</span>
            <button
              className="btn btn-xs btn-error btn-outline ml-2"
              onClick={handleSocketReconnect}
            >
              <RefreshCw size={14} className="mr-1" />
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (connectionStatus === 'connecting') {
      return (
        <div className="flex items-center justify-center my-2">
          <div className="bg-warning/20 text-warning px-4 py-2 rounded-full flex items-center gap-2 text-sm">
            <span className="loading loading-spinner loading-xs"></span>
            <span>Connecting to chat server...</span>
          </div>
        </div>
      );
    }

    return null;
  };

  // Add a small floating connection indicator
  const renderFloatingConnectionStatus = () => {
    if (connectionStatus === 'connected') return null;

    const color = connectionStatus === 'connecting' ? 'warning' : 'error';
    const title = connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected';

    return (
      <div className={`fixed bottom-20 right-4 z-10 bg-${color}/20 text-${color} px-3 py-1.5 rounded-full
                      flex items-center gap-2 text-xs shadow-md border border-${color}/30`}
           title={title}>
        {connectionStatus === 'connecting' ? (
          <span className="loading loading-spinner loading-xs"></span>
        ) : (
          <AlertTriangle size={12} />
        )}
        <span>{connectionStatus === 'connecting' ? 'Connecting' : 'Offline'}</span>
      </div>
    );
  };



  if (isCurrentMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {renderConnectionStatus()}
        {groupMessagesByDate(currentMessages).map((group, groupIndex) => (
          <div key={`group-${groupIndex}`}>
            {/* Date Separator */}
            <DateSeparator date={group.date} />

            {/* Messages for this date */}
            {group.messages.map((message) => {
          const isMyMessage = message.senderId === authUser._id || message.senderId._id === authUser._id;
          const userReaction = getUserReaction(message.reactions);

          // Get sender info for group messages
          const senderInfo = isGroupChat && !isMyMessage ?
            (message.senderId.fullName || message.senderId.username || 'Unknown User') : null;

          // If message is deleted and we're not supposed to see it, skip rendering
          if (message.isDeleted && message.deletedFor === 'everyone') {
            return (
          <div
            key={message._id}
            data-message-id={message._id}
                className={`chat ${isMyMessage ? "chat-end" : "chat-start"}`}
                ref={message === messages[messages.length - 1] ? messageEndRef : null}
          >
                <div className="chat-bubble bg-base-300 text-base-content/60 italic">
                  This message was deleted
                </div>
              </div>
            );
          }

          // If message is deleted just for me, don't show it
          if (message.isDeleted &&
              message.deletedFor === 'me' &&
              message.deletedBy === authUser._id) {
            return null;
          }

          return (
            <div
              key={message._id}
              data-message-id={message._id}
              className={`chat ${isMyMessage ? "chat-end" : "chat-start"}`}
              ref={message === currentMessages[currentMessages.length - 1] ? messageEndRef : null}
            >
              {/* Show sender avatar for group chats */}
              {isGroupChat && (
                <div className="chat-image avatar">
                  <div className="w-10 rounded-full">
                    <img
                      src={message.senderId?.profilePic || "/avatar.png"}
                      alt="profile pic"
                    />
                  </div>
                </div>
              )}

              <div className="chat-header mb-1 flex items-center">
                {/* Show sender name in group chats */}
                {isGroupChat && !isMyMessage && (
                  <div className="text-sm font-medium text-base-content/80 mr-2">
                    {senderInfo}
                  </div>
                )}
                <time className="text-xs opacity-50 ml-1" key={`time-${timeFormatKey}`}>
                  {formatMessageTime(message.createdAt)}
                </time>
                <div className="relative ml-1">                  <button
                    className="btn btn-ghost btn-xs btn-circle opacity-70 hover:opacity-100"
                    onClick={(e) => toggleMessageOptions(message._id, e)}
                    data-message-menu-toggle="true"
                    aria-label="Message options"
                  >
                    <MoreVertical size={14} />
                  </button>
                    {/* Message options dropdown */}
                  {showMessageOptions === message._id && (
                    <div
                      ref={moreOptionsRef}
                      className={`absolute top-full ${isMyMessage ? 'right-0' : 'left-0'} mt-1 bg-base-200 rounded-lg shadow-lg z-50 overflow-hidden w-40`}
                      style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      <ul className="menu menu-sm p-0">
                        <li>
                          <button onClick={() => handleReplyToMessage(message)}>
                            <Reply size={14} />
                            <span>Reply</span>
                          </button>
                        </li>

                        <li>
                          <button onClick={() => handleForwardMessage(message)}>
                            <Send size={14} />
                            <span>Forward</span>
                          </button>
                        </li>

                        <li>
                          <button onClick={() => handleMessageInfo(message)}>
                            <Info size={14} />
                            <span>Info</span>
                          </button>
                        </li>

                        {isMyMessage && canEditMessage(message) && (
                          <li>
                            <button onClick={() => handleEditMessage(message)}>
                              <Edit size={14} />
                              <span>Edit</span>
                            </button>
                          </li>
                        )}                        <li className="bg-error/10 hover:bg-error/20">
                          <button
                            onClick={() => openDeleteModal(message)}
                            className="text-error font-bold flex items-center gap-2"
                          >
                            <Trash2 size={16} className="flex-shrink-0" />
                            <span>Delete Message</span>
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div
                className="chat-bubble flex flex-col group relative"
                onContextMenu={(e) => handleRightClick(e, message)}
              >
                {/* Show replied message if this is a reply */}
                {message.replyTo && (
                  <ReplyMessage
                    replyTo={message.replyTo}
                    onClick={() => scrollToMessage(message.replyTo._id)}
                  />
                )}

                {/* Show forwarded tag for forwarded messages */}
                {message.isForwarded && (
                  <div className="text-xs opacity-60 flex items-center gap-1 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m13 9 2 2-2 2"/>
                      <path d="M5 5v14"/>
                      <path d="M9 9h8"/>
                    </svg>
                    <span>Forwarded</span>
                  </div>
                )}

                {message.image && renderMediaContent(message)}
                {message.text && (
                  <div>
                    {renderMessageText(message)}
                    {message.isEdited && (
                      <span className="text-xs opacity-60 ml-1">(edited)</span>
                    )}
                  </div>
                )}

                {/* Status indicator for my messages */}
                <MessageStatusIndicator
                  message={message}
                  isOwnMessage={isMyMessage}
                />

                {/* Quick reaction button - position based on message alignment */}
                <div
                  className={`absolute -top-10 z-10 invisible group-hover:visible bg-base-300 rounded-full p-0.5 flex items-center shadow-md whitespace-nowrap ${
                    isMyMessage ? 'right-0' : 'left-0'
                  }`}
                >
                  {quickReactions.map(emoji => (
                    <button
                      key={emoji}
                      className={`p-1 rounded-full text-lg ${userReaction === emoji ? 'bg-primary/20' : 'hover:bg-base-200'}`}
                      onClick={() => handleQuickReaction(message._id, emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    className="hover:bg-base-200 p-1 rounded-full"
                    onClick={() => setShowReactionPicker(message._id)}
                  >
                    <Smile size={18} />
                  </button>

                  {/* Emoji Picker */}
                  {showReactionPicker === message._id && (
                    <div
                      className={`absolute top-full mt-2 z-20 ${isMyMessage ? 'right-0' : 'left-0'}`}
                      ref={emojiPickerRef}
                    >
                      <EmojiPicker
                        onEmojiClick={(emojiData) => handleReaction(message._id, emojiData.emoji)}
                        searchDisabled={false}
                        width={300}
                        height={350}
                        previewConfig={{ showPreview: false }}
                      />
                    </div>
                  )}
                </div>

                {/* Render existing reactions */}
                {renderReactions(message)}
              </div>
            </div>
          );
        })}
          </div>
        ))}
      </div>

      {/* Floating connection status indicator */}
      {renderFloatingConnectionStatus()}

      {/* Media Preview Overlay */}
      {previewMedia && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={closePreview}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              className="absolute top-2 right-2 z-50 bg-black/50 rounded-full p-1 text-white hover:bg-black/70 transition-colors"
              onClick={closePreview}
            >
              <X size={24} />
            </button>

            {previewMedia.type === 'video' ? (
              <video
                src={previewMedia.url}
                controls
                className="max-h-[90vh] max-w-full rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            ) : previewMedia.type === 'document' ? (
              <iframe
                src={previewMedia.url}
                className="w-full h-[90vh] rounded-lg bg-white"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
                <img
                src={previewMedia.url}
                alt="Preview"
                className="max-h-[90vh] max-w-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </div>
      )}

      {/* Message Info Modal */}
      {showInfoModal && selectedMessage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={closeInfoModal}>
          <div className="bg-base-300 rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Message Info</h3>
              <button onClick={closeInfoModal} className="btn btn-sm btn-ghost btn-circle">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-base-200 rounded-lg">
                {selectedMessage.image && renderMediaContent(selectedMessage)}
                {selectedMessage.text && (
                  <div>
                    <p>{selectedMessage.text}</p>
                    {selectedMessage.isEdited && (
                      <span className="text-xs opacity-60 ml-1">(edited)</span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Sent</span>
                  <span>{formatDetailedTime(selectedMessage.createdAt)}</span>
                </div>

                {selectedMessage.isEdited && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Edited</span>
                    <span>{formatDetailedTime(selectedMessage.editedAt)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span>Delivered</span>
                  <div className="flex items-center gap-1">
                    {selectedMessage.deliveredAt ? (
                      <>
                        <Check size={16} />
                        <span>{formatDetailedTime(selectedMessage.deliveredAt)}</span>
                      </>
                    ) : (
                      <span>Pending</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span>Read</span>
                  <div className="flex items-center gap-1 text-blue-500">
                    {selectedMessage.seenAt ? (
                      <>
                        <div className="relative">
                          <Check size={14} className="absolute" />
                          <Check size={14} className="relative left-[3px]" />
                        </div>
                        <span>{formatDetailedTime(selectedMessage.seenAt)}</span>
                      </>
                    ) : (
                      <span className="text-base-content/70">Not seen yet</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>
      )}
        {/* Delete Message Modal */}
      {showDeleteModal && selectedMessage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={closeDeleteModal}>
          <div className="bg-base-300 rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-1">Delete message?</h3>
              <p className="text-sm text-base-content/70">
                {canDeleteForEveryone(selectedMessage)
                  ? "You can delete for everyone or just for yourself."
                  : "This message can only be deleted for yourself."}
              </p>
            </div>

            <div className="space-y-2">
              {canDeleteForEveryone(selectedMessage) && (
                <button
                  className="btn btn-error w-full justify-start"
                  onClick={() => handleDeleteMessage('everyone')}
                  disabled={isDeletingMessage}
                >
                  {isDeletingMessage ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <Trash2 size={18} />
                  )}
                  Delete for everyone
                </button>
              )}

              <button
                className="btn btn-error w-full justify-start"
                onClick={() => handleDeleteMessage('me')}
                disabled={isDeletingMessage}
              >
                {isDeletingMessage ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <Trash2 size={18} />
                )}
                Delete for me
              </button>

              <button
                className="btn btn-ghost w-full"
                onClick={closeDeleteModal}
                disabled={isDeletingMessage}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Message Modal */}
      {showEditModal && selectedMessage && (
        <EditMessageModal
          message={selectedMessage}
          onClose={closeEditModal}
        />
      )}

      {/* Forward Message Modal */}
      {showForwardModal && messageToForward && (
        <ForwardMessageModal
          isOpen={showForwardModal}
          onClose={() => {
            setShowForwardModal(false);
            setMessageToForward(null);
          }}
          messageId={messageToForward._id}
        />
      )}

      {/* Right-click Context Menu */}
      {showContextMenu && selectedMessage && (
        <div
          ref={contextMenuRef}
          className="fixed bg-base-200 rounded-lg shadow-lg z-50 overflow-hidden w-40"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)'
          }}
        >
          <ul className="menu menu-sm p-0">
            <li>
              <button onClick={() => handleReplyToMessage(selectedMessage)}>
                <Reply size={14} />
                <span>Reply</span>
              </button>
            </li>

            <li>
              <button onClick={() => handleForwardMessage(selectedMessage)}>
                <Send size={14} />
                <span>Forward</span>
              </button>
            </li>

            <li>
              <button onClick={() => handleMessageInfo(selectedMessage)}>
                <Info size={14} />
                <span>Info</span>
              </button>
            </li>

            {selectedMessage.senderId === authUser._id && canEditMessage(selectedMessage) && (
              <li>
                <button onClick={() => handleEditMessage(selectedMessage)}>
                  <Edit size={14} />
                  <span>Edit</span>
                </button>
              </li>
            )}

            {/* Report option - only for messages from other users */}
            {selectedMessage.senderId !== authUser._id && (
              <li>
                <ReportMessageButton
                  messageId={selectedMessage._id}
                  onReport={() => setShowContextMenu(false)}
                  className="w-full justify-start text-warning hover:text-warning"
                />
              </li>
            )}

            <li className="bg-error/10 hover:bg-error/20">
              <button
                onClick={() => openDeleteModal(selectedMessage)}
                className="text-error font-bold flex items-center gap-2"
              >
                <Trash2 size={16} className="flex-shrink-0" />
                <span>Delete Message</span>
              </button>
            </li>
          </ul>
        </div>
      )}

      <MessageInput />
    </div>
  );
};
export default ChatContainer;