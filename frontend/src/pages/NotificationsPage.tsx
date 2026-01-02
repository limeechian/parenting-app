// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: NotificationsPage.tsx
// Description: To provide interface for users to view and manage their notifications
// First Written on: Sunday, 05-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state and lifecycle management
import React, { useState, useEffect } from "react";
// Import React Router hooks for navigation
import { useNavigate } from "react-router-dom";
// Import lucide-react icons for UI elements
import {
  Bell,
  ArrowLeft,
  Filter,
  Check,
  CheckCheck,
  Heart,
  MessageCircle,
  MessageSquare,
  Users,
  Trash2,
  X,
} from "lucide-react";
// Import API functions for notification operations
import {
  getNotifications,
  markNotificationAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
} from "../services/api";
// Import API base URL configuration
import { API_BASE_URL } from "../config/api";
// Import toast notification components
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * Notification interface
 * Defines the structure of a notification object
 */
interface Notification {
  notification_id: number;
  notification_type: string;
  title: string;
  content: string;
  actor_name?: string;
  related_post_id?: number;
  related_comment_id?: number;
  related_community_id?: number;
  related_message_id?: number;
  related_report_id?: number;
  created_at: string;
  is_read: boolean;
}

/**
 * Filter types for different user roles
 * Each role has specific notification categories they can filter by
 */
type ParentNotificationFilter = "all" | "unread" | "messages" | "community";
type ProfessionalNotificationFilter = "all" | "unread" | "status";
type CoordinatorNotificationFilter =
  | "all"
  | "unread"
  | "applications"
  | "promotions";
type ContentManagerNotificationFilter = "all" | "unread" | "reports";
type NotificationFilter =
  | ParentNotificationFilter
  | ProfessionalNotificationFilter
  | CoordinatorNotificationFilter
  | ContentManagerNotificationFilter;

/**
 * NotificationsPage Component
 * 
 * Provides interface for users to view and manage their notifications.
 * Features include:
 * - View all notifications
 * - Filter by type and read status
 * - Mark as read/unread
 * - Delete notifications
 * - Real-time updates via SSE
 * - Role-based filtering options
 * 
 * @returns JSX element representing the notifications page
 */
const NotificationsPage: React.FC = () => {
  // React Router hook
  const navigate = useNavigate();  // Navigation function for programmatic routing
  
  // Component state management
  const [notifications, setNotifications] = useState<Notification[]>([]);  // Filtered notifications to display
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);  // All notifications for counts
  const [filter, setFilter] = useState<NotificationFilter>("all");  // Current filter selection
  const [loading, setLoading] = useState(true);  // Loading state during data fetch
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);  // Whether delete all confirmation modal is open
  const [userRole, setUserRole] = useState<
    "parent" | "professional" | "coordinator" | "admin" | "content_manager"
  >("parent");  // User's role for filtering options

  /**
   * Formats a timestamp to a human-readable relative time string
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

  // Fetch user role and all notifications for counts (always fetch all, regardless of filter)
  useEffect(() => {
    const fetchUserRole = async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/me`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (response.ok) {
          const userData = await response.json();
          setUserRole(userData.role || "parent");
        }
      } catch (error: any) {
        console.error("Error fetching user role:", error);
      }
    };

    const fetchAllNotifications = async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      try {
        const data = await getNotifications(); // Fetch all notifications
        // Transform backend response to match frontend interface
        const transformedNotifications: Notification[] = data.map((n: any) => ({
          notification_id: n.notification_id,
          notification_type: n.notification_type,
          title: n.title || "",
          content: n.content || "",
          actor_name: n.actor_name,
          related_post_id: n.related_post_id,
          related_comment_id: n.related_comment_id,
          related_community_id: n.related_community_id,
          related_message_id: n.related_message_id,
          related_report_id: n.related_report_id,
          created_at: n.created_at,
          is_read: n.is_read,
        }));
        setAllNotifications(transformedNotifications);
      } catch (error: any) {
        console.error("Error fetching all notifications:", error);
      }
    };

    fetchUserRole();
    fetchAllNotifications();

    // Set up Server-Sent Events (SSE) for real-time notifications
    // Note: EventSource doesn't support custom headers, so we pass token as query param
    // The backend will also check cookies (get_current_user_flexible handles both)
    const token = localStorage.getItem("auth_token");
    const streamUrl = token
      ? `${API_BASE_URL}/api/notifications/stream?token=${encodeURIComponent(token)}`
      : `${API_BASE_URL}/api/notifications/stream`;

    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          console.log("SSE connection established");
          return;
        }

        if (data.type === "new_notification" && data.notification) {
          // Refetch all notifications to get updated list
          fetchAllNotifications();
        }
      } catch (error) {
        console.error("Error parsing SSE message:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      console.error("SSE readyState:", eventSource.readyState); // 0=CONNECTING, 1=OPEN, 2=CLOSED
      // EventSource will automatically reconnect
      // Only do a fallback fetch if connection is closed (not just a temporary error)
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log("SSE connection closed, doing fallback fetch");
        fetchAllNotifications();
      }
    };

    eventSource.onopen = () => {
      console.log("SSE connection opened successfully");
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, []);

  // Filter notifications on frontend based on current filter and user role
  useEffect(() => {
    setLoading(true);

    // Filter allNotifications based on current filter and role
    let filtered: Notification[] = [];

    if (userRole === "coordinator") {
      // Coordinator filters
      switch (filter) {
        case "all":
          filtered = allNotifications;
          break;
        case "unread":
          filtered = allNotifications.filter((n) => !n.is_read);
          break;
        case "applications":
          filtered = allNotifications.filter(
            (n) => n.notification_type === "professional_profile_submission",
          );
          break;
        case "promotions":
          filtered = allNotifications.filter(
            (n) => n.notification_type === "promotional_material_submission",
          );
          break;
        default:
          filtered = allNotifications;
      }
    } else if (userRole === "content_manager") {
      // Content Manager filters
      switch (filter) {
        case "all":
          filtered = allNotifications;
          break;
        case "unread":
          filtered = allNotifications.filter((n) => !n.is_read);
          break;
        case "reports":
          // Filter for report-related notifications
          filtered = allNotifications.filter(
            (n) => n.notification_type === "report_created",
          );
          break;
        default:
          filtered = allNotifications;
      }
    } else if (userRole === "professional") {
      // Professional filters
      switch (filter) {
        case "all":
          filtered = allNotifications;
          break;
        case "unread":
          filtered = allNotifications.filter((n) => !n.is_read);
          break;
        case "status":
          filtered = allNotifications.filter(
            (n) =>
              n.notification_type === "approval" ||
              n.notification_type === "rejection" ||
              n.notification_type === "profile_archived" ||
              n.notification_type === "profile_unarchived" ||
              n.notification_type === "promotion_approved" ||
              n.notification_type === "promotion_rejected",
          );
          break;
        default:
          filtered = allNotifications;
      }
    } else {
      // Parent filters (default)
      switch (filter) {
        case "all":
          filtered = allNotifications;
          break;
        case "unread":
          filtered = allNotifications.filter((n) => !n.is_read);
          break;
        case "messages":
          filtered = allNotifications.filter(
            (n) =>
              n.notification_type === "message_received" ||
              n.notification_type === "message_reacted",
          );
          break;
        case "community":
          filtered = allNotifications.filter(
            (n) =>
              n.notification_type === "post_liked" ||
              n.notification_type === "post_commented" ||
              n.notification_type === "comment_replied" ||
              n.notification_type === "comment_liked" ||
              n.notification_type === "community_joined",
          );
          break;
        default:
          filtered = allNotifications;
      }
    }

    // Sort by created_at descending (newest first)
    filtered.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    setNotifications(filtered);
    setLoading(false);
  }, [filter, allNotifications, userRole]);

  // Filter notifications (already filtered by backend, but keep for client-side filtering if needed)
  const filteredNotifications = notifications;

  // Calculate unread counts from ALL notifications (not just filtered ones)
  const totalUnreadCount = allNotifications.filter((n) => !n.is_read).length;

  // Calculate unread counts for each filter type (badges only show when there are unread items)
  const getFilterUnreadCount = (filterType: NotificationFilter): number => {
    if (userRole === "coordinator") {
      switch (filterType) {
        case "all":
          return totalUnreadCount;
        case "unread":
          return totalUnreadCount;
        case "applications":
          return allNotifications.filter(
            (n) =>
              !n.is_read &&
              n.notification_type === "professional_profile_submission",
          ).length;
        case "promotions":
          return allNotifications.filter(
            (n) =>
              !n.is_read &&
              n.notification_type === "promotional_material_submission",
          ).length;
        default:
          return 0;
      }
    } else if (userRole === "content_manager") {
      switch (filterType) {
        case "all":
          return totalUnreadCount;
        case "unread":
          return totalUnreadCount;
        case "reports":
          return allNotifications.filter(
            (n) => !n.is_read && n.notification_type === "report_created",
          ).length;
        default:
          return 0;
      }
    } else if (userRole === "professional") {
      switch (filterType) {
        case "all":
          return totalUnreadCount;
        case "unread":
          return totalUnreadCount;
        case "status":
          return allNotifications.filter(
            (n) =>
              !n.is_read &&
              (n.notification_type === "approval" ||
                n.notification_type === "rejection" ||
                n.notification_type === "profile_archived" ||
                n.notification_type === "profile_unarchived" ||
                n.notification_type === "promotion_approved" ||
                n.notification_type === "promotion_rejected"),
          ).length;
        default:
          return 0;
      }
    } else {
      // Parent filters
      switch (filterType) {
        case "all":
          return totalUnreadCount;
        case "unread":
          return totalUnreadCount;
        case "messages":
          return allNotifications.filter(
            (n) =>
              !n.is_read &&
              (n.notification_type === "message_received" ||
                n.notification_type === "message_reacted"),
          ).length;
        case "community":
          return allNotifications.filter(
            (n) =>
              !n.is_read &&
              (n.notification_type === "post_liked" ||
                n.notification_type === "post_commented" ||
                n.notification_type === "comment_replied" ||
                n.notification_type === "comment_liked" ||
                n.notification_type === "community_joined"),
          ).length;
        default:
          return 0;
      }
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read (do this in background, don't wait)
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
          // Also update allNotifications for accurate counts
          setAllNotifications((prev) =>
            prev.map((n) =>
              n.notification_id === notification.notification_id
                ? { ...n, is_read: true }
                : n,
            ),
          );

          // Dispatch custom event to notify Navigation component
          window.dispatchEvent(new CustomEvent("notificationStatusChanged"));
        })
        .catch((error: any) => {
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
      // Professional: Navigate to Professional Profile for profile rejections to see reason and resubmit (with refresh to show updated status)
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
      // If no specific content to navigate to, show a message
      // This shouldn't happen in normal cases, but handle gracefully
      toast.info("This notification has no associated content to view.");
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId ? { ...n, is_read: true } : n,
        ),
      );
      // Also update allNotifications for accurate counts
      setAllNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId ? { ...n, is_read: true } : n,
        ),
      );

      // Dispatch custom event to notify Navigation component
      window.dispatchEvent(new CustomEvent("notificationStatusChanged"));
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      toast.error(error.message || "Failed to mark notification as read");
    }
  };

  const handleMarkAsUnread = async (notificationId: number) => {
    try {
      await markNotificationAsUnread(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId ? { ...n, is_read: false } : n,
        ),
      );
      // Also update allNotifications for accurate counts
      setAllNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId ? { ...n, is_read: false } : n,
        ),
      );

      // Dispatch custom event to notify Navigation component
      window.dispatchEvent(new CustomEvent("notificationStatusChanged"));
    } catch (error: any) {
      console.error("Error marking notification as unread:", error);
      toast.error(error.message || "Failed to mark notification as unread");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setAllNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error);
      toast.error(error.message || "Failed to mark all notifications as read");
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    try {
      await deleteNotification(notificationId);
      setNotifications((prev) =>
        prev.filter((n) => n.notification_id !== notificationId),
      );
      setAllNotifications((prev) =>
        prev.filter((n) => n.notification_id !== notificationId),
      );

      // Dispatch custom event to notify Navigation component
      window.dispatchEvent(new CustomEvent("notificationStatusChanged"));

      toast.success("Notification deleted");
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      toast.error(error.message || "Failed to delete notification");
    }
  };

  const handleDeleteAll = async () => {
    // Check if checkbox is checked
    const checkbox = document.getElementById(
      "confirm-delete-all-notifications",
    ) as HTMLInputElement;
    if (!checkbox?.checked) {
      toast.error(
        "Please confirm that you understand this action cannot be undone.",
      );
      return;
    }

    try {
      await deleteAllNotifications();
      setNotifications([]);
      setAllNotifications([]);
      setShowDeleteAllModal(false);

      // Dispatch custom event to notify Navigation component
      window.dispatchEvent(new CustomEvent("notificationStatusChanged"));

      toast.success("All notifications deleted");
    } catch (error: any) {
      console.error("Error deleting all notifications:", error);
      toast.error(error.message || "Failed to delete all notifications");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "post_liked":
      case "comment_liked":
        return <Heart className="w-5 h-5" style={{ color: "#F2742C" }} />;
      case "post_commented":
      case "comment_replied":
        return (
          <MessageCircle className="w-5 h-5" style={{ color: "#326586" }} />
        );
      case "community_joined":
        return <Users className="w-5 h-5" style={{ color: "#0F5648" }} />;
      case "message_received":
      case "message_reacted":
        return (
          <MessageSquare className="w-5 h-5" style={{ color: "#326586" }} />
        );
      default:
        return <Bell className="w-5 h-5" style={{ color: "#AA855B" }} />;
    }
  };

  const getFilterLabel = (filterType: NotificationFilter): string => {
    switch (filterType) {
      case "all":
        return "All";
      case "unread":
        return "Unread";
      case "messages":
        return "Messages";
      case "community":
        return "Community";
      case "status":
        return "Status";
      case "applications":
        return "Applications";
      case "promotions":
        return "Promotions";
      case "reports":
        return "Reports";
      default:
        return "All";
    }
  };

  // Get available filters based on user role
  const getAvailableFilters = (): NotificationFilter[] => {
    if (userRole === "coordinator") {
      return ["all", "unread", "applications", "promotions"];
    } else if (userRole === "professional") {
      return ["all", "unread", "status"];
    } else if (userRole === "content_manager") {
      return ["all", "unread", "reports"];
    } else {
      // Parent (default)
      return ["all", "unread", "messages", "community"];
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen pt-20 flex items-center justify-center"
        style={{ backgroundColor: "#FAEFE2" }}
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: "#F2742C" }}
          ></div>
          <p className="font-['Poppins']" style={{ color: "#32332D" }}>
            Loading notifications...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pt-16 sm:pt-20 pb-4 sm:pb-6 md:pb-8 font-['Poppins']"
      style={{ backgroundColor: "#FAEFE2" }}
    >
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 sm:mb-5 md:mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 text-xs sm:text-sm font-medium transition-colors"
            style={{ color: "#F2742C" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#E55A1F";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#F2742C";
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Back
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <h1
                className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2"
                style={{ color: "#32332D" }}
              >
                Notifications
              </h1>
              <p className="text-xs sm:text-sm" style={{ color: "#AA855B" }}>
                {totalUnreadCount > 0
                  ? `${totalUnreadCount} unread notification${totalUnreadCount !== 1 ? "s" : ""}`
                  : "All caught up!"}
              </p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {notifications.length > 0 && (
                <button
                  onClick={() => setShowDeleteAllModal(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200"
                  style={{
                    backgroundColor: "#FDF2E8",
                    color: "#F2742C",
                    border: "1px solid #F0DCC9",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#FAEFE2";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#FDF2E8";
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Delete all</span>
                  <span className="sm:hidden">Delete</span>
                </button>
              )}
              {totalUnreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200"
                  style={{
                    backgroundColor: "#FDF2E8",
                    color: "#F2742C",
                    border: "1px solid #F0DCC9",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#FAEFE2";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#FDF2E8";
                  }}
                >
                  <CheckCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Mark all as read</span>
                  <span className="sm:hidden">Mark all</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="mb-4 sm:mb-5 md:mb-6 flex items-center gap-2 sm:gap-3 flex-wrap">
          <Filter
            className="w-4 h-4 sm:w-5 sm:h-5"
            style={{ color: "#AA855B" }}
          />
          {getAvailableFilters().map((filterType) => {
            // Show unread count for all filters - badges indicate attention needed
            const displayCount = getFilterUnreadCount(filterType);

            return (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 sm:gap-2 ${
                  filter === filterType ? "shadow-md" : ""
                }`}
                style={{
                  backgroundColor:
                    filter === filterType ? "#FDF2E8" : "#FAEFE2",
                  color: filter === filterType ? "#F2742C" : "#32332D",
                  border: `1px solid ${filter === filterType ? "#F2742C" : "#F0DCC9"}`,
                }}
                onMouseEnter={(e) => {
                  if (filter !== filterType) {
                    e.currentTarget.style.backgroundColor = "#F5F3F0";
                  }
                }}
                onMouseLeave={(e) => {
                  if (filter !== filterType) {
                    e.currentTarget.style.backgroundColor = "#FAEFE2";
                  }
                }}
              >
                <span>{getFilterLabel(filterType)}</span>
                {displayCount > 0 && (
                  <span
                    className="px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium min-w-[20px] flex items-center justify-center"
                    style={{
                      backgroundColor:
                        filter === filterType ? "#F2742C" : "#AA855B",
                      color: "#FFFFFF",
                    }}
                  >
                    {displayCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notifications List */}
        <div className="space-y-2 sm:space-y-3">
          {filteredNotifications.length === 0 ? (
            <div
              className="bg-white rounded-lg sm:rounded-xl shadow-sm border p-8 sm:p-10 md:p-12 text-center"
              style={{ borderColor: "#F0DCC9" }}
            >
              <Bell
                className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-30"
                style={{ color: "#AA855B" }}
              />
              <h3
                className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2"
                style={{ color: "#32332D" }}
              >
                No notifications
              </h3>
              <p className="text-xs sm:text-sm" style={{ color: "#64635E" }}>
                {filter === "unread"
                  ? "You're all caught up! No unread notifications."
                  : filter === "all"
                    ? "You don't have any notifications yet."
                    : `No ${getFilterLabel(filter).toLowerCase()} notifications.`}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.notification_id}
                className={`bg-white rounded-lg sm:rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md ${
                  !notification.is_read ? "border-l-4" : ""
                }`}
                style={{
                  borderColor: !notification.is_read ? "#F2742C" : "#F0DCC9",
                  borderLeftColor: !notification.is_read
                    ? "#F2742C"
                    : undefined,
                  backgroundColor: !notification.is_read
                    ? "#FDF2E8"
                    : "#FFFFFF",
                }}
              >
                <div className="p-3 sm:p-4 md:p-5">
                  <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5 sm:mt-1">
                      {getNotificationIcon(notification.notification_type)}
                    </div>

                    {/* Content */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                            {!notification.is_read && (
                              <div
                                className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: "#F2742C" }}
                              />
                            )}
                            <p
                              className={`text-xs sm:text-sm font-medium font-['Poppins'] truncate ${
                                !notification.is_read
                                  ? "font-semibold"
                                  : "font-normal"
                              }`}
                              style={{ color: "#32332D" }}
                            >
                              {notification.title}
                            </p>
                          </div>
                          <p
                            className="text-xs sm:text-sm font-['Poppins'] mb-1 sm:mb-2 line-clamp-2"
                            style={{ color: "#64635E" }}
                          >
                            {notification.content}
                          </p>
                          <p
                            className="text-[10px] sm:text-xs font-['Poppins']"
                            style={{ color: "#AA855B" }}
                          >
                            {formatTimestamp(notification.created_at)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(
                                notification.notification_id,
                              );
                            }}
                            className="p-1.5 sm:p-2 rounded-lg transition-colors"
                            style={{ color: "#AA855B" }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#F5F3F0";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                            }}
                            title="Delete notification"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          {notification.is_read ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsUnread(
                                  notification.notification_id,
                                );
                              }}
                              className="p-1.5 sm:p-2 rounded-lg transition-colors"
                              style={{ color: "#AA855B" }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#F5F3F0";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                              }}
                              title="Mark as unread"
                            >
                              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.notification_id);
                              }}
                              className="p-1.5 sm:p-2 rounded-lg transition-colors"
                              style={{ color: "#F2742C" }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#FDF2E8";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                              }}
                              title="Mark as read"
                            >
                              <CheckCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3
                className="text-lg font-semibold"
                style={{ color: "#32332D" }}
              >
                Delete All Notifications
              </h3>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowDeleteAllModal(false)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3">
              <div
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: "#FDECEF",
                  border: "1px solid #F0DCC9",
                }}
              >
                <p
                  className="text-sm font-medium mb-2"
                  style={{ color: "#EF4444" }}
                >
                  ⚠️ Warning: This action cannot be undone
                </p>
                <p className="text-sm" style={{ color: "#64635E" }}>
                  Deleting all notifications will permanently remove all
                  notifications from your account. This includes all likes,
                  comments, replies, messages, and community notifications.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="confirm-delete-all-notifications"
                  className="w-4 h-4 rounded"
                  style={{ accentColor: "#EF4444" }}
                />
                <label
                  htmlFor="confirm-delete-all-notifications"
                  className="text-sm"
                  style={{ color: "#32332D" }}
                >
                  I understand this action cannot be undone
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg font-medium border"
                style={{ borderColor: "#AA855B", color: "#AA855B" }}
                onClick={() => setShowDeleteAllModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg font-medium"
                style={{ backgroundColor: "#EF4444", color: "#FFFFFF" }}
                onClick={handleDeleteAll}
              >
                Delete All
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

export default NotificationsPage;
