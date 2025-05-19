import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AuthImagePattern from '../components/AuthImagePattern';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
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

        // If the response includes the email, it means the account exists
        // and we can navigate to the reset page
        if (response.data.email) {
          toast.success('Password reset code sent successfully');
          setTimeout(() => {
            navigate('/reset-password', { state: { email } });
          }, 2000);
        } else {
          // If no email in response, explicitly tell the user that the account doesn't exist
          setIsSuccess(false);
          toast.error(`No account found with email: ${email}`);
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
              Enter your email address and we'll send you a verification code to reset your password
            </p>
          </div>

          {isSuccess ? (
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
