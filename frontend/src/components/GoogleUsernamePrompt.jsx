import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { User, X, Loader2, Check, Info } from "lucide-react";
import toast from "react-hot-toast";

const GoogleUsernamePrompt = ({ onComplete }) => {
  const [username, setUsername] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState("");
  const { completeGoogleSignup, isSigningUp, googleAuthInfo } = useAuthStore();
  
  // When the modal opens, if we have a suggested username from the email, use it
  useEffect(() => {
    if (googleAuthInfo && googleAuthInfo.email) {
      // Try to generate a username from the email
      try {
        const emailPrefix = googleAuthInfo.email.split('@')[0];
        // Remove non-alphanumeric characters except . and _
        const cleanPrefix = emailPrefix.replace(/[^a-zA-Z0-9._]/g, "");
        // Use this as a starting point for the username
        setUsername(cleanPrefix);
        validateUsername(cleanPrefix);
      } catch (e) {
        // If any error occurs, just leave the username field blank
        console.error("Error generating username from email:", e);
      }
    }
  }, [googleAuthInfo]);
  
  const validateUsername = (value) => {
    // Username format check
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    
    if (!value) {
      setError("Username is required");
      setIsValid(false);
    } else if (!usernameRegex.test(value)) {
      setError("Username can only include letters, numbers, and characters like . and _");
      setIsValid(false);
    } else if (value.length > 25) {
      setError("Username must not exceed 25 characters");
      setIsValid(false);
    } else {
      setError("");
      setIsValid(true);
    }
  };
  
  const handleChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    validateUsername(value);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isValid) {
      toast.error("Please provide a valid username");
      return;
    }
    
    const success = await completeGoogleSignup(username);
    if (success) {
      onComplete?.();
    }
  };
  
  // If the component is rendered but no googleAuthInfo, don't show anything
  if (!googleAuthInfo) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-base-300 rounded-lg shadow-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Complete Your Sign Up</h2>
        </div>
        
        <div className="bg-success/10 text-success text-sm p-3 rounded-lg mb-4 flex items-start gap-2">
          <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Google account verified!</p>
            <p>Please choose a username to complete your registration</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-base-content/50" />
              </div>
              <input
                type="text"
                value={username}
                onChange={handleChange}
                className={`input input-bordered w-full pl-10 ${error ? 'input-error' : ''}`}
                placeholder="Choose a username"
                required
              />
            </div>
            {error ? (
              <div className="text-error text-xs flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                {error}
              </div>
            ) : (
              <p className="text-xs text-base-content/70">
                This will be your unique identifier on the platform.
              </p>
            )}
            
            <div className="text-xs text-base-content/70 flex items-center gap-1.5 mt-1">
              <Info className="w-3.5 h-3.5" />
              {googleAuthInfo.email && (
                <span>
                  Creating account with email: <span className="font-medium">{googleAuthInfo.email}</span>
                </span>
              )}
            </div>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary w-full"
            disabled={!isValid || isSigningUp}
          >
            {isSigningUp ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Creating Account...
              </>
            ) : (
              "Complete Sign Up"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GoogleUsernamePrompt; 