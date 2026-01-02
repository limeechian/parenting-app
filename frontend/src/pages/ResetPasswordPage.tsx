// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: ResetPasswordPage.tsx
// Description: To provide interface for users to reset their password using reset token
// First Written on: Tuesday, 30-Sep-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state and lifecycle management
import React, { useState, useEffect } from "react";
// Import React Router hooks for navigation and URL parameters
import { useNavigate, useSearchParams, Link } from "react-router-dom";
// Import Material-UI components for form elements
import {
  TextField,
  Button,
  InputAdornment,
  IconButton,
  CircularProgress,
} from "@mui/material";
// Import Material-UI icons for password visibility toggle
import { Visibility, VisibilityOff } from "@mui/icons-material";
// Import lucide-react icons for decorative elements
import { Heart, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
// Import API functions for password reset
import { verifyResetToken, resetPassword } from "../services/api";
// Import toast notification components
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Import Poppins font weights for consistent typography
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";

/**
 * ResetPasswordPage Component
 * 
 * Provides interface for users to reset their password using a reset token from email.
 * Features include:
 * - Token verification on page load
 * - New password input with confirmation
 * - Password strength validation
 * - Password visibility toggle
 * - Success confirmation
 * 
 * @returns JSX element representing the reset password page
 */
const ResetPasswordPage: React.FC = () => {
  // Form state management
  const [password, setPassword] = useState("");              // New password
  const [confirmPassword, setConfirmPassword] = useState(""); // Password confirmation
  const [showPassword, setShowPassword] = useState(false);   // Toggle password visibility
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Toggle confirm password visibility
  const [error, setError] = useState("");                    // Error message to display
  const [loading, setLoading] = useState(false);             // Loading state during password reset
  const [verifying, setVerifying] = useState(true);          // Whether token is being verified
  const [tokenValid, setTokenValid] = useState(false);      // Whether reset token is valid
  const [passwordReset, setPasswordReset] = useState(false);  // Whether password was reset successfully
  
  // React Router hooks
  const [searchParams] = useSearchParams();  // URL search parameters
  const navigate = useNavigate();             // Navigation function for programmatic routing

  // Extract reset token from URL parameters
  const token = searchParams.get("token");

  /**
   * Effect hook to verify reset token on component mount
   * Validates the token from URL before allowing password reset
   */
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("Invalid reset link. Please request a new password reset.");
        setVerifying(false);
        return;
      }

      try {
        await verifyResetToken(token);
        setTokenValid(true);
        setError("");
      } catch (err: any) {
        console.error("Token verification error:", err);
        setError(
          err.message ||
            "Invalid or expired reset token. Please request a new password reset.",
        );
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

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
      "&:hover": {},
      "&.Mui-focused": {},
      "& input:-webkit-autofill": {
        WebkitBoxShadow: "0 0 0 1000px #F5F5F5 inset !important",
        WebkitTextFillColor: "#32332D !important",
        transition: "background-color 5000s ease-in-out 0s",
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
   * Handles form submission for password reset
   * Validates password requirements and submits new password
   * 
   * @param e - Form submission event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate password length
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Invalid reset token");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);
      setPasswordReset(true);
      toast.success("Password reset successfully! Redirecting to login...", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-3 sm:p-4"
        style={{ backgroundColor: "#F5EFED" }}
      >
        <div className="text-center">
          <CircularProgress sx={{ color: "#F2742C" }} />
          <p
            className="mt-3 sm:mt-4 text-xs sm:text-sm"
            style={{ color: "#32332D" }}
          >
            Verifying reset link...
          </p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-3 sm:p-4"
        style={{ backgroundColor: "#F5EFED" }}
      >
        <div className="w-full max-w-md">
          <div
            className="rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 text-center"
            style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
          >
            <h1
              className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              Invalid Reset Link
            </h1>
            <p
              className="text-xs sm:text-sm mb-4 sm:mb-6"
              style={{ color: "#32332D" }}
            >
              {error || "This password reset link is invalid or has expired."}
            </p>
            <div className="space-y-3">
              <Link to="/forgot-password">
                <Button
                  variant="contained"
                  fullWidth
                  sx={{
                    backgroundColor: "#F2742C",
                    borderRadius: "50px",
                    padding: "10px",
                    fontSize: "13px",
                    fontWeight: 600,
                    textTransform: "none",
                    fontFamily: "'Poppins', sans-serif",
                    "&:hover": {
                      backgroundColor: "#E55A1F",
                    },
                  }}
                >
                  Request New Reset Link
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: "#AA855B",
                    color: "#AA855B",
                    borderRadius: "50px",
                    padding: "10px",
                    fontSize: "13px",
                    fontWeight: 600,
                    textTransform: "none",
                    fontFamily: "'Poppins', sans-serif",
                    "&:hover": {
                      borderColor: "#F2742C",
                      color: "#F2742C",
                    },
                  }}
                >
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (passwordReset) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-3 sm:p-4"
        style={{ backgroundColor: "#F5EFED" }}
      >
        <div className="w-full max-w-md">
          <div
            className="rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 text-center"
            style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
          >
            <div className="flex justify-center mb-3 sm:mb-4">
              <CheckCircle
                className="w-12 h-12 sm:w-16 sm:h-16"
                style={{ color: "#0F5648" }}
              />
            </div>
            <h1
              className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              Password Reset Successful!
            </h1>
            <p
              className="text-xs sm:text-sm mb-4 sm:mb-6"
              style={{ color: "#32332D" }}
            >
              Your password has been reset successfully. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: "#F5EFED" }}
    >
      <div className="w-full max-w-3xl">
        <div
          className="rounded-2xl sm:rounded-3xl shadow-xl transition-all duration-300 hover:shadow-2xl overflow-hidden"
          style={{ border: "1px solid #AA855B" }}
        >
          <div className="grid md:grid-cols-2 min-h-[400px] sm:min-h-[450px] md:min-h-[480px]">
            {/* LEFT SIDE - Form Section */}
            <div
              className="p-4 sm:p-5 md:p-6 lg:p-8 flex flex-col justify-center"
              style={{ backgroundColor: "#F5F5F5" }}
            >
              <div className="text-center mb-4 sm:mb-5">
                <h1
                  className="text-xl sm:text-2xl font-bold mb-1 sm:mb-1.5 font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  Reset Password
                </h1>
                <p
                  className="text-[10px] sm:text-xs"
                  style={{ color: "#32332D" }}
                >
                  Enter your new password below
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <TextField
                  label="New Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
                  placeholder="Enter new password"
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
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                  required
                  placeholder="Confirm new password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          sx={{
                            color: "#32332D",
                            fontFamily: "'Poppins', sans-serif",
                          }}
                        >
                          {showConfirmPassword ? (
                            <Visibility />
                          ) : (
                            <VisibilityOff />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={getTextFieldStyles(!!confirmPassword)}
                />

                {error && (
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-red-600 font-medium">
                      {error}
                    </p>
                  </div>
                )}

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
                      Reset Password
                      <ArrowRight className="ml-1.5 sm:ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="text-center pt-2 sm:pt-3">
                <Link
                  to="/login"
                  className="flex items-center justify-center text-[10px] sm:text-xs font-semibold transition-colors"
                  style={{ color: "#F2742C" }}
                >
                  <ArrowLeft className="mr-1 w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  Back to Login
                </Link>
              </div>
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

export default ResetPasswordPage;
