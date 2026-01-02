// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: PrivateMessagePage.tsx
// Description: To provide interface for parent users to send and receive private messages with other users
// First Written on: Saturday, 04-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state, lifecycle, callbacks, and refs
import React, { useState, useEffect, useCallback, useRef } from "react";
// Import React Router hooks for navigation
import { useNavigate, useLocation } from "react-router-dom";
// Import lucide-react icons for UI elements
import {
  MessageSquare,
  Send,
  Search,
  MoreHorizontal,
  X,
  Video,
  Smile,
  Trash2,
  Check,
  CheckCheck,
  Paperclip,
  File,
  FileText,
  Download,
} from "lucide-react";
// Import API functions for private messaging operations
import {
  getPrivateConversations,
  getPrivateConversationMessages,
  sendMessage,
  createPrivateConversation,
  markPrivateConversationRead,
  deletePrivateConversation,
  searchUsersForMessage,
  uploadMessageAttachment,
  addMessageReaction,
  removeMessageReaction,
  deletePrivateMessage,
  getParentProfile,
  getProfessionalProfile,
} from "../services/api";
// Import toast notification components
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Import API base URL configuration
import { API_BASE_URL } from "../config/api";

/**
 * Type definitions for private messaging system
 */

/**
 * ConversationParticipant interface
 * Defines the structure of a conversation participant
 */
interface ConversationParticipant {
  user_id: number;
  name: string;
  avatar: string | null;
}

/**
 * MessageAttachment interface
 * Defines the structure of a message attachment
 */
interface MessageAttachment {
  attachment_id: number;
  message_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

/**
 * MessageReaction interface
 * Defines the structure of a message reaction
 */
interface MessageReaction {
  reaction_id: number;
  message_id: number;
  user_id: number;
  user_name: string | null;
  user_avatar: string | null;
  reaction_type: string;
  created_at: string;
}

/**
 * PrivateMessage interface
 * Defines the structure of a private message
 */
interface PrivateMessage {
  message_id: number;
  conversation_id: number;
  sender_id: number;
  recipient_id: number;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  attachments: MessageAttachment[] | null;
  reactions: MessageReaction[] | null;
}

/**
 * Conversation interface
 * Defines the structure of a conversation with metadata
 */
interface Conversation {
  conversation_id: number;
  participant: ConversationParticipant;
  last_message: PrivateMessage | null;
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
}

/**
 * SearchUser interface
 * Defines the structure of a user in search results
 */
interface SearchUser {
  user_id: number;
  email: string;
  name: string;
  avatar: string | null;
}

/**
 * Available reaction types for messages
 * Defines emoji reactions users can add to messages
 */
const REACTION_TYPES = [
  { type: "like", emoji: "👍", label: "Like" },
  { type: "love", emoji: "❤️", label: "Love" },
  { type: "laugh", emoji: "😂", label: "Laugh" },
  { type: "support", emoji: "🤗", label: "Support" },
  { type: "helpful", emoji: "✅", label: "Helpful" },
];

/**
 * PrivateMessagePage Component
 * 
 * Provides interface for parent users to send and receive private messages with other users.
 * Features include:
 * - Conversation list
 * - Real-time messaging via SSE
 * - Message attachments
 * - Message reactions
 * - User search for new conversations
 * - Read receipts
 * - Message deletion
 * 
 * @returns JSX element representing the private messages page
 */
const PrivateMessagePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem("auth_token");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("User");

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Messages
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<number | null>(null);
  const isInitialLoadRef = useRef<boolean>(false);
  const lastCheckedConversationRef = useRef<{
    conversation_id: number;
    last_message_at: string | null;
    unread_count: number;
  } | null>(null);
  // Refs to access latest values in SSE handlers without causing reconnections
  const selectedConversationRef = useRef<Conversation | null>(null);
  const fetchMessagesRef = useRef<
    | ((
        conversationId: number,
        page?: number,
        append?: boolean,
      ) => Promise<void>)
    | null
  >(null);
  const fetchConversationsRef = useRef<(() => Promise<void>) | null>(null);
  // Flag to prevent watch effect from triggering while we're fetching messages
  const isFetchingMessagesRef = useRef<boolean>(false);

  // UI State
  const [messageInput, setMessageInput] = useState("");
  const [conversationSearchTerm, setConversationSearchTerm] = useState("");

  // Inline search for users (dual-purpose search)
  const [userSearchResults, setUserSearchResults] = useState<SearchUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Message attachments
  const [messageAttachments, setMessageAttachments] = useState<File[]>([]);
  const [messageAttachmentPreviews, setMessageAttachmentPreviews] = useState<
    Array<{ type: "image" | "video" | "file"; url?: string; file?: File }>
  >([]);

  // Message reactions
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<number | null>(
    null,
  );

  // Delete confirmation
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] =
    useState<Conversation | null>(null);

  // Menu states
  const [showMessageThreadMenu, setShowMessageThreadMenu] = useState(false);
  const [openConversationMenu, setOpenConversationMenu] = useState<
    number | null
  >(null);
  const [openMessageMenu, setOpenMessageMenu] = useState<number | null>(null);

  // Delete message confirmation
  const [showDeleteMessageModal, setShowDeleteMessageModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<PrivateMessage | null>(
    null,
  );

  // Mobile view
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 1024);

  // Resizable splitter for conversation list width
  const [conversationListWidth, setConversationListWidth] = useState(30); // Percentage
  const [isResizing, setIsResizing] = useState(false);
  const splitterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle splitter drag for resizing conversation list
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const container = splitterRef.current?.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newWidth =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Constrain between 20% and 50%
      const constrainedWidth = Math.max(20, Math.min(50, newWidth));
      setConversationListWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (
        showMessageThreadMenu &&
        !target.closest("[data-message-thread-menu]")
      ) {
        setShowMessageThreadMenu(false);
      }

      if (
        openConversationMenu !== null &&
        !target.closest(`[data-conversation-menu="${openConversationMenu}"]`)
      ) {
        setOpenConversationMenu(null);
      }

      if (
        openMessageMenu !== null &&
        !target.closest(`[data-message-menu="${openMessageMenu}"]`)
      ) {
        setOpenMessageMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMessageThreadMenu, openConversationMenu, openMessageMenu]);

  // Close menus on scroll (common UX pattern - menus should close when user scrolls)
  useEffect(() => {
    const handleScroll = () => {
      // Close all open menus when user scrolls
      if (showMessageThreadMenu) {
        setShowMessageThreadMenu(false);
      }
      if (openConversationMenu !== null) {
        setOpenConversationMenu(null);
      }
      if (openMessageMenu !== null) {
        setOpenMessageMenu(null);
      }
    };

    // Listen for scroll on messages container
    const messagesContainer = messagesContainerRef.current;
    if (messagesContainer) {
      messagesContainer.addEventListener("scroll", handleScroll, {
        passive: true,
      });
    }

    // Also listen for window scroll as fallback
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (messagesContainer) {
        messagesContainer.removeEventListener("scroll", handleScroll);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, [showMessageThreadMenu, openConversationMenu, openMessageMenu]);

  // Get current user info
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

            // Fetch user profile to get display name and avatar
            // Handles missing profiles gracefully - falls back to email prefix if profile doesn't exist
            try {
              if (userData.role === "parent") {
                const profileResponse = await getParentProfile();
                // Handle null profile (profile doesn't exist yet - user skipped setup)
                // Use email prefix as fallback display name
                if (profileResponse === null) {
                  setCurrentUserName(userEmail ? userEmail.split("@")[0] : "User");
                } else {
                  // Profile exists - use profile data for name and avatar
                  if (profileResponse?.profile_picture_url) {
                    setCurrentUserAvatar(profileResponse.profile_picture_url);
                  }
                  const name =
                    profileResponse?.first_name && profileResponse?.last_name
                      ? `${profileResponse.first_name} ${profileResponse.last_name}`
                      : profileResponse?.first_name ||
                        userEmail.split("@")[0] ||
                        "User";
                  setCurrentUserName(name);
                }
              } else if (userData.role === "professional") {
                const profileResponse = await getProfessionalProfile();
                // Handle null profile (profile doesn't exist yet - user skipped setup)
                // Use email prefix as fallback display name
                if (profileResponse === null) {
                  setCurrentUserName(userEmail ? userEmail.split("@")[0] : "User");
                } else {
                  // Profile exists - use profile data for name and avatar
                  const profileData = profileResponse?.profile || profileResponse;
                  if (profileData?.profile_picture_url) {
                    setCurrentUserAvatar(profileData.profile_picture_url);
                  }
                  const name =
                    profileData?.business_name ||
                    userEmail.split("@")[0] ||
                    "User";
                  setCurrentUserName(name);
                }
              }
            } catch (profileErr) {
              // Fallback to email prefix if profile fetch fails
              console.error("Error fetching user profile:", profileErr);
              setCurrentUserName(userEmail ? userEmail.split("@")[0] : "User");
            }
          }
        } catch (e) {
          console.error("Error getting user ID:", e);
        }
      }
    };
    fetchUserInfo();
  }, [isAuthenticated]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoadingConversations(true);
    try {
      const data = await getPrivateConversations();
      setConversations(data);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      toast.error(error.message || "Failed to load conversations");
    } finally {
      setLoadingConversations(false);
    }
  }, [isAuthenticated]);

  // Initial fetch of conversations (only once on mount, SSE will handle updates)
  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    }
  }, [isAuthenticated, fetchConversations]);

  // Fetch messages for selected conversation
  // Always replaces all messages and scrolls to bottom to show latest messages
  const fetchMessages = useCallback(
    async (
      conversationId: number,
      page: number = 1,
      append: boolean = false,
    ) => {
      if (!isAuthenticated) return;

      // Prevent duplicate calls
      if (isFetchingMessagesRef.current) {
        console.log(
          "🔵 DEBUG: fetchMessages called but already fetching, skipping",
        );
        return;
      }

      console.log(
        `🔵 DEBUG: fetchMessages called for conversation ${conversationId}, page ${page}, append ${append}`,
      );
      console.trace("🔵 DEBUG: fetchMessages call stack");

      // Set flag to prevent watch effect from triggering
      isFetchingMessagesRef.current = true;
      setLoadingMessages(true);
      try {
        const data = await getPrivateConversationMessages(
          conversationId,
          page,
          50,
        );

        // Check if there are new messages (compare last message ID)
        const newLastMessageId =
          data.length > 0 ? data[data.length - 1].message_id : null;

        // Replace all messages (always get latest state)
        if (append) {
          setMessages((prev) => [...data, ...prev]);
        } else {
          setMessages(data);
        }

        // Always scroll to bottom after refresh to show latest messages
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);

        // Update last message ID
        if (newLastMessageId) {
          lastMessageIdRef.current = newLastMessageId;
        }

        setHasMoreMessages(data.length === 50);
        setCurrentPage(page);

        // Update last checked state BEFORE marking as read to prevent watch effect from triggering
        // This prevents the loop: fetchMessages -> mark as read -> SSE conversation_updated -> watch effect -> fetchMessages
        // We set unread_count to 0 because we're about to mark messages as read
        // We preserve last_message_at from selectedConversation or from the ref
        const currentLastMessageAt =
          selectedConversationRef.current?.conversation_id === conversationId
            ? selectedConversationRef.current.last_message_at
            : lastCheckedConversationRef.current?.conversation_id ===
                conversationId
              ? lastCheckedConversationRef.current.last_message_at
              : null;

        // NOTE: get_messages endpoint already marks messages as read, so we don't need to call markPrivateConversationRead
        // This prevents the loop: fetchMessages -> get_messages (marks as read) -> SSE conversation_updated -> watch effect -> fetchMessages
        // The get_messages endpoint marks messages as read but doesn't send SSE, so we update the ref to prevent watch effect from triggering
        lastCheckedConversationRef.current = {
          conversation_id: conversationId,
          last_message_at: currentLastMessageAt,
          unread_count: 0, // Messages are already marked as read by get_messages endpoint
        };

        // Don't call markPrivateConversationRead here - get_messages already marks messages as read
        // Don't call fetchConversations() here - SSE will update conversations automatically
        // This prevents infinite loops where fetchMessages -> fetchConversations -> conversations change -> fetchMessages
      } catch (error: any) {
        console.error("Error fetching messages:", error);
        toast.error(error.message || "Failed to load messages");
        isFetchingMessagesRef.current = false; // Clear flag on error
      } finally {
        setLoadingMessages(false);
        // Clear flag after a longer delay to allow SSE events to settle and be processed
        setTimeout(() => {
          console.log(
            `🔵 DEBUG: Clearing isFetchingMessagesRef flag for conversation ${conversationId}`,
          );
          isFetchingMessagesRef.current = false;
        }, 2000); // Increased to 2 seconds to ensure SSE events are fully processed
      }
    },
    [isAuthenticated],
  );

  // Store fetchConversations in ref for SSE handler (after function definition)
  useEffect(() => {
    fetchConversationsRef.current = fetchConversations;
  }, [fetchConversations]);

  // Store fetchMessages in ref for SSE handler (after function definition)
  useEffect(() => {
    fetchMessagesRef.current = fetchMessages;
  }, [fetchMessages]);

  // Store selectedConversation in ref for SSE handler
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // SSE connection for real-time updates
  useEffect(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem("auth_token");
    const streamUrl = token
      ? `${API_BASE_URL}/api/messages/stream?token=${encodeURIComponent(token)}`
      : `${API_BASE_URL}/api/messages/stream`;

    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          console.log("Messages SSE connection established");
          // Update conversations with initial list from server
          if (data.conversations && Array.isArray(data.conversations)) {
            setConversations(data.conversations);
          }
          return;
        }

        if (data.type === "new_message") {
          // New message received - update conversation list
          if (data.conversation_update) {
            setConversations((prev) => {
              const existingIndex = prev.findIndex(
                (c) => c.conversation_id === data.conversation_id,
              );
              if (existingIndex >= 0) {
                // Update existing conversation
                const updated = [...prev];
                updated[existingIndex] = data.conversation_update;
                // Move to top (most recent)
                const [updatedConv] = updated.splice(existingIndex, 1);
                return [updatedConv, ...updated];
              } else {
                // New conversation - add to top
                return [data.conversation_update, ...prev];
              }
            });

            // If this conversation is currently selected, refresh messages
            if (
              selectedConversationRef.current?.conversation_id ===
                data.conversation_id &&
              fetchMessagesRef.current
            ) {
              fetchMessagesRef.current(data.conversation_id, 1, false);
            }
          }
          return;
        }

        if (data.type === "conversation_updated") {
          // Conversation metadata updated (unread count, last message, etc.)
          setConversations((prev) => {
            const existingIndex = prev.findIndex(
              (c) => c.conversation_id === data.conversation_id,
            );
            if (existingIndex >= 0) {
              const updated = [...prev];
              const oldConv = prev[existingIndex];
              updated[existingIndex] = data.conversation;

              // Move to top if last_message_at changed to a later time (new message/reaction)
              // Don't move if only unread_count changed (messages were read)
              if (
                data.conversation.last_message_at &&
                oldConv.last_message_at &&
                new Date(data.conversation.last_message_at) >
                  new Date(oldConv.last_message_at)
              ) {
                const [updatedConv] = updated.splice(existingIndex, 1);
                return [updatedConv, ...updated];
              }
              return updated;
            }
            return prev;
          });

          // Update selected conversation if it's the one that changed
          // Also update lastCheckedConversationRef if we're currently fetching to prevent loop
          if (
            selectedConversationRef.current?.conversation_id ===
            data.conversation_id
          ) {
            console.log(
              `🔵 DEBUG: SSE conversation_updated event for selected conversation ${data.conversation_id}`,
              {
                isFetching: isFetchingMessagesRef.current,
                unread_count: data.conversation.unread_count,
                last_message_at: data.conversation.last_message_at,
              },
            );

            setSelectedConversation(data.conversation);

            // If we're currently fetching messages, update the ref to match expected state
            // This prevents the watch effect from seeing a change and triggering another fetch
            if (
              isFetchingMessagesRef.current &&
              lastCheckedConversationRef.current &&
              lastCheckedConversationRef.current.conversation_id ===
                data.conversation_id
            ) {
              console.log(
                `🔵 DEBUG: Updating lastCheckedConversationRef during fetch to prevent loop`,
              );
              // Update ref to match the SSE update (which should have unread_count = 0 after marking as read)
              lastCheckedConversationRef.current = {
                conversation_id: data.conversation_id,
                last_message_at: data.conversation.last_message_at,
                unread_count: data.conversation.unread_count,
              };
            }
          }
          return;
        }

        if (data.type === "message_reaction") {
          // Message reaction added/updated
          if (data.conversation_update) {
            setConversations((prev) => {
              const existingIndex = prev.findIndex(
                (c) => c.conversation_id === data.conversation_id,
              );
              if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = data.conversation_update;
                // Move to top (reaction updates last_message_at)
                const [updatedConv] = updated.splice(existingIndex, 1);
                return [updatedConv, ...updated];
              }
              return prev;
            });

            // If this conversation is currently selected, refresh messages to show new reaction
            if (
              selectedConversationRef.current?.conversation_id ===
                data.conversation_id &&
              fetchMessagesRef.current
            ) {
              console.log(
                `🔵 DEBUG: SSE message_reaction event - calling fetchMessages for conversation ${data.conversation_id}`,
              );
              fetchMessagesRef.current(data.conversation_id, 1, false);
            }
          }
          return;
        }

        if (data.type === "conversation_deleted") {
          // Conversation deleted - remove from list
          setConversations((prev) =>
            prev.filter((c) => c.conversation_id !== data.conversation_id),
          );

          // Clear selection if deleted conversation was selected
          if (
            selectedConversationRef.current?.conversation_id ===
            data.conversation_id
          ) {
            setSelectedConversation(null);
            setMessages([]);
          }
          return;
        }
      } catch (error) {
        console.error("Error parsing SSE message:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("Messages SSE connection error:", error);
      // EventSource will automatically reconnect
      // Only do a fallback fetch if connection is closed
      if (
        eventSource.readyState === EventSource.CLOSED &&
        fetchConversationsRef.current
      ) {
        console.log("Messages SSE connection closed, doing fallback fetch");
        fetchConversationsRef.current();
      }
    };

    eventSource.onopen = () => {
      console.log("Messages SSE connection opened successfully");
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, [isAuthenticated]); // Only depend on isAuthenticated - use refs for other values

  // Watch for changes in conversations to detect new messages/reactions
  // This runs when conversations list updates (via SSE) and checks if selected conversation has updates
  useEffect(() => {
    const currentSelectedId = selectedConversation?.conversation_id;
    if (!currentSelectedId || conversations.length === 0) return;

    // Don't trigger if we're currently fetching messages (prevents loop)
    if (isFetchingMessagesRef.current) {
      console.log(
        "🔵 DEBUG: Watch effect skipped - isFetchingMessagesRef is true",
      );
      return;
    }

    const updatedConv = conversations.find(
      (c: Conversation) => c.conversation_id === currentSelectedId,
    );
    if (!updatedConv) return;

    // Compare with last checked state to avoid infinite loops
    const lastChecked = lastCheckedConversationRef.current;

    // Skip if we've already checked this exact state
    if (
      lastChecked &&
      lastChecked.conversation_id === updatedConv.conversation_id &&
      lastChecked.last_message_at === updatedConv.last_message_at &&
      lastChecked.unread_count === updatedConv.unread_count
    ) {
      // No changes, just update selectedConversation if needed (without triggering refresh)
      if (
        selectedConversation &&
        (selectedConversation.last_message_at !== updatedConv.last_message_at ||
          selectedConversation.unread_count !== updatedConv.unread_count)
      ) {
        console.log(
          "🔵 DEBUG: Watch effect - updating selectedConversation without refresh",
        );
        setSelectedConversation(updatedConv);
      }
      return;
    }

    console.log("🔵 DEBUG: Watch effect triggered", {
      conversationId: updatedConv.conversation_id,
      lastChecked: lastChecked,
      updatedConv: {
        last_message_at: updatedConv.last_message_at,
        unread_count: updatedConv.unread_count,
      },
    });

    // Check if there are new messages/reactions
    // IMPORTANT: Only trigger if unread_count INCREASED, not decreased (decrease means messages were read)
    const hasNewMessages =
      !lastChecked || // First time checking
      lastChecked.conversation_id !== updatedConv.conversation_id || // Different conversation
      updatedConv.unread_count > (lastChecked.unread_count || 0) || // Unread count increased (new messages)
      (updatedConv.last_message_at &&
        lastChecked.last_message_at &&
        new Date(updatedConv.last_message_at).getTime() >
          new Date(lastChecked.last_message_at).getTime()); // New message/reaction (only if last_message_at actually changed to a later time)

    console.log("🔵 DEBUG: Watch effect - hasNewMessages:", hasNewMessages, {
      noLastChecked: !lastChecked,
      differentConversation:
        lastChecked &&
        lastChecked.conversation_id !== updatedConv.conversation_id,
      unreadIncreased:
        lastChecked &&
        updatedConv.unread_count > (lastChecked.unread_count || 0),
      lastMessageAtIncreased:
        updatedConv.last_message_at &&
        lastChecked?.last_message_at &&
        new Date(updatedConv.last_message_at).getTime() >
          new Date(lastChecked.last_message_at).getTime(),
    });

    // Update last checked state IMMEDIATELY to prevent loop (BEFORE checking hasNewMessages)
    lastCheckedConversationRef.current = {
      conversation_id: updatedConv.conversation_id,
      last_message_at: updatedConv.last_message_at,
      unread_count: updatedConv.unread_count,
    };

    // If there are new messages/reactions, refresh the message container
    // Only refresh if user is at bottom to avoid scroll jumps
    if (hasNewMessages) {
      const container = messagesContainerRef.current;
      const isAtBottom = container
        ? container.scrollHeight -
            container.scrollTop -
            container.clientHeight <
          100
        : false;

      console.log(
        "🔵 DEBUG: Watch effect - hasNewMessages is true, isAtBottom:",
        isAtBottom,
      );

      // Only refresh if user is at bottom (to avoid scroll jumps)
      if (isAtBottom && fetchMessagesRef.current) {
        console.log("🔵 DEBUG: Watch effect - calling fetchMessages via ref");
        fetchMessagesRef.current(currentSelectedId, 1, false);
      } else {
        console.log(
          "🔵 DEBUG: Watch effect - not at bottom or fetchMessagesRef not available, skipping fetchMessages",
        );
      }
    } else {
      console.log(
        "🔵 DEBUG: Watch effect - no new messages, just updating selectedConversation",
      );
    }

    // Update selected conversation with latest data (but don't include it in deps to avoid loop)
    // Only update if values actually changed to prevent unnecessary re-renders
    if (
      selectedConversation &&
      (selectedConversation.last_message_at !== updatedConv.last_message_at ||
        selectedConversation.unread_count !== updatedConv.unread_count)
    ) {
      setSelectedConversation(updatedConv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, selectedConversation?.conversation_id]); // Only depend on conversation ID, not the whole object or fetchMessages

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      console.log(
        `🔵 DEBUG: Conversation selected: ${selectedConversation.conversation_id}`,
      );
      isInitialLoadRef.current = true; // Mark as initial load
      lastMessageIdRef.current = null; // Reset last message ID
      // Reset last checked conversation state BEFORE fetching
      // This ensures the watch effect doesn't trigger when we're loading messages
      lastCheckedConversationRef.current = {
        conversation_id: selectedConversation.conversation_id,
        last_message_at: selectedConversation.last_message_at,
        unread_count: selectedConversation.unread_count || 0,
      };
      // Set flag to prevent watch effect from triggering during initial load
      isFetchingMessagesRef.current = true;
      console.log(
        `🔵 DEBUG: Calling fetchMessages from conversation selection effect`,
      );
      fetchMessages(selectedConversation.conversation_id, 1, false);
      // Close menus when conversation changes
      setShowMessageThreadMenu(false);
      setOpenConversationMenu(null);
    } else {
      console.log("🔵 DEBUG: Conversation deselected");
      setMessages([]);
      lastMessageIdRef.current = null;
      lastCheckedConversationRef.current = null;
      isFetchingMessagesRef.current = false;
    }
  }, [selectedConversation, fetchMessages]);

  // Handle messageId from URL (for deep linking from notifications)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const messageIdFromUrl = searchParams.get("messageId");

    if (messageIdFromUrl && conversations.length > 0 && currentUserId) {
      const targetMessageId = parseInt(messageIdFromUrl);

      // Find the conversation that contains this message
      const findConversationForMessage = async () => {
        // Check all conversations to find which one contains this message
        for (const conv of conversations) {
          try {
            // Fetch messages for this conversation to check if it contains the target message
            const convMessages = await getPrivateConversationMessages(
              conv.conversation_id,
              1,
              100,
            );
            const foundMessage = convMessages.find(
              (msg: PrivateMessage) => msg.message_id === targetMessageId,
            );

            if (foundMessage) {
              // Found the conversation! Select it
              setSelectedConversation(conv);

              // Wait for messages to load, then scroll to the specific message
              setTimeout(() => {
                const messageElement = document.querySelector(
                  `[data-message-id="${targetMessageId}"]`,
                ) as HTMLElement;
                if (messageElement) {
                  messageElement.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                  // Highlight the message briefly with a subtle animation
                  const messageBubble = messageElement.querySelector(
                    ".rounded-lg",
                  ) as HTMLElement;
                  if (messageBubble) {
                    // Add a subtle pulsing highlight effect
                    messageBubble.style.transition = "all 0.3s ease";
                    messageBubble.style.boxShadow =
                      "0 0 0 3px rgba(242, 116, 44, 0.3)";
                    messageBubble.style.transform = "scale(1.02)";

                    // Remove highlight after 2 seconds
                    setTimeout(() => {
                      messageBubble.style.boxShadow = "";
                      messageBubble.style.transform = "";
                    }, 2000);
                  }
                }
              }, 500);

              // Clear the messageId from URL
              searchParams.delete("messageId");
              const newSearch = searchParams.toString();
              navigate(
                `${location.pathname}${newSearch ? `?${newSearch}` : ""}`,
                { replace: true },
              );

              return;
            }
          } catch (error) {
            console.error("Error checking conversation for message:", error);
          }
        }
      };

      findConversationForMessage();
    }
  }, [
    location.search,
    conversations,
    currentUserId,
    navigate,
    location.pathname,
  ]);

  // Auto-scroll to bottom only when new messages are added (not on refresh)
  // This effect is now handled in fetchMessages to prevent unnecessary scrolling

  // Search users (for inline search)
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setUserSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearchingUsers(true);
    setShowSearchResults(true);
    try {
      const data = await searchUsersForMessage(query);
      // Ensure we always set an array, even if data.users is undefined
      setUserSearchResults(Array.isArray(data.users) ? data.users : []);
    } catch (error: any) {
      console.error("Error searching users:", error);
      // Clear results on error to prevent showing stale data
      setUserSearchResults([]);
    } finally {
      setIsSearchingUsers(false);
    }
  }, []);

  // Debounced user search - triggered when conversationSearchTerm changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (conversationSearchTerm && conversationSearchTerm.length >= 2) {
        searchUsers(conversationSearchTerm);
      } else {
        setUserSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [conversationSearchTerm, searchUsers]);

  // Handle send message
  const handleSendMessage = async () => {
    if (
      !selectedConversation ||
      (!messageInput.trim() && messageAttachments.length === 0)
    )
      return;
    if (!currentUserId) return;

    try {
      // Send message first (with content or empty if only attachments)
      const newMessage = await sendMessage(
        selectedConversation.conversation_id,
        messageInput.trim() || "",
        undefined, // Attachments will be uploaded after message is created
      );

      // Upload attachments if any (after message is created)
      if (messageAttachments.length > 0 && newMessage.message_id) {
        try {
          for (const file of messageAttachments) {
            await uploadMessageAttachment(newMessage.message_id, file);
          }
        } catch (attachError: any) {
          console.error("Error uploading attachments:", attachError);
          toast.error("Message sent but failed to upload some attachments");
        }
      }

      // Always refresh messages after sending to get latest state (including any new messages from other user)
      await fetchMessages(selectedConversation.conversation_id, 1, false);

      // Clear input
      setMessageInput("");
      setMessageAttachments([]);
      setMessageAttachmentPreviews([]);

      // Refresh conversations to update last message
      fetchConversations();
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Failed to send message");
    }
  };

  // Handle starting conversation with user from search results
  const handleStartConversation = async (user: SearchUser) => {
    try {
      const conversation = await createPrivateConversation(user.user_id);
      setSelectedConversation(conversation);
      setConversationSearchTerm(""); // Clear search
      setUserSearchResults([]);
      setShowSearchResults(false);

      // Refresh conversations
      fetchConversations();
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      toast.error(error.message || "Failed to create conversation");
    }
  };

  // Handle delete conversation
  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;

    // Check if checkbox is checked
    const checkbox = document.getElementById(
      "confirm-delete-conversation",
    ) as HTMLInputElement;
    if (!checkbox?.checked) {
      toast.error(
        "Please confirm that you understand this action cannot be undone.",
      );
      return;
    }

    try {
      await deletePrivateConversation(conversationToDelete.conversation_id);
      toast.success("Conversation deleted");

      // Remove from list
      setConversations((prev) =>
        prev.filter(
          (c) => c.conversation_id !== conversationToDelete.conversation_id,
        ),
      );

      // Clear selection if deleted
      if (
        selectedConversation?.conversation_id ===
        conversationToDelete.conversation_id
      ) {
        setSelectedConversation(null);
        setMessages([]);
      }

      setShowDeleteConfirmModal(false);
      setConversationToDelete(null);
    } catch (error: any) {
      console.error("Error deleting conversation:", error);
      toast.error(error.message || "Failed to delete conversation");
    }
  };

  // Handle delete message
  const handleDeleteMessage = async () => {
    if (!messageToDelete || !selectedConversation) return;

    // Check if checkbox is checked
    const checkbox = document.getElementById(
      "confirm-delete-message",
    ) as HTMLInputElement;
    if (!checkbox?.checked) {
      toast.error(
        "Please confirm that you understand this action cannot be undone.",
      );
      return;
    }

    try {
      await deletePrivateMessage(messageToDelete.message_id);
      toast.success("Message deleted");

      // Remove from messages list
      setMessages((prev) =>
        prev.filter((m) => m.message_id !== messageToDelete.message_id),
      );

      // Refresh conversations to update last message
      fetchConversations();

      setShowDeleteMessageModal(false);
      setMessageToDelete(null);
    } catch (error: any) {
      console.error("Error deleting message:", error);
      toast.error(error.message || "Failed to delete message");
    }
  };

  // Handle message reactions
  const handleAddReaction = async (messageId: number, reactionType: string) => {
    if (!currentUserId || !selectedConversation) return;

    try {
      await addMessageReaction(messageId, reactionType);

      // Refresh messages to get updated reactions and any new messages
      await fetchMessages(selectedConversation.conversation_id, 1, false);

      setShowReactionPicker(null);
    } catch (error: any) {
      console.error("Error adding reaction:", error);
      toast.error(error.message || "Failed to add reaction");
    }
  };

  const handleRemoveReaction = async (
    messageId: number,
    reactionType: string,
  ) => {
    if (!currentUserId || !selectedConversation) return;

    try {
      await removeMessageReaction(messageId, reactionType);

      // Refresh messages to get updated reactions and any new messages
      await fetchMessages(selectedConversation.conversation_id, 1, false);
    } catch (error: any) {
      console.error("Error removing reaction:", error);
      toast.error(error.message || "Failed to remove reaction");
    }
  };

  // Handle attachment upload
  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file size (10MB limit)
    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB limit`);
        return false;
      }
      return true;
    });

    setMessageAttachments((prev) => [...prev, ...validFiles]);

    // Create previews
    validFiles.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setMessageAttachmentPreviews((prev) => [
            ...prev,
            { type: "image", url: e.target?.result as string },
          ]);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith("video/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setMessageAttachmentPreviews((prev) => [
            ...prev,
            { type: "video", url: e.target?.result as string, file },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        // For non-image/video files, store file info
        setMessageAttachmentPreviews((prev) => [
          ...prev,
          { type: "file", file },
        ]);
      }
    });

    // Reset input
    e.target.value = "";
  };

  const handleRemoveAttachment = (index: number) => {
    setMessageAttachments((prev) => prev.filter((_, i) => i !== index));
    setMessageAttachmentPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  // Get file icon based on extension
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["pdf"].includes(ext || "")) {
      return <FileText className="w-5 h-5" style={{ color: "#AA855B" }} />;
    }
    return <File className="w-5 h-5" style={{ color: "#AA855B" }} />;
  };

  // Check if file can be viewed in browser (PDF) or needs to be downloaded
  const canViewInBrowser = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    // PDFs can be viewed in browser, others need to be downloaded
    return ext === "pdf";
  };

  // Format timestamp - shows both actual time and relative time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    // Format actual time (12-hour format)
    const actualTime = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // Format relative time
    let relativeTime = "";
    if (minutes < 1) {
      relativeTime = "Just now";
    } else if (minutes < 60) {
      relativeTime = `${minutes}m ago`;
    } else if (hours < 24) {
      relativeTime = `${hours}h ago`;
    } else if (days < 7) {
      relativeTime = `${days}d ago`;
    } else {
      relativeTime = date.toLocaleDateString();
    }

    // Return both if not "Just now"
    if (relativeTime === "Just now") {
      return relativeTime;
    }
    return `${actualTime} • ${relativeTime}`;
  };

  // Render message content with clickable links
  const renderMessageContent = (content: string) => {
    if (!content) return null;

    // URL regex pattern - matches http://, https://, and www.
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const parts = content.split(urlRegex);

    return (
      <p className="text-sm whitespace-pre-wrap">
        {parts.map((part, index) => {
          // Check if this part is a URL
          if (urlRegex.test(part)) {
            // Ensure URL has protocol
            const url = part.startsWith("http") ? part : `https://${part}`;

            // Check if this is a resources link from our app
            const appOrigin = window.location.origin;
            const resourcesPathRegex = new RegExp(
              `^${appOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/resources/(\\d+)(?:/)?$`,
            );
            const resourcesMatch = url.match(resourcesPathRegex);

            if (resourcesMatch) {
              // This is a resource link - open in new tab to show detail view
              const resourceId = resourcesMatch[1];
              return (
                <a
                  key={index}
                  href={`/resources/${resourceId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:opacity-80 transition-opacity"
                  style={{ color: "#2563eb" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {part}
                </a>
              );
            }

            // External URL - open in new tab
            return (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-80 transition-opacity"
                style={{ color: "#2563eb" }}
                onClick={(e) => e.stopPropagation()}
              >
                {part}
              </a>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </p>
    );
  };

  // Render avatar helper
  const renderAvatar = (
    name: string,
    avatar: string | null,
    size: "sm" | "md" | "lg" = "md",
  ) => {
    const sizeClasses = {
      sm: "w-8 h-8 text-xs",
      md: "w-10 h-10 text-sm",
      lg: "w-12 h-12 text-base",
    };

    if (avatar) {
      return (
        <img
          src={avatar}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover`}
        />
      );
    }

    return (
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold`}
        style={{ backgroundColor: "#F2742C", color: "#F5F5F5" }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  };

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    if (!conversationSearchTerm.trim()) return true;
    const searchLower = conversationSearchTerm.toLowerCase();
    return conv.participant.name.toLowerCase().includes(searchLower);
  });

  // Route protection
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { state: { returnUrl: "/messages" } });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  // Render Message Thread Menu
  const renderMessageThreadMenu = () => {
    if (!showMessageThreadMenu || !selectedConversation) return null;

    return (
      <>
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowMessageThreadMenu(false)}
        />
        <div
          className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-20"
          style={{ borderColor: "#F0DCC9" }}
          data-message-thread-menu
        >
          <div className="py-1">
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
              style={{ color: "#EF4444" }}
              onClick={() => {
                setConversationToDelete(selectedConversation);
                setShowDeleteConfirmModal(true);
                setShowMessageThreadMenu(false);
              }}
            >
              <Trash2 className="w-4 h-4" />
              Delete Conversation
            </button>
          </div>
        </div>
      </>
    );
  };

  // Render Conversation Item Menu
  const renderConversationItemMenu = (conversation: Conversation) => {
    const isMenuOpen = openConversationMenu === conversation.conversation_id;

    if (!isMenuOpen) return null;

    return (
      <>
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpenConversationMenu(null)}
        />
        <div
          className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-20"
          style={{ borderColor: "#F0DCC9" }}
          data-conversation-menu={conversation.conversation_id}
        >
          <div className="py-1">
            {conversation.unread_count > 0 && (
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                style={{ color: "#32332D" }}
                onClick={async () => {
                  await markPrivateConversationRead(
                    conversation.conversation_id,
                  );
                  fetchConversations();
                  setOpenConversationMenu(null);
                }}
              >
                <CheckCheck className="w-4 h-4" style={{ color: "#AA855B" }} />
                Mark as Read
              </button>
            )}
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
              style={{ color: "#EF4444" }}
              onClick={() => {
                setConversationToDelete(conversation);
                setShowDeleteConfirmModal(true);
                setOpenConversationMenu(null);
              }}
            >
              <Trash2 className="w-4 h-4" />
              Delete Conversation
            </button>
          </div>
        </div>
      </>
    );
  };

  // Render Message Menu
  const renderMessageMenu = (message: PrivateMessage) => {
    const isMenuOpen = openMessageMenu === message.message_id;
    const isSent = message.sender_id === currentUserId;

    if (!isMenuOpen) return null;

    // Calculate position dynamically when menu opens
    const calculateMenuPosition = () => {
      const button = document.querySelector(
        `[data-message-button="${message.message_id}"]`,
      ) as HTMLElement;
      if (!button) return { top: 0, left: 0 };

      const buttonRect = button.getBoundingClientRect();
      const menuWidth = 224; // w-56 = 14rem = 224px
      const menuHeight = 100; // Approximate height
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Determine horizontal position
      let left: number | undefined = undefined;
      let right: number | undefined = undefined;

      // For sent messages (right-aligned), try to align menu to right edge of button
      if (isSent) {
        right = viewportWidth - buttonRect.right;
        // If menu would go off screen, align to left instead
        if (right + menuWidth > viewportWidth) {
          left = buttonRect.left;
          right = undefined;
        }
      } else {
        // For received messages (left-aligned), align menu to left edge of button
        left = buttonRect.left;
        // If menu would go off screen, align to right instead
        if (left + menuWidth > viewportWidth) {
          right = viewportWidth - buttonRect.right;
          left = undefined;
        }
      }

      // Determine vertical position (below button, or above if not enough space)
      let top: number | undefined = buttonRect.bottom + 8; // mt-2 = 8px
      let bottom: number | undefined = undefined;

      // If menu would go off bottom of screen, position above button
      if (top + menuHeight > viewportHeight) {
        bottom = viewportHeight - buttonRect.top + 8;
        top = undefined;
      }

      return { top, bottom, left, right };
    };

    const menuPosition = calculateMenuPosition();

    return (
      <>
        <div
          className="fixed inset-0"
          style={{ zIndex: 40 }}
          onClick={() => setOpenMessageMenu(null)}
        />
        <div
          className="fixed w-56 bg-white rounded-lg shadow-lg border"
          style={{
            borderColor: "#F0DCC9",
            zIndex: 50,
            ...menuPosition,
          }}
          data-message-menu={message.message_id}
        >
          <div className="py-1">
            {/* Add Reaction - Only for messages sent by others */}
            {!isSent && (
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                style={{ color: "#32332D" }}
                onClick={() => {
                  setShowReactionPicker(
                    showReactionPicker === message.message_id
                      ? null
                      : message.message_id,
                  );
                  setOpenMessageMenu(null);
                }}
              >
                <Smile className="w-4 h-4" style={{ color: "#AA855B" }} />
                Add Reaction
              </button>
            )}
            {/* Delete Message - Available for all messages (own and others) */}
            {!isSent && (
              <div
                className="border-t my-1"
                style={{ borderColor: "#F0DCC9" }}
              />
            )}
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
              style={{ color: "#EF4444" }}
              onClick={() => {
                setMessageToDelete(message);
                setShowDeleteMessageModal(true);
                setOpenMessageMenu(null);
              }}
            >
              <Trash2 className="w-4 h-4" />
              Delete Message
            </button>
          </div>
        </div>
      </>
    );
  };

  // Render Delete Confirmation Modal
  const renderDeleteConfirmModal = () => {
    if (!showDeleteConfirmModal || !conversationToDelete) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      >
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: "#32332D" }}>
              Delete Conversation
            </h3>
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={() => {
                setShowDeleteConfirmModal(false);
                setConversationToDelete(null);
              }}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {renderAvatar(
                conversationToDelete.participant.name,
                conversationToDelete.participant.avatar,
                "md",
              )}
              <div>
                <h4 className="font-medium" style={{ color: "#32332D" }}>
                  {conversationToDelete.participant.name}
                </h4>
                <p className="text-xs" style={{ color: "#64635E" }}>
                  {conversationToDelete.last_message_at
                    ? formatTime(conversationToDelete.last_message_at)
                    : "No messages yet"}
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
                Deleting this conversation will permanently remove all messages
                and attachments from your view. The other participant will still
                have access to the conversation.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="confirm-delete-conversation"
                className="w-4 h-4 rounded"
                style={{ accentColor: "#EF4444" }}
              />
              <label
                htmlFor="confirm-delete-conversation"
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
                setConversationToDelete(null);
              }}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg font-medium"
              style={{ backgroundColor: "#EF4444", color: "#FFFFFF" }}
              onClick={handleDeleteConversation}
            >
              Delete Conversation
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Delete Message Confirmation Modal
  const renderDeleteMessageModal = () => {
    if (!showDeleteMessageModal || !messageToDelete) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      >
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: "#32332D" }}>
              Delete Message
            </h3>
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={() => {
                setShowDeleteMessageModal(false);
                setMessageToDelete(null);
              }}
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
                Deleting this message will permanently remove it from your view.
                The other participant will still be able to see the message.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="confirm-delete-message"
                className="w-4 h-4 rounded"
                style={{ accentColor: "#EF4444" }}
              />
              <label
                htmlFor="confirm-delete-message"
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
                setShowDeleteMessageModal(false);
                setMessageToDelete(null);
              }}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg font-medium"
              style={{ backgroundColor: "#EF4444", color: "#FFFFFF" }}
              onClick={handleDeleteMessage}
            >
              Delete Message
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render conversation list
  const renderConversationList = () => {
    return (
      <div
        className={`${isMobileView && selectedConversation ? "hidden" : "flex"} flex-col h-full`}
        style={{
          width: isMobileView ? "100%" : `${conversationListWidth}%`,
          borderRight: isMobileView ? "none" : "1px solid #AA855B",
        }}
      >
        {/* Search Bar */}
        <div
          className="p-3 sm:p-4 border-b relative"
          style={{ borderColor: "#AA855B", backgroundColor: "#FAEFE2" }}
        >
          <div className="relative group">
            <Search
              className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5"
              style={{ color: "#AA855B" }}
            />
            <input
              type="search"
              placeholder="Search conversations or users..."
              value={conversationSearchTerm}
              onChange={(e) => {
                setConversationSearchTerm(e.target.value);
                if (e.target.value.trim().length >= 2) {
                  setShowSearchResults(true);
                } else {
                  setShowSearchResults(false);
                }
              }}
              onFocus={() => {
                if (
                  conversationSearchTerm.trim().length >= 2 &&
                  userSearchResults.length > 0
                ) {
                  setShowSearchResults(true);
                }
              }}
              onBlur={() => {
                // Delay hiding to allow clicking on results
                setTimeout(() => setShowSearchResults(false), 200);
              }}
              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
              style={{
                borderColor: "#AA855B",
                backgroundColor: "#F5F5F5",
                color: "#32332D",
                fontFamily: "'Poppins', sans-serif",
              }}
            />
            {/* Tooltip on hover */}
            <div
              className="absolute left-0 top-full mt-2 px-4 py-3 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none whitespace-normal"
              style={{ width: "280px" }}
            >
              <div>
                Search existing conversations or find users by name or email to
                start a new conversation.
              </div>
              {/* Tooltip arrow pointing up */}
              <div className="absolute bottom-full left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
            </div>
          </div>

          {/* Inline Search Results - User Search Results */}
          {showSearchResults && conversationSearchTerm.trim().length >= 2 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-50 max-h-[300px] overflow-y-auto"
              style={{ borderColor: "#AA855B" }}
              onMouseDown={(e) => e.preventDefault()} // Prevent onBlur from firing when clicking results
            >
              {isSearchingUsers ? (
                <div className="p-4 text-center" style={{ color: "#AA855B" }}>
                  Searching users...
                </div>
              ) : userSearchResults.length > 0 ? (
                <div className="py-2">
                  <div
                    className="px-4 py-2 text-xs font-semibold"
                    style={{ color: "#AA855B", backgroundColor: "#FAEFE2" }}
                  >
                    Find User to Message
                  </div>
                  {userSearchResults.map((user) => {
                    // Check if conversation already exists with this user
                    const existingConversation = conversations.find(
                      (conv) => conv.participant.user_id === user.user_id,
                    );

                    return (
                      <button
                        key={user.user_id}
                        onClick={() => {
                          if (existingConversation) {
                            // If conversation exists, just select it
                            setSelectedConversation(existingConversation);
                            setConversationSearchTerm("");
                            setShowSearchResults(false);
                          } else {
                            // Start new conversation
                            handleStartConversation(user);
                          }
                        }}
                        className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50 transition-colors flex items-center space-x-2 sm:space-x-3 border-b"
                        style={{ borderColor: "#F0DCC9" }}
                      >
                        {renderAvatar(user.name || "User", user.avatar, "md")}
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-xs sm:text-sm"
                            style={{ color: "#32332D", fontWeight: 500 }}
                          >
                            {user.name || "Unknown"}
                          </div>
                          <div
                            className="text-[10px] sm:text-sm"
                            style={{ color: "#AA855B" }}
                          >
                            {user.email || ""}
                          </div>
                        </div>
                        {existingConversation ? (
                          <span
                            className="text-[10px] sm:text-xs"
                            style={{ color: "#AA855B" }}
                          >
                            Existing
                          </span>
                        ) : (
                          <MessageSquare
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                            style={{ color: "#F2742C" }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : conversationSearchTerm.trim().length >= 2 ? (
                <div
                  className="p-4 text-center text-sm"
                  style={{ color: "#64635E" }}
                >
                  No users found matching "{conversationSearchTerm}"
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="p-4 text-center" style={{ color: "#AA855B" }}>
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center" style={{ color: "#AA855B" }}>
              {conversationSearchTerm
                ? "No conversations match your search"
                : "No conversations yet. Start a new one!"}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.conversation_id}
                className={`p-3 sm:p-4 border-b transition-colors relative ${
                  selectedConversation?.conversation_id === conv.conversation_id
                    ? "bg-gray-100"
                    : "hover:bg-gray-50"
                }`}
                style={{ borderColor: "#AA855B" }}
              >
                <div
                  className="flex items-center space-x-2 sm:space-x-3 cursor-pointer"
                  onClick={() => {
                    setSelectedConversation(conv);
                    if (isMobileView) {
                      // On mobile, conversation list is hidden when message thread is shown
                    }
                  }}
                >
                  {renderAvatar(
                    conv.participant.name,
                    conv.participant.avatar,
                    "md",
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                      <h3
                        className="font-semibold text-xs sm:text-sm truncate"
                        style={{ color: "#32332D" }}
                      >
                        {conv.participant.name}
                      </h3>
                      {conv.last_message_at && (
                        <span
                          className="text-[10px] sm:text-xs"
                          style={{ color: "#AA855B" }}
                        >
                          {formatTime(conv.last_message_at)}
                        </span>
                      )}
                    </div>
                    <p
                      className="text-xs sm:text-sm truncate flex items-center gap-0.5 sm:gap-1"
                      style={{ color: "#AA855B" }}
                    >
                      {(() => {
                        if (!conv.last_message) return "No messages yet";
                        // If message has attachments but no content, show attachment indicator
                        if (
                          !conv.last_message.content &&
                          conv.last_message.attachments &&
                          conv.last_message.attachments.length > 0
                        ) {
                          const hasImage = conv.last_message.attachments.some(
                            (att) => att.file_type === "image",
                          );
                          const hasVideo = conv.last_message.attachments.some(
                            (att) => att.file_type === "video",
                          );
                          return (
                            <>
                              <Paperclip className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline" />
                              <span>
                                {hasImage
                                  ? "Image"
                                  : hasVideo
                                    ? "Video"
                                    : "Attachment"}
                              </span>
                            </>
                          );
                        }
                        return conv.last_message.content || "No messages yet";
                      })()}
                    </p>
                  </div>

                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    {conv.unread_count > 0 && (
                      <div
                        className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold"
                        style={{ backgroundColor: "#F2742C", color: "#F5F5F5" }}
                      >
                        {conv.unread_count}
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenConversationMenu(
                          openConversationMenu === conv.conversation_id
                            ? null
                            : conv.conversation_id,
                        );
                      }}
                      className="p-0.5 sm:p-1 rounded-full hover:bg-gray-200 transition-colors"
                      style={{ color: "#AA855B" }}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {renderConversationItemMenu(conv)}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Render message thread
  const renderMessageThread = () => {
    if (!selectedConversation) {
      return (
        <div
          className={`${isMobileView ? "hidden" : "flex"} flex-1 items-center justify-center`}
          style={{ backgroundColor: "#F5F5F5" }}
        >
          <div className="text-center">
            <MessageSquare
              className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4"
              style={{ color: "#AA855B" }}
            />
            <p className="text-xs sm:text-sm" style={{ color: "#AA855B" }}>
              Select a conversation to start messaging
            </p>
          </div>
        </div>
      );
    }

    const participant = selectedConversation.participant;

    return (
      <div
        className={`${isMobileView && !selectedConversation ? "hidden" : "flex"} flex-col h-full`}
        style={{
          width: isMobileView ? "100%" : `${100 - conversationListWidth}%`,
          backgroundColor: "#F5F5F5",
        }}
      >
        {/* Message Thread Header */}
        <div
          className="p-3 sm:p-4 border-b flex items-center justify-between flex-shrink-0 relative"
          style={{ borderColor: "#AA855B", backgroundColor: "#FAEFE2" }}
        >
          <div className="flex items-center space-x-2 sm:space-x-3">
            {isMobileView && (
              <button
                onClick={() => setSelectedConversation(null)}
                className="p-1.5 sm:p-2 rounded-full hover:bg-gray-200"
                style={{ color: "#AA855B" }}
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
            {renderAvatar(participant.name, participant.avatar, "md")}
            <div>
              <h3
                className="font-semibold text-sm sm:text-base"
                style={{ color: "#32332D" }}
              >
                {participant.name}
              </h3>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMessageThreadMenu(!showMessageThreadMenu)}
              className="p-1.5 sm:p-2 rounded-full hover:bg-gray-200 transition-colors"
              style={{ color: "#AA855B" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F0DCC9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            {renderMessageThreadMenu()}
          </div>
        </div>

        {/* Messages Container */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 relative"
          style={{ zIndex: 1 }}
        >
          {loadingMessages ? (
            <div className="text-center" style={{ color: "#AA855B" }}>
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center" style={{ color: "#AA855B" }}>
              No messages yet. Send a message to get started!
            </div>
          ) : (
            messages.map((message) => {
              const isSent = message.sender_id === currentUserId;
              const messageReactions = message.reactions || [];

              // Group reactions by type
              const reactionsByType: Record<string, MessageReaction[]> = {};
              messageReactions.forEach((reaction) => {
                if (!reactionsByType[reaction.reaction_type]) {
                  reactionsByType[reaction.reaction_type] = [];
                }
                reactionsByType[reaction.reaction_type].push(reaction);
              });

              return (
                <div
                  key={message.message_id}
                  data-message-id={message.message_id}
                  className={`flex ${isSent ? "justify-end" : "justify-start"}`}
                  onMouseEnter={() => setHoveredMessageId(message.message_id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  <div className="max-w-[85%] sm:max-w-[70%] relative group">
                    <div
                      className="p-2.5 sm:p-3 rounded-lg relative"
                      style={{
                        backgroundColor: isSent ? "#F2742C" : "#FFFFFF",
                        color: isSent ? "#F5F5F5" : "#32332D",
                        border: isSent ? "none" : "1px solid #AA855B",
                      }}
                    >
                      {/* MoreHorizontal menu button - Always visible on mobile, hover on desktop */}
                      <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2">
                        <button
                          data-message-button={message.message_id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMessageMenu(
                              openMessageMenu === message.message_id
                                ? null
                                : message.message_id,
                            );
                          }}
                          className={`p-0.5 sm:p-1 rounded-full transition-all duration-200 hover:bg-gray-100 ${
                            isMobileView
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                          style={{
                            color: isSent ? "#F5F5F5" : "#AA855B",
                            backgroundColor: isSent
                              ? "rgba(255, 255, 255, 0.2)"
                              : "transparent",
                          }}
                          title="Message options"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                      {renderMessageMenu(message)}

                      {/* Message Content */}
                      {message.attachments &&
                        message.attachments.length > 0 && (
                          <div className="mb-1.5 sm:mb-2 space-y-1.5 sm:space-y-2">
                            {message.attachments.map((att) => (
                              <div key={att.attachment_id}>
                                {att.file_type === "image" ? (
                                  <img
                                    src={att.file_path}
                                    alt={att.file_name}
                                    className="max-w-full h-auto rounded-lg cursor-pointer"
                                    style={{ maxHeight: "250px" }}
                                    onClick={() =>
                                      window.open(att.file_path, "_blank")
                                    }
                                  />
                                ) : att.file_type === "video" ? (
                                  <div
                                    className="relative rounded-lg overflow-hidden"
                                    style={{
                                      maxWidth: "100%",
                                      maxHeight: "300px",
                                    }}
                                  >
                                    <video
                                      src={att.file_path}
                                      controls
                                      className="max-w-full h-auto rounded-lg"
                                      style={{ maxHeight: "300px" }}
                                    >
                                      Your browser does not support the video
                                      tag.
                                    </video>
                                  </div>
                                ) : (
                                  <div
                                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                                    style={{ borderColor: "#AA855B" }}
                                  >
                                    {getFileIcon(att.file_name)}
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className="text-xs sm:text-sm font-medium truncate"
                                        style={{ color: "#32332D" }}
                                      >
                                        {att.file_name}
                                      </p>
                                      {att.file_size && (
                                        <p
                                          className="text-[10px] sm:text-xs"
                                          style={{ color: "#AA855B" }}
                                        >
                                          {formatFileSize(att.file_size)}
                                        </p>
                                      )}
                                    </div>
                                    <a
                                      href={att.file_path}
                                      target={
                                        canViewInBrowser(att.file_name)
                                          ? "_blank"
                                          : undefined
                                      }
                                      rel={
                                        canViewInBrowser(att.file_name)
                                          ? "noopener noreferrer"
                                          : undefined
                                      }
                                      className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-1.5"
                                      style={{
                                        backgroundColor: "#F2742C",
                                        color: "#F5F5F5",
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor =
                                          "#E55A1F";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor =
                                          "#F2742C";
                                      }}
                                      download={
                                        canViewInBrowser(att.file_name)
                                          ? undefined
                                          : att.file_name
                                      }
                                    >
                                      {canViewInBrowser(att.file_name) ? (
                                        <>
                                          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                          <span>View</span>
                                        </>
                                      ) : (
                                        <>
                                          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                          <span>Download</span>
                                        </>
                                      )}
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                      {renderMessageContent(message.content)}

                      {/* Message Footer */}
                      <div className="flex items-center justify-end mt-0.5 sm:mt-1 space-x-1.5 sm:space-x-2">
                        <span className="text-[10px] sm:text-xs opacity-70">
                          {formatTime(message.created_at)}
                        </span>
                        {isSent && (
                          <span className="text-[10px] sm:text-xs opacity-70">
                            {message.is_read ? (
                              <CheckCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline" />
                            ) : (
                              <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline" />
                            )}
                          </span>
                        )}
                      </div>

                      {/* Reaction Picker - Show when "Add Reaction" is clicked from menu - Only for messages sent by others */}
                      {!isSent && showReactionPicker === message.message_id && (
                        <>
                          {/* Backdrop to close picker when clicking outside */}
                          <div
                            className="fixed inset-0 z-[5]"
                            onClick={() => setShowReactionPicker(null)}
                          />
                          <div
                            className={`absolute -bottom-8 ${isSent ? "right-0" : "left-0"} flex items-center space-x-1 p-1 rounded-lg bg-white shadow-lg border z-10`}
                            style={{ borderColor: "#AA855B" }}
                          >
                            {REACTION_TYPES.map((reaction) => {
                              const userReaction = messageReactions.find(
                                (r) =>
                                  r.user_id === currentUserId &&
                                  r.reaction_type === reaction.type,
                              );

                              return (
                                <button
                                  key={reaction.type}
                                  onClick={() => {
                                    if (userReaction) {
                                      handleRemoveReaction(
                                        message.message_id,
                                        reaction.type,
                                      );
                                    } else {
                                      handleAddReaction(
                                        message.message_id,
                                        reaction.type,
                                      );
                                    }
                                    // Close picker after selecting a reaction
                                    setShowReactionPicker(null);
                                  }}
                                  className={`p-1 rounded hover:bg-gray-100 transition-colors ${userReaction ? "bg-orange-100" : ""}`}
                                  title={reaction.label}
                                >
                                  <span className="text-lg">
                                    {reaction.emoji}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Reactions Display */}
                    {messageReactions.length > 0 && (
                      <div className="flex items-center space-x-0.5 sm:space-x-1 mt-0.5 sm:mt-1 ml-1.5 sm:ml-2">
                        {Object.entries(reactionsByType).map(
                          ([type, reactions]) => {
                            const reactionInfo = REACTION_TYPES.find(
                              (r) => r.type === type,
                            );
                            return (
                              <div
                                key={type}
                                className="flex items-center space-x-0.5 sm:space-x-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border text-[10px] sm:text-xs"
                                style={{
                                  borderColor: "#AA855B",
                                  backgroundColor: "#FAEFE2",
                                }}
                              >
                                <span>{reactionInfo?.emoji}</span>
                                <span style={{ color: "#32332D" }}>
                                  {reactions.length}
                                </span>
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div
          className="p-3 sm:p-4 border-t flex flex-col space-y-1.5 sm:space-y-2 flex-shrink-0"
          style={{ borderColor: "#AA855B", backgroundColor: "#FAEFE2" }}
        >
          {/* Attachment Previews */}
          {messageAttachmentPreviews.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 pb-1.5 sm:pb-2">
              {messageAttachmentPreviews.map((preview, index) => (
                <div key={index} className="relative flex-shrink-0">
                  {preview.type === "image" && preview.url ? (
                    <>
                      <img
                        src={preview.url}
                        alt={`Preview ${index + 1}`}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => handleRemoveAttachment(index)}
                        className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors z-20"
                        style={{ zIndex: 20 }}
                        title="Remove attachment"
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </>
                  ) : preview.type === "video" && preview.url ? (
                    <>
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-black">
                        <video
                          src={preview.url}
                          className="w-full h-full object-cover"
                          muted
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Video className="w-5 h-5 sm:w-6 sm:h-6 text-white opacity-80" />
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveAttachment(index)}
                        className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors z-20"
                        style={{ zIndex: 20 }}
                        title="Remove attachment"
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </>
                  ) : preview.type === "file" && preview.file ? (
                    <div
                      className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg border bg-white"
                      style={{ borderColor: "#AA855B", minWidth: "150px" }}
                    >
                      {getFileIcon(preview.file.name)}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs sm:text-sm font-medium truncate"
                          style={{ color: "#32332D" }}
                        >
                          {preview.file.name}
                        </p>
                        <p
                          className="text-[10px] sm:text-xs"
                          style={{ color: "#AA855B" }}
                        >
                          {formatFileSize(preview.file.size)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveAttachment(index)}
                        className="p-0.5 sm:p-1 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                        style={{ color: "#AA855B" }}
                        title="Remove attachment"
                      >
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <input
              type="file"
              id="message-attachment-input"
              className="hidden"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.pptx,.ppt"
              onChange={handleAttachmentChange}
            />
            <label
              htmlFor="message-attachment-input"
              className="p-1.5 sm:p-2 rounded-lg cursor-pointer"
              style={{ color: "#AA855B" }}
            >
              <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
            </label>

            <input
              type="text"
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent text-xs sm:text-sm"
              style={{
                borderColor: "#AA855B",
                backgroundColor: "#F5F5F5",
                color: "#32332D",
                fontFamily: "'Poppins', sans-serif",
              }}
            />

            <button
              onClick={handleSendMessage}
              disabled={!messageInput.trim() && messageAttachments.length === 0}
              className="p-1.5 sm:p-2 rounded-lg transition-all duration-200 disabled:opacity-50"
              style={{
                backgroundColor:
                  messageInput.trim() || messageAttachments.length > 0
                    ? "#F2742C"
                    : "#D4C4A8",
                color: "#F5F5F5",
              }}
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="pt-14 sm:pt-16 flex h-screen overflow-hidden font-['Poppins']"
      style={{ backgroundColor: "#FAEFE2" }}
    >
      {/* Main Content - Split View */}
      <div
        className="flex w-full h-full overflow-hidden relative"
        style={{
          borderColor: "#AA855B",
          backgroundColor: "#F5F5F5",
        }}
      >
        {renderConversationList()}

        {/* Resizable Splitter */}
        {!isMobileView && (
          <div
            ref={splitterRef}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
            className="w-1 cursor-col-resize hover:bg-orange-400 transition-colors flex-shrink-0 relative group"
            style={{
              backgroundColor: isResizing ? "#F2742C" : "#AA855B",
            }}
            title="Drag to resize"
          >
            {/* Visual indicator on hover */}
            <div className="absolute inset-0 bg-transparent group-hover:bg-orange-400 transition-colors" />
          </div>
        )}

        {renderMessageThread()}
      </div>

      {/* Modals */}
      {renderDeleteConfirmModal()}
      {renderDeleteMessageModal()}

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        toastStyle={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: "14px",
        }}
      />
    </div>
  );
};

export default PrivateMessagePage;
