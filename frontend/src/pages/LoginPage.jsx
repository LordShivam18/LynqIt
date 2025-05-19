import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import AuthImagePattern from "../components/AuthImagePattern";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, MessageSquare } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import GoogleUsernamePrompt from "../components/GoogleUsernamePrompt";
import toast from "react-hot-toast";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();
  const { login, isLoggingIn, loginWithGoogle, googleAuthInfo } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if the email is from Gmail or Outlook
    const validDomains = ['gmail.com', 'outlook.com', 'hotmail.com'];
    const emailDomain = formData.email.split('@')[1]?.toLowerCase();

    if (!emailDomain || !validDomains.includes(emailDomain)) {
      toast.error("Only Gmail and Outlook email addresses are allowed");
      return;
    }

    login(formData);
  };

  const handleGoogleLogin = async (credentialResponse) => {
    const result = await loginWithGoogle(credentialResponse.credential);
    // If successful login, navigate to homepage
    if (result.success) {
      navigate('/');
    }
    // If username is needed (new user), the modal will show automatically
    // No need to navigate - user will stay on current page until they create a username
  };

  return (
    <div className="h-screen grid lg:grid-cols-2">
      {/* Left Side - Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Header with App Logo */}
          <div className="flex items-center mb-5 justify-center">
            <MessageSquare className="size-6 text-primary mr-2" />
            <div>
              <h1 className="text-xl font-semibold">Welcome Back</h1>
              <p className="text-xs text-base-content/60">Sign in to your account</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mt-5">
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
                  className={`input input-bordered w-full pl-10 ${!formData.email && 'input-error'}`}
                  placeholder="you@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text font-medium">Password<span className="text-error">*</span></span>
                <Link to="/forgot-password" className="label-text-alt link link-primary">
                  Forgot password?
                </Link>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="size-5 text-base-content/40" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`input input-bordered w-full pl-10 ${!formData.password && 'input-error'}`}
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
            </div>

            <button type="submit" className="btn btn-primary w-full mt-2" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Loading...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="flex items-center my-4">
            <hr className="flex-1 border-base-300" />
            <span className="px-3 text-xs text-base-content/60">OR</span>
            <hr className="flex-1 border-base-300" />
          </div>

          {/* Google Login Button */}
          <div className="flex justify-center">
            <div className="google-login-button" title="Sign in with Google">
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => {
                  console.error('Google Login Failed');
                }}
                useOneTap
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
                logo_alignment="center"
                width="100%"
              />
            </div>
          </div>

          <div className="text-center mt-4">
            <p className="text-base-content/60">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="link link-primary">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Image/Pattern */}
      <AuthImagePattern
        title={"Welcome back!"}
        subtitle={"Sign in to continue your conversations and catch up with your messages."}
      />

      {/* Username Prompt for Google Auth */}
      {googleAuthInfo && (
        <GoogleUsernamePrompt onComplete={() => navigate('/')} />
      )}
    </div>
  );
};
export default LoginPage;