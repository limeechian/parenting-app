// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: EmailVerificationPage.tsx
// Description: To provide interface for users to verify their email address during registration
// First Written on: Tuesday, 30-Sep-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state and lifecycle management
import React, { useState, useEffect } from "react";
// Import React Router hooks for navigation
import { useNavigate, useLocation } from "react-router-dom";
// Import Material-UI components for UI elements
import { Button, CircularProgress, Alert } from "@mui/material";
// Import lucide-react icons for UI elements
import { RefreshCw } from "lucide-react";
// Import API function for sending verification email
import { sendVerificationEmail } from "../services/api";

/**
 * EmailVerificationPage Component
 * 
 * Provides interface for users to verify their email address during registration.
 * Features include:
 * - Display verification email sent message
 * - Resend verification email functionality
 * - Email address display
 * - Navigation to login after verification
 * 
 * @returns JSX element representing the email verification page
 */
const EmailVerificationPage: React.FC = () => {
  // Component state management
  const [resendLoading, setResendLoading] = useState(false);  // Loading state for resend email
  const [error, setError] = useState("");                     // Error message to display
  const [success, setSuccess] = useState("");                 // Success message to display
  const [email, setEmail] = useState("");                    // User's email address
  
  // React Router hooks
  const navigate = useNavigate();   // Navigation function for programmatic routing
  const location = useLocation();    // Current route location

  /**
   * Effect hook to retrieve email address on component mount
   * Gets email from location state (passed from signup) or localStorage
   * Redirects to signup if no email is found
   */
  useEffect(() => {
    // Get email from location state or localStorage
    const emailFromState = location.state?.email;
    const emailFromStorage = localStorage.getItem("userEmail");
    const userEmail = emailFromState || emailFromStorage;

    if (userEmail) {
      setEmail(userEmail);
    } else {
      // If no email found, redirect to signup
      navigate("/signup");
    }
  }, [location.state, navigate]);

  /**
   * Handles resending verification email
   * Sends a new verification email to the user's email address
   */
  const handleResendEmail = async () => {
    if (!email) return;

    setResendLoading(true);
    setError("");

    try {
      await sendVerificationEmail(email);
      setSuccess("Verification email sent successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to resend verification email");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: "#F5EFED" }}
    >
      <div className="w-full max-w-md">
        {/* Header Section */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="inline-flex items-center justify-center mb-2 sm:mb-3 transition-transform duration-300 hover:scale-105">
            {/* <Mail className="w-8 h-8 text-white" /> */}
            <img
              src="/logos/parenzing-logo-350x350-black.png"
              alt="ParenZing Logo"
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24"
            />
          </div>
          <h1
            className="text-xl sm:text-2xl font-bold mb-1 sm:mb-1.5 font-['Poppins']"
            style={{ color: "#32332D" }}
          >
            Check Your Email
          </h1>
          <p className="text-xs sm:text-sm" style={{ color: "#32332D" }}>
            We've sent a verification link to your email
          </p>
        </div>

        {/* Main Card */}
        <div
          className="rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-5 md:p-6 transition-all duration-300 hover:shadow-2xl"
          style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
        >
          <div className="text-center space-y-3 sm:space-y-4">
            {/* Email Display */}
            <div
              className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl"
              style={{
                backgroundColor: "#FAEFE2",
                border: "1px solid #AA855B",
              }}
            >
              <p className="text-xs sm:text-sm" style={{ color: "#32332D" }}>
                Verification email sent to:
              </p>
              <p
                className="font-semibold text-sm sm:text-base mt-1 sm:mt-1.5 break-all"
                style={{ color: "#32332D" }}
              >
                {email}
              </p>
            </div>

            {/* Instructions */}
            <div className="pt-1 sm:pt-2 space-y-2 sm:space-y-3">
              <div className="flex items-center space-x-2 sm:space-x-2.5">
                <div
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#326586" }}
                >
                  <span className="text-white text-[10px] sm:text-xs font-bold">
                    1
                  </span>
                </div>
                <p
                  className="text-[10px] sm:text-xs text-left"
                  style={{ color: "#32332D" }}
                >
                  Check your email inbox (and spam folder)
                </p>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-2.5">
                <div
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#326586" }}
                >
                  <span className="text-white text-[10px] sm:text-xs font-bold">
                    2
                  </span>
                </div>
                <p
                  className="text-[10px] sm:text-xs text-left"
                  style={{ color: "#32332D" }}
                >
                  Click the verification link in the email
                </p>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-2.5">
                <div
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#326586" }}
                >
                  <span className="text-white text-[10px] sm:text-xs font-bold">
                    3
                  </span>
                </div>
                <p
                  className="text-[10px] sm:text-xs text-left"
                  style={{ color: "#32332D" }}
                >
                  Return here to continue with your account
                </p>
              </div>
            </div>

            {/* Success/Error Messages */}
            {success && (
              <Alert
                severity="success"
                sx={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: { xs: "12px", sm: "13px" },
                  py: 0.5,
                }}
              >
                {success}
              </Alert>
            )}

            {error && (
              <Alert
                severity="error"
                sx={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: { xs: "12px", sm: "13px" },
                  py: 0.5,
                }}
              >
                {error}
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="pt-1 sm:pt-2">
              <Button
                fullWidth
                variant="contained"
                onClick={handleResendEmail}
                disabled={resendLoading}
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
                {resendLoading ? (
                  <CircularProgress
                    size={16}
                    sx={{
                      color: "white",
                      "&.MuiCircularProgress-root": {
                        width: { xs: "16px", sm: "18px" },
                        height: { xs: "16px", sm: "18px" },
                      },
                    }}
                  />
                ) : (
                  <span className="flex items-center justify-center">
                    <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    Resend Email
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 sm:mt-6">
          <p className="text-xs sm:text-sm" style={{ color: "#AA855B" }}>
            Didn't receive the email? Check your spam folder or try resending.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
