import { useState, useEffect, useRef } from "react";
import { X, Eye, Heart, MessageCircle, Send, Smile, ChevronLeft, ChevronRight, Trash2, MoreVertical, VolumeX, Flag, Play, Pause } from "lucide-react";
import { useStatusStore } from "../store/useStatusStore";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../utils/dateUtils";
import toast from "react-hot-toast";

const StatusViewer = ({ isOpen, onClose, contactStatuses, initialContactIndex = 0, initialStatusIndex = 0 }) => {
  const [currentContactIndex, setCurrentContactIndex] = useState(initialContactIndex);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(initialStatusIndex);
  const [showViewers, setShowViewers] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [reactionEmoji, setReactionEmoji] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");

  const progressRef = useRef(null);
  const timeoutRef = useRef(null);

  const {
    viewStatus,
    getStatusViewers,
    getStatusMessages,
    addReaction,
    removeReaction,
    addStatusMessage,
    deleteStatus,
    muteStatus,
    reportStatus,
    getStatusReactions,
    statusViewers,
    statusMessages,
    statusReactions,
    isLoadingMessages
  } = useStatusStore();

  const { authUser } = useAuthStore();

  // Available emojis for reactions
  const availableEmojis = ["❤️", "😂", "😮", "😢", "😡", "👍", "👎", "🔥"];
  const heartEmoji = "❤️";

  const currentContact = contactStatuses[currentContactIndex];
  const currentStatus = currentContact?.statuses[currentStatusIndex];
  // Check if this is my status by comparing user IDs (handle both userId and user._id structures)
  const isMyStatus = currentContact?.user?._id === authUser._id || currentStatus?.userId?._id === authUser._id;

  // Auto-progress timer (5 seconds per status)
  useEffect(() => {
    if (!isOpen || isPaused || showViewers || showMessages || showEmojiPicker || showReactions) return;

    const duration = 5000; // 5 seconds
    const interval = 50; // Update every 50ms
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      const newProgress = (elapsed / duration) * 100;
      setProgress(newProgress);

      if (elapsed >= duration) {
        handleNext();
      }
    }, interval);

    timeoutRef.current = timer;

    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
    };
  }, [currentContactIndex, currentStatusIndex, isOpen, isPaused, showViewers, showMessages, showEmojiPicker, showReactions]);

  // Mark status as viewed when opened
  useEffect(() => {
    if (currentStatus && !isMyStatus) {
      viewStatus(currentStatus._id);
    }
  }, [currentStatus, isMyStatus]);

  // Reset progress when status changes
  useEffect(() => {
    setProgress(0);
  }, [currentContactIndex, currentStatusIndex]);

  // Check if user has already reacted to current status
  useEffect(() => {
    if (currentStatus && currentStatus.reactions) {
      const userReaction = currentStatus.reactions.find(
        reaction => reaction.userId._id === authUser._id || reaction.userId === authUser._id
      );
      setReactionEmoji(userReaction ? userReaction.emoji : "");
    } else {
      setReactionEmoji("");
    }
  }, [currentStatus, authUser._id]);

  const handleNext = () => {
    if (currentStatusIndex < currentContact.statuses.length - 1) {
      setCurrentStatusIndex(currentStatusIndex + 1);
    } else if (currentContactIndex < contactStatuses.length - 1) {
      setCurrentContactIndex(currentContactIndex + 1);
      setCurrentStatusIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStatusIndex > 0) {
      setCurrentStatusIndex(currentStatusIndex - 1);
    } else if (currentContactIndex > 0) {
      setCurrentContactIndex(currentContactIndex - 1);
      const prevContact = contactStatuses[currentContactIndex - 1];
      setCurrentStatusIndex(prevContact.statuses.length - 1);
    }
  };

  const handleReaction = async (emoji) => {
    try {
      if (reactionEmoji === emoji) {
        await removeReaction(currentStatus._id);
        setReactionEmoji("");
      } else {
        await addReaction(currentStatus._id, emoji);
        setReactionEmoji(emoji);
      }
      setShowEmojiPicker(false);
    } catch (error) {
      console.error("Error handling reaction:", error);
    }
  };

  const handleHeartReaction = () => handleReaction(heartEmoji);

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // Close emoji picker when clicking outside
  const handleStatusClick = () => {
    if (showEmojiPicker) {
      setShowEmojiPicker(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      await addStatusMessage(currentStatus._id, messageText.trim());
      setMessageText("");
      toast.success("Message sent!");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleViewViewers = async () => {
    if (!isMyStatus) return;

    try {
      await getStatusViewers(currentStatus._id);
      setShowViewers(true);
      setIsPaused(true);
    } catch (error) {
      console.error("Error fetching viewers:", error);
    }
  };

  const handleViewMessages = async () => {
    if (!isMyStatus) return;

    try {
      await getStatusMessages(currentStatus._id);
      setShowMessages(true);
      setIsPaused(true);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleViewReactions = async () => {
    if (!isMyStatus) return;

    try {
      await getStatusReactions(currentStatus._id);
      setShowReactions(true);
      setIsPaused(true);
    } catch (error) {
      console.error("Error fetching reactions:", error);
    }
  };

  const handleDeleteStatus = async () => {
    if (!isMyStatus) return;

    if (window.confirm("Are you sure you want to delete this status?")) {
      try {
        await deleteStatus(currentStatus._id);
        toast.success("Status deleted");
        onClose();
      } catch (error) {
        console.error("Error deleting status:", error);
      }
    }
  };

  const handleMuteStatus = async () => {
    try {
      await muteStatus(currentStatus._id);
      setShowOptionsMenu(false);
      onClose();
    } catch (error) {
      console.error("Error muting status:", error);
    }
  };

  const handleReportStatus = async () => {
    if (!reportReason) {
      toast.error("Please select a reason for reporting");
      return;
    }

    try {
      await reportStatus(currentStatus._id, reportReason, reportDescription);
      setShowReportModal(false);
      setShowOptionsMenu(false);
      setReportReason("");
      setReportDescription("");
      onClose();
    } catch (error) {
      console.error("Error reporting status:", error);
    }
  };

  const closeOverlays = () => {
    setShowViewers(false);
    setShowMessages(false);
    setShowReactions(false);
    setShowEmojiPicker(false);
    setShowOptionsMenu(false);
    setShowReportModal(false);
    setIsPaused(false);
  };

  if (!isOpen || !currentStatus) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
        {currentContact.statuses.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: index < currentStatusIndex ? '100%' :
                       index === currentStatusIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <img
            src={currentContact.user.profilePic || "/avatar.png"}
            alt={currentContact.user.fullName}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <div className="text-white font-medium">{currentContact.user.fullName}</div>
            <div className="text-white/70 text-sm">
              {formatMessageTime(currentStatus.timestamp)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pause/Play button */}
          <button
            onClick={togglePause}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? <Play size={20} /> : <Pause size={20} />}
          </button>

          {isMyStatus ? (
            <>
              <button
                onClick={handleViewViewers}
                className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                title="View who saw this"
              >
                <Eye size={20} />
              </button>
              <button
                onClick={handleViewMessages}
                className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                title="View messages"
              >
                <MessageCircle size={20} />
              </button>
              <button
                onClick={handleViewReactions}
                className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                title="View reactions"
              >
                <Heart size={20} />
              </button>
              <button
                onClick={handleDeleteStatus}
                className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                title="Delete status"
              >
                <Trash2 size={20} />
              </button>
            </>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                title="More options"
              >
                <MoreVertical size={20} />
              </button>

              {showOptionsMenu && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg py-2 min-w-[150px] z-30">
                  <button
                    onClick={handleMuteStatus}
                    className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors"
                  >
                    <VolumeX size={16} />
                    Mute
                  </button>
                  <button
                    onClick={() => {
                      setShowReportModal(true);
                      setShowOptionsMenu(false);
                      setIsPaused(true);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors text-red-600"
                  >
                    <Flag size={16} />
                    Report
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Navigation areas */}
      <div className="absolute inset-0 flex">
        <div
          className="flex-1 cursor-pointer"
          onClick={handlePrevious}
        />
        <div
          className="flex-1 cursor-pointer"
          onClick={handleNext}
        />
      </div>

      {/* Status content */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        onClick={handleStatusClick}
      >
        {currentStatus.type === "text" ? (
          <div
            className="w-full h-full flex items-center justify-center p-8"
            style={{ backgroundColor: currentStatus.backgroundColor }}
          >
            <div
              className={`text-white text-center text-2xl max-w-md ${
                currentStatus.fontStyle === "bold" ? "font-bold" :
                currentStatus.fontStyle === "italic" ? "italic" :
                currentStatus.fontStyle === "bold-italic" ? "font-bold italic" : ""
              }`}
            >
              {currentStatus.text}
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <img
              src={currentStatus.image}
              alt="Status"
              className="w-full h-full object-contain"
            />
            {currentStatus.caption && (
              <div className="absolute bottom-20 left-4 right-4 bg-black/50 text-white p-4 rounded-lg">
                {currentStatus.caption}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      {!isMyStatus && (
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 z-10">
          <div className="flex-1 flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Reply to status..."
              className="flex-1 bg-transparent text-white placeholder-white/70 outline-none"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
              className="p-2 text-white hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>

          {/* Emoji reactions */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-3 text-white hover:bg-white/20 rounded-full transition-colors"
              title="Add reaction"
            >
              <Smile size={20} />
            </button>

            {/* Emoji picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg p-2 flex gap-1">
                {availableEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`p-2 rounded-lg hover:bg-gray-100 transition-colors text-xl ${
                      reactionEmoji === emoji ? 'bg-blue-100' : ''
                    }`}
                    title={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Heart reaction button */}
          <button
            onClick={handleHeartReaction}
            className={`p-3 rounded-full transition-colors ${
              reactionEmoji === heartEmoji
                ? 'text-red-500 bg-white/20'
                : 'text-white hover:bg-white/20'
            }`}
            title={reactionEmoji === heartEmoji ? 'Remove heart' : 'Add heart'}
          >
            <Heart
              size={20}
              fill={reactionEmoji === heartEmoji ? 'currentColor' : 'none'}
            />
          </button>
        </div>
      )}

      {/* Viewers overlay */}
      {showViewers && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg w-full max-w-md max-h-96 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Viewed by {statusViewers.length}</h3>
              <button onClick={closeOverlays} className="p-1">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-80">
              {statusViewers.map((viewer) => (
                <div key={viewer._id} className="flex items-center gap-3 p-3 hover:bg-gray-50">
                  <img
                    src={viewer.userId.profilePic || "/avatar.png"}
                    alt={viewer.userId.fullName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{viewer.userId.fullName}</div>
                    <div className="text-sm text-gray-500">
                      {formatMessageTime(viewer.viewedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages overlay */}
      {showMessages && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg w-full max-w-md max-h-96 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Messages ({statusMessages.length})</h3>
              <button onClick={closeOverlays} className="p-1">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-80">
              {isLoadingMessages ? (
                <div className="p-4 text-center">Loading messages...</div>
              ) : statusMessages.length > 0 ? (
                statusMessages.map((message, index) => (
                  <div key={index} className="p-3 border-b last:border-b-0">
                    <div className="flex items-start gap-3">
                      <img
                        src={message.userId.profilePic || "/avatar.png"}
                        alt={message.userId.fullName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{message.userId.fullName}</div>
                        <div className="text-gray-700">{message.message}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatMessageTime(message.sentAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">No messages yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reactions overlay */}
      {showReactions && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg w-full max-w-md max-h-96 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Reactions ({statusReactions?.length || 0})</h3>
              <button onClick={closeOverlays} className="p-1">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-80">
              {statusReactions && statusReactions.length > 0 ? (
                statusReactions.map((reaction, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 hover:bg-gray-50">
                    <img
                      src={reaction.userId.profilePic || "/avatar.png"}
                      alt={reaction.userId.fullName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{reaction.userId.fullName}</div>
                      <div className="text-sm text-gray-500">
                        {formatMessageTime(reaction.reactedAt)}
                      </div>
                    </div>
                    <div className="text-2xl">{reaction.emoji}</div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">No reactions yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Report Status</h3>
              <button onClick={closeOverlays} className="p-1">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Reason for reporting:</label>
                <div className="space-y-2">
                  {[
                    { value: "inappropriate", label: "Inappropriate content" },
                    { value: "spam", label: "Spam" },
                    { value: "harassment", label: "Harassment" },
                    { value: "violence", label: "Violence" },
                    { value: "other", label: "Other" }
                  ].map((reason) => (
                    <label key={reason.value} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="reportReason"
                        value={reason.value}
                        checked={reportReason === reason.value}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="radio radio-primary radio-sm"
                      />
                      <span className="text-sm">{reason.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Additional details (optional):</label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Provide more details about the issue..."
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {reportDescription.length}/500
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeOverlays}
                  className="btn btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportStatus}
                  disabled={!reportReason}
                  className="btn btn-error flex-1"
                >
                  Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusViewer;
