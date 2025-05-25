import { useState } from "react";
import { X, Shield, Key, AlertCircle } from "lucide-react";
import { use2FAStore } from "../store/use2FAStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const TwoFAVerificationModal = ({ isOpen, onClose, email, onSuccess }) => {
  const [verificationCode, setVerificationCode] = useState("");
  const [isBackupCode, setIsBackupCode] = useState(false);

  const { verify2FA, isVerifying } = use2FAStore();
  const { generateToken } = useAuthStore();

  // Handle verification
  const handleVerify = async () => {
    if (!verificationCode || (!isBackupCode && verificationCode.length !== 6)) {
      toast.error(isBackupCode ? "Please enter a valid backup code" : "Please enter a valid 6-digit code");
      return;
    }

    try {
      const result = await verify2FA(email, verificationCode);
      
      // Generate token and complete login
      generateToken(result.user._id);
      
      // Call success callback
      if (onSuccess) {
        onSuccess(result.user);
      }
      
      handleClose();
    } catch (error) {
      // Error is handled in the store
    }
  };

  // Handle modal close
  const handleClose = () => {
    setVerificationCode("");
    setIsBackupCode(false);
    onClose();
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div className="flex items-center space-x-2">
            <Shield className="text-primary" size={20} />
            <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
          </div>
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-circle"
            disabled={isVerifying}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-center space-y-2">
            <Key className="mx-auto text-primary" size={48} />
            <h3 className="text-lg font-medium">
              {isBackupCode ? "Enter Backup Code" : "Enter Authentication Code"}
            </h3>
            <p className="text-sm text-base-content/70">
              {isBackupCode 
                ? "Enter one of your backup codes to complete login"
                : "Enter the 6-digit code from your authenticator app"
              }
            </p>
          </div>

          <div className="form-control">
            <input
              type="text"
              placeholder={isBackupCode ? "Backup code" : "000000"}
              className="input input-bordered text-center text-2xl font-mono tracking-widest"
              value={verificationCode}
              onChange={(e) => {
                const value = isBackupCode 
                  ? e.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 8)
                  : e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(value);
              }}
              onKeyPress={handleKeyPress}
              maxLength={isBackupCode ? 8 : 6}
              disabled={isVerifying}
              autoFocus
            />
          </div>

          {/* Toggle between code types */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsBackupCode(!isBackupCode);
                setVerificationCode("");
              }}
              className="btn btn-ghost btn-sm"
              disabled={isVerifying}
            >
              {isBackupCode 
                ? "Use authenticator code instead" 
                : "Use backup code instead"
              }
            </button>
          </div>

          {/* Info box */}
          <div className="bg-info/10 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-info mt-0.5" size={16} />
              <div className="text-sm text-info">
                {isBackupCode ? (
                  <>
                    <p className="font-medium mb-1">Using backup codes:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Each backup code can only be used once</li>
                      <li>Backup codes are 8 characters long</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="font-medium mb-1">Using authenticator app:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>The code changes every 30 seconds</li>
                      <li>Make sure to enter the current code</li>
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-base-300">
          <button
            onClick={handleClose}
            className="btn btn-ghost"
            disabled={isVerifying}
          >
            Cancel
          </button>
          <button
            onClick={handleVerify}
            className="btn btn-primary"
            disabled={
              isVerifying || 
              !verificationCode || 
              (!isBackupCode && verificationCode.length !== 6) ||
              (isBackupCode && verificationCode.length !== 8)
            }
          >
            {isVerifying ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Verifying...
              </>
            ) : (
              "Verify & Login"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TwoFAVerificationModal;
