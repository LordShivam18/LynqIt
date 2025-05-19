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
      toast.error(error.response?.data?.message || 'Failed to verify OTP');
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
      
      toast.success('OTP resent successfully');
      
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
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
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
