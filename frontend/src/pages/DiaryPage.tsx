// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: DiaryPage.tsx
// Description: To provide interface for parent users to view and manage their diary entries
// First Written on: Thursday, 02-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state, lifecycle, and refs
import React, { useState, useEffect, useRef } from "react";
// Import React Router hooks for navigation
import { useNavigate, useLocation } from "react-router-dom";
// Import API functions for diary operations
import {
  getChildren,
  getDiaryEntries,
  deleteDiaryEntry,
  getDiaryDrafts,
  createDiaryDraft,
  deleteDiaryDraft,
  getDiaryAttachments,
  deleteDiaryAttachment,
  createDiaryAttachment,
  generateMonthlySummary,
  getMonthlySummaries,
  generateWeeklySummary,
  getWeeklySummaries,
  getInsight,
  saveInsight,
  markInsightAsRead,
  deleteInsight,
} from "../services/api";
// Import Supabase configuration for file uploads
import { supabase, DIARY_ATTACHMENTS_BUCKET } from "../config/supabase";
// Import custom components
import DiaryEntryListModal from "../components/DiaryEntryListModal";
import AttachmentGallery from "../components/AttachmentGallery";
import ChangeEntryTypeModal from "../components/ChangeEntryTypeModal";
// Import toast notification components
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Import Material-UI components for UI elements
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Autocomplete,
  Chip,
  TextField,
  Button,
  Tooltip,
} from "@mui/material";
// Import lucide-react icons for UI elements
import {
  BookOpen,
  Plus,
  Calendar,
  Search,
  Filter,
  Edit3,
  Save,
  X,
  Smile,
  Frown,
  Meh,
  Annoyed,
  SmilePlus,
  Laugh,
  Heart,
  TrendingUp,
  Tag,
  FileText,
  Brain,
  Target,
  Award,
  Maximize2,
  Trash2,
  User,
  Baby,
  Clock,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Image,
  Video,
  Play,
} from "lucide-react";

/**
 * Formats tag for display
 * Converts tag strings with underscores to human-readable labels
 * 
 * @param tag - Tag string (may contain underscores)
 * @returns Formatted display string
 */
const formatTag = (tag: string): string => {
  if (!tag) return "";
  return tag
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Calculates age from a birthdate string
 * 
 * @param birthdate - Birthdate string in YYYY-MM-DD format
 * @returns Age in years as a number
 */
const calculateAge = (birthdate: string): number => {
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

/**
 * Serializes File objects to plain objects for storage
 * Used to save file metadata in localStorage/drafts
 * 
 * @param files - Array of File objects
 * @returns Array of plain objects with file metadata
 */
const serializeFiles = (files: File[]) => {
  return files.map((file) => ({
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
  }));
};

/**
 * Deserializes file metadata back to File-like objects
 * Note: Cannot recreate actual File objects from metadata (File API limitation)
 * Returns mock objects for display purposes only
 * 
 * @param fileData - Array of file metadata objects
 * @returns Array of File-like objects
 */
const deserializeFiles = (fileData: any[]): File[] => {
  // Note: We can't recreate actual File objects from metadata
  // This is a limitation of the File API - we'll return mock objects for display
  return fileData.map(
    (data) =>
      ({
        name: data.name,
        size: data.size,
        type: data.type,
        lastModified: data.lastModified,
      }) as File,
  );
};

/**
 * DiaryEntry interface
 * Defines the structure of a diary entry object with all possible fields
 */
interface DiaryEntry {
  entry_id: number;
  child_id?: number;
  entry_date: string;
  entry_type: string;
  title?: string;
  content: string;
  parent_mood?: string;
  child_mood?: string;
  tags?: string[];
  created_at: string;
  updated_at?: string;
  // Template-specific fields
  observed_behaviors?: string[];
  challenges_encountered?: string[];
  strategies_used?: string[];
  time_of_day?: string;
  duration?: string;
  effectiveness?: string;
  emotion_intensity?: number;
  stress_level?: number;
  triggers_identified?: string[];
  coping_strategies?: string[];
  physical_symptoms?: string[];
  environmental_factors?: string;
  situation_description?: string;
  intervention_used?: string;
  immediate_outcome?: string;
  effectiveness_rating?: number;
  would_use_again?: boolean;
  skills_observed?: string[];
  improvements_observed?: string;
  setbacks_concerns?: string;
  next_goals?: string;
  professional_recommendations?: string;
}

/**
 * DiaryPage Component
 * 
 * Main diary page for parent users to view and manage diary entries.
 * Features include:
 * - Calendar view of entries
 * - List view with filtering
 * - Entry creation and editing
 * - Draft system
 * - Attachments management
 * - Monthly/weekly summaries
 * - AI insights
 * 
 * @returns JSX element representing the diary page
 */
const DiaryPage: React.FC = () => {
  // React Router hooks
  const navigate = useNavigate();   // Navigation function for programmatic routing
  const location = useLocation();     // Current route location
  
  // Component state management
  const [children, setChildren] = useState<any[]>([]);  // List of user's children
  const [selectedChildId, setSelectedChildId] = useState<string>("all");  // Selected child filter
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [entryListModalOpen, setEntryListModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newEntryDate, setNewEntryDate] = useState<Date | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [viewMode, setViewMode] = useState<
    "calendar" | "list" | "insights" | "drafts"
  >("calendar");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("all");
  const [selectedChildFilter, setSelectedChildFilter] = useState<string>("all");
  const [selectedEntryType, setSelectedEntryType] = useState<string>("all");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagsPopoverOpen, setTagsPopoverOpen] = useState(false);
  const [tagsButtonRef, setTagsButtonRef] = useState<HTMLElement | null>(null);
  const [newEntryChildId, setNewEntryChildId] = useState<string>("");
  const [tagInput, setTagInput] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<DiaryEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFilePreviews, setSelectedFilePreviews] = useState<string[]>(
    [],
  );
  const [attachmentError, setAttachmentError] = useState("");
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<number[]>([]);

  // Draft system state
  const [drafts, setDrafts] = useState<any[]>([]);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [pendingTemplateChange, setPendingTemplateChange] =
    useState<string>("");

  // Monthly Summary state
  const [monthlySummaryViewMode, setMonthlySummaryViewMode] = useState<
    "initial" | "generated" | "savedList" | "savedDetail"
  >("initial");
  const [previousViewMode, setPreviousViewMode] = useState<
    "initial" | "generated" | null
  >(null);
  const [currentGeneratedSummary, setCurrentGeneratedSummary] =
    useState<any>(null);
  const [savedSummaries, setSavedSummaries] = useState<any[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<any>(null);
  const [selectedMonthSummary, setSelectedMonthSummary] = useState<number>(
    new Date().getMonth() + 1,
  );
  const [selectedYearSummary, setSelectedYearSummary] = useState<number>(
    new Date().getFullYear(),
  );
  const [selectedChildSummary, setSelectedChildSummary] =
    useState<string>("all");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [focusedSelect, setFocusedSelect] = useState<string | null>(null);
  const [focusedFilterSelect, setFocusedFilterSelect] = useState<string | null>(
    null,
  );
  const [focusedModalSelect, setFocusedModalSelect] = useState<string | null>(
    null,
  );
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);
  const [moodDropdownOpen, setMoodDropdownOpen] = useState<
    "parentMood" | "childMood" | null
  >(null);
  const parentMoodDropdownRef = useRef<HTMLDivElement>(null);
  const childMoodDropdownRef = useRef<HTMLDivElement>(null);
  const [showDeleteDraftDialog, setShowDeleteDraftDialog] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<any>(null);
  const [deleteSummaryConfirmOpen, setDeleteSummaryConfirmOpen] =
    useState(false);
  const [summaryToDelete, setSummaryToDelete] = useState<any>(null);
  const [deletingSummary, setDeletingSummary] = useState(false);
  const [editingFromDraft, setEditingFromDraft] = useState<any>(null);

  // Weekly Summary state
  const [weeklySummaryViewMode, setWeeklySummaryViewMode] = useState<
    "initial" | "generated" | "savedList" | "savedDetail"
  >("initial");
  const [previousWeeklyViewMode, setPreviousWeeklyViewMode] = useState<
    "initial" | "generated" | null
  >(null);
  const [currentGeneratedWeeklySummary, setCurrentGeneratedWeeklySummary] =
    useState<any>(null);
  const [savedWeeklySummaries, setSavedWeeklySummaries] = useState<any[]>([]);
  const [selectedWeeklySummary, setSelectedWeeklySummary] = useState<any>(null);
  const [selectedChildWeekly, setSelectedChildWeekly] = useState<string>("all");
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(() => {
    // Get start of current week (Monday)
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Days to subtract to get to Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split("T")[0];
  });
  const [selectedWeekEnd, setSelectedWeekEnd] = useState<string>(() => {
    // Get end of current week (Sunday) - 6 days after Monday
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Days to subtract to get to Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday.toISOString().split("T")[0];
  });
  const [isGeneratingWeeklySummary, setIsGeneratingWeeklySummary] =
    useState(false);
  const [focusedSelectWeekly, setFocusedSelectWeekly] = useState<string | null>(
    null,
  );
  const weekPickerInputRef = React.useRef<HTMLInputElement>(null);
  const monthYearPickerRef = React.useRef<HTMLInputElement>(null);
  const [deleteWeeklySummaryConfirmOpen, setDeleteWeeklySummaryConfirmOpen] =
    useState(false);
  const [weeklySummaryToDelete, setWeeklySummaryToDelete] = useState<any>(null);
  const [deletingWeeklySummary, setDeletingWeeklySummary] = useState(false);

  // Separate filter states for saved summaries (independent from generation filters)
  // Monthly saved summaries filters
  const [savedSummariesChildFilter, setSavedSummariesChildFilter] =
    useState<string>("all");
  const [savedSummariesMonthFilter, setSavedSummariesMonthFilter] = useState<
    number | null
  >(null); // null = show all
  const [savedSummariesYearFilter, setSavedSummariesYearFilter] = useState<
    number | null
  >(null); // null = show all
  const [focusedSelectSavedSummaries, setFocusedSelectSavedSummaries] =
    useState<string | null>(null);
  const savedMonthYearPickerRef = React.useRef<HTMLInputElement>(null);

  // Weekly saved summaries filters
  const [savedWeeklySummariesChildFilter, setSavedWeeklySummariesChildFilter] =
    useState<string>("all");
  const [
    savedWeeklySummariesWeekStartFilter,
    setSavedWeeklySummariesWeekStartFilter,
  ] = useState<string | null>(null); // null = show all
  const [
    savedWeeklySummariesWeekEndFilter,
    setSavedWeeklySummariesWeekEndFilter,
  ] = useState<string | null>(null); // null = show all
  const [
    focusedSelectSavedWeeklySummaries,
    setFocusedSelectSavedWeeklySummaries,
  ] = useState<string | null>(null);
  const savedWeekPickerInputRef = React.useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<any>({
    title: "",
    content: "",
    parentMood: "happy",
    childMood: "happy",
    childId: "", // Add childId to formData
    tags: [],
    // Behavior tracking fields
    observedBehaviors: [],
    challenges: [],
    strategiesUsed: [],
    timeOfDay: "",
    duration: "",
    effectiveness: "",
    // Emotional tracking fields
    emotionIntensity: 5,
    stressLevel: 5,
    triggers: [],
    copingStrategies: [],
    physicalSymptoms: [],
    environmentalFactors: "",
    // Intervention tracking fields
    situation: "",
    intervention: "",
    immediateOutcome: "",
    effectivenessRating: 5,
    wouldUseAgain: true,
    // Development tracking fields
    skillsObserved: [],
    improvements: "",
    setbacks: "",
    nextGoals: "",
    professionalRecommendations: "",
  });

  // Progressive onboarding state
  const [showAddFirstChildModal, setShowAddFirstChildModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newlyAddedChild, setNewlyAddedChild] = useState<any>(null);
  const [isAddingChild, setIsAddingChild] = useState(false);

  // Fetch children data when component mounts
  useEffect(() => {
    console.log("🔄 useEffect for fetchChildren triggered");
    console.log("🔄 isAddingChild flag:", isAddingChild);

    // Don't fetch children if we're in the middle of adding a child
    if (isAddingChild) {
      console.log("🚫 Skipping fetchChildren because isAddingChild is true");
      return;
    }

    const fetchChildren = async () => {
      try {
        const childrenData = await getChildren();
        console.log("📊 Fetched children data:", childrenData);
        setChildren(childrenData);
        // Set default child for new entry if available
        if (childrenData.length > 0 && !newEntryChildId) {
          setNewEntryChildId(childrenData[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch children:", error);
      }
    };
    fetchChildren();
  }, [newEntryChildId, isAddingChild]);

  // Sync newEntryChildId to formData.childId when it changes
  useEffect(() => {
    if (newEntryChildId && !formData.childId) {
      setFormData((prev: any) => ({ ...prev, childId: newEntryChildId }));
    }
  }, [newEntryChildId, formData.childId]);

  // Reset border colors when filter values change
  useEffect(() => {
    const resetBorderColors = () => {
      const selectors = document.querySelectorAll(".custom-select");
      selectors.forEach((selector: any) => {
        // Force reset with !important equivalent
        selector.style.setProperty("border-color", "#AA855B", "important");
        selector.style.setProperty("box-shadow", "none", "important");
        selector.style.setProperty("border-width", "1px", "important");
        // Also remove focus state
        selector.blur();
      });
    };

    // Reset after a short delay to ensure the selection is complete
    const timeoutId = setTimeout(resetBorderColors, 150);
    return () => clearTimeout(timeoutId);
  }, [selectedChildFilter, selectedMood, selectedEntryType, selectedDateRange]);

  // Fetch diary entries when component mounts
  useEffect(() => {
    const fetchDiaryEntries = async () => {
      try {
        const response = await getDiaryEntries();
        setDiaryEntries(response.entries || []);
      } catch (error) {
        console.error("Failed to fetch diary entries:", error);
      }
    };
    fetchDiaryEntries();
  }, []);

  // Check for draft data on component mount and when navigating back
  useEffect(() => {
    // Only run if we're on the diary page
    if (location.pathname !== "/diary") {
      return;
    }

    const draftData = sessionStorage.getItem("diaryEntryDraft");
    const shouldOpenModal = sessionStorage.getItem("shouldOpenDiaryModal");

    console.log("🔍 DiaryPage - Checking for draft data:", {
      draftData: !!draftData,
      shouldOpenModal,
    });

    if (draftData) {
      try {
        const parsed = JSON.parse(draftData);
        console.log(
          "🔍 DiaryPage - Loading draft data from sessionStorage:",
          parsed,
        );

        // Check if we've already processed this data
        const lastProcessedTimestamp = sessionStorage.getItem(
          "lastProcessedTimestamp",
        );
        if (lastProcessedTimestamp === parsed.timestamp?.toString()) {
          console.log("🔍 DiaryPage - Data already processed, skipping");
          return;
        }

        // Mark this data as processed
        if (parsed.timestamp) {
          sessionStorage.setItem(
            "lastProcessedTimestamp",
            parsed.timestamp.toString(),
          );
        }

        if (parsed.date) {
          setNewEntryDate(new Date(parsed.date));
        }
        if (parsed.childId) {
          console.log(
            "🔍 DiaryPage - Setting formData.childId to:",
            parsed.childId,
          );
          setFormData((prev: any) => ({ ...prev, childId: parsed.childId }));
        }
        if (parsed.template) {
          setSelectedTemplate(parsed.template);
        }
        if (parsed.formData) {
          setFormData(parsed.formData);
        }
        if (parsed.editingEntry) {
          setEditingEntry(parsed.editingEntry);
        }

        // Load selected files and attachments from sessionStorage
        if (parsed.selectedFiles) {
          setSelectedFiles(deserializeFiles(parsed.selectedFiles));
        }
        if (parsed.attachments) {
          setAttachments(parsed.attachments);
        }

        // Only open modal if explicitly requested (e.g., from DiaryEntryEditor)
        if (shouldOpenModal === "true") {
          setShowNewEntry(true);
          sessionStorage.removeItem("shouldOpenDiaryModal"); // Clear the flag
        }

        // Clear the sessionStorage data after processing
        sessionStorage.removeItem("diaryEntryDraft");
        console.log("🔍 DiaryPage - Cleared sessionStorage data after loading");
      } catch (error) {
        console.error("Error loading draft data:", error);
      }
    }
  }, [location.pathname]); // Trigger when location changes

  const templates = [
    {
      id: "daily-behavior",
      name: "Daily Behavior Observations",
      description: "Track daily behaviors, challenges, and successes",
      fields: ["behaviors", "challenges", "strategies", "improvements"],
    },
    {
      id: "emotional-tracking",
      name: "Emotional States & Stress Levels",
      description: "Monitor emotional patterns and stress indicators",
      fields: ["emotionalStates", "triggers", "copingStrategies", "outcomes"],
    },
    {
      id: "intervention-tracking",
      name: "Successful Interventions",
      description: "Document effective strategies and interventions",
      fields: ["situation", "intervention", "outcome", "effectiveness"],
    },
    {
      id: "milestone-progress",
      name: "Child Development Progress",
      description: "Track improvements and setbacks in development",
      fields: ["improvements", "setbacks", "observations", "nextSteps"],
    },
  ];

  const moodIcons = {
    happy: { icon: Smile, color: "#0F5648", bg: "#E8F5E8" },
    neutral: { icon: Meh, color: "#AA855B", bg: "#F5F3F0" },
    sad: { icon: Frown, color: "#326586", bg: "#E8F2F5" },
    frustrated: { icon: Annoyed, color: "#722F37", bg: "#F5E8E8" },
    proud: { icon: SmilePlus, color: "#F2742C", bg: "#FDF2E8" },
    excited: { icon: Laugh, color: "#F2742C", bg: "#FDF2E8" },
  };

  const filteredEntries = diaryEntries.filter((entry) => {
    const matchesSearch =
      entry.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags?.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase()),
      ) ||
      false;
    const matchesMood =
      selectedMood === "all" ||
      entry.parent_mood === selectedMood ||
      entry.child_mood === selectedMood;
    const matchesChild =
      selectedChildFilter === "all" ||
      entry.child_id?.toString() === selectedChildFilter;
    const matchesEntryType =
      selectedEntryType === "all" || entry.entry_type === selectedEntryType;

    // Date range filtering
    const matchesDateRange = (() => {
      if (selectedDateRange === "all") return true;

      const entryDate = new Date(entry.entry_date);
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      switch (selectedDateRange) {
        case "today":
          return entryDate.toDateString() === today.toDateString();
        case "this-week":
          return entryDate >= startOfWeek;
        case "this-month":
          return entryDate >= startOfMonth;
        case "last-week":
          const lastWeekStart = new Date(startOfWeek);
          lastWeekStart.setDate(startOfWeek.getDate() - 7);
          return entryDate >= lastWeekStart && entryDate < startOfWeek;
        case "last-month":
          const lastMonth = new Date(
            today.getFullYear(),
            today.getMonth() - 1,
            1,
          );
          const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          return entryDate >= lastMonth && entryDate < thisMonth;
        default:
          return true;
      }
    })();

    // Tags filtering
    const matchesTags =
      selectedTags.length === 0 ||
      (entry.tags && entry.tags.some((tag) => selectedTags.includes(tag)));

    return (
      matchesSearch &&
      matchesMood &&
      matchesChild &&
      matchesEntryType &&
      matchesDateRange &&
      matchesTags
    );
  });

  // Filter drafts based on the same criteria as diary entries
  const filteredDrafts = drafts.filter((draft) => {
    const formData = draft.form_data || {};

    // Search filtering (title, content, tags)
    const matchesSearch =
      formData.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      formData.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      formData.tags?.some((tag: string) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase()),
      ) ||
      false;

    // Mood filtering
    const matchesMood =
      selectedMood === "all" ||
      formData.parentMood === selectedMood ||
      formData.childMood === selectedMood;

    // Child filtering
    const matchesChild =
      selectedChildFilter === "all" ||
      draft.child_id?.toString() === selectedChildFilter ||
      formData.childId?.toString() === selectedChildFilter;

    // Entry type filtering
    const matchesEntryType =
      selectedEntryType === "all" || draft.entry_type === selectedEntryType;

    // Date range filtering
    const matchesDateRange = (() => {
      if (selectedDateRange === "all") return true;
      if (!draft.entry_date) return false; // If no date, exclude from date-filtered views

      const entryDate = new Date(draft.entry_date);
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      switch (selectedDateRange) {
        case "today":
          return entryDate.toDateString() === today.toDateString();
        case "this-week":
          return entryDate >= startOfWeek;
        case "this-month":
          return entryDate >= startOfMonth;
        case "last-week":
          const lastWeekStart = new Date(startOfWeek);
          lastWeekStart.setDate(startOfWeek.getDate() - 7);
          return entryDate >= lastWeekStart && entryDate < startOfWeek;
        case "last-month":
          const lastMonth = new Date(
            today.getFullYear(),
            today.getMonth() - 1,
            1,
          );
          const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          return entryDate >= lastMonth && entryDate < thisMonth;
        default:
          return true;
      }
    })();

    // Tags filtering
    const matchesTags =
      selectedTags.length === 0 ||
      (formData.tags &&
        formData.tags.some((tag: string) => selectedTags.includes(tag)));

    return (
      matchesSearch &&
      matchesMood &&
      matchesChild &&
      matchesEntryType &&
      matchesDateRange &&
      matchesTags
    );
  });

  // Load drafts from API on component mount
  useEffect(() => {
    const loadDrafts = async () => {
      try {
        const response = await getDiaryDrafts();
        setDrafts(response.drafts || []);
      } catch (error) {
        console.error("Error loading drafts:", error);
        toast.error("Failed to load drafts");
      }
    };
    loadDrafts();
  }, []);

  // Check for success message from DiaryEntryEditor
  useEffect(() => {
    // Only check for success message if we're on the diary page and coming from editor
    if (location.pathname === "/diary") {
      const successMessage = sessionStorage.getItem("diaryEntrySuccessMessage");
      if (successMessage) {
        // Remove the message immediately to prevent duplicate toasts
        sessionStorage.removeItem("diaryEntrySuccessMessage");

        // Small delay to ensure component is fully rendered
        setTimeout(() => {
          toast.success(successMessage);
        }, 100);
      }
    }
  }, [location.pathname]); // Trigger when location changes

  // Check for unsaved changes when form data changes
  useEffect(() => {
    const hasChanges = Object.values(formData).some((value) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== "" && value !== null && value !== undefined;
    });
    setHasUnsavedChanges(hasChanges);
  }, [formData]);

  // Draft management functions
  const saveAsDraft = async () => {
    try {
      const draftData = {
        child_id: newEntryChildId ? parseInt(newEntryChildId) : null,
        entry_date: newEntryDate
          ? newEntryDate.toISOString().split("T")[0]
          : null,
        entry_type: selectedTemplate || "free-form",
        title: formData.title || "Untitled Entry",
        form_data: { ...formData },
      };

      const response = await createDiaryDraft(draftData);

      // Update local state with the new draft
      const newDraft = {
        draft_id: response.draft_id,
        child_id: response.child_id,
        entry_date: response.entry_date,
        entry_type: response.entry_type,
        title: response.title,
        form_data: response.form_data,
        created_at: response.created_at,
        updated_at: response.updated_at,
      };

      setDrafts((prev) => [...prev, newDraft]);
      setShowDraftDialog(false);
      setHasUnsavedChanges(false);

      // Smart field mapping - preserve common fields
      const commonFields = {
        title: formData.title || "",
        parentMood: formData.parentMood || "happy",
        childMood: formData.childMood || "happy",
        childId: formData.childId || "",
        tags: formData.tags || [],
        // Preserve attachments if any (for future implementation)
        attachments: formData.attachments || [],
      };

      // Clear form data but preserve common fields
      setFormData({
        ...commonFields,
        content: "",
        observedBehaviors: [],
        challenges: [],
        strategiesUsed: [],
        timeOfDay: "",
        duration: "",
        effectiveness: "",
        emotionIntensity: 5,
        stressLevel: 5,
        triggers: [],
        copingStrategies: [],
        physicalSymptoms: [],
        environmentalFactors: "",
        situation: "",
        intervention: "",
        immediateOutcome: "",
        effectivenessRating: 5,
        wouldUseAgain: true,
        skillsObserved: [],
        improvements: "",
        setbacks: "",
        nextGoals: "",
        professionalRecommendations: "",
      });

      // Apply the pending template change
      if (pendingTemplateChange) {
        setSelectedTemplate(pendingTemplateChange);
        setPendingTemplateChange("");
      }

      toast.success("Draft saved successfully!");
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("Failed to save draft");
    }
  };

  const discardChanges = () => {
    setShowDraftDialog(false);
    setHasUnsavedChanges(false);

    // Smart field mapping - preserve only mood and tags (NOT title, as title is template-specific)
    const commonFields = {
      // title: formData.title || '',
      parentMood: formData.parentMood || "happy",
      childMood: formData.childMood || "happy",
      childId: formData.childId || "",
      tags: formData.tags || [],
      // Preserve attachments if any (for future implementation)
      attachments: formData.attachments || [],
    };

    // Clear form data but preserve common fields (mood, tags)
    // Title is cleared because it's template-specific
    setFormData({
      ...commonFields,
      title: "", // Clear title when discarding changes
      content: "",
      observedBehaviors: [],
      challenges: [],
      strategiesUsed: [],
      timeOfDay: "",
      duration: "",
      effectiveness: "",
      emotionIntensity: 5,
      stressLevel: 5,
      triggers: [],
      copingStrategies: [],
      physicalSymptoms: [],
      environmentalFactors: "",
      situation: "",
      intervention: "",
      immediateOutcome: "",
      effectivenessRating: 5,
      wouldUseAgain: true,
      skillsObserved: [],
      improvements: "",
      setbacks: "",
      nextGoals: "",
      professionalRecommendations: "",
    });

    // Apply the pending template change
    if (pendingTemplateChange) {
      setSelectedTemplate(pendingTemplateChange);
      setPendingTemplateChange("");
    }
  };

  const cancelTemplateChange = () => {
    setShowDraftDialog(false);
    setPendingTemplateChange("");
  };

  const resumeDraft = (draft: any) => {
    const isMobileOrTablet = window.innerWidth < 1024;
    const draftDate = draft.entry_date
      ? new Date(draft.entry_date)
      : new Date();

    if (isMobileOrTablet) {
      // Navigate to full-page editor on mobile/tablet
      // Store draft data in sessionStorage
      const entryData = {
        date: draftDate,
        childId: draft.child_id?.toString() || "",
        template: draft.entry_type,
        formData: draft.form_data,
        editingEntry: null,
        selectedFiles: [],
        attachments: [],
        timestamp: Date.now(),
      };
      sessionStorage.setItem("diaryEntryDraft", JSON.stringify(entryData));
      navigate("/diary/create");
    } else {
      // Desktop: Open modal with draft data
      setFormData(draft.form_data);
      setSelectedTemplate(draft.entry_type);
      setNewEntryChildId(draft.child_id);
      setNewEntryDate(draftDate);
      setEditingFromDraft(draft); // Track that we're editing from a draft
      setShowNewEntry(true);
      setHasUnsavedChanges(true);
    }
  };

  const deleteDraft = (draft: any) => {
    setDraftToDelete(draft);
    setShowDeleteDraftDialog(true);
  };

  const confirmDeleteDraft = async () => {
    if (!draftToDelete) return;

    try {
      await deleteDiaryDraft(draftToDelete.draft_id);
      setDrafts((prev) =>
        prev.filter((draft) => draft.draft_id !== draftToDelete.draft_id),
      );
      setShowDeleteDraftDialog(false);
      setDraftToDelete(null);
      toast.success("Draft deleted successfully!");
    } catch (error) {
      console.error("Error deleting draft:", error);
      toast.error("Failed to delete draft");
    }
  };

  const cancelDeleteDraft = () => {
    setShowDeleteDraftDialog(false);
    setDraftToDelete(null);
  };

  // Check if template-specific fields have data
  const hasTemplateSpecificData = (template: string): boolean => {
    switch (template) {
      case "free-form":
      case "":
        return !!(formData.title?.trim() || formData.content?.trim());

      case "daily-behavior":
        return !!(
          formData.title?.trim() ||
          formData.observedBehaviors?.length > 0 ||
          formData.challenges?.length > 0 ||
          formData.strategiesUsed?.length > 0 ||
          formData.timeOfDay ||
          formData.duration ||
          formData.effectiveness
        );

      case "emotional-tracking":
        return !!(
          formData.title?.trim() ||
          formData.emotionIntensity !== 5 ||
          formData.stressLevel !== 5 ||
          formData.triggers?.length > 0 ||
          formData.copingStrategies?.length > 0 ||
          formData.physicalSymptoms?.length > 0 ||
          formData.environmentalFactors?.trim()
        );

      case "intervention-tracking":
        return !!(
          formData.title?.trim() ||
          formData.situation?.trim() ||
          formData.intervention?.trim() ||
          formData.immediateOutcome?.trim() ||
          formData.effectivenessRating !== 5 ||
          formData.wouldUseAgain !== true
        );

      case "milestone-progress":
        return !!(
          formData.title?.trim() ||
          formData.skillsObserved?.length > 0 ||
          formData.improvements?.trim() ||
          formData.setbacks?.trim() ||
          formData.nextGoals?.trim() ||
          formData.professionalRecommendations?.trim()
        );

      default:
        return false;
    }
  };

  // Check if only common fields (mood, tags) have data
  const hasOnlyCommonFieldsData = (): boolean => {
    const hasCommonData = !!(
      formData.parentMood !== "happy" ||
      formData.childMood !== "happy" ||
      (formData.tags && formData.tags.length > 0) ||
      selectedFiles.length > 0
    );

    // Return true only if common fields have data AND no template-specific data
    return hasCommonData && !hasTemplateSpecificData(selectedTemplate);
  };

  const handleTemplateChange = (newTemplate: string) => {
    // Only show warning if:
    // 1. Template-specific fields have data, OR
    // 2. Only common fields have data (mood, tags, files) - allow switching but warn
    const hasTemplateData = hasTemplateSpecificData(selectedTemplate);
    const hasOnlyCommonData = hasOnlyCommonFieldsData();

    if (
      (hasTemplateData || hasOnlyCommonData) &&
      selectedTemplate !== newTemplate
    ) {
      setPendingTemplateChange(newTemplate);
      setShowDraftDialog(true);
    } else {
      setSelectedTemplate(newTemplate);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEntriesForDate = (date: Date) => {
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return diaryEntries.filter((entry) => {
      const matchesDate = entry.entry_date === dateString;
      const matchesChild =
        selectedChildFilter === "all" ||
        entry.child_id?.toString() === selectedChildFilter;

      // Apply all other filters for calendar view
      const matchesSearch =
        entry.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        false ||
        entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.tags?.some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase()),
        ) ||
        false;
      const matchesMood =
        selectedMood === "all" ||
        entry.parent_mood === selectedMood ||
        entry.child_mood === selectedMood;
      const matchesEntryType =
        selectedEntryType === "all" || entry.entry_type === selectedEntryType;
      const matchesTags =
        selectedTags.length === 0 ||
        (entry.tags && entry.tags.some((tag) => selectedTags.includes(tag)));

      return (
        matchesDate &&
        matchesChild &&
        matchesSearch &&
        matchesMood &&
        matchesEntryType &&
        matchesTags
      );
    });
  };

  const handleDateClick = async (date: Date) => {
    setSelectedDate(date);

    // Check if user has no children - show onboarding modal
    if (children.length === 0 && !isAddingChild) {
      setNewEntryDate(
        new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      );
      setShowAddFirstChildModal(true);
      return;
    }

    // Check if we're on mobile/tablet (screen width < 1024px)
    const isMobileOrTablet = window.innerWidth < 1024;

    // Refresh all diary entries to ensure calendar view is up to date
    try {
      const allEntriesResponse = await getDiaryEntries();
      setDiaryEntries(allEntriesResponse.entries || []);
    } catch (error) {
      console.error("Error refreshing diary entries:", error);
    }

    // Check if there are entries for this date
    try {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const response = await getDiaryEntries({
        start_date: dateStr,
        end_date: dateStr,
      });

      if (response.entries && response.entries.length > 0) {
        // Show entry list modal (same for all screen sizes)
        setEntryListModalOpen(true);
      } else {
        // No entries for this date
        const localDate = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
        );
        const childId =
          selectedChildId === "all" ? children?.[0]?.id || "" : selectedChildId;

        if (isMobileOrTablet) {
          // Navigate to full-page editor on mobile/tablet
          navigateToFullPageEditor(null, localDate, childId.toString());
        } else {
          // Desktop: Show new entry modal
          setNewEntryDate(localDate);
          setNewEntryChildId(childId);
          // Clear attachments when opening new entry modal
          setSelectedFiles([]);
          setSelectedFilePreviews([]);
          setAttachmentError("");
          setAttachments([]);
          setShowNewEntry(true);
        }
      }
    } catch (error) {
      console.error("Error checking entries for date:", error);
      // Fallback
      const localDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
      const childId =
        selectedChildId === "all" ? children?.[0]?.id || "" : selectedChildId;

      if (isMobileOrTablet) {
        // Navigate to full-page editor on mobile/tablet
        navigateToFullPageEditor(null, localDate, childId.toString());
      } else {
        // Desktop: Show new entry modal
        setNewEntryDate(localDate);
        setNewEntryChildId(childId);
        // Clear attachments when opening new entry modal
        setSelectedFiles([]);
        setAttachmentError("");
        setAttachments([]);
        setShowNewEntry(true);
      }
    }
  };

  const handleNewEntryClose = () => {
    setShowNewEntry(false);
    setEditingEntry(null);
    setNewEntryDate(null);
    setNewEntryChildId(children?.[0]?.id || "");
    setSelectedTemplate("");
    // Clear attachments when closing modal
    setSelectedFiles([]);
    setSelectedFilePreviews([]);
    setAttachmentError("");
    setAttachments([]);
    setAttachmentsToDelete([]); // Clear deletion list
    setFormData({
      title: "",
      content: "",
      parentMood: "happy",
      childMood: "happy",
      childId: "",
      tags: [],
      observedBehaviors: [],
      challenges: [],
      strategiesUsed: [],
      timeOfDay: "",
      duration: "",
      effectiveness: "",
      emotionIntensity: 5,
      stressLevel: 5,
      triggers: [],
      copingStrategies: [],
      physicalSymptoms: [],
      environmentalFactors: "",
      situation: "",
      intervention: "",
      immediateOutcome: "",
      effectivenessRating: 5,
      wouldUseAgain: true,
      skillsObserved: [],
      improvements: "",
      setbacks: "",
      nextGoals: "",
      professionalRecommendations: "",
    });
    setEditingFromDraft(null); // Reset draft tracking
  };

  const refreshDiaryEntries = async () => {
    try {
      const response = await getDiaryEntries();
      setDiaryEntries(response.entries || []);
    } catch (error) {
      console.error("Error fetching diary entries:", error);
      toast.error("Failed to load diary entries");
    }
  };

  const handleEntryDeleted = async () => {
    // Refresh diary entries when an entry is deleted from the modal
    await refreshDiaryEntries();
  };

  const handleEntryListClose = () => {
    setEntryListModalOpen(false);
    setSelectedDate(null);
  };

  const handleNewEntryFromList = () => {
    setEntryListModalOpen(false);
    setEditingEntry(null);
    if (selectedDate) {
      const localDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
      );
      const childId =
        selectedChildId === "all" ? children?.[0]?.id || "" : selectedChildId;

      // Check if we're on mobile/tablet (screen width < 1024px)
      const isMobileOrTablet = window.innerWidth < 1024;

      if (isMobileOrTablet) {
        // Navigate to full-page editor on mobile/tablet
        navigateToFullPageEditor(null, localDate, childId.toString());
      } else {
        // Desktop: Show new entry modal
        setNewEntryDate(localDate);
        setNewEntryChildId(childId);
        // Clear attachments when opening new entry modal
        setSelectedFiles([]);
        setAttachmentError("");
        setAttachments([]);
        setShowNewEntry(true);
      }
    }
  };

  // Progressive onboarding handlers
  const handleAddFirstChildClick = () => {
    // PERMANENTLY close the "Add Your First Child" modal - it will never show again
    setShowAddFirstChildModal(false);
    setIsAddingChild(true); // Set flag to prevent any reopening
    // Navigate to Profile page with query parameter to auto-open Add Child dialog
    navigate("/profile?addChild=true");
  };

  const handleCancelAddFirstChild = () => {
    setShowAddFirstChildModal(false);
    setNewEntryDate(null);
  };

  const handleSuccessModalContinue = () => {
    setShowSuccessModal(false);
    setNewlyAddedChild(null);
    setIsAddingChild(false); // Reset the flag

    // Manually refresh children data to ensure we have the latest
    const refreshChildren = async () => {
      try {
        const childrenData = await getChildren();
        console.log("🔄 Manual refresh - Fetched children data:", childrenData);
        setChildren(childrenData);
      } catch (error) {
        console.error("Failed to refresh children:", error);
      }
    };
    refreshChildren();

    // Open diary entry form with the newly added child selected
    handleOpenNewEntry(newlyAddedChild.id.toString());
  };

  const handleSuccessModalCancel = () => {
    setShowSuccessModal(false);
    setNewlyAddedChild(null);
    setNewEntryDate(null);
    setIsAddingChild(false); // Reset the flag

    // Manually refresh children data to ensure we have the latest
    const refreshChildren = async () => {
      try {
        const childrenData = await getChildren();
        setChildren(childrenData);
      } catch (error) {
        console.error("Failed to refresh children:", error);
      }
    };
    refreshChildren();
  };

  const handleEditEntry = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setEntryListModalOpen(false);

    // Check if we're on mobile/tablet (screen width < 1024px)
    const isMobileOrTablet = window.innerWidth < 1024;

    if (isMobileOrTablet) {
      // Navigate to full-page editor on mobile/tablet
      navigateToFullPageEditor(entry, null, entry.child_id?.toString() || "");
      return;
    }

    // Desktop: Open edit modal
    setNewEntryDate(new Date(entry.entry_date));
    setNewEntryChildId(entry.child_id?.toString() || "");
    setSelectedTemplate(entry.entry_type);

    // Clear selected files and load existing attachments
    setSelectedFiles([]);
    setSelectedFilePreviews([]);
    setAttachmentError("");
    setAttachmentsToDelete([]); // Clear deletion list when opening edit mode
    loadAttachments(entry.entry_id);

    // Convert database field names to form field names
    // Backend already merges arrays with custom_* fields, so just use arrays
    setFormData({
      title: entry.title || "",
      content: entry.content || "",
      parentMood: entry.parent_mood || "happy", // Default to 'happy' if null
      childMood: entry.child_mood || "happy", // Default to 'happy' if null
      childId: entry.child_id?.toString() || "",
      tags: entry.tags || [],
      // Template-specific fields
      observedBehaviors: entry.observed_behaviors || [],
      challenges: entry.challenges_encountered || [],
      strategiesUsed: entry.strategies_used || [],
      timeOfDay: entry.time_of_day || "",
      duration: entry.duration || "",
      effectiveness: entry.effectiveness || "",
      emotionIntensity: entry.emotion_intensity || 5,
      stressLevel: entry.stress_level || 5,
      triggers: entry.triggers_identified || [],
      copingStrategies: entry.coping_strategies || [],
      physicalSymptoms: entry.physical_symptoms || [],
      environmentalFactors: entry.environmental_factors || "",
      situation: entry.situation_description || "",
      intervention: entry.intervention_used || "",
      immediateOutcome: entry.immediate_outcome || "",
      effectivenessRating: entry.effectiveness_rating || 5,
      wouldUseAgain:
        entry.would_use_again !== undefined ? entry.would_use_again : true,
      skillsObserved: entry.skills_observed || [],
      improvements: entry.improvements_observed || "",
      setbacks: entry.setbacks_concerns || "",
      nextGoals: entry.next_goals || "",
      professionalRecommendations: entry.professional_recommendations || "",
    });
    setShowNewEntry(true);
  };

  // Helper function to open new entry editor (modal on desktop, navigate on mobile/tablet)
  const handleOpenNewEntry = (childId?: string, date?: Date) => {
    const isMobileOrTablet = window.innerWidth < 1024;
    const entryChildId =
      childId || selectedChildId === "all"
        ? children?.[0]?.id || ""
        : selectedChildId;
    const entryDate = date || new Date();

    if (isMobileOrTablet) {
      // Navigate to full-page editor on mobile/tablet
      navigateToFullPageEditor(null, entryDate, entryChildId.toString());
    } else {
      // Desktop: Show new entry modal
      setNewEntryDate(entryDate);
      setNewEntryChildId(entryChildId);
      // Clear attachments when opening new entry modal
      setSelectedFiles([]);
      setSelectedFilePreviews([]);
      setAttachmentError("");
      setAttachments([]);
      setShowNewEntry(true);
    }
  };

  // Helper function to navigate to full-page editor (for mobile/tablet)
  const navigateToFullPageEditor = (
    entry: DiaryEntry | null,
    date: Date | null,
    childId: string,
  ) => {
    // Store entry data in sessionStorage for persistence
    const entryData = {
      date: entry ? new Date(entry.entry_date) : date,
      childId: childId,
      template: entry ? entry.entry_type : selectedTemplate,
      formData: entry
        ? {
            title: entry.title || "",
            content: entry.content || "",
            parentMood: entry.parent_mood || "happy",
            childMood: entry.child_mood || "happy",
            childId: entry.child_id?.toString() || "",
            tags: entry.tags || [],
            observedBehaviors: entry.observed_behaviors || [],
            challenges: entry.challenges_encountered || [],
            strategiesUsed: entry.strategies_used || [],
            timeOfDay: entry.time_of_day || "",
            duration: entry.duration || "",
            effectiveness: entry.effectiveness || "",
            emotionIntensity: entry.emotion_intensity || 5,
            stressLevel: entry.stress_level || 5,
            triggers: entry.triggers_identified || [],
            copingStrategies: entry.coping_strategies || [],
            physicalSymptoms: entry.physical_symptoms || [],
            environmentalFactors: entry.environmental_factors || "",
            situation: entry.situation_description || "",
            intervention: entry.intervention_used || "",
            immediateOutcome: entry.immediate_outcome || "",
            effectivenessRating: entry.effectiveness_rating || 5,
            wouldUseAgain:
              entry.would_use_again !== undefined
                ? entry.would_use_again
                : true,
            skillsObserved: entry.skills_observed || [],
            improvements: entry.improvements_observed || "",
            setbacks: entry.setbacks_concerns || "",
            nextGoals: entry.next_goals || "",
            professionalRecommendations:
              entry.professional_recommendations || "",
          }
        : {},
      editingEntry: entry,
      selectedFiles: [],
      attachments: [],
      timestamp: Date.now(),
    };

    sessionStorage.setItem("diaryEntryDraft", JSON.stringify(entryData));

    // Navigate to appropriate URL based on edit mode
    if (entry) {
      navigate(`/diary/edit/${entry.entry_id}`);
    } else {
      navigate("/diary/create");
    }
  };

  const handleExpandToFullPage = () => {
    // Create a mutable copy of editingEntry if it exists
    const currentEditingEntry = editingEntry ? { ...editingEntry } : null;

    // If in edit mode, update the child_id in the editingEntry object
    if (currentEditingEntry && formData.childId) {
      currentEditingEntry.child_id = parseInt(formData.childId);
    }

    // Store current form data in sessionStorage for persistence
    const entryData = {
      date: editingEntry ? new Date(editingEntry.entry_date) : newEntryDate, // Use entry_date for edit mode
      childId: formData.childId, // Use formData.childId instead of newEntryChildId
      template: selectedTemplate,
      formData: formData,
      editingEntry: currentEditingEntry, // Use the potentially updated editingEntry
      selectedFiles: serializeFiles(selectedFiles), // Serialize files for sessionStorage
      attachments: attachments, // Include existing attachments for edit mode
      timestamp: Date.now(), // Add timestamp to ensure fresh data
    };

    console.log("🔍 Storing data to sessionStorage:", entryData);
    console.log("🔍 Current formData:", formData);
    console.log("🔍 Current editingEntry (after update):", currentEditingEntry);

    sessionStorage.setItem("diaryEntryDraft", JSON.stringify(entryData));

    // Navigate to appropriate URL based on edit mode
    if (editingEntry) {
      navigate(`/diary/edit/${editingEntry.entry_id}`);
    } else {
      navigate("/diary/create");
    }
  };

  const normalizeTokens = (tokens: string[]): string[] => {
    const cleaned = (tokens || [])
      .map((t) => (t || "").trim().replace(/\s+/g, " "))
      .filter(
        (t) =>
          t.length > 0 &&
          t.toLowerCase() !== "other" &&
          t.toLowerCase() !== "none",
      );
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of cleaned) {
      const key = t.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(t.length > 40 ? t.slice(0, 40) : t);
      }
    }
    return out.slice(0, 20);
  };

  const handleFormChange = (field: string, value: any) => {
    console.log("🔍 DiaryPage - Form change:", field, "=", value);
    setFormData((prev: any) => {
      const newData = { ...prev, [field]: value };
      console.log("🔍 DiaryPage - Updated formData:", newData);
      return newData;
    });
  };

  const handleChipsFieldChange = (field: string, values: string[]) => {
    setFormData((prev: any) => ({ ...prev, [field]: normalizeTokens(values) }));
  };

  const handleSaveEntry = async () => {
    try {
      // Prepare entry data for API
      const resolvedChildId = formData.childId
        ? parseInt(formData.childId)
        : newEntryChildId
          ? parseInt(newEntryChildId)
          : null;

      const entryData = {
        child_id: resolvedChildId,
        entry_date: newEntryDate
          ? `${newEntryDate.getFullYear()}-${String(newEntryDate.getMonth() + 1).padStart(2, "0")}-${String(newEntryDate.getDate()).padStart(2, "0")}`
          : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
        entry_type: selectedTemplate || "free-form",
        title: formData.title || "",
        content: formData.content || "",
        parent_mood: formData.parentMood,
        child_mood: formData.childMood,
        tags: formData.tags || [],
        // Template-specific fields
        observed_behaviors: formData.observedBehaviors || [],
        challenges_encountered: formData.challenges || [],
        strategies_used: formData.strategiesUsed || [],
        time_of_day: formData.timeOfDay || "",
        duration: formData.duration || "",
        effectiveness: formData.effectiveness || "",
        emotion_intensity: formData.emotionIntensity || null,
        stress_level: formData.stressLevel || null,
        triggers_identified: formData.triggers || [],
        coping_strategies: formData.copingStrategies || [],
        physical_symptoms: formData.physicalSymptoms || [],
        environmental_factors: formData.environmentalFactors || "",
        situation_description: formData.situation || "",
        intervention_used: formData.intervention || "",
        immediate_outcome: formData.immediateOutcome || "",
        effectiveness_rating: formData.effectivenessRating || null,
        would_use_again: formData.wouldUseAgain || null,
        skills_observed: formData.skillsObserved || [],
        improvements_observed: formData.improvements || "",
        setbacks_concerns: formData.setbacks || "",
        next_goals: formData.nextGoals || "",
        professional_recommendations:
          formData.professionalRecommendations || "",
      };

      // Import the API function
      const { createDiaryEntry } = await import("../services/api");

      // Save the entry
      const savedEntry = await createDiaryEntry(entryData);

      // Upload attachments if any
      if (selectedFiles.length > 0) {
        await uploadAttachments(savedEntry.entry_id);
      }

      // Show success toast
      toast.success("Diary entry saved successfully!");

      // Refresh diary entries to update calendar view
      const response = await getDiaryEntries();
      setDiaryEntries(response.entries || []);

      // Close modal and reset form
      setShowNewEntry(false);
      setSelectedFiles([]); // Clear attachments
      setSelectedFilePreviews([]);
      setAttachmentError("");
      setFormData({
        title: "",
        content: "",
        parentMood: "happy",
        childMood: "happy",
        childId: "",
        tags: [],
        // Reset all template fields
        observedBehaviors: [],
        challenges: [],
        strategiesUsed: [],
        timeOfDay: "",
        duration: "",
        effectiveness: "",
        emotionIntensity: 5,
        stressLevel: 5,
        triggers: [],
        copingStrategies: [],
        physicalSymptoms: [],
        environmentalFactors: "",
        situation: "",
        intervention: "",
        immediateOutcome: "",
        effectivenessRating: 5,
        wouldUseAgain: true,
        skillsObserved: [],
        improvements: "",
        setbacks: "",
        nextGoals: "",
        professionalRecommendations: "",
      });
      setSelectedTemplate("");
      setNewEntryChildId("");
      setNewEntryDate(null);

      // If this entry was created from a draft, delete the draft
      if (editingFromDraft) {
        try {
          await deleteDiaryDraft(editingFromDraft.draft_id);
          setDrafts((prev) =>
            prev.filter(
              (draft) => draft.draft_id !== editingFromDraft.draft_id,
            ),
          );
          toast.success("Draft converted to entry successfully!");
        } catch (error) {
          console.error("Error deleting draft after entry creation:", error);
          // Don't show error to user since the main entry was created successfully
        }
        setEditingFromDraft(null);
      }
    } catch (error) {
      console.error("Error saving diary entry:", error);
      const { toast } = await import("react-toastify");
      toast.error("Failed to save diary entry. Please try again.");
    }
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry) return;

    try {
      // Prepare entry data for API
      const resolvedChildId = formData.childId
        ? parseInt(formData.childId)
        : newEntryChildId
          ? parseInt(newEntryChildId)
          : null;

      const entryData = {
        child_id: resolvedChildId,
        entry_date: newEntryDate
          ? `${newEntryDate.getFullYear()}-${String(newEntryDate.getMonth() + 1).padStart(2, "0")}-${String(newEntryDate.getDate()).padStart(2, "0")}`
          : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
        entry_type: selectedTemplate || "free-form",
        title: formData.title || "",
        content: formData.content || "",
        parent_mood: formData.parentMood,
        child_mood: formData.childMood,
        tags: formData.tags || [],
        // Template-specific fields
        observed_behaviors: formData.observedBehaviors || [],
        challenges_encountered: formData.challenges || [],
        strategies_used: formData.strategiesUsed || [],
        time_of_day: formData.timeOfDay || "",
        duration: formData.duration || "",
        effectiveness: formData.effectiveness || "",
        emotion_intensity: formData.emotionIntensity || null,
        stress_level: formData.stressLevel || null,
        triggers_identified: formData.triggers || [],
        coping_strategies: formData.copingStrategies || [],
        physical_symptoms: formData.physicalSymptoms || [],
        environmental_factors: formData.environmentalFactors || "",
        situation_description: formData.situation || "",
        intervention_used: formData.intervention || "",
        immediate_outcome: formData.immediateOutcome || "",
        effectiveness_rating: formData.effectivenessRating || null,
        would_use_again: formData.wouldUseAgain || null,
        skills_observed: formData.skillsObserved || [],
        improvements_observed: formData.improvements || "",
        setbacks_concerns: formData.setbacks || "",
        next_goals: formData.nextGoals || "",
        professional_recommendations:
          formData.professionalRecommendations || "",
      };

      // Import the API function
      const { updateDiaryEntry } = await import("../services/api");

      // Update the entry
      await updateDiaryEntry(editingEntry.entry_id, entryData);

      // Delete marked attachments first
      if (attachmentsToDelete.length > 0) {
        await deleteMarkedAttachments(editingEntry.entry_id);
      }

      // Upload attachments if any
      if (selectedFiles.length > 0) {
        await uploadAttachments(editingEntry.entry_id);
        // Reload attachments after upload to show newly uploaded files
        await loadAttachments(editingEntry.entry_id);
      }

      // Show success toast
      toast.success("Diary entry updated successfully!");

      // Refresh diary entries to update calendar view
      const response = await getDiaryEntries();
      setDiaryEntries(response.entries || []);

      // Close modal and reset form
      setShowNewEntry(false);
      setEditingEntry(null);
      setAttachmentsToDelete([]); // Clear deletion list
      setFormData({
        title: "",
        content: "",
        parentMood: "happy",
        childMood: "happy",
        childId: "",
        tags: [],
        // Reset all template fields
        observedBehaviors: [],
        challenges: [],
        strategiesUsed: [],
        timeOfDay: "",
        duration: "",
        effectiveness: "",
        emotionIntensity: 5,
        stressLevel: 5,
        triggers: [],
        copingStrategies: [],
        physicalSymptoms: [],
        environmentalFactors: "",
        situation: "",
        intervention: "",
        immediateOutcome: "",
        effectivenessRating: 5,
        wouldUseAgain: true,
        skillsObserved: [],
        improvements: "",
        setbacks: "",
        nextGoals: "",
        professionalRecommendations: "",
      });
      setSelectedTemplate("");
      setNewEntryChildId("");
      setNewEntryDate(null);
    } catch (error) {
      console.error("Error updating diary entry:", error);
      const { toast } = await import("react-toastify");
      toast.error("Failed to update diary entry. Please try again.");
    }
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData((prev: any) => ({
        ...prev,
        tags: [...prev.tags, trimmedTag],
      }));
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev: any) => ({
      ...prev,
      tags: prev.tags.filter((tag: string) => tag !== tagToRemove),
    }));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  // Get all unique tags from diary entries
  const getAllTags = () => {
    const allTags = new Set<string>();
    diaryEntries.forEach((entry) => {
      if (entry.tags) {
        entry.tags.forEach((tag) => allTags.add(tag));
      }
    });
    return Array.from(allTags).sort();
  };

  // Handle tag filter selection
  const handleTagFilterToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // Calculate popover position - returns position object directly
  const calculatePopoverPosition = (buttonRef: HTMLElement | null) => {
    if (!buttonRef) {
      return { top: "200px", right: "20px" };
    }

    const rect = buttonRef.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popoverWidth = 300;
    const popoverHeight = 300;
    const navBarHeight = 80; // Navigation bar height

    // Align popover's right edge with button's right edge
    // rect.right is distance from left edge of viewport to button's right edge
    // So distance from viewport's right edge = viewportWidth - rect.right
    let right = viewportWidth - rect.right;
    let top = Math.max(navBarHeight + 8, rect.bottom + 8);

    // Check if popover would go off the left side of screen
    if (rect.right - popoverWidth < 20) {
      // Shift popover left so it doesn't go off screen
      right = viewportWidth - 20 - popoverWidth;
    }
    // Ensure minimum spacing from right edge
    if (right < 20) {
      right = 20;
    }
    // Check if popover would go off the bottom of screen
    if (top + popoverHeight > viewportHeight - 20) {
      top = Math.max(20, rect.top - popoverHeight - 8);
    }
    if (top < 20) {
      top = 20;
    }

    return { top: `${top}px`, right: `${right}px` };
  };

  // Clear all tag filters
  const clearTagFilters = () => {
    setSelectedTags([]);
  };

  const handleRefreshFilters = async () => {
    try {
      // Reset all filters to original state
      setSearchTerm("");
      setSelectedChildFilter("all");
      setSelectedMood("all");
      setSelectedEntryType("all");
      setSelectedDateRange("all");
      setSelectedTags([]);
      // Don't close the popover - let user keep it open if they want

      // Fetch fresh data
      const response = await getDiaryEntries();
      setDiaryEntries(response.entries || []);
    } catch (error) {
      console.error("Failed to refresh filters:", error);
      toast.error("Failed to refresh filters");
    }
  };

  const handleRefreshInsightsFilters = async () => {
    try {
      // Reset only Insights-specific filters
      setSelectedChildFilter("all");
      setSelectedDateRange("all");

      // Fetch fresh data
      const response = await getDiaryEntries();
      setDiaryEntries(response.entries || []);
    } catch (error) {
      console.error("Failed to refresh insights filters:", error);
      toast.error("Failed to refresh filters");
    }
  };

  // Add click outside listener and scroll handling
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest(".tags-popover-container")) {
        setTagsPopoverOpen(false);
        // Reset border color after closing
        if (tagsButtonRef) {
          tagsButtonRef.style.borderColor = "#AA855B";
          tagsButtonRef.style.boxShadow = "none";
        }
      }
    };

    const handleScroll = () => {
      // Close popover on scroll to prevent floating issues
      if (tagsPopoverOpen) {
        setTagsPopoverOpen(false);
        // Reset border color after closing
        if (tagsButtonRef) {
          tagsButtonRef.style.borderColor = "#AA855B";
          tagsButtonRef.style.boxShadow = "none";
        }
      }
    };

    const handleResize = () => {
      // Position will be recalculated on next render automatically
      // No need to do anything here since we calculate in render
    };

    if (tagsPopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll);
      window.addEventListener("resize", handleResize);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [tagsPopoverOpen, tagsButtonRef]);

  // Close mood dropdown when clicking outside
  useEffect(() => {
    const handleClickOutsideMoodDropdown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        moodDropdownOpen === "parentMood" &&
        parentMoodDropdownRef.current &&
        !parentMoodDropdownRef.current.contains(target)
      ) {
        setMoodDropdownOpen(null);
      } else if (
        moodDropdownOpen === "childMood" &&
        childMoodDropdownRef.current &&
        !childMoodDropdownRef.current.contains(target)
      ) {
        setMoodDropdownOpen(null);
      }
    };

    if (moodDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutsideMoodDropdown);
      return () => {
        document.removeEventListener(
          "mousedown",
          handleClickOutsideMoodDropdown,
        );
      };
    }
  }, [moodDropdownOpen]);

  const handleDeleteEntry = (entry: DiaryEntry) => {
    setEntryToDelete(entry);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteEntry = async () => {
    if (!entryToDelete) return;

    setDeleting(true);
    try {
      await deleteDiaryEntry(entryToDelete.entry_id);
      setDiaryEntries((prev) =>
        prev.filter((entry) => entry.entry_id !== entryToDelete.entry_id),
      );
      toast.success("Diary entry deleted successfully");
      setDeleteConfirmOpen(false);
      setEntryToDelete(null);
    } catch (err) {
      console.error("Error deleting diary entry:", err);
      toast.error("Failed to delete diary entry. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeleteEntry = () => {
    setDeleteConfirmOpen(false);
    setEntryToDelete(null);
  };

  // Attachment handling functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter((file) => {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/gif",
          "image/webp",
          "video/mp4",
          "video/avi",
          "video/mov",
          "video/wmv",
          "video/quicktime",
        ];

        if (file.size > maxSize) {
          setAttachmentError(
            `File ${file.name} is too large. Maximum size is 10MB.`,
          );
          return false;
        }

        if (!allowedTypes.includes(file.type)) {
          setAttachmentError(
            `Only photos and videos are allowed. File type ${file.type} is not supported.`,
          );
          return false;
        }

        return true;
      });

      if (validFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...validFiles]);
        setAttachmentError("");

        // Create previews for selected files
        validFiles.forEach((file, fileIndex) => {
          if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onloadend = () => {
              setSelectedFilePreviews((prev) => [
                ...prev,
                reader.result as string,
              ]);
            };
            reader.readAsDataURL(file);
          } else if (file.type.startsWith("video/")) {
            // For videos, use a placeholder (empty string) - we'll show a video icon in the UI
            setSelectedFilePreviews((prev) => [...prev, ""]);
          }
        });
      }
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setSelectedFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (entryId: number) => {
    if (selectedFiles.length === 0) return;

    console.log(
      `🔄 [uploadAttachments] Starting upload for entry ${entryId} with ${selectedFiles.length} files`,
    );

    try {
      for (const file of selectedFiles) {
        console.log(`📤 [uploadAttachments] Processing file: ${file.name}`);

        // Upload directly to Supabase Storage like Profile.tsx does
        const fileExt = file.name.split(".").pop();
        const fileName = `${entryId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        console.log(
          `📁 [uploadAttachments] Uploading to Supabase Storage: ${fileName}`,
        );

        // Upload to Supabase Storage
        const { error } = await supabase.storage
          .from(DIARY_ATTACHMENTS_BUCKET)
          .upload(fileName, file);

        if (error) {
          console.error(
            `❌ [uploadAttachments] Supabase upload failed:`,
            error,
          );
          throw new Error(`Upload failed: ${error.message}`);
        }

        console.log(`✅ [uploadAttachments] Supabase upload successful`);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(DIARY_ATTACHMENTS_BUCKET)
          .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;
        console.log(`🔗 [uploadAttachments] Public URL: ${publicUrl}`);

        // Create attachment record in database
        const attachmentData = {
          file_name: file.name,
          file_path: publicUrl,
          file_type: file.type.startsWith("image/") ? "image" : "video",
          file_size: file.size,
          mime_type: file.type,
          description: "",
          is_primary: false,
        };

        console.log(
          `💾 [uploadAttachments] Creating database record:`,
          attachmentData,
        );

        await createDiaryAttachment(entryId, attachmentData);

        console.log(
          `✅ [uploadAttachments] Database record created successfully`,
        );
      }

      setSelectedFiles([]);
      setSelectedFilePreviews([]);
      toast.success("Attachments uploaded successfully!");
      console.log(`🎉 [uploadAttachments] All files processed successfully`);
    } catch (error) {
      console.error(
        "❌ [uploadAttachments] Error uploading attachments:",
        error,
      );
      toast.error("Failed to upload attachments");
    }
  };

  const loadAttachments = async (entryId: number) => {
    try {
      const response = await getDiaryAttachments(entryId);
      setAttachments(response.attachments || []);
    } catch (error) {
      console.error("Error loading attachments:", error);
      setAttachments([]);
    }
  };

  // Mark attachment for deletion (doesn't delete immediately)
  const markAttachmentForDeletion = (attachmentId: number) => {
    setAttachmentsToDelete((prev) => {
      if (prev.includes(attachmentId)) {
        return prev; // Already marked
      }
      return [...prev, attachmentId];
    });
  };

  // Unmark attachment from deletion
  const unmarkAttachmentForDeletion = (attachmentId: number) => {
    setAttachmentsToDelete((prev) => prev.filter((id) => id !== attachmentId));
  };

  // Delete attachments that are marked for deletion
  const deleteMarkedAttachments = async (entryId: number) => {
    if (attachmentsToDelete.length === 0) return;

    try {
      // Delete all marked attachments
      for (const attachmentId of attachmentsToDelete) {
        await deleteDiaryAttachment(attachmentId);
      }

      // Update attachments state to remove deleted ones
      setAttachments((prev) =>
        prev.filter((att) => !attachmentsToDelete.includes(att.attachment_id)),
      );

      // Clear the deletion list
      setAttachmentsToDelete([]);
    } catch (error) {
      console.error("Error deleting marked attachments:", error);
      throw error; // Re-throw to let handleUpdateEntry handle it
    }
  };

  // Keep deleteAttachment for modal view (when user clicks Delete in full-size view)
  // This is kept for backward compatibility but should ideally also mark for deletion
  const deleteAttachment = async (attachmentId: number) => {
    // In edit mode, mark for deletion instead of deleting immediately
    if (editingEntry) {
      markAttachmentForDeletion(attachmentId);
      toast.info(
        'Attachment marked for deletion. Click "Update Entry" to save changes.',
      );
    } else {
      // For non-edit mode (shouldn't happen, but keep for safety)
      try {
        await deleteDiaryAttachment(attachmentId);
        setAttachments((prev) =>
          prev.filter((att) => att.attachment_id !== attachmentId),
        );
        toast.success("Attachment deleted successfully!");
      } catch (error) {
        console.error("Error deleting attachment:", error);
        toast.error("Failed to delete attachment");
      }
    }
  };

  const getInputStyles = (value: any) => ({
    borderColor: "#AA855B",
    backgroundColor: value ? "#F5F5F5" : "#EDEDED",
    color: "#32332D",
    borderRadius: "12px",
    borderWidth: "1px",
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

  const behaviorOptions = [
    "Followed routine",
    "Shared toys",
    "Used words instead of crying",
    "Listened to instructions",
    "Showed empathy",
    "Completed tasks",
    "Played independently",
    "Cooperated with siblings",
  ];

  const challengeOptions = [
    "Tantrum/meltdown",
    "Refused to follow routine",
    "Aggressive behavior",
    "Difficulty sharing",
    "Sleep resistance",
    "Eating issues",
    "Separation anxiety",
    "Peer conflicts",
  ];

  const strategyOptions = [
    "Visual schedule",
    "Positive reinforcement",
    "Time-out",
    "Redirection",
    "Deep breathing",
    "Choice offering",
    "Consistent boundaries",
    "Calm voice",
    "Physical comfort",
  ];

  const triggerOptions = [
    "Hunger",
    "Tiredness",
    "Overstimulation",
    "Transition/change",
    "Frustration",
    "Attention seeking",
    "Peer pressure",
    "Academic pressure",
    "Family stress",
  ];

  const copingOptions = [
    "Deep breathing",
    "Counting to 10",
    "Physical exercise",
    "Art/drawing",
    "Music",
    "Talking to parent",
    "Quiet time",
    "Comfort object",
    "Mindfulness",
  ];

  const physicalSymptomOptions = [
    "Headache",
    "Stomach ache",
    "Tension",
    "Fatigue",
    "Restlessness",
    "Sleep issues",
    "Appetite changes",
    "Fidgeting",
  ];

  const skillOptions = [
    "Language development",
    "Motor skills",
    "Social interaction",
    "Problem solving",
    "Emotional regulation",
    "Independence",
    "Academic skills",
    "Creative expression",
  ];

  const renderDynamicForm = () => {
    if (selectedTemplate === "" || selectedTemplate === "free-form") {
      // Free-form entry
      return (
        <div className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleFormChange("title", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
              style={getInputStyles(formData.title)}
              onMouseEnter={(e) =>
                Object.assign(
                  (e.target as HTMLInputElement).style,
                  getInputHoverStyles(),
                )
              }
              onMouseLeave={(e) =>
                Object.assign(
                  (e.target as HTMLInputElement).style,
                  getInputBlurStyles(formData.title),
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
                  getInputBlurStyles(formData.title),
                )
              }
              placeholder="Enter a title for your entry"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Content
            </label>
            <textarea
              rows={6}
              value={formData.content}
              onChange={(e) => handleFormChange("content", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
              style={getInputStyles(formData.content)}
              onMouseEnter={(e) =>
                Object.assign(
                  (e.target as HTMLTextAreaElement).style,
                  getInputHoverStyles(),
                )
              }
              onMouseLeave={(e) =>
                Object.assign(
                  (e.target as HTMLTextAreaElement).style,
                  getInputBlurStyles(formData.content),
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
                  getInputBlurStyles(formData.content),
                )
              }
              placeholder="Write freely about your parenting experience today..."
            />
          </div>
        </div>
      );
    }

    if (selectedTemplate === "daily-behavior") {
      return (
        <div className="space-y-6">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleFormChange("title", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
              style={getInputStyles(formData.title)}
              onMouseEnter={(e) =>
                Object.assign(
                  (e.target as HTMLInputElement).style,
                  getInputHoverStyles(),
                )
              }
              onMouseLeave={(e) =>
                Object.assign(
                  (e.target as HTMLInputElement).style,
                  getInputBlurStyles(formData.title),
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
                  getInputBlurStyles(formData.title),
                )
              }
              placeholder="e.g., Morning routine success"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Behaviors Observed
            </label>
            <Autocomplete
              multiple
              freeSolo
              options={behaviorOptions}
              value={formData.observedBehaviors || []}
              onChange={(_, newValue) =>
                handleChipsFieldChange(
                  "observedBehaviors",
                  newValue as string[],
                )
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
                      fontSize: { xs: "0.75rem", sm: "0.8125rem" },
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
                  placeholder="Add behaviors observed"
                  sx={getTextFieldStyles(true)}
                />
              )}
            />
            <div className="mt-1.5 sm:mt-2">
              <div
                className="text-[10px] sm:text-xs mb-0.5 sm:mb-1 font-['Poppins']"
                style={{ color: "#AA855B" }}
              >
                Suggestions
              </div>
              <div className="flex flex-wrap gap-0.5 sm:gap-1">
                {behaviorOptions
                  .filter((s) => {
                    const currentBehaviors = (formData.observedBehaviors || []).map(
                      (x: string) => x.toLowerCase().trim(),
                    );
                    const suggestionNormalized = s.toLowerCase().trim();
                    return !currentBehaviors.includes(suggestionNormalized);
                  })
                  .map((s) => (
                    <Button
                      key={s}
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        handleChipsFieldChange(
                          "observedBehaviors",
                          normalizeTokens([
                            ...(formData.observedBehaviors || []),
                            s,
                          ]),
                        )
                      }
                      sx={{
                        textTransform: "none",
                        m: 0.25,
                        borderColor: "#F0DCC9",
                        color: "#AA855B",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: { xs: "0.625rem", sm: "0.75rem" },
                        "&:hover": {
                          borderColor: "#AA855B",
                          backgroundColor: "#F5F3F0",
                        },
                      }}
                    >
                      {s}
                    </Button>
                  ))}
              </div>
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Challenges Encountered
            </label>
            <Autocomplete
              multiple
              freeSolo
              options={challengeOptions}
              value={formData.challenges || []}
              onChange={(_, newValue) =>
                handleChipsFieldChange("challenges", newValue as string[])
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
                      fontSize: { xs: "0.75rem", sm: "0.8125rem" },
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
                  placeholder="Add challenges encountered"
                  sx={getTextFieldStyles(true)}
                />
              )}
            />
            <div className="mt-1.5 sm:mt-2">
              <div
                className="text-[10px] sm:text-xs mb-0.5 sm:mb-1 font-['Poppins']"
                style={{ color: "#AA855B" }}
              >
                Suggestions
              </div>
              <div className="flex flex-wrap gap-0.5 sm:gap-1">
                {challengeOptions
                  .filter((s) => {
                    const currentChallenges = (formData.challenges || []).map(
                      (x: string) => x.toLowerCase().trim(),
                    );
                    const suggestionNormalized = s.toLowerCase().trim();
                    return !currentChallenges.includes(suggestionNormalized);
                  })
                  .map((s) => (
                    <Button
                      key={s}
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        handleChipsFieldChange(
                          "challenges",
                          normalizeTokens([...(formData.challenges || []), s]),
                        )
                      }
                      sx={{
                        textTransform: "none",
                        m: 0.25,
                        borderColor: "#F0DCC9",
                        color: "#AA855B",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: { xs: "0.625rem", sm: "0.75rem" },
                        "&:hover": {
                          borderColor: "#AA855B",
                          backgroundColor: "#F5F3F0",
                        },
                      }}
                    >
                      {s}
                    </Button>
                  ))}
              </div>
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Strategies Used
            </label>
            <Autocomplete
              multiple
              freeSolo
              options={strategyOptions}
              value={formData.strategiesUsed || []}
              onChange={(_, newValue) =>
                handleChipsFieldChange("strategiesUsed", newValue as string[])
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
                      fontSize: { xs: "0.75rem", sm: "0.8125rem" },
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
                  placeholder="Add strategies used"
                  sx={getTextFieldStyles(true)}
                />
              )}
            />
            <div className="mt-1.5 sm:mt-2">
              <div
                className="text-[10px] sm:text-xs mb-0.5 sm:mb-1 font-['Poppins']"
                style={{ color: "#AA855B" }}
              >
                Suggestions
              </div>
              <div className="flex flex-wrap gap-0.5 sm:gap-1">
                {strategyOptions
                  .filter((s) => {
                    const currentStrategies = (formData.strategiesUsed || []).map(
                      (x: string) => x.toLowerCase().trim(),
                    );
                    const suggestionNormalized = s.toLowerCase().trim();
                    return !currentStrategies.includes(suggestionNormalized);
                  })
                  .map((s) => (
                    <Button
                      key={s}
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        handleChipsFieldChange(
                          "strategiesUsed",
                          normalizeTokens([
                            ...(formData.strategiesUsed || []),
                            s,
                          ]),
                        )
                      }
                      sx={{
                        textTransform: "none",
                        m: 0.25,
                        borderColor: "#F0DCC9",
                        color: "#AA855B",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: { xs: "0.625rem", sm: "0.75rem" },
                        "&:hover": {
                          borderColor: "#AA855B",
                          backgroundColor: "#F5F3F0",
                        },
                      }}
                    >
                      {s}
                    </Button>
                  ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "#32332D" }}
              >
                Time of Day
              </label>
              <div className="relative">
                <select
                  value={formData.timeOfDay}
                  onChange={(e) =>
                    handleFormChange("timeOfDay", e.target.value)
                  }
                  onFocus={() => {
                    setFocusedModalSelect("timeOfDay");
                    const element = document.activeElement as HTMLSelectElement;
                    if (element) {
                      Object.assign(element.style, getInputFocusStyles());
                    }
                  }}
                  onBlur={() => {
                    setFocusedModalSelect(null);
                    const element = document.activeElement as HTMLSelectElement;
                    if (element) {
                      Object.assign(
                        element.style,
                        getInputBlurStyles(formData.timeOfDay),
                      );
                    }
                  }}
                  className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 custom-select"
                  style={{
                    ...getInputStyles(formData.timeOfDay),
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    backgroundImage: "none",
                  }}
                  onMouseEnter={(e) =>
                    Object.assign(
                      (e.target as HTMLSelectElement).style,
                      getInputHoverStyles(),
                    )
                  }
                  onMouseLeave={(e) =>
                    Object.assign(
                      (e.target as HTMLSelectElement).style,
                      getInputBlurStyles(formData.timeOfDay),
                    )
                  }
                >
                  <option value="">Select time</option>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="bedtime">Bedtime</option>
                </select>
                {focusedModalSelect === "timeOfDay" ? (
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
                className="block text-sm font-medium mb-1"
                style={{ color: "#32332D" }}
              >
                Duration
              </label>
              <div className="relative">
                <select
                  value={formData.duration}
                  onChange={(e) => handleFormChange("duration", e.target.value)}
                  onFocus={() => {
                    setFocusedModalSelect("duration");
                    const element = document.activeElement as HTMLSelectElement;
                    if (element) {
                      Object.assign(element.style, getInputFocusStyles());
                    }
                  }}
                  onBlur={() => {
                    setFocusedModalSelect(null);
                    const element = document.activeElement as HTMLSelectElement;
                    if (element) {
                      Object.assign(
                        element.style,
                        getInputBlurStyles(formData.duration),
                      );
                    }
                  }}
                  className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 custom-select"
                  style={{
                    ...getInputStyles(formData.duration),
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    backgroundImage: "none",
                  }}
                  onMouseEnter={(e) =>
                    Object.assign(
                      (e.target as HTMLSelectElement).style,
                      getInputHoverStyles(),
                    )
                  }
                  onMouseLeave={(e) =>
                    Object.assign(
                      (e.target as HTMLSelectElement).style,
                      getInputBlurStyles(formData.duration),
                    )
                  }
                >
                  <option value="">Select duration</option>
                  <option value="5-15 minutes">5-15 minutes</option>
                  <option value="15-30 minutes">15-30 minutes</option>
                  <option value="30-60 minutes">30-60 minutes</option>
                  <option value="1+ hours">1+ hours</option>
                </select>
                {focusedModalSelect === "duration" ? (
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
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Overall Effectiveness
            </label>
            <div className="relative">
              <select
                value={formData.effectiveness}
                onChange={(e) =>
                  handleFormChange("effectiveness", e.target.value)
                }
                onFocus={() => {
                  setFocusedModalSelect("effectiveness");
                  const element = document.activeElement as HTMLSelectElement;
                  if (element) {
                    Object.assign(element.style, getInputFocusStyles());
                  }
                }}
                onBlur={() => {
                  setFocusedModalSelect(null);
                  const element = document.activeElement as HTMLSelectElement;
                  if (element) {
                    Object.assign(
                      element.style,
                      getInputBlurStyles(formData.effectiveness),
                    );
                  }
                }}
                className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 custom-select"
                style={{
                  ...getInputStyles(formData.effectiveness),
                  appearance: "none",
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  backgroundImage: "none",
                }}
                onMouseEnter={(e) =>
                  Object.assign(
                    (e.target as HTMLSelectElement).style,
                    getInputHoverStyles(),
                  )
                }
                onMouseLeave={(e) =>
                  Object.assign(
                    (e.target as HTMLSelectElement).style,
                    getInputBlurStyles(formData.effectiveness),
                  )
                }
              >
                <option value="">Select effectiveness</option>
                <option value="very-effective">Very Effective</option>
                <option value="somewhat-effective">Somewhat Effective</option>
                <option value="neutral">Neutral</option>
                <option value="not-effective">Not Effective</option>
              </select>
              {focusedModalSelect === "effectiveness" ? (
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
        </div>
      );
    }

    if (selectedTemplate === "emotional-tracking") {
      return (
        <div className="space-y-6">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleFormChange("title", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
              style={getInputStyles(formData.title)}
              onMouseEnter={(e) =>
                Object.assign(
                  (e.target as HTMLInputElement).style,
                  getInputHoverStyles(),
                )
              }
              onMouseLeave={(e) =>
                Object.assign(
                  (e.target as HTMLInputElement).style,
                  getInputBlurStyles(formData.title),
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
                  getInputBlurStyles(formData.title),
                )
              }
              placeholder="e.g., Emotional regulation practice"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "#32332D" }}
              >
                Child's Emotion Intensity (1-10)
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-sm" style={{ color: "#AA855B" }}>
                  Low
                </span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.emotionIntensity}
                  onChange={(e) =>
                    handleFormChange(
                      "emotionIntensity",
                      parseInt(e.target.value),
                    )
                  }
                  className="flex-1"
                  style={{ accentColor: "#F2742C" }}
                />
                <span className="text-sm" style={{ color: "#AA855B" }}>
                  High
                </span>
                <span
                  className="text-sm font-medium w-8"
                  style={{ color: "#32332D" }}
                >
                  {formData.emotionIntensity}
                </span>
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "#32332D" }}
              >
                Your Stress Level (1-10)
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-sm" style={{ color: "#AA855B" }}>
                  Low
                </span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.stressLevel}
                  onChange={(e) =>
                    handleFormChange("stressLevel", parseInt(e.target.value))
                  }
                  className="flex-1"
                  style={{ accentColor: "#F2742C" }}
                />
                <span className="text-sm" style={{ color: "#AA855B" }}>
                  High
                </span>
                <span
                  className="text-sm font-medium w-8"
                  style={{ color: "#32332D" }}
                >
                  {formData.stressLevel}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Triggers Identified
            </label>
            <Autocomplete
              multiple
              freeSolo
              options={triggerOptions}
              value={formData.triggers || []}
              onChange={(_, newValue) =>
                handleChipsFieldChange("triggers", newValue as string[])
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
                      fontSize: { xs: "0.75rem", sm: "0.8125rem" },
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
                  placeholder="Add triggers identified"
                  sx={getTextFieldStyles(true)}
                />
              )}
            />
            <div className="mt-1.5 sm:mt-2">
              <div
                className="text-[10px] sm:text-xs mb-0.5 sm:mb-1 font-['Poppins']"
                style={{ color: "#AA855B" }}
              >
                Suggestions
              </div>
              <div className="flex flex-wrap gap-0.5 sm:gap-1">
                {triggerOptions
                  .filter((s) => {
                    const currentTriggers = (formData.triggers || []).map(
                      (x: string) => x.toLowerCase().trim(),
                    );
                    const suggestionNormalized = s.toLowerCase().trim();
                    return !currentTriggers.includes(suggestionNormalized);
                  })
                  .map((s) => (
                    <Button
                      key={s}
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        handleChipsFieldChange(
                          "triggers",
                          normalizeTokens([...(formData.triggers || []), s]),
                        )
                      }
                      sx={{
                        textTransform: "none",
                        m: 0.25,
                        borderColor: "#F0DCC9",
                        color: "#AA855B",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: { xs: "0.625rem", sm: "0.75rem" },
                        "&:hover": {
                          borderColor: "#AA855B",
                          backgroundColor: "#F5F3F0",
                        },
                      }}
                    >
                      {s}
                    </Button>
                  ))}
              </div>
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Coping Strategies Used
            </label>
            <Autocomplete
              multiple
              freeSolo
              options={copingOptions}
              value={formData.copingStrategies || []}
              onChange={(_, newValue) =>
                handleChipsFieldChange("copingStrategies", newValue as string[])
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
                      fontSize: { xs: "0.75rem", sm: "0.8125rem" },
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
                  placeholder="Add coping strategies used"
                  sx={getTextFieldStyles(true)}
                />
              )}
            />
            <div className="mt-1.5 sm:mt-2">
              <div
                className="text-[10px] sm:text-xs mb-0.5 sm:mb-1 font-['Poppins']"
                style={{ color: "#AA855B" }}
              >
                Suggestions
              </div>
              <div className="flex flex-wrap gap-0.5 sm:gap-1">
                {copingOptions
                  .filter((s) => {
                    const currentCopingStrategies = (formData.copingStrategies || []).map(
                      (x: string) => x.toLowerCase().trim(),
                    );
                    const suggestionNormalized = s.toLowerCase().trim();
                    return !currentCopingStrategies.includes(suggestionNormalized);
                  })
                  .map((s) => (
                    <Button
                      key={s}
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        handleChipsFieldChange(
                          "copingStrategies",
                          normalizeTokens([
                            ...(formData.copingStrategies || []),
                            s,
                          ]),
                        )
                      }
                      sx={{
                        textTransform: "none",
                        m: 0.25,
                        borderColor: "#F0DCC9",
                        color: "#AA855B",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: { xs: "0.625rem", sm: "0.75rem" },
                        "&:hover": {
                          borderColor: "#AA855B",
                          backgroundColor: "#F5F3F0",
                        },
                      }}
                    >
                      {s}
                    </Button>
                  ))}
              </div>
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Physical Symptoms Observed
            </label>
            <Autocomplete
              multiple
              freeSolo
              options={physicalSymptomOptions}
              value={formData.physicalSymptoms || []}
              onChange={(_, newValue) =>
                handleChipsFieldChange("physicalSymptoms", newValue as string[])
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
                      fontSize: { xs: "0.75rem", sm: "0.8125rem" },
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
                  placeholder="Add physical symptoms observed"
                  sx={getTextFieldStyles(true)}
                />
              )}
            />
            <div className="mt-1.5 sm:mt-2">
              <div
                className="text-[10px] sm:text-xs mb-0.5 sm:mb-1 font-['Poppins']"
                style={{ color: "#AA855B" }}
              >
                Suggestions
              </div>
              <div className="flex flex-wrap gap-0.5 sm:gap-1">
                {physicalSymptomOptions
                  .filter((s) => {
                    const currentPhysicalSymptoms = (formData.physicalSymptoms || []).map(
                      (x: string) => x.toLowerCase().trim(),
                    );
                    const suggestionNormalized = s.toLowerCase().trim();
                    return !currentPhysicalSymptoms.includes(suggestionNormalized);
                  })
                  .map((s) => (
                    <Button
                      key={s}
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        handleChipsFieldChange(
                          "physicalSymptoms",
                          normalizeTokens([
                            ...(formData.physicalSymptoms || []),
                            s,
                          ]),
                        )
                      }
                      sx={{
                        textTransform: "none",
                        m: 0.25,
                        borderColor: "#F0DCC9",
                        color: "#AA855B",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: { xs: "0.625rem", sm: "0.75rem" },
                        "&:hover": {
                          borderColor: "#AA855B",
                          backgroundColor: "#F5F3F0",
                        },
                      }}
                    >
                      {s}
                    </Button>
                  ))}
              </div>
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Environmental Factors
            </label>
            <textarea
              rows={3}
              value={formData.environmentalFactors}
              onChange={(e) =>
                handleFormChange("environmentalFactors", e.target.value)
              }
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
              style={getInputStyles(formData.environmentalFactors)}
              onMouseEnter={(e) =>
                Object.assign(
                  (e.target as HTMLTextAreaElement).style,
                  getInputHoverStyles(),
                )
              }
              onMouseLeave={(e) =>
                Object.assign(
                  (e.target as HTMLTextAreaElement).style,
                  getInputBlurStyles(formData.environmentalFactors),
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
                  getInputBlurStyles(formData.environmentalFactors),
                )
              }
              placeholder="Describe the environment, people present, activities happening..."
            />
          </div>
        </div>
      );
    }

    if (selectedTemplate === "intervention-tracking") {
      return (
        <div className="space-y-6">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleFormChange("title", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
              style={getInputStyles(formData.title)}
              onMouseEnter={(e) =>
                Object.assign(
                  (e.target as HTMLInputElement).style,
                  getInputHoverStyles(),
                )
              }
              onMouseLeave={(e) =>
                Object.assign(
                  (e.target as HTMLInputElement).style,
                  getInputBlurStyles(formData.title),
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
                  getInputBlurStyles(formData.title),
                )
              }
              placeholder="e.g., Timeout strategy for aggression"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Situation Description
            </label>
            <textarea
              rows={3}
              value={formData.situation}
              onChange={(e) => handleFormChange("situation", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
              style={getInputStyles(formData.situation)}
              onMouseEnter={(e) =>
                Object.assign(
                  (e.target as HTMLTextAreaElement).style,
                  getInputHoverStyles(),
                )
              }
              onMouseLeave={(e) =>
                Object.assign(
                  (e.target as HTMLTextAreaElement).style,
                  getInputBlurStyles(formData.situation),
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
                  getInputBlurStyles(formData.situation),
                )
              }
              placeholder="Describe what was happening before the intervention..."
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Intervention Used
            </label>
            <textarea
              rows={3}
              value={formData.intervention}
              onChange={(e) => handleFormChange("intervention", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
              style={getInputStyles(formData.intervention)}
              onMouseEnter={(e) =>
                Object.assign(
                  (e.target as HTMLTextAreaElement).style,
                  getInputHoverStyles(),
                )
              }
              onMouseLeave={(e) =>
                Object.assign(
                  (e.target as HTMLTextAreaElement).style,
                  getInputBlurStyles(formData.intervention),
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
                  getInputBlurStyles(formData.intervention),
                )
              }
              placeholder="Describe exactly what you did and how you implemented it..."
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Immediate Outcome
            </label>
            <textarea
              rows={2}
              value={formData.immediateOutcome}
              onChange={(e) =>
                handleFormChange("immediateOutcome", e.target.value)
              }
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
              style={getInputStyles(formData.immediateOutcome)}
              onMouseEnter={(e) =>
                Object.assign(
                  (e.target as HTMLTextAreaElement).style,
                  getInputHoverStyles(),
                )
              }
              onMouseLeave={(e) =>
                Object.assign(
                  (e.target as HTMLTextAreaElement).style,
                  getInputBlurStyles(formData.immediateOutcome),
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
                  getInputBlurStyles(formData.immediateOutcome),
                )
              }
              placeholder="What happened immediately after the intervention?"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "#32332D" }}
            >
              Effectiveness Rating (1-10)
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-sm" style={{ color: "#AA855B" }}>
                Poor
              </span>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.effectivenessRating}
                onChange={(e) =>
                  handleFormChange(
                    "effectivenessRating",
                    parseInt(e.target.value),
                  )
                }
                className="flex-1"
                style={{ accentColor: "#F2742C" }}
              />
              <span className="text-sm" style={{ color: "#AA855B" }}>
                Excellent
              </span>
              <span
                className="text-sm font-medium w-8"
                style={{ color: "#32332D" }}
              >
                {formData.effectivenessRating}
              </span>
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "#32332D" }}
            >
              Would you use this intervention again?
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="wouldUseAgain"
                  checked={formData.wouldUseAgain === true}
                  onChange={() => handleFormChange("wouldUseAgain", true)}
                  className="w-4 h-4 border-gray-300 focus:ring-2"
                  style={{
                    accentColor: "#0F5648",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                />
                <span className="text-sm" style={{ color: "#32332D" }}>
                  Yes, definitely
                </span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="wouldUseAgain"
                  checked={formData.wouldUseAgain === false}
                  onChange={() => handleFormChange("wouldUseAgain", false)}
                  className="w-4 h-4 border-gray-300 focus:ring-2"
                  style={{
                    accentColor: "#0F5648",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                />
                <span className="text-sm" style={{ color: "#32332D" }}>
                  No, needs modification
                </span>
              </label>
            </div>
          </div>
        </div>
      );
    }

    if (selectedTemplate === "milestone-progress") {
      return (
        <div className="space-y-6">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleFormChange("title", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
              style={getInputStyles(formData.title)}
              onMouseEnter={(e) =>
                Object.assign(
                  (e.target as HTMLInputElement).style,
                  getInputHoverStyles(),
                )
              }
              onMouseLeave={(e) =>
                Object.assign(
                  (e.target as HTMLInputElement).style,
                  getInputBlurStyles(formData.title),
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
                  getInputBlurStyles(formData.title),
                )
              }
              placeholder="e.g., Language development milestone"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Skills/Areas Observed
            </label>
            <Autocomplete
              multiple
              freeSolo
              options={skillOptions}
              value={formData.skillsObserved || []}
              onChange={(_, newValue) =>
                handleChipsFieldChange("skillsObserved", newValue as string[])
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
                      fontSize: { xs: "0.75rem", sm: "0.8125rem" },
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
                  placeholder="Add skills/areas observed"
                  sx={getTextFieldStyles(true)}
                />
              )}
            />
            <div className="mt-1.5 sm:mt-2">
              <div
                className="text-[10px] sm:text-xs mb-0.5 sm:mb-1 font-['Poppins']"
                style={{ color: "#AA855B" }}
              >
                Suggestions
              </div>
              <div className="flex flex-wrap gap-0.5 sm:gap-1">
                {skillOptions
                  .filter((s) => {
                    const currentSkills = (formData.skillsObserved || []).map(
                      (x: string) => x.toLowerCase().trim(),
                    );
                    const suggestionNormalized = s.toLowerCase().trim();
                    return !currentSkills.includes(suggestionNormalized);
                  })
                  .map((s) => (
                    <Button
                      key={s}
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        handleChipsFieldChange(
                          "skillsObserved",
                          normalizeTokens([
                            ...(formData.skillsObserved || []),
                            s,
                          ]),
                        )
                      }
                      sx={{
                        textTransform: "none",
                        m: 0.25,
                        borderColor: "#F0DCC9",
                        color: "#AA855B",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: { xs: "0.625rem", sm: "0.75rem" },
                        "&:hover": {
                          borderColor: "#AA855B",
                          backgroundColor: "#F5F3F0",
                        },
                      }}
                    >
                      {s}
                    </Button>
                  ))}
              </div>
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Improvements Observed
            </label>
            <textarea
              rows={3}
              value={formData.improvements}
              onChange={(e) => handleFormChange("improvements", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
              style={getInputStyles(formData.improvements)}
              onMouseEnter={(e) =>
                Object.assign(
                  (e.target as HTMLTextAreaElement).style,
                  getInputHoverStyles(),
                )
              }
              onMouseLeave={(e) =>
                Object.assign(
                  (e.target as HTMLTextAreaElement).style,
                  getInputBlurStyles(formData.improvements),
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
                  getInputBlurStyles(formData.improvements),
                )
              }
              placeholder="Describe specific improvements you've noticed..."
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Setbacks or Concerns
            </label>
            <textarea
              rows={3}
              value={formData.setbacks}
              onChange={(e) => handleFormChange("setbacks", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
              style={getInputStyles(formData.setbacks)}
              onMouseEnter={(e) =>
                Object.assign(
                  (e.target as HTMLTextAreaElement).style,
                  getInputHoverStyles(),
                )
              }
              onMouseLeave={(e) =>
                Object.assign(
                  (e.target as HTMLTextAreaElement).style,
                  getInputBlurStyles(formData.setbacks),
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
                  getInputBlurStyles(formData.setbacks),
                )
              }
              placeholder="Note any setbacks or areas of concern..."
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Next Goals
            </label>
            <textarea
              rows={2}
              value={formData.nextGoals}
              onChange={(e) => handleFormChange("nextGoals", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
              style={getInputStyles(formData.nextGoals)}
              onMouseEnter={(e) =>
                Object.assign(
                  (e.target as HTMLTextAreaElement).style,
                  getInputHoverStyles(),
                )
              }
              onMouseLeave={(e) =>
                Object.assign(
                  (e.target as HTMLTextAreaElement).style,
                  getInputBlurStyles(formData.nextGoals),
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
                  getInputBlurStyles(formData.nextGoals),
                )
              }
              placeholder="What would you like to focus on next?"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Professional Recommendations
            </label>
            <textarea
              rows={2}
              value={formData.professionalRecommendations}
              onChange={(e) =>
                handleFormChange("professionalRecommendations", e.target.value)
              }
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
              style={getInputStyles(formData.professionalRecommendations)}
              onMouseEnter={(e) =>
                Object.assign(
                  (e.target as HTMLTextAreaElement).style,
                  getInputHoverStyles(),
                )
              }
              onMouseLeave={(e) =>
                Object.assign(
                  (e.target as HTMLTextAreaElement).style,
                  getInputBlurStyles(formData.professionalRecommendations),
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
                  getInputBlurStyles(formData.professionalRecommendations),
                )
              }
              placeholder="Any recommendations from professionals or therapists..."
            />
          </div>
        </div>
      );
    }

    // Default fallback - should not reach here in normal operation
    console.warn("No template matched for selectedTemplate:", selectedTemplate);
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          Please select an entry type to continue.
        </p>
      </div>
    );
  };

  /* Calendar View */
  const renderCalendarView = () => {
    const currentDate = selectedDate || new Date();
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className="h-20 sm:h-24 lg:h-32 border"
          style={{ borderColor: "#AA855B" }}
        ></div>,
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        day,
      );
      const dayEntries = getEntriesForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const hasEntries = dayEntries.length > 0;

      days.push(
        <div
          key={day}
          className={`h-20 sm:h-24 lg:h-32 border p-1.5 sm:p-2 cursor-pointer hover:bg-opacity-50 transition-all duration-200 ${
            isToday ? "border-opacity-100" : "border-opacity-50"
          }`}
          style={{
            borderColor: "#AA855B",
            backgroundColor: isToday
              ? "#FDF2E8"
              : hasEntries
                ? "#F8F9FA"
                : "transparent",
          }}
          onClick={() => handleDateClick(date)}
        >
          {/* Day Number */}
          <div className="text-xs sm:text-sm font-medium mb-1 sm:mb-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isToday ? (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#F2742C" }}
                >
                  <span style={{ color: "#FFFFFF" }}>{day}</span>
                </div>
              ) : (
                <span style={{ color: "#32332D" }}>{day}</span>
              )}
            </div>
            {hasEntries && (
              <div className="flex items-center space-x-0.5 sm:space-x-1">
                <div
                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
                  style={{ backgroundColor: "#0F5648" }}
                ></div>
                <span
                  className="text-[10px] sm:text-xs font-medium"
                  style={{ color: "#0F5648" }}
                >
                  {dayEntries.length}
                </span>
              </div>
            )}
          </div>

          {/* Entry Indicators - Hidden on mobile/tablet, shown on desktop */}
          <div className="space-y-1 hidden lg:block">
            {dayEntries.slice(0, 3).map((entry, index) => {
              // Find child color for this entry - handle both child_id and id fields
              const child = children.find(
                (c) => c.child_id === entry.child_id || c.id === entry.child_id,
              );
              const childColor = child?.color_code || "#326586";

              return (
                <div
                  key={entry.entry_id}
                  className="text-xs px-2 py-1 rounded-md truncate flex items-center space-x-1 transition-all duration-200 hover:shadow-sm cursor-pointer"
                  style={{
                    backgroundColor: childColor,
                    color: "#FFFFFF",
                    borderLeft: `3px solid ${childColor}`,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent date cell click
                    handleEditEntry(entry); // Open edit modal directly
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: "#FFFFFF" }}
                  ></div>
                  <span className="truncate font-medium">
                    {entry.title || "Untitled"}
                  </span>
                </div>
              );
            })}

            {dayEntries.length > 3 && (
              <div
                className="text-xs px-2 py-1 rounded-md text-center font-medium cursor-pointer transition-all duration-200 hover:shadow-sm"
                style={{
                  backgroundColor: "#AA855B",
                  color: "#FFFFFF",
                }}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent date cell click
                  setSelectedDate(date);
                  setEntryListModalOpen(true);
                }}
              >
                +{dayEntries.length - 3} more
              </div>
            )}
          </div>
        </div>,
      );
    }

    return (
      <div className="grid grid-cols-7 gap-0">
        {/* Day headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="p-2 sm:p-3 lg:p-4 text-center text-xs sm:text-sm font-medium border-b"
            style={{ color: "#AA855B", borderColor: "#AA855B" }}
          >
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  /* List View */
  const renderListView = () => {
    // Check if we're filtering by a specific child and they have no entries at all (regardless of mood)
    const isFilteringByChild = selectedChildFilter !== "all";
    const selectedChild = children.find(
      (child: any) =>
        child.id?.toString() === selectedChildFilter ||
        child.child_id?.toString() === selectedChildFilter,
    );

    // Get all entries for this child (without mood filter)
    const childEntries = isFilteringByChild
      ? diaryEntries.filter(
          (entry) => entry.child_id?.toString() === selectedChildFilter,
        )
      : diaryEntries;

    // Get all entries without any filters
    const allEntries = diaryEntries;

    const hasNoEntriesAtAll = isFilteringByChild && childEntries.length === 0;
    const hasEntriesButNoMatches =
      isFilteringByChild &&
      childEntries.length > 0 &&
      filteredEntries.length === 0;

    // Case: "All Children" + specific mood filter with no matches
    const isAllChildrenWithMoodFilter =
      selectedChildFilter === "all" &&
      selectedMood !== "all" &&
      allEntries.length > 0 &&
      filteredEntries.length === 0;

    // Case: "All Children" + search term with no matches
    const isAllChildrenWithSearchFilter =
      selectedChildFilter === "all" &&
      searchTerm.trim() !== "" &&
      allEntries.length > 0 &&
      filteredEntries.length === 0;

    // Case: "All Children" + multiple filters with no matches
    const isAllChildrenWithMultipleFilters =
      selectedChildFilter === "all" &&
      (selectedMood !== "all" ||
        searchTerm.trim() !== "" ||
        selectedEntryType !== "all" ||
        selectedDateRange !== "all" ||
        selectedTags.length > 0) &&
      allEntries.length > 0 &&
      filteredEntries.length === 0;

    // Case: No entries at all in the system
    const hasNoEntriesInSystem = allEntries.length === 0;

    // Case 1: Child has no entries at all
    if (hasNoEntriesAtAll && selectedChild) {
      return (
        <div className="flex flex-col items-center justify-center py-8 px-8">
          <div className="text-center max-w-lg">
            <div className="w-15 h-15 mx-auto mt-0 mb-5 rounded-full flex items-center justify-center">
              <BookOpen className="w-10 h-10" style={{ color: "#AA855B" }} />
            </div>
            <h3
              className="text-xl font-semibold mb-3 font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              No entries for {selectedChild.name}
            </h3>
            <p
              className="text-sm mb-6 font-['Poppins']"
              style={{ color: "#AA855B" }}
            >
              Start documenting {selectedChild.name}'s journey by creating your
              first diary entry.
            </p>
            <button
              onClick={() => {
                handleOpenNewEntry(selectedChild.id.toString());
              }}
              className="px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg font-medium font-['Poppins']"
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
              Create First Entry for {selectedChild.name}
            </button>
          </div>
        </div>
      );
    }

    // Case 2: Child has entries but none match current filters
    if (hasEntriesButNoMatches && selectedChild) {
      return (
        <div className="flex flex-col items-center justify-center py-8 px-8">
          <div className="text-center max-w-lg">
            <div className="w-15 h-15 mx-auto mb-5 rounded-full flex items-center justify-center">
              <Filter className="w-10 h-10" style={{ color: "#AA855B" }} />
            </div>
            <h3
              className="text-xl font-semibold mb-3 font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              No entries match your current filters
            </h3>
            <p
              className="text-sm mb-6 font-['Poppins']"
              style={{ color: "#AA855B" }}
            >
              {selectedChild.name} has {childEntries.length}{" "}
              {childEntries.length === 1 ? "entry" : "entries"}, but none match
              your current mood filter.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={() => {
                  setSelectedMood("all");
                }}
                className="px-4 py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins']"
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
                Show All Moods
              </button>
              <button
                onClick={() => {
                  handleOpenNewEntry(selectedChild.id.toString());
                }}
                className="px-4 py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins']"
                style={{
                  backgroundColor: "transparent",
                  color: "#AA855B",
                  border: "1px solid #AA855B",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#F5F3F0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                + New Entry
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Case 3: No entries in the entire system
    if (hasNoEntriesInSystem) {
      return (
        <div className="flex flex-col items-center justify-center py-8 px-8">
          <div className="text-center max-w-lg">
            <div className="w-15 h-15 mx-auto mb-5 rounded-full flex items-center justify-center">
              <BookOpen className="w-10 h-10" style={{ color: "#AA855B" }} />
            </div>
            <h3
              className="text-xl font-semibold mb-3 font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              No diary entries yet
            </h3>
            <p
              className="text-sm mb-6 font-['Poppins']"
              style={{ color: "#AA855B" }}
            >
              Start documenting your parenting journey by creating your first
              diary entry.
            </p>
            <button
              onClick={() => {
                // Check if user has no children - show onboarding modal
                if (children.length === 0 && !isAddingChild) {
                  setNewEntryDate(new Date());
                  setShowAddFirstChildModal(true);
                  return;
                }

                handleOpenNewEntry();
              }}
              className="px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg font-medium font-['Poppins']"
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
              Create Your First Entry
            </button>
          </div>
        </div>
      );
    }

    // Case 4: "All Children" + mood filter with no matches
    if (isAllChildrenWithMoodFilter) {
      return (
        <div className="flex flex-col items-center justify-center py-8 px-8">
          <div className="text-center max-w-lg">
            <div className="w-15 h-15 mx-auto mb-5 rounded-full flex items-center justify-center">
              <Filter className="w-10 h-10" style={{ color: "#AA855B" }} />
            </div>
            <h3
              className="text-xl font-semibold mb-3 font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              No entries match your current filters
            </h3>
            <p
              className="text-sm mb-6 font-['Poppins']"
              style={{ color: "#AA855B" }}
            >
              You have {allEntries.length}{" "}
              {allEntries.length === 1 ? "entry" : "entries"}, but none match
              the "{selectedMood}" mood filter.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={() => {
                  setSelectedMood("all");
                }}
                className="px-4 py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins']"
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
                Show All Moods
              </button>
              <button
                onClick={() => {
                  handleOpenNewEntry();
                }}
                className="px-4 py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins']"
                style={{
                  backgroundColor: "transparent",
                  color: "#AA855B",
                  border: "1px solid #AA855B",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#F5F3F0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                + New Entry
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Case 5: "All Children" + search term with no matches
    if (isAllChildrenWithSearchFilter) {
      return (
        <div className="flex flex-col items-center justify-center py-8 px-8">
          <div className="text-center max-w-lg">
            <div className="w-15 h-15 mx-auto mb-5 rounded-full flex items-center justify-center">
              <Search className="w-10 h-10" style={{ color: "#AA855B" }} />
            </div>
            <h3
              className="text-xl font-semibold mb-3 font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              No entries match your search
            </h3>
            <p
              className="text-sm mb-6 font-['Poppins']"
              style={{ color: "#AA855B" }}
            >
              No entries found for "{searchTerm}". Try different keywords or
              clear your search.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={() => {
                  setSearchTerm("");
                }}
                className="px-4 py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins']"
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
                Clear Search
              </button>
              <button
                onClick={() => {
                  handleOpenNewEntry();
                }}
                className="px-4 py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins']"
                style={{
                  backgroundColor: "transparent",
                  color: "#AA855B",
                  border: "1px solid #AA855B",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#F5F3F0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                + New Entry
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Case 6: "All Children" + multiple filters with no matches
    if (isAllChildrenWithMultipleFilters) {
      const activeFilters = [];
      if (selectedMood !== "all") activeFilters.push(`${selectedMood} mood`);
      if (searchTerm.trim() !== "")
        activeFilters.push(`"${searchTerm}" search`);
      if (selectedEntryType !== "all")
        activeFilters.push(`${selectedEntryType} type`);
      if (selectedDateRange !== "all")
        activeFilters.push(`${selectedDateRange} date`);
      if (selectedTags.length > 0)
        activeFilters.push(
          `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""}`,
        );

      return (
        <div className="flex flex-col items-center justify-center py-8 px-8">
          <div className="text-center max-w-lg">
            <div className="w-15 h-15 mx-auto mb-5 rounded-full flex items-center justify-center">
              <Filter className="w-10 h-10" style={{ color: "#AA855B" }} />
            </div>
            <h3
              className="text-xl font-semibold mb-3 font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              No entries match your current filters
            </h3>
            <p
              className="text-sm mb-6 font-['Poppins']"
              style={{ color: "#AA855B" }}
            >
              You have {allEntries.length}{" "}
              {allEntries.length === 1 ? "entry" : "entries"}, but none match
              your current filters: {activeFilters.join(" and ")}.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={() => {
                  setSelectedMood("all");
                  setSearchTerm("");
                  setSelectedEntryType("all");
                  setSelectedDateRange("all");
                  setSelectedTags([]);
                }}
                className="px-4 py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins']"
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
                Clear All Filters
              </button>
              <button
                onClick={() => {
                  handleOpenNewEntry();
                }}
                className="px-4 py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins']"
                style={{
                  backgroundColor: "transparent",
                  color: "#AA855B",
                  border: "1px solid #AA855B",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#F5F3F0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                + New Entry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3 sm:space-y-4 px-2 sm:px-0">
        {filteredEntries.map((entry) => {
          const parentMood = entry.parent_mood || "happy";
          const childMood = entry.child_mood || "happy";
          const MoodIcon =
            moodIcons[parentMood as keyof typeof moodIcons]?.icon ||
            moodIcons.happy.icon;
          const ChildMoodIcon =
            moodIcons[childMood as keyof typeof moodIcons]?.icon ||
            moodIcons.happy.icon;
          const child = children.find(
            (c: any) =>
              c.child_id === entry.child_id || c.id === entry.child_id,
          );
          const childColor = child?.color_code || "#326586";

          // Helper functions for entry type styling (matching DiaryEntryListModal.tsx)
          const getEntryTypeColor = (type: string) => {
            const colors: { [key: string]: string } = {
              "free-form": "#3D4B5C",
              "daily-behavior": "#704D34",
              "emotional-tracking": "#946264",
              "intervention-tracking": "#8B4513",
              "milestone-progress": "#545454",
            };
            return colors[type] || "#326586";
          };

          const getEntryTypeLabel = (type: string) => {
            const labels: { [key: string]: string } = {
              "free-form": "Free Form",
              "daily-behavior": "Daily Behavior",
              "emotional-tracking": "Emotional Tracking",
              "intervention-tracking": "Intervention Tracking",
              "milestone-progress": "Milestone Progress",
            };
            return labels[type] || "Free Form";
          };

          const formatTime = (timestamp: string) => {
            return new Date(timestamp).toLocaleTimeString("en-MY", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });
          };

          // Generate content preview for List View based on entry type
          const getContentPreview = (entry: DiaryEntry) => {
            switch (entry.entry_type) {
              case "free-form":
                return entry.content || "No content available";

              case "daily-behavior":
                const behaviors = entry.observed_behaviors?.length
                  ? entry.observed_behaviors.join(", ")
                  : "";
                const challenges = entry.challenges_encountered?.length
                  ? entry.challenges_encountered.join(", ")
                  : "";
                const strategies = entry.strategies_used?.length
                  ? entry.strategies_used.join(", ")
                  : "";

                let preview = "";
                if (behaviors) preview += `Behaviors: ${behaviors}`;
                if (challenges)
                  preview +=
                    (preview ? " | " : "") + `Challenges: ${challenges}`;
                if (strategies)
                  preview +=
                    (preview ? " | " : "") + `Strategies: ${strategies}`;
                if (entry.effectiveness)
                  preview +=
                    (preview ? " | " : "") +
                    `Effectiveness: ${entry.effectiveness}`;

                return preview || "No behavior data recorded";

              case "emotional-tracking":
                const triggers = entry.triggers_identified?.length
                  ? entry.triggers_identified.join(", ")
                  : "";
                const coping = entry.coping_strategies?.length
                  ? entry.coping_strategies.join(", ")
                  : "";

                let emotionalPreview = "";
                if (entry.emotion_intensity)
                  emotionalPreview += `Emotion Intensity: ${entry.emotion_intensity}/10`;
                if (entry.stress_level)
                  emotionalPreview +=
                    (emotionalPreview ? " | " : "") +
                    `Stress Level: ${entry.stress_level}/10`;
                if (triggers)
                  emotionalPreview +=
                    (emotionalPreview ? " | " : "") + `Triggers: ${triggers}`;
                if (coping)
                  emotionalPreview +=
                    (emotionalPreview ? " | " : "") + `Coping: ${coping}`;

                return emotionalPreview || "No emotional data recorded";

              case "intervention-tracking":
                let interventionPreview = "";
                if (entry.situation_description)
                  interventionPreview += `Situation: ${entry.situation_description.substring(0, 50)}...`;
                if (entry.intervention_used)
                  interventionPreview +=
                    (interventionPreview ? " | " : "") +
                    `Intervention: ${entry.intervention_used.substring(0, 50)}...`;
                if (entry.effectiveness_rating)
                  interventionPreview +=
                    (interventionPreview ? " | " : "") +
                    `Rating: ${entry.effectiveness_rating}/10`;

                return interventionPreview || "No intervention data recorded";

              case "milestone-progress":
                const skills = entry.skills_observed?.length
                  ? entry.skills_observed.join(", ")
                  : "";

                let milestonePreview = "";
                if (skills) milestonePreview += `Skills: ${skills}`;
                if (entry.improvements_observed)
                  milestonePreview +=
                    (milestonePreview ? " | " : "") +
                    `Improvements: ${entry.improvements_observed.substring(0, 50)}...`;
                if (entry.next_goals)
                  milestonePreview +=
                    (milestonePreview ? " | " : "") +
                    `Next Goals: ${entry.next_goals.substring(0, 50)}...`;

                return milestonePreview || "No milestone data recorded";

              default:
                return entry.content || "No content available";
            }
          };

          return (
            <div
              key={entry.entry_id}
              className="rounded-xl p-3 sm:p-4 transition-all duration-200 hover:shadow-lg cursor-pointer"
              style={{
                backgroundColor: "#F5F5F5",
                border: "1px solid #AA855B",
                borderLeft: `4px solid ${childColor}`,
              }}
              onClick={() => handleEditEntry(entry)}
            >
              {/* Header Row: Child indicator + Title + Actions */}
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                  {/* Child Color Indicator */}
                  <div
                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0"
                    style={{ backgroundColor: childColor }}
                  >
                    {child?.name?.charAt(0) || "G"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-semibold font-['Poppins'] text-sm sm:text-base md:text-lg truncate"
                      style={{ color: "#32332D" }}
                    >
                      {entry.title || "Untitled Entry"}
                    </h3>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditEntry(entry);
                    }}
                    className="p-1.5 sm:p-2 rounded-lg transition-all duration-200 hover:bg-orange-100"
                    style={{ color: "#F2742C" }}
                    title="Edit Entry"
                  >
                    <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEntry(entry);
                    }}
                    className="p-1.5 sm:p-2 rounded-lg transition-all duration-200 hover:bg-red-100"
                    style={{ color: "#DC2626" }}
                    title="Delete Entry"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>

              {/* Subtitle Row: Child name + Entry type badge */}
              <div className="flex items-center space-x-2 mb-2 sm:mb-3 flex-wrap">
                <span
                  className="text-xs sm:text-sm font-medium"
                  style={{ color: "#32332D" }}
                >
                  {child?.name || "General"}
                </span>
                <span
                  className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-normal"
                  style={{
                    backgroundColor: getEntryTypeColor(entry.entry_type),
                    color: "#F5F5F5",
                  }}
                >
                  {getEntryTypeLabel(entry.entry_type)}
                </span>
              </div>

              {/* Content Row: Entry preview (truncated) */}
              <div className="mb-2 sm:mb-3">
                <p
                  className="text-xs sm:text-sm line-clamp-2"
                  style={{ color: "#32332D" }}
                >
                  {getContentPreview(entry)}
                </p>
              </div>

              {/* Metadata Row: Moods + Date/Time with icons */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 text-[10px] sm:text-xs mb-2 sm:mb-3">
                <div className="flex items-center space-x-3 sm:space-x-4 flex-wrap">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <User
                      className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0"
                      style={{ color: "#AA855B" }}
                    />
                    <span style={{ color: "#32332D" }}>Parent:</span>
                    <div className="flex items-center">
                      <MoodIcon
                        className="w-3 h-3 sm:w-4 sm:h-4"
                        style={{
                          color:
                            moodIcons[parentMood as keyof typeof moodIcons]
                              ?.color || "#326586",
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <Baby
                      className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0"
                      style={{ color: "#AA855B" }}
                    />
                    <span style={{ color: "#32332D" }}>Child:</span>
                    <div className="flex items-center">
                      <ChildMoodIcon
                        className="w-3 h-3 sm:w-4 sm:h-4"
                        style={{
                          color:
                            moodIcons[childMood as keyof typeof moodIcons]
                              ?.color || "#326586",
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="flex items-center space-x-1">
                    <Calendar
                      className="w-3 h-3 sm:w-4 sm:h-4"
                      style={{ color: "#AA855B" }}
                    />
                    <span style={{ color: "#AA855B" }}>
                      {new Date(entry.entry_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock
                      className="w-3 h-3 sm:w-4 sm:h-4"
                      style={{ color: "#AA855B" }}
                    />
                    <span style={{ color: "#AA855B" }}>
                      {formatTime(entry.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tags Row: Tag chips (if present) */}
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {entry.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full flex items-center space-x-1"
                      style={{ backgroundColor: "#F5F3F0", color: "#AA855B" }}
                    >
                      <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span>{formatTag(tag)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Monthly Summary handler functions
  const handleGenerateMonthlySummary = async () => {
    try {
      setIsGeneratingSummary(true);
      const childId =
        selectedChildSummary === "all"
          ? undefined
          : parseInt(selectedChildSummary);

      const summary = await generateMonthlySummary({
        child_id: childId,
        month: selectedMonthSummary,
        year: selectedYearSummary,
      });

      setCurrentGeneratedSummary(summary);
      setSelectedSummary(null);
      setMonthlySummaryViewMode("generated");

      // Note: is_read is automatically set to True when summary is generated
      // since user views it immediately, so no need to mark as read separately

      toast.success("Monthly summary generated successfully!");
    } catch (error: any) {
      console.error("Error generating monthly summary:", error);
      toast.error(error.message || "Failed to generate monthly summary");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleSaveSummary = async (insightId: number) => {
    try {
      await saveInsight(insightId);
      if (currentGeneratedSummary?.insight_id === insightId) {
        setCurrentGeneratedSummary({
          ...currentGeneratedSummary,
          is_saved: true,
        });
      }
      toast.success("Summary saved successfully!");
      loadSavedSummaries();
    } catch (error: any) {
      console.error("Error saving summary:", error);
      toast.error("Failed to save summary");
    }
  };

  const loadSavedSummaries = async () => {
    try {
      // Use saved summaries filters when in savedList mode, otherwise use generation filters
      const childId =
        monthlySummaryViewMode === "savedList"
          ? savedSummariesChildFilter === "all"
            ? undefined
            : parseInt(savedSummariesChildFilter)
          : selectedChildSummary === "all"
            ? undefined
            : parseInt(selectedChildSummary);
      const response = await getMonthlySummaries(childId, true);
      let summaries = response.summaries || [];

      // Filter by month and year on frontend (since backend doesn't support it yet)
      // Use saved summaries filters when in savedList mode
      if (monthlySummaryViewMode === "savedList") {
        if (savedSummariesMonthFilter !== null) {
          summaries = summaries.filter(
            (s: any) => s.month === savedSummariesMonthFilter,
          );
        }
        if (savedSummariesYearFilter !== null) {
          summaries = summaries.filter(
            (s: any) => s.year === savedSummariesYearFilter,
          );
        }
      } else {
        if (selectedMonthSummary) {
          summaries = summaries.filter(
            (s: any) => s.month === selectedMonthSummary,
          );
        }
        if (selectedYearSummary) {
          summaries = summaries.filter(
            (s: any) => s.year === selectedYearSummary,
          );
        }
      }

      setSavedSummaries(summaries);
    } catch (error) {
      console.error("Error loading saved summaries:", error);
    }
  };

  const handleViewSavedSummary = async (insightId: number) => {
    try {
      const summary = await getInsight(insightId);
      setSelectedSummary(summary);
      setCurrentGeneratedSummary(summary);
      setMonthlySummaryViewMode("savedDetail");

      // Mark as read
      if (!summary.is_read) {
        try {
          await markInsightAsRead(insightId);
        } catch (err) {
          console.error("Failed to mark as read:", err);
        }
      }
    } catch (error) {
      console.error("Error loading saved summary:", error);
      toast.error("Failed to load summary");
    }
  };

  const handleViewSavedSummaries = () => {
    // Remember the previous state before entering saved list
    if (
      monthlySummaryViewMode === "generated" ||
      monthlySummaryViewMode === "initial"
    ) {
      setPreviousViewMode(monthlySummaryViewMode);
    }
    // Reset saved summaries filters to defaults (show all)
    setSavedSummariesChildFilter("all");
    setSavedSummariesMonthFilter(null);
    setSavedSummariesYearFilter(null);
    setMonthlySummaryViewMode("savedList");
    loadSavedSummaries();
  };

  const handleBackFromSavedList = () => {
    // Return to the previous state (initial or generated)
    if (previousViewMode === "generated" && currentGeneratedSummary) {
      setMonthlySummaryViewMode("generated");
    } else {
      setMonthlySummaryViewMode("initial");
      setCurrentGeneratedSummary(null);
      setSelectedSummary(null);
    }
    setPreviousViewMode(null);
  };

  const handleBackFromSavedDetail = () => {
    setMonthlySummaryViewMode("savedList");
  };

  const handleRefreshMonthlySummaryFilters = () => {
    setSelectedChildSummary("all");
    setSelectedMonthSummary(new Date().getMonth() + 1);
    setSelectedYearSummary(new Date().getFullYear());
  };

  const handleRefreshSavedSummariesFilters = () => {
    setSavedSummariesChildFilter("all");
    setSavedSummariesMonthFilter(null);
    setSavedSummariesYearFilter(null);
  };

  const handleDeleteSummary = (summary: any) => {
    setSummaryToDelete(summary);
    setDeleteSummaryConfirmOpen(true);
  };

  const confirmDeleteSummary = async () => {
    if (!summaryToDelete) return;

    setDeletingSummary(true);
    try {
      await deleteInsight(summaryToDelete.insight_id);
      toast.success("Summary deleted successfully");
      loadSavedSummaries();

      // If deleted summary was currently displayed, return to saved list
      if (currentGeneratedSummary?.insight_id === summaryToDelete.insight_id) {
        setCurrentGeneratedSummary(null);
        setSelectedSummary(null);
        // If we're in savedDetail mode, go back to savedList
        if (monthlySummaryViewMode === "savedDetail") {
          setMonthlySummaryViewMode("savedList");
        }
      }
      setDeleteSummaryConfirmOpen(false);
      setSummaryToDelete(null);
    } catch (error) {
      console.error("Error deleting summary:", error);
      toast.error("Failed to delete summary");
    } finally {
      setDeletingSummary(false);
    }
  };

  const cancelDeleteSummary = () => {
    setDeleteSummaryConfirmOpen(false);
    setSummaryToDelete(null);
  };

  // Weekly Summary handler functions
  const handleGenerateWeeklySummary = async () => {
    setIsGeneratingWeeklySummary(true);
    try {
      const childId =
        selectedChildWeekly === "all"
          ? undefined
          : parseInt(selectedChildWeekly);
      const summary = await generateWeeklySummary({
        child_id: childId,
        week_start: selectedWeekStart,
        week_end: selectedWeekEnd,
      });
      setCurrentGeneratedWeeklySummary(summary);
      setWeeklySummaryViewMode("generated");
      toast.success("Weekly summary generated successfully");
    } catch (error: any) {
      console.error("Error generating weekly summary:", error);
      toast.error(error.message || "Failed to generate weekly summary");
    } finally {
      setIsGeneratingWeeklySummary(false);
    }
  };

  const handleSaveWeeklySummary = async (insightId: number) => {
    try {
      await saveInsight(insightId);
      setCurrentGeneratedWeeklySummary((prev: any) =>
        prev ? { ...prev, is_saved: true } : null,
      );
      toast.success("Weekly summary saved successfully");
      loadSavedWeeklySummaries();
    } catch (error) {
      console.error("Error saving weekly summary:", error);
      toast.error("Failed to save weekly summary");
    }
  };

  const loadSavedWeeklySummaries = async () => {
    try {
      // Use saved weekly summaries filters when in savedList mode, otherwise use generation filters
      const childId =
        weeklySummaryViewMode === "savedList"
          ? savedWeeklySummariesChildFilter === "all"
            ? undefined
            : parseInt(savedWeeklySummariesChildFilter)
          : selectedChildWeekly === "all"
            ? undefined
            : parseInt(selectedChildWeekly);
      const response = await getWeeklySummaries(childId, true);
      let summaries = response.summaries || [];

      // Filter by week date range on frontend if needed
      // Use saved weekly summaries filters when in savedList mode
      if (weeklySummaryViewMode === "savedList") {
        if (
          savedWeeklySummariesWeekStartFilter &&
          savedWeeklySummariesWeekEndFilter
        ) {
          summaries = summaries.filter((s: any) => {
            if (!s.period_start || !s.period_end) return false;
            const start = new Date(s.period_start);
            const end = new Date(s.period_end);
            const selectedStart = new Date(savedWeeklySummariesWeekStartFilter);
            const selectedEnd = new Date(savedWeeklySummariesWeekEndFilter);
            return start >= selectedStart && end <= selectedEnd;
          });
        }
      } else {
        if (selectedWeekStart && selectedWeekEnd) {
          summaries = summaries.filter((s: any) => {
            if (!s.period_start || !s.period_end) return false;
            const start = new Date(s.period_start);
            const end = new Date(s.period_end);
            const selectedStart = new Date(selectedWeekStart);
            const selectedEnd = new Date(selectedWeekEnd);
            return start >= selectedStart && end <= selectedEnd;
          });
        }
      }

      setSavedWeeklySummaries(summaries);
    } catch (error) {
      console.error("Error loading saved weekly summaries:", error);
    }
  };

  const handleViewSavedWeeklySummary = async (insightId: number) => {
    try {
      const summary = await getInsight(insightId);
      setSelectedWeeklySummary(summary);
      setCurrentGeneratedWeeklySummary(summary);
      setWeeklySummaryViewMode("savedDetail");
    } catch (error) {
      console.error("Error viewing saved weekly summary:", error);
      toast.error("Failed to load weekly summary");
    }
  };

  const handleViewSavedWeeklySummaries = () => {
    // Only store 'initial' or 'generated' as previous state
    if (
      weeklySummaryViewMode === "initial" ||
      weeklySummaryViewMode === "generated"
    ) {
      setPreviousWeeklyViewMode(weeklySummaryViewMode);
    }
    // Reset saved weekly summaries filters to defaults (show all)
    setSavedWeeklySummariesChildFilter("all");
    setSavedWeeklySummariesWeekStartFilter(null);
    setSavedWeeklySummariesWeekEndFilter(null);
    setWeeklySummaryViewMode("savedList");
    loadSavedWeeklySummaries();
  };

  const handleBackFromSavedWeeklyList = () => {
    if (
      previousWeeklyViewMode === "generated" &&
      currentGeneratedWeeklySummary
    ) {
      setWeeklySummaryViewMode("generated");
    } else {
      setWeeklySummaryViewMode("initial");
      setCurrentGeneratedWeeklySummary(null);
      setSelectedWeeklySummary(null);
    }
    setPreviousWeeklyViewMode(null);
  };

  const handleBackFromSavedWeeklyDetail = () => {
    setWeeklySummaryViewMode("savedList");
  };

  const handleRefreshWeeklyFilters = () => {
    setSelectedChildWeekly("all");
    // Reset to current week (Monday to Sunday)
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Days to subtract to get to Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const startDate = monday.toISOString().split("T")[0];
    setSelectedWeekStart(startDate);
    // Week end will be automatically calculated by useEffect
  };

  const handleRefreshSavedWeeklySummariesFilters = () => {
    setSavedWeeklySummariesChildFilter("all");
    setSavedWeeklySummariesWeekStartFilter(null);
    setSavedWeeklySummariesWeekEndFilter(null);
  };

  const handleDeleteWeeklySummary = (summary: any) => {
    setWeeklySummaryToDelete(summary);
    setDeleteWeeklySummaryConfirmOpen(true);
  };

  const confirmDeleteWeeklySummary = async () => {
    if (!weeklySummaryToDelete) return;

    setDeletingWeeklySummary(true);
    try {
      await deleteInsight(weeklySummaryToDelete.insight_id);
      toast.success("Weekly summary deleted successfully");
      loadSavedWeeklySummaries();

      if (
        currentGeneratedWeeklySummary?.insight_id ===
        weeklySummaryToDelete.insight_id
      ) {
        setCurrentGeneratedWeeklySummary(null);
        setSelectedWeeklySummary(null);
        if (weeklySummaryViewMode === "savedDetail") {
          setWeeklySummaryViewMode("savedList");
        }
      }
      setDeleteWeeklySummaryConfirmOpen(false);
      setWeeklySummaryToDelete(null);
    } catch (error) {
      console.error("Error deleting weekly summary:", error);
      toast.error("Failed to delete weekly summary");
    } finally {
      setDeletingWeeklySummary(false);
    }
  };

  const cancelDeleteWeeklySummary = () => {
    setDeleteWeeklySummaryConfirmOpen(false);
    setWeeklySummaryToDelete(null);
  };

  // Load saved summaries when component mounts or when child filter changes (for generation view)
  useEffect(() => {
    if (viewMode === "insights" && monthlySummaryViewMode !== "savedList") {
      loadSavedSummaries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewMode,
    selectedChildSummary,
    selectedMonthSummary,
    selectedYearSummary,
  ]);

  // Reset view mode to 'initial' if in 'generated' mode but no summary exists
  useEffect(() => {
    if (monthlySummaryViewMode === "generated" && !currentGeneratedSummary) {
      setMonthlySummaryViewMode("initial");
    }
  }, [monthlySummaryViewMode, currentGeneratedSummary]);

  // Reload saved summaries when saved filter selectors change in savedList mode
  useEffect(() => {
    if (monthlySummaryViewMode === "savedList") {
      loadSavedSummaries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    monthlySummaryViewMode,
    savedSummariesChildFilter,
    savedSummariesMonthFilter,
    savedSummariesYearFilter,
  ]);

  // Weekly Summary useEffect hooks
  useEffect(() => {
    if (viewMode === "insights" && weeklySummaryViewMode !== "savedList") {
      loadSavedWeeklySummaries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedChildWeekly, selectedWeekStart, selectedWeekEnd]);

  useEffect(() => {
    if (
      weeklySummaryViewMode === "generated" &&
      !currentGeneratedWeeklySummary
    ) {
      setWeeklySummaryViewMode("initial");
    }
  }, [weeklySummaryViewMode, currentGeneratedWeeklySummary]);

  // Reload saved weekly summaries when saved filter selectors change in savedList mode
  useEffect(() => {
    if (weeklySummaryViewMode === "savedList") {
      loadSavedWeeklySummaries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    weeklySummaryViewMode,
    savedWeeklySummariesChildFilter,
    savedWeeklySummariesWeekStartFilter,
    savedWeeklySummariesWeekEndFilter,
  ]);

  // Automatically calculate week end when week start changes (for generation filters)
  useEffect(() => {
    if (selectedWeekStart) {
      const start = new Date(selectedWeekStart);
      const end = new Date(start);
      end.setDate(end.getDate() + 6); // 7 days total (including start day)
      const endDateStr = end.toISOString().split("T")[0];
      // Only update if different to avoid infinite loops
      if (selectedWeekEnd !== endDateStr) {
        setSelectedWeekEnd(endDateStr);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeekStart]);

  // Automatically calculate week end when saved week start changes (for saved summaries filters)
  useEffect(() => {
    if (savedWeeklySummariesWeekStartFilter) {
      const start = new Date(savedWeeklySummariesWeekStartFilter);
      const end = new Date(start);
      end.setDate(end.getDate() + 6); // 7 days total (including start day)
      const endDateStr = end.toISOString().split("T")[0];
      // Only update if different to avoid infinite loops
      if (savedWeeklySummariesWeekEndFilter !== endDateStr) {
        setSavedWeeklySummariesWeekEndFilter(endDateStr);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedWeeklySummariesWeekStartFilter]);

  /* Insights View */
  const renderInsightsView = () => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const displaySummary = currentGeneratedSummary || selectedSummary;
    const childName = displaySummary?.child_id
      ? children.find(
          (c) =>
            c.child_id === displaySummary.child_id ||
            c.id === displaySummary.child_id,
        )?.name || "Child"
      : "All Children";

    // Filter entries for Insights View based on Child and Date Range filters
    const filteredInsightsEntries = diaryEntries.filter((entry) => {
      // Child filtering
      const matchesChild =
        selectedChildFilter === "all" ||
        entry.child_id?.toString() === selectedChildFilter;

      // Date range filtering
      const matchesDateRange = (() => {
        if (selectedDateRange === "all") return true;

        const entryDate = new Date(entry.entry_date);
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        switch (selectedDateRange) {
          case "today":
            return entryDate.toDateString() === today.toDateString();
          case "this-week":
            return entryDate >= startOfWeek;
          case "this-month":
            return entryDate >= startOfMonth;
          case "last-week":
            const lastWeekStart = new Date(startOfWeek);
            lastWeekStart.setDate(startOfWeek.getDate() - 7);
            return entryDate >= lastWeekStart && entryDate < startOfWeek;
          case "last-month":
            const lastMonth = new Date(
              today.getFullYear(),
              today.getMonth() - 1,
              1,
            );
            const thisMonth = new Date(
              today.getFullYear(),
              today.getMonth(),
              1,
            );
            return entryDate >= lastMonth && entryDate < thisMonth;
          default:
            return true;
        }
      })();

      return matchesChild && matchesDateRange;
    });

    return (
      <div className="space-y-6">
        {/* CSS to hide native browser calendar icons */}
        <style>{`
        input[type="month"]::-webkit-calendar-picker-indicator,
        input[type="date"]::-webkit-calendar-picker-indicator {
          opacity: 0;
          position: absolute;
          right: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }
        input[type="month"]::-webkit-inner-spin-button,
        input[type="date"]::-webkit-inner-spin-button {
          display: none;
        }
      `}</style>
        {/* Mood Trends */}
        <div
          className="rounded-lg border p-3 sm:p-4 md:p-6"
          style={{ backgroundColor: "#F5EFED", borderColor: "#AA855B" }}
        >
          <h3
            className="text-base sm:text-lg font-semibold mb-3 sm:mb-4"
            style={{ color: "#32332D" }}
          >
            Mood Trends
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            {Object.entries(moodIcons).map(([mood, config]) => {
              const Icon = config.icon;
              const count = filteredInsightsEntries.filter(
                (e) => e.parent_mood === mood || e.child_mood === mood,
              ).length;
              const percentage =
                filteredInsightsEntries.length > 0
                  ? Math.round((count / filteredInsightsEntries.length) * 100)
                  : 0;

              return (
                <div
                  key={mood}
                  className="flex flex-col items-center space-y-1.5 sm:space-y-2 p-2 sm:p-3 rounded-lg"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E5E5E5",
                  }}
                >
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <div
                      className="p-1.5 sm:p-2 rounded-full"
                      style={{ backgroundColor: config.bg }}
                    >
                      <Icon
                        className="w-3 h-3 sm:w-4 sm:h-4"
                        style={{ color: config.color }}
                      />
                    </div>
                    <span
                      className="text-xs sm:text-sm font-medium capitalize"
                      style={{ color: "#32332D" }}
                    >
                      {mood}
                    </span>
                  </div>
                  <div className="w-full flex flex-col items-center space-y-1">
                    <div
                      className="w-full rounded-full h-1.5 sm:h-2"
                      style={{ backgroundColor: "#F5F3F0" }}
                    >
                      <div
                        className="h-1.5 sm:h-2 rounded-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: config.color,
                        }}
                      />
                    </div>
                    <span
                      className="text-xs sm:text-sm font-semibold"
                      style={{ color: "#AA855B" }}
                    >
                      {percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Summary Section */}
        <div
          className="rounded-lg border p-3 sm:p-4 md:p-6"
          style={{ backgroundColor: "#F5EFED", borderColor: "#AA855B" }}
        >
          <h3
            className="text-base sm:text-lg font-semibold mb-3 sm:mb-4"
            style={{ color: "#32332D" }}
          >
            Monthly Summary
          </h3>

          {/* Control Panel - Conditionally rendered based on view mode */}
          {monthlySummaryViewMode !== "savedDetail" ? (
            <div className="mb-3 sm:mb-4 space-y-3 sm:space-y-4">
              {/* Generation Filters - Only show when NOT in savedList mode */}
              {monthlySummaryViewMode !== "savedList" && (
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 w-full">
                  {/* Left side: Filters group */}
                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1.5 sm:space-y-0 sm:space-x-2">
                      <label
                        className="text-xs sm:text-sm font-medium"
                        style={{ color: "#32332D" }}
                      >
                        Child:
                      </label>
                      <div className="relative">
                        <select
                          value={selectedChildSummary}
                          onChange={(e) =>
                            setSelectedChildSummary(e.target.value)
                          }
                          onFocus={() => setFocusedSelect("child")}
                          onBlur={() => setFocusedSelect(null)}
                          className="w-full sm:w-auto px-2.5 sm:px-3 py-1.5 sm:py-2 pr-8 rounded-lg border text-xs sm:text-sm appearance-none"
                          style={{
                            borderColor: "#AA855B",
                            backgroundColor: "#F5F5F5",
                            color: "#32332D",
                          }}
                        >
                          <option value="all">All Children</option>
                          {children.map((child: any) => (
                            <option
                              key={child.child_id || child.id}
                              value={String(child.child_id || child.id)}
                            >
                              {child.name}
                            </option>
                          ))}
                        </select>
                        {focusedSelect === "child" ? (
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

                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1.5 sm:space-y-0 sm:space-x-2">
                      <label
                        className="text-xs sm:text-sm font-medium"
                        style={{ color: "#32332D" }}
                      >
                        Month & Year:
                      </label>
                      <div className="relative">
                        <input
                          ref={monthYearPickerRef}
                          type="month"
                          value={`${selectedYearSummary}-${String(selectedMonthSummary).padStart(2, "0")}`}
                          onChange={(e) => {
                            const [year, month] = e.target.value
                              .split("-")
                              .map(Number);
                            setSelectedYearSummary(year);
                            setSelectedMonthSummary(month);
                          }}
                          onMouseDown={(e) => {
                            // Use showPicker() on mousedown (before React's synthetic event handling)
                            if (
                              monthYearPickerRef.current &&
                              "showPicker" in monthYearPickerRef.current
                            ) {
                              e.preventDefault();
                              (monthYearPickerRef.current as any).showPicker();
                            }
                          }}
                          className="w-full sm:w-auto px-2.5 sm:px-3 py-1.5 sm:py-2 pr-8 rounded-lg border text-xs sm:text-sm cursor-pointer"
                          style={{
                            borderColor: "#AA855B",
                            backgroundColor: "#F5F5F5",
                            color: "#32332D",
                            cursor: "pointer",
                            userSelect: "none",
                            // Hide native browser calendar icon
                            WebkitAppearance: "none",
                            MozAppearance: "textfield",
                          }}
                          onFocus={(e) => {
                            // Hide native calendar icon on focus
                            e.target.style.setProperty(
                              "--webkit-calendar-picker-indicator",
                              "none",
                            );
                          }}
                          min="2020-01"
                          max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`}
                        />
                        {/* Calendar icon positioned to match week picker style */}
                        <div
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                          style={{ zIndex: 2 }}
                        >
                          <Calendar
                            className="w-3.5 h-3.5"
                            style={{ color: "#AA855B" }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Refresh Filters Button */}
                    <button
                      onClick={handleRefreshMonthlySummaryFilters}
                      className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200 flex items-center justify-center"
                      style={{
                        backgroundColor: "#AA855B",
                        color: "#F5F5F5",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#8B6F4A";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#AA855B";
                      }}
                      title="Reset filters to default"
                    >
                      <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>

                  {/* Right side: Generate Monthly Summary button - hidden in savedList mode */}
                  {/* 
                    Button is disabled when no diary entries exist, as summaries require data to analyze.
                    Tooltip explains why button is disabled when hovering over it.
                  */}
                  {(monthlySummaryViewMode === "initial" ||
                    monthlySummaryViewMode === "generated") && (
                    <Tooltip
                      title={
                        diaryEntries.length === 0
                          ? "Add diary entries to generate summaries"
                          : ""
                      }
                      arrow
                      placement="top"
                    >
                      <span className="w-full sm:w-auto inline-block">
                        <button
                          onClick={handleGenerateMonthlySummary}
                          disabled={isGeneratingSummary || diaryEntries.length === 0}
                          className="w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm flex items-center justify-center sm:justify-start space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: isGeneratingSummary || diaryEntries.length === 0
                              ? "#AA855B"
                              : "#F2742C",
                            color: "#F5F5F5",
                          }}
                          onMouseEnter={(e) => {
                            if (!isGeneratingSummary && diaryEntries.length > 0) {
                              e.currentTarget.style.backgroundColor = "#E55A1F";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isGeneratingSummary && diaryEntries.length > 0) {
                              e.currentTarget.style.backgroundColor = "#F2742C";
                            }
                          }}
                        >
                          {isGeneratingSummary ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span>Generate Monthly Summary</span>
                            </>
                          )}
                        </button>
                      </span>
                    </Tooltip>
                  )}
                </div>
              )}

              {/* View Saved Summaries button - Only show when NOT in savedList mode */}
              {monthlySummaryViewMode !== "savedList" && (
                <div className="flex items-center">
                  <button
                    onClick={handleViewSavedSummaries}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm flex items-center justify-center sm:justify-start space-x-2"
                    style={{
                      backgroundColor: "#AA855B",
                      color: "#F5F5F5",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#8B6F4A";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#AA855B";
                    }}
                  >
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>
                      View Saved Summaries{" "}
                      {savedSummaries.length > 0 &&
                        `(${savedSummaries.length})`}
                    </span>
                  </button>
                </div>
              )}

              {/* Back button row - Only show when in savedList mode */}
              {monthlySummaryViewMode === "savedList" && (
                <div className="flex items-center">
                  <button
                    onClick={handleBackFromSavedList}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm flex items-center justify-center sm:justify-start space-x-2"
                    style={{
                      backgroundColor: "#AA855B",
                      color: "#F5F5F5",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#8B6F4A";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#AA855B";
                    }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>
                      Back to{" "}
                      {previousViewMode === "generated"
                        ? "Generated Summary"
                        : "Summary"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Control Panel for savedDetail - only show back button */
            <div className="mb-3 sm:mb-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleBackFromSavedDetail}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm flex items-center justify-center sm:justify-start space-x-2"
                  style={{
                    backgroundColor: "#AA855B",
                    color: "#F5F5F5",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#8B6F4A";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#AA855B";
                  }}
                >
                  <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Back to Saved Summaries</span>
                </button>
              </div>
            </div>
          )}

          {/* Content Area - State-based conditional rendering */}
          {monthlySummaryViewMode === "savedList" ? (
            /* Saved Summaries List */
            <div className="space-y-4">
              <h4
                className="font-medium text-sm sm:text-base"
                style={{ color: "#32332D" }}
              >
                Saved Monthly Summaries
              </h4>

              {/* Saved Summaries Filters - Only show in savedList mode */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1.5 sm:space-y-0 sm:space-x-2">
                  <label
                    className="text-xs sm:text-sm font-medium"
                    style={{ color: "#32332D" }}
                  >
                    Child:
                  </label>
                  <div className="relative">
                    <select
                      value={savedSummariesChildFilter}
                      onChange={(e) =>
                        setSavedSummariesChildFilter(e.target.value)
                      }
                      onFocus={() => setFocusedSelectSavedSummaries("child")}
                      onBlur={() => setFocusedSelectSavedSummaries(null)}
                      className="w-full sm:w-auto px-2.5 sm:px-3 py-1.5 sm:py-2 pr-8 rounded-lg border text-xs sm:text-sm appearance-none"
                      style={{
                        borderColor: "#AA855B",
                        backgroundColor: "#F5F5F5",
                        color: "#32332D",
                      }}
                    >
                      <option value="all">All Children</option>
                      {children.map((child: any) => (
                        <option
                          key={child.child_id || child.id}
                          value={String(child.child_id || child.id)}
                        >
                          {child.name}
                        </option>
                      ))}
                    </select>
                    {focusedSelectSavedSummaries === "child" ? (
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

                <div className="flex flex-col sm:flex-row sm:items-center space-y-1.5 sm:space-y-0 sm:space-x-2">
                  <label
                    className="text-xs sm:text-sm font-medium"
                    style={{ color: "#32332D" }}
                  >
                    Month & Year:
                  </label>
                  <div className="relative">
                    <input
                      ref={savedMonthYearPickerRef}
                      type="month"
                      value={
                        savedSummariesMonthFilter !== null &&
                        savedSummariesYearFilter !== null
                          ? `${savedSummariesYearFilter}-${String(savedSummariesMonthFilter).padStart(2, "0")}`
                          : ""
                      }
                      onChange={(e) => {
                        if (e.target.value) {
                          const [year, month] = e.target.value
                            .split("-")
                            .map(Number);
                          setSavedSummariesYearFilter(year);
                          setSavedSummariesMonthFilter(month);
                        } else {
                          setSavedSummariesYearFilter(null);
                          setSavedSummariesMonthFilter(null);
                        }
                      }}
                      className="px-3 py-2 pr-8 rounded-lg border text-sm cursor-pointer"
                      style={{
                        borderColor: "#AA855B",
                        backgroundColor: "#F5F5F5",
                        color: "#32332D",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                      onMouseDown={(e) => {
                        if (
                          savedMonthYearPickerRef.current &&
                          "showPicker" in savedMonthYearPickerRef.current
                        ) {
                          e.preventDefault();
                          (savedMonthYearPickerRef.current as any).showPicker();
                        }
                      }}
                      min="2020-01"
                      max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`}
                      placeholder="All months"
                    />
                    {/* Calendar icon positioned to match week picker style */}
                    <div
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                      style={{ zIndex: 2 }}
                    >
                      <Calendar
                        className="w-3.5 h-3.5"
                        style={{ color: "#AA855B" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Refresh Filters Button */}
                <button
                  onClick={handleRefreshSavedSummariesFilters}
                  className="px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-center"
                  style={{
                    backgroundColor: "#AA855B",
                    color: "#F5F5F5",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#8B6F4A";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#AA855B";
                  }}
                  title="Reset filters to show all"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {savedSummaries.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm" style={{ color: "#AA855B" }}>
                    No saved summaries yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedSummaries.map((summary: any) => {
                    const monthName = summary.month
                      ? monthNames[summary.month - 1]
                      : "";
                    const summaryChildObj = summary.child_id
                      ? children.find(
                          (c: any) =>
                            c.child_id === summary.child_id ||
                            c.id === summary.child_id,
                        )
                      : null;
                    const summaryChildName =
                      summaryChildObj?.name || "All Children";
                    const childColor = summaryChildObj?.color_code || "#8B8B8B"; // Neutral color for "All Children"

                    // Title: "Monthly Summary - October 2025"
                    const displayTitle = `Monthly Summary - ${monthName} ${summary.year}`;

                    return (
                      <div
                        key={summary.insight_id}
                        className="rounded-xl p-2.5 sm:p-3 md:p-4 transition-all duration-200 hover:shadow-lg"
                        style={{
                          backgroundColor: "#F5F5F5",
                          border: "1px solid #AA855B",
                          borderLeft: `4px solid ${childColor}`,
                        }}
                      >
                        {/* Header Row: Child indicator + Title + Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 sm:mb-3 gap-2 sm:gap-0">
                          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                            {/* Child Color Indicator */}
                            <div
                              className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-white font-semibold text-[10px] sm:text-xs md:text-sm flex-shrink-0"
                              style={{ backgroundColor: childColor }}
                            >
                              {summary.child_id
                                ? summaryChildObj?.name?.charAt(0) || "G"
                                : "ALL"}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3
                                className="font-semibold font-['Poppins'] text-sm sm:text-base md:text-lg break-words"
                                style={{ color: "#32332D" }}
                              >
                                {displayTitle}
                              </h3>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
                            <button
                              onClick={() =>
                                handleViewSavedSummary(summary.insight_id)
                              }
                              className="px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-lg text-[10px] sm:text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap"
                              style={{
                                backgroundColor: "#0F5648",
                                color: "#F5F5F5",
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
                              View Summary
                            </button>
                            <button
                              onClick={() => handleDeleteSummary(summary)}
                              className="p-1 sm:p-1.5 md:p-2 rounded-lg transition-all duration-200 hover:bg-red-100 flex-shrink-0"
                              style={{ color: "#DC2626" }}
                              title="Delete Summary"
                            >
                              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Subtitle Row: Child name + Monthly Summary badge + Date + Saved time */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
                          <div className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-2 flex-wrap">
                            <span
                              className="text-[10px] sm:text-xs md:text-sm font-medium"
                              style={{ color: "#32332D" }}
                            >
                              {summaryChildName}
                            </span>
                            <span
                              className="px-1 sm:px-1.5 md:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] md:text-xs font-normal"
                              style={{
                                backgroundColor: "#0F5648",
                                color: "#F5F5F5",
                              }}
                            >
                              Monthly Summary
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-wrap">
                            <div className="flex items-center space-x-0.5 sm:space-x-1">
                              <Calendar
                                className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0"
                                style={{ color: "#AA855B" }}
                              />
                              <span
                                className="text-[9px] sm:text-[10px] md:text-xs"
                                style={{ color: "#AA855B" }}
                              >
                                {monthName} {summary.year}
                              </span>
                            </div>
                            <div className="flex items-center space-x-0.5 sm:space-x-1">
                              <Clock
                                className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0"
                                style={{ color: "#AA855B" }}
                              />
                              <span
                                className="text-[9px] sm:text-[10px] md:text-xs"
                                style={{ color: "#AA855B" }}
                              >
                                Saved:{" "}
                                {summary.saved_at
                                  ? getTimeAgo(summary.saved_at)
                                  : "Unknown"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (monthlySummaryViewMode === "generated" ||
              monthlySummaryViewMode === "savedDetail") &&
            displaySummary ? (
            /* Generated Summary Display */
            <div className="space-y-6">
              {/* Title & Metadata */}
              <div>
                <h4
                  className="text-xl font-semibold mb-2"
                  style={{ color: "#32332D" }}
                >
                  {displaySummary.title}
                </h4>
                <div
                  className="flex items-center space-x-4 text-sm"
                  style={{ color: "#AA855B" }}
                >
                  <span>For: {childName}</span>
                  {displaySummary.created_at && (
                    <span>
                      Generated: {getTimeAgo(displaySummary.created_at)}
                    </span>
                  )}
                  {displaySummary.diary_entries_count && (
                    <span>
                      {displaySummary.diary_entries_count} entries analyzed
                    </span>
                  )}
                </div>
              </div>

              {/* Structured Cards */}
              {displaySummary.summary_data && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Achievements Card */}
                  {displaySummary.summary_data.achievements &&
                    displaySummary.summary_data.achievements.length > 0 && (
                      <div
                        className="p-4 rounded-lg border"
                        style={{
                          backgroundColor: "#F5F5F5",
                          borderColor: "#AA855B",
                        }}
                      >
                        <h5
                          className="font-semibold mb-3 flex items-center space-x-2"
                          style={{ color: "#32332D" }}
                        >
                          <Award
                            className="w-5 h-5"
                            style={{ color: "#0F5648" }}
                          />
                          <span>Achievements</span>
                        </h5>
                        <ul className="space-y-2">
                          {displaySummary.summary_data.achievements
                            .slice(0, 3)
                            .map((ach: string, idx: number) => (
                              <li
                                key={idx}
                                className="text-sm flex items-start space-x-2"
                                style={{ color: "#32332D" }}
                              >
                                <span style={{ color: "#0F5648" }}>•</span>
                                <span>{ach}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                  {/* Progress Card */}
                  {displaySummary.summary_data.progress && (
                    <div
                      className="p-4 rounded-lg border"
                      style={{
                        backgroundColor: "#F5F5F5",
                        borderColor: "#AA855B",
                      }}
                    >
                      <h5
                        className="font-semibold mb-3 flex items-center space-x-2"
                        style={{ color: "#32332D" }}
                      >
                        <TrendingUp
                          className="w-5 h-5"
                          style={{ color: "#F2742C" }}
                        />
                        <span>Progress</span>
                      </h5>
                      <div
                        className="space-y-2 text-sm"
                        style={{ color: "#32332D" }}
                      >
                        {displaySummary.summary_data.progress
                          .mood_improvement && <div>Mood ↑</div>}
                        {displaySummary.summary_data.progress
                          .skill_development && <div>Skills ↑</div>}
                        {displaySummary.summary_data.progress
                          .behavior_changes && <div>Behavior ↑</div>}
                      </div>
                    </div>
                  )}

                  {/* Challenges Card */}
                  {displaySummary.summary_data.challenges &&
                    displaySummary.summary_data.challenges.length > 0 && (
                      <div
                        className="p-4 rounded-lg border"
                        style={{
                          backgroundColor: "#F5F5F5",
                          borderColor: "#AA855B",
                        }}
                      >
                        <h5
                          className="font-semibold mb-3 flex items-center space-x-2"
                          style={{ color: "#32332D" }}
                        >
                          <AlertTriangle
                            className="w-5 h-5"
                            style={{ color: "#722F37" }}
                          />
                          <span>Challenges</span>
                        </h5>
                        <ul className="space-y-2">
                          {displaySummary.summary_data.challenges
                            .slice(0, 3)
                            .map((challenge: string, idx: number) => (
                              <li
                                key={idx}
                                className="text-sm flex items-start space-x-2"
                                style={{ color: "#32332D" }}
                              >
                                <span style={{ color: "#722F37" }}>•</span>
                                <span>{challenge}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}

              {/* Narrative Content */}
              <div
                className="p-4 rounded-lg border"
                style={{ backgroundColor: "#F5F5F5", borderColor: "#AA855B" }}
              >
                <div className="prose max-w-none">
                  {displaySummary.content
                    .split("\n")
                    .map((paragraph: string, idx: number) => {
                      if (!paragraph.trim()) return null;
                      if (paragraph.trim().endsWith(":")) {
                        return (
                          <h5
                            key={idx}
                            className="font-semibold mt-4 mb-2"
                            style={{ color: "#32332D" }}
                          >
                            {paragraph.trim()}
                          </h5>
                        );
                      }
                      if (paragraph.trim().startsWith("-")) {
                        return (
                          <p
                            key={idx}
                            className="text-sm ml-4 mb-1"
                            style={{ color: "#32332D" }}
                          >
                            {paragraph.trim()}
                          </p>
                        );
                      }
                      return (
                        <p
                          key={idx}
                          className="text-sm mb-3 leading-relaxed"
                          style={{ color: "#32332D" }}
                        >
                          {paragraph.trim()}
                        </p>
                      );
                    })}
                </div>
              </div>

              {/* Statistics */}
              {displaySummary.summary_data?.statistics && (
                <div
                  className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-0 sm:space-x-4 text-[10px] sm:text-xs md:text-sm"
                  style={{ color: "#AA855B" }}
                >
                  <span>
                    Total entries:{" "}
                    {displaySummary.summary_data.statistics.total_entries || 0}
                  </span>
                  {displaySummary.summary_data.statistics.average_mood && (
                    <>
                      <span className="hidden sm:inline">|</span>
                      <span>
                        Average Mood:{" "}
                        {displaySummary.summary_data.statistics.average_mood}
                      </span>
                    </>
                  )}
                  {displaySummary.summary_data.statistics.most_common_tags &&
                    displaySummary.summary_data.statistics.most_common_tags
                      .length > 0 && (
                      <>
                        <span className="hidden sm:inline">|</span>
                        <span className="break-words">
                          Most common tags:{" "}
                          {displaySummary.summary_data.statistics.most_common_tags.join(
                            ", ",
                          )}
                        </span>
                      </>
                    )}
                </div>
              )}

              {/* Action Buttons - Conditional based on view mode */}
              {monthlySummaryViewMode === "generated" ? (
                /* Generated state: Show Save Summary + Regenerate buttons */
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  {!displaySummary.is_saved && (
                    <button
                      onClick={() =>
                        handleSaveSummary(displaySummary.insight_id)
                      }
                      className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm flex items-center justify-center sm:justify-start space-x-2"
                      style={{
                        backgroundColor: "#0F5648",
                        color: "#F5F5F5",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#0A4538";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#0F5648";
                      }}
                    >
                      <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Save Summary</span>
                    </button>
                  )}
                  {displaySummary.is_saved && (
                    <span
                      className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium"
                      style={{ backgroundColor: "#E8F5E8", color: "#0F5648" }}
                    >
                      ✓ Saved
                    </span>
                  )}
                  {/* Only show Regenerate button for newly generated (unsaved) summaries */}
                  {/* 
                    Regenerate button is disabled when no diary entries exist.
                    This prevents regenerating summaries when all entries have been deleted.
                    Tooltip explains why button is disabled when hovering over it.
                  */}
                  {!displaySummary.is_saved && (
                    <Tooltip
                      title={
                        diaryEntries.length === 0
                          ? "Add diary entries to generate summaries"
                          : ""
                      }
                      arrow
                      placement="top"
                    >
                      <span className="inline-block">
                        <button
                          onClick={handleGenerateMonthlySummary}
                          disabled={isGeneratingSummary || diaryEntries.length === 0}
                          className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm flex items-center justify-center sm:justify-start space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: "#AA855B",
                            color: "#F5F5F5",
                          }}
                          onMouseEnter={(e) => {
                            if (!isGeneratingSummary && diaryEntries.length > 0) {
                              e.currentTarget.style.backgroundColor = "#8B6F4A";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isGeneratingSummary && diaryEntries.length > 0) {
                              e.currentTarget.style.backgroundColor = "#AA855B";
                            }
                          }}
                        >
                          <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>Regenerate</span>
                        </button>
                      </span>
                    </Tooltip>
                  )}
                </div>
              ) : monthlySummaryViewMode === "savedDetail" ? (
                /* Saved Detail state: Only show ✓ Saved badge */
                <div className="flex items-center space-x-3">
                  <span
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium"
                    style={{ backgroundColor: "#E8F5E8", color: "#0F5648" }}
                  >
                    ✓ Saved
                  </span>
                </div>
              ) : null}
            </div>
          ) : monthlySummaryViewMode === "initial" ? (
            /* Empty State */
            <div className="text-center py-12">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "#F5F3F0" }}
              >
                <Brain className="w-8 h-8" style={{ color: "#AA855B" }} />
              </div>
              <h4 className="font-medium mb-2" style={{ color: "#32332D" }}>
                No Summary Generated
              </h4>
              <p className="text-sm" style={{ color: "#AA855B" }}>
                Click "Generate Monthly Summary" to create an AI-powered summary
                of your diary entries
              </p>
            </div>
          ) : null}
        </div>

        {/* Weekly Reflection Summary Section */}
        <div
          className="rounded-lg border p-3 sm:p-4 md:p-6"
          style={{ backgroundColor: "#F5EFED", borderColor: "#AA855B" }}
        >
          <h3
            className="text-base sm:text-lg font-semibold mb-3 sm:mb-4"
            style={{ color: "#32332D" }}
          >
            Weekly Reflection Summary
          </h3>

          {/* Control Panel - Conditionally rendered based on view mode */}
          {weeklySummaryViewMode !== "savedDetail" ? (
            <div className="mb-3 sm:mb-4 space-y-3 sm:space-y-4">
              {/* Generation Filters - Only show when NOT in savedList mode */}
              {weeklySummaryViewMode !== "savedList" && (
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 w-full">
                  {/* Left side: Filters group */}
                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1.5 sm:space-y-0 sm:space-x-2">
                      <label
                        className="text-xs sm:text-sm font-medium"
                        style={{ color: "#32332D" }}
                      >
                        Child:
                      </label>
                      <div className="relative">
                        <select
                          value={selectedChildWeekly}
                          onChange={(e) =>
                            setSelectedChildWeekly(e.target.value)
                          }
                          onFocus={() => setFocusedSelectWeekly("child")}
                          onBlur={() => setFocusedSelectWeekly(null)}
                          className="w-full sm:w-auto px-2.5 sm:px-3 py-1.5 sm:py-2 pr-8 rounded-lg border text-xs sm:text-sm appearance-none"
                          style={{
                            borderColor: "#AA855B",
                            backgroundColor: "#F5F5F5",
                            color: "#32332D",
                          }}
                        >
                          <option value="all">All Children</option>
                          {children.map((child: any) => (
                            <option
                              key={child.child_id || child.id}
                              value={String(child.child_id || child.id)}
                            >
                              {child.name}
                            </option>
                          ))}
                        </select>
                        {focusedSelectWeekly === "child" ? (
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

                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1.5 sm:space-y-0 sm:space-x-2">
                      <label
                        className="text-xs sm:text-sm font-medium"
                        style={{ color: "#32332D" }}
                      >
                        Week:
                      </label>
                      <div className="relative inline-block w-full sm:w-auto">
                        {/* Hidden date input for the actual picker - positioned to cover the display */}
                        <input
                          ref={weekPickerInputRef}
                          type="date"
                          value={selectedWeekStart}
                          onChange={(e) => {
                            setSelectedWeekStart(e.target.value);
                            // Week end will be automatically calculated by useEffect
                          }}
                          onMouseDown={(e) => {
                            // Use showPicker() on mousedown (before React's synthetic event handling)
                            if (
                              weekPickerInputRef.current &&
                              "showPicker" in weekPickerInputRef.current
                            ) {
                              e.preventDefault();
                              e.stopPropagation();
                              (weekPickerInputRef.current as any).showPicker();
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          style={{
                            zIndex: 3,
                            width: "100%",
                            height: "100%",
                            cursor: "pointer",
                          }}
                        />
                        {/* Display input showing the week range */}
                        <div
                          className="px-2.5 sm:px-3 py-1.5 sm:py-2 pr-8 rounded-lg border text-xs sm:text-sm flex items-center relative"
                          style={{
                            borderColor: "#AA855B",
                            backgroundColor: "#F5F5F5",
                            color: "#32332D",
                            minHeight: "32px",
                            cursor: "pointer",
                            userSelect: "none",
                            pointerEvents: "none",
                          }}
                        >
                          {selectedWeekStart && selectedWeekEnd ? (
                            <span>
                              {(() => {
                                const startDate = new Date(selectedWeekStart);
                                const endDate = new Date(selectedWeekEnd);
                                const formatDate = (date: Date) => {
                                  const day = String(date.getDate()).padStart(
                                    2,
                                    "0",
                                  );
                                  const month = String(
                                    date.getMonth() + 1,
                                  ).padStart(2, "0");
                                  const year = date.getFullYear();
                                  return `${day}/${month}/${year}`;
                                };
                                return `${formatDate(startDate)} - ${formatDate(endDate)}`;
                              })()}
                            </span>
                          ) : (
                            <span style={{ color: "#999" }}>
                              Select week start date
                            </span>
                          )}
                        </div>
                        {/* Calendar icon positioned to match native month picker style */}
                        <div
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                          style={{ zIndex: 2 }}
                        >
                          <Calendar
                            className="w-3.5 h-3.5"
                            style={{ color: "#AA855B" }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Refresh Filters Button */}
                    <button
                      onClick={handleRefreshWeeklyFilters}
                      className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200 flex items-center justify-center"
                      style={{
                        backgroundColor: "#AA855B",
                        color: "#F5F5F5",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#8B6F4A";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#AA855B";
                      }}
                      title="Reset filters to default"
                    >
                      <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>

                  {/* Right side: Generate Weekly Summary button - hidden in savedList mode */}
                  {/* 
                    Button is disabled when no diary entries exist, as summaries require data to analyze.
                    Tooltip explains why button is disabled when hovering over it.
                  */}
                  {(weeklySummaryViewMode === "initial" ||
                    weeklySummaryViewMode === "generated") && (
                    <Tooltip
                      title={
                        diaryEntries.length === 0
                          ? "Add diary entries to generate summaries"
                          : ""
                      }
                      arrow
                      placement="top"
                    >
                      <span className="w-full sm:w-auto inline-block">
                        <button
                          onClick={handleGenerateWeeklySummary}
                          disabled={isGeneratingWeeklySummary || diaryEntries.length === 0}
                          className="w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm flex items-center justify-center sm:justify-start space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: isGeneratingWeeklySummary || diaryEntries.length === 0
                              ? "#AA855B"
                              : "#F2742C",
                            color: "#F5F5F5",
                          }}
                          onMouseEnter={(e) => {
                            if (!isGeneratingWeeklySummary && diaryEntries.length > 0) {
                              e.currentTarget.style.backgroundColor = "#E55A1F";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isGeneratingWeeklySummary && diaryEntries.length > 0) {
                              e.currentTarget.style.backgroundColor = "#F2742C";
                            }
                          }}
                        >
                          {isGeneratingWeeklySummary ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span>Generate Weekly Summary</span>
                            </>
                          )}
                        </button>
                      </span>
                    </Tooltip>
                  )}
                </div>
              )}

              {/* View Saved Summaries button - Only show when NOT in savedList mode */}
              {weeklySummaryViewMode !== "savedList" && (
                <div className="flex items-center">
                  <button
                    onClick={handleViewSavedWeeklySummaries}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm flex items-center justify-center sm:justify-start space-x-2"
                    style={{
                      backgroundColor: "#AA855B",
                      color: "#F5F5F5",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#8B6F4A";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#AA855B";
                    }}
                  >
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>
                      View Saved Summaries{" "}
                      {savedWeeklySummaries.length > 0 &&
                        `(${savedWeeklySummaries.length})`}
                    </span>
                  </button>
                </div>
              )}

              {/* Back button row - Only show when in savedList mode */}
              {weeklySummaryViewMode === "savedList" && (
                <div className="flex items-center">
                  <button
                    onClick={handleBackFromSavedWeeklyList}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm flex items-center justify-center sm:justify-start space-x-2"
                    style={{
                      backgroundColor: "#AA855B",
                      color: "#F5F5F5",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#8B6F4A";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#AA855B";
                    }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>
                      Back to{" "}
                      {previousWeeklyViewMode === "generated"
                        ? "Generated Summary"
                        : "Summary"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Control Panel for savedDetail - only show back button */
            <div className="mb-3 sm:mb-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleBackFromSavedWeeklyDetail}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm flex items-center justify-center sm:justify-start space-x-2"
                  style={{
                    backgroundColor: "#AA855B",
                    color: "#F5F5F5",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#8B6F4A";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#AA855B";
                  }}
                >
                  <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Back to Saved Summaries</span>
                </button>
              </div>
            </div>
          )}

          {/* Content Area - State-based conditional rendering */}
          {weeklySummaryViewMode === "savedList" ? (
            /* Saved Weekly Summaries List */
            <div className="space-y-4">
              <h4
                className="font-medium text-sm sm:text-base"
                style={{ color: "#32332D" }}
              >
                Saved Weekly Summaries
              </h4>

              {/* Saved Weekly Summaries Filters - Only show in savedList mode */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1.5 sm:space-y-0 sm:space-x-2">
                  <label
                    className="text-xs sm:text-sm font-medium"
                    style={{ color: "#32332D" }}
                  >
                    Child:
                  </label>
                  <div className="relative">
                    <select
                      value={savedWeeklySummariesChildFilter}
                      onChange={(e) =>
                        setSavedWeeklySummariesChildFilter(e.target.value)
                      }
                      onFocus={() =>
                        setFocusedSelectSavedWeeklySummaries("child")
                      }
                      onBlur={() => setFocusedSelectSavedWeeklySummaries(null)}
                      className="w-full sm:w-auto px-2.5 sm:px-3 py-1.5 sm:py-2 pr-8 rounded-lg border text-xs sm:text-sm appearance-none"
                      style={{
                        borderColor: "#AA855B",
                        backgroundColor: "#F5F5F5",
                        color: "#32332D",
                      }}
                    >
                      <option value="all">All Children</option>
                      {children.map((child: any) => (
                        <option
                          key={child.child_id || child.id}
                          value={String(child.child_id || child.id)}
                        >
                          {child.name}
                        </option>
                      ))}
                    </select>
                    {focusedSelectSavedWeeklySummaries === "child" ? (
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

                <div className="flex flex-col sm:flex-row sm:items-center space-y-1.5 sm:space-y-0 sm:space-x-2">
                  <label
                    className="text-xs sm:text-sm font-medium"
                    style={{ color: "#32332D" }}
                  >
                    Week:
                  </label>
                  <div className="relative inline-block">
                    {/* Hidden date input for the actual picker */}
                    <input
                      ref={savedWeekPickerInputRef}
                      type="date"
                      value={savedWeeklySummariesWeekStartFilter || ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSavedWeeklySummariesWeekStartFilter(
                            e.target.value,
                          );
                          // Week end will be automatically calculated by useEffect
                        } else {
                          setSavedWeeklySummariesWeekStartFilter(null);
                          setSavedWeeklySummariesWeekEndFilter(null);
                        }
                      }}
                      onMouseDown={(e) => {
                        if (
                          savedWeekPickerInputRef.current &&
                          "showPicker" in savedWeekPickerInputRef.current
                        ) {
                          e.preventDefault();
                          e.stopPropagation();
                          (savedWeekPickerInputRef.current as any).showPicker();
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      style={{
                        zIndex: 3,
                        width: "100%",
                        height: "100%",
                        cursor: "pointer",
                      }}
                    />
                    {/* Display input showing the week range */}
                    <div
                      className="w-full sm:w-auto px-2.5 sm:px-3 py-1.5 sm:py-2 pr-8 rounded-lg border text-xs sm:text-sm flex items-center relative"
                      style={{
                        borderColor: "#AA855B",
                        backgroundColor: "#F5F5F5",
                        color: "#32332D",
                        minHeight: "38px",
                        cursor: "pointer",
                        userSelect: "none",
                        pointerEvents: "none",
                      }}
                    >
                      {savedWeeklySummariesWeekStartFilter &&
                      savedWeeklySummariesWeekEndFilter ? (
                        <span>
                          {(() => {
                            const startDate = new Date(
                              savedWeeklySummariesWeekStartFilter,
                            );
                            const endDate = new Date(
                              savedWeeklySummariesWeekEndFilter,
                            );
                            const formatDate = (date: Date) => {
                              const day = String(date.getDate()).padStart(
                                2,
                                "0",
                              );
                              const month = String(
                                date.getMonth() + 1,
                              ).padStart(2, "0");
                              const year = date.getFullYear();
                              return `${day}/${month}/${year}`;
                            };
                            return `${formatDate(startDate)} - ${formatDate(endDate)}`;
                          })()}
                        </span>
                      ) : (
                        <span style={{ color: "#999" }}>All weeks</span>
                      )}
                    </div>
                    {/* Calendar icon */}
                    <div
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                      style={{ zIndex: 2 }}
                    >
                      <Calendar
                        className="w-3.5 h-3.5"
                        style={{ color: "#AA855B" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Refresh Filters Button */}
                <button
                  onClick={handleRefreshSavedWeeklySummariesFilters}
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200 flex items-center justify-center"
                  style={{
                    backgroundColor: "#AA855B",
                    color: "#F5F5F5",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#8B6F4A";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#AA855B";
                  }}
                  title="Reset filters to show all"
                >
                  <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {savedWeeklySummaries.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm" style={{ color: "#AA855B" }}>
                    No saved weekly summaries yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedWeeklySummaries.map((summary: any) => {
                    const summaryChildObj = summary.child_id
                      ? children.find(
                          (c: any) =>
                            c.child_id === summary.child_id ||
                            c.id === summary.child_id,
                        )
                      : null;
                    const summaryChildName =
                      summaryChildObj?.name || "All Children";
                    const childColor = summaryChildObj?.color_code || "#8B8B8B";

                    const weekDisplay =
                      summary.period_start && summary.period_end
                        ? `${new Date(summary.period_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(summary.period_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                        : "Unknown week";

                    return (
                      <div
                        key={summary.insight_id}
                        className="rounded-xl p-2.5 sm:p-3 md:p-4 transition-all duration-200 hover:shadow-lg"
                        style={{
                          backgroundColor: "#F5F5F5",
                          border: "1px solid #AA855B",
                          borderLeft: `4px solid ${childColor}`,
                        }}
                      >
                        {/* Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 sm:mb-3 gap-2 sm:gap-0">
                          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                            <div
                              className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-white font-semibold text-[10px] sm:text-xs md:text-sm flex-shrink-0"
                              style={{ backgroundColor: childColor }}
                            >
                              {summary.child_id
                                ? summaryChildObj?.name?.charAt(0) || "G"
                                : "ALL"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3
                                className="font-semibold font-['Poppins'] text-sm sm:text-base md:text-lg break-words"
                                style={{ color: "#32332D" }}
                              >
                                {summary.title ||
                                  `Weekly Reflection - ${weekDisplay}`}
                              </h3>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
                            <button
                              onClick={() =>
                                handleViewSavedWeeklySummary(summary.insight_id)
                              }
                              className="px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-lg text-[10px] sm:text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap"
                              style={{
                                backgroundColor: "#0F5648",
                                color: "#F5F5F5",
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
                              View Summary
                            </button>
                            <button
                              onClick={() => handleDeleteWeeklySummary(summary)}
                              className="p-1 sm:p-1.5 md:p-2 rounded-lg transition-all duration-200 hover:bg-red-100 flex-shrink-0"
                              style={{ color: "#DC2626" }}
                              title="Delete Summary"
                            >
                              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Subtitle Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
                          <div className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-2 flex-wrap">
                            <span
                              className="text-[10px] sm:text-xs md:text-sm font-medium"
                              style={{ color: "#32332D" }}
                            >
                              {summaryChildName}
                            </span>
                            <span
                              className="px-1 sm:px-1.5 md:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] md:text-xs font-normal"
                              style={{
                                backgroundColor: "#0F5648",
                                color: "#F5F5F5",
                              }}
                            >
                              Weekly Summary
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-wrap">
                            <div className="flex items-center space-x-0.5 sm:space-x-1">
                              <Calendar
                                className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0"
                                style={{ color: "#AA855B" }}
                              />
                              <span
                                className="text-[9px] sm:text-[10px] md:text-xs"
                                style={{ color: "#AA855B" }}
                              >
                                {weekDisplay}
                              </span>
                            </div>
                            <div className="flex items-center space-x-0.5 sm:space-x-1">
                              <Clock
                                className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0"
                                style={{ color: "#AA855B" }}
                              />
                              <span
                                className="text-[9px] sm:text-[10px] md:text-xs"
                                style={{ color: "#AA855B" }}
                              >
                                Saved:{" "}
                                {summary.saved_at
                                  ? getTimeAgo(summary.saved_at)
                                  : "Unknown"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (weeklySummaryViewMode === "generated" ||
              weeklySummaryViewMode === "savedDetail") &&
            (currentGeneratedWeeklySummary || selectedWeeklySummary) ? (
            /* Generated Weekly Summary Display */
            (() => {
              const displayWeeklySummary =
                currentGeneratedWeeklySummary || selectedWeeklySummary;
              const weeklyChildName = displayWeeklySummary?.child_id
                ? children.find(
                    (c: any) =>
                      c.child_id === displayWeeklySummary.child_id ||
                      c.id === displayWeeklySummary.child_id,
                  )?.name || "Child"
                : "All Children";

              return (
                <div className="space-y-6">
                  {/* Title & Metadata */}
                  <div>
                    <h4
                      className="text-xl font-semibold mb-2"
                      style={{ color: "#32332D" }}
                    >
                      {displayWeeklySummary.title}
                    </h4>
                    <div
                      className="flex items-center space-x-4 text-sm"
                      style={{ color: "#AA855B" }}
                    >
                      <span>For: {weeklyChildName}</span>
                      {displayWeeklySummary.created_at && (
                        <span>
                          Generated:{" "}
                          {getTimeAgo(displayWeeklySummary.created_at)}
                        </span>
                      )}
                      {displayWeeklySummary.diary_entries_count && (
                        <span>
                          {displayWeeklySummary.diary_entries_count} entries
                          analyzed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Structured Cards */}
                  {displayWeeklySummary.summary_data && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Achievements Card */}
                      {displayWeeklySummary.summary_data.achievements &&
                        displayWeeklySummary.summary_data.achievements.length >
                          0 && (
                          <div
                            className="p-4 rounded-lg border text-center"
                            style={{
                              backgroundColor: "#F5F5F5",
                              borderColor: "#AA855B",
                            }}
                          >
                            <div
                              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                              style={{ backgroundColor: "#E8F5E8" }}
                            >
                              <Award
                                className="w-8 h-8"
                                style={{ color: "#0F5648" }}
                              />
                            </div>
                            <h5
                              className="font-semibold mb-2"
                              style={{ color: "#32332D" }}
                            >
                              Achievements
                            </h5>
                            <ul className="space-y-1 text-sm">
                              {displayWeeklySummary.summary_data.achievements
                                .slice(0, 3)
                                .map((ach: string, idx: number) => (
                                  <li key={idx} style={{ color: "#AA855B" }}>
                                    {ach}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}

                      {/* Progress Card */}
                      {displayWeeklySummary.summary_data.progress && (
                        <div
                          className="p-4 rounded-lg border text-center"
                          style={{
                            backgroundColor: "#F5F5F5",
                            borderColor: "#AA855B",
                          }}
                        >
                          <div
                            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                            style={{ backgroundColor: "#FDF2E8" }}
                          >
                            <TrendingUp
                              className="w-8 h-8"
                              style={{ color: "#F2742C" }}
                            />
                          </div>
                          <h5
                            className="font-semibold mb-2"
                            style={{ color: "#32332D" }}
                          >
                            Progress
                          </h5>
                          <div
                            className="space-y-1 text-sm"
                            style={{ color: "#AA855B" }}
                          >
                            {displayWeeklySummary.summary_data.progress
                              .mood_improvement && <div>Mood ↑</div>}
                            {displayWeeklySummary.summary_data.progress
                              .skill_development && <div>Skills ↑</div>}
                            {displayWeeklySummary.summary_data.progress
                              .behavior_changes && <div>Behavior ↑</div>}
                          </div>
                        </div>
                      )}

                      {/* Focus Areas Card */}
                      {displayWeeklySummary.summary_data.focus_areas &&
                        displayWeeklySummary.summary_data.focus_areas.length >
                          0 && (
                          <div
                            className="p-4 rounded-lg border text-center"
                            style={{
                              backgroundColor: "#F5F5F5",
                              borderColor: "#AA855B",
                            }}
                          >
                            <div
                              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                              style={{ backgroundColor: "#E8F2F5" }}
                            >
                              <Target
                                className="w-8 h-8"
                                style={{ color: "#326586" }}
                              />
                            </div>
                            <h5
                              className="font-semibold mb-2"
                              style={{ color: "#32332D" }}
                            >
                              Focus Areas
                            </h5>
                            <ul className="space-y-1 text-sm">
                              {displayWeeklySummary.summary_data.focus_areas
                                .slice(0, 3)
                                .map((area: string, idx: number) => (
                                  <li key={idx} style={{ color: "#AA855B" }}>
                                    {area}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  )}

                  {/* Narrative Content (shorter for weekly) */}
                  <div
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: "#F5F5F5",
                      borderColor: "#AA855B",
                    }}
                  >
                    <div className="prose max-w-none">
                      {displayWeeklySummary.content
                        .split("\n")
                        .map((paragraph: string, idx: number) => {
                          if (!paragraph.trim()) return null;
                          if (paragraph.trim().endsWith(":")) {
                            return (
                              <h5
                                key={idx}
                                className="font-semibold mt-4 mb-2"
                                style={{ color: "#32332D" }}
                              >
                                {paragraph.trim()}
                              </h5>
                            );
                          }
                          if (paragraph.trim().startsWith("-")) {
                            return (
                              <p
                                key={idx}
                                className="text-sm ml-4 mb-1"
                                style={{ color: "#32332D" }}
                              >
                                {paragraph.trim()}
                              </p>
                            );
                          }
                          return (
                            <p
                              key={idx}
                              className="text-sm mb-3 leading-relaxed"
                              style={{ color: "#32332D" }}
                            >
                              {paragraph.trim()}
                            </p>
                          );
                        })}
                    </div>
                  </div>

                  {/* Statistics */}
                  {displayWeeklySummary.summary_data?.statistics && (
                    <div
                      className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-0 sm:space-x-4 text-[10px] sm:text-xs md:text-sm"
                      style={{ color: "#AA855B" }}
                    >
                      <span>
                        Total entries:{" "}
                        {displayWeeklySummary.summary_data.statistics
                          .total_entries || 0}
                      </span>
                      {displayWeeklySummary.summary_data.statistics
                        .average_mood && (
                        <>
                          <span className="hidden sm:inline">|</span>
                          <span>
                            Average Mood:{" "}
                            {
                              displayWeeklySummary.summary_data.statistics
                                .average_mood
                            }
                          </span>
                        </>
                      )}
                      {displayWeeklySummary.summary_data.statistics
                        .most_common_tags &&
                        displayWeeklySummary.summary_data.statistics
                          .most_common_tags.length > 0 && (
                          <>
                            <span className="hidden sm:inline">|</span>
                            <span className="break-words">
                              Most common tags:{" "}
                              {displayWeeklySummary.summary_data.statistics.most_common_tags.join(
                                ", ",
                              )}
                            </span>
                          </>
                        )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {weeklySummaryViewMode === "generated" ? (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                      {!displayWeeklySummary.is_saved && (
                        <button
                          onClick={() =>
                            handleSaveWeeklySummary(
                              displayWeeklySummary.insight_id,
                            )
                          }
                          className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm flex items-center justify-center sm:justify-start space-x-2"
                          style={{
                            backgroundColor: "#0F5648",
                            color: "#F5F5F5",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#0A4538";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#0F5648";
                          }}
                        >
                          <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>Save Summary</span>
                        </button>
                      )}
                      {displayWeeklySummary.is_saved && (
                        <span
                          className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium"
                          style={{
                            backgroundColor: "#E8F5E8",
                            color: "#0F5648",
                          }}
                        >
                          ✓ Saved
                        </span>
                      )}
                      {/* 
                        Regenerate button is disabled when no diary entries exist.
                        This prevents regenerating summaries when all entries have been deleted.
                        Tooltip explains why button is disabled when hovering over it.
                      */}
                      {!displayWeeklySummary.is_saved && (
                        <Tooltip
                          title={
                            diaryEntries.length === 0
                              ? "Add diary entries to generate summaries"
                              : ""
                          }
                          arrow
                          placement="top"
                        >
                          <span className="inline-block">
                            <button
                              onClick={handleGenerateWeeklySummary}
                              disabled={isGeneratingWeeklySummary || diaryEntries.length === 0}
                              className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm flex items-center justify-center sm:justify-start space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{
                                backgroundColor: "#AA855B",
                                color: "#F5F5F5",
                              }}
                              onMouseEnter={(e) => {
                                if (!isGeneratingWeeklySummary && diaryEntries.length > 0) {
                                  e.currentTarget.style.backgroundColor = "#8B6F4A";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isGeneratingWeeklySummary && diaryEntries.length > 0) {
                                  e.currentTarget.style.backgroundColor = "#AA855B";
                                }
                              }}
                            >
                              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span>Regenerate</span>
                            </button>
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  ) : weeklySummaryViewMode === "savedDetail" ? (
                    <div className="flex items-center space-x-3">
                      <span
                        className="px-4 py-2 rounded-lg text-sm font-medium"
                        style={{ backgroundColor: "#E8F5E8", color: "#0F5648" }}
                      >
                        ✓ Saved
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })()
          ) : weeklySummaryViewMode === "initial" ? (
            /* Empty State */
            <div className="text-center py-12">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "#F5F3F0" }}
              >
                <Brain className="w-8 h-8" style={{ color: "#AA855B" }} />
              </div>
              <h4 className="font-medium mb-2" style={{ color: "#32332D" }}>
                No Summary Generated
              </h4>
              <p className="text-sm" style={{ color: "#AA855B" }}>
                Click "Generate Weekly Summary" to create an AI-powered weekly
                reflection of your diary entries
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  // Helper function to calculate time ago
  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    }
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ${days === 1 ? "day" : "days"} ago`;
    }
    if (diffInSeconds < 2592000) {
      const weeks = Math.floor(diffInSeconds / 604800);
      return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
    }
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  };

  // Helper function to get content preview from draft
  const getDraftContentPreview = (draft: any): string => {
    if (!draft.form_data) return "";

    const formData = draft.form_data;

    // Check for title first
    if (
      formData.title &&
      formData.title.trim() !== "Untitled Entry" &&
      formData.title.trim() !== ""
    ) {
      return formData.title;
    }

    // Check for content
    if (formData.content && formData.content.trim() !== "") {
      return (
        formData.content.substring(0, 100) +
        (formData.content.length > 100 ? "..." : "")
      );
    }

    // Check for template-specific fields
    if (draft.entry_type === "daily-behavior") {
      if (formData.observedBehaviors?.length > 0) {
        return `Behaviors: ${formData.observedBehaviors.join(", ")}`;
      }
    }

    if (draft.entry_type === "emotional-tracking") {
      if (formData.triggers?.length > 0) {
        return `Triggers: ${formData.triggers.join(", ")}`;
      }
    }

    if (draft.entry_type === "intervention-tracking") {
      if (formData.situation) {
        return (
          formData.situation.substring(0, 100) +
          (formData.situation.length > 100 ? "..." : "")
        );
      }
    }

    if (draft.entry_type === "milestone-progress") {
      if (formData.improvements) {
        return (
          formData.improvements.substring(0, 100) +
          (formData.improvements.length > 100 ? "..." : "")
        );
      }
    }

    return "";
  };

  /* Drafts View */
  const renderDraftsView = () => {
    if (drafts.length === 0) {
      return (
        <div className="text-center py-12">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "#F5F3F0" }}
          >
            <Edit3 className="w-8 h-8" style={{ color: "#AA855B" }} />
          </div>
          <h3 className="text-lg font-medium mb-2" style={{ color: "#32332D" }}>
            No Draft Entries
          </h3>
          <p className="text-sm" style={{ color: "#AA855B" }}>
            Start creating a new entry to save drafts
          </p>
        </div>
      );
    }

    if (
      filteredDrafts.length === 0 &&
      (searchTerm ||
        selectedMood !== "all" ||
        selectedChildFilter !== "all" ||
        selectedEntryType !== "all" ||
        selectedDateRange !== "all" ||
        selectedTags.length > 0)
    ) {
      return (
        <div className="text-center py-12">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "#F5F3F0" }}
          >
            <Search className="w-8 h-8" style={{ color: "#AA855B" }} />
          </div>
          <h3 className="text-lg font-medium mb-2" style={{ color: "#32332D" }}>
            No Drafts Match Your Filters
          </h3>
          <p className="text-sm" style={{ color: "#AA855B" }}>
            Try adjusting your search or filter criteria
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3 sm:space-y-4 px-2 sm:px-0">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3
            className="text-base sm:text-lg font-semibold"
            style={{ color: "#32332D" }}
          >
            Draft Entries
          </h3>
          <span className="text-xs sm:text-sm" style={{ color: "#AA855B" }}>
            {filteredDrafts.length} of {drafts.length} draft
            {filteredDrafts.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {filteredDrafts.map((draft) => {
            // Find child for this draft
            const child = children.find(
              (c: any) =>
                c.child_id === draft.child_id || c.id === draft.child_id,
            );
            const childColor = child?.color_code || "#326586";

            // Helper functions for entry type styling
            const getEntryTypeColor = (type: string) => {
              const colors: { [key: string]: string } = {
                "free-form": "#3D4B5C",
                "daily-behavior": "#704D34",
                "emotional-tracking": "#946264",
                "intervention-tracking": "#8B4513",
                "milestone-progress": "#545454",
              };
              return colors[type] || "#326586";
            };

            const getEntryTypeLabel = (type: string) => {
              const labels: { [key: string]: string } = {
                "free-form": "Free Form",
                "daily-behavior": "Daily Behavior",
                "emotional-tracking": "Emotional Tracking",
                "intervention-tracking": "Intervention Tracking",
                "milestone-progress": "Milestone Progress",
              };
              return labels[type] || "Free Form";
            };

            const draftTitle =
              draft.title && draft.title !== "Untitled Entry"
                ? draft.title
                : "Untitled Entry";
            const contentPreview = getDraftContentPreview(draft);
            const lastSaved = draft.updated_at || draft.created_at;
            const intendedDate = draft.entry_date
              ? new Date(draft.entry_date)
              : null;

            return (
              <div
                key={draft.draft_id}
                className="rounded-xl p-3 sm:p-4 transition-all duration-200 hover:shadow-lg cursor-pointer relative"
                style={{
                  backgroundColor: "#F8F8F8", // Slightly muted background
                  border: "2px dashed #AA855B", // Dashed border to indicate draft
                  borderLeft: `4px solid ${childColor}`, // Child color left border
                }}
                onClick={() => resumeDraft(draft)}
              >
                {/* Header Row: Child indicator + Title + DRAFT badge + Actions */}
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    {/* Child Color Indicator */}
                    <div
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0"
                      style={{ backgroundColor: childColor }}
                    >
                      {child?.name?.charAt(0) || "G"}
                    </div>

                    <div className="flex items-center space-x-1.5 sm:space-x-2 flex-1 min-w-0">
                      <h3
                        className="font-semibold font-['Poppins'] text-sm sm:text-base md:text-lg truncate"
                        style={{ color: "#32332D" }}
                      >
                        {draftTitle}
                      </h3>
                      {/* DRAFT Badge - Subtle, next to title */}
                      <span
                        className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium flex-shrink-0"
                        style={{
                          backgroundColor: "#FDF2E8",
                          color: "#F2742C",
                          border: "1px solid #F2742C",
                        }}
                      >
                        DRAFT
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-1 sm:space-x-2 ml-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resumeDraft(draft);
                      }}
                      className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm flex items-center space-x-1 sm:space-x-2"
                      style={{
                        backgroundColor: "#0F5648",
                        color: "#F5F5F5",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#0A4538";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#0F5648";
                      }}
                    >
                      <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Continue</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDraft(draft);
                      }}
                      className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm flex items-center space-x-1 sm:space-x-2"
                      style={{
                        backgroundColor: "#722F37",
                        color: "#F5F5F5",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#5A2529";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#722F37";
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>

                {/* Subtitle Row: Child name + Entry type badge */}
                <div className="flex items-center space-x-2 mb-2 sm:mb-3 flex-wrap">
                  <span
                    className="text-xs sm:text-sm font-medium"
                    style={{ color: "#32332D" }}
                  >
                    {child?.name || "General"}
                  </span>
                  <span
                    className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-normal"
                    style={{
                      backgroundColor: getEntryTypeColor(draft.entry_type),
                      color: "#F5F5F5",
                    }}
                  >
                    {getEntryTypeLabel(draft.entry_type)}
                  </span>
                </div>

                {/* Content Preview (if available) */}
                {contentPreview && (
                  <div className="mb-2 sm:mb-3">
                    <p
                      className="text-xs sm:text-sm line-clamp-2"
                      style={{ color: "#666666" }}
                    >
                      {contentPreview}
                    </p>
                  </div>
                )}

                {/* Metadata Row: Last saved + Intended date */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-1.5 sm:gap-0 text-[10px] sm:text-xs">
                  <div className="flex items-center space-x-1">
                    <Clock
                      className="w-3 h-3 sm:w-4 sm:h-4"
                      style={{ color: "#AA855B" }}
                    />
                    <span style={{ color: "#AA855B" }}>
                      Last saved: {getTimeAgo(lastSaved)}
                    </span>
                  </div>
                  {intendedDate && (
                    <div className="flex items-center space-x-1">
                      <Calendar
                        className="w-3 h-3 sm:w-4 sm:h-4"
                        style={{ color: "#AA855B" }}
                      />
                      <span style={{ color: "#AA855B" }}>
                        Intended date:{" "}
                        {intendedDate.toLocaleDateString("en-MY", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* Filters Drawer for Mobile/Tablet */
  const renderFiltersDrawer = () => {
    if (!showFiltersDrawer) return null;

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-45 lg:hidden"
          onClick={() => setShowFiltersDrawer(false)}
        />

        {/* Drawer */}
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl max-h-[85vh] overflow-y-auto lg:hidden"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          <div
            className="sticky top-0 bg-white border-b flex items-center justify-between p-4 z-10"
            style={{ borderColor: "#E5E5E5" }}
          >
            <h3 className="text-lg font-semibold" style={{ color: "#32332D" }}>
              Filters
            </h3>
            <button
              onClick={() => setShowFiltersDrawer(false)}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" style={{ color: "#64635E" }} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Search Bar - Only show when NOT in Insights View */}
            {viewMode !== "insights" && (
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#32332D" }}
                >
                  Search
                </label>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                    style={{ color: "#AA855B" }}
                  />
                  <input
                    type="text"
                    placeholder="Search diary entries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-sm"
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
              </div>
            )}

            {/* View entries for child selector */}
            {children && children.length > 0 && (
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#32332D" }}
                >
                  View entries for:
                </label>
                <div className="relative">
                  <select
                    value={selectedChildFilter}
                    onChange={(e) => {
                      setSelectedChildFilter(e.target.value);
                    }}
                    className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 custom-select text-sm"
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
                    <option value="all">All Children</option>
                    {children.map((child: any) => (
                      <option key={child.id} value={child.id}>
                        {child.name}
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
            )}

            {/* Mood Filter - Only show when NOT in Insights View */}
            {viewMode !== "insights" && (
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#32332D" }}
                >
                  Mood
                </label>
                <div className="relative">
                  <select
                    value={selectedMood}
                    onChange={(e) => {
                      setSelectedMood(e.target.value);
                    }}
                    className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 custom-select text-sm"
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
                    <option value="all">All Moods</option>
                    {Object.keys(moodIcons).map((mood) => (
                      <option key={mood} value={mood}>
                        {mood.charAt(0).toUpperCase() + mood.slice(1)}
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
            )}

            {/* Entry Type Filter - Only show when NOT in Insights View */}
            {viewMode !== "insights" && (
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#32332D" }}
                >
                  Entry Type
                </label>
                <div className="relative">
                  <select
                    value={selectedEntryType}
                    onChange={(e) => {
                      setSelectedEntryType(e.target.value);
                    }}
                    className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 custom-select text-sm"
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
                    <option value="all">All Entry Types</option>
                    <option value="free-form">Free Form</option>
                    <option value="daily-behavior">Daily Behavior</option>
                    <option value="emotional-tracking">
                      Emotional Tracking
                    </option>
                    <option value="intervention-tracking">
                      Intervention Tracking
                    </option>
                    <option value="milestone-progress">
                      Milestone Progress
                    </option>
                  </select>
                  <ChevronDown
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                    style={{ color: "#AA855B" }}
                    size={16}
                  />
                </div>
              </div>
            )}

            {/* Date Range Filter - Only for List and Insights views */}
            {(viewMode === "list" || viewMode === "insights") && (
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#32332D" }}
                >
                  Date Range
                </label>
                <div className="relative">
                  <select
                    value={selectedDateRange}
                    onChange={(e) => {
                      setSelectedDateRange(e.target.value);
                    }}
                    className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 custom-select text-sm"
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
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="this-week">This Week</option>
                    <option value="this-month">This Month</option>
                    <option value="last-week">Last Week</option>
                    <option value="last-month">Last Month</option>
                  </select>
                  <ChevronDown
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                    style={{ color: "#AA855B" }}
                    size={16}
                  />
                </div>
              </div>
            )}

            {/* Tags Filter - Only show when NOT in Insights View */}
            {viewMode !== "insights" && getAllTags().length > 0 && (
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#32332D" }}
                >
                  Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
                </label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {getAllTags().map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagFilterToggle(tag)}
                      className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                      style={{
                        backgroundColor: selectedTags.includes(tag)
                          ? "#AA855B"
                          : "#F5F5F5",
                        color: selectedTags.includes(tag)
                          ? "#FFFFFF"
                          : "#32332D",
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {selectedTags.length > 0 && (
                  <button
                    onClick={clearTagFilters}
                    className="mt-2 text-xs text-red-600 hover:text-red-700"
                  >
                    Clear Tags
                  </button>
                )}
              </div>
            )}

            {/* Reset Filters Button */}
            <button
              onClick={() => {
                if (viewMode === "insights") {
                  handleRefreshInsightsFilters();
                } else {
                  handleRefreshFilters();
                }
                setShowFiltersDrawer(false);
              }}
              className="w-full px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium"
              style={{ backgroundColor: "#AA855B", color: "#F5F5F5" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#8B6F4A";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#AA855B";
              }}
            >
              <RefreshCw className="w-4 h-4" />
              Reset Filters
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div
      className="min-h-screen pt-20 py-8 font-['Poppins']"
      style={{ backgroundColor: "#FAEFE2" }}
    >
      <style>
        {`
          /* Custom dropdown arrow styling */
          .custom-select {
            appearance: none;
            background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23AA855B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
            background-repeat: no-repeat;
            background-position: right 12px center;
            background-size: 16px;
            padding-right: 40px;
          }
          
          /* Maximum specificity override for select elements */
          html body div[class*="DiaryPage"] select.custom-select option:hover,
          html body div[class*="DiaryPage"] select.custom-select option:focus,
          html body div[class*="DiaryPage"] select.custom-select option:active {
            background-color: #D4C4A8 !important;
            color: #32332D !important;
            background: #D4C4A8 !important;
          }
          
          html body div[class*="DiaryPage"] select.custom-select option:checked,
          html body div[class*="DiaryPage"] select.custom-select option[selected] {
            background-color: #AA855B !important;
            color: #FFFFFF !important;
            background: #AA855B !important;
          }
          
          /* Try to override with even more specificity */
          div[class*="DiaryPage"] select.custom-select option:hover {
            background-color: #D4C4A8 !important;
            color: #32332D !important;
            background: #D4C4A8 !important;
          }
          
          div[class*="DiaryPage"] select.custom-select option:checked,
          div[class*="DiaryPage"] select.custom-select option[selected] {
            background-color: #AA855B !important;
            color: #FFFFFF !important;
            background: #AA855B !important;
          }
          
          /* Nuclear option - try to override everything */
          * select option:hover {
            background-color: #D4C4A8 !important;
            color: #32332D !important;
            background: #D4C4A8 !important;
          }
          
          * select option:checked,
          * select option[selected] {
            background-color: #AA855B !important;
            color: #FFFFFF !important;
            background: #AA855B !important;
          }
          
          /* Override browser default select styling */
          select {
            -webkit-appearance: none !important;
            -moz-appearance: none !important;
            appearance: none !important;
          }
          
          select option {
            -webkit-appearance: none !important;
            -moz-appearance: none !important;
            appearance: none !important;
          }
        `}
      </style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1
                className="text-xl sm:text-2xl md:text-3xl font-bold mb-1.5 sm:mb-2"
                style={{ color: "#32332D" }}
              >
                Parenting Diary
              </h1>
              <p
                className="text-xs sm:text-sm"
                style={{
                  color: "#AA855B",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Track your parenting journey with intelligent insights
              </p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              <button
                onClick={() => {
                  // Check if user has no children - show onboarding modal
                  if (children.length === 0 && !isAddingChild) {
                    setNewEntryDate(new Date());
                    setShowAddFirstChildModal(true);
                    return;
                  }

                  handleOpenNewEntry();
                }}
                className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-sm font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg w-full sm:w-auto justify-center"
                style={{
                  backgroundColor: "#F2742C",
                  color: "#F5F5F5",
                  boxShadow: "0 4px 15px rgba(242, 116, 44, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#E55A1F";
                  e.currentTarget.style.boxShadow =
                    "0 6px 20px rgba(242, 116, 44, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#F2742C";
                  e.currentTarget.style.boxShadow =
                    "0 4px 15px rgba(242, 116, 44, 0.3)";
                }}
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">New Entry</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="mb-4 sm:mb-6">
          <div
            className="grid grid-cols-2 sm:flex sm:space-x-1 gap-1.5 sm:gap-1 p-1.5 sm:p-2 rounded-lg w-full sm:w-fit"
            style={{ backgroundColor: "#FCF9F8" }}
          >
            {[
              { id: "calendar", label: "Calendar", icon: Calendar },
              { id: "list", label: "List", icon: FileText },
              { id: "insights", label: "Insights", icon: Brain },
              {
                id: "drafts",
                label: "Drafts",
                icon: Edit3,
                badge: drafts.length > 0 ? drafts.length : undefined,
              },
            ].map((view) => {
              const Icon = view.icon;
              return (
                <button
                  key={view.id}
                  onClick={() => setViewMode(view.id as typeof viewMode)}
                  className={`flex items-center justify-center space-x-1.5 sm:space-x-2 py-1.5 sm:py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    viewMode === view.id
                      ? "shadow-sm"
                      : "opacity-70 hover:opacity-100"
                  }`}
                  style={{
                    backgroundColor:
                      viewMode === view.id ? "#32332D" : "transparent",
                    color: viewMode === view.id ? "#FFFFFF" : "#32332D",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{view.label}</span>
                  {view.badge && (
                    <span className="bg-red-500 text-white text-[10px] sm:text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                      {view.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search Bar - Only show when NOT in Insights View */}
          {viewMode !== "insights" && (
            <div className="flex-1">
              {/* lg:max-w-md */}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                  style={{ color: "#AA855B" }}
                />
                <input
                  type="text"
                  placeholder="Search diary entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
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
            </div>
          )}

          {/* Filter Button for Mobile/Tablet */}
          <button
            onClick={() => setShowFiltersDrawer(true)}
            className="lg:hidden flex items-center space-x-2 px-4 py-2 border rounded-lg transition-all duration-200"
            style={{
              borderColor: "#AA855B",
              backgroundColor: "#FAEFE2",
              color: "#32332D",
            }}
          >
            <Filter className="w-5 h-5" style={{ color: "#AA855B" }} />
            <span className="text-sm font-medium">Filters</span>
          </button>

          {/* Desktop Filters */}
          <div className="hidden lg:flex items-center space-x-4 flex-wrap">
            <Filter className="w-5 h-5" style={{ color: "#AA855B" }} />

            {/* View entries for child selector */}
            {children && children.length > 0 && (
              <div className="flex items-center space-x-2">
                <label
                  className="text-sm font-medium"
                  style={{ color: "#32332D" }}
                >
                  View entries for:
                </label>
                <div className="relative">
                  <select
                    value={selectedChildFilter}
                    onChange={(e) => {
                      setSelectedChildFilter(e.target.value);
                    }}
                    onFocus={() => setFocusedFilterSelect("child")}
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
                    <option value="all">All Children</option>
                    {children.map((child: any) => (
                      <option key={child.id} value={child.id}>
                        {child.name}
                      </option>
                    ))}
                  </select>
                  {focusedFilterSelect === "child" ? (
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
            )}

            {/* Mood Filter - Only show when NOT in Insights View */}
            {viewMode !== "insights" && (
              <div className="relative">
                <select
                  value={selectedMood}
                  onChange={(e) => {
                    setSelectedMood(e.target.value);
                  }}
                  onFocus={() => setFocusedFilterSelect("mood")}
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
                  <option value="all">All Moods</option>
                  {Object.keys(moodIcons).map((mood) => (
                    <option key={mood} value={mood}>
                      {mood.charAt(0).toUpperCase() + mood.slice(1)}
                    </option>
                  ))}
                </select>
                {focusedFilterSelect === "mood" ? (
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

            {/* Entry Type Filter - Only show when NOT in Insights View */}
            {viewMode !== "insights" && (
              <div className="relative">
                <select
                  value={selectedEntryType}
                  onChange={(e) => {
                    setSelectedEntryType(e.target.value);
                  }}
                  onFocus={() => setFocusedFilterSelect("entryType")}
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
                  <option value="all">All Entry Types</option>
                  <option value="free-form">Free Form</option>
                  <option value="daily-behavior">Daily Behavior</option>
                  <option value="emotional-tracking">Emotional Tracking</option>
                  <option value="intervention-tracking">
                    Intervention Tracking
                  </option>
                  <option value="milestone-progress">Milestone Progress</option>
                </select>
                {focusedFilterSelect === "entryType" ? (
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

            {/* Date Range Filter - Only for List and Insights views */}
            {(viewMode === "list" || viewMode === "insights") && (
              <div className="relative">
                <select
                  value={selectedDateRange}
                  onChange={(e) => {
                    setSelectedDateRange(e.target.value);
                  }}
                  onFocus={() => setFocusedFilterSelect("dateRange")}
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
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="this-week">This Week</option>
                  <option value="this-month">This Month</option>
                  <option value="last-week">Last Week</option>
                  <option value="last-month">Last Month</option>
                </select>
                {focusedFilterSelect === "dateRange" ? (
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

            {/* Tags Filter - Popover - Only show when NOT in Insights View */}
            {viewMode !== "insights" && getAllTags().length > 0 && (
              <div className="relative tags-popover-container">
                <div className="relative">
                  <button
                    ref={(el) => setTagsButtonRef(el)}
                    onClick={() => setTagsPopoverOpen(!tagsPopoverOpen)}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 flex items-center gap-2"
                    style={{
                      borderColor:
                        selectedTags.length > 0 ? "#AA855B" : "#AA855B",
                      backgroundColor:
                        selectedTags.length > 0 ? "#FDF2E8" : "#FAEFE2",
                      color: "#32332D",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      backgroundImage: "none",
                      appearance: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#000000";
                      e.target.style.borderWidth = "2px";
                      e.target.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#AA855B";
                      e.target.style.borderWidth = "1px";
                      e.target.style.boxShadow = "none";
                    }}
                  >
                    <span>Tags</span>
                    {selectedTags.length > 0 && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: "#AA855B",
                          color: "#FFFFFF",
                        }}
                      >
                        {selectedTags.length}
                      </span>
                    )}
                    {tagsPopoverOpen ? (
                      <ChevronUp
                        className="w-4 h-4 transition-transform"
                        style={{ color: "#AA855B" }}
                      />
                    ) : (
                      <ChevronDown
                        className="w-4 h-4 transition-transform"
                        style={{ color: "#AA855B" }}
                      />
                    )}
                  </button>
                </div>

                {/* Tags Popover Content */}
                {tagsPopoverOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setTagsPopoverOpen(false)}
                    />
                    <div
                      className="fixed bg-white z-50"
                      style={{
                        ...calculatePopoverPosition(tagsButtonRef),
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
                          Select Tags
                        </h3>
                        <button
                          onClick={() => setTagsPopoverOpen(false)}
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

                      {/* Scrollable Tag Chips Section */}
                      <div
                        style={{
                          flex: 1,
                          overflowY: "auto",
                          padding: "12px",
                          minHeight: 0, // Important for flex scrolling
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "4px",
                          }}
                        >
                          {getAllTags().map((tag) => (
                            <button
                              key={tag}
                              onClick={() => handleTagFilterToggle(tag)}
                              style={{
                                backgroundColor: selectedTags.includes(tag)
                                  ? "#AA855B"
                                  : "#F5F5F5",
                                color: selectedTags.includes(tag)
                                  ? "#FFFFFF"
                                  : "#32332D",
                                border: selectedTags.includes(tag)
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
                                if (!selectedTags.includes(tag)) {
                                  e.currentTarget.style.borderColor = "#AA855B";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!selectedTags.includes(tag)) {
                                  e.currentTarget.style.borderColor = "#E5E5E5";
                                }
                              }}
                            >
                              {tag}
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
                          onClick={clearTagFilters}
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
                          onClick={() => setTagsPopoverOpen(false)}
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
                            e.currentTarget.style.backgroundColor = "#EA580C";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#F97316";
                          }}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={
                viewMode === "insights"
                  ? handleRefreshInsightsFilters
                  : handleRefreshFilters
              }
              className="px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-center"
              style={{
                backgroundColor: "#AA855B",
                color: "#F5F5F5",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#8B6F4A";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#AA855B";
              }}
              title={
                viewMode === "insights"
                  ? "Refresh insights filters"
                  : "Refresh filters and data"
              }
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div
          className="rounded-xl shadow-sm border"
          style={{ backgroundColor: "#F5F5F5", borderColor: "#AA855B" }}
        >
          {viewMode === "calendar" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold" style={{ color: "#32332D" }}>
                  {(selectedDate || new Date()).toLocaleDateString("en-MY", {
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const currentDate = selectedDate || new Date();
                      setSelectedDate(
                        new Date(
                          currentDate.getFullYear(),
                          currentDate.getMonth() - 1,
                        ),
                      );
                    }}
                    className="p-2 hover:bg-opacity-50 rounded-lg transition-colors"
                    style={{ backgroundColor: "#F5F3F0" }}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      const currentDate = selectedDate || new Date();
                      setSelectedDate(
                        new Date(
                          currentDate.getFullYear(),
                          currentDate.getMonth() + 1,
                        ),
                      );
                    }}
                    className="p-2 hover:bg-opacity-50 rounded-lg transition-colors"
                    style={{ backgroundColor: "#F5F3F0" }}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {renderCalendarView()}
            </div>
          )}

          {viewMode === "list" && <div className="p-6">{renderListView()}</div>}

          {viewMode === "insights" && (
            <div className="p-6">{renderInsightsView()}</div>
          )}

          {viewMode === "drafts" && (
            <div className="p-6">{renderDraftsView()}</div>
          )}
        </div>

        {/* Edit Diary Entry & New Diary Entry Modal */}
        {showNewEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
              className="max-w-4xl w-full max-h-[90vh] flex flex-col"
              style={{
                backgroundColor: "#F5F5F5",
                borderRadius: "16px",
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
                      <BookOpen className="w-4 h-4 text-white" />
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
                      {editingEntry ? "Edit Diary Entry" : "New Diary Entry"}
                      {newEntryDate && (
                        <span
                          className="text-sm font-normal ml-2"
                          style={{ color: "#AA855B" }}
                        >
                          for {newEntryDate.getDate()}/
                          {newEntryDate.getMonth() + 1}/
                          {newEntryDate.getFullYear()}
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleExpandToFullPage}
                      className="p-2 rounded-lg transition-all duration-200 hover:bg-opacity-50"
                      // className="p-1 mx-2 rounded-full transition-all duration-200"
                      style={{ color: "#AA855B" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#F0DCC9";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleNewEntryClose}
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
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Top Row: Date | Child Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-sm font-medium mb-1"
                      style={{ color: "#32332D" }}
                    >
                      Date
                    </label>
                    <input
                      type="date"
                      value={
                        newEntryDate
                          ? `${newEntryDate.getFullYear()}-${String(
                              newEntryDate.getMonth() + 1,
                            ).padStart(2, "0")}-${String(
                              newEntryDate.getDate(),
                            ).padStart(2, "0")}`
                          : `${new Date().getFullYear()}-${String(
                              new Date().getMonth() + 1,
                            ).padStart(2, "0")}-${String(
                              new Date().getDate(),
                            ).padStart(2, "0")}`
                      }
                      onChange={(e) => {
                        const [year, month, day] = e.target.value
                          .split("-")
                          .map(Number);
                        setNewEntryDate(new Date(year, month - 1, day));
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                      style={getInputStyles(newEntryDate)}
                      onMouseEnter={(e) =>
                        Object.assign(
                          (e.target as HTMLInputElement).style,
                          getInputHoverStyles(),
                        )
                      }
                      onMouseLeave={(e) =>
                        Object.assign(
                          (e.target as HTMLInputElement).style,
                          getInputBlurStyles(newEntryDate),
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
                          getInputBlurStyles(newEntryDate),
                        )
                      }
                    />
                  </div>

                  {children && children.length > 0 && (
                    <div>
                      <label
                        className="block text-sm font-medium mb-1"
                        style={{ color: "#32332D" }}
                      >
                        This entry is about:
                      </label>
                      <div className="relative">
                        <select
                          value={formData.childId}
                          onChange={(e) =>
                            handleFormChange("childId", e.target.value)
                          }
                          onFocus={() => {
                            setFocusedModalSelect("child");
                            const element =
                              document.activeElement as HTMLSelectElement;
                            if (element) {
                              Object.assign(
                                element.style,
                                getInputFocusStyles(),
                              );
                            }
                          }}
                          onBlur={() => {
                            setFocusedModalSelect(null);
                            const element =
                              document.activeElement as HTMLSelectElement;
                            if (element) {
                              Object.assign(
                                element.style,
                                getInputBlurStyles(formData.childId),
                              );
                            }
                          }}
                          className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 custom-select"
                          style={{
                            ...getInputStyles(formData.childId),
                            appearance: "none",
                            WebkitAppearance: "none",
                            MozAppearance: "none",
                            backgroundImage: "none",
                          }}
                          onMouseEnter={(e) =>
                            Object.assign(
                              (e.target as HTMLSelectElement).style,
                              getInputHoverStyles(),
                            )
                          }
                          onMouseLeave={(e) =>
                            Object.assign(
                              (e.target as HTMLSelectElement).style,
                              getInputBlurStyles(formData.childId),
                            )
                          }
                        >
                          {children.map((child: any) => (
                            <option key={child.id} value={child.id}>
                              {child.name} ({calculateAge(child.birthdate)}{" "}
                              years old)
                            </option>
                          ))}
                        </select>
                        {focusedModalSelect === "child" ? (
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
                  )}
                </div>

                {/* Entry Type Section */}
                <div>
                  <div className="mb-2">
                    <label
                      className="block text-sm font-medium mb-1"
                      style={{ color: "#32332D" }}
                    >
                      Entry Type
                    </label>
                    <p
                      className="text-xs text-gray-600"
                      style={{ color: "#AA855B" }}
                    >
                      How would you like to record today? Select the entry type
                      that best fits your parenting situation
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        !editingEntry && handleTemplateChange("free-form")
                      }
                      disabled={editingEntry !== null}
                      className={`p-4 border rounded-lg text-left transition-all duration-200 transform ${
                        selectedTemplate === "free-form" ||
                        selectedTemplate === ""
                          ? "shadow-md"
                          : editingEntry
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:shadow-lg hover:-translate-y-1 border-opacity-50 hover:border-opacity-75"
                      }`}
                      style={{
                        borderColor:
                          selectedTemplate === "free-form" ||
                          selectedTemplate === ""
                            ? "transparent"
                            : "#AA855B",
                        backgroundColor:
                          selectedTemplate === "free-form" ||
                          selectedTemplate === ""
                            ? "#AA855B"
                            : "transparent",
                      }}
                    >
                      <h4
                        className="font-medium"
                        style={{
                          color:
                            selectedTemplate === "free-form" ||
                            selectedTemplate === ""
                              ? "#FFFFFF"
                              : "#32332D",
                        }}
                      >
                        Free-form Entry
                      </h4>
                      <p
                        className="text-sm"
                        style={{
                          color:
                            selectedTemplate === "free-form" ||
                            selectedTemplate === ""
                              ? "#F5F5F5"
                              : "#AA855B",
                        }}
                      >
                        Write freely about your experiences
                      </p>
                    </button>

                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() =>
                          !editingEntry && handleTemplateChange(template.id)
                        }
                        disabled={editingEntry !== null}
                        className={`p-4 border rounded-lg text-left transition-all duration-200 transform ${
                          selectedTemplate === template.id
                            ? "shadow-md"
                            : editingEntry
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:shadow-lg hover:-translate-y-1 border-opacity-50 hover:border-opacity-75"
                        }`}
                        style={{
                          borderColor:
                            selectedTemplate === template.id
                              ? "transparent"
                              : "#AA855B",
                          backgroundColor:
                            selectedTemplate === template.id
                              ? "#AA855B"
                              : "transparent",
                        }}
                      >
                        <h4
                          className="font-medium"
                          style={{
                            color:
                              selectedTemplate === template.id
                                ? "#FFFFFF"
                                : "#32332D",
                          }}
                        >
                          {template.name}
                        </h4>
                        <p
                          className="text-sm"
                          style={{
                            color:
                              selectedTemplate === template.id
                                ? "#F5F5F5"
                                : "#AA855B",
                          }}
                        >
                          {template.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mood Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-sm font-medium mb-1"
                      style={{ color: "#32332D" }}
                    >
                      Your Mood
                    </label>
                    <div className="relative" ref={parentMoodDropdownRef}>
                      <button
                        type="button"
                        onClick={() =>
                          setMoodDropdownOpen(
                            moodDropdownOpen === "parentMood"
                              ? null
                              : "parentMood",
                          )
                        }
                        onMouseEnter={(e) =>
                          Object.assign(
                            (e.target as HTMLButtonElement).style,
                            getInputHoverStyles(),
                          )
                        }
                        onMouseLeave={(e) =>
                          Object.assign(
                            (e.target as HTMLButtonElement).style,
                            getInputBlurStyles(formData.parentMood),
                          )
                        }
                        className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-left flex items-center justify-between"
                        style={{
                          ...getInputStyles(formData.parentMood),
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {(() => {
                            const moodData =
                              moodIcons[
                                formData.parentMood as keyof typeof moodIcons
                              ];
                            const MoodIcon =
                              moodData?.icon || moodIcons.neutral.icon;
                            return (
                              <MoodIcon
                                size={18}
                                style={{
                                  color:
                                    moodData?.color || moodIcons.neutral.color,
                                }}
                              />
                            );
                          })()}
                          <span>
                            {formData.parentMood
                              ? formData.parentMood.charAt(0).toUpperCase() +
                                formData.parentMood.slice(1)
                              : "Select mood"}
                          </span>
                        </div>
                        {moodDropdownOpen === "parentMood" ? (
                          <ChevronUp
                            className="pointer-events-none"
                            style={{ color: "#AA855B" }}
                            size={16}
                          />
                        ) : (
                          <ChevronDown
                            className="pointer-events-none"
                            style={{ color: "#AA855B" }}
                            size={16}
                          />
                        )}
                      </button>
                      {moodDropdownOpen === "parentMood" && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-[#AA855B] rounded-lg shadow-lg max-h-60 overflow-auto">
                          {Object.keys(moodIcons).map((mood) => {
                            const moodData =
                              moodIcons[mood as keyof typeof moodIcons];
                            const MoodIcon = moodData.icon;
                            return (
                              <button
                                key={mood}
                                type="button"
                                onClick={() => {
                                  handleFormChange("parentMood", mood);
                                  setMoodDropdownOpen(null);
                                }}
                                className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[#D4C4A8] transition-colors ${
                                  formData.parentMood === mood
                                    ? "bg-[#AA855B] text-white"
                                    : "text-[#32332D]"
                                }`}
                              >
                                <MoodIcon
                                  size={18}
                                  style={{
                                    color:
                                      formData.parentMood === mood
                                        ? "#FFFFFF"
                                        : moodData.color,
                                  }}
                                />
                                <span>
                                  {mood.charAt(0).toUpperCase() + mood.slice(1)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-1"
                      style={{ color: "#32332D" }}
                    >
                      Child's Mood
                    </label>
                    <div className="relative" ref={childMoodDropdownRef}>
                      <button
                        type="button"
                        onClick={() =>
                          setMoodDropdownOpen(
                            moodDropdownOpen === "childMood"
                              ? null
                              : "childMood",
                          )
                        }
                        onMouseEnter={(e) =>
                          Object.assign(
                            (e.target as HTMLButtonElement).style,
                            getInputHoverStyles(),
                          )
                        }
                        onMouseLeave={(e) =>
                          Object.assign(
                            (e.target as HTMLButtonElement).style,
                            getInputBlurStyles(formData.childMood),
                          )
                        }
                        className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-left flex items-center justify-between"
                        style={{
                          ...getInputStyles(formData.childMood),
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {(() => {
                            const moodData =
                              moodIcons[
                                formData.childMood as keyof typeof moodIcons
                              ];
                            const MoodIcon =
                              moodData?.icon || moodIcons.neutral.icon;
                            return (
                              <MoodIcon
                                size={18}
                                style={{
                                  color:
                                    moodData?.color || moodIcons.neutral.color,
                                }}
                              />
                            );
                          })()}
                          <span>
                            {formData.childMood
                              ? formData.childMood.charAt(0).toUpperCase() +
                                formData.childMood.slice(1)
                              : "Select mood"}
                          </span>
                        </div>
                        {moodDropdownOpen === "childMood" ? (
                          <ChevronUp
                            className="pointer-events-none"
                            style={{ color: "#AA855B" }}
                            size={16}
                          />
                        ) : (
                          <ChevronDown
                            className="pointer-events-none"
                            style={{ color: "#AA855B" }}
                            size={16}
                          />
                        )}
                      </button>
                      {moodDropdownOpen === "childMood" && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-[#AA855B] rounded-lg shadow-lg max-h-60 overflow-auto">
                          {Object.keys(moodIcons).map((mood) => {
                            const moodData =
                              moodIcons[mood as keyof typeof moodIcons];
                            const MoodIcon = moodData.icon;
                            return (
                              <button
                                key={mood}
                                type="button"
                                onClick={() => {
                                  handleFormChange("childMood", mood);
                                  setMoodDropdownOpen(null);
                                }}
                                className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[#D4C4A8] transition-colors ${
                                  formData.childMood === mood
                                    ? "bg-[#AA855B] text-white"
                                    : "text-[#32332D]"
                                }`}
                              >
                                <MoodIcon
                                  size={18}
                                  style={{
                                    color:
                                      formData.childMood === mood
                                        ? "#FFFFFF"
                                        : moodData.color,
                                  }}
                                />
                                <span>
                                  {mood.charAt(0).toUpperCase() + mood.slice(1)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div
                  className="border-t"
                  style={{ borderColor: "#AA855B" }}
                ></div>

                {/* Dynamic Template Content Section */}
                <div className="space-y-4">
                  {/* Dynamic form content based on selected template */}
                  {renderDynamicForm()}
                </div>

                {/* Bottom Fixed Section */}
                <div
                  className="space-y-4 pt-4 border-t"
                  style={{ borderColor: "#AA855B" }}
                >
                  {/* Tags Section */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "#32332D" }}
                    >
                      Tags
                      <span className="text-xs text-gray-500 ml-2">
                        Press comma or click Add to create a tag
                      </span>
                    </label>

                    {/* Tag Input */}
                    <div className="flex space-x-2 mb-3">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={handleTagKeyPress}
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                        style={getInputStyles(tagInput)}
                        onMouseEnter={(e) =>
                          Object.assign(
                            (e.target as HTMLInputElement).style,
                            getInputHoverStyles(),
                          )
                        }
                        onMouseLeave={(e) =>
                          Object.assign(
                            (e.target as HTMLInputElement).style,
                            getInputBlurStyles(tagInput),
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
                            getInputBlurStyles(tagInput),
                          )
                        }
                        placeholder="Enter a tag..."
                      />
                      <button
                        type="button"
                        onClick={addTag}
                        className="px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                        style={{
                          backgroundColor: "#0F5648",
                          color: "#F5F5F5",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#0A4538";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#0F5648";
                        }}
                      >
                        Add
                      </button>
                    </div>

                    {/* Tag Chips */}
                    {formData.tags && formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag: string, index: number) => (
                          <div
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all duration-200"
                            style={{
                              backgroundColor: "#E8F4FD",
                              color: "#0F5648",
                              border: "1px solid #0F5648",
                            }}
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-2 hover:bg-gray-200 rounded-full p-0.5 transition-colors duration-200"
                              style={{ color: "#0F5648" }}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Files Preview - Above Attachments */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4">
                      <label
                        className="block text-sm font-medium mb-2"
                        style={{ color: "#32332D" }}
                      >
                        Selected Files ({selectedFiles.length})
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="relative">
                            {file.type.startsWith("image/") ? (
                              <img
                                src={selectedFilePreviews[index] || ""}
                                alt={file.name}
                                className="w-20 h-20 object-cover rounded-lg border"
                                style={{ borderColor: "#F0DCC9" }}
                              />
                            ) : file.type.startsWith("video/") ? (
                              <div
                                className="w-20 h-20 rounded-lg border flex items-center justify-center bg-gray-100 relative"
                                style={{ borderColor: "#F0DCC9" }}
                              >
                                <Video
                                  className="w-8 h-8"
                                  style={{ color: "#AA855B" }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
                                  <Play className="w-6 h-6 text-white" />
                                </div>
                              </div>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border flex items-center justify-center hover:bg-gray-100 transition-colors"
                              style={{ borderColor: "#F0DCC9" }}
                            >
                              <X
                                className="w-4 h-4"
                                style={{ color: "#32332D" }}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attachments Section */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "#32332D" }}
                    >
                      Attachments
                    </label>

                    {/* File Upload Area */}
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
                          handleFileSelect({ target: { files } } as any);
                        }
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="diary-attachments-upload"
                        multiple
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
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs" style={{ color: "#AA855B" }}>
                            Images, Videos (max 10MB each)
                          </p>
                        </div>
                        <label
                          htmlFor="diary-attachments-upload"
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
                          Choose Files
                        </label>
                      </div>
                    </div>

                    {/* Error Message */}
                    {attachmentError && (
                      <div className="text-sm text-red-600 font-['Poppins'] text-center mt-2">
                        {attachmentError}
                      </div>
                    )}

                    {/* Existing Attachments (for Edit mode) */}
                    {editingEntry && attachments.length > 0 && (
                      <div className="mt-4">
                        {/* <label className="block text-sm font-medium mb-2" style={{ color: "#32332D" }}>
                          Attachments
                        </label> */}
                        <AttachmentGallery
                          attachments={attachments}
                          onDelete={deleteAttachment}
                          onMarkForDeletion={markAttachmentForDeletion}
                          onUnmarkForDeletion={unmarkAttachmentForDeletion}
                          markedForDeletion={attachmentsToDelete}
                          showActions={true}
                          maxThumbnails={6}
                        />
                      </div>
                    )}
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
                    onClick={handleNewEntryClose}
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
                    onClick={editingEntry ? handleUpdateEntry : handleSaveEntry}
                    className="px-6 py-3 text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                    style={{
                      backgroundColor: "#0F5648",
                      color: "#F5F5F5",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#0A4538";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#0F5648";
                    }}
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingEntry ? "Update Entry" : "Add Entry"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Entry List Modal */}
        <DiaryEntryListModal
          open={entryListModalOpen}
          onClose={handleEntryListClose}
          date={selectedDate || new Date()}
          onNewEntry={handleNewEntryFromList}
          onEditEntry={handleEditEntry}
          onEntryDeleted={handleEntryDeleted}
          children={children}
        />

        {/* Delete Confirmation Modal */}
        {deleteConfirmOpen && entryToDelete && (
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
                  Delete Diary Entry
                </h3>
                <button
                  className="text-gray-400 hover:text-gray-600"
                  onClick={cancelDeleteEntry}
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
                      {entryToDelete.title || "Untitled Entry"}
                    </h4>
                    {entryToDelete.entry_date && (
                      <p
                        className="text-xs font-['Poppins'] mt-1"
                        style={{ color: "#AA855B" }}
                      >
                        {new Date(
                          entryToDelete.entry_date,
                        ).toLocaleDateString()}
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
                    Deleting this diary entry will permanently remove it and all
                    associated data, including attachments. This action cannot
                    be undone.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="confirm-delete-entry"
                    className="w-4 h-4 rounded"
                    style={{ accentColor: "#EF4444" }}
                  />
                  <label
                    htmlFor="confirm-delete-entry"
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
                  onClick={cancelDeleteEntry}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg font-medium font-['Poppins'] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#EF4444", color: "#FFFFFF" }}
                  onClick={() => {
                    const checkbox = document.getElementById(
                      "confirm-delete-entry",
                    ) as HTMLInputElement;
                    if (checkbox?.checked) {
                      confirmDeleteEntry();
                    } else {
                      alert(
                        "Please confirm that you understand this action cannot be undone.",
                      );
                    }
                  }}
                  disabled={deleting}
                >
                  {deleting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Deleting...</span>
                    </div>
                  ) : (
                    "Delete Entry"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Template Change Warning Dialog */}
        <ChangeEntryTypeModal
          open={showDraftDialog}
          onClose={cancelTemplateChange}
          onCancel={cancelTemplateChange}
          onDiscard={discardChanges}
          onSave={saveAsDraft}
        />

        {/* Delete Draft Confirmation Dialog */}
        {showDeleteDraftDialog && draftToDelete && (
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
                  Delete Draft Entry?
                </h3>
                <button
                  className="text-gray-400 hover:text-gray-600"
                  onClick={cancelDeleteDraft}
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
                      {draftToDelete.title || "Untitled Draft"}
                    </h4>
                    {draftToDelete.entry_date && (
                      <p
                        className="text-xs font-['Poppins'] mt-1"
                        style={{ color: "#AA855B" }}
                      >
                        {new Date(
                          draftToDelete.entry_date,
                        ).toLocaleDateString()}
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
                    Deleting this draft entry will permanently remove it and all
                    associated data. This action cannot be undone.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="confirm-delete-draft"
                    className="w-4 h-4 rounded"
                    style={{ accentColor: "#EF4444" }}
                  />
                  <label
                    htmlFor="confirm-delete-draft"
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
                  onClick={cancelDeleteDraft}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg font-medium font-['Poppins'] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#EF4444", color: "#FFFFFF" }}
                  onClick={() => {
                    const checkbox = document.getElementById(
                      "confirm-delete-draft",
                    ) as HTMLInputElement;
                    if (checkbox?.checked) {
                      confirmDeleteDraft();
                    } else {
                      alert(
                        "Please confirm that you understand this action cannot be undone.",
                      );
                    }
                  }}
                >
                  Delete Draft
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Summary Confirmation Dialog */}
        <Dialog
          open={deleteSummaryConfirmOpen}
          onClose={cancelDeleteSummary}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: "16px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              border: "1px solid #AA855B",
            },
          }}
        >
          <DialogTitle
            sx={{
              backgroundColor: "#FAEFE2",
              color: "#32332D",
              fontWeight: 600,
              fontSize: "1.25rem",
              fontFamily: "'Poppins', sans-serif",
              borderBottom: "1px solid #AA855B",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Confirm Deletion</span>
            <button
              onClick={cancelDeleteSummary}
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
          </DialogTitle>

          <DialogContent sx={{ padding: "24px", backgroundColor: "#F5F5F5" }}>
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 mt-2"
                style={{ backgroundColor: "#FFF4E6" }}
              >
                <Trash2 className="w-8 h-8" style={{ color: "#D63B3B" }} />
              </div>
              <Typography
                variant="h6"
                className="font-['Poppins'] mb-4"
                style={{ color: "#32332D", fontWeight: 800 }}
              >
                Delete Monthly Summary?
              </Typography>
              <Typography
                className="text-sm font-['Poppins'] mb-4"
                style={{ color: "#AA855B" }}
              >
                Are you sure you want to delete this monthly summary?
                <br />
                This action cannot be undone.
              </Typography>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-2">
                <div className="flex items-center justify-center space-x-2">
                  <AlertTriangle
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: "#D63B3B" }}
                  />
                  <Typography
                    className="font-['Poppins']"
                    style={{
                      color: "#722F37",
                      fontSize: "13px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    This will permanently remove this monthly summary and all
                    associated data.
                  </Typography>
                </div>
              </div>
            </div>
          </DialogContent>

          <DialogActions
            sx={{
              padding: "16px 24px",
              backgroundColor: "#FAEFE2",
              borderTop: "1px solid #AA855B",
            }}
          >
            <button
              onClick={cancelDeleteSummary}
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
              onClick={confirmDeleteSummary}
              disabled={deletingSummary}
              className="px-6 py-3 text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#F2742C" }}
              onMouseEnter={(e) => {
                if (!deletingSummary) {
                  e.currentTarget.style.backgroundColor = "#E55A1F";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#F2742C";
              }}
            >
              {deletingSummary ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Deleting...</span>
                </div>
              ) : (
                "Delete Summary"
              )}
            </button>
          </DialogActions>
        </Dialog>

        {/* Delete Weekly Summary Confirmation Dialog */}
        <Dialog
          open={deleteWeeklySummaryConfirmOpen}
          onClose={cancelDeleteWeeklySummary}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: "16px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              border: "1px solid #AA855B",
            },
          }}
        >
          <DialogTitle
            sx={{
              backgroundColor: "#FAEFE2",
              color: "#32332D",
              fontWeight: 600,
              fontSize: "1.25rem",
              fontFamily: "'Poppins', sans-serif",
              borderBottom: "1px solid #AA855B",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Confirm Deletion</span>
            <button
              onClick={cancelDeleteWeeklySummary}
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
          </DialogTitle>

          <DialogContent sx={{ padding: "24px", backgroundColor: "#F5F5F5" }}>
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 mt-2"
                style={{ backgroundColor: "#FFF4E6" }}
              >
                <Trash2 className="w-8 h-8" style={{ color: "#D63B3B" }} />
              </div>
              <Typography
                variant="h6"
                className="font-['Poppins'] mb-4"
                style={{ color: "#32332D", fontWeight: 800 }}
              >
                Delete Weekly Summary?
              </Typography>
              <Typography
                className="text-sm font-['Poppins'] mb-4"
                style={{ color: "#AA855B" }}
              >
                Are you sure you want to delete this weekly summary?
                <br />
                This action cannot be undone.
              </Typography>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-2">
                <div className="flex items-center justify-center space-x-2">
                  <AlertTriangle
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: "#D63B3B" }}
                  />
                  <Typography
                    className="font-['Poppins']"
                    style={{
                      color: "#722F37",
                      fontSize: "13px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    This will permanently remove this weekly summary and all
                    associated data.
                  </Typography>
                </div>
              </div>
            </div>
          </DialogContent>

          <DialogActions
            sx={{
              padding: "16px 24px",
              backgroundColor: "#FAEFE2",
              borderTop: "1px solid #AA855B",
            }}
          >
            <button
              onClick={cancelDeleteWeeklySummary}
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
              onClick={confirmDeleteWeeklySummary}
              disabled={deletingWeeklySummary}
              className="px-6 py-3 text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#F2742C" }}
              onMouseEnter={(e) => {
                if (!deletingWeeklySummary) {
                  e.currentTarget.style.backgroundColor = "#E55A1F";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#F2742C";
              }}
            >
              {deletingWeeklySummary ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Deleting...</span>
                </div>
              ) : (
                "Delete Summary"
              )}
            </button>
          </DialogActions>
        </Dialog>

        {/* Progressive Onboarding Modals */}

        {/* Add Your First Child Modal */}
        <Dialog
          open={(() => {
            console.log(
              "🔍 Add Your First Child Modal render - showAddFirstChildModal:",
              showAddFirstChildModal,
            );
            return showAddFirstChildModal;
          })()}
          onClose={handleCancelAddFirstChild}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: { xs: "16px", sm: "16px", md: "24px" },
              boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              position: "relative",
              border: "1px solid #AA855B",
              padding: "0 0 8px 0",
              margin: { xs: "16px", sm: "16px" },
              maxHeight: { xs: "90vh", sm: "90vh" },
              maxWidth: { xs: "calc(100% - 32px)", sm: "500px" },
              // backgroundColor: '#EDEDED',
            },
          }}
        >
          {/* X Close Button */}
          <button
            onClick={handleCancelAddFirstChild}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-gray-100 z-10"
            style={{ color: "#AA855B" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#F5F5F5";
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
              padding: {
                xs: "20px 16px 0 16px",
                sm: "24px 24px 0 24px",
                md: "32px 32px 0 32px",
              },
            }}
          >
            <div className="flex justify-center items-center mb-3 sm:mb-4">
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-110"
                style={{ backgroundColor: "#326586" }}
              >
                <Baby className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
              </div>
            </div>
            <div
              className="text-lg sm:text-xl md:text-2xl font-bold font-['Poppins'] mt-2 sm:mt-3 mb-2 sm:mb-3"
              style={{ color: "#32332D" }}
            >
              Add Your First Child
            </div>
            <p
              className="text-sm sm:text-base max-w-md mx-auto mt-1 sm:mt-2"
              style={{ color: "#AA855B" }}
            >
              Add your child's profile to create personalized diary entries and
              get tailored parenting advice
            </p>
          </DialogTitle>

          <DialogContent
            sx={{
              padding: {
                xs: "0 16px 8px 16px",
                sm: "0 24px 8px 24px",
                md: "0 32px 8px 32px",
              },
            }}
          >
            <div
              className="rounded-xl py-3 px-4 sm:py-4 sm:px-5 md:py-4 md:px-6 mt-3 sm:mt-4 md:mt-5"
              style={{
                backgroundColor: "#F5F5F5",
                border: "1px solid #AA855B",
              }}
            >
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#0F5648" }}
                  >
                    <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <Typography
                    sx={{
                      color: "#32332D",
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: { xs: "12px", sm: "13px", md: "14px" },
                    }}
                  >
                    Track your child's development
                  </Typography>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#0F5648" }}
                  >
                    <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <Typography
                    sx={{
                      color: "#32332D",
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: { xs: "12px", sm: "13px", md: "14px" },
                    }}
                  >
                    Receive age-appropriate recommendations
                  </Typography>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#0F5648" }}
                  >
                    <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <Typography
                    sx={{
                      color: "#32332D",
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: { xs: "12px", sm: "13px", md: "14px" },
                    }}
                  >
                    Create child-specific diary entries
                  </Typography>
                </div>
              </div>
            </div>
          </DialogContent>

          <DialogActions
            sx={{
              padding: { xs: "12px 16px", sm: "14px 20px", md: "16px 24px" },
              justifyContent: "center",
              gap: { xs: "8px", sm: "10px", md: "8px" },
              flexDirection: { xs: "column-reverse", sm: "row" },
            }}
          >
            <button
              onClick={handleCancelAddFirstChild}
              className="w-full sm:w-auto px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 border rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-sm sm:text-base"
              style={{
                borderColor: "#AA855B",
                color: "#AA855B",
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F5F5F5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAddFirstChildClick}
              className="w-full sm:w-auto px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] shadow-lg hover:shadow-xl text-sm sm:text-base"
              style={{ backgroundColor: "#F2742C" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#E55A1F";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#F2742C";
              }}
            >
              Add Child
            </button>
          </DialogActions>
        </Dialog>

        {/* Success Modal */}
        <Dialog
          open={(() => {
            console.log(
              "🔍 Success Modal render - showSuccessModal:",
              showSuccessModal,
            );
            return showSuccessModal;
          })()}
          onClose={handleSuccessModalCancel}
          maxWidth="sm"
          fullWidth
          sx={{ zIndex: 2000 }} // Much higher z-index to ensure it appears on top
          PaperProps={{
            sx: {
              borderRadius: "24px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              position: "relative",
              border: "1px solid #AA855B",
              padding: "0 0 8px 0",
            },
          }}
        >
          {/* X Close Button */}
          <button
            onClick={handleSuccessModalCancel}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-gray-100 z-10"
            style={{ color: "#AA855B" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#F5F5F5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <X className="w-5 h-5" />
          </button>

          <DialogTitle
            sx={{ textAlign: "center", padding: "32px 32px 0 32px" }}
          >
            <div className="flex justify-center items-center mb-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-110"
                style={{ backgroundColor: "#722F37" }}
              >
                <Heart className="w-8 h-8 text-white" />
              </div>
            </div>
            <div
              className="text-2xl font-bold font-['Poppins'] mt-3 mb-3"
              style={{ color: "#32332D" }}
            >
              Child Added Successfully!
            </div>
            <p
              className="text-base max-w-md mx-auto mt-2"
              style={{ color: "#AA855B", fontSize: "16px" }}
            >
              Great! Now you can create personalized diary entries for{" "}
              {newlyAddedChild?.name}
            </p>
          </DialogTitle>

          <DialogContent sx={{ padding: "0 32px 8px 32px" }}>
            <div
              className="rounded-xl py-4 px-8 mt-5"
              style={{
                backgroundColor: "#F5F5F5",
                border: "1px solid #AA855B",
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  {newlyAddedChild && (
                    <div>
                      <div className="flex items-center mb-2">
                        <div
                          className="w-4 h-4 rounded-full mr-2"
                          style={{
                            backgroundColor:
                              newlyAddedChild.color_code || "#326586",
                          }}
                        />
                        <Typography
                          className="text-base font-semibold font-['Poppins']"
                          style={{
                            color: "#32332D",
                            fontFamily: "'Poppins', sans-serif",
                            fontSize: "16px",
                            fontWeight: 600,
                          }}
                        >
                          {newlyAddedChild.name}
                        </Typography>
                      </div>
                      <Typography
                        className="text-sm font-['Poppins']"
                        style={{
                          color: "#AA855B",
                          fontFamily: "'Poppins', sans-serif",
                          fontSize: "16px",
                          fontWeight: 400,
                        }}
                      >
                        {calculateAge(newlyAddedChild.birthdate || "")} years
                        old •{" "}
                        {newlyAddedChild.gender?.charAt(0).toUpperCase() +
                          newlyAddedChild.gender?.slice(1)}{" "}
                        •{" "}
                        {newlyAddedChild.developmental_stage
                          ?.charAt(0)
                          .toUpperCase() +
                          newlyAddedChild.developmental_stage?.slice(1)}
                      </Typography>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>

          <DialogActions
            sx={{
              padding: "16px 24px",
              justifyContent: "center",
            }}
          >
            <button
              onClick={handleSuccessModalContinue}
              className="px-6 py-3 text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] shadow-lg hover:shadow-xl"
              style={{ backgroundColor: "#F2742C" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#E55A1F";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#F2742C";
              }}
            >
              Create Diary Entry
            </button>
          </DialogActions>
        </Dialog>

        {/* Filters Drawer */}
        {renderFiltersDrawer()}

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
    </div>
  );
};

export default DiaryPage;
