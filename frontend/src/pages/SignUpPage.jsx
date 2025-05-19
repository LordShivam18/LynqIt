import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Eye, EyeOff, Loader2, Lock, Mail, MessageSquare, User, Check, X, Info } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import GoogleUsernamePrompt from "../components/GoogleUsernamePrompt";
import axios from "axios";

import AuthImagePattern from "../components/AuthImagePattern";
import toast from "react-hot-toast";

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    username: "",
    password: "",
  });

  // Password validation criteria
  const passwordCriteria = [
    { id: 'length', label: 'At least 8 characters', regex: /.{8,}/ },
    { id: 'uppercase', label: 'At least one uppercase letter', regex: /[A-Z]/ },
    { id: 'lowercase', label: 'At least one lowercase letter', regex: /[a-z]/ },
    { id: 'number', label: 'At least one number', regex: /[0-9]/ },
    { id: 'special', label: 'At least one special character', regex: /[!@#$%^&*()_+]/ }
  ];

  const [passwordStrength, setPasswordStrength] = useState({
    criteria: passwordCriteria.map(c => ({ ...c, valid: false })),
    showCriteria: false
  });

  const navigate = useNavigate();
  const { signup, isSigningUp, loginWithGoogle, googleAuthInfo } = useAuthStore();

  // Update password validation whenever password changes
  useEffect(() => {
    const updatedCriteria = passwordCriteria.map(criteria => ({
      ...criteria,
      valid: criteria.regex.test(formData.password)
    }));

    setPasswordStrength({
      criteria: updatedCriteria,
      showCriteria: formData.password.length > 0
    });
  }, [formData.password]);

  const validateForm = () => {
    if (!formData.fullName.trim()) return toast.error("Full name is required");
    if (!formData.email.trim()) return toast.error("Email is required");
    if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error("Invalid email format");

    // Check if the email is from Gmail or Outlook
    const validDomains = ['gmail.com', 'outlook.com', 'hotmail.com'];
    const emailDomain = formData.email.split('@')[1]?.toLowerCase();
    if (!emailDomain || !validDomains.includes(emailDomain)) {
      return toast.error("Only Gmail and Outlook email addresses are allowed");
    }

    if (!formData.username.trim()) return toast.error("Username is required");
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(formData.username)) {
      return toast.error("Username can only include letters, numbers, and characters like . and _");
    }
    if (formData.username.length > 25) {
      return toast.error("Username must not exceed 25 characters");
    }
    if (!formData.password) return toast.error("Password is required");

    // Check all password criteria
    const allCriteriaValid = passwordStrength.criteria.every(c => c.valid);
    if (!allCriteriaValid) {
      return toast.error("Password doesn't meet all requirements");
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const success = validateForm();

    if (success === true) {
      try {
        // Instead of directly signing up, request OTP first
        const response = await axios.post('/api/auth/request-otp', formData);

        // If OTP is sent successfully, navigate to OTP verification page
        if (response.status === 200) {
          toast.success('Verification code sent to your email');
          // Navigate to OTP verification page with user data
          navigate('/verify-otp', { state: { userData: formData } });
        }
      } catch (error) {
        console.error('Request OTP error:', error);

        // Handle specific error types
        const errorType = error.response?.data?.error;
        const errorMessage = error.response?.data?.message || 'Failed to send verification code';

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
      }
    }
  };

  const handleGoogleSignup = async (credentialResponse) => {
    const result = await loginWithGoogle(credentialResponse.credential);
    // If successful login, navigate to homepage
    if (result.success) {
      navigate('/');
    }
    // If username is needed, the modal will show automatically
    // No need to navigate - user will stay on current page until they create a username
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Header with App Logo */}
          <div className="flex items-center mb-5 justify-center">
            <MessageSquare className="size-6 text-primary mr-2" />
            <div>
              <h1 className="text-xl font-semibold">Create Account</h1>
              <p className="text-xs text-base-content/60">Get started with your free account</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-5">
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text font-medium">Full Name<span className="text-error">*</span></span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="size-5 text-base-content/40" />
                </div>
                <input
                  type="text"
                  className={`input input-bordered input-sm w-full pl-10 ${!formData.fullName && 'input-error'}`}
                  placeholder="Elon Musk"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>
            </div>

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
                  className={`input input-bordered input-sm w-full pl-10 ${!formData.email && 'input-error'}`}
                  placeholder="you@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

            </div>

            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text font-medium">Username<span className="text-error">*</span></span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="size-5 text-base-content/40" />
                </div>
                <input
                  type="text"
                  className={`input input-bordered input-sm w-full pl-10 ${!formData.username && 'input-error'}`}
                  placeholder="elon.musk"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  maxLength={25}
                  required
                />
              </div>
              <div className="mt-1 text-xs flex items-center gap-1 text-base-content/60">
                <Info className="size-3" />
                Username can only include letters, numbers, and characters like . and _
              </div>
            </div>

            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text font-medium">Password<span className="text-error">*</span></span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="size-5 text-base-content/40" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`input input-bordered input-sm w-full pl-10 ${!formData.password && 'input-error'}`}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

              {/* Password Requirements Checklist */}
              {passwordStrength.showCriteria && (
                <div className="mt-2 bg-base-200 p-3 rounded-lg border">
                  <p className="text-sm font-medium mb-2">Password Requirements:</p>
                  <ul className="space-y-1">
                    {passwordStrength.criteria.map(criteria => (
                      <li key={criteria.id} className="flex items-center gap-2 text-xs">
                        {criteria.valid ?
                          <Check size={14} className="text-green-500" /> :
                          <X size={14} className="text-red-500" />
                        }
                        {criteria.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full mt-2"
              disabled={isSigningUp || !passwordStrength.criteria.every(c => c.valid)}
            >
              {isSigningUp ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Loading...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="flex items-center my-4">
            <hr className="flex-1 border-base-300" />
            <span className="px-3 text-xs text-base-content/60">OR</span>
            <hr className="flex-1 border-base-300" />
          </div>

          {/* Google Sign Up Button */}
          <div className="flex justify-center">
            <div className="google-login-button" title="Sign up with Google">
              <GoogleLogin
                onSuccess={handleGoogleSignup}
                onError={() => {
                  toast.error('Google Sign Up Failed');
                }}
                useOneTap
                theme="outline"
                size="large"
                text="signup_with"
                shape="rectangular"
                logo_alignment="center"
                width="100%"
              />
            </div>
          </div>

          <div className="text-center mt-4">
            <p className="text-base-content/60">
              Already have an account?{" "}
              <Link to="/login" className="link link-primary">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <AuthImagePattern
        title="Join our community"
        subtitle="Connect with friends, share moments, and stay in touch with your loved ones."
      />

      {/* Username Prompt for Google Auth */}
      {googleAuthInfo && (
        <GoogleUsernamePrompt onComplete={() => navigate('/')} />
      )}
    </div>
  );
};

export default SignUpPage;

