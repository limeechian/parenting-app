// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: Navigation.tsx
// Description: To provide the main navigation bar component with menu items and user profile dropdown
// First Written on: Monday, 06-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state and lifecycle management
import React, { useState, useEffect, useCallback } from "react";
// Import React Router hooks for navigation and location tracking
import { Link, useLocation, useNavigate } from "react-router-dom";
// Import icons from lucide-react for navigation menu items
import {
  Home,
  Menu as MenuIcon,
  X as XIcon,
  Settings,
  ChevronDown,
  Book,
  LogOut,
  UserPenIcon,
  MessagesSquare,
  BotMessageSquare,
  Bell,
  MessageSquare,
  HeartHandshake,
  LibraryBig,
  SlidersHorizontal,
} from "lucide-react";
// Import API base URL configuration
import { API_BASE_URL } from "../config/api";
// Import notification-related API functions
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/api";

/**
 * Returns navigation menu items based on user role
 * Different user roles have access to different navigation options
 *
 * @param role - The user's role (parent, professional, coordinator, content_manager, admin)
 * @returns Array of navigation items with path, label, and icon
 */
const getNavItems = (role: string) => {
  if (role === "professional") {
    // Professionals can only access their dashboard (for managing services and promotional materials)
    // No Community, Messages, Diary, or AI Chat access per deliverables
    return [
      { path: "/professional-dashboard", label: "Dashboard", icon: Home },
    ];
  }

  if (role === "coordinator") {
    return [{ path: "/coordinator-dashboard", label: "Dashboard", icon: Home }];
  }

  if (role === "content_manager") {
    return [{ path: "/content-manager", label: "Dashboard", icon: Home }];
  }

  if (role === "admin") {
    return [{ path: "/admin-dashboard", label: "Dashboard", icon: Home }];
  }

  // Default nav items for parent users
  // Order: Most frequently used features first, then social/community, then professional help, then private communication
  // Note: Messages is only available for parent users (messaging is parent-to-parent only)
  return [
    { path: "/parent-dashboard", label: "Dashboard", icon: Home },
    { path: "/diary", label: "Diary", icon: Book },
    { path: "/ai-chat", label: "AI Chat", icon: BotMessageSquare },
    { path: "/community", label: "Community", icon: MessagesSquare },
    { path: "/resources", label: "Resources", icon: LibraryBig },
    {
      path: "/professional-directory",
      label: "Professionals",
      icon: HeartHandshake,
    },
    { path: "/messages", label: "Messages", icon: MessageSquare },
  ];
};

/**
 * Notification interface
 * Defines the structure of a notification object
 */
interface Notification {
  notification_id: number; // Unique identifier for the notification
  notification_type: string; // Type of notification (e.g., 'comment', 'like', 'message')
  title: string; // Notification title
  content: string; // Notification content/message
  actor_name?: string; // Name of the user who triggered the notification
  related_post_id?: number; // ID of related post (if applicable)
  related_comment_id?: number; // ID of related comment (if applicable)
  related_community_id?: number; // ID of related community (if applicable)
  related_message_id?: number; // ID of related message (if applicable)
  created_at: string; // Timestamp when notification was created
  is_read: boolean; // Whether the notification has been read
}

/**
 * Navigation Component
 *
 * Main navigation bar component that provides:
 * - Role-based navigation menu items
 * - User profile dropdown
 * - Notifications dropdown with real-time updates via SSE
 * - Mobile-responsive menu
 * - Authentication state management
 *
 * @returns JSX element representing the navigation bar
 */
const Navigation: React.FC = () => {
  // State for managing UI interactions
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Whether mobile menu is open
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false); // Whether user dropdown is open
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false); // Whether notifications dropdown is open
  const [isScrolled, setIsScrolled] = useState(false); // Whether page is scrolled (for border effect)

  // State for notifications
  const [notifications, setNotifications] = useState<Notification[]>([]); // List of unread notifications
  const [unreadCount, setUnreadCount] = useState(0); // Count of unread notifications

  // React Router hooks
  const location = useLocation(); // Current route location
  const navigate = useNavigate(); // Navigation function for programmatic routing

  /**
   * Effect hook to handle scroll event for navigation bar border effect
   * Adds a border and shadow when user scrolls down the page
   */
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20); // Set scrolled state if scroll position > 20px
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll); // Cleanup on unmount
  }, []);

  // State for current user information
  const [user, setUser] = useState({
    name: "Parent",
    role: "parent",
    avatar: "",
  });

  /**
   * Helper function to get display name with fallback logic
   * Determines the best display name based on user role and available profile data
   *
   * @param profile - User profile object with name fields
   * @param email - User's email address
   * @param role - User's role (parent, professional, etc.)
   * @returns Display name string
   */
  const getDisplayName = (
    profile: any,
    email: string,
    role: string,
  ): string => {
    // For professionals, use business_name
    if (role === "professional" && profile?.business_name) {
      return profile.business_name;
    }

    // For parents, use name hierarchy
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (profile?.last_name) {
      return profile.last_name;
    }

    // Fall back to email prefix
    if (email) {
      return email.split("@")[0];
    }

    // Last resort based on role
    if (role === "professional") return "Professional";
    if (role === "coordinator") return "Coordinator";
    if (role === "admin") return "Admin";
    return "Parent";
  };

  /**
   * Effect hook to fetch and display user profile information
   * Only fetches profile data when on protected routes to avoid unnecessary API calls
   * Handles different profile endpoints based on user role
   */
  useEffect(() => {
    // List of protected routes that require user authentication
    const protectedRoutes = [
      "/parent-dashboard",
      "/ai-chat",
      "/profile",
      "/professional-dashboard",
      "/professional-profile",
      "/coordinator-dashboard",
      "/content-manager",
      "/admin-dashboard",
      "/diary",
      "/community",
      "/communities",
      "/messages",
      "/account-settings",
      "/notifications",
      "/professional-directory",
      "/resources",
    ];
    // Only fetch profile if current route is a protected route
    if (protectedRoutes.some((route) => location.pathname.startsWith(route))) {
      const token = localStorage.getItem("auth_token");
      const userEmail = localStorage.getItem("userEmail") || "";

      // Fetch user role from /me endpoint
      fetch(`${API_BASE_URL}/api/me`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => res.json())
        .then(async (userData) => {
          const role = userData.role || "parent";

          // Fetch profile based on role (coordinators and admins may not have a separate profile)
          if (role === "coordinator" || role === "admin") {
            // Coordinators and admins don't have a separate profile endpoint, use email/name from /me
            setUser({
              name: getDisplayName(userData, userEmail, role),
              role: role,
              avatar: userData.profile_picture_url || "",
            });
          } else {
            const profileEndpoint =
              role === "professional"
                ? `${API_BASE_URL}/api/profile/professional`
                : `${API_BASE_URL}/api/profile/parent`;

            try {
              const profileRes = await fetch(profileEndpoint, {
                credentials: "include",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });

              if (profileRes.ok) {
                const profileData = await profileRes.json();
                const displayName = getDisplayName(
                  profileData,
                  userEmail,
                  role,
                );

                setUser({
                  name: displayName,
                  role: role,
                  avatar: profileData.profile_picture_url || "",
                });
              } else {
                // Profile doesn't exist yet, use email fallback
                setUser({
                  name: getDisplayName({}, userEmail, role),
                  role: role,
                  avatar: "",
                });
              }
            } catch (error) {
              // Fallback to email prefix
              setUser({
                name: getDisplayName({}, userEmail, role),
                role: role,
                avatar: "",
              });
            }
          }
        })
        .catch(() => {
          const userEmail = localStorage.getItem("userEmail") || "";
          setUser({
            name: userEmail ? userEmail.split("@")[0] : "Parent",
            role: "parent",
            avatar: "",
          });
        });
    }
  }, [location.pathname]);

  // Listen for profile updates from other components
  useEffect(() => {
    const handleProfileUpdate = () => {
      // Re-fetch profile data when profile is updated
      const protectedRoutes = [
        "/parent-dashboard",
        "/ai-chat",
        "/profile",
        "/professional-dashboard",
        "/professional-profile",
        "/coordinator-dashboard",
        "/content-manager",
        "/admin-dashboard",
        "/diary",
        "/community",
        "/communities",
        "/messages",
        "/account-settings",
        "/notifications",
        "/professional-directory",
        "/resources",
      ];
      if (
        protectedRoutes.some((route) => location.pathname.startsWith(route))
      ) {
        const token = localStorage.getItem("auth_token");
        const userEmail = localStorage.getItem("userEmail") || "";

        fetch(`${API_BASE_URL}/api/me`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
          .then((res) => res.json())
          .then(async (userData) => {
            const role = userData.role || "parent";

            // Coordinators and admins don't have a separate profile endpoint
            if (role === "coordinator" || role === "admin") {
              setUser({
                name: getDisplayName(userData, userEmail, role),
                role: role,
                avatar: userData.profile_picture_url || "",
              });
            } else {
              const profileEndpoint =
                role === "professional"
                  ? `${API_BASE_URL}/api/profile/professional`
                  : `${API_BASE_URL}/api/profile/parent`;

              try {
                const profileRes = await fetch(profileEndpoint, {
                  credentials: "include",
                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                });

                if (profileRes.ok) {
                  // Profile exists - use profile data for display name and avatar
                  const profileData = await profileRes.json();
                  const displayName = getDisplayName(
                    profileData,
                    userEmail,
                    role,
                  );

                  setUser({
                    name: displayName,
                    role: role,
                    avatar: profileData.profile_picture_url || "",
                  });
                } else if (profileRes.status === 404) {
                  // Profile doesn't exist yet (user skipped setup), use email fallback
                  // This allows navigation to display user info even without profile
                  setUser({
                    name: getDisplayName({}, userEmail, role),
                    role: role,
                    avatar: "",
                  });
                }
              } catch (error) {
                console.error("Error refreshing profile:", error);
                // Fallback to email prefix on error
                // Ensures navigation always shows user info even if profile fetch fails
                setUser({
                  name: getDisplayName({}, userEmail, role),
                  role: role,
                  avatar: "",
                });
              }
            }
          })
          .catch((error) => console.error("Error refreshing profile:", error));
      }
    };

    // Listen for custom events when profile is updated
    window.addEventListener("profileUpdated", handleProfileUpdate);

    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, [location.pathname]);

  /**
   * Formats a timestamp to a human-readable relative time string
   * Converts timestamps to formats like "5m ago", "2h ago", "3d ago", or date string
   *
   * @param timestamp - ISO timestamp string
   * @returns Formatted relative time string
   */
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return "Unknown";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  /**
   * Fetches all notifications and calculates unread count
   * Note: Unread count is calculated from the notifications list, not from a separate API call
   * Real-time updates are handled via Server-Sent Events (SSE)
   *
   * @returns Promise that resolves when notifications are fetched
   */
  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    try {
      // Fetch all notifications
      const allData = await getNotifications();
      // Transform backend response to match frontend interface
      const transformedNotifications: Notification[] = allData.map(
        (n: any) => ({
          notification_id: n.notification_id,
          notification_type: n.notification_type,
          title: n.title || "",
          content: n.content || "",
          actor_name: n.actor_name,
          related_post_id: n.related_post_id,
          related_comment_id: n.related_comment_id,
          related_community_id: n.related_community_id,
          related_message_id: n.related_message_id,
          created_at: n.created_at,
          is_read: n.is_read,
        }),
      );

      // Filter to only show unread notifications in dropdown (limit to 5 most recent unread)
      const unreadNotifications = transformedNotifications
        .filter((n) => !n.is_read)
        .slice(0, 5);

      setNotifications(unreadNotifications);

      // Calculate unread count from the notifications list (no separate API call needed)
      const unreadCount = transformedNotifications.filter(
        (n) => !n.is_read,
      ).length;
      setUnreadCount(unreadCount);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      // On error, set empty state
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  /**
   * Effect hook to set up real-time notifications via Server-Sent Events (SSE)
   * Establishes SSE connection for live notification updates
   * Performs initial notification fetch and handles SSE events
   */
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    // Initial fetch
    fetchNotifications();

    // Set up Server-Sent Events (SSE) for real-time notifications
    // Note: EventSource automatically sends cookies, so we don't need to pass token in query
    // The backend will check cookies via get_current_user_flexible
    // However, some browsers may have issues, so we'll try with query param as fallback
    const streamUrl = `${API_BASE_URL}/api/notifications/stream`;

    console.log("🔵 SSE: Attempting to connect to:", streamUrl);
    console.log(
      "🔵 SSE: Using cookies for authentication (EventSource sends cookies automatically)",
    );
    const eventSource = new EventSource(streamUrl, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          console.log("SSE connection established");
          // Update unread count from initial connection message
          if (typeof data.unread_count === "number") {
            setUnreadCount(data.unread_count);
          }
          return;
        }

        if (data.type === "new_notification" && data.notification) {
          // Add new notification to the list
          const newNotification: Notification = {
            notification_id: data.notification.notification_id,
            notification_type: data.notification.notification_type,
            title: data.notification.title || "",
            content: data.notification.content || "",
            actor_name: data.notification.actor_name,
            related_post_id: data.notification.related_post_id,
            related_comment_id: data.notification.related_comment_id,
            related_community_id: data.notification.related_community_id,
            related_message_id: data.notification.related_message_id,
            created_at: data.notification.created_at,
            is_read: data.notification.is_read,
          };

          // Add to notifications list if unread (update UI instantly)
          if (!newNotification.is_read) {
            setNotifications((prev) => {
              const updated = [
                newNotification,
                ...prev.filter(
                  (n) => n.notification_id !== newNotification.notification_id,
                ),
              ];
              return updated.slice(0, 5); // Keep only 5 most recent
            });
            setUnreadCount((prev) => prev + 1);
          }

          // Don't call fetchNotifications() here - we already updated the UI from SSE data
          // This prevents unnecessary API calls to unread count endpoint
        }
      } catch (error) {
        console.error("Error parsing SSE message:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("🔵 SSE: Connection error:", error);
      console.error("🔵 SSE: readyState:", eventSource.readyState); // 0=CONNECTING, 1=OPEN, 2=CLOSED
      console.error("🔵 SSE: URL:", streamUrl);
      // EventSource will automatically reconnect
      // Only do a fallback fetch if connection is closed (not just a temporary error)
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log("🔵 SSE: Connection closed, doing fallback fetch");
        fetchNotifications();
      }
    };

    eventSource.onopen = () => {
      console.log(
        "🔵 SSE: Connection opened successfully, readyState:",
        eventSource.readyState,
      );
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, [fetchNotifications]);

  // Listen for notification status changes (from NotificationsPage)
  // This is triggered when user marks notifications as read/unread on NotificationsPage
  useEffect(() => {
    const handleNotificationStatusChange = () => {
      // Refetch notifications to get updated read status
      // This will also update the unread count (calculated from notifications list)
      fetchNotifications();
    };

    window.addEventListener(
      "notificationStatusChanged",
      handleNotificationStatusChange,
    );
    return () => {
      window.removeEventListener(
        "notificationStatusChanged",
        handleNotificationStatusChange,
      );
    };
  }, [fetchNotifications]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (isUserMenuOpen && !target.closest(".user-dropdown")) {
        setIsUserMenuOpen(false);
      }

      if (isNotificationsOpen && !target.closest(".notifications-dropdown")) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserMenuOpen, isNotificationsOpen]);

  /**
   * Handles click on a notification item
   * Marks notification as read and navigates to related content
   *
   * @param notification - The notification that was clicked
   */
  const handleNotificationClick = async (notification: Notification) => {
    // Close notifications dropdown first
    setIsNotificationsOpen(false);

    // Mark notification as read if not already read (do this in background, don't wait)
    if (!notification.is_read) {
      markNotificationAsRead(notification.notification_id)
        .then(() => {
          setNotifications((prev) =>
            prev.map((n) =>
              n.notification_id === notification.notification_id
                ? { ...n, is_read: true }
                : n,
            ),
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        })
        .catch((error) => {
          console.error("Error marking notification as read:", error);
        });
    }

    // Navigate to the related content immediately
    if (notification.related_message_id) {
      // Navigate to messages page with messageId to auto-select conversation and scroll to message
      navigate(`/messages?messageId=${notification.related_message_id}`);
    } else if (
      notification.related_post_id &&
      notification.related_community_id
    ) {
      // Navigate to specific post in community, with commentId if available
      let url = `/community?communityId=${notification.related_community_id}&postId=${notification.related_post_id}`;
      if (notification.related_comment_id) {
        url += `&commentId=${notification.related_comment_id}`;
      }
      navigate(url);
    } else if (notification.related_community_id) {
      // Navigate to community page
      // For "community_joined" notifications, show Members tab
      const tab =
        notification.notification_type === "community_joined"
          ? "members"
          : "posts";
      navigate(
        `/community?communityId=${notification.related_community_id}&tab=${tab}`,
      );
    } else if (
      notification.notification_type === "professional_profile_submission"
    ) {
      // Coordinator: Navigate to Applications tab with timestamp to force reload
      navigate(`/coordinator-dashboard?tab=applications&refresh=${Date.now()}`);
    } else if (
      notification.notification_type === "promotional_material_submission"
    ) {
      // Coordinator: Navigate to Promotions tab with timestamp to force reload
      navigate(`/coordinator-dashboard?tab=promotions&refresh=${Date.now()}`);
    } else if (notification.notification_type === "approval") {
      // Professional: Navigate to Professional Dashboard (profile approved)
      navigate(`/professional-dashboard?refresh=${Date.now()}`);
    } else if (notification.notification_type === "promotion_approved") {
      // Professional: Navigate to Professional Dashboard Promotional Materials tab for approved promotional materials
      navigate(`/professional-dashboard?tab=promotional&refresh=${Date.now()}`);
    } else if (notification.notification_type === "rejection") {
      // Professional: Navigate to Professional Profile for profile rejections (with refresh to show updated status)
      navigate(`/professional-profile?refresh=${Date.now()}`);
    } else if (notification.notification_type === "promotion_rejected") {
      // Professional: Navigate to Professional Dashboard Promotional Materials tab for rejected promotional materials
      navigate(`/professional-dashboard?tab=promotional&refresh=${Date.now()}`);
    } else if (
      notification.notification_type === "profile_archived" ||
      notification.notification_type === "profile_unarchived"
    ) {
      // Professional: Navigate to Professional Dashboard for status changes
      navigate(`/professional-dashboard?refresh=${Date.now()}`);
    } else if (notification.notification_type === "report_created") {
      // Content Manager: Navigate to Moderation tab for report notifications
      navigate(`/content-manager?tab=moderation&refresh=${Date.now()}`);
    } else {
      // If no specific content to navigate to, go to notifications page
      navigate("/notifications");
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  /**
   * Checks if a navigation path is currently active
   * Handles special cases for routes with sub-paths
   *
   * @param path - The navigation path to check
   * @returns Boolean indicating if the path is active
   */
  const isActive = (path: string) => {
    // For community route, also match /communities/* paths (community detail pages)
    if (path === "/community") {
      return (
        location.pathname === path ||
        location.pathname.startsWith("/communities/")
      );
    }
    // For professional directory route, match exactly
    if (path === "/professional-directory") {
      return location.pathname === path;
    }
    // For messages route, match exactly
    if (path === "/messages") {
      return location.pathname === path;
    }
    // For dashboard routes, match parent-dashboard, professional-dashboard, coordinator-dashboard, content-manager, or admin-dashboard
    if (
      path === "/parent-dashboard" ||
      path === "/professional-dashboard" ||
      path === "/coordinator-dashboard" ||
      path === "/content-manager" ||
      path === "/admin-dashboard"
    ) {
      return (
        location.pathname === path ||
        location.pathname.startsWith("/content-manager")
      );
    }
    // For resources route, also match /resources/* paths (resource detail pages)
    if (path === "/resources") {
      return (
        location.pathname === path ||
        location.pathname.startsWith("/resources/")
      );
    }
    // For profile routes, match both /profile and /professional-profile
    if (path === "/profile" || path === "/professional-profile") {
      return location.pathname === path;
    }
    return location.pathname === path;
  };

  // Helper function to check if a user menu item is active
  const isUserMenuItemActive = (paths: string | string[]) => {
    const pathArray = Array.isArray(paths) ? paths : [paths];
    return pathArray.some(
      (path) =>
        location.pathname === path || location.pathname.startsWith(path + "/"),
    );
  };

  /**
   * Handles user logout
   * Clears all local storage data and redirects to login page
   */
  const logout = () => {
    localStorage.clear(); // Clear all stored authentication data
    navigate("/login"); // Redirect to login page
  };

  // Check if user is authenticated by checking for auth token in localStorage
  const isAuthenticated = !!localStorage.getItem("auth_token");

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: "#FAEFE2",
        borderBottom: isScrolled
          ? "1px solid #AA855B"
          : "1px solid transparent",
        boxShadow: isScrolled ? "0 2px 10px rgba(170, 133, 91, 0.1)" : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <Link
            to={isAuthenticated ? "/parent-dashboard" : "/"}
            className="flex items-center hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <img
              src="/logos/parenzing-side-logo-400x100-black.png"
              alt="ParenZing Logo"
              className="h-8 sm:h-9 md:h-10"
            />
          </Link>

          {/* Desktop Navigation - Only show for authenticated users */}
          {isAuthenticated ? (
            <>
              <div className="hidden lg:flex items-center space-x-1 flex-1 justify-center max-w-4xl mx-4">
                {getNavItems(user.role).map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium font-['Poppins'] transition-all duration-200 ${
                        isActive(item.path)
                          ? "text-white shadow-md"
                          : "hover:shadow-sm"
                      }`}
                      style={
                        isActive(item.path)
                          ? { backgroundColor: "#32332D" }
                          : { color: "#32332D" }
                      }
                      onMouseEnter={(e) => {
                        if (!isActive(item.path)) {
                          e.currentTarget.style.backgroundColor = "#F0DCC9";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive(item.path)) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* User Menu (Desktop Only) */}
              <div className="hidden lg:flex items-center space-x-3 flex-shrink-0">
                {/* Notifications Bell */}
                <div className="relative notifications-dropdown">
                  <button
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="relative p-2 rounded-xl transition-all duration-200 hover:shadow-md"
                    style={{
                      backgroundColor: isNotificationsOpen
                        ? "#F0DCC9"
                        : "transparent",
                      border: "1px solid #AA855B",
                    }}
                    onMouseEnter={(e) => {
                      if (!isNotificationsOpen) {
                        e.currentTarget.style.backgroundColor = "#F0DCC9";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isNotificationsOpen) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <Bell className="w-5 h-5" style={{ color: "#32332D" }} />
                    {unreadCount > 0 && (
                      <span
                        className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: "#F2742C" }}
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {isNotificationsOpen && (
                    <div
                      className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border z-50 max-h-[500px] overflow-hidden flex flex-col"
                      style={{ borderColor: "#AA855B" }}
                    >
                      {/* Header */}
                      <div
                        className="flex items-center justify-between px-4 py-3 border-b"
                        style={{ borderColor: "#F0DCC9" }}
                      >
                        <h3
                          className="text-sm font-semibold font-['Poppins']"
                          style={{ color: "#32332D" }}
                        >
                          Notifications
                        </h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs font-medium font-['Poppins'] transition-colors"
                            style={{ color: "#F2742C" }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "#E55A1F";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "#F2742C";
                            }}
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>

                      {/* Notifications List */}
                      <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <Bell
                              className="w-12 h-12 mx-auto mb-3 opacity-30"
                              style={{ color: "#AA855B" }}
                            />
                            <p
                              className="text-sm font-['Poppins']"
                              style={{ color: "#64635E" }}
                            >
                              {unreadCount === 0
                                ? "All caught up! No unread notifications."
                                : "No unread notifications"}
                            </p>
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <button
                              key={notification.notification_id}
                              onClick={() =>
                                handleNotificationClick(notification)
                              }
                              className={`w-full text-left px-4 py-3 border-b transition-colors ${
                                !notification.is_read
                                  ? "bg-[#FDF2E8]"
                                  : "hover:bg-gray-50"
                              }`}
                              style={{ borderColor: "#F0DCC9" }}
                            >
                              <div className="flex items-start gap-3">
                                {!notification.is_read && (
                                  <div
                                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                                    style={{ backgroundColor: "#F2742C" }}
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-sm font-medium font-['Poppins'] mb-1 ${
                                      !notification.is_read
                                        ? "font-semibold"
                                        : "font-normal"
                                    }`}
                                    style={{ color: "#32332D" }}
                                  >
                                    {notification.title}
                                  </p>
                                  <p
                                    className="text-xs font-['Poppins'] line-clamp-2"
                                    style={{ color: "#64635E" }}
                                  >
                                    {notification.content}
                                  </p>
                                  <p
                                    className="text-xs font-['Poppins'] mt-1"
                                    style={{ color: "#AA855B" }}
                                  >
                                    {formatTimestamp(notification.created_at)}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>

                      {/* Footer */}
                      {notifications.length > 0 && (
                        <div
                          className="px-4 py-3 border-t text-center"
                          style={{ borderColor: "#F0DCC9" }}
                        >
                          <button
                            onClick={() => {
                              setIsNotificationsOpen(false);
                              navigate("/notifications");
                            }}
                            className="text-xs font-medium font-['Poppins'] transition-colors"
                            style={{ color: "#F2742C" }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "#E55A1F";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "#F2742C";
                            }}
                          >
                            View all notifications
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* User Dropdown */}
                <div className="relative user-dropdown">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-3 bg-white rounded-xl px-3 py-2 shadow-sm hover:shadow-md transition-all duration-200"
                    style={{ border: "1px solid #AA855B" }}
                  >
                    {user?.avatar ? (
                      <img
                        className="w-8 h-8 rounded-full object-cover"
                        style={{ border: "2px solid #AA855B" }}
                        src={user.avatar}
                        alt={user?.name}
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
                        style={{
                          backgroundColor: "#F2742C",
                          border: "2px solid #F2742C",
                        }}
                      >
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                    <span
                      className="text-sm font-medium font-['Poppins']"
                      style={{ color: "#32332D" }}
                    >
                      {user?.name}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${isUserMenuOpen ? "rotate-180" : ""}`}
                      style={{ color: "#AA855B" }}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-xl shadow-lg py-2 z-50"
                      style={{ border: "1px solid #AA855B" }}
                    >
                      {user.role !== "coordinator" &&
                        user.role !== "content_manager" &&
                        user.role !== "admin" && (
                          <Link
                            to={
                              user.role === "professional"
                                ? "/professional-profile"
                                : "/profile"
                            }
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center space-x-3 px-4 py-2 text-sm font-['Poppins'] transition-colors"
                            style={{
                              color: isUserMenuItemActive(
                                user.role === "professional"
                                  ? "/professional-profile"
                                  : "/profile",
                              )
                                ? "#F2742C"
                                : "#32332D",
                              backgroundColor: isUserMenuItemActive(
                                user.role === "professional"
                                  ? "/professional-profile"
                                  : "/profile",
                              )
                                ? "#FDF2E8"
                                : "transparent",
                            }}
                            onMouseEnter={(e) => {
                              if (
                                !isUserMenuItemActive(
                                  user.role === "professional"
                                    ? "/professional-profile"
                                    : "/profile",
                                )
                              ) {
                                e.currentTarget.style.backgroundColor =
                                  "#EDEDED";
                                e.currentTarget.style.color = "#F2742C";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (
                                !isUserMenuItemActive(
                                  user.role === "professional"
                                    ? "/professional-profile"
                                    : "/profile",
                                )
                              ) {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                                e.currentTarget.style.color = "#32332D";
                              } else {
                                e.currentTarget.style.backgroundColor =
                                  "#FDF2E8";
                                e.currentTarget.style.color = "#F2742C";
                              }
                            }}
                          >
                            <UserPenIcon className="w-4 h-4" />
                            <span>Profile Settings</span>
                          </Link>
                        )}
                      <Link
                        to="/notifications"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2 text-sm font-['Poppins'] transition-colors"
                        style={{
                          color: isUserMenuItemActive("/notifications")
                            ? "#F2742C"
                            : "#32332D",
                          backgroundColor: isUserMenuItemActive(
                            "/notifications",
                          )
                            ? "#FDF2E8"
                            : "transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!isUserMenuItemActive("/notifications")) {
                            e.currentTarget.style.backgroundColor = "#EDEDED";
                            e.currentTarget.style.color = "#F2742C";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isUserMenuItemActive("/notifications")) {
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                            e.currentTarget.style.color = "#32332D";
                          } else {
                            e.currentTarget.style.backgroundColor = "#FDF2E8";
                            e.currentTarget.style.color = "#F2742C";
                          }
                        }}
                      >
                        <Bell className="w-4 h-4" />
                        <span>Notifications</span>
                        {unreadCount > 0 && (
                          <span
                            className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: "#F2742C" }}
                          >
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </Link>
                      {user.role !== "coordinator" &&
                        user.role !== "content_manager" &&
                        user.role !== "admin" && (
                          <Link
                            to="/account-settings"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center space-x-3 px-4 py-2 text-sm font-['Poppins'] transition-colors"
                            style={{
                              color: isUserMenuItemActive("/account-settings")
                                ? "#F2742C"
                                : "#32332D",
                              backgroundColor: isUserMenuItemActive(
                                "/account-settings",
                              )
                                ? "#FDF2E8"
                                : "transparent",
                            }}
                            onMouseEnter={(e) => {
                              if (!isUserMenuItemActive("/account-settings")) {
                                e.currentTarget.style.backgroundColor =
                                  "#EDEDED";
                                e.currentTarget.style.color = "#F2742C";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isUserMenuItemActive("/account-settings")) {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                                e.currentTarget.style.color = "#32332D";
                              } else {
                                e.currentTarget.style.backgroundColor =
                                  "#FDF2E8";
                                e.currentTarget.style.color = "#F2742C";
                              }
                            }}
                          >
                            <Settings className="w-4 h-4" />
                            <span>Account Settings</span>
                          </Link>
                        )}
                      {(user.role === "coordinator" ||
                        user.role === "content_manager" ||
                        user.role === "admin") && (
                        <Link
                          to="/account-settings"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center space-x-3 px-4 py-2 text-sm font-['Poppins'] transition-colors"
                          style={{
                            color: isUserMenuItemActive("/account-settings")
                              ? "#F2742C"
                              : "#32332D",
                            backgroundColor: isUserMenuItemActive(
                              "/account-settings",
                            )
                              ? "#FDF2E8"
                              : "transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (!isUserMenuItemActive("/account-settings")) {
                              e.currentTarget.style.backgroundColor = "#EDEDED";
                              e.currentTarget.style.color = "#F2742C";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isUserMenuItemActive("/account-settings")) {
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                              e.currentTarget.style.color = "#32332D";
                            } else {
                              e.currentTarget.style.backgroundColor = "#FDF2E8";
                              e.currentTarget.style.color = "#F2742C";
                            }
                          }}
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                          <span>Notification Preferences</span>
                        </Link>
                      )}
                      <hr className="my-2" style={{ borderColor: "#AA855B" }} />
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="flex items-center space-x-3 px-4 py-2 text-sm font-['Poppins'] transition-colors w-full text-left"
                        style={{ color: "#32332D" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#FFF4E6";
                          e.currentTarget.style.color = "#F2742C";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "#32332D";
                        }}
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Minimal Navigation for Non-Authenticated Users */
            <>
              {/* Desktop/Tablet Navigation */}
              <div className="hidden md:flex items-center space-x-2 lg:space-x-3">
                <Link
                  to="/signup"
                  className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium font-['Poppins'] transition-all duration-200"
                  style={{ color: "#32332D" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#F0DCC9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  Sign Up
                </Link>
                <Link
                  to="/login"
                  className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium font-['Poppins'] transition-all duration-200 shadow-sm"
                  style={{
                    backgroundColor: "#F2742C",
                    color: "#FFFFFF",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#E55A1F";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#F2742C";
                  }}
                >
                  Log In
                </Link>
              </div>

              {/* Mobile Navigation */}
              <div className="md:hidden flex items-center space-x-2">
                <Link
                  to="/signup"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium font-['Poppins'] transition-all duration-200"
                  style={{ color: "#32332D" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#F0DCC9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  Sign Up
                </Link>
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium font-['Poppins'] transition-all duration-200 shadow-sm"
                  style={{
                    backgroundColor: "#F2742C",
                    color: "#FFFFFF",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#E55A1F";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#F2742C";
                  }}
                >
                  Log In
                </Link>
              </div>
            </>
          )}

          {/* Mobile/Tablet menu button and notification bell - Only show for authenticated users */}
          {isAuthenticated && (
            <div className="lg:hidden flex items-center space-x-2 flex-shrink-0">
              {/* Mobile/Tablet Notifications Bell */}
              <div className="relative notifications-dropdown">
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="relative p-2 rounded-xl transition-all duration-200"
                  style={{
                    backgroundColor: isNotificationsOpen
                      ? "#F0DCC9"
                      : "transparent",
                    border: "1px solid #AA855B",
                    color: "#32332D",
                  }}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: "#F2742C" }}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Mobile/Tablet Notifications Dropdown */}
                {isNotificationsOpen && (
                  <div
                    className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-full mt-2 w-[calc(100vw-1rem)] sm:w-80 max-w-sm bg-white rounded-xl shadow-lg border z-50 max-h-[calc(100vh-5rem)] overflow-hidden flex flex-col"
                    style={{ borderColor: "#AA855B" }}
                  >
                    {/* Header */}
                    <div
                      className="flex items-center justify-between px-4 py-3 border-b"
                      style={{ borderColor: "#F0DCC9" }}
                    >
                      <h3
                        className="text-sm font-semibold font-['Poppins']"
                        style={{ color: "#32332D" }}
                      >
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs font-medium font-['Poppins'] transition-colors"
                          style={{ color: "#F2742C" }}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    {/* Notifications List */}
                    <div className="overflow-y-auto flex-1">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Bell
                            className="w-12 h-12 mx-auto mb-3 opacity-30"
                            style={{ color: "#AA855B" }}
                          />
                          <p
                            className="text-sm font-['Poppins']"
                            style={{ color: "#64635E" }}
                          >
                            {unreadCount === 0
                              ? "All caught up! No unread notifications."
                              : "No unread notifications"}
                          </p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <button
                            key={notification.notification_id}
                            onClick={() =>
                              handleNotificationClick(notification)
                            }
                            className={`w-full text-left px-4 py-3 border-b transition-colors ${
                              !notification.is_read
                                ? "bg-[#FDF2E8]"
                                : "hover:bg-gray-50"
                            }`}
                            style={{ borderColor: "#F0DCC9" }}
                          >
                            <div className="flex items-start gap-3">
                              {!notification.is_read && (
                                <div
                                  className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                                  style={{ backgroundColor: "#F2742C" }}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm font-medium font-['Poppins'] mb-1 ${
                                    !notification.is_read
                                      ? "font-semibold"
                                      : "font-normal"
                                  }`}
                                  style={{ color: "#32332D" }}
                                >
                                  {notification.title}
                                </p>
                                <p
                                  className="text-xs font-['Poppins'] line-clamp-2"
                                  style={{ color: "#64635E" }}
                                >
                                  {notification.content}
                                </p>
                                <p
                                  className="text-xs font-['Poppins'] mt-1"
                                  style={{ color: "#AA855B" }}
                                >
                                  {formatTimestamp(notification.created_at)}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div
                        className="px-4 py-3 border-t text-center"
                        style={{ borderColor: "#F0DCC9" }}
                      >
                        <button
                          onClick={() => {
                            setIsNotificationsOpen(false);
                            navigate("/notifications");
                          }}
                          className="text-xs font-medium font-['Poppins'] transition-colors"
                          style={{ color: "#F2742C" }}
                        >
                          View all notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile/Tablet menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-xl transition-all duration-200 flex-shrink-0"
                style={{ color: "#32332D" }}
                aria-label="Open menu"
              >
                {isMobileMenuOpen ? (
                  <XIcon className="w-6 h-6" />
                ) : (
                  <MenuIcon className="w-6 h-6" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile/Tablet Menu Drawer - Only show for authenticated users on mobile/tablet */}
      {isMobileMenuOpen && isAuthenticated && (
        <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
          <div
            className="fixed inset-0 bg-black bg-opacity-30"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div
            className="relative w-[85vw] max-w-sm h-full shadow-2xl flex flex-col"
            style={{
              backgroundColor: "#F5F5F5",
              borderLeft: "1px solid #AA855B",
            }}
          >
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl transition-all duration-200"
              style={{ color: "#32332D" }}
              aria-label="Close menu"
            >
              <XIcon className="w-6 h-6" />
            </button>

            {/* User Profile Section */}
            <div
              className="px-4 sm:px-6 pt-6 sm:pt-12 pb-4 sm:pb-6 flex flex-col items-center"
              style={{
                borderBottom: "1px solid #AA855B",
                backgroundColor: "#FAEFE2",
              }}
            >
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-3 sm:mb-4 shadow-lg"
                style={{ backgroundColor: "#F2742C" }}
              >
                {user?.avatar ? (
                  <img
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-white object-cover"
                    src={user.avatar}
                    alt={user?.name}
                  />
                ) : (
                  <div
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-white flex items-center justify-center text-white font-bold text-xl sm:text-2xl"
                    style={{ backgroundColor: "#F2742C" }}
                  >
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
              </div>
              <span
                className="text-base sm:text-lg font-bold font-['Poppins'] mb-1 truncate max-w-full px-2"
                style={{ color: "#32332D" }}
              >
                {user?.name}
              </span>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 px-3 sm:px-4 py-0 overflow-y-auto">
              {getNavItems(user.role).map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-2.5 px-3 py-2.5 text-sm font-medium font-['Poppins'] transition-all duration-200 ${
                      isActive(item.path) ? "text-white shadow-md" : ""
                    }`}
                    style={
                      isActive(item.path)
                        ? { backgroundColor: "#32332D", color: "#FFFFFF" }
                        : { color: "#32332D" }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive(item.path)) {
                        e.currentTarget.style.backgroundColor = "#EDEDED";
                        e.currentTarget.style.color = "#F2742C";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive(item.path)) {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "#32332D";
                      }
                    }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}

              {/* Separator */}
              <div
                className="my-2"
                style={{ borderTop: "1px solid #F0DCC9" }}
              />

              {/* User Menu Items */}
              {user.role !== "coordinator" &&
                user.role !== "content_manager" &&
                user.role !== "admin" && (
                  <Link
                    to={
                      user.role === "professional"
                        ? "/professional-profile"
                        : "/profile"
                    }
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-2.5 px-3 py-2.5 text-sm font-medium font-['Poppins'] transition-all duration-200 ${
                      isUserMenuItemActive(
                        user.role === "professional"
                          ? "/professional-profile"
                          : "/profile",
                      )
                        ? "text-white shadow-md"
                        : ""
                    }`}
                    style={
                      isUserMenuItemActive(
                        user.role === "professional"
                          ? "/professional-profile"
                          : "/profile",
                      )
                        ? { backgroundColor: "#32332D", color: "#FFFFFF" }
                        : { color: "#32332D" }
                    }
                    onMouseEnter={(e) => {
                      if (
                        !isUserMenuItemActive(
                          user.role === "professional"
                            ? "/professional-profile"
                            : "/profile",
                        )
                      ) {
                        e.currentTarget.style.backgroundColor = "#EDEDED";
                        e.currentTarget.style.color = "#F2742C";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (
                        !isUserMenuItemActive(
                          user.role === "professional"
                            ? "/professional-profile"
                            : "/profile",
                        )
                      ) {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "#32332D";
                      }
                    }}
                  >
                    <UserPenIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Profile Settings</span>
                  </Link>
                )}

              <Link
                to="/notifications"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 text-sm font-medium font-['Poppins'] transition-all duration-200 ${
                  isUserMenuItemActive("/notifications")
                    ? "text-white shadow-md"
                    : ""
                }`}
                style={
                  isUserMenuItemActive("/notifications")
                    ? { backgroundColor: "#32332D", color: "#FFFFFF" }
                    : { color: "#32332D" }
                }
                onMouseEnter={(e) => {
                  if (!isUserMenuItemActive("/notifications")) {
                    e.currentTarget.style.backgroundColor = "#EDEDED";
                    e.currentTarget.style.color = "#F2742C";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isUserMenuItemActive("/notifications")) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#32332D";
                  }
                }}
              >
                <div className="flex items-center space-x-2.5">
                  <Bell className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Notifications</span>
                </div>
                {unreadCount > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: "#F2742C" }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>

              {user.role !== "coordinator" &&
                user.role !== "content_manager" &&
                user.role !== "admin" && (
                  <Link
                    to="/account-settings"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-2.5 px-3 py-2.5 text-sm font-medium font-['Poppins'] transition-all duration-200 ${
                      isUserMenuItemActive("/account-settings")
                        ? "text-white shadow-md"
                        : ""
                    }`}
                    style={
                      isUserMenuItemActive("/account-settings")
                        ? { backgroundColor: "#32332D", color: "#FFFFFF" }
                        : { color: "#32332D" }
                    }
                    onMouseEnter={(e) => {
                      if (!isUserMenuItemActive("/account-settings")) {
                        e.currentTarget.style.backgroundColor = "#EDEDED";
                        e.currentTarget.style.color = "#F2742C";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isUserMenuItemActive("/account-settings")) {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "#32332D";
                      }
                    }}
                  >
                    <Settings className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Account Settings</span>
                  </Link>
                )}

              {(user.role === "coordinator" ||
                user.role === "content_manager" ||
                user.role === "admin") && (
                <Link
                  to="/account-settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-2.5 px-3 py-2.5 text-sm font-medium font-['Poppins'] transition-all duration-200 ${
                    isUserMenuItemActive("/account-settings")
                      ? "text-white shadow-md"
                      : ""
                  }`}
                  style={
                    isUserMenuItemActive("/account-settings")
                      ? { backgroundColor: "#32332D", color: "#FFFFFF" }
                      : { color: "#32332D" }
                  }
                  onMouseEnter={(e) => {
                    if (!isUserMenuItemActive("/account-settings")) {
                      e.currentTarget.style.backgroundColor = "#EDEDED";
                      e.currentTarget.style.color = "#F2742C";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isUserMenuItemActive("/account-settings")) {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "#32332D";
                    }
                  }}
                >
                  <SlidersHorizontal className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Notification Preferences</span>
                </Link>
              )}

              {/* Separator */}
              <div
                className="my-2"
                style={{ borderTop: "1px solid #F0DCC9" }}
              />

              {/* Logout Button */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="w-full text-left flex items-center space-x-2.5 px-3 py-2.5 text-sm font-medium font-['Poppins'] transition-all duration-200"
                style={{ color: "#32332D" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#FFF4E6";
                  e.currentTarget.style.color = "#F2742C";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#32332D";
                }}
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
