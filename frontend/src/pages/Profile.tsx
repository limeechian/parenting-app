// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: Profile.tsx
// Description: To provide interface for parent users to view and edit their profile information
// First Written on: Wednesday, 01-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state and lifecycle management
import React, { useState, useEffect } from "react";
// Import React Router hooks for navigation
import { useLocation, useNavigate } from "react-router-dom";
// Import API functions for profile and child management
import {
  getParentProfile,
  updateParentProfile,
  getChildren,
  addChild,
  updateChild,
  deleteChild,
} from "../services/api";
// Import Supabase configuration for file uploads
import { supabase, PROFILE_PICTURES_BUCKET } from "../config/supabase";
// Import TypeScript type definitions
import {
  ParentProfile as ParentProfileType,
  ChildProfile,
} from "../types/types";
// Import Material-UI components for form elements and UI
import {
  Button,
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  FormHelperText,
  Typography,
  Avatar,
  Card,
  CardContent,
  Autocomplete,
  Chip,
} from "@mui/material";
// Import lucide-react icons for UI elements
import {
  Baby,
  Edit3,
  Trash2,
  Plus,
  Heart,
  Shield,
  Users,
  Camera,
  X,
  User,
  MapPin,
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
 * Default parent profile object structure
 * Used to initialize parent profile form fields with empty values
 */
const defaultParentProfile: ParentProfileType = {
  first_name: "",
  last_name: "",
  gender: "",
  birthdate: "",
  address_line: "",
  city: "",
  state: "",
  postcode: "",
  country: "Malaysia",
  occupation: "",
  education_level: "",
  experience_level: "",
  parenting_style: "",
  preferred_communication_style: "",
  family_structure: "",
  relationship_status: "",
  relationship_with_child: "",
  profile_picture_url: "",
  customParentingStyle: "",
  customFamilyStructure: "",
  customRelationshipStatus: "",
  customRelationshipWithChild: "",
};

/**
 * Default child profile object structure
 * Used to initialize child profile form fields with empty values
 */
const defaultChildProfile: ChildProfile = {
  name: "",
  gender: "",
  age: 0,
  birthdate: "",
  education_level: "",
  developmental_stage: "",
  special_considerations: [],
  characteristics: [],
  current_challenges: [],
  special_notes: "",
  interests: [],
  parenting_goals: "",
  customInterest: "",
  customCharacteristic: "",
  customSpecialConsideration: "",
  customCurrentChallenge: "",
};

/**
 * Gender options for form dropdowns
 * Based on current database schema
 */
const genderOptions = ["male", "female", "non_binary", "prefer_not_to_say"];
const educationLevelOptions = [
  "none",
  "primary",
  "secondary",
  "diploma",
  "bachelor",
  "master",
  "phd",
];
const experienceLevelOptions = [
  "New (<1 year)",
  "1–3 years",
  "3–7 years",
  "7–12 years",
  "12+ years",
];
const communicationStyleOptions = [
  "direct",
  "gentle",
  "detailed",
  "concise",
  "encouraging",
  "practical",
];
const familyStructureOptions = [
  "nuclear",
  "single_parent",
  "blended",
  "extended",
  "same_sex",
  "multi_generational",
  "co_parenting",
  "other",
];
const relationshipStatusOptions = [
  "single",
  "married",
  "divorced",
  "widowed",
  "separated",
  "in_relationship",
  "other",
];
const relationshipWithChildOptions = [
  "biological_parent",
  "adoptive_parent",
  "step_parent",
  "guardian",
  "grandparent",
  "other",
];
const parentingStyleOptions = [
  "authoritative",
  "authoritarian",
  "permissive",
  "uninvolved",
  "gentle",
  "attachment",
  "positive_discipline",
  "not_sure",
  "other",
];

// Malaysian states
const malaysianStates = [
  "Kuala Lumpur",
  "Selangor",
  "Penang",
  "Johor",
  "Sabah",
  "Sarawak",
  "Perak",
  "Kedah",
  "Kelantan",
  "Terengganu",
  "Pahang",
  "Negeri Sembilan",
  "Melaka",
  "Perlis",
  "Putrajaya",
  "Labuan",
];

const developmentalStageOptions = [
  "newborn",
  "infant",
  "toddler",
  "early_childhood",
  "middle_childhood",
];
const childEducationLevelOptions = [
  "not_school_age",
  "preschool_nursery",
  "kindergarten",
  "primary_school",
  "homeschooled",
];
const specialConsiderationsOptions = [
  "autism_spectrum",
  "adhd",
  "learning_disabilities",
  "speech_delays",
  "physical_disabilities",
  "hearing_impairment",
  "visual_impairment",
  "medical_conditions",
  "behavioral_challenges",
  "developmental_delays",
  "anxiety",
  "depression",
  "none",
  "other",
];
const interestsOptions = [
  "reading",
  "drawing",
  "music",
  "sports",
  "dancing",
  "cooking",
  "science",
  "nature",
  "technology",
  "animals",
  "building",
  "puzzles",
  "outdoor_play",
  "indoor_games",
  "other",
];
const characteristicsOptions = [
  "curious",
  "creative",
  "energetic",
  "calm",
  "social",
  "shy",
  "independent",
  "dependent",
  "organized",
  "messy",
  "patient",
  "impatient",
  "helpful",
  "stubborn",
  "gentle",
  "playful",
  "serious",
  "outgoing",
  "introverted",
  "adventurous",
  "cautious",
  "other",
];
const challengesOptions = [
  "behavioral_issues",
  "sleep_problems",
  "eating_difficulties",
  "tantrums",
  "social_skills",
  "academic_struggles",
  "attention_issues",
  "anxiety",
  "bedtime_resistance",
  "screen_time_management",
  "sibling_conflicts",
  "independence_issues",
  "communication_difficulties",
  "emotional_regulation",
  "none",
  "other",
];

// Function to calculate age from birthdate
const calculateAge = (birthdate: string): number => {
  if (!birthdate) return 0;
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// Function to format developmental stage for display (0–12 focus)
const formatDevelopmentalStage = (stage: string): string => {
  const map: Record<string, string> = {
    newborn: "Newborn (0–2 months)",
    infant: "Infant (2–12 months)",
    toddler: "Toddler (1–3 years)",
    early_childhood: "Early childhood (3–5)",
    middle_childhood: "Middle childhood (6–12)",
  };
  return (
    map[stage] ||
    (stage
      ? stage.charAt(0).toUpperCase() + stage.slice(1).replace("_", " ")
      : "")
  );
};

const formatChildEducationLevel = (level: string): string => {
  const map: Record<string, string> = {
    not_school_age: "Not school age",
    preschool_nursery: "Preschool/Nursery",
    kindergarten: "Kindergarten (K1–K2)",
    primary_school: "Primary School (Standard 1–6)",
    homeschooled: "Homeschooled",
  };
  return (
    map[level] ||
    (level
      ? level.charAt(0).toUpperCase() + level.slice(1).replace(/_/g, " ")
      : "")
  );
};

// Function to format gender for display
const formatGender = (gender: string): string => {
  if (!gender) return "";
  if (gender === "prefer_not_to_say") return "Prefer not to say";
  return gender.charAt(0).toUpperCase() + gender.slice(1).replace("_", " ");
};

// Textfield styles function to override browser autofill styling
const getTextFieldStyles = (hasValue: boolean) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backgroundColor: hasValue ? "#F5F5F5" : "#EDEDED",
    fontFamily: "'Poppins', sans-serif",
    "&:hover": {
      // backgroundColor: "#F5F5F5",
    },
    "&.Mui-focused": {
      // backgroundColor: "#F5F5F5",
      // boxShadow: "0 0 0 2px #F2742C",
    },
    // Override browser autofill styling
    "& input:-webkit-autofill": {
      WebkitBoxShadow: "0 0 0 1000px #F5F5F5 inset !important",
      WebkitTextFillColor: "#32332D !important",
      transition: "background-color 5000s ease-in-out 0s",
    },
    "& input:-webkit-autofill:hover": {
      WebkitBoxShadow: "0 0 0 1000px #F5F5F5 inset !important",
    },
    "& input:-webkit-autofill:focus": {
      WebkitBoxShadow: "0 0 0 1000px #F5F5F5 inset !important",
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "#AA855B",
      borderWidth: "1px",
    },
    // Control input field padding (height)
    "& .MuiOutlinedInput-input": {
      padding: "12px 12px", // Equal top/bottom padding for proper centering
      fontSize: "14px",
    },
  },
  "& .MuiInputLabel-root": {
    color: "#32332D",
    fontWeight: 500,
    fontFamily: "'Poppins', sans-serif",
    fontSize: "14px",
    // Center the label vertically
    transform: "translate(14px, 12px) scale(1)",
    "&.MuiInputLabel-shrink": {
      transform: "translate(14px, -9px) scale(0.75)",
    },
  },
});

// Select styles function to override browser autofill styling
const getSelectStyles = (hasValue: boolean) => ({
  borderRadius: "12px",
  backgroundColor: hasValue ? "#F5F5F5" : "#EDEDED",
  fontFamily: "'Poppins', sans-serif",
  // "&:hover": { backgroundColor: "#F5F5F5" },
  "&.Mui-focused": {
    backgroundColor: "#F5F5F5",
    // boxShadow: "0 0 0 2px #F2742C",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "#AA855B",
    borderWidth: "1px",
  },
  // Control select field padding (height)
  "& .MuiSelect-select": {
    padding: "12px 12px", // Equal top/bottom padding for proper centering
    fontSize: "14px",
  },
});

// Label styles for FormControl (used with Select)
const getLabelStyles = () => ({
  color: "#32332D",
  fontWeight: 500,
  fontFamily: "'Poppins', sans-serif",
  fontSize: "14px",
  // Center the label vertically
  transform: "translate(14px, 12px) scale(1)",
  "&.MuiInputLabel-shrink": {
    transform: "translate(14px, -9px) scale(0.75)",
  },
});

const Profile: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [parentProfile, setParentProfile] =
    useState<ParentProfileType>(defaultParentProfile);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [childDialogOpen, setChildDialogOpen] = useState(false);
  const [editingChildIndex, setEditingChildIndex] = useState<number | null>(
    null,
  );
  const [childForm, setChildForm] = useState<ChildProfile>(defaultChildProfile);
  const [childLoading, setChildLoading] = useState(false);

  // Modal and tab state
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");

  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [childToDelete, setChildToDelete] = useState<number | null>(null);

  // Display name and profile picture states
  const [displayName, setDisplayName] = useState("");
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removePictureIntent, setRemovePictureIntent] = useState(false);

  // Field-specific error states
  const [pictureError, setPictureError] = useState("");
  const [parentFormErrors, setParentFormErrors] = useState({
    first_name: "",
    last_name: "",
    gender: "",
    birthdate: "",
  });
  const [childFormErrors, setChildFormErrors] = useState({
    name: "",
    gender: "",
    birthdate: "",
  });

  // Backup state for reverting changes
  const [parentProfileBackup, setParentProfileBackup] =
    useState<ParentProfileType | null>(null);

  // Helper function to get display name with fallback logic
  const getDisplayName = (
    profile: ParentProfileType,
    email: string,
  ): string => {
    // 1. Try first_name + last_name
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    }
    // 2. Fall back to email prefix (before @)
    if (email) {
      return email.split("@")[0];
    }
    // 3. Last resort
    return "User";
  };

  /**
   * Effect hook to fetch and initialize profile data on component mount
   * 
   * Handles missing profiles gracefully - if user skipped setup (404 response),
   * initializes with empty profile form instead of showing error.
   * This allows users to fill in their profile even if they skipped initial setup.
   */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const parent = await getParentProfile();
        // Handle null profile (user skipped setup) - initialize with empty profile
        // This allows the profile page to display an empty form ready for user input
        if (parent === null) {
          setParentProfile({
            first_name: "",
            last_name: "",
            gender: "",
            birthdate: "",
            occupation: "",
            education_level: "",
            experience_level: "",
            parenting_style: "",
            preferred_communication_style: "",
            family_structure: "",
            relationship_status: "",
            relationship_with_child: "",
            address_line: "",
            city: "",
            state: "",
            postcode: "",
            country: "Malaysia",
            profile_picture_url: undefined,
          });
        } else {
          setParentProfile(parent);
        }

        // Get email from localStorage and set display name with fallback logic
        // If no profile exists, displayName will use email prefix (before @)
        const userEmail = localStorage.getItem("userEmail") || "";
        const displayNameValue = getDisplayName(parent || {}, userEmail);
        setDisplayName(displayNameValue);

        // Fetch children - returns empty array if none exist (404 handled by API)
        const kids = await getChildren();
        setChildren(kids || []);
      } catch (e: any) {
        // Only set error for non-404 errors
        // 404 errors are handled gracefully by API functions (return null/empty arrays)
        // so they don't need to be treated as errors here
        if (!e.message || !e.message.includes("404")) {
          setError("Failed to load profile");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Check for addChild query parameter and auto-open child dialog
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("addChild") === "true") {
      // Remove the query parameter from URL
      navigate("/profile", { replace: true });
      // Open the child dialog
      setChildForm(defaultChildProfile);
      setEditingChildIndex(null);
      setChildDialogOpen(true);
      // Clear all child form errors
      setChildFormErrors({
        name: "",
        gender: "",
        birthdate: "",
      });
    }
  }, [location.search, navigate]);

  const openEditProfileModal = () => {
    // Create backup of current state before opening modal
    setParentProfileBackup({ ...parentProfile });
    setEditProfileModalOpen(true);
    setActiveTab("personal");
    // Clear all parent form errors
    setParentFormErrors({
      first_name: "",
      last_name: "",
      gender: "",
      birthdate: "",
    });
    // Reset picture-related states
    if (selectedFile) {
      URL.revokeObjectURL(URL.createObjectURL(selectedFile));
      setSelectedFile(null);
    }
    setRemovePictureIntent(false);
    setPictureError("");
  };

  const closeEditProfileModal = () => {
    // Revert to backup state if it exists (user cancelled without saving)
    if (parentProfileBackup) {
      setParentProfile(parentProfileBackup);
      setParentProfileBackup(null);
    }

    // Reset file selection and clean up object URLs
    if (selectedFile) {
      URL.revokeObjectURL(URL.createObjectURL(selectedFile));
      setSelectedFile(null);
    }

    // Reset picture removal intent
    setRemovePictureIntent(false);
    setPictureError("");

    setEditProfileModalOpen(false);
    setActiveTab("personal");
  };

  // Parent profile handlers
  const handleParentChange = (field: keyof ParentProfileType, value: any) => {
    setParentProfile((prev) => ({ ...prev, [field]: value }));

    // Clear validation error for this field if it becomes valid
    if (field === "first_name" && value && value.trim() !== "") {
      setParentFormErrors((prev) => ({ ...prev, first_name: "" }));
    } else if (field === "last_name" && value && value.trim() !== "") {
      setParentFormErrors((prev) => ({ ...prev, last_name: "" }));
    } else if (field === "gender" && value) {
      setParentFormErrors((prev) => ({ ...prev, gender: "" }));
    } else if (field === "birthdate" && value) {
      // Additional validation for birthdate
      const birthDate = new Date(value);
      const today = new Date();
      const minDate = new Date();
      minDate.setFullYear(today.getFullYear() - 100); // 100 years ago

      if (birthDate <= today && birthDate >= minDate) {
        setParentFormErrors((prev) => ({ ...prev, birthdate: "" }));
      }
    }
  };

  const handleSaveParent = async () => {
    setLoading(true);

    // Clear all errors first
    setParentFormErrors({
      first_name: "",
      last_name: "",
      gender: "",
      birthdate: "",
    });

    // Form validation for parent profile (skip if on Profile Picture tab)
    if (activeTab !== "picture") {
      let hasError = false;
      const newErrors = {
        first_name: "",
        last_name: "",
        gender: "",
        birthdate: "",
      };

      if (!parentProfile.first_name || parentProfile.first_name.trim() === "") {
        newErrors.first_name = "Please enter your first name";
        hasError = true;
      }

      if (!parentProfile.last_name || parentProfile.last_name.trim() === "") {
        newErrors.last_name = "Please enter your last name";
        hasError = true;
      }

      if (!parentProfile.gender) {
        newErrors.gender = "Please select your gender";
        hasError = true;
      }

      if (!parentProfile.birthdate) {
        newErrors.birthdate = "Please select your birth date";
        hasError = true;
      } else {
        // Validate birthdate format and future dates
        const birthDate = new Date(parentProfile.birthdate);
        const today = new Date();
        if (birthDate > today) {
          newErrors.birthdate = "Birth date cannot be in the future";
          hasError = true;
        } else {
          // Validate birthdate is not too far in the past (reasonable limit)
          const minDate = new Date();
          minDate.setFullYear(today.getFullYear() - 100); // 100 years ago
          if (birthDate < minDate) {
            newErrors.birthdate = "Please enter a valid birth date";
            hasError = true;
          }
        }
      }

      if (hasError) {
        setParentFormErrors(newErrors);
        setLoading(false);
        return;
      }
    }

    try {
      let profileToSave = { ...parentProfile };

      // Handle profile picture upload/removal if on Profile Picture tab
      if (activeTab === "picture") {
        if (removePictureIntent) {
          // User wants to remove picture
          // Delete the file from Supabase Storage if it exists
          if (parentProfile.profile_picture_url) {
            try {
              const urlParts = parentProfile.profile_picture_url.split("/");
              const fileName = urlParts[urlParts.length - 1];
              await supabase.storage
                .from(PROFILE_PICTURES_BUCKET)
                .remove([fileName]);
            } catch (storageError) {
              console.warn("Failed to delete file from storage:", storageError);
              // Continue with database update even if storage deletion fails
            }
          }
          profileToSave.profile_picture_url = "";
        } else if (selectedFile) {
          // User wants to upload new picture
          setUploadingPicture(true);
          setPictureError("");

          try {
            // Generate unique filename
            const fileExt = selectedFile.name.split(".").pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

            // Upload to Supabase Storage
            const { error } = await supabase.storage
              .from(PROFILE_PICTURES_BUCKET)
              .upload(fileName, selectedFile);

            if (error) {
              throw new Error(`Upload failed: ${error.message}`);
            }

            // Get public URL
            const { data: urlData } = supabase.storage
              .from(PROFILE_PICTURES_BUCKET)
              .getPublicUrl(fileName);

            profileToSave.profile_picture_url = urlData.publicUrl;

            // Clean up object URL
            URL.revokeObjectURL(URL.createObjectURL(selectedFile));
          } catch (uploadError: any) {
            setPictureError(`Failed to upload: ${uploadError.message}`);
            setUploadingPicture(false);
            setLoading(false);

            toast.error("Failed to upload profile picture. Please try again.", {
              position: "top-right",
              autoClose: 4000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            });
            return;
          } finally {
            setUploadingPicture(false);
          }
        }
      }

      // Update parent profile (including picture if changed)
      const updatedProfile = await updateParentProfile(profileToSave);

      // Update local state with the response from backend
      setParentProfile(updatedProfile);

      // Clear backup since changes were successfully saved
      setParentProfileBackup(null);

      // Reset picture-related states
      setSelectedFile(null);
      setRemovePictureIntent(false);
      setPictureError("");

      // Close modal immediately
      setEditProfileModalOpen(false);

      // Refresh the profile data to ensure all components get updated
      const refreshedProfile = await getParentProfile();
      setParentProfile(refreshedProfile);

      // Dispatch custom event to notify other components (like Navigation) to refresh
      window.dispatchEvent(new CustomEvent("profileUpdated"));

      // Show success toast AFTER modal closes
      setTimeout(() => {
        const message =
          activeTab === "picture" && (selectedFile || removePictureIntent)
            ? "Profile picture updated successfully!"
            : "Profile updated successfully!";
        toast.success(message, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }, 100);
    } catch (e: any) {
      setError("Failed to update profile");

      // Failed toast for parent profile save
      toast.error("Failed to update profile. Please try again.", {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      // Don't clear backup on API error - user can still cancel to revert
    } finally {
      setLoading(false);
    }
  };

  // Update display name when parent profile changes
  useEffect(() => {
    const userEmail = localStorage.getItem("userEmail") || "";
    const displayNameValue = getDisplayName(parentProfile, userEmail);
    setDisplayName(displayNameValue);
  }, [parentProfile.first_name, parentProfile.last_name, parentProfile]);

  // Profile picture handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Clean up previous object URL if exists
      if (selectedFile) {
        URL.revokeObjectURL(URL.createObjectURL(selectedFile));
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setPictureError("Please select an image file");
        return;
      }
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setPictureError("File size must be less than 5MB");
        return;
      }
      setSelectedFile(file);
      setRemovePictureIntent(false); // Clear removal intent when selecting new file
      setPictureError("");
    }
  };

  const handleRemoveProfilePicture = () => {
    // Preview only - show default avatar, don't commit
    if (selectedFile) {
      // User has selected a new file - cancel the upload, show original picture
      URL.revokeObjectURL(URL.createObjectURL(selectedFile));
      setSelectedFile(null);
      setRemovePictureIntent(false); // Clear removal intent since we're canceling upload
    } else {
      // User wants to remove existing picture - show preview
      setRemovePictureIntent(true);
    }
    setPictureError("");
  };

  // Child profile handlers
  const openAddChild = () => {
    setChildForm(defaultChildProfile);
    setEditingChildIndex(null);
    setChildDialogOpen(true);
    // Clear all child form errors
    setChildFormErrors({
      name: "",
      gender: "",
      birthdate: "",
    });
  };

  const openEditChild = (idx: number) => {
    const c = children[idx];
    setChildForm({
      ...c,
      special_considerations: Array.isArray(c.special_considerations)
        ? c.special_considerations
        : [],
      characteristics: Array.isArray(c.characteristics)
        ? c.characteristics
        : [],
      current_challenges: Array.isArray(c.current_challenges)
        ? c.current_challenges
        : [],
      interests: Array.isArray(c.interests) ? c.interests : [],
      special_notes: c.special_notes || "",
      parenting_goals: c.parenting_goals || "",
      customInterest: c.customInterest || "",
      customCharacteristic: c.customCharacteristic || "",
      customSpecialConsideration: c.customSpecialConsideration || "",
      customCurrentChallenge: c.customCurrentChallenge || "",
    });
    setEditingChildIndex(idx);
    setChildDialogOpen(true);
    // Clear all child form errors
    setChildFormErrors({
      name: "",
      gender: "",
      birthdate: "",
    });
  };

  const handleChildChange = (field: keyof ChildProfile, value: any) => {
    setChildForm((prev) => ({ ...prev, [field]: value }));

    // Clear validation error for this field if it becomes valid
    if (field === "name" && value && value.trim() !== "") {
      setChildFormErrors((prev) => ({ ...prev, name: "" }));
    } else if (field === "gender" && value) {
      setChildFormErrors((prev) => ({ ...prev, gender: "" }));
    } else if (field === "birthdate" && value) {
      // Additional validation for birthdate
      const birthDate = new Date(value);
      const today = new Date();
      const minDate = new Date();
      minDate.setFullYear(today.getFullYear() - 25); // 25 years ago

      if (birthDate <= today && birthDate >= minDate) {
        setChildFormErrors((prev) => ({ ...prev, birthdate: "" }));
      }
    }
  };

  // old checkbox multi-select no longer used

  const handleSaveChild = async () => {
    setChildLoading(true);

    // Clear all errors first
    setChildFormErrors({
      name: "",
      gender: "",
      birthdate: "",
    });

    // Form validation
    let hasError = false;
    const newErrors = {
      name: "",
      gender: "",
      birthdate: "",
    };

    if (!childForm.name || childForm.name.trim() === "") {
      newErrors.name = "Please enter the child's name";
      hasError = true;
    }

    if (!childForm.gender) {
      newErrors.gender = "Please select the child's gender";
      hasError = true;
    }

    if (!childForm.birthdate) {
      newErrors.birthdate = "Please select the child's birth date";
      hasError = true;
    } else {
      // Validate birthdate format and future dates
      const birthDate = new Date(childForm.birthdate);
      const today = new Date();
      if (birthDate > today) {
        newErrors.birthdate = "Birth date cannot be in the future";
        hasError = true;
      } else {
        // Validate birthdate is not too far in the past (reasonable limit)
        const minDate = new Date();
        minDate.setFullYear(today.getFullYear() - 25); // 25 years ago
        if (birthDate < minDate) {
          newErrors.birthdate = "Please enter a valid birth date";
          hasError = true;
        }
      }
    }

    if (hasError) {
      setChildFormErrors(newErrors);
      setChildLoading(false);
      return;
    }

    try {
      if (editingChildIndex !== null) {
        const updated = await updateChild(
          children[editingChildIndex].id!,
          childForm,
        );
        setChildren((prev) =>
          prev.map((c, i) => (i === editingChildIndex ? updated : c)),
        );
        // Success toast for update
        toast.success("Child profile updated successfully!", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        const added = await addChild(childForm);
        setChildren((prev) => [...prev, added]);
        // Success toast for add
        toast.success("Child profile added successfully!", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
      setChildDialogOpen(false);
    } catch (e: any) {
      setError("Failed to save child");

      // Failed toast for child save (both add and update)
      const action = editingChildIndex !== null ? "update" : "add";
      toast.error(`Failed to ${action} child profile. Please try again.`, {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setChildLoading(false);
    }
  };

  // Hybrid chips normalization for child dialog
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
  const setChildChipsField = (field: keyof ChildProfile, values: string[]) => {
    setChildForm((prev) => ({ ...prev, [field]: normalizeTokens(values) }));
  };

  const handleDeleteChild = async (idx: number) => {
    setChildToDelete(idx);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteChild = async () => {
    if (childToDelete === null) return;

    setChildLoading(true);
    setError("");
    try {
      await deleteChild(children[childToDelete].id!);
      setChildren((prev) => prev.filter((_, i) => i !== childToDelete));
      setDeleteConfirmOpen(false);
      setChildToDelete(null);

      // Success toast
      toast.success("Child profile deleted successfully!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (e: any) {
      setError("Failed to delete child");

      // Failed toast for child delete
      toast.error("Failed to delete child profile. Please try again.", {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setChildLoading(false);
    }
  };

  const cancelDeleteChild = () => {
    setDeleteConfirmOpen(false);
    setChildToDelete(null);
  };

  if (loading)
    return (
      <div
        className="min-h-screen flex justify-center items-center"
        style={{ backgroundColor: "#FAEFE2" }}
      >
        <div className="text-center">
          <CircularProgress sx={{ color: "#F2742C" }} />
          <p
            className="mt-4 font-medium font-['Poppins']"
            style={{ color: "#32332D" }}
          >
            Loading your profile...
          </p>
        </div>
      </div>
    );

  return (
    <div
      className="min-h-screen pt-16 sm:pt-20 py-6 sm:py-8 font-['Poppins']"
      style={{ backgroundColor: "#FAEFE2" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2"
                style={{ color: "#32332D" }}
              >
                Profile Settings
              </h1>
              <p className="text-sm sm:text-base" style={{ color: "#AA855B" }}>
                Manage your account and family information
              </p>
            </div>
          </div>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 text-center mb-4 sm:mb-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-center text-red-600">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
              <span className="text-xs sm:text-sm">{error}</span>
            </div>
          </div>
        )}
        {/* Card-Based Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Profile Card */}
          <Card
            className="p-3 sm:p-4 shadow-xl transition-all duration-300 hover:shadow-2xl lg:col-span-1"
            style={{
              border: "1px solid #AA855B",
              backgroundColor: "#F5F5F5",
              borderRadius: "16px",
            }}
          >
            <CardContent className="p-4 sm:p-6 h-full flex flex-col">
              <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
                {/* Avatar */}
                <Avatar
                  src={
                    parentProfile.profile_picture_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      displayName,
                    )}&background=F2742C&color=fff&size=140`
                  }
                  sx={{
                    width: { xs: 100, sm: 120, md: 140 },
                    height: { xs: 100, sm: 120, md: 140 },
                    fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
                  }}
                  style={{ border: "3px solid #F2742C" }}
                />

                {/* Name */}
                <div>
                  <Typography
                    variant="h6"
                    className="font-bold font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    {displayName}
                  </Typography>
                  <Typography
                    variant="body2"
                    className="font-['Poppins']"
                    style={{ color: "#AA855B" }}
                  >
                    {localStorage.getItem("userEmail") || "parent@demo.com"}
                  </Typography>
                </div>

                {/* Edit Profile Button */}
                <button
                  onClick={openEditProfileModal}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-white rounded-full transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm shadow-md hover:shadow-lg"
                  style={{ backgroundColor: "#F2742C" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#E55A1F";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#F2742C";
                  }}
                >
                  <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1.5 sm:mr-2" />
                  Edit Profile
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Your Children Card */}
          <Card
            className="shadow-xl transition-all duration-300 hover:shadow-2xl lg:col-span-2"
            style={{
              border: "1px solid #AA855B",
              backgroundColor: "#F5F5F5",
              borderRadius: "16px",
            }}
          >
            <CardContent className="p-4 sm:p-6 h-full flex flex-col">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-3 sm:gap-0">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "#326586" }}
                  >
                    <Baby className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h3
                      className="text-base sm:text-lg font-bold font-['Poppins']"
                      style={{ color: "#32332D" }}
                    >
                      Your Children
                    </h3>
                    <p
                      className="text-[11px] sm:text-xs font-['Poppins']"
                      style={{ color: "#AA855B" }}
                    >
                      Manage your children's profiles
                    </p>
                  </div>
                </div>
                <button
                  onClick={openAddChild}
                  className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 text-white rounded-full transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm shadow-md hover:shadow-lg w-full sm:w-auto justify-center"
                  style={{ backgroundColor: "#F2742C" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#E55A1F";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#F2742C";
                  }}
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Add Child</span>
                </button>
              </div>

              {/* Children List */}
              <div className="flex-1 overflow-auto">
                {children.length === 0 ? (
                  <div
                    className="text-center py-12 rounded-xl h-full flex flex-col items-center justify-center"
                    style={{ backgroundColor: "#FAEFE2" }}
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2"
                      style={{ backgroundColor: "#F5EFED" }}
                    >
                      <Baby className="w-8 h-8" style={{ color: "#AA855B" }} />
                    </div>
                    <p
                      className="text-base font-medium font-['Poppins']"
                      style={{ color: "#32332D" }}
                    >
                      No children added yet
                    </p>
                    <p className="text-sm mt-2" style={{ color: "#AA855B" }}>
                      Add your children to get personalized parenting advice
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {children.map((child, idx) => (
                      <div
                        key={child.id || idx}
                        className="p-3 sm:p-4 rounded-xl transition-all duration-200 hover:shadow-md"
                        style={{
                          backgroundColor: "#FAEFE2",
                          border: "1px solid #AA855B",
                        }}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center mb-1.5 sm:mb-2">
                              <div
                                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full mr-1.5 sm:mr-2 flex-shrink-0"
                                style={{
                                  backgroundColor:
                                    child.color_code || "#326586",
                                }}
                              />
                              <Typography
                                className="text-sm sm:text-base font-semibold font-['Poppins']"
                                style={{ color: "#32332D" }}
                              >
                                {child.name}
                              </Typography>
                            </div>
                            <Typography
                              className="text-xs sm:text-sm font-['Poppins']"
                              style={{ color: "#AA855B" }}
                            >
                              {child.age || calculateAge(child.birthdate || "")}{" "}
                              years old • {formatGender(child.gender || "")} •{" "}
                              {formatDevelopmentalStage(
                                child.developmental_stage || "",
                              )}
                            </Typography>
                            {child.special_considerations &&
                              child.special_considerations.length > 0 &&
                              child.special_considerations[0] !== "none" && (
                                <div className="mt-1.5 sm:mt-2">
                                  <span
                                    className="text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-['Poppins']"
                                    style={{
                                      backgroundColor: "#FFF4E6",
                                      color: "#326586",
                                    }}
                                  >
                                    Special considerations:{" "}
                                    {child.special_considerations.join(", ")}
                                  </span>
                                </div>
                              )}
                          </div>
                          <div className="flex space-x-1.5 sm:space-x-2 w-full sm:w-auto">
                            <button
                              onClick={() => openEditChild(idx)}
                              className="flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm"
                              style={{
                                borderColor: "#326586",
                                color: "#326586",
                                backgroundColor: "transparent",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#326586";
                                e.currentTarget.style.color = "#F5F5F5";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                                e.currentTarget.style.color = "#326586";
                              }}
                            >
                              <Edit3 className="w-3 h-3 inline mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteChild(idx)}
                              className="flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 sm:py-2 border rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm"
                              style={{
                                borderColor: "#AA855B",
                                color: "#AA855B",
                                backgroundColor: "transparent",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#FFF4E6";
                                e.currentTarget.style.color = "#F2742C";
                                e.currentTarget.style.borderColor = "#F2742C";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                                e.currentTarget.style.color = "#AA855B";
                                e.currentTarget.style.borderColor = "#AA855B";
                              }}
                            >
                              <Trash2 className="w-3 h-3 inline mr-1" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 sm:mt-8">
          <div
            className="flex items-center justify-center space-x-1.5 sm:space-x-2"
            style={{ color: "#AA855B" }}
          >
            <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm font-medium font-['Poppins']">
              Building stronger families together
            </span>
            <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
      </div>

      {/* Edit Profile Tabbed Modal */}
      <Dialog
        open={editProfileModalOpen}
        onClose={closeEditProfileModal}
        maxWidth="lg"
        fullWidth
        disableScrollLock={true}
        PaperProps={{
          sx: {
            borderRadius: { xs: "0", sm: "16px" },
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
            border: "1px solid #AA855B",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            height: { xs: "100vh", sm: "85vh" },
            maxHeight: { xs: "100vh", sm: "700px" },
            margin: { xs: "0", sm: "16px" },
            width: { xs: "100%", sm: "auto" },
          },
        }}
      >
        {/* Header - Full Width */}
        <DialogTitle
          sx={{
            backgroundColor: "#FAEFE2",
            color: "#32332D",
            fontWeight: 600,
            fontSize: { xs: "1rem", sm: "1.25rem" },
            fontFamily: "'Poppins', sans-serif",
            borderBottom: "1px solid #AA855B",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: { xs: "12px 16px", sm: "16px 24px" },
          }}
        >
          <span>Edit Profile</span>
          <button
            onClick={closeEditProfileModal}
            className="p-1 rounded-full transition-all duration-200"
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
        </DialogTitle>

        {/* Content Area - Contains Sidebar + Content */}
        <DialogContent
          sx={{
            padding: 0,
            backgroundColor: "#F5F5F5",
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            flex: "1 1 auto",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {/* Left Sidebar - Vertical Tabs (Desktop) / Top Tabs (Mobile/Tablet) */}
          <div
            className="hidden lg:flex flex-col"
            style={{
              width: "220px",
              backgroundColor: "#F5F5F5",
              borderRight: "1px solid #AA855B",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {[
              {
                id: "personal",
                label: "Personal Info",
                icon: <User className="w-4 h-4" />,
              },
              {
                id: "location",
                label: "Location",
                icon: <MapPin className="w-4 h-4" />,
              },
              {
                id: "family",
                label: "Family & Parenting",
                icon: <Users className="w-4 h-4" />,
              },
              {
                id: "picture",
                label: "Profile Picture",
                icon: <Camera className="w-4 h-4" />,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 transition-all duration-200 font-medium font-['Poppins'] text-sm flex items-center space-x-3 w-full text-left ${
                  activeTab === tab.id
                    ? "text-white"
                    : "text-gray-600 hover:text-gray-800"
                }`}
                style={{
                  backgroundColor:
                    activeTab === tab.id ? "#AA855B" : "transparent",
                  color: activeTab === tab.id ? "white" : "#32332D",
                  marginBottom: "4px",
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = "#EDEDED";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Top Tabs - Mobile/Tablet */}
          <div
            className="lg:hidden flex flex-row overflow-x-auto border-b"
            style={{ borderColor: "#AA855B", backgroundColor: "#F5F5F5" }}
          >
            {[
              {
                id: "personal",
                label: "Personal Info",
                icon: <User className="w-4 h-4" />,
              },
              {
                id: "location",
                label: "Location",
                icon: <MapPin className="w-4 h-4" />,
              },
              {
                id: "family",
                label: "Family & Parenting",
                icon: <Users className="w-4 h-4" />,
              },
              {
                id: "picture",
                label: "Profile Picture",
                icon: <Camera className="w-4 h-4" />,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm flex items-center space-x-1.5 sm:space-x-2 whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id ? "text-white" : "text-gray-600"
                }`}
                style={{
                  backgroundColor:
                    activeTab === tab.id ? "#AA855B" : "transparent",
                  color: activeTab === tab.id ? "white" : "#32332D",
                }}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
              </button>
            ))}
          </div>

          {/* Right Content Pane */}
          <div
            className="flex-1 p-4 sm:p-5 md:p-6"
            style={{
              overflowY: "auto",
              minWidth: 0,
            }}
          >
            {/* Personal Info Tab */}
            {activeTab === "personal" && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
                <TextField
                  label="First Name"
                  value={parentProfile.first_name || ""}
                  onChange={(e) =>
                    handleParentChange("first_name", e.target.value)
                  }
                  fullWidth
                  required
                  error={!!parentFormErrors.first_name}
                  helperText={parentFormErrors.first_name}
                  sx={getTextFieldStyles(!!parentProfile.first_name)}
                />
                <TextField
                  label="Last Name"
                  value={parentProfile.last_name || ""}
                  onChange={(e) =>
                    handleParentChange("last_name", e.target.value)
                  }
                  fullWidth
                  required
                  error={!!parentFormErrors.last_name}
                  helperText={parentFormErrors.last_name}
                  sx={getTextFieldStyles(!!parentProfile.last_name)}
                />
                <FormControl
                  fullWidth
                  required
                  error={!!parentFormErrors.gender}
                >
                  <InputLabel
                    sx={{
                      color: "#32332D",
                      fontWeight: 500,
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    Gender
                  </InputLabel>
                  <Select
                    value={parentProfile.gender || ""}
                    label="Gender"
                    onChange={(e) =>
                      handleParentChange("gender", e.target.value)
                    }
                    sx={getSelectStyles(!!parentProfile.gender)}
                  >
                    {genderOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option === "prefer_not_to_say"
                          ? "Prefer not to say"
                          : option.charAt(0).toUpperCase() +
                            option.slice(1).replace("_", " ")}
                      </MenuItem>
                    ))}
                  </Select>
                  {parentFormErrors.gender && (
                    <FormHelperText>{parentFormErrors.gender}</FormHelperText>
                  )}
                </FormControl>
                <TextField
                  label="Birth Date"
                  type="date"
                  value={parentProfile.birthdate || ""}
                  onChange={(e) =>
                    handleParentChange("birthdate", e.target.value)
                  }
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  error={!!parentFormErrors.birthdate}
                  helperText={parentFormErrors.birthdate}
                  sx={getTextFieldStyles(!!parentProfile.birthdate)}
                />
                <TextField
                  label="Age"
                  value={
                    parentProfile.birthdate
                      ? `${calculateAge(parentProfile.birthdate)} years old`
                      : "Not calculated yet"
                  }
                  fullWidth
                  disabled
                  InputProps={{
                    readOnly: true,
                  }}
                  sx={{
                    ...getTextFieldStyles(true), // Use standard styling
                    "& .MuiOutlinedInput-root": {
                      ...getTextFieldStyles(true)["& .MuiOutlinedInput-root"],
                      backgroundColor: "#F5F5F5", // Override background to match form
                      cursor: "not-allowed", // Add disabled cursor
                    },
                  }}
                />
                <FormControl fullWidth>
                  <InputLabel sx={getLabelStyles()}>Education Level</InputLabel>
                  <Select
                    value={parentProfile.education_level || ""}
                    label="Education Level"
                    onChange={(e) =>
                      handleParentChange("education_level", e.target.value)
                    }
                    sx={getSelectStyles(!!parentProfile.education_level)}
                  >
                    {educationLevelOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option === "none"
                          ? "None"
                          : option.charAt(0).toUpperCase() + option.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Occupation"
                  value={parentProfile.occupation || ""}
                  onChange={(e) =>
                    handleParentChange("occupation", e.target.value)
                  }
                  fullWidth
                  sx={getTextFieldStyles(!!parentProfile.occupation)}
                />
              </div>
            )}

            {/* Location Tab */}
            {activeTab === "location" && (
              <div>
                <div
                  className="bg-blue-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6"
                  style={{ border: "1px solid #326586" }}
                >
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <div
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0"
                      style={{ backgroundColor: "#326586" }}
                    >
                      <span className="text-white text-xs sm:text-sm font-bold">
                        i
                      </span>
                    </div>
                    <div>
                      <p
                        className="text-xs sm:text-sm font-medium"
                        style={{ color: "#32332D" }}
                      >
                        Location information is optional but helps us:
                      </p>
                      <ul
                        className="text-xs sm:text-sm mt-1.5 sm:mt-2 space-y-0.5 sm:space-y-1"
                        style={{ color: "#AA855B" }}
                      >
                        <li>• Find verified professionals in your area</li>
                        <li>• Match you with relevant professional services nearby</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
                  <div className="xl:col-span-2">
                    <TextField
                      label="Address Line"
                      value={parentProfile.address_line || ""}
                      onChange={(e) =>
                        handleParentChange("address_line", e.target.value)
                      }
                      fullWidth
                      placeholder="e.g., 123 Jalan Merdeka, Taman ABC"
                      sx={getTextFieldStyles(!!parentProfile.address_line)}
                    />
                  </div>
                  <TextField
                    label="City"
                    value={parentProfile.city || ""}
                    onChange={(e) => handleParentChange("city", e.target.value)}
                    fullWidth
                    placeholder="e.g., Kuala Lumpur"
                    sx={getTextFieldStyles(!!parentProfile.city)}
                  />
                  <FormControl fullWidth>
                    <InputLabel
                      sx={{
                        color: "#32332D",
                        fontWeight: 500,
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      State
                    </InputLabel>
                    <Select
                      value={parentProfile.state || ""}
                      label="State"
                      onChange={(e) =>
                        handleParentChange("state", e.target.value)
                      }
                      sx={getSelectStyles(!!parentProfile.state)}
                    >
                      {malaysianStates.map((state) => (
                        <MenuItem key={state} value={state}>
                          {state}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Postcode"
                    value={parentProfile.postcode || ""}
                    onChange={(e) =>
                      handleParentChange("postcode", e.target.value)
                    }
                    fullWidth
                    placeholder="e.g., 50000"
                    inputProps={{ maxLength: 10 }}
                    sx={getTextFieldStyles(!!parentProfile.postcode)}
                  />
                  <TextField
                    label="Country"
                    value={parentProfile.country || "Malaysia"}
                    fullWidth
                    disabled
                    sx={getTextFieldStyles(true)}
                  />
                </div>
              </div>
            )}

            {/* Family & Parenting Tab */}
            {activeTab === "family" && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <FormControl fullWidth>
                    <InputLabel sx={getLabelStyles()}>
                      Experience Level
                    </InputLabel>
                    <Select
                      value={parentProfile.experience_level || ""}
                      label="Experience Level"
                      onChange={(e) =>
                        handleParentChange("experience_level", e.target.value)
                      }
                      sx={getSelectStyles(!!parentProfile.experience_level)}
                    >
                      {experienceLevelOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option === "other"
                            ? "Other"
                            : option.charAt(0).toUpperCase() +
                              option.slice(1).replace(/_/g, " ")}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {/* removed customExperienceLevel field */}
                </div>

                <div>
                  <FormControl fullWidth>
                    <InputLabel sx={getLabelStyles()}>
                      Parenting Style
                    </InputLabel>
                    <Select
                      value={parentProfile.parenting_style || ""}
                      label="Parenting Style"
                      onChange={(e) =>
                        handleParentChange("parenting_style", e.target.value)
                      }
                      sx={getSelectStyles(!!parentProfile.parenting_style)}
                    >
                      {parentingStyleOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option === "other"
                            ? "Other"
                            : option.charAt(0).toUpperCase() +
                              option.slice(1).replace(/_/g, " ")}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {/* keeping customParentingStyle (still allowed) */}
                </div>

                <div>
                  <FormControl fullWidth>
                    <InputLabel sx={getLabelStyles()}>
                      Preferred Communication Style
                    </InputLabel>
                    <Select
                      value={parentProfile.preferred_communication_style || ""}
                      label="Preferred Communication Style"
                      onChange={(e) =>
                        handleParentChange(
                          "preferred_communication_style",
                          e.target.value,
                        )
                      }
                      sx={getSelectStyles(
                        !!parentProfile.preferred_communication_style,
                      )}
                    >
                      {communicationStyleOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option === "other"
                            ? "Other"
                            : option.charAt(0).toUpperCase() +
                              option.slice(1).replace(/_/g, " ")}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {/* removed customCommunicationStyle field */}
                </div>

                <div>
                  <FormControl fullWidth>
                    <InputLabel sx={getLabelStyles()}>
                      Family Structure
                    </InputLabel>
                    <Select
                      value={parentProfile.family_structure || ""}
                      label="Family Structure"
                      onChange={(e) =>
                        handleParentChange("family_structure", e.target.value)
                      }
                      sx={getSelectStyles(!!parentProfile.family_structure)}
                    >
                      {familyStructureOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option === "other"
                            ? "Other"
                            : option.charAt(0).toUpperCase() +
                              option.slice(1).replace(/_/g, " ")}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {parentProfile.family_structure === "other" && (
                    <TextField
                      label="Please specify your family structure"
                      value={parentProfile.customFamilyStructure || ""}
                      onChange={(e) =>
                        handleParentChange(
                          "customFamilyStructure",
                          e.target.value,
                        )
                      }
                      fullWidth
                      size="small"
                      sx={{
                        mt: 2,
                        ...getTextFieldStyles(
                          !!parentProfile.customFamilyStructure,
                        ),
                      }}
                    />
                  )}
                </div>

                <div>
                  <FormControl fullWidth>
                    <InputLabel sx={getLabelStyles()}>
                      Relationship Status
                    </InputLabel>
                    <Select
                      value={parentProfile.relationship_status || ""}
                      label="Relationship Status"
                      onChange={(e) =>
                        handleParentChange(
                          "relationship_status",
                          e.target.value,
                        )
                      }
                      sx={getSelectStyles(!!parentProfile.relationship_status)}
                    >
                      {relationshipStatusOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option === "in_relationship"
                            ? "In relationship"
                            : option.charAt(0).toUpperCase() + option.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {parentProfile.relationship_status === "other" && (
                    <TextField
                      label="Please specify your relationship status"
                      value={parentProfile.customRelationshipStatus || ""}
                      onChange={(e) =>
                        handleParentChange(
                          "customRelationshipStatus",
                          e.target.value,
                        )
                      }
                      fullWidth
                      size="small"
                      sx={{
                        mt: 2,
                        ...getTextFieldStyles(
                          !!parentProfile.customRelationshipStatus,
                        ),
                      }}
                    />
                  )}
                </div>

                <div>
                  <FormControl fullWidth>
                    <InputLabel sx={getLabelStyles()}>
                      Relationship with Child
                    </InputLabel>
                    <Select
                      value={parentProfile.relationship_with_child || ""}
                      label="Relationship with Child"
                      onChange={(e) =>
                        handleParentChange(
                          "relationship_with_child",
                          e.target.value,
                        )
                      }
                      sx={getSelectStyles(
                        !!parentProfile.relationship_with_child,
                      )}
                    >
                      {relationshipWithChildOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option === "other"
                            ? "Other"
                            : option.charAt(0).toUpperCase() +
                              option.slice(1).replace(/_/g, " ")}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {parentProfile.relationship_with_child === "other" && (
                    <TextField
                      label="Please specify your relationship with child"
                      value={parentProfile.customRelationshipWithChild || ""}
                      onChange={(e) =>
                        handleParentChange(
                          "customRelationshipWithChild",
                          e.target.value,
                        )
                      }
                      fullWidth
                      size="small"
                      sx={{
                        mt: 2,
                        ...getTextFieldStyles(
                          !!parentProfile.customRelationshipWithChild,
                        ),
                      }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Profile Picture Tab */}
            {activeTab === "picture" && (
              <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                {/* Profile Picture - Centered */}
                <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                  <Avatar
                    src={
                      removePictureIntent
                        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            displayName,
                          )}&background=F2742C&color=fff&size=140`
                        : selectedFile
                          ? URL.createObjectURL(selectedFile)
                          : parentProfile.profile_picture_url ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              displayName,
                            )}&background=F2742C&color=fff&size=140`
                    }
                    sx={{
                      width: { xs: 100, sm: 115, md: 130 },
                      height: { xs: 100, sm: 115, md: 130 },
                      fontSize: { xs: "1.25rem", sm: "1.5rem", md: "1.75rem" },
                    }}
                    style={{
                      border:
                        selectedFile || removePictureIntent
                          ? "3px solid #F2742C"
                          : "3px solid #32332d",
                      transition: "border-color 0.3s ease",
                    }}
                  />
                  {/* Status Text */}
                  {selectedFile ? (
                    <div className="text-center">
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#0F5648",
                          fontFamily: "'Poppins', sans-serif",
                          fontWeight: 600,
                          fontSize: "12px",
                          mb: 0,
                        }}
                      >
                        Preview
                      </Typography>
                      {/* <Typography
                        variant="caption"
                        sx={{
                          color: "#AA855B",
                          fontFamily: "'Poppins', sans-serif",
                          fontSize: "10px",
                        }}
                      >
                        {selectedFile.name} (
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </Typography> */}
                    </div>
                  ) : removePictureIntent ? (
                    <div className="text-center">
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#0F5648",
                          fontFamily: "'Poppins', sans-serif",
                          fontWeight: 600,
                          fontSize: "12px",
                          mb: 0,
                        }}
                      >
                        Preview
                      </Typography>
                      {/* <Typography
                        variant="caption"
                        sx={{
                          color: "#AA855B",
                          fontFamily: "'Poppins', sans-serif",
                          fontSize: "12px",
                          textAlign: "center",
                          mb: 0,
                        }}
                      >
                        Picture will be removed
                      </Typography> */}
                    </div>
                  ) : parentProfile.profile_picture_url ? (
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#AA855B",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: "12px",
                        textAlign: "center",
                        mb: 0,
                      }}
                    >
                      You have a custom profile picture
                    </Typography>
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#AA855B",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: "12px",
                        textAlign: "center",
                        mb: 0,
                      }}
                    >
                      Default avatar
                    </Typography>
                  )}
                </div>

                {/* Upload Area - Full Width */}
                <div className="w-full space-y-1">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="profile-picture-upload-modal"
                  />
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
                    <div className="space-y-1">
                      <Camera
                        className="w-5 h-5 sm:w-6 sm:h-6 mx-auto flex items-center justify-center mb-1.5 sm:mb-2"
                        style={{ color: "#AA855B" }}
                      />

                      <div>
                        <p
                          className="text-xs sm:text-sm mb-0.5 sm:mb-1 font-medium"
                          style={{ color: "#32332D" }}
                        >
                          Drop image here or click to upload
                        </p>
                        <p
                          className="text-[10px] sm:text-xs mb-1"
                          style={{ color: "#AA855B" }}
                        >
                          JPG, PNG, GIF, WebP (max 5MB)
                        </p>
                      </div>
                      <label
                        htmlFor="profile-picture-upload-modal"
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
                        {selectedFile
                          ? "Choose Different Image"
                          : "Choose Image File"}
                      </label>
                    </div>
                  </div>
                  {pictureError && (
                    <div className="text-sm text-red-600 font-['Poppins'] text-center mt-2">
                      {pictureError}
                    </div>
                  )}
                </div>

                {/* Remove Picture Button - Centered */}
                {(parentProfile.profile_picture_url || selectedFile) && (
                  <div className="flex justify-center w-full">
                    <Button
                      onClick={handleRemoveProfilePicture}
                      variant="outlined"
                      sx={{
                        color: "#D63B3B",
                        borderColor: "#D63B3B",
                        borderRadius: "20px",
                        textTransform: "none",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: "12px",
                        padding: "8px 16px",
                        "&:hover": {
                          backgroundColor: "#FFF4E6",
                          borderColor: "#D63B3B",
                        },
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {selectedFile ? "Cancel Upload" : "Remove Picture"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>

        {/* Footer - Full Width */}
        <DialogActions
          sx={{
            padding: { xs: "12px 16px", sm: "16px 24px" },
            backgroundColor: "#FAEFE2",
            borderTop: "1px solid #AA855B",
            gap: "8px",
            flexShrink: 0,
            flexDirection: { xs: "column-reverse", sm: "row" },
          }}
        >
          <button
            onClick={closeEditProfileModal}
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
          {/* Show Save Changes button for all tabs */}
          <button
            onClick={handleSaveParent}
            disabled={loading || uploadingPicture}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#0F5648" }}
            onMouseEnter={(e) => {
              if (!loading && !uploadingPicture) {
                e.currentTarget.style.backgroundColor = "#0A4538";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#0F5648";
            }}
          >
            {loading || uploadingPicture ? (
              <CircularProgress size={20} sx={{ color: "white" }} />
            ) : (
              "Save Changes"
            )}
          </button>
        </DialogActions>
      </Dialog>

      {/* Child Dialog */}
      <Dialog
        open={childDialogOpen}
        onClose={() => setChildDialogOpen(false)}
        maxWidth="md"
        fullWidth
        disableScrollLock={true}
        PaperProps={{
          sx: {
            borderRadius: { xs: "0", sm: "16px" },
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
            border: "1px solid #AA855B",
            height: { xs: "100vh", sm: "85vh" },
            maxHeight: { xs: "100vh", sm: "85vh" },
            margin: { xs: "0", sm: "16px" },
            width: { xs: "100%", sm: "auto" },
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
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
          <div className="flex items-center">
            <Baby className="w-5 h-5 mr-2" style={{ color: "#F2742C" }} />
            {editingChildIndex !== null ? "Edit Child" : "Add Child"}
          </div>
          <button
            onClick={() => setChildDialogOpen(false)}
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
        <DialogContent
          sx={{
            padding: { xs: "16px", sm: "20px", md: "24px" },
            backgroundColor: "#F5F5F5",
            flex: "1 1 auto",
            overflowY: "auto",
            minHeight: 0,
          }}
        >
          <form className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 mt-2 sm:mt-4">
            <TextField
              label="Name"
              value={childForm.name || ""}
              onChange={(e) => handleChildChange("name", e.target.value)}
              fullWidth
              required
              error={!!childFormErrors.name}
              helperText={childFormErrors.name}
              sx={getTextFieldStyles(!!childForm.name)}
            />
            <FormControl fullWidth required error={!!childFormErrors.gender}>
              <InputLabel sx={getLabelStyles()}>Gender</InputLabel>
              <Select
                value={childForm.gender || ""}
                label="Gender"
                onChange={(e) => handleChildChange("gender", e.target.value)}
                sx={getSelectStyles(!!childForm.gender)}
              >
                {genderOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option === "prefer_not_to_say"
                      ? "Prefer not to say"
                      : option.charAt(0).toUpperCase() +
                        option.slice(1).replace("_", " ")}
                  </MenuItem>
                ))}
              </Select>
              {childFormErrors.gender && (
                <FormHelperText>{childFormErrors.gender}</FormHelperText>
              )}
            </FormControl>
            <TextField
              label="Birth Date"
              type="date"
              value={childForm.birthdate || ""}
              onChange={(e) => handleChildChange("birthdate", e.target.value)}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              error={!!childFormErrors.birthdate}
              helperText={childFormErrors.birthdate}
              sx={getTextFieldStyles(!!childForm.birthdate)}
            />
            <TextField
              label="Age"
              value={
                childForm.birthdate
                  ? `${calculateAge(childForm.birthdate)} years old`
                  : "Not calculated yet"
              }
              fullWidth
              disabled
              InputProps={{
                readOnly: true,
              }}
              sx={{
                ...getTextFieldStyles(true), // Use standard styling
                "& .MuiOutlinedInput-root": {
                  ...getTextFieldStyles(true)["& .MuiOutlinedInput-root"],
                  backgroundColor: "#F5F5F5", // Override background to match form
                  cursor: "not-allowed", // Add disabled cursor
                },
              }}
            />
            <FormControl fullWidth>
              <InputLabel sx={getLabelStyles()}>Developmental Stage</InputLabel>
              <Select
                value={childForm.developmental_stage || ""}
                label="Developmental Stage"
                onChange={(e) =>
                  handleChildChange("developmental_stage", e.target.value)
                }
                sx={getSelectStyles(!!childForm.developmental_stage)}
              >
                {developmentalStageOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {formatDevelopmentalStage(option)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel sx={getLabelStyles()}>Education Level</InputLabel>
              <Select
                value={childForm.education_level || ""}
                label="Education Level"
                onChange={(e) =>
                  handleChildChange("education_level", e.target.value)
                }
                sx={getSelectStyles(!!childForm.education_level)}
              >
                {childEducationLevelOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {formatChildEducationLevel(option)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <div className="col-span-1 xl:col-span-2">
              <TextField
                label="Parenting Goals"
                value={childForm.parenting_goals || ""}
                onChange={(e) =>
                  handleChildChange("parenting_goals", e.target.value)
                }
                fullWidth
                multiline
                rows={2}
                placeholder="e.g., Help develop social skills, improve reading ability"
                sx={{
                  ...getTextFieldStyles(!!childForm.parenting_goals),
                  "& .MuiOutlinedInput-root": {
                    ...getTextFieldStyles(!!childForm.parenting_goals)[
                      "& .MuiOutlinedInput-root"
                    ],
                    alignItems: "flex-start",
                  },
                }}
              />
            </div>

            {/* Interests - Hybrid chips */}
            <div className="col-span-1 xl:col-span-2">
              <Typography
                variant="subtitle2"
                sx={{
                  color: "#32332D",
                  fontWeight: 600,
                  fontFamily: "'Poppins', sans-serif",
                  mb: 1,
                }}
              >
                Interests
              </Typography>
              <Autocomplete
                multiple
                freeSolo
                options={interestsOptions
                  .filter((o) => o !== "other" && o !== "none")
                  .map((o) => o.replace(/_/g, " "))}
                value={(childForm.interests || []).map((o: string) =>
                  o.replace(/_/g, " "),
                )}
                onChange={(_, newValue) =>
                  setChildChipsField("interests", newValue as string[])
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
                    placeholder="Type and press Enter"
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
                  {interestsOptions
                    .filter((o) => o !== "other" && o !== "none")
                    .filter((s) => {
                      const currentInterests = (childForm.interests || []).map(
                        (x: string) =>
                          x.replace(/_/g, " ").toLowerCase().trim(),
                      );
                      const suggestionNormalized = s
                        .replace(/_/g, " ")
                        .toLowerCase()
                        .trim();
                      return !currentInterests.includes(suggestionNormalized);
                    })
                    .map((s) => (
                      <Button
                        key={s}
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          setChildChipsField(
                            "interests",
                            normalizeTokens([
                              ...(childForm.interests || []).map((x: string) =>
                                x.replace(/_/g, " "),
                              ),
                              s.replace(/_/g, " "),
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
                        {s.replace(/_/g, " ")}
                      </Button>
                    ))}
                </div>
              </div>
            </div>

            {/* Characteristics - Hybrid chips */}
            <div className="col-span-1 xl:col-span-2">
              <Typography
                variant="subtitle2"
                sx={{
                  color: "#32332D",
                  fontWeight: 600,
                  fontFamily: "'Poppins', sans-serif",
                  mb: 1,
                }}
              >
                Characteristics
              </Typography>
              <Autocomplete
                multiple
                freeSolo
                options={characteristicsOptions
                  .filter((o) => o !== "other" && o !== "none")
                  .map((o) => o.replace(/_/g, " "))}
                value={(childForm.characteristics || []).map((o: string) =>
                  o.replace(/_/g, " "),
                )}
                onChange={(_, newValue) =>
                  setChildChipsField("characteristics", newValue as string[])
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
                    placeholder="Type and press Enter"
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
                  {characteristicsOptions
                    .filter((o) => o !== "other" && o !== "none")
                    .filter((s) => {
                      const currentCharacteristics = (
                        childForm.characteristics || []
                      ).map((x: string) =>
                        x.replace(/_/g, " ").toLowerCase().trim(),
                      );
                      const suggestionNormalized = s
                        .replace(/_/g, " ")
                        .toLowerCase()
                        .trim();
                      return !currentCharacteristics.includes(
                        suggestionNormalized,
                      );
                    })
                    .map((s) => (
                      <Button
                        key={s}
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          setChildChipsField(
                            "characteristics",
                            normalizeTokens([
                              ...(childForm.characteristics || []).map(
                                (x: string) => x.replace(/_/g, " "),
                              ),
                              s.replace(/_/g, " "),
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
                        {s.replace(/_/g, " ")}
                      </Button>
                    ))}
                </div>
              </div>
            </div>

            {/* Special Considerations - Hybrid chips */}
            <div className="col-span-1 xl:col-span-2">
              <Typography
                variant="subtitle2"
                sx={{
                  color: "#32332D",
                  fontWeight: 600,
                  fontFamily: "'Poppins', sans-serif",
                  mb: 1,
                }}
              >
                Special Considerations
              </Typography>
              <Autocomplete
                multiple
                freeSolo
                options={specialConsiderationsOptions
                  .filter((o) => o !== "other" && o !== "none")
                  .map((o) => o.replace(/_/g, " "))}
                value={(childForm.special_considerations || []).map(
                  (o: string) => o.replace(/_/g, " "),
                )}
                onChange={(_, newValue) =>
                  setChildChipsField(
                    "special_considerations",
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
                    placeholder="Type and press Enter"
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
                  {specialConsiderationsOptions
                    .filter((o) => o !== "other" && o !== "none")
                    .filter((s) => {
                      const currentSpecialConsiderations = (
                        childForm.special_considerations || []
                      ).map((x: string) =>
                        x.replace(/_/g, " ").toLowerCase().trim(),
                      );
                      const suggestionNormalized = s
                        .replace(/_/g, " ")
                        .toLowerCase()
                        .trim();
                      return !currentSpecialConsiderations.includes(
                        suggestionNormalized,
                      );
                    })
                    .map((s) => (
                      <Button
                        key={s}
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          setChildChipsField(
                            "special_considerations",
                            normalizeTokens([
                              ...(childForm.special_considerations || []).map(
                                (x: string) => x.replace(/_/g, " "),
                              ),
                              s.replace(/_/g, " "),
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
                        {s.replace(/_/g, " ")}
                      </Button>
                    ))}
                </div>
              </div>
            </div>

            {/* Current Challenges - Hybrid chips */}
            <div className="col-span-1 xl:col-span-2">
              <Typography
                variant="subtitle2"
                sx={{
                  color: "#32332D",
                  fontWeight: 600,
                  fontFamily: "'Poppins', sans-serif",
                  mb: 1,
                }}
              >
                Current Challenges
              </Typography>
              <Autocomplete
                multiple
                freeSolo
                options={challengesOptions
                  .filter((o) => o !== "other" && o !== "none")
                  .map((o) => o.replace(/_/g, " "))}
                value={(childForm.current_challenges || []).map((o: string) =>
                  o.replace(/_/g, " "),
                )}
                onChange={(_, newValue) =>
                  setChildChipsField("current_challenges", newValue as string[])
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
                    placeholder="Type and press Enter"
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
                  {challengesOptions
                    .filter((o) => o !== "other" && o !== "none")
                    .filter((s) => {
                      const currentChallenges = (
                        childForm.current_challenges || []
                      ).map((x: string) =>
                        x.replace(/_/g, " ").toLowerCase().trim(),
                      );
                      const suggestionNormalized = s
                        .replace(/_/g, " ")
                        .toLowerCase()
                        .trim();
                      return !currentChallenges.includes(suggestionNormalized);
                    })
                    .map((s) => (
                      <Button
                        key={s}
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          setChildChipsField(
                            "current_challenges",
                            normalizeTokens([
                              ...(childForm.current_challenges || []).map(
                                (x: string) => x.replace(/_/g, " "),
                              ),
                              s.replace(/_/g, " "),
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
                        {s.replace(/_/g, " ")}
                      </Button>
                    ))}
                </div>
              </div>
            </div>

            <div className="col-span-1 xl:col-span-2">
              <TextField
                label="Special Notes"
                value={childForm.special_notes || ""}
                onChange={(e) =>
                  handleChildChange("special_notes", e.target.value)
                }
                fullWidth
                multiline
                rows={3}
                placeholder="Any additional notes about your child..."
                sx={{
                  ...getTextFieldStyles(!!childForm.special_notes),
                  "& .MuiOutlinedInput-root": {
                    ...getTextFieldStyles(!!childForm.special_notes)[
                      "& .MuiOutlinedInput-root"
                    ],
                    alignItems: "flex-start",
                  },
                }}
              />
            </div>

            {/* Color Code Selection */}
            <div className="col-span-1 xl:col-span-2">
              <Typography
                variant="subtitle2"
                sx={{
                  color: "#32332D",
                  fontWeight: 600,
                  fontFamily: "'Poppins', sans-serif",
                  mb: { xs: 1.5, sm: 2 },
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                }}
              >
                Calendar Color
              </Typography>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <input
                  type="color"
                  value={childForm.color_code || "#326586"}
                  onChange={(e) =>
                    handleChildChange("color_code", e.target.value)
                  }
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 cursor-pointer flex-shrink-0"
                  style={{
                    borderColor: "#AA855B",
                    minWidth: "40px",
                    minHeight: "40px",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#AA855B",
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    }}
                  >
                    Choose a color for this child's diary entries in the
                    calendar view
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#AA855B",
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: { xs: "0.625rem", sm: "0.75rem" },
                    }}
                  >
                    This helps you quickly identify which child's entries you're
                    viewing
                  </Typography>
                </div>
              </div>
            </div>
          </form>
        </DialogContent>
        <DialogActions
          sx={{
            padding: { xs: "12px 16px", sm: "16px 24px" },
            backgroundColor: "#FAEFE2",
            borderTop: "1px solid #AA855B",
            gap: "8px",
            flexShrink: 0,
            flexDirection: { xs: "column-reverse", sm: "row" },
          }}
        >
          <button
            onClick={() => setChildDialogOpen(false)}
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
            onClick={handleSaveChild}
            disabled={childLoading}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#0F5648" }}
            onMouseEnter={(e) => {
              if (!childLoading) {
                e.currentTarget.style.backgroundColor = "#0A4538";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#0F5648";
            }}
          >
            {childLoading ? (
              <CircularProgress size={20} sx={{ color: "white" }} />
            ) : editingChildIndex !== null ? (
              "Update Child"
            ) : (
              "Add Child"
            )}
          </button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && childToDelete !== null && (
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
                Delete Child Profile
              </h3>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={cancelDeleteChild}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor:
                      children[childToDelete]?.color_code || "#326586",
                  }}
                >
                  <Baby className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4
                    className="font-medium font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    {children[childToDelete]?.name}
                  </h4>
                  <p
                    className="text-xs font-['Poppins']"
                    style={{ color: "#64635E" }}
                  >
                    {children[childToDelete]?.age ||
                      calculateAge(
                        children[childToDelete]?.birthdate || "",
                      )}{" "}
                    years old •{" "}
                    {formatGender(children[childToDelete]?.gender || "")}
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
                  Deleting this child profile will permanently remove all data
                  associated with this child's profile, including diary entries,
                  attachments, and other related information.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="confirm-delete-child"
                  className="w-4 h-4 rounded"
                  style={{ accentColor: "#EF4444" }}
                />
                <label
                  htmlFor="confirm-delete-child"
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
                onClick={cancelDeleteChild}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg font-medium font-['Poppins'] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#EF4444", color: "#FFFFFF" }}
                onClick={() => {
                  const checkbox = document.getElementById(
                    "confirm-delete-child",
                  ) as HTMLInputElement;
                  if (checkbox?.checked) {
                    confirmDeleteChild();
                  } else {
                    alert(
                      "Please confirm that you understand this action cannot be undone.",
                    );
                  }
                }}
                disabled={childLoading}
              >
                {childLoading ? (
                  <CircularProgress size={20} sx={{ color: "white" }} />
                ) : (
                  "Delete Child"
                )}
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

export default Profile;
