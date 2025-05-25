import React, { useState, useEffect } from 'react';
import { X, UserX, UserCheck } from 'lucide-react';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';

const BlockedUsersModal = ({ isOpen, onClose }) => {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unblockingUserId, setUnblockingUserId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchBlockedUsers();
    }
  }, [isOpen]);

  const fetchBlockedUsers = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get('/users/blocked');
      setBlockedUsers(response.data.blockedUsers);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      toast.error('Failed to load blocked users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (userId, username) => {
    setUnblockingUserId(userId);
    try {
      await axiosInstance.post(`/users/unblock/${userId}`);
      setBlockedUsers(prev => prev.filter(user => user._id !== userId));
      toast.success(`${username} has been unblocked`);
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Failed to unblock user');
    } finally {
      setUnblockingUserId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-base-100 rounded-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-base-300">
          <h3 className="text-lg font-semibold">Blocked Users</h3>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="text-center py-8">
              <UserX size={48} className="mx-auto text-base-content/30 mb-4" />
              <h4 className="text-lg font-medium mb-2">No blocked users</h4>
              <p className="text-base-content/60">
                Users you block will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {blockedUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center gap-3 p-3 bg-base-200 rounded-lg"
                >
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{user.fullName}</div>
                    <div className="text-sm text-base-content/60">@{user.username}</div>
                  </div>

                  <button
                    onClick={() => handleUnblock(user._id, user.username)}
                    disabled={unblockingUserId === user._id}
                    className="btn btn-success btn-sm gap-2"
                  >
                    {unblockingUserId === user._id ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <UserCheck size={16} />
                    )}
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-base-300">
          <div className="bg-base-200 p-3 rounded-lg">
            <p className="text-xs text-base-content/70">
              Blocked users cannot send you messages or see when you're online. 
              They won't be notified that you've blocked them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockedUsersModal;
