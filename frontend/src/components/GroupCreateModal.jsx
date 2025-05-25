import { useState, useEffect } from "react";
import { X, Search, Users, Camera, Check } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const GroupCreateModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1); // 1: Basic info, 2: Add members
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupAvatar, setGroupAvatar] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  const { createGroup, isCreatingGroup } = useGroupStore();
  const { allUsers, getAllUsers } = useChatStore();
  const { authUser } = useAuthStore();

  // Fetch all users when modal opens
  useEffect(() => {
    if (isOpen) {
      getAllUsers();
    }
  }, [isOpen, getAllUsers]);

  // Filter users based on search term (exclude current user)
  const filteredUsers = allUsers
    .filter(user => user._id !== authUser?._id) // Exclude current user
    .filter(user =>
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Handle avatar upload
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error("Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setGroupAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Toggle member selection
  const toggleMemberSelection = (user) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(member => member._id === user._id);
      if (isSelected) {
        return prev.filter(member => member._id !== user._id);
      } else {
        return [...prev, user];
      }
    });
  };

  // Handle group creation
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    try {
      const groupData = {
        name: groupName.trim(),
        description: groupDescription.trim(),
        memberIds: selectedMembers.map(member => member._id)
      };

      if (groupAvatar) {
        groupData.avatar = groupAvatar;
      }

      await createGroup(groupData);
      handleClose();
    } catch (error) {
      // Error is handled in the store
    }
  };

  // Handle modal close
  const handleClose = () => {
    setStep(1);
    setGroupName("");
    setGroupDescription("");
    setGroupAvatar("");
    setSearchTerm("");
    setSelectedMembers([]);
    onClose();
  };

  // Handle next step
  const handleNext = () => {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    setStep(2);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h2 className="text-lg font-semibold">
            {step === 1 ? "Create Group" : "Add Members"}
          </h2>
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-circle"
            disabled={isCreatingGroup}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {step === 1 ? (
            // Step 1: Basic Group Info
            <div className="space-y-4">
              {/* Group Avatar */}
              <div className="flex flex-col items-center space-y-2">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-base-300 flex items-center justify-center overflow-hidden">
                    {groupAvatar ? (
                      <img
                        src={groupAvatar}
                        alt="Group avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users size={32} className="text-base-content/50" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 btn btn-circle btn-xs btn-primary cursor-pointer">
                    <Camera size={12} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-sm text-base-content/70">Group Photo</p>
              </div>

              {/* Group Name */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Group Name *</span>
                  <span className="label-text-alt">{groupName.length}/50</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter group name"
                  className="input input-bordered w-full"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={50}
                />
              </div>

              {/* Group Description */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Description (Optional)</span>
                  <span className="label-text-alt">{groupDescription.length}/200</span>
                </label>
                <textarea
                  placeholder="Enter group description"
                  className="textarea textarea-bordered w-full h-20 resize-none"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>
          ) : (
            // Step 2: Add Members
            <div className="space-y-4">
              {/* Search */}
              <div className="form-control">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50" size={20} />
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="input input-bordered w-full pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Selected Members Count */}
              {selectedMembers.length > 0 && (
                <div className="text-sm text-base-content/70">
                  {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                </div>
              )}

              {/* Users List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredUsers.map((user) => {
                  const isSelected = selectedMembers.some(member => member._id === user._id);
                  return (
                    <div
                      key={user._id}
                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-primary/10 border border-primary/20"
                          : "bg-base-200 hover:bg-base-300"
                      }`}
                      onClick={() => toggleMemberSelection(user)}
                    >
                      <div className="relative">
                        <img
                          src={user.profilePic || "/avatar.png"}
                          alt={user.fullName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        {user.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-base-100"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.fullName}</p>
                        <p className="text-sm text-base-content/70 truncate">@{user.username}</p>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <Check size={16} className="text-primary-content" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {filteredUsers.length === 0 && allUsers.length === 0 && (
                <div className="text-center py-8 text-base-content/50">
                  <div className="loading loading-spinner loading-md mb-2"></div>
                  <p>Loading users...</p>
                </div>
              )}

              {filteredUsers.length === 0 && allUsers.length > 0 && (
                <div className="text-center py-8 text-base-content/50">
                  No users found matching "{searchTerm}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-base-300">
          {step === 1 ? (
            <>
              <button
                onClick={handleClose}
                className="btn btn-ghost"
                disabled={isCreatingGroup}
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                className="btn btn-primary"
                disabled={!groupName.trim() || isCreatingGroup}
              >
                Next
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                className="btn btn-ghost"
                disabled={isCreatingGroup}
              >
                Back
              </button>
              <button
                onClick={handleCreateGroup}
                className="btn btn-primary"
                disabled={isCreatingGroup}
              >
                {isCreatingGroup ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Creating...
                  </>
                ) : (
                  "Create Group"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupCreateModal;
