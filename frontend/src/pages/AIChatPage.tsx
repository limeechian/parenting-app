// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: AIChatPage.tsx
// Description: To provide interface for parent users to interact with AI chatbot for parenting advice
// First Written on: Friday, 03-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state, lifecycle, and refs
import React, { useState, useRef, useEffect } from "react";
// Import React Router hooks for navigation
import { useNavigate } from "react-router-dom";
// Import lucide-react icons for UI elements
import {
  Send,
  Search,
  X,
  Shield,
  Users,
  MessageSquare,
  Plus,
  Baby,
  Heart,
  Bot,
  PanelLeft,
  PanelRight,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Trash2,
  BotMessageSquare,
  MapPin,
  BookOpen,
  ArrowRight,
} from "lucide-react";
// Import API base URL configuration
import { API_BASE_URL } from "../config/api";
// Import API functions for chat operations
import {
  getChildren,
  getConversations,
  getConversationMessages,
  sendChat,
  updateConversationMetadata,
  deleteConversation,
} from "../services/api";

/**
 * Service interface
 * Defines the structure of a professional service
 */
interface Service {
  service_id: number;
  service_name: string;
  service_description?: string;
  service_category?: string;
  service_type?: string;
  price_range?: string;
}

/**
 * Recommendation interface
 * Defines the structure of AI-generated recommendations
 * Can represent professionals, resources, or communities
 */
interface Recommendation {
  // Common identifier fields (determines which table this recommendation is from)
  professional_id?: number; // From: professional_users_profile table
  resource_id?: number; // From: resources table
  community_id?: number; // From: communities table

  // Fields from professional_users_profile table
  business_name?: string; // From: professional_users_profile.business_name
  profile_image_url?: string; // From: professional_users_profile.profile_image_url
  city?: string; // From: professional_users_profile.city
  state?: string; // From: professional_users_profile.state
  specializations?: string[]; // From: professional_users_profile.specializations
  services?: Service[]; // From: professional_services table (related to professional_users_profile)

  // Fields from resources table
  title?: string; // From: resources.title
  description?: string; // From: resources.description
  excerpt?: string; // From: resources.excerpt
  thumbnail_url?: string; // From: resources.thumbnail_url
  tags?: string[]; // From: resources.tags
  // Note: external_url is not included - all resources link to detail page which handles external URLs

  // Fields from communities table
  name?: string; // From: communities.name
  cover_image_url?: string; // From: communities.cover_image_url
  // Note: communities.description is also mapped to description field above
}

/**
 * Recommendations interface
 * Groups recommendations by type (professionals, resources, communities)
 */
interface Recommendations {
  professionals?: Recommendation[];
  resources?: Recommendation[];
  communities?: Recommendation[];
}

/**
 * Message interface
 * Defines the structure of a chat message
 */
interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  agent?: string;
  confidence?: number;
  references?: string[];
  recommendations?: Recommendations;
}

/**
 * ChatConversation interface
 * Defines the structure of a chat conversation with metadata
 */
interface ChatConversation {
  id: string;
  title: string;
  childId?: string;
  childName?: string;
  lastMessage: string;
  lastUpdated: string;
  participatingAgents?: string[];
  conversationType?: string;
  primaryAgentType?: string;
  enabledAgents?: string[];
  messages: Message[];
}

/**
 * Child interface
 * Defines the structure of a child profile for context
 */
interface Child {
  id: string;
  name: string;
  age: number;
  gender: string;
}

/**
 * Agent interface
 * Defines the structure of an AI agent with its capabilities
 */
interface Agent {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  specialties: string[];
  active: boolean;
  confidence: number;
  description: string;
  exampleQuestions: string[];
  lastActive?: Date;
}

/**
 * ConfirmationDialog interface
 * Defines the structure of a confirmation dialog
 */
interface ConfirmationDialog {
  isOpen: boolean;
  type: "mode" | "agent";
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * AIChatPage Component
 * 
 * Provides interface for parent users to interact with AI chatbot for parenting advice.
 * Features include:
 * - Multiple AI agents with different specialties
 * - Conversation management
 * - Real-time chat interface
 * - Recommendations (professionals, resources, communities)
 * - Child context selection
 * - Auto mode and manual agent selection
 * 
 * @returns JSX element representing the AI chat page
 */
const AIChatPage: React.FC = () => {
  // React Router hook
  const navigate = useNavigate();  // Navigation function for programmatic routing

  // State management
  const [currentConversation, setCurrentConversation] =
    useState<ChatConversation | null>(null);  // Currently active conversation
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoMode, setAutoMode] = useState(true);
  const [enabledAgents, setEnabledAgents] = useState<string[]>([
    "parenting-style",
    "child-development",
    "crisis-intervention",
    "community-connector",
  ]);
  const [selectedChild, setSelectedChild] = useState<string>("general");
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [childSelectorOpen, setChildSelectorOpen] = useState(false);

  // Delete conversation state
  const [conversationToDelete, setConversationToDelete] =
    useState<ChatConversation | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [conversationMenuOpen, setConversationMenuOpen] = useState<
    string | null
  >(null);

  // Conversation state tracking
  const [originalConversationState, setOriginalConversationState] = useState<{
    autoMode: boolean;
    enabledAgents: string[];
  } | null>(null);

  // Confirmation dialog state
  const [confirmationDialog, setConfirmationDialog] =
    useState<ConfirmationDialog>({
      isOpen: false,
      type: "mode",
      title: "",
      message: "",
      confirmText: "",
      cancelText: "",
      onConfirm: () => {},
      onCancel: () => {},
    });

  // Chat conversations
  const [chatConversations, setChatConversations] = useState<
    ChatConversation[]
  >([]);

  // AI response generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingAgent, setGeneratingAgent] = useState<string | null>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(
    null,
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const isLandingPage =
    !currentConversation ||
    (currentConversation && currentConversation.messages.length === 0);

  // AI Agents configuration
  const agents: Agent[] = [
    {
      id: "parenting-style",
      name: "Parenting Style Analyst",
      icon: Heart,
      color: "#EC4899", // Pink
      specialties: [
        "Parenting Styles",
        "Behavioral Analysis",
        "Family Dynamics",
      ],
      active: true,
      confidence: 92,
      description:
        "I analyze your parenting approach and provide personalized guidance based on your style, family dynamics, and child's needs.",
      exampleQuestions: [
        "What's my parenting style and how can I improve it?",
        "How do I handle discipline with my approach?",
        "What strategies work best for my family dynamics?",
      ],
    },
    {
      id: "child-development",
      name: "Child Development Advisor",
      icon: Baby,
      color: "#3B82F6", // Blue
      specialties: [
        "Developmental Milestones",
        "Learning Activities",
        "Cognitive Growth",
      ],
      active: true,
      confidence: 88,
      description:
        "I help track your child's developmental milestones, suggest age-appropriate activities, and provide guidance on cognitive and physical growth.",
      exampleQuestions: [
        "Is my child meeting their developmental milestones?",
        "What activities are appropriate for my child's age?",
        "How can I support my child's learning at home?",
      ],
    },
    {
      id: "crisis-intervention",
      name: "Crisis Intervention Specialist",
      icon: Shield,
      color: "#EF4444", // Red
      specialties: [
        "Crisis Management",
        "Behavioral Emergencies",
        "Safety Protocols",
      ],
      active: true,
      confidence: 95,
      description:
        "I provide immediate support for behavioral emergencies, crisis management strategies, and safety protocols for urgent situations.",
      exampleQuestions: [
        "My child is having a severe behavioral episode, what do I do?",
        "How do I handle aggressive behavior safely?",
        "What are the warning signs I should watch for?",
      ],
    },
    {
      id: "community-connector",
      name: "Community Connector",
      icon: Users,
      color: "#10B981", // Green
      specialties: [
        "Resource Matching",
        "Community Groups",
        "Professional Referrals",
      ],
      active: true,
      confidence: 85,
      description:
        "I help you find local resources, connect with other parents, and match you with professional services in your area.",
      exampleQuestions: [
        "What parenting resources are available in my area?",
        "How can I connect with other parents?",
        "Do you know any child psychologists near me?",
      ],
    },
  ];

  const quickSuggestions = [
    "How can I help my child with bedtime fears?",
    "What are age-appropriate chores for my child?",
    "My toddler is having tantrums, what should I do?",
    "How do I encourage reading habits?",
    "Screen time guidelines for my child's age",
    "Healthy meal ideas for picky eaters",
  ];

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentConversation?.messages]);

  // Scroll to bottom when generating starts
  useEffect(() => {
    if (isGenerating) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [isGenerating]);

  // Update estimated time display in real-time while generating
  useEffect(() => {
    if (isGenerating && generationStartTime) {
      const interval = setInterval(() => {
        const elapsed = Math.ceil((Date.now() - generationStartTime) / 1000);
        setElapsedSeconds(elapsed);
      }, 1000); // Update every second

      return () => clearInterval(interval);
    } else {
      setElapsedSeconds(0);
    }
  }, [isGenerating, generationStartTime]);

  // Close conversation menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".conversation-menu-container")) {
        setConversationMenuOpen(null);
      }
    };

    if (conversationMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [conversationMenuOpen]);

  // Check authentication and fetch data on mount
  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        const authResponse = await fetch(`${API_BASE_URL}/api/me`, {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        });

        if (authResponse.ok) {
          await Promise.all([fetchChildren(), fetchConversations()]);
        } else {
          navigate("/login");
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Fetch children
  const fetchChildren = async () => {
    try {
      const data = await getChildren();
      const transformedChildren = data.map((child: any) => ({
        id: child.child_id?.toString() || child.id?.toString() || "",
        name: child.name,
        age: calculateAge(child.birthdate),
        gender: child.gender,
      }));
      setChildren(transformedChildren);
    } catch (error) {
      console.error("Error fetching children:", error);
      if (error instanceof Error && error.message.includes("401")) {
        navigate("/login");
      }
    }
  };

  const calculateAge = (birthdate: string): number => {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  // Fetch conversations
  const fetchConversations = async () => {
    console.log("🔍 DEBUG fetchConversations: Starting...");
    try {
      console.log("🔍 DEBUG fetchConversations: Calling getConversations()...");
      const data = await getConversations();
      console.log("🔍 DEBUG fetchConversations: Data received from API");
      console.log(
        "  - Data type:",
        Array.isArray(data) ? "Array" : typeof data,
      );
      console.log("  - Data:", data);

      console.log("🔍 DEBUG fetchConversations: Transforming conversations...");
      const transformedConversations = data.map((conv: any, index: number) => {
        console.log(`  - Transforming conversation ${index}:`, conv);
        try {
          const transformed = {
            ...conv,
            childId: conv.childId ? conv.childId.toString() : null,
            id: conv.id.toString(),
            messages: conv.messages || [],
          };
          console.log(`  - Transformed conversation ${index}:`, transformed);
          return transformed;
        } catch (transformError) {
          console.error(
            `  - Error transforming conversation ${index}:`,
            transformError,
          );
          console.error("  - Original conversation:", conv);
          throw transformError;
        }
      });

      console.log("🔍 DEBUG fetchConversations: Setting chat conversations...");
      console.log("  - Transformed conversations:", transformedConversations);
      setChatConversations(transformedConversations);
      console.log("✅ DEBUG fetchConversations: Success!");
    } catch (error: any) {
      console.error("❌ DEBUG fetchConversations: Error caught");
      console.error("  - Error type:", error?.constructor?.name);
      console.error("  - Error message:", error?.message || String(error));
      console.error(
        "  - Error stack:",
        (error as Error)?.stack || "No stack trace",
      );
      console.error("Error fetching conversations:", error);
    }
  };

  // Filter and group conversations
  const filteredConversations = chatConversations.filter(
    (conversation) =>
      conversation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conversation.messages.some((msg) =>
        msg.content.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );

  const groupedConversations = {
    general: filteredConversations.filter((conversation) => {
      return (
        !conversation.childId ||
        conversation.childId === null ||
        conversation.childId === undefined ||
        conversation.childId === "" ||
        conversation.childId === "null"
      );
    }),
    children: children.map((child) => ({
      child,
      conversations: filteredConversations.filter((conversation) => {
        if (
          !conversation.childId ||
          conversation.childId === null ||
          conversation.childId === undefined ||
          conversation.childId === "" ||
          conversation.childId === "null"
        ) {
          return false;
        }
        const conversationChildId = conversation.childId?.toString();
        const childId = child.id?.toString();
        return (
          conversationChildId === childId || conversation.childId === child.id
        );
      }),
    })),
  };

  // Restore conversation state
  const restoreConversationState = (conversation: ChatConversation) => {
    // Check conversation type first - this is the primary indicator
    // 'general' = auto mode, 'agent-specific' = manual mode
    const wasManualMode = conversation.conversationType === "agent-specific";

    const newAutoMode = !wasManualMode;

    let newEnabledAgents: string[] = [];

    if (wasManualMode) {
      newEnabledAgents = conversation.enabledAgents || [];

      if (newEnabledAgents.length === 0 && conversation.primaryAgentType) {
        const agentMapping: { [key: string]: string } = {
          "Parenting Style Analyst": "parenting-style",
          "Child Development Advisor": "child-development",
          "Crisis Intervention Specialist": "crisis-intervention",
          "Community Connector": "community-connector",
        };
        const mappedAgent = agentMapping[conversation.primaryAgentType];
        if (mappedAgent) {
          newEnabledAgents = [mappedAgent];
        }
      }

      if (newEnabledAgents.length > 0) {
        const agentMapping: { [key: string]: string } = {
          "Parenting Style Analyst": "parenting-style",
          "Child Development Advisor": "child-development",
          "Crisis Intervention Specialist": "crisis-intervention",
          "Community Connector": "community-connector",
        };
        newEnabledAgents = newEnabledAgents.map(
          (agent) => agentMapping[agent] || agent,
        );
      }

      if (newEnabledAgents.length === 0) {
        newEnabledAgents = [
          "parenting-style",
          "child-development",
          "crisis-intervention",
          "community-connector",
        ];
      }
    } else {
      newEnabledAgents = [
        "parenting-style",
        "child-development",
        "crisis-intervention",
        "community-connector",
      ];
    }

    setAutoMode(newAutoMode);
    setEnabledAgents(newEnabledAgents);

    setOriginalConversationState({
      autoMode: newAutoMode,
      enabledAgents: [...newEnabledAgents],
    });
  };

  // Load conversation messages
  const loadConversationMessages = async (conversationId: string) => {
    try {
      const messages = await getConversationMessages(conversationId);

      if (!messages || messages.length === 0) {
        console.warn(`No messages found for conversation ${conversationId}`);
        // Still set the conversation but with empty messages
        const conversation = chatConversations.find(
          (c) => c.id.toString() === conversationId.toString(),
        );
        if (conversation) {
          setCurrentConversation({
            ...conversation,
            messages: [],
          });
          restoreConversationState(conversation);
        }
        return;
      }

      const transformedMessages = messages.map((msg: any) => {
        // Get recommendations from database response (primary source)
        // Fallback to localStorage if database doesn't have them (for backward compatibility)
        let recommendations: Recommendations | undefined = undefined;

        if (msg.sender === "ai") {
          // First, try to get recommendations from database response
          if (msg.recommendations) {
            recommendations = msg.recommendations;
          } else if (msg.content) {
            // Fallback to localStorage for older messages that don't have recommendations in database
            const contentHash = msg.content.substring(0, 50).replace(/\s/g, ""); // First 50 chars as identifier
            const storageKey = `ai_chat_recommendations_${conversationId}_${contentHash}`;
            try {
              const stored = localStorage.getItem(storageKey);
              if (stored) {
                recommendations = JSON.parse(stored);
              }
            } catch (e) {
              console.error("Failed to load recommendations from storage:", e);
            }
          }
        }

        return {
          id: msg.id,
          content: msg.content,
          sender: msg.sender,
          timestamp: new Date(msg.timestamp),
          agent: msg.agent || "AI Assistant",
          confidence: msg.confidence || 85,
          references: msg.references || [],
          recommendations: recommendations,
        };
      });

      const conversation = chatConversations.find(
        (c) => c.id.toString() === conversationId.toString(),
      );

      if (conversation) {
        const conversationWithMessages = {
          ...conversation,
          messages: transformedMessages,
        };

        setCurrentConversation(conversationWithMessages);
        restoreConversationState(conversationWithMessages);

        setChatConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId
              ? { ...conv, messages: transformedMessages }
              : conv,
          ),
        );
      }
    } catch (error: any) {
      console.error("Error loading conversation messages:", error);

      // Handle 404 error (conversation not found or deleted)
      const status = error?.response?.status || error?.status;
      if (
        status === 404 ||
        error?.message?.includes("404") ||
        error?.message?.includes("not found")
      ) {
        // Remove the conversation from the sidebar if it doesn't exist
        setChatConversations((prev) =>
          prev.filter((c) => c.id.toString() !== conversationId.toString()),
        );

        // Show user-friendly error message
        alert(
          "This conversation is no longer available. It may have been deleted.",
        );

        // Reset to landing page
        setCurrentConversation(null);
        setMessage("");
      } else if (status === 403) {
        // Handle 403 error (access denied)
        alert("You do not have permission to access this conversation.");
        setCurrentConversation(null);
        setMessage("");
      } else {
        // Handle other errors
        alert("Failed to load conversation messages. Please try again.");
      }
    }
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const currentMessage = message;
    setMessage("");

    if (!currentConversation) {
      const newConversation: ChatConversation = {
        id: Date.now().toString(),
        title:
          currentMessage.length > 50
            ? currentMessage.substring(0, 50) + "..."
            : currentMessage,
        messages: [],
        lastMessage: currentMessage,
        lastUpdated: new Date().toISOString(),
        participatingAgents: [],
        childId: selectedChild !== "general" ? selectedChild : undefined,
        childName:
          selectedChild !== "general"
            ? children.find((c) => c.id === selectedChild)?.name
            : undefined,
      };
      setCurrentConversation(newConversation);
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      content: currentMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setCurrentConversation((prev) =>
      prev
        ? {
            ...prev,
            messages: [...prev.messages, newMessage],
          }
        : null,
    );

    // Set generating state
    setIsGenerating(true);
    setGenerationStartTime(Date.now());

    // Set agent name for display in generating indicator
    if (!autoMode && enabledAgents.length === 1) {
      const agent = agents.find((a) => a.id === enabledAgents[0]);
      setGeneratingAgent(agent?.name || "AI Assistant");
    } else {
      // In auto mode, show "AI Assistant" (will be updated to actual agent when response arrives)
      setGeneratingAgent("AI Assistant");
    }

    try {
      let manual_agent: string | undefined = undefined;
      let enabled_agents: string[] | undefined = undefined;
      if (!autoMode && enabledAgents.length === 1) {
        manual_agent = enabledAgents[0];
      } else if (!autoMode && enabledAgents.length > 1) {
        // Manual mode with 2-3 agents - send enabled_agents for constrained selection
        enabled_agents = enabledAgents;
      }

      const requestBody = {
        query: currentMessage,
        child_id: currentConversation?.childId
          ? parseInt(currentConversation.childId)
          : selectedChild !== "general"
            ? parseInt(selectedChild)
            : undefined,
        conversation_id: currentConversation?.id
          ? parseInt(currentConversation.id)
          : undefined,
        manual_agent: manual_agent,
        enabled_agents: enabled_agents,
      };

      const data = await sendChat(requestBody);

      // Update generating agent name with actual agent from response
      if (data.agent_type) {
        setGeneratingAgent(data.agent_type);
      }

      if (!data.response) {
        const errorResponse: Message = {
          id: (Date.now() + 1).toString(),
          content:
            "Sorry, I encountered an error while processing your request. Please try again.",
          sender: "ai",
          timestamp: new Date(),
          agent: "AI Assistant",
          confidence: 0,
        };

        setCurrentConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, errorResponse],
              }
            : null,
        );
        return;
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        sender: "ai",
        timestamp: new Date(),
        agent: data.agent_type || "AI Assistant",
        confidence: 85,
        references: data.memories
          ? data.memories.map((m: any) => m.query).slice(0, 3)
          : [],
        recommendations: data.recommendations || undefined,
      };

      // Store recommendations in localStorage as backup (database is primary source)
      // This provides backward compatibility and fallback for older messages
      if (data.recommendations && data.conversation_id) {
        const contentHash = data.response.substring(0, 50).replace(/\s/g, ""); // First 50 chars as identifier
        const storageKey = `ai_chat_recommendations_${data.conversation_id}_${contentHash}`;
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify(data.recommendations),
          );
        } catch (e) {
          console.error(
            "Failed to store recommendations in localStorage (backup):",
            e,
          );
        }
      }

      setCurrentConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, aiResponse],
              id: data.conversation_id?.toString() || prev.id,
            }
          : null,
      );

      // Clear generating state
      setIsGenerating(false);
      setGeneratingAgent(null);
      setGenerationStartTime(null);
      setElapsedSeconds(0);

      fetchConversations();
    } catch (error) {
      console.error("Error sending message:", error);

      // Clear generating state on error
      setIsGenerating(false);
      setGeneratingAgent(null);
      setGenerationStartTime(null);
      setElapsedSeconds(0);

      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: `Network error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
        sender: "ai",
        timestamp: new Date(),
        agent: "AI Assistant",
        confidence: 0,
      };

      setCurrentConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, errorResponse],
            }
          : null,
      );
    }
  };

  const startNewChat = () => {
    setCurrentConversation(null);
    setMessage("");
    setSelectedChild("general");
    setOriginalConversationState(null);
    setAutoMode(true);
    setEnabledAgents([
      "parenting-style",
      "child-development",
      "crisis-intervention",
      "community-connector",
    ]);
  };

  const handleConversationClick = async (conversation: ChatConversation) => {
    await loadConversationMessages(conversation.id);
  };

  // Toggle agent
  const toggleAgent = (agentId: string) => {
    if (
      currentConversation &&
      currentConversation.messages.length > 0 &&
      !autoMode
    ) {
      const isCurrentlyEnabled = enabledAgents.includes(agentId);
      const isEnabling = !isCurrentlyEnabled;

      if (isCurrentlyEnabled && enabledAgents.length === 1) {
        return;
      }

      showAgentChangeDialog(agentId, isEnabling);
    } else {
      setEnabledAgents((prev) => {
        const newEnabled = prev.includes(agentId)
          ? prev.filter((id) => id !== agentId)
          : [...prev, agentId];

        if (newEnabled.length === 0) {
          return prev;
        }

        return newEnabled;
      });
    }
  };

  // Show mode change dialog
  const showModeChangeDialog = (newMode: boolean) => {
    const isSwitchingToAuto = newMode;
    const title = isSwitchingToAuto
      ? "Switch to Auto Mode?"
      : "Switch to Manual Mode?";
    const message = isSwitchingToAuto
      ? "You're switching from manual to auto mode.\n\nAuto mode will automatically select the best agent for each question."
      : "You're switching from auto to manual mode.\n\nManual mode allows you to select specific agents for your questions.";

    setConfirmationDialog({
      isOpen: true,
      type: "mode",
      title,
      message,
      confirmText: isSwitchingToAuto ? "Switch to Auto" : "Switch to Manual",
      cancelText: "Keep Current",
      onConfirm: () => {
        setAutoMode(newMode);
        setConfirmationDialog((prev) => ({ ...prev, isOpen: false }));
        updateConversationMetadataLocal();
      },
      onCancel: () => {
        setConfirmationDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Show agent change dialog
  const showAgentChangeDialog = (agentId: string, isEnabling: boolean) => {
    const agent = agents.find((a) => a.id === agentId);
    const agentName = agent ? agent.name : "Unknown Agent";

    const title = isEnabling ? `Enable ${agentName}?` : `Disable ${agentName}?`;
    const message = isEnabling
      ? `You're enabling ${agentName} for this conversation.\n\nThis conversation will continue with the new agent configuration.`
      : `You're disabling ${agentName} for this conversation.\n\nThis conversation will continue with the updated agent configuration.`;

    setConfirmationDialog({
      isOpen: true,
      type: "agent",
      title,
      message,
      confirmText: isEnabling ? "Enable Agent" : "Disable Agent",
      cancelText: "Keep Current",
      onConfirm: () => {
        if (isEnabling) {
          setEnabledAgents((prev) => [...prev, agentId]);
        } else {
          setEnabledAgents((prev) => prev.filter((id) => id !== agentId));
        }
        setConfirmationDialog((prev) => ({ ...prev, isOpen: false }));
        updateConversationMetadataLocal();
      },
      onCancel: () => {
        setConfirmationDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Update conversation metadata
  const updateConversationMetadataLocal = async () => {
    if (!currentConversation) return;

    try {
      await updateConversationMetadata(currentConversation.id, {
        conversation_type: autoMode ? "general" : "agent-specific",
        enabled_agents: enabledAgents,
        primary_agent_type:
          enabledAgents.length === 1
            ? agents.find((a) => a.id === enabledAgents[0])?.name
            : null,
      });

      setOriginalConversationState({
        autoMode,
        enabledAgents: [...enabledAgents],
      });
    } catch (error) {
      console.error("Error updating conversation metadata:", error);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
  };

  // Delete conversation handlers
  const handleDeleteConversation = (conversation: ChatConversation) => {
    setConversationToDelete(conversation);
    setDeleteConfirmOpen(true);
    setConversationMenuOpen(null);
  };

  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return;

    setDeleting(true);
    try {
      await deleteConversation(conversationToDelete.id);

      // If deleting current conversation, reset to landing page
      if (currentConversation?.id === conversationToDelete.id) {
        setCurrentConversation(null);
        setMessage("");
      }

      // Remove from conversations list
      setChatConversations((prev) =>
        prev.filter((c) => c.id !== conversationToDelete.id),
      );

      setDeleteConfirmOpen(false);
      setConversationToDelete(null);
    } catch (error) {
      console.error("Error deleting conversation:", error);
      alert("Failed to delete conversation. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeleteConversation = () => {
    setDeleteConfirmOpen(false);
    setConversationToDelete(null);
  };

  // Bot pill selector display logic
  const getBotPillText = () => {
    if (autoMode) {
      return "Auto";
    } else if (enabledAgents.length === 1) {
      const agent = agents.find((a) => a.id === enabledAgents[0]);
      return agent?.name || "Manual";
    } else {
      return "Manual";
    }
  };

  const getBotPillColor = () => {
    if (autoMode) {
      //return "#9CA3AF"; // Grey
      return "#AA855B";
    } else if (enabledAgents.length === 1) {
      const agent = agents.find((a) => a.id === enabledAgents[0]);
      return agent?.color || "#326586"; // Blue fallback
    } else {
      return "#326586"; // Blue
    }
  };

  // Get hover color (slightly lighter/darker for better visibility)
  const getBotPillHoverColor = () => {
    const baseColor = getBotPillColor();
    // Convert hex to RGB, lighten by 10%
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);
    const lighterR = Math.min(255, r + 25);
    const lighterG = Math.min(255, g + 25);
    const lighterB = Math.min(255, b + 25);
    return `rgb(${lighterR}, ${lighterG}, ${lighterB})`;
  };

  if (loading) {
    return (
      <div
        className="pt-16 flex h-screen items-center justify-center font-['Poppins']"
        style={{ backgroundColor: "#FAEFE2" }}
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: "#F2742C" }}
          ></div>
          <p style={{ color: "#32332D" }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* CSS Animations for Loading Indicator */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.95);
          }
        }
        
        @keyframes pulseBot {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.8;
          }
        }
        
        @keyframes typingDot {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.7;
          }
          30% {
            transform: translateY(-8px);
            opacity: 1;
          }
        }
      `}</style>
      <div
        className="pt-16 flex h-screen overflow-hidden font-['Poppins']"
        style={{ backgroundColor: "#FAEFE2" }}
      >
        {/* History Sidebar - Drawer on mobile/tablet, sidebar on desktop */}
        {/* Mobile/Tablet: Overlay Drawer */}
        {leftSidebarOpen && (
          <div
            className="fixed inset-0 z-[60] lg:hidden"
            onClick={() => setLeftSidebarOpen(false)}
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-80 flex flex-col h-full overflow-hidden transition-transform duration-300"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "#FAEFE2",
                borderRight: "1px solid #AA855B",
              }}
            >
              {/* Sidebar Header */}
              <div className="p-4 flex items-center gap-2">
                <button
                  onClick={startNewChat}
                  className="flex-1 px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg font-medium font-['Poppins']"
                  style={{
                    backgroundColor: "#F2742C",
                    color: "#FFFFFF",
                    border: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#E55A1F";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#F2742C";
                  }}
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  New Chat
                </button>
                <button
                  onClick={() => setLeftSidebarOpen(false)}
                  className="p-2 rounded-lg transition-colors flex-shrink-0"
                  style={{ color: "#32332D" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#F0DCC9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <PanelRight className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              <div className="px-4 pb-3">
                <div className="relative">
                  <Search
                    className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2"
                    style={{ color: "#AA855B" }}
                  />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg font-['Poppins'] text-sm"
                    style={{
                      border: "1px solid #AA855B",
                      backgroundColor: "#F5F5F5",
                      color: "#32332D",
                    }}
                  />
                </div>
              </div>

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {/* General Conversations */}
                <div className="px-4 pb-4 pt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare
                      className="w-4 h-4"
                      style={{ color: "#AA855B" }}
                    />
                    <h3
                      className="font-medium font-['Poppins'] text-sm"
                      style={{ color: "#32332D" }}
                    >
                      General ({groupedConversations.general.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {groupedConversations.general.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`relative group conversation-menu-container p-3 rounded-lg transition-all duration-200 font-['Poppins'] ${
                          currentConversation?.id === conversation.id
                            ? "border-2"
                            : "border border-transparent hover:border"
                        }`}
                        style={{
                          backgroundColor:
                            currentConversation?.id === conversation.id
                              ? "#F5F5F5"
                              : "transparent",
                          borderColor: "#AA855B",
                        }}
                      >
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            handleConversationClick(conversation);
                            // Close drawer on mobile/tablet after selecting conversation
                            setLeftSidebarOpen(false);
                          }}
                        >
                          <div
                            className="font-medium text-xs truncate pr-8"
                            style={{ color: "#32332D" }}
                          >
                            {conversation.title}
                          </div>
                          <div
                            className="text-xs mt-1 truncate pr-8 opacity-70"
                            style={{ color: "#AA855B", fontSize: "11px" }}
                          >
                            {conversation.lastMessage}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConversationMenuOpen(
                              conversationMenuOpen === conversation.id
                                ? null
                                : conversation.id,
                            );
                          }}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                          style={{ color: "#AA855B" }}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {conversationMenuOpen === conversation.id && (
                          <div
                            className="absolute right-2 top-10 bg-white rounded-lg shadow-lg border z-10 min-w-[120px]"
                            style={{ borderColor: "#AA855B" }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConversation(conversation);
                              }}
                              className="w-full px-4 py-2 text-left text-sm font-['Poppins'] hover:bg-gray-100 rounded-lg flex items-center gap-2 transition-colors"
                              style={{ color: "#F2742C" }}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Children Conversations */}
                {groupedConversations.children.map(
                  ({ child, conversations }) => (
                    <div key={child.id} className="px-4 pb-4 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Baby
                          className="w-4 h-4"
                          style={{ color: "#AA855B" }}
                        />
                        <h3
                          className="font-medium font-['Poppins'] text-sm"
                          style={{ color: "#32332D" }}
                        >
                          {child.name} ({conversations.length})
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {conversations.map((conversation) => (
                          <div
                            key={conversation.id}
                            className={`relative group conversation-menu-container p-3 rounded-lg transition-all duration-200 font-['Poppins'] ${
                              currentConversation?.id === conversation.id
                                ? "border-2"
                                : "border border-transparent hover:border"
                            }`}
                            style={{
                              backgroundColor:
                                currentConversation?.id === conversation.id
                                  ? "#F5F5F5"
                                  : "transparent",
                              borderColor: "#AA855B",
                            }}
                          >
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => {
                                handleConversationClick(conversation);
                                // Close drawer on mobile/tablet after selecting conversation
                                setLeftSidebarOpen(false);
                              }}
                            >
                              <div
                                className="font-medium text-xs truncate pr-8"
                                style={{ color: "#32332D" }}
                              >
                                {conversation.title}
                              </div>
                              <div
                                className="text-xs mt-1 truncate pr-8 opacity-70"
                                style={{ color: "#AA855B", fontSize: "11px" }}
                              >
                                {conversation.lastMessage}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConversationMenuOpen(
                                  conversationMenuOpen === conversation.id
                                    ? null
                                    : conversation.id,
                                );
                              }}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                              style={{ color: "#AA855B" }}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {conversationMenuOpen === conversation.id && (
                              <div
                                className="absolute right-2 top-10 bg-white rounded-lg shadow-lg border z-10 min-w-[120px]"
                                style={{ borderColor: "#AA855B" }}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteConversation(conversation);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm font-['Poppins'] hover:bg-gray-100 rounded-lg flex items-center gap-2 transition-colors"
                                  style={{ color: "#F2742C" }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        )}

        {/* Desktop Sidebar - Always visible on lg+ screens */}
        <div
          className={`hidden lg:flex transition-all duration-300 flex-col h-full overflow-hidden ${
            leftSidebarOpen ? "w-80" : "w-0"
          }`}
          style={{
            backgroundColor: "#FAEFE2",
            borderRight: leftSidebarOpen ? "1px solid #AA855B" : "none",
          }}
        >
          {leftSidebarOpen && (
            <>
              {/* Sidebar Header */}
              <div className="p-4 flex items-center gap-2">
                <button
                  onClick={startNewChat}
                  className="flex-1 px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg font-medium font-['Poppins']"
                  style={{
                    backgroundColor: "#F2742C",
                    color: "#FFFFFF",
                    border: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#E55A1F";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#F2742C";
                  }}
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  New Chat
                </button>
                <button
                  onClick={() => setLeftSidebarOpen(false)}
                  className="p-2 rounded-lg transition-colors flex-shrink-0"
                  style={{ color: "#32332D" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#F0DCC9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <PanelRight className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              <div className="px-4 pb-3">
                <div className="relative">
                  <Search
                    className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2"
                    style={{ color: "#AA855B" }}
                  />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg font-['Poppins'] text-sm"
                    style={{
                      border: "1px solid #AA855B",
                      backgroundColor: "#F5F5F5",
                      color: "#32332D",
                    }}
                  />
                </div>
              </div>

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {/* General Conversations */}
                <div className="px-4 pb-4 pt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare
                      className="w-4 h-4"
                      style={{ color: "#AA855B" }}
                    />
                    <h3
                      className="font-medium font-['Poppins'] text-sm"
                      style={{ color: "#32332D" }}
                    >
                      General ({groupedConversations.general.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {groupedConversations.general.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`relative group conversation-menu-container p-3 rounded-lg transition-all duration-200 font-['Poppins'] ${
                          currentConversation?.id === conversation.id
                            ? "border-2"
                            : "border border-transparent hover:border"
                        }`}
                        style={{
                          backgroundColor:
                            currentConversation?.id === conversation.id
                              ? "#F5F5F5"
                              : "transparent",
                          borderColor: "#AA855B",
                        }}
                      >
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => handleConversationClick(conversation)}
                        >
                          <div
                            className="font-medium text-xs truncate pr-8"
                            style={{ color: "#32332D" }}
                          >
                            {conversation.title}
                          </div>
                          <div
                            className="text-xs mt-1 truncate pr-8 opacity-70"
                            style={{ color: "#AA855B", fontSize: "11px" }}
                          >
                            {conversation.lastMessage}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConversationMenuOpen(
                              conversationMenuOpen === conversation.id
                                ? null
                                : conversation.id,
                            );
                          }}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                          style={{ color: "#AA855B" }}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {conversationMenuOpen === conversation.id && (
                          <div
                            className="absolute right-2 top-10 bg-white rounded-lg shadow-lg border z-10 min-w-[120px]"
                            style={{ borderColor: "#AA855B" }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConversation(conversation);
                              }}
                              className="w-full px-4 py-2 text-left text-sm font-['Poppins'] hover:bg-gray-100 rounded-lg flex items-center gap-2 transition-colors"
                              style={{ color: "#F2742C" }}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Children Conversations */}
                {groupedConversations.children.map(
                  ({ child, conversations }) => (
                    <div key={child.id} className="px-4 pb-4 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Baby
                          className="w-4 h-4"
                          style={{ color: "#AA855B" }}
                        />
                        <h3
                          className="font-medium font-['Poppins'] text-sm"
                          style={{ color: "#32332D" }}
                        >
                          {child.name} ({conversations.length})
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {conversations.map((conversation) => (
                          <div
                            key={conversation.id}
                            className={`relative group conversation-menu-container p-3 rounded-lg transition-all duration-200 font-['Poppins'] ${
                              currentConversation?.id === conversation.id
                                ? "border-2"
                                : "border border-transparent hover:border"
                            }`}
                            style={{
                              backgroundColor:
                                currentConversation?.id === conversation.id
                                  ? "#F5F5F5"
                                  : "transparent",
                              borderColor: "#AA855B",
                            }}
                          >
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() =>
                                handleConversationClick(conversation)
                              }
                            >
                              <div
                                className="font-medium text-xs truncate pr-8"
                                style={{ color: "#32332D" }}
                              >
                                {conversation.title}
                              </div>
                              <div
                                className="text-xs mt-1 truncate pr-8 opacity-70"
                                style={{ color: "#AA855B", fontSize: "11px" }}
                              >
                                {conversation.lastMessage}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConversationMenuOpen(
                                  conversationMenuOpen === conversation.id
                                    ? null
                                    : conversation.id,
                                );
                              }}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                              style={{ color: "#AA855B" }}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {conversationMenuOpen === conversation.id && (
                              <div
                                className="absolute right-2 top-10 bg-white rounded-lg shadow-lg border z-10 min-w-[120px]"
                                style={{ borderColor: "#AA855B" }}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteConversation(conversation);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm font-['Poppins'] hover:bg-gray-100 rounded-lg flex items-center gap-2 transition-colors"
                                  style={{ color: "#F2742C" }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </>
          )}
        </div>

        {/* Sidebar Toggle Button - Mobile/Tablet: Fixed position when sidebar is closed */}
        {!leftSidebarOpen && (
          <button
            onClick={() => setLeftSidebarOpen(true)}
            className="fixed top-28 sm:top-32 left-4 z-30 p-2 rounded-lg transition-all duration-200 hover:shadow-md font-['Poppins'] lg:hidden"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #AA855B",
              color: "#32332D",
            }}
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        )}

        {/* Sidebar Toggle Button - Desktop: Fixed position when sidebar is closed */}
        {!leftSidebarOpen && (
          <button
            onClick={() => setLeftSidebarOpen(true)}
            className="hidden lg:block fixed top-20 left-4 z-30 p-2 rounded-lg transition-all duration-200 hover:shadow-md font-['Poppins']"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #AA855B",
              color: "#32332D",
            }}
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        )}

        {/* Main Chat Area - Full width on mobile, constrained on desktop */}
        <div className="flex-1 flex flex-col h-full overflow-hidden w-full lg:w-auto">
          {/* Page Container */}
          <div className="w-full lg:max-w-7xl lg:mx-auto px-3 sm:px-4 lg:px-8 h-full flex flex-col">
            {/* Header */}
            <div
              className="p-3 sm:p-4 flex-shrink-0"
              style={{ borderColor: "#AA855B", backgroundColor: "#FAEFE2" }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                  {currentConversation && !isLandingPage && (
                    <h1
                      className="text-base sm:text-xl font-semibold font-['Poppins'] truncate"
                      style={{ color: "#32332D" }}
                    >
                      {currentConversation?.childName
                        ? `Discussing ${currentConversation.childName}`
                        : currentConversation.title}
                    </h1>
                  )}

                  {/* Child Selector */}
                  {isLandingPage && (
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <label
                        className="text-xs sm:text-sm font-['Poppins'] hidden sm:inline"
                        style={{ color: "#AA855B" }}
                      >
                        Context:
                      </label>
                      <div className="relative">
                        <select
                          value={selectedChild}
                          onChange={(e) => setSelectedChild(e.target.value)}
                          onFocus={() => setChildSelectorOpen(true)}
                          onBlur={() => setChildSelectorOpen(false)}
                          className="px-2 sm:px-3 py-1 pr-6 sm:pr-8 border rounded-lg text-xs sm:text-sm font-['Poppins'] focus:ring-2 focus:ring-offset-0 appearance-none"
                          style={{
                            borderColor: "#AA855B",
                            backgroundColor: "#F5F3F0",
                            color: "#32332D",
                          }}
                        >
                          <option value="general">General Parenting</option>
                          {children.map((child) => (
                            <option key={child.id} value={child.id}>
                              {child.name} ({child.age} years old)
                            </option>
                          ))}
                        </select>
                        {childSelectorOpen ? (
                          <ChevronUp
                            className="w-3 h-3 sm:w-4 sm:h-4 absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                            style={{ color: "#AA855B" }}
                          />
                        ) : (
                          <ChevronDown
                            className="w-3 h-3 sm:w-4 sm:h-4 absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                            style={{ color: "#AA855B" }}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Agent Control Button - More prominent on mobile */}
                <button
                  onClick={() => setAgentModalOpen(true)}
                  className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200 hover:shadow-md font-medium font-['Poppins'] flex items-center gap-1 sm:gap-2 flex-shrink-0"
                  style={{
                    backgroundColor: "#F5F5F5",
                    border: "1px solid #AA855B",
                    color: "#32332D",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#F0DCC9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#F5F5F5";
                  }}
                >
                  <Bot
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    style={{ color: "#AA855B" }}
                  />
                  <span className="hidden sm:inline">Agents</span>
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div
              className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 lg:p-6"
              style={{ backgroundColor: "#FAEFE2" }}
            >
              {isLandingPage ? (
                /* Landing Page */
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="text-center">
                    <BotMessageSquare
                      className="w-16 h-16 mx-auto mb-4"
                      style={{ color: "#AA855B" }}
                    />
                    <h2
                      className="text-xl font-bold mb-2 font-['Poppins']"
                      style={{ color: "#32332D" }}
                    >
                      AI Parenting Assistant
                    </h2>
                    <p
                      className="text-base font-['Poppins']"
                      style={{ color: "#AA855B" }}
                    >
                      Get personalized guidance from our specialized AI agents
                    </p>
                  </div>

                  {/* Floating Input (Centered) */}
                  <div className="flex justify-center my-4 sm:my-8">
                    <div
                      className="w-full max-w-2xl rounded-xl border p-3 sm:p-4"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.5)",
                        backdropFilter: "blur(10px)",
                        borderColor: "#AA855B",
                      }}
                    >
                      {/* Top: Multi-line Textarea */}
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder={`Ask about ${selectedChild !== "general" ? children.find((c) => c.id === selectedChild)?.name : "parenting"}...`}
                        className="w-full border-none bg-transparent focus:outline-none text-sm font-['Poppins'] resize-none min-h-[30px] max-h-[120px]"
                        style={{ color: "#32332D" }}
                        rows={2}
                      />

                      {/* Bottom: Control Bar */}
                      <div className="flex items-center justify-between mt-0 pt-0">
                        {/* Left: Bot Icon Pill Button (Opens Agent Control Center Modal) */}
                        <button
                          onClick={() => setAgentModalOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-['Poppins'] transition-all cursor-pointer"
                          style={{
                            backgroundColor: getBotPillColor(),
                            borderColor: getBotPillColor(),
                            color: "#FFFFFF",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              getBotPillHoverColor();
                            e.currentTarget.style.borderColor =
                              getBotPillHoverColor();
                            e.currentTarget.style.transform = "scale(1.05)";
                            e.currentTarget.style.boxShadow =
                              "0 2px 8px rgba(0, 0, 0, 0.15)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              getBotPillColor();
                            e.currentTarget.style.borderColor =
                              getBotPillColor();
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <Bot className="w-4 h-4" />
                          <span>{getBotPillText()}</span>
                        </button>

                        {/* Right: Send Button */}
                        <button
                          onClick={handleSendMessage}
                          disabled={!message.trim()}
                          className="px-3 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg font-medium font-['Poppins'] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          style={{
                            backgroundColor: "#F2742C",
                            color: "#FFFFFF",
                            border: "none",
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
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quick Questions - Horizontal Pills */}
                  <div className="mt-4">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {quickSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="px-3 py-1.5 rounded-full text-xs font-['Poppins'] transition-all duration-200 hover:shadow-sm"
                          style={{
                            backgroundColor: "#F5F5F5",
                            border: "1px solid #AA855B",
                            color: "#32332D",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#FAEFE2";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#F5F5F5";
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Chat Messages */
                <div className="space-y-3 sm:space-y-4 w-full max-w-4xl mx-auto px-1 sm:px-0">
                  {currentConversation?.messages &&
                  currentConversation.messages.length > 0 ? (
                    currentConversation.messages.map((msg) => {
                      const agent = agents.find((a) => a.name === msg.agent);
                      const Icon = agent?.icon || Bot;

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`w-full sm:max-w-md md:max-w-lg lg:max-w-xl rounded-lg p-3 sm:p-4 font-['Poppins'] ${
                              msg.sender === "user"
                                ? "text-white"
                                : "bg-white/80 backdrop-blur border"
                            }`}
                            style={{
                              backgroundColor:
                                msg.sender === "user" ? "#0F5648" : undefined,
                              borderColor:
                                msg.sender === "ai" ? "#AA855B" : undefined,
                              wordWrap: "break-word",
                              overflowWrap: "break-word",
                            }}
                          >
                            {msg.sender === "ai" && msg.agent && agent && (
                              <div className="mb-2">
                                <span
                                  className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold text-white"
                                  style={{ backgroundColor: agent.color }}
                                >
                                  <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  <span className="hidden sm:inline">
                                    {agent.name}
                                  </span>
                                  <span className="sm:hidden">
                                    {agent.name.split(" ")[0]}
                                  </span>
                                </span>
                              </div>
                            )}
                            <div
                              className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words"
                              style={{
                                color:
                                  msg.sender === "user" ? "#FFFFFF" : "#32332D",
                              }}
                            >
                              {msg.content}
                            </div>

                            {/* Recommendations Display */}
                            {msg.sender === "ai" && msg.recommendations && (
                              <div
                                className="mt-4 pt-4 border-t"
                                style={{ borderColor: "#AA855B" }}
                              >
                                {/* Professionals */}
                                {msg.recommendations.professionals &&
                                  msg.recommendations.professionals.length >
                                    0 && (
                                    <div className="mb-3 sm:mb-4">
                                      <h4
                                        className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 uppercase tracking-wide"
                                        style={{ color: "#AA855B" }}
                                      >
                                        Recommended Professionals
                                      </h4>
                                      <div className="space-y-2">
                                        {msg.recommendations.professionals.map(
                                          (prof, idx) => (
                                            <button
                                              key={idx}
                                              onClick={(e) => {
                                                e.preventDefault();
                                                window.open(
                                                  `/professional-directory/${prof.professional_id}`,
                                                  "_blank",
                                                );
                                              }}
                                              className="w-full text-left p-3 rounded-lg border transition-all duration-200 hover:shadow-md group"
                                              style={{
                                                backgroundColor: "#FAEFE2",
                                                borderColor: "#AA855B",
                                              }}
                                              onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                  "#F5F5F5";
                                                e.currentTarget.style.borderColor =
                                                  "#F2742C";
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                  "#FAEFE2";
                                                e.currentTarget.style.borderColor =
                                                  "#AA855B";
                                              }}
                                            >
                                              <div className="flex items-start gap-2 sm:gap-3">
                                                {prof.profile_image_url ? (
                                                  <img
                                                    src={prof.profile_image_url}
                                                    alt={prof.business_name}
                                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
                                                    onError={(e) => {
                                                      (
                                                        e.target as HTMLImageElement
                                                      ).style.display = "none";
                                                    }}
                                                  />
                                                ) : (
                                                  <div
                                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                                                    style={{
                                                      backgroundColor:
                                                        "#E8F4F8",
                                                    }}
                                                  >
                                                    <Users
                                                      className="w-5 h-5 sm:w-6 sm:h-6"
                                                      style={{
                                                        color: "#326586",
                                                      }}
                                                    />
                                                  </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                                                    <h5
                                                      className="text-xs sm:text-sm font-semibold font-['Poppins'] truncate"
                                                      style={{
                                                        color: "#32332D",
                                                      }}
                                                    >
                                                      {prof.business_name}
                                                    </h5>
                                                    <ArrowRight
                                                      className="w-3 h-3 sm:w-4 sm:h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                                                      style={{
                                                        color: "#F2742C",
                                                      }}
                                                    />
                                                  </div>
                                                  {prof.specializations &&
                                                    prof.specializations
                                                      .length > 0 && (
                                                      <p
                                                        className="text-[10px] sm:text-xs font-['Poppins'] mb-1"
                                                        style={{
                                                          color: "#64635E",
                                                        }}
                                                      >
                                                        {prof.specializations
                                                          .slice(0, 2)
                                                          .join(", ")}
                                                        {prof.specializations
                                                          .length > 2 && "..."}
                                                      </p>
                                                    )}
                                                  {/* Services */}
                                                  {prof.services &&
                                                    prof.services.length >
                                                      0 && (
                                                      <div className="mb-1">
                                                        {prof.services
                                                          .slice(0, 2)
                                                          .map(
                                                            (service, sIdx) => (
                                                              <div
                                                                key={sIdx}
                                                                className="text-[10px] sm:text-xs font-['Poppins'] mb-0.5"
                                                                style={{
                                                                  color:
                                                                    "#64635E",
                                                                }}
                                                              >
                                                                <span
                                                                  className="font-medium"
                                                                  style={{
                                                                    color:
                                                                      "#32332D",
                                                                  }}
                                                                >
                                                                  {
                                                                    service.service_name
                                                                  }
                                                                </span>
                                                                {service.service_category && (
                                                                  <span
                                                                    className="ml-1"
                                                                    style={{
                                                                      color:
                                                                        "#AA855B",
                                                                    }}
                                                                  >
                                                                    (
                                                                    {
                                                                      service.service_category
                                                                    }
                                                                    )
                                                                  </span>
                                                                )}
                                                                {service.price_range && (
                                                                  <span
                                                                    className="ml-1 font-semibold"
                                                                    style={{
                                                                      color:
                                                                        "#F2742C",
                                                                    }}
                                                                  >
                                                                    •{" "}
                                                                    {
                                                                      service.price_range
                                                                    }
                                                                  </span>
                                                                )}
                                                              </div>
                                                            ),
                                                          )}
                                                      </div>
                                                    )}
                                                  {(prof.city ||
                                                    prof.state) && (
                                                    <div
                                                      className="flex items-center gap-1 text-[10px] sm:text-xs font-['Poppins']"
                                                      style={{
                                                        color: "#AA855B",
                                                      }}
                                                    >
                                                      <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                      <span>
                                                        {[prof.city, prof.state]
                                                          .filter(Boolean)
                                                          .join(", ")}
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </button>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  )}

                                {/* Resources */}
                                {msg.recommendations.resources &&
                                  msg.recommendations.resources.length > 0 && (
                                    <div className="mb-3 sm:mb-4">
                                      <h4
                                        className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 uppercase tracking-wide"
                                        style={{ color: "#AA855B" }}
                                      >
                                        Recommended Resources
                                      </h4>
                                      <div className="space-y-2">
                                        {msg.recommendations.resources.map(
                                          (resource, idx) => (
                                            <button
                                              key={idx}
                                              onClick={(e) => {
                                                e.preventDefault();
                                                window.open(
                                                  `/resources/${resource.resource_id}`,
                                                  "_blank",
                                                );
                                              }}
                                              className="w-full text-left p-2 sm:p-3 rounded-lg border transition-all duration-200 hover:shadow-md group"
                                              style={{
                                                backgroundColor: "#FAEFE2",
                                                borderColor: "#AA855B",
                                              }}
                                              onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                  "#F5F5F5";
                                                e.currentTarget.style.borderColor =
                                                  "#F2742C";
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                  "#FAEFE2";
                                                e.currentTarget.style.borderColor =
                                                  "#AA855B";
                                              }}
                                            >
                                              <div className="flex items-start gap-2 sm:gap-3">
                                                {resource.thumbnail_url ? (
                                                  <img
                                                    src={resource.thumbnail_url}
                                                    alt={resource.title}
                                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
                                                    onError={(e) => {
                                                      (
                                                        e.target as HTMLImageElement
                                                      ).style.display = "none";
                                                    }}
                                                  />
                                                ) : (
                                                  <div
                                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                                                    style={{
                                                      backgroundColor:
                                                        "#DBEAFE",
                                                    }}
                                                  >
                                                    <BookOpen
                                                      className="w-5 h-5 sm:w-6 sm:h-6"
                                                      style={{
                                                        color: "#2563EB",
                                                      }}
                                                    />
                                                  </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                                                    <h5
                                                      className="text-xs sm:text-sm font-semibold font-['Poppins'] truncate"
                                                      style={{
                                                        color: "#32332D",
                                                      }}
                                                    >
                                                      {resource.title}
                                                    </h5>
                                                    <ArrowRight
                                                      className="w-3 h-3 sm:w-4 sm:h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                                                      style={{
                                                        color: "#F2742C",
                                                      }}
                                                    />
                                                  </div>
                                                  {(resource.description ||
                                                    resource.excerpt) && (
                                                    <p
                                                      className="text-[10px] sm:text-xs font-['Poppins'] mb-1 line-clamp-2"
                                                      style={{
                                                        color: "#64635E",
                                                      }}
                                                    >
                                                      {resource.description ||
                                                        resource.excerpt}
                                                    </p>
                                                  )}
                                                  {resource.tags &&
                                                    resource.tags.length >
                                                      0 && (
                                                      <div className="flex flex-wrap gap-1 mt-1">
                                                        {resource.tags
                                                          .slice(0, 2)
                                                          .map(
                                                            (tag, tagIdx) => (
                                                              <span
                                                                key={tagIdx}
                                                                className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-['Poppins']"
                                                                style={{
                                                                  backgroundColor:
                                                                    "#E8F4F8",
                                                                  color:
                                                                    "#326586",
                                                                }}
                                                              >
                                                                {tag}
                                                              </span>
                                                            ),
                                                          )}
                                                      </div>
                                                    )}
                                                </div>
                                              </div>
                                            </button>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  )}

                                {/* Communities */}
                                {msg.recommendations.communities &&
                                  msg.recommendations.communities.length >
                                    0 && (
                                    <div>
                                      <h4
                                        className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 uppercase tracking-wide"
                                        style={{ color: "#AA855B" }}
                                      >
                                        Recommended Communities
                                      </h4>
                                      <div className="space-y-2">
                                        {msg.recommendations.communities.map(
                                          (community, idx) => (
                                            <button
                                              key={idx}
                                              onClick={(e) => {
                                                e.preventDefault();
                                                window.open(
                                                  community.community_id
                                                    ? `/communities/${community.community_id}`
                                                    : `/community`,
                                                  "_blank",
                                                );
                                              }}
                                              className="w-full text-left p-2 sm:p-3 rounded-lg border transition-all duration-200 hover:shadow-md group"
                                              style={{
                                                backgroundColor: "#FAEFE2",
                                                borderColor: "#AA855B",
                                              }}
                                              onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                  "#F5F5F5";
                                                e.currentTarget.style.borderColor =
                                                  "#F2742C";
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                  "#FAEFE2";
                                                e.currentTarget.style.borderColor =
                                                  "#AA855B";
                                              }}
                                            >
                                              <div className="flex items-start gap-2 sm:gap-3">
                                                {community.cover_image_url ? (
                                                  <img
                                                    src={
                                                      community.cover_image_url
                                                    }
                                                    alt={community.name}
                                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
                                                    onError={(e) => {
                                                      (
                                                        e.target as HTMLImageElement
                                                      ).style.display = "none";
                                                    }}
                                                  />
                                                ) : (
                                                  <div
                                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                                                    style={{
                                                      backgroundColor:
                                                        "#E8F4F8",
                                                    }}
                                                  >
                                                    <Users
                                                      className="w-5 h-5 sm:w-6 sm:h-6"
                                                      style={{
                                                        color: "#326586",
                                                      }}
                                                    />
                                                  </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                                                    <h5
                                                      className="text-xs sm:text-sm font-semibold font-['Poppins'] truncate"
                                                      style={{
                                                        color: "#32332D",
                                                      }}
                                                    >
                                                      {community.name}
                                                    </h5>
                                                    <ArrowRight
                                                      className="w-3 h-3 sm:w-4 sm:h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                                                      style={{
                                                        color: "#F2742C",
                                                      }}
                                                    />
                                                  </div>
                                                  {community.description && (
                                                    <p
                                                      className="text-[10px] sm:text-xs font-['Poppins'] line-clamp-2"
                                                      style={{
                                                        color: "#64635E",
                                                      }}
                                                    >
                                                      {community.description}
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                            </button>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            )}

                            <div
                              className={`text-[10px] sm:text-xs mt-2 ${msg.sender === "user" ? "opacity-70 text-right" : "opacity-50"}`}
                              style={{
                                color:
                                  msg.sender === "user" ? "#FFFFFF" : "#32332D",
                              }}
                            >
                              {msg.timestamp.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div
                      className="text-center py-6 sm:py-8 font-['Poppins']"
                      style={{ color: "#AA855B" }}
                    >
                      <p className="text-xs sm:text-sm">
                        No messages in this conversation yet.
                      </p>
                      <p className="text-[10px] sm:text-sm mt-2">
                        Start by sending a message below.
                      </p>
                    </div>
                  )}

                  {/* AI Generating Indicator - Minimal Text Style */}
                  {isGenerating && (
                    <div className="flex justify-start">
                      <div className="py-2">
                        {/* Thinking with animated dots */}
                        <div
                          className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-['Poppins']"
                          style={{ color: "#32332D" }}
                        >
                          <Bot
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                            style={{
                              color: "#AA855B",
                              animation:
                                "pulseBot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                            }}
                          />
                          <span>
                            {generatingAgent
                              ? `${generatingAgent} is thinking`
                              : "Thinking"}
                          </span>
                          <div className="flex gap-1">
                            <span
                              className="inline-block w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: "#AA855B",
                                animation: "typingDot 1.4s infinite",
                                animationDelay: "0s",
                              }}
                            />
                            <span
                              className="inline-block w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: "#AA855B",
                                animation: "typingDot 1.4s infinite",
                                animationDelay: "0.2s",
                              }}
                            />
                            <span
                              className="inline-block w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: "#AA855B",
                                animation: "typingDot 1.4s infinite",
                                animationDelay: "0.4s",
                              }}
                            />
                          </div>
                        </div>
                        {/* Estimated time */}
                        {generationStartTime &&
                          (() => {
                            // Estimate: typical response is 10-15 seconds
                            const estimatedTotal = 12; // Average response time in seconds
                            const elapsed =
                              elapsedSeconds ||
                              Math.ceil(
                                (Date.now() - generationStartTime) / 1000,
                              );
                            const remaining = Math.max(
                              2,
                              estimatedTotal - elapsed,
                            );
                            return (
                              <div
                                className="text-[10px] sm:text-xs mt-1 font-['Poppins'] opacity-60"
                                style={{ color: "#AA855B" }}
                              >
                                {elapsed > 0 && (
                                  <span>Generating ({elapsed}s elapsed)</span>
                                )}
                                {elapsed < estimatedTotal && (
                                  <span className="ml-1">
                                    ~{remaining} more seconds
                                  </span>
                                )}
                                {elapsed >= estimatedTotal && (
                                  <span className="ml-1">
                                    Taking a bit longer...
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area - Fixed at bottom when chat is active */}
            {!isLandingPage && (
              <div
                className="p-3 sm:p-4 flex-shrink-0"
                style={{ borderColor: "#AA855B", backgroundColor: "#FAEFE2" }}
              >
                <div
                  className="w-full max-w-4xl mx-auto rounded-xl border p-3 sm:p-4"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.5)",
                    backdropFilter: "blur(10px)",
                    borderColor: "#AA855B",
                  }}
                >
                  {/* Top: Multi-line Textarea */}
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask about parenting..."
                    className="w-full border-none bg-transparent focus:outline-none text-sm font-['Poppins'] resize-none min-h-[30px] max-h-[120px]"
                    style={{ color: "#32332D" }}
                    rows={2}
                  />

                  {/* Bottom: Control Bar */}
                  <div className="flex items-center justify-between mt-0 pt-0">
                    {/* Left: Bot Icon Pill Button (Opens Agent Control Center Modal) */}
                    <button
                      onClick={() => setAgentModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-['Poppins'] transition-all cursor-pointer"
                      style={{
                        backgroundColor: getBotPillColor(),
                        borderColor: getBotPillColor(),
                        color: "#FFFFFF",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          getBotPillHoverColor();
                        e.currentTarget.style.borderColor =
                          getBotPillHoverColor();
                        e.currentTarget.style.transform = "scale(1.05)";
                        e.currentTarget.style.boxShadow =
                          "0 2px 8px rgba(0, 0, 0, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          getBotPillColor();
                        e.currentTarget.style.borderColor = getBotPillColor();
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <Bot className="w-4 h-4" />
                      <span>{getBotPillText()}</span>
                    </button>

                    {/* Right: Send Button */}
                    <button
                      onClick={handleSendMessage}
                      disabled={!message.trim()}
                      className="px-3 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg font-medium font-['Poppins'] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      style={{
                        backgroundColor: "#F2742C",
                        color: "#FFFFFF",
                        border: "none",
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
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Agent Control Center Modal - Full screen on mobile, modal on desktop */}
        {agentModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4"
            onClick={() => setAgentModalOpen(false)}
          >
            <div
              className="bg-white rounded-none sm:rounded-xl max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col font-['Poppins']"
              onClick={(e) => e.stopPropagation()}
              style={{ border: "2px solid #AA855B" }}
            >
              {/* Modal Header */}
              <div
                className="p-4 sm:p-6 border-b flex items-center justify-between"
                style={{ borderColor: "#AA855B", backgroundColor: "#FAEFE2" }}
              >
                <div className="flex items-center">
                  <Bot className="w-5 h-5 mr-2" style={{ color: "#0F5648" }} />
                  <h2
                    className="text-lg font-bold font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    Agent Control Center
                  </h2>
                </div>
                <button
                  onClick={() => setAgentModalOpen(false)}
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

              {/* Modal Content - Scrollable */}
              <div
                className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1"
                style={{ backgroundColor: "#F5F5F5" }}
              >
                {/* Auto Mode Toggle */}
                <div
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 p-4 rounded-lg"
                  style={{
                    backgroundColor: "#F5F5F5",
                    border: "1px solid #AA855B",
                  }}
                >
                  <div className="flex-1">
                    <h3
                      className="font-semibold mb-1 font-['Poppins'] text-sm sm:text-base"
                      style={{ color: "#32332D" }}
                    >
                      Auto Mode
                    </h3>
                    <p
                      className="text-xs sm:text-sm font-['Poppins']"
                      style={{ color: "#AA855B" }}
                    >
                      {autoMode
                        ? "Agents automatically collaborate based on your questions"
                        : "Manually enable/disable specific agents"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (
                        currentConversation &&
                        currentConversation.messages.length > 0 &&
                        originalConversationState
                      ) {
                        showModeChangeDialog(!autoMode);
                      } else {
                        setAutoMode(!autoMode);
                      }
                    }}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors flex-shrink-0 ${
                      autoMode ? "bg-green-500" : "bg-gray-300"
                    }`}
                    style={{
                      backgroundColor: autoMode ? "#0F5648" : "#D4C4B0",
                    }}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        autoMode ? "translate-x-8" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Active Agents */}
                <div>
                  <h3
                    className="font-semibold mb-4 font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    Active Agents
                  </h3>
                  <div className="space-y-4">
                    {agents.map((agent) => {
                      const Icon = agent.icon;
                      const isEnabled =
                        autoMode || enabledAgents.includes(agent.id);

                      return (
                        <div
                          key={agent.id}
                          className="p-4 border rounded-xl transition-all hover:shadow-md font-['Poppins']"
                          style={{
                            backgroundColor: isEnabled ? "#FFFFFF" : "#F5F5F5",
                            borderColor: isEnabled ? "#AA855B" : "#D4C4B0",
                            borderWidth: "2px",
                          }}
                        >
                          {/* Header */}
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: agent.color }}
                            >
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4
                                className="font-semibold font-['Poppins']"
                                style={{ color: "#32332D", fontSize: "16px" }}
                              >
                                {agent.name}
                              </h4>
                              <p
                                className="font-['Poppins']"
                                style={{ color: "#AA855B", fontSize: "14px" }}
                              >
                                {agent.confidence}%
                              </p>
                            </div>
                            {!autoMode && (
                              <button
                                onClick={() => toggleAgent(agent.id)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  isEnabled ? "bg-green-500" : "bg-gray-300"
                                }`}
                                style={{
                                  backgroundColor: isEnabled
                                    ? "#0F5648"
                                    : "#D4C4B0",
                                }}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    isEnabled
                                      ? "translate-x-6"
                                      : "translate-x-1"
                                  }`}
                                />
                              </button>
                            )}
                          </div>

                          {/* How I Can Help */}
                          <div className="mb-3">
                            <h5
                              className="font-medium mb-1 font-['Poppins']"
                              style={{ color: "#32332D", fontSize: "14px" }}
                            >
                              How I Can Help:
                            </h5>
                            <p
                              className="font-['Poppins'] leading-relaxed"
                              style={{ color: "#32332D", fontSize: "14px" }}
                            >
                              {agent.description}
                            </p>
                          </div>

                          {/* Examples */}
                          <div className="mb-3">
                            <h5
                              className="font-medium mb-2 font-['Poppins']"
                              style={{ color: "#32332D", fontSize: "14px" }}
                            >
                              Examples:
                            </h5>
                            <ul className="space-y-1">
                              {agent.exampleQuestions
                                .slice(0, 3)
                                .map((question, index) => (
                                  <li
                                    key={index}
                                    className="flex items-start gap-2 font-['Poppins']"
                                  >
                                    <span style={{ color: "#AA855B" }}>•</span>
                                    <span
                                      style={{
                                        color: "#32332D",
                                        fontSize: "13px",
                                      }}
                                      className="leading-relaxed"
                                    >
                                      {question}
                                    </span>
                                  </li>
                                ))}
                            </ul>
                          </div>

                          {/* Skills */}
                          <div>
                            <h5
                              className="font-medium mb-2 font-['Poppins']"
                              style={{ color: "#32332D", fontSize: "14px" }}
                            >
                              Skills:
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {agent.specialties.map((skill, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 rounded-full font-['Poppins'] text-xs"
                                  style={{
                                    backgroundColor: "#F5F5F5",
                                    color: "#32332D",
                                    border: "1px solid #AA855B",
                                  }}
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                className="p-4 border-t flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3"
                style={{ borderColor: "#AA855B", backgroundColor: "#FAEFE2" }}
              >
                <button
                  onClick={() => setAgentModalOpen(false)}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-sm sm:text-base"
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
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {confirmationDialog.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
              className="bg-white rounded-lg p-6 max-w-md w-full mx-4 font-['Poppins']"
              style={{ border: "2px solid #AA855B", borderRadius: "16px" }}
            >
              <h3
                className="text-lg font-semibold mb-4 font-['Poppins']"
                style={{ color: "#32332D" }}
              >
                {confirmationDialog.title}
              </h3>
              <p
                className="text-sm mb-6 whitespace-pre-line font-['Poppins']"
                style={{ color: "#AA855B" }}
              >
                {confirmationDialog.message}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={confirmationDialog.onCancel}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 font-['Poppins']"
                  style={{
                    backgroundColor: "transparent",
                    color: "#32332D",
                    border: "1px solid #AA855B",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#F5F5F5";
                  }}
                >
                  {confirmationDialog.cancelText}
                </button>
                <button
                  onClick={confirmationDialog.onConfirm}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg font-['Poppins']"
                  style={{
                    backgroundColor: "#F2742C",
                    color: "#FFFFFF",
                    border: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#E55A1F";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#F2742C";
                  }}
                >
                  {confirmationDialog.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Conversation Confirmation Modal */}
        {deleteConfirmOpen && conversationToDelete && (
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
                  Delete Conversation
                </h3>
                <button
                  className="text-gray-400 hover:text-gray-600"
                  onClick={cancelDeleteConversation}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#AA855B" }}
                  >
                    <BotMessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4
                      className="font-medium font-['Poppins']"
                      style={{ color: "#32332D" }}
                    >
                      {conversationToDelete.title || "Untitled Conversation"}
                    </h4>
                    <p
                      className="text-xs font-['Poppins'] line-clamp-1"
                      style={{ color: "#64635E" }}
                    >
                      {conversationToDelete.lastMessage || "No messages"}
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
                    Deleting this conversation will permanently remove it and
                    all associated data. This action cannot be undone.
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
                    className="text-sm font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    I understand this action cannot be undone
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-lg font-medium border font-['Poppins']"
                  style={{ borderColor: "#AA855B", color: "#AA855B" }}
                  onClick={cancelDeleteConversation}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg font-medium font-['Poppins'] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#EF4444", color: "#FFFFFF" }}
                  onClick={() => {
                    const checkbox = document.getElementById(
                      "confirm-delete-conversation",
                    ) as HTMLInputElement;
                    if (checkbox?.checked) {
                      confirmDeleteConversation();
                    } else {
                      alert(
                        "Please confirm that you understand this action cannot be undone.",
                      );
                    }
                  }}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete Conversation"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AIChatPage;
