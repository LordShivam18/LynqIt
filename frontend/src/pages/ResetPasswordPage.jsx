import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import OTPInput from '../components/OTPInput';
import AuthImagePattern from '../components/AuthImagePattern';
import axios from 'axios';
import { Mail, Loader2, ArrowLeft, Eye, EyeOff, Lock, Check, X, Info } from 'lucide-react';
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(true);
  const [emailExists, setEmailExists] = useState(true);

  // Get email from location state
  const email = location.state?.email;
  const verifiedWith2FA = location.state?.verifiedWith2FA;
  const [otpVerified, setOtpVerified] = useState(verifiedWith2FA || false);
  const [otp, setOtp] = useState('');

  // Password validation criteria
  const [passwordStrength, setPasswordStrength] = useState({
    criteria: [
      { id: 1, text: 'At least 8 characters', regex: /.{8,}/, valid: false },
      { id: 2, text: 'At least one uppercase letter', regex: /[A-Z]/, valid: false },
      { id: 3, text: 'At least one lowercase letter', regex: /[a-z]/, valid: false },
      { id: 4, text: 'At least one number', regex: /[0-9]/, valid: false },
      { id: 5, text: 'At least one special character', regex: /[!@#$%^&*()_+]/, valid: false }
    ],
    showCriteria: false
  });

  // Check if email exists in the database without sending an OTP
  const checkEmailExists = async (emailToCheck) => {
    try {
      setIsCheckingEmail(true);

      // Use our new endpoint that checks email existence without sending OTP
      const response = await axios.post('/api/auth/check-email', { email: emailToCheck });

      // If we get a successful response, the email exists
      if (response.status === 200) {
        setEmailExists(true);
      }
    } catch (error) {
      console.error('Email check error:', error);
      setEmailExists(false);

      // Show a more specific error message if possible
      if (error.response?.status === 404) {
        toast.error(`No account found with email: ${emailToCheck}`);
      } else {
        toast.error("Something went wrong. Please try again later.");
      }

      // Redirect back to forgot password page
      setTimeout(() => {
        navigate('/forgot-password');
      }, 2000);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  useEffect(() => {
    // If no email is provided, redirect to forgot password
    if (!email) {
      navigate('/forgot-password');
      return;
    }

    // If already verified with 2FA, skip OTP verification
    if (verifiedWith2FA) {
      setOtpVerified(true);
    }

    // Check if the email exists in the database
    checkEmailExists(email);

    // Start countdown for resend button
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [email, navigate, verifiedWith2FA]);

  // Update password validation whenever password changes
  useEffect(() => {
    const updatedCriteria = passwordStrength.criteria.map(criteria => ({
      ...criteria,
      valid: criteria.regex.test(password)
    }));

    setPasswordStrength({
      criteria: updatedCriteria,
      showCriteria: password.length > 0
    });
  }, [password]);

  const handleOTPComplete = async (code) => {
    setOtp(code);
    
    if (code.length !== 6) return;
    
    try {
      setIsVerifying(true);
      
      // Skip OTP verification if already verified with 2FA
      if (!verifiedWith2FA) {
        // Check OTP validity using the verifyOTP function or just set it
        // We'll validate the OTP when we submit the password reset request
        setOtpVerified(true);
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    // Check if password is valid
    const isPasswordValid = passwordStrength.criteria.every(c => c.valid);
    if (!isPasswordValid) {
      toast.error('Please ensure your password meets all requirements');
      return;
    }

    try {
      setIsVerifying(true);

      const payload = verifiedWith2FA 
        ? { email, newPassword: password, skipOtp: true }
        : { email, otp, newPassword: password };
      
      const response = await axios.post('/api/auth/reset-password', payload);

      toast.success('Password reset successfully!');
      setIsSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setIsResending(true);

      const response = await axios.post('/api/auth/forgot-password', {
        email
      });

      // Check if the response includes the email (meaning the account exists)
      if (response.data.email) {
        toast.success('Verification code resent successfully');

        // Reset countdown
        setCountdown(60);
        setCanResend(false);

        // Start countdown again
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              setCanResend(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        // If no email in response, the account doesn't exist
        // Explicitly tell the user that the email doesn't exist
        toast.error(`No account found with email: ${email}`);

        // Redirect back to forgot password page after a short delay
        setTimeout(() => {
          navigate('/forgot-password');
        }, 2000);
      }
    } catch (error) {
      console.error('Resend OTP error:', error);

      // If there's a specific error about the user not existing, be explicit
      if (error.response?.status === 404) {
        toast.error(`Email not found: ${email}`);
        setTimeout(() => {
          navigate('/forgot-password');
        }, 2000);
      } else {
        toast.error('Failed to resend verification code');
      }
    } finally {
      setIsResending(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="h-screen grid lg:grid-cols-2">
        {/* Left Side - Success Message */}
        <div className="flex flex-col justify-center items-center p-6 sm:p-12">
          <div className="w-full max-w-md text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-success/20 p-4 rounded-full">
                <Check size={32} className="text-success" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Password Reset Successful</h2>
            <p className="text-base-content/70 mb-6">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <Link to="/login" className="btn btn-primary w-full">
              Go to Login
            </Link>
          </div>
        </div>

        {/* Right Side - Image/Pattern */}
        <AuthImagePattern
          title="Success!"
          subtitle="Your password has been reset. You can now log in with your new credentials."
        />
      </div>
    );
  }

  // Show loading state while checking email
  if (isCheckingEmail) {
    return (
      <div className="h-screen grid lg:grid-cols-2">
        {/* Left Side - Loading */}
        <div className="flex flex-col justify-center items-center p-6 sm:p-12">
          <div className="w-full max-w-md text-center">
            <div className="flex justify-center mb-6">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
            <h2 className="text-xl font-semibold mb-2">Verifying Your Request</h2>
            <p className="text-base-content/70">
              Please wait while we process your request...
            </p>
          </div>
        </div>

        {/* Right Side - Image/Pattern */}
        <AuthImagePattern
          title="Reset your password"
          subtitle="We'll help you get back into your account safely and securely."
        />
      </div>
    );
  }

  return (
    <div className="h-screen grid lg:grid-cols-2">
      {/* Left Side - Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Back button */}
          <Link to="/forgot-password" className="flex items-center text-base-content/70 hover:text-primary mb-6">
            <ArrowLeft className="size-4 mr-2" />
            Back to Forgot Password
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">
              {otpVerified ? 'Set New Password' : 'Verify Your Identity'}
            </h1>
            <p className="text-base-content/60 mt-2">
              {otpVerified
                ? 'Create a strong password to secure your account'
                : `We sent a verification code to ${email}`}
            </p>
          </div>

          {otpVerified ? (
            // Password reset form
            <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="form-control mb-6">
            <label className="label pb-1">
              <span className="label-text font-medium">New Password<span className="text-error">*</span></span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="size-5 text-base-content/40" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                className="input input-bordered w-full pl-10 pr-10"
                placeholder="Create a new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="size-5 text-base-content/40" />
                ) : (
                  <Eye className="size-5 text-base-content/40" />
                )}
              </button>
            </div>

            {/* Password strength criteria */}
            {passwordStrength.showCriteria && (
                  <PasswordStrengthMeter 
                    password={password}
                    criteria={passwordStrength.criteria}
                  />
                    )}
              </div>

          <div className="mt-6">
            <button
                  type="submit"
              disabled={isVerifying || !passwordStrength.criteria.every(c => c.valid)}
              className="btn btn-primary w-full"
            >
              {isVerifying ? (
                <>
                  <span className="loading loading-spinner loading-sm mr-2"></span>
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </div>
            </form>
          ) : (
            // OTP verification form
            <div className="space-y-6">
              <OTPInput length={6} onComplete={handleOTPComplete} />

          <div className="mt-4 text-center">
            <p className="text-base-content/60 text-sm">
              Didn't receive the code?{' '}
              {canResend ? (
                <button
                  onClick={handleResendOTP}
                  disabled={isResending}
                  className="link link-primary"
                >
                  {isResending ? 'Resending...' : 'Resend Code'}
                </button>
              ) : (
                <span className="text-base-content/40">
                  Resend in {countdown}s
                </span>
              )}
            </p>
          </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Image/Pattern */}
      <AuthImagePattern
        title={otpVerified ? 'Create New Password' : 'Verify Your Identity'}
        subtitle={otpVerified
          ? 'Choose a strong password to keep your account secure'
          : 'Enter the verification code sent to your email'}
      />
    </div>
  );
};

export default ResetPasswordPage;
