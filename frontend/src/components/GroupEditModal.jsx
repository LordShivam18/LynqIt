import { useState, useRef } from "react";
import { X, Camera, Upload, Save, Loader2 } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const GroupEditModal = ({ group, isOpen, onClose }) => {
  const { updateGroupSettings } = useGroupStore();
  const { authUser } = useAuthStore();
  
  const [groupName, setGroupName] = useState(group?.name || "");
  const [groupDescription, setGroupDescription] = useState(group?.description || "");
  const [groupAvatar, setGroupAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(group?.avatar || "");
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef(null);

  // Check permissions
  const isOwner = group?.createdBy?._id === authUser?._id;
  const isAdmin = group?.members?.find(m => m.user._id === authUser?._id)?.role === 'admin';
  
  const canChangeName = isOwner || isAdmin || group?.settings?.allowMemberNameChange;
  const canChangeDescription = isOwner || isAdmin || group?.settings?.allowMemberDescriptionChange;
  const canChangeAvatar = isOwner || isAdmin || group?.settings?.allowMemberAvatarChange;

  const handleAvatarChange = (e) => {
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
    reader.onloadend = () => {
      setGroupAvatar(reader.result);
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!groupName.trim()) {
      toast.error("Group name cannot be empty");
      return;
    }

    if (groupName.length > 50) {
      toast.error("Group name must be 50 characters or less");
      return;
    }

    if (groupDescription.length > 200) {
      toast.error("Description must be 200 characters or less");
      return;
    }

    setIsLoading(true);
    try {
      const updates = {};
      
      if (groupName !== group.name && canChangeName) {
        updates.name = groupName.trim();
      }
      
      if (groupDescription !== group.description && canChangeDescription) {
        updates.description = groupDescription.trim();
      }
      
      if (groupAvatar && canChangeAvatar) {
        updates.avatar = groupAvatar;
      }

      if (Object.keys(updates).length === 0) {
        toast.info("No changes to save");
        onClose();
        return;
      }

      await updateGroupSettings(group._id, updates);
      onClose();
    } catch (error) {
      console.error("Error updating group:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setGroupName(group?.name || "");
    setGroupDescription(group?.description || "");
    setGroupAvatar(null);
    setAvatarPreview(group?.avatar || "");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={handleClose}>
      <div className="bg-base-100 rounded-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Edit Group</h3>
          <button onClick={handleClose} className="btn btn-ghost btn-sm btn-circle">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Group Avatar */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-base-200 flex items-center justify-center">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Group avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera size={32} className="text-base-content/50" />
                )}
              </div>
              
              {canChangeAvatar && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 btn btn-primary btn-sm btn-circle"
                >
                  <Upload size={14} />
                </button>
              )}
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
            
            {!canChangeAvatar && (
              <p className="text-xs text-base-content/60 mt-2 text-center">
                Only admins can change group photo
              </p>
            )}
          </div>

          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              disabled={!canChangeName}
              className="input input-bordered w-full"
              placeholder="Enter group name"
              maxLength={50}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-base-content/60">
                {!canChangeName && "Only admins can change group name"}
              </span>
              <span className="text-xs text-base-content/60">
                {groupName.length}/50
              </span>
            </div>
          </div>

          {/* Group Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              disabled={!canChangeDescription}
              className="textarea textarea-bordered w-full h-24 resize-none"
              placeholder="Enter group description (optional)"
              maxLength={200}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-base-content/60">
                {!canChangeDescription && "Only admins can change description"}
              </span>
              <span className="text-xs text-base-content/60">
                {groupDescription.length}/200
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleClose}
              className="btn btn-outline flex-1"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || (!canChangeName && !canChangeDescription && !canChangeAvatar)}
              className="btn btn-primary flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupEditModal;
