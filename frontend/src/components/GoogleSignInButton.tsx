// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: GoogleSignInButton.tsx
// Description: To provide Google authentication button component for user login
// First Written on: Monday, 06-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state management
import React, { useState } from "react";
// Import Material-UI components for button and loading spinner
import { Button, CircularProgress } from "@mui/material";
// Import Firebase authentication function for Google sign-in
import { signInWithGoogle } from "../firebase";

/**
 * Props interface for GoogleSignInButton component
 * Defines the properties that can be passed to customize the button behavior
 */
interface GoogleSignInButtonProps {
  onSuccess: (idToken: string) => void; // Callback function called when Google sign-in succeeds
  onError: (error: string) => void; // Callback function called when Google sign-in fails
  disabled?: boolean; // Whether the button should be disabled
  loading?: boolean; // External loading state indicator
  text?: string; // Custom button text (defaults to "Continue with Google")
  className?: string; // Additional CSS classes for styling
}

/**
 * GoogleSignInButton Component
 *
 * A reusable button component that handles Google authentication using Firebase.
 * Displays a loading spinner during authentication and calls success/error callbacks.
 *
 * @param props - Component props defined in GoogleSignInButtonProps interface
 * @returns JSX element representing the Google sign-in button
 */
const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  disabled = false,
  loading = false,
  text = "Continue with Google",
  className = "",
}) => {
  // Internal loading state to track authentication process
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handles the click event when user clicks the Google sign-in button
   * Initiates Google authentication flow using Firebase
   * Prevents multiple simultaneous authentication attempts
   */
  const handleClick = async () => {
    // Prevent action if button is disabled or already loading
    if (disabled || loading || isLoading) return;

    // Set loading state to show spinner
    setIsLoading(true);
    try {
      // Use Firebase for Google authentication (reliable popup method)
      // Opens Google sign-in popup window
      const result = await signInWithGoogle();
      // Extract ID token from authenticated user for backend verification
      const idToken = await result.user.getIdToken();
      // Call success callback with the ID token
      onSuccess(idToken);
    } catch (error: any) {
      // Log error for debugging
      console.error("Google sign-in error:", error);
      // Call error callback with error message
      onError(error.message || "Google sign-in failed");
    } finally {
      // Always reset loading state regardless of success or failure
      setIsLoading(false);
    }
  };

  /**
   * Render the Google sign-in button
   * Shows loading spinner during authentication, otherwise displays Google logo and text
   */
  return (
    <div className={className}>
      {/* Material-UI Button component styled to match application theme */}
      <Button
        type="button" // Button type to prevent form submission
        variant="outlined" // Outlined button style
        fullWidth // Button takes full width of container
        onClick={handleClick} // Click handler to initiate Google sign-in
        disabled={disabled || loading || isLoading} // Disable button when loading or disabled
        sx={{
          // Custom styling using Material-UI's sx prop
          borderColor: "#32332D", // Dark border color matching app theme
          color: "#32332D", // Dark text color
          borderRadius: "50px", // Fully rounded button (pill shape)
          padding: { xs: "8px", sm: "10px", md: "12px" }, // Responsive padding
          fontSize: { xs: "12px", sm: "13px", md: "14px" }, // Responsive font size
          fontWeight: 600, // Semi-bold font weight
          textTransform: "none", // Keep original text case (no uppercase)
          borderWidth: "2px", // Thick border for visibility
          fontFamily: "'Poppins', sans-serif", // Application font family
          boxShadow: "0 2px 10px rgba(50, 51, 45, 0.1)", // Subtle shadow
          "&:hover": {
            // Hover state styling - inverts colors for visual feedback
            borderColor: "#32332D",
            color: "#F5F5F5", // Light text on hover
            backgroundColor: "#32332D", // Dark background on hover
            boxShadow: "0 4px 15px rgba(50, 51, 45, 0.2)", // Enhanced shadow on hover
          },
          "&:disabled": {
            // Disabled state styling - muted colors
            borderColor: "#AA855B", // Brown border when disabled
            color: "#AA855B", // Brown text when disabled
          },
        }}
      >
        {/* Conditional rendering: Show spinner when loading, otherwise show Google logo and text */}
        {loading || isLoading ? (
          // Loading spinner displayed during authentication process
          <CircularProgress
            size={24}
            sx={{
              color: "#32332D", // Dark spinner color
              width: { xs: "20px", sm: "22px", md: "24px" }, // Responsive width
              height: { xs: "20px", sm: "22px", md: "24px" }, // Responsive height
            }}
          />
        ) : (
          // Google logo and button text when not loading
          <>
            {/* Google logo SVG icon */}
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {/* Button text (defaults to "Continue with Google" or custom text from props) */}
            {text}
          </>
        )}
      </Button>
    </div>
  );
};

export default GoogleSignInButton;
