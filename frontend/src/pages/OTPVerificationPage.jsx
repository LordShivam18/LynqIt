import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import OTPInput from '../components/OTPInput';
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full">
            <Mail size={32} className="text-blue-600" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-2">Verify Your Email</h2>
        <p className="text-gray-600 text-center mb-6">
          We've sent a verification code to <span className="font-medium">{userData?.email}</span>
        </p>

        <OTPInput length={6} onComplete={handleOTPComplete} />

        <div className="mt-6">
          <button
            onClick={() => {}}
            disabled={isVerifying}
            className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-400"
          >
            {isVerifying ? 'Verifying...' : 'Verify Email'}
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-gray-600 text-sm">
            Didn't receive the code?{' '}
            {canResend ? (
              <button
                onClick={handleResendOTP}
                disabled={isResending}
                className="text-blue-600 font-medium hover:underline disabled:text-blue-400"
              >
                {isResending ? 'Resending...' : 'Resend Code'}
              </button>
            ) : (
              <span className="text-gray-500">
                Resend in {countdown}s
              </span>
            )}
          </p>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/signup')}
            className="text-gray-600 hover:text-gray-800 text-sm"
          >
            Back to Sign Up
          </button>
        </div>
      </div>
    </div>
  );
};

export default OTPVerificationPage;
