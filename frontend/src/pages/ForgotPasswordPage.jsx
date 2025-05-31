import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft, Shield } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AuthImagePattern from '../components/AuthImagePattern';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [has2FA, setHas2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [show2FAInput, setShow2FAInput] = useState(false);
  const [useOTPInstead, setUseOTPInstead] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Email validation - only allow Gmail and Outlook emails
    const validDomains = ['gmail.com', 'outlook.com', 'hotmail.com'];
    const emailDomain = email.split('@')[1]?.toLowerCase();

    if (!emailDomain || !validDomains.includes(emailDomain)) {
      toast.error("Only Gmail and Outlook email addresses are allowed");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await axios.post('/api/auth/forgot-password', { email });

      if (response.status === 200) {
        setIsSuccess(true);

        // Check if user has 2FA enabled
        if (response.data.has2FA && !useOTPInstead) {
          setHas2FA(true);
          setShow2FAInput(true);
          toast.success('Please enter your 2FA verification code');
        } else {
          // If no 2FA or user chose OTP, navigate to reset page
          toast.success('Password reset code sent successfully');
          setTimeout(() => {
            navigate('/reset-password', { state: { email } });
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Forgot password error:', error);

      // If there's a specific error about the user not existing, be explicit
      if (error.response?.status === 404) {
        toast.error(`No account found with email: ${email}`);
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to process request';
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    
    if (!twoFACode || twoFACode.length < 6) {
      toast.error('Please enter a valid 2FA code');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Verify 2FA code
      const response = await axios.post('/api/2fa/verify', { 
        email, 
        token: twoFACode 
      });
      
      if (response.status === 200) {
        toast.success('2FA verification successful');
        navigate('/reset-password', { state: { email, verifiedWith2FA: true } });
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      toast.error(error.response?.data?.message || 'Invalid 2FA code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseOTPInstead = async () => {
    setUseOTPInstead(true);
    setShow2FAInput(false);
    
    // Re-submit the forgot password request to trigger OTP email
    try {
      setIsSubmitting(true);
      const response = await axios.post('/api/auth/forgot-password', { email });
      
      if (response.status === 200) {
        toast.success('Password reset code sent by email');
        setTimeout(() => {
          navigate('/reset-password', { state: { email } });
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast.error('Failed to send reset code');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen grid lg:grid-cols-2">
      {/* Left Side - Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Back button */}
          <Link to="/login" className="flex items-center text-base-content/70 hover:text-primary mb-6">
            <ArrowLeft className="size-4 mr-2" />
            Back to Login
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">Forgot Password</h1>
            <p className="text-base-content/60 mt-2">
              {show2FAInput 
                ? "Enter your authenticator app code to verify your identity" 
                : "Enter your email address and we'll send you a verification code to reset your password"}
            </p>
          </div>

          {isSuccess && !show2FAInput ? (
            <div className="text-center p-6 bg-success/10 rounded-lg">
              <div className="flex justify-center mb-4">
                <div className="bg-success/20 p-3 rounded-full">
                  <Mail size={24} className="text-success" />
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2">Check Your Email</h2>
              <p className="text-base-content/70">
                We've sent a password reset code to {email}.
              </p>
            </div>
          ) : show2FAInput ? (
            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium">2FA Code<span className="text-error">*</span></span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="size-5 text-base-content/40" />
                  </div>
                  <input
                    type="text"
                    className="input input-bordered w-full pl-10"
                    placeholder="Enter 6-digit code"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value)}
                    maxLength={6}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify 2FA Code'
                )}
              </button>
              
              <div className="text-center">
                <button 
                  type="button" 
                  onClick={handleUseOTPInstead}
                  className="btn btn-link btn-sm"
                >
                  Use email verification instead
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium">Email<span className="text-error">*</span></span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="size-5 text-base-content/40" />
                  </div>
                  <input
                    type="email"
                    className="input input-bordered w-full pl-10"
                    placeholder="you@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Code'
                )}
              </button>
            </form>
          )}

          <div className="text-center mt-6">
            <p className="text-base-content/60">
              Remember your password?{" "}
              <Link to="/login" className="link link-primary">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Image/Pattern */}
      <AuthImagePattern
        title="Reset your password"
        subtitle="We'll help you get back into your account safely and securely."
      />
    </div>
  );
};

export default ForgotPasswordPage;
