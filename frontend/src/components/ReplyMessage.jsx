import { Reply } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useGroupStore } from "../store/useGroupStore";

const ReplyMessage = ({ replyTo, onClick }) => {
  const { authUser } = useAuthStore();
  const { selectedGroup } = useGroupStore();

  if (!replyTo) return null;

  const isGroupChat = !!selectedGroup;

  // Get sender name properly
  const getSenderName = () => {
    if (!replyTo.senderId) return 'Unknown';

    // If senderId is a string (just the ID), we need to find the user
    if (typeof replyTo.senderId === 'string') {
      // Check if it's the current user
      if (replyTo.senderId === authUser?._id) {
        return 'You';
      }

      // For group chats, try to find the member
      if (isGroupChat && selectedGroup?.members) {
        const member = selectedGroup.members.find(m =>
          m.user._id === replyTo.senderId
        );
        return member?.user.fullName || 'Unknown';
      }

      return 'Unknown';
    }

    // If senderId is an object with user data
    if (replyTo.senderId.fullName) {
      return replyTo.senderId._id === authUser?._id ? 'You' : replyTo.senderId.fullName;
    }

    return 'Unknown';
  };

  // Get message preview text (all messages are plain text)
  const getMessagePreview = () => {
    if (replyTo.image) {
      return "📷 Image";
    }

    if (replyTo.text) {
      // Show the text as-is, truncate long messages
      return replyTo.text.length > 30
        ? replyTo.text.substring(0, 30) + "..."
        : replyTo.text;
    }

    return "Message";
  };

  return (
    <div
      className="bg-base-300/50 border-l-2 border-primary/50 p-2 mb-2 rounded-r cursor-pointer hover:bg-base-300/70 transition-colors"
      onClick={onClick}
      title="Click to scroll to original message"
    >
      <div className="flex items-start gap-2">
        <Reply size={12} className="text-primary/70 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-primary/80 mb-1">
            {getSenderName()}
          </div>
          <div className="text-xs text-base-content/70 truncate">
            {getMessagePreview()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplyMessage;
