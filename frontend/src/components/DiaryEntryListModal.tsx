// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: DiaryEntryListModal.tsx
// Description: To provide modal component for displaying and managing list of diary entries
// First Written on: Thursday, 02-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state and lifecycle management
import React, { useState, useEffect, useCallback } from "react";
// Import API functions for diary entry operations
import { getDiaryEntries, deleteDiaryEntry } from "../services/api";
// Import toast notification for user feedback
import { toast } from "react-toastify";
// Import lucide-react icons for UI elements
import {
  User,
  Baby,
  Clock,
  Trash2,
  X,
  BookOpen,
  Smile,
  Frown,
  Meh,
  Annoyed,
  SmilePlus,
  Laugh,
  Edit,
} from "lucide-react";

/**
 * Formats tag/field value for display
 * Converts strings with underscores to human-readable labels
 * 
 * @param value - String value (may contain underscores)
 * @returns Formatted display string
 */
const formatFieldValue = (value: string): string => {
  if (!value) return "";
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
  created_at: string;
  child_name?: string;
  child_color?: string;
  // Template-specific fields
  observed_behaviors?: string[];
  challenges_encountered?: string[];
  strategies_used?: string[];
  effectiveness?: string;
  emotion_intensity?: number;
  stress_level?: number;
  triggers_identified?: string[];
  coping_strategies?: string[];
  situation_description?: string;
  intervention_used?: string;
  effectiveness_rating?: number;
  skills_observed?: string[];
  improvements_observed?: string;
  next_goals?: string;
}

/**
 * DiaryEntryListModalProps interface
 * Defines the properties needed to control the modal behavior
 */
interface DiaryEntryListModalProps {
  open: boolean;                              // Controls whether the modal is visible
  onClose: () => void;                         // Callback when modal is closed
  date: Date;                                  // Date for which to display entries
  onNewEntry: () => void;                      // Callback when user wants to create a new entry
  onEditEntry: (entry: DiaryEntry) => void;   // Callback when user wants to edit an entry
  onEntryDeleted?: () => void;                 // Callback to notify parent when entry is deleted
  children: Array<{                            // List of user's children for entry association
    child_id: number;
    name: string;
    color_code: string;
  }>;
}

/**
 * DiaryEntryListModal Component
 * 
 * Modal component that displays a list of diary entries for a specific date.
 * Features include:
 * - Display entries for selected date
 * - Edit and delete entry functionality
 * - Entry type categorization and color coding
 * - Mood indicators for parent and child
 * - Content preview based on entry type
 * - Delete confirmation dialog
 * 
 * @param props - Component props defined in DiaryEntryListModalProps interface
 * @returns JSX element representing the diary entry list modal
 */
const DiaryEntryListModal: React.FC<DiaryEntryListModalProps> = ({
  open,
  onClose,
  date,
  onNewEntry,
  onEditEntry,
  onEntryDeleted,
  children,
}) => {
  // Component state management
  const [entries, setEntries] = useState<DiaryEntry[]>([]);  // List of diary entries for the date
  const [loading, setLoading] = useState(false);             // Loading state during data fetch
  const [error, setError] = useState<string | null>(null);   // Error message to display
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);  // Whether delete confirmation dialog is open
  const [entryToDelete, setEntryToDelete] = useState<DiaryEntry | null>(null);  // Entry selected for deletion
  const [deleting, setDeleting] = useState(false);           // Loading state during deletion

  /**
   * Formats a date object to a human-readable string
   * 
   * @param date - Date object to format
   * @returns Formatted date string (e.g., "Monday, October 6, 2025")
   */
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-MY", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  /**
   * Formats a timestamp to a time string
   * 
   * @param timestamp - ISO timestamp string
   * @returns Formatted time string (e.g., "2:30 PM")
   */
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  /**
   * Returns the color code for an entry type
   * Different entry types have different colors for visual distinction
   * 
   * @param type - Entry type string
   * @returns Hex color code string
   */
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

  /**
   * Returns the human-readable label for an entry type
   * 
   * @param type - Entry type string
   * @returns Display label string
   */
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

  /**
   * Mood icon configuration mapping
   * Maps mood types to their corresponding icons and colors
   */
  const moodIcons = {
    happy: { icon: Smile, color: "#0F5648", bg: "#E8F5E8" },
    neutral: { icon: Meh, color: "#AA855B", bg: "#F5F3F0" },
    sad: { icon: Frown, color: "#326586", bg: "#E8F2F5" },
    frustrated: { icon: Annoyed, color: "#722F37", bg: "#F5E8E8" },
    proud: { icon: SmilePlus, color: "#F2742C", bg: "#FDF2E8" },
    excited: { icon: Laugh, color: "#F2742C", bg: "#FDF2E8" },
  };

  /**
   * Returns the appropriate mood icon component based on mood type
   * 
   * @param mood - Mood type string (optional)
   * @returns JSX element representing the mood icon
   */
  const getMoodIcon = (mood?: string) => {
    if (!mood) {
      const NeutralIcon = moodIcons.neutral.icon;
      return (
        <NeutralIcon
          className="w-4 h-4"
          style={{ color: moodIcons.neutral.color }}
        />
      );
    }

    const moodData = moodIcons[mood as keyof typeof moodIcons];
    if (!moodData) {
      const NeutralIcon = moodIcons.neutral.icon;
      return (
        <NeutralIcon
          className="w-4 h-4"
          style={{ color: moodIcons.neutral.color }}
        />
      );
    }

    const MoodIcon = moodData.icon;
    return <MoodIcon className="w-4 h-4" style={{ color: moodData.color }} />;
  };

  /**
   * Generates a content preview string based on entry type
   * Different entry types have different data structures, so previews are customized
   * 
   * @param entry - Diary entry object
   * @returns Preview string summarizing the entry content
   */
  const getContentPreview = (entry: DiaryEntry) => {
    switch (entry.entry_type) {
      case "free-form":
        return entry.content || "No content available";

      case "daily-behavior":
        const behaviors = entry.observed_behaviors?.length
          ? entry.observed_behaviors.map(formatFieldValue).join(", ")
          : "";
        const challenges = entry.challenges_encountered?.length
          ? entry.challenges_encountered.map(formatFieldValue).join(", ")
          : "";
        const strategies = entry.strategies_used?.length
          ? entry.strategies_used.map(formatFieldValue).join(", ")
          : "";

        let preview = "";
        if (behaviors) preview += `Behaviors: ${behaviors}`;
        if (challenges)
          preview += (preview ? " | " : "") + `Challenges: ${challenges}`;
        if (strategies)
          preview += (preview ? " | " : "") + `Strategies: ${strategies}`;
        if (entry.effectiveness)
          preview +=
            (preview ? " | " : "") + `Effectiveness: ${entry.effectiveness}`;

        return preview || "No behavior data recorded";

      case "emotional-tracking":
        const triggers = entry.triggers_identified?.length
          ? entry.triggers_identified.map(formatFieldValue).join(", ")
          : "";
        const coping = entry.coping_strategies?.length
          ? entry.coping_strategies.map(formatFieldValue).join(", ")
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
          ? entry.skills_observed.map(formatFieldValue).join(", ")
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

  /**
   * Fetches diary entries for the selected date from the API
   * Maps entries with child information for display
   */
  const fetchEntries = useCallback(async () => {
    if (!open) return;

    setLoading(true);
    setError(null);

    try {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const response = await getDiaryEntries({
        start_date: dateStr,
        end_date: dateStr,
      });

      // Map entries with child information
      const entriesWithChildren = response.entries.map((entry: DiaryEntry) => {
        const child = children.find((c) => c.child_id === entry.child_id);
        return {
          ...entry,
          child_name: child?.name || "General",
          child_color: child?.color_code || "#326586",
        };
      });

      setEntries(entriesWithChildren);
    } catch (err) {
      console.error("Error fetching diary entries:", err);
      setError("Failed to load diary entries");
      toast.error("Failed to load diary entries");
    } finally {
      setLoading(false);
    }
  }, [open, date, children]);

  /**
   * Initiates the delete confirmation process for an entry
   * Opens the delete confirmation dialog
   * 
   * @param entry - Diary entry to delete
   */
  const handleDeleteEntry = (entry: DiaryEntry) => {
    setEntryToDelete(entry);
    setDeleteConfirmOpen(true);
  };

  /**
   * Confirms and executes the deletion of a diary entry
   * Removes the entry from the list and notifies parent component
   */
  const confirmDeleteEntry = async () => {
    if (!entryToDelete) return;

    setDeleting(true);
    try {
      await deleteDiaryEntry(entryToDelete.entry_id);
      setEntries((prev) =>
        prev.filter((entry) => entry.entry_id !== entryToDelete.entry_id),
      );
      toast.success("Diary entry deleted successfully");
      setDeleteConfirmOpen(false);
      setEntryToDelete(null);

      // Notify parent component that an entry was deleted
      if (onEntryDeleted) {
        onEntryDeleted();
      }
    } catch (err) {
      console.error("Error deleting diary entry:", err);
      toast.error("Failed to delete diary entry. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Cancels the delete operation and closes the confirmation dialog
   */
  const cancelDeleteEntry = () => {
    setDeleteConfirmOpen(false);
    setEntryToDelete(null);
  };

  /**
   * Effect hook to fetch entries when modal is opened
   * Refetches entries whenever the modal opens or the date changes
   */
  useEffect(() => {
    if (open) {
      fetchEntries();
    }
  }, [open, fetchEntries]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg sm:rounded-2xl shadow-2xl max-w-2xl w-full mx-2 sm:mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div
          className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b"
          style={{ backgroundColor: "#FAEFE2", borderColor: "#AA855B" }}
        >
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#F2742C" }}
                >
                  <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3
                  className="font-bold text-sm sm:text-base lg:text-xl truncate"
                  style={{
                    color: "#32332D",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  Entries for {formatDate(date)}
                </h3>
              </div>
              <p
                className="text-xs sm:text-sm mt-1 ml-8 sm:ml-11"
                style={{ color: "#AA855B" }}
              >
                {entries.length} {entries.length === 1 ? "entry" : "entries"}{" "}
                found
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full transition-all duration-200 flex-shrink-0"
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
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 lg:p-6 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2"
                style={{ borderColor: "#0F5648" }}
              ></div>
              <span className="ml-3" style={{ color: "#32332D" }}>
                Loading entries...
              </span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">⚠️</div>
              <p style={{ color: "#32332D" }}>{error}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <BookOpen className="w-12 h-12" style={{ color: "#AA855B" }} />
              </div>
              <p className="text-lg font-medium" style={{ color: "#32332D" }}>
                No entries for this date
              </p>
              <p className="text-sm mt-1" style={{ color: "#AA855B" }}>
                Start documenting your parenting journey
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {entries.map((entry) => (
                <div
                  key={entry.entry_id}
                  className="rounded-xl p-3 sm:p-4 transition-all duration-200 hover:shadow-lg cursor-pointer"
                  style={{
                    backgroundColor: "#F5F5F5",
                    border: "1px solid #AA855B",
                    borderLeft: `4px solid ${entry.child_color || "#326586"}`,
                  }}
                  onClick={() => onEditEntry(entry)}
                >
                  {/* Entry Header */}
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                      {/* Child Color Indicator */}
                      <div
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0"
                        style={{
                          backgroundColor: entry.child_color || "#326586",
                        }}
                      >
                        {entry.child_name?.charAt(0) || "G"}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-semibold font-['Poppins'] text-sm sm:text-base truncate"
                          style={{ color: "#32332D" }}
                        >
                          {entry.title || "Untitled Entry"}
                        </h3>
                        <div className="flex items-center space-x-1.5 sm:space-x-2 mt-1 flex-wrap">
                          <span
                            className="text-xs font-medium"
                            style={{ color: "#32332D" }}
                          >
                            {entry.child_name}
                          </span>
                          <span
                            className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-normal"
                            style={{
                              backgroundColor: getEntryTypeColor(
                                entry.entry_type,
                              ),
                              color: "#F5F5F5",
                            }}
                          >
                            {getEntryTypeLabel(entry.entry_type)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditEntry(entry);
                        }}
                        className="p-1.5 sm:p-2 rounded-lg transition-all duration-200 hover:bg-orange-100"
                        style={{ color: "#F2742C" }}
                        title="Edit Entry"
                      >
                        <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

                  {/* Entry Content Preview */}
                  <div className="mb-2 sm:mb-3">
                    <p
                      className="text-xs sm:text-sm line-clamp-2"
                      style={{ color: "#32332D" }}
                    >
                      {getContentPreview(entry)}
                    </p>
                  </div>

                  {/* Entry Footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-0 text-[10px] sm:text-xs">
                    <div className="flex items-center space-x-3 sm:space-x-4 flex-wrap">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <User
                          className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0"
                          style={{ color: "#AA855B" }}
                        />
                        <span style={{ color: "#32332D" }}>Parent:</span>
                        <div className="flex items-center">
                          {getMoodIcon(entry.parent_mood)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <Baby
                          className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0"
                          style={{ color: "#AA855B" }}
                        />
                        <span style={{ color: "#32332D" }}>Child:</span>
                        <div className="flex items-center">
                          {getMoodIcon(entry.child_mood)}
                        </div>
                      </div>
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
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 border-t flex justify-end items-center"
          style={{
            backgroundColor: "#FAEFE2",
            borderColor: "#AA855B",
          }}
        >
          <button
            onClick={onNewEntry}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
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
            + New Entry
          </button>
        </div>
      </div>

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
                      {formatDate(new Date(entryToDelete.entry_date))}
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
                  associated data, including attachments. This action cannot be
                  undone.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="confirm-delete-entry-modal"
                  className="w-4 h-4 rounded"
                  style={{ accentColor: "#EF4444" }}
                />
                <label
                  htmlFor="confirm-delete-entry-modal"
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
                    "confirm-delete-entry-modal",
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
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
    </div>
  );
};

export default DiaryEntryListModal;
