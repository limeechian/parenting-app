// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: LoginPage.tsx
// Description: To provide user authentication interface for login functionality
// First Written on: Monday, 29-Sep-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state and lifecycle management
import React, { useState, useEffect } from "react";
// Import React Router hooks for navigation and URL parameters
import {
  useNavigate,
  Link,
  useSearchParams,
  useLocation,
} from "react-router-dom";
// Import Material-UI components for form elements
import {
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  IconButton,
  CircularProgress,
} from "@mui/material";
// Import Material-UI icons for password visibility toggle
import { Visibility, VisibilityOff } from "@mui/icons-material";
// Import lucide-react icons for decorative elements
import { Shield, ArrowRight, Heart } from "lucide-react";
// Import API functions for authentication
import { sendLogin, googleSignIn } from "../services/api";
// Import Google sign-in button component
import GoogleSignInButton from "../components/GoogleSignInButton";
// Import toast notification components
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Import Poppins font weights for consistent typography
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";

/**
 * LoginPageProps interface
 * Defines optional props for the LoginPage component
 */
interface LoginPageProps {
  onSuccessfulSignIn?: () => void; // Callback function called after successful login
}

/**
 * LoginPage Component
 *
 * Provides user authentication interface with:
 * - Email/password login form
 * - Google sign-in option
 * - Remember me functionality
 * - Session expiry handling
 * - Role-based dashboard routing
 *
 * @param props - Component props defined in LoginPageProps interface
 * @returns JSX element representing the login page
 */
const LoginPage: React.FC<LoginPageProps> = ({ onSuccessfulSignIn }) => {
  // Form state management
  const [email, setEmail] = useState(""); // User's email address
  const [password, setPassword] = useState(""); // User's password
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility
  const [rememberMe, setRememberMe] = useState(false); // Remember me checkbox state
  const [error, setError] = useState(""); // Error message to display
  const [loading, setLoading] = useState(false); // Loading state during authentication
  const [sessionExpired, setSessionExpired] = useState(false); // Session expiry flag

  // React Router hooks
  const navigate = useNavigate(); // Navigation function for programmatic routing
  const location = useLocation(); // Current route location
  const [searchParams] = useSearchParams(); // URL search parameters

  /**
   * Returns the appropriate dashboard route based on user role
   * Different user roles are redirected to their respective dashboards
   *
   * @param role - User's role (parent, professional, coordinator, content_manager, admin)
   * @returns Dashboard route path string
   */
  const getDashboardRoute = (role: string): string => {
    switch (role) {
      case "admin":
        return "/admin-dashboard";
      case "coordinator":
        return "/coordinator-dashboard";
      case "content_manager":
        return "/content-manager-dashboard";
      case "professional":
        return "/professional-dashboard";
      case "parent":
      default:
        return "/parent-dashboard";
    }
  };

  /**
   * Checks if a user role requires profile setup on first login
   * Only parent users need to complete profile setup
   * Other roles go directly to their dashboards
   *
   * @param role - User's role
   * @returns Boolean indicating if profile setup is needed
   */
  const needsProfileSetup = (role: string): boolean => {
    // Only parent users need to go through setup-profile on first login
    // Professional users go directly to their dashboard
    // Admin, coordinator, and content_manager don't need profile setup
    return role === "parent";
  };

  /**
   * Effect hook to check for session expiry in URL parameters
   * Displays a toast notification if user was redirected due to expired session
   */
  useEffect(() => {
    if (searchParams.get("session_expired") === "true") {
      setSessionExpired(true);
      toast.info("Your session has expired. Please log in again.", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  }, [searchParams]);

  /**
   * Returns Material-UI TextField styling configuration
   * Includes autofill styling overrides to match application theme
   *
   * @param hasValue - Whether the text field has a value (affects background color)
   * @returns Material-UI sx prop styling object
   */
  const getTextFieldStyles = (hasValue: boolean) => ({
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      backgroundColor: hasValue ? "#F5F5F5" : "#EDEDED",
      fontFamily: "'Poppins', sans-serif",
      "&:hover": {
        //backgroundColor: "#F5F5F5",
      },
      "&.Mui-focused": {
        //backgroundColor: "#F5F5F5",
        //boxShadow: "0 0 0 2px #F2742C",
      },
      // Override browser autofill styling
      "& input:-webkit-autofill": {
        WebkitBoxShadow: "0 0 0 1000px #F5F5F5 inset !important",
        WebkitTextFillColor: "#32332D !important",
        transition: "background-color 5000s ease-in-out 0s",
      },
      "& input:-webkit-autofill:hover": {
        //WebkitBoxShadow: "0 0 0 1000px #F5F5F5 inset !important",
      },
      "& input:-webkit-autofill:focus": {
        //WebkitBoxShadow: "0 0 0 1000px #F5F5F5 inset !important",
      },
    },
    "& .MuiInputLabel-root": {
      color: "#32332D",
      fontWeight: 500,
      fontFamily: "'Poppins', sans-serif",
      fontSize: "13px",
    },
    "& .MuiInputBase-input": {
      fontSize: "13px",
    },
  });

  /**
   * Handles form submission for email/password login
   * Authenticates user, stores token, and redirects to appropriate dashboard
   *
   * @param e - Form submission event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Use the API service for login with remember_me option
      const loginData = await sendLogin({
        identifier: email,
        password,
        remember_me: rememberMe,
      });

      // Store the JWT token in localStorage for subsequent API calls
      if (loginData.access_token) {
        localStorage.setItem("auth_token", loginData.access_token);
        console.log("Token stored in localStorage");
      }

      // Wait a bit to ensure token is stored
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Store user email for profile setup
      localStorage.setItem("userEmail", email);

      // Check if this is the first login (no profile exists)
      // First login → Setup Profile (one-time)
      // Subsequent logins → Dashboard (with soft reminders if profile incomplete)
      if (onSuccessfulSignIn) {
        onSuccessfulSignIn();
        // Wait a tiny bit for React state to update before navigating
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Check for return URL
      const returnUrl =
        (location.state as any)?.returnUrl || localStorage.getItem("returnUrl");
      if (returnUrl) {
        localStorage.removeItem("returnUrl");
        navigate(returnUrl);
      } else {
        // Get user role from login response (default to 'parent' if not provided)
        const userRole = loginData.role || "parent";
        const dashboardRoute = getDashboardRoute(userRole);

        // Check if this is first login and if role needs profile setup
        // Parent users → setup-profile on first login
        // Professional users → professional-dashboard on first login (they can submit profile from there)
        // Other roles → their respective dashboards
        if (loginData.isFirstLogin && needsProfileSetup(userRole)) {
          console.log(
            "First login detected for parent user, redirecting to setup profile",
          );
          navigate("/setup-profile");
        } else {
          console.log(
            `User role: ${userRole}, redirecting to ${dashboardRoute}`,
          );
          navigate(dashboardRoute);
        }
      }
    } catch (err: any) {
      console.error("Login error:", err);
      console.log("Error message:", err.message);
      if (err.message && err.message.includes("Google sign-in")) {
        setError(
          "This account was created with Google sign-in. Please use the 'Sign in with Google' button below.",
        );
      } else if (
        err.message &&
        err.message.includes("Please verify your email")
      ) {
        console.log("Showing toast notification for email verification error");
        // Show toast notification for email verification error
        toast.error("Please verify your email before logging in", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          style: {
            fontFamily: "'Poppins', sans-serif",
            fontSize: "14px",
            backgroundColor: "#F2742C",
            color: "#F5F5F5",
            borderRadius: "8px",
          },
        });
        setError(err.message);
      } else if (
        err.message &&
        (err.message.includes("LOGIN_BAD_CREDENTIALS") ||
          err.message.includes("Bad credentials"))
      ) {
        setError("Incorrect credentials. Please try again.");
      } else {
        setError(err.message || "Unable to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Google sign-in success handler
  const handleGoogleSuccess = async (idToken: string) => {
    setError("");
    setLoading(true);
    try {
      // Decode token to get email
      const payload = JSON.parse(atob(idToken.split(".")[1]));
      const email = payload.email;

      localStorage.setItem("userEmail", email);

      console.log("Making request to /auth/google...");
      const data = await googleSignIn(idToken, email);

      console.log("Response data:", data);

      // Store the JWT token in localStorage for subsequent API calls
      if (data.access_token) {
        localStorage.setItem("auth_token", data.access_token);
        console.log("Token stored in localStorage");
      }

      // Wait a bit to ensure token is stored
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Notify App.tsx that we just signed in successfully
      if (onSuccessfulSignIn) {
        onSuccessfulSignIn();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Check for return URL
      const returnUrl =
        (location.state as any)?.returnUrl || localStorage.getItem("returnUrl");
      if (returnUrl) {
        localStorage.removeItem("returnUrl");
        navigate(returnUrl);
      } else {
        // Get user role from login response (default to 'parent' if not provided)
        const userRole = data.role || "parent";
        const dashboardRoute = getDashboardRoute(userRole);

        // Check if this is first login and if role needs profile setup
        // Parent users → setup-profile on first login
        // Professional users → professional-dashboard on first login (they can submit profile from there)
        // Other roles → their respective dashboards
        if (data.isFirstLogin && needsProfileSetup(userRole)) {
          console.log(
            "First login detected for parent user, redirecting to setup profile",
          );
          navigate("/setup-profile");
        } else {
          console.log(
            `User role: ${userRole}, redirecting to ${dashboardRoute}`,
          );
          navigate(dashboardRoute);
        }
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      setError(
        error.message ||
          "Unable to sign in with Google. Please try again or use email/password login.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Google sign-in error handler
  const handleGoogleError = (error: string) => {
    console.error("Google sign-in error:", error);
    setError(
      "Google sign-in failed. Please try again or use email/password login.",
    );
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "#F5EFED" }}
    >
      {/* Main Split Card */}
      <div className="w-full max-w-3xl">
        <div
          className="rounded-3xl shadow-xl transition-all duration-300 hover:shadow-2xl overflow-hidden"
          style={{ border: "1px solid #AA855B" }}
        >
          <div className="grid md:grid-cols-2 min-h-[480px]">
            {/* LEFT SIDE - Form Section */}
            <div
              className="p-6 md:p-8 flex flex-col justify-center"
              style={{ backgroundColor: "#F5F5F5" }}
            >
              {/* Header - Visible on all screens */}
              <div className="text-center mb-5">
                <h1
                  className="text-2xl font-bold mb-1.5 font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  Welcome Back
                </h1>
                <p className="text-xs" style={{ color: "#32332D" }}>
                  Continue your parenting journey with us
                </p>
                {sessionExpired && (
                  <div
                    className="mt-3 p-3 rounded-lg text-center"
                    style={{
                      backgroundColor: "#FFF4E6",
                      border: "1px solid #F2742C",
                    }}
                  >
                    <p
                      className="text-xs font-medium font-['Poppins']"
                      style={{ color: "#F2742C" }}
                    >
                      Your session has expired. Please log in again.
                    </p>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-4 mt-2">
                  <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    required
                    placeholder="Enter your email"
                    sx={getTextFieldStyles(!!email)}
                  />

                  <TextField
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            sx={{
                              color: "#32332D",
                              fontFamily: "'Poppins', sans-serif",
                            }}
                          >
                            {showPassword ? <Visibility /> : <VisibilityOff />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      mt: 2.5,
                      ...getTextFieldStyles(!!password),
                    }}
                  />
                </div>

                <div
                  className="flex items-center justify-between"
                  style={{ marginTop: "8px" }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        sx={{
                          color: "#AA855B",
                          fontFamily: "'Poppins', sans-serif",
                          "&.Mui-checked": {
                            color: "#F2742C",
                          },
                        }}
                      />
                    }
                    sx={{ fontFamily: "'Poppins', sans-serif" }}
                    label={
                      <span
                        className="font-medium text-xs"
                        style={{ color: "#32332D" }}
                      >
                        Remember me
                      </span>
                    }
                  />
                  <Link
                    to="/forgot-password"
                    className="font-semibold transition-colors text-xs"
                    style={{ color: "#AA855B" }}
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                  sx={{
                    backgroundColor: "#F2742C",
                    borderRadius: "50px",
                    padding: "10px",
                    fontSize: "13px",
                    fontWeight: 600,
                    textTransform: "none",
                    fontFamily: "'Poppins', sans-serif",
                    boxShadow: "0 4px 12px rgba(242, 116, 44, 0.3)",
                    "&:hover": {
                      backgroundColor: "#E55A1F",
                      boxShadow: "0 6px 16px rgba(242, 116, 44, 0.4)",
                    },
                    "&:disabled": {
                      backgroundColor: "#AA855B",
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} sx={{ color: "white" }} />
                  ) : (
                    <span className="flex items-center justify-center">
                      Sign In
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </span>
                  )}
                </Button>

                {error && (
                  <div className="text-center">
                    <p className="text-sm text-red-600 font-medium flex items-center justify-center">
                      <Shield className="w-4 h-3 mr-1.5" />
                      {error}
                    </p>
                  </div>
                )}

                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div
                      className="w-full border-t"
                      style={{ borderColor: "#AA855B" }}
                    ></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span
                      className="px-4 font-medium"
                      style={{ backgroundColor: "#F5F5F5", color: "#32332D" }}
                    >
                      or continue with
                    </span>
                  </div>
                </div>

                <GoogleSignInButton
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  disabled={loading}
                  loading={loading}
                  text="Continue with Google"
                />

                <div className="text-center pt-3">
                  <p className="text-xs" style={{ color: "#32332D" }}>
                    Don't have an account?{" "}
                    <Link
                      to="/signup"
                      className="font-semibold transition-colors"
                      style={{ color: "#F2742C" }}
                    >
                      Sign Up
                    </Link>
                  </p>
                </div>
              </form>
            </div>

            {/* RIGHT SIDE - Welcome Section */}
            <div
              className="hidden md:flex p-6 md:p-8 flex-col justify-between items-center text-center"
              style={{ backgroundColor: "#FAEFE2" }}
            >
              <div className="flex-1 flex flex-col justify-center items-center">
                {/* Logo */}
                <div className="py-2">
                  <img
                    src="/logos/parenzing-middle-logo-350x350-black.png"
                    alt="ParenZing Logo"
                    className="w-56 h-auto mx-auto"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4">
                <div
                  className="flex items-center justify-center space-x-2"
                  style={{ color: "#AA855B" }}
                >
                  <Heart className="w-4 h-4" />
                  <span className="text-xs font-semibold font-['Poppins']">
                    Building stronger families together
                  </span>
                  <Heart className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        toastStyle={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: "14px",
        }}
      />
    </div>
  );
};

export default LoginPage;
