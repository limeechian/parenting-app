// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: ContentManagerDashboard.tsx
// Description: To display the main dashboard for content managers to moderate community content and manage resources
// First Written on: Monday, 10-Nov-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state and lifecycle management
import React, { useState, useEffect } from "react";
// Import React Router hooks for navigation and URL parameters
import { useNavigate, useSearchParams } from "react-router-dom";
// Import lucide-react icons for UI elements
import {
  FileText,
  BookOpen,
  LibraryBig,
  Video,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Edit3,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  Filter,
} from "lucide-react";
// Import toast notification components
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Import Poppins font weights for consistent typography
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";

/**
 * Formats developmental stage for display
 * Converts stage codes to human-readable labels
 * 
 * @param stage - Developmental stage code
 * @returns Formatted display string
 */
const formatDevelopmentalStage = (stage: string): string => {
  const map: Record<string, string> = {
    newborn: "Newborn",
    infant: "Infant",
    toddler: "Toddler",
    early_childhood: "Early Childhood",
    middle_childhood: "Middle Childhood",
  };
  return (
    map[stage] ||
    (stage
      ? stage
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      : "")
  );
};

/**
 * Converts Markdown text to HTML
 * Supports headers, lists, bold, italic, and paragraphs
 * Same implementation as in ContentCreationPage.tsx and ResourcesPage.tsx
 * 
 * @param markdown - Markdown text string
 * @returns HTML string
 */
const markdownToHtml = (markdown: string): string => {
  if (!markdown) return "";

  const lines = markdown.split("\n");
  const result: string[] = [];
  let inList = false;
  let listItems: string[] = [];
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const paraText = currentParagraph.join(" ").trim();
      if (paraText) {
        // Process inline formatting
        let processed = paraText
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/__(.+?)__/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>")
          .replace(/_(.+?)_/g, "<em>$1</em>");
        result.push(`<p>${processed}</p>`);
      }
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      const listHtml = listItems
        .map((item) => {
          // Process inline formatting in list items
          const processed = item
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/__(.+?)__/g, "<strong>$1</strong>")
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            .replace(/_(.+?)_/g, "<em>$1</em>");
          return `<li>${processed}</li>`;
        })
        .join("\n");
      result.push(`<ul>${listHtml}</ul>`);
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith("### ")) {
      flushList();
      flushParagraph();
      const text = trimmed.substring(4).trim();
      result.push(`<h3>${text}</h3>`);
    } else if (trimmed.startsWith("## ")) {
      flushList();
      flushParagraph();
      const text = trimmed.substring(3).trim();
      result.push(`<h2>${text}</h2>`);
    } else if (trimmed.startsWith("# ")) {
      flushList();
      flushParagraph();
      const text = trimmed.substring(2).trim();
      result.push(`<h1>${text}</h1>`);
    }
    // Unordered list items
    else if (/^[-*+]\s+/.test(trimmed)) {
      flushParagraph();
      if (!inList) {
        inList = true;
      }
      const text = trimmed.replace(/^[-*+]\s+/, "").trim();
      listItems.push(text);
    }
    // Ordered list items
    else if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      if (!inList) {
        inList = true;
      }
      const text = trimmed.replace(/^\d+\.\s+/, "").trim();
      listItems.push(text);
    }
    // Empty line
    else if (trimmed === "") {
      flushList();
      flushParagraph();
    }
    // Regular paragraph text
    else {
      flushList();
      currentParagraph.push(trimmed);
    }
  });

  // Flush any remaining content
  flushList();
  flushParagraph();

  return result.join("\n");
};

/**
 * Resource interface
 * Defines the structure of a resource object
 */
interface Resource {
  resource_id: number;
  title: string;
  description?: string | null;
  resource_type: "article" | "video" | "guide";
  category?: string | null;
  target_developmental_stages?: string[] | null;
  status: "draft" | "published" | "archived";
  excerpt?: string | null;
  created_at: string;
  updated_at?: string | null;
  published_at?: string | null;
  thumbnail_url?: string | null;
  created_by?: number | null;
}

interface Report {
  report_id: number;
  report_type: "post" | "comment" | "community" | "user";
  reason: string;
  details?: string | null;
  status: "pending" | "resolved" | "dismissed";
  created_at: string;
  updated_at: string;
  reporter_id: number;
  reported_post_id?: number | null;
  reported_comment_id?: number | null;
  reported_community_id?: number | null;
  reported_user_id?: number | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  resolution_notes?: string | null;
}

type DashboardTab = "overview" | "content" | "moderation";

const ContentManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["overview", "content", "moderation"].includes(tabParam)) {
      return tabParam as DashboardTab;
    }
    return "overview";
  });
  const [resources, setResources] = useState<Resource[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [reportStatusFilter, setReportStatusFilter] = useState<string>("all");
  const [statusFilterFocused, setStatusFilterFocused] =
    useState<boolean>(false);
  const [typeFilterFocused, setTypeFilterFocused] = useState<boolean>(false);
  // Delete confirmation modal state
  const [showDeleteResourceModal, setShowDeleteResourceModal] =
    useState<Resource | null>(null);
  // Current user ID for filtering
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  // Report modals state
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showViewDetailsModal, setShowViewDetailsModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showDismissModal, setShowDismissModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [reportedContent, setReportedContent] = useState<any>(null);
  const [reporterInfo, setReporterInfo] = useState<any>(null);
  const [reviewerInfo, setReviewerInfo] = useState<any>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // Handle tab changes from URL query params and force reload
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const refreshParam = searchParams.get("refresh"); // Used to force reload when navigating via notification
    const successParam = searchParams.get("success"); // Used to show success toast when navigating from ContentCreationPage

    if (tabParam && ["overview", "content", "moderation"].includes(tabParam)) {
      const newTab = tabParam as DashboardTab;
      if (newTab !== activeTab) {
        setActiveTab(newTab);
      } else if (refreshParam) {
        // Same tab but refresh param present (e.g., from notification click), force reload
        loadData();
        // Remove refresh param from URL to clean it up
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete("refresh");
        setSearchParams(newSearchParams, { replace: true });
      }
    }

    // Handle success messages from ContentCreationPage
    if (successParam) {
      const message = decodeURIComponent(successParam);
      toast.success(message, {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
      // Remove success param from URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("success");
      setSearchParams(newSearchParams, { replace: true });
      // Reload resources to show the new/updated resource
      loadResources();
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Reload reports when filter changes (only in moderation tab)
  useEffect(() => {
    if (activeTab === "moderation") {
      loadReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportStatusFilter, activeTab]);

  // Fetch current user ID on component mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const { API_BASE_URL } = await import("../config/api");
        const response = await fetch(`${API_BASE_URL}/api/me`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setCurrentUserId(userData.user_id || null);
          setCurrentUserEmail(userData.email || null);
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };

    fetchCurrentUser();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      if (activeTab === "content" || activeTab === "overview") {
        await loadResources();
      }

      if (activeTab === "moderation" || activeTab === "overview") {
        await loadReports();
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error(error.message || "Failed to load data", {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
    } finally {
      setLoading(false);
    }
  };

  const loadResources = async () => {
    try {
      const params = new URLSearchParams();

      // Filter for last 30 days for Recent Content section
      if (activeTab === "overview") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        params.append("created_after", thirtyDaysAgo.toISOString());
      }

      const token = localStorage.getItem("auth_token");
      const { API_BASE_URL } = await import("../config/api");
      const response = await fetch(
        `${API_BASE_URL}/api/content-manager/resources?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to load resources");
      }

      const data = await response.json();
      let resourcesList = data.resources || [];

      // Filter drafts: only show drafts created by the current user
      // Published resources remain visible from all content managers
      if (currentUserId) {
        resourcesList = resourcesList.filter((resource: Resource) => {
          if (resource.status === "draft") {
            return resource.created_by === currentUserId;
          }
          return true; // Show all published resources
        });
      }

      setResources(resourcesList);
    } catch (error: any) {
      console.error("Error loading resources:", error);
      toast.error(error.message || "Failed to load resources", {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
    }
  };

  const loadReports = async () => {
    try {
      const params = new URLSearchParams();

      // Apply status filter based on active tab
      if (activeTab === "moderation") {
        // In moderation tab, respect the filter selection
        if (reportStatusFilter !== "all") {
          params.append("status", reportStatusFilter);
        }
        // No date filter in moderation tab - show all reports
      } else if (activeTab === "overview") {
        // In overview, only show pending reports from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        params.append("created_after", thirtyDaysAgo.toISOString());
        params.append("status", "pending");
      }

      const token = localStorage.getItem("auth_token");
      const { API_BASE_URL } = await import("../config/api");
      const response = await fetch(
        `${API_BASE_URL}/api/content-manager/reports?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to load reports");
      }

      const data = await response.json();
      setReports(data.reports || []);
    } catch (error: any) {
      console.error("Error loading reports:", error);
      // Don't show error toast for reports - might not be implemented yet
    }
  };

  const handleDeleteResourceClick = (resource: Resource) => {
    setShowDeleteResourceModal(resource);
  };

  const confirmDeleteResource = async () => {
    if (!showDeleteResourceModal) return;

    const checkbox = document.getElementById(
      "confirm-delete-resource",
    ) as HTMLInputElement;
    if (!checkbox?.checked) {
      toast.error(
        "Please confirm that you understand this action cannot be undone.",
        {
          style: { fontFamily: "'Poppins', sans-serif" },
        },
      );
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      const { API_BASE_URL } = await import("../config/api");
      const response = await fetch(
        `${API_BASE_URL}/api/content-manager/resources/${showDeleteResourceModal.resource_id}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete resource");
      }

      toast.success("Resource deleted successfully", {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
      loadResources();
      setShowDeleteResourceModal(null);
    } catch (error: any) {
      console.error("Error deleting resource:", error);
      toast.error(error.message || "Failed to delete resource", {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
    }
  };

  const handlePublishResource = async (resourceId: number) => {
    try {
      const token = localStorage.getItem("auth_token");
      const { API_BASE_URL } = await import("../config/api");
      const response = await fetch(
        `${API_BASE_URL}/api/content-manager/resources/${resourceId}/publish`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to publish resource");
      }

      toast.success("Resource published successfully", {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
      loadResources();
    } catch (error: any) {
      console.error("Error publishing resource:", error);
      toast.error(error.message || "Failed to publish resource", {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
    }
  };

  const handleUnpublishResource = async (resourceId: number) => {
    try {
      const token = localStorage.getItem("auth_token");
      const { API_BASE_URL } = await import("../config/api");
      const response = await fetch(
        `${API_BASE_URL}/api/content-manager/resources/${resourceId}/unpublish`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to unpublish resource");
      }

      toast.success("Resource unpublished successfully", {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
      loadResources();
    } catch (error: any) {
      console.error("Error unpublishing resource:", error);
      toast.error(error.message || "Failed to unpublish resource", {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
    }
  };

  const fetchReportDetails = async (report: Report) => {
    try {
      const token = localStorage.getItem("auth_token");
      const { API_BASE_URL } = await import("../config/api");

      // Fetch reporter info
      try {
        const reporterResponse = await fetch(
          `${API_BASE_URL}/api/users/${report.reporter_id}`,
          {
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );

        if (reporterResponse.ok) {
          const reporterData = await reporterResponse.json();
          setReporterInfo(reporterData);
        }
      } catch (error) {
        console.error("Error fetching reporter info:", error);
      }

      // Fetch reviewer info if report was reviewed
      if (report.reviewed_by) {
        // If reviewer is the current user, use /api/me to get email
        if (report.reviewed_by === currentUserId && currentUserEmail) {
          setReviewerInfo({ email: currentUserEmail });
        } else {
          // Try to fetch from /api/users/{user_id} (may fail if not admin)
          try {
            const reviewerResponse = await fetch(
              `${API_BASE_URL}/api/users/${report.reviewed_by}`,
              {
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
              },
            );

            if (reviewerResponse.ok) {
              const reviewerData = await reviewerResponse.json();
              setReviewerInfo(reviewerData);
            } else if (reviewerResponse.status === 403) {
              // Content manager doesn't have permission to view other users
              // Set reviewerInfo to null so it shows "User ID {id}" as fallback
              setReviewerInfo(null);
            }
          } catch (error) {
            console.error("Error fetching reviewer info:", error);
            setReviewerInfo(null);
          }
        }
      }

      // Fetch reported content based on type
      if (report.report_type === "post" && report.reported_post_id) {
        try {
          const postResponse = await fetch(
            `${API_BASE_URL}/api/posts/${report.reported_post_id}`,
            {
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            },
          );
          if (postResponse.ok) {
            const postData = await postResponse.json();
            setReportedContent(postData);
          } else if (postResponse.status === 404) {
            // Post might be flagged or deleted, show a message
            setReportedContent({
              type: "post",
              id: report.reported_post_id,
              error: "Post not found or has been removed",
              status: "flagged or deleted",
            });
          }
        } catch (error) {
          console.error("Error fetching post:", error);
          setReportedContent({
            type: "post",
            id: report.reported_post_id,
            error: "Failed to load post details",
          });
        }
      } else if (
        report.report_type === "comment" &&
        report.reported_comment_id
      ) {
        // For comments, we'll show the comment ID
        // Comments are typically fetched as part of post details, so we'll just show the ID
        setReportedContent({ type: "comment", id: report.reported_comment_id });
      } else if (
        report.report_type === "community" &&
        report.reported_community_id
      ) {
        try {
          // Fetch all communities and filter by ID (since there's no direct ID endpoint)
          const communityResponse = await fetch(
            `${API_BASE_URL}/api/communities`,
            {
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            },
          );
          if (communityResponse.ok) {
            const communitiesData = await communityResponse.json();
            // Find the community by ID
            const foundCommunity = Array.isArray(communitiesData)
              ? communitiesData.find(
                  (c: any) => c.community_id === report.reported_community_id,
                )
              : null;
            if (foundCommunity) {
              setReportedContent(foundCommunity);
            } else {
              // Community might be flagged, try to get it directly from database via a different approach
              // For now, just show the ID
              setReportedContent({
                type: "community",
                id: report.reported_community_id,
                error: "Community not found in visible list (may be flagged)",
              });
            }
          }
        } catch (error) {
          console.error("Error fetching community:", error);
          setReportedContent({
            type: "community",
            id: report.reported_community_id,
            error: "Failed to load community details",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching report details:", error);
    }
  };

  const handleResolveReport = async () => {
    if (!selectedReport) return;

    try {
      const token = localStorage.getItem("auth_token");
      const { API_BASE_URL } = await import("../config/api");
      const response = await fetch(
        `${API_BASE_URL}/api/content-manager/reports/${selectedReport.report_id}/resolve`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            resolution_notes: resolutionNotes.trim() || null,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to resolve report");
      }

      toast.success("Report resolved successfully", {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
      setShowResolveModal(false);
      setSelectedReport(null);
      setResolutionNotes("");
      loadReports();
    } catch (error: any) {
      console.error("Error resolving report:", error);
      toast.error(error.message || "Failed to resolve report", {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
    }
  };

  const handleDismissReport = async () => {
    if (!selectedReport) return;

    try {
      const token = localStorage.getItem("auth_token");
      const { API_BASE_URL } = await import("../config/api");
      const response = await fetch(
        `${API_BASE_URL}/api/content-manager/reports/${selectedReport.report_id}/dismiss`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            resolution_notes: resolutionNotes.trim() || null,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to dismiss report");
      }

      toast.success("Report dismissed successfully", {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
      setShowDismissModal(false);
      setSelectedReport(null);
      setResolutionNotes("");
      loadReports();
    } catch (error: any) {
      console.error("Error dismissing report:", error);
      toast.error(error.message || "Failed to dismiss report", {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
    loadResources();
  };

  const stats = [
    {
      label: "My Published",
      value: resources
        .filter(
          (r) => r.status === "published" && r.created_by === currentUserId,
        )
        .length.toString(),
      icon: CheckCircle,
      color: "#0F5648",
    },
    {
      label: "Total Published",
      value: resources
        .filter((r) => r.status === "published")
        .length.toString(),
      icon: LibraryBig,
      color: "#326586",
    },
    {
      label: "Drafts",
      value: resources.filter((r) => r.status === "draft").length.toString(),
      icon: Clock,
      color: "#AA855B",
    },
    {
      label: "Pending Reports",
      value: reports.length.toString(),
      icon: AlertTriangle,
      color: "#722F37",
    },
  ];

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      !searchTerm ||
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || resource.status === statusFilter;
    const matchesType =
      typeFilter === "all" || resource.resource_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      published: { bg: "#DCFCE7", text: "#0F5648" },
      draft: { bg: "#F5F5F5", text: "#AA855B" },
      archived: { bg: "#FEE2E2", text: "#DC2626" },
    };
    return styles[status as keyof typeof styles] || styles.draft;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-4 h-4" />;
      case "guide":
        return <FileText className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "video":
        return { bg: "#FEE2E2", text: "#DC2626" };
      case "guide":
        return { bg: "#DCFCE7", text: "#0F5648" };
      default:
        return { bg: "#DBEAFE", text: "#2563EB" };
    }
  };

  const getReportStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return { bg: "#FEF3C7", text: "#D97706" };
      case "resolved":
        return { bg: "#DCFCE7", text: "#0F5648" };
      case "dismissed":
        return { bg: "#F3F4F6", text: "#6B7280" };
      default:
        return { bg: "#FEE2E2", text: "#DC2626" };
    }
  };

  return (
    <div
      className="min-h-screen pt-16 sm:pt-20 md:pt-20 py-4 sm:py-6 md:py-8 font-['Poppins']"
      style={{ backgroundColor: "#FAEFE2" }}
    >
      <div className="max-w-full lg:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-10">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1
                className="text-xl sm:text-2xl md:text-3xl font-bold mb-1.5 sm:mb-2"
                style={{ color: "#32332D" }}
              >
                Content Manager Dashboard
              </h1>
              <p
                className="text-xs sm:text-sm"
                style={{
                  color: "#AA855B",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Content creation, moderation, and resource management
              </p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              <button
                onClick={() => {
                  // Store current tab in sessionStorage before navigating
                  sessionStorage.setItem("contentManagerLastTab", activeTab);
                  navigate("/content-manager/content/create");
                }}
                className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-sm font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg w-full sm:w-auto justify-center"
                style={{
                  backgroundColor: "#F2742C",
                  color: "#F5F5F5",
                  boxShadow: "0 4px 15px rgba(242, 116, 44, 0.3)",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = "#E55A1F";
                  event.currentTarget.style.boxShadow =
                    "0 6px 20px rgba(242, 116, 44, 0.4)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = "#F2742C";
                  event.currentTarget.style.boxShadow =
                    "0 4px 15px rgba(242, 116, 44, 0.3)";
                }}
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="whitespace-nowrap">Create Resource</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 sm:mb-6">
          <div
            className="flex space-x-1 p-1.5 sm:p-2 rounded-lg w-full sm:w-fit overflow-x-auto"
            style={{ backgroundColor: "#FCF9F8" }}
          >
            {[
              { id: "overview", label: "Overview" },
              { id: "content", label: "Content Library" },
              { id: "moderation", label: "Moderation" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as DashboardTab);
                  // Update URL to reflect tab change
                  const newSearchParams = new URLSearchParams(searchParams);
                  newSearchParams.set("tab", tab.id);
                  setSearchParams(newSearchParams, { replace: true });
                }}
                className={`flex items-center space-x-1.5 sm:space-x-2 py-1.5 sm:py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "shadow-sm"
                    : "opacity-70 hover:opacity-100"
                }`}
                style={{
                  backgroundColor:
                    activeTab === tab.id ? "#32332D" : "transparent",
                  color: activeTab === tab.id ? "#FFFFFF" : "#32332D",
                }}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={index}
                    className="rounded-2xl shadow-xl p-4 sm:p-5 transition-all duration-300 hover:shadow-2xl hover:scale-105"
                    style={{
                      backgroundColor: "#F5F5F5",
                      border: "1px solid #AA855B",
                    }}
                  >
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-md"
                        style={{ backgroundColor: stat.color }}
                      >
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                    </div>
                    <p
                      className="text-xl sm:text-2xl font-bold font-['Poppins'] mb-0.5 sm:mb-1"
                      style={{ color: "#32332D" }}
                    >
                      {stat.value}
                    </p>
                    <p
                      className="text-xs sm:text-sm font-['Poppins']"
                      style={{ color: "#AA855B" }}
                    >
                      {stat.label}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 items-stretch">
              {/* Recent Content */}
              <div className="lg:col-span-2 flex">
                <div
                  className="rounded-2xl shadow-xl p-4 sm:p-6 transition-all duration-300 hover:shadow-2xl flex flex-col w-full"
                  style={{
                    backgroundColor: "#F5F5F5",
                    border: "1px solid #AA855B",
                  }}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-3">
                    <h2
                      className="text-lg sm:text-xl font-bold font-['Poppins']"
                      style={{ color: "#32332D" }}
                    >
                      Recent Content
                    </h2>
                    <button
                      onClick={() => {
                        // Store current tab in sessionStorage before navigating
                        sessionStorage.setItem(
                          "contentManagerLastTab",
                          activeTab,
                        );
                        navigate("/content-manager/content/create");
                      }}
                      className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-sm text-white font-medium font-['Poppins'] transition-colors w-full sm:w-auto justify-center"
                      style={{ backgroundColor: "#F2742C" }}
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="whitespace-nowrap">Create New</span>
                    </button>
                  </div>
                  {loading ? (
                    <div className="text-center py-8">
                      <div
                        className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
                        style={{ borderColor: "#326586" }}
                      ></div>
                    </div>
                  ) : filteredResources.length === 0 ? (
                    <p
                      className="text-xs sm:text-sm text-center py-6 sm:py-8"
                      style={{ color: "#AA855B" }}
                    >
                      No resources yet. Create your first resource!
                    </p>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {filteredResources.slice(0, 5).map((resource) => {
                        const statusStyle = getStatusBadge(resource.status);
                        const typeColor = getTypeColor(resource.resource_type);
                        return (
                          <div
                            key={resource.resource_id}
                            className="p-3 sm:p-4 rounded-xl transition-all duration-300 hover:shadow-lg"
                            style={{
                              backgroundColor: "#FFFFFF",
                              border: "1px solid #AA855B",
                            }}
                          >
                            {/* Row 1: Title and Date */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                              <div className="flex-1 min-w-0">
                                <h3
                                  className="text-sm sm:text-base font-semibold font-['Poppins'] mb-1"
                                  style={{ color: "#32332D" }}
                                >
                                  {resource.title}
                                </h3>
                                <p
                                  className="text-[10px] sm:text-xs font-['Poppins']"
                                  style={{ color: "#AA855B" }}
                                >
                                  {new Date(
                                    resource.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            {/* Row 2: Badges - Created by you, Type, Category, Stages */}
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3">
                              {currentUserId &&
                                resource.created_by === currentUserId && (
                                  <span
                                    className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full font-['Poppins']"
                                    style={{
                                      backgroundColor: "#FDF2E8",
                                      color: "#F2742C",
                                      border: "1px solid #F0DCC9",
                                    }}
                                  >
                                    Created by you
                                  </span>
                                )}
                              <span
                                className="px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full font-['Poppins'] whitespace-nowrap inline-flex items-center gap-0.5 sm:gap-1"
                                style={{
                                  backgroundColor: typeColor.bg,
                                  color: typeColor.text,
                                }}
                              >
                                {getTypeIcon(resource.resource_type)}
                                <span className="capitalize">
                                  {resource.resource_type}
                                </span>
                              </span>
                              {resource.category && (
                                <span
                                  className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full font-['Poppins']"
                                  style={{
                                    backgroundColor: "#DBEAFE",
                                    color: "#2563EB",
                                  }}
                                >
                                  {resource.category}
                                </span>
                              )}
                              {resource.target_developmental_stages &&
                                resource.target_developmental_stages.length >
                                  0 && (
                                  <span
                                    className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full font-['Poppins']"
                                    style={{
                                      backgroundColor: "#F5F5F5",
                                      color: "#AA855B",
                                    }}
                                  >
                                    {resource.target_developmental_stages
                                      .map((stage: string) =>
                                        formatDevelopmentalStage(stage),
                                      )
                                      .join(", ")}
                                  </span>
                                )}
                            </div>

                            {/* Row 3: Description */}
                            {resource.description && (
                              <p
                                className="text-xs sm:text-sm font-['Poppins'] mb-3 line-clamp-2"
                                style={{ color: "#32332D" }}
                              >
                                {resource.description}
                              </p>
                            )}

                            {/* Row 4: Status Badge and View in Content Library Link */}
                            <div
                              className="flex flex-row items-center justify-between gap-1.5 sm:gap-2 pt-3 border-t"
                              style={{ borderColor: "#F0DCC9" }}
                            >
                              <span
                                className="px-1.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-sm font-medium rounded-full font-['Poppins'] whitespace-nowrap flex-shrink-0"
                                style={{
                                  backgroundColor: statusStyle.bg,
                                  color: statusStyle.text,
                                }}
                              >
                                {resource.status === "published"
                                  ? "Published"
                                  : "Draft"}
                              </span>
                              <button
                                onClick={() => {
                                  setActiveTab("content");
                                  const newSearchParams = new URLSearchParams(
                                    searchParams,
                                  );
                                  newSearchParams.set("tab", "content");
                                  setSearchParams(newSearchParams, {
                                    replace: true,
                                  });
                                  // Scroll to the resource after tab switch
                                  setTimeout(() => {
                                    const element = document.getElementById(
                                      `resource-${resource.resource_id}`,
                                    );
                                    if (element) {
                                      element.scrollIntoView({
                                        behavior: "smooth",
                                        block: "center",
                                      });
                                    }
                                  }, 100);
                                }}
                                className="text-[10px] sm:text-xs font-medium font-['Poppins'] hover:underline flex-shrink-0"
                                style={{ color: "#326586" }}
                              >
                                View in Content Library →
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Pending Reports */}
              <div className="flex">
                <div
                  className="rounded-2xl shadow-xl p-4 sm:p-6 transition-all duration-300 hover:shadow-2xl flex flex-col w-full"
                  style={{
                    backgroundColor: "#F5F5F5",
                    border: "1px solid #AA855B",
                  }}
                >
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h2
                      className="text-lg sm:text-xl font-bold font-['Poppins']"
                      style={{ color: "#32332D" }}
                    >
                      Pending Reports
                    </h2>
                    <div className="w-0"></div>
                  </div>
                  {loading ? (
                    <div className="text-center py-6 sm:py-8">
                      <div
                        className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2"
                        style={{ borderColor: "#326586" }}
                      ></div>
                    </div>
                  ) : reports.length === 0 ? (
                    <p
                      className="text-xs sm:text-sm text-center py-6 sm:py-8"
                      style={{ color: "#AA855B" }}
                    >
                      No pending reports
                    </p>
                  ) : (
                    <div className="space-y-2.5 sm:space-y-3">
                      {reports.slice(0, 5).map((report) => (
                        <div
                          key={report.report_id}
                          className="p-2.5 sm:p-3 rounded-xl transition-all duration-300 hover:shadow-lg"
                          style={{
                            backgroundColor: "#FFFFFF",
                            border: "1px solid #AA855B",
                          }}
                        >
                          <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                            <div className="flex items-center space-x-1.5 sm:space-x-2">
                              <AlertTriangle
                                className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                                style={{ color: "#F2742C" }}
                              />
                              <span
                                className="text-xs sm:text-sm font-medium font-['Poppins'] capitalize"
                                style={{ color: "#32332D" }}
                              >
                                {report.report_type}
                              </span>
                            </div>
                          </div>
                          <p
                            className="text-[10px] sm:text-xs mb-1 font-['Poppins']"
                            style={{ color: "#AA855B" }}
                          >
                            {report.reason}
                          </p>
                          <button
                            onClick={() => {
                              setActiveTab("moderation");
                              const newSearchParams = new URLSearchParams(
                                searchParams,
                              );
                              newSearchParams.set("tab", "moderation");
                              setSearchParams(newSearchParams, {
                                replace: true,
                              });
                            }}
                            className="text-[10px] sm:text-xs font-medium font-['Poppins']"
                            style={{ color: "#326586" }}
                          >
                            View in Moderation →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "content" && (
          <div className="space-y-4 sm:space-y-6">
            {/* Content Library Header */}
            <div
              className="rounded-2xl shadow-xl p-4 sm:p-6 transition-all duration-300 hover:shadow-2xl"
              style={{
                backgroundColor: "#F5F5F5",
                border: "1px solid #AA855B",
              }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                <h2
                  className="text-lg sm:text-xl font-bold font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  Content Library
                </h2>
                <button
                  onClick={() => {
                    // Store current tab in sessionStorage before navigating
                    sessionStorage.setItem("contentManagerLastTab", activeTab);
                    navigate("/content-manager/content/create");
                  }}
                  className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-sm font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg w-full sm:w-auto justify-center"
                  style={{
                    backgroundColor: "#F2742C",
                    color: "#F5F5F5",
                    boxShadow: "0 4px 15px rgba(242, 116, 44, 0.3)",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor = "#E55A1F";
                    event.currentTarget.style.boxShadow =
                      "0 6px 20px rgba(242, 116, 44, 0.4)";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor = "#F2742C";
                    event.currentTarget.style.boxShadow =
                      "0 4px 15px rgba(242, 116, 44, 0.3)";
                  }}
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="whitespace-nowrap">Create New</span>
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                {/* Search Bar - Full Width */}
                <div className="flex-1 relative">
                  <Search
                    className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5"
                    style={{ color: "#AA855B" }}
                  />
                  <input
                    type="search"
                    placeholder="Search resources..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
                    style={{
                      borderColor: "#AA855B",
                      backgroundColor: "#FAEFE2",
                      color: "#32332D",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#32332D";
                      e.target.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#AA855B";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* Filter Row - Filter Icon, All Status, All Types, Refresh Button */}
                <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-nowrap">
                  <Filter
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    style={{ color: "#AA855B" }}
                  />

                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      onFocus={() => setStatusFilterFocused(true)}
                      onBlur={() => setStatusFilterFocused(false)}
                      className="px-2 sm:px-3 py-1.5 sm:py-2 pr-7 sm:pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
                      style={{
                        borderColor: "#AA855B",
                        backgroundColor: "#FAEFE2",
                        color: "#32332D",
                        fontFamily: "'Poppins', sans-serif",
                        appearance: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                        backgroundImage: "none",
                      }}
                    >
                      <option value="all">All Status</option>
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                    {statusFilterFocused ? (
                      <ChevronUp
                        className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                        style={{ color: "#AA855B" }}
                        size={14}
                      />
                    ) : (
                      <ChevronDown
                        className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                        style={{ color: "#AA855B" }}
                        size={14}
                      />
                    )}
                  </div>

                  <div className="relative">
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      onFocus={() => setTypeFilterFocused(true)}
                      onBlur={() => setTypeFilterFocused(false)}
                      className="px-2 sm:px-3 py-1.5 sm:py-2 pr-7 sm:pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
                      style={{
                        borderColor: "#AA855B",
                        backgroundColor: "#FAEFE2",
                        color: "#32332D",
                        fontFamily: "'Poppins', sans-serif",
                        appearance: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                        backgroundImage: "none",
                      }}
                    >
                      <option value="all">All Types</option>
                      <option value="article">Article</option>
                      <option value="video">Video</option>
                      <option value="guide">Guide</option>
                    </select>
                    {typeFilterFocused ? (
                      <ChevronUp
                        className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                        style={{ color: "#AA855B" }}
                        size={14}
                      />
                    ) : (
                      <ChevronDown
                        className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                        style={{ color: "#AA855B" }}
                        size={14}
                      />
                    )}
                  </div>

                  <button
                    onClick={handleResetFilters}
                    className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200 flex items-center justify-center"
                    style={{ backgroundColor: "#AA855B", color: "#F5F5F5" }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.backgroundColor = "#8B6F4A";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = "#AA855B";
                    }}
                    title="Reset search and filters"
                  >
                    <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>

              {/* Resources List */}
              {loading ? (
                <div className="text-center py-8 sm:py-12">
                  <div
                    className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2"
                    style={{ borderColor: "#326586" }}
                  ></div>
                </div>
              ) : filteredResources.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <LibraryBig
                    className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4"
                    style={{ color: "#AA855B" }}
                  />
                  <h3
                    className="text-base sm:text-lg font-medium mb-1.5 sm:mb-2 font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    No resources found
                  </h3>
                  <p
                    className="text-xs sm:text-sm mb-3 sm:mb-4"
                    style={{ color: "#AA855B" }}
                  >
                    {searchTerm ||
                    statusFilter !== "all" ||
                    typeFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Create your first resource"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {filteredResources.map((resource) => {
                    const statusStyle = getStatusBadge(resource.status);
                    const typeColor = getTypeColor(resource.resource_type);
                    return (
                      <div
                        key={resource.resource_id}
                        id={`resource-${resource.resource_id}`}
                        onClick={() => {
                          // Store current tab in sessionStorage before navigating
                          sessionStorage.setItem(
                            "contentManagerLastTab",
                            activeTab,
                          );
                          navigate(
                            `/content-manager/content/${resource.resource_id}/edit`,
                          );
                        }}
                        className="p-4 sm:p-6 rounded-xl transition-all duration-300 hover:shadow-lg cursor-pointer"
                        style={{
                          backgroundColor: "#FFFFFF",
                          border: "1px solid #AA855B",
                        }}
                      >
                        {/* Row 1: Title and Date */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                          <div className="flex-1 min-w-0">
                            <h3
                              className="text-base sm:text-lg font-semibold font-['Poppins'] mb-1"
                              style={{ color: "#32332D" }}
                            >
                              {resource.title}
                            </h3>
                            <p
                              className="text-xs font-['Poppins']"
                              style={{ color: "#AA855B" }}
                            >
                              {new Date(
                                resource.created_at,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {/* Row 2: Badges - Created by you, Type, Category, Stages */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3">
                          {currentUserId &&
                            resource.created_by === currentUserId && (
                              <span
                                className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full font-['Poppins']"
                                style={{
                                  backgroundColor: "#FDF2E8",
                                  color: "#F2742C",
                                  border: "1px solid #F0DCC9",
                                }}
                              >
                                Created by you
                              </span>
                            )}
                          <span
                            className="px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full font-['Poppins'] whitespace-nowrap inline-flex items-center gap-0.5 sm:gap-1"
                            style={{
                              backgroundColor: typeColor.bg,
                              color: typeColor.text,
                            }}
                          >
                            {getTypeIcon(resource.resource_type)}
                            <span className="capitalize">
                              {resource.resource_type}
                            </span>
                          </span>
                          {resource.category && (
                            <span
                              className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full font-['Poppins']"
                              style={{
                                backgroundColor: "#DBEAFE",
                                color: "#2563EB",
                              }}
                            >
                              {resource.category}
                            </span>
                          )}
                          {resource.target_developmental_stages &&
                            resource.target_developmental_stages.length > 0 && (
                              <span
                                className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full font-['Poppins']"
                                style={{
                                  backgroundColor: "#F5F5F5",
                                  color: "#AA855B",
                                }}
                              >
                                {resource.target_developmental_stages
                                  .map((stage: string) =>
                                    formatDevelopmentalStage(stage),
                                  )
                                  .join(", ")}
                              </span>
                            )}
                        </div>

                        {/* Row 3: Description */}
                        {resource.description && (
                          <p
                            className="text-xs sm:text-sm font-['Poppins'] mb-3 line-clamp-2"
                            style={{ color: "#32332D" }}
                          >
                            {resource.description}
                          </p>
                        )}

                        {/* Row 4: Excerpt */}
                        {resource.excerpt && (
                          <div
                            className="text-[10px] sm:text-xs font-['Poppins'] mb-3 excerpt-preview line-clamp-2"
                            style={{ color: "#AA855B" }}
                            dangerouslySetInnerHTML={{
                              __html:
                                resource.excerpt.includes("<") &&
                                resource.excerpt.includes(">")
                                  ? resource.excerpt
                                  : markdownToHtml(resource.excerpt),
                            }}
                          />
                        )}

                        {/* Row 5: Status Badge, Actions - All in one line */}
                        <div
                          className="flex flex-row items-center justify-between gap-1.5 sm:gap-2 pt-3 border-t"
                          style={{ borderColor: "#F0DCC9" }}
                        >
                          <span
                            className="px-1.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-sm font-medium rounded-full font-['Poppins'] whitespace-nowrap flex-shrink-0"
                            style={{
                              backgroundColor: statusStyle.bg,
                              color: statusStyle.text,
                            }}
                          >
                            {resource.status === "published"
                              ? "Published"
                              : "Draft"}
                          </span>
                          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                            {resource.status === "published" ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnpublishResource(resource.resource_id);
                                }}
                                className="px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-lg text-[9px] sm:text-xs font-medium font-['Poppins'] transition-all duration-200 whitespace-nowrap"
                                style={{
                                  backgroundColor: "#AA855B",
                                  color: "#FFFFFF",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    "#8B6F4A";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    "#AA855B";
                                }}
                              >
                                Unpublish
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePublishResource(resource.resource_id);
                                }}
                                className="px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-lg text-[9px] sm:text-xs font-medium font-['Poppins'] transition-all duration-200 whitespace-nowrap"
                                style={{
                                  backgroundColor: "#0F5648",
                                  color: "#FFFFFF",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    "#0A4538";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    "#0F5648";
                                }}
                              >
                                Publish
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                sessionStorage.setItem(
                                  "contentManagerLastTab",
                                  activeTab,
                                );
                                navigate(
                                  `/content-manager/content/${resource.resource_id}/edit`,
                                );
                              }}
                              className="p-1 sm:p-2 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
                              style={{ color: "#326586" }}
                            >
                              <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                            {currentUserId &&
                              resource.created_by === currentUserId && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteResourceClick(resource);
                                  }}
                                  className="p-1 sm:p-2 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
                                  style={{ color: "#DC2626" }}
                                >
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "moderation" && (
          <div
            className="rounded-xl p-4 sm:p-6"
            style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
              <h2
                className="text-lg sm:text-xl font-bold font-['Poppins']"
                style={{ color: "#32332D" }}
              >
                Content Moderation
              </h2>
              <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                <Filter
                  className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                  style={{ color: "#AA855B" }}
                />
                <div className="relative flex-1 sm:flex-none">
                  <select
                    value={reportStatusFilter}
                    onChange={(e) => {
                      setReportStatusFilter(e.target.value);
                      // loadReports will be called by useEffect when reportStatusFilter changes
                    }}
                    className="px-2.5 sm:px-3 py-1.5 sm:py-2 pr-6 sm:pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm w-full sm:w-auto"
                    style={{
                      borderColor: "#AA855B",
                      backgroundColor: "#FAEFE2",
                      color: "#32332D",
                      fontFamily: "'Poppins', sans-serif",
                      appearance: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                      backgroundImage: "none",
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                  <ChevronDown
                    className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                    style={{ color: "#AA855B" }}
                    size={14}
                  />
                </div>
              </div>
            </div>
            {loading ? (
              <div className="text-center py-8 sm:py-12">
                <div
                  className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2"
                  style={{ borderColor: "#326586" }}
                ></div>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Shield
                  className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4"
                  style={{ color: "#AA855B" }}
                />
                <h3
                  className="text-base sm:text-lg font-medium mb-1.5 sm:mb-2 font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  No reports found
                </h3>
                <p className="text-xs sm:text-sm" style={{ color: "#AA855B" }}>
                  {reportStatusFilter === "all"
                    ? "No reports available"
                    : `No ${reportStatusFilter} reports`}
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.report_id}
                    className="p-4 sm:p-6 rounded-xl transition-all duration-300 hover:shadow-lg"
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #AA855B",
                    }}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-3">
                      <div className="flex-1 w-full">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-1.5 sm:mb-2 gap-2">
                          <div className="flex items-center space-x-1.5 sm:space-x-2">
                            <AlertTriangle
                              className="w-4 h-4 sm:w-5 sm:h-5"
                              style={{ color: "#F2742C" }}
                            />
                            <h3
                              className="text-sm sm:text-base font-semibold font-['Poppins'] capitalize"
                              style={{ color: "#32332D" }}
                            >
                              {report.report_type} Report
                            </h3>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                            <p
                              className="text-[10px] sm:text-xs font-['Poppins'] whitespace-nowrap"
                              style={{ color: "#AA855B" }}
                            >
                              Reported on:{" "}
                              {new Date(report.created_at).toLocaleDateString()}
                            </p>
                            {(() => {
                              const statusStyle = getReportStatusBadge(
                                report.status,
                              );
                              return (
                                <span
                                  className="px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-medium rounded-full font-['Poppins'] capitalize"
                                  style={{
                                    backgroundColor: statusStyle.bg,
                                    color: statusStyle.text,
                                  }}
                                >
                                  {report.status}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        <p
                          className="text-xs sm:text-sm font-['Poppins'] mb-1"
                          style={{ color: "#32332D" }}
                        >
                          Reason: {report.reason}
                        </p>
                        {report.details && (
                          <p
                            className="text-xs sm:text-sm font-['Poppins']"
                            style={{ color: "#AA855B" }}
                          >
                            {report.details}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                      {report.status === "pending" && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedReport(report);
                              setResolutionNotes("");
                              setShowResolveModal(true);
                            }}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium font-['Poppins'] transition-all duration-200 shadow-lg hover:shadow-xl"
                            style={{
                              backgroundColor: "#16A34A",
                              color: "#FFFFFF",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#15803D";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#16A34A";
                            }}
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReport(report);
                              setResolutionNotes("");
                              setShowDismissModal(true);
                            }}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium font-['Poppins'] transition-all duration-200 shadow-lg hover:shadow-xl"
                            style={{
                              backgroundColor: "#DC2626",
                              color: "#FFFFFF",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#B91C1C";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#DC2626";
                            }}
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                      <button
                        onClick={async () => {
                          setSelectedReport(report);
                          setShowViewDetailsModal(true);
                          // Fetch report details and reported content
                          await fetchReportDetails(report);
                        }}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium font-['Poppins'] transition-all duration-200"
                        style={{
                          border: "1px solid #AA855B",
                          color: "#AA855B",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#AA855B";
                          e.currentTarget.style.color = "#FFFFFF";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "#AA855B";
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Delete Resource Confirmation Modal */}
        {showDeleteResourceModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDeleteResourceModal(null);
              }
            }}
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3
                  className="text-lg font-semibold font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  Delete Resource
                </h3>
                <button
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowDeleteResourceModal(null)}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h4
                      className="font-medium mb-1 font-['Poppins']"
                      style={{ color: "#32332D" }}
                    >
                      {showDeleteResourceModal.title}
                    </h4>
                    {showDeleteResourceModal.description && (
                      <p
                        className="text-xs font-['Poppins'] line-clamp-2"
                        style={{ color: "#64635E" }}
                      >
                        {showDeleteResourceModal.description}
                      </p>
                    )}
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
                    Deleting this resource will permanently remove it and all
                    its attachments. This action cannot be undone.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="confirm-delete-resource"
                    className="w-4 h-4 rounded"
                    style={{ accentColor: "#EF4444" }}
                  />
                  <label
                    htmlFor="confirm-delete-resource"
                    className="text-sm font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    I understand this action cannot be undone
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-lg font-medium border transition-all duration-200 font-['Poppins']"
                  style={{ borderColor: "#AA855B", color: "#AA855B" }}
                  onClick={() => setShowDeleteResourceModal(null)}
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
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-200 font-['Poppins']"
                  style={{ backgroundColor: "#EF4444", color: "#FFFFFF" }}
                  onClick={confirmDeleteResource}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#DC2626";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#EF4444";
                  }}
                >
                  Delete Resource
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Details Modal - Full screen on mobile/tablet, modal on desktop */}
        {showViewDetailsModal && selectedReport && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowViewDetailsModal(false);
                setSelectedReport(null);
                setReportedContent(null);
                setReporterInfo(null);
                setReviewerInfo(null);
              }
            }}
          >
            <div className="bg-white rounded-none sm:rounded-2xl shadow-xl max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
              {/* Fixed Header */}
              <div
                className="flex items-center justify-between p-3 sm:p-4 md:p-6 border-b flex-shrink-0"
                style={{ borderColor: "#F0DCC9" }}
              >
                <h3
                  className="text-base sm:text-lg md:text-xl font-semibold font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  Report Details
                </h3>
                <button
                  className="p-1.5 sm:p-2 rounded-full text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                  onClick={() => {
                    setShowViewDetailsModal(false);
                    setSelectedReport(null);
                    setReportedContent(null);
                    setReporterInfo(null);
                    setReviewerInfo(null);
                  }}
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                {/* Report Information */}
                <div
                  className="p-3 sm:p-4 rounded-lg"
                  style={{
                    backgroundColor: "#F5F5F5",
                    border: "1px solid #AA855B",
                  }}
                >
                  <h4
                    className="font-semibold mb-2 sm:mb-3 font-['Poppins'] text-sm sm:text-base"
                    style={{ color: "#32332D" }}
                  >
                    Report Information
                  </h4>
                  <div className="space-y-2 text-xs sm:text-sm font-['Poppins']">
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                      <span
                        className="font-medium sm:font-medium"
                        style={{
                          color: "#64635E",
                          minWidth: "120px",
                          width: "auto",
                        }}
                      >
                        Report Type:
                      </span>
                      <span style={{ color: "#32332D" }} className="capitalize">
                        {selectedReport.report_type}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                      <span
                        className="font-medium sm:font-medium"
                        style={{
                          color: "#64635E",
                          minWidth: "120px",
                          width: "auto",
                        }}
                      >
                        Reason:
                      </span>
                      <span
                        style={{ color: "#32332D" }}
                        className="capitalize break-words"
                      >
                        {selectedReport.reason}
                      </span>
                    </div>
                    {selectedReport.details && (
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                        <span
                          className="font-medium sm:font-medium"
                          style={{
                            color: "#64635E",
                            minWidth: "120px",
                            width: "auto",
                          }}
                        >
                          Details:
                        </span>
                        <span
                          style={{ color: "#32332D" }}
                          className="break-words"
                        >
                          {selectedReport.details}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-0 items-start sm:items-center">
                      <span
                        className="font-medium sm:font-medium"
                        style={{
                          color: "#64635E",
                          minWidth: "120px",
                          width: "auto",
                        }}
                      >
                        Status:
                      </span>
                      {(() => {
                        const statusStyle = getReportStatusBadge(
                          selectedReport.status,
                        );
                        return (
                          <span
                            className="px-2 py-1 text-[10px] sm:text-xs font-medium rounded-full capitalize"
                            style={{
                              backgroundColor: statusStyle.bg,
                              color: statusStyle.text,
                            }}
                          >
                            {selectedReport.status}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                      <span
                        className="font-medium sm:font-medium"
                        style={{
                          color: "#64635E",
                          minWidth: "120px",
                          width: "auto",
                        }}
                      >
                        Reported On:
                      </span>
                      <span
                        style={{ color: "#32332D" }}
                        className="break-words"
                      >
                        {new Date(selectedReport.created_at).toLocaleString()}
                      </span>
                    </div>
                    {selectedReport.updated_at && (
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                        <span
                          className="font-medium sm:font-medium"
                          style={{
                            color: "#64635E",
                            minWidth: "120px",
                            width: "auto",
                          }}
                        >
                          Last Updated:
                        </span>
                        <span
                          style={{ color: "#32332D" }}
                          className="break-words"
                        >
                          {new Date(selectedReport.updated_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reporter Information */}
                {reporterInfo && (
                  <div
                    className="p-3 sm:p-4 rounded-lg"
                    style={{
                      backgroundColor: "#F5F5F5",
                      border: "1px solid #AA855B",
                    }}
                  >
                    <h4
                      className="font-semibold mb-2 sm:mb-3 font-['Poppins'] text-sm sm:text-base"
                      style={{ color: "#32332D" }}
                    >
                      Reporter Information
                    </h4>
                    <div className="space-y-2 text-xs sm:text-sm font-['Poppins']">
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                        <span
                          className="font-medium sm:font-medium"
                          style={{
                            color: "#64635E",
                            minWidth: "120px",
                            width: "auto",
                          }}
                        >
                          Reporter ID:
                        </span>
                        <span style={{ color: "#32332D" }}>
                          {selectedReport.reporter_id}
                        </span>
                      </div>
                      {reporterInfo.email && (
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                          <span
                            className="font-medium sm:font-medium"
                            style={{
                              color: "#64635E",
                              minWidth: "120px",
                              width: "auto",
                            }}
                          >
                            Email:
                          </span>
                          <span
                            style={{ color: "#32332D" }}
                            className="break-words"
                          >
                            {reporterInfo.email}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Reported Content */}
                {reportedContent && (
                  <div
                    className="p-3 sm:p-4 rounded-lg"
                    style={{
                      backgroundColor: "#F5F5F5",
                      border: "1px solid #AA855B",
                    }}
                  >
                    <h4
                      className="font-semibold mb-2 sm:mb-3 font-['Poppins'] text-sm sm:text-base"
                      style={{ color: "#32332D" }}
                    >
                      Reported{" "}
                      {selectedReport.report_type.charAt(0).toUpperCase() +
                        selectedReport.report_type.slice(1)}{" "}
                      Content
                    </h4>
                    {selectedReport.report_type === "post" && (
                      <>
                        {reportedContent.error ? (
                          <div
                            className="text-xs sm:text-sm font-['Poppins']"
                            style={{ color: "#DC2626" }}
                          >
                            {reportedContent.error} (Post ID:{" "}
                            {selectedReport.reported_post_id})
                          </div>
                        ) : reportedContent.title ? (
                          <div className="space-y-2 text-xs sm:text-sm font-['Poppins']">
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                              <span
                                className="font-medium"
                                style={{
                                  color: "#64635E",
                                  minWidth: "80px",
                                  width: "auto",
                                }}
                              >
                                Title:{" "}
                              </span>
                              <span
                                style={{ color: "#32332D" }}
                                className="break-words"
                              >
                                {reportedContent.title}
                              </span>
                            </div>
                            {reportedContent.body && (
                              <div className="flex flex-col gap-1">
                                <span
                                  className="font-medium"
                                  style={{ color: "#64635E" }}
                                >
                                  Content:{" "}
                                </span>
                                <div
                                  className="mt-1 p-2 sm:p-3 rounded"
                                  style={{ backgroundColor: "#FFFFFF" }}
                                >
                                  <span
                                    style={{ color: "#32332D" }}
                                    className="break-words text-xs sm:text-sm"
                                  >
                                    {reportedContent.body}
                                  </span>
                                </div>
                              </div>
                            )}
                            {reportedContent.author && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                                <span
                                  className="font-medium"
                                  style={{
                                    color: "#64635E",
                                    minWidth: "80px",
                                    width: "auto",
                                  }}
                                >
                                  Author:{" "}
                                </span>
                                <span
                                  style={{ color: "#32332D" }}
                                  className="break-words"
                                >
                                  {reportedContent.author}
                                </span>
                              </div>
                            )}
                            {reportedContent.community_id && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                                <span
                                  className="font-medium"
                                  style={{
                                    color: "#64635E",
                                    minWidth: "120px",
                                    width: "auto",
                                  }}
                                >
                                  Community ID:{" "}
                                </span>
                                <span style={{ color: "#32332D" }}>
                                  {reportedContent.community_id}
                                </span>
                              </div>
                            )}
                            {reportedContent.status && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-0 items-start sm:items-center">
                                <span
                                  className="font-medium"
                                  style={{
                                    color: "#64635E",
                                    minWidth: "80px",
                                    width: "auto",
                                  }}
                                >
                                  Status:{" "}
                                </span>
                                <span
                                  style={{ color: "#32332D" }}
                                  className="capitalize"
                                >
                                  {reportedContent.status}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className="text-xs sm:text-sm font-['Poppins']"
                            style={{ color: "#64635E" }}
                          >
                            Loading post details...
                          </div>
                        )}
                      </>
                    )}
                    {selectedReport.report_type === "community" && (
                      <>
                        {reportedContent.error ? (
                          <div
                            className="text-xs sm:text-sm font-['Poppins']"
                            style={{ color: "#DC2626" }}
                          >
                            {reportedContent.error} (Community ID:{" "}
                            {selectedReport.reported_community_id})
                          </div>
                        ) : reportedContent.name ? (
                          <div className="space-y-2 text-xs sm:text-sm font-['Poppins']">
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                              <span
                                className="font-medium"
                                style={{
                                  color: "#64635E",
                                  minWidth: "80px",
                                  width: "auto",
                                }}
                              >
                                Name:{" "}
                              </span>
                              <span
                                style={{ color: "#32332D" }}
                                className="break-words"
                              >
                                {reportedContent.name}
                              </span>
                            </div>
                            {reportedContent.description && (
                              <div className="flex flex-col gap-1">
                                <span
                                  className="font-medium"
                                  style={{ color: "#64635E" }}
                                >
                                  Description:{" "}
                                </span>
                                <div
                                  className="mt-1 p-2 sm:p-3 rounded"
                                  style={{ backgroundColor: "#FFFFFF" }}
                                >
                                  <span
                                    style={{ color: "#32332D" }}
                                    className="break-words text-xs sm:text-sm"
                                  >
                                    {reportedContent.description}
                                  </span>
                                </div>
                              </div>
                            )}
                            {reportedContent.status && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-0 items-start sm:items-center">
                                <span
                                  className="font-medium"
                                  style={{
                                    color: "#64635E",
                                    minWidth: "80px",
                                    width: "auto",
                                  }}
                                >
                                  Status:{" "}
                                </span>
                                <span
                                  style={{ color: "#32332D" }}
                                  className="capitalize"
                                >
                                  {reportedContent.status}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className="text-xs sm:text-sm font-['Poppins']"
                            style={{ color: "#64635E" }}
                          >
                            Loading community details...
                          </div>
                        )}
                      </>
                    )}
                    {selectedReport.report_type === "comment" && (
                      <div
                        className="text-xs sm:text-sm font-['Poppins']"
                        style={{ color: "#64635E" }}
                      >
                        Comment ID: {selectedReport.reported_comment_id}
                        <br />
                        <span
                          className="text-[10px] sm:text-xs"
                          style={{ color: "#AA855B" }}
                        >
                          (Comment details are typically viewed within the post
                          context)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action History */}
                {(selectedReport.reviewed_by ||
                  selectedReport.reviewed_at ||
                  selectedReport.resolution_notes) && (
                  <div
                    className="p-3 sm:p-4 rounded-lg"
                    style={{
                      backgroundColor: "#F5F5F5",
                      border: "1px solid #AA855B",
                    }}
                  >
                    <h4
                      className="font-semibold mb-2 sm:mb-3 font-['Poppins'] text-sm sm:text-base"
                      style={{ color: "#32332D" }}
                    >
                      Action History
                    </h4>
                    <div className="space-y-2 text-xs sm:text-sm font-['Poppins']">
                      {selectedReport.reviewed_by && (
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                          <span
                            className="font-medium sm:font-medium"
                            style={{
                              color: "#64635E",
                              minWidth: "120px",
                              width: "auto",
                            }}
                          >
                            Reviewed By:
                          </span>
                          <span
                            style={{ color: "#32332D" }}
                            className="break-words"
                          >
                            {reviewerInfo?.email
                              ? reviewerInfo.email
                              : `User ID ${selectedReport.reviewed_by}`}
                          </span>
                        </div>
                      )}
                      {selectedReport.reviewed_at && (
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-0">
                          <span
                            className="font-medium sm:font-medium"
                            style={{
                              color: "#64635E",
                              minWidth: "120px",
                              width: "auto",
                            }}
                          >
                            Reviewed At:
                          </span>
                          <span
                            style={{ color: "#32332D" }}
                            className="break-words"
                          >
                            {new Date(
                              selectedReport.reviewed_at,
                            ).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {selectedReport.resolution_notes && (
                        <div className="flex flex-col gap-1">
                          <span
                            className="font-medium"
                            style={{ color: "#64635E" }}
                          >
                            Resolution Notes:
                          </span>
                          <div
                            className="mt-1 p-2 sm:p-3 rounded"
                            style={{ backgroundColor: "#FFFFFF" }}
                          >
                            <span
                              style={{ color: "#32332D" }}
                              className="break-words text-xs sm:text-sm"
                            >
                              {selectedReport.resolution_notes}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Fixed Footer */}
              <div
                className="flex justify-end px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t flex-shrink-0"
                style={{ borderColor: "#F0DCC9" }}
              >
                <button
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-all duration-200 font-['Poppins'] text-sm sm:text-base"
                  style={{ backgroundColor: "#AA855B", color: "#FFFFFF" }}
                  onClick={() => {
                    setShowViewDetailsModal(false);
                    setSelectedReport(null);
                    setReportedContent(null);
                    setReporterInfo(null);
                    setReviewerInfo(null);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#8B6F4A";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#AA855B";
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resolve Report Modal - Full screen on mobile/tablet, modal on desktop */}
        {showResolveModal && selectedReport && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowResolveModal(false);
                setSelectedReport(null);
                setResolutionNotes("");
              }
            }}
          >
            <div className="bg-white rounded-none sm:rounded-2xl shadow-xl max-w-md w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
              {/* Header */}
              <div
                className="flex items-center justify-between p-3 sm:p-4 md:p-6 border-b flex-shrink-0"
                style={{ borderColor: "#F0DCC9" }}
              >
                <h3
                  className="text-base sm:text-lg font-semibold font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  Resolve Report
                </h3>
                <button
                  className="p-1.5 sm:p-2 rounded-full text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                  onClick={() => {
                    setShowResolveModal(false);
                    setSelectedReport(null);
                    setResolutionNotes("");
                  }}
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                <p
                  className="text-xs sm:text-sm font-['Poppins']"
                  style={{ color: "#64635E" }}
                >
                  Resolving this report will flag the reported{" "}
                  {selectedReport.report_type} and hide it from public view.
                </p>
                <div>
                  <label
                    className="block text-xs sm:text-sm font-medium mb-2 font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    Resolution Notes (Optional)
                  </label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={4}
                    className="w-full px-2.5 sm:px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 resize-none"
                    style={{
                      borderColor: "#AA855B",
                      backgroundColor: "#FAEFE2",
                      color: "#32332D",
                      fontSize: "13px",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                    placeholder="Add notes about why this report was resolved..."
                  />
                </div>
              </div>

              {/* Footer */}
              <div
                className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t flex-shrink-0"
                style={{ borderColor: "#F0DCC9" }}
              >
                <button
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium border transition-all duration-200 font-['Poppins'] text-sm sm:text-base"
                  style={{ borderColor: "#AA855B", color: "#AA855B" }}
                  onClick={() => {
                    setShowResolveModal(false);
                    setSelectedReport(null);
                    setResolutionNotes("");
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
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-all duration-200 font-['Poppins'] text-sm sm:text-base"
                  style={{ backgroundColor: "#16A34A", color: "#FFFFFF" }}
                  onClick={handleResolveReport}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#15803D";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#16A34A";
                  }}
                >
                  Resolve Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dismiss Report Modal - Full screen on mobile/tablet, modal on desktop */}
        {showDismissModal && selectedReport && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDismissModal(false);
                setSelectedReport(null);
                setResolutionNotes("");
              }
            }}
          >
            <div className="bg-white rounded-none sm:rounded-2xl shadow-xl max-w-md w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
              {/* Header */}
              <div
                className="flex items-center justify-between p-3 sm:p-4 md:p-6 border-b flex-shrink-0"
                style={{ borderColor: "#F0DCC9" }}
              >
                <h3
                  className="text-base sm:text-lg font-semibold font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  Dismiss Report
                </h3>
                <button
                  className="p-1.5 sm:p-2 rounded-full text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                  onClick={() => {
                    setShowDismissModal(false);
                    setSelectedReport(null);
                    setResolutionNotes("");
                  }}
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                <p
                  className="text-xs sm:text-sm font-['Poppins']"
                  style={{ color: "#64635E" }}
                >
                  Dismissing this report means the reported{" "}
                  {selectedReport.report_type} will remain visible. No action
                  will be taken.
                </p>
                <div>
                  <label
                    className="block text-xs sm:text-sm font-medium mb-2 font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    Dismissal Notes (Optional)
                  </label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={4}
                    className="w-full px-2.5 sm:px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 resize-none"
                    style={{
                      borderColor: "#AA855B",
                      backgroundColor: "#FAEFE2",
                      color: "#32332D",
                      fontSize: "13px",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                    placeholder="Add notes about why this report was dismissed..."
                  />
                </div>
              </div>

              {/* Footer */}
              <div
                className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t flex-shrink-0"
                style={{ borderColor: "#F0DCC9" }}
              >
                <button
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium border transition-all duration-200 font-['Poppins'] text-sm sm:text-base"
                  style={{ borderColor: "#AA855B", color: "#AA855B" }}
                  onClick={() => {
                    setShowDismissModal(false);
                    setSelectedReport(null);
                    setResolutionNotes("");
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
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-all duration-200 font-['Poppins'] text-sm sm:text-base"
                  style={{ backgroundColor: "#DC2626", color: "#FFFFFF" }}
                  onClick={handleDismissReport}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#B91C1C";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#DC2626";
                  }}
                >
                  Dismiss Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`
        .excerpt-preview {
          line-height: 1.5;
        }
        .excerpt-preview h1,
        .excerpt-preview h2,
        .excerpt-preview h3 {
          font-size: inherit;
          font-weight: 600;
          margin: 0.25em 0;
          color: #AA855B;
        }
        .excerpt-preview h1 {
          font-size: 1.1em;
        }
        .excerpt-preview h2 {
          font-size: 1.05em;
        }
        .excerpt-preview h3 {
          font-size: 1em;
        }
        .excerpt-preview p {
          margin: 0.25em 0;
          color: #AA855B;
        }
        .excerpt-preview strong,
        .excerpt-preview b {
          font-weight: 600;
          color: #AA855B;
        }
        .excerpt-preview em,
        .excerpt-preview i {
          font-style: italic;
        }
        .excerpt-preview ul,
        .excerpt-preview ol {
          margin: 0.25em 0;
          padding-left: 1.25em;
        }
        .excerpt-preview ul {
          list-style-type: disc;
        }
        .excerpt-preview ol {
          list-style-type: decimal;
        }
        .excerpt-preview li {
          margin: 0.125em 0;
          color: #AA855B;
        }
      `}</style>
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

export default ContentManagerDashboard;
