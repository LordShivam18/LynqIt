import { useState, useEffect } from "react";
import { X, Copy, Download, Eye, EyeOff, Shield, Smartphone, Key } from "lucide-react";
import { use2FAStore } from "../store/use2FAStore";
import toast from "react-hot-toast";

const TwoFASetupModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1); // 1: Setup, 2: Verify, 3: Backup codes
  const [verificationCode, setVerificationCode] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);

  const {
    qrCode,
    secret,
    isSetupLoading,
    isVerifying,
    generate2FASetup,
    enable2FA,
    resetSetupState
  } = use2FAStore();

  useEffect(() => {
    if (isOpen && step === 1) {
      generate2FASetup();
    }
  }, [isOpen, step, generate2FASetup]);

  // Copy secret to clipboard
  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      toast.success("Secret copied to clipboard!");
    }
  };

  // Handle verification
  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    try {
      const codes = await enable2FA(verificationCode);
      setBackupCodes(codes);
      setStep(3);
    } catch (error) {
      // Error is handled in the store
    }
  };

  // Download backup codes
  const downloadBackupCodes = () => {
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

  // Handle modal close
  const handleClose = () => {
    setStep(1);
    setVerificationCode("");
    setShowSecret(false);
    setBackupCodes([]);
    resetSetupState();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div className="flex items-center space-x-2">
            <Shield className="text-primary" size={20} />
            <h2 className="text-lg font-semibold">
              {step === 1 && "Set up 2FA"}
              {step === 2 && "Verify Setup"}
              {step === 3 && "Backup Codes"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-circle"
            disabled={isSetupLoading || isVerifying}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {step === 1 && (
            // Step 1: QR Code Setup
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <Smartphone className="mx-auto text-primary" size={48} />
                <h3 className="text-lg font-medium">Scan QR Code</h3>
                <p className="text-sm text-base-content/70">
                  Use your authenticator app to scan this QR code
                </p>
              </div>

              {isSetupLoading ? (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner loading-lg"></span>
                </div>
              ) : qrCode ? (
                <div className="space-y-4">
                  {/* QR Code */}
                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-lg">
                      <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                    </div>
                  </div>

                  {/* Manual Entry */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Can't scan? Enter this code manually:</p>
                    <div className="flex items-center space-x-2">
                      <input
                        type={showSecret ? "text" : "password"}
                        value={secret || ""}
                        readOnly
                        className="input input-bordered flex-1 font-mono text-sm"
                      />
                      <button
                        onClick={() => setShowSecret(!showSecret)}
                        className="btn btn-ghost btn-sm"
                      >
                        {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        onClick={copySecret}
                        className="btn btn-ghost btn-sm"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-base-200 p-3 rounded-lg">
                    <h4 className="font-medium mb-2">Instructions:</h4>
                    <ol className="text-sm space-y-1 list-decimal list-inside text-base-content/70">
                      <li>Install an authenticator app (Google Authenticator, Authy, etc.)</li>
                      <li>Scan the QR code or enter the secret manually</li>
                      <li>Enter the 6-digit code from your app to verify</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-error">
                  Failed to generate QR code. Please try again.
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            // Step 2: Verification
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <Key className="mx-auto text-primary" size={48} />
                <h3 className="text-lg font-medium">Enter Verification Code</h3>
                <p className="text-sm text-base-content/70">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div className="form-control">
                <input
                  type="text"
                  placeholder="000000"
                  className="input input-bordered text-center text-2xl font-mono tracking-widest"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                />
              </div>

              <div className="bg-info/10 p-3 rounded-lg">
                <p className="text-sm text-info">
                  💡 The code changes every 30 seconds. Make sure to enter the current code.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            // Step 3: Backup Codes
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <Shield className="mx-auto text-success" size={48} />
                <h3 className="text-lg font-medium text-success">2FA Enabled Successfully!</h3>
                <p className="text-sm text-base-content/70">
                  Save these backup codes in a safe place
                </p>
              </div>

              <div className="bg-warning/10 border border-warning/20 p-3 rounded-lg">
                <p className="text-sm text-warning font-medium mb-2">⚠️ Important:</p>
                <ul className="text-sm text-warning/80 space-y-1 list-disc list-inside">
                  <li>Each code can only be used once</li>
                  <li>Use these if you lose access to your authenticator app</li>
                  <li>Keep them safe and secure</li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Backup Codes:</p>
                  <button
                    onClick={downloadBackupCodes}
                    className="btn btn-ghost btn-sm"
                  >
                    <Download size={16} />
                    Download
                  </button>
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
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-base-300">
          {step === 1 && (
            <>
              <button
                onClick={handleClose}
                className="btn btn-ghost"
                disabled={isSetupLoading}
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                className="btn btn-primary"
                disabled={isSetupLoading || !qrCode}
              >
                Next
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                onClick={() => setStep(1)}
                className="btn btn-ghost"
                disabled={isVerifying}
              >
                Back
              </button>
              <button
                onClick={handleVerify}
                className="btn btn-primary"
                disabled={isVerifying || verificationCode.length !== 6}
              >
                {isVerifying ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Verifying...
                  </>
                ) : (
                  "Verify & Enable"
                )}
              </button>
            </>
          )}

          {step === 3 && (
            <button
              onClick={handleClose}
              className="btn btn-primary w-full"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoFASetupModal;
