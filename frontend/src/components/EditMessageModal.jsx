import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

export const EditMessageModal = ({ message, onClose }) => {
  const [text, setText] = useState(message?.text || "");
  const inputRef = useRef(null);
  const { editMessage } = useChatStore();
  
  // Focus input when modal opens
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Calculate time remaining to edit
  const timeRemaining = () => {
    if (!message) return 0;
    
    const messageDate = new Date(message.createdAt);
    const now = new Date();
    const minutesDiff = (now - messageDate) / (1000 * 60);
    
    // 15 minutes time limit
    return Math.max(0, Math.floor(15 - minutesDiff));
  };
  
  const [remainingTime, setRemainingTime] = useState(timeRemaining());
  
  // Update time remaining every second
  useEffect(() => {
    const interval = setInterval(() => {
      const newTime = timeRemaining();
      setRemainingTime(newTime);
      
      // Close modal when time runs out
      if (newTime <= 0) {
        onClose();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [message, onClose]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!text.trim()) {
      return;
    }
    
    const success = await editMessage(message._id, text);
    if (success) {
      onClose();
    }
  };
  
  if (!message) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md p-4 mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X size={20} />
        </button>
        
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Edit Message
        </h3>
        
        <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Time remaining: {remainingTime} minute{remainingTime !== 1 ? 's' : ''}
        </div>
        
        <form onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-2 mb-4 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={3}
          />
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMessageModal; 