// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: SetupProfile.tsx
// Description: To provide interface for new users to set up their initial profile information
// First Written on: Wednesday, 01-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state and lifecycle management
import React, { useState, useEffect } from "react";
// Import React Router hooks for navigation
import { useNavigate } from "react-router-dom";
// Import Material-UI components for form elements
import {
  TextField,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  CircularProgress,
  Typography,
  Autocomplete,
  Chip,
} from "@mui/material";
// Import lucide-react icons for UI elements
import {
  User,
  Baby,
  ArrowRight,
  ArrowLeft,
  Check,
  Heart,
  Shield,
  ClipboardCheck,
} from "lucide-react";
// Import Poppins font weights for consistent typography
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
// Import API base URL configuration
import { API_BASE_URL } from "../config/api";

/**
 * Default parent profile object structure
 * Used to initialize parent profile form fields
 */
const defaultParentProfile = {
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
};

/**
 * Default address profile object structure
 * Used to initialize address form fields
 */
const defaultAddressProfile = {
  address_line: "",
  city: "",
  state: "",
  postcode: "",
  country: "Malaysia",
};

/**
 * Default child profile object structure
 * Used to initialize child profile form fields
 */
const defaultChildProfile = {
  id: "",
  name: "",
  birthdate: "",
  gender: "",
  developmental_stage: "",
  education_level: "",
  interests: [],
  characteristics: [],
  special_considerations: [],
  parenting_goals: "",
  current_challenges: [],
  special_notes: "",
  color_code: "#326586", // Default blue color
};

/**
 * Calculates age from a birthdate string
 * 
 * @param birthdate - Birthdate string in YYYY-MM-DD format
 * @returns Age in years as a number
 */
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

/**
 * Formats developmental stage for display
 * Converts stage codes to human-readable labels (focuses on ages 0-12)
 * 
 * @param stage - Developmental stage code
 * @returns Formatted display string
 */
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

/**
 * Formats child education level for display
 * Converts education level codes to human-readable labels
 * 
 * @param level - Education level code
 * @returns Formatted display string
 */
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

/**
 * Formats gender for display
 * Converts gender codes to human-readable labels
 * 
 * @param gender - Gender code
 * @returns Formatted display string
 */
const formatGender = (gender: string): string => {
  if (!gender) return "";
  if (gender === "prefer_not_to_say") return "Prefer not to say";
  return gender.charAt(0).toUpperCase() + gender.slice(1).replace("_", " ");
};

/**
 * Formats parent education level for display
 * Converts education level codes to human-readable labels
 * 
 * @param level - Education level code
 * @returns Formatted display string
 */
const formatEducationLevel = (level: string): string => {
  if (!level) return "";
  if (level === "none") return "None";
  return level.charAt(0).toUpperCase() + level.slice(1);
};

/**
 * Formats parenting style for display
 * Converts parenting style codes to human-readable labels
 * 
 * @param style - Parenting style code
 * @returns Formatted display string
 */
const formatParentingStyle = (style: string): string => {
  if (!style) return "";
  if (style === "not_sure") return "Not sure";
  if (style === "other") return "Other";
  return style.charAt(0).toUpperCase() + style.slice(1).replace(/_/g, " ");
};

/**
 * Formats communication style for display
 * Converts communication style codes to human-readable labels
 * 
 * @param style - Communication style code
 * @returns Formatted display string
 */
const formatCommunicationStyle = (style: string): string => {
  if (!style) return "";
  return style.charAt(0).toUpperCase() + style.slice(1);
};

/**
 * Formats family structure for display
 * Converts family structure codes to human-readable labels
 * 
 * @param structure - Family structure code
 * @returns Formatted display string
 */
const formatFamilyStructure = (structure: string): string => {
  if (!structure) return "";
  if (structure === "other") return "Other";
  return structure.charAt(0).toUpperCase() + structure.slice(1).replace(/_/g, " ");
};

/**
 * Formats relationship status for display
 * Converts relationship status codes to human-readable labels
 * 
 * @param status - Relationship status code
 * @returns Formatted display string
 */
const formatRelationshipStatus = (status: string): string => {
  if (!status) return "";
  if (status === "in_relationship") return "In relationship";
  if (status === "other") return "Other";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

/**
 * Formats relationship with child for display
 * Converts relationship with child codes to human-readable labels
 * 
 * @param relationship - Relationship with child code
 * @returns Formatted display string
 */
const formatRelationshipWithChild = (relationship: string): string => {
  if (!relationship) return "";
  if (relationship === "other") return "Other";
  return relationship.charAt(0).toUpperCase() + relationship.slice(1).replace(/_/g, " ");
};

/**
 * List of Malaysian states
 * Used for address form dropdown selection
 */
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

// Field options from database schema
const genderOptions = ["male", "female", "non_binary", "prefer_not_to_say"];

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
const educationLevelOptions = [
  "none",
  "primary",
  "secondary",
  "diploma",
  "bachelor",
  "master",
  "phd",
];

// Child profile options (0–12 years old)
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
const currentChallengesOptions = [
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

const SetupProfile: React.FC = () => {
  const navigate = useNavigate();
  const [parentProfile, setParentProfile] = useState<any>(defaultParentProfile);
  const [addressProfile, setAddressProfile] = useState<any>(
    defaultAddressProfile,
  );
  const [tempChildren, setTempChildren] = useState<any[]>([]); // Temporary children for this session
  const [currentChild, setCurrentChild] = useState<any>(defaultChildProfile);
  const [isEditingChild, setIsEditingChild] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [highlightedChildId, setHighlightedChildId] = useState<string | null>(
    null,
  );

  // Ref for scrolling to "Your Children" section
  const childrenListRef = React.useRef<HTMLDivElement>(null);

  // TextField styles function to override browser autofill styling
  const getTextFieldStyles = (hasValue: boolean) => ({
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      backgroundColor: hasValue ? "#F5F5F5" : "#EDEDED",
      fontFamily: "'Poppins', sans-serif",
      "&:hover": {
        //backgroundColor: "#F5F5F5",
      },
      "&.Mui-focused": {
        //backgroundColor: "#F5F5F5",
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
      //boxShadow: "0 0 0 2px #F2742C",
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

  const normalizeProfile = (profile: any) => ({
    first_name: profile.first_name || "",
    last_name: profile.last_name || "",
    gender: profile.gender || "",
    birthdate: profile.birthdate || "",
    occupation: profile.occupation || "",
    education_level: profile.education_level || "",
    experience_level: profile.experience_level || "",
    parenting_style: profile.parenting_style || "",
    preferred_communication_style: profile.preferred_communication_style || "",
    family_structure: profile.family_structure || "",
    relationship_status: profile.relationship_status || "",
    relationship_with_child: profile.relationship_with_child || "",
  });

  // Check user role and redirect if not parent
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          navigate("/login");
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/me`, {
          method: "GET",
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const userData = await response.json();
          const userRole = userData.role || "parent";

          // Only allow parent users to access setup-profile
          if (userRole !== "parent") {
            // Redirect to appropriate dashboard based on role
            if (userRole === "professional") {
              navigate("/professional-dashboard");
            } else if (userRole === "coordinator") {
              navigate("/coordinator-dashboard");
            } else if (userRole === "content_manager") {
              navigate("/content-manager-dashboard");
            } else if (userRole === "admin") {
              navigate("/admin-dashboard");
            } else {
              navigate("/parent-dashboard");
            }
          }
        }
      } catch (error) {
        console.error("Error checking user role:", error);
        // If check fails, still allow access (will fail later if not authenticated)
      }
    };

    checkUserRole();
  }, [navigate]);

  // Initialize profile data on mount (for first-time users, start with empty forms)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Try to fetch existing parent profile (might not exist for first-time users)
        const parentRes = await fetch(`${API_BASE_URL}/api/profile/parent`, {
          credentials: "include",
        });
        if (parentRes.ok) {
          const data = await parentRes.json();
          setParentProfile(normalizeProfile(data));
        } else if (parentRes.status === 401) {
          // No profile exists yet (first-time user) - this is expected
          console.log("No existing profile found - starting fresh");
          setParentProfile(defaultParentProfile);
        }

        // Try to fetch existing children (might not exist for first-time users)
        const childrenRes = await fetch(
          `${API_BASE_URL}/api/profile/children`,
          {
            credentials: "include",
          },
        );
        if (childrenRes.ok) {
          const data = await childrenRes.json();
          const savedChildren = data.map((c: any) => {
            const id = c.id ?? c.child_id;
            return { ...c, id: id !== undefined ? id.toString() : "" };
          });
          setTempChildren(savedChildren); // Initialize temp children with saved ones
        } else if (childrenRes.status === 401) {
          // No children exist yet (first-time user) - this is expected
          console.log("No existing children found - starting fresh");
          setTempChildren([]);
        }
      } catch (e) {
        console.log("Error fetching profile data:", e);
        // For first-time users, this is expected - start with empty forms
        setParentProfile(defaultParentProfile);
        setTempChildren([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Parent profile handlers
  const handleParentChange = (field: string, value: any) => {
    setParentProfile((prev: any) => ({ ...prev, [field]: value }));
  };

  // Address profile handlers
  const handleAddressChange = (field: string, value: any) => {
    setAddressProfile((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSaveParentProfile = async () => {
    // For first-time users, we don't save to database yet
    // Data is stored in React state and will be saved when user clicks "Complete Setup"
    console.log(
      "Parent profile data stored in state (will be saved on Complete Setup)",
    );
    setCurrentStep(2);
  };

  // Child profile handlers (working with temp children)
  const handleChildChange = (field: string, value: any) => {
    setCurrentChild((prev: any) => ({ ...prev, [field]: value }));
  };

  // old checkbox handler no longer used
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
  const setChipsField = (field: string, values: string[]) => {
    setCurrentChild((prev: any) => ({
      ...prev,
      [field]: normalizeTokens(values),
    }));
  };

  const handleSaveChild = async () => {
    setLoading(true);
    setError("");
    try {
      let childIdToHighlight = "";

      if (isEditingChild) {
        childIdToHighlight = isEditingChild;
        // Check if this is a temp child (not saved to DB yet) or a real child (already in DB)
        if (isEditingChild.startsWith("temp_")) {
          // Update temp child in state only (no API call needed)
          const updatedChild = {
            ...currentChild,
            id: isEditingChild,
            age: calculateAge(currentChild.birthdate),
          };
          setTempChildren((prev) =>
            prev.map((c) => (c.id === isEditingChild ? updatedChild : c)),
          );
        } else {
          // Update existing child in database
          const res = await fetch(
            `${API_BASE_URL}/api/profile/children/${isEditingChild}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                ...currentChild,
                age: calculateAge(currentChild.birthdate),
              }),
            },
          );
          if (!res.ok) {
            const data = await res.json();
            setError(data.detail || "Failed to update child");
            setLoading(false);
            return;
          }
          const updated = await res.json();
          const id = updated.id ?? updated.child_id;
          setTempChildren((prev) =>
            prev.map((c) =>
              c.id === isEditingChild
                ? { ...updated, id: id !== undefined ? id.toString() : "" }
                : c,
            ),
          );
        }
        setIsEditingChild(null);
      } else {
        // Add new child to temp state only (not saved to DB yet)
        const newChild = {
          ...currentChild,
          id: `temp_${Date.now()}`, // Temporary ID
          age: calculateAge(currentChild.birthdate),
        };
        childIdToHighlight = newChild.id;
        setTempChildren((prev) => [...prev, newChild]);
      }
      setCurrentChild(defaultChildProfile);

      // Highlight the added/updated child
      setHighlightedChildId(childIdToHighlight);

      // Smooth scroll to "Your Children" section after a brief delay to ensure DOM update
      setTimeout(() => {
        if (childrenListRef.current) {
          childrenListRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 100);

      // Remove highlight after animation completes
      setTimeout(() => {
        setHighlightedChildId(null);
      }, 2000);
    } catch (e) {
      setError("Failed to save child");
    } finally {
      setLoading(false);
    }
  };

  const handleEditChild = (child: any) => {
    setCurrentChild({ ...child });
    setIsEditingChild(child.id);
  };

  const handleDeleteChild = async (childId: string) => {
    setLoading(true);
    setError("");
    try {
      if (childId.startsWith("temp_")) {
        // Delete from temp state only
        setTempChildren((prev) => prev.filter((c) => c.id !== childId));
      } else {
        // Delete from database
        const res = await fetch(
          `${API_BASE_URL}/api/profile/children/${childId}`,
          {
            method: "DELETE",
            credentials: "include",
          },
        );
        if (!res.ok) {
          setError("Failed to delete child");
          setLoading(false);
          return;
        }
        setTempChildren((prev) => prev.filter((c) => c.id !== childId));
      }
      if (isEditingChild === childId) {
        setCurrentChild(defaultChildProfile);
        setIsEditingChild(null);
      }
    } catch (e) {
      setError("Failed to delete child");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setError("");
    try {
      console.log("Saving all profile data to database...");

      // Test authentication first
      try {
        const authTestRes = await fetch(`${API_BASE_URL}/api/auth/debug-auth`, {
          method: "GET",
          credentials: "include",
        });
        const authTestData = await authTestRes.json();
        console.log("Auth test result:", authTestData);
      } catch (e) {
        console.error("Auth test failed:", e);
      }

      // Get the auth token from localStorage
      const token = localStorage.getItem("auth_token");
      console.log(
        "Auth token from localStorage:",
        token ? "Token found" : "No token found",
      );
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        console.log("Authorization header set:", headers["Authorization"]);
      } else {
        console.warn("No auth token found in localStorage");
      }

      // 1. Save parent profile (including address data) to database
      console.log("Saving parent profile:", {
        ...parentProfile,
        ...addressProfile,
      });
      const parentRes = await fetch(`${API_BASE_URL}/api/profile/parent`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          ...parentProfile,
          ...addressProfile,
        }),
      });
      if (!parentRes.ok) {
        const data = await parentRes.json();
        setError(data.detail || "Failed to save parent profile");
        setLoading(false);
        return;
      }
      console.log("Parent profile saved successfully");

      // 2. Save all temp children to database
      const tempChildrenToSave = tempChildren.filter((child) =>
        child.id.startsWith("temp_"),
      );
      console.log("Total temp children to save:", tempChildrenToSave.length);
      console.log("Saving children:", tempChildrenToSave);

      for (const child of tempChildrenToSave) {
        const res = await fetch(`${API_BASE_URL}/api/profile/children`, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({
            ...child,
            id: undefined, // Remove temp ID
            age: calculateAge(child.birthdate), // Calculate age from birthdate
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.detail || "Failed to save children");
          setLoading(false);
          return;
        }
      }
      console.log("All children saved successfully");

      console.log("Profile setup completed successfully!");

      // Set flag in localStorage to indicate setup completion for success dialog
      localStorage.setItem("setup_completed", "true");

      // Redirect to ParentDashboard
      navigate("/parent-dashboard");
    } catch (e) {
      console.error("Error completing setup:", e);
      setError("Failed to complete setup");
    } finally {
      setLoading(false);
    }
  };

  // Navigation handlers
  const nextStep = () => {
    if (currentStep === 1) {
      handleSaveParentProfile();
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const prevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 4) {
      setCurrentStep(3);
    }
  };

  const skipAll = () => {
    navigate("/parent-dashboard");
  };

  // Validation - All fields are now optional

  const isChildValid = () => {
    // Since all fields are now optional, we can always proceed
    return true;
  };

  // Progress bar
  const renderProgressBar = () => (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span
          className="text-xs sm:text-sm font-medium font-['Poppins']"
          style={{ color: "#32332D" }}
        >
          Setup Progress
        </span>
        <span
          className="text-xs sm:text-sm font-['Poppins']"
          style={{ color: "#AA855B" }}
        >
          {currentStep} of 4
        </span>
      </div>
      <div
        className="w-full rounded-full h-2 sm:h-3"
        style={{ backgroundColor: "#EDEDED" }}
      >
        <div
          className="h-2 sm:h-3 rounded-full transition-all duration-500 shadow-sm"
          style={{
            width: `${(currentStep / 4) * 100}%`,
            backgroundColor: "#F2742C",
          }}
        />
      </div>
    </div>
  );

  // Step 1: Parent Profile
  const renderParentProfileStep = () => (
    <div>
      <div className="flex items-center mb-4 sm:mb-6">
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mr-3 sm:mr-4 shadow-md transition-transform duration-300 hover:scale-110 flex-shrink-0"
          style={{ backgroundColor: "#F2742C" }}
        >
          <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <h2
            className="text-lg sm:text-xl font-bold font-['Poppins']"
            style={{ color: "#32332D" }}
          >
            Parent Profile
          </h2>
          <p
            className="text-xs sm:text-sm font-['Poppins']"
            style={{ color: "#AA855B" }}
          >
            Tell us about yourself to personalize your experience
          </p>
        </div>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          nextStep();
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <TextField
              label="First Name"
              value={parentProfile.first_name}
              onChange={(e) => handleParentChange("first_name", e.target.value)}
              fullWidth
              sx={getTextFieldStyles(!!parentProfile.first_name)}
            />
          </div>
          <div>
            <TextField
              label="Last Name"
              value={parentProfile.last_name}
              onChange={(e) => handleParentChange("last_name", e.target.value)}
              fullWidth
              sx={getTextFieldStyles(!!parentProfile.last_name)}
            />
          </div>
          <div>
            <FormControl fullWidth>
              <InputLabel sx={getLabelStyles()}>Gender</InputLabel>
              <Select
                value={parentProfile.gender}
                label="Gender"
                onChange={(e) => handleParentChange("gender", e.target.value)}
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
            </FormControl>
          </div>
          <div>
            <TextField
              label="Birth Date"
              type="date"
              value={parentProfile.birthdate}
              onChange={(e) => handleParentChange("birthdate", e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={getTextFieldStyles(!!parentProfile.birthdate)}
            />
          </div>
          <div>
            <TextField
              label="Occupation"
              value={parentProfile.occupation}
              onChange={(e) => handleParentChange("occupation", e.target.value)}
              fullWidth
              sx={getTextFieldStyles(!!parentProfile.occupation)}
            />
          </div>
          <div>
            <FormControl fullWidth>
              <InputLabel sx={getLabelStyles()}>Education Level</InputLabel>
              <Select
                value={parentProfile.education_level}
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
          </div>
          <div>
            <FormControl fullWidth>
              <InputLabel sx={getLabelStyles()}>Experience Level</InputLabel>
              <Select
                value={parentProfile.experience_level}
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
              <InputLabel sx={getLabelStyles()}>Parenting Style</InputLabel>
              <Select
                value={parentProfile.parenting_style}
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
            {parentProfile.parenting_style === "other" && (
              <TextField
                label="Please specify your parenting style"
                value={parentProfile.customParentingStyle || ""}
                onChange={(e) =>
                  handleParentChange("customParentingStyle", e.target.value)
                }
                fullWidth
                size="small"
                sx={{
                  mt: 2,
                  ...getTextFieldStyles(!!parentProfile.customParentingStyle),
                }}
              />
            )}
          </div>
          <div>
            <FormControl fullWidth>
              <InputLabel sx={getLabelStyles()}>
                Preferred Communication Style
              </InputLabel>
              <Select
                value={parentProfile.preferred_communication_style}
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
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* removed customCommunicationStyle field */}
          </div>
          <div>
            <FormControl fullWidth>
              <InputLabel sx={getLabelStyles()}>Family Structure</InputLabel>
              <Select
                value={parentProfile.family_structure}
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
                  handleParentChange("customFamilyStructure", e.target.value)
                }
                fullWidth
                size="small"
                sx={{
                  mt: 2,
                  ...getTextFieldStyles(!!parentProfile.customFamilyStructure),
                }}
              />
            )}
          </div>
          <div>
            <FormControl fullWidth>
              <InputLabel sx={getLabelStyles()}>Relationship Status</InputLabel>
              <Select
                value={parentProfile.relationship_status}
                label="Relationship Status"
                onChange={(e) =>
                  handleParentChange("relationship_status", e.target.value)
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
                  handleParentChange("customRelationshipStatus", e.target.value)
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
                value={parentProfile.relationship_with_child}
                label="Relationship with Child"
                onChange={(e) =>
                  handleParentChange("relationship_with_child", e.target.value)
                }
                sx={getSelectStyles(!!parentProfile.relationship_with_child)}
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
      </form>
    </div>
  );

  // Step 2: Address Profile
  const renderAddressStep = () => (
    <div>
      <div className="flex items-center mb-4 sm:mb-6">
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mr-3 sm:mr-4 shadow-md transition-transform duration-300 hover:scale-110 flex-shrink-0"
          style={{ backgroundColor: "#326586" }}
        >
          <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <h2
            className="text-lg sm:text-xl font-bold font-['Poppins']"
            style={{ color: "#32332D" }}
          >
            Location Information
          </h2>
          <p
            className="text-xs sm:text-sm font-['Poppins']"
            style={{ color: "#AA855B" }}
          >
            Help us recommend verified professional parenting-related services
            in your area
          </p>
        </div>
      </div>

      <div
        className="bg-blue-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6"
        style={{ border: "1px solid #326586" }}
      >
        <div className="flex items-start space-x-2 sm:space-x-3">
          <div
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0"
            style={{ backgroundColor: "#326586" }}
          >
            <span className="text-white text-xs sm:text-sm font-bold">i</span>
          </div>
          <div>
            <p
              className="text-xs sm:text-sm font-medium font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              Location information is optional but helps us:
            </p>
            <ul
              className="text-xs sm:text-sm mt-1.5 sm:mt-2 space-y-0.5 sm:space-y-1 font-['Poppins']"
              style={{ color: "#AA855B" }}
            >
              <li>• Find verified professionals in your area</li>
              <li>• Connect you with local parenting communities</li>
              <li>• Recommend location-specific services and events</li>
            </ul>
          </div>
        </div>
      </div>

      <form
        className="space-y-3 sm:space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          nextStep();
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="sm:col-span-2">
            <TextField
              label="Address Line"
              value={addressProfile.address_line}
              onChange={(e) =>
                handleAddressChange("address_line", e.target.value)
              }
              fullWidth
              placeholder="e.g., 123 Jalan Merdeka, Taman ABC"
              sx={getTextFieldStyles(!!addressProfile.address_line)}
            />
          </div>
          <div>
            <TextField
              label="City"
              value={addressProfile.city}
              onChange={(e) => handleAddressChange("city", e.target.value)}
              fullWidth
              placeholder="e.g., Kuala Lumpur"
              sx={getTextFieldStyles(!!addressProfile.city)}
            />
          </div>
          <div>
            <FormControl fullWidth>
              <InputLabel sx={getLabelStyles()}>State</InputLabel>
              <Select
                value={addressProfile.state}
                label="State"
                onChange={(e) => handleAddressChange("state", e.target.value)}
                sx={getSelectStyles(!!addressProfile.state)}
              >
                {malaysianStates.map((state) => (
                  <MenuItem key={state} value={state}>
                    {state}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
          <div>
            <TextField
              label="Postcode"
              value={addressProfile.postcode}
              onChange={(e) => handleAddressChange("postcode", e.target.value)}
              fullWidth
              placeholder="e.g., 50000"
              inputProps={{ maxLength: 10 }}
              sx={getTextFieldStyles(!!addressProfile.postcode)}
            />
          </div>
          <div>
            <TextField
              label="Country"
              value={addressProfile.country}
              onChange={(e) => handleAddressChange("country", e.target.value)}
              fullWidth
              disabled
              sx={{
                ...getTextFieldStyles(true), // Use standard styling
                "& .MuiOutlinedInput-root": {
                  ...getTextFieldStyles(true)["& .MuiOutlinedInput-root"],
                  backgroundColor: "#F5F5F5", // Override background to match form
                  cursor: "not-allowed", // Add disabled cursor
                },
              }}
            />
          </div>
        </div>
      </form>
    </div>
  );

  // Step 3: Children Profile
  const renderChildrenStep = () => (
    <div>
      <div className="flex items-center mb-4 sm:mb-6">
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mr-3 sm:mr-4 shadow-md transition-transform duration-300 hover:scale-110 flex-shrink-0"
          style={{ backgroundColor: "#0F5648" }}
        >
          <Baby className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <h2
            className="text-lg sm:text-xl font-bold font-['Poppins']"
            style={{ color: "#32332D" }}
          >
            Children Profile
          </h2>
          <p
            className="text-xs sm:text-sm font-['Poppins']"
            style={{ color: "#AA855B" }}
          >
            Add your children to get personalized parenting advice
          </p>
        </div>
      </div>

      {tempChildren.length > 0 && (
        <div
          ref={childrenListRef}
          className="space-y-2 mb-4 sm:mb-6 scroll-mt-4"
        >
          <Typography
            variant="h6"
            className="mb-2"
            sx={{
              fontWeight: 600,
              fontFamily: "'Poppins', sans-serif",
              fontSize: { xs: "1rem", sm: "1.25rem" },
            }}
          >
            Your Children
          </Typography>
          {tempChildren.map((child) => (
            <div
              key={child.id}
              className="p-2.5 sm:p-3 rounded-md flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2.5 sm:gap-0 transition-all duration-500"
              style={{
                backgroundColor:
                  highlightedChildId === child.id ? "#FFF4E6" : "#F5F5F5",
                border:
                  highlightedChildId === child.id
                    ? "2px solid #F2742C"
                    : "2px solid transparent",
                transform:
                  highlightedChildId === child.id ? "scale(1.02)" : "scale(1)",
                boxShadow:
                  highlightedChildId === child.id
                    ? "0 4px 12px rgba(242, 116, 44, 0.2)"
                    : "none",
              }}
            >
              <div className="flex-1 min-w-0">
                <Typography
                  fontWeight={600}
                  sx={{
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  {child.name}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  {child.age} years old • {formatGender(child.gender)} •{" "}
                  {formatDevelopmentalStage(child.developmental_stage)}
                </Typography>
                {child.id.startsWith("temp_") && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontSize: { xs: "0.625rem", sm: "0.75rem" },
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    (Not saved yet)
                  </Typography>
                )}
              </div>
              <div className="flex items-center justify-end sm:justify-start gap-2 sm:ml-2">
                <Button
                  size="small"
                  onClick={() => handleEditChild(child)}
                  sx={{
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    fontFamily: "'Poppins', sans-serif",
                    minWidth: { xs: "60px", sm: "auto" },
                    padding: { xs: "4px 12px", sm: "6px 16px" },
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleDeleteChild(child.id)}
                  sx={{
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    fontFamily: "'Poppins', sans-serif",
                    minWidth: { xs: "60px", sm: "auto" },
                    padding: { xs: "4px 12px", sm: "6px 16px" },
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form
        className="space-y-3 sm:space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSaveChild();
        }}
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
          <div className="xl:col-span-1">
            <TextField
              label="Name"
              value={currentChild.name}
              onChange={(e) => handleChildChange("name", e.target.value)}
              fullWidth
              sx={getTextFieldStyles(!!currentChild.name)}
            />
          </div>
          <div className="xl:col-span-1">
            <FormControl fullWidth>
              <InputLabel sx={getLabelStyles()}>Gender</InputLabel>
              <Select
                value={currentChild.gender}
                label="Gender"
                onChange={(e) => handleChildChange("gender", e.target.value)}
                sx={getSelectStyles(!!currentChild.gender)}
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
            </FormControl>
          </div>
          <div className="xl:col-span-1">
            <TextField
              label="Birth Date"
              type="date"
              value={currentChild.birthdate}
              onChange={(e) => handleChildChange("birthdate", e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={getTextFieldStyles(!!currentChild.birthdate)}
            />
          </div>
          <div className="xl:col-span-1">
            <TextField
              label="Age"
              value={
                currentChild.birthdate
                  ? `${calculateAge(currentChild.birthdate)} years old`
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
          </div>
          <div className="xl:col-span-1">
            <FormControl fullWidth>
              <InputLabel sx={getLabelStyles()}>Developmental Stage</InputLabel>
              <Select
                value={currentChild.developmental_stage}
                label="Developmental Stage"
                onChange={(e) =>
                  handleChildChange("developmental_stage", e.target.value)
                }
                sx={getSelectStyles(!!currentChild.developmental_stage)}
              >
                {developmentalStageOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {formatDevelopmentalStage(option)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
          <div className="xl:col-span-1">
            <FormControl fullWidth>
              <InputLabel sx={getLabelStyles()}>Education Level</InputLabel>
              <Select
                value={currentChild.education_level}
                label="Education Level"
                onChange={(e) =>
                  handleChildChange("education_level", e.target.value)
                }
                sx={getSelectStyles(!!currentChild.education_level)}
              >
                {childEducationLevelOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {formatChildEducationLevel(option)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
          <div className="col-span-1 xl:col-span-2">
            <TextField
              label="Parenting Goals"
              value={currentChild.parenting_goals}
              onChange={(e) =>
                handleChildChange("parenting_goals", e.target.value)
              }
              fullWidth
              multiline
              rows={2}
              placeholder="e.g., Help develop social skills, improve reading ability"
              sx={getTextFieldStyles(!!currentChild.parenting_goals)}
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
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
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
              value={(currentChild.interests || []).map((o: string) =>
                o.replace(/_/g, " "),
              )}
              onChange={(_, newValue) =>
                setChipsField("interests", newValue as string[])
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
                    const currentInterests = (currentChild.interests || []).map(
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
                        setChipsField(
                          "interests",
                          normalizeTokens([
                            ...(currentChild.interests || []).map((x: string) =>
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
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
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
              value={(currentChild.characteristics || []).map((o: string) =>
                o.replace(/_/g, " "),
              )}
              onChange={(_, newValue) =>
                setChipsField("characteristics", newValue as string[])
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
                      currentChild.characteristics || []
                    ).map((x: string) =>
                      x.replace(/_/g, " ").toLowerCase().trim(),
                    );
                    const suggestionNormalized = s
                      .replace(/_/g, " ")
                      .toLowerCase()
                      .trim();
                    return !currentCharacteristics.includes(suggestionNormalized);
                  })
                  .map((s) => (
                    <Button
                      key={s}
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        setChipsField(
                          "characteristics",
                          normalizeTokens([
                            ...(currentChild.characteristics || []).map(
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
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
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
              value={(currentChild.special_considerations || []).map(
                (o: string) => o.replace(/_/g, " "),
              )}
              onChange={(_, newValue) =>
                setChipsField("special_considerations", newValue as string[])
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
                      currentChild.special_considerations || []
                    ).map((x: string) =>
                      x.replace(/_/g, " ").toLowerCase().trim(),
                    );
                    const suggestionNormalized = s
                      .replace(/_/g, " ")
                      .toLowerCase()
                      .trim();
                    return !currentSpecialConsiderations.includes(suggestionNormalized);
                  })
                  .map((s) => (
                    <Button
                      key={s}
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        setChipsField(
                          "special_considerations",
                          normalizeTokens([
                            ...(currentChild.special_considerations || []).map(
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
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              Current Challenges
            </Typography>
            <Autocomplete
              multiple
              freeSolo
              options={currentChallengesOptions
                .filter((o) => o !== "other" && o !== "none")
                .map((o) => o.replace(/_/g, " "))}
              value={(currentChild.current_challenges || []).map((o: string) =>
                o.replace(/_/g, " "),
              )}
              onChange={(_, newValue) =>
                setChipsField("current_challenges", newValue as string[])
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
                {currentChallengesOptions
                  .filter((o) => o !== "other" && o !== "none")
                  .filter((s) => {
                    const currentChallenges = (
                      currentChild.current_challenges || []
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
                        setChipsField(
                          "current_challenges",
                          normalizeTokens([
                            ...(currentChild.current_challenges || []).map(
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
              value={currentChild.special_notes}
              onChange={(e) =>
                handleChildChange("special_notes", e.target.value)
              }
              fullWidth
              multiline
              rows={3}
              placeholder="Any additional notes about your child..."
              sx={getTextFieldStyles(!!currentChild.special_notes)}
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
                mb: 1.5,
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              Calendar Color
            </Typography>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <input
                type="color"
                value={currentChild.color_code || "#326586"}
                onChange={(e) =>
                  handleChildChange("color_code", e.target.value)
                }
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-gray-300 cursor-pointer flex-shrink-0"
                style={{ borderColor: "#AA855B" }}
              />
              <div>
                <Typography
                  variant="body2"
                  sx={{
                    color: "#AA855B",
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  }}
                >
                  Choose a color for this child's diary entries in the calendar
                  view
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
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-0 mt-3 sm:mt-4">
          {isEditingChild && (
            <button
              onClick={() => {
                setCurrentChild(defaultChildProfile);
                setIsEditingChild(null);
              }}
              className="px-4 sm:px-6 py-2 sm:py-3 border rounded-xl transition-all duration-200 font-medium text-xs sm:text-sm font-['Poppins'] sm:mr-3"
              style={{
                borderColor: "#AA855B",
                color: "#AA855B",
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#EDEDED";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!isChildValid()}
            className="px-4 sm:px-6 py-2 sm:py-3 text-white rounded-xl transition-all duration-200 font-medium text-xs sm:text-sm font-['Poppins'] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#326586" }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = "#2A5A7A";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#326586";
            }}
          >
            {isEditingChild ? "Update Child" : "Add Child"}
          </button>
        </div>
      </form>
    </div>
  );

  // Step 4: Review & Complete
  const renderReviewStep = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center mb-4 sm:mb-6">
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mr-3 sm:mr-4 shadow-md transition-transform duration-300 hover:scale-110 flex-shrink-0"
          style={{ backgroundColor: "#722F37" }}
        >
          <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <h2
            className="text-lg sm:text-xl font-bold font-['Poppins']"
            style={{ color: "#32332D" }}
          >
            Review Your Information
          </h2>
          <p
            className="text-xs sm:text-sm font-['Poppins']"
            style={{ color: "#AA855B" }}
          >
            Please review the information you've provided before completing your
            setup.
          </p>
        </div>
      </div>

      {/* Parent Profile Information - Only show if user entered data */}
      {(parentProfile.first_name ||
        parentProfile.last_name ||
        parentProfile.gender ||
        parentProfile.occupation ||
        parentProfile.education_level ||
        parentProfile.experience_level ||
        parentProfile.parenting_style ||
        parentProfile.preferred_communication_style ||
        parentProfile.family_structure ||
        parentProfile.relationship_status ||
        parentProfile.relationship_with_child) && (
        <div
          className="rounded-xl p-4 sm:p-6"
          style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
        >
          <h3
            className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 font-['Poppins'] flex items-center"
            style={{ color: "#32332D" }}
          >
            <User className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
            Parent Profile Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
            {(parentProfile.first_name || parentProfile.last_name) && (
              <div>
                <span className="font-medium" style={{ color: "#AA855B" }}>
                  Name:
                </span>
                <span className="ml-2" style={{ color: "#32332D" }}>
                  {parentProfile.first_name} {parentProfile.last_name}
                </span>
              </div>
            )}
            {parentProfile.gender && (
              <div>
                <span className="font-medium" style={{ color: "#AA855B" }}>
                  Gender:
                </span>
                <span className="ml-2" style={{ color: "#32332D" }}>
                  {formatGender(parentProfile.gender)}
                </span>
              </div>
            )}
            {parentProfile.occupation && (
              <div>
                <span className="font-medium" style={{ color: "#AA855B" }}>
                  Occupation:
                </span>
                <span className="ml-2" style={{ color: "#32332D" }}>
                  {parentProfile.occupation}
                </span>
              </div>
            )}
            {parentProfile.education_level && (
              <div>
                <span className="font-medium" style={{ color: "#AA855B" }}>
                  Education Level:
                </span>
                <span className="ml-2" style={{ color: "#32332D" }}>
                  {formatEducationLevel(parentProfile.education_level)}
                </span>
              </div>
            )}
            {parentProfile.experience_level && (
              <div>
                <span className="font-medium" style={{ color: "#AA855B" }}>
                  Experience Level:
                </span>
                <span className="ml-2" style={{ color: "#32332D" }}>
                  {parentProfile.experience_level}
                </span>
              </div>
            )}
            {parentProfile.parenting_style && (
              <div>
                <span className="font-medium" style={{ color: "#AA855B" }}>
                  Parenting Style:
                </span>
                <span className="ml-2" style={{ color: "#32332D" }}>
                  {formatParentingStyle(parentProfile.parenting_style)}
                </span>
              </div>
            )}
            {parentProfile.preferred_communication_style && (
              <div>
                <span className="font-medium" style={{ color: "#AA855B" }}>
                  Communication Style:
                </span>
                <span className="ml-2" style={{ color: "#32332D" }}>
                  {formatCommunicationStyle(parentProfile.preferred_communication_style)}
                </span>
              </div>
            )}
            {parentProfile.family_structure && (
              <div>
                <span className="font-medium" style={{ color: "#AA855B" }}>
                  Family Structure:
                </span>
                <span className="ml-2" style={{ color: "#32332D" }}>
                  {formatFamilyStructure(parentProfile.family_structure)}
                </span>
              </div>
            )}
            {parentProfile.relationship_status && (
              <div>
                <span className="font-medium" style={{ color: "#AA855B" }}>
                  Relationship Status:
                </span>
                <span className="ml-2" style={{ color: "#32332D" }}>
                  {formatRelationshipStatus(parentProfile.relationship_status)}
                </span>
              </div>
            )}
            {parentProfile.relationship_with_child && (
              <div>
                <span className="font-medium" style={{ color: "#AA855B" }}>
                  Relationship with Child:
                </span>
                <span className="ml-2" style={{ color: "#32332D" }}>
                  {formatRelationshipWithChild(parentProfile.relationship_with_child)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location Information - Only show if user entered data */}
      {(addressProfile.address_line ||
        addressProfile.city ||
        addressProfile.state ||
        (addressProfile.country && addressProfile.country !== "Malaysia")) && (
        <div
          className="rounded-xl p-4 sm:p-6"
          style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
        >
          <h3
            className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 font-['Poppins'] flex items-center"
            style={{ color: "#32332D" }}
          >
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
            Location Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
            {addressProfile.address_line && (
              <div>
                <span className="font-medium" style={{ color: "#AA855B" }}>
                  Address:
                </span>
                <span className="ml-2" style={{ color: "#32332D" }}>
                  {addressProfile.address_line}
                </span>
              </div>
            )}
            {addressProfile.city && (
              <div>
                <span className="font-medium" style={{ color: "#AA855B" }}>
                  City:
                </span>
                <span className="ml-2" style={{ color: "#32332D" }}>
                  {addressProfile.city}
                </span>
              </div>
            )}
            {addressProfile.state && (
              <div>
                <span className="font-medium" style={{ color: "#AA855B" }}>
                  State:
                </span>
                <span className="ml-2" style={{ color: "#32332D" }}>
                  {addressProfile.state}
                </span>
              </div>
            )}
            {addressProfile.country &&
              addressProfile.country !== "Malaysia" && (
                <div>
                  <span className="font-medium" style={{ color: "#AA855B" }}>
                    Country:
                  </span>
                  <span className="ml-2" style={{ color: "#32332D" }}>
                    {addressProfile.country}
                  </span>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Children Profile(s) */}
      {tempChildren.length > 0 && (
        <div
          className="rounded-xl p-4 sm:p-6"
          style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
        >
          <h3
            className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 font-['Poppins'] flex items-center"
            style={{ color: "#32332D" }}
          >
            <Baby className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
            Children Profile{tempChildren.length > 1 ? "s" : ""}
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {tempChildren.map((child, index) => (
              <div
                key={child.id}
                className="border-l-4 pl-3 sm:pl-4"
                style={{ borderColor: "#AA855B" }}
              >
                <h4
                  className="font-medium text-sm sm:text-base font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  {child.name}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs sm:text-sm mt-1.5 sm:mt-2">
                  {child.birthdate && (
                    <div>
                      <span
                        className="font-medium"
                        style={{ color: "#AA855B" }}
                      >
                        Age:
                      </span>
                      <span className="ml-2" style={{ color: "#32332D" }}>
                        {calculateAge(child.birthdate)} years old
                      </span>
                    </div>
                  )}
                  {child.gender && (
                    <div>
                      <span
                        className="font-medium"
                        style={{ color: "#AA855B" }}
                      >
                        Gender:
                      </span>
                      <span className="ml-2" style={{ color: "#32332D" }}>
                        {formatGender(child.gender)}
                      </span>
                    </div>
                  )}
                  {child.developmental_stage && (
                    <div>
                      <span
                        className="font-medium"
                        style={{ color: "#AA855B" }}
                      >
                        Stage:
                      </span>
                      <span className="ml-2" style={{ color: "#32332D" }}>
                        {formatDevelopmentalStage(child.developmental_stage)}
                      </span>
                    </div>
                  )}
                  {child.education_level && (
                    <div>
                      <span
                        className="font-medium"
                        style={{ color: "#AA855B" }}
                      >
                        Education:
                      </span>
                      <span className="ml-2" style={{ color: "#32332D" }}>
                        {formatChildEducationLevel(child.education_level)}
                      </span>
                    </div>
                  )}
                  {child.interests && child.interests.length > 0 && (
                    <div>
                      <span
                        className="font-medium"
                        style={{ color: "#AA855B" }}
                      >
                        Interests:
                      </span>
                      <span className="ml-2" style={{ color: "#32332D" }}>
                        {child.interests.join(", ")}
                      </span>
                    </div>
                  )}
                  {child.characteristics &&
                    child.characteristics.length > 0 && (
                      <div>
                        <span
                          className="font-medium"
                          style={{ color: "#AA855B" }}
                        >
                          Characteristics:
                        </span>
                        <span className="ml-2" style={{ color: "#32332D" }}>
                          {child.characteristics.join(", ")}
                        </span>
                      </div>
                    )}
                  {child.current_challenges &&
                    child.current_challenges.length > 0 && (
                      <div>
                        <span
                          className="font-medium"
                          style={{ color: "#AA855B" }}
                        >
                          Current Challenges:
                        </span>
                        <span className="ml-2" style={{ color: "#32332D" }}>
                          {child.current_challenges.join(", ")}
                        </span>
                      </div>
                    )}
                  {child.parenting_goals && (
                    <div>
                      <span
                        className="font-medium"
                        style={{ color: "#AA855B" }}
                      >
                        Parenting Goals:
                      </span>
                      <span className="ml-2" style={{ color: "#32332D" }}>
                        {child.parenting_goals}
                      </span>
                    </div>
                  )}
                  {child.special_notes && (
                    <div>
                      <span
                        className="font-medium"
                        style={{ color: "#AA855B" }}
                      >
                        Special Notes:
                      </span>
                      <span className="ml-2" style={{ color: "#32332D" }}>
                        {child.special_notes}
                      </span>
                    </div>
                  )}
                  {child.color_code && child.color_code !== "#326586" && (
                    <div className="flex items-center">
                      <span
                        className="font-medium"
                        style={{ color: "#AA855B" }}
                      >
                        Color:
                      </span>
                      <div
                        className="w-4 h-4 rounded ml-2"
                        style={{ backgroundColor: child.color_code }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // UI
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[7fr_3fr]">
      {/* LEFT PANEL - Fixed Header/Footer with Scrollable Content */}
      <div
        className="flex flex-col h-screen"
        style={{ backgroundColor: "#F5F5F5" }}
      >
        {/* FIXED HEADER */}
        <div className="flex-none py-4 sm:py-6 px-4 sm:px-6 md:px-8">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="text-center mb-3 sm:mb-4">
              <h1
                className="text-xl sm:text-2xl font-bold mb-0.5 font-['Poppins']"
                style={{ color: "#32332D" }}
              >
                Complete Your Profile
              </h1>
              <p
                className="text-sm sm:text-base font-['Poppins']"
                style={{ color: "#32332D" }}
              >
                Let's personalize your parenting experience
              </p>
            </div>

            {/* Progress Bar */}
            {renderProgressBar()}
          </div>
        </div>

        {/* SCROLLABLE FORM CONTENT */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8">
          <div className="max-w-3xl mx-auto pb-4 sm:pb-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 text-center mb-4 sm:mb-6">
                <div className="flex items-center justify-center text-red-600">
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-['Poppins']">
                    {error}
                  </span>
                </div>
              </div>
            )}

            {/* Step Content */}
            {currentStep === 1 && renderParentProfileStep()}
            {currentStep === 2 && renderAddressStep()}
            {currentStep === 3 && renderChildrenStep()}
            {currentStep === 4 && renderReviewStep()}
          </div>
        </div>

        {/* FIXED NAVIGATION BUTTONS */}
        <div className="flex-none px-4 sm:px-6 md:px-8 py-2 sm:py-3">
          <div
            className="max-w-3xl mx-auto pt-2.5 sm:pt-3"
            style={{ borderTop: "1px solid #AA855B" }}
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-4 sm:px-5 py-2 sm:py-2.5 border rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-xs sm:text-sm font-['Poppins']"
                style={{
                  borderColor: "#AA855B",
                  color: "#AA855B",
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  if (currentStep !== 1) {
                    e.currentTarget.style.backgroundColor = "#EDEDED";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Previous</span>
              </button>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                {/* Skip All Button */}
                <button
                  onClick={skipAll}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 font-medium text-xs sm:text-sm font-['Poppins'] transition-colors text-center"
                  style={{ color: "#AA855B" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#F2742C";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#AA855B";
                  }}
                >
                  Skip for now
                </button>

                {currentStep < 4 ? (
                  <button
                    onClick={nextStep}
                    className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-4 sm:px-5 py-2 sm:py-2.5 text-white rounded-xl transition-all duration-200 font-medium text-xs sm:text-sm font-['Poppins'] shadow-lg hover:shadow-xl"
                    style={{ backgroundColor: "#F2742C" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#E55A1F";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#F2742C";
                    }}
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleComplete}
                    className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-4 sm:px-5 py-2 sm:py-2.5 text-white rounded-xl transition-all duration-200 font-medium text-xs sm:text-sm font-['Poppins'] shadow-lg hover:shadow-xl"
                    style={{ backgroundColor: "#0F5648" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#0A4538";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#0F5648";
                    }}
                  >
                    <span className="whitespace-nowrap">Complete Setup</span>
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Fixed Sticky Content (Hidden on mobile) */}
      <div
        className="hidden lg:flex flex-col items-center justify-between p-8 sticky top-0 h-screen"
        style={{ backgroundColor: "#FAEFE2" }}
      >
        {/* Logo - Centered */}
        <div className="flex-1 flex items-center justify-center">
          <img
            src="/logos/parenzing-middle-logo-350x350-black.png"
            alt="ParenZing Logo"
            className="w-64 h-64 transition-transform duration-500 hover:scale-105"
          />
        </div>

        {/* Footer - Sticky at bottom */}
        <div className="text-center">
          <div
            className="flex items-center justify-center space-x-2"
            style={{ color: "#AA855B" }}
          >
            <Heart className="w-4 h-4" />
            <span className="text-sm font-semibold font-['Poppins']">
              Building stronger families together
            </span>
            <Heart className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupProfile;
