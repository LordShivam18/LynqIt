import { useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { Search, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

const ForwardMessageModal = ({ isOpen, onClose, messageId }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [isForwarding, setIsForwarding] = useState(false);
  
  const { users, getAllUsers, allUsers } = useChatStore();
  const { groups } = useGroupStore();

  useEffect(() => {
    if (isOpen) {
      getAllUsers();
    }
  }, [isOpen, getAllUsers]);

  const filteredUsers = allUsers.filter(
    (user) =>
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter(
    (group) => group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectTarget = (target, type) => {
    const targetId = target._id;
    const isSelected = selectedTargets.some(
      t => t.id === targetId && t.type === type
    );

    if (isSelected) {
      setSelectedTargets(selectedTargets.filter(
        t => !(t.id === targetId && t.type === type)
      ));
    } else {
      setSelectedTargets([
        ...selectedTargets,
        {
          id: targetId,
          type,
          name: type === 'user' ? target.fullName : target.name,
          avatar: type === 'user' ? target.profilePic : target.avatar
        }
      ]);
    }
  };

  const handleForwardMessage = async () => {
    if (selectedTargets.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    setIsForwarding(true);

    try {
      const forwardPromises = selectedTargets.map(target => 
        axiosInstance.post("/messages/forward", {
          messageId,
          targetId: target.id,
          targetType: target.type
        })
      );

      await Promise.all(forwardPromises);
      toast.success(`Message forwarded to ${selectedTargets.length} ${selectedTargets.length === 1 ? 'chat' : 'chats'}`);
      onClose();
    } catch (error) {
      console.error("Error forwarding message:", error);
      toast.error("Failed to forward message");
    } finally {
      setIsForwarding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h2 className="text-lg font-semibold">Forward Message</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X size={20} />
          </button>
        </div>

        {/* Selected targets */}
        {selectedTargets.length > 0 && (
          <div className="p-2 border-b border-base-300 flex flex-wrap gap-2">
            {selectedTargets.map(target => (
              <div key={`${target.type}-${target.id}`} className="badge badge-primary gap-1">
                {target.name}
                <button onClick={() => handleSelectTarget({_id: target.id}, target.type)}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="p-4 border-b border-base-300">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users and groups..."
              className="input input-bordered w-full pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute right-3 top-3 text-base-content/50" size={20} />
          </div>
        </div>

        {/* Users and Groups List */}
        <div className="overflow-y-auto max-h-[50vh]">
          {searchQuery.trim() === "" ? (
            <>
              {/* Recents */}
              <div className="p-2 bg-base-200">
                <h3 className="text-sm font-medium px-2">Recent Chats</h3>
              </div>
              <div className="divide-y divide-base-200">
                {users.map(user => (
                  <div
                    key={user._id}
                    className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-base-200 ${
                      selectedTargets.some(t => t.id === user._id && t.type === 'user')
                        ? "bg-base-200"
                        : ""
                    }`}
                    onClick={() => handleSelectTarget(user, 'user')}
                  >
                    <div className="avatar">
                      <div className="w-10 h-10 rounded-full">
                        <img src={user.profilePic || "/default-avatar.png"} alt={user.fullName} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{user.fullName}</h4>
                      <p className="text-sm text-base-content/70">@{user.username}</p>
                    </div>
                  </div>
                ))}
                {groups.map(group => (
                  <div
                    key={group._id}
                    className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-base-200 ${
                      selectedTargets.some(t => t.id === group._id && t.type === 'group')
                        ? "bg-base-200"
                        : ""
                    }`}
                    onClick={() => handleSelectTarget(group, 'group')}
                  >
                    <div className="avatar">
                      <div className="w-10 h-10 rounded-full">
                        <img src={group.avatar || "/default-group.png"} alt={group.name} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{group.name}</h4>
                      <p className="text-sm text-base-content/70">{group.members.length} members</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Search Results */}
              {filteredUsers.length > 0 && (
                <div>
                  <div className="p-2 bg-base-200">
                    <h3 className="text-sm font-medium px-2">Users</h3>
                  </div>
                  <div className="divide-y divide-base-200">
                    {filteredUsers.map(user => (
                      <div
                        key={user._id}
                        className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-base-200 ${
                          selectedTargets.some(t => t.id === user._id && t.type === 'user')
                            ? "bg-base-200"
                            : ""
                        }`}
                        onClick={() => handleSelectTarget(user, 'user')}
                      >
                        <div className="avatar">
                          <div className="w-10 h-10 rounded-full">
                            <img src={user.profilePic || "/default-avatar.png"} alt={user.fullName} />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{user.fullName}</h4>
                          <p className="text-sm text-base-content/70">@{user.username}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredGroups.length > 0 && (
                <div>
                  <div className="p-2 bg-base-200">
                    <h3 className="text-sm font-medium px-2">Groups</h3>
                  </div>
                  <div className="divide-y divide-base-200">
                    {filteredGroups.map(group => (
                      <div
                        key={group._id}
                        className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-base-200 ${
                          selectedTargets.some(t => t.id === group._id && t.type === 'group')
                            ? "bg-base-200"
                            : ""
                        }`}
                        onClick={() => handleSelectTarget(group, 'group')}
                      >
                        <div className="avatar">
                          <div className="w-10 h-10 rounded-full">
                            <img src={group.avatar || "/default-group.png"} alt={group.name} />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{group.name}</h4>
                          <p className="text-sm text-base-content/70">{group.members.length} members</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with action buttons */}
        <div className="p-4 border-t border-base-300">
          <button
            onClick={handleForwardMessage}
            disabled={selectedTargets.length === 0 || isForwarding}
            className="btn btn-primary w-full gap-2"
          >
            {isForwarding ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Forwarding...
              </>
            ) : (
              <>
                <Send size={16} />
                Forward to {selectedTargets.length} {selectedTargets.length === 1 ? 'chat' : 'chats'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardMessageModal; 