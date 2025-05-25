import { useState, useEffect } from "react";
import { Shield, Key, Download, Eye, EyeOff, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { use2FAStore } from "../store/use2FAStore";
import { useAuthStore } from "../store/useAuthStore";
import TwoFASetupModal from "./TwoFASetupModal";
import toast from "react-hot-toast";

const SecuritySettings = () => {
  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disable2FACode, setDisable2FACode] = useState("");
  const [regeneratePassword, setRegeneratePassword] = useState("");
  const [showPasswords, setShowPasswords] = useState({
    disable: false,
    regenerate: false
  });

  const {
    is2FAEnabled,
    backupCodesRemaining,
    get2FAStatus,
    disable2FA,
    regenerateBackupCodes,
    isLoading,
    isVerifying,
    backupCodes
  } = use2FAStore();

  const { authUser } = useAuthStore();

  useEffect(() => {
    get2FAStatus();
  }, [get2FAStatus]);

  // Handle 2FA disable
  const handleDisable2FA = async () => {
    if (!disablePassword || !disable2FACode) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await disable2FA(disable2FACode, disablePassword);
      setShowDisable2FAModal(false);
      setDisablePassword("");
      setDisable2FACode("");
    } catch (error) {
      // Error is handled in the store
    }
  };

  // Handle backup codes regeneration
  const handleRegenerateBackupCodes = async () => {
    if (!regeneratePassword) {
      toast.error("Please enter your password");
      return;
    }

    try {
      await regenerateBackupCodes(regeneratePassword);
      setShowBackupCodesModal(true);
      setRegeneratePassword("");
    } catch (error) {
      // Error is handled in the store
    }
  };

  // Download backup codes
  const downloadBackupCodes = () => {
    if (!backupCodes || backupCodes.length === 0) return;

    const content = `LynqIt Chat - 2FA Backup Codes\n\nGenerated on: ${new Date().toLocaleString()}\n\nBackup Codes:\n${backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}\n\nImportant:\n- Keep these codes safe and secure\n- Each code can only be used once\n- Use these codes if you lose access to your authenticator app\n- Generate new codes if you suspect they've been compromised`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lynqit-2fa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Backup codes downloaded!");
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="text-primary" size={24} />
        <h1 className="text-2xl font-bold">Security Settings</h1>
      </div>

      {/* Two-Factor Authentication Section */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Key className="text-primary" size={20} />
              <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
            </div>
            <div className={`badge ${is2FAEnabled ? 'badge-success' : 'badge-warning'}`}>
              {is2FAEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>

          <p className="text-base-content/70 mb-4">
            Add an extra layer of security to your account by requiring a code from your authenticator app when signing in.
          </p>

          {is2FAEnabled ? (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2 text-success">
                <CheckCircle size={16} />
                <span className="text-sm">Two-factor authentication is enabled</span>
              </div>

              {/* Backup codes info */}
              <div className="bg-base-200 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Backup Codes</span>
                  <span className="text-sm text-base-content/70">
                    {backupCodesRemaining} remaining
                  </span>
                </div>
                <p className="text-sm text-base-content/70 mb-3">
                  Backup codes can be used to access your account if you lose your authenticator device.
                </p>
                <button
                  onClick={() => setRegeneratePassword("")}
                  className="btn btn-outline btn-sm"
                  disabled={isLoading}
                >
                  <RefreshCw size={16} />
                  Regenerate Codes
                </button>
              </div>

              {/* Disable 2FA */}
              <div className="pt-4 border-t border-base-300">
                <button
                  onClick={() => setShowDisable2FAModal(true)}
                  className="btn btn-error btn-outline"
                  disabled={isLoading}
                >
                  Disable Two-Factor Authentication
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Warning */}
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle size={16} />
                <span className="text-sm">Your account is not protected by two-factor authentication</span>
              </div>

              {/* Enable 2FA */}
              <button
                onClick={() => setShowSetupModal(true)}
                className="btn btn-primary"
                disabled={isLoading}
              >
                <Shield size={16} />
                Enable Two-Factor Authentication
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Account Security Section */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="text-lg font-semibold mb-4">Account Security</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
              <div>
                <div className="font-medium">Email</div>
                <div className="text-sm text-base-content/70">{authUser?.email}</div>
              </div>
              <div className="badge badge-success">Verified</div>
            </div>

            <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
              <div>
                <div className="font-medium">Password</div>
                <div className="text-sm text-base-content/70">Last changed recently</div>
              </div>
              <button className="btn btn-outline btn-sm">
                Change Password
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      <TwoFASetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
      />

      {/* Disable 2FA Modal */}
      {showDisable2FAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-base-300">
              <h3 className="text-lg font-semibold">Disable Two-Factor Authentication</h3>
              <button
                onClick={() => setShowDisable2FAModal(false)}
                className="btn btn-ghost btn-sm btn-circle"
                disabled={isVerifying}
              >
                ×
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="bg-warning/10 p-3 rounded-lg">
                <p className="text-sm text-warning">
                  ⚠️ Disabling 2FA will make your account less secure. Are you sure you want to continue?
                </p>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Current Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.disable ? "text" : "password"}
                    placeholder="Enter your password"
                    className="input input-bordered w-full pr-10"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, disable: !prev.disable }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPasswords.disable ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">2FA Code or Backup Code</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter 6-digit code or backup code"
                  className="input input-bordered"
                  value={disable2FACode}
                  onChange={(e) => setDisable2FACode(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-base-300">
              <button
                onClick={() => setShowDisable2FAModal(false)}
                className="btn btn-ghost"
                disabled={isVerifying}
              >
                Cancel
              </button>
              <button
                onClick={handleDisable2FA}
                className="btn btn-error"
                disabled={isVerifying || !disablePassword || !disable2FACode}
              >
                {isVerifying ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Disabling...
                  </>
                ) : (
                  "Disable 2FA"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Codes Modal */}
      {showBackupCodesModal && backupCodes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-base-300">
              <h3 className="text-lg font-semibold">New Backup Codes</h3>
              <button
                onClick={() => setShowBackupCodesModal(false)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                ×
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="bg-warning/10 p-3 rounded-lg">
                <p className="text-sm text-warning">
                  ⚠️ Save these codes in a safe place. Your old backup codes are no longer valid.
                </p>
              </div>

              <div className="bg-base-200 p-3 rounded-lg">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="p-2 bg-base-100 rounded text-center">
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={downloadBackupCodes}
                className="btn btn-primary w-full"
              >
                <Download size={16} />
                Download Codes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecuritySettings;
