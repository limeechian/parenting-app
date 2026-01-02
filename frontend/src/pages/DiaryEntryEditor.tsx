// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: DiaryEntryEditor.tsx
// Description: To provide interface for parent users to create and edit diary entries
// First Written on: Thursday, 02-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state, lifecycle, refs, and callbacks
import React, { useState, useEffect, useRef, useCallback } from "react";
// Import React Router hooks for navigation and URL parameters
import { useNavigate, useParams } from "react-router-dom";
// Import API functions for diary entry operations
import {
  getChildren,
  updateDiaryEntry,
  getDiaryEntry,
  createDiaryDraft,
  getDiaryAttachments,
  deleteDiaryAttachment,
  createDiaryAttachment,
} from "../services/api";
// Import Supabase configuration for file uploads
import { supabase, DIARY_ATTACHMENTS_BUCKET } from "../config/supabase";
// Import custom components
import AttachmentGallery from "../components/AttachmentGallery";
import ChangeEntryTypeModal from "../components/ChangeEntryTypeModal";
// Import toast notification components
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Import Material-UI components for form elements
import { Autocomplete, Chip, TextField, Button } from "@mui/material";
// Import lucide-react icons for UI elements
import {
  BookOpen,
  Save,
  X,
  Smile,
  Frown,
  Meh,
  Annoyed,
  SmilePlus,
  Laugh,
  ArrowLeft,
  Camera,
  ChevronDown,
  ChevronUp,
  Video,
  Play,
} from "lucide-react";

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
 * DiaryEntryEditor Component
 * 
 * Provides interface for parent users to create and edit diary entries.
 * Features include:
 * - Multiple entry type templates (free-form, daily behavior, emotional tracking, etc.)
 * - Child selection
 * - Mood tracking (parent and child)
 * - Tag management
 * - Attachment support (images and videos)
 * - Draft system
 * - Form validation
 * 
 * @returns JSX element representing the diary entry editor
 */
const DiaryEntryEditor: React.FC = () => {
  // React Router hooks
  const navigate = useNavigate();  // Navigation function for programmatic routing
  const { entryId } = useParams<{ entryId: string }>();  // Entry ID from URL (for editing)
  
  // Refs for component state management
  const hasProcessedData = useRef(false);  // Flag to prevent duplicate data processing
  
  // Component state management
  const [children, setChildren] = useState<any[]>([]);  // List of user's children
  const [editingEntry, setEditingEntry] = useState<any>(null);  // Entry being edited (if any)
  const [newEntryDate, setNewEntryDate] = useState<Date | null>(null);  // Date for the entry
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");  // Selected entry type template
  const [newEntryChildId, setNewEntryChildId] = useState<string>("");  // Selected child ID
  const [tagInput, setTagInput] = useState("");  // Input for adding new tags
  const [focusedModalSelect, setFocusedModalSelect] = useState<string | null>(null);  // Which modal select is focused
  const [moodDropdownOpen, setMoodDropdownOpen] = useState<"parentMood" | "childMood" | null>(null);  // Which mood dropdown is open
  const parentMoodDropdownRef = useRef<HTMLDivElement>(null);  // Ref for parent mood dropdown
  const childMoodDropdownRef = useRef<HTMLDivElement>(null);  // Ref for child mood dropdown

  // Draft system state
  const [showDraftDialog, setShowDraftDialog] = useState(false);  // Whether draft dialog is shown
  const [pendingTemplateChange, setPendingTemplateChange] = useState<string>("");  // Template change pending confirmation
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);  // Whether form has unsaved changes

  // Attachments state
  const [attachments, setAttachments] = useState<any[]>([]);  // Existing attachments
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);  // Newly selected files
  const [selectedFilePreviews, setSelectedFilePreviews] = useState<string[]>([]);  // Preview URLs for selected files
  const [attachmentError, setAttachmentError] = useState("");  // Error message for attachments

  /**
   * Form data state
   * Contains all form fields for different entry types
   */
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

  /**
   * Effect hook to fetch children data when component mounts
   * Sets default child selection if not already set
   */
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const childrenData = await getChildren();
        setChildren(childrenData);
        // If newEntryChildId is not set from draft, set to first child
        if (!newEntryChildId && childrenData.length > 0) {
          setNewEntryChildId(childrenData[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch children:", error);
      }
    };
    fetchChildren();
  }, [newEntryChildId]);

  /**
   * Effect hook to sync newEntryChildId to formData.childId
   * Ensures form data stays in sync with child selection
   */
  useEffect(() => {
    if (newEntryChildId && !formData.childId) {
      setFormData((prev: any) => ({ ...prev, childId: newEntryChildId }));
    }
  }, [newEntryChildId, formData.childId]);

  /**
   * Loads entry data for editing
   * Fetches entry from API and populates form fields
   * 
   * @param entryId - ID of the entry to load
   */
  const loadEntryData = useCallback(async (entryId: number) => {
    try {
      const entry = await getDiaryEntry(entryId);

      // Set basic entry info
      setNewEntryDate(new Date(entry.entry_date));
      setNewEntryChildId(entry.child_id?.toString() || "");
      setSelectedTemplate(entry.entry_type);

      // Convert database field names to form field names (same as DiaryPage.tsx)
      setFormData({
        title: entry.title || "",
        content: entry.content || "",
        parentMood: entry.parent_mood || "happy", // Default to 'happy' if null
        childMood: entry.child_mood || "happy", // Default to 'happy' if null
        childId: entry.child_id?.toString() || "", // Add childId to formData
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
        wouldUseAgain: entry.would_use_again || true,
        skillsObserved: entry.skills_observed || [],
        improvements: entry.improvements_observed || "",
        setbacks: entry.setbacks_concerns || "",
        nextGoals: entry.next_goals || "",
        professionalRecommendations: entry.professional_recommendations || "",
      });

      setEditingEntry(entry);

      // Load existing attachments for this entry
      await loadAttachments(entryId);
    } catch (error) {
      console.error("Error loading entry data:", error);
    }
  }, []);

  // Load data on component mount - prioritize sessionStorage over database
  useEffect(() => {
    // Reset processing flag when entryId changes (new navigation)
    hasProcessedData.current = false;

    const draftData = sessionStorage.getItem("diaryEntryDraft");
    console.log("🔍 DiaryEntryEditor - Checking sessionStorage:", draftData);

    if (draftData) {
      try {
        const parsed = JSON.parse(draftData);
        console.log(
          "🔍 DiaryEntryEditor - Parsed sessionStorage data:",
          parsed,
        );

        if (parsed.date) {
          setNewEntryDate(new Date(parsed.date));
        }
        if (parsed.childId) {
          console.log(
            "🔍 DiaryEntryEditor - Setting formData.childId to:",
            parsed.childId,
          );
          setFormData((prev: any) => ({ ...prev, childId: parsed.childId }));
        }
        if (parsed.template) {
          setSelectedTemplate(parsed.template);
        }
        if (parsed.formData) {
          console.log(
            "🔍 DiaryEntryEditor - Setting formData from sessionStorage:",
            parsed.formData,
          );
          setFormData(parsed.formData);
        }
        if (parsed.editingEntry) {
          setEditingEntry(parsed.editingEntry);
        }

        // Load selected files and attachments from sessionStorage
        if (parsed.selectedFiles) {
          setSelectedFiles(deserializeFiles(parsed.selectedFiles));
          // Note: We can't recreate previews from deserialized files, so clear previews
          // User will need to re-select files if they want to see previews
          setSelectedFilePreviews([]);
        }
        if (parsed.attachments) {
          setAttachments(parsed.attachments);
        }

        // Clear the sessionStorage data after processing
        sessionStorage.removeItem("diaryEntryDraft");
        console.log("🔍 DiaryEntryEditor - Cleared sessionStorage data");

        // Mark as processed
        hasProcessedData.current = true;
      } catch (error) {
        console.error("Error loading draft data:", error);
      }
    } else if (entryId) {
      console.log(
        "🔍 DiaryEntryEditor - No sessionStorage data, loading from database for entryId:",
        entryId,
      );
      // Only load from database if no sessionStorage data exists
      loadEntryData(parseInt(entryId));

      // Mark as processed
      hasProcessedData.current = true;
    }
  }, [entryId, loadEntryData]);

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

  // Draft management functions
  const saveAsDraft = async () => {
    try {
      const draftData = {
        child_id: formData.childId ? parseInt(formData.childId) : null,
        entry_date: newEntryDate
          ? newEntryDate.toISOString().split("T")[0]
          : null,
        entry_type: selectedTemplate || "free-form",
        title: formData.title || "Untitled Entry",
        form_data: { ...formData },
      };

      await createDiaryDraft(draftData);

      // Draft saved successfully
      setShowDraftDialog(false);
      setHasUnsavedChanges(false);

      // Smart field mapping - preserve common fields
      const commonFields = {
        title: formData.title || "",
        parentMood: formData.parentMood || "happy",
        childMood: formData.childMood || "happy",
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

      const { toast } = await import("react-toastify");
      toast.success("Draft saved successfully!");
    } catch (error) {
      console.error("Error saving draft:", error);
      const { toast } = await import("react-toastify");
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
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleChipsFieldChange = (field: string, values: string[]) => {
    setFormData((prev: any) => ({ ...prev, [field]: normalizeTokens(values) }));
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
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleFormChange("title", e.target.value)}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
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
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Content
            </label>
            <textarea
              rows={6}
              value={formData.content}
              onChange={(e) => handleFormChange("content", e.target.value)}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
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
        <div className="space-y-4 sm:space-y-6">
          <div>
            <label
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleFormChange("title", e.target.value)}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
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
              className="block text-xs sm:text-sm font-medium mb-1"
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
              className="block text-xs sm:text-sm font-medium mb-1"
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
              className="block text-xs sm:text-sm font-medium mb-1"
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
                className="block text-xs sm:text-sm font-medium mb-1"
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
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 custom-select text-xs sm:text-sm"
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
                className="block text-xs sm:text-sm font-medium mb-1"
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
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 custom-select text-xs sm:text-sm"
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
              className="block text-xs sm:text-sm font-medium mb-1"
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
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleFormChange("title", e.target.value)}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label
                className="block text-xs sm:text-sm font-medium mb-2"
                style={{ color: "#32332D" }}
              >
                Child's Emotion Intensity (1-10)
              </label>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span
                  className="text-xs sm:text-sm"
                  style={{ color: "#AA855B" }}
                >
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
                <span
                  className="text-xs sm:text-sm"
                  style={{ color: "#AA855B" }}
                >
                  High
                </span>
                <span
                  className="text-xs sm:text-sm font-medium w-6 sm:w-8"
                  style={{ color: "#32332D" }}
                >
                  {formData.emotionIntensity}
                </span>
              </div>
            </div>

            <div>
              <label
                className="block text-xs sm:text-sm font-medium mb-2"
                style={{ color: "#32332D" }}
              >
                Your Stress Level (1-10)
              </label>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span
                  className="text-xs sm:text-sm"
                  style={{ color: "#AA855B" }}
                >
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
                <span
                  className="text-xs sm:text-sm"
                  style={{ color: "#AA855B" }}
                >
                  High
                </span>
                <span
                  className="text-xs sm:text-sm font-medium w-6 sm:w-8"
                  style={{ color: "#32332D" }}
                >
                  {formData.stressLevel}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label
              className="block text-xs sm:text-sm font-medium mb-1"
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
              className="block text-xs sm:text-sm font-medium mb-1"
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
              className="block text-xs sm:text-sm font-medium mb-1"
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
              className="block text-xs sm:text-sm font-medium mb-1"
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
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
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
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleFormChange("title", e.target.value)}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
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
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Situation Description
            </label>
            <textarea
              rows={3}
              value={formData.situation}
              onChange={(e) => handleFormChange("situation", e.target.value)}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
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
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Intervention Used
            </label>
            <textarea
              rows={3}
              value={formData.intervention}
              onChange={(e) => handleFormChange("intervention", e.target.value)}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
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
              className="block text-xs sm:text-sm font-medium mb-1"
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
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
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
              className="block text-xs sm:text-sm font-medium mb-2"
              style={{ color: "#32332D" }}
            >
              Effectiveness Rating (1-10)
            </label>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="text-xs sm:text-sm" style={{ color: "#AA855B" }}>
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
              <span className="text-xs sm:text-sm" style={{ color: "#AA855B" }}>
                Excellent
              </span>
              <span
                className="text-xs sm:text-sm font-medium w-6 sm:w-8"
                style={{ color: "#32332D" }}
              >
                {formData.effectivenessRating}
              </span>
            </div>
          </div>

          <div>
            <label
              className="block text-xs sm:text-sm font-medium mb-2"
              style={{ color: "#32332D" }}
            >
              Would you use this intervention again?
            </label>
            <div className="flex items-center space-x-3 sm:space-x-4">
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
                <span
                  className="text-xs sm:text-sm"
                  style={{ color: "#32332D" }}
                >
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
        <div className="space-y-4 sm:space-y-6">
          <div>
            <label
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleFormChange("title", e.target.value)}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
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
              className="block text-xs sm:text-sm font-medium mb-1"
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
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Improvements Observed
            </label>
            <textarea
              rows={3}
              value={formData.improvements}
              onChange={(e) => handleFormChange("improvements", e.target.value)}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
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
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Setbacks or Concerns
            </label>
            <textarea
              rows={3}
              value={formData.setbacks}
              onChange={(e) => handleFormChange("setbacks", e.target.value)}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
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
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Next Goals
            </label>
            <textarea
              rows={2}
              value={formData.nextGoals}
              onChange={(e) => handleFormChange("nextGoals", e.target.value)}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
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
              className="block text-xs sm:text-sm font-medium mb-1"
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
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
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

    return null;
  };

  const handleSaveEntry = async () => {
    try {
      // Prepare entry data for API
      const entryData = {
        child_id: formData.childId ? parseInt(formData.childId) : null,
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

      // Clear draft data
      sessionStorage.removeItem("diaryEntryDraft");

      // Set success message in sessionStorage for DiaryPage to show
      sessionStorage.setItem(
        "diaryEntrySuccessMessage",
        "Diary entry saved successfully!",
      );

      // Navigate back to diary page
      navigate("/diary");
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
      const entryData = {
        child_id: formData.childId ? parseInt(formData.childId) : null,
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

      // Update the entry
      await updateDiaryEntry(editingEntry.entry_id, entryData);

      // Upload attachments if any
      if (selectedFiles.length > 0) {
        await uploadAttachments(editingEntry.entry_id);
      }

      // Clear draft data
      sessionStorage.removeItem("diaryEntryDraft");

      // Set success message in sessionStorage for DiaryPage to show
      sessionStorage.setItem(
        "diaryEntrySuccessMessage",
        "Diary entry updated successfully!",
      );

      // Navigate back to diary page
      navigate("/diary");
    } catch (error) {
      console.error("Error updating diary entry:", error);
      const { toast } = await import("react-toastify");
      toast.error("Failed to update diary entry. Please try again.");
    }
  };

  const handleBackToModal = () => {
    // Check if we're on desktop (screen width >= 1024px)
    const isDesktop = window.innerWidth >= 1024;

    // Create a mutable copy of editingEntry if it exists
    const currentEditingEntry = editingEntry ? { ...editingEntry } : null;

    // If in edit mode, update the child_id in the editingEntry object
    if (currentEditingEntry && formData.childId) {
      currentEditingEntry.child_id = parseInt(formData.childId);
    }

    // Save current form data to sessionStorage
    const entryData = {
      date: newEntryDate,
      childId: formData.childId, // Use formData.childId instead of newEntryChildId
      template: selectedTemplate,
      formData: formData,
      editingEntry: currentEditingEntry, // Use the potentially updated editingEntry
      selectedFiles: serializeFiles(selectedFiles), // Serialize files for sessionStorage
      attachments: attachments, // Include existing attachments for edit mode
      timestamp: Date.now(), // Add timestamp to ensure fresh data
    };

    console.log("🔍 DiaryEntryEditor - Storing data for modal:", entryData);
    console.log(
      "🔍 DiaryEntryEditor - Current formData.childId:",
      formData.childId,
    );
    console.log(
      "🔍 DiaryEntryEditor - Current editingEntry (after update):",
      currentEditingEntry,
    );

    sessionStorage.setItem("diaryEntryDraft", JSON.stringify(entryData));

    // Only set flag to open modal on desktop (mobile/tablet should just navigate back)
    if (isDesktop) {
      sessionStorage.setItem("shouldOpenDiaryModal", "true"); // Set flag to open modal
    }

    // Navigate back to diary page (modal will be reopened with data on desktop only)
    navigate("/diary");
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

    try {
      for (const file of selectedFiles) {
        // Upload directly to Supabase Storage like Profile.tsx does
        const fileExt = file.name.split(".").pop();
        const fileName = `${entryId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        // Upload to Supabase Storage
        const { error } = await supabase.storage
          .from(DIARY_ATTACHMENTS_BUCKET)
          .upload(fileName, file);

        if (error) {
          throw new Error(`Upload failed: ${error.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(DIARY_ATTACHMENTS_BUCKET)
          .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;

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

        await createDiaryAttachment(entryId, attachmentData);
      }

      setSelectedFiles([]);
      setSelectedFilePreviews([]);
      const { toast } = await import("react-toastify");
      toast.success("Attachments uploaded successfully!");
    } catch (error) {
      console.error("Error uploading attachments:", error);
      const { toast } = await import("react-toastify");
      toast.error("Failed to upload attachments");
    }
  };

  const loadAttachments = async (entryId: number) => {
    try {
      const response = await getDiaryAttachments(entryId);
      setAttachments(response.attachments || []);
    } catch (error) {
      console.error("Error loading attachments:", error);
    }
  };

  const deleteAttachment = async (attachmentId: number) => {
    try {
      await deleteDiaryAttachment(attachmentId);
      setAttachments((prev) =>
        prev.filter((att) => att.attachment_id !== attachmentId),
      );
      const { toast } = await import("react-toastify");
      toast.success("Attachment deleted successfully!");
    } catch (error) {
      console.error("Error deleting attachment:", error);
      const { toast } = await import("react-toastify");
      toast.error("Failed to delete attachment");
    }
  };

  return (
    <div
      className="min-h-screen font-['Poppins']"
      style={{ backgroundColor: "#F5F5F5" }}
    >
      <style>
        {`
          /* Custom dropdown arrow styling */
          .custom-select {
            appearance: none;
            background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2332332D' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
            background-repeat: no-repeat;
            background-position: right 12px center;
            background-size: 16px;
            padding-right: 40px;
          }
          
          /* Dropdown option styling */
          .custom-select option {
            background-color: white;
            color: #32332D;
            padding: 8px 12px;
          }
          
          .custom-select option:hover {
            background-color: #E0F2F1;
            color: #32332D;
          }
          
          .custom-select option:checked {
            background-color: #E0F2F1;
            color: #32332D;
          }
        `}
      </style>

      {/* Fixed Header Bar */}
      <div
        className="sticky top-0 z-10 border-b py-2 sm:py-3"
        style={{ backgroundColor: "#FAEFE2", borderColor: "#AA855B" }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <button
                onClick={handleBackToModal}
                className="p-1.5 sm:p-2 rounded-lg transition-all duration-200 hover:bg-opacity-50 flex-shrink-0"
                style={{
                  backgroundColor: "transparent",
                  color: "#AA855B",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#F0DCC9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#F5F3F0";
                }}
                title="Back to Modal"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <div
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#F2742C" }}
                >
                  <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1
                    className="font-bold text-sm sm:text-base lg:text-xl truncate"
                    style={{
                      color: "#32332D",
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    <span className="hidden sm:inline">
                      {editingEntry ? "Edit Diary Entry" : "New Diary Entry"}
                    </span>
                    <span className="sm:hidden">
                      {editingEntry ? "Edit Entry" : "New Entry"}
                    </span>
                    {newEntryDate && (
                      <span
                        className="text-xs sm:text-sm font-normal ml-1 sm:ml-2 block sm:inline"
                        style={{ color: "#AA855B" }}
                      >
                        for {newEntryDate.getDate()}/
                        {newEntryDate.getMonth() + 1}/
                        {newEntryDate.getFullYear()}
                      </span>
                    )}
                  </h1>
                </div>
              </div>
            </div>

            <button
              onClick={editingEntry ? handleUpdateEntry : handleSaveEntry}
              className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3 rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm shadow-lg hover:shadow-xl flex-shrink-0"
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
              <span className="hidden sm:inline">
                {editingEntry ? "Update Entry" : "Add Entry"}
              </span>
              <span className="sm:hidden">
                {editingEntry ? "Update" : "Add"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Centered with margins like ParentDashboard */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Compact Toolbar - 4 fields in one row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div>
            <label
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Date
            </label>
            <input
              type="date"
              value={
                newEntryDate
                  ? `${newEntryDate.getFullYear()}-${String(newEntryDate.getMonth() + 1).padStart(2, "0")}-${String(newEntryDate.getDate()).padStart(2, "0")}`
                  : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`
              }
              onChange={(e) => {
                const [year, month, day] = e.target.value
                  .split("-")
                  .map(Number);
                setNewEntryDate(new Date(year, month - 1, day));
              }}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
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
                className="block text-xs sm:text-sm font-medium mb-1"
                style={{ color: "#32332D" }}
              >
                This entry is about:
              </label>
              <div className="relative">
                <select
                  value={formData.childId}
                  onChange={(e) => handleFormChange("childId", e.target.value)}
                  onFocus={() => {
                    setFocusedModalSelect("child");
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
                        getInputBlurStyles(formData.childId),
                      );
                    }
                  }}
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 custom-select text-xs sm:text-sm"
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
                      {child.name} ({calculateAge(child.birthdate)} years old)
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

          <div>
            <label
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Your Mood
            </label>
            <div className="relative" ref={parentMoodDropdownRef}>
              <button
                type="button"
                onClick={() =>
                  setMoodDropdownOpen(
                    moodDropdownOpen === "parentMood" ? null : "parentMood",
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
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-left flex items-center text-xs sm:text-sm"
                style={{
                  ...getInputStyles(formData.parentMood),
                }}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {(() => {
                    const moodData =
                      moodIcons[formData.parentMood as keyof typeof moodIcons];
                    const MoodIcon = moodData?.icon || moodIcons.neutral.icon;
                    return (
                      <MoodIcon
                        size={16}
                        className="sm:w-[18px] sm:h-[18px]"
                        style={{
                          color: moodData?.color || moodIcons.neutral.color,
                        }}
                      />
                    );
                  })()}
                  <span className="truncate">
                    {formData.parentMood
                      ? formData.parentMood.charAt(0).toUpperCase() +
                        formData.parentMood.slice(1)
                      : "Select mood"}
                  </span>
                </div>
                {moodDropdownOpen === "parentMood" ? (
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
              </button>
              {moodDropdownOpen === "parentMood" && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-[#AA855B] rounded-lg shadow-lg max-h-60 overflow-auto">
                  {Object.keys(moodIcons).map((mood) => {
                    const moodData = moodIcons[mood as keyof typeof moodIcons];
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
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Child's Mood
            </label>
            <div className="relative" ref={childMoodDropdownRef}>
              <button
                type="button"
                onClick={() =>
                  setMoodDropdownOpen(
                    moodDropdownOpen === "childMood" ? null : "childMood",
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
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-left flex items-center text-xs sm:text-sm"
                style={{
                  ...getInputStyles(formData.childMood),
                }}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {(() => {
                    const moodData =
                      moodIcons[formData.childMood as keyof typeof moodIcons];
                    const MoodIcon = moodData?.icon || moodIcons.neutral.icon;
                    return (
                      <MoodIcon
                        size={16}
                        className="sm:w-[18px] sm:h-[18px]"
                        style={{
                          color: moodData?.color || moodIcons.neutral.color,
                        }}
                      />
                    );
                  })()}
                  <span className="truncate">
                    {formData.childMood
                      ? formData.childMood.charAt(0).toUpperCase() +
                        formData.childMood.slice(1)
                      : "Select mood"}
                  </span>
                </div>
                {moodDropdownOpen === "childMood" ? (
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
              </button>
              {moodDropdownOpen === "childMood" && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-[#AA855B] rounded-lg shadow-lg max-h-60 overflow-auto">
                  {Object.keys(moodIcons).map((mood) => {
                    const moodData = moodIcons[mood as keyof typeof moodIcons];
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

        {/* Entry Type Section - 5 templates in one row */}
        <div className="mb-4 sm:mb-6">
          <div className="mb-2 sm:mb-3">
            <label
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Entry Type
            </label>
            <p
              className="text-[10px] sm:text-xs text-gray-600"
              style={{ color: "#AA855B" }}
            >
              How would you like to record today? Select the entry type that
              best fits your parenting situation
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
            <button
              onClick={() => !editingEntry && handleTemplateChange("free-form")}
              disabled={editingEntry !== null}
              className={`p-2.5 sm:p-3 border rounded-lg text-left transition-all duration-200 transform ${
                selectedTemplate === "" || selectedTemplate === "free-form"
                  ? "shadow-md"
                  : editingEntry
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:shadow-lg hover:-translate-y-1 border-opacity-50 hover:border-opacity-75"
              }`}
              style={{
                borderColor:
                  selectedTemplate === "" || selectedTemplate === "free-form"
                    ? "transparent"
                    : "#AA855B",
                backgroundColor:
                  selectedTemplate === "" || selectedTemplate === "free-form"
                    ? "#AA855B"
                    : "transparent",
              }}
            >
              <h4
                className="font-medium text-xs sm:text-sm"
                style={{
                  color:
                    selectedTemplate === "" || selectedTemplate === "free-form"
                      ? "#FFFFFF"
                      : "#32332D",
                }}
              >
                Free-form Entry
              </h4>
              <p
                className="text-[10px] sm:text-xs mt-0.5 sm:mt-1"
                style={{
                  color:
                    selectedTemplate === "" || selectedTemplate === "free-form"
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
                className={`p-2.5 sm:p-3 border rounded-lg text-left transition-all duration-200 transform ${
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
                  className="font-medium text-xs sm:text-sm"
                  style={{
                    color:
                      selectedTemplate === template.id ? "#FFFFFF" : "#32332D",
                  }}
                >
                  {template.name}
                </h4>
                <p
                  className="text-[10px] sm:text-xs mt-0.5 sm:mt-1"
                  style={{
                    color:
                      selectedTemplate === template.id ? "#F5F5F5" : "#AA855B",
                  }}
                >
                  {template.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t mb-6" style={{ borderColor: "#AA855B" }}></div>

        {/* Dynamic Template Content Section */}
        <div className="mb-6">{renderDynamicForm()}</div>

        {/* Divider */}
        <div className="border-t mb-6" style={{ borderColor: "#AA855B" }}></div>

        {/* Bottom Section */}
        <div className="space-y-4">
          {/* Tags Section */}
          <div>
            <label
              className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
              style={{ color: "#32332D" }}
            >
              Tags
              <span className="hidden sm:inline text-xs text-gray-500 ml-2">
                Press comma or click Add to create a tag
              </span>
              <span className="sm:hidden text-[10px] text-gray-500 ml-1">
                Press comma or click Add
              </span>
            </label>

            {/* Tag Input */}
            <div className="flex space-x-2 mb-2 sm:mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagKeyPress}
                className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
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
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm"
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
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {formData.tags.map((tag: string, index: number) => (
                  <div
                    key={index}
                    className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium transition-all duration-200"
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
                      className="ml-1.5 sm:ml-2 hover:bg-gray-200 rounded-full p-0.5 transition-colors duration-200"
                      style={{ color: "#0F5648" }}
                    >
                      <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attachments Section */}
          <div>
            <label
              className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
              style={{ color: "#32332D" }}
            >
              Attachments
            </label>

            {/* File Upload Area */}
            <div
              className="border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-all duration-200 hover:bg-gray-50"
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
              <div className="space-y-1.5 sm:space-y-2">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#F5F3F0" }}
                >
                  <Camera
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    style={{ color: "#AA855B" }}
                  />
                </div>
                <div>
                  <p
                    className="text-xs sm:text-sm font-medium"
                    style={{ color: "#32332D" }}
                  >
                    Drop files here or click to upload
                  </p>
                  <p
                    className="text-[10px] sm:text-xs"
                    style={{ color: "#AA855B" }}
                  >
                    Images, Videos (max 10MB each)
                  </p>
                </div>
                <label
                  htmlFor="diary-attachments-upload"
                  className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg cursor-pointer transition-all duration-200"
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

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="mt-3 sm:mt-4">
                <label
                  className="block text-xs sm:text-sm font-medium mb-2"
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
                        <X className="w-4 h-4" style={{ color: "#32332D" }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing Attachments (for Edit mode) */}
            {editingEntry && attachments.length > 0 && (
              <AttachmentGallery
                attachments={attachments}
                onDelete={deleteAttachment}
                showActions={true}
                maxThumbnails={6}
              />
            )}
          </div>
        </div>
      </div>

      {/* Template Change Warning Dialog */}
      <ChangeEntryTypeModal
        open={showDraftDialog}
        onClose={cancelTemplateChange}
        onCancel={cancelTemplateChange}
        onDiscard={discardChanges}
        onSave={saveAsDraft}
      />

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

export default DiaryEntryEditor;
