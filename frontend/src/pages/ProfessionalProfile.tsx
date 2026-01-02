// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: ProfessionalProfile.tsx
// Description: To provide interface for professional users to view and edit their profile information
// First Written on: Wednesday, 15-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state and lifecycle management
import React, { useState, useEffect } from "react";
// Import React Router hooks for navigation and URL parameters
import { useNavigate, useSearchParams } from "react-router-dom";
// Import Material-UI components for form elements and UI
import {
  TextField,
  CircularProgress,
  Typography,
  Chip,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  Autocomplete,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
// Import lucide-react icons for UI elements
import {
  Edit3,
  Save,
  X,
  Shield,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  Briefcase,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
// Import toast notification components
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Import Poppins font weights for consistent typography
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
// Import API functions for professional profile operations
import {
  getProfessionalProfile,
  updateProfessionalProfile,
} from "../services/api";
// Import specialization tags constant
import { getSpecializationTags } from "../constants/specializationTags";
// Import API base URL configuration
import { API_BASE_URL } from "../config/api";

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

/**
 * Developmental stage options for filtering
 * Matches SetupProfile.tsx, focuses on ages 0-12 only
 */
const developmentalStageOptions = [
  { value: "newborn", label: "Newborn (0–2 months)" },
  { value: "infant", label: "Infant (2–12 months)" },
  { value: "toddler", label: "Toddler (1–3 years)" },
  { value: "early_childhood", label: "Early Childhood (3–5 years)" },
  { value: "middle_childhood", label: "Middle Childhood (6–12 years)" },
];

/**
 * Language options for professional services
 * Languages that professionals can offer services in
 */
const languageOptions = [
  { value: "English", label: "English" },
  { value: "Malay", label: "Malay" },
  { value: "Mandarin", label: "Mandarin" },
  { value: "Tamil", label: "Tamil" },
  { value: "Cantonese", label: "Cantonese" },
  { value: "Hokkien", label: "Hokkien" },
];

/**
 * Availability options for professional services
 * Time slots when professionals are available
 */
const availabilityOptions = [
  { value: "weekdays", label: "Weekdays (Monday to Friday)" },
  { value: "weekends", label: "Weekends (Saturday and Sunday)" },
  { value: "evenings", label: "Evenings (after 6 PM)" },
  { value: "flexible", label: "Flexible Scheduling" },
];

/**
 * Helper function to parse text into array
 * Handles newlines first, then commas as separators
 * 
 * @param text - Text string to parse
 * @returns Array of trimmed strings
 */
const parseTextToArray = (text: string): string[] => {
  if (!text) return [];
  // First try splitting by newlines, then by commas if no newlines found
  const hasNewlines = text.includes("\n");
  const separator = hasNewlines ? "\n" : ",";
  return text
    .split(separator)
    .map((s) => s.trim())
    .filter((s) => s);
};

/**
 * Helper function to render text as bullet points
 * Converts text array into HTML unordered list
 * 
 * @param text - Text string to render as bullets
 * @returns JSX element with bullet list or null
 */
const renderBulletPoints = (text: string) => {
  if (!text) return null;
  const items = parseTextToArray(text);
  if (items.length === 0) return null;

  return (
    <ul className="list-disc list-inside space-y-1 mt-1">
      {items.map((item, idx) => (
        <li
          key={idx}
          className="text-sm"
          style={{ color: "#32332D", fontFamily: "'Poppins', sans-serif" }}
        >
          {item}
        </li>
      ))}
    </ul>
  );
};

/**
 * Returns Material-UI TextField styling configuration
 * Includes error states and read-only styling
 * 
 * @param hasValue - Whether the text field has a value
 * @param hasError - Whether the field has validation errors
 * @param isReadOnly - Whether the field is read-only
 * @returns Material-UI sx prop styling object
 */
const getTextFieldStyles = (
  hasValue: boolean,
  hasError: boolean = false,
  isReadOnly: boolean = false,
) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backgroundColor: isReadOnly ? "#F5F5F5" : hasValue ? "#F5F5F5" : "#EDEDED",
    fontFamily: "'Poppins', sans-serif",
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: hasError ? "#D63B3B" : "#AA855B",
      borderWidth: hasError ? "2px" : "1px",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: hasError ? "#D63B3B" : "#AA855B",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: hasError ? "#D63B3B" : "#F2742C",
      borderWidth: "2px",
    },
    "& .MuiOutlinedInput-input": {
      padding: "12px 12px",
      fontSize: "14px",
    },
    "&.Mui-disabled": {
      backgroundColor: "#F5F5F5",
      color: "#64635E",
    },
  },
  "& .MuiInputLabel-root": {
    color: hasError ? "#D63B3B" : "#32332D",
    fontWeight: 500,
    fontFamily: "'Poppins', sans-serif",
    fontSize: "14px",
    transform: "translate(14px, 12px) scale(1)",
    "&.MuiInputLabel-shrink": {
      transform: "translate(14px, -9px) scale(0.75)",
    },
  },
  "& .MuiFormHelperText-root": {
    color: "#D63B3B",
    fontFamily: "'Poppins', sans-serif",
    fontSize: "12px",
    marginLeft: "0",
    marginTop: "4px",
  },
});

// Select styles function
const getSelectStyles = (
  hasValue: boolean,
  hasError: boolean = false,
  isReadOnly: boolean = false,
) => ({
  borderRadius: "12px",
  backgroundColor: isReadOnly ? "#F5F5F5" : hasValue ? "#F5F5F5" : "#EDEDED",
  fontFamily: "'Poppins', sans-serif",
  "&.Mui-focused": {
    backgroundColor: "#F5F5F5",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: hasError ? "#D63B3B" : "#AA855B",
    borderWidth: hasError ? "2px" : "1px",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: hasError ? "#D63B3B" : "#AA855B",
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: hasError ? "#D63B3B" : "#F2742C",
    borderWidth: "2px",
  },
  "& .MuiSelect-select": {
    padding: "12px 12px",
    fontSize: "14px",
  },
  "&.Mui-disabled": {
    backgroundColor: "#F5F5F5",
    color: "#64635E",
  },
});

const ProfessionalProfile: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [professionalProfile, setProfessionalProfile] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [profileBackup, setProfileBackup] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  // Profile image upload state
  const [selectedProfileImage, setSelectedProfileImage] = useState<File | null>(
    null,
  );
  const [profileImagePreview, setProfileImagePreview] = useState<string>("");
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [isProfileImageDragOver, setIsProfileImageDragOver] = useState(false);
  // Google Maps link state
  const [addGoogleMapsLink, setAddGoogleMapsLink] = useState(false);
  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const profileData = await getProfessionalProfile();
      if (profileData.profile) {
        setProfessionalProfile(profileData.profile);
        setDocuments(profileData.documents || []);
      } else {
        setProfessionalProfile(null);
        setDocuments([]);
      }
    } catch (e: any) {
      setError("Failed to load professional profile");
      setProfessionalProfile(null);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Handle refresh parameter from notification navigation
  useEffect(() => {
    const refreshParam = searchParams.get("refresh");
    if (refreshParam) {
      // Refresh param present (e.g., from notification click), force reload
      fetchProfile();
      // Remove refresh param from URL to clean it up
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("refresh");
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if profile exists
  const hasProfile = professionalProfile !== null;

  // Check if profile is locked (pending)
  const isProfileLocked = professionalProfile?.profile_status === "pending";

  // Check if profile can be edited (only non-critical fields when approved)
  const canEdit = professionalProfile?.profile_status === "approved";

  const handleEdit = () => {
    if (!canEdit) {
      toast.warning(
        "Profile cannot be edited while under review. Only non-critical fields can be edited after approval.",
        {
          position: "top-right",
          autoClose: 5000,
        },
      );
      return;
    }
    setProfileBackup({ ...professionalProfile });
    // Set profile image preview if exists
    if (professionalProfile.profile_image_url) {
      setProfileImagePreview(professionalProfile.profile_image_url);
    }
    // Set Google Maps link checkbox state
    setAddGoogleMapsLink(!!professionalProfile.google_maps_url);
    setIsEditMode(true);
  };

  const handleCancel = () => {
    if (profileBackup) {
      setProfessionalProfile(profileBackup);
      setProfileBackup(null);
    }
    setSelectedProfileImage(null);
    setProfileImagePreview("");
    setAddGoogleMapsLink(false);
    setValidationErrors({}); // Clear validation errors when canceling
    setIsEditMode(false);
  };

  // Profile image upload handlers
  const processProfileImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, etc.)");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return false;
    }
    return true;
  };

  const handleProfileImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && processProfileImageFile(file)) {
      setSelectedProfileImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsProfileImageDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (processProfileImageFile(file)) {
        setSelectedProfileImage(file);
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfileImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleChange = (field: string, value: any) => {
    setProfessionalProfile((prev: any) => ({ ...prev, [field]: value }));
  };

  // Generate Google Maps URL from address
  // Note: Google Maps may normalize/standardize the address when displaying it,
  // which is expected behavior. The URL contains the exact address as entered.
  const generateGoogleMapsUrl = () => {
    const { address_line, city, state, postcode, country } =
      professionalProfile;
    if (!address_line && !city && !state) return "";

    // Construct address exactly as entered, preserving original formatting
    const address = [address_line, city, state, postcode, country]
      .filter(Boolean)
      .join(", ");

    // Use search query format - Google Maps will match to its database
    // and may display a normalized version of the address
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  // Validation function for required fields in edit mode
  const validateRequiredFields = (): boolean => {
    const errors: Record<string, string> = {};

    // Contact Email - required
    if (!professionalProfile.contact_email?.trim()) {
      errors.contact_email = "Contact Email is required";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        professionalProfile.contact_email.trim(),
      )
    ) {
      errors.contact_email = "Please enter a valid email address";
    }

    // Contact Phone - required
    if (!professionalProfile.contact_phone?.trim()) {
      errors.contact_phone = "Contact Phone is required";
    }

    // Developmental Stages Served - required (at least one)
    if (
      !professionalProfile.target_developmental_stages ||
      (Array.isArray(professionalProfile.target_developmental_stages)
        ? professionalProfile.target_developmental_stages.length === 0
        : !professionalProfile.target_developmental_stages)
    ) {
      errors.target_developmental_stages =
        "Please select at least one developmental stage";
    }

    // Languages Spoken - required (at least one)
    if (
      !professionalProfile.languages ||
      (Array.isArray(professionalProfile.languages)
        ? professionalProfile.languages.length === 0
        : !professionalProfile.languages)
    ) {
      errors.languages = "Please select at least one language";
    }

    // Availability - required (at least one)
    if (
      !professionalProfile.availability ||
      (Array.isArray(professionalProfile.availability)
        ? professionalProfile.availability.length === 0
        : !professionalProfile.availability)
    ) {
      errors.availability = "Please select at least one availability option";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!profileBackup) {
      toast.error("No backup found. Please try again.");
      return;
    }

    // Validate required fields before saving
    if (!validateRequiredFields()) {
      toast.error("Please fill in all required fields before saving.", {
        position: "top-right",
        autoClose: 4000,
      });
      // Scroll to first error field
      const firstErrorField = Object.keys(validationErrors)[0];
      if (firstErrorField) {
        const element =
          document.querySelector(`[data-field="${firstErrorField}"]`) ||
          document.getElementById(firstErrorField);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          (element as HTMLElement).focus();
        }
      }
      setSaving(false);
      return;
    }

    setSaving(true);
    try {
      // Only allow non-critical fields to be updated
      const nonCriticalFields = [
        "bio",
        "contact_email",
        "contact_phone",
        "website_url",
        "address_line",
        "city",
        "state",
        "postcode",
        "country",
        "google_maps_url",
        "target_developmental_stages",
        "languages",
        "availability",
      ];

      // Upload profile image if selected
      if (selectedProfileImage) {
        setUploadingProfileImage(true);
        try {
          const token = localStorage.getItem("auth_token");
          const imageFormData = new FormData();
          imageFormData.append("file", selectedProfileImage);

          const imageRes = await fetch(
            `${API_BASE_URL}/api/profile/professional/upload-image`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              credentials: "include",
              body: imageFormData,
            },
          );

          if (imageRes.ok) {
            const imageData = await imageRes.json();
            professionalProfile.profile_image_url =
              imageData.profile_image_url ||
              imageData.file_path ||
              imageData.url;
          } else {
            const errorData = await imageRes
              .json()
              .catch(() => ({ detail: "Failed to upload image" }));
            console.warn(
              "Failed to upload profile image:",
              errorData.detail || "Unknown error",
            );
          }
        } catch (e) {
          console.warn("Error uploading profile image:", e);
          // Continue without image if upload fails
        } finally {
          setUploadingProfileImage(false);
        }
      }

      // Handle Google Maps URL based on checkbox state
      if (addGoogleMapsLink) {
        // Checkbox is checked - generate URL if not manually provided
        if (!professionalProfile.google_maps_url) {
          const generatedUrl = generateGoogleMapsUrl();
          if (generatedUrl) {
            professionalProfile.google_maps_url = generatedUrl;
          }
        }
        // If URL exists (manually entered or previously generated), keep it
      } else {
        // Checkbox is unchecked - clear the Google Maps URL
        professionalProfile.google_maps_url = "";
      }

      const updatePayload: any = {};
      nonCriticalFields.forEach((field) => {
        if (professionalProfile[field] !== profileBackup[field]) {
          updatePayload[field] = professionalProfile[field];
        }
      });

      // Include profile_image_url if it changed
      if (
        professionalProfile.profile_image_url !==
        profileBackup.profile_image_url
      ) {
        updatePayload.profile_image_url = professionalProfile.profile_image_url;
      }

      if (Object.keys(updatePayload).length === 0 && !selectedProfileImage) {
        toast.info("No changes to save.");
        setIsEditMode(false);
        setProfileBackup(null);
        setSaving(false);
        return;
      }

      await updateProfessionalProfile(updatePayload);

      // Refresh profile
      const profileData = await getProfessionalProfile();
      if (profileData.profile) {
        setProfessionalProfile(profileData.profile);
      }

      setIsEditMode(false);
      setProfileBackup(null);
      toast.success("Profile updated successfully!", {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (e: any) {
      toast.error("Failed to update profile. Please try again.", {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitProfileAgain = () => {
    // Navigate to submission page with pre-filled data and referrer
    navigate("/professional-profile-submission", {
      state: {
        existingProfile: professionalProfile,
        referrer: "/professional-profile",
      },
    });
  };

  // Format professional type for display
  const formatProfessionalType = (type: string) => {
    if (!type) return "Not provided";
    return type
      .split("_")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  if (loading) {
    return (
      <div
        className="flex justify-center items-center min-h-screen"
        style={{ backgroundColor: "#FAEFE2" }}
      >
        <CircularProgress sx={{ color: "#F2742C" }} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pt-16 sm:pt-20 py-6 sm:py-8 font-['Poppins']"
      style={{ backgroundColor: "#FAEFE2" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <h1
                className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2"
                style={{ color: "#32332D" }}
              >
                Professional Profile
              </h1>
              <p className="text-sm sm:text-base" style={{ color: "#AA855B" }}>
                Manage your professional information and services
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
              {/* Submit Profile Again Button - Visible when approved or rejected */}
              {hasProfile &&
                (professionalProfile.profile_status === "approved" ||
                  professionalProfile.profile_status === "rejected") && (
                  <button
                    onClick={handleSubmitProfileAgain}
                    className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm shadow-lg hover:shadow-xl"
                    style={{
                      backgroundColor:
                        professionalProfile.profile_status === "rejected"
                          ? "#D63B3B"
                          : "#F2742C",
                      color: "white",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        professionalProfile.profile_status === "rejected"
                          ? "#C02A2A"
                          : "#E55A1F";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        professionalProfile.profile_status === "rejected"
                          ? "#D63B3B"
                          : "#F2742C";
                    }}
                  >
                    <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">
                      Submit Profile Again
                    </span>
                    <span className="sm:hidden">Submit Again</span>
                  </button>
                )}
              {/* Edit Button - Only show when approved */}
              {canEdit && (
                <button
                  onClick={isEditMode ? handleCancel : handleEdit}
                  className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm shadow-lg hover:shadow-xl"
                  style={{
                    backgroundColor: isEditMode ? "#AA855B" : "#F2742C",
                    color: "white",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isEditMode
                      ? "#8B6F4A"
                      : "#E55A1F";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isEditMode
                      ? "#AA855B"
                      : "#F2742C";
                  }}
                >
                  {isEditMode ? (
                    <>
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Cancel</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Edit</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 text-center mb-4 sm:mb-6">
            <div className="flex items-center justify-center text-red-600">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
              <span className="text-xs sm:text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Status Banners */}
        {!hasProfile && (
          <div
            className="mb-4 sm:mb-6 p-4 sm:p-6 rounded-xl"
            style={{ backgroundColor: "#FFF4E6", border: "1px solid #F2742C" }}
          >
            <div className="flex items-start">
              <Briefcase
                className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 mt-0.5 flex-shrink-0"
                style={{ color: "#F2742C" }}
              />
              <div className="flex-1">
                <h3
                  className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  Submit Your Professional Profile
                </h3>
                <p
                  className="text-xs sm:text-sm mb-3 sm:mb-4"
                  style={{ color: "#32332D" }}
                >
                  To advertise your services to the ParenZing community, please
                  submit your professional profile for verification.
                </p>
                <button
                  onClick={() =>
                    navigate("/professional-profile-submission", {
                      state: { referrer: "/professional-profile" },
                    })
                  }
                  className="px-4 sm:px-6 py-2 sm:py-3 text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm shadow-lg hover:shadow-xl"
                  style={{ backgroundColor: "#F2742C" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#E55A1F";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#F2742C";
                  }}
                >
                  Start Profile Submission
                </button>
              </div>
            </div>
          </div>
        )}

        {hasProfile && professionalProfile.profile_status === "archived" && (
          <div
            className="mb-6 p-6 rounded-xl"
            style={{ backgroundColor: "#FFF4E6", border: "1px solid #AA855B" }}
          >
            <div className="flex items-start">
              <AlertCircle
                className="w-6 h-6 mr-3 mt-0.5 flex-shrink-0"
                style={{ color: "#AA855B" }}
              />
              <div className="flex-1">
                <h3
                  className="font-semibold mb-2 font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  Profile Archived
                </h3>
                <p className="text-sm" style={{ color: "#32332D" }}>
                  Your professional profile has been temporarily removed from
                  the public directory. You can still access your dashboard and
                  manage your services. Contact support if you have questions.
                </p>
              </div>
            </div>
          </div>
        )}

        {hasProfile && professionalProfile.profile_status === "pending" && (
          <div
            className="mb-6 p-6 rounded-xl"
            style={{ backgroundColor: "#FFF4E6", border: "1px solid #F2742C" }}
          >
            <div className="flex items-start">
              <Clock
                className="w-6 h-6 mr-3 mt-0.5 flex-shrink-0"
                style={{ color: "#F2742C" }}
              />
              <div>
                <h3
                  className="font-semibold mb-2 font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  Profile Under Review
                </h3>
                <p className="text-sm" style={{ color: "#32332D" }}>
                  Your professional profile is currently being reviewed by our
                  coordinators. You'll be notified once approved.
                </p>
              </div>
            </div>
          </div>
        )}

        {hasProfile && professionalProfile.profile_status === "approved" && (
          <div
            className="mb-6 p-6 rounded-xl"
            style={{ backgroundColor: "#E8F5E9", border: "1px solid #0F5648" }}
          >
            <div className="flex items-start">
              <CheckCircle
                className="w-6 h-6 mr-3 mt-0.5 flex-shrink-0"
                style={{ color: "#0F5648" }}
              />
              <div>
                <h3
                  className="font-semibold mb-2 font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  Profile Verified
                </h3>
                <p className="text-sm" style={{ color: "#32332D" }}>
                  Your profile is live in the directory. Parents can now
                  discover and contact you through the Professional Directory.
                </p>
              </div>
            </div>
          </div>
        )}

        {hasProfile && professionalProfile.profile_status === "rejected" && (
          <div
            className="mb-6 p-6 rounded-xl"
            style={{ backgroundColor: "#FFEBEE", border: "1px solid #D63B3B" }}
          >
            <div className="flex items-start">
              <AlertCircle
                className="w-6 h-6 mr-3 mt-0.5 flex-shrink-0"
                style={{ color: "#D63B3B" }}
              />
              <div className="flex-1">
                <h3
                  className="font-semibold mb-2 font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  ❌ Profile Rejected
                </h3>
                <p className="text-sm mb-3" style={{ color: "#32332D" }}>
                  Your profile has been rejected due to the following reason.
                  Please review the feedback and submit your profile again.
                </p>
                {professionalProfile.rejection_reason && (
                  <div
                    className="mt-3 mb-4 p-3 rounded-lg"
                    style={{
                      backgroundColor: "#FFF9F0",
                      border: "1px solid #F2742C",
                    }}
                  >
                    <p
                      className="text-sm font-semibold mb-1 font-['Poppins']"
                      style={{ color: "#F2742C" }}
                    >
                      Rejection Reason:
                    </p>
                    <p className="text-xs" style={{ color: "#32332D" }}>
                      {professionalProfile.rejection_reason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile Information Card - Only show if profile exists */}
        {/* Grid Layout */}
        {hasProfile && (
          <Card
            className="shadow-xl transition-all duration-300 hover:shadow-2xl mb-6"
            style={{
              border: "1px solid #AA855B",
              backgroundColor: "#F5F5F5",
              borderRadius: "16px",
            }}
          >
            <CardContent className="p-4 sm:p-6">
              {/* Row 1: Profile Image - Display when not in edit mode, Upload when in edit mode */}
              {!isEditMode && professionalProfile.profile_image_url ? (
                <div className="mb-4 sm:mb-6">
                  <img
                    src={professionalProfile.profile_image_url}
                    alt="Profile"
                    className="w-full h-48 sm:h-56 md:h-64 object-cover rounded-lg border"
                    style={{ borderColor: "#AA855B" }}
                  />
                </div>
              ) : isEditMode ? (
                <div className="mb-4 sm:mb-6">
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#AA855B",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      mb: 1,
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    }}
                  >
                    Profile Image (Optional)
                  </Typography>
                  {profileImagePreview ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <img
                          src={profileImagePreview}
                          alt="Profile preview"
                          className="w-full h-48 sm:h-56 md:h-64 object-cover rounded-lg border"
                          style={{ borderColor: "#AA855B" }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProfileImage(null);
                            setProfileImagePreview("");
                            handleChange("profile_image_url", "");
                            // Reset file input
                            const fileInput = document.getElementById(
                              "profile-image-upload-edit",
                            ) as HTMLInputElement;
                            if (fileInput) {
                              fileInput.value = "";
                            }
                          }}
                          className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 p-1 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors"
                        >
                          <X
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                            style={{ color: "#32332D" }}
                          />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-all duration-200 hover:bg-gray-50"
                      style={{
                        borderColor: isProfileImageDragOver
                          ? "#F2742C"
                          : "#AA855B",
                        backgroundColor: isProfileImageDragOver
                          ? "#FFF4E6"
                          : "transparent",
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsProfileImageDragOver(true);
                        e.currentTarget.style.backgroundColor = "#FFF4E6";
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsProfileImageDragOver(false);
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                      onDrop={handleProfileImageDrop}
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleProfileImageSelect}
                        className="hidden"
                        id="profile-image-upload-edit"
                      />
                      <div className="space-y-1.5 sm:space-y-2">
                        <div
                          className="w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-full flex items-center justify-center"
                          style={{ backgroundColor: "#F5F5F5" }}
                        >
                          <ImageIcon
                            className="w-5 h-5 sm:w-6 sm:h-6"
                            style={{ color: "#AA855B" }}
                          />
                        </div>
                        <div>
                          <p
                            className="text-xs sm:text-sm font-medium font-['Poppins']"
                            style={{ color: "#32332D" }}
                          >
                            Drop image here or click to upload
                          </p>
                          <p
                            className="text-[10px] sm:text-xs font-['Poppins']"
                            style={{ color: "#AA855B" }}
                          >
                            PNG, JPG, WebP (max 5MB)
                          </p>
                        </div>
                        <label
                          htmlFor="profile-image-upload-edit"
                          className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 font-['Poppins']"
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
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          Choose Image
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Row 2: Business Name | Professional Type */}
                <div>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#AA855B",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      mb: 1,
                    }}
                  >
                    Business Name
                  </Typography>
                  {isEditMode ? (
                    <TextField
                      value={professionalProfile.business_name || ""}
                      onChange={(e) =>
                        handleChange("business_name", e.target.value)
                      }
                      fullWidth
                      disabled={true} // Critical field - always read-only
                      sx={getTextFieldStyles(
                        !!professionalProfile.business_name,
                        false,
                        true,
                      )}
                      helperText="This field cannot be edited. Use 'Submit Profile Again' to change critical fields."
                    />
                  ) : (
                    <Typography
                      variant="body1"
                      sx={{
                        color: "#32332D",
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      {professionalProfile.business_name || "Not provided"}
                    </Typography>
                  )}
                </div>

                <div>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#AA855B",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      mb: 1,
                    }}
                  >
                    Professional Type
                  </Typography>
                  {isEditMode ? (
                    <TextField
                      value={formatProfessionalType(
                        professionalProfile.professional_type || "",
                      )}
                      fullWidth
                      disabled={true} // Critical field - always read-only
                      sx={getTextFieldStyles(
                        !!professionalProfile.professional_type,
                        false,
                        true,
                      )}
                      helperText="This field cannot be edited. Use 'Submit Profile Again' to change critical fields."
                    />
                  ) : (
                    <Typography
                      variant="body1"
                      sx={{
                        color: "#32332D",
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      {formatProfessionalType(
                        professionalProfile.professional_type || "",
                      )}
                    </Typography>
                  )}
                </div>

                {/* Row 3: Years of Experience | Specializations */}
                <div>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#AA855B",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      mb: 1,
                    }}
                  >
                    Years of Experience
                  </Typography>
                  {isEditMode ? (
                    <TextField
                      type="number"
                      value={professionalProfile.years_experience || ""}
                      onChange={(e) =>
                        handleChange("years_experience", e.target.value)
                      }
                      fullWidth
                      disabled={true} // Critical field - always read-only
                      sx={getTextFieldStyles(
                        !!professionalProfile.years_experience,
                        false,
                        true,
                      )}
                      helperText="This field cannot be edited. Use 'Submit Profile Again' to change critical fields."
                    />
                  ) : (
                    <Typography
                      variant="body1"
                      sx={{
                        color: "#32332D",
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      {professionalProfile.years_experience
                        ? `${professionalProfile.years_experience} years`
                        : "Not provided"}
                    </Typography>
                  )}
                </div>

                <div>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#AA855B",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      mb: 1,
                    }}
                  >
                    Specializations
                  </Typography>
                  {isEditMode ? (
                    <Autocomplete
                      multiple
                      freeSolo
                      disabled={true} // Critical field - always read-only
                      options={getSpecializationTags()}
                      value={
                        Array.isArray(professionalProfile.specializations)
                          ? professionalProfile.specializations
                          : professionalProfile.specializations
                            ? professionalProfile.specializations
                                .split(",")
                                .map((s: string) => s.trim())
                                .filter((s: string) => s)
                            : []
                      }
                      renderTags={(value: readonly string[], getTagProps) =>
                        value.map((option: string, index: number) => (
                          <Chip
                            variant="filled"
                            label={option}
                            {...getTagProps({ index })}
                            disabled
                            sx={{
                              backgroundColor: "#E8F4F8",
                              color: "#326586",
                              border: "1px solid #C4D8E4",
                              fontFamily: "'Poppins', sans-serif",
                              fontSize: "0.875rem",
                            }}
                          />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          helperText="This field cannot be edited. Use 'Submit Profile Again' to change critical fields."
                          sx={getTextFieldStyles(
                            !!professionalProfile.specializations,
                            false,
                            true,
                          )}
                        />
                      )}
                    />
                  ) : (
                    <div>
                      {professionalProfile.specializations &&
                      (Array.isArray(professionalProfile.specializations)
                        ? professionalProfile.specializations.length > 0
                        : professionalProfile.specializations) ? (
                        Array.isArray(professionalProfile.specializations) ? (
                          <div className="flex flex-wrap gap-1">
                            {professionalProfile.specializations.map(
                              (spec: string, idx: number) => (
                                <Chip
                                  key={idx}
                                  label={spec}
                                  size="small"
                                  sx={{
                                    backgroundColor: "#E8F4F8",
                                    color: "#326586",
                                    border: "1px solid #C4D8E4",
                                    fontFamily: "'Poppins', sans-serif",
                                    fontSize: "0.875rem",
                                  }}
                                />
                              ),
                            )}
                          </div>
                        ) : (
                          renderBulletPoints(
                            professionalProfile.specializations,
                          ) // Fallback for text (backward compatibility)
                        )
                      ) : (
                        <Typography
                          variant="body1"
                          sx={{
                            color: "#AA855B",
                            fontFamily: "'Poppins', sans-serif",
                          }}
                        >
                          Not provided
                        </Typography>
                      )}
                    </div>
                  )}
                </div>

                {/* Row 3: Qualifications | Certifications */}
                <div>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#AA855B",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      mb: 1,
                    }}
                  >
                    Qualifications
                  </Typography>
                  {isEditMode ? (
                    <TextField
                      value={professionalProfile.qualifications || ""}
                      onChange={(e) =>
                        handleChange("qualifications", e.target.value)
                      }
                      fullWidth
                      multiline
                      rows={2}
                      disabled={true} // Critical field - always read-only
                      sx={getTextFieldStyles(
                        !!professionalProfile.qualifications,
                        false,
                        true,
                      )}
                      helperText="This field cannot be edited. Use 'Submit Profile Again' to change critical fields."
                    />
                  ) : (
                    <div>
                      {professionalProfile.qualifications ? (
                        renderBulletPoints(professionalProfile.qualifications)
                      ) : (
                        <Typography
                          variant="body1"
                          sx={{
                            color: "#AA855B",
                            fontFamily: "'Poppins', sans-serif",
                          }}
                        >
                          Not provided
                        </Typography>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#AA855B",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      mb: 1,
                    }}
                  >
                    Certifications
                  </Typography>
                  {isEditMode ? (
                    <TextField
                      value={professionalProfile.certifications || ""}
                      onChange={(e) =>
                        handleChange("certifications", e.target.value)
                      }
                      fullWidth
                      multiline
                      rows={2}
                      disabled={true} // Critical field - always read-only
                      sx={getTextFieldStyles(
                        !!professionalProfile.certifications,
                        false,
                        true,
                      )}
                      helperText="This field cannot be edited. Use 'Submit Profile Again' to change critical fields."
                    />
                  ) : (
                    <div>
                      {professionalProfile.certifications ? (
                        renderBulletPoints(professionalProfile.certifications)
                      ) : (
                        <Typography
                          variant="body1"
                          sx={{
                            color: "#AA855B",
                            fontFamily: "'Poppins', sans-serif",
                          }}
                        >
                          Not provided
                        </Typography>
                      )}
                    </div>
                  )}
                </div>

                {/* Row 4: Contact Email | Contact Phone */}
                <div data-field="contact_email">
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#AA855B",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      mb: 1,
                    }}
                  >
                    Contact Email <span style={{ color: "#D63B3B" }}>*</span>
                  </Typography>
                  {isEditMode ? (
                    <TextField
                      type="email"
                      value={professionalProfile.contact_email || ""}
                      onChange={(e) => {
                        handleChange("contact_email", e.target.value);
                        // Clear error when user starts typing
                        if (validationErrors.contact_email) {
                          setValidationErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.contact_email;
                            return newErrors;
                          });
                        }
                      }}
                      fullWidth
                      required
                      disabled={isProfileLocked} // Can edit when approved
                      error={!!validationErrors.contact_email}
                      sx={getTextFieldStyles(
                        !!professionalProfile.contact_email,
                        !!validationErrors.contact_email,
                        isProfileLocked,
                      )}
                      helperText={
                        validationErrors.contact_email ||
                        (isProfileLocked
                          ? "This field is locked during review"
                          : "")
                      }
                    />
                  ) : (
                    <div>
                      {professionalProfile.contact_email ? (
                        <a
                          href={`https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(professionalProfile.contact_email)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:opacity-80 transition-opacity"
                          style={{
                            color: "#326586",
                            fontFamily: "'Poppins', sans-serif",
                          }}
                          title="Click to open Gmail compose in a new tab"
                        >
                          {professionalProfile.contact_email}
                        </a>
                      ) : (
                        <Typography
                          variant="body1"
                          sx={{
                            color: "#AA855B",
                            fontFamily: "'Poppins', sans-serif",
                          }}
                        >
                          Not provided
                        </Typography>
                      )}
                    </div>
                  )}
                </div>

                <div data-field="contact_phone">
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#AA855B",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      mb: 1,
                    }}
                  >
                    Contact Phone <span style={{ color: "#D63B3B" }}>*</span>
                  </Typography>
                  {isEditMode ? (
                    <TextField
                      value={professionalProfile.contact_phone || ""}
                      onChange={(e) => {
                        handleChange("contact_phone", e.target.value);
                        // Clear error when user starts typing
                        if (validationErrors.contact_phone) {
                          setValidationErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.contact_phone;
                            return newErrors;
                          });
                        }
                      }}
                      fullWidth
                      required
                      disabled={isProfileLocked} // Can edit when approved
                      error={!!validationErrors.contact_phone}
                      sx={getTextFieldStyles(
                        !!professionalProfile.contact_phone,
                        !!validationErrors.contact_phone,
                        isProfileLocked,
                      )}
                      helperText={
                        validationErrors.contact_phone ||
                        (isProfileLocked
                          ? "This field is locked during review"
                          : "")
                      }
                    />
                  ) : (
                    <Typography
                      variant="body1"
                      sx={{
                        color: "#32332D",
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      {professionalProfile.contact_phone || "Not provided"}
                    </Typography>
                  )}
                </div>

                {/* Row 5: Website URL | Bio */}
                <div>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#AA855B",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      mb: 1,
                    }}
                  >
                    Website URL
                  </Typography>
                  {isEditMode ? (
                    <TextField
                      value={professionalProfile.website_url || ""}
                      onChange={(e) =>
                        handleChange("website_url", e.target.value)
                      }
                      fullWidth
                      disabled={isProfileLocked} // Can edit when approved
                      sx={getTextFieldStyles(
                        !!professionalProfile.website_url,
                        false,
                        isProfileLocked,
                      )}
                      helperText={
                        isProfileLocked
                          ? "This field is locked during review"
                          : ""
                      }
                    />
                  ) : (
                    <Typography
                      variant="body1"
                      sx={{
                        color: "#32332D",
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      {professionalProfile.website_url ? (
                        <a
                          href={professionalProfile.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                          style={{ fontFamily: "'Poppins', sans-serif" }}
                        >
                          {professionalProfile.website_url}
                        </a>
                      ) : (
                        "Not provided"
                      )}
                    </Typography>
                  )}
                </div>

                <div>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#AA855B",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      mb: 1,
                    }}
                  >
                    Bio
                  </Typography>
                  {isEditMode ? (
                    <TextField
                      value={professionalProfile.bio || ""}
                      onChange={(e) => handleChange("bio", e.target.value)}
                      fullWidth
                      multiline
                      rows={4}
                      disabled={isProfileLocked} // Can edit when approved
                      sx={getTextFieldStyles(
                        !!professionalProfile.bio,
                        false,
                        isProfileLocked,
                      )}
                      helperText={
                        isProfileLocked
                          ? "This field is locked during review"
                          : ""
                      }
                    />
                  ) : (
                    <Typography
                      variant="body1"
                      sx={{
                        color: "#32332D",
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      {professionalProfile.bio || "Not provided"}
                    </Typography>
                  )}
                </div>

                {/* Row 6: Filter Fields for Directory (inline, no section wrapper) */}
                <div
                  className="md:col-span-2"
                  data-field="target_developmental_stages"
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#AA855B",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      mb: 1,
                    }}
                  >
                    Developmental Stages Served{" "}
                    <span style={{ color: "#D63B3B" }}>*</span>
                  </Typography>
                  {isEditMode ? (
                    <>
                      <Autocomplete
                        multiple
                        options={developmentalStageOptions.map(
                          (opt) => opt.value,
                        )}
                        value={
                          professionalProfile.target_developmental_stages || []
                        }
                        onChange={(_, newValue) => {
                          handleChange("target_developmental_stages", newValue);
                          // Clear error when user selects
                          if (validationErrors.target_developmental_stages) {
                            setValidationErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.target_developmental_stages;
                              return newErrors;
                            });
                          }
                        }}
                        getOptionLabel={(option: string) => {
                          const found = developmentalStageOptions.find(
                            (opt) => opt.value === option,
                          );
                          return found ? found.label : option;
                        }}
                        disabled={isProfileLocked}
                        renderTags={(value: readonly string[], getTagProps) =>
                          value.map((option: string, index: number) => (
                            <Chip
                              variant="filled"
                              size="small"
                              label={
                                developmentalStageOptions.find(
                                  (opt) => opt.value === option,
                                )?.label || option
                              }
                              {...getTagProps({ index })}
                              sx={{
                                backgroundColor: "#E8F4F8",
                                color: "#326586",
                                border: "1px solid #C4D8E4",
                                fontFamily: "'Poppins', sans-serif",
                              }}
                            />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            required
                            placeholder="Select developmental stages you serve"
                            error={
                              !!validationErrors.target_developmental_stages
                            }
                            sx={getTextFieldStyles(
                              (
                                professionalProfile.target_developmental_stages ||
                                []
                              ).length > 0,
                              !!validationErrors.target_developmental_stages,
                              isProfileLocked,
                            )}
                            helperText={
                              validationErrors.target_developmental_stages
                            }
                          />
                        )}
                      />
                      {/* Suggestion Chips - Only show options that aren't already selected */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {developmentalStageOptions
                          .filter(
                            (option) =>
                              !(
                                professionalProfile.target_developmental_stages ||
                                []
                              ).includes(option.value),
                          )
                          .map((option) => (
                            <Chip
                              key={option.value}
                              label={option.label}
                              size="small"
                              onClick={() => {
                                const current =
                                  professionalProfile.target_developmental_stages ||
                                  [];
                                if (!current.includes(option.value)) {
                                  handleChange("target_developmental_stages", [
                                    ...current,
                                    option.value,
                                  ]);
                                }
                              }}
                              sx={{
                                backgroundColor: "#F5F5F5",
                                color: "#32332D",
                                border: "1px solid #D4C4A8",
                                fontFamily: "'Poppins', sans-serif",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                "&:hover": {
                                  backgroundColor: "#EDEDED",
                                  borderColor: "#AA855B",
                                },
                              }}
                            />
                          ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {professionalProfile.target_developmental_stages &&
                      professionalProfile.target_developmental_stages.length >
                        0 ? (
                        professionalProfile.target_developmental_stages.map(
                          (stage: string, idx: number) => {
                            const option = developmentalStageOptions.find(
                              (opt) => opt.value === stage,
                            );
                            return (
                              <Chip
                                key={idx}
                                label={option?.label || stage}
                                size="small"
                                sx={{
                                  backgroundColor: "#E8F4F8",
                                  color: "#326586",
                                  border: "1px solid #C4D8E4",
                                  fontFamily: "'Poppins', sans-serif",
                                }}
                              />
                            );
                          },
                        )
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{
                            color: "#AA855B",
                            fontFamily: "'Poppins', sans-serif",
                          }}
                        >
                          Not provided
                        </Typography>
                      )}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2" data-field="languages">
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#AA855B",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      mb: 1,
                    }}
                  >
                    Languages Spoken <span style={{ color: "#D63B3B" }}>*</span>
                  </Typography>
                  {isEditMode ? (
                    <>
                      <Autocomplete
                        multiple
                        options={languageOptions.map((opt) => opt.value)}
                        value={professionalProfile.languages || []}
                        onChange={(_, newValue) => {
                          handleChange("languages", newValue);
                          // Clear error when user selects
                          if (validationErrors.languages) {
                            setValidationErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.languages;
                              return newErrors;
                            });
                          }
                        }}
                        getOptionLabel={(option: string) => {
                          const found = languageOptions.find(
                            (opt) => opt.value === option,
                          );
                          return found ? found.label : option;
                        }}
                        disabled={isProfileLocked}
                        renderTags={(value: readonly string[], getTagProps) =>
                          value.map((option: string, index: number) => (
                            <Chip
                              variant="filled"
                              size="small"
                              label={
                                languageOptions.find(
                                  (opt) => opt.value === option,
                                )?.label || option
                              }
                              {...getTagProps({ index })}
                              sx={{
                                backgroundColor: "#E8F4F8",
                                color: "#326586",
                                border: "1px solid #C4D8E4",
                                fontFamily: "'Poppins', sans-serif",
                              }}
                            />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            required
                            placeholder="Select languages you speak"
                            error={!!validationErrors.languages}
                            sx={getTextFieldStyles(
                              (professionalProfile.languages || []).length > 0,
                              !!validationErrors.languages,
                              isProfileLocked,
                            )}
                            helperText={validationErrors.languages}
                          />
                        )}
                      />
                      {/* Suggestion Chips - Only show options that aren't already selected */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {languageOptions
                          .filter(
                            (option) =>
                              !(professionalProfile.languages || []).includes(
                                option.value,
                              ),
                          )
                          .map((option) => (
                            <Chip
                              key={option.value}
                              label={option.label}
                              size="small"
                              onClick={() => {
                                const current =
                                  professionalProfile.languages || [];
                                if (!current.includes(option.value)) {
                                  handleChange("languages", [
                                    ...current,
                                    option.value,
                                  ]);
                                }
                              }}
                              sx={{
                                backgroundColor: "#F5F5F5",
                                color: "#32332D",
                                border: "1px solid #D4C4A8",
                                fontFamily: "'Poppins', sans-serif",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                "&:hover": {
                                  backgroundColor: "#EDEDED",
                                  borderColor: "#AA855B",
                                },
                              }}
                            />
                          ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {professionalProfile.languages &&
                      professionalProfile.languages.length > 0 ? (
                        professionalProfile.languages.map(
                          (lang: string, idx: number) => {
                            const option = languageOptions.find(
                              (opt) => opt.value === lang,
                            );
                            return (
                              <Chip
                                key={idx}
                                label={option?.label || lang}
                                size="small"
                                sx={{
                                  backgroundColor: "#E8F4F8",
                                  color: "#326586",
                                  border: "1px solid #C4D8E4",
                                  fontFamily: "'Poppins', sans-serif",
                                }}
                              />
                            );
                          },
                        )
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{
                            color: "#AA855B",
                            fontFamily: "'Poppins', sans-serif",
                          }}
                        >
                          Not provided
                        </Typography>
                      )}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2" data-field="availability">
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#AA855B",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      mb: 1,
                    }}
                  >
                    Availability <span style={{ color: "#D63B3B" }}>*</span>
                  </Typography>
                  {isEditMode ? (
                    <>
                      <Autocomplete
                        multiple
                        options={availabilityOptions.map((opt) => opt.value)}
                        value={professionalProfile.availability || []}
                        onChange={(_, newValue) => {
                          handleChange("availability", newValue);
                          // Clear error when user selects
                          if (validationErrors.availability) {
                            setValidationErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.availability;
                              return newErrors;
                            });
                          }
                        }}
                        getOptionLabel={(option: string) => {
                          const found = availabilityOptions.find(
                            (opt) => opt.value === option,
                          );
                          return found ? found.label : option;
                        }}
                        disabled={isProfileLocked}
                        renderTags={(value: readonly string[], getTagProps) =>
                          value.map((option: string, index: number) => (
                            <Chip
                              variant="filled"
                              size="small"
                              label={
                                availabilityOptions.find(
                                  (opt) => opt.value === option,
                                )?.label || option
                              }
                              {...getTagProps({ index })}
                              sx={{
                                backgroundColor: "#E8F4F8",
                                color: "#326586",
                                border: "1px solid #C4D8E4",
                                fontFamily: "'Poppins', sans-serif",
                              }}
                            />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            required
                            placeholder="Select your availability"
                            error={!!validationErrors.availability}
                            sx={getTextFieldStyles(
                              (professionalProfile.availability || []).length >
                                0,
                              !!validationErrors.availability,
                              isProfileLocked,
                            )}
                            helperText={validationErrors.availability}
                          />
                        )}
                      />
                      {/* Suggestion Chips - Only show options that aren't already selected */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {availabilityOptions
                          .filter(
                            (option) =>
                              !(
                                professionalProfile.availability || []
                              ).includes(option.value),
                          )
                          .map((option) => (
                            <Chip
                              key={option.value}
                              label={option.label}
                              size="small"
                              onClick={() => {
                                const current =
                                  professionalProfile.availability || [];
                                if (!current.includes(option.value)) {
                                  handleChange("availability", [
                                    ...current,
                                    option.value,
                                  ]);
                                }
                              }}
                              sx={{
                                backgroundColor: "#F5F5F5",
                                color: "#32332D",
                                border: "1px solid #D4C4A8",
                                fontFamily: "'Poppins', sans-serif",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                "&:hover": {
                                  backgroundColor: "#EDEDED",
                                  borderColor: "#AA855B",
                                },
                              }}
                            />
                          ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {professionalProfile.availability &&
                      professionalProfile.availability.length > 0 ? (
                        professionalProfile.availability.map(
                          (avail: string, idx: number) => {
                            const option = availabilityOptions.find(
                              (opt) => opt.value === avail,
                            );
                            return (
                              <Chip
                                key={idx}
                                label={option?.label || avail}
                                size="small"
                                sx={{
                                  backgroundColor: "#E8F4F8",
                                  color: "#326586",
                                  border: "1px solid #C4D8E4",
                                  fontFamily: "'Poppins', sans-serif",
                                }}
                              />
                            );
                          },
                        )
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{
                            color: "#AA855B",
                            fontFamily: "'Poppins', sans-serif",
                          }}
                        >
                          Not provided
                        </Typography>
                      )}
                    </div>
                  )}
                </div>

                {/* Row 7: Service Location (full width) */}
                <div className="lg:col-span-2">
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#AA855B",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      mb: { xs: 1.5, sm: 2 },
                      display: "flex",
                      alignItems: "center",
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    }}
                  >
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    Service Location
                  </Typography>
                  <div
                    className="space-y-3 sm:space-y-4 p-3 sm:p-4 rounded-xl"
                    style={{
                      backgroundColor: "#FAEFE2",
                      border: "1px solid #AA855B",
                    }}
                  >
                    {/* Address Line (full width) */}
                    <div>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#AA855B",
                          fontWeight: 600,
                          fontFamily: "'Poppins', sans-serif",
                          mb: 1,
                          display: "block",
                          fontSize: { xs: "0.7rem", sm: "0.75rem" },
                        }}
                      >
                        Address Line
                      </Typography>
                      {isEditMode ? (
                        <TextField
                          value={professionalProfile.address_line || ""}
                          onChange={(e) =>
                            handleChange("address_line", e.target.value)
                          }
                          fullWidth
                          disabled={isProfileLocked} // Can edit when approved
                          sx={getTextFieldStyles(
                            !!professionalProfile.address_line,
                            false,
                            isProfileLocked,
                          )}
                          helperText={
                            isProfileLocked
                              ? "This field is locked during review"
                              : ""
                          }
                        />
                      ) : (
                        <Typography
                          variant="body1"
                          sx={{
                            color: "#32332D",
                            fontFamily: "'Poppins', sans-serif",
                            fontSize: { xs: "0.875rem", sm: "1rem" },
                          }}
                        >
                          {professionalProfile.address_line || "Not provided"}
                        </Typography>
                      )}
                    </div>

                    {/* City | State */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#AA855B",
                            fontWeight: 600,
                            fontFamily: "'Poppins', sans-serif",
                            mb: 1,
                            display: "block",
                          }}
                        >
                          City
                        </Typography>
                        {isEditMode ? (
                          <TextField
                            value={professionalProfile.city || ""}
                            onChange={(e) =>
                              handleChange("city", e.target.value)
                            }
                            fullWidth
                            disabled={isProfileLocked} // Can edit when approved
                            sx={getTextFieldStyles(
                              !!professionalProfile.city,
                              false,
                              isProfileLocked,
                            )}
                          />
                        ) : (
                          <Typography
                            variant="body1"
                            sx={{
                              color: "#32332D",
                              fontFamily: "'Poppins', sans-serif",
                            }}
                          >
                            {professionalProfile.city || "Not provided"}
                          </Typography>
                        )}
                      </div>

                      <div>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#AA855B",
                            fontWeight: 600,
                            fontFamily: "'Poppins', sans-serif",
                            mb: 1,
                            display: "block",
                          }}
                        >
                          State
                        </Typography>
                        {isEditMode ? (
                          <FormControl fullWidth>
                            <Select
                              value={professionalProfile.state || ""}
                              onChange={(e) =>
                                handleChange("state", e.target.value)
                              }
                              disabled={isProfileLocked}
                              sx={getSelectStyles(
                                !!professionalProfile.state,
                                false,
                                isProfileLocked,
                              )}
                            >
                              <MenuItem value="">Select State</MenuItem>
                              {malaysianStates.map((state) => (
                                <MenuItem key={state} value={state}>
                                  {state}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <Typography
                            variant="body1"
                            sx={{
                              color: "#32332D",
                              fontFamily: "'Poppins', sans-serif",
                            }}
                          >
                            {professionalProfile.state || "Not provided"}
                          </Typography>
                        )}
                      </div>
                    </div>

                    {/* Postcode | Country */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#AA855B",
                            fontWeight: 600,
                            fontFamily: "'Poppins', sans-serif",
                            mb: 1,
                            display: "block",
                          }}
                        >
                          Postcode
                        </Typography>
                        {isEditMode ? (
                          <TextField
                            value={professionalProfile.postcode || ""}
                            onChange={(e) =>
                              handleChange("postcode", e.target.value)
                            }
                            fullWidth
                            disabled={isProfileLocked} // Can edit when approved
                            sx={getTextFieldStyles(
                              !!professionalProfile.postcode,
                              false,
                              isProfileLocked,
                            )}
                          />
                        ) : (
                          <Typography
                            variant="body1"
                            sx={{
                              color: "#32332D",
                              fontFamily: "'Poppins', sans-serif",
                            }}
                          >
                            {professionalProfile.postcode || "Not provided"}
                          </Typography>
                        )}
                      </div>

                      <div>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#AA855B",
                            fontWeight: 600,
                            fontFamily: "'Poppins', sans-serif",
                            mb: 1,
                            display: "block",
                          }}
                        >
                          Country
                        </Typography>
                        {isEditMode ? (
                          <TextField
                            value={professionalProfile.country || "Malaysia"}
                            fullWidth
                            disabled={true} // Always Malaysia
                            sx={getTextFieldStyles(true, false, true)}
                          />
                        ) : (
                          <Typography
                            variant="body1"
                            sx={{
                              color: "#32332D",
                              fontFamily: "'Poppins', sans-serif",
                            }}
                          >
                            {professionalProfile.country || "Malaysia"}
                          </Typography>
                        )}
                      </div>
                    </div>

                    {/* Google Maps Link Checkbox and URL Field */}
                    {isEditMode ? (
                      <>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={addGoogleMapsLink}
                              onChange={(e) => {
                                setAddGoogleMapsLink(e.target.checked);
                                if (!e.target.checked) {
                                  handleChange("google_maps_url", "");
                                }
                              }}
                              disabled={isProfileLocked}
                              sx={{
                                color: "#AA855B",
                                "&.Mui-checked": {
                                  color: "#F2742C",
                                },
                              }}
                            />
                          }
                          label="Add Google Maps link"
                          sx={{
                            fontFamily: "'Poppins', sans-serif",
                            color: "#32332D",
                          }}
                        />
                        {addGoogleMapsLink && (
                          <div className="mt-2">
                            <TextField
                              label="Google Maps URL (Optional)"
                              value={professionalProfile.google_maps_url || ""}
                              onChange={(e) =>
                                handleChange("google_maps_url", e.target.value)
                              }
                              fullWidth
                              disabled={isProfileLocked}
                              placeholder="Leave empty to auto-generate from address above"
                              sx={getTextFieldStyles(
                                !!professionalProfile.google_maps_url,
                                false,
                                isProfileLocked,
                              )}
                              helperText={
                                isProfileLocked
                                  ? "This field is locked during review"
                                  : "If left empty, a Google Maps link will be automatically generated from your address"
                              }
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#AA855B",
                            fontWeight: 600,
                            fontFamily: "'Poppins', sans-serif",
                            mb: 1,
                            display: "block",
                          }}
                        >
                          Google Maps URL
                        </Typography>
                        {professionalProfile.google_maps_url ? (
                          <a
                            href={professionalProfile.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm font-['Poppins']"
                            style={{
                              backgroundColor: "#E8F4F8",
                              color: "#326586",
                              border: "1px solid #C4D8E4",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#D4E8F0";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#E8F4F8";
                            }}
                          >
                            <MapPin className="w-4 h-4" />
                            <span>View on Google Maps</span>
                          </a>
                        ) : (
                          <Typography
                            variant="body1"
                            sx={{
                              color: "#AA855B",
                              fontFamily: "'Poppins', sans-serif",
                            }}
                          >
                            Not provided
                          </Typography>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Save Button - Show when in edit mode */}
              {isEditMode && (
                <div className="mt-4 sm:mt-6 flex flex-col-reverse sm:flex-row justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={handleCancel}
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
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5 sm:space-x-2"
                    style={{ backgroundColor: "#0F5648" }}
                    onMouseEnter={(e) => {
                      if (!saving) {
                        e.currentTarget.style.backgroundColor = "#0A4538";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#0F5648";
                    }}
                  >
                    {saving ? (
                      <>
                        <CircularProgress size={18} sx={{ color: "white" }} />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Verification Documents Card - Only show if profile exists */}
        {hasProfile && (
          <Card
            className="shadow-xl transition-all duration-300 hover:shadow-2xl mb-6"
            style={{
              border: "1px solid #AA855B",
              backgroundColor: "#F5F5F5",
              borderRadius: "16px",
            }}
          >
            <CardContent className="p-6">
              <Typography
                variant="h6"
                sx={{
                  color: "#32332D",
                  fontWeight: 600,
                  fontFamily: "'Poppins', sans-serif",
                  mb: 3,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <FileText className="w-5 h-5 mr-2" />
                Verification Documents
              </Typography>
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc, index) => (
                    <div
                      key={doc.document_id || index}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 rounded-lg gap-2 sm:gap-0"
                      style={{
                        backgroundColor: "#FAEFE2",
                        border: "1px solid #AA855B",
                      }}
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <FileText
                          className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0"
                          style={{ color: "#F2742C" }}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-xs sm:text-sm font-medium truncate font-['Poppins']"
                            style={{ color: "#32332D" }}
                          >
                            {doc.file_name || "Document"}
                          </p>
                          <p
                            className="text-[10px] sm:text-xs font-['Poppins']"
                            style={{ color: "#AA855B" }}
                          >
                            {doc.file_type || "Unknown type"}
                            {doc.file_size &&
                              ` • ${(doc.file_size / 1024 / 1024).toFixed(2)} MB`}
                          </p>
                        </div>
                      </div>
                      {doc.file_path && (
                        <a
                          href={doc.file_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs sm:text-sm font-semibold px-2 sm:px-2.5 py-1 rounded-lg transition-colors hover:bg-blue-50 font-['Poppins'] whitespace-nowrap sm:ml-3"
                          style={{ color: "#326586" }}
                        >
                          View
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Typography
                  variant="body2"
                  sx={{ color: "#AA855B", fontFamily: "'Poppins', sans-serif" }}
                >
                  No documents uploaded
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

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

export default ProfessionalProfile;
