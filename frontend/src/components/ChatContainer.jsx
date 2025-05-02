import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { X, FileText, Film, Smile, Check, Info, Trash2, MoreVertical, AlertCircle, AlertTriangle, RefreshCw, Edit } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import EditMessageModal from "./EditMessageModal";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    reactToMessage,
    deleteMessage,
    connectionStatus,
    resendMessage,
    handleSocketReconnect
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const emojiPickerRef = useRef(null);
  const moreOptionsRef = useRef(null);
  const [showMessageOptions, setShowMessageOptions] = useState(null);
  
  // Common reaction emojis for quick access
  const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "😡"];

  useEffect(() => {
    getMessages(selectedUser._id);

    // No longer need to subscribe/unsubscribe here as it's done at the app level
  }, [selectedUser._id, getMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    // Handle click outside for emoji picker
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowReactionPicker(null);
      }
      
      if (moreOptionsRef.current && !moreOptionsRef.current.contains(e.target)) {
        setShowMessageOptions(null);
      }
    };

    if (showReactionPicker || showMessageOptions) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showReactionPicker, showMessageOptions]);

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
    
    if (connectionStatus !== 'connected' && selectedUser) {
      // Poll for new messages every 5 seconds when socket is disconnected
      pollingInterval = setInterval(() => {
        console.log("Polling for new messages due to disconnected socket");
        getMessages(selectedUser._id);
      }, 5000);
    }
    
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [connectionStatus, selectedUser, getMessages]);

  // Check for connection and active chat after component mounts
  useEffect(() => {
    if (selectedUser && connectionStatus !== 'connected') {
      // Try to reconnect if we have a selected user but no connection
      handleSocketReconnect();
    }
  }, [selectedUser, connectionStatus, handleSocketReconnect]);

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
    setSelectedMessage(message);
    setShowDeleteModal(true);
    setShowMessageOptions(null);
  };
  
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedMessage(null);
  };
  
  const handleDeleteMessage = (deleteType) => {
    if (selectedMessage) {
      deleteMessage(selectedMessage._id, deleteType);
      closeDeleteModal();
    }
  };
  
  const toggleMessageOptions = (messageId, event) => {
    event.stopPropagation();
    setShowMessageOptions(showMessageOptions === messageId ? null : messageId);
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
  
  const hasUserReacted = (reactions) => {
    if (!reactions || !authUser) return false;
    return reactions.some(reaction => 
      reaction.userId.toString() === authUser._id.toString()
    );
  };
  
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
  
  const renderStatusIndicator = (message) => {
    const isMyMessage = message.senderId === authUser._id;
    
    if (!isMyMessage) return null;
    
    switch (message.status) {
      case 'seen':
        return (
          <div className="flex items-center gap-1 ml-auto text-xs text-blue-500 mt-1">
            <div className="relative mr-1">
              <Check size={12} className="absolute" />
              <Check size={12} className="relative left-[3px]" />
            </div>
          </div>
        );
      case 'delivered':
        return (
          <div className="flex items-center gap-1 ml-auto text-xs text-base-content/70 mt-1">
            <div className="relative mr-1">
              <Check size={12} className="absolute" />
              <Check size={12} className="relative left-[3px]" />
            </div>
          </div>
        );
      case 'sent':
        return (
          <div className="flex items-center gap-1 ml-auto text-xs text-base-content/70 mt-1">
            <Check size={12} />
          </div>
        );
      default:
        return null;
    }
  };
  
  const formatDetailedTime = (timestamp) => {
    if (!timestamp) return "Pending";
    
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      month: 'short',
      day: 'numeric'
    });
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

  const handleResendMessage = (messageId) => {
    resendMessage(messageId);
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

  const renderMessageStatus = (message) => {
    // For failed messages
    if (message.status === 'failed') {
      return (
        <div className="flex items-center gap-1 ml-auto text-xs text-error mt-1">
          <AlertCircle size={12} />
          <span>Failed</span>
          <button 
            className="btn btn-xs btn-ghost text-error"
            onClick={() => handleResendMessage(message._id)}
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      );
    }
    
    // For sending messages
    if (message.status === 'sending' || message.isPending) {
      return (
        <div className="flex items-center gap-1 ml-auto text-xs text-base-content/70 mt-1">
          <span className="loading loading-spinner loading-xs"></span>
          <span>Sending</span>
        </div>
      );
    }
    
    // For regular message statuses (seen, delivered, sent)
    return renderStatusIndicator(message);
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative max-w-full">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {renderConnectionStatus()}
        {messages.map((message) => {
          const isMyMessage = message.senderId === authUser._id;
          const userReaction = getUserReaction(message.reactions);
          
          // If message is deleted and we're not supposed to see it, skip rendering
          if (message.isDeleted && message.deletedFor === 'everyone') {
            return (
          <div
            key={message._id}
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
              className={`chat ${isMyMessage ? "chat-end" : "chat-start"}`}
              ref={message === messages[messages.length - 1] ? messageEndRef : null}
            >
              <div className="chat-header mb-1 flex items-center">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
                <div className="relative ml-1">
                  <button 
                    className="opacity-50 hover:opacity-100"
                    onClick={(e) => toggleMessageOptions(message._id, e)}
                  >
                    <MoreVertical size={14} />
                  </button>
                  
                  {/* Message options dropdown */}
                  {showMessageOptions === message._id && (
                    <div 
                      ref={moreOptionsRef}
                      className="absolute top-full right-0 mt-1 bg-base-200 rounded-lg shadow-lg z-20 w-40"
                    >
                      <div className="py-1">
                        {isMyMessage && (
                          <>
                            <button 
                              className="px-4 py-2 text-sm w-full text-left hover:bg-base-300 flex items-center gap-2"
                              onClick={() => handleMessageInfo(message)}
                            >
                              <Info size={14} />
                              <span>Info</span>
                            </button>
                            {canEditMessage(message) && (
                              <button 
                                className="px-4 py-2 text-sm w-full text-left hover:bg-base-300 flex items-center gap-2"
                                onClick={() => handleEditMessage(message)}
                              >
                                <Edit size={14} />
                                <span>Edit</span>
                              </button>
                            )}
                          </>
                        )}
                        <button 
                          className="px-4 py-2 text-sm w-full text-left hover:bg-base-300 flex items-center gap-2 text-error"
                          onClick={() => openDeleteModal(message)}
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="chat-bubble flex flex-col group relative">
                {message.image && renderMediaContent(message)}
                {message.text && (
                  <div>
                    <p>{message.text}</p>
                    {message.isEdited && (
                      <span className="text-xs opacity-60 ml-1">(edited)</span>
                    )}
                  </div>
                )}
                
                {/* Status indicator for my messages */}
                {renderMessageStatus(message)}
                
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
                >
                  <Trash2 size={18} />
                  Delete for everyone
                </button>
              )}
              
              <button 
                className="btn btn-error w-full justify-start" 
                onClick={() => handleDeleteMessage('me')}
              >
                <Trash2 size={18} />
                Delete for me
              </button>
              
              <button 
                className="btn btn-ghost w-full" 
                onClick={closeDeleteModal}
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

      <MessageInput />
    </div>
  );
};
export default ChatContainer;