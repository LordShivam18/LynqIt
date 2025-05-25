import React, { useState } from 'react';
import { UserX, UserCheck, AlertTriangle } from 'lucide-react';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';

const BlockUserButton = ({
  userId,
  username,
  isBlocked = false,
  onBlockToggle,
  className = "",
  showConfirmation = true,
  asDiv = false // New prop to render as div instead of button
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleBlockToggle = async () => {
    console.log('Block button clicked:', { userId, username, isBlocked, showConfirm });

    if (showConfirmation && !isBlocked && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = isBlocked
        ? `/users/unblock/${userId}`
        : `/users/block/${userId}`;

      console.log('Making block request to:', endpoint);
      const response = await axiosInstance.post(endpoint);
      console.log('Block response:', response.data);

      // Call the callback to update parent state
      if (onBlockToggle) {
        onBlockToggle(userId, !isBlocked);
      }

      toast.success(response.data.message);
      setShowConfirm(false);
    } catch (error) {
      console.error('Error toggling block:', error);
      toast.error(error.response?.data?.error || 'Failed to toggle block');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  if (showConfirm) {
    return (
      <div className="bg-base-200 p-3 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <span className="text-sm font-medium">Block {username}?</span>
        </div>
        <p className="text-xs text-base-content/70 mb-3">
          They won't be able to send you messages or see when you're online.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleBlockToggle}
            disabled={isLoading}
            className="btn btn-error btn-sm flex-1"
          >
            {isLoading ? 'Blocking...' : 'Block'}
          </button>
          <button
            onClick={handleCancel}
            className="btn btn-ghost btn-sm flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const Element = asDiv ? 'div' : 'button';
  const baseClasses = `
    w-full flex items-center gap-2 p-2 hover:bg-base-200 rounded text-left cursor-pointer
    ${isBlocked ? 'text-success hover:text-success' : 'text-error hover:text-error'}
    ${isLoading ? 'opacity-50' : ''}
    ${className}
  `;

  return (
    <Element
      onClick={handleBlockToggle}
      disabled={!asDiv && isLoading}
      className={baseClasses}
      title={isBlocked ? `Unblock ${username}` : `Block ${username}`}
    >
      {isLoading ? (
        <span className="loading loading-spinner loading-xs"></span>
      ) : (
        <>
          {isBlocked ? (
            <UserCheck size={16} />
          ) : (
            <UserX size={16} />
          )}
          <span>{isBlocked ? 'Unblock' : 'Block'}</span>
        </>
      )}
    </Element>
  );
};

export default BlockUserButton;
