import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { User, Info, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const GoogleUsernamePrompt = ({ onComplete }) => {
  const [username, setUsername] = useState("");
  const { completeGoogleSignup, googleAuthInfo, isSigningUp } = useAuthStore();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate username
    if (!username.trim()) {
      return toast.error("Username is required");
    }
    
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(username)) {
      return toast.error("Username can only include letters, numbers, and characters like . and _");
    }
    
    const success = await completeGoogleSignup(username);
    if (success && onComplete) {
      onComplete();
    }
  };
  
  if (!googleAuthInfo) return null;
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-xl max-w-md w-full p-6 shadow-xl">
        <div className="text-center mb-6">
          <div className="flex flex-col items-center gap-2">
            {googleAuthInfo.picture && (
              <img 
                src={googleAuthInfo.picture} 
                alt="Profile" 
                className="w-16 h-16 rounded-full border-4 border-primary/20"
              />
            )}
            <h2 className="text-xl font-bold">Almost there!</h2>
            <p className="text-base-content/70 text-sm">
              We just need a username to complete your signup
            </p>
          </div>
        </div>
        
        <div className="bg-base-200 rounded-lg p-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="bg-base-100 p-2 rounded-full">
              <User size={18} />
            </div>
            <div>
              <p className="font-medium">{googleAuthInfo.name}</p>
              <p className="text-xs text-base-content/70">{googleAuthInfo.email}</p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label pb-1">
              <span className="label-text font-medium">Choose a Username<span className="text-error">*</span></span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="size-5 text-base-content/40" />
              </div>
              <input
                type="text"
                className="input input-bordered w-full pl-10"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="mt-1 text-xs flex items-center gap-1 text-base-content/60">
              <Info className="size-3" />
              Username can only include letters, numbers, and characters like . and _
            </div>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary w-full" 
            disabled={isSigningUp}
          >
            {isSigningUp ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Setting up your account...
              </>
            ) : (
              "Complete Signup"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GoogleUsernamePrompt; 