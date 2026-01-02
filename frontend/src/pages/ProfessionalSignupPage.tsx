// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: ProfessionalSignupPage.tsx
// Description: To provide user registration interface for professional users to create accounts
// First Written on: Monday, 13-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state management
import React, { useState } from "react";
// Import React Router hooks for navigation
import { useNavigate, Link } from "react-router-dom";
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
// Import API functions for user registration
import { sendSignup, googleSignIn } from "../services/api";
// Import Google sign-in button component
import GoogleSignInButton from "../components/GoogleSignInButton";

/**
 * ProfessionalSignupPage Component
 * 
 * Provides user registration interface for professional users to create accounts.
 * Features include:
 * - Email/password registration form
 * - Password confirmation validation
 * - Terms and conditions acceptance
 * - Google sign-in option
 * - Form validation and error handling
 * 
 * @returns JSX element representing the professional signup page
 */
const ProfessionalSignupPage: React.FC = () => {
  // Form state management
  const [email, setEmail] = useState("");              // User's email address
  const [password, setPassword] = useState("");        // User's password
  const [confirmPassword, setConfirmPassword] = useState("");  // Password confirmation
  const [acceptTerms, setAcceptTerms] = useState(false);      // Terms acceptance checkbox
  const [showPassword, setShowPassword] = useState(false);     // Toggle password visibility
  const [error, setError] = useState("");              // Error message to display
  const [loading, setLoading] = useState(false);       // Loading state during registration
  
  // React Router hook
  const navigate = useNavigate();   // Navigation function for programmatic routing

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
      // '&:hover': {
      //   backgroundColor: '#F5F5F5',
      // },
      // '&.Mui-focused': {
      //   backgroundColor: '#F5F5F5',
      //   boxShadow: '0 0 0 2px #F2742C',
      // },
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
      "& .MuiInputBase-input": {
        padding: "12px 14px", // Equal top/bottom padding for proper centering
      },
    },
    "& .MuiInputLabel-root": {
      color: "#32332D",
      fontWeight: 500,
      fontFamily: "'Poppins', sans-serif",
      fontSize: { xs: "11px", sm: "12px" },
      // Center the label vertically when not shrunk
      transform: "translate(14px, 12px) scale(1)",
      "&.MuiInputLabel-shrink": {
        transform: "translate(14px, -9px) scale(0.75)",
      },
    },
    "& .MuiInputBase-input": {
      fontSize: { xs: "12px", sm: "13px" },
    },
  });

  /**
   * Handles form submission for professional user registration
   * Validates form data, creates new professional account, and redirects to profile submission
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
      // Create user account with role 'professional'
      await sendSignup({ email, password, role: "professional" });

      // Store user email for email verification page
      localStorage.setItem("userEmail", email);
      localStorage.setItem("professionalSignup", "true"); // Flag for professional flow

      // Redirect to email verification page
      navigate("/email-verification", {
        state: { email, isProfessional: true },
      });
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  // Google sign-in success handler for professionals
  const handleGoogleSuccess = async (idToken: string) => {
    setError("");
    setLoading(true);
    try {
      // Decode token to get email
      const payload = JSON.parse(atob(idToken.split(".")[1]));
      const email = payload.email;

      localStorage.setItem("userEmail", email);
      localStorage.setItem("professionalSignup", "true"); // Flag for professional flow

      console.log("Calling backend API...");
      const data = await googleSignIn(idToken, email, "professional");
      console.log("Backend response:", data);

      // Store token if provided
      if (data.access_token) {
        localStorage.setItem("auth_token", data.access_token);
      }

      // Check if this is the first login (no profile exists)
      if (data.isFirstLogin) {
        console.log(
          "First login detected, redirecting to professional setup profile",
        );
        navigate("/professional-setup-profile");
      } else {
        console.log(
          "Returning professional user, redirecting to professional dashboard",
        );
        navigate("/professional-dashboard");
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
          <div className="grid md:grid-cols-2 min-h-[400px] sm:min-h-[450px] md:min-h-[480px]">
            {/* LEFT SIDE - Form Section */}
            <div
              className="p-4 sm:p-5 md:p-6 flex flex-col justify-center"
              style={{ backgroundColor: "#F5F5F5" }}
            >
              {/* Header - Visible on all screens */}
              <div className="text-center mb-2 sm:mb-3">
                <h1
                  className="text-xl sm:text-2xl font-bold mb-0.5 sm:mb-1 font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  Join as Professional
                </h1>
                <p
                  className="text-[10px] sm:text-xs"
                  style={{ color: "#32332D" }}
                >
                  Create your professional account
                </p>
              </div>

              {/* Verification Notice */}
              <div
                className="mb-2 sm:mb-3 p-2 sm:p-2.5 rounded-lg sm:rounded-xl"
                style={{
                  backgroundColor: "#FFF4E6",
                  border: "1px solid #F2742C",
                }}
              >
                <div className="flex items-start">
                  <Shield
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 mt-0.5 flex-shrink-0"
                    style={{ color: "#F2742C" }}
                  />
                  <div className="text-left">
                    <p
                      className="font-semibold text-[10px] sm:text-xs mb-0.5"
                      style={{ color: "#F2742C" }}
                    >
                      Verification Required
                    </p>
                    <p
                      className="text-[10px] sm:text-xs leading-tight"
                      style={{ color: "#32332D" }}
                    >
                      Professional profile and credentials need to be submitted
                      for verification to access promotions and advertise
                      services.
                    </p>
                  </div>
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-2.5 sm:space-y-3"
              >
                {/* Form Fields */}
                <div className="space-y-2 sm:space-y-2.5">
                  <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    required
                    size="small"
                    sx={getTextFieldStyles(!!email)}
                  />

                  <TextField
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    required
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            size="small"
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
                    size="small"
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
                <div className="relative my-2 sm:my-3">
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
                <div className="text-center pt-1.5 sm:pt-2">
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
                  <p
                    className="text-[10px] sm:text-xs mt-1 sm:mt-1.5"
                    style={{ color: "#32332D" }}
                  >
                    Are you a parent?{" "}
                    <Link
                      to="/signup"
                      className="font-semibold transition-colors"
                      style={{ color: "#F2742C" }}
                    >
                      Sign Up as Parent
                    </Link>
                  </p>
                </div>
              </form>
            </div>

            {/* RIGHT SIDE - Welcome Section */}
            <div
              className="hidden md:flex p-5 md:p-6 flex-col justify-between items-center text-center"
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
                  <span className="text-xs font-semibold">
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

export default ProfessionalSignupPage;
