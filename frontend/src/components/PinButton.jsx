import React, { useState } from 'react';
import { Pin, PinOff } from 'lucide-react';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';

const PinButton = ({
  itemId,
  itemType, // 'chat' or 'group'
  isPinned,
  onPinToggle,
  className = "",
  asDiv = false, // New prop to render as div instead of button
  iconOnly = false // New prop for icon-only mode (for sidebar)
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePinToggle = async (e) => {
    e.stopPropagation(); // Prevent triggering parent click events

    console.log('Pin button clicked:', { itemId, itemType, isPinned });

    setIsLoading(true);
    try {
      const endpoint = itemType === 'chat'
        ? `/users/pin/chat/${itemId}`
        : `/users/pin/group/${itemId}`;

      console.log('Making pin request to:', endpoint);
      console.log('Full URL will be:', axiosInstance.defaults.baseURL + endpoint);

      const response = await axiosInstance.post(endpoint);
      console.log('Pin response:', response.data);

      // Call the callback to update parent state
      if (onPinToggle) {
        onPinToggle(itemId, response.data.isPinned);
      }

      toast.success(response.data.message);
    } catch (error) {
      console.error('Error toggling pin:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);

      if (error.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else if (error.response?.status === 404) {
        toast.error('Endpoint not found. Please check the server.');
      } else {
        toast.error(error.response?.data?.error || 'Failed to toggle pin');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const Element = asDiv ? 'div' : 'button';

  // Different styles for icon-only mode (sidebar) vs full mode (dropdown)
  const baseClasses = iconOnly ? `
    flex items-center justify-center w-8 h-8 rounded-full hover:bg-base-200 cursor-pointer transition-colors
    ${isPinned ? 'text-primary' : 'text-base-content/60'}
    ${isLoading ? 'opacity-50' : ''}
    ${className}
  ` : `
    w-full flex items-center gap-2 p-2 hover:bg-base-200 rounded text-left cursor-pointer
    ${isPinned ? 'text-primary' : 'text-base-content'}
    ${isLoading ? 'opacity-50' : ''}
    ${className}
  `;

  return (
    <Element
      onClick={handlePinToggle}
      disabled={!asDiv && isLoading}
      className={baseClasses}
      title={isPinned ? 'Unpin' : 'Pin'}
    >
      {isLoading ? (
        <span className="loading loading-spinner loading-xs"></span>
      ) : isPinned ? (
        <Pin size={iconOnly ? 14 : 16} className="fill-current" />
      ) : (
        <PinOff size={iconOnly ? 14 : 16} />
      )}
      {!iconOnly && <span>{isPinned ? 'Unpin' : 'Pin'}</span>}
    </Element>
  );
};

export default PinButton;
