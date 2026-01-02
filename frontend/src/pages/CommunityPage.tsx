// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: CommunityPage.tsx
// Description: To provide interface for parent users to browse, join communities, and participate in discussions
// First Written on: Friday, 03-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state, lifecycle, memoization, and callbacks
import React, { useMemo, useState, useEffect, useCallback } from "react";
// Import React Router hooks for navigation
import { useLocation, useNavigate } from "react-router-dom";
// Import lucide-react icons for UI elements
import {
  Users,
  MessageCircle,
  Heart,
  Share2,
  Plus,
  Search,
  Filter,
  Star,
  ArrowLeft,
  Send,
  ThumbsUp,
  Flag,
  MoreHorizontal,
  X,
  Image,
  Link,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Crown,
  Save,
  Edit3,
  Trash2,
  Bookmark,
  Pin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
// Import LucideIcon type for icon components
import type { LucideIcon } from "lucide-react";
// Import Material-UI components for form elements
import { Autocomplete, TextField, Chip, Button } from "@mui/material";
// Import API functions for community operations
import {
  getCommunities,
  getCommunityById,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  joinCommunity,
  leaveCommunity,
  getTaxonomies,
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  createComment,
  likeComment,
  likePost,
  savePost,
  pinPost,
  unpinPost,
  getMyActivity,
  getMyActivityCommunities,
  getSavedPosts,
  getSavedPostsCommunities,
  getSavedPostsTopics,
  submitReport,
  uploadCommunityCoverImage,
  uploadPostImage,
  getParentProfile,
  getProfessionalProfile,
  searchUsersForMessage,
  createPrivateConversation,
  sendMessage,
} from "../services/api";
// Import toast notification components
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Import API base URL configuration
import { API_BASE_URL } from "../config/api";

/**
 * Type definitions for community system
 */

/**
 * Member role type definition
 */
type MemberRole = "member" | "moderator" | "owner";

/**
 * Member status type definition
 */
type MemberStatus = "active" | "banned" | "left";

/**
 * Comment status type definition
 */
type CommentStatus = "visible" | "hidden" | "flagged";

/**
 * Post status type definition
 * 'visible' = visible to all users, 'flagged' = hidden by admin
 */
type PostStatus = "visible" | "flagged";

/**
 * CommunityTaxonomy interface
 * Defines the structure of a community taxonomy (age group, stage, topic)
 */
interface CommunityTaxonomy {
  taxonomyId: number;
  taxonomyType: "age_group" | "stage" | "topic";
  label: string;
}

/**
 * CommunityMember interface
 * Defines the structure of a community member
 */
interface CommunityMember {
  memberId: number;
  userId: number;
  name: string;
  avatar: string;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: string;
  lastActivityAt?: string | null;
}

/**
 * CommunityPostComment interface
 * Defines the structure of a post comment with nested replies support
 */
interface CommunityPostComment {
  commentId: number;
  postId: number;
  author: string;
  avatar: string;
  time: string;
  body: string;
  status: CommentStatus;
  likes: number;
  userId?: number; // User ID of the comment author
  parentCommentId?: number; // ID of parent comment (null for top-level comments)
  replies?: CommunityPostComment[]; // Nested replies (2-3 levels max)
  depth?: number; // Current nesting depth (0 = top-level, 1 = reply, 2 = reply to reply)
  isLiked?: boolean; // Whether current user has liked this comment
}

/**
 * CommunityPost interface
 * Defines the structure of a community post
 */
interface CommunityPost {
  postId: number;
  communityId: number;
  author: string;
  avatar: string;
  title: string;
  body: string;
  excerpt?: string;
  status: PostStatus;
  createdAt: string;
  likes: number;
  comments: CommunityPostComment[];
  commentsCount?: number; // Total comment count (for list view when comments array is empty)
  taxonomyLabels: string[];
  authorId?: number; // User ID of the post author
  attachments?: Array<{
    attachment_id: number;
    file_path: string;
    file_name: string;
    file_size?: number | null;
    mime_type?: string | null;
  }>; // Post images
  isLiked?: boolean; // Whether current user has liked this post
  isPinned?: boolean; // Whether post is pinned
}

/**
 * ModeratorUser interface
 * Defines the structure of a moderator user
 */
interface ModeratorUser {
  userId: number;
  email: string;
  name: string;
  avatar: string | null;
}

/**
 * Community interface
 * Defines the structure of a community with all its metadata
 */
interface Community {
  communityId: number;
  name: string;
  description: string;
  coverImageUrl: string;
  status: string; // 'visible', 'flagged'
  memberCount: number;
  postCount: number;
  tags: CommunityTaxonomy[];
  rules: string[];
  moderators: string[];
  members: CommunityMember[];
  isJoined: boolean;
  createdBy?: number; // User ID of the creator
}

/**
 * Active tab type definition
 */
type ActiveTab = "communities" | "discussions" | "myCommunities" | "savedPosts";

/**
 * Community view tabs configuration
 * Defines available tabs with their labels and icons
 */
const COMMUNITY_VIEW_TABS: {
  id: ActiveTab;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "communities", label: "Discover Communities", icon: Users },
  { id: "myCommunities", label: "My Communities", icon: Star },
  { id: "discussions", label: "My Activity", icon: MessageCircle },
];

/**
 * Taxonomy filter options
 * Used for filtering communities by taxonomy type
 */
const taxonomyFilters: {
  id: CommunityTaxonomy["taxonomyType"];
  label: string;
}[] = [
  { id: "age_group", label: "Age Groups" },
  { id: "stage", label: "Developmental Stages" },
  { id: "topic", label: "Topics" },
];

/**
 * Common parenting topics for suggestions
 * Supplements API taxonomies with frequently used topics
 */
const COMMON_TOPICS: string[] = [
  "Sleep",
  "Nutrition",
  "Behavior",
  "Development",
  "Education",
  "Health & Wellness",
  "Discipline",
  "Social Skills",
  "Play & Activities",
  "Special Needs",
  "Breastfeeding",
  "Teething",
  "Milestones",
  "School Readiness",
  "Emotional Development",
  "Physical Development",
  "Language Development",
  "Screen Time",
  "Sibling Relationships",
  "Parenting Styles",
  "Work-Life Balance",
  "Childcare",
  "Allergies",
  "Meal Planning",
  "Picky Eating",
  "Tantrums",
  "Bedtime Routines",
  "Separation Anxiety",
];

// Common age groups for suggestions (0-12 years)
const COMMON_AGE_GROUPS: string[] = [
  "0-6 months",
  "6-12 months",
  "1-2 years",
  "2-3 years",
  "3-5 years",
  "5-7 years",
  "7-9 years",
  "9-12 years",
];

// Common developmental stages for suggestions (0-12 years)
const COMMON_STAGES: string[] = [
  "Newborn",
  "Infant",
  "Toddler",
  "Early Childhood",
  "Middle Childhood",
];

// Mock data has been moved to NOTES/communities_mockdata.txt
// All data is now loaded from API

// Helper function to transform member data from backend to frontend format
const transformMember = (m: any): CommunityMember => {
  return {
    memberId: m.member_id,
    userId: m.user_id,
    name: m.name || "",
    avatar: m.avatar || "",
    role: m.role as MemberRole,
    status: m.status as MemberStatus,
    joinedAt: m.joined_at || "",
    lastActivityAt: m.last_activity_at || null,
  };
};

// Helper function to transform comment data from backend to frontend format
const transformComment = (c: any): CommunityPostComment => {
  return {
    commentId: c.comment_id,
    postId: c.post_id,
    author: c.author,
    avatar: c.avatar || "",
    time: c.time,
    body: c.body,
    status: c.status as CommentStatus,
    likes: c.likes || 0,
    userId: c.user_id,
    parentCommentId: c.parent_comment_id || undefined, // Convert null to undefined
    replies: Array.isArray(c.replies)
      ? c.replies.map(transformComment)
      : undefined,
    depth: c.depth || 0,
    isLiked: c.is_liked || false,
  };
};

// Helper function to transform post data from backend to frontend format
const transformPost = (p: any) => {
  // Helper to count comments recursively
  const countComments = (comments: any[]): number => {
    if (!Array.isArray(comments)) return 0;
    let count = 0;
    const countRecursive = (comment: any) => {
      count++;
      if (
        comment.replies &&
        Array.isArray(comment.replies) &&
        comment.replies.length > 0
      ) {
        comment.replies.forEach((reply: any) => countRecursive(reply));
      }
    };
    comments.forEach((comment) => countRecursive(comment));
    return count;
  };

  return {
    postId: p.post_id,
    communityId: p.community_id,
    author: p.author,
    authorId: p.author_id,
    avatar: p.avatar || "",
    title: p.title,
    body: p.body,
    excerpt: p.excerpt,
    status: p.status,
    createdAt: p.created_at,
    likes: p.likes || 0,
    comments: Array.isArray(p.comments) ? p.comments.map(transformComment) : [],
    commentsCount:
      p.comments_count !== undefined
        ? p.comments_count
        : Array.isArray(p.comments)
          ? countComments(p.comments)
          : 0,
    taxonomyLabels: p.taxonomy_labels || [],
    attachments: Array.isArray(p.attachments)
      ? p.attachments.map((att: any) => ({
          attachment_id: att.attachment_id,
          file_path: att.file_path,
          file_name: att.file_name,
          file_size: att.file_size || null,
          mime_type: att.mime_type || null,
        }))
      : undefined,
    isLiked: p.is_liked || false,
    isPinned: p.is_pinned || false,
  };
};

const CommunityPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Check authentication
  const isAuthenticated = !!localStorage.getItem("auth_token");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("User");

  // Helper function to get display name with fallback logic (same as Navigation.tsx)
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
    return role === "professional" ? "Professional" : "Parent";
  };

  // Get current user ID, avatar, and name from API
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (isAuthenticated) {
        try {
          const token = localStorage.getItem("auth_token");
          const userEmail = localStorage.getItem("userEmail") || "";
          const response = await fetch(`${API_BASE_URL}/api/me`, {
            method: "GET",
            mode: "cors",
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (response.ok) {
            const userData = await response.json();
            setCurrentUserId(userData.user_id);

            // Fetch user profile to get avatar and name
            // Handles missing profiles gracefully - falls back to email prefix if profile doesn't exist
            try {
              if (userData.role === "parent") {
                const profileResponse = await getParentProfile();
                // Handle null profile (profile doesn't exist yet - user skipped setup)
                // Use email prefix as fallback display name
                if (profileResponse === null) {
                  const fallbackName = userEmail ? userEmail.split("@")[0] : "User";
                  setCurrentUserName(fallbackName);
                } else {
                  // Profile exists - use profile data for name and avatar
                  // ParentProfile returns the profile directly, not nested in 'profile'
                  if (profileResponse?.profile_picture_url) {
                    setCurrentUserAvatar(profileResponse.profile_picture_url);
                  }
                  const displayName = getDisplayName(
                    profileResponse,
                    userEmail,
                    userData.role,
                  );
                  setCurrentUserName(displayName);
                }
              } else if (userData.role === "professional") {
                const profileResponse = await getProfessionalProfile();
                // Handle null profile (profile doesn't exist yet - user skipped setup)
                // Use email prefix as fallback display name
                if (profileResponse === null) {
                  const fallbackName = userEmail ? userEmail.split("@")[0] : "User";
                  setCurrentUserName(fallbackName);
                } else {
                  // Profile exists - use profile data for name and avatar
                  // ProfessionalProfile might have nested structure
                  const profileData = profileResponse?.profile || profileResponse;
                  if (profileData?.profile_picture_url) {
                    setCurrentUserAvatar(profileData.profile_picture_url);
                  }
                  const displayName = getDisplayName(
                    profileData,
                    userEmail,
                    userData.role,
                  );
                  setCurrentUserName(displayName);
                }
              }
            } catch (profileErr) {
              // Fallback to email prefix if profile fetch fails
              console.error("Error fetching user profile:", profileErr);
              const fallbackName = userEmail ? userEmail.split("@")[0] : "User";
              setCurrentUserName(fallbackName);
            }
          }
        } catch (e) {
          console.error("Error getting user ID:", e);
          const userEmail = localStorage.getItem("userEmail") || "";
          const fallbackName = userEmail ? userEmail.split("@")[0] : "User";
          setCurrentUserName(fallbackName);
        }
      }
    };
    fetchUserInfo();
  }, [isAuthenticated]);

  // Always start with default tab
  const [activeTab, setActiveTab] = useState<ActiveTab>("communities");
  const [searchTerm, setSearchTerm] = useState("");

  // Remove unused variables that were used for URL state management
  // const tabFromUrl and communityTabFromUrl are no longer needed
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(
    null,
  );
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [showSharePost, setShowSharePost] = useState<CommunityPost | null>(
    null,
  );
  const [showCreateCommunityModal, setShowCreateCommunityModal] =
    useState(false);
  const [newCommunityName, setNewCommunityName] = useState("");
  const [newCommunityDescription, setNewCommunityDescription] = useState("");
  const [newCommunityTopics, setNewCommunityTopics] = useState<string[]>([]);
  const [newCommunityAgeGroups, setNewCommunityAgeGroups] = useState<string[]>(
    [],
  );
  const [newCommunityStages, setNewCommunityStages] = useState<string[]>([]);
  const [newCommunityCoverImage, setNewCommunityCoverImage] =
    useState<File | null>(null);
  const [newCommunityCoverImagePreview, setNewCommunityCoverImagePreview] =
    useState<string>("");
  const [shouldDeleteCoverImage, setShouldDeleteCoverImage] =
    useState<boolean>(false);
  const [newCommunityRules, setNewCommunityRules] = useState<string[]>([""]);
  const [newCommunityModerators, setNewCommunityModerators] = useState<
    ModeratorUser[]
  >([]);
  const [moderatorSearchQuery, setModeratorSearchQuery] = useState<string>("");
  const [moderatorSearchResults, setModeratorSearchResults] = useState<
    ModeratorUser[]
  >([]);
  const [isSearchingModerators, setIsSearchingModerators] =
    useState<boolean>(false);
  const [showShareCommunity, setShowShareCommunity] =
    useState<Community | null>(null);

  // User picker for sharing via message
  const [showShareUserPicker, setShowShareUserPicker] = useState<{
    type: "community" | "post";
  } | null>(null);
  const [shareRecipients, setShareRecipients] = useState<ModeratorUser[]>([]);
  const [shareRecipientSearchQuery, setShareRecipientSearchQuery] =
    useState<string>("");
  const [shareRecipientSearchResults, setShareRecipientSearchResults] =
    useState<ModeratorUser[]>([]);
  const [isSearchingShareRecipients, setIsSearchingShareRecipients] =
    useState<boolean>(false);
  const [isSendingShareMessages, setIsSendingShareMessages] =
    useState<boolean>(false);
  const [selectedFilters, setSelectedFilters] = useState<
    Record<CommunityTaxonomy["taxonomyType"], string | string[]>
  >({
    age_group: "all",
    stage: "all",
    topic: [], // Changed to array for multi-select
  });
  const [focusedFilterSelect, setFocusedFilterSelect] = useState<
    CommunityTaxonomy["taxonomyType"] | null
  >(null);
  const [topicsPopoverOpen, setTopicsPopoverOpen] = useState(false);
  const [topicsPopoverButtonRef, setTopicsPopoverButtonRef] =
    useState<HTMLElement | null>(null);
  // Always default to 'posts' tab - no URL persistence
  const [communityDetailTab, setCommunityDetailTab] = useState<
    "posts" | "members" | "about"
  >("posts");
  const [myCommunitiesFilter, setMyCommunitiesFilter] = useState<
    "all" | "created" | "joined"
  >("all");
  const [myCommunitiesFilterFocused, setMyCommunitiesFilterFocused] =
    useState<boolean>(false);

  // My Activity filters
  const [myActivityCommunityFilter, setMyActivityCommunityFilter] = useState<
    number | null
  >(null);
  const [myActivityTypeFilter, setMyActivityTypeFilter] = useState<
    "all" | "created" | "commented"
  >("all");
  const [myActivityCommunities, setMyActivityCommunities] = useState<
    Array<{ community_id: number; name: string }>
  >([]);

  // Saved Posts filters
  const [savedPostsCommunityFilter, setSavedPostsCommunityFilter] = useState<
    number | null
  >(null);
  const [savedPostsTopicFilter, setSavedPostsTopicFilter] = useState<string[]>(
    [],
  );
  const [savedPostsCommunities, setSavedPostsCommunities] = useState<
    Array<{ community_id: number; name: string }>
  >([]);
  const [savedPostsTopics, setSavedPostsTopics] = useState<string[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImages, setNewPostImages] = useState<File[]>([]);
  const [newPostImagePreviews, setNewPostImagePreviews] = useState<string[]>(
    [],
  );
  const [newCommentContent, setNewCommentContent] = useState("");
  const [showCommunityMenu, setShowCommunityMenu] = useState(false);
  const [showEditCommunityModal, setShowEditCommunityModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [communityToDelete, setCommunityToDelete] = useState<Community | null>(
    null,
  );
  const [openPostCardMenu, setOpenPostCardMenu] = useState<number | null>(null);
  const [openPostDetailMenu, setOpenPostDetailMenu] = useState(false);
  const [openCommunityCardMenu, setOpenCommunityCardMenu] = useState<
    number | null
  >(null);
  const [savedPostIds, setSavedPostIds] = useState<number[]>([]); // Track saved post IDs
  const [showReportPostModal, setShowReportPostModal] =
    useState<CommunityPost | null>(null);
  const [showReportCommunityModal, setShowReportCommunityModal] =
    useState<Community | null>(null);
  const [showDeletePostModal, setShowDeletePostModal] =
    useState<CommunityPost | null>(null);
  const [reportReason, setReportReason] = useState<string>("");
  const [reportDetails, setReportDetails] = useState<string>("");
  const [reportReasonFocused, setReportReasonFocused] =
    useState<boolean>(false);
  const [showEditPostModal, setShowEditPostModal] = useState(false);
  const [editPostTitle, setEditPostTitle] = useState("");
  const [editPostContent, setEditPostContent] = useState("");
  const [editPostImages, setEditPostImages] = useState<File[]>([]);
  const [editPostImagePreviews, setEditPostImagePreviews] = useState<string[]>(
    [],
  );
  const [openReplyInput, setOpenReplyInput] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState<Record<number, string>>({});
  const [showReportCommentModal, setShowReportCommentModal] =
    useState<CommunityPostComment | null>(null);
  const [postDetailSource, setPostDetailSource] = useState<
    "community" | "myActivity" | "savedPosts" | null
  >(null);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] =
    useState<Community | null>(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(false); // For share modal link copy feedback

  // Image lightbox state
  const [lightboxImages, setLightboxImages] = useState<
    Array<{ file_path: string; file_name: string }>
  >([]);
  const [lightboxCurrentIndex, setLightboxCurrentIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [showFiltersDrawer, setShowFiltersDrawer] = useState<boolean>(false);

  // API state
  const [communities, setCommunities] = useState<Community[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [taxonomies, setTaxonomies] = useState<CommunityTaxonomy[]>([]);
  const [, setError] = useState<string | null>(null);

  // Route protection: Redirect unauthenticated users to login (except login page itself)
  useEffect(() => {
    const pathname = location.pathname;
    const isCommunityListPage =
      pathname === "/community" || pathname === "/communities";
    const isLoginPage = pathname === "/login";

    // Redirect unauthenticated users to login (except if already on login page)
    if (!isAuthenticated && !isLoginPage && !isCommunityListPage) {
      const returnUrl = pathname + location.search;
      navigate("/login", { state: { returnUrl } });
    }
  }, [isAuthenticated, location.pathname, location.search, navigate]);

  // Reusable fetch functions
  const fetchCommunities = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const filters: any = {};
      if (searchTerm) filters.search = searchTerm;
      if (selectedFilters.age_group !== "all")
        filters.age_group = selectedFilters.age_group;
      if (selectedFilters.stage !== "all")
        filters.stage = selectedFilters.stage;
      if (
        Array.isArray(selectedFilters.topic) &&
        selectedFilters.topic.length > 0
      ) {
        filters.topics = selectedFilters.topic;
      }

      const data = await getCommunities(filters);
      // Transform API response to match frontend interface
      const transformed = data.map((c: any) => ({
        communityId: c.community_id,
        name: c.name,
        description: c.description || "",
        coverImageUrl: c.cover_image_url || "",
        status: c.status,
        memberCount: c.member_count || 0,
        postCount: c.post_count || 0,
        tags: (c.tags || []).map((tag: any) => ({
          taxonomyId: tag.taxonomy_id,
          taxonomyType: tag.taxonomy_type,
          label: tag.label,
        })),
        rules: c.rules || [],
        moderators: c.moderators || [],
        members: c.members || [],
        isJoined: c.is_joined || false,
        createdBy: c.created_by,
      }));
      setCommunities(transformed);
    } catch (err) {
      console.error("Error loading communities:", err);
      setError("Failed to load communities");
    }
  }, [isAuthenticated, searchTerm, selectedFilters]);

  // Load taxonomies on mount
  useEffect(() => {
    const loadTaxonomies = async () => {
      try {
        const data = await getTaxonomies();
        // Transform backend response (snake_case) to frontend format (camelCase)
        const transformed = data.map((t: any) => ({
          taxonomyId: t.taxonomy_id,
          taxonomyType: t.taxonomy_type,
          label: t.label,
        }));
        setTaxonomies(transformed);
      } catch (err) {
        console.error("Error loading taxonomies:", err);
        setError("Failed to load taxonomies");
      }
    };
    loadTaxonomies();
  }, []);

  // Load communities based on active tab and filters
  useEffect(() => {
    if (activeTab === "communities" || activeTab === "myCommunities") {
      fetchCommunities();
    }
  }, [activeTab, fetchCommunities]);

  // Load posts based on active tab
  useEffect(() => {
    const loadPosts = async () => {
      if (!isAuthenticated) return;

      try {
        let data: any[] = [];

        if (activeTab === "discussions") {
          data = await getMyActivity(
            myActivityCommunityFilter || undefined,
            myActivityTypeFilter !== "all" ? myActivityTypeFilter : undefined,
          );
        } else if (activeTab === "savedPosts") {
          data = await getSavedPosts(
            savedPostsCommunityFilter || undefined,
            savedPostsTopicFilter.length > 0
              ? savedPostsTopicFilter
              : undefined,
          );
        } else if (selectedCommunity) {
          data = await getPosts({
            community_id: selectedCommunity.communityId,
            search: searchTerm,
          });
        }

        // Transform API response to match frontend interface
        const transformed = data.map(transformPost);
        setCommunityPosts(transformed);
      } catch (err) {
        console.error("Error loading posts:", err);
        setError("Failed to load posts");
      }
    };

    if (
      activeTab === "discussions" ||
      activeTab === "savedPosts" ||
      selectedCommunity
    ) {
      loadPosts();
    }
  }, [
    isAuthenticated,
    activeTab,
    selectedCommunity,
    searchTerm,
    myActivityCommunityFilter,
    myActivityTypeFilter,
    savedPostsCommunityFilter,
    savedPostsTopicFilter,
  ]);

  // Load saved post IDs
  useEffect(() => {
    const loadSavedPosts = async () => {
      if (!isAuthenticated) return;
      try {
        const data = await getSavedPosts();
        setSavedPostIds(data.map((p: any) => p.post_id));
      } catch (err) {
        console.error("Error loading saved posts:", err);
      }
    };
    loadSavedPosts();
  }, [isAuthenticated]);

  // Load distinct communities for My Activity filter
  useEffect(() => {
    const loadMyActivityCommunities = async () => {
      if (!isAuthenticated || activeTab !== "discussions") return;
      try {
        const data = await getMyActivityCommunities();
        setMyActivityCommunities(data);
      } catch (err) {
        console.error("Error loading my activity communities:", err);
      }
    };
    if (activeTab === "discussions") {
      loadMyActivityCommunities();
    }
  }, [isAuthenticated, activeTab]);

  // Load distinct communities and topics for Saved Posts filters
  useEffect(() => {
    const loadSavedPostsFilters = async () => {
      if (!isAuthenticated || activeTab !== "savedPosts") return;
      try {
        const [communities, topics] = await Promise.all([
          getSavedPostsCommunities(),
          getSavedPostsTopics(),
        ]);
        setSavedPostsCommunities(communities);
        setSavedPostsTopics(topics);
      } catch (err) {
        console.error("Error loading saved posts filters:", err);
      }
    };
    if (activeTab === "savedPosts") {
      loadSavedPostsFilters();
    }
  }, [isAuthenticated, activeTab]);

  // Load community/post from URL for authenticated users (normal navigation, not shared links)
  useEffect(() => {
    if (!isAuthenticated) return;

    const pathname = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const postIdFromUrl = searchParams.get("postId");
    const communityIdFromUrl = searchParams.get("communityId");
    const sourceFromUrl = searchParams.get("source") as
      | "community"
      | "myActivity"
      | "savedPosts"
      | null;
    const tabFromUrl = searchParams.get("tab") as
      | "posts"
      | "members"
      | "about"
      | null;

    // Check if URL matches /communities/{id} pattern
    const pathMatch = pathname.match(/^\/communities\/(\d+)$/);
    const communityIdFromPath = pathMatch ? parseInt(pathMatch[1], 10) : null;

    // Only load if we have a community ID and either no selected community or the ID doesn't match
    if (
      communityIdFromPath &&
      (!selectedCommunity ||
        selectedCommunity.communityId !== communityIdFromPath)
    ) {
      const loadCommunityFromUrl = async () => {
        try {
          const community = await getCommunityById(communityIdFromPath);
          const transformed = {
            communityId: community.community_id,
            name: community.name,
            description: community.description || "",
            coverImageUrl: community.cover_image_url || "",
            status: community.status,
            memberCount: community.member_count || 0,
            postCount: community.post_count || 0,
            tags: (community.tags || []).map((tag: any) => ({
              taxonomyId: tag.taxonomy_id,
              taxonomyType: tag.taxonomy_type,
              label: tag.label,
            })),
            rules: community.rules || [],
            moderators: community.moderators || [],
            members: (community.members || []).map(transformMember),
            isJoined: community.is_joined || false,
            createdBy: community.created_by,
          };
          setSelectedCommunity(transformed);
          // Also add to communities array so membership status is available for post detail checks
          setCommunities((prev) => {
            const exists = prev.find(
              (c) => c.communityId === transformed.communityId,
            );
            if (exists) {
              return prev.map((c) =>
                c.communityId === transformed.communityId ? transformed : c,
              );
            } else {
              return [...prev, transformed];
            }
          });
          setCommunityDetailTab("posts");

          // If there's a postId in URL, load that post too
          if (postIdFromUrl) {
            try {
              const post = await getPost(parseInt(postIdFromUrl));
              const transformedPost = transformPost(post);
              setSelectedPost(transformedPost);
              // Use source from URL if available, otherwise default to 'community'
              setPostDetailSource(sourceFromUrl || "community");

              // If there's a commentId in URL, scroll to that comment after post loads
              const commentIdFromUrl = searchParams.get("commentId");
              if (commentIdFromUrl) {
                setTimeout(() => {
                  const commentElement = document.querySelector(
                    `[data-comment-id="${commentIdFromUrl}"]`,
                  ) as HTMLElement;
                  if (commentElement) {
                    commentElement.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                    // Highlight the comment briefly with a subtle animation
                    commentElement.style.transition = "all 0.3s ease";
                    commentElement.style.boxShadow =
                      "0 0 0 3px rgba(242, 116, 44, 0.3)";
                    commentElement.style.transform = "scale(1.01)";

                    // Remove highlight after 2 seconds
                    setTimeout(() => {
                      commentElement.style.boxShadow = "";
                      commentElement.style.transform = "";
                    }, 2000);
                  }
                }, 500);
              }
            } catch (err) {
              console.error("Error loading post from URL:", err);
            }
          } else {
            // Clear selected post if no postId in URL
            setSelectedPost(null);
          }
        } catch (err) {
          console.error("Error loading community from URL:", err);
          // If community not found, navigate back to community list
          navigate("/community");
        }
      };

      loadCommunityFromUrl();
    } else if (
      communityIdFromPath &&
      selectedCommunity &&
      selectedCommunity.communityId === communityIdFromPath
    ) {
      // Community is already selected and matches URL - just load the post if postId is in URL
      if (postIdFromUrl) {
        const loadPostFromUrl = async () => {
          try {
            const post = await getPost(parseInt(postIdFromUrl));
            const transformedPost = transformPost(post);
            setSelectedPost(transformedPost);
            // Use source from URL if available, otherwise default to 'community'
            setPostDetailSource(sourceFromUrl || "community");

            // If there's a commentId in URL, scroll to that comment after post loads
            const commentIdFromUrl = searchParams.get("commentId");
            if (commentIdFromUrl) {
              setTimeout(() => {
                const commentElement = document.querySelector(
                  `[data-comment-id="${commentIdFromUrl}"]`,
                ) as HTMLElement;
                if (commentElement) {
                  commentElement.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                  // Highlight the comment briefly with a subtle animation
                  commentElement.style.transition = "all 0.3s ease";
                  commentElement.style.boxShadow =
                    "0 0 0 3px rgba(242, 116, 44, 0.3)";
                  commentElement.style.transform = "scale(1.01)";

                  // Remove highlight after 2 seconds
                  setTimeout(() => {
                    commentElement.style.boxShadow = "";
                    commentElement.style.transform = "";
                  }, 2000);
                }
              }, 500);
            }
          } catch (err) {
            console.error("Error loading post from URL:", err);
          }
        };
        loadPostFromUrl();
      } else {
        // Clear selected post if no postId in URL
        setSelectedPost(null);
      }
    } else if (
      pathname === "/community" &&
      communityIdFromUrl &&
      postIdFromUrl
    ) {
      // Handle /community?communityId=X&postId=Y pattern (from notifications)
      const loadCommunityAndPostFromQuery = async () => {
        try {
          // Check if we already have this community selected
          const existingCommunity =
            selectedCommunity?.communityId === parseInt(communityIdFromUrl)
              ? selectedCommunity
              : null;

          let community = existingCommunity;

          // If not found, try to find in communities list or fetch it
          if (!community) {
            // Try to find in existing communities list first
            const foundInList = communities.find(
              (c) => c.communityId === parseInt(communityIdFromUrl),
            );
            if (foundInList) {
              community = foundInList;
            } else {
              // Fetch all communities and find it
              const allCommunities = await getCommunities({});
              const found = allCommunities.find(
                (c: any) => c.community_id === parseInt(communityIdFromUrl),
              );
              if (found) {
                community = {
                  communityId: found.community_id,
                  name: found.name,
                  description: found.description || "",
                  coverImageUrl: found.cover_image_url || "",
                  status: found.status,
                  memberCount: found.member_count || 0,
                  postCount: found.post_count || 0,
                  tags: (found.tags || []).map((tag: any) => ({
                    taxonomyId: tag.taxonomy_id,
                    taxonomyType: tag.taxonomy_type,
                    label: tag.label,
                  })),
                  rules: found.rules || [],
                  moderators: found.moderators || [],
                  members: (found.members || []).map(transformMember),
                  isJoined: found.is_joined || false,
                  createdBy: found.created_by,
                };
                // Add to communities array
                setCommunities((prev) => {
                  const exists = prev.find(
                    (c) => c.communityId === community!.communityId,
                  );
                  if (exists) {
                    return prev.map((c) =>
                      c.communityId === community!.communityId ? community! : c,
                    );
                  } else {
                    return [...prev, community!];
                  }
                });
              }
            }
          }

          // If community found, set it and load the post
          if (community) {
            setSelectedCommunity(community);
            setCommunityDetailTab("posts");

            // Load the post
            try {
              const post = await getPost(parseInt(postIdFromUrl));
              const transformedPost = transformPost(post);
              setSelectedPost(transformedPost);
              setPostDetailSource(sourceFromUrl || "community");

              // If there's a commentId in URL, scroll to that comment after post loads
              const commentIdFromUrl = searchParams.get("commentId");
              if (commentIdFromUrl) {
                setTimeout(() => {
                  const commentElement = document.querySelector(
                    `[data-comment-id="${commentIdFromUrl}"]`,
                  ) as HTMLElement;
                  if (commentElement) {
                    commentElement.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                    // Highlight the comment briefly with a subtle animation
                    commentElement.style.transition = "all 0.3s ease";
                    commentElement.style.boxShadow =
                      "0 0 0 3px rgba(242, 116, 44, 0.3)";
                    commentElement.style.transform = "scale(1.01)";

                    // Remove highlight after 2 seconds
                    setTimeout(() => {
                      commentElement.style.boxShadow = "";
                      commentElement.style.transform = "";
                    }, 2000);
                  }
                }, 500);
              }
            } catch (err) {
              console.error("Error loading post from URL:", err);
            }
          } else {
            console.error("Community not found for ID:", communityIdFromUrl);
          }
        } catch (err) {
          console.error(
            "Error loading community and post from query params:",
            err,
          );
        }
      };

      loadCommunityAndPostFromQuery();
    } else if (
      pathname === "/community" &&
      communityIdFromUrl &&
      !postIdFromUrl
    ) {
      // Handle /community?communityId=X pattern (from notifications, e.g., "community_joined")
      const loadCommunityFromId = async () => {
        try {
          // Check if we already have this community selected
          const existingCommunity =
            selectedCommunity?.communityId === parseInt(communityIdFromUrl)
              ? selectedCommunity
              : null;

          let community = existingCommunity;

          // If not found, try to find in communities list or fetch it
          if (!community) {
            // Try to find in existing communities list first
            const foundInList = communities.find(
              (c) => c.communityId === parseInt(communityIdFromUrl),
            );
            if (foundInList) {
              community = foundInList;
            } else {
              // Fetch all communities and find it
              const allCommunities = await getCommunities({});
              const found = allCommunities.find(
                (c: any) => c.community_id === parseInt(communityIdFromUrl),
              );
              if (found) {
                // Use getCommunityById to get full details including members
                try {
                  const fullCommunity = await getCommunityById(
                    found.community_id,
                  );
                  community = {
                    communityId: fullCommunity.community_id,
                    name: fullCommunity.name,
                    description: fullCommunity.description || "",
                    coverImageUrl: fullCommunity.cover_image_url || "",
                    status: fullCommunity.status,
                    memberCount: fullCommunity.member_count || 0,
                    postCount: fullCommunity.post_count || 0,
                    tags: (fullCommunity.tags || []).map((tag: any) => ({
                      taxonomyId: tag.taxonomy_id,
                      taxonomyType: tag.taxonomy_type,
                      label: tag.label,
                    })),
                    rules: fullCommunity.rules || [],
                    moderators: fullCommunity.moderators || [],
                    members: (fullCommunity.members || []).map(transformMember),
                    isJoined: fullCommunity.is_joined || false,
                    createdBy: fullCommunity.created_by,
                  };
                  // Add to communities array
                  setCommunities((prev) => {
                    const exists = prev.find(
                      (c) => c.communityId === community!.communityId,
                    );
                    if (exists) {
                      return prev.map((c) =>
                        c.communityId === community!.communityId
                          ? community!
                          : c,
                      );
                    } else {
                      return [...prev, community!];
                    }
                  });
                } catch (err) {
                  console.error("Error fetching full community details:", err);
                  // Fallback to basic data from list
                  community = {
                    communityId: found.community_id,
                    name: found.name,
                    description: found.description || "",
                    coverImageUrl: found.cover_image_url || "",
                    status: found.status,
                    memberCount: found.member_count || 0,
                    postCount: found.post_count || 0,
                    tags: (found.tags || []).map((tag: any) => ({
                      taxonomyId: tag.taxonomy_id,
                      taxonomyType: tag.taxonomy_type,
                      label: tag.label,
                    })),
                    rules: found.rules || [],
                    moderators: found.moderators || [],
                    members: [],
                    isJoined: found.is_joined || false,
                    createdBy: found.created_by,
                  };
                  setCommunities((prev) => {
                    const exists = prev.find(
                      (c) => c.communityId === community!.communityId,
                    );
                    if (exists) {
                      return prev.map((c) =>
                        c.communityId === community!.communityId
                          ? community!
                          : c,
                      );
                    } else {
                      return [...prev, community!];
                    }
                  });
                }
              }
            }
          }

          // If community found, set it and show community detail view
          if (community) {
            setSelectedCommunity(community);
            // Use tab from URL if provided, otherwise default to posts
            setCommunityDetailTab(tabFromUrl || "posts");
            setSelectedPost(null); // Clear any selected post
          } else {
            console.error("Community not found for ID:", communityIdFromUrl);
            toast.error("Community not found");
          }
        } catch (err) {
          console.error("Error loading community from ID:", err);
          toast.error("Failed to load community");
        }
      };

      loadCommunityFromId();
    } else if (
      !communityIdFromPath &&
      !communityIdFromUrl &&
      selectedCommunity
    ) {
      // If URL doesn't have a communityId but we have a selected community, clear it
      // This handles navigation back to /community
      setSelectedCommunity(null);
      setSelectedPost(null);
    }
  }, [
    isAuthenticated,
    location.pathname,
    location.search,
    selectedCommunity,
    navigate,
    communities,
  ]);

  // Close topics popover on scroll (common UX pattern)
  useEffect(() => {
    if (topicsPopoverOpen) {
      const handleScroll = () => {
        setTopicsPopoverOpen(false);
      };

      // Listen to scroll events on window and all scrollable containers
      window.addEventListener("scroll", handleScroll, true);
      document.addEventListener("scroll", handleScroll, true);

      // Also listen to scroll on the main content container
      const mainContainer = document.querySelector(".min-h-screen");
      if (mainContainer) {
        mainContainer.addEventListener("scroll", handleScroll, true);
      }

      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        document.removeEventListener("scroll", handleScroll, true);
        if (mainContainer) {
          mainContainer.removeEventListener("scroll", handleScroll, true);
        }
      };
    }
  }, [topicsPopoverOpen]);

  // Debounced search for moderators
  useEffect(() => {
    if (!moderatorSearchQuery || moderatorSearchQuery.trim().length < 2) {
      setModeratorSearchResults([]);
      setIsSearchingModerators(false);
      return;
    }

    setIsSearchingModerators(true);
    const timeoutId = setTimeout(async () => {
      try {
        // Use searchUsersForMessage to only search for parent users (moderators must be parents)
        const result = await searchUsersForMessage(moderatorSearchQuery.trim());
        if (result.users) {
          // Filter out users that are already selected
          const selectedUserIds = new Set(
            newCommunityModerators.map((m) => m.userId),
          );
          const filteredUsers = result.users.filter(
            (u: any) => !selectedUserIds.has(u.user_id),
          );
          setModeratorSearchResults(
            filteredUsers.map((u: any) => ({
              userId: u.user_id,
              email: u.email,
              name: u.name,
              avatar: u.avatar,
            })),
          );
        } else {
          setModeratorSearchResults([]);
        }
      } catch (error) {
        console.error("Error searching users:", error);
        setModeratorSearchResults([]);
      } finally {
        setIsSearchingModerators(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [moderatorSearchQuery, newCommunityModerators]);

  // Debounced search for share recipients
  useEffect(() => {
    if (
      !shareRecipientSearchQuery ||
      shareRecipientSearchQuery.trim().length < 2
    ) {
      setShareRecipientSearchResults([]);
      setIsSearchingShareRecipients(false);
      return;
    }

    setIsSearchingShareRecipients(true);
    const timeoutId = setTimeout(async () => {
      try {
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
              name: u.name,
              avatar: u.avatar,
            })),
          );
        } else {
          setShareRecipientSearchResults([]);
        }
      } catch (error) {
        console.error("Error searching users for share:", error);
        setShareRecipientSearchResults([]);
      } finally {
        setIsSearchingShareRecipients(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [shareRecipientSearchQuery, shareRecipients]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (
        openPostCardMenu !== null &&
        !target.closest(`[data-post-menu="${openPostCardMenu}"]`)
      ) {
        setOpenPostCardMenu(null);
      }

      if (openPostDetailMenu && !target.closest("[data-post-detail-menu]")) {
        setOpenPostDetailMenu(false);
      }

      if (
        openCommunityCardMenu !== null &&
        !target.closest(`[data-community-card-menu="${openCommunityCardMenu}"]`)
      ) {
        setOpenCommunityCardMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openPostCardMenu, openPostDetailMenu, openCommunityCardMenu]);

  const filteredCommunities = useMemo(() => {
    return communities.filter((community) => {
      // Exclude communities that user has joined or created (these show in "My Communities")
      if (community.isJoined || community.createdBy === currentUserId) {
        return false;
      }

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesSearch =
          community.name.toLowerCase().includes(query) ||
          community.description.toLowerCase().includes(query) ||
          community.tags.some((tag) => tag.label.toLowerCase().includes(query));
        if (!matchesSearch) {
          return false;
        }
      }

      const hasFilterMatch = taxonomyFilters.every((filter) => {
        const selectedValue = selectedFilters[filter.id];

        // Handle topic as array (multi-select)
        if (filter.id === "topic") {
          const selectedTopics = Array.isArray(selectedValue)
            ? selectedValue
            : [];
          if (selectedTopics.length === 0) {
            return true; // No filter selected
          }
          return community.tags.some(
            (tag) =>
              tag.taxonomyType === "topic" &&
              selectedTopics.some(
                (selectedTopic) =>
                  tag.label.toLowerCase() === selectedTopic.toLowerCase(),
              ),
          );
        }

        // Handle age_group and stage as single select
        if (selectedValue === "all") {
          return true;
        }
        return community.tags.some(
          (tag) =>
            tag.taxonomyType === filter.id &&
            tag.label.toLowerCase() === (selectedValue as string).toLowerCase(),
        );
      });

      return hasFilterMatch;
    });
  }, [communities, searchTerm, selectedFilters, currentUserId]);

  const filteredPosts = useMemo(() => {
    return communityPosts.filter((post) => {
      // For "My Activity" tab: Backend already filtered to show only posts where user participated
      // So we don't need to check comments here (comments array is empty for performance)
      if (activeTab === "discussions") {
        // Just apply search filter if present
        if (!searchTerm) {
          return true;
        }
        const query = searchTerm.toLowerCase();
        return (
          post.title.toLowerCase().includes(query) ||
          post.body.toLowerCase().includes(query) ||
          post.taxonomyLabels.some((label) =>
            label.toLowerCase().includes(query),
          )
        );
      }

      // For other tabs (community posts): Show posts where user participated:
      // 1. User created the post
      // 2. User commented on the post
      const userCreatedPost = post.authorId === currentUserId;
      const userCommented = post.comments.some(
        (comment) => comment.userId === currentUserId,
      );

      if (!userCreatedPost && !userCommented) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }
      const query = searchTerm.toLowerCase();
      return (
        post.title.toLowerCase().includes(query) ||
        post.body.toLowerCase().includes(query) ||
        post.taxonomyLabels.some((label) => label.toLowerCase().includes(query))
      );
    });
  }, [communityPosts, currentUserId, searchTerm, activeTab]);

  const filteredSavedPosts = useMemo(() => {
    return communityPosts.filter((post) => {
      // Only show saved posts
      if (!savedPostIds.includes(post.postId)) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }
      const query = searchTerm.toLowerCase();
      return (
        post.title.toLowerCase().includes(query) ||
        post.body.toLowerCase().includes(query) ||
        post.taxonomyLabels.some((label) => label.toLowerCase().includes(query))
      );
    });
  }, [communityPosts, savedPostIds, searchTerm]);

  const myCommunities = useMemo(() => {
    let filtered = communities.filter(
      (community) =>
        community.isJoined || community.createdBy === currentUserId,
    );

    // Apply created/joined filter
    if (myCommunitiesFilter === "created") {
      filtered = filtered.filter(
        (community) => community.createdBy === currentUserId,
      );
    } else if (myCommunitiesFilter === "joined") {
      filtered = filtered.filter(
        (community) =>
          community.isJoined && community.createdBy !== currentUserId,
      );
    }
    // 'all' shows everything (no additional filtering)

    return filtered;
  }, [communities, currentUserId, myCommunitiesFilter]);

  const currentCommunities =
    activeTab === "communities" ? filteredCommunities : myCommunities;

  const handleFilterChange = (
    type: CommunityTaxonomy["taxonomyType"],
    value: string,
  ) => {
    setSelectedFilters((prev) => ({ ...prev, [type]: value }));
  };

  const handleTopicFilterToggle = (topicLabel: string) => {
    setSelectedFilters((prev) => {
      const currentTopics = Array.isArray(prev.topic) ? prev.topic : [];
      const newTopics = currentTopics.includes(topicLabel)
        ? currentTopics.filter((t) => t !== topicLabel)
        : [...currentTopics, topicLabel];
      return { ...prev, topic: newTopics };
    });
  };

  const clearTopicFilters = () => {
    setSelectedFilters((prev) => ({ ...prev, topic: [] }));
  };

  const calculatePopoverPosition = (buttonRef: HTMLElement) => {
    const rect = buttonRef.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popoverWidth = 300;
    const popoverHeight = 300;

    // Align popover's right edge with button's right edge
    // rect.right is distance from left edge of viewport to button's right edge
    // So distance from viewport's right edge = viewportWidth - rect.right
    let right = viewportWidth - rect.right;
    let top = rect.bottom + 8;

    // Check if popover would go off the left side of screen
    // If button's right edge - popover width < 20px from left, adjust
    if (rect.right - popoverWidth < 20) {
      // Shift popover left so it doesn't go off screen
      right = viewportWidth - 20 - popoverWidth;
    }
    // Ensure minimum spacing from right edge
    if (right < 20) {
      right = 20;
    }
    if (top + popoverHeight > viewportHeight - 20) {
      top = rect.top - popoverHeight - 8;
    }
    if (top < 20) {
      top = 20;
    }

    return { top, right };
  };

  const handleResetFilters = () => {
    setSelectedFilters({ age_group: "all", stage: "all", topic: [] });
    setSearchTerm("");
    setMyCommunitiesFilter("all");
  };

  const handleResetMyActivityFilters = () => {
    setMyActivityCommunityFilter(null);
    setMyActivityTypeFilter("all");
    setSearchTerm("");
  };

  const handleResetSavedPostsFilters = () => {
    setSavedPostsCommunityFilter(null);
    setSavedPostsTopicFilter([]);
    setSearchTerm("");
  };

  const fetchCommunityDetail = useCallback(async (communityId: number) => {
    try {
      const community = await getCommunityById(communityId);
      const transformed = {
        communityId: community.community_id,
        name: community.name,
        description: community.description || "",
        coverImageUrl: community.cover_image_url || "",
        status: community.status,
        memberCount: community.member_count || 0,
        postCount: community.post_count || 0,
        tags: (community.tags || []).map((tag: any) => ({
          taxonomyId: tag.taxonomy_id,
          taxonomyType: tag.taxonomy_type,
          label: tag.label,
        })),
        rules: community.rules || [],
        moderators: community.moderators || [],
        members: (community.members || []).map(transformMember),
        isJoined: community.is_joined || false,
        createdBy: community.created_by,
      };
      setSelectedCommunity(transformed);
    } catch (err) {
      console.error("Error loading community:", err);
      toast.error("Failed to load community details");
    }
  }, []);

  // Helper functions for community permissions
  const isCommunityOwner = (community: Community): boolean => {
    return community.createdBy === currentUserId;
  };

  const isCommunityModerator = (community: Community): boolean => {
    if (!community.members) return false;
    return community.members.some(
      (member) =>
        member.userId === currentUserId &&
        (member.role === "moderator" || member.role === "owner"),
    );
  };

  const canEditCommunity = (community: Community): boolean => {
    return isCommunityOwner(community) || isCommunityModerator(community);
  };

  const canDeleteCommunity = (community: Community): boolean => {
    return isCommunityOwner(community); // Only owner can delete
  };

  // Helper function to render avatar with fallback to initial letter
  // Helper function to format activity display
  const formatActivityDisplay = (
    lastActivityAt: string | null | undefined,
  ): string => {
    if (!lastActivityAt) {
      return "Never active";
    }
    // Backend already returns formatted strings like "2 hours ago", "Just now", etc.
    // Display as "Active X ago" or "Active just now"
    return `Active ${lastActivityAt}`;
  };

  const renderAvatar = (
    avatarUrl: string | undefined,
    name: string,
    size: "w-8" | "w-10" | "w-12" = "w-10",
  ) => {
    const sizeMap = {
      "w-8": { width: "w-8", height: "h-8", text: "text-sm" },
      "w-10": { width: "w-10", height: "h-10", text: "text-sm" },
      "w-12": { width: "w-12", height: "h-12", text: "text-base" },
    };
    const sizeClasses = sizeMap[size];

    if (avatarUrl && avatarUrl.trim() !== "") {
      return (
        <img
          src={avatarUrl}
          alt={name}
          className={`${sizeClasses.width} ${sizeClasses.height} rounded-full object-cover flex-shrink-0`}
        />
      );
    }

    return (
      <div
        className={`${sizeClasses.width} ${sizeClasses.height} rounded-full flex items-center justify-center text-white font-medium ${sizeClasses.text} flex-shrink-0`}
        style={{ backgroundColor: "#F2742C", border: "2px solid #F2742C" }}
      >
        {name?.charAt(0).toUpperCase() || "U"}
      </div>
    );
  };

  const handleOpenEditModal = async (community: Community) => {
    if (!canEditCommunity(community)) return;

    // Populate form with existing community data
    setNewCommunityName(community.name);
    setNewCommunityDescription(community.description);
    setNewCommunityTopics(
      community.tags
        .filter((t) => t.taxonomyType === "topic")
        .map((t) => t.label),
    );
    setNewCommunityAgeGroups(
      community.tags
        .filter((t) => t.taxonomyType === "age_group")
        .map((t) => t.label),
    );
    setNewCommunityStages(
      community.tags
        .filter((t) => t.taxonomyType === "stage")
        .map((t) => t.label),
    );
    setNewCommunityRules(community.rules.length > 0 ? community.rules : [""]);

    // Initialize moderators from community members (moderators and owner)
    const moderatorMembers = community.members.filter(
      (m) => m.role === "moderator" || m.role === "owner",
    );
    const moderatorUsers: ModeratorUser[] = moderatorMembers.map((m) => ({
      userId: m.userId,
      email: "", // We don't have email in members, will need to fetch or use name as fallback
      name: m.name,
      avatar: m.avatar || null,
    }));
    setNewCommunityModerators(moderatorUsers);

    setNewCommunityCoverImagePreview(community.coverImageUrl);
    setNewCommunityCoverImage(null);
    setShouldDeleteCoverImage(false);
    setModeratorSearchQuery("");
    setModeratorSearchResults([]);
    setShowEditCommunityModal(true);
    setShowCommunityMenu(false);

    // Try to fetch user details for existing moderators by searching for their names
    if (moderatorUsers.length > 0) {
      // For each moderator name, try to find the user
      const fetchModeratorDetails = async () => {
        const updatedModerators: ModeratorUser[] = [];
        for (const mod of moderatorUsers) {
          if (mod.name) {
            try {
              // Use searchUsersForMessage to only search for parent users (moderators must be parents)
              const searchResult = await searchUsersForMessage(mod.name);
              if (searchResult.users && searchResult.users.length > 0) {
                // Find exact match by name or use first result
                const match =
                  searchResult.users.find(
                    (u: any) => u.name.toLowerCase() === mod.name.toLowerCase(),
                  ) || searchResult.users[0];
                updatedModerators.push({
                  userId: match.user_id,
                  email: match.email,
                  name: match.name,
                  avatar: match.avatar,
                });
              } else {
                // Keep the placeholder if search fails
                updatedModerators.push(mod);
              }
            } catch (error) {
              console.error("Error fetching moderator details:", error);
              updatedModerators.push(mod);
            }
          } else {
            updatedModerators.push(mod);
          }
        }
        setNewCommunityModerators(updatedModerators);
      };
      fetchModeratorDetails();
    }
  };

  const handleDeleteCommunity = async (community: Community) => {
    if (!canDeleteCommunity(community)) return;

    try {
      await deleteCommunity(community.communityId);
      toast.success("Community deleted successfully");

      // After deletion, close modals and reset
      setShowDeleteConfirmModal(false);
      setCommunityToDelete(null);
      setSelectedCommunity(null);
      setCommunityDetailTab("posts");

      // Refresh communities list
      const filters: any = {};
      if (searchTerm) filters.search = searchTerm;
      if (selectedFilters.age_group !== "all")
        filters.age_group = selectedFilters.age_group;
      if (selectedFilters.stage !== "all")
        filters.stage = selectedFilters.stage;
      if (
        Array.isArray(selectedFilters.topic) &&
        selectedFilters.topic.length > 0
      ) {
        filters.topics = selectedFilters.topic;
      }
      const data = await getCommunities(filters);
      const transformed = data.map((c: any) => ({
        communityId: c.community_id,
        name: c.name,
        description: c.description || "",
        coverImageUrl: c.cover_image_url || "",
        status: c.status,
        memberCount: c.member_count || 0,
        postCount: c.post_count || 0,
        tags: (c.tags || []).map((tag: any) => ({
          taxonomyId: tag.taxonomy_id,
          taxonomyType: tag.taxonomy_type,
          label: tag.label,
        })),
        rules: c.rules || [],
        moderators: c.moderators || [],
        members: c.members || [],
        isJoined: c.is_joined || false,
        createdBy: c.created_by,
      }));
      setCommunities(transformed);
    } catch (err: any) {
      console.error("Error deleting community:", err);
      toast.error(err.message || "Failed to delete community");
    }
  };

  const renderTaxonomyBadges = (community: Community) => (
    <div className="flex flex-wrap gap-2">
      {community.tags.map((tag) => (
        <span
          key={`${community.communityId}-${tag.taxonomyId}`}
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: "#F5F5F5",
            color: "#AA855B",
            border: "1px solid #D4C4A8",
          }}
        >
          {tag.label}
        </span>
      ))}
    </div>
  );

  const renderCommunityCardMenu = (community: Community) => {
    const isMenuOpen = openCommunityCardMenu === community.communityId;
    const canDelete = canDeleteCommunity(community);
    const isCreatedByUser = community.createdBy === currentUserId;

    if (!isMenuOpen) return null;

    return (
      <>
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpenCommunityCardMenu(null)}
        />
        <div
          className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-20"
          style={{ borderColor: "#F0DCC9" }}
          data-community-card-menu={community.communityId}
        >
          <div className="py-1">
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
              style={{ color: "#32332D" }}
              onClick={() => {
                setShowShareCommunity(community);
                setOpenCommunityCardMenu(null);
              }}
            >
              <Share2 className="w-4 h-4" style={{ color: "#AA855B" }} />
              Share Community
            </button>
            {/* Only show Report/Hide/Leave if NOT created by user */}
            {!isCreatedByUser && (
              <>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                  style={{ color: "#32332D" }}
                  onClick={() => {
                    setShowReportCommunityModal(community);
                    setOpenCommunityCardMenu(null);
                  }}
                >
                  <Flag className="w-4 h-4" style={{ color: "#AA855B" }} />
                  Report Community
                </button>
                {community.isJoined && (
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                    style={{ color: "#32332D" }}
                    onClick={() => {
                      setShowLeaveConfirmModal(community);
                      setOpenCommunityCardMenu(null);
                    }}
                  >
                    <X className="w-4 h-4" style={{ color: "#AA855B" }} />
                    Leave Community
                  </button>
                )}
              </>
            )}
            {canDelete && (
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                style={{ color: "#EF4444" }}
                onClick={() => {
                  setCommunityToDelete(community);
                  setShowDeleteConfirmModal(true);
                  setOpenCommunityCardMenu(null);
                }}
              >
                <Trash2 className="w-4 h-4" />
                Delete Community
              </button>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderCommunityCard = (community: Community) => {
    const isJoined = community.isJoined;
    const isCreatedByUser = community.createdBy === currentUserId;
    return (
      <div
        key={community.communityId}
        className="bg-white rounded-xl shadow-sm overflow-hidden border flex flex-col h-full relative"
        style={{ borderColor: "#F0DCC9" }}
      >
        <img
          src={community.coverImageUrl}
          alt={community.name}
          className="w-full h-48 object-cover flex-shrink-0"
        />
        <div className="flex flex-col flex-grow px-5 pt-5 pb-5 justify-between">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: "#32332D" }}
                  >
                    {community.name}
                  </h3>
                  {isCreatedByUser && (
                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{
                        backgroundColor: "#FDF2E8",
                        color: "#F2742C",
                        border: "1px solid #F0DCC9",
                      }}
                    >
                      Created by you
                    </span>
                  )}
                </div>
                <p className="text-sm" style={{ color: "#64635E" }}>
                  {community.description}
                </p>
              </div>
              <div className="relative flex-shrink-0 ml-2">
                <button
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() =>
                    setOpenCommunityCardMenu(
                      openCommunityCardMenu === community.communityId
                        ? null
                        : community.communityId,
                    )
                  }
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {renderCommunityCardMenu(community)}
              </div>
            </div>

            {renderTaxonomyBadges(community)}

            <div
              className="flex items-center justify-between text-sm"
              style={{ color: "#64635E" }}
            >
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" style={{ color: "#AA855B" }} />
                  {community.memberCount.toLocaleString()} members
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle
                    className="w-4 h-4"
                    style={{ color: "#AA855B" }}
                  />
                  {community.postCount} posts
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={() => {
                // Navigate to community detail URL
                navigate(`/communities/${community.communityId}`);
              }}
              className="w-full py-2 rounded-lg font-medium"
              style={{
                backgroundColor: isJoined ? "#AA855B" : "#F2742C",
                color: "#FFFFFF",
              }}
            >
              View Community
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handlePinPost = async (post: CommunityPost) => {
    try {
      await pinPost(post.postId);
      toast.success("Post pinned successfully", {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
      // Update selectedPost if it's the same post
      if (selectedPost && selectedPost.postId === post.postId) {
        setSelectedPost({ ...selectedPost, isPinned: true });
      }
      // Update post in the list immediately
      setCommunityPosts((prev) =>
        prev.map((p) =>
          p.postId === post.postId ? { ...p, isPinned: true } : p,
        ),
      );
      // Refresh posts to ensure state is synced
      if (selectedCommunity) {
        const data = await getPosts({
          community_id: selectedCommunity.communityId,
          search: searchTerm,
        });
        const transformed = data.map(transformPost);
        setCommunityPosts(transformed);
      } else if (activeTab === "discussions") {
        const data = await getMyActivity(
          myActivityCommunityFilter || undefined,
          myActivityTypeFilter !== "all" ? myActivityTypeFilter : undefined,
        );
        const transformed = data.map(transformPost);
        setCommunityPosts(transformed);
      } else if (activeTab === "savedPosts") {
        const data = await getSavedPosts(
          savedPostsCommunityFilter || undefined,
          savedPostsTopicFilter.length > 0 ? savedPostsTopicFilter : undefined,
        );
        const transformed = data.map(transformPost);
        setCommunityPosts(transformed);
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to pin post";
      toast.error(errorMessage, {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
      // If error is "Post is already pinned", refresh to sync state
      if (
        errorMessage.includes("already pinned") ||
        errorMessage.includes("not pinned")
      ) {
        if (selectedCommunity) {
          const data = await getPosts({
            community_id: selectedCommunity.communityId,
            search: searchTerm,
          });
          const transformed = data.map(transformPost);
          setCommunityPosts(transformed);
        } else if (activeTab === "discussions") {
          const data = await getMyActivity(
            myActivityCommunityFilter || undefined,
            myActivityTypeFilter !== "all" ? myActivityTypeFilter : undefined,
          );
          const transformed = data.map(transformPost);
          setCommunityPosts(transformed);
        } else if (activeTab === "savedPosts") {
          const data = await getSavedPosts(
            savedPostsCommunityFilter || undefined,
            savedPostsTopicFilter.length > 0
              ? savedPostsTopicFilter
              : undefined,
          );
          const transformed = data.map(transformPost);
          setCommunityPosts(transformed);
        }
        // Also refresh selectedPost if it matches
        if (selectedPost && selectedPost.postId === post.postId) {
          try {
            const postData = await getPost(post.postId);
            const transformedPost = transformPost(postData);
            setSelectedPost(transformedPost);
          } catch (err) {
            console.error("Error refreshing selected post:", err);
          }
        }
      }
    }
  };

  const handleUnpinPost = async (post: CommunityPost) => {
    try {
      await unpinPost(post.postId);
      toast.success("Post unpinned successfully", {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
      // Update selectedPost if it's the same post
      if (selectedPost && selectedPost.postId === post.postId) {
        setSelectedPost({ ...selectedPost, isPinned: false });
      }
      // Update post in the list immediately
      setCommunityPosts((prev) =>
        prev.map((p) =>
          p.postId === post.postId ? { ...p, isPinned: false } : p,
        ),
      );
      // Refresh posts to ensure state is synced
      if (selectedCommunity) {
        const data = await getPosts({
          community_id: selectedCommunity.communityId,
          search: searchTerm,
        });
        const transformed = data.map(transformPost);
        setCommunityPosts(transformed);
      } else if (activeTab === "discussions") {
        const data = await getMyActivity(
          myActivityCommunityFilter || undefined,
          myActivityTypeFilter !== "all" ? myActivityTypeFilter : undefined,
        );
        const transformed = data.map(transformPost);
        setCommunityPosts(transformed);
      } else if (activeTab === "savedPosts") {
        const data = await getSavedPosts(
          savedPostsCommunityFilter || undefined,
          savedPostsTopicFilter.length > 0 ? savedPostsTopicFilter : undefined,
        );
        const transformed = data.map(transformPost);
        setCommunityPosts(transformed);
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to unpin post";
      toast.error(errorMessage, {
        style: { fontFamily: "'Poppins', sans-serif" },
      });
      // If error is "Post is not pinned", refresh to sync state
      if (
        errorMessage.includes("not pinned") ||
        errorMessage.includes("already pinned")
      ) {
        if (selectedCommunity) {
          const data = await getPosts({
            community_id: selectedCommunity.communityId,
            search: searchTerm,
          });
          const transformed = data.map(transformPost);
          setCommunityPosts(transformed);
        } else if (activeTab === "discussions") {
          const data = await getMyActivity(
            myActivityCommunityFilter || undefined,
            myActivityTypeFilter !== "all" ? myActivityTypeFilter : undefined,
          );
          const transformed = data.map(transformPost);
          setCommunityPosts(transformed);
        } else if (activeTab === "savedPosts") {
          const data = await getSavedPosts(
            savedPostsCommunityFilter || undefined,
            savedPostsTopicFilter.length > 0
              ? savedPostsTopicFilter
              : undefined,
          );
          const transformed = data.map(transformPost);
          setCommunityPosts(transformed);
        }
        // Also refresh selectedPost if it matches
        if (selectedPost && selectedPost.postId === post.postId) {
          try {
            const postData = await getPost(post.postId);
            const transformedPost = transformPost(postData);
            setSelectedPost(transformedPost);
          } catch (err) {
            console.error("Error refreshing selected post:", err);
          }
        }
      }
    }
  };

  const handleSavePost = async (post: CommunityPost) => {
    try {
      const result = await savePost(post.postId);
      if (result.saved) {
        setSavedPostIds((prev) => [...prev, post.postId]);
        toast.success("Post saved");
      } else {
        setSavedPostIds((prev) => prev.filter((id) => id !== post.postId));
        toast.success("Post unsaved");
      }
    } catch (err: any) {
      console.error("Error saving post:", err);
      toast.error(err.message || "Failed to save post");
    }
  };

  const isPostSaved = (postId: number): boolean => {
    return savedPostIds.includes(postId);
  };

  const handleReportPost = (post: CommunityPost) => {
    setShowReportPostModal(post);
  };

  const handleEditPost = (post: CommunityPost) => {
    setEditPostTitle(post.title);
    setEditPostContent(post.body);
    setEditPostImages([]);
    // Load existing post images if any
    if (post.attachments && post.attachments.length > 0) {
      setEditPostImagePreviews(post.attachments.map((att) => att.file_path));
    } else {
      setEditPostImagePreviews([]);
    }
    setShowEditPostModal(true);
    setOpenPostDetailMenu(false);
  };

  const handleSaveEditPost = async () => {
    if (!selectedPost || !editPostTitle.trim() || !editPostContent.trim())
      return;

    try {
      // Start with existing attachments (from existing attachments in database)
      const attachments: Array<{
        url: string;
        file_name: string;
        file_size?: number;
        mime_type?: string;
      }> = [];

      if (selectedPost.attachments && selectedPost.attachments.length > 0) {
        // Keep existing images that are still in previews (not removed)
        const currentPreviews = editPostImagePreviews;
        // Only keep existing attachments that are still in previews (not removed by user)
        selectedPost.attachments.forEach((att) => {
          if (currentPreviews.includes(att.file_path)) {
            // Extract file name from URL if not available in attachment data
            const file_name =
              att.file_name ||
              att.file_path.split("/").pop()?.split("?")[0] ||
              "image.jpg";
            attachments.push({
              url: att.file_path,
              file_name: file_name,
              // Preserve existing file_size and mime_type if available
              file_size: att.file_size || undefined,
              mime_type: att.mime_type || undefined,
            });
          }
        });
      }

      // Upload new images and add their metadata
      if (editPostImages.length > 0) {
        for (const file of editPostImages) {
          try {
            const uploadResult = await uploadPostImage(file);
            attachments.push({
              url: uploadResult.url,
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type || undefined,
            });
          } catch (uploadErr: any) {
            console.error("Error uploading image:", uploadErr);
            toast.error(`Failed to upload image: ${uploadErr.message}`);
            return; // Stop if any image fails
          }
        }
      }

      const updatedPost = await updatePost(selectedPost.postId, {
        community_id: selectedPost.communityId,
        title: editPostTitle.trim(),
        body: editPostContent.trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      // Transform and update selected post
      const transformed = transformPost(updatedPost);
      setSelectedPost(transformed);

      // Update in posts list
      setCommunityPosts((prev) =>
        prev.map((p) => (p.postId === selectedPost.postId ? transformed : p)),
      );

      toast.success("Post updated successfully");

      // Reset form
      setEditPostTitle("");
      setEditPostContent("");
      setEditPostImages([]);
      setEditPostImagePreviews([]);
      setShowEditPostModal(false);
    } catch (err: any) {
      console.error("Error updating post:", err);
      toast.error(err.message || "Failed to update post");
    }
  };

  const handleCancelEditPost = () => {
    setEditPostTitle("");
    setEditPostContent("");
    setEditPostImages([]);
    setEditPostImagePreviews([]);
    setShowEditPostModal(false);
  };

  // Helper function to handle both file input and drag-and-drop for post images
  const handlePostImagesFiles = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      const validFiles = newFiles.filter((file) =>
        file.type.startsWith("image/"),
      );

      if (validFiles.length > 0) {
        setEditPostImages((prev) => [...prev, ...validFiles]);

        // Create previews
        validFiles.forEach((file) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setEditPostImagePreviews((prev) => [
              ...prev,
              reader.result as string,
            ]);
          };
          reader.readAsDataURL(file);
        });
      }
    }
  };

  const handleRemoveEditPostImage = (index: number) => {
    setEditPostImages((prev) => prev.filter((_, i) => i !== index));
    setEditPostImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReplyClick = (commentId: number) => {
    // Close any other open reply input
    if (openReplyInput !== commentId) {
      setOpenReplyInput(commentId);
      if (!replyContent[commentId]) {
        setReplyContent((prev) => ({ ...prev, [commentId]: "" }));
      }
    } else {
      setOpenReplyInput(null);
    }
  };

  const handleReplySubmit = async (commentId: number, parentDepth?: number) => {
    const content = replyContent[commentId];
    if (!content || !content.trim() || !selectedPost) return;

    // Check if user is a member of the community
    const postCommunity = communities.find(
      (c) => c.communityId === selectedPost.communityId,
    );
    if (!postCommunity?.isJoined) {
      toast.error("You must join this community to reply");
      return;
    }

    // Check nesting depth (max 2-3 levels)
    const maxDepth = 2;
    const currentDepth = parentDepth !== undefined ? parentDepth + 1 : 1;

    if (currentDepth > maxDepth) {
      toast.error(
        "Maximum nesting depth reached. Please reply to a top-level comment instead.",
      );
      return;
    }

    try {
      await createComment(selectedPost.postId, {
        body: content.trim(),
        parent_comment_id: commentId,
      });

      // Refresh post to get updated comments
      const updatedPost = await getPost(selectedPost.postId);
      const transformed = transformPost(updatedPost);
      setSelectedPost(transformed);

      setReplyContent((prev) => ({ ...prev, [commentId]: "" }));
      setOpenReplyInput(null);
      // No success toast - reply appears immediately in the UI
    } catch (err: any) {
      console.error("Error submitting reply:", err);
      toast.error(err.message || "Failed to post reply");
    }
  };

  const handleLikePost = async (post: CommunityPost) => {
    try {
      // Optimistically update UI
      const wasLiked = post.isLiked || false;
      const newLikes = wasLiked ? post.likes - 1 : post.likes + 1;

      // Update post in state immediately
      const updatedPost = { ...post, isLiked: !wasLiked, likes: newLikes };

      if (selectedPost && selectedPost.postId === post.postId) {
        setSelectedPost(updatedPost);
      }

      // Update in posts list
      setCommunityPosts((prev) =>
        prev.map((p) => (p.postId === post.postId ? updatedPost : p)),
      );

      // Call API
      await likePost(post.postId);

      // Refresh to get accurate count (in case of race conditions)
      const refreshedPost = await getPost(post.postId);
      const transformed = transformPost(refreshedPost);

      if (selectedPost && selectedPost.postId === post.postId) {
        setSelectedPost(transformed);
      }
      setCommunityPosts((prev) =>
        prev.map((p) => (p.postId === post.postId ? transformed : p)),
      );
    } catch (err: any) {
      console.error("Error liking post:", err);
      toast.error(err.message || "Failed to like post");

      // Revert optimistic update on error
      if (selectedPost && selectedPost.postId === post.postId) {
        setSelectedPost(post);
      }
      setCommunityPosts((prev) =>
        prev.map((p) => (p.postId === post.postId ? post : p)),
      );
    }
  };

  const handleScrollToComments = async (post: CommunityPost) => {
    // If we're in post detail view, scroll to comments section
    if (selectedPost && selectedPost.postId === post.postId) {
      const commentsSection = document.getElementById("comments-section");
      if (commentsSection) {
        commentsSection.scrollIntoView({ behavior: "smooth", block: "start" });
        // Focus comment input after scrolling
        setTimeout(() => {
          const commentInput = document.querySelector(
            "#comment-input",
          ) as HTMLTextAreaElement;
          if (commentInput) {
            commentInput.focus();
          }
        }, 500);
        return;
      }
    }

    // If we're in list view, navigate to post detail URL and scroll
    const postCommunity =
      communities.find((c) => c.communityId === post.communityId) ||
      selectedCommunity;
    if (postCommunity) {
      // Determine source based on activeTab
      let sourceParam = "";
      if (activeTab === "discussions") {
        sourceParam = "&source=myActivity";
      } else if (activeTab === "savedPosts") {
        sourceParam = "&source=savedPosts";
      } else if (selectedCommunity) {
        sourceParam = "&source=community";
      }
      // Navigate to post detail URL - the URL loading logic will handle loading the post
      navigate(
        `/communities/${postCommunity.communityId}?postId=${post.postId}${sourceParam}`,
      );
      // Scroll to comments after navigation (URL loading will set selectedPost)
      setTimeout(() => {
        const commentsSection = document.getElementById("comments-section");
        if (commentsSection) {
          commentsSection.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
          setTimeout(() => {
            const commentInput = document.querySelector(
              "#comment-input",
            ) as HTMLTextAreaElement;
            if (commentInput) {
              commentInput.focus();
            }
          }, 500);
        }
      }, 500); // Wait a bit longer for URL loading to complete
    } else {
      // Fallback: try to load community first
      try {
        const allCommunities = await getCommunities();
        const matchingCommunity = allCommunities.find(
          (c: any) => c.community_id === post.communityId,
        );
        if (matchingCommunity) {
          // Determine source based on activeTab
          let sourceParam = "";
          if (activeTab === "discussions") {
            sourceParam = "&source=myActivity";
          } else if (activeTab === "savedPosts") {
            sourceParam = "&source=savedPosts";
          } else if (selectedCommunity) {
            sourceParam = "&source=community";
          }
          navigate(
            `/communities/${matchingCommunity.communityId}?postId=${post.postId}${sourceParam}`,
          );
          setTimeout(() => {
            const commentsSection = document.getElementById("comments-section");
            if (commentsSection) {
              commentsSection.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
              setTimeout(() => {
                const commentInput = document.querySelector(
                  "#comment-input",
                ) as HTMLTextAreaElement;
                if (commentInput) {
                  commentInput.focus();
                }
              }, 500);
            }
          }, 500);
        } else {
          // Last resort: set state directly
          if (selectedCommunity) {
            setPostDetailSource("community");
          } else if (activeTab === "discussions") {
            setPostDetailSource("myActivity");
          } else if (activeTab === "savedPosts") {
            setPostDetailSource("savedPosts");
          } else {
            setPostDetailSource("community");
          }
          try {
            const fullPost = await getPost(post.postId);
            const transformed = transformPost(fullPost);
            setSelectedPost(transformed);
            setTimeout(() => {
              const commentsSection =
                document.getElementById("comments-section");
              if (commentsSection) {
                commentsSection.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
                setTimeout(() => {
                  const commentInput = document.querySelector(
                    "#comment-input",
                  ) as HTMLTextAreaElement;
                  if (commentInput) {
                    commentInput.focus();
                  }
                }, 500);
              }
            }, 100);
          } catch (err) {
            console.error("Error fetching post details:", err);
            setSelectedPost(post);
          }
        }
      } catch (err) {
        console.error("Error loading community for post:", err);
        // Fallback to state
        if (selectedCommunity) {
          setPostDetailSource("community");
        } else if (activeTab === "discussions") {
          setPostDetailSource("myActivity");
        } else if (activeTab === "savedPosts") {
          setPostDetailSource("savedPosts");
        } else {
          setPostDetailSource("community");
        }
        try {
          const fullPost = await getPost(post.postId);
          const transformed = transformPost(fullPost);
          setSelectedPost(transformed);
          setTimeout(() => {
            const commentsSection = document.getElementById("comments-section");
            if (commentsSection) {
              commentsSection.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
              setTimeout(() => {
                const commentInput = document.querySelector(
                  "#comment-input",
                ) as HTMLTextAreaElement;
                if (commentInput) {
                  commentInput.focus();
                }
              }, 500);
            }
          }, 100);
        } catch (postErr) {
          console.error("Error fetching post details:", postErr);
          setSelectedPost(post);
        }
      }
    }
  };

  const handleLikeComment = async (comment: CommunityPostComment) => {
    // Optimistic UI update
    if (selectedPost) {
      const wasLiked = comment.isLiked || false;
      const newLikes = wasLiked ? comment.likes - 1 : comment.likes + 1;

      // Helper to update comment in nested structure
      const updateCommentInPost = (
        comments: CommunityPostComment[],
      ): CommunityPostComment[] => {
        return comments.map((c) => {
          if (c.commentId === comment.commentId) {
            return { ...c, isLiked: !wasLiked, likes: newLikes };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: updateCommentInPost(c.replies) };
          }
          return c;
        });
      };

      const updatedComments = updateCommentInPost(selectedPost.comments);
      setSelectedPost({ ...selectedPost, comments: updatedComments });
    }

    try {
      await likeComment(comment.commentId);
      // Refresh post to get updated like count (after optimistic update)
      if (selectedPost) {
        const updatedPost = await getPost(selectedPost.postId);
        const transformed = transformPost(updatedPost);
        setSelectedPost(transformed);
      }
    } catch (err: any) {
      console.error("Error liking comment:", err);
      toast.error(err.message || "Failed to like comment");
      // Revert optimistic update on error
      if (selectedPost) {
        const wasLiked = comment.isLiked || false;
        const newLikes = wasLiked ? comment.likes + 1 : comment.likes - 1;

        const updateCommentInPost = (
          comments: CommunityPostComment[],
        ): CommunityPostComment[] => {
          return comments.map((c) => {
            if (c.commentId === comment.commentId) {
              return { ...c, isLiked: wasLiked, likes: newLikes };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: updateCommentInPost(c.replies) };
            }
            return c;
          });
        };

        const updatedComments = updateCommentInPost(selectedPost.comments);
        setSelectedPost({ ...selectedPost, comments: updatedComments });
      }
    }
  };

  const countAllComments = (comments: CommunityPostComment[]): number => {
    let count = 0;
    const countRecursive = (comment: CommunityPostComment) => {
      count++;
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.forEach((reply) => countRecursive(reply));
      }
    };
    comments.forEach((comment) => countRecursive(comment));
    return count;
  };

  const renderComment = (comment: CommunityPostComment, depth: number = 0) => {
    const canReply = depth < 2; // Max 2-3 levels (0, 1, 2)

    return (
      <div
        key={comment.commentId}
        data-comment-id={comment.commentId}
        className="border rounded-xl p-3 sm:p-4"
        style={{
          borderColor: "#F0DCC9",
          marginLeft:
            depth > 0
              ? depth === 1
                ? "8px"
                : depth === 2
                  ? "16px"
                  : "24px"
              : "0",
        }}
      >
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="hidden sm:block">
            {renderAvatar(comment.avatar, comment.author, "w-10")}
          </div>
          <div className="sm:hidden">
            {renderAvatar(comment.avatar, comment.author, "w-8")}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="flex items-center gap-1.5 sm:gap-2 mb-1 text-xs sm:text-sm"
              style={{ color: "#64635E" }}
            >
              <span className="font-medium" style={{ color: "#32332D" }}>
                {comment.author}
              </span>
              <span>•</span>
              <span>{comment.time}</span>
            </div>
            <p
              className="text-xs sm:text-sm mb-2 sm:mb-3"
              style={{ color: "#64635E" }}
            >
              {comment.body}
            </p>
            <div
              className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm"
              style={{ color: "#64635E" }}
            >
              <button
                className="flex items-center gap-1 transition-colors"
                style={{ color: comment.isLiked ? "#EF4444" : "#64635E" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#EF4444";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = comment.isLiked
                    ? "#EF4444"
                    : "#64635E";
                }}
                onClick={() => handleLikeComment(comment)}
              >
                <ThumbsUp
                  className={`w-4 h-4 ${comment.isLiked ? "fill-current" : ""}`}
                />
                <span>{comment.likes}</span>
              </button>
              {canReply && (
                <button
                  className="hover:text-blue-500 transition-colors"
                  onClick={() => {
                    handleReplyClick(comment.commentId);
                  }}
                >
                  Reply
                </button>
              )}
              {isAuthenticated && comment.userId !== currentUserId && (
                <button
                  className="hover:text-red-500 transition-colors"
                  onClick={() => handleReportComment(comment)}
                >
                  Report
                </button>
              )}
            </div>

            {/* Reply Input - Nested below comment */}
            {openReplyInput === comment.commentId &&
              isAuthenticated &&
              canReply && (
                <div
                  className="mt-3 sm:mt-4 ml-2 sm:ml-4 pl-2 sm:pl-4 border-l-2"
                  style={{ borderColor: "#F0DCC9" }}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    {renderAvatar(currentUserAvatar, currentUserName, "w-8")}
                    <div className="flex-1 relative">
                      <textarea
                        rows={2}
                        placeholder={`Reply to ${comment.author}...`}
                        value={replyContent[comment.commentId] || ""}
                        onChange={(e) =>
                          setReplyContent((prev) => ({
                            ...prev,
                            [comment.commentId]: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border px-2.5 sm:px-3 py-1.5 sm:py-2 pr-10 sm:pr-12 focus:ring-2 focus:border-transparent transition-all duration-200 resize-none text-xs sm:text-sm"
                        style={{
                          ...getInputStyles(
                            replyContent[comment.commentId] || "",
                          ),
                          fontFamily: "'Poppins', sans-serif",
                        }}
                        onMouseEnter={(e) =>
                          Object.assign(
                            (e.target as HTMLTextAreaElement).style,
                            getInputHoverStyles(),
                          )
                        }
                        onMouseLeave={(e) =>
                          Object.assign(
                            (e.target as HTMLTextAreaElement).style,
                            getInputBlurStyles(
                              replyContent[comment.commentId] || "",
                            ),
                          )
                        }
                        onFocus={(e) =>
                          Object.assign(
                            (e.target as HTMLTextAreaElement).style,
                            getInputFocusStyles(),
                          )
                        }
                        onBlur={(e) =>
                          Object.assign(
                            (e.target as HTMLTextAreaElement).style,
                            getInputBlurStyles(
                              replyContent[comment.commentId] || "",
                            ),
                          )
                        }
                      />
                      <button
                        className="absolute right-1.5 sm:right-2 bottom-2.5 sm:bottom-3.5 p-1.5 sm:p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: (
                            replyContent[comment.commentId] || ""
                          ).trim()
                            ? "#F2742C"
                            : "#D4C4A8",
                          color: "#FFFFFF",
                        }}
                        disabled={
                          !(replyContent[comment.commentId] || "").trim()
                        }
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.backgroundColor = "#E55A1F";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.backgroundColor = (
                              replyContent[comment.commentId] || ""
                            ).trim()
                              ? "#F2742C"
                              : "#D4C4A8";
                          }
                        }}
                        onClick={() =>
                          handleReplySubmit(comment.commentId, depth)
                        }
                      >
                        <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

            {/* Render nested replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-4 space-y-4">
                {comment.replies.map((reply) =>
                  renderComment(reply, depth + 1),
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleReportComment = (comment: CommunityPostComment) => {
    setShowReportCommentModal(comment);
  };

  const confirmDeletePost = async (post: CommunityPost) => {
    try {
      await deletePost(post.postId);
      toast.success("Post deleted successfully");

      setShowDeletePostModal(null);

      // Remove from posts list
      setCommunityPosts((prev) => prev.filter((p) => p.postId !== post.postId));

      // If it was the selected post, clear selection
      if (selectedPost?.postId === post.postId) {
        setSelectedPost(null);
      }
    } catch (err: any) {
      console.error("Error deleting post:", err);
      toast.error(err.message || "Failed to delete post");
    }
  };

  const handleSubmitReport = async (
    type: "post" | "community" | "comment",
    id: number,
  ) => {
    if (!reportReason.trim()) {
      toast.error("Please select a reason for reporting.");
      return;
    }

    try {
      await submitReport({
        entity_type: type,
        entity_id: id,
        reason: reportReason,
        details: reportDetails || undefined,
      });

      toast.success("Report submitted successfully");

      // Reset form
      setReportReason("");
      setReportDetails("");
      setShowReportPostModal(null);
      setShowReportCommunityModal(null);
      setShowReportCommentModal(null);
    } catch (err: any) {
      console.error("Error submitting report:", err);
      toast.error(err.message || "Failed to submit report");
    }
  };

  const handleLeaveCommunity = async (community: Community) => {
    try {
      await leaveCommunity(community.communityId);
      toast.success("Left community successfully");

      // Refresh community data to get updated member list
      const updated = await getCommunityById(community.communityId);
      const transformed = {
        communityId: updated.community_id,
        name: updated.name,
        description: updated.description || "",
        coverImageUrl: updated.cover_image_url || "",
        status: updated.status,
        memberCount: updated.member_count || 0,
        postCount: updated.post_count || 0,
        tags: (updated.tags || []).map((tag: any) => ({
          taxonomyId: tag.taxonomy_id,
          taxonomyType: tag.taxonomy_type,
          label: tag.label,
        })),
        rules: updated.rules || [],
        moderators: updated.moderators || [],
        members: (updated.members || []).map(transformMember),
        isJoined: updated.is_joined || false,
        createdBy: updated.created_by,
      };

      // Update local state
      setCommunities((prev) =>
        prev.map((c) =>
          c.communityId === community.communityId ? transformed : c,
        ),
      );

      if (selectedCommunity?.communityId === community.communityId) {
        setSelectedCommunity(transformed);
        // Refresh posts to show limited preview
        const posts = await getPosts({ community_id: community.communityId });
        const transformedPosts = posts.map(transformPost);
        setCommunityPosts(transformedPosts);
      }

      // Close the modal
      setShowLeaveConfirmModal(null);
    } catch (err: any) {
      console.error("Error leaving community:", err);
      toast.error(err.message || "Failed to leave community");
    }
  };

  const renderPostCardMenu = (post: CommunityPost) => {
    const isOwnPost = post.authorId === currentUserId;
    const isMenuOpen = openPostCardMenu === post.postId;
    const isSaved = isPostSaved(post.postId);

    // Check if user can pin/unpin (owner or moderator of the community)
    const community =
      communities.find((item) => item.communityId === post.communityId) ||
      (selectedCommunity?.communityId === post.communityId
        ? selectedCommunity
        : null);
    const canPinPost = community
      ? isCommunityOwner(community) || isCommunityModerator(community)
      : false;

    if (!isMenuOpen) return null;

    return (
      <>
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpenPostCardMenu(null)}
        />
        <div
          className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-20"
          style={{ borderColor: "#F0DCC9" }}
          data-post-menu={post.postId}
        >
          <div className="py-1">
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
              style={{ color: "#32332D" }}
              onClick={() => {
                handleSavePost(post);
                setOpenPostCardMenu(null);
              }}
            >
              <Bookmark
                className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`}
                style={{ color: "#AA855B" }}
              />
              {isSaved ? "Unsave Post" : "Save Post"}
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
              style={{ color: "#32332D" }}
              onClick={() => {
                setShowSharePost(post);
                setOpenPostCardMenu(null);
              }}
            >
              <Share2 className="w-4 h-4" style={{ color: "#AA855B" }} />
              Share Post
            </button>
            {!isOwnPost && (
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                style={{ color: "#32332D" }}
                onClick={() => {
                  handleReportPost(post);
                  setOpenPostCardMenu(null);
                }}
              >
                <Flag className="w-4 h-4" style={{ color: "#AA855B" }} />
                Report Post
              </button>
            )}
            {canPinPost && (
              <>
                <div
                  className="border-t my-1"
                  style={{ borderColor: "#F0DCC9" }}
                />
                {post.isPinned ? (
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                    style={{ color: "#32332D" }}
                    onClick={() => {
                      handleUnpinPost(post);
                      setOpenPostCardMenu(null);
                    }}
                  >
                    <Pin className="w-4 h-4" style={{ color: "#AA855B" }} />
                    Unpin Post
                  </button>
                ) : (
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                    style={{ color: "#32332D" }}
                    onClick={() => {
                      handlePinPost(post);
                      setOpenPostCardMenu(null);
                    }}
                  >
                    <Pin className="w-4 h-4" style={{ color: "#AA855B" }} />
                    Pin Post
                  </button>
                )}
              </>
            )}
            {isOwnPost && (
              <>
                <div
                  className="border-t my-1"
                  style={{ borderColor: "#F0DCC9" }}
                />
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                  style={{ color: "#EF4444" }}
                  onClick={() => {
                    setShowDeletePostModal(post);
                    setOpenPostCardMenu(null);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Post
                </button>
              </>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderDiscussionCard = (post: CommunityPost) => {
    const community =
      communities.find((item) => item.communityId === post.communityId) ||
      (selectedCommunity?.communityId === post.communityId
        ? selectedCommunity
        : null);
    const isMember = community?.isJoined || false;
    const userCreatedPost = post.authorId === currentUserId;
    const userCommented = post.comments.some(
      (comment) => comment.userId === currentUserId,
    );

    // For non-members: show limited preview
    const showLimitedPreview =
      !isMember && selectedCommunity?.communityId === post.communityId;
    const previewText =
      post.body.length > 150 ? post.body.substring(0, 150) + "..." : post.body;

    return (
      <div
        key={post.postId}
        className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow relative"
        style={{ borderColor: "#F0DCC9" }}
      >
        {/* Left Community Badge - Top Right Corner (for saved posts and my activity) */}
        {community &&
          !isMember &&
          (activeTab === "savedPosts" || activeTab === "discussions") && (
            <div className="absolute top-4 right-4 z-10">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm"
                style={{
                  backgroundColor: "#FEF3C7",
                  color: "#D97706",
                  border: "1px solid #FCD34D",
                }}
                title="You are no longer a member of this community. Rejoin to interact with this post."
              >
                <Info className="w-3 h-3" />
                Left Community
              </span>
            </div>
          )}
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              {renderAvatar(post.avatar, post.author, "w-10")}
              <div className="flex-1 min-w-0">
                <div
                  className="flex items-center gap-2 text-xs sm:text-sm flex-wrap"
                  style={{ color: "#64635E" }}
                >
                  <span className="font-medium" style={{ color: "#32332D" }}>
                    {post.author}
                  </span>
                  <span>•</span>
                  <span>{post.createdAt}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                  {userCreatedPost && (
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: "#FDF2E8",
                        color: "#F2742C",
                        border: "1px solid #F0DCC9",
                      }}
                    >
                      Created by you
                    </span>
                  )}
                  {activeTab === "discussions" &&
                    !userCreatedPost &&
                    userCommented && (
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: "#FDF2E8",
                          color: "#F2742C",
                          border: "1px solid #F0DCC9",
                        }}
                      >
                        You commented
                      </span>
                    )}
                  {isPostSaved(post.postId) && (
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                      style={{
                        backgroundColor: "#FDF2E8",
                        color: "#F2742C",
                        border: "1px solid #F0DCC9",
                      }}
                    >
                      <Bookmark className="w-3 h-3 fill-current" />
                      Saved
                    </span>
                  )}
                  {post.isPinned && (
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                      style={{
                        backgroundColor: "#FEF3C7",
                        color: "#D97706",
                        border: "1px solid #FCD34D",
                      }}
                    >
                      <Pin className="w-3 h-3 fill-current" />
                      Pinned
                    </span>
                  )}
                  {community && (
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: "#FDF2E8", color: "#F2742C" }}
                    >
                      {community.name}
                    </span>
                  )}
                  {post.taxonomyLabels
                    .filter((label) => !community || label !== community.name)
                    .map((label) => (
                      <span
                        key={`${post.postId}-${label}`}
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: "#F5F3F0", color: "#AA855B" }}
                      >
                        {label}
                      </span>
                    ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {post.isPinned && (
                <div title="Pinned post">
                  <Pin className="w-5 h-5" style={{ color: "#D97706" }} />
                </div>
              )}
              {isMember && (
                <div className="relative">
                  <button
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() =>
                      setOpenPostCardMenu(
                        openPostCardMenu === post.postId ? null : post.postId,
                      )
                    }
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  {renderPostCardMenu(post)}
                </div>
              )}
            </div>
          </div>

          <div>
            <h3
              className="text-lg sm:text-xl font-semibold mb-2"
              style={{ color: "#32332D" }}
            >
              {post.title}
            </h3>
            {showLimitedPreview ? (
              <>
                <p className="text-sm mb-3" style={{ color: "#64635E" }}>
                  {previewText}
                </p>
                <div
                  className="mt-4 p-4 rounded-lg border-2 border-dashed text-center"
                  style={{ borderColor: "#F0DCC9", backgroundColor: "#FDF2E8" }}
                >
                  <p
                    className="text-sm font-medium mb-3"
                    style={{ color: "#32332D" }}
                  >
                    Join this community to view the full post
                  </p>
                  <button
                    onClick={async () => {
                      if (selectedCommunity) {
                        try {
                          await joinCommunity(selectedCommunity.communityId);
                          toast.success("Joined community successfully");
                          // Refresh community data
                          const updated = await getCommunityById(
                            selectedCommunity.communityId,
                          );
                          const transformed = {
                            communityId: updated.community_id,
                            name: updated.name,
                            description: updated.description || "",
                            coverImageUrl: updated.cover_image_url || "",
                            status: updated.status,
                            memberCount: updated.member_count || 0,
                            postCount: updated.post_count || 0,
                            tags: (updated.tags || []).map((tag: any) => ({
                              taxonomyId: tag.taxonomy_id,
                              taxonomyType: tag.taxonomy_type,
                              label: tag.label,
                            })),
                            rules: updated.rules || [],
                            moderators: updated.moderators || [],
                            members: updated.members || [],
                            isJoined: updated.is_joined || false,
                            createdBy: updated.created_by,
                          };
                          setSelectedCommunity(transformed);
                          // Update communities array so posts reflect membership
                          setCommunities((prev) =>
                            prev.map((c) =>
                              c.communityId === selectedCommunity.communityId
                                ? transformed
                                : c,
                            ),
                          );
                          // Refresh posts to show full content
                          const posts = await getPosts({
                            community_id: selectedCommunity.communityId,
                          });
                          const transformedPosts = posts.map(transformPost);
                          setCommunityPosts(transformedPosts);
                        } catch (err: any) {
                          console.error("Error joining community:", err);
                          toast.error(
                            err.message || "Failed to join community",
                          );
                        }
                      }
                    }}
                    className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
                    style={{
                      backgroundColor: "#F2742C",
                      color: "#FFFFFF",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.9";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    Join Community
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm mb-3" style={{ color: "#64635E" }}>
                  {post.excerpt ?? post.body}
                </p>

                {/* Post Images Preview - Only show for members */}
                {post.attachments &&
                  post.attachments.length > 0 &&
                  (() => {
                    const attachments = post.attachments;
                    return (
                      <div className="mt-3 rounded-lg overflow-hidden">
                        {attachments.length === 1 ? (
                          <img
                            src={attachments[0].file_path}
                            alt={attachments[0].file_name || "Post image"}
                            className="w-full max-h-64 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              if (post.attachments) {
                                setLightboxImages(
                                  post.attachments.map((att) => ({
                                    file_path: att.file_path,
                                    file_name: att.file_name || `Post image`,
                                  })),
                                );
                                setLightboxCurrentIndex(0);
                                setIsLightboxOpen(true);
                              }
                            }}
                          />
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {attachments
                              .slice(0, 4)
                              .map((attachment, index) => (
                                <div
                                  key={attachment.attachment_id}
                                  className="relative"
                                >
                                  <img
                                    src={attachment.file_path}
                                    alt={
                                      attachment.file_name ||
                                      `Post image ${index + 1}`
                                    }
                                    className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => {
                                      if (post.attachments) {
                                        setLightboxImages(
                                          post.attachments.map((att) => ({
                                            file_path: att.file_path,
                                            file_name:
                                              att.file_name || `Post image`,
                                          })),
                                        );
                                        setLightboxCurrentIndex(index);
                                        setIsLightboxOpen(true);
                                      }
                                    }}
                                  />
                                  {index === 3 && attachments.length > 4 && (
                                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                                      <span className="text-white font-medium text-sm">
                                        +{attachments.length - 4} more
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </>
            )}
          </div>

          {/* Show View Post button for My Activity tab when user has left community */}
          {activeTab === "discussions" && !isMember && community && (
            <div className="flex justify-end mt-4">
              <button
                className="text-sm font-medium"
                style={{ color: "#F2742C" }}
                onClick={async () => {
                  // Navigate to post detail URL with source parameter
                  if (community) {
                    navigate(
                      `/communities/${community.communityId}?postId=${post.postId}&source=myActivity`,
                    );
                  } else {
                    // Fallback: try to find community or navigate with communityId
                    const postCommunity = communities.find(
                      (c) => c.communityId === post.communityId,
                    );
                    if (postCommunity) {
                      navigate(
                        `/communities/${postCommunity.communityId}?postId=${post.postId}&source=myActivity`,
                      );
                    } else {
                      // If community not found, try to load it first
                      try {
                        const allCommunities = await getCommunities();
                        const matchingCommunity = allCommunities.find(
                          (c: any) => c.community_id === post.communityId,
                        );
                        if (matchingCommunity) {
                          navigate(
                            `/communities/${matchingCommunity.community_id}?postId=${post.postId}&source=myActivity`,
                          );
                        } else {
                          // Last resort: set state directly
                          setPostDetailSource("myActivity");
                          try {
                            const fullPost = await getPost(post.postId);
                            const transformed = transformPost(fullPost);
                            setSelectedPost(transformed);
                          } catch (err) {
                            console.error("Error fetching post details:", err);
                            setSelectedPost(post);
                          }
                        }
                      } catch (err) {
                        console.error("Error loading community for post:", err);
                        // Fallback to state
                        setPostDetailSource("myActivity");
                        try {
                          const fullPost = await getPost(post.postId);
                          const transformed = transformPost(fullPost);
                          setSelectedPost(transformed);
                        } catch (postErr) {
                          console.error(
                            "Error fetching post details:",
                            postErr,
                          );
                          setSelectedPost(post);
                        }
                      }
                    }
                  }
                  setOpenPostCardMenu(null);
                }}
              >
                View Post
              </button>
            </div>
          )}

          {/* Hide likes/comments section for Saved Posts tab and non-members */}
          {activeTab !== "savedPosts" && isMember && (
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-4"
                style={{ color: "#64635E" }}
              >
                <button
                  className="flex items-center gap-1 transition-colors"
                  style={{ color: post.isLiked ? "#EF4444" : "#64635E" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#EF4444";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = post.isLiked
                      ? "#EF4444"
                      : "#64635E";
                  }}
                  onClick={() => handleLikePost(post)}
                >
                  <Heart
                    className={`w-4 h-4 ${post.isLiked ? "fill-current" : ""}`}
                  />
                  <span>{post.likes}</span>
                </button>
                <button
                  className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                  onClick={() => handleScrollToComments(post)}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>
                    {post.commentsCount !== undefined
                      ? post.commentsCount
                      : countAllComments(post.comments)}
                  </span>
                </button>
                <button
                  className="flex items-center gap-1 hover:text-green-600 transition-colors"
                  onClick={() => {
                    setShowSharePost(post);
                    setOpenPostCardMenu(null);
                  }}
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>
              <button
                className="text-sm font-medium"
                style={{ color: "#F2742C" }}
                onClick={async () => {
                  // Navigate to post detail URL with source parameter based on activeTab
                  const sourceParam =
                    activeTab === "discussions" ? "&source=myActivity" : "";
                  if (community) {
                    navigate(
                      `/communities/${community.communityId}?postId=${post.postId}${sourceParam}`,
                    );
                  } else {
                    // Fallback: try to find community or navigate with communityId
                    const postCommunity = communities.find(
                      (c) => c.communityId === post.communityId,
                    );
                    if (postCommunity) {
                      navigate(
                        `/communities/${postCommunity.communityId}?postId=${post.postId}${sourceParam}`,
                      );
                    } else {
                      // If community not found, try to load it first
                      try {
                        const allCommunities = await getCommunities();
                        const matchingCommunity = allCommunities.find(
                          (c: any) => c.community_id === post.communityId,
                        );
                        if (matchingCommunity) {
                          navigate(
                            `/communities/${matchingCommunity.community_id}?postId=${post.postId}${sourceParam}`,
                          );
                        } else {
                          // Last resort: set state directly
                          if (selectedCommunity) {
                            setPostDetailSource("community");
                          } else if (activeTab === "discussions") {
                            setPostDetailSource("myActivity");
                          } else {
                            setPostDetailSource("community");
                          }
                          try {
                            const fullPost = await getPost(post.postId);
                            const transformed = transformPost(fullPost);
                            setSelectedPost(transformed);
                          } catch (err) {
                            console.error("Error fetching post details:", err);
                            setSelectedPost(post);
                          }
                        }
                      } catch (err) {
                        console.error("Error loading community for post:", err);
                        // Fallback to state
                        if (selectedCommunity) {
                          setPostDetailSource("community");
                        } else if (activeTab === "discussions") {
                          setPostDetailSource("myActivity");
                        } else {
                          setPostDetailSource("community");
                        }
                        try {
                          const fullPost = await getPost(post.postId);
                          const transformed = transformPost(fullPost);
                          setSelectedPost(transformed);
                        } catch (postErr) {
                          console.error(
                            "Error fetching post details:",
                            postErr,
                          );
                          setSelectedPost(post);
                        }
                      }
                    }
                  }
                  setOpenPostCardMenu(null);
                }}
              >
                View Post
              </button>
            </div>
          )}
          {/* Show View Post button for Saved Posts tab */}
          {activeTab === "savedPosts" && (
            <div className="flex justify-end">
              <button
                className="text-sm font-medium"
                style={{ color: "#F2742C" }}
                onClick={async () => {
                  // Navigate to post detail URL with source parameter
                  const postCommunity = communities.find(
                    (c) => c.communityId === post.communityId,
                  );
                  if (postCommunity) {
                    navigate(
                      `/communities/${postCommunity.communityId}?postId=${post.postId}&source=savedPosts`,
                    );
                  } else {
                    // Fallback: try to load community first
                    try {
                      const allCommunities = await getCommunities();
                      const matchingCommunity = allCommunities.find(
                        (c: any) => c.community_id === post.communityId,
                      );
                      if (matchingCommunity) {
                        navigate(
                          `/communities/${matchingCommunity.community_id}?postId=${post.postId}&source=savedPosts`,
                        );
                      } else {
                        // Last resort: set state directly
                        setPostDetailSource("savedPosts");
                        const fullPost = await getPost(post.postId);
                        const transformed = transformPost(fullPost);
                        setSelectedPost(transformed);
                      }
                    } catch (err) {
                      console.error("Error loading community for post:", err);
                      // Fallback to state
                      setPostDetailSource("savedPosts");
                      try {
                        const fullPost = await getPost(post.postId);
                        const transformed = transformPost(fullPost);
                        setSelectedPost(transformed);
                      } catch (postErr) {
                        console.error("Error fetching post details:", postErr);
                        setSelectedPost(post);
                      }
                    }
                  }
                  setOpenPostCardMenu(null);
                }}
              >
                View Post
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper function to render Posts tab
  const renderPostsTab = (community: Community) => {
    const communityPostsForDetail = communityPosts.filter(
      (post) => post.communityId === community.communityId,
    );

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        const newFiles = Array.from(files);
        const validFiles = newFiles.filter((file) =>
          file.type.startsWith("image/"),
        );

        setNewPostImages((prev) => [...prev, ...validFiles]);

        // Create previews
        validFiles.forEach((file) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setNewPostImagePreviews((prev) => [
              ...prev,
              reader.result as string,
            ]);
          };
          reader.readAsDataURL(file);
        });
      }
    };

    const handleRemoveImage = (index: number) => {
      setNewPostImages((prev) => prev.filter((_, i) => i !== index));
      setNewPostImagePreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmitPost = async () => {
      if (!newPostTitle.trim() || !newPostContent.trim() || !community.isJoined)
        return;

      try {
        // Upload images first and get URLs with metadata
        const attachments: Array<{
          url: string;
          file_name: string;
          file_size?: number;
          mime_type?: string;
        }> = [];
        if (newPostImages.length > 0) {
          for (const file of newPostImages) {
            try {
              const uploadResult = await uploadPostImage(file);
              attachments.push({
                url: uploadResult.url,
                file_name: file.name,
                file_size: file.size,
                mime_type: file.type || undefined,
              });
            } catch (uploadErr: any) {
              console.error("Error uploading image:", uploadErr);
              toast.error(`Failed to upload image: ${uploadErr.message}`);
              return; // Stop if any image fails
            }
          }
        }

        await createPost({
          community_id: community.communityId,
          title: newPostTitle.trim(),
          body: newPostContent.trim(),
          attachments: attachments.length > 0 ? attachments : undefined,
        });

        toast.success("Post created successfully");

        // Reset form
        setNewPostTitle("");
        setNewPostContent("");
        setNewPostImages([]);
        setNewPostImagePreviews([]);

        // Refresh posts list
        const posts = await getPosts({ community_id: community.communityId });
        const transformed = posts.map(transformPost);
        setCommunityPosts(transformed);
      } catch (err: any) {
        console.error("Error creating post:", err);
        toast.error(err.message || "Failed to create post");
      }
    };

    return (
      <div className="space-y-6">
        {/* Create Post Section */}
        {community.isJoined && (
          <div
            className="bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-6 border"
            style={{ borderColor: "#F0DCC9" }}
          >
            <h3
              className="text-base sm:text-lg font-semibold mb-3 sm:mb-4"
              style={{ color: "#32332D" }}
            >
              Create a Post
            </h3>
            <div className="space-y-3 sm:space-y-4">
              {/* Title Field */}
              <input
                type="text"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Post title..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                style={{
                  ...getInputStyles(newPostTitle),
                  fontSize: "16px",
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                }}
                onMouseEnter={(e) =>
                  Object.assign(
                    (e.target as HTMLInputElement).style,
                    getInputHoverStyles(),
                  )
                }
                onMouseLeave={(e) =>
                  Object.assign(
                    (e.target as HTMLInputElement).style,
                    getInputBlurStyles(newPostTitle),
                  )
                }
                onFocus={(e) =>
                  Object.assign(
                    (e.target as HTMLInputElement).style,
                    getInputFocusStyles(),
                  )
                }
                onBlur={(e) =>
                  Object.assign(
                    (e.target as HTMLInputElement).style,
                    getInputBlurStyles(newPostTitle),
                  )
                }
              />

              {/* Content Textarea */}
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share something with the group..."
                className="w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent resize-none transition-all duration-200"
                style={{
                  ...getInputStyles(newPostContent),
                  fontSize: "14px",
                  fontFamily: "'Poppins', sans-serif",
                }}
                rows={3}
                onMouseEnter={(e) =>
                  Object.assign(
                    (e.target as HTMLTextAreaElement).style,
                    getInputHoverStyles(),
                  )
                }
                onMouseLeave={(e) =>
                  Object.assign(
                    (e.target as HTMLTextAreaElement).style,
                    getInputBlurStyles(newPostContent),
                  )
                }
                onFocus={(e) =>
                  Object.assign(
                    (e.target as HTMLTextAreaElement).style,
                    getInputFocusStyles(),
                  )
                }
                onBlur={(e) =>
                  Object.assign(
                    (e.target as HTMLTextAreaElement).style,
                    getInputBlurStyles(newPostContent),
                  )
                }
              />

              {/* Image Previews */}
              {newPostImagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newPostImagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border"
                        style={{ borderColor: "#F0DCC9" }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border flex items-center justify-center hover:bg-gray-100 transition-colors"
                        style={{ borderColor: "#F0DCC9" }}
                      >
                        <X className="w-4 h-4" style={{ color: "#32332D" }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="post-image-upload"
                  />
                  <label
                    htmlFor="post-image-upload"
                    className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
                    style={{ color: "#64635E" }}
                  >
                    <Image className="w-5 h-5" />
                  </label>
                </div>
                <button
                  onClick={handleSubmitPost}
                  disabled={!newPostTitle.trim() || !newPostContent.trim()}
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "#F2742C",
                    color: "#FFFFFF",
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
                  Post
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Posts List */}
        <div className="space-y-4">
          {communityPostsForDetail.length === 0 ? (
            !community.isJoined ? (
              // Non-member empty state
              <div
                className="p-8 text-center bg-white rounded-xl shadow-sm border"
                style={{ borderColor: "#F0DCC9" }}
              >
                <MessageCircle
                  className="w-10 h-10 mx-auto mb-4 opacity-30"
                  style={{ color: "#AA855B" }}
                />
                <p
                  className="text-lg font-semibold mb-2"
                  style={{ color: "#32332D" }}
                >
                  Join this community to view and create posts
                </p>
                <p className="text-sm mb-4" style={{ color: "#64635E" }}>
                  {community.postCount === 0
                    ? "This community doesn't have any posts yet."
                    : `This community has ${community.postCount} ${community.postCount === 1 ? "post" : "posts"}.`}
                </p>
                <button
                  onClick={async () => {
                    try {
                      await joinCommunity(community.communityId);
                      toast.success("Joined community successfully!");

                      // Refresh community data
                      const updated = await getCommunityById(
                        community.communityId,
                      );
                      const transformed = {
                        communityId: updated.community_id,
                        name: updated.name,
                        description: updated.description || "",
                        coverImageUrl: updated.cover_image_url || "",
                        status: updated.status,
                        memberCount: updated.member_count || 0,
                        postCount: updated.post_count || 0,
                        tags: (updated.tags || []).map((tag: any) => ({
                          taxonomyId: tag.taxonomy_id,
                          taxonomyType: tag.taxonomy_type,
                          label: tag.label,
                        })),
                        rules: updated.rules || [],
                        moderators: updated.moderators || [],
                        members: (updated.members || []).map(transformMember),
                        isJoined: updated.is_joined || false,
                        createdBy: updated.created_by,
                      };
                      setSelectedCommunity(transformed);

                      // Refresh posts
                      const posts = await getPosts({
                        community_id: community.communityId,
                      });
                      const transformedPosts = posts.map(transformPost);
                      setCommunityPosts(transformedPosts);

                      // Refresh communities list
                      await fetchCommunities();
                    } catch (err: any) {
                      console.error("Error joining community:", err);
                      toast.error(err.message || "Failed to join community");
                    }
                  }}
                  className="px-6 py-2 rounded-lg font-medium transition-all duration-200"
                  style={{
                    backgroundColor: "#F2742C",
                    color: "#FFFFFF",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  Join Community
                </button>
              </div>
            ) : (
              // Member empty state
              <div
                className="p-6 border rounded-xl text-sm text-center"
                style={{ borderColor: "#F0DCC9", color: "#64635E" }}
              >
                No posts yet. Be the first to start a conversation!
              </div>
            )
          ) : (
            communityPostsForDetail.map((post) => renderDiscussionCard(post))
          )}
        </div>
      </div>
    );
  };

  // Helper function to render Members tab
  const renderMembersTab = (community: Community) => {
    // Explicitly check if user is a member - don't show member list to non-members
    const isMember = community.isJoined === true;
    const filteredMembers = isMember
      ? community.members.filter((member) =>
          member.name.toLowerCase().includes(memberSearchTerm.toLowerCase()),
        )
      : [];

    return (
      <div
        className="bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-6 border"
        style={{ borderColor: "#F0DCC9" }}
      >
        <div className="mb-3 sm:mb-4">
          <h3
            className="text-base sm:text-lg font-semibold mb-2 sm:mb-3"
            style={{ color: "#32332D" }}
          >
            Members ({community.memberCount.toLocaleString()})
          </h3>
          {isMember && (
            <div className="relative">
              <Search
                className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5"
                style={{ color: "#AA855B" }}
              />
              <input
                type="text"
                placeholder="Search members..."
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
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
          )}
        </div>

        {!isMember ? (
          <div className="p-4 text-center">
            <Users
              className="w-10 h-10 mx-auto mb-4 opacity-30"
              style={{ color: "#AA855B" }}
            />
            <p
              className="text-lg font-semibold mb-2"
              style={{ color: "#32332D" }}
            >
              Join this community to see all members
            </p>
            <p className="text-sm mb-4" style={{ color: "#64635E" }}>
              This community has {community.memberCount.toLocaleString()}{" "}
              {community.memberCount === 1 ? "member" : "members"}
            </p>
            <button
              onClick={async () => {
                try {
                  await joinCommunity(community.communityId);
                  toast.success("Joined community successfully");
                  // Refresh community data
                  const updated = await getCommunityById(community.communityId);
                  const transformed = {
                    communityId: updated.community_id,
                    name: updated.name,
                    description: updated.description || "",
                    coverImageUrl: updated.cover_image_url || "",
                    status: updated.status,
                    memberCount: updated.member_count || 0,
                    postCount: updated.post_count || 0,
                    tags: (updated.tags || []).map((tag: any) => ({
                      taxonomyId: tag.taxonomy_id,
                      taxonomyType: tag.taxonomy_type,
                      label: tag.label,
                    })),
                    rules: updated.rules || [],
                    moderators: updated.moderators || [],
                    members: updated.members || [],
                    isJoined: updated.is_joined || false,
                    createdBy: updated.created_by,
                  };
                  setSelectedCommunity(transformed);
                  // Update communities array so posts reflect membership
                  setCommunities((prev) =>
                    prev.map((c) =>
                      c.communityId === community.communityId ? transformed : c,
                    ),
                  );
                  // Refresh posts to show full content
                  const posts = await getPosts({
                    community_id: community.communityId,
                  });
                  const transformedPosts = posts.map(transformPost);
                  setCommunityPosts(transformedPosts);
                } catch (err: any) {
                  console.error("Error joining community:", err);
                  toast.error(err.message || "Failed to join community");
                }
              }}
              className="px-6 py-2 rounded-lg font-medium transition-all duration-200"
              style={{
                backgroundColor: "#F2742C",
                color: "#FFFFFF",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              Join Community
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.length === 0 ? (
              <div
                className="col-span-full p-6 text-center text-sm"
                style={{ color: "#64635E" }}
              >
                No members found matching your search.
              </div>
            ) : (
              filteredMembers.map((member) => (
                <div
                  key={member.memberId}
                  className="flex items-center space-x-3 p-4 border rounded-lg"
                  style={{ borderColor: "#F0DCC9" }}
                >
                  {renderAvatar(member.avatar, member.name, "w-12")}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <h4 className="font-medium" style={{ color: "#32332D" }}>
                        {member.name}
                      </h4>
                      {member.role === "owner" && (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: "#FDF2E8",
                            color: "#F2742C",
                            border: "1px solid #F0DCC9",
                          }}
                        >
                          Owner
                        </span>
                      )}
                      {member.role === "moderator" && (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: "#FDF2E8",
                            color: "#F2742C",
                            border: "1px solid #F0DCC9",
                          }}
                        >
                          Moderator
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm" style={{ color: "#64635E" }}>
                        Joined {member.joinedAt}
                      </p>
                      {member.lastActivityAt && (
                        <p className="text-xs" style={{ color: "#AA855B" }}>
                          {formatActivityDisplay(member.lastActivityAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper function to render About tab
  const renderAboutTab = (community: Community) => {
    return (
      <div
        className="bg-white rounded-xl shadow-sm p-6 border"
        style={{ borderColor: "#F0DCC9" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: "#32332D" }}>
            About This Group
          </h3>
          {canEditCommunity(community) && (
            <button
              onClick={() => handleOpenEditModal(community)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: "#FDF2E8",
                color: "#AA855B",
                border: "1px solid #F0DCC9",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F5F3F0";
                e.currentTarget.style.borderColor = "#AA855B";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#FDF2E8";
                e.currentTarget.style.borderColor = "#F0DCC9";
              }}
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
        <div className="space-y-6">
          {/* Description */}
          <div>
            <h4 className="font-medium mb-2" style={{ color: "#32332D" }}>
              Description
            </h4>
            <p style={{ color: "#64635E" }}>{community.description}</p>
          </div>

          {/* Tags & Categories */}
          {community.tags && community.tags.length > 0 && (
            <div>
              <h4 className="font-medium mb-3" style={{ color: "#32332D" }}>
                Tags & Categories
              </h4>
              <div className="space-y-3">
                {/* Topics */}
                {community.tags.filter((t) => t.taxonomyType === "topic")
                  .length > 0 && (
                  <div>
                    <p
                      className="text-sm font-medium mb-2"
                      style={{ color: "#AA855B" }}
                    >
                      Topics
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {community.tags
                        .filter((t) => t.taxonomyType === "topic")
                        .map((tag) => (
                          <span
                            key={`${community.communityId}-${tag.taxonomyId}`}
                            className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: "#F5F5F5",
                              color: "#AA855B",
                              border: "1px solid #D4C4A8",
                            }}
                          >
                            {tag.label}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {/* Age Groups */}
                {community.tags.filter((t) => t.taxonomyType === "age_group")
                  .length > 0 && (
                  <div>
                    <p
                      className="text-sm font-medium mb-2"
                      style={{ color: "#AA855B" }}
                    >
                      Age Groups
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {community.tags
                        .filter((t) => t.taxonomyType === "age_group")
                        .map((tag) => (
                          <span
                            key={`${community.communityId}-${tag.taxonomyId}`}
                            className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: "#F5F5F5",
                              color: "#AA855B",
                              border: "1px solid #D4C4A8",
                            }}
                          >
                            {tag.label}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {/* Developmental Stages */}
                {community.tags.filter((t) => t.taxonomyType === "stage")
                  .length > 0 && (
                  <div>
                    <p
                      className="text-sm font-medium mb-2"
                      style={{ color: "#AA855B" }}
                    >
                      Developmental Stages
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {community.tags
                        .filter((t) => t.taxonomyType === "stage")
                        .map((tag) => (
                          <span
                            key={`${community.communityId}-${tag.taxonomyId}`}
                            className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: "#F5F5F5",
                              color: "#AA855B",
                              border: "1px solid #D4C4A8",
                            }}
                          >
                            {tag.label}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Group Rules */}
          <div>
            <h4 className="font-medium mb-2" style={{ color: "#32332D" }}>
              Group Rules
            </h4>
            <ul className="space-y-2 text-sm" style={{ color: "#64635E" }}>
              {community.rules.map((rule, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span
                    className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: "#AA855B" }}
                  />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Moderators */}
          <div>
            <h4 className="font-medium mb-2" style={{ color: "#32332D" }}>
              Moderators
            </h4>
            <div className="flex flex-wrap gap-2">
              {community.moderators.map((moderator) => (
                <span
                  key={moderator}
                  className="flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: "#FDF2E8",
                    color: "#AA855B",
                    border: "1px solid #F0DCC9",
                  }}
                >
                  <Crown className="w-3 h-3" />
                  <span>{moderator}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div
              className="text-center p-4 rounded-lg"
              style={{ backgroundColor: "#FAEFE2" }}
            >
              <p className="text-2xl font-bold" style={{ color: "#32332D" }}>
                {community.memberCount.toLocaleString()}
              </p>
              <p className="text-sm" style={{ color: "#AA855B" }}>
                Members
              </p>
            </div>
            <div
              className="text-center p-4 rounded-lg"
              style={{ backgroundColor: "#FAEFE2" }}
            >
              <p className="text-2xl font-bold" style={{ color: "#32332D" }}>
                {community.postCount}
              </p>
              <p className="text-sm" style={{ color: "#AA855B" }}>
                Posts
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCommunityDetail = () => {
    if (!selectedCommunity) {
      return null;
    }

    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-3 sm:pt-4 pb-4 sm:pb-6 md:pb-8">
        {/* Back Button - Only show for authenticated users */}
        {isAuthenticated && (
          <button
            className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 md:mb-6 text-xs sm:text-sm font-medium transition-colors"
            style={{ color: "#F2742C" }}
            onClick={() => {
              // Simply clear state and navigate - no URL persistence
              setSelectedCommunity(null);
              setSelectedPost(null);
              setPostDetailSource(null);
              setCommunityDetailTab("posts");
              setOpenCommunityCardMenu(null);
              setOpenPostCardMenu(null);
              navigate("/community");
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#E55A1F";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#F2742C";
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Back to
            Communities
          </button>
        )}

        {/* Community Header */}
        <div
          className="bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-6 border mb-3 sm:mb-4 md:mb-6 relative"
          style={{ borderColor: "#F0DCC9" }}
        >
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
            <div className="flex items-start space-x-2 sm:space-x-3 md:space-x-4 w-full sm:w-auto">
              <img
                src={selectedCommunity.coverImageUrl}
                alt={selectedCommunity.name}
                className="w-16 h-16 sm:w-20 sm:h-20 md:w-36 md:h-36 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 flex-wrap">
                  <h1
                    className="text-lg sm:text-xl md:text-2xl font-bold"
                    style={{ color: "#32332D" }}
                  >
                    {selectedCommunity.name}
                  </h1>
                  {selectedCommunity.createdBy === currentUserId && (
                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
                      style={{
                        backgroundColor: "#FDF2E8",
                        color: "#F2742C",
                        border: "1px solid #F0DCC9",
                      }}
                    >
                      Created by you
                    </span>
                  )}
                </div>
                <p
                  className="text-xs sm:text-sm mb-1.5 sm:mb-2"
                  style={{ color: "#64635E" }}
                >
                  {selectedCommunity.description}
                </p>
                {/* Tags - Compact view */}
                {selectedCommunity.tags &&
                  selectedCommunity.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                      {selectedCommunity.tags.map((tag) => (
                        <span
                          key={`${selectedCommunity.communityId}-${tag.taxonomyId}`}
                          className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium"
                          style={{
                            backgroundColor: "#F5F5F5",
                            color: "#AA855B",
                            border: "1px solid #D4C4A8",
                          }}
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  )}
                <div
                  className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm"
                  style={{ color: "#64635E" }}
                >
                  <span>
                    {selectedCommunity.memberCount.toLocaleString()} members
                  </span>
                  <span>•</span>
                  <span>{selectedCommunity.postCount} posts</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 relative flex-shrink-0 w-full sm:w-auto sm:ml-4 justify-end sm:justify-start">
              {selectedCommunity.createdBy === currentUserId ? (
                // Owner: Show disabled button with tooltip
                <button
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-200 cursor-not-allowed whitespace-nowrap"
                  style={{
                    backgroundColor: "#AA855B",
                    color: "#FFFFFF",
                    opacity: 0.7,
                  }}
                  title="As the owner, you cannot leave this community. Delete it instead if you no longer want it."
                  disabled
                >
                  Joined
                </button>
              ) : selectedCommunity.isJoined ? (
                // Member: Show leave button with confirmation
                <button
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
                  style={{
                    backgroundColor: "#AA855B",
                    color: "#FFFFFF",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.9";
                  }}
                  onClick={() => {
                    setShowLeaveConfirmModal(selectedCommunity);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  Joined
                </button>
              ) : (
                // Not joined: Show join button
                <button
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
                  style={{
                    backgroundColor: "#F2742C",
                    color: "#FFFFFF",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.9";
                  }}
                  onClick={async () => {
                    try {
                      await joinCommunity(selectedCommunity.communityId);
                      toast.success("Joined community successfully");
                      // Refresh community data
                      const updated = await getCommunityById(
                        selectedCommunity.communityId,
                      );
                      const transformed = {
                        communityId: updated.community_id,
                        name: updated.name,
                        description: updated.description || "",
                        coverImageUrl: updated.cover_image_url || "",
                        status: updated.status,
                        memberCount: updated.member_count || 0,
                        postCount: updated.post_count || 0,
                        tags: (updated.tags || []).map((tag: any) => ({
                          taxonomyId: tag.taxonomy_id,
                          taxonomyType: tag.taxonomy_type,
                          label: tag.label,
                        })),
                        rules: updated.rules || [],
                        moderators: updated.moderators || [],
                        members: updated.members || [],
                        isJoined: updated.is_joined || false,
                        createdBy: updated.created_by,
                      };
                      setSelectedCommunity(transformed);
                      // Update communities array so posts reflect membership
                      setCommunities((prev) =>
                        prev.map((c) =>
                          c.communityId === selectedCommunity.communityId
                            ? transformed
                            : c,
                        ),
                      );
                      // Refresh posts to show full content
                      const posts = await getPosts({
                        community_id: selectedCommunity.communityId,
                      });
                      const transformedPosts = posts.map(transformPost);
                      setCommunityPosts(transformedPosts);
                    } catch (err: any) {
                      console.error("Error joining community:", err);
                      toast.error(err.message || "Failed to join community");
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  Join Community
                </button>
              )}
              <div className="relative">
                <button
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg"
                  style={{ color: "#64635E" }}
                  onClick={() => setShowCommunityMenu(!showCommunityMenu)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#F5F3F0";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {showCommunityMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowCommunityMenu(false)}
                    />
                    <div
                      className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-20"
                      style={{ borderColor: "#F0DCC9" }}
                    >
                      <div className="py-1">
                        {/* General Actions - Share (most common, non-destructive) */}
                        <button
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                          style={{ color: "#32332D" }}
                          onClick={() => {
                            setShowShareCommunity(selectedCommunity);
                            setShowCommunityMenu(false);
                          }}
                        >
                          <Share2
                            className="w-4 h-4 inline mr-2"
                            style={{ color: "#AA855B" }}
                          />
                          Share Community
                        </button>
                        {/* Owner/Moderator Actions */}
                        {canEditCommunity(selectedCommunity) && (
                          <>
                            <div
                              className="border-t my-1"
                              style={{ borderColor: "#F0DCC9" }}
                            />
                            <button
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                              style={{ color: "#32332D" }}
                              onClick={() =>
                                handleOpenEditModal(selectedCommunity)
                              }
                            >
                              <Edit3
                                className="w-4 h-4 inline mr-2"
                                style={{ color: "#AA855B" }}
                              />
                              Edit Community
                            </button>
                            {canDeleteCommunity(selectedCommunity) && (
                              <>
                                <div
                                  className="border-t my-1"
                                  style={{ borderColor: "#F0DCC9" }}
                                />
                                <button
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                                  style={{ color: "#EF4444" }}
                                  onClick={() => {
                                    setCommunityToDelete(selectedCommunity);
                                    setShowDeleteConfirmModal(true);
                                    setShowCommunityMenu(false);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 inline mr-2" />
                                  Delete Community
                                </button>
                              </>
                            )}
                          </>
                        )}
                        {/* Member Actions */}
                        {selectedCommunity.isJoined &&
                          !canEditCommunity(selectedCommunity) && (
                            <>
                              <div
                                className="border-t my-1"
                                style={{ borderColor: "#F0DCC9" }}
                              />
                              <button
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                                style={{ color: "#32332D" }}
                                onClick={() => {
                                  setShowLeaveConfirmModal(selectedCommunity);
                                  setShowCommunityMenu(false);
                                }}
                              >
                                <X
                                  className="w-4 h-4 inline mr-2"
                                  style={{ color: "#AA855B" }}
                                />
                                Leave Community
                              </button>
                            </>
                          )}
                        {selectedCommunity.createdBy !== currentUserId && (
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                            style={{ color: "#32332D" }}
                            onClick={() => {
                              setShowReportCommunityModal(selectedCommunity);
                              setShowCommunityMenu(false);
                            }}
                          >
                            <Flag
                              className="w-4 h-4 inline mr-2"
                              style={{ color: "#AA855B" }}
                            />
                            Report Community
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-3 sm:mb-4 md:mb-6">
          <div
            className="flex space-x-1 p-1.5 sm:p-2 rounded-lg w-fit"
            style={{ backgroundColor: "#FCF9F8" }}
          >
            {[
              { id: "posts", label: "Posts", icon: MessageCircle },
              { id: "members", label: "Members", icon: Users },
              { id: "about", label: "About", icon: Info },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = communityDetailTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() =>
                    setCommunityDetailTab(
                      tab.id as "posts" | "members" | "about",
                    )
                  }
                  className={`flex items-center space-x-1 sm:space-x-2 py-1.5 sm:py-2 px-2 sm:px-3 md:px-4 rounded-md text-[10px] sm:text-xs md:text-sm font-medium transition-all duration-200 ${
                    isActive ? "shadow-sm" : "opacity-70 hover:opacity-100"
                  }`}
                  style={{
                    backgroundColor: isActive ? "#32332D" : "transparent",
                    color: isActive ? "#FFFFFF" : "#32332D",
                  }}
                >
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        {communityDetailTab === "posts" && renderPostsTab(selectedCommunity)}
        {communityDetailTab === "members" &&
          renderMembersTab(selectedCommunity)}
        {communityDetailTab === "about" && renderAboutTab(selectedCommunity)}
      </div>
    );
  };

  const renderPostDetailMenu = () => {
    if (!selectedPost || !openPostDetailMenu) return null;

    const isOwnPost = selectedPost.authorId === currentUserId;
    const isSaved = isPostSaved(selectedPost.postId);

    // Check if user can pin/unpin (owner or moderator of the community)
    const community =
      communities.find(
        (item) => item.communityId === selectedPost.communityId,
      ) ||
      (selectedCommunity?.communityId === selectedPost.communityId
        ? selectedCommunity
        : null);
    const canPinPost = community
      ? isCommunityOwner(community) || isCommunityModerator(community)
      : false;

    return (
      <>
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpenPostDetailMenu(false)}
        />
        <div
          className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-20"
          style={{ borderColor: "#F0DCC9" }}
          data-post-detail-menu
        >
          <div className="py-1">
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
              style={{ color: "#32332D" }}
              onClick={() => {
                handleSavePost(selectedPost);
                setOpenPostDetailMenu(false);
              }}
            >
              <Bookmark
                className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`}
                style={{ color: "#AA855B" }}
              />
              {isSaved ? "Unsave Post" : "Save Post"}
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
              style={{ color: "#32332D" }}
              onClick={() => {
                setShowSharePost(selectedPost);
                setOpenPostDetailMenu(false);
              }}
            >
              <Share2 className="w-4 h-4" style={{ color: "#AA855B" }} />
              Share Post
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
              style={{ color: "#32332D" }}
              onClick={() => {
                handleReportPost(selectedPost);
                setOpenPostDetailMenu(false);
              }}
            >
              <Flag className="w-4 h-4" style={{ color: "#AA855B" }} />
              Report Post
            </button>
            {canPinPost && (
              <>
                <div
                  className="border-t my-1"
                  style={{ borderColor: "#F0DCC9" }}
                />
                {selectedPost.isPinned ? (
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                    style={{ color: "#32332D" }}
                    onClick={() => {
                      handleUnpinPost(selectedPost);
                      setOpenPostDetailMenu(false);
                    }}
                  >
                    <Pin className="w-4 h-4" style={{ color: "#AA855B" }} />
                    Unpin Post
                  </button>
                ) : (
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                    style={{ color: "#32332D" }}
                    onClick={() => {
                      handlePinPost(selectedPost);
                      setOpenPostDetailMenu(false);
                    }}
                  >
                    <Pin className="w-4 h-4" style={{ color: "#AA855B" }} />
                    Pin Post
                  </button>
                )}
              </>
            )}
            {isOwnPost && (
              <>
                <div
                  className="border-t my-1"
                  style={{ borderColor: "#F0DCC9" }}
                />
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                  style={{ color: "#32332D" }}
                  onClick={() => {
                    handleEditPost(selectedPost);
                    setOpenPostDetailMenu(false);
                  }}
                >
                  <Edit3 className="w-4 h-4" style={{ color: "#AA855B" }} />
                  Edit Post
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                  style={{ color: "#EF4444" }}
                  onClick={() => {
                    setShowDeletePostModal(selectedPost);
                    setOpenPostDetailMenu(false);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Post
                </button>
              </>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderPostDetail = () => {
    if (!selectedPost) {
      return null;
    }
    const community =
      communities.find(
        (item) => item.communityId === selectedPost.communityId,
      ) ||
      (selectedCommunity?.communityId === selectedPost.communityId
        ? selectedCommunity
        : null);
    const isMember = community?.isJoined || false;
    const hasLeftCommunity =
      community &&
      !isMember &&
      (postDetailSource === "savedPosts" || postDetailSource === "myActivity");

    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-3 sm:pt-4 pb-4 sm:pb-6 md:pb-8">
        {/* Back Button - Only show for authenticated users */}
        {isAuthenticated && (
          <button
            className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 md:mb-6 text-xs sm:text-sm font-medium transition-colors"
            style={{ color: "#F2742C" }}
            onClick={() => {
              // Navigate back based on source - check postDetailSource first
              if (postDetailSource === "myActivity") {
                // Navigate back to My Activity tab
                setSelectedPost(null);
                setOpenPostDetailMenu(false);
                setPostDetailSource(null);
                navigate("/community", { state: { tab: "discussions" } });
              } else if (postDetailSource === "savedPosts") {
                // Navigate back to Saved Posts tab
                setSelectedPost(null);
                setOpenPostDetailMenu(false);
                setPostDetailSource(null);
                navigate("/community", { state: { tab: "savedPosts" } });
              } else if (
                postDetailSource === "community" &&
                selectedCommunity
              ) {
                // Navigate back to community detail (without postId)
                navigate(`/communities/${selectedCommunity.communityId}`);
              } else {
                // Default: navigate back to community list
                setSelectedPost(null);
                setOpenPostDetailMenu(false);
                setPostDetailSource(null);
                navigate("/community");
              }
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#E55A1F";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#F2742C";
            }}
          >
            <ArrowLeft className="w-4 h-4" />{" "}
            {postDetailSource === "myActivity"
              ? "Back to My Activity"
              : postDetailSource === "savedPosts"
                ? "Back to Saved Posts"
                : postDetailSource === "community" && selectedCommunity
                  ? `Back to ${selectedCommunity.name}`
                  : "Back to Posts"}
          </button>
        )}

        <div
          className="bg-white rounded-2xl shadow-sm border relative"
          style={{ borderColor: "#F0DCC9" }}
        >
          {/* Banner for users who left the community */}
          {hasLeftCommunity && (
            <div
              className="p-4 rounded-t-2xl border-b"
              style={{ backgroundColor: "#FEF3C7", borderColor: "#FCD34D" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5" style={{ color: "#D97706" }} />
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "#D97706" }}
                    >
                      You've left this community. Rejoin to interact with this
                      post.
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#92400E" }}>
                      {postDetailSource === "savedPosts"
                        ? "You can view this saved post, but you'll need to rejoin to like or comment."
                        : "You can view this post, but you'll need to rejoin to like or comment."}
                    </p>
                  </div>
                </div>
                {community && (
                  <button
                    onClick={async () => {
                      try {
                        await joinCommunity(community.communityId);
                        toast.success("Joined community successfully");
                        // Refresh community data
                        const updated = await getCommunityById(
                          community.communityId,
                        );
                        const transformed = {
                          communityId: updated.community_id,
                          name: updated.name,
                          description: updated.description || "",
                          coverImageUrl: updated.cover_image_url || "",
                          status: updated.status,
                          memberCount: updated.member_count || 0,
                          postCount: updated.post_count || 0,
                          tags: (updated.tags || []).map((tag: any) => ({
                            taxonomyId: tag.taxonomy_id,
                            taxonomyType: tag.taxonomy_type,
                            label: tag.label,
                          })),
                          rules: updated.rules || [],
                          moderators: updated.moderators || [],
                          members: updated.members || [],
                          isJoined: updated.is_joined || false,
                          createdBy: updated.created_by,
                        };
                        setSelectedCommunity(transformed);
                        // Update communities list
                        setCommunities((prev) =>
                          prev.map((c) =>
                            c.communityId === community.communityId
                              ? transformed
                              : c,
                          ),
                        );
                        // Refresh post to get updated membership status
                        const updatedPost = await getPost(selectedPost.postId);
                        const transformedPost = transformPost(updatedPost);
                        setSelectedPost(transformedPost);
                        // Refresh posts list
                        const posts = await getPosts({
                          community_id: community.communityId,
                        });
                        const transformedPosts = posts.map(transformPost);
                        setCommunityPosts(transformedPosts);
                      } catch (err: any) {
                        console.error("Error joining community:", err);
                        toast.error(err.message || "Failed to join community");
                      }
                    }}
                    className="px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap"
                    style={{
                      backgroundColor: "#F2742C",
                      color: "#FFFFFF",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.9";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    Rejoin Community
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                {renderAvatar(selectedPost.avatar, selectedPost.author, "w-12")}
                <div className="flex-1 min-w-0">
                  <div
                    className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm flex-wrap"
                    style={{ color: "#64635E" }}
                  >
                    <span className="font-medium" style={{ color: "#32332D" }}>
                      {selectedPost.author}
                    </span>
                    <span>•</span>
                    <span>{selectedPost.createdAt}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:gap-2 mt-1.5 sm:mt-2">
                    {selectedPost.authorId === currentUserId && (
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: "#FDF2E8",
                          color: "#F2742C",
                          border: "1px solid #F0DCC9",
                        }}
                      >
                        Created by you
                      </span>
                    )}
                    {isPostSaved(selectedPost.postId) && (
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                        style={{
                          backgroundColor: "#FDF2E8",
                          color: "#F2742C",
                          border: "1px solid #F0DCC9",
                        }}
                      >
                        <Bookmark className="w-3 h-3 fill-current" />
                        Saved
                      </span>
                    )}
                    {selectedPost.isPinned && (
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                        style={{
                          backgroundColor: "#FEF3C7",
                          color: "#D97706",
                          border: "1px solid #FCD34D",
                        }}
                      >
                        <Pin className="w-3 h-3 fill-current" />
                        Pinned
                      </span>
                    )}
                    {community && (
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: "#FDF2E8", color: "#F2742C" }}
                      >
                        {community.name}
                      </span>
                    )}
                    {selectedPost.taxonomyLabels
                      .filter((label) => !community || label !== community.name)
                      .map((label) => (
                        <span
                          key={`${selectedPost.postId}-${label}`}
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: "#F5F3F0",
                            color: "#AA855B",
                          }}
                        >
                          {label}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedPost.isPinned && (
                  <div title="Pinned post">
                    <Pin
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      style={{ color: "#D97706" }}
                    />
                  </div>
                )}
                <div className="relative">
                  <button
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setOpenPostDetailMenu(!openPostDetailMenu)}
                  >
                    <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  {renderPostDetailMenu()}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h1
                className="text-xl sm:text-2xl font-semibold"
                style={{ color: "#32332D" }}
              >
                {selectedPost.title}
              </h1>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#64635E" }}
              >
                {selectedPost.body}
              </p>

              {/* Post Images */}
              {selectedPost.attachments &&
                selectedPost.attachments.length > 0 &&
                (() => {
                  const attachments = selectedPost.attachments;
                  return (
                    <div className="mt-4 space-y-2">
                      {attachments.length === 1 ? (
                        // Single image - display larger
                        <div className="rounded-lg overflow-hidden">
                          <img
                            src={attachments[0].file_path}
                            alt={attachments[0].file_name || "Post image"}
                            className="w-full max-h-96 object-cover"
                          />
                        </div>
                      ) : (
                        // Multiple images - grid layout
                        <div
                          className={`grid gap-2 ${
                            attachments.length === 2
                              ? "grid-cols-2"
                              : attachments.length === 3
                                ? "grid-cols-2"
                                : "grid-cols-2"
                          }`}
                        >
                          {attachments.map((attachment, index) => (
                            <div
                              key={attachment.attachment_id}
                              className={`rounded-lg overflow-hidden ${
                                attachments.length === 3 && index === 0
                                  ? "row-span-2"
                                  : ""
                              }`}
                            >
                              <img
                                src={attachment.file_path}
                                alt={
                                  attachment.file_name ||
                                  `Post image ${index + 1}`
                                }
                                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                style={{
                                  maxHeight:
                                    attachments.length === 3 && index === 0
                                      ? "400px"
                                      : "200px",
                                }}
                                onClick={() => {
                                  if (selectedPost?.attachments) {
                                    setLightboxImages(
                                      selectedPost.attachments.map((att) => ({
                                        file_path: att.file_path,
                                        file_name:
                                          att.file_name || `Post image`,
                                      })),
                                    );
                                    setLightboxCurrentIndex(index);
                                    setIsLightboxOpen(true);
                                  }
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
            </div>

            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-4"
                style={{ color: "#64635E" }}
              >
                {hasLeftCommunity ? (
                  <>
                    <button
                      className="flex items-center gap-1 transition-colors cursor-not-allowed opacity-50"
                      style={{ color: "#64635E" }}
                      disabled
                      title="Rejoin the community to like this post"
                    >
                      <Heart className="w-4 h-4" />
                      <span>{selectedPost.likes}</span>
                    </button>
                    <button
                      className="flex items-center gap-1 transition-colors cursor-not-allowed opacity-50"
                      style={{ color: "#64635E" }}
                      disabled
                      title="Rejoin the community to view comments"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>
                        {selectedPost.commentsCount !== undefined
                          ? selectedPost.commentsCount
                          : countAllComments(selectedPost.comments)}
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="flex items-center gap-1 transition-colors"
                      style={{
                        color: selectedPost.isLiked ? "#EF4444" : "#64635E",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#EF4444";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = selectedPost.isLiked
                          ? "#EF4444"
                          : "#64635E";
                      }}
                      onClick={() => handleLikePost(selectedPost)}
                    >
                      <Heart
                        className={`w-4 h-4 ${selectedPost.isLiked ? "fill-current" : ""}`}
                      />
                      <span>{selectedPost.likes}</span>
                    </button>
                    <button
                      className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                      onClick={() => handleScrollToComments(selectedPost)}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>
                        {selectedPost.commentsCount !== undefined
                          ? selectedPost.commentsCount
                          : countAllComments(selectedPost.comments)}
                      </span>
                    </button>
                  </>
                )}
                <button
                  className="flex items-center gap-1 hover:text-green-600 transition-colors"
                  onClick={() => setShowSharePost(selectedPost)}
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
              </div>
            </div>
          </div>
          <div
            id="comments-section"
            className="border-t"
            style={{ borderColor: "#F0DCC9" }}
          >
            <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-5">
              <h2
                className="text-base sm:text-lg font-semibold"
                style={{ color: "#32332D" }}
              >
                Comments (
                {selectedPost.commentsCount !== undefined
                  ? selectedPost.commentsCount
                  : countAllComments(selectedPost.comments)}
                )
              </h2>
              {(() => {
                const postCommunity =
                  communities.find(
                    (c) => c.communityId === selectedPost.communityId,
                  ) ||
                  (selectedCommunity?.communityId === selectedPost.communityId
                    ? selectedCommunity
                    : null);
                const isMember = postCommunity?.isJoined || false;
                const hasLeftCommunity =
                  postCommunity &&
                  !isMember &&
                  (postDetailSource === "savedPosts" ||
                    postDetailSource === "myActivity");

                if (!isMember) {
                  return (
                    <div
                      className={`p-4 rounded-lg text-center ${hasLeftCommunity ? "border-2" : "border-2 border-dashed"}`}
                      style={{
                        borderColor: hasLeftCommunity ? "#FCD34D" : "#F0DCC9",
                        backgroundColor: hasLeftCommunity
                          ? "#FEF3C7"
                          : "#FDF2E8",
                      }}
                    >
                      <p
                        className={`text-sm font-medium mb-2`}
                        style={{
                          color: hasLeftCommunity ? "#D97706" : "#32332D",
                        }}
                      >
                        {hasLeftCommunity
                          ? "You've left this community. Rejoin to comment."
                          : "Join this community to comment"}
                      </p>
                      {hasLeftCommunity && (
                        <p
                          className="text-xs mb-3"
                          style={{ color: "#92400E" }}
                        >
                          {postDetailSource === "savedPosts"
                            ? "You can view this saved post, but you'll need to rejoin to interact."
                            : "You can view this post, but you'll need to rejoin to interact."}
                        </p>
                      )}
                      <button
                        onClick={async () => {
                          if (postCommunity) {
                            try {
                              await joinCommunity(postCommunity.communityId);
                              toast.success("Joined community successfully");
                              // Refresh community data
                              const updated = await getCommunityById(
                                postCommunity.communityId,
                              );
                              const transformed = {
                                communityId: updated.community_id,
                                name: updated.name,
                                description: updated.description || "",
                                coverImageUrl: updated.cover_image_url || "",
                                status: updated.status,
                                memberCount: updated.member_count || 0,
                                postCount: updated.post_count || 0,
                                tags: (updated.tags || []).map((tag: any) => ({
                                  taxonomyId: tag.taxonomy_id,
                                  taxonomyType: tag.taxonomy_type,
                                  label: tag.label,
                                })),
                                rules: updated.rules || [],
                                moderators: updated.moderators || [],
                                members: updated.members || [],
                                isJoined: updated.is_joined || false,
                                createdBy: updated.created_by,
                              };
                              setSelectedCommunity(transformed);
                              // Update communities list
                              setCommunities((prev) =>
                                prev.map((c) =>
                                  c.communityId === postCommunity.communityId
                                    ? transformed
                                    : c,
                                ),
                              );
                              // Refresh post to get updated membership status
                              const updatedPost = await getPost(
                                selectedPost.postId,
                              );
                              const transformedPost =
                                transformPost(updatedPost);
                              setSelectedPost(transformedPost);
                              // Refresh posts to show full content
                              const posts = await getPosts({
                                community_id: postCommunity.communityId,
                              });
                              const transformedPosts = posts.map(transformPost);
                              setCommunityPosts(transformedPosts);
                            } catch (err: any) {
                              console.error("Error joining community:", err);
                              toast.error(
                                err.message || "Failed to join community",
                              );
                            }
                          }
                        }}
                        className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
                        style={{
                          backgroundColor: "#F2742C",
                          color: "#FFFFFF",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "0.9";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                      >
                        {hasLeftCommunity
                          ? "Rejoin Community"
                          : "Join Community"}
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="hidden sm:block">
                      {renderAvatar(currentUserAvatar, currentUserName, "w-10")}
                    </div>
                    <div className="sm:hidden">
                      {renderAvatar(currentUserAvatar, currentUserName, "w-8")}
                    </div>
                    <div className="flex-1 relative">
                      <textarea
                        id="comment-input"
                        rows={3}
                        placeholder="Add a comment..."
                        value={newCommentContent}
                        onChange={(e) => setNewCommentContent(e.target.value)}
                        className="w-full rounded-lg border px-2.5 sm:px-3 py-1.5 sm:py-2 pr-10 sm:pr-12 focus:ring-2 focus:border-transparent transition-all duration-200 resize-none text-xs sm:text-sm"
                        style={{
                          ...getInputStyles(newCommentContent),
                          fontFamily: "'Poppins', sans-serif",
                        }}
                        onMouseEnter={(e) =>
                          Object.assign(
                            (e.target as HTMLTextAreaElement).style,
                            getInputHoverStyles(),
                          )
                        }
                        onMouseLeave={(e) =>
                          Object.assign(
                            (e.target as HTMLTextAreaElement).style,
                            getInputBlurStyles(newCommentContent),
                          )
                        }
                        onFocus={(e) =>
                          Object.assign(
                            (e.target as HTMLTextAreaElement).style,
                            getInputFocusStyles(),
                          )
                        }
                        onBlur={(e) =>
                          Object.assign(
                            (e.target as HTMLTextAreaElement).style,
                            getInputBlurStyles(newCommentContent),
                          )
                        }
                      />
                      <button
                        className="absolute right-2 bottom-3.5 p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: newCommentContent.trim()
                            ? "#F2742C"
                            : "#D4C4A8",
                          color: "#FFFFFF",
                        }}
                        disabled={!newCommentContent.trim()}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.backgroundColor = "#E55A1F";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.backgroundColor =
                              newCommentContent.trim() ? "#F2742C" : "#D4C4A8";
                          }
                        }}
                        onClick={async () => {
                          if (!newCommentContent.trim() || !selectedPost)
                            return;

                          // Check if user is a member of the community
                          const postCommunity = communities.find(
                            (c) => c.communityId === selectedPost.communityId,
                          );
                          if (!postCommunity?.isJoined) {
                            toast.error(
                              "You must join this community to comment",
                            );
                            return;
                          }

                          try {
                            await createComment(selectedPost.postId, {
                              body: newCommentContent.trim(),
                            });

                            // Refresh post to get updated comments
                            const updatedPost = await getPost(
                              selectedPost.postId,
                            );
                            console.log(
                              "🔍 Post after comment creation (raw):",
                              updatedPost,
                            );
                            console.log(
                              "🔍 Post comments after creation (raw):",
                              updatedPost.comments,
                            );
                            const transformed = transformPost(updatedPost);
                            console.log(
                              "🔍 Transformed post after comment creation:",
                              transformed,
                            );
                            console.log(
                              "🔍 Transformed comments after creation:",
                              transformed.comments,
                            );
                            setSelectedPost(transformed);

                            setNewCommentContent("");
                            // No success toast - comment appears immediately in the UI
                          } catch (err: any) {
                            console.error("Error submitting comment:", err);
                            toast.error(
                              err.message || "Failed to post comment",
                            );
                          }
                        }}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Only show comments if user is a member OR not viewing from saved posts/my activity after leaving */}
              {(() => {
                const postCommunity =
                  communities.find(
                    (c) => c.communityId === selectedPost.communityId,
                  ) ||
                  (selectedCommunity?.communityId === selectedPost.communityId
                    ? selectedCommunity
                    : null);
                const isMember = postCommunity?.isJoined || false;
                const hasLeftCommunity =
                  postCommunity &&
                  !isMember &&
                  (postDetailSource === "savedPosts" ||
                    postDetailSource === "myActivity");

                // Hide comments if user has left the community
                if (hasLeftCommunity) {
                  return null;
                }

                // Show comments if user is a member or not from saved posts/my activity
                if (selectedPost.comments && selectedPost.comments.length > 0) {
                  const topLevelComments = selectedPost.comments.filter(
                    (comment) => {
                      const isTopLevel = !comment.parentCommentId;
                      return isTopLevel;
                    },
                  );

                  if (topLevelComments.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-sm" style={{ color: "#64635E" }}>
                          No comments yet. Be the first to comment!
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {topLevelComments.map((comment) =>
                        renderComment(comment, 0),
                      )}
                    </div>
                  );
                } else {
                  return (
                    <div className="text-center py-8">
                      <p className="text-sm" style={{ color: "#64635E" }}>
                        No comments yet. Be the first to comment!
                      </p>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render User Picker Modal for Sharing
  const renderShareUserPickerModal = (
    type: "community" | "post",
    item: Community | CommunityPost | null,
    link: string,
  ) => {
    if (!item || !showShareUserPicker) return null;

    const formatMessage = () => {
      if (type === "community") {
        const community = item as Community;
        const description =
          community.description.length > 100
            ? community.description.substring(0, 100) + "..."
            : community.description;
        return `Check out this community: ${community.name}\n\n${description}\n\n${link}`;
      } else {
        const post = item as CommunityPost;
        const excerpt =
          post.body.length > 150
            ? post.body.substring(0, 150) + "..."
            : post.body;
        return `Check out this post: ${post.title}\n\n${excerpt}\n\n${link}`;
      }
    };

    const renderMessagePreview = () => {
      const message = formatMessage();
      const parts = message.split(link);
      return (
        <div
          className="text-xs whitespace-pre-wrap"
          style={{ color: "#64635E", fontFamily: "'Poppins', sans-serif" }}
        >
          {parts[0]}
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80 transition-opacity"
            style={{ color: "#2563eb" }}
            onClick={(e) => e.stopPropagation()}
          >
            {link}
          </a>
          {parts[1]}
        </div>
      );
    };

    const handleSendToRecipients = async () => {
      if (shareRecipients.length === 0) {
        toast.error("Please select at least one recipient", {
          style: { fontFamily: "'Poppins', sans-serif" },
        });
        return;
      }

      setIsSendingShareMessages(true);
      const messageContent = formatMessage();
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      try {
        // Send message to each recipient
        for (const recipient of shareRecipients) {
          try {
            // Create or get conversation
            const conversation = await createPrivateConversation(
              recipient.userId,
            );

            // Send message
            await sendMessage(conversation.conversation_id, messageContent);
            successCount++;
          } catch (error: any) {
            console.error(`Error sending message to ${recipient.name}:`, error);
            failCount++;
            errors.push(recipient.name || recipient.email);
          }
        }

        // Show feedback
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

        // Close modals and reset
        setShowShareUserPicker(null);
        setShareRecipients([]);
        setShareRecipientSearchQuery("");
        setShareRecipientSearchResults([]);
        if (type === "community") {
          setShowShareCommunity(null);
        } else {
          setShowSharePost(null);
        }
      } catch (error: any) {
        console.error("Error in send process:", error);
        toast.error("An error occurred while sending messages", {
          style: { fontFamily: "'Poppins', sans-serif" },
        });
      } finally {
        setIsSendingShareMessages(false);
      }
    };

    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowShareUserPicker(null);
            setShareRecipients([]);
            setShareRecipientSearchQuery("");
          }
        }}
      >
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3
              className="text-lg font-semibold"
              style={{ color: "#32332D", fontFamily: "'Poppins', sans-serif" }}
            >
              Send via Message
            </h3>
            <button
              className="text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => {
                setShowShareUserPicker(null);
                setShareRecipients([]);
                setShareRecipientSearchQuery("");
              }}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Recipients Selection */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "#32332D", fontFamily: "'Poppins', sans-serif" }}
            >
              Select Recipients
            </label>
            <p className="text-xs mb-3" style={{ color: "#64635E" }}>
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
                        userId: 0, // Will need to be resolved
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
                if (typeof option === "string" || typeof value === "string") {
                  return option === value;
                }
                return option.userId === value.userId;
              }}
              renderOption={(props: any, option: string | ModeratorUser) => {
                if (typeof option === "string") {
                  return (
                    <li {...props} key={option}>
                      <div className="flex items-center gap-2 p-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                          style={{ backgroundColor: "#F2742C" }}
                        >
                          {option.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-sm font-medium"
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
                    <div className="flex items-center gap-2 p-2">
                      {userOption.avatar ? (
                        <img
                          src={userOption.avatar}
                          alt={userOption.name}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                          style={{ backgroundColor: "#F2742C" }}
                        >
                          {userOption.name?.charAt(0).toUpperCase() ||
                            userOption.email?.charAt(0).toUpperCase() ||
                            "U"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm font-medium"
                          style={{ color: "#32332D" }}
                        >
                          {userOption.name || userOption.email}
                        </div>
                        <div className="text-xs" style={{ color: "#64635E" }}>
                          {userOption.email}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              }}
              renderTags={(value: readonly ModeratorUser[], getTagProps: any) =>
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
          <div className="space-y-2">
            <label
              className="text-xs font-medium"
              style={{ color: "#32332D", fontFamily: "'Poppins', sans-serif" }}
            >
              Message Preview
            </label>
            <div
              className="p-3 rounded-lg border bg-gray-50"
              style={{ borderColor: "#F0DCC9" }}
            >
              {renderMessagePreview()}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowShareUserPicker(null);
                setShareRecipients([]);
                setShareRecipientSearchQuery("");
              }}
              className="flex-1 px-4 py-3 rounded-lg border transition-all duration-200 font-medium"
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
              onClick={handleSendToRecipients}
              disabled={shareRecipients.length === 0 || isSendingShareMessages}
              className="flex-1 px-4 py-3 rounded-lg transition-all duration-200 font-medium flex items-center justify-center gap-2"
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
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
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
    );
  };

  const renderShareModal = () => {
    if (!showSharePost) {
      return null;
    }

    const community = communities.find(
      (c) => c.communityId === showSharePost.communityId,
    );
    // Include source parameter if available to preserve context (savedPosts, myActivity, etc.)
    const sourceParam =
      postDetailSource && postDetailSource !== "community"
        ? `&source=${postDetailSource}`
        : "";
    const postLink = community
      ? `${window.location.origin}/communities/${community.communityId}?postId=${showSharePost.postId}${sourceParam}`
      : `${window.location.origin}/community?communityId=${showSharePost.communityId}&postId=${showSharePost.postId}${sourceParam}`;

    const handleCopyLink = async () => {
      try {
        await navigator.clipboard.writeText(postLink);
        setShareLinkCopied(true);
        toast.success("Link copied to clipboard!", {
          style: { fontFamily: "'Poppins', sans-serif" },
        });
        setTimeout(() => setShareLinkCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy link:", err);
        toast.error("Failed to copy link", {
          style: { fontFamily: "'Poppins', sans-serif" },
        });
      }
    };

    const handleSendViaMessage = () => {
      setShowShareUserPicker({ type: "post" });
    };

    return (
      <>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSharePost(null);
              setShowShareUserPicker(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3
                className="text-lg font-semibold"
                style={{
                  color: "#32332D",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Share Post
              </h3>
              <button
                className="text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setShowSharePost(null)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Post Preview */}
            <div className="space-y-3">
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: "#FAEFE2" }}
              >
                <h4
                  className="font-semibold text-sm mb-2"
                  style={{
                    color: "#32332D",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  {showSharePost.title}
                </h4>
                <p
                  className="text-xs line-clamp-2 mb-2"
                  style={{ color: "#64635E" }}
                >
                  {showSharePost.body}
                </p>
                <div
                  className="flex items-center gap-2 text-xs"
                  style={{ color: "#AA855B" }}
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>
                    {showSharePost.commentsCount ||
                      showSharePost.comments?.length ||
                      0}{" "}
                    comments
                  </span>
                  <Heart className="w-3 h-3 ml-2" />
                  <span>{showSharePost.likes} likes</span>
                </div>
              </div>
            </div>

            {/* Link Display */}
            <div className="space-y-2">
              <label
                className="text-xs font-medium"
                style={{
                  color: "#32332D",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Link
              </label>
              <div
                className="flex items-center gap-2 p-3 rounded-lg border"
                style={{ borderColor: "#F0DCC9", backgroundColor: "#F5F5F5" }}
              >
                <input
                  type="text"
                  value={postLink}
                  readOnly
                  className="flex-1 text-xs bg-transparent outline-none"
                  style={{
                    color: "#32332D",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                {shareLinkCopied && (
                  <span
                    className="text-xs font-medium"
                    style={{ color: "#F2742C" }}
                  >
                    Copied!
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 font-medium"
                style={{
                  borderColor: shareLinkCopied ? "#F2742C" : "#F0DCC9",
                  backgroundColor: shareLinkCopied ? "#FDF2E8" : "transparent",
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
                  className="w-5 h-5"
                  style={{ color: shareLinkCopied ? "#F2742C" : "#AA855B" }}
                />
                <span>{shareLinkCopied ? "Link Copied!" : "Copy Link"}</span>
              </button>
              <button
                onClick={handleSendViaMessage}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium"
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
                <MessageCircle className="w-5 h-5" />
                <span>Send via Message</span>
              </button>
            </div>
          </div>
        </div>
        {/* User Picker Modal for Share Post */}
        {showShareUserPicker?.type === "post" &&
          renderShareUserPickerModal("post", showSharePost, postLink)}
      </>
    );
  };

  const handleAddRule = () => {
    setNewCommunityRules([...newCommunityRules, ""]);
  };

  const handleRemoveRule = (index: number) => {
    setNewCommunityRules(newCommunityRules.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index: number, value: string) => {
    const updatedRules = [...newCommunityRules];
    updatedRules[index] = value;
    setNewCommunityRules(updatedRules);
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewCommunityCoverImage(file);
      setShouldDeleteCoverImage(false); // Clear deletion flag when new image is selected
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCommunityCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const normalizeTokens = (tokens: string[]): string[] => {
    const cleaned = (tokens || [])
      .map((t) => (t || "").trim().replace(/\s+/g, " "))
      .filter((t) => t.length > 0);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of cleaned) {
      const lower = t.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        out.push(t);
      }
    }
    return out;
  };

  // Helper function to get all available topic suggestions (merges API taxonomies with common topics)
  const getTopicSuggestions = (excludeSelected: string[] = []): string[] => {
    const apiTopics = taxonomies
      .filter((taxonomy) => taxonomy.taxonomyType === "topic")
      .map((taxonomy) => taxonomy.label);

    // Merge API topics with common topics, removing duplicates (case-insensitive)
    const allTopics = [...apiTopics, ...COMMON_TOPICS];
    const uniqueTopics = normalizeTokens(allTopics);

    // Filter out already selected topics
    const selectedLower = excludeSelected.map((t) => t.toLowerCase());
    return uniqueTopics.filter(
      (topic) => !selectedLower.includes(topic.toLowerCase()),
    );
  };

  // Helper function to get all available age group suggestions (merges API taxonomies with common age groups)
  const getAgeGroupSuggestions = (excludeSelected: string[] = []): string[] => {
    const apiAgeGroups = taxonomies
      .filter((taxonomy) => taxonomy.taxonomyType === "age_group")
      .map((taxonomy) => taxonomy.label);

    // Merge API age groups with common age groups, removing duplicates (case-insensitive)
    const allAgeGroups = [...apiAgeGroups, ...COMMON_AGE_GROUPS];
    const uniqueAgeGroups = normalizeTokens(allAgeGroups);

    // Filter out already selected age groups
    const selectedLower = excludeSelected.map((t) => t.toLowerCase());
    return uniqueAgeGroups.filter(
      (ageGroup) => !selectedLower.includes(ageGroup.toLowerCase()),
    );
  };

  // Helper function to get all available stage suggestions (merges API taxonomies with common stages)
  const getStageSuggestions = (excludeSelected: string[] = []): string[] => {
    const apiStages = taxonomies
      .filter((taxonomy) => taxonomy.taxonomyType === "stage")
      .map((taxonomy) => taxonomy.label);

    // Merge API stages with common stages, removing duplicates (case-insensitive)
    const allStages = [...apiStages, ...COMMON_STAGES];
    const uniqueStages = normalizeTokens(allStages);

    // Filter out already selected stages
    const selectedLower = excludeSelected.map((t) => t.toLowerCase());
    return uniqueStages.filter(
      (stage) => !selectedLower.includes(stage.toLowerCase()),
    );
  };

  const handleResetCreateModal = () => {
    setNewCommunityName("");
    setNewCommunityDescription("");
    setNewCommunityTopics([]);
    setNewCommunityAgeGroups([]);
    setNewCommunityStages([]);
    setNewCommunityCoverImage(null);
    setNewCommunityCoverImagePreview("");
    setNewCommunityRules([""]);
    setNewCommunityModerators([]);
    setModeratorSearchQuery("");
    setModeratorSearchResults([]);
    setShowCreateCommunityModal(false);
  };

  const handleResetEditModal = () => {
    setNewCommunityName("");
    setNewCommunityDescription("");
    setNewCommunityTopics([]);
    setNewCommunityAgeGroups([]);
    setNewCommunityStages([]);
    setNewCommunityCoverImage(null);
    setNewCommunityCoverImagePreview("");
    setShouldDeleteCoverImage(false);
    setNewCommunityRules([""]);
    setNewCommunityModerators([]);
    setModeratorSearchQuery("");
    setModeratorSearchResults([]);
    setShowEditCommunityModal(false);
  };

  // Helper functions for input styles (matching DiaryPage)
  const getInputStyles = (value: any) => ({
    borderColor: "#AA855B",
    backgroundColor: value ? "#F5F5F5" : "#EDEDED",
    color: "#32332D",
    fontFamily: "'Poppins', sans-serif",
  });

  const getInputHoverStyles = () => ({
    backgroundColor: "#F5F5F5",
    borderColor: "#AA855B",
    boxShadow: "none",
  });

  const getInputFocusStyles = () => ({
    backgroundColor: "#F5F5F5",
    borderColor: "#AA855B",
    boxShadow: "0 0 0 2px #F2742C",
  });

  const getInputBlurStyles = (value: any) => ({
    backgroundColor: value ? "#F5F5F5" : "#EDEDED",
    borderColor: "#AA855B",
    boxShadow: "none",
  });

  // Helper function for Material-UI TextField styles (matching Profile.tsx)
  const getTextFieldStyles = (hasValue: boolean) => ({
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      backgroundColor: hasValue ? "#F5F5F5" : "#EDEDED",
      fontFamily: "'Poppins', sans-serif",
      "&:hover": {
        backgroundColor: "#F5F5F5",
      },
      "&.Mui-focused": {
        backgroundColor: "#F5F5F5",
      },
      "& input:-webkit-autofill": {
        WebkitBoxShadow: "0 0 0 1000px #F5F5F5 inset !important",
        WebkitTextFillColor: "#32332D !important",
        transition: "background-color 5000s ease-in-out 0s",
      },
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: "#AA855B",
        borderWidth: "1px",
      },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: "#AA855B",
        borderWidth: "1px",
      },
    },
    "& .MuiInputLabel-root": {
      fontFamily: "'Poppins', sans-serif",
      color: "#32332D",
    },
  });

  const renderCreateCommunityModal = () => {
    if (!showCreateCommunityModal) {
      return null;
    }
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4">
        <div
          className="max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col rounded-none sm:rounded-2xl"
          style={{
            backgroundColor: "#F5F5F5",
            overflow: "hidden",
          }}
        >
          {/* Fixed Header */}
          <div
            className="p-6 border-b flex-shrink-0"
            style={{ borderColor: "#AA855B", backgroundColor: "#FAEFE2" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#F2742C" }}
                >
                  <Users className="w-4 h-4 text-white" />
                </div>
                <h3
                  className="font-bold"
                  style={{
                    color: "#32332D",
                    fontSize: "1.25rem",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  Create New Community
                </h3>
              </div>
              <button
                onClick={handleResetCreateModal}
                className="p-1 rounded-full transition-all duration-200"
                style={{ color: "#AA855B" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#F0DCC9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <form
              id="create-community-form"
              className="space-y-6"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  // Upload cover image if present
                  let coverImageUrl = "";
                  if (newCommunityCoverImage) {
                    const uploadResult = await uploadCommunityCoverImage(
                      newCommunityCoverImage,
                    );
                    coverImageUrl = uploadResult.url;
                  }

                  // Extract emails from moderator user objects
                  const moderatorEmails = newCommunityModerators
                    .map((m) => m.email || "")
                    .filter((email) => email.trim() !== "");

                  const communityData = {
                    name: newCommunityName,
                    description: newCommunityDescription,
                    topics: newCommunityTopics,
                    age_groups: newCommunityAgeGroups,
                    stages: newCommunityStages,
                    cover_image_url: coverImageUrl || undefined,
                    rules: newCommunityRules.filter(
                      (rule) => rule.trim() !== "",
                    ),
                    moderators: moderatorEmails,
                  };

                  await createCommunity(communityData);
                  toast.success("Community created successfully!");
                  handleResetCreateModal();

                  // Refresh communities list
                  await fetchCommunities();
                } catch (error: any) {
                  console.error("Error creating community:", error);
                  toast.error(error.message || "Failed to create community");
                }
              }}
            >
              {/* Community Name */}
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#32332D" }}
                >
                  Community Name *
                </label>
                <input
                  type="text"
                  placeholder="E.g. Gentle Sleep Strategies"
                  value={newCommunityName}
                  onChange={(e) => setNewCommunityName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                  style={getInputStyles(newCommunityName)}
                  onMouseEnter={(e) =>
                    Object.assign(
                      (e.target as HTMLInputElement).style,
                      getInputHoverStyles(),
                    )
                  }
                  onMouseLeave={(e) =>
                    Object.assign(
                      (e.target as HTMLInputElement).style,
                      getInputBlurStyles(newCommunityName),
                    )
                  }
                  onFocus={(e) =>
                    Object.assign(
                      (e.target as HTMLInputElement).style,
                      getInputFocusStyles(),
                    )
                  }
                  onBlur={(e) =>
                    Object.assign(
                      (e.target as HTMLInputElement).style,
                      getInputBlurStyles(newCommunityName),
                    )
                  }
                />
              </div>

              {/* Description */}
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#32332D" }}
                >
                  Description *
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain the purpose of the community and who should join"
                  value={newCommunityDescription}
                  onChange={(e) => setNewCommunityDescription(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 resize-none"
                  style={getInputStyles(newCommunityDescription)}
                  onMouseEnter={(e) =>
                    Object.assign(
                      (e.target as HTMLTextAreaElement).style,
                      getInputHoverStyles(),
                    )
                  }
                  onMouseLeave={(e) =>
                    Object.assign(
                      (e.target as HTMLTextAreaElement).style,
                      getInputBlurStyles(newCommunityDescription),
                    )
                  }
                  onFocus={(e) =>
                    Object.assign(
                      (e.target as HTMLTextAreaElement).style,
                      getInputFocusStyles(),
                    )
                  }
                  onBlur={(e) =>
                    Object.assign(
                      (e.target as HTMLTextAreaElement).style,
                      getInputBlurStyles(newCommunityDescription),
                    )
                  }
                />
              </div>

              {/* Topics (Multiple) */}
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#32332D" }}
                >
                  Topics
                </label>
                <Autocomplete
                  multiple
                  freeSolo
                  options={getTopicSuggestions()}
                  value={newCommunityTopics}
                  onChange={(_, newValue) =>
                    setNewCommunityTopics(normalizeTokens(newValue as string[]))
                  }
                  renderTags={(value: readonly string[], getTagProps) =>
                    value.map((option: string, index: number) => (
                      <Chip
                        variant="filled"
                        size="small"
                        label={option}
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
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Type and press Enter"
                      sx={getTextFieldStyles(newCommunityTopics.length > 0)}
                    />
                  )}
                />
                <div className="mt-2">
                  <div className="text-xs mb-1" style={{ color: "#AA855B" }}>
                    Suggestions
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {getTopicSuggestions(newCommunityTopics).map((topic) => (
                      <Button
                        key={topic}
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          if (!newCommunityTopics.includes(topic)) {
                            setNewCommunityTopics(
                              normalizeTokens([...newCommunityTopics, topic]),
                            );
                          }
                        }}
                        sx={{
                          textTransform: "none",
                          m: 0.25,
                          borderColor: "#F0DCC9",
                          color: "#AA855B",
                          fontFamily: "'Poppins', sans-serif",
                          "&:hover": {
                            borderColor: "#AA855B",
                            backgroundColor: "#F5F3F0",
                          },
                        }}
                      >
                        {topic}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Age Groups | Developmental Stages (Side by Side) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Age Groups (Multiple) */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "#32332D" }}
                  >
                    Age Groups
                  </label>
                  <Autocomplete
                    multiple
                    options={getAgeGroupSuggestions()}
                    value={newCommunityAgeGroups}
                    onChange={(_, newValue) =>
                      setNewCommunityAgeGroups(newValue as string[])
                    }
                    renderTags={(value: readonly string[], getTagProps) =>
                      value.map((option: string, index: number) => (
                        <Chip
                          variant="filled"
                          size="small"
                          label={option}
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
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Select age groups"
                        sx={getTextFieldStyles(
                          newCommunityAgeGroups.length > 0,
                        )}
                      />
                    )}
                  />
                  <div className="mt-2">
                    <div className="text-xs mb-1" style={{ color: "#AA855B" }}>
                      Suggestions
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {getAgeGroupSuggestions(newCommunityAgeGroups).map(
                        (ageGroup) => (
                          <Button
                            key={ageGroup}
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              if (!newCommunityAgeGroups.includes(ageGroup)) {
                                setNewCommunityAgeGroups([
                                  ...newCommunityAgeGroups,
                                  ageGroup,
                                ]);
                              }
                            }}
                            sx={{
                              textTransform: "none",
                              m: 0.25,
                              borderColor: "#F0DCC9",
                              color: "#AA855B",
                              fontFamily: "'Poppins', sans-serif",
                              "&:hover": {
                                borderColor: "#AA855B",
                                backgroundColor: "#F5F3F0",
                              },
                            }}
                          >
                            {ageGroup}
                          </Button>
                        ),
                      )}
                    </div>
                  </div>
                </div>

                {/* Stages (Multiple) */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "#32332D" }}
                  >
                    Developmental Stages
                  </label>
                  <Autocomplete
                    multiple
                    options={getStageSuggestions()}
                    value={newCommunityStages}
                    onChange={(_, newValue) =>
                      setNewCommunityStages(newValue as string[])
                    }
                    renderTags={(value: readonly string[], getTagProps) =>
                      value.map((option: string, index: number) => (
                        <Chip
                          variant="filled"
                          size="small"
                          label={option}
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
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Select developmental stages"
                        sx={getTextFieldStyles(newCommunityStages.length > 0)}
                      />
                    )}
                  />
                  <div className="mt-2">
                    <div className="text-xs mb-1" style={{ color: "#AA855B" }}>
                      Suggestions
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {getStageSuggestions(newCommunityStages).map((stage) => (
                        <Button
                          key={stage}
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            if (!newCommunityStages.includes(stage)) {
                              setNewCommunityStages([
                                ...newCommunityStages,
                                stage,
                              ]);
                            }
                          }}
                          sx={{
                            textTransform: "none",
                            m: 0.25,
                            borderColor: "#F0DCC9",
                            color: "#AA855B",
                            fontFamily: "'Poppins', sans-serif",
                            "&:hover": {
                              borderColor: "#AA855B",
                              backgroundColor: "#F5F3F0",
                            },
                          }}
                        >
                          {stage}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Community Rules */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#32332D" }}
                >
                  Community Rules
                </label>
                <div className="space-y-2">
                  {newCommunityRules.map((rule, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Rule ${index + 1}`}
                        value={rule}
                        onChange={(e) =>
                          handleRuleChange(index, e.target.value)
                        }
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                        style={getInputStyles(rule)}
                        onMouseEnter={(e) =>
                          Object.assign(
                            (e.target as HTMLInputElement).style,
                            getInputHoverStyles(),
                          )
                        }
                        onMouseLeave={(e) =>
                          Object.assign(
                            (e.target as HTMLInputElement).style,
                            getInputBlurStyles(rule),
                          )
                        }
                        onFocus={(e) =>
                          Object.assign(
                            (e.target as HTMLInputElement).style,
                            getInputFocusStyles(),
                          )
                        }
                        onBlur={(e) =>
                          Object.assign(
                            (e.target as HTMLInputElement).style,
                            getInputBlurStyles(rule),
                          )
                        }
                      />
                      {newCommunityRules.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRule(index)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          style={{ color: "#EF4444" }}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="flex items-center gap-2 text-sm font-medium transition-colors"
                    style={{ color: "#AA855B" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#8B6F4A";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#AA855B";
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Add Rule
                  </button>
                </div>
              </div>

              {/* Moderators */}
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#32332D" }}
                >
                  Moderators (Optional)
                </label>
                <p className="text-xs mb-2" style={{ color: "#64635E" }}>
                  Search for users by name or email. They will be invited as
                  moderators after community creation.
                </p>
                <Autocomplete
                  multiple
                  freeSolo
                  options={moderatorSearchResults}
                  value={newCommunityModerators}
                  inputValue={moderatorSearchQuery}
                  onInputChange={(_, newInputValue) => {
                    setModeratorSearchQuery(newInputValue);
                  }}
                  onChange={(_, newValue) => {
                    const updatedModerators: ModeratorUser[] = [];
                    for (const item of newValue) {
                      if (typeof item === "string") {
                        // FreeSolo: user typed an email directly
                        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.trim())) {
                          updatedModerators.push({
                            userId: 0, // Temporary, will be resolved by backend
                            email: item.trim(),
                            name: item.trim().split("@")[0], // Use email prefix as name
                            avatar: null,
                          });
                        }
                      } else {
                        // Selected from suggestions
                        updatedModerators.push(item);
                      }
                    }
                    setNewCommunityModerators(updatedModerators);
                    setModeratorSearchQuery("");
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
                          <div className="flex items-center gap-2 p-2">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                              style={{ backgroundColor: "#F2742C" }}
                            >
                              {option.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div
                                className="text-sm font-medium"
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
                        <div className="flex items-center gap-2 p-2">
                          {userOption.avatar ? (
                            <img
                              src={userOption.avatar}
                              alt={userOption.name}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                              style={{ backgroundColor: "#F2742C" }}
                            >
                              {userOption.name?.charAt(0).toUpperCase() ||
                                userOption.email?.charAt(0).toUpperCase() ||
                                "U"}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div
                              className="text-sm font-medium"
                              style={{ color: "#32332D" }}
                            >
                              {userOption.name || userOption.email}
                            </div>
                            <div
                              className="text-xs"
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
                  loading={isSearchingModerators}
                  renderInput={(params: any) => (
                    <TextField
                      {...params}
                      placeholder="Search by name or enter email address..."
                      sx={getTextFieldStyles(newCommunityModerators.length > 0)}
                    />
                  )}
                />
              </div>

              {/* Cover Image */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#32332D" }}
                >
                  Cover Image
                </label>
                {newCommunityCoverImagePreview ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <img
                        src={newCommunityCoverImagePreview}
                        alt="Cover preview"
                        className="w-full h-48 object-cover rounded-lg border"
                        style={{ borderColor: "#F0DCC9" }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setNewCommunityCoverImage(null);
                          setNewCommunityCoverImagePreview("");
                        }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors"
                      >
                        <X className="w-4 h-4" style={{ color: "#32332D" }} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 hover:bg-gray-50"
                    style={{ borderColor: "#AA855B" }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.backgroundColor = "#F5F3F0";
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.backgroundColor = "transparent";
                      const files = e.dataTransfer.files;
                      if (files.length > 0) {
                        handleCoverImageChange({ target: { files } } as any);
                      }
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverImageChange}
                      className="hidden"
                      id="community-cover-upload"
                    />
                    <div className="space-y-2">
                      <div
                        className="w-12 h-12 mx-auto rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "#F5F3F0" }}
                      >
                        <Image
                          className="w-6 h-6"
                          style={{ color: "#AA855B" }}
                        />
                      </div>
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "#32332D" }}
                        >
                          Drop image here or click to upload
                        </p>
                        <p className="text-xs" style={{ color: "#AA855B" }}>
                          PNG, JPG (max 10MB)
                        </p>
                      </div>
                      <label
                        htmlFor="community-cover-upload"
                        className="inline-block px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200"
                        style={{
                          backgroundColor: "#F2742C",
                          color: "#F5F5F5",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#E55A1F";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#F2742C";
                        }}
                      >
                        Choose Image
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Fixed Footer */}
          <div
            className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t"
            style={{ borderColor: "#AA855B", backgroundColor: "#FAEFE2" }}
          >
            <div className="flex flex-col-reverse sm:flex-row items-center gap-2 sm:gap-3 sm:justify-end">
              <button
                type="button"
                onClick={handleResetCreateModal}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm"
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
                type="button"
                onClick={(e) => {
                  const form = document.getElementById(
                    "create-community-form",
                  ) as HTMLFormElement;
                  if (form) {
                    form.requestSubmit();
                  }
                }}
                disabled={
                  !newCommunityName.trim() || !newCommunityDescription.trim()
                }
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "#0F5648",
                  color: "#F5F5F5",
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = "#0A4538";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = "#0F5648";
                  }
                }}
              >
                <Save className="w-4 h-4" />
                <span>Create Community</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEditCommunityModal = () => {
    if (!showEditCommunityModal || !selectedCommunity) {
      return null;
    }

    // Check if user can edit (owner or moderator)
    const canEdit = canEditCommunity(selectedCommunity);
    const isOwner = isCommunityOwner(selectedCommunity);

    if (!canEdit) {
      return null;
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4">
        <div
          className="max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col rounded-none sm:rounded-2xl"
          style={{
            backgroundColor: "#F5F5F5",
            overflow: "hidden",
          }}
        >
          {/* Fixed Header */}
          <div
            className="p-6 border-b flex-shrink-0"
            style={{ borderColor: "#AA855B", backgroundColor: "#FAEFE2" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#F2742C" }}
                >
                  <Edit3 className="w-4 h-4 text-white" />
                </div>
                <h3
                  className="font-bold"
                  style={{
                    color: "#32332D",
                    fontSize: "1.25rem",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  Edit Community
                </h3>
              </div>
              <button
                onClick={handleResetEditModal}
                className="p-1 rounded-full transition-all duration-200"
                style={{ color: "#AA855B" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#F0DCC9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content - Reuse same form structure as create modal */}
          <div className="flex-1 overflow-y-auto p-6">
            <form
              id="edit-community-form"
              className="space-y-6"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!selectedCommunity) return;

                try {
                  // Handle cover image: upload new, delete existing, or preserve
                  let coverImageUrl: string | null | undefined = undefined;

                  if (shouldDeleteCoverImage) {
                    // User clicked X button - delete the cover image
                    coverImageUrl = null; // Send null to backend to trigger deletion
                  } else if (newCommunityCoverImage) {
                    // User uploaded a new image
                    const uploadResult = await uploadCommunityCoverImage(
                      newCommunityCoverImage,
                    );
                    coverImageUrl = uploadResult.url;
                  }
                  // If neither deletion nor new image, coverImageUrl stays undefined (preserve existing)

                  // Extract emails from moderator user objects
                  const moderatorEmails = newCommunityModerators
                    .map((m) => m.email || "")
                    .filter((email) => email.trim() !== "");

                  const communityData: {
                    name: string;
                    description: string;
                    topics: string[];
                    age_groups: string[];
                    stages: string[];
                    rules: string[];
                    moderators: string[];
                    cover_image_url?: string | null;
                  } = {
                    name: newCommunityName,
                    description: newCommunityDescription,
                    // Always include taxonomy arrays (even if empty) to ensure backend processes them
                    topics: newCommunityTopics || [],
                    age_groups: newCommunityAgeGroups || [],
                    stages: newCommunityStages || [],
                    rules: newCommunityRules.filter(
                      (rule) => rule.trim() !== "",
                    ),
                    moderators: moderatorEmails,
                  };

                  // Explicitly set cover_image_url: null for deletion, string for update, or omit for preserve
                  if (coverImageUrl !== undefined) {
                    communityData.cover_image_url = coverImageUrl;
                  }

                  await updateCommunity(
                    selectedCommunity.communityId,
                    communityData,
                  );
                  toast.success("Community updated successfully!");
                  handleResetEditModal();

                  // Refresh community data
                  if (selectedCommunity.communityId) {
                    await fetchCommunityDetail(selectedCommunity.communityId);
                  }
                  await fetchCommunities();
                } catch (error: any) {
                  console.error("Error updating community:", error);
                  toast.error(error.message || "Failed to update community");
                }
              }}
            >
              {/* Community Name */}
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#32332D" }}
                >
                  Community Name *
                </label>
                <input
                  type="text"
                  placeholder="E.g. Gentle Sleep Strategies"
                  value={newCommunityName}
                  onChange={(e) => setNewCommunityName(e.target.value)}
                  required
                  disabled={!isOwner} // Only owner can change name
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={getInputStyles(newCommunityName)}
                  onMouseEnter={(e) =>
                    !isOwner
                      ? null
                      : Object.assign(
                          (e.target as HTMLInputElement).style,
                          getInputHoverStyles(),
                        )
                  }
                  onMouseLeave={(e) =>
                    !isOwner
                      ? null
                      : Object.assign(
                          (e.target as HTMLInputElement).style,
                          getInputBlurStyles(newCommunityName),
                        )
                  }
                  onFocus={(e) =>
                    !isOwner
                      ? null
                      : Object.assign(
                          (e.target as HTMLInputElement).style,
                          getInputFocusStyles(),
                        )
                  }
                  onBlur={(e) =>
                    !isOwner
                      ? null
                      : Object.assign(
                          (e.target as HTMLInputElement).style,
                          getInputBlurStyles(newCommunityName),
                        )
                  }
                />
                {!isOwner && (
                  <p className="text-xs mt-1" style={{ color: "#64635E" }}>
                    Only the owner can change the community name
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#32332D" }}
                >
                  Description *
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain the purpose of the community and who should join"
                  value={newCommunityDescription}
                  onChange={(e) => setNewCommunityDescription(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 resize-none"
                  style={getInputStyles(newCommunityDescription)}
                  onMouseEnter={(e) =>
                    Object.assign(
                      (e.target as HTMLTextAreaElement).style,
                      getInputHoverStyles(),
                    )
                  }
                  onMouseLeave={(e) =>
                    Object.assign(
                      (e.target as HTMLTextAreaElement).style,
                      getInputBlurStyles(newCommunityDescription),
                    )
                  }
                  onFocus={(e) =>
                    Object.assign(
                      (e.target as HTMLTextAreaElement).style,
                      getInputFocusStyles(),
                    )
                  }
                  onBlur={(e) =>
                    Object.assign(
                      (e.target as HTMLTextAreaElement).style,
                      getInputBlurStyles(newCommunityDescription),
                    )
                  }
                />
              </div>

              {/* Topics, Age Groups, Stages, Rules, Moderators, Cover Image - Same as create modal */}
              {/* Topics (Multiple) */}
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#32332D" }}
                >
                  Topics
                </label>
                <Autocomplete
                  multiple
                  freeSolo
                  options={getTopicSuggestions()}
                  value={newCommunityTopics}
                  onChange={(_, newValue) =>
                    setNewCommunityTopics(normalizeTokens(newValue as string[]))
                  }
                  renderTags={(value: readonly string[], getTagProps) =>
                    value.map((option: string, index: number) => (
                      <Chip
                        variant="filled"
                        size="small"
                        label={option}
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
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Type and press Enter"
                      sx={getTextFieldStyles(newCommunityTopics.length > 0)}
                    />
                  )}
                />
                <div className="mt-2">
                  <div className="text-xs mb-1" style={{ color: "#AA855B" }}>
                    Suggestions
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {getTopicSuggestions(newCommunityTopics).map((topic) => (
                      <Button
                        key={topic}
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          if (!newCommunityTopics.includes(topic)) {
                            setNewCommunityTopics(
                              normalizeTokens([...newCommunityTopics, topic]),
                            );
                          }
                        }}
                        sx={{
                          textTransform: "none",
                          m: 0.25,
                          borderColor: "#F0DCC9",
                          color: "#AA855B",
                          fontFamily: "'Poppins', sans-serif",
                          "&:hover": {
                            borderColor: "#AA855B",
                            backgroundColor: "#F5F3F0",
                          },
                        }}
                      >
                        {topic}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Age Groups | Developmental Stages (Side by Side) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Age Groups */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "#32332D" }}
                  >
                    Age Groups
                  </label>
                  <Autocomplete
                    multiple
                    options={getAgeGroupSuggestions()}
                    value={newCommunityAgeGroups}
                    onChange={(_, newValue) =>
                      setNewCommunityAgeGroups(newValue as string[])
                    }
                    renderTags={(value: readonly string[], getTagProps) =>
                      value.map((option: string, index: number) => (
                        <Chip
                          variant="filled"
                          size="small"
                          label={option}
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
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Select age groups"
                        sx={getTextFieldStyles(
                          newCommunityAgeGroups.length > 0,
                        )}
                      />
                    )}
                  />
                  <div className="mt-2">
                    <div className="text-xs mb-1" style={{ color: "#AA855B" }}>
                      Suggestions
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {getAgeGroupSuggestions(newCommunityAgeGroups).map(
                        (ageGroup) => (
                          <Button
                            key={ageGroup}
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              if (!newCommunityAgeGroups.includes(ageGroup)) {
                                setNewCommunityAgeGroups([
                                  ...newCommunityAgeGroups,
                                  ageGroup,
                                ]);
                              }
                            }}
                            sx={{
                              textTransform: "none",
                              m: 0.25,
                              borderColor: "#F0DCC9",
                              color: "#AA855B",
                              fontFamily: "'Poppins', sans-serif",
                              "&:hover": {
                                borderColor: "#AA855B",
                                backgroundColor: "#F5F3F0",
                              },
                            }}
                          >
                            {ageGroup}
                          </Button>
                        ),
                      )}
                    </div>
                  </div>
                </div>

                {/* Stages */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "#32332D" }}
                  >
                    Developmental Stages
                  </label>
                  <Autocomplete
                    multiple
                    options={getStageSuggestions()}
                    value={newCommunityStages}
                    onChange={(_, newValue) =>
                      setNewCommunityStages(newValue as string[])
                    }
                    renderTags={(value: readonly string[], getTagProps) =>
                      value.map((option: string, index: number) => (
                        <Chip
                          variant="filled"
                          size="small"
                          label={option}
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
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Select developmental stages"
                        sx={getTextFieldStyles(newCommunityStages.length > 0)}
                      />
                    )}
                  />
                  <div className="mt-2">
                    <div className="text-xs mb-1" style={{ color: "#AA855B" }}>
                      Suggestions
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {getStageSuggestions(newCommunityStages).map((stage) => (
                        <Button
                          key={stage}
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            if (!newCommunityStages.includes(stage)) {
                              setNewCommunityStages([
                                ...newCommunityStages,
                                stage,
                              ]);
                            }
                          }}
                          sx={{
                            textTransform: "none",
                            m: 0.25,
                            borderColor: "#F0DCC9",
                            color: "#AA855B",
                            fontFamily: "'Poppins', sans-serif",
                            "&:hover": {
                              borderColor: "#AA855B",
                              backgroundColor: "#F5F3F0",
                            },
                          }}
                        >
                          {stage}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Community Rules */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#32332D" }}
                >
                  Community Rules
                </label>
                <div className="space-y-2">
                  {newCommunityRules.map((rule, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Rule ${index + 1}`}
                        value={rule}
                        onChange={(e) =>
                          handleRuleChange(index, e.target.value)
                        }
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                        style={getInputStyles(rule)}
                        onMouseEnter={(e) =>
                          Object.assign(
                            (e.target as HTMLInputElement).style,
                            getInputHoverStyles(),
                          )
                        }
                        onMouseLeave={(e) =>
                          Object.assign(
                            (e.target as HTMLInputElement).style,
                            getInputBlurStyles(rule),
                          )
                        }
                        onFocus={(e) =>
                          Object.assign(
                            (e.target as HTMLInputElement).style,
                            getInputFocusStyles(),
                          )
                        }
                        onBlur={(e) =>
                          Object.assign(
                            (e.target as HTMLInputElement).style,
                            getInputBlurStyles(rule),
                          )
                        }
                      />
                      {newCommunityRules.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRule(index)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          style={{ color: "#EF4444" }}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="flex items-center gap-2 text-sm font-medium transition-colors"
                    style={{ color: "#AA855B" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#8B6F4A";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#AA855B";
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Add Rule
                  </button>
                </div>
              </div>

              {/* Moderators */}
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#32332D" }}
                >
                  Moderators (Optional)
                </label>
                <p className="text-xs mb-2" style={{ color: "#64635E" }}>
                  Search for users by name or email. They will be invited as
                  moderators.
                </p>
                <Autocomplete
                  multiple
                  freeSolo
                  options={moderatorSearchResults}
                  value={newCommunityModerators}
                  inputValue={moderatorSearchQuery}
                  onInputChange={(_, newInputValue) => {
                    setModeratorSearchQuery(newInputValue);
                  }}
                  onChange={(_, newValue) => {
                    const updatedModerators: ModeratorUser[] = [];
                    for (const item of newValue) {
                      if (typeof item === "string") {
                        // FreeSolo: user typed an email directly
                        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.trim())) {
                          updatedModerators.push({
                            userId: 0, // Temporary, will be resolved by backend
                            email: item.trim(),
                            name: item.trim().split("@")[0], // Use email prefix as name
                            avatar: null,
                          });
                        }
                      } else {
                        // Selected from suggestions
                        updatedModerators.push(item);
                      }
                    }
                    setNewCommunityModerators(updatedModerators);
                    setModeratorSearchQuery("");
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
                          <div className="flex items-center gap-2 p-2">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                              style={{ backgroundColor: "#F2742C" }}
                            >
                              {option.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div
                                className="text-sm font-medium"
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
                        <div className="flex items-center gap-2 p-2">
                          {userOption.avatar ? (
                            <img
                              src={userOption.avatar}
                              alt={userOption.name}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                              style={{ backgroundColor: "#F2742C" }}
                            >
                              {userOption.name?.charAt(0).toUpperCase() ||
                                userOption.email?.charAt(0).toUpperCase() ||
                                "U"}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div
                              className="text-sm font-medium"
                              style={{ color: "#32332D" }}
                            >
                              {userOption.name || userOption.email}
                            </div>
                            <div
                              className="text-xs"
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
                            {/* <Crown className="w-3 h-3" style={{ color: "#AA855B" }} /> */}
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
                  loading={isSearchingModerators}
                  renderInput={(params: any) => (
                    <TextField
                      {...params}
                      placeholder="Search by name or enter email address..."
                      sx={getTextFieldStyles(newCommunityModerators.length > 0)}
                    />
                  )}
                />
              </div>

              {/* Cover Image */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#32332D" }}
                >
                  Cover Image
                </label>
                {newCommunityCoverImagePreview ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <img
                        src={newCommunityCoverImagePreview}
                        alt="Cover preview"
                        className="w-full h-48 object-cover rounded-lg border"
                        style={{ borderColor: "#F0DCC9" }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setNewCommunityCoverImage(null);
                          setNewCommunityCoverImagePreview("");
                          // Mark for deletion if there was an existing cover image
                          if (selectedCommunity?.coverImageUrl) {
                            setShouldDeleteCoverImage(true);
                          }
                        }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors"
                      >
                        <X className="w-4 h-4" style={{ color: "#32332D" }} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 hover:bg-gray-50"
                    style={{ borderColor: "#AA855B" }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.backgroundColor = "#F5F3F0";
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.backgroundColor = "transparent";
                      const files = e.dataTransfer.files;
                      if (files.length > 0) {
                        handleCoverImageChange({ target: { files } } as any);
                      }
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverImageChange}
                      className="hidden"
                      id="edit-community-cover-upload"
                    />
                    <div className="space-y-2">
                      <div
                        className="w-12 h-12 mx-auto rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "#F5F3F0" }}
                      >
                        <Image
                          className="w-6 h-6"
                          style={{ color: "#AA855B" }}
                        />
                      </div>
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "#32332D" }}
                        >
                          Drop image here or click to upload
                        </p>
                        <p className="text-xs" style={{ color: "#AA855B" }}>
                          PNG, JPG (max 10MB)
                        </p>
                      </div>
                      <label
                        htmlFor="edit-community-cover-upload"
                        className="inline-block px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200"
                        style={{
                          backgroundColor: "#F2742C",
                          color: "#F5F5F5",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#E55A1F";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#F2742C";
                        }}
                      >
                        Choose Image
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Fixed Footer */}
          <div
            className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t"
            style={{ borderColor: "#AA855B", backgroundColor: "#FAEFE2" }}
          >
            <div className="flex flex-col-reverse sm:flex-row items-center gap-2 sm:gap-3 sm:justify-end">
              <button
                type="button"
                onClick={handleResetEditModal}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm"
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
                type="button"
                onClick={(e) => {
                  const form = document.getElementById(
                    "edit-community-form",
                  ) as HTMLFormElement;
                  if (form) {
                    form.requestSubmit();
                  }
                }}
                disabled={
                  !newCommunityName.trim() || !newCommunityDescription.trim()
                }
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "#0F5648",
                  color: "#F5F5F5",
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = "#0A4538";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = "#0F5648";
                  }
                }}
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDeleteConfirmModal = () => {
    if (!showDeleteConfirmModal || !communityToDelete) {
      return null;
    }

    if (!canDeleteCommunity(communityToDelete)) {
      return null;
    }

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      >
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: "#32332D" }}>
              Delete Community
            </h3>
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={() => {
                setShowDeleteConfirmModal(false);
                setCommunityToDelete(null);
              }}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={communityToDelete.coverImageUrl}
                alt={communityToDelete.name}
                className="w-14 h-14 rounded-lg object-cover"
              />
              <div>
                <h4 className="font-medium" style={{ color: "#32332D" }}>
                  {communityToDelete.name}
                </h4>
                <p className="text-xs" style={{ color: "#64635E" }}>
                  {communityToDelete.memberCount.toLocaleString()} members •{" "}
                  {communityToDelete.postCount} posts
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
                className="text-sm font-medium mb-2"
                style={{ color: "#EF4444" }}
              >
                ⚠️ Warning: This action cannot be undone
              </p>
              <p className="text-sm" style={{ color: "#64635E" }}>
                Deleting this community will permanently remove all posts,
                comments, and member data. All members will be removed from the
                community.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="confirm-delete"
                className="w-4 h-4 rounded"
                style={{ accentColor: "#EF4444" }}
              />
              <label
                htmlFor="confirm-delete"
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
              onClick={() => {
                setShowDeleteConfirmModal(false);
                setCommunityToDelete(null);
              }}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg font-medium"
              style={{ backgroundColor: "#EF4444", color: "#FFFFFF" }}
              onClick={() => {
                const checkbox = document.getElementById(
                  "confirm-delete",
                ) as HTMLInputElement;
                if (checkbox?.checked && communityToDelete) {
                  handleDeleteCommunity(communityToDelete);
                  setCommunityToDelete(null);
                } else {
                  alert(
                    "Please confirm that you understand this action cannot be undone.",
                  );
                }
              }}
            >
              Delete Community
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderLeaveConfirmModal = () => {
    if (!showLeaveConfirmModal) {
      return null;
    }

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      >
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: "#32332D" }}>
              Leave Community
            </h3>
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={() => setShowLeaveConfirmModal(null)}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={showLeaveConfirmModal.coverImageUrl}
                alt={showLeaveConfirmModal.name}
                className="w-14 h-14 rounded-lg object-cover"
              />
              <div>
                <h4 className="font-medium" style={{ color: "#32332D" }}>
                  {showLeaveConfirmModal.name}
                </h4>
                <p className="text-xs" style={{ color: "#64635E" }}>
                  {showLeaveConfirmModal.memberCount.toLocaleString()} members
                </p>
              </div>
            </div>
            <p className="text-sm" style={{ color: "#64635E" }}>
              Are you sure you want to leave this community? You'll stop
              receiving updates and won't be able to post or comment until you
              join again.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-lg font-medium border transition-colors"
              style={{ borderColor: "#AA855B", color: "#AA855B" }}
              onClick={() => setShowLeaveConfirmModal(null)}
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
              className="px-4 py-2 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: "#F2742C", color: "#FFFFFF" }}
              onClick={async () => {
                if (showLeaveConfirmModal) {
                  await handleLeaveCommunity(showLeaveConfirmModal);
                  setShowLeaveConfirmModal(null);
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#E55A1F";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#F2742C";
              }}
            >
              Leave Community
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderShareCommunityModal = () => {
    if (!showShareCommunity) {
      return null;
    }

    const communityLink = `${window.location.origin}/communities/${showShareCommunity.communityId}`;

    const handleCopyLink = async () => {
      try {
        await navigator.clipboard.writeText(communityLink);
        setShareLinkCopied(true);
        toast.success("Link copied to clipboard!", {
          style: { fontFamily: "'Poppins', sans-serif" },
        });
        setTimeout(() => setShareLinkCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy link:", err);
        toast.error("Failed to copy link", {
          style: { fontFamily: "'Poppins', sans-serif" },
        });
      }
    };

    const handleSendViaMessage = () => {
      setShowShareUserPicker({ type: "community" });
    };

    return (
      <>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowShareCommunity(null);
              setShowShareUserPicker(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3
                className="text-lg font-semibold"
                style={{
                  color: "#32332D",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Share Community
              </h3>
              <button
                className="text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setShowShareCommunity(null)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Community Preview */}
            <div className="space-y-3">
              <div
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ backgroundColor: "#FAEFE2" }}
              >
                {showShareCommunity.coverImageUrl ? (
                  <img
                    src={showShareCommunity.coverImageUrl}
                    alt={showShareCommunity.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "#F0DCC9" }}
                  >
                    <Users className="w-8 h-8" style={{ color: "#AA855B" }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4
                    className="font-semibold text-sm"
                    style={{
                      color: "#32332D",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    {showShareCommunity.name}
                  </h4>
                  <p
                    className="text-xs mt-1 line-clamp-2"
                    style={{ color: "#64635E" }}
                  >
                    {showShareCommunity.description}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#AA855B" }}>
                    {showShareCommunity.memberCount.toLocaleString()} members
                  </p>
                </div>
              </div>
            </div>

            {/* Link Display */}
            <div className="space-y-2">
              <label
                className="text-xs font-medium"
                style={{
                  color: "#32332D",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Link
              </label>
              <div
                className="flex items-center gap-2 p-3 rounded-lg border"
                style={{ borderColor: "#F0DCC9", backgroundColor: "#F5F5F5" }}
              >
                <input
                  type="text"
                  value={communityLink}
                  readOnly
                  className="flex-1 text-xs bg-transparent outline-none"
                  style={{
                    color: "#32332D",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                {shareLinkCopied && (
                  <span
                    className="text-xs font-medium"
                    style={{ color: "#F2742C" }}
                  >
                    Copied!
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 font-medium"
                style={{
                  borderColor: shareLinkCopied ? "#F2742C" : "#F0DCC9",
                  backgroundColor: shareLinkCopied ? "#FDF2E8" : "transparent",
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
                  className="w-5 h-5"
                  style={{ color: shareLinkCopied ? "#F2742C" : "#AA855B" }}
                />
                <span>{shareLinkCopied ? "Link Copied!" : "Copy Link"}</span>
              </button>
              <button
                onClick={handleSendViaMessage}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium"
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
                <MessageCircle className="w-5 h-5" />
                <span>Send via Message</span>
              </button>
            </div>
          </div>
        </div>
        {/* User Picker Modal for Share Community */}
        {showShareUserPicker?.type === "community" &&
          renderShareUserPickerModal(
            "community",
            showShareCommunity,
            communityLink,
          )}
      </>
    );
  };

  const renderReportPostModal = () => {
    if (!showReportPostModal) {
      return null;
    }

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      >
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: "#32332D" }}>
              Report Post
            </h3>
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={() => {
                setShowReportPostModal(null);
                setReportReason("");
                setReportDetails("");
                setReportReasonFocused(false);
              }}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "#32332D" }}
              >
                Reason for reporting *
              </label>
              <div className="relative">
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                  style={{
                    borderColor: "#AA855B",
                    backgroundColor: reportReason ? "#F5F5F5" : "#EDEDED",
                    color: "#32332D",
                    fontSize: "14px",
                    fontFamily: "'Poppins', sans-serif",
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#AA855B";
                    e.target.style.boxShadow = "0 0 0 2px #F2742C";
                    setReportReasonFocused(true);
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#AA855B";
                    e.target.style.boxShadow = "none";
                    setReportReasonFocused(false);
                  }}
                >
                  <option value="">Select a reason</option>
                  <option value="spam">Spam</option>
                  <option value="harassment">Harassment</option>
                  <option value="inappropriate">Inappropriate Content</option>
                  <option value="misinformation">Misinformation</option>
                </select>
                {reportReasonFocused ? (
                  <ChevronUp
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                    style={{ color: "#AA855B" }}
                    size={16}
                  />
                ) : (
                  <ChevronDown
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                    style={{ color: "#AA855B" }}
                    size={16}
                  />
                )}
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "#32332D" }}
              >
                Additional details (optional)
              </label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Please provide any additional information..."
                rows={4}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent resize-none transition-all duration-200"
                style={{
                  ...getInputStyles(reportDetails),
                  fontSize: "14px",
                  fontFamily: "'Poppins', sans-serif",
                }}
                onMouseEnter={(e) =>
                  Object.assign(
                    (e.target as HTMLTextAreaElement).style,
                    getInputHoverStyles(),
                  )
                }
                onMouseLeave={(e) =>
                  Object.assign(
                    (e.target as HTMLTextAreaElement).style,
                    getInputBlurStyles(reportDetails),
                  )
                }
                onFocus={(e) =>
                  Object.assign(
                    (e.target as HTMLTextAreaElement).style,
                    getInputFocusStyles(),
                  )
                }
                onBlur={(e) =>
                  Object.assign(
                    (e.target as HTMLTextAreaElement).style,
                    getInputBlurStyles(reportDetails),
                  )
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-lg font-medium border"
              style={{ borderColor: "#AA855B", color: "#AA855B" }}
              onClick={() => {
                setShowReportPostModal(null);
                setReportReason("");
                setReportDetails("");
                setReportReasonFocused(false);
              }}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#EF4444", color: "#FFFFFF" }}
              onClick={() =>
                handleSubmitReport("post", showReportPostModal.postId)
              }
              disabled={!reportReason.trim()}
            >
              Submit Report
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderReportCommunityModal = () => {
    if (!showReportCommunityModal) {
      return null;
    }

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      >
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: "#32332D" }}>
              Report Community
            </h3>
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={() => {
                setShowReportCommunityModal(null);
                setReportReason("");
                setReportDetails("");
                setReportReasonFocused(false);
              }}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "#32332D" }}
              >
                Reason for reporting *
              </label>
              <div className="relative">
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                  style={{
                    borderColor: "#AA855B",
                    backgroundColor: reportReason ? "#F5F5F5" : "#EDEDED",
                    color: "#32332D",
                    fontSize: "14px",
                    fontFamily: "'Poppins', sans-serif",
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#AA855B";
                    e.target.style.boxShadow = "0 0 0 2px #F2742C";
                    setReportReasonFocused(true);
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#AA855B";
                    e.target.style.boxShadow = "none";
                    setReportReasonFocused(false);
                  }}
                >
                  <option value="">Select a reason</option>
                  <option value="spam">Spam</option>
                  <option value="harassment">Harassment</option>
                  <option value="inappropriate">Inappropriate Content</option>
                  <option value="misinformation">Misinformation</option>
                </select>
                {reportReasonFocused ? (
                  <ChevronUp
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                    style={{ color: "#AA855B" }}
                    size={16}
                  />
                ) : (
                  <ChevronDown
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                    style={{ color: "#AA855B" }}
                    size={16}
                  />
                )}
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "#32332D" }}
              >
                Additional details (optional)
              </label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Please provide any additional information..."
                rows={4}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent resize-none transition-all duration-200"
                style={{
                  ...getInputStyles(reportDetails),
                  fontSize: "14px",
                  fontFamily: "'Poppins', sans-serif",
                }}
                onMouseEnter={(e) =>
                  Object.assign(
                    (e.target as HTMLTextAreaElement).style,
                    getInputHoverStyles(),
                  )
                }
                onMouseLeave={(e) =>
                  Object.assign(
                    (e.target as HTMLTextAreaElement).style,
                    getInputBlurStyles(reportDetails),
                  )
                }
                onFocus={(e) =>
                  Object.assign(
                    (e.target as HTMLTextAreaElement).style,
                    getInputFocusStyles(),
                  )
                }
                onBlur={(e) =>
                  Object.assign(
                    (e.target as HTMLTextAreaElement).style,
                    getInputBlurStyles(reportDetails),
                  )
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-lg font-medium border"
              style={{ borderColor: "#AA855B", color: "#AA855B" }}
              onClick={() => {
                setShowReportCommunityModal(null);
                setReportReason("");
                setReportDetails("");
                setReportReasonFocused(false);
              }}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#EF4444", color: "#FFFFFF" }}
              onClick={() =>
                handleSubmitReport(
                  "community",
                  showReportCommunityModal.communityId,
                )
              }
              disabled={!reportReason.trim()}
            >
              Submit Report
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderEditPostModal = () => {
    if (!showEditPostModal || !selectedPost) {
      return null;
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4">
        <div
          className="max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col rounded-none sm:rounded-2xl"
          style={{
            backgroundColor: "#F5F5F5",
            overflow: "hidden",
          }}
        >
          {/* Fixed Header */}
          <div
            className="p-6 border-b flex-shrink-0"
            style={{ borderColor: "#AA855B", backgroundColor: "#FAEFE2" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#F2742C" }}
                >
                  <Edit3 className="w-4 h-4 text-white" />
                </div>
                <h3
                  className="font-bold"
                  style={{
                    color: "#32332D",
                    fontSize: "1.25rem",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  Edit Post
                </h3>
              </div>
              <button
                onClick={handleCancelEditPost}
                className="p-1 rounded-full transition-all duration-200"
                style={{ color: "#AA855B" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#F0DCC9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Title Field */}
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#32332D" }}
                >
                  Post Title *
                </label>
                <input
                  type="text"
                  value={editPostTitle}
                  onChange={(e) => setEditPostTitle(e.target.value)}
                  placeholder="Post title..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                  style={{
                    ...getInputStyles(editPostTitle),
                    fontSize: "16px",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) =>
                    Object.assign(
                      (e.target as HTMLInputElement).style,
                      getInputHoverStyles(),
                    )
                  }
                  onMouseLeave={(e) =>
                    Object.assign(
                      (e.target as HTMLInputElement).style,
                      getInputBlurStyles(editPostTitle),
                    )
                  }
                  onFocus={(e) =>
                    Object.assign(
                      (e.target as HTMLInputElement).style,
                      getInputFocusStyles(),
                    )
                  }
                  onBlur={(e) =>
                    Object.assign(
                      (e.target as HTMLInputElement).style,
                      getInputBlurStyles(editPostTitle),
                    )
                  }
                />
              </div>

              {/* Content Textarea */}
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#32332D" }}
                >
                  Content *
                </label>
                <textarea
                  value={editPostContent}
                  onChange={(e) => setEditPostContent(e.target.value)}
                  placeholder="Share something with the group..."
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent resize-none transition-all duration-200"
                  style={{
                    ...getInputStyles(editPostContent),
                    fontSize: "14px",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                  rows={4}
                  onMouseEnter={(e) =>
                    Object.assign(
                      (e.target as HTMLTextAreaElement).style,
                      getInputHoverStyles(),
                    )
                  }
                  onMouseLeave={(e) =>
                    Object.assign(
                      (e.target as HTMLTextAreaElement).style,
                      getInputBlurStyles(editPostContent),
                    )
                  }
                  onFocus={(e) =>
                    Object.assign(
                      (e.target as HTMLTextAreaElement).style,
                      getInputFocusStyles(),
                    )
                  }
                  onBlur={(e) =>
                    Object.assign(
                      (e.target as HTMLTextAreaElement).style,
                      getInputBlurStyles(editPostContent),
                    )
                  }
                />
              </div>

              {/* Selected Images (Existing) - Above upload section */}
              {editPostImagePreviews.length > 0 && (
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#32332D" }}
                  >
                    Selected Images ({editPostImagePreviews.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {editPostImagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border"
                          style={{ borderColor: "#F0DCC9" }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveEditPostImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border flex items-center justify-center hover:bg-gray-100 transition-colors"
                          style={{ borderColor: "#F0DCC9" }}
                        >
                          <X className="w-4 h-4" style={{ color: "#32332D" }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Image Upload - Below existing images */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#32332D" }}
                >
                  Add Images
                </label>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 hover:bg-gray-50"
                  style={{ borderColor: "#AA855B" }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.backgroundColor = "#F5F3F0";
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.backgroundColor = "transparent";
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      handlePostImagesFiles(files);
                    }
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handlePostImagesFiles(e.target.files)}
                    className="hidden"
                    id="edit-post-image-upload"
                  />
                  <div className="space-y-2">
                    <div
                      className="w-12 h-12 mx-auto rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#F5F3F0" }}
                    >
                      <Image className="w-6 h-6" style={{ color: "#AA855B" }} />
                    </div>
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{ color: "#32332D" }}
                      >
                        Drop images here or click to upload
                      </p>
                      <p className="text-xs" style={{ color: "#AA855B" }}>
                        PNG, JPG (max 10MB each)
                      </p>
                    </div>
                    <label
                      htmlFor="edit-post-image-upload"
                      className="inline-block px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200"
                      style={{
                        backgroundColor: "#F2742C",
                        color: "#F5F5F5",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#E55A1F";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#F2742C";
                      }}
                    >
                      Choose Images
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div
            className="flex-shrink-0 px-6 py-4 border-t"
            style={{ borderColor: "#AA855B", backgroundColor: "#FAEFE2" }}
          >
            <div className="flex items-center space-x-3 justify-end">
              <button
                type="button"
                onClick={handleCancelEditPost}
                className="px-6 py-3 border rounded-xl transition-all duration-200 font-medium font-['Poppins']"
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
                type="button"
                onClick={handleSaveEditPost}
                disabled={!editPostTitle.trim() || !editPostContent.trim()}
                className="px-6 py-3 text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "#0F5648",
                  color: "#F5F5F5",
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = "#0A4538";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = "#0F5648";
                  }
                }}
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReportCommentModal = () => {
    if (!showReportCommentModal) {
      return null;
    }

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      >
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: "#32332D" }}>
              Report Comment
            </h3>
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={() => {
                setShowReportCommentModal(null);
                setReportReason("");
                setReportDetails("");
                setReportReasonFocused(false);
              }}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "#32332D" }}
              >
                Reason for reporting *
              </label>
              <div className="relative">
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                  style={{
                    borderColor: "#AA855B",
                    backgroundColor: reportReason ? "#F5F5F5" : "#EDEDED",
                    color: "#32332D",
                    fontSize: "14px",
                    fontFamily: "'Poppins', sans-serif",
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#AA855B";
                    e.target.style.boxShadow = "0 0 0 2px #F2742C";
                    setReportReasonFocused(true);
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#AA855B";
                    e.target.style.boxShadow = "none";
                    setReportReasonFocused(false);
                  }}
                >
                  <option value="">Select a reason</option>
                  <option value="spam">Spam</option>
                  <option value="harassment">Harassment</option>
                  <option value="inappropriate">Inappropriate Content</option>
                  <option value="misinformation">Misinformation</option>
                </select>
                {reportReasonFocused ? (
                  <ChevronUp
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                    style={{ color: "#AA855B" }}
                    size={16}
                  />
                ) : (
                  <ChevronDown
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                    style={{ color: "#AA855B" }}
                    size={16}
                  />
                )}
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "#32332D" }}
              >
                Additional details (optional)
              </label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Please provide any additional information..."
                rows={4}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent resize-none transition-all duration-200"
                style={{
                  ...getInputStyles(reportDetails),
                  fontSize: "14px",
                  fontFamily: "'Poppins', sans-serif",
                }}
                onMouseEnter={(e) =>
                  Object.assign(
                    (e.target as HTMLTextAreaElement).style,
                    getInputHoverStyles(),
                  )
                }
                onMouseLeave={(e) =>
                  Object.assign(
                    (e.target as HTMLTextAreaElement).style,
                    getInputBlurStyles(reportDetails),
                  )
                }
                onFocus={(e) =>
                  Object.assign(
                    (e.target as HTMLTextAreaElement).style,
                    getInputFocusStyles(),
                  )
                }
                onBlur={(e) =>
                  Object.assign(
                    (e.target as HTMLTextAreaElement).style,
                    getInputBlurStyles(reportDetails),
                  )
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-lg font-medium border"
              style={{ borderColor: "#AA855B", color: "#AA855B" }}
              onClick={() => {
                setShowReportCommentModal(null);
                setReportReason("");
                setReportDetails("");
                setReportReasonFocused(false);
              }}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#EF4444", color: "#FFFFFF" }}
              onClick={async () => {
                if (!reportReason.trim()) {
                  alert("Please select a reason for reporting.");
                  return;
                }
                try {
                  await handleSubmitReport(
                    "comment",
                    showReportCommentModal.commentId,
                  );
                  setShowReportCommentModal(null);
                  setReportReason("");
                  setReportDetails("");
                  setReportReasonFocused(false);
                } catch (error: any) {
                  console.error("Error submitting comment report:", error);
                  toast.error(error.message || "Failed to submit report");
                }
              }}
              disabled={!reportReason.trim()}
            >
              Submit Report
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      } else if (e.key === "ArrowLeft" && lightboxCurrentIndex > 0) {
        setLightboxCurrentIndex(lightboxCurrentIndex - 1);
      } else if (
        e.key === "ArrowRight" &&
        lightboxCurrentIndex < lightboxImages.length - 1
      ) {
        setLightboxCurrentIndex(lightboxCurrentIndex + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, lightboxCurrentIndex, lightboxImages.length]);

  const renderImageLightbox = () => {
    if (!isLightboxOpen || lightboxImages.length === 0) {
      return null;
    }

    const currentImage = lightboxImages[lightboxCurrentIndex];
    const hasPrevious = lightboxCurrentIndex > 0;
    const hasNext = lightboxCurrentIndex < lightboxImages.length - 1;

    const handlePrevious = () => {
      if (hasPrevious) {
        setLightboxCurrentIndex(lightboxCurrentIndex - 1);
      }
    };

    const handleNext = () => {
      if (hasNext) {
        setLightboxCurrentIndex(lightboxCurrentIndex + 1);
      }
    };

    const handleClose = () => {
      setIsLightboxOpen(false);
      setLightboxImages([]);
      setLightboxCurrentIndex(0);
    };

    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.95)" }}
        onClick={handleClose}
      >
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 z-10 p-2 rounded-full transition-all duration-200 hover:bg-white hover:bg-opacity-20"
          onClick={handleClose}
          style={{ color: "#FFFFFF" }}
          aria-label="Close lightbox"
        >
          <X className="w-8 h-8" />
        </button>

        {/* Previous Button */}
        {hasPrevious && (
          <button
            className="absolute left-4 z-10 p-3 rounded-full transition-all duration-200 hover:bg-white hover:bg-opacity-20"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
            style={{ color: "#FFFFFF" }}
            aria-label="Previous image"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}

        {/* Next Button */}
        {hasNext && (
          <button
            className="absolute right-4 z-10 p-3 rounded-full transition-all duration-200 hover:bg-white hover:bg-opacity-20"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            style={{ color: "#FFFFFF" }}
            aria-label="Next image"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        )}

        {/* Image Container */}
        <div
          className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={currentImage.file_path}
            alt={currentImage.file_name}
            className="max-w-full max-h-[90vh] object-contain"
            style={{ borderRadius: "8px" }}
          />
        </div>

        {/* Image Counter */}
        {lightboxImages.length > 1 && (
          <div
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.6)", color: "#FFFFFF" }}
          >
            <span className="text-sm font-medium font-['Poppins']">
              {lightboxCurrentIndex + 1} / {lightboxImages.length}
            </span>
          </div>
        )}

        {/* Image Name (if available) */}
        {currentImage.file_name && (
          <div
            className="absolute top-16 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg max-w-md text-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.6)", color: "#FFFFFF" }}
          >
            <span className="text-sm font-medium font-['Poppins'] truncate block">
              {currentImage.file_name}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderDeletePostModal = () => {
    if (!showDeletePostModal) {
      return null;
    }

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      >
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: "#32332D" }}>
              Delete Post
            </h3>
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={() => setShowDeletePostModal(null)}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="font-medium mb-1" style={{ color: "#32332D" }}>
                  {showDeletePostModal.title}
                </h4>
                <p
                  className="text-xs text-gray-500 line-clamp-2"
                  style={{ color: "#64635E" }}
                >
                  {showDeletePostModal.excerpt ?? showDeletePostModal.body}
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
                className="text-sm font-medium mb-2"
                style={{ color: "#EF4444" }}
              >
                ⚠️ Warning: This action cannot be undone
              </p>
              <p className="text-sm" style={{ color: "#64635E" }}>
                Deleting this post will permanently remove it and all its
                comments. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="confirm-delete-post"
                className="w-4 h-4 rounded"
                style={{ accentColor: "#EF4444" }}
              />
              <label
                htmlFor="confirm-delete-post"
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
              onClick={() => setShowDeletePostModal(null)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg font-medium"
              style={{ backgroundColor: "#EF4444", color: "#FFFFFF" }}
              onClick={() => {
                const checkbox = document.getElementById(
                  "confirm-delete-post",
                ) as HTMLInputElement;
                if (checkbox?.checked && showDeletePostModal) {
                  confirmDeletePost(showDeletePostModal);
                } else {
                  alert(
                    "Please confirm that you understand this action cannot be undone.",
                  );
                }
              }}
            >
              Delete Post
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFiltersDrawer = () => {
    if (!showFiltersDrawer) return null;

    const renderFiltersContent = () => {
      if (activeTab === "discussions") {
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3
                className="text-lg font-semibold"
                style={{ color: "#32332D" }}
              >
                Filters
              </h3>
              <button
                onClick={() => setShowFiltersDrawer(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" style={{ color: "#64635E" }} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#32332D" }}
                >
                  Community
                </label>
                <div className="relative">
                  <select
                    value={myActivityCommunityFilter || ""}
                    onChange={(e) =>
                      setMyActivityCommunityFilter(
                        e.target.value ? parseInt(e.target.value) : null,
                      )
                    }
                    className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                    style={{
                      borderColor: "#AA855B",
                      backgroundColor: "#FAEFE2",
                      color: "#32332D",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      appearance: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                      backgroundImage: "none",
                    }}
                  >
                    <option value="">All Communities</option>
                    {myActivityCommunities.map((community) => (
                      <option
                        key={community.community_id}
                        value={community.community_id}
                      >
                        {community.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                    style={{ color: "#AA855B" }}
                    size={16}
                  />
                </div>
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#32332D" }}
                >
                  Activity Type
                </label>
                <div className="relative">
                  <select
                    value={myActivityTypeFilter}
                    onChange={(e) =>
                      setMyActivityTypeFilter(
                        e.target.value as "all" | "created" | "commented",
                      )
                    }
                    className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                    style={{
                      borderColor: "#AA855B",
                      backgroundColor: "#FAEFE2",
                      color: "#32332D",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      appearance: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                      backgroundImage: "none",
                    }}
                  >
                    <option value="all">All Activities</option>
                    <option value="created">Posts I Created</option>
                    <option value="commented">Posts I Commented On</option>
                  </select>
                  <ChevronDown
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                    style={{ color: "#AA855B" }}
                    size={16}
                  />
                </div>
              </div>
              <button
                onClick={handleResetMyActivityFilters}
                className="w-full px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                style={{ backgroundColor: "#AA855B", color: "#F5F5F5" }}
              >
                <RefreshCw className="w-4 h-4" />
                Reset Filters
              </button>
            </div>
          </div>
        );
      }

      if (activeTab === "savedPosts") {
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3
                className="text-lg font-semibold"
                style={{ color: "#32332D" }}
              >
                Filters
              </h3>
              <button
                onClick={() => setShowFiltersDrawer(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" style={{ color: "#64635E" }} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#32332D" }}
                >
                  Community
                </label>
                <div className="relative">
                  <select
                    value={savedPostsCommunityFilter || ""}
                    onChange={(e) =>
                      setSavedPostsCommunityFilter(
                        e.target.value ? parseInt(e.target.value) : null,
                      )
                    }
                    className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                    style={{
                      borderColor: "#AA855B",
                      backgroundColor: "#FAEFE2",
                      color: "#32332D",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      appearance: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                      backgroundImage: "none",
                    }}
                  >
                    <option value="">All Communities</option>
                    {savedPostsCommunities.map((community) => (
                      <option
                        key={community.community_id}
                        value={community.community_id}
                      >
                        {community.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                    style={{ color: "#AA855B" }}
                    size={16}
                  />
                </div>
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#32332D" }}
                >
                  Topics
                </label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {savedPostsTopics.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => {
                        if (savedPostsTopicFilter.includes(topic)) {
                          setSavedPostsTopicFilter(
                            savedPostsTopicFilter.filter((t) => t !== topic),
                          );
                        } else {
                          setSavedPostsTopicFilter([
                            ...savedPostsTopicFilter,
                            topic,
                          ]);
                        }
                      }}
                      className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                      style={{
                        backgroundColor: savedPostsTopicFilter.includes(topic)
                          ? "#AA855B"
                          : "#F5F5F5",
                        color: savedPostsTopicFilter.includes(topic)
                          ? "#FFFFFF"
                          : "#32332D",
                      }}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleResetSavedPostsFilters}
                className="w-full px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                style={{ backgroundColor: "#AA855B", color: "#F5F5F5" }}
              >
                <RefreshCw className="w-4 h-4" />
                Reset Filters
              </button>
            </div>
          </div>
        );
      }

      if (activeTab === "communities" || activeTab === "myCommunities") {
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3
                className="text-lg font-semibold"
                style={{ color: "#32332D" }}
              >
                Filters
              </h3>
              <button
                onClick={() => setShowFiltersDrawer(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" style={{ color: "#64635E" }} />
              </button>
            </div>
            <div className="space-y-4">
              {activeTab === "myCommunities" && (
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#32332D" }}
                  >
                    Filter By
                  </label>
                  <div className="relative">
                    <select
                      value={myCommunitiesFilter}
                      onChange={(e) =>
                        setMyCommunitiesFilter(
                          e.target.value as "all" | "created" | "joined",
                        )
                      }
                      className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                      style={{
                        borderColor: "#AA855B",
                        backgroundColor: "#FAEFE2",
                        color: "#32332D",
                        fontSize: "14px",
                        fontFamily: "inherit",
                        appearance: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                        backgroundImage: "none",
                      }}
                    >
                      <option value="all">All Communities</option>
                      <option value="created">Created by you</option>
                      <option value="joined">Joined by you</option>
                    </select>
                    <ChevronDown
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                      style={{ color: "#AA855B" }}
                      size={16}
                    />
                  </div>
                </div>
              )}
              {taxonomyFilters.map((filter) => {
                if (filter.id === "topic") {
                  const selectedTopics = Array.isArray(selectedFilters.topic)
                    ? selectedFilters.topic
                    : [];
                  return (
                    <div key={filter.id}>
                      <label
                        className="block text-sm font-medium mb-2"
                        style={{ color: "#32332D" }}
                      >
                        {filter.label}
                      </label>
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                        {taxonomies
                          .filter(
                            (taxonomy) => taxonomy.taxonomyType === "topic",
                          )
                          .map((taxonomy) => (
                            <button
                              key={taxonomy.taxonomyId}
                              onClick={() => {
                                const currentTopics = Array.isArray(
                                  selectedFilters.topic,
                                )
                                  ? selectedFilters.topic
                                  : [];
                                if (currentTopics.includes(taxonomy.label)) {
                                  setSelectedFilters((prev) => ({
                                    ...prev,
                                    topic: currentTopics.filter(
                                      (t) => t !== taxonomy.label,
                                    ),
                                  }));
                                } else {
                                  setSelectedFilters((prev) => ({
                                    ...prev,
                                    topic: [...currentTopics, taxonomy.label],
                                  }));
                                }
                              }}
                              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                              style={{
                                backgroundColor: selectedTopics.includes(
                                  taxonomy.label,
                                )
                                  ? "#AA855B"
                                  : "#F5F5F5",
                                color: selectedTopics.includes(taxonomy.label)
                                  ? "#FFFFFF"
                                  : "#32332D",
                              }}
                            >
                              {taxonomy.label}
                            </button>
                          ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={filter.id}>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "#32332D" }}
                    >
                      {filter.label}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedFilters[filter.id] as string}
                        onChange={(event) =>
                          handleFilterChange(filter.id, event.target.value)
                        }
                        className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                        style={{
                          borderColor: "#AA855B",
                          backgroundColor: "#FAEFE2",
                          color: "#32332D",
                          fontSize: "14px",
                          fontFamily: "inherit",
                          appearance: "none",
                          WebkitAppearance: "none",
                          MozAppearance: "none",
                          backgroundImage: "none",
                        }}
                      >
                        <option value="all">{filter.label}</option>
                        {taxonomies
                          .filter(
                            (taxonomy) => taxonomy.taxonomyType === filter.id,
                          )
                          .map((taxonomy) => (
                            <option
                              key={taxonomy.taxonomyId}
                              value={taxonomy.label}
                            >
                              {taxonomy.label}
                            </option>
                          ))}
                      </select>
                      <ChevronDown
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                        style={{ color: "#AA855B" }}
                        size={16}
                      />
                    </div>
                  </div>
                );
              })}
              <button
                onClick={handleResetFilters}
                className="w-full px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                style={{ backgroundColor: "#AA855B", color: "#F5F5F5" }}
              >
                <RefreshCw className="w-4 h-4" />
                Reset Filters
              </button>
            </div>
          </div>
        );
      }

      return null;
    };

    return (
      <>
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setShowFiltersDrawer(false)}
        />
        <div
          className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg z-50 lg:hidden max-h-[80vh] overflow-y-auto"
          style={{ borderTop: "2px solid #F0DCC9" }}
        >
          <div className="p-6">{renderFiltersContent()}</div>
        </div>
      </>
    );
  };

  const renderEmptyState = (title: string, description: string) => (
    <div
      className="border rounded-2xl p-10 text-center space-y-3"
      style={{ borderColor: "#F0DCC9", backgroundColor: "#FAEFE2" }}
    >
      <h3 className="text-lg font-semibold" style={{ color: "#32332D" }}>
        {title}
      </h3>
      <p className="text-sm" style={{ color: "#64635E" }}>
        {description}
      </p>
      <button
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
        style={{ backgroundColor: "#F2742C", color: "#FFFFFF" }}
        onClick={() => setShowCreateCommunityModal(true)}
      >
        <Plus className="w-4 h-4" /> Create a Community
      </button>
    </div>
  );

  const renderTabContent = () => {
    // Post detail takes priority (more specific view)
    if (selectedPost) {
      return renderPostDetail();
    }
    if (selectedCommunity) {
      return renderCommunityDetail();
    }

    if (activeTab === "discussions") {
      return (
        <div className="space-y-6">
          {filteredPosts.length === 0
            ? renderEmptyState(
                "No activity yet",
                "Start participating in communities! Create a post or comment on posts to see them here.",
              )
            : filteredPosts.map((post) => renderDiscussionCard(post))}
        </div>
      );
    }

    if (activeTab === "savedPosts") {
      return (
        <div className="space-y-6">
          {filteredSavedPosts.length === 0
            ? renderEmptyState(
                "No saved posts yet",
                "Save posts you find helpful or want to revisit later. Click the bookmark icon on any post to save it.",
              )
            : filteredSavedPosts.map((post) => renderDiscussionCard(post))}
        </div>
      );
    }

    // Check filtered results first (for myCommunities with filters)
    if (currentCommunities.length === 0) {
      // For myCommunities tab with specific filters, show filter-specific messages
      if (activeTab === "myCommunities") {
        if (myCommunitiesFilter === "created") {
          return renderEmptyState(
            "You haven't created any communities yet",
            "Create your own community to connect with parents who share your interests and experiences.",
          );
        } else if (myCommunitiesFilter === "joined") {
          return renderEmptyState(
            "You haven't joined any communities yet",
            "Discover communities aligned with your parenting goals, then join to unlock discussions and events.",
          );
        } else if (myCommunities.length === 0) {
          // No filter, and no communities at all
          return renderEmptyState(
            "You have not joined any communities yet",
            "Discover communities aligned with your parenting goals, then join to unlock discussions and events.",
          );
        } else {
          // Has communities but filters/search resulted in no matches
          return renderEmptyState(
            "No communities match your filters",
            "Adjust your search or filters to see more communities.",
          );
        }
      }

      // For other tabs
      if (activeTab === "communities") {
        // Check if any filters are active
        const hasActiveFilters =
          searchTerm.trim() !== "" ||
          selectedFilters.age_group !== "all" ||
          selectedFilters.stage !== "all" ||
          (Array.isArray(selectedFilters.topic) &&
            selectedFilters.topic.length > 0);

        if (hasActiveFilters) {
          // Filters are active but no results
          return renderEmptyState(
            "No communities match your filters",
            "Try adjusting your search or clearing filters to discover more communities.",
          );
        } else {
          // No filters, truly no communities to discover
          return renderEmptyState(
            "No new communities to discover",
            "You've explored all available communities! Check 'My Communities' to see communities you've joined or created.",
          );
        }
      } else {
        // For other tabs (shouldn't reach here for myCommunities as it's handled above)
        return renderEmptyState(
          "No communities match your filters",
          "Adjust your search or filters to discover more parenting communities.",
        );
      }
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
        {currentCommunities.map((community) => renderCommunityCard(community))}
      </div>
    );
  };

  return (
    <div
      className="min-h-screen pt-20 py-8 font-['Poppins']"
      style={{ backgroundColor: "#FAEFE2" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        {/* Only show Header, View Toggle, and Filters when NOT viewing a detail AND authenticated */}
        {!selectedCommunity && !selectedPost && isAuthenticated && (
          <>
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 md:flex-none md:max-w-xs lg:max-w-none">
                  <h1
                    className="text-2xl sm:text-3xl font-bold mb-2"
                    style={{ color: "#32332D" }}
                  >
                    Community
                  </h1>
                  {/* <p style={{ color: "#AA855B" }}>
                Connect with other caregivers, ask questions, and celebrate
                    milestones in communities tailored to your family's journey.
                  </p> */}
                  <p
                    className="text-sm sm:text-base"
                    style={{ color: "#AA855B" }}
                  >
                    Connect, share, and find support with parents
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 sm:flex-nowrap sm:flex-shrink-0">
                  <button
                    onClick={() => {
                      setSelectedCommunity(null);
                      setSelectedPost(null);
                      setPostDetailSource(null);
                      setOpenPostCardMenu(null);
                      setOpenPostDetailMenu(false);
                      setOpenCommunityCardMenu(null);
                      setActiveTab("savedPosts");
                    }}
                    className={`flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm ${
                      activeTab === "savedPosts" ? "font-semibold" : ""
                    }`}
                    style={{
                      backgroundColor:
                        activeTab === "savedPosts" ? "#F2742C" : "#F5F5F5",
                      color: activeTab === "savedPosts" ? "#FFFFFF" : "#32332D",
                      border:
                        activeTab === "savedPosts"
                          ? "none"
                          : "1px solid #AA855B",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== "savedPosts") {
                        e.currentTarget.style.backgroundColor = "#EDEDED";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== "savedPosts") {
                        e.currentTarget.style.backgroundColor = "#F5F5F5";
                      }
                    }}
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === "savedPosts" ? "fill-current" : ""}`}
                    />
                    <span>Saved ({savedPostIds.length})</span>
                  </button>
                  <button
                    onClick={() => setShowCreateCommunityModal(true)}
                    className="flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg text-xs sm:text-sm"
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
                    <span className="whitespace-nowrap">Create Community</span>
                  </button>
                </div>
              </div>
            </div>

            {/* View Toggle */}
            <div className="mb-4 sm:mb-6">
              <div
                className="flex space-x-1 p-2 rounded-lg overflow-x-auto scrollbar-hide w-fit"
                style={{ backgroundColor: "#FCF9F8" }}
              >
                {COMMUNITY_VIEW_TABS.map((tab) => {
                  const Icon = tab.icon;
                  // Better mobile labels
                  const getMobileLabel = () => {
                    if (tab.id === "communities") return "Discover";
                    if (tab.id === "myCommunities") return "Community";
                    if (tab.id === "discussions") return "Activity";
                    return tab.label.split(" ")[0];
                  };
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setSelectedCommunity(null);
                        setSelectedPost(null);
                        setPostDetailSource(null);
                        setOpenPostCardMenu(null);
                        setOpenPostDetailMenu(false);
                        setOpenCommunityCardMenu(null);
                        setActiveTab(tab.id);
                      }}
                      className={`flex items-center space-x-1 sm:space-x-2 py-1.5 sm:py-2 px-2 sm:px-3 md:px-4 rounded-md text-[10px] sm:text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
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
                      <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{getMobileLabel()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-4 sm:mb-6">
              {/* Search Bar */}
              <div className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5"
                    style={{ color: "#AA855B" }}
                  />
                  <input
                    type="search"
                    placeholder={
                      activeTab === "discussions"
                        ? "Search posts..."
                        : activeTab === "savedPosts"
                          ? "Search saved posts..."
                          : "Search communities..."
                    }
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                    style={{
                      borderColor: "#AA855B",
                      backgroundColor: "#FAEFE2",
                      color: "#32332D",
                      fontSize: "14px",
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
                {/* Mobile Filter Button */}
                {(activeTab === "discussions" ||
                  activeTab === "savedPosts" ||
                  activeTab === "communities" ||
                  activeTab === "myCommunities") && (
                  <button
                    onClick={() => setShowFiltersDrawer(true)}
                    className="lg:hidden px-3 py-2 border rounded-lg transition-all duration-200 flex items-center justify-center"
                    style={{
                      borderColor: "#AA855B",
                      backgroundColor: "#FAEFE2",
                      color: "#32332D",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#FDF2E8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#FAEFE2";
                    }}
                  >
                    <Filter className="w-5 h-5" style={{ color: "#AA855B" }} />
                  </button>
                )}
              </div>

              {/* Filters for My Activity tab */}
              {activeTab === "discussions" && (
                <div className="hidden lg:flex items-center space-x-4 flex-wrap">
                  <Filter className="w-5 h-5" style={{ color: "#AA855B" }} />

                  {/* Community Filter */}
                  <div className="relative">
                    <select
                      value={myActivityCommunityFilter || ""}
                      onChange={(e) =>
                        setMyActivityCommunityFilter(
                          e.target.value ? parseInt(e.target.value) : null,
                        )
                      }
                      className="px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                      style={{
                        borderColor: "#AA855B",
                        backgroundColor: "#FAEFE2",
                        color: "#32332D",
                        fontSize: "14px",
                        fontFamily: "inherit",
                        appearance: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                        backgroundImage: "none",
                      }}
                    >
                      <option value="">All Communities</option>
                      {myActivityCommunities.map((community) => (
                        <option
                          key={community.community_id}
                          value={community.community_id}
                        >
                          {community.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                      style={{ color: "#AA855B" }}
                      size={16}
                    />
                  </div>

                  {/* Activity Type Filter */}
                  <div className="relative">
                    <select
                      value={myActivityTypeFilter}
                      onChange={(e) =>
                        setMyActivityTypeFilter(
                          e.target.value as "all" | "created" | "commented",
                        )
                      }
                      className="px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                      style={{
                        borderColor: "#AA855B",
                        backgroundColor: "#FAEFE2",
                        color: "#32332D",
                        fontSize: "14px",
                        fontFamily: "inherit",
                        appearance: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                        backgroundImage: "none",
                      }}
                    >
                      <option value="all">All Activities</option>
                      <option value="created">Posts I Created</option>
                      <option value="commented">Posts I Commented On</option>
                    </select>
                    <ChevronDown
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                      style={{ color: "#AA855B" }}
                      size={16}
                    />
                  </div>

                  <button
                    onClick={handleResetMyActivityFilters}
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
              )}

              {/* Filters for Saved Posts tab */}
              {activeTab === "savedPosts" && (
                <div className="hidden lg:flex items-center space-x-4 flex-wrap">
                  <Filter className="w-5 h-5" style={{ color: "#AA855B" }} />

                  {/* Community Filter */}
                  <div className="relative">
                    <select
                      value={savedPostsCommunityFilter || ""}
                      onChange={(e) =>
                        setSavedPostsCommunityFilter(
                          e.target.value ? parseInt(e.target.value) : null,
                        )
                      }
                      className="px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                      style={{
                        borderColor: "#AA855B",
                        backgroundColor: "#FAEFE2",
                        color: "#32332D",
                        fontSize: "14px",
                        fontFamily: "inherit",
                        appearance: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                        backgroundImage: "none",
                      }}
                    >
                      <option value="">All Communities</option>
                      {savedPostsCommunities.map((community) => (
                        <option
                          key={community.community_id}
                          value={community.community_id}
                        >
                          {community.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                      style={{ color: "#AA855B" }}
                      size={16}
                    />
                  </div>

                  {/* Topic Filter (multi-select chips) */}
                  <div className="relative">
                    <button
                      ref={(el) => {
                        if (activeTab === "savedPosts") {
                          setTopicsPopoverButtonRef(el);
                        }
                      }}
                      onClick={() => setTopicsPopoverOpen(!topicsPopoverOpen)}
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 flex items-center gap-2"
                      style={{
                        borderColor:
                          savedPostsTopicFilter.length > 0
                            ? "#AA855B"
                            : "#AA855B",
                        backgroundColor:
                          savedPostsTopicFilter.length > 0
                            ? "#FDF2E8"
                            : "#FAEFE2",
                        color: "#32332D",
                        fontSize: "14px",
                        fontFamily: "inherit",
                      }}
                    >
                      <span>Topics</span>
                      {savedPostsTopicFilter.length > 0 && (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: "#AA855B",
                            color: "#FFFFFF",
                          }}
                        >
                          {savedPostsTopicFilter.length}
                        </span>
                      )}
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${topicsPopoverOpen ? "rotate-180" : ""}`}
                        style={{ color: "#AA855B" }}
                      />
                    </button>

                    {/* Topics Popover */}
                    {topicsPopoverOpen && activeTab === "savedPosts" && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setTopicsPopoverOpen(false)}
                        />
                        <div
                          className="fixed bg-white z-50"
                          style={{
                            ...(topicsPopoverButtonRef
                              ? calculatePopoverPosition(topicsPopoverButtonRef)
                              : { top: "200px", right: "20px" }),
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
                              Select Topics
                            </h3>
                            <button
                              onClick={() => setTopicsPopoverOpen(false)}
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

                          {/* Scrollable Topic Chips Section */}
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
                              {savedPostsTopics.map((topic) => (
                                <button
                                  key={topic}
                                  onClick={() => {
                                    if (savedPostsTopicFilter.includes(topic)) {
                                      setSavedPostsTopicFilter(
                                        savedPostsTopicFilter.filter(
                                          (t) => t !== topic,
                                        ),
                                      );
                                    } else {
                                      setSavedPostsTopicFilter([
                                        ...savedPostsTopicFilter,
                                        topic,
                                      ]);
                                    }
                                  }}
                                  style={{
                                    backgroundColor:
                                      savedPostsTopicFilter.includes(topic)
                                        ? "#AA855B"
                                        : "#F5F5F5",
                                    color: savedPostsTopicFilter.includes(topic)
                                      ? "#FFFFFF"
                                      : "#32332D",
                                    border: savedPostsTopicFilter.includes(
                                      topic,
                                    )
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
                                    if (
                                      !savedPostsTopicFilter.includes(topic)
                                    ) {
                                      e.currentTarget.style.borderColor =
                                        "#AA855B";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (
                                      !savedPostsTopicFilter.includes(topic)
                                    ) {
                                      e.currentTarget.style.borderColor =
                                        "#E5E5E5";
                                    }
                                  }}
                                >
                                  {topic}
                                </button>
                              ))}
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
                              onClick={() => setSavedPostsTopicFilter([])}
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
                              onClick={() => setTopicsPopoverOpen(false)}
                              style={{
                                backgroundColor: "#F97316",
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
                                e.currentTarget.style.backgroundColor =
                                  "#EA580C";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#F97316";
                              }}
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={handleResetSavedPostsFilters}
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
              )}

              {activeTab !== "discussions" && activeTab !== "savedPosts" && (
                <div className="hidden lg:flex items-center space-x-4 flex-wrap">
                  <Filter className="w-5 h-5" style={{ color: "#AA855B" }} />

                  {/* Created/Joined Filter - Only show for My Communities tab */}
                  {activeTab === "myCommunities" && (
                    <div className="relative">
                      <select
                        value={myCommunitiesFilter}
                        onChange={(e) =>
                          setMyCommunitiesFilter(
                            e.target.value as "all" | "created" | "joined",
                          )
                        }
                        className="px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                        style={{
                          borderColor: "#AA855B",
                          backgroundColor: "#FAEFE2",
                          color: "#32332D",
                          fontSize: "14px",
                          fontFamily: "inherit",
                          appearance: "none",
                          WebkitAppearance: "none",
                          MozAppearance: "none",
                          backgroundImage: "none",
                        }}
                        onFocus={() => setMyCommunitiesFilterFocused(true)}
                        onBlur={() => setMyCommunitiesFilterFocused(false)}
                      >
                        <option value="all">All Communities</option>
                        <option value="created">Created by you</option>
                        <option value="joined">Joined by you</option>
                      </select>
                      {myCommunitiesFilterFocused ? (
                        <ChevronUp
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                          style={{ color: "#AA855B" }}
                          size={16}
                        />
                      ) : (
                        <ChevronDown
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                          style={{ color: "#AA855B" }}
                          size={16}
                        />
                      )}
                    </div>
                  )}

                  {taxonomyFilters.map((filter) => {
                    // Topic filter uses popover with chips
                    if (filter.id === "topic") {
                      const selectedTopics = Array.isArray(
                        selectedFilters.topic,
                      )
                        ? selectedFilters.topic
                        : [];
                      return (
                        <div key={filter.id} className="relative">
                          <button
                            ref={(el) => setTopicsPopoverButtonRef(el)}
                            onClick={() =>
                              setTopicsPopoverOpen(!topicsPopoverOpen)
                            }
                            className="px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 flex items-center gap-2"
                            style={{
                              borderColor:
                                selectedTopics.length > 0
                                  ? "#AA855B"
                                  : "#AA855B",
                              backgroundColor:
                                selectedTopics.length > 0
                                  ? "#FDF2E8"
                                  : "#FAEFE2",
                              color: "#32332D",
                              fontSize: "14px",
                              fontFamily: "inherit",
                            }}
                          >
                            <span>{filter.label}</span>
                            {selectedTopics.length > 0 && (
                              <span
                                className="px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: "#AA855B",
                                  color: "#FFFFFF",
                                }}
                              >
                                {selectedTopics.length}
                              </span>
                            )}
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${topicsPopoverOpen ? "rotate-180" : ""}`}
                              style={{ color: "#AA855B" }}
                            />
                          </button>

                          {/* Topics Popover */}
                          {topicsPopoverOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setTopicsPopoverOpen(false)}
                              />
                              <div
                                className="fixed bg-white z-50"
                                style={{
                                  ...(topicsPopoverButtonRef
                                    ? calculatePopoverPosition(
                                        topicsPopoverButtonRef,
                                      )
                                    : { top: "200px", right: "20px" }),
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
                                    Select Topics
                                  </h3>
                                  <button
                                    onClick={() => setTopicsPopoverOpen(false)}
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

                                {/* Scrollable Topic Chips Section */}
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
                                    {taxonomies
                                      .filter(
                                        (taxonomy) =>
                                          taxonomy.taxonomyType === "topic",
                                      )
                                      .map((taxonomy) => (
                                        <button
                                          key={taxonomy.taxonomyId}
                                          onClick={() =>
                                            handleTopicFilterToggle(
                                              taxonomy.label,
                                            )
                                          }
                                          style={{
                                            backgroundColor:
                                              selectedTopics.includes(
                                                taxonomy.label,
                                              )
                                                ? "#AA855B"
                                                : "#F5F5F5",
                                            color: selectedTopics.includes(
                                              taxonomy.label,
                                            )
                                              ? "#FFFFFF"
                                              : "#32332D",
                                            border: selectedTopics.includes(
                                              taxonomy.label,
                                            )
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
                                            if (
                                              !selectedTopics.includes(
                                                taxonomy.label,
                                              )
                                            ) {
                                              e.currentTarget.style.borderColor =
                                                "#AA855B";
                                            }
                                          }}
                                          onMouseLeave={(e) => {
                                            if (
                                              !selectedTopics.includes(
                                                taxonomy.label,
                                              )
                                            ) {
                                              e.currentTarget.style.borderColor =
                                                "#E5E5E5";
                                            }
                                          }}
                                        >
                                          {taxonomy.label}
                                        </button>
                                      ))}
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
                                    onClick={clearTopicFilters}
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
                                    onClick={() => setTopicsPopoverOpen(false)}
                                    style={{
                                      backgroundColor: "#F97316",
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
                                      e.currentTarget.style.backgroundColor =
                                        "#EA580C";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        "#F97316";
                                    }}
                                  >
                                    Done
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    }

                    // Age Group and Stage use dropdown
                    return (
                      <div key={filter.id} className="relative">
                        <select
                          value={selectedFilters[filter.id] as string}
                          onChange={(event) =>
                            handleFilterChange(filter.id, event.target.value)
                          }
                          onFocus={() => setFocusedFilterSelect(filter.id)}
                          onBlur={() => setFocusedFilterSelect(null)}
                          className="px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 custom-select"
                          style={{
                            borderColor: "#AA855B",
                            backgroundColor: "#FAEFE2",
                            color: "#32332D",
                            fontSize: "14px",
                            fontFamily: "inherit",
                            appearance: "none",
                            WebkitAppearance: "none",
                            MozAppearance: "none",
                            backgroundImage: "none",
                          }}
                        >
                          <option value="all">{filter.label}</option>
                          {taxonomies
                            .filter(
                              (taxonomy) => taxonomy.taxonomyType === filter.id,
                            )
                            .map((taxonomy) => (
                              <option
                                key={taxonomy.taxonomyId}
                                value={taxonomy.label}
                              >
                                {taxonomy.label}
                              </option>
                            ))}
                        </select>
                        {focusedFilterSelect === filter.id ? (
                          <ChevronUp
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                            style={{ color: "#AA855B" }}
                            size={16}
                          />
                        ) : (
                          <ChevronDown
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                            style={{ color: "#AA855B" }}
                            size={16}
                          />
                        )}
                      </div>
                    );
                  })}

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
              )}
            </div>
          </>
        )}

        {renderTabContent()}
      </div>

      {renderShareModal()}
      {renderShareCommunityModal()}
      {renderCreateCommunityModal()}
      {renderEditCommunityModal()}
      {renderDeleteConfirmModal()}
      {renderLeaveConfirmModal()}
      {renderReportPostModal()}
      {renderReportCommunityModal()}
      {renderDeletePostModal()}
      {renderEditPostModal()}
      {renderReportCommentModal()}
      {renderImageLightbox()}
      {renderFiltersDrawer()}
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

export default CommunityPage;
