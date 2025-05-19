import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import OTPInput from '../components/OTPInput';
import AuthImagePattern from '../components/AuthImagePattern';
import axios from 'axios';
import { Mail } from 'lucide-react';

const OTPVerificationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Get user data from location state
  const userData = location.state?.userData;

  useEffect(() => {
    // If no userData is provided, redirect to signup
    if (!userData) {
      navigate('/signup');
      return;
    }

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
  }, [userData, navigate]);

  const handleOTPComplete = async (otp) => {
    if (otp.length !== 6) return;

    try {
      setIsVerifying(true);

      const response = await axios.post('/api/auth/verify-otp', {
        email: userData.email,
        otp,
        fullName: userData.fullName,
        username: userData.username,
        password: userData.password
      });

      // Save user data to local storage
      localStorage.setItem('userInfo', JSON.stringify(response.data));

      toast.success('Email verified successfully!');
      navigate('/');
    } catch (error) {
      console.error('OTP verification error:', error);

      // Handle specific error types
      const errorType = error.response?.data?.error;
      const errorMessage = error.response?.data?.message || 'Failed to verify OTP';

      if (errorType === 'email_service_error') {
        // Email service related errors
        toast.error(errorMessage, { duration: 5000 });
        toast.error('Account created but welcome email could not be sent. You can still proceed.', {
          duration: 5000,
          id: 'welcome-email-error'
        });

        // Try to navigate to home if the account was created despite email error
        try {
          navigate('/');
        } catch (navError) {
          console.error('Navigation error:', navError);
        }
      } else if (error.response?.status === 400 && errorMessage.includes('Invalid or expired OTP')) {
        // Invalid OTP
        toast.error('Invalid verification code. Please try again or request a new code.');
      } else if (error.response?.status === 400) {
        // Other validation errors
        toast.error(errorMessage);
      } else {
        // Generic server error
        toast.error('Server error. Please try again later.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setIsResending(true);

      await axios.post('/api/auth/resend-otp', {
        email: userData.email
      });

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
    } catch (error) {
      console.error('Resend OTP error:', error);

      // Handle specific error types
      const errorType = error.response?.data?.error;
      const errorMessage = error.response?.data?.message || 'Failed to resend verification code';

      if (errorType === 'email_service_error' ||
          errorType === 'email_auth_error' ||
          errorType === 'email_connection_error') {
        // Email service related errors
        toast.error(errorMessage, { duration: 5000 });

        // Show a more detailed error for email service issues
        if (errorType === 'email_service_error') {
          toast.error('Please try again later or use a different email address', {
            duration: 5000,
            id: 'email-service-suggestion'
          });
        }
      } else if (error.response?.status === 400) {
        // Validation errors (bad request)
        toast.error(errorMessage);
      } else {
        // Generic server error
        toast.error('Server error. Please try again later.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="h-screen grid lg:grid-cols-2">
      {/* Left Side - Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Header with App Logo */}
          <div className="flex items-center mb-5 justify-center">
            <Mail className="size-6 text-primary mr-2" />
            <div>
              <h1 className="text-xl font-semibold">Verify Your Email</h1>
              <p className="text-xs text-base-content/60">Enter the code sent to your email</p>
            </div>
          </div>

          <div className="text-center mb-6">
            <p className="text-base-content/70">
              We've sent a verification code to <span className="font-medium">{userData?.email}</span>
            </p>
          </div>

          <OTPInput length={6} onComplete={handleOTPComplete} />

          <div className="mt-6">
            <button
              onClick={() => {}}
              disabled={isVerifying}
              className="btn btn-primary w-full"
            >
              {isVerifying ? (
                <>
                  <span className="loading loading-spinner loading-sm mr-2"></span>
                  Verifying...
                </>
              ) : (
                'Verify Email'
              )}
            </button>
          </div>

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

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/signup')}
              className="link link-hover text-base-content/60 text-sm"
            >
              Back to Sign Up
            </button>
          </div>
        </div>
      </div>

      {/* Right Side - Image/Pattern */}
      <AuthImagePattern
        title="Verify your account"
        subtitle="One step away from joining LynqIt! Enter the verification code to complete your registration."
      />
    </div>
  );
};

export default OTPVerificationPage;
