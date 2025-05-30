import { useState, useRef } from "react";
import { X, Type, Image, Camera, Palette, Bold, Italic, AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import { useStatusStore } from "../store/useStatusStore";
import toast from "react-hot-toast";

const StatusCreateModal = ({ isOpen, onClose }) => {
  const [statusType, setStatusType] = useState("text"); // "text" or "image"
  const [text, setText] = useState("");
  const [caption, setCaption] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#075E54");
  const [fontStyle, setFontStyle] = useState("normal");
  const [fontFamily, setFontFamily] = useState("sans-serif");
  const [textAlign, setTextAlign] = useState("center");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [visibility, setVisibility] = useState("contacts");
  const [specificUsers, setSpecificUsers] = useState([]);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);

  const fileInputRef = useRef(null);
  const { createTextStatus, createImageStatus, isCreatingStatus } = useStatusStore();

  // Background color options - extended color palette
  const backgroundColors = [
    "#075E54", // WhatsApp Green
    "#128C7E", // Dark Green
    "#25D366", // Light Green
    "#DCF8C6", // Light Green Background
    "#FF6B6B", // Red
    "#4ECDC4", // Teal
    "#45B7D1", // Blue
    "#96CEB4", // Mint
    "#FFEAA7", // Yellow
    "#DDA0DD", // Plum
    "#FFB6C1", // Light Pink
    "#87CEEB", // Sky Blue
    "#D7263D", // Crimson
    "#F46036", // Burnt Orange
    "#2E294E", // Dark Purple
    "#1B998B", // Jade
    "#C5D86D", // Citron
    "#F9DC5C", // Mustard Yellow
    "#EFCB68", // Gold
    "#E8C1C5", // Rose
    "#590004", // Maroon
    "#003459", // Navy Blue
    "#00A878", // Emerald Green
    "#6C5B7B", // Dark Lavender
  ];

  // Font family options
  const fontFamilies = [
    { name: "Sans Serif", value: "sans-serif" },
    { name: "Serif", value: "serif" },
    { name: "Monospace", value: "monospace" },
    { name: "Cursive", value: "cursive" },
    { name: "Fantasy", value: "fantasy" },
    { name: "System UI", value: "system-ui" },
    { name: "Arial", value: "Arial, sans-serif" },
    { name: "Georgia", value: "Georgia, serif" },
    { name: "Comic Sans MS", value: "'Comic Sans MS', cursive" },
    { name: "Impact", value: "Impact, fantasy" },
    { name: "Courier New", value: "'Courier New', monospace" },
  ];

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("Image size should be less than 10MB");
        return;
      }

      setSelectedImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (statusType === "text") {
        if (!text.trim()) {
          toast.error("Please enter status text");
          return;
        }

        await createTextStatus({
          text: text.trim(),
          backgroundColor,
          fontStyle,
          fontFamily,
          textAlign,
          visibility,
          specificUsers: visibility === "onlyShareWith" ? specificUsers : []
        });
      } else {
        if (!selectedImage) {
          toast.error("Please select an image");
          return;
        }

        const formData = new FormData();
        formData.append("image", selectedImage);
        if (caption.trim()) {
          formData.append("caption", caption.trim());
        }
        formData.append("visibility", visibility);
        if (visibility === "onlyShareWith") {
          formData.append("specificUsers", JSON.stringify(specificUsers));
        }

        await createImageStatus(formData);
      }

      // Reset form and close modal
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error creating status:", error);
    }
  };

  const resetForm = () => {
    setText("");
    setCaption("");
    setBackgroundColor("#075E54");
    setFontStyle("normal");
    setFontFamily("sans-serif");
    setTextAlign("center");
    setSelectedImage(null);
    setImagePreview(null);
    setStatusType("text");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h2 className="text-lg font-semibold">Create Status</h2>
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Status Type Selector */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setStatusType("text")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                statusType === "text"
                  ? "bg-primary text-primary-content"
                  : "bg-base-200 hover:bg-base-300"
              }`}
            >
              <Type size={16} />
              Text
            </button>
            <button
              onClick={() => setStatusType("image")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                statusType === "image"
                  ? "bg-primary text-primary-content"
                  : "bg-base-200 hover:bg-base-300"
              }`}
            >
              <Image size={16} />
              Image
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {statusType === "text" ? (
              <>
                {/* Text Status Preview */}
                <div
                  className="relative w-full h-48 rounded-lg flex items-center justify-center p-4"
                  style={{ backgroundColor }}
                >
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="What's on your mind?"
                    className={`w-full h-full bg-transparent text-white placeholder-white/70 resize-none border-none outline-none text-${textAlign} text-lg ${
                      fontStyle === "bold" ? "font-bold" :
                      fontStyle === "italic" ? "italic" :
                      fontStyle === "bold-italic" ? "font-bold italic" : ""
                    }`}
                    style={{ fontFamily }}
                    maxLength={700}
                  />
                  <div className="absolute bottom-2 right-2 text-white/70 text-xs">
                    {text.length}/700
                  </div>
                </div>

                {/* Background Colors */}
                <div>
                  <label className="block text-sm font-medium mb-2">Background Color</label>
                  <div className="grid grid-cols-6 gap-2">
                    {backgroundColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setBackgroundColor(color)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          backgroundColor === color ? "border-primary" : "border-base-300"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Font Family */}
                <div>
                  <label className="block text-sm font-medium mb-2">Font Family</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="select select-bordered w-full"
                  >
                    {fontFamilies.map((font) => (
                      <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                        {font.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Font Style */}
                <div>
                  <label className="block text-sm font-medium mb-2">Font Style</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFontStyle("normal")}
                      className={`px-3 py-1 rounded ${
                        fontStyle === "normal" ? "bg-primary text-primary-content" : "bg-base-200"
                      }`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontStyle("bold")}
                      className={`px-3 py-1 rounded font-bold ${
                        fontStyle === "bold" ? "bg-primary text-primary-content" : "bg-base-200"
                      }`}
                    >
                      <Bold size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontStyle("italic")}
                      className={`px-3 py-1 rounded italic ${
                        fontStyle === "italic" ? "bg-primary text-primary-content" : "bg-base-200"
                      }`}
                    >
                      <Italic size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontStyle("bold-italic")}
                      className={`px-3 py-1 rounded font-bold italic ${
                        fontStyle === "bold-italic" ? "bg-primary text-primary-content" : "bg-base-200"
                      }`}
                    >
                      B+I
                    </button>
                  </div>
                </div>

                {/* Text Alignment */}
                <div>
                  <label className="block text-sm font-medium mb-2">Text Alignment</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTextAlign("left")}
                      className={`px-3 py-1 rounded ${
                        textAlign === "left" ? "bg-primary text-primary-content" : "bg-base-200"
                      }`}
                    >
                      <AlignLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextAlign("center")}
                      className={`px-3 py-1 rounded ${
                        textAlign === "center" ? "bg-primary text-primary-content" : "bg-base-200"
                      }`}
                    >
                      <AlignCenter size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextAlign("right")}
                      className={`px-3 py-1 rounded ${
                        textAlign === "right" ? "bg-primary text-primary-content" : "bg-base-200"
                      }`}
                    >
                      <AlignRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Image Status */}
                <div className="space-y-4">
                  {/* Image Upload */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />

                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Status preview"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImage(null);
                            setImagePreview(null);
                          }}
                          className="absolute top-2 right-2 btn btn-error btn-sm btn-circle"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-48 border-2 border-dashed border-base-300 rounded-lg flex flex-col items-center justify-center hover:border-primary transition-colors"
                      >
                        <Camera size={48} className="text-base-content/50 mb-2" />
                        <span className="text-base-content/70">Click to select image</span>
                      </button>
                    )}
                  </div>

                  {/* Caption */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Caption (optional)</label>
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Add a caption..."
                      className="textarea textarea-bordered w-full"
                      rows={3}
                      maxLength={700}
                    />
                    <div className="text-right text-xs text-base-content/60 mt-1">
                      {caption.length}/700
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Privacy Settings */}
            <div className="border-t border-base-300 pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Privacy Settings</label>
                <button
                  type="button"
                  onClick={() => setShowPrivacySettings(!showPrivacySettings)}
                  className="text-primary text-sm hover:underline"
                >
                  {showPrivacySettings ? "Hide" : "Show"}
                </button>
              </div>

              {showPrivacySettings && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="visibility"
                        value="contacts"
                        checked={visibility === "contacts"}
                        onChange={(e) => setVisibility(e.target.value)}
                        className="radio radio-primary radio-sm"
                      />
                      <span className="text-sm">My contacts</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="visibility"
                        value="contactsExcept"
                        checked={visibility === "contactsExcept"}
                        onChange={(e) => setVisibility(e.target.value)}
                        className="radio radio-primary radio-sm"
                      />
                      <span className="text-sm">My contacts except...</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="visibility"
                        value="onlyShareWith"
                        checked={visibility === "onlyShareWith"}
                        onChange={(e) => setVisibility(e.target.value)}
                        className="radio radio-primary radio-sm"
                      />
                      <span className="text-sm">Only share with...</span>
                    </label>
                  </div>

                  {(visibility === "contactsExcept" || visibility === "onlyShareWith") && (
                    <div className="text-xs text-base-content/60 bg-base-200 p-2 rounded">
                      <p>Contact selection feature coming soon!</p>
                      <p>For now, status will be visible to all contacts.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isCreatingStatus}
              className="btn btn-primary w-full"
            >
              {isCreatingStatus ? "Creating..." : "Post Status"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StatusCreateModal;
