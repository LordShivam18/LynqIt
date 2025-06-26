import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import AuthImagePattern from "../components/AuthImagePattern";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, MessageSquare } from "lucide-react";
import GoogleButton from "../components/GoogleButton";
import GoogleUsernamePrompt from "../components/GoogleUsernamePrompt";
import toast from "react-hot-toast";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const navigate = useNavigate();
  const { login, isLoggingIn, loginWithGoogle, googleAuthInfo } = useAuthStore();

  // FACE LOGIN STATE
  const videoRef = useRef(null);
  const [faceStatus, setFaceStatus] = useState('Loading models...');
  const [faceLoading, setFaceLoading] = useState(false);

  // Load Face API models + camera
  useEffect(() => {
    const loadModelsAndStartCamera = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        setFaceStatus('Models loaded. Starting camera...');
        startCamera();
      } catch (err) {
        console.error('Error loading models:', err);
        setFaceStatus('Failed to load face-api models.');
      }
    };

    loadModelsAndStartCamera();
  }, []);

  const startCamera = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        videoRef.current.srcObject = stream;
        setFaceStatus('Camera ready. Look into the camera to login.');
      })
      .catch(err => {
        console.error('Camera error:', err);
        setFaceStatus('Camera access denied.');
      });
  };

  const handleFaceLogin = async () => {
    setFaceLoading(true);
    setFaceStatus('Scanning face...');

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      setFaceStatus('No face detected. Try again.');
      setFaceLoading(false);
      return;
    }

    const embedding = Array.from(detection.descriptor);

    try {
      const res = await fetch('/api/auth/face-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embedding }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        setFaceStatus('Login successful!');
        navigate('/'); // or /chat
      } else {
        setFaceStatus('Face not recognized.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setFaceStatus('Server error during login.');
    }

    setFaceLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validDomains = ['gmail.com', 'outlook.com', 'hotmail.com'];
    const emailDomain = formData.email.split('@')[1]?.toLowerCase();

    if (!emailDomain || !validDomains.includes(emailDomain)) {
      toast.error("Only Gmail and Outlook email addresses are allowed");
      return;
    }

    try {
      const result = await login(formData);
      if (result?.success) navigate('/');
    } catch (error) {}
  };

  const handleGoogleLogin = async (result) => {
    if (result?.success) navigate('/');
  };

  const handleGoogleError = (error) => {
    console.error('Google login error:', error);
    toast.error('Google login failed. Please try again.');
  };

  return (
    <div className="h-screen grid lg:grid-cols-2">
      {/* Left Side - Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="flex items-center mb-5 justify-center">
            <MessageSquare className="size-6 text-primary mr-2" />
            <div>
              <h1 className="text-xl font-semibold">Welcome Back</h1>
              <p className="text-xs text-base-content/60">Sign in to your account</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-5">
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text font-medium">Email<span className="text-error">*</span></span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-base-content/40" />
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
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-base-content/40" />
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
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full mt-2" disabled={isLoggingIn}>
              {isLoggingIn ? <><Loader2 className="size-5 animate-spin" /> Loading...</> : "Sign in"}
            </button>
          </form>

          <div className="flex items-center my-4">
            <hr className="flex-1 border-base-300" />
            <span className="px-3 text-xs text-base-content/60">OR</span>
            <hr className="flex-1 border-base-300" />
          </div>

          <div className="flex justify-center">
            <GoogleButton
              text="Continue with Google"
              onSuccess={handleGoogleLogin}
              onError={handleGoogleError}
              disabled={isLoggingIn}
            />
          </div>

          <div className="text-center mt-4">
            <p className="text-base-content/60">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="link link-primary">
                Create account
              </Link>
            </p>
          </div>

          {/* Face Login Section */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2 text-center">Face Login</h2>
            <p className="text-xs text-gray-500 text-center mb-2">{faceStatus}</p>
            <video
              ref={videoRef}
              autoPlay
              muted
              width="320"
              height="240"
              className="mx-auto border rounded mb-3"
            />
            <button
              onClick={handleFaceLogin}
              disabled={faceLoading}
              className="btn btn-success w-full"
            >
              {faceLoading ? 'Authenticating...' : 'Login with Face'}
            </button>
          </div>
        </div>
      </div>

      {/* Right Side - Image/Pattern */}
      <AuthImagePattern
        title={"Welcome back!"}
        subtitle={"Sign in to continue your conversations and catch up with your messages."}
      />

      {googleAuthInfo && (
        <GoogleUsernamePrompt onComplete={() => navigate('/')} />
      )}
    </div>
  );
};

export default LoginPage;
// This code is a React component for a login page that includes email/password login, Google login, and face recognition login.