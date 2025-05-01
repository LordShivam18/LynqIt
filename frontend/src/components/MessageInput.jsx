import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Smile, Gift, Search, Paperclip, Camera } from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { Carousel, Grid } from "@giphy/react-components";

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
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaPickerRef = useRef(null);
  const attachmentOptionsRef = useRef(null);
  const { sendMessage } = useChatStore();

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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !gifUrl) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: gifUrl || (imagePreview ? imagePreview.url : null),
        mediaType: imagePreview ? imagePreview.type : (gifUrl ? 'gif' : null)
      });

      // Clear form
      setText("");
      setImagePreview(null);
      setGifUrl(null);
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

  // Close media picker and attachment options when clicking outside
  const handleClickOutside = (e) => {
    if (mediaPickerRef.current && !mediaPickerRef.current.contains(e.target)) {
      setShowMediaPicker(false);
    }
    if (attachmentOptionsRef.current && !attachmentOptionsRef.current.contains(e.target)) {
      setShowAttachmentOptions(false);
    }
  };

  // Add event listener when pickers are shown
  useEffect(() => {
    if (showMediaPicker || showAttachmentOptions) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMediaPicker, showAttachmentOptions]);

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
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

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