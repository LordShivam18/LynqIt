import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Search } from "lucide-react";

const Sidebar = () => {
  const { 
    getUsers, 
    getAllUsers, 
    users, 
    allUsers, 
    selectedUser, 
    setSelectedUser, 
    isUsersLoading,
    unreadCounts 
  } = useChatStore();
  const { onlineUsers, authUser, socket } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    getUsers(); // Get users with existing conversations
  }, [getUsers]);

  useEffect(() => {
    // When search query is entered, get all users for search suggestions
    if (searchQuery.trim()) {
      setIsSearching(true);
      getAllUsers();
    } else {
      setIsSearching(false);
    }
  }, [searchQuery, getAllUsers]);

  // Listen for refreshChat events from the server
  useEffect(() => {
    if (!socket) return;

    const handleRefreshChats = () => {
      getUsers();
    };

    socket.on("refreshChats", handleRefreshChats);

    return () => {
      socket.off("refreshChats", handleRefreshChats);
    };
  }, [socket, getUsers]);

  // Display existing chats when not searching, or search results when searching
  const displayUsers = isSearching
    ? allUsers
        .filter((user) => user._id !== authUser._id)
        .filter((user) => 
          user.username?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    : users.filter((user) => user._id !== authUser._id);

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-6" />
            <span className="font-medium hidden lg:block">Chats</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-3 hidden lg:flex items-center gap-2 bg-base-200 px-2 rounded-md">
          <Search className="w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by username"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm w-full focus:outline-none py-1"
          />
        </div>
      </div>

      <div className="overflow-y-auto w-full py-3">
        {displayUsers.map((user) => {
          const unreadCount = unreadCounts[user._id] || 0;
          
          return (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`
                w-full p-3 flex items-center gap-3
                hover:bg-base-300 transition-colors
                ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
              `}
            >
              <div className="relative mx-auto lg:mx-0">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.username}
                  className="size-12 object-cover rounded-full"
                />
                {onlineUsers.includes(user._id) && (
                  <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-zinc-900" />
                )}
              </div>

              <div className="hidden lg:block text-left min-w-0 flex-1">
                <div className="font-medium truncate">{user.fullName}</div>
                <div className="text-sm text-zinc-400">@{user.username}</div>
              </div>
              
              {/* Unread message count badge */}
              {unreadCount > 0 && (
                <div className="flex items-center justify-center min-w-5 h-5 rounded-full bg-primary text-primary-content text-xs font-medium">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              )}
            </button>
          );
        })}

        {searchQuery && displayUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-4">No users found</div>
        )}

        {!searchQuery && displayUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-4">No conversations yet</div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
