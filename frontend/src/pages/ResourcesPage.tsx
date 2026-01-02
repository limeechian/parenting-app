// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: ResourcesPage.tsx
// Description: To provide interface for parent users to browse, search, and view parenting resources
// First Written on: Saturday, 04-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state and lifecycle management
import React, { useState, useEffect } from "react";
// Import React Router hooks for navigation and URL parameters
import { useNavigate, useParams } from "react-router-dom";
// Import lucide-react icons for UI elements
import {
  LibraryBig,
  Search,
  Filter,
  Play,
  Download,
  ExternalLink,
  Tag,
  Heart,
  Share2,
  X,
  FileText,
  FileDown,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Bookmark,
  Eye,
  MessageCircle,
  Link,
  Send,
  ArrowLeft,
} from "lucide-react";
// Import toast notification components
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Import API base URL configuration
import { API_BASE_URL } from "../config/api";
// Import API functions for resource operations
import {
  saveResource,
  unsaveResource,
  getSavedResourcesList,
  searchUsersForMessage,
  createPrivateConversation,
  sendMessage,
} from "../services/api";
// Import Material-UI components for form elements
import { Autocomplete, TextField, Chip } from "@mui/material";
// Import Poppins font weights for consistent typography
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";

/**
 * Converts Markdown text to HTML
 * Supports headers, lists, bold, italic, and paragraphs
 * Same implementation as in ContentCreationPage.tsx
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

interface ResourceAttachment {
  attachment_id: number;
  file_name: string;
  file_path: string;
  file_type: "image" | "video" | "document";
  file_size?: number | null;
  mime_type?: string | null;
  display_order: number;
  description?: string | null;
}

interface Resource {
  resource_id: number;
  title: string;
  description?: string | null;
  content?: string | null;
  resource_type: "article" | "video" | "guide";
  category?: string | null;
  target_age_group?: string | null;
  target_developmental_stages?: string[] | null;
  external_url?: string | null;
  thumbnail_url?: string | null;
  excerpt?: string | null;
  tags?: string[] | null;
  status: "draft" | "published" | "archived";
  created_by: number;
  published_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  attachments?: ResourceAttachment[];
}

interface ModeratorUser {
  userId: number;
  email: string;
  name: string;
  avatar: string | null;
}

const ResourcesPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [savedResources, setSavedResources] = useState<number[]>([]);
  const [categoryPopoverOpen, setCategoryPopoverOpen] =
    useState<boolean>(false);
  const [categoryButtonRef, setCategoryButtonRef] =
    useState<HTMLElement | null>(null);
  const [typeFilterFocused, setTypeFilterFocused] = useState<boolean>(false);

  // Quick action filters
  const [savedFilter, setSavedFilter] = useState(false);
  const [recentlyViewedFilter, setRecentlyViewedFilter] = useState(false);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState<Resource | null>(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [showShareUserPicker, setShowShareUserPicker] = useState(false);
  const [shareRecipients, setShareRecipients] = useState<ModeratorUser[]>([]);
  const [shareRecipientSearchQuery, setShareRecipientSearchQuery] =
    useState<string>("");
  const [shareRecipientSearchResults, setShareRecipientSearchResults] =
    useState<ModeratorUser[]>([]);
  const [isSearchingShareRecipients, setIsSearchingShareRecipients] =
    useState<boolean>(false);
  const [isSendingShareMessages, setIsSendingShareMessages] =
    useState<boolean>(false);

  // Recently viewed tracking (localStorage)
  const RECENTLY_VIEWED_KEY = "recently_viewed_resources";

  const getRecentlyViewed = (): number[] => {
    try {
      const viewed = localStorage.getItem(RECENTLY_VIEWED_KEY);
      return viewed ? JSON.parse(viewed) : [];
    } catch {
      return [];
    }
  };

  const addToRecentlyViewed = (resourceId: number) => {
    const viewed = getRecentlyViewed();
    const index = viewed.indexOf(resourceId);
    if (index > -1) {
      viewed.splice(index, 1);
    }
    viewed.unshift(resourceId);
    // Keep only last 10
    const limited = viewed.slice(0, 10);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(limited));
  };

  // Get all unique categories from actual resources
  const getAllCategories = (): string[] => {
    const allCategories = new Set<string>();
    resources.forEach((resource) => {
      if (resource.category) {
        allCategories.add(resource.category);
      }
    });
    return Array.from(allCategories).sort();
  };

  const resourceTypes = [
    { value: "all", label: "All Types" },
    { value: "article", label: "Article" },
    { value: "video", label: "Video" },
    { value: "guide", label: "Guide" },
  ];

  useEffect(() => {
    loadResources();
    loadSavedResources();
  }, []);

  // Handle click outside and scroll for category popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest(".category-popover-container")) {
        setCategoryPopoverOpen(false);
        if (categoryButtonRef) {
          categoryButtonRef.style.borderColor = "#AA855B";
          categoryButtonRef.style.boxShadow = "none";
        }
      }
    };

    const handleScroll = () => {
      if (categoryPopoverOpen) {
        setCategoryPopoverOpen(false);
        if (categoryButtonRef) {
          categoryButtonRef.style.borderColor = "#AA855B";
          categoryButtonRef.style.boxShadow = "none";
        }
      }
    };

    if (categoryPopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, true);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [categoryPopoverOpen, categoryButtonRef]);

  // Handle resource ID from URL
  useEffect(() => {
    if (id) {
      const resourceId = parseInt(id);
      if (isNaN(resourceId)) {
        navigate("/resources");
        return;
      }
      const resource = resources.find((r) => r.resource_id === resourceId);
      if (resource) {
        setSelectedResource(resource);
        setViewMode("detail");
        addToRecentlyViewed(resourceId);
      } else if (resources.length > 0 && !loading) {
        // Resource not found in current list, try to fetch it
        loadResourceDetail(resourceId);
      }
    } else {
      // No ID in URL, show list view
      setViewMode("list");
      setSelectedResource(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, resources, loading]);

  const loadResourceDetail = async (resourceId: number) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/resources/${resourceId}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Resource not found");
      }

      const data = await response.json();
      setSelectedResource(data);
      setViewMode("detail");
      addToRecentlyViewed(resourceId);
    } catch (error: any) {
      console.error("Error loading resource detail:", error);
      toast.error("Resource not found");
      navigate("/resources");
    }
  };

  const loadResources = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("status", "published");

      const response = await fetch(
        `${API_BASE_URL}/api/resources?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to load resources");
      }

      const data = await response.json();
      setResources(data.resources || []);
    } catch (error: any) {
      console.error("Error loading resources:", error);
      toast.error(error.message || "Failed to load resources");
    } finally {
      setLoading(false);
    }
  };

  const loadSavedResources = async () => {
    try {
      const response = await getSavedResourcesList();
      setSavedResources(response.saved_resource_ids || []);
    } catch (error: any) {
      console.error("Error loading saved resources:", error);
      // Don't show error toast - user might not be logged in, which is okay
      setSavedResources([]);
    }
  };

  const toggleSaveResource = async (resourceId: number) => {
    try {
      const isCurrentlySaved = savedResources.includes(resourceId);

      if (isCurrentlySaved) {
        // Unsave
        try {
          await unsaveResource(resourceId);
          // Reload saved resources from server to ensure consistency
          await loadSavedResources();
          toast.success("Resource removed from saved");
        } catch (error: any) {
          // If 404, resource is already not saved, just reload from server
          if (
            error.message?.includes("404") ||
            error.message?.includes("not found")
          ) {
            await loadSavedResources();
            // Don't show error toast for this case
          } else {
            throw error;
          }
        }
      } else {
        // Save
        try {
          const response = await saveResource(resourceId);
          // Reload saved resources from server to ensure consistency
          await loadSavedResources();
          if (response && response.saved !== false) {
            toast.success("Resource saved");
          }
        } catch (error: any) {
          // Reload saved resources even on error to ensure state is correct
          await loadSavedResources();
          throw error;
        }
      }
    } catch (error: any) {
      console.error("Error toggling saved resource:", error);
      toast.error(error.message || "Failed to update saved resource");
    }
  };

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      !searchTerm ||
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.tags?.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase()),
      );

    const matchesCategory =
      selectedCategory === "all" || resource.category === selectedCategory;
    const matchesType =
      selectedType === "all" || resource.resource_type === selectedType;

    // Apply saved filter
    if (savedFilter) {
      if (!savedResources.includes(resource.resource_id)) return false;
    }

    // Apply recently viewed filter
    if (recentlyViewedFilter) {
      const viewed = getRecentlyViewed();
      if (!viewed.includes(resource.resource_id)) return false;
    }

    return matchesSearch && matchesCategory && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Play className="w-4 h-4" />;
      case "guide":
        return <FileDown className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "video":
        return { bg: "#FEE2E2", text: "#DC2626" };
      case "guide":
        return { bg: "#DCFCE7", text: "#16A34A" };
      default:
        return { bg: "#DBEAFE", text: "#2563EB" };
    }
  };

  const getThumbnailUrl = (resource: Resource): string | null => {
    // Use thumbnail_url if available
    if (resource.thumbnail_url) return resource.thumbnail_url;
    return null;
  };

  const handleViewResource = (resource: Resource) => {
    setSelectedResource(resource);
    setViewMode("detail");
    addToRecentlyViewed(resource.resource_id);
    // Update URL
    navigate(`/resources/${resource.resource_id}`);
  };

  const handleBackToResources = () => {
    setViewMode("list");
    setSelectedResource(null);
    navigate("/resources");
  };

  const handleShare = (resource: Resource) => {
    setShowShareModal(resource);
  };

  const handleShareCopyLink = async () => {
    if (!showShareModal) return;
    const url = `${window.location.origin}/resources/${showShareModal.resource_id}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareLinkCopied(true);
      toast.success("Link copied to clipboard!", {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
      setTimeout(() => setShareLinkCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link", {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
    }
  };

  const handleShareSendViaMessage = () => {
    setShowShareUserPicker(true);
  };

  // Search users for share modal
  useEffect(() => {
    if (
      !shareRecipientSearchQuery ||
      shareRecipientSearchQuery.trim().length < 2
    ) {
      setShareRecipientSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      try {
        setIsSearchingShareRecipients(true);
        const result = await searchUsersForMessage(
          shareRecipientSearchQuery.trim(),
        );
        if (result.users) {
          // Filter out users that are already selected
          const selectedUserIds = new Set(shareRecipients.map((r) => r.userId));
          const filteredUsers = result.users.filter(
            (u: any) => !selectedUserIds.has(u.user_id),
          );

          setShareRecipientSearchResults(
            filteredUsers.map((u: any) => ({
              userId: u.user_id,
              email: u.email,
              name: u.name || u.email,
              avatar: u.avatar_url || null,
            })),
          );
        }
      } catch (error: any) {
        console.error("Error searching users:", error);
        setShareRecipientSearchResults([]);
      } finally {
        setIsSearchingShareRecipients(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [shareRecipientSearchQuery, shareRecipients]);

  const handleSendShareToRecipients = async () => {
    if (!showShareModal || shareRecipients.length === 0) {
      toast.error("Please select at least one recipient", {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
      return;
    }

    setIsSendingShareMessages(true);
    const resourceLink = `${window.location.origin}/resources/${showShareModal.resource_id}`;
    const excerpt = showShareModal.excerpt || showShareModal.description || "";
    const messageContent = `Check out this resource: ${showShareModal.title}\n\n${excerpt.length > 150 ? excerpt.substring(0, 150) + "..." : excerpt}\n\n${resourceLink}`;

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    try {
      for (const recipient of shareRecipients) {
        try {
          const conversation = await createPrivateConversation(
            recipient.userId,
          );
          await sendMessage(conversation.conversation_id, messageContent);
          successCount++;
        } catch (error: any) {
          console.error(`Error sending message to ${recipient.name}:`, error);
          failCount++;
          errors.push(recipient.name || recipient.email);
        }
      }

      if (successCount > 0 && failCount === 0) {
        toast.success(
          `Message sent to ${successCount} recipient${successCount > 1 ? "s" : ""}!`,
          {
            style: { fontFamily: "'Poppins', sans-serif" },
          },
        );
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(
          `Message sent to ${successCount} recipient${successCount > 1 ? "s" : ""}, but failed for ${failCount}`,
          {
            style: { fontFamily: "'Poppins', sans-serif" },
          },
        );
      } else {
        toast.error("Failed to send messages. Please try again.", {
          style: { fontFamily: "'Poppins', sans-serif" },
        });
      }

      setShowShareUserPicker(false);
      setShowShareModal(null);
      setShareRecipients([]);
      setShareRecipientSearchQuery("");
      setShareRecipientSearchResults([]);
    } catch (error: any) {
      console.error("Error in send process:", error);
      toast.error("An error occurred while sending messages", {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
    } finally {
      setIsSendingShareMessages(false);
    }
  };

  const getTextFieldStyles = (hasValue: boolean) => ({
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      backgroundColor: hasValue ? "#F5F5F5" : "#EDEDED",
      fontFamily: "'Poppins', sans-serif",
      "&:hover": {},
      "&.Mui-focused": {},
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: "#AA855B",
        borderWidth: "1px",
      },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: "#AA855B",
      },
    },
  });

  // Calculate popover position for category filter
  const calculateCategoryPopoverPosition = (buttonRef: HTMLElement | null) => {
    if (!buttonRef) {
      return { top: "200px", right: "20px" };
    }

    const rect = buttonRef.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popoverWidth = 300;
    const popoverHeight = 300;
    const navBarHeight = 80;

    let right = viewportWidth - rect.right;
    let top = Math.max(navBarHeight + 8, rect.bottom + 8);

    if (rect.right - popoverWidth < 20) {
      right = viewportWidth - 20 - popoverWidth;
    }
    if (right < 20) {
      right = 20;
    }
    if (top + popoverHeight > viewportHeight - 20) {
      top = Math.max(20, rect.top - popoverHeight - 8);
    }
    if (top < 20) {
      top = 20;
    }

    return { top: `${top}px`, right: `${right}px` };
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedType("all");
    setSavedFilter(false);
    setRecentlyViewedFilter(false);
  };

  const handleSavedToggle = () => {
    setSavedFilter(!savedFilter);
    setRecentlyViewedFilter(false);
  };

  const handleRecentlyViewedToggle = () => {
    setRecentlyViewedFilter(!recentlyViewedFilter);
    setSavedFilter(false);
  };

  const savedCount = savedResources.length;
  // Count only recently viewed resources that exist in the current resources list
  const recentlyViewedIds = getRecentlyViewed();
  const recentlyViewedCount = recentlyViewedIds.filter((id) =>
    resources.some((resource) => resource.resource_id === id),
  ).length;

  const renderResourceDetail = () => {
    if (!selectedResource) return null;

    const typeColor = getTypeColor(selectedResource.resource_type);
    const isSaved = savedResources.includes(selectedResource.resource_id);

    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-3 sm:pt-4 pb-4 sm:pb-6 md:pb-8">
        {/* Back Button */}
        <button
          className="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-5 md:mb-6 text-xs sm:text-sm font-medium transition-colors"
          style={{ color: "#F2742C" }}
          onClick={handleBackToResources}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#E55A1F";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#F2742C";
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Back to Resources
        </button>

        {/* Resource Detail */}
        <div
          className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-5 md:p-6 border mb-4 sm:mb-5 md:mb-6"
          style={{ borderColor: "#F0DCC9" }}
        >
          {/* Header: Title | Resource Type Badge */}
          <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 flex-wrap">
                <h1
                  className="text-xl sm:text-2xl font-bold font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  {selectedResource.title}
                </h1>
                <span
                  className="flex items-center space-x-0.5 sm:space-x-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium font-['Poppins'] whitespace-nowrap flex-shrink-0"
                  style={{
                    backgroundColor: typeColor.bg,
                    color: typeColor.text,
                  }}
                >
                  {getTypeIcon(selectedResource.resource_type)}
                  <span className="capitalize">
                    {selectedResource.resource_type}
                  </span>
                </span>
              </div>
              {/* Published Date */}
              {selectedResource.published_at && (
                <p
                  className="text-xs sm:text-sm font-['Poppins']"
                  style={{ color: "#AA855B" }}
                >
                  Published on:{" "}
                  {new Date(selectedResource.published_at).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </p>
              )}
            </div>
            <button
              className={`p-1.5 sm:p-2 rounded-full transition-colors flex-shrink-0 ${
                isSaved ? "text-white" : "text-gray-600"
              }`}
              style={{
                backgroundColor: isSaved ? "#DC2626" : "#F5F5F5",
              }}
              onClick={() => toggleSaveResource(selectedResource.resource_id)}
            >
              <Heart
                className={`w-4 h-4 sm:w-5 sm:h-5 ${isSaved ? "fill-current" : ""}`}
              />
            </button>
          </div>

          {/* Category | Target Developmental Stages */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 mb-3 sm:mb-4 flex-wrap">
            {selectedResource.category && (
              <span
                className="px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-medium rounded-full font-['Poppins']"
                style={{ backgroundColor: "#DBEAFE", color: "#2563EB" }}
              >
                {selectedResource.category}
              </span>
            )}
            {selectedResource.target_developmental_stages &&
              selectedResource.target_developmental_stages.length > 0 &&
              selectedResource.target_developmental_stages.map(
                (stage, index) => (
                  <span
                    key={index}
                    className="px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-medium rounded-full font-['Poppins']"
                    style={{ backgroundColor: "#F5F5F5", color: "#AA855B" }}
                  >
                    {stage}
                  </span>
                ),
              )}
          </div>

          {/* Description */}
          {selectedResource.description && (
            <p
              className="text-sm sm:text-base mb-3 sm:mb-4 font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              {selectedResource.description}
            </p>
          )}

          {/* Tags */}
          {selectedResource.tags && selectedResource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-5 md:mb-6">
              {selectedResource.tags.map((tag, index) => (
                <span
                  key={index}
                  className="flex items-center space-x-0.5 sm:space-x-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-['Poppins']"
                  style={{ backgroundColor: "#F5F5F5", color: "#AA855B" }}
                >
                  <Tag className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{tag}</span>
                </span>
              ))}
            </div>
          )}

          {/* Attachments */}
          {selectedResource.attachments &&
            selectedResource.attachments.length > 0 && (
              <div className="mb-6">
                {selectedResource.attachments
                  .filter((a) => a.file_type === "image")
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((attachment) => (
                    <img
                      key={attachment.attachment_id}
                      src={attachment.file_path}
                      alt={attachment.file_name}
                      className="w-full rounded-xl mb-4"
                    />
                  ))}
                {selectedResource.attachments
                  .filter((a) => a.file_type === "video")
                  .sort((a, b) => a.display_order - b.display_order)[0] && (
                  <video
                    src={
                      selectedResource.attachments
                        .filter((a) => a.file_type === "video")
                        .sort((a, b) => a.display_order - b.display_order)[0]
                        ?.file_path
                    }
                    controls
                    className="w-full rounded-xl mb-4"
                  />
                )}
                {selectedResource.attachments
                  .filter((a) => a.file_type === "document")
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((attachment) => (
                    <div
                      key={attachment.attachment_id}
                      className="mb-3 sm:mb-4 p-3 sm:p-4 rounded-lg sm:rounded-xl"
                      style={{
                        backgroundColor: "#F5F5F5",
                        border: "1px solid #AA855B",
                      }}
                    >
                      <a
                        href={attachment.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1.5 sm:space-x-2 text-blue-600 hover:underline"
                      >
                        <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-xs sm:text-sm font-medium font-['Poppins'] break-all">
                          Download {attachment.file_name}
                        </span>
                      </a>
                    </div>
                  ))}
              </div>
            )}

          {/* External URL */}
          {selectedResource.external_url && (
            <div className="mb-4 sm:mb-5 md:mb-6">
              <a
                href={selectedResource.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm text-white font-medium font-['Poppins']"
                style={{ backgroundColor: "#326586" }}
              >
                <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>View External Resource</span>
              </a>
            </div>
          )}

          {/* Content */}
          {selectedResource.content && (
            <>
              <div
                className="content-preview-resource mb-4 sm:mb-5 md:mb-6"
                style={{
                  color: "#32332D",
                  fontFamily: "'Poppins', sans-serif",
                }}
                dangerouslySetInnerHTML={{
                  __html:
                    selectedResource.content.includes("<") &&
                    selectedResource.content.includes(">")
                      ? selectedResource.content
                      : markdownToHtml(selectedResource.content),
                }}
              />
              <style>{`
                .content-preview-resource {
                  font-size: 14px;
                  line-height: 1.6;
                }
                @media (min-width: 640px) {
                  .content-preview-resource {
                    font-size: 15px;
                  }
                }
                @media (min-width: 768px) {
                  .content-preview-resource {
                    font-size: 16px;
                  }
                }
                .content-preview-resource h1 {
                  font-size: 2em;
                  font-weight: 700;
                  margin-top: 1em;
                  margin-bottom: 0.5em;
                  color: #32332D;
                  line-height: 1.2;
                }
                .content-preview-resource h2 {
                  font-size: 1.5em;
                  font-weight: 600;
                  margin-top: 0.8em;
                  margin-bottom: 0.4em;
                  color: #32332D;
                  line-height: 1.3;
                }
                .content-preview-resource h3 {
                  font-size: 1.25em;
                  font-weight: 600;
                  margin-top: 0.6em;
                  margin-bottom: 0.3em;
                  color: #32332D;
                  line-height: 1.4;
                }
                .content-preview-resource h4 {
                  font-size: 1.1em;
                  font-weight: 600;
                  margin-top: 0.5em;
                  margin-bottom: 0.3em;
                  color: #32332D;
                }
                .content-preview-resource p {
                  margin-top: 0.5em;
                  margin-bottom: 0.5em;
                  color: #32332D;
                }
                .content-preview-resource strong,
                .content-preview-resource b {
                  font-weight: 600;
                  color: #32332D;
                }
                .content-preview-resource em,
                .content-preview-resource i {
                  font-style: italic;
                }
                .content-preview-resource ul,
                .content-preview-resource ol {
                  margin-top: 0.5em;
                  margin-bottom: 0.5em;
                  padding-left: 1.5em;
                }
                .content-preview-resource ul {
                  list-style-type: disc;
                }
                .content-preview-resource ol {
                  list-style-type: decimal;
                }
                .content-preview-resource li {
                  margin-top: 0.25em;
                  margin-bottom: 0.25em;
                  color: #32332D;
                }
                .content-preview-resource a {
                  color: #326586;
                  text-decoration: underline;
                }
                .content-preview-resource a:hover {
                  color: #1A4A6B;
                }
                .content-preview-resource blockquote {
                  border-left: 4px solid #AA855B;
                  padding-left: 1em;
                  margin-left: 0;
                  margin-top: 0.5em;
                  margin-bottom: 0.5em;
                  font-style: italic;
                  color: #64635E;
                }
                .content-preview-resource code {
                  background-color: #F5F5F5;
                  padding: 0.2em 0.4em;
                  border-radius: 4px;
                  font-family: 'Courier New', monospace;
                  font-size: 0.9em;
                  color: #DC2626;
                }
                .content-preview-resource pre {
                  background-color: #F5F5F5;
                  padding: 1em;
                  border-radius: 8px;
                  overflow-x: auto;
                  margin-top: 0.5em;
                  margin-bottom: 0.5em;
                }
                .content-preview-resource pre code {
                  background-color: transparent;
                  padding: 0;
                  color: #32332D;
                }
                .content-preview-resource img {
                  max-width: 100%;
                  height: auto;
                  border-radius: 8px;
                  margin-top: 0.5em;
                  margin-bottom: 0.5em;
                }
              `}</style>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen pt-16 sm:pt-20 md:pt-20 py-4 sm:py-6 md:py-8 font-['Poppins']"
      style={{ backgroundColor: "#FAEFE2" }}
    >
      {viewMode === "detail" ? (
        renderResourceDetail()
      ) : (
        <div className="max-w-full lg:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-10">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
              <div>
                <h1
                  className="text-xl sm:text-2xl md:text-3xl font-bold mb-1.5 sm:mb-2"
                  style={{ color: "#32332D" }}
                >
                  Parenting Resources
                </h1>
                <p
                  className="text-xs sm:text-sm"
                  style={{
                    color: "#AA855B",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Expert-curated content to support your parenting journey
                </p>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap">
                <button
                  onClick={() => {
                    setSavedFilter(false);
                    setRecentlyViewedFilter(false);
                  }}
                  className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm ${
                    !savedFilter && !recentlyViewedFilter ? "font-semibold" : ""
                  }`}
                  style={{
                    backgroundColor:
                      !savedFilter && !recentlyViewedFilter
                        ? "#F2742C"
                        : "#F5F5F5",
                    color:
                      !savedFilter && !recentlyViewedFilter
                        ? "#FFFFFF"
                        : "#32332D",
                    border:
                      !savedFilter && !recentlyViewedFilter
                        ? "none"
                        : "1px solid #AA855B",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    if (savedFilter || recentlyViewedFilter) {
                      e.currentTarget.style.backgroundColor = "#EDEDED";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (savedFilter || recentlyViewedFilter) {
                      e.currentTarget.style.backgroundColor = "#F5F5F5";
                    }
                  }}
                >
                  <LibraryBig
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${!savedFilter && !recentlyViewedFilter ? "fill-current" : ""}`}
                  />
                  <span className="hidden sm:inline">All Resources</span>
                  <span className="sm:hidden">All</span>
                </button>
                <button
                  onClick={handleSavedToggle}
                  className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm ${
                    savedFilter ? "font-semibold" : ""
                  }`}
                  style={{
                    backgroundColor: savedFilter ? "#F2742C" : "#F5F5F5",
                    color: savedFilter ? "#FFFFFF" : "#32332D",
                    border: savedFilter ? "none" : "1px solid #AA855B",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    if (!savedFilter) {
                      e.currentTarget.style.backgroundColor = "#EDEDED";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!savedFilter) {
                      e.currentTarget.style.backgroundColor = "#F5F5F5";
                    }
                  }}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${savedFilter ? "fill-current" : ""}`}
                  />
                  <span className="hidden sm:inline">Saved ({savedCount})</span>
                  <span className="sm:hidden">Saved</span>
                </button>
                <button
                  onClick={handleRecentlyViewedToggle}
                  className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 md:px-4 lg:px-5 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm ${
                    recentlyViewedFilter ? "font-semibold" : ""
                  }`}
                  style={{
                    backgroundColor: recentlyViewedFilter
                      ? "#F2742C"
                      : "#F5F5F5",
                    color: recentlyViewedFilter ? "#FFFFFF" : "#32332D",
                    border: recentlyViewedFilter ? "none" : "1px solid #AA855B",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    if (!recentlyViewedFilter) {
                      e.currentTarget.style.backgroundColor = "#EDEDED";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!recentlyViewedFilter) {
                      e.currentTarget.style.backgroundColor = "#F5F5F5";
                    }
                  }}
                >
                  <Eye
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${recentlyViewedFilter ? "fill-current" : ""}`}
                  />
                  <span className="hidden lg:inline">
                    Recently Viewed ({recentlyViewedCount})
                  </span>
                  <span className="lg:hidden">
                    Recent ({recentlyViewedCount})
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <Search
                  className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5"
                  style={{ color: "#AA855B" }}
                />
                <input
                  type="search"
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
                  style={{
                    borderColor: "#AA855B",
                    backgroundColor: "#FAEFE2",
                    color: "#32332D",
                    fontFamily: "inherit",
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
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-wrap">
              <Filter
                className="w-4 h-4 sm:w-5 sm:h-5"
                style={{ color: "#AA855B" }}
              />

              {/* Category Filter - Popover */}
              <div className="relative category-popover-container">
                <div className="relative">
                  <button
                    ref={(el) => setCategoryButtonRef(el)}
                    onClick={() => setCategoryPopoverOpen(!categoryPopoverOpen)}
                    className="px-3 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                    style={{
                      borderColor:
                        selectedCategory !== "all" ? "#AA855B" : "#AA855B",
                      backgroundColor:
                        selectedCategory !== "all" ? "#FDF2E8" : "#FAEFE2",
                      color: "#32332D",
                      fontFamily: "inherit",
                      backgroundImage: "none",
                      appearance: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#000000";
                      e.currentTarget.style.borderWidth = "2px";
                      e.currentTarget.style.boxShadow =
                        "0 2px 4px rgba(0, 0, 0, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#AA855B";
                      e.currentTarget.style.borderWidth = "1px";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <span>Categories</span>
                    {selectedCategory !== "all" && (
                      <span
                        className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium"
                        style={{
                          backgroundColor: "#AA855B",
                          color: "#FFFFFF",
                        }}
                      >
                        1
                      </span>
                    )}
                    {categoryPopoverOpen ? (
                      <ChevronUp
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform"
                        style={{ color: "#AA855B" }}
                      />
                    ) : (
                      <ChevronDown
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform"
                        style={{ color: "#AA855B" }}
                      />
                    )}
                  </button>
                </div>

                {/* Category Popover Content */}
                {categoryPopoverOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setCategoryPopoverOpen(false)}
                    />
                    <div
                      className="fixed bg-white z-50"
                      style={{
                        ...calculateCategoryPopoverPosition(categoryButtonRef),
                        width: "300px",
                        maxHeight: "300px",
                        backgroundColor: "#FFFFFF",
                        borderRadius: "10px",
                        boxShadow:
                          "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {/* Fixed Header */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px",
                          borderBottom: "1px solid #E5E5E5",
                          flexShrink: 0,
                        }}
                      >
                        <h3
                          style={{
                            color: "#32332D",
                            fontSize: "13px",
                            fontWeight: "500",
                            fontFamily: "'Poppins', sans-serif",
                            margin: 0,
                          }}
                        >
                          Select Category
                        </h3>
                        <button
                          onClick={() => setCategoryPopoverOpen(false)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#32332D",
                            cursor: "pointer",
                            padding: "4px",
                          }}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Scrollable Category Chips Section */}
                      <div
                        style={{
                          flex: 1,
                          overflowY: "auto",
                          padding: "12px",
                          minHeight: 0,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "4px",
                          }}
                        >
                          {getAllCategories().map((category) => (
                            <button
                              key={category}
                              onClick={() => {
                                // Toggle: if already selected, deselect (go to 'all'), otherwise select
                                if (selectedCategory === category) {
                                  setSelectedCategory("all");
                                } else {
                                  setSelectedCategory(category);
                                }
                                setCategoryPopoverOpen(false);
                              }}
                              style={{
                                backgroundColor:
                                  selectedCategory === category
                                    ? "#AA855B"
                                    : "#F5F5F5",
                                color:
                                  selectedCategory === category
                                    ? "#FFFFFF"
                                    : "#32332D",
                                border:
                                  selectedCategory === category
                                    ? "none"
                                    : "0px solid #E5E5E5",
                                borderRadius: "20px",
                                padding: "2px 10px",
                                fontSize: "12px",
                                fontWeight: "400",
                                fontFamily: "'Poppins', sans-serif",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                margin: 2,
                              }}
                              onMouseEnter={(e) => {
                                if (selectedCategory !== category) {
                                  e.currentTarget.style.borderColor = "#AA855B";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedCategory !== category) {
                                  e.currentTarget.style.borderColor = "#E5E5E5";
                                }
                              }}
                            >
                              {category}
                            </button>
                          ))}
                          {getAllCategories().length === 0 && (
                            <div
                              style={{
                                padding: "12px",
                                textAlign: "center",
                                color: "#AA855B",
                                fontSize: "12px",
                                fontFamily: "'Poppins', sans-serif",
                              }}
                            >
                              No categories available
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Fixed Footer Actions */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px",
                          borderTop: "1px solid #E5E5E5",
                          flexShrink: 0,
                        }}
                      >
                        <button
                          onClick={() => {
                            setSelectedCategory("all");
                            setCategoryPopoverOpen(false);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#EF4444",
                            fontSize: "12px",
                            fontWeight: "400",
                            fontFamily: "'Poppins', sans-serif",
                            cursor: "pointer",
                            padding: 0,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "#DC2626";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "#EF4444";
                          }}
                        >
                          Clear All
                        </button>
                        <button
                          onClick={() => setCategoryPopoverOpen(false)}
                          style={{
                            backgroundColor: "#F2742C",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: "8px",
                            padding: "4px 12px",
                            fontSize: "12px",
                            fontWeight: "500",
                            fontFamily: "'Poppins', sans-serif",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#E55A1F";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#F2742C";
                          }}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Type Filter */}
              <div className="relative">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  onFocus={() => setTypeFilterFocused(true)}
                  onBlur={() => setTypeFilterFocused(false)}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 pr-7 sm:pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
                  style={{
                    borderColor: "#AA855B",
                    backgroundColor: "#FAEFE2",
                    color: "#32332D",
                    fontFamily: "inherit",
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    backgroundImage: "none",
                  }}
                >
                  {resourceTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
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

              {/* Refresh Button */}
              <button
                onClick={handleResetFilters}
                className="px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-center"
                style={{ backgroundColor: "#AA855B", color: "#F5F5F5" }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = "#8B6F4A";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = "#AA855B";
                }}
                title="Reset search and filters"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Resource Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div
                className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
                style={{ borderColor: "#326586" }}
              ></div>
              <p className="mt-4 text-sm" style={{ color: "#AA855B" }}>
                Loading resources...
              </p>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="text-center py-12">
              <LibraryBig
                className="w-16 h-16 mx-auto mb-4"
                style={{ color: "#AA855B" }}
              />
              {savedFilter ? (
                <>
                  <h3
                    className="text-lg font-medium mb-2 font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    No resources saved yet
                  </h3>
                  <p className="text-sm" style={{ color: "#AA855B" }}>
                    You can start saving resources by clicking the heart icon on
                    any resource card
                  </p>
                </>
              ) : recentlyViewedFilter ? (
                <>
                  <h3
                    className="text-lg font-medium mb-2 font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    No recently viewed resources
                  </h3>
                  <p className="text-sm" style={{ color: "#AA855B" }}>
                    Resources you view will appear here
                  </p>
                </>
              ) : (
                <>
                  <h3
                    className="text-lg font-medium mb-2 font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    No resources found
                  </h3>
                  <p className="text-sm" style={{ color: "#AA855B" }}>
                    Try adjusting your search or filter criteria
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {filteredResources.map((resource) => {
                const thumbnailUrl = getThumbnailUrl(resource);
                const typeColor = getTypeColor(resource.resource_type);
                const isSaved = savedResources.includes(resource.resource_id);

                return (
                  <div
                    key={resource.resource_id}
                    className="rounded-lg sm:rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg"
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #AA855B",
                    }}
                  >
                    <div className="relative">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={resource.title}
                          className="w-full h-40 sm:h-44 md:h-48 object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-40 sm:h-44 md:h-48 flex flex-col items-center justify-center p-3 sm:p-4"
                          style={{
                            background: `linear-gradient(135deg, ${typeColor.bg} 0%, ${typeColor.bg}dd 100%)`,
                          }}
                        >
                          <div className="mb-1.5 sm:mb-2">
                            {getTypeIcon(resource.resource_type)}
                          </div>
                          <h4
                            className="text-xs sm:text-sm font-semibold font-['Poppins'] text-center line-clamp-2 mb-1"
                            style={{ color: typeColor.text }}
                          >
                            {resource.title}
                          </h4>
                          {resource.category && (
                            <span
                              className="text-[10px] sm:text-xs font-['Poppins'] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full"
                              style={{
                                backgroundColor: "rgba(255, 255, 255, 0.3)",
                                color: typeColor.text,
                              }}
                            >
                              {resource.category}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="absolute top-2 sm:top-3 md:top-4 left-2 sm:left-3 md:left-4">
                        <span
                          className="flex items-center space-x-0.5 sm:space-x-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium font-['Poppins']"
                          style={{
                            backgroundColor: typeColor.bg,
                            color: typeColor.text,
                          }}
                        >
                          {getTypeIcon(resource.resource_type)}
                          <span className="capitalize hidden sm:inline">
                            {resource.resource_type}
                          </span>
                        </span>
                      </div>
                      <div className="absolute top-2 sm:top-3 md:top-4 right-2 sm:right-3 md:right-4">
                        <button
                          className={`p-1.5 sm:p-2 rounded-full transition-colors ${
                            isSaved ? "text-white" : "text-gray-600"
                          }`}
                          style={{
                            backgroundColor: isSaved ? "#DC2626" : "#FFFFFF",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSaveResource(resource.resource_id);
                          }}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSaved ? "fill-current" : ""}`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 md:p-6">
                      <h3
                        className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 font-['Poppins']"
                        style={{ color: "#32332D" }}
                      >
                        {resource.title}
                      </h3>

                      <div className="flex items-center space-x-1.5 sm:space-x-2 mb-1.5 sm:mb-2 flex-wrap">
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
                          resource.target_developmental_stages.length > 0 &&
                          resource.target_developmental_stages.map(
                            (stage, index) => (
                              <span
                                key={index}
                                className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full font-['Poppins']"
                                style={{
                                  backgroundColor: "#F5F5F5",
                                  color: "#AA855B",
                                }}
                              >
                                {stage}
                              </span>
                            ),
                          )}
                      </div>

                      {resource.description && (
                        <p
                          className="text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2"
                          style={{ color: "#AA855B" }}
                        >
                          {resource.description}
                        </p>
                      )}

                      {resource.tags && resource.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3 sm:mb-4">
                          {resource.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="flex items-center space-x-0.5 sm:space-x-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full font-['Poppins']"
                              style={{
                                backgroundColor: "#F5F5F5",
                                color: "#AA855B",
                              }}
                            >
                              <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              <span>{tag}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center space-x-1.5 sm:space-x-2">
                        <button
                          className="flex-1 py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm text-white font-medium font-['Poppins'] transition-colors"
                          style={{ backgroundColor: "#F2742C" }}
                          onClick={() => handleViewResource(resource)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#E55A1F";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#F2742C";
                          }}
                        >
                          <span className="flex items-center justify-center space-x-1 sm:space-x-2">
                            <span>View Resource</span>
                          </span>
                        </button>
                        <button
                          className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-colors"
                          style={{
                            border: "1px solid #AA855B",
                            color: "#AA855B",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(resource);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#FAEFE2";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                          }}
                        >
                          <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Share Resource Modal */}
      {showShareModal && (
        <>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowShareModal(null);
                setShowShareUserPicker(false);
              }
            }}
          >
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl max-w-md w-full p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between">
                <h3
                  className="text-base sm:text-lg font-semibold"
                  style={{
                    color: "#32332D",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Share Resource
                </h3>
                <button
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => {
                    setShowShareModal(null);
                    setShowShareUserPicker(false);
                  }}
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              {/* Resource Preview */}
              <div className="space-y-2 sm:space-y-3">
                <div
                  className="p-2.5 sm:p-3 rounded-md sm:rounded-lg"
                  style={{ backgroundColor: "#FAEFE2" }}
                >
                  <h4
                    className="font-semibold text-xs sm:text-sm mb-1.5 sm:mb-2"
                    style={{
                      color: "#32332D",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    {showShareModal.title}
                  </h4>
                  <p
                    className="text-[10px] sm:text-xs line-clamp-2 mb-1.5 sm:mb-2"
                    style={{ color: "#64635E" }}
                  >
                    {showShareModal.excerpt ||
                      showShareModal.description ||
                      "No description available"}
                  </p>
                  <div
                    className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs"
                    style={{ color: "#AA855B" }}
                  >
                    <span className="capitalize">
                      {showShareModal.resource_type}
                    </span>
                    {showShareModal.category && (
                      <>
                        <span>•</span>
                        <span>{showShareModal.category}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Link Display */}
              <div className="space-y-1.5 sm:space-y-2">
                <label
                  className="text-[10px] sm:text-xs font-medium"
                  style={{
                    color: "#32332D",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Link
                </label>
                <div
                  className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-md sm:rounded-lg border"
                  style={{ borderColor: "#F0DCC9", backgroundColor: "#F5F5F5" }}
                >
                  <input
                    type="text"
                    value={`${window.location.origin}/resources/${showShareModal.resource_id}`}
                    readOnly
                    className="flex-1 text-[10px] sm:text-xs bg-transparent outline-none"
                    style={{
                      color: "#32332D",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  {shareLinkCopied && (
                    <span
                      className="text-[10px] sm:text-xs font-medium"
                      style={{ color: "#F2742C" }}
                    >
                      Copied!
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 sm:space-y-3">
                <button
                  onClick={handleShareCopyLink}
                  className="w-full flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-md sm:rounded-lg border transition-all duration-200 text-xs sm:text-sm font-medium"
                  style={{
                    borderColor: shareLinkCopied ? "#F2742C" : "#F0DCC9",
                    backgroundColor: shareLinkCopied
                      ? "#FDF2E8"
                      : "transparent",
                    color: "#32332D",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    if (!shareLinkCopied) {
                      e.currentTarget.style.borderColor = "#AA855B";
                      e.currentTarget.style.backgroundColor = "#FAEFE2";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!shareLinkCopied) {
                      e.currentTarget.style.borderColor = "#F0DCC9";
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <Link
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    style={{ color: shareLinkCopied ? "#F2742C" : "#AA855B" }}
                  />
                  <span>{shareLinkCopied ? "Link Copied!" : "Copy Link"}</span>
                </button>
                <button
                  onClick={handleShareSendViaMessage}
                  className="w-full flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-md sm:rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium"
                  style={{
                    backgroundColor: "#F2742C",
                    color: "#FFFFFF",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#E55A1F";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#F2742C";
                  }}
                >
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Send via Message</span>
                </button>
              </div>
            </div>
          </div>

          {/* User Picker Modal for Share Resource */}
          {showShareUserPicker && showShareModal && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
              style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowShareUserPicker(false);
                  setShareRecipients([]);
                  setShareRecipientSearchQuery("");
                }
              }}
            >
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl max-w-lg w-full p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3
                    className="text-base sm:text-lg font-semibold"
                    style={{
                      color: "#32332D",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    Send via Message
                  </h3>
                  <button
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => {
                      setShowShareUserPicker(false);
                      setShareRecipients([]);
                      setShareRecipientSearchQuery("");
                    }}
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>

                {/* Recipients Selection */}
                <div>
                  <label
                    className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
                    style={{
                      color: "#32332D",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    Select Recipients
                  </label>
                  <p
                    className="text-[10px] sm:text-xs mb-2 sm:mb-3"
                    style={{ color: "#64635E" }}
                  >
                    Search for users by name or email. You can select multiple
                    recipients.
                  </p>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={shareRecipientSearchResults}
                    value={shareRecipients}
                    inputValue={shareRecipientSearchQuery}
                    onInputChange={(_, newInputValue) => {
                      setShareRecipientSearchQuery(newInputValue);
                    }}
                    onChange={(_, newValue) => {
                      const updatedRecipients: ModeratorUser[] = [];
                      for (const item of newValue) {
                        if (typeof item === "string") {
                          // FreeSolo: user typed an email directly
                          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.trim())) {
                            updatedRecipients.push({
                              userId: 0,
                              email: item.trim(),
                              name: item.trim().split("@")[0],
                              avatar: null,
                            });
                          }
                        } else {
                          updatedRecipients.push(item);
                        }
                      }
                      setShareRecipients(updatedRecipients);
                      setShareRecipientSearchQuery("");
                    }}
                    getOptionLabel={(option) => {
                      if (typeof option === "string") return option;
                      return option.name || option.email || "";
                    }}
                    isOptionEqualToValue={(option, value) => {
                      if (
                        typeof option === "string" ||
                        typeof value === "string"
                      ) {
                        return option === value;
                      }
                      return option.userId === value.userId;
                    }}
                    renderOption={(
                      props: any,
                      option: string | ModeratorUser,
                    ) => {
                      if (typeof option === "string") {
                        return (
                          <li {...props} key={option}>
                            <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5">
                              <div
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium flex-shrink-0"
                                style={{ backgroundColor: "#F2742C" }}
                              >
                                {option.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div
                                  className="text-xs sm:text-sm font-medium"
                                  style={{ color: "#32332D" }}
                                >
                                  {option}
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      }
                      const userOption = option as ModeratorUser;
                      return (
                        <li {...props} key={userOption.userId}>
                          <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5">
                            {userOption.avatar ? (
                              <img
                                src={userOption.avatar}
                                alt={userOption.name}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium flex-shrink-0"
                                style={{ backgroundColor: "#F2742C" }}
                              >
                                {userOption.name?.charAt(0).toUpperCase() ||
                                  userOption.email?.charAt(0).toUpperCase() ||
                                  "U"}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div
                                className="text-xs sm:text-sm font-medium"
                                style={{ color: "#32332D" }}
                              >
                                {userOption.name || userOption.email}
                              </div>
                              <div
                                className="text-[10px] sm:text-xs"
                                style={{ color: "#64635E" }}
                              >
                                {userOption.email}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    }}
                    renderTags={(
                      value: readonly ModeratorUser[],
                      getTagProps: any,
                    ) =>
                      value.map((option: ModeratorUser, index: number) => (
                        <Chip
                          variant="filled"
                          size="small"
                          label={
                            <div className="flex items-center gap-1">
                              {option.avatar ? (
                                <img
                                  src={option.avatar}
                                  alt={option.name}
                                  className="w-4 h-4 rounded-full object-cover"
                                />
                              ) : (
                                <div
                                  className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs"
                                  style={{ backgroundColor: "#F2742C" }}
                                >
                                  {option.name?.charAt(0).toUpperCase() ||
                                    option.email?.charAt(0).toUpperCase() ||
                                    "U"}
                                </div>
                              )}
                              <span>{option.name || option.email}</span>
                            </div>
                          }
                          {...getTagProps({ index })}
                          sx={{
                            backgroundColor: "#FDF2E8",
                            color: "#AA855B",
                            border: "1px solid #F0DCC9",
                            fontFamily: "'Poppins', sans-serif",
                            "& .MuiChip-deleteIcon": {
                              color: "#AA855B",
                              "&:hover": {
                                color: "#8B6F4A",
                              },
                            },
                          }}
                        />
                      ))
                    }
                    loading={isSearchingShareRecipients}
                    renderInput={(params: any) => (
                      <TextField
                        {...params}
                        placeholder="Search by name or enter email address..."
                        sx={getTextFieldStyles(shareRecipients.length > 0)}
                      />
                    )}
                  />
                </div>

                {/* Preview of what will be sent */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label
                    className="text-[10px] sm:text-xs font-medium"
                    style={{
                      color: "#32332D",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    Message Preview
                  </label>
                  <div
                    className="p-2.5 sm:p-3 rounded-md sm:rounded-lg border bg-gray-50"
                    style={{ borderColor: "#F0DCC9" }}
                  >
                    <div
                      className="text-[10px] sm:text-xs whitespace-pre-wrap"
                      style={{
                        color: "#64635E",
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      {`Check out this resource: ${showShareModal.title}\n\n${(showShareModal.excerpt || showShareModal.description || "").length > 150 ? (showShareModal.excerpt || showShareModal.description || "").substring(0, 150) + "..." : showShareModal.excerpt || showShareModal.description || ""}\n\n${window.location.origin}/resources/${showShareModal.resource_id}`}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      setShowShareUserPicker(false);
                      setShareRecipients([]);
                      setShareRecipientSearchQuery("");
                    }}
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-md sm:rounded-lg border transition-all duration-200 text-xs sm:text-sm font-medium"
                    style={{
                      borderColor: "#AA855B",
                      color: "#AA855B",
                      backgroundColor: "transparent",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#FAEFE2";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                    disabled={isSendingShareMessages}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendShareToRecipients}
                    disabled={
                      shareRecipients.length === 0 || isSendingShareMessages
                    }
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-md sm:rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2"
                    style={{
                      backgroundColor:
                        shareRecipients.length > 0 && !isSendingShareMessages
                          ? "#F2742C"
                          : "#D4C4A8",
                      color: "#FFFFFF",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = "#E55A1F";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = "#F2742C";
                      }
                    }}
                  >
                    {isSendingShareMessages ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>
                          Send to {shareRecipients.length} recipient
                          {shareRecipients.length !== 1 ? "s" : ""}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
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

export default ResourcesPage;
