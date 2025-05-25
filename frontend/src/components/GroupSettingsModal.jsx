import { useState, useEffect } from "react";
import { X, Settings, Users, Shield, Clock, Save, Loader2 } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const GroupSettingsModal = ({ group, isOpen, onClose }) => {
  const { updateGroupSettings } = useGroupStore();
  const { authUser } = useAuthStore();

  const [settings, setSettings] = useState({
    allowMemberInvites: group?.settings?.allowMemberInvites || false,
    allowMemberNameChange: group?.settings?.allowMemberNameChange || false,
    allowMemberDescriptionChange: group?.settings?.allowMemberDescriptionChange || false,
    allowMemberAvatarChange: group?.settings?.allowMemberAvatarChange || false,
    messageDeleteTimeLimit: group?.settings?.messageDeleteTimeLimit || 15
  });

  const [updatingSettings, setUpdatingSettings] = useState({});

  // Update local settings when group changes
  useEffect(() => {
    if (group?.settings) {
      setSettings({
        allowMemberInvites: group.settings.allowMemberInvites || false,
        allowMemberNameChange: group.settings.allowMemberNameChange || false,
        allowMemberDescriptionChange: group.settings.allowMemberDescriptionChange || false,
        allowMemberAvatarChange: group.settings.allowMemberAvatarChange || false,
        messageDeleteTimeLimit: group.settings.messageDeleteTimeLimit || 15
      });
    }
  }, [group?.settings]);

  // Check permissions
  const isOwner = group?.createdBy?._id === authUser?._id;
  const isAdmin = group?.members?.find(m => m.user._id === authUser?._id)?.role === 'admin';
  const canManageSettings = isOwner || isAdmin;

  const handleSettingChange = async (key, value) => {
    if (!canManageSettings) {
      toast.error("You don't have permission to change group settings");
      return;
    }

    // Show loading state for this specific setting
    setUpdatingSettings(prev => ({ ...prev, [key]: true }));

    // Update local state immediately for responsive UI
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));

    // Update backend in real-time
    try {
      const newSettings = {
        ...settings,
        [key]: value
      };
      await updateGroupSettings(group._id, { settings: newSettings });
      toast.success("Setting updated successfully!");
    } catch (error) {
      // Revert local state if backend update fails
      setSettings(prev => ({
        ...prev,
        [key]: !value
      }));
      toast.error("Failed to update setting");
      console.error("Error updating setting:", error);
    } finally {
      // Remove loading state
      setUpdatingSettings(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleClose = () => {
    setSettings({
      allowMemberInvites: group?.settings?.allowMemberInvites || false,
      allowMemberNameChange: group?.settings?.allowMemberNameChange || false,
      allowMemberDescriptionChange: group?.settings?.allowMemberDescriptionChange || false,
      allowMemberAvatarChange: group?.settings?.allowMemberAvatarChange || false,
      messageDeleteTimeLimit: group?.settings?.messageDeleteTimeLimit || 15
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={handleClose}>
      <div className="bg-base-100 rounded-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings size={24} className="text-primary" />
            <h3 className="text-xl font-bold">Group Settings</h3>
          </div>
          <button onClick={handleClose} className="btn btn-ghost btn-sm btn-circle">
            <X size={20} />
          </button>
        </div>

        {!canManageSettings && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-warning" />
              <span className="text-sm font-medium text-warning">View Only</span>
            </div>
            <p className="text-xs text-base-content/70 mt-1">
              Only group admins and owners can modify these settings
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Member Permissions */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users size={20} className="text-primary" />
              <h4 className="font-semibold">Member Permissions</h4>
            </div>

            <div className="space-y-4 pl-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-sm">Allow member invites</label>
                  <p className="text-xs text-base-content/70">Members can invite new people to the group</p>
                </div>
                <div className="flex items-center gap-2">
                  {updatingSettings.allowMemberInvites && (
                    <Loader2 size={16} className="animate-spin text-primary" />
                  )}
                  <input
                    type="checkbox"
                    checked={settings.allowMemberInvites}
                    onChange={(e) => handleSettingChange('allowMemberInvites', e.target.checked)}
                    disabled={!canManageSettings || updatingSettings.allowMemberInvites}
                    className="toggle toggle-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-sm">Allow name changes</label>
                  <p className="text-xs text-base-content/70">Members can change the group name</p>
                </div>
                <div className="flex items-center gap-2">
                  {updatingSettings.allowMemberNameChange && (
                    <Loader2 size={16} className="animate-spin text-primary" />
                  )}
                  <input
                    type="checkbox"
                    checked={settings.allowMemberNameChange}
                    onChange={(e) => handleSettingChange('allowMemberNameChange', e.target.checked)}
                    disabled={!canManageSettings || updatingSettings.allowMemberNameChange}
                    className="toggle toggle-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-sm">Allow description changes</label>
                  <p className="text-xs text-base-content/70">Members can change the group description</p>
                </div>
                <div className="flex items-center gap-2">
                  {updatingSettings.allowMemberDescriptionChange && (
                    <Loader2 size={16} className="animate-spin text-primary" />
                  )}
                  <input
                    type="checkbox"
                    checked={settings.allowMemberDescriptionChange}
                    onChange={(e) => handleSettingChange('allowMemberDescriptionChange', e.target.checked)}
                    disabled={!canManageSettings || updatingSettings.allowMemberDescriptionChange}
                    className="toggle toggle-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-sm">Allow avatar changes</label>
                  <p className="text-xs text-base-content/70">Members can change the group profile picture</p>
                </div>
                <div className="flex items-center gap-2">
                  {updatingSettings.allowMemberAvatarChange && (
                    <Loader2 size={16} className="animate-spin text-primary" />
                  )}
                  <input
                    type="checkbox"
                    checked={settings.allowMemberAvatarChange}
                    onChange={(e) => handleSettingChange('allowMemberAvatarChange', e.target.checked)}
                    disabled={!canManageSettings || updatingSettings.allowMemberAvatarChange}
                    className="toggle toggle-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Message Settings */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={20} className="text-primary" />
              <h4 className="font-semibold">Message Settings</h4>
            </div>

            <div className="pl-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-sm">Message delete time limit</label>
                  <p className="text-xs text-base-content/70">How long members can delete their messages (minutes)</p>
                </div>
                <div className="flex items-center gap-2">
                  {updatingSettings.messageDeleteTimeLimit && (
                    <Loader2 size={16} className="animate-spin text-primary" />
                  )}
                  <select
                    value={settings.messageDeleteTimeLimit}
                    onChange={(e) => handleSettingChange('messageDeleteTimeLimit', parseInt(e.target.value))}
                    disabled={!canManageSettings || updatingSettings.messageDeleteTimeLimit}
                    className="select select-bordered select-sm w-24"
                  >
                    <option value={5}>5 min</option>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={60}>1 hour</option>
                    <option value={1440}>1 day</option>
                    <option value={-1}>Forever</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Group Info */}
          <div className="bg-base-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Group Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-base-content/70">Created:</span>
                <span>{new Date(group?.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/70">Members:</span>
                <span>{group?.members?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/70">Owner:</span>
                <span>{group?.createdBy?.fullName}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleClose}
              className="btn btn-primary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupSettingsModal;
