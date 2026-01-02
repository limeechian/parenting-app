// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: ParentDashboard.tsx
// Description: To display the main dashboard for parent users with overview statistics and quick access to features
// First Written on: Wednesday, 01-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state and lifecycle management
import React, { useEffect, useState } from "react";
// Import React Router hooks for navigation
import { useNavigate, useLocation } from "react-router-dom";
// Import API functions for fetching parent dashboard data
import {
  getParentProfile,
  getChildren,
  getParentStats,
  getParentRecentActivity,
} from "../services/api";
// Import Material-UI components for UI elements
import {
  CircularProgress,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
} from "@mui/material";
// Import lucide-react icons for dashboard elements
import {
  Heart,
  Baby,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Shield,
  X,
  Check,
  BotMessageSquare,
  UserPenIcon,
  Book,
  MessagesSquare,
  Users,
  Bookmark,
  Calendar,
  Clock,
} from "lucide-react";
// Import Poppins font weights for consistent typography
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";

/**
 * ParentDashboard Component
 * 
 * Main dashboard for parent users displaying:
 * - Overview statistics (children, diary entries, communities, etc.)
 * - Recent activity feed
 * - Quick access to key features
 * - Profile completion reminders
 * - Welcome message with user's name
 * 
 * @returns JSX element representing the parent dashboard
 */
const ParentDashboard: React.FC = () => {
  // Component state management
  const [displayName, setDisplayName] = useState("Parent");  // User's display name
  const [children, setChildren] = useState<any[]>([]);         // List of user's children
  const [loading, setLoading] = useState(true);                // Loading state during data fetch
  const [error, setError] = useState("");                      // Error message to display
  const [showProfileReminder, setShowProfileReminder] = useState(false);  // Whether to show profile completion reminder
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);    // Whether to show setup success dialog
  
  // Dashboard statistics state
  const [stats, setStats] = useState({
    children_count: 0,              // Number of children registered
    conversations_count: 0,          // Number of AI chat conversations
    diary_entries_count: 0,         // Number of diary entries created
    communities_joined_count: 0,     // Number of communities joined
    resources_count: 0,              // Number of resources saved
    days_active: 0,                  // Number of days user has been active
  });
  
  const [recentActivities, setRecentActivities] = useState<any[]>([]);  // Recent activity feed data
  
  // React Router hooks
  const navigate = useNavigate();   // Navigation function for programmatic routing
  const location = useLocation();    // Current route location

  /**
   * Helper function to get display name with fallback logic
   * Determines the best display name based on available profile data
   * 
   * @param profile - User profile object with name fields
   * @param email - User's email address
   * @returns Display name string
   */
  const getDisplayName = (profile: any, email: string): string => {
    // 1. Try full name
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    // 2. Try first name only
    if (profile.first_name) {
      return profile.first_name;
    }
    // 3. Try last name only
    if (profile.last_name) {
      return profile.last_name;
    }
    // 4. Fall back to email prefix (before @)
    if (email) {
      return email.split("@")[0];
    }
    // 5. Last resort
    return "Parent";
  };

  /**
   * Effect hook to check for profile setup completion
   * Shows success dialog if user just completed profile setup
   */
  useEffect(() => {
    // Check for setup completion flag in localStorage
    const setupCompleted = localStorage.getItem("setup_completed");
    if (setupCompleted === "true") {
      setShowSuccessDialog(true);
      // Clear the flag so dialog doesn't show again on subsequent visits
      localStorage.removeItem("setup_completed");
    }
  }, []);

  /**
   * Fetches all dashboard data from the API
   * Retrieves profile, children, statistics, and recent activities
   */
  const fetchData = async () => {
    setLoading(true);
    try {
      const [parentData, childrenData, statsData, activityData] =
        await Promise.all([
          getParentProfile(),
          getChildren(),
          getParentStats(),
          getParentRecentActivity(5).catch((error) => {
            console.error("❌ Error fetching recent activity:", error);
            console.error("Error details:", {
              message: error.message,
              stack: error.stack,
              response: error.response,
            });
            // Log the error but don't fail the entire dashboard load
            return { activities: [] };
          }),
        ]);

      setChildren(childrenData);
      setStats(statsData);
      setRecentActivities(activityData.activities || []);

      // Get email from localStorage and set display name with fallback logic
      const userEmail = localStorage.getItem("userEmail") || "";
      const displayNameValue = getDisplayName(parentData, userEmail);
      setDisplayName(displayNameValue);

      // Check if profile needs completion and show soft reminder
      // Use childrenData here since children state hasn't been updated yet in this render cycle
      const checkProfileCompletion = () => {
        const importantFields = [
          "first_name",
          "gender",
          "relationship_with_child",
          "parenting_style",
        ];
        const isProfileComplete = importantFields.every(
          (field) =>
            parentData[field] &&
            parentData[field] !== "" &&
            parentData[field] !== null,
        );

        const hasChildren = childrenData && childrenData.length > 0;

        // Show reminder if profile is incomplete OR no children added
        setShowProfileReminder(!isProfileComplete || !hasChildren);
      };

      checkProfileCompletion();
    } catch (e: any) {
      console.error("Dashboard fetch error:", e);
      // If authentication fails, redirect to login
      if (
        e.message &&
        (e.message.includes("401") || e.message.includes("Unauthorized"))
      ) {
        console.log("Authentication failed, redirecting to login");
        navigate("/login");
        return;
      }
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh data when navigating to the dashboard (location changes)
  useEffect(() => {
    if (location.pathname === "/parent-dashboard") {
      fetchData();
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload data when page becomes visible (e.g., user switches back to tab)
  useEffect(() => {
    let wasHidden = false;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        wasHidden = true;
      } else if (wasHidden) {
        // Page became visible after being hidden, reload data to get latest updates
        fetchData();
        wasHidden = false;
      }
    };

    const handleFocus = () => {
      // Window gained focus, reload data to get latest updates
      if (wasHidden) {
        fetchData();
        wasHidden = false;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading)
    return (
      <div
        className="flex justify-center items-center min-h-screen"
        style={{ backgroundColor: "#FAEFE2" }}
      >
        <div className="text-center">
          <CircularProgress sx={{ color: "#F2742C" }} />
          <p
            className="mt-4 font-medium font-['Poppins']"
            style={{ color: "#32332D" }}
          >
            Loading your dashboard...
          </p>
        </div>
      </div>
    );

  if (error)
    return (
      <div
        className="min-h-screen flex justify-center items-center"
        style={{ backgroundColor: "#FAEFE2" }}
      >
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center text-red-600">
            <Shield className="w-4 h-4 mr-2" />
            {error}
          </div>
        </div>
      </div>
    );

  return (
    <>
      {/* Success Dialog */}
      <Dialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: { xs: "16px", sm: "20px", md: "24px" },
            backgroundColor: "#EDEDED",
            position: "relative",
            margin: { xs: "16px", sm: "24px" },
            maxWidth: { xs: "calc(100% - 32px)", sm: "500px" },
            // border: '2px solid #F2742C'
          },
        }}
      >
        {/* X Close Button */}
        <button
          onClick={() => setShowSuccessDialog(false)}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-gray-100 z-10"
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
        <DialogTitle
          sx={{
            textAlign: "center",
            padding: { xs: "24px 20px 0 20px", sm: "28px 28px 0 28px", md: "32px 32px 0 32px" },
          }}
        >
          <div className="flex justify-center items-center mb-3 sm:mb-4">
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-110"
              style={{ backgroundColor: "#0F5648" }}
            >
              <Check className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
            </div>
          </div>
          <h2
            className="text-xl sm:text-2xl font-bold font-['Poppins'] mt-2 sm:mt-3 mb-2 sm:mb-3"
            style={{ color: "#32332D" }}
          >
            Setup Complete!
          </h2>
          <p
            className="text-sm sm:text-base max-w-md mx-auto mt-2"
            style={{ color: "#AA855B" }}
          >
            Thank you for providing your information. We'll use it to give you
            personalized parenting guidance and support.
          </p>
        </DialogTitle>

        <DialogContent
          sx={{
            padding: {
              xs: "0 20px 24px 20px",
              sm: "0 28px 28px 28px",
              md: "0 32px 32px 32px",
            },
          }}
        >
          <div
            className="rounded-xl py-3 px-4 sm:py-4 sm:px-6 mt-4 sm:mt-5"
            style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
          >
            <h3
              className="font-semibold mb-2 text-center font-['Poppins'] text-sm sm:text-base"
              style={{ color: "#32332D" }}
            >
              What's Next?
            </h3>
            <ul
              className="text-xs sm:text-sm space-y-2 sm:space-y-3 font-['Poppins']"
              style={{ color: "#AA855B" }}
            >
              <li className="flex items-center">
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span>Explore your personalized dashboard</span>
              </li>
              <li className="flex items-center">
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span>Start tracking your children's development</span>
              </li>
              <li className="flex items-center">
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span>Chat with our AI parenting assistant</span>
              </li>
              <li className="flex items-center">
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span>Create diary entries for your family</span>
              </li>
            </ul>
          </div>
        </DialogContent>

        <DialogActions
          sx={{
            padding: {
              xs: "0 20px 24px 20px",
              sm: "0 24px 28px 24px",
              md: "0 24px 32px 24px",
            },
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => setShowSuccessDialog(false)}
            className="flex items-center justify-center space-x-2 px-6 py-2.5 sm:px-8 sm:py-3 text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-sm sm:text-base shadow-lg hover:shadow-xl w-full sm:w-auto"
            style={{ backgroundColor: "#F2742C" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#E55A1F";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#F2742C";
            }}
          >
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </DialogActions>
      </Dialog>

      <div
        className="min-h-screen pt-20 py-8"
        style={{ backgroundColor: "#FAEFE2" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-3">
              <Heart className="w-8 h-8" style={{ color: "#F2742C" }} />
              <h1
                className="text-3xl font-bold font-['Poppins']"
                style={{ color: "#32332D" }}
              >
                Welcome back, {displayName}!
              </h1>
            </div>
            <p
              className="text-lg font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              Here's what's happening with your children's development today.
            </p>
          </div>

          {/* Soft Profile Completion Reminder */}
          {showProfileReminder && (
            <div
              className="mb-6 p-4 sm:p-6 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl"
              style={{
                backgroundColor: "#FFF4E6",
                border: "1px solid #F2742C",
              }}
            >
              <div className="flex flex-col sm:flex-row items-start space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="flex-shrink-0">
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-md"
                    style={{ backgroundColor: "#F2742C" }}
                  >
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3
                    className="text-lg sm:text-xl font-bold font-['Poppins'] mb-2"
                    style={{ color: "#32332D" }}
                  >
                    Complete Your Profile for Better Recommendations
                  </h3>
                  <p
                    className="text-sm sm:text-base font-['Poppins'] mb-4"
                    style={{ color: "#32332D" }}
                  >
                    Help us personalize your experience by adding more
                    information about yourself and your children. This helps our
                    AI provide more tailored parenting advice and
                    recommendations.
                  </p>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <button
                      onClick={() => navigate("/profile")}
                      className="flex items-center justify-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] shadow-lg hover:shadow-xl"
                      style={{ backgroundColor: "#F2742C" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#E55A1F";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#F2742C";
                      }}
                    >
                      <span>Complete Profile</span>
                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => setShowProfileReminder(false)}
                      className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base border rounded-xl transition-all duration-200 font-medium font-['Poppins']"
                      style={{
                        borderColor: "#AA855B",
                        color: "#AA855B",
                        backgroundColor: "transparent",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#EDEDED";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      Maybe Later
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid - 6 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
            {/* Children Count */}
            <div
              className="rounded-2xl shadow-xl p-4 transition-all duration-300 hover:shadow-2xl hover:scale-105"
              style={{
                backgroundColor: "#F5F5F5",
                border: "1px solid #AA855B",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                  style={{ backgroundColor: "#F2742C" }}
                >
                  <Baby className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5" style={{ color: "#0F5648" }} />
              </div>
              <Typography
                className="text-3xl font-bold font-['Poppins'] mb-1"
                style={{ color: "#32332D" }}
              >
                {stats.children_count}
              </Typography>
              <Typography
                className="text-sm font-['Poppins']"
                style={{ color: "#AA855B" }}
              >
                {stats.children_count === 1 ? "Child" : "Children"}
              </Typography>
            </div>

            {/* Days Active */}
            <div
              className="rounded-2xl shadow-xl p-4 transition-all duration-300 hover:shadow-2xl hover:scale-105"
              style={{
                backgroundColor: "#F5F5F5",
                border: "1px solid #AA855B",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                  style={{ backgroundColor: "#722F37" }}
                >
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5" style={{ color: "#0F5648" }} />
              </div>
              <Typography
                className="text-3xl font-bold font-['Poppins'] mb-1"
                style={{ color: "#32332D" }}
              >
                {stats.days_active}
              </Typography>
              <Typography
                className="text-sm font-['Poppins']"
                style={{ color: "#AA855B" }}
              >
                Days Active
              </Typography>
            </div>

            {/* Diary Entries */}
            <div
              className="rounded-2xl shadow-xl p-4 transition-all duration-300 hover:shadow-2xl hover:scale-105"
              style={{
                backgroundColor: "#F5F5F5",
                border: "1px solid #AA855B",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                  style={{ backgroundColor: "#0F5648" }}
                >
                  <Book className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5" style={{ color: "#0F5648" }} />
              </div>
              <Typography
                className="text-3xl font-bold font-['Poppins'] mb-1"
                style={{ color: "#32332D" }}
              >
                {stats.diary_entries_count}
              </Typography>
              <Typography
                className="text-sm font-['Poppins']"
                style={{ color: "#AA855B" }}
              >
                Diary Entries
              </Typography>
            </div>

            {/* AI Chats */}
            <div
              className="rounded-2xl shadow-xl p-4 transition-all duration-300 hover:shadow-2xl hover:scale-105"
              style={{
                backgroundColor: "#F5F5F5",
                border: "1px solid #AA855B",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                  style={{ backgroundColor: "#326586" }}
                >
                  <BotMessageSquare className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5" style={{ color: "#0F5648" }} />
              </div>
              <Typography
                className="text-3xl font-bold font-['Poppins'] mb-1"
                style={{ color: "#32332D" }}
              >
                {stats.conversations_count}
              </Typography>
              <Typography
                className="text-sm font-['Poppins']"
                style={{ color: "#AA855B" }}
              >
                AI Chats
              </Typography>
            </div>

            {/* Saved Resources */}
            <div
              className="rounded-2xl shadow-xl p-4 transition-all duration-300 hover:shadow-2xl hover:scale-105"
              style={{
                backgroundColor: "#F5F5F5",
                border: "1px solid #AA855B",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                  style={{ backgroundColor: "#AA855B" }}
                >
                  <Bookmark className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5" style={{ color: "#0F5648" }} />
              </div>
              <Typography
                className="text-3xl font-bold font-['Poppins'] mb-1"
                style={{ color: "#32332D" }}
              >
                {stats.resources_count}
              </Typography>
              <Typography
                className="text-sm font-['Poppins']"
                style={{ color: "#AA855B" }}
              >
                Saved Resources
              </Typography>
            </div>

            {/* Communities Joined */}
            <div
              className="rounded-2xl shadow-xl p-4 transition-all duration-300 hover:shadow-2xl hover:scale-105"
              style={{
                backgroundColor: "#F5F5F5",
                border: "1px solid #AA855B",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                  style={{ backgroundColor: "#AA855B" }}
                >
                  <MessagesSquare className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5" style={{ color: "#0F5648" }} />
              </div>
              <Typography
                className="text-3xl font-bold font-['Poppins'] mb-1"
                style={{ color: "#32332D" }}
              >
                {stats.communities_joined_count}
              </Typography>
              <Typography
                className="text-sm font-['Poppins']"
                style={{ color: "#AA855B" }}
              >
                Communities Joined
              </Typography>
            </div>
          </div>

          {/* Recent Activity + Quick Actions Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
            {/* Recent Activity - 60% width (3/5 columns) */}
            <Card
              className="lg:col-span-3 shadow-xl transition-all duration-300 hover:shadow-2xl"
              style={{
                border: "1px solid #AA855B",
                backgroundColor: "#F5F5F5",
                borderRadius: "16px",
              }}
            >
              <CardContent className="p-6 h-full flex flex-col">
                <div className="flex items-center space-x-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "#AA855B" }}
                  >
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3
                      className="text-lg font-bold font-['Poppins']"
                      style={{ color: "#32332D" }}
                    >
                      Recent Activity
                    </h3>
                    <p
                      className="text-xs font-['Poppins']"
                      style={{ color: "#AA855B" }}
                    >
                      Your latest interactions
                    </p>
                  </div>
                </div>

                <div className="space-y-3 flex-1 overflow-auto">
                  {recentActivities.length === 0 ? (
                    <div className="text-center py-8">
                      <p
                        className="text-sm font-['Poppins']"
                        style={{ color: "#AA855B" }}
                      >
                        No recent activity
                      </p>
                    </div>
                  ) : (
                    recentActivities.map((activity, idx) => {
                      const getActivityIcon = () => {
                        if (activity.type === "diary_entry") {
                          return <Book className="w-4 h-4 text-white" />;
                        } else if (activity.type === "ai_chat") {
                          return (
                            <BotMessageSquare className="w-4 h-4 text-white" />
                          );
                        } else if (activity.type === "community_post") {
                          return <Users className="w-4 h-4 text-white" />;
                        } else if (activity.type === "saved_resource") {
                          return <Bookmark className="w-4 h-4 text-white" />;
                        } else {
                          return <Bookmark className="w-4 h-4 text-white" />;
                        }
                      };

                      const formatTimeAgo = (timestamp: string) => {
                        if (!timestamp) return "Recently";
                        const date = new Date(timestamp);
                        const now = new Date();
                        const diffMs = now.getTime() - date.getTime();
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMs / 3600000);
                        const diffDays = Math.floor(diffMs / 86400000);

                        if (diffMins < 1) return "Just now";
                        if (diffMins < 60)
                          return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
                        if (diffHours < 24)
                          return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
                        if (diffDays < 7)
                          return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
                        return date.toLocaleDateString();
                      };

                      const iconColors: Record<string, string> = {
                        diary_entry: "#0F5648",
                        ai_chat: "#722F37",
                        saved_resource: "#AA855B",
                        community_post: "#326586",
                      };

                      return (
                        <div
                          key={`${activity.type}-${activity.id}-${idx}`}
                          className="flex items-start space-x-3 p-3 rounded-xl"
                          style={{ backgroundColor: "#FAEFE2" }}
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor:
                                iconColors[activity.type] || "#AA855B",
                            }}
                          >
                            {getActivityIcon()}
                          </div>
                          <div className="flex-1">
                            <p
                              className="text-sm font-medium font-['Poppins']"
                              style={{ color: "#32332D" }}
                            >
                              {activity.description || activity.title}
                            </p>
                            <p
                              className="text-xs font-['Poppins']"
                              style={{ color: "#AA855B" }}
                            >
                              {formatTimeAgo(activity.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions - 40% width (2/5 columns), stacked vertically */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Start AI Chat */}
              <button
                onClick={() => navigate("/ai-chat")}
                className="rounded-2xl shadow-xl p-6 transition-all duration-300 hover:shadow-2xl hover:scale-105 text-left flex-1"
                style={{
                  backgroundColor: "#F5F5F5",
                  border: "1px solid #AA855B",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#EDEDED";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#F5F5F5";
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-transform duration-300 hover:scale-110"
                    style={{ backgroundColor: "#326586" }}
                  >
                    <BotMessageSquare className="w-7 h-7 text-white" />
                  </div>
                  <ArrowRight
                    className="w-6 h-6"
                    style={{ color: "#AA855B" }}
                  />
                </div>
                <h3
                  className="text-xl font-bold font-['Poppins'] mb-2"
                  style={{ color: "#32332D" }}
                >
                  Start AI Chat
                </h3>
                <p
                  className="text-sm font-['Poppins']"
                  style={{ color: "#AA855B" }}
                >
                  Get personalized parenting advice from our AI assistants
                </p>
              </button>

              {/* Manage Profile */}
              <button
                onClick={() => navigate("/profile")}
                className="rounded-2xl shadow-xl p-6 transition-all duration-300 hover:shadow-2xl hover:scale-105 text-left flex-1"
                style={{
                  backgroundColor: "#F5F5F5",
                  border: "1px solid #AA855B",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#EDEDED";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#F5F5F5";
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-transform duration-300 hover:scale-110"
                    style={{ backgroundColor: "#F2742C" }}
                  >
                    <UserPenIcon className="w-7 h-7 text-white" />
                  </div>
                  <ArrowRight
                    className="w-6 h-6"
                    style={{ color: "#AA855B" }}
                  />
                </div>
                <h3
                  className="text-xl font-bold font-['Poppins'] mb-2"
                  style={{ color: "#32332D" }}
                >
                  Manage Profile
                </h3>
                <p
                  className="text-sm font-['Poppins']"
                  style={{ color: "#AA855B" }}
                >
                  Update your family information and preferences
                </p>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-12">
            <div
              className="flex items-center justify-center space-x-2"
              style={{ color: "#AA855B" }}
            >
              <Heart className="w-4 h-4" />
              <span className="text-sm font-medium font-['Poppins']">
                Building stronger families together
              </span>
              <Heart className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ParentDashboard;
