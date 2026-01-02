// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: ForgotPasswordPage.tsx
// Description: To provide interface for users to request password reset via email
// First Written on: Tuesday, 30-Sep-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state management
import React, { useState } from "react";
// Import React Router hooks for navigation
import { useNavigate, Link } from "react-router-dom";
// Import Material-UI components for form elements
import { TextField, Button, CircularProgress } from "@mui/material";
// Import lucide-react icons for decorative elements
import { Heart, ArrowRight, ArrowLeft, Mail } from "lucide-react";
// Import API function for password reset request
import { requestPasswordReset } from "../services/api";
// Import toast notification components
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Import Poppins font weights for consistent typography
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";

/**
 * ForgotPasswordPage Component
 * 
 * Provides interface for users to request password reset via email.
 * Features include:
 * - Email input form
 * - Password reset request submission
 * - Success confirmation display
 * - Error handling
 * 
 * @returns JSX element representing the forgot password page
 */
const ForgotPasswordPage: React.FC = () => {
  // Form state management
  const [email, setEmail] = useState("");        // User's email address
  const [error, setError] = useState("");       // Error message to display
  const [loading, setLoading] = useState(false); // Loading state during API call
  const [emailSent, setEmailSent] = useState(false); // Whether reset email was sent successfully
  
  // React Router hook
  const navigate = useNavigate();  // Navigation function for programmatic routing

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
   * Handles form submission for password reset request
   * Sends password reset email to the user's email address
   * 
   * @param e - Form submission event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Request password reset email from API
      await requestPasswordReset(email);
      // Mark email as sent to show success message
      setEmailSent(true);
      toast.success("Password reset link has been sent to your email!", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (err: any) {
      console.error("Password reset request error:", err);
      setError(
        err.message || "Failed to send password reset email. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

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
                  Forgot Password?
                </h1>
                <p
                  className="text-[10px] sm:text-xs"
                  style={{ color: "#32332D" }}
                >
                  {emailSent
                    ? "Check your email for reset instructions"
                    : "Enter your email to receive a password reset link"}
                </p>
              </div>

              {!emailSent ? (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-4 sm:space-y-5"
                >
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

                  {error && (
                    <div className="text-center">
                      <p className="text-xs sm:text-sm text-red-600 font-medium flex items-center justify-center">
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
                        Send Reset Link
                        <ArrowRight className="ml-1.5 sm:ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </span>
                    )}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4 sm:space-y-5 text-center">
                  <div className="flex justify-center mb-3 sm:mb-4">
                    <Mail
                      className="w-12 h-12 sm:w-16 sm:h-16"
                      style={{ color: "#0F5648" }}
                    />
                  </div>
                  <p
                    className="text-xs sm:text-sm"
                    style={{ color: "#32332D" }}
                  >
                    We've sent a password reset link to <strong>{email}</strong>
                  </p>
                  <p
                    className="text-[10px] sm:text-xs"
                    style={{ color: "#AA855B" }}
                  >
                    Please check your inbox and click the link to reset your
                    password. The link will expire in 1 hour.
                  </p>
                  <Button
                    onClick={() => setEmailSent(false)}
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
                      //   "&:hover": {
                      //     borderColor: "#F2742C",
                      //     color: "#F2742C",
                      //   },
                    }}
                  >
                    Send to Different Email
                  </Button>
                </div>
              )}

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

export default ForgotPasswordPage;
