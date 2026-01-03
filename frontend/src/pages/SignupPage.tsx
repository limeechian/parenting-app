// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: SignupPage.tsx
// Description: To provide user registration interface for parent users to create accounts
// First Written on: Tuesday, 30-Sep-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state management
import React, { useState } from "react";
// Import React Router hooks for navigation
import { useNavigate, Link, useLocation } from "react-router-dom";
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
// Import toast notification components
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Import Poppins font weights for consistent typography
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";

//const API_BASE_URL = 'http://localhost:8000';
//const API_BASE_URL = 'https://5e0em7cm60.execute-api.ap-southeast-2.amazonaws.com/prod';
//const API_BASE_URL = 'http://parenting-app-alb-1579687963.ap-southeast-2.elb.amazonaws.com';
//const API_BASE_URL = 'https://2fayughxfh.execute-api.ap-southeast-2.amazonaws.com/prod';
// const API_BASE_URL = 'http://localhost:8000'; // For local development
// const API_BASE_URL = 'https://parenzing.com'; // For production
//const API_BASE_URL = 'https://parenting-app-alb-1579687963.ap-southeast-2.elb.amazonaws.com';
//const API_BASE_URL = 'https://parenzing.com';
//import { API_BASE_URL } from '../config/api';
// Import API functions for user registration
import { sendSignup, googleSignIn } from "../services/api";
// Import Google sign-in button component
import GoogleSignInButton from "../components/GoogleSignInButton";

/**
 * SignupPage Component
 *
 * Provides user registration interface for parent users to create accounts.
 * Features include:
 * - Email/password registration form
 * - Password confirmation validation
 * - Terms and conditions acceptance
 * - Google sign-in option
 * - Form validation and error handling
 *
 * @returns JSX element representing the signup page
 */
const SignupPage: React.FC = () => {
  // Form state management
  const [email, setEmail] = useState(""); // User's email address
  const [password, setPassword] = useState(""); // User's password
  const [confirmPassword, setConfirmPassword] = useState(""); // Password confirmation
  const [acceptTerms, setAcceptTerms] = useState(false); // Terms acceptance checkbox
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility
  const [error, setError] = useState(""); // Error message to display
  const [loading, setLoading] = useState(false); // Loading state during registration

  // React Router hooks
  const navigate = useNavigate(); // Navigation function for programmatic routing
  const location = useLocation(); // Current route location

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
        backgroundColor: "#F5F5F5",
      },
      "&.Mui-focused": {
        backgroundColor: "#F5F5F5",
        boxShadow: "0 0 0 2px #F2742C",
      },
      // Override browser autofill styling
      "& input:-webkit-autofill": {
        WebkitBoxShadow: "0 0 0 1000px #F5F5F5 inset !important",
        WebkitTextFillColor: "#32332D !important",
        transition: "background-color 5000s ease-in-out 0s",
      },
      "& input:-webkit-autofill:hover": {
        WebkitBoxShadow: "0 0 0 1000px #F5F5F5 inset !important",
      },
      "& input:-webkit-autofill:focus": {
        WebkitBoxShadow: "0 0 0 1000px #F5F5F5 inset !important",
      },
    },
    "& .MuiInputLabel-root": {
      color: "#32332D",
      fontWeight: 500,
      fontFamily: "'Poppins', sans-serif",
      fontSize: { xs: "12px", sm: "13px" },
    },
    "& .MuiInputBase-input": {
      fontSize: { xs: "12px", sm: "13px" },
    },
  });

  /**
   * Handles form submission for user registration
   * Validates form data, creates new user account, and redirects to profile setup
   *
   * @param e - Form submission event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Email is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!acceptTerms) {
      // Show toast notification for terms acceptance
      toast.warning(
        "Please accept our Terms of Service and Privacy Policy to continue",
        {
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
        },
      );
      setError("You must accept the terms");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // Use centralized API service - always 'parent' role for this page
      // The backend hook (on_after_register) should automatically send verification email
      await sendSignup({ email, password, role: "parent" });

      // Store user email for email verification page
      localStorage.setItem("userEmail", email);

      // Redirect to email verification page instead of auto-login
      // Note: Verification email should be sent automatically by backend hook
      // If it's not received, user can use the "Resend Email" button
      navigate("/email-verification", { state: { email } });
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err.message || "Signup failed");
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

      console.log("Calling backend API...");
      const data = await googleSignIn(idToken, email);
      console.log("Backend response:", data);

      // Store token if provided
      if (data.access_token) {
        localStorage.setItem("auth_token", data.access_token);
      }

      // Check for return URL
      const returnUrl =
        (location.state as any)?.returnUrl || localStorage.getItem("returnUrl");
      if (returnUrl) {
        localStorage.removeItem("returnUrl");
        navigate(returnUrl);
      } else if (data.isFirstLogin) {
        console.log("First login detected, redirecting to setup profile");
        navigate("/setup-profile");
      } else {
        console.log("Returning user, redirecting to dashboard");
        navigate("/parent-dashboard");
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      setError(error.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  // Google sign-in error handler
  const handleGoogleError = (error: string) => {
    console.error("Google sign-in error:", error);
    setError(
      "Google sign-in failed. Please try again or use email/password signup.",
    );
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6"
      style={{ backgroundColor: "#F5EFED" }}
    >
      {/* Main Split Card */}
      <div className="w-full max-w-4xl">
        <div
          className="rounded-2xl sm:rounded-3xl shadow-xl transition-all duration-300 hover:shadow-2xl overflow-hidden"
          style={{ border: "1px solid #AA855B" }}
        >
          <div className="grid md:grid-cols-2 min-h-[400px] sm:min-h-[480px] md:min-h-[520px]">
            {/* LEFT SIDE - Form Section */}
            <div
              className="p-4 sm:p-5 md:p-6 lg:p-7 flex flex-col justify-center"
              style={{ backgroundColor: "#F5F5F5" }}
            >
              {/* Header - Visible on all screens */}
              <div className="text-center mb-3 sm:mb-4">
                <h1
                  className="text-xl sm:text-2xl font-bold mb-1 sm:mb-1.5 font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  Join Our Community
                </h1>
                <p
                  className="text-[10px] sm:text-xs"
                  style={{ color: "#32332D" }}
                >
                  Start your parenting journey with expert guidance
                </p>
              </div>
              <form
                onSubmit={handleSubmit}
                className="space-y-2.5 sm:space-y-3 md:space-y-3.5"
              >
                {/* Form Fields */}
                <div className="space-y-2.5 sm:space-y-3">
                  <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    required
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
                    sx={getTextFieldStyles(!!password)}
                  />

                  <TextField
                    label="Confirm Password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    fullWidth
                    required
                    sx={getTextFieldStyles(!!confirmPassword)}
                  />
                </div>

                {/* Terms and Conditions */}
                <div style={{ marginTop: "6px" }} className="sm:mt-2">
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
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
                        className="text-[10px] sm:text-xs"
                        style={{ color: "#32332D" }}
                      >
                        I agree to the{" "}
                        <span
                          className="font-semibold transition-colors cursor-default"
                          style={{ color: "#F2742C" }}
                        >
                          Terms of Service
                        </span>{" "}
                        and{" "}
                        <span
                          className="font-semibold transition-colors cursor-default"
                          style={{ color: "#F2742C" }}
                        >
                          Privacy Policy
                        </span>
                      </span>
                    }
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                  sx={{
                    backgroundColor: "#F2742C",
                    borderRadius: "50px",
                    padding: { xs: "8px", sm: "10px" },
                    fontSize: { xs: "12px", sm: "13px" },
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
                    <CircularProgress
                      size={20}
                      sx={{
                        color: "white",
                        "&.MuiCircularProgress-root": {
                          width: { xs: "20px", sm: "24px" },
                          height: { xs: "20px", sm: "24px" },
                        },
                      }}
                    />
                  ) : (
                    <span className="flex items-center justify-center">
                      Create Account
                      <ArrowRight className="ml-1.5 sm:ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </span>
                  )}
                </Button>

                {/* Error Display */}
                {error && (
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-red-600 font-medium flex items-center justify-center">
                      <Shield className="w-3.5 h-3 sm:w-4 sm:h-3 mr-1 sm:mr-1.5" />
                      {error}
                    </p>
                  </div>
                )}

                {/* Divider */}
                <div className="relative my-3 sm:my-4 md:my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div
                      className="w-full border-t"
                      style={{ borderColor: "#AA855B" }}
                    ></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] sm:text-xs">
                    <span
                      className="px-3 sm:px-4 font-medium"
                      style={{ backgroundColor: "#F5F5F5", color: "#32332D" }}
                    >
                      or continue with
                    </span>
                  </div>
                </div>

                {/* Google Sign In */}
                <GoogleSignInButton
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  disabled={loading}
                  loading={loading}
                  text="Continue with Google"
                />

                {/* Sign In Link */}
                <div className="text-center pt-2 sm:pt-3">
                  <p
                    className="text-[10px] sm:text-xs"
                    style={{ color: "#32332D" }}
                  >
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      className="font-semibold transition-colors"
                      style={{ color: "#F2742C" }}
                    >
                      Sign In
                    </Link>
                  </p>
                </div>
              </form>
            </div>

            {/* RIGHT SIDE - Welcome Section */}
            <div
              className="hidden md:flex p-6 md:p-7 flex-col justify-between items-center text-center"
              style={{ backgroundColor: "#FAEFE2" }}
            >
              <div className="flex-1 flex flex-col justify-center items-center">
                {/* Logo */}
                <div className="py-2">
                  <img
                    src="/logos/parenzing-middle-logo-350x350-black.png"
                    alt="ParenZing Logo"
                    className="w-48 lg:w-56 h-auto mx-auto"
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

export default SignupPage;
