import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X, Smile, Gift, Search, Paperclip, Camera, AtSign } from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { Carousel, Grid } from "@giphy/react-components";
import ReplyPreview from "./ReplyPreview";
// Encryption imports removed - encryption disabled

// Initialize Giphy with a public API key (in a real app, store this in an env variable)
const gf = new GiphyFetch("sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh");

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [gifUrl, setGifUrl] = useState(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [activeTab, setActiveTab] = useState("emoji"); // 'emoji' or 'gif'
  const [gifSearchTerm, setGifSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  // Temporary flag to disable mentions for debugging
  const MENTIONS_ENABLED = true;
  const [cursorPosition, setCursorPosition] = useState(0);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaPickerRef = useRef(null);
  const attachmentOptionsRef = useRef(null);
  const textInputRef = useRef(null);
  const mentionSuggestionsRef = useRef(null);

  const { sendMessage, selectedUser, replyingTo, replyToMessage, clearReplyingTo } = useChatStore();
  const { sendGroupMessage, selectedGroup, replyToGroupMessage } = useGroupStore();
  const { authUser } = useAuthStore();

  // Determine if we're in group or direct chat mode
  const isGroupChat = !!selectedGroup;

  // Encryption disabled - no need to set currentUserId

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if it's an image or video file
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (type === 'media' && !isImage && !isVideo) {
      toast.error("Please select an image or video file");
      return;
    }

    // Clear GIF if another file is selected
    setGifUrl(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview({
        url: reader.result,
        type: isImage ? 'image' : isVideo ? 'video' : type
      });
    };
    reader.readAsDataURL(file);
    setShowAttachmentOptions(false);
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      });

      setCameraStream(stream);
      setShowCameraModal(true);
      setShowAttachmentOptions(false);
    } catch (error) {
      toast.error("Could not access camera");
      console.error("Camera access error:", error);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame on canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to data URL
    const photoData = canvas.toDataURL('image/jpeg');
    setCapturedPhoto(photoData);
  };

  const usePhoto = () => {
    setImagePreview({
      url: capturedPhoto,
      type: 'image'
    });

    closeCamera();
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCapturedPhoto(null);
    setShowCameraModal(false);
  };

  const removePreview = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const removeGif = () => {
    setGifUrl(null);
  };

  // Handle text input changes and mention detection
  const handleTextChange = (e) => {
    const value = e.target.value;
    const position = e.target.selectionStart;

    setText(value);
    setCursorPosition(position);

    // Check for mentions in group chats (with safety checks)
    if (MENTIONS_ENABLED && isGroupChat && selectedGroup?.members && Array.isArray(selectedGroup.members)) {
      try {
        const textBeforeCursor = value.substring(0, position);
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

        if (mentionMatch && mentionMatch[1] !== undefined) {
          setMentionQuery(mentionMatch[1]);
          setShowMentionSuggestions(true);
          setSelectedMentionIndex(0); // Reset selection
        } else {
          setShowMentionSuggestions(false);
          setMentionQuery("");
          setSelectedMentionIndex(0);
        }
      } catch (error) {
        console.error("Error in mention detection:", error);
        setShowMentionSuggestions(false);
        setMentionQuery("");
      }
    } else {
      // Ensure mentions are hidden if not in group chat
      setShowMentionSuggestions(false);
      setMentionQuery("");
    }
  };

  // Handle mention selection
  const handleMentionSelect = (member) => {
    const textBeforeCursor = text.substring(0, cursorPosition);
    const textAfterCursor = text.substring(cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const beforeMention = textBeforeCursor.substring(0, mentionMatch.index);
      const newText = beforeMention + `@${member.user.username} ` + textAfterCursor;
      setText(newText);

      // Set cursor position after the mention
      setTimeout(() => {
        const newPosition = beforeMention.length + member.user.username.length + 2;
        if (textInputRef.current) {
          textInputRef.current.setSelectionRange(newPosition, newPosition);
          textInputRef.current.focus();
        }
      }, 0);
    }

    setShowMentionSuggestions(false);
    setMentionQuery("");
    setSelectedMentionIndex(0);
  };

  // Get already mentioned usernames from current message text
  const getAlreadyMentioned = () => {
    const mentionRegex = /@(\w+)/g;
    const mentioned = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentioned.push(match[1].toLowerCase());
    }

    return mentioned;
  };

  // Get filtered group members for mentions
  const getMentionSuggestions = () => {
    try {
      // Basic validation
      if (!isGroupChat || !selectedGroup?.members || !Array.isArray(selectedGroup.members)) {
        return [];
      }

      const currentUserUsername = authUser?.username?.toLowerCase();
      const query = mentionQuery.toLowerCase().trim();

      return selectedGroup.members
        .filter(member => {
          // Must have valid user data
          if (!member?.user?.username || !member?.user?.fullName) {
            return false;
          }

          const memberUsername = member.user.username.toLowerCase();
          const memberFullName = member.user.fullName.toLowerCase();

          // Exclude current user (prevent self-tagging)
          if (memberUsername === currentUserUsername) {
            return false;
          }

          // Filter by search query if provided
          if (query) {
            return memberUsername.includes(query) || memberFullName.includes(query);
          }

          return true;
        })
        .slice(0, 8); // Show up to 8 suggestions
    } catch (error) {
      console.error("Error in getMentionSuggestions:", error);
      return [];
    }
  };

  // Extract mentions from text
  const extractMentions = (messageText) => {
    if (!isGroupChat || !selectedGroup?.members) return [];

    const mentions = [];
    const mentionRegex = /@(\w+)/g;
    let match;

    while ((match = mentionRegex.exec(messageText)) !== null) {
      const username = match[1];
      const offset = match.index;
      const length = match[0].length;

      // Find the user in group members
      const member = selectedGroup.members.find(m =>
        m.user.username === username ||
        m.user.fullName.toLowerCase().replace(/\s+/g, '') === username.toLowerCase()
      );

      if (member) {
        mentions.push({
          user: member.user._id,
          username: member.user.username,
          offset,
          length
        });
      }
    }

    return mentions;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !gifUrl) return;

    try {
      let messageText = text.trim();
      let isEncrypted = false;

      // Encryption disabled - send messages as plain text
      console.log('📝 Sending message as plain text (encryption disabled)');
      // messageText remains unchanged (plain text)
      isEncrypted = false;

      // Extract mentions for group messages
      const mentions = isGroupChat ? extractMentions(messageText) : [];
      console.log('🏷️ Extracted mentions:', mentions);

      const messageData = {
        text: messageText,
        image: gifUrl || (imagePreview ? imagePreview.url : null),
        mediaType: imagePreview ? imagePreview.type : (gifUrl ? 'gif' : null),
        isEncrypted: isEncrypted,
        mentions: mentions
      };

      // Handle reply vs regular message
      if (replyingTo) {
        if (isGroupChat) {
          await replyToGroupMessage(
            replyingTo._id,
            messageData.text,
            messageData.image,
            messageData.mediaType
          );
        } else {
          await replyToMessage(
            replyingTo._id,
            messageData.text,
            messageData.image,
            messageData.mediaType
          );
        }
      } else {
        if (isGroupChat) {
          await sendGroupMessage(selectedGroup._id, messageData);
        } else {
          await sendMessage(messageData);
        }
      }

      // Clear form
      setText("");
      setImagePreview(null);
      setGifUrl(null);
      setShowMentionSuggestions(false);
      setMentionQuery("");
      clearReplyingTo();
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (videoRef.current) videoRef.current.srcObject = null;
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleEmojiClick = (emojiData) => {
    setText((prevText) => prevText + emojiData.emoji);
  };

  const handleGifSelect = (gif) => {
    // Clear image if a GIF is selected
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (videoRef.current) videoRef.current.srcObject = null;

    // Get the GIF URL
    const gifUrl = gif.images.original.url;
    setGifUrl(gifUrl);
    setShowMediaPicker(false);
  };

  const handleGifSearch = (search) => {
    setGifSearchTerm(search);
    setIsSearching(!!search);
  };

  // Close media picker, attachment options, and mention suggestions when clicking outside
  const handleClickOutside = (e) => {
    // Check if the click is on the text input (don't close mentions if typing)
    if (textInputRef.current && textInputRef.current.contains(e.target)) {
      return;
    }

    if (mediaPickerRef.current && !mediaPickerRef.current.contains(e.target)) {
      setShowMediaPicker(false);
    }
    if (attachmentOptionsRef.current && !attachmentOptionsRef.current.contains(e.target)) {
      setShowAttachmentOptions(false);
    }
    if (mentionSuggestionsRef.current && !mentionSuggestionsRef.current.contains(e.target)) {
      setShowMentionSuggestions(false);
      setMentionQuery("");
    }
  };

  // Add event listener when pickers are shown
  useEffect(() => {
    if (showMediaPicker || showAttachmentOptions || showMentionSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMediaPicker, showAttachmentOptions, showMentionSuggestions]);

  // Setup video stream when camera modal is opened
  useEffect(() => {
    if (showCameraModal && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [showCameraModal, cameraStream]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'emoji':
        return (
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            searchDisabled={false}
            width={300}
            height={350}
            previewConfig={{ showPreview: false }}
          />
        );
      case 'gif':
        return (
          <div className="p-2 h-[350px]">
            {/* GIF Search Bar */}
            <div className="relative mb-3">
              <input
                type="text"
                className="w-full input input-bordered input-sm pl-8"
                placeholder="Search GIFs..."
                value={gifSearchTerm}
                onChange={(e) => handleGifSearch(e.target.value)}
              />
              <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-zinc-400" />
            </div>

            {/* Display searched GIFs or trending GIFs */}
            <div className="gif-container overflow-y-auto h-[calc(100%-40px)]">
              {isSearching ? (
                <Grid
                  width={300}
                  columns={2}
                  fetchGifs={(offset) => gf.search(gifSearchTerm, { offset, limit: 10 })}
                  key={gifSearchTerm}
                  onGifClick={handleGifSelect}
                  noLink={true}
                  hideAttribution={true}
                />
              ) : (
                <Carousel
                  gifHeight={150}
                  gutter={6}
                  fetchGifs={(offset) => gf.trending({ offset, limit: 10 })}
                  key="trending"
                  onGifClick={handleGifSelect}
                  noLink={true}
                  hideAttribution={true}
                />
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 w-full">
      {/* Reply Preview */}
      <ReplyPreview />

      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            {imagePreview.type === 'image' && (
              <img
                src={imagePreview.url}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
              />
            )}
            {imagePreview.type === 'video' && (
              <div className="w-20 h-20 flex items-center justify-center bg-base-200 rounded-lg border border-zinc-700">
                <span className="text-xs">Video</span>
              </div>
            )}
            <button
              onClick={removePreview}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {gifUrl && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={gifUrl}
              alt="GIF Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeGif}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        {/* Media Picker */}
        {showMediaPicker && (
          <div
            className="absolute bottom-16 left-0 z-10 bg-base-300 rounded-lg shadow-lg"
            ref={mediaPickerRef}
          >
            {/* Tabbed Navigation */}
            <div className="flex border-b border-base-200">
              <button
                className={`flex-1 p-2 ${activeTab === 'emoji' ? 'bg-base-200' : ''}`}
                onClick={() => setActiveTab('emoji')}
              >
                <Smile size={20} className="mx-auto" />
              </button>
              <button
                className={`flex-1 p-2 ${activeTab === 'gif' ? 'bg-base-200' : ''}`}
                onClick={() => setActiveTab('gif')}
              >
                <Gift size={20} className="mx-auto" />
              </button>
            </div>

            {/* Tab Content */}
            <div className="w-[300px]">
              {renderTabContent()}
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            {/* Emoji/GIF button */}
            <button
              type="button"
              className="btn btn-circle text-zinc-400"
              onClick={() => setShowMediaPicker(!showMediaPicker)}
            >
              <Smile size={20} />
            </button>

            {/* Attachment button */}
            <button
              type="button"
              className="btn btn-circle text-zinc-400"
              onClick={() => {
                setShowAttachmentOptions(!showAttachmentOptions);
                setShowMediaPicker(false);
              }}
            >
              <Paperclip size={20} />
            </button>
          </div>

          <div className="flex-1 relative">
            <input
              ref={textInputRef}
              type="text"
              className="w-full input input-bordered rounded-lg input-sm sm:input-md"
              placeholder={isGroupChat ? "Type a message... (use @ to mention members)" : "Type a message..."}
              value={text}
              onChange={handleTextChange}
              onKeyDown={(e) => {
                // Handle mention navigation
                if (showMentionSuggestions) {
                  const suggestions = getMentionSuggestions();

                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedMentionIndex(prev =>
                      prev < suggestions.length - 1 ? prev + 1 : 0
                    );
                    return;
                  }

                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedMentionIndex(prev =>
                      prev > 0 ? prev - 1 : suggestions.length - 1
                    );
                    return;
                  }

                  if (e.key === 'Enter' && suggestions[selectedMentionIndex]) {
                    e.preventDefault();
                    handleMentionSelect(suggestions[selectedMentionIndex]);
                    return;
                  }

                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowMentionSuggestions(false);
                    setMentionQuery("");
                    setSelectedMentionIndex(0);
                    return;
                  }
                }

                // Normal enter handling
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />

            {/* Mention suggestions */}
            {MENTIONS_ENABLED && showMentionSuggestions && isGroupChat && (
              <div
                ref={mentionSuggestionsRef}
                className="absolute bottom-full left-0 mb-2 bg-base-100 rounded-lg shadow-xl border border-base-300 w-full max-w-sm"
                style={{
                  zIndex: 1000,
                  position: 'absolute',
                  transform: 'translateY(-8px)'
                }}
              >
                {(() => {
                  const suggestions = getMentionSuggestions();

                  if (suggestions.length > 0) {
                    return (
                      <div className="max-h-64 overflow-hidden">
                        {/* Header */}
                        <div className="px-3 py-2 border-b border-base-300 bg-base-200 rounded-t-lg">
                          <div className="flex items-center gap-2">
                            <AtSign size={14} className="text-primary" />
                            <span className="text-xs font-medium text-base-content">
                              Mention Members ({suggestions.length})
                            </span>
                          </div>
                        </div>

                        {/* Members list */}
                        <div className="max-h-48 overflow-y-auto">
                          {suggestions.map((member, index) => (
                            <button
                              key={member.user._id}
                              type="button"
                              className={`w-full flex items-center gap-3 p-3 text-left transition-colors duration-150 border-b border-base-300 last:border-b-0 ${
                                index === selectedMentionIndex
                                  ? 'bg-primary text-primary-content'
                                  : 'hover:bg-base-200'
                              }`}
                              onClick={() => handleMentionSelect(member)}
                            >
                              <div className="relative">
                                <img
                                  src={member.user.profilePic || "/avatar.png"}
                                  alt={member.user.fullName}
                                  className="w-8 h-8 rounded-full flex-shrink-0 border-2 border-base-300"
                                />
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-base-100"></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-sm text-base-content">
                                  {member.user.fullName}
                                </div>
                                <div className="text-xs text-primary truncate">
                                  @{member.user.username}
                                </div>
                              </div>
                              <div className="text-xs text-base-content/50">
                                Click to mention
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Footer */}
                        <div className="px-3 py-2 bg-base-200 rounded-b-lg border-t border-base-300">
                          <div className="text-xs text-base-content/60 text-center">
                            Type to filter • ESC to close
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Show different messages based on the situation
                  if (!selectedGroup?.members || selectedGroup.members.length <= 1) {
                    return (
                      <div className="p-4 text-center">
                        <AtSign size={24} className="mx-auto text-base-content/30 mb-2" />
                        <div className="text-sm text-base-content/60">
                          Add more members to use @ mentions
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="p-4 text-center">
                      <AtSign size={24} className="mx-auto text-base-content/30 mb-2" />
                      <div className="text-sm text-base-content/60">
                        No members match "{mentionQuery}"
                      </div>
                      <div className="text-xs text-base-content/40 mt-1">
                        Try a different search term
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

          <input
            type="file"
              accept="image/*,video/*"
            className="hidden"
            ref={fileInputRef}
              onChange={(e) => handleFileChange(e, 'media')}
          />

            {/* Attachment options */}
            {showAttachmentOptions && (
              <div
                className="absolute bottom-14 left-0 z-10 bg-base-300 rounded-lg p-3 w-[200px]"
                ref={attachmentOptionsRef}
              >
                <div className="flex flex-col gap-3">
          <button
            type="button"
                    className="flex items-center gap-2 hover:bg-base-200 p-2 rounded-md w-full text-left"
            onClick={() => fileInputRef.current?.click()}
          >
                    <Image size={18} />
                    <span className="text-sm">Image/Video</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 hover:bg-base-200 p-2 rounded-md w-full text-left"
                    onClick={openCamera}
                  >
                    <Camera size={18} />
                    <span className="text-sm">Camera</span>
          </button>
        </div>
              </div>
            )}
          </div>

        <button
          type="submit"
          className="btn btn-sm btn-circle"
            disabled={!text.trim() && !imagePreview && !gifUrl}
        >
          <Send size={22} />
        </button>
      </form>
      </div>

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-base-300 rounded-xl p-4 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Camera</h3>
              <button
                type="button"
                onClick={closeCamera}
                className="btn btn-sm btn-ghost btn-circle"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative bg-black rounded-lg overflow-hidden mb-4">
              {!capturedPhoto ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={takePhoto}
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2
                               w-12 h-12 rounded-full bg-white flex items-center justify-center
                               border-4 border-gray-800"
                  />
                </>
              ) : (
                <img
                  src={capturedPhoto}
                  alt="Captured"
                  className="w-full rounded-lg"
                />
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex justify-center gap-4">
              {capturedPhoto ? (
                <>
                  <button
                    type="button"
                    onClick={retakePhoto}
                    className="btn btn-sm"
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={usePhoto}
                    className="btn btn-sm btn-primary"
                  >
                    Use Photo
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={takePhoto}
                  className="btn btn-sm btn-primary"
                >
                  Capture
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default MessageInput;