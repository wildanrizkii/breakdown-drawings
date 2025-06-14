"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff } from "react-icons/md";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const router = useRouter();

  // Load saved credentials on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("remembered_email");
    const savedRememberMe = localStorage.getItem("remember_me") === "true";

    if (savedEmail && savedRememberMe) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Save or clear credentials based on remember me setting
  const handleRememberMe = (email, remember) => {
    if (remember) {
      localStorage.setItem("remembered_email", email);
      localStorage.setItem("remember_me", "true");
    } else {
      localStorage.removeItem("remembered_email");
      localStorage.removeItem("remember_me");
    }
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError("");

      // Basic validation
      if (!email || !password) {
        const errorMessage = "Please fill in email and password!";
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      if (email.length < 4 || password.length < 4) {
        const errorMessage =
          "Email and password must be at least 4 characters!";
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        const errorMessage = "Invalid email format!";
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      // Configure session duration based on remember me
      const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days vs 1 day

      const response = await signIn("credentials", {
        email: email,
        password: password,
        maxAge: maxAge.toString(), // Kirim maxAge sebagai string
        redirect: false,
        callbackUrl: "/",
      });

      if (response?.error) {
        let errorMessage = "An error occurred during login!";

        switch (response.error) {
          case "CredentialsSignin":
            errorMessage = "The email or password you entered is incorrect!";
            break;
          case "Configuration":
            errorMessage = "System configuration error occurred!";
            break;
          case "AccessDenied":
            errorMessage = "Access denied! Contact administrator.";
            break;
          case "Verification":
            errorMessage = "Your email has not been verified!";
            break;
          default:
            if (response.error.includes("fetch")) {
              errorMessage = "Connection problem! Check your internet.";
            } else if (response.error.includes("timeout")) {
              errorMessage = "Connection timeout! Try again.";
            }
        }

        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);

        // Don't save credentials if login failed
        if (rememberMe) {
          handleRememberMe("", false);
        }
      } else if (response?.ok) {
        // Success - handle remember me
        handleRememberMe(email, rememberMe);

        toast.success("Login successful! Redirecting to dashboard...");

        // Clear password but keep email if remembering
        setPassword("");
        if (!rememberMe) {
          setEmail("");
        }

        router.push("/");
      } else {
        const errorMessage = "Unknown response from server!";
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error during login:", error);

      let errorMessage = "An unexpected error occurred!";

      if (error.name === "TypeError" && error.message.includes("fetch")) {
        errorMessage =
          "Cannot connect to server! Check your internet connection.";
      } else if (error.name === "AbortError") {
        errorMessage = "Request was cancelled! Try again.";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      setError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !isLoading) {
      handleSubmit();
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Clear error when user starts typing
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError("");
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) setError("");
  };

  // Handle remember me toggle
  const handleRememberToggle = () => {
    const newRememberMe = !rememberMe;
    setRememberMe(newRememberMe);

    // If turning off remember me, clear stored credentials
    if (!newRememberMe) {
      handleRememberMe("", false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex">
      {/* Header with Logo */}
      <div className="absolute top-6 right-6 z-10">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">BD</span>
          </div>
          <span className="text-gray-900 font-semibold text-lg">
            Breakdown Drawings
          </span>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back!
            </h2>
            <p className="text-gray-600">
              Build your inventory management effortlessly with our
              <br />
              powerful spare parts system.
            </p>
          </div>

          <div className="space-y-6">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onKeyPress={handleKeyPress}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                    error ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  placeholder="drawings@gmail.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  onKeyPress={handleKeyPress}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                    error ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  placeholder="••••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                >
                  {showPassword ? (
                    <MdVisibility className="h-5 w-5" />
                  ) : (
                    <MdVisibilityOff className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-gray-600 text-sm">
                  Remember sign in details
                </span>
              </div>
              <button
                type="button"
                onClick={handleRememberToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  rememberMe ? "bg-purple-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    rememberMe ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                <svg
                  className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Login Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transform hover:scale-[1.02]"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Logging in...
                </div>
              ) : (
                "Log in"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
