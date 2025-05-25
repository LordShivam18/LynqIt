import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Users, Hash, Calendar, Crown, Loader2, CheckCircle, XCircle, Shield, AlertTriangle, Lock, Clock } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { useGroupStore } from "../store/useGroupStore";
import MetaTags from "../components/MetaTags";
import { getFrontendUrl } from "../config/environment";
import toast from "react-hot-toast";

const JoinGroupPage = () => {
  const { groupId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const { authUser } = useAuthStore();
  const { setSelectedGroup, getGroups, joinGroupViaLink } = useGroupStore();

  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const [linkExpired, setLinkExpired] = useState(false);

  useEffect(() => {
    fetchGroupInfo();
  }, [groupId]);

  // Set page title and meta tags
  useEffect(() => {
    if (groupInfo) {
      document.title = `Join ${groupInfo.name} - LynqIt`;

      // Set meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content',
          `Join ${groupInfo.name} on LynqIt. ${groupInfo.description || 'Connect and chat with group members.'}`
        );
      }
    } else {
      document.title = "Join Group - LynqIt";
    }

    // Cleanup on unmount
    return () => {
      document.title = "LynqIt - Connect & Chat";
    };
  }, [groupInfo]);

  const fetchGroupInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate token presence
      if (!token) {
        setTokenValid(false);
        setError("Invalid invite link - missing security token");
        return;
      }

      const res = await axiosInstance.get(`/groups/${groupId}/info`);
      setGroupInfo(res.data);

      // Check if user is already a member
      if (authUser) {
        const isMember = res.data.members?.some(member => member.user._id === authUser._id);
        setAlreadyMember(isMember);
      }
    } catch (error) {
      console.error("Error fetching group info:", error);
      const errorMessage = error.response?.data?.message || "Group not found or invalid invite link";

      // Handle specific error types
      if (error.response?.status === 404) {
        setError("This group doesn't exist or has been deleted");
      } else if (errorMessage.includes("expired")) {
        setLinkExpired(true);
        setError("This invite link has expired");
      } else if (errorMessage.includes("invalid")) {
        setTokenValid(false);
        setError("Invalid invite link");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!authUser) {
      toast.error("Please login to join the group");
      navigate("/login");
      return;
    }

    if (!token) {
      setError("Invalid invite link - missing security token");
      return;
    }

    try {
      setJoining(true);
      const joinedGroup = await joinGroupViaLink(groupId, token);

      // Set as selected group and navigate to chat
      setSelectedGroup(joinedGroup);
      navigate("/");
    } catch (error) {
      setError(error.response?.data?.message || "Failed to join group");
    } finally {
      setJoining(false);
    }
  };

  const handleGoToGroup = () => {
    if (groupInfo) {
      setSelectedGroup(groupInfo);
      navigate("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading group information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-base-200 rounded-xl p-8 text-center">
            {linkExpired ? (
              <Clock className="w-16 h-16 text-warning mx-auto mb-4" />
            ) : !tokenValid ? (
              <Shield className="w-16 h-16 text-error mx-auto mb-4" />
            ) : (
              <XCircle className="w-16 h-16 text-error mx-auto mb-4" />
            )}

            <h1 className="text-2xl font-bold mb-2">
              {linkExpired ? "Link Expired" : !tokenValid ? "Invalid Link" : "Unable to Join"}
            </h1>

            <p className="text-base-content/70 mb-6">{error}</p>

            {linkExpired && (
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-warning">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  This invite link has expired. Ask a group admin to generate a new one.
                </p>
              </div>
            )}

            {!tokenValid && (
              <div className="bg-error/10 border border-error/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-error">
                  <Shield className="w-4 h-4 inline mr-2" />
                  This link appears to be corrupted or invalid. Please check the URL.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => navigate("/")}
                className="btn btn-primary w-full"
              >
                Go to LynqIt
              </button>

              {authUser && (
                <button
                  onClick={() => navigate("/profile")}
                  className="btn btn-outline w-full"
                >
                  Go to Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Meta Tags for SEO */}
      <MetaTags
        title={groupInfo ? `Join ${groupInfo.name} - LynqIt` : "Join Group - LynqIt"}
        description={groupInfo ?
          `Join ${groupInfo.name} on LynqIt. ${groupInfo.description || 'Connect and chat with group members.'}` :
          "Join a group on LynqIt - Secure messaging platform for teams and communities."
        }
        url={window.location.href}
        type="website"
      />

      {/* Header */}
      <header className="bg-base-200 border-b border-base-300">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-content font-bold text-sm">L</span>
              </div>
              <span className="text-xl font-bold">LynqIt</span>
            </div>
            <div className="flex items-center gap-3">
              {authUser ? (
                <div className="flex items-center gap-2">
                  <img
                    src={authUser.profilePic || "/avatar.png"}
                    alt={authUser.fullName}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-sm">{authUser.fullName}</span>
                </div>
              ) : (
                <button
                  onClick={() => navigate("/login")}
                  className="btn btn-primary btn-sm"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-base-200 rounded-xl p-8">
          {/* Group Info */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4">
              {groupInfo.avatar ? (
                <img
                  src={groupInfo.avatar}
                  alt={groupInfo.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary/20 rounded-full flex items-center justify-center">
                  <span className="text-primary text-4xl">👥</span>
                </div>
              )}
            </div>

            <h1 className="text-3xl font-bold mb-2">{groupInfo.name}</h1>

            {groupInfo.description && (
              <p className="text-base-content/70 mb-4 max-w-md mx-auto">
                {groupInfo.description}
              </p>
            )}

            <div className="flex items-center justify-center gap-6 text-sm text-base-content/60">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{groupInfo.members?.length || 0} members</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Created {new Date(groupInfo.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Creator Info */}
          <div className="bg-base-100 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <img
                src={groupInfo.createdBy?.profilePic || "/avatar.png"}
                alt={groupInfo.createdBy?.fullName}
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{groupInfo.createdBy?.fullName}</span>
                  <Crown className="w-4 h-4 text-yellow-500" />
                </div>
                <span className="text-sm text-base-content/70">Group Creator</span>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          {token ? (
            <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-success mb-1">Secure Invite Link</h4>
                  <p className="text-sm text-base-content/70 mb-3">
                    This is a cryptographically secure invitation with token-based authentication.
                    Your privacy and security are protected with end-to-end encryption.
                  </p>
                  <div className="flex items-center gap-4 text-xs text-base-content/60">
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      <span>Token Verified</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Encrypted</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Time-Limited</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-error/10 border border-error/20 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-error mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-error mb-1">Invalid Invite Link</h4>
                  <p className="text-sm text-base-content/70">
                    This invite link is missing security information, corrupted, or may have expired.
                    Please check the URL or ask for a new invite link.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {alreadyMember ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-success mb-4">
                  <CheckCircle className="w-5 h-5" />
                  <span>You're already a member of this group</span>
                </div>
                <button
                  onClick={handleGoToGroup}
                  className="btn btn-primary btn-lg w-full"
                >
                  Go to Group Chat
                </button>
              </div>
            ) : (
              <button
                onClick={handleJoinGroup}
                disabled={joining || !authUser || !token}
                className="btn btn-primary btn-lg w-full"
              >
                {joining ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5" />
                    {!token ? "Invalid Invite Link" : "Join the Group"}
                  </>
                )}
              </button>
            )}

            {!authUser && (
              <p className="text-center text-sm text-base-content/60">
                You need to login to join this group
              </p>
            )}

            <button
              onClick={() => navigate("/")}
              className="btn btn-outline w-full"
            >
              Go to LynqIt
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default JoinGroupPage;
