import { X, Reply } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";

const ReplyPreview = () => {
  const { replyingTo, clearReplyingTo } = useChatStore();
  const { selectedGroup } = useGroupStore();
  const { authUser } = useAuthStore();

  if (!replyingTo) return null;

  const isGroupChat = !!selectedGroup;

  // Get sender name properly
  const getSenderName = () => {
    if (!replyingTo.senderId) {
      return 'Unknown';
    }

    // If senderId is a string (just the ID), we need to find the user
    if (typeof replyingTo.senderId === 'string') {
      // Check if it's the current user
      if (replyingTo.senderId === authUser?._id) {
        return 'You';
      }

      // For group chats, try to find the member
      if (isGroupChat && selectedGroup?.members) {
        const member = selectedGroup.members.find(m =>
          m.user._id === replyingTo.senderId
        );
        return member?.user.fullName || 'Unknown';
      }

      return 'Unknown';
    }

    // If senderId is an object with user data
    if (replyingTo.senderId.fullName) {
      return replyingTo.senderId._id === authUser?._id ? 'You' : replyingTo.senderId.fullName;
    }

    return 'Unknown';
  };

  // Get message preview text (all messages are plain text)
  const getMessagePreview = () => {
    if (replyingTo.image) {
      return "📷 Image";
    }

    if (replyingTo.text) {
      // Show the text as-is, truncate long messages
      return replyingTo.text.length > 50
        ? replyingTo.text.substring(0, 50) + "..."
        : replyingTo.text;
    }

    return "Message";
  };

  return (
    <div className="bg-base-200 border-l-4 border-primary p-3 mx-4 mb-2 rounded-r-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1">
          <Reply size={16} className="text-primary mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-primary">
                Replying to {getSenderName()}
              </span>
              {isGroupChat && (
                <span className="text-xs text-base-content/60">
                  in {selectedGroup.name}
                </span>
              )}
            </div>
            <div className="text-sm text-base-content/80 truncate">
              {getMessagePreview()}
            </div>
          </div>
        </div>
        <button
          onClick={clearReplyingTo}
          className="btn btn-ghost btn-xs p-1 ml-2 flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default ReplyPreview;
