// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: AccountSettingsPage.tsx
// Description: To provide interface for users to manage account settings including password, email, and preferences
// First Written on: Thursday, 02-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state and lifecycle management
import React, { useState, useEffect } from "react";
// Import React Router hooks for navigation
import { useNavigate } from "react-router-dom";
// Import lucide-react icons for UI elements
import {
  Mail,
  Bell,
  Trash2,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";
// Import Material-UI components for UI elements
import {
  Card,
  CardContent,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
// Import toast notification components
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Import API base URL configuration
import { API_BASE_URL } from "../config/api";
// Import API functions for account management
import {
  deleteOwnAccount,
  getNotificationPreferences,
  updateNotificationPreferences,
  changePassword,
} from "../services/api";

/**
 * Helper function to create fetch request options
 * Includes authentication token and CORS settings
 * 
 * @param method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param body - Optional request body object (will be JSON stringified)
 * @returns Fetch options object with headers and configuration
 */
const getFetchOptions = (method: string, body?: any) => {
  const token = localStorage.getItem("auth_token");
  return {
    method,
    mode: "cors" as RequestMode,
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
};

/**
 * AccountSettingsPage Component
 * 
 * Provides interface for users to manage account settings including:
 * - Password change
 * - Email management (view only, change handled separately)
 * - Notification preferences (in-app and email)
 * - Account deletion
 * 
 * @returns JSX element representing the account settings page
 */
const AccountSettingsPage: React.FC = () => {
  // React Router hook
  const navigate = useNavigate();  // Navigation function for programmatic routing
  
  // Component state management
  const [loading, setLoading] = useState(true);  // Loading state during initial data fetch
  const [userEmail, setUserEmail] = useState("");  // User's email address
  const [userRole, setUserRole] = useState<
    "parent" | "professional" | "coordinator" | "content_manager" | "admin"
  >("parent");  // User's role

  // Password change state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);  // Whether password change modal is open
  const [currentPassword, setCurrentPassword] = useState("");  // Current password input
  const [newPassword, setNewPassword] = useState("");  // New password input
  const [confirmPassword, setConfirmPassword] = useState("");  // Password confirmation input
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);  // Toggle current password visibility
  const [showNewPassword, setShowNewPassword] = useState(false);  // Toggle new password visibility
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);  // Toggle confirm password visibility
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);  // Loading state during password change

  // Notifications state
  const [inAppNotifications, setInAppNotifications] = useState(true);  // In-app notification preference
  const [emailNotifications, setEmailNotifications] = useState(true);  // Email notification preference
  const [notificationsLoading, setNotificationsLoading] = useState(false);  // Loading state during notification update

  // Delete account state
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);  // Whether delete confirmation modal is open
  const [deleteConfirmText, setDeleteConfirmText] = useState("");  // Confirmation text input for account deletion
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);  // Loading state during account deletion

  // Form errors
  const [passwordErrors, setPasswordErrors] = useState({
    current: "",  // Error message for current password field
    new: "",      // Error message for new password field
    confirm: "",  // Error message for confirm password field
  });

  /**
   * Effect hook to fetch user data on component mount
   * Retrieves user email, role, and notification preferences
   */
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          navigate("/login");
          return;
        }

        // Fetch user info
        const response = await fetch(
          `${API_BASE_URL}/api/me`,
          getFetchOptions("GET"),
        );
        if (response.ok) {
          const userData = await response.json();
          setUserEmail(
            userData.email || localStorage.getItem("userEmail") || "",
          );
          setUserRole(userData.role || "parent");
        } else {
          setUserEmail(localStorage.getItem("userEmail") || "");
        }

        // Fetch notification preferences from API
        try {
          const preferences = await getNotificationPreferences();
          setInAppNotifications(preferences.in_app_notifications ?? true);
          setEmailNotifications(preferences.email_notifications ?? true);
        } catch (error) {
          console.error("Error fetching notification preferences:", error);
          // Use defaults on error
          setInAppNotifications(true);
          setEmailNotifications(true);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUserEmail(localStorage.getItem("userEmail") || "");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  /**
   * Handles password change form submission
   * Validates password requirements and updates user password
   */
  const handleChangePassword = async () => {
    setPasswordErrors({ current: "", new: "", confirm: "" });
    let hasError = false;

    if (!currentPassword) {
      setPasswordErrors((prev) => ({
        ...prev,
        current: "Please enter your current password",
      }));
      hasError = true;
    }

    if (!newPassword) {
      setPasswordErrors((prev) => ({
        ...prev,
        new: "Please enter a new password",
      }));
      hasError = true;
    } else if (newPassword.length < 8) {
      setPasswordErrors((prev) => ({
        ...prev,
        new: "Password must be at least 8 characters",
      }));
      hasError = true;
    }

    if (!confirmPassword) {
      setPasswordErrors((prev) => ({
        ...prev,
        confirm: "Please confirm your new password",
      }));
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      setPasswordErrors((prev) => ({
        ...prev,
        confirm: "Passwords do not match",
      }));
      hasError = true;
    }

    if (hasError) return;

    setChangePasswordLoading(true);
    try {
      const result = await changePassword(currentPassword, newPassword);

      toast.success(result.message || "Password changed successfully!", {
        position: "top-right",
        autoClose: 3000,
      });

      setShowChangePasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      const errorMessage =
        error.message || "Failed to change password. Please try again.";

      // Set specific field errors if available
      if (errorMessage.includes("Current password")) {
        setPasswordErrors((prev) => ({ ...prev, current: errorMessage }));
      } else if (
        errorMessage.includes("New password") ||
        errorMessage.includes("at least 8")
      ) {
        setPasswordErrors((prev) => ({ ...prev, new: errorMessage }));
      } else {
        setPasswordErrors((prev) => ({ ...prev, confirm: errorMessage }));
      }

      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      setChangePasswordLoading(false);
    }
  };

  // Handle notification toggles
  const handleNotificationToggle = async (
    type: "inapp" | "email",
    value: boolean,
  ) => {
    setNotificationsLoading(true);
    try {
      const updateData: {
        in_app_notifications?: boolean;
        email_notifications?: boolean;
      } = {};
      if (type === "inapp") {
        updateData.in_app_notifications = value;
      } else {
        updateData.email_notifications = value;
      }

      const updatedPreferences =
        await updateNotificationPreferences(updateData);

      // Update state with the response from server
      if (type === "inapp") {
        setInAppNotifications(updatedPreferences.in_app_notifications);
      } else {
        setEmailNotifications(updatedPreferences.email_notifications);
      }

      toast.success(
        `${type === "inapp" ? "In-App" : "Email"} notifications ${value ? "enabled" : "disabled"}`,
        {
          position: "top-right",
          autoClose: 2000,
        },
      );
    } catch (error) {
      toast.error("Failed to update notification settings. Please try again.", {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Handle delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setDeleteAccountLoading(true);
    try {
      await deleteOwnAccount();

      toast.success("Account deactivated successfully", {
        position: "top-right",
        autoClose: 2000,
      });

      // Clear localStorage and redirect to login
      localStorage.clear();
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      toast.error(
        error.message || "Failed to delete account. Please try again.",
        {
          position: "top-right",
          autoClose: 4000,
        },
      );
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen pt-20 flex items-center justify-center"
        style={{ backgroundColor: "#FAEFE2" }}
      >
        <div className="text-center">
          <CircularProgress sx={{ color: "#F2742C" }} />
          <p
            className="mt-4 font-medium font-['Poppins']"
            style={{ color: "#32332D" }}
          >
            Loading account settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pt-20 sm:pt-20 md:pt-24 py-4 sm:py-6 md:py-8 font-['Poppins']"
      style={{ backgroundColor: "#FAEFE2" }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2"
              style={{ color: "#32332D" }}
            >
              {userRole === "coordinator" ||
              userRole === "content_manager" ||
              userRole === "admin"
                ? "Notification Settings"
                : "Account Settings"}
            </h1>
            <p className="text-xs sm:text-sm" style={{ color: "#AA855B" }}>
              {userRole === "coordinator" ||
              userRole === "content_manager" ||
              userRole === "admin"
                ? "Manage your notification preferences"
                : "Manage your account security and preferences"}
            </p>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* Top Row: Email & Password | Notifications (50-50 split) */}
          <div
            className={`grid grid-cols-1 ${userRole === "coordinator" || userRole === "content_manager" || userRole === "admin" ? "" : "lg:grid-cols-2"} gap-4 sm:gap-5 md:gap-6`}
          >
            {/* Email & Password Card - Hidden for coordinators, content managers, and admins */}
            {userRole !== "coordinator" &&
              userRole !== "content_manager" &&
              userRole !== "admin" && (
                <Card
                  className="shadow-xl transition-all duration-300 hover:shadow-2xl"
                  style={{
                    border: "1px solid #AA855B",
                    backgroundColor: "#F5F5F5",
                    borderRadius: "12px",
                  }}
                >
                  <CardContent className="p-4 sm:p-5 md:p-6">
                    <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-5 md:mb-6">
                      <div
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: "#326586" }}
                      >
                        <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div>
                        <h3
                          className="text-base sm:text-lg font-bold font-['Poppins']"
                          style={{ color: "#32332D" }}
                        >
                          Password
                        </h3>
                        <p
                          className="text-[10px] sm:text-xs font-['Poppins']"
                          style={{ color: "#AA855B" }}
                        >
                          Update your account password
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      {/* Email Display (Read-only) */}
                      <div>
                        <label
                          className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
                          style={{ color: "#32332D" }}
                        >
                          Email Address
                        </label>
                        <div
                          className="px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg border text-xs sm:text-sm break-all"
                          style={{
                            backgroundColor: "#EDEDED",
                            borderColor: "#F0DCC9",
                            color: "#64635E",
                          }}
                        >
                          {userEmail}
                        </div>
                      </div>

                      {/* Change Password Button */}
                      <button
                        onClick={() => setShowChangePasswordModal(true)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 border"
                        style={{
                          borderColor: "#AA855B",
                          color: "#AA855B",
                          backgroundColor: "transparent",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#FDF2E8";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        Change Password
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Notifications Card */}
            <Card
              className="shadow-xl transition-all duration-300 hover:shadow-2xl"
              style={{
                border: "1px solid #AA855B",
                backgroundColor: "#F5F5F5",
                borderRadius: "12px",
              }}
            >
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-5 md:mb-6">
                  <div
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "#0F5648" }}
                  >
                    <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h3
                      className="text-base sm:text-lg font-bold font-['Poppins']"
                      style={{ color: "#32332D" }}
                    >
                      Notifications
                    </h3>
                    <p
                      className="text-[10px] sm:text-xs font-['Poppins']"
                      style={{ color: "#AA855B" }}
                    >
                      Control how you receive notifications
                    </p>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {/* In-App Notifications */}
                  <div
                    className="flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl"
                    style={{ backgroundColor: "#FAEFE2" }}
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                      <Bell
                        className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                        style={{ color: "#F2742C" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-xs sm:text-sm font-medium font-['Poppins']"
                          style={{ color: "#32332D" }}
                        >
                          In-App Notifications
                        </p>
                        <p
                          className="text-[10px] sm:text-xs font-['Poppins']"
                          style={{ color: "#AA855B" }}
                        >
                          Receive instant notifications when you're using the
                          app
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={inAppNotifications}
                        onChange={(e) =>
                          handleNotificationToggle("inapp", e.target.checked)
                        }
                        disabled={notificationsLoading}
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0F5648]"></div>
                    </label>
                  </div>

                  {/* Email Notifications */}
                  <div
                    className="flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl"
                    style={{ backgroundColor: "#FAEFE2" }}
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                      <Mail
                        className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                        style={{ color: "#326586" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-xs sm:text-sm font-medium font-['Poppins']"
                          style={{ color: "#32332D" }}
                        >
                          Email Notifications
                        </p>
                        <p
                          className="text-[10px] sm:text-xs font-['Poppins']"
                          style={{ color: "#AA855B" }}
                        >
                          {userRole === "professional"
                            ? "Receive email alerts for registration status updates"
                            : userRole === "coordinator" ||
                                userRole === "content_manager" ||
                                userRole === "admin"
                              ? "Receive email alerts for important updates"
                              : "Receive email alerts for important updates"}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={emailNotifications}
                        onChange={(e) =>
                          handleNotificationToggle("email", e.target.checked)
                        }
                        disabled={notificationsLoading}
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0F5648]"></div>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row: Delete Account (Full Width) - Hidden for coordinators, content managers, and admins */}
          {userRole !== "coordinator" &&
            userRole !== "content_manager" &&
            userRole !== "admin" && (
              <Card
                className="shadow-xl transition-all duration-300 hover:shadow-2xl"
                style={{
                  border: "1px solid #EF4444",
                  backgroundColor: "#F5F5F5",
                  borderRadius: "12px",
                }}
              >
                <CardContent className="p-4 sm:p-5 md:p-6">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-5 md:mb-6">
                    <div
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: "#EF4444" }}
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <h3
                        className="text-base sm:text-lg font-bold font-['Poppins']"
                        style={{ color: "#32332D" }}
                      >
                        Delete Account
                      </h3>
                      <p
                        className="text-[10px] sm:text-xs font-['Poppins']"
                        style={{ color: "#AA855B" }}
                      >
                        Permanently delete your account and all data
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle
                          className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5"
                          style={{ color: "#EF4444" }}
                        />
                        <div>
                          <p
                            className="text-xs sm:text-sm font-medium font-['Poppins'] mb-1.5 sm:mb-2"
                            style={{ color: "#722F37" }}
                          >
                            Warning: This action cannot be undone
                          </p>
                          <p
                            className="text-[10px] sm:text-xs font-['Poppins']"
                            style={{ color: "#64635E" }}
                          >
                            Deleting your account will permanently remove all
                            your data including:
                          </p>
                          <ul
                            className="text-[10px] sm:text-xs font-['Poppins'] mt-1.5 sm:mt-2 space-y-0.5 sm:space-y-1 list-disc list-inside"
                            style={{ color: "#64635E" }}
                          >
                            <li>Your profile and family information</li>
                            <li>All diary entries and attachments</li>
                            <li>All community posts and comments</li>
                            <li>All AI chat conversations</li>
                            <li>All saved resources and preferences</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowDeleteConfirmModal(true)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200"
                      style={{
                        backgroundColor: "#EF4444",
                        color: "#FFFFFF",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#DC2626";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#EF4444";
                      }}
                    >
                      Delete My Account
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      </div>

      {/* Change Password Modal */}
      <Dialog
        open={showChangePasswordModal}
        onClose={() => {
          setShowChangePasswordModal(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setPasswordErrors({ current: "", new: "", confirm: "" });
        }}
        maxWidth="sm"
        fullWidth
        disableScrollLock={true}
        PaperProps={{
          sx: {
            borderRadius: { xs: "16px", sm: "16px", md: "20px" },
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
            border: "1px solid #AA855B",
            margin: { xs: "16px", sm: "24px" },
            maxWidth: { xs: "calc(100% - 32px)", sm: "500px" },
          },
        }}
      >
        <DialogTitle
          sx={{
            backgroundColor: "#FAEFE2",
            color: "#32332D",
            fontWeight: 600,
            fontSize: { xs: "1rem", sm: "1.125rem", md: "1.25rem" },
            fontFamily: "'Poppins', sans-serif",
            borderBottom: "1px solid #AA855B",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: { xs: "12px 16px", sm: "16px 24px" },
          }}
        >
          <span>Change Password</span>
          <button
            onClick={() => {
              setShowChangePasswordModal(false);
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
              setPasswordErrors({ current: "", new: "", confirm: "" });
            }}
            className="p-1 rounded-full transition-all duration-200"
            style={{ color: "#AA855B" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#F0DCC9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </DialogTitle>
        <DialogContent
          sx={{
            padding: { xs: "16px", sm: "20px", md: "24px" },
            backgroundColor: "#F5F5F5",
          }}
        >
          <div className="space-y-4">
            <div className="mt-4">
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "#32332D" }}
              >
                Current Password *
              </label>
              <div className="relative">
                <TextField
                  type={showCurrentPassword ? "text" : "password"}
                  fullWidth
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setPasswordErrors((prev) => ({ ...prev, current: "" }));
                  }}
                  placeholder="Enter current password"
                  error={!!passwordErrors.current}
                  helperText={passwordErrors.current}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      backgroundColor: currentPassword ? "#F5F5F5" : "#EDEDED",
                      fontFamily: "'Poppins', sans-serif",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: passwordErrors.current
                          ? "#EF4444"
                          : "#AA855B",
                      },
                    },
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  style={{ color: "#AA855B" }}
                >
                  {showCurrentPassword ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "#32332D" }}
              >
                New Password *
              </label>
              <div className="relative">
                <TextField
                  type={showNewPassword ? "text" : "password"}
                  fullWidth
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordErrors((prev) => ({ ...prev, new: "" }));
                  }}
                  placeholder="Enter new password (min. 8 characters)"
                  error={!!passwordErrors.new}
                  helperText={passwordErrors.new}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      backgroundColor: newPassword ? "#F5F5F5" : "#EDEDED",
                      fontFamily: "'Poppins', sans-serif",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: passwordErrors.new ? "#EF4444" : "#AA855B",
                      },
                    },
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  style={{ color: "#AA855B" }}
                >
                  {showNewPassword ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "#32332D" }}
              >
                Confirm New Password *
              </label>
              <div className="relative">
                <TextField
                  type={showConfirmPassword ? "text" : "password"}
                  fullWidth
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordErrors((prev) => ({ ...prev, confirm: "" }));
                  }}
                  placeholder="Confirm new password"
                  error={!!passwordErrors.confirm}
                  helperText={passwordErrors.confirm}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      backgroundColor: confirmPassword ? "#F5F5F5" : "#EDEDED",
                      fontFamily: "'Poppins', sans-serif",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: passwordErrors.confirm
                          ? "#EF4444"
                          : "#AA855B",
                      },
                    },
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  style={{ color: "#AA855B" }}
                >
                  {showConfirmPassword ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogActions
          sx={{
            padding: { xs: "12px 16px", sm: "16px 24px" },
            backgroundColor: "#FAEFE2",
            borderTop: "1px solid #AA855B",
            gap: "8px",
            flexDirection: { xs: "column-reverse", sm: "row" },
          }}
        >
          <button
            onClick={() => {
              setShowChangePasswordModal(false);
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
              setPasswordErrors({ current: "", new: "", confirm: "" });
            }}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-sm sm:text-base"
            style={{
              borderColor: "#AA855B",
              color: "#AA855B",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#F0DCC9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleChangePassword}
            disabled={changePasswordLoading}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-sm sm:text-base shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#0F5648" }}
            onMouseEnter={(e) => {
              if (!changePasswordLoading) {
                e.currentTarget.style.backgroundColor = "#0A4538";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#0F5648";
            }}
          >
            {changePasswordLoading ? (
              <CircularProgress size={20} sx={{ color: "white" }} />
            ) : (
              "Change Password"
            )}
          </button>
        </DialogActions>
      </Dialog>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3
                className="text-lg font-semibold font-['Poppins']"
                style={{ color: "#32332D" }}
              >
                Delete Account
              </h3>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeleteConfirmText("");
                }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#EF4444" }}
                >
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4
                    className="font-medium font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    {userEmail}
                  </h4>
                  <p
                    className="text-xs font-['Poppins']"
                    style={{ color: "#64635E" }}
                  >
                    Account deletion is permanent
                  </p>
                </div>
              </div>
              <div
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: "#FDECEF",
                  border: "1px solid #F0DCC9",
                }}
              >
                <p
                  className="text-sm font-medium mb-2 font-['Poppins']"
                  style={{ color: "#EF4444" }}
                >
                  ⚠️ Warning: This action cannot be undone
                </p>
                <p
                  className="text-sm font-['Poppins']"
                  style={{ color: "#64635E" }}
                >
                  Deleting your account will permanently remove all your data
                  including your profile, family information, diary entries,
                  attachments, community posts, AI chat conversations, and saved
                  resources.
                </p>
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-2 font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  Type <strong>DELETE</strong> to confirm:
                </label>
                <TextField
                  fullWidth
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      backgroundColor: deleteConfirmText
                        ? "#F5F5F5"
                        : "#EDEDED",
                      fontFamily: "'Poppins', sans-serif",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          deleteConfirmText === "DELETE"
                            ? "#AA855B"
                            : "#EF4444",
                      },
                    },
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg font-medium border font-['Poppins']"
                style={{ borderColor: "#AA855B", color: "#AA855B" }}
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeleteConfirmText("");
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg font-medium font-['Poppins'] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#EF4444", color: "#FFFFFF" }}
                onClick={handleDeleteAccount}
                disabled={
                  deleteAccountLoading || deleteConfirmText !== "DELETE"
                }
              >
                {deleteAccountLoading ? (
                  <CircularProgress size={20} sx={{ color: "white" }} />
                ) : (
                  "Delete Account"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        style={{
          zIndex: 9999,
          position: "fixed",
        }}
        toastStyle={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: "14px",
          zIndex: 9999,
        }}
      />
    </div>
  );
};

export default AccountSettingsPage;
