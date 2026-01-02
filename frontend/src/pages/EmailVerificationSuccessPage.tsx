// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: EmailVerificationSuccessPage.tsx
// Description: To display success message after email verification is completed
// First Written on: Tuesday, 30-Sep-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state and lifecycle management
import React, { useState, useEffect } from "react";
// Import React Router hooks for navigation and URL parameters
import { useNavigate, useSearchParams } from "react-router-dom";
// Import Material-UI components for UI elements
import { Button, CircularProgress, Alert } from "@mui/material";
// Import lucide-react icons for UI elements
import { CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";
// Import API function for email verification
import { verifyEmailToken } from "../services/api";
// Import Poppins font weights for consistent typography
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";

/**
 * EmailVerificationSuccessPage Component
 * 
 * Displays success message after email verification is completed.
 * Features include:
 * - Email token verification
 * - Success confirmation display
 * - Auto-redirect countdown to login page
 * - Manual navigation to login
 * 
 * @returns JSX element representing the email verification success page
 */
const EmailVerificationSuccessPage: React.FC = () => {
  // Component state management
  const [loading, setLoading] = useState(true);    // Loading state during token verification
  const [success, setSuccess] = useState(false);    // Whether verification was successful
  const [error, setError] = useState("");           // Error message to display
  const [countdown, setCountdown] = useState(5);   // Countdown timer for auto-redirect (in seconds)
  
  // React Router hooks
  const navigate = useNavigate();        // Navigation function for programmatic routing
  const [searchParams] = useSearchParams();  // URL search parameters

  /**
   * Effect hook to verify email token on component mount
   * Extracts token from URL, verifies it, and starts countdown for auto-redirect
   */
  useEffect(() => {
    // Extract verification token from URL parameters
    const token = searchParams.get("token");

    if (!token) {
      setError("Invalid verification link");
      setLoading(false);
      return;
    }

    // Verify the token
    verifyEmailToken(token)
      .then(() => {
        setSuccess(true);
        setLoading(false);

        // Start countdown timer for auto-redirect to login page
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              navigate("/login");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(timer);
      })
      .catch((err: any) => {
        setError(err.message || "Email verification failed");
        setLoading(false);
      });
  }, [searchParams, navigate]);

  /**
   * Handles manual navigation to login page
   * Called when user clicks "Continue to Login" button
   */
  const handleContinueToLogin = () => {
    navigate("/login");
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-3 sm:p-4"
        style={{ backgroundColor: "#F5EFED" }}
      >
        <div className="w-full max-w-md">
          <div
            className="rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-5 md:p-6 text-center"
            style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
          >
            <CircularProgress
              size={24}
              sx={{
                color: "#F2742C",
                mb: 1.5,
                "&.MuiCircularProgress-root": {
                  width: { xs: "24px", sm: "30px" },
                  height: { xs: "24px", sm: "30px" },
                },
              }}
            />
            <p
              className="text-sm sm:text-base font-medium"
              style={{ color: "#32332D", fontFamily: "'Poppins', sans-serif" }}
            >
              Verifying your email...
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
      <div className="w-full max-w-md">
        {/* Header Section */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="inline-flex items-center justify-center mb-2 sm:mb-3 transition-transform duration-300 hover:scale-105">
            {success ? (
              <CheckCircle
                className="w-12 h-12 sm:w-16 sm:h-16"
                style={{ color: "#0F5648" }}
              />
            ) : (
              <img
                src="/logos/parenzing-logo-350x350-black.png"
                alt="ParenZing Logo"
                className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24"
              />
            )}
          </div>
          <h1
            className="text-xl sm:text-2xl font-bold mb-1 sm:mb-1.5 font-['Poppins']"
            style={{ color: "#32332D" }}
          >
            {success ? "Email Verified!" : "Verification Failed"}
          </h1>
          <p className="text-xs sm:text-sm" style={{ color: "#32332D" }}>
            {success
              ? "Your email has been successfully verified"
              : "There was an issue verifying your email"}
          </p>
        </div>

        {/* Main Card */}
        <div
          className="rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-5 md:p-6 transition-all duration-300 hover:shadow-2xl"
          style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
        >
          <div className="text-center space-y-3 sm:space-y-4">
            {success ? (
              <>
                {/* Success Message */}
                <div
                  className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl"
                  style={{
                    backgroundColor: "#FAEFE2",
                    border: "1px solid #0F5648",
                  }}
                >
                  <p
                    className="text-xs sm:text-sm"
                    style={{ color: "#32332D" }}
                  >
                    Your account is now verified and ready to use!
                  </p>
                </div>

                {/* Auto-redirect countdown */}
                <div
                  className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl"
                  style={{
                    backgroundColor: "#FAEFE2",
                    border: "1px solid #AA855B",
                  }}
                >
                  <p
                    className="text-xs sm:text-sm"
                    style={{ color: "#32332D" }}
                  >
                    Redirecting to login page in {countdown} seconds...
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-1 sm:pt-2">
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleContinueToLogin}
                    sx={{
                      backgroundColor: "#0F5648",
                      borderRadius: "50px",
                      padding: { xs: "8px", sm: "10px" },
                      fontSize: { xs: "12px", sm: "13px" },
                      fontWeight: 600,
                      textTransform: "none",
                      fontFamily: "'Poppins', sans-serif",
                      boxShadow: "0 4px 12px rgba(15, 86, 72, 0.3)",
                      "&:hover": {
                        backgroundColor: "#0A4538",
                        boxShadow: "0 6px 16px rgba(15, 86, 72, 0.4)",
                      },
                    }}
                  >
                    <span className="flex items-center justify-center">
                      Continue to Login
                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
                    </span>
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Error Message */}
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

                {/* Action Buttons */}
                <div className="space-y-2 sm:space-y-2.5 pt-1 sm:pt-2">
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => navigate("/signup")}
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
                    }}
                  >
                    Try Signing Up Again
                  </Button>

                  <Button
                    fullWidth
                    variant="text"
                    onClick={() => navigate("/login")}
                    sx={{
                      color: "#AA855B",
                      borderRadius: "50px",
                      padding: { xs: "6px", sm: "8px" },
                      fontSize: { xs: "12px", sm: "13px" },
                      fontWeight: 500,
                      textTransform: "none",
                      fontFamily: "'Poppins', sans-serif",
                      backgroundColor: "transparent",
                      "&:hover": {
                        color: "#32332D",
                        backgroundColor: "transparent",
                      },
                    }}
                  >
                    <span className="flex items-center justify-center">
                      <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
                      Go to Login
                    </span>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 sm:mt-6">
          <p className="text-xs sm:text-sm" style={{ color: "#AA855B" }}>
            {success
              ? "Welcome to our parenting community!"
              : "Need help? Contact our support team."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationSuccessPage;
