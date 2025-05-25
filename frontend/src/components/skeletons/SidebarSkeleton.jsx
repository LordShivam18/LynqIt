import { Users, UsersRound, CircleDot } from "lucide-react";

const SidebarSkeleton = () => {
  // Create 6 skeleton items
  const skeletonContacts = Array(6).fill(null);

  return (
    <aside className="h-full w-20 lg:w-80 min-w-20 lg:min-w-80 max-w-20 lg:max-w-80 border-r border-base-300/50 flex flex-col flex-shrink-0 bg-gradient-to-b from-base-100 to-base-200/30">
      {/* Profile Section */}
      <div className="border-b border-base-300 w-full p-4">
        <div className="flex items-center gap-3">
          {/* Profile Picture Skeleton */}
          <div className="skeleton size-10 rounded-full" />

          {/* User Info Skeleton - only visible on larger screens */}
          <div className="hidden lg:block flex-1">
            <div className="skeleton h-4 w-24 mb-1" />
            <div className="skeleton h-3 w-16" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-base-300 w-full">
        <div className="flex">
          {/* Chats Tab */}
          <div className="flex-1 p-3 border-b-2 border-primary">
            <div className="flex items-center justify-center lg:justify-start gap-2">
              <Users className="w-5 h-5" />
              <span className="font-medium hidden lg:block">Chats</span>
            </div>
          </div>

          {/* Groups Tab */}
          <div className="flex-1 p-3">
            <div className="flex items-center justify-center lg:justify-start gap-2">
              <UsersRound className="w-5 h-5 opacity-60" />
              <span className="font-medium hidden lg:block opacity-60">Groups</span>
            </div>
          </div>

          {/* Status Tab */}
          <div className="flex-1 p-3">
            <div className="flex items-center justify-center lg:justify-start gap-2">
              <CircleDot className="w-5 h-5 opacity-60" />
              <span className="font-medium hidden lg:block opacity-60">Status</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar Skeleton */}
      <div className="p-3 border-b border-base-300">
        <div className="skeleton h-10 w-full rounded-lg" />
      </div>

      {/* Skeleton Contacts */}
      <div className="overflow-y-auto w-full py-2 flex-1">
        {skeletonContacts.map((_, idx) => (
          <div key={idx} className="w-full p-3 flex items-center gap-3 hover:bg-base-200">
            {/* Avatar skeleton */}
            <div className="relative mx-auto lg:mx-0">
              <div className="skeleton size-12 rounded-full" />
            </div>

            {/* User info skeleton - only visible on larger screens */}
            <div className="hidden lg:block text-left min-w-0 flex-1">
              <div className="flex justify-between items-start mb-1">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-3 w-12" />
              </div>
              <div className="flex justify-between items-center">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton size-5 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default SidebarSkeleton;