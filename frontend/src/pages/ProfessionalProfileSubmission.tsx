// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: ProfessionalProfileSubmission.tsx
// Description: To provide interface for professional users to submit their profile for coordinator approval
// First Written on: Tuesday, 14-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state and lifecycle management
import React, { useState, useEffect } from "react";
// Import React Router hooks for navigation
import { useNavigate, useLocation } from "react-router-dom";
// Import toast notification components
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Import Material-UI components for form elements and UI
import {
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  CircularProgress,
  Typography,
  Autocomplete,
  Chip,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
// Import lucide-react icons for UI elements
import {
  Briefcase,
  Upload,
  ArrowRight,
  ArrowLeft,
  Check,
  Shield,
  FileText,
  ClipboardCheck,
  MapPin,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Image as ImageIcon,
  X,
} from "lucide-react";
// Import Poppins font weights for consistent typography
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
// Import API base URL configuration
import { API_BASE_URL } from "../config/api";
// Import specialization tags constant
import { getSpecializationTags } from "../constants/specializationTags";

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
 * Default professional profile object structure
 * Used to initialize professional profile form fields with empty values
 */
const defaultProfessionalProfile = {
  business_name: "",
  professional_type: "",
  customProfessionalType: "",
  qualifications: "",
  certifications: "",
  specializations: [] as string[],
  years_experience: "",
  // Filter fields for Professional Directory
  target_developmental_stages: [] as string[],
  languages: [] as string[],
  availability: [] as string[],
  // Structured address fields
  address_line: "",
  city: "",
  state: "",
  postcode: "",
  country: "Malaysia",
  // Google Maps integration
  addGoogleMapsLink: false,
  google_maps_url: "",
  contact_email: "",
  contact_phone: "",
  website_url: "",
  bio: "",
};

/**
 * Professional type options for dropdown
 * Available types of professionals in the system
 */
const professionalTypeOptions = [
  "child_psychologist",
  "child_therapist",
  "pediatrician",
  "educational_consultant",
  "speech_therapist",
  "occupational_therapist",
  "behavioral_therapist",
  "family_counselor",
  "parenting_coach",
  "child_development_specialist",
  "other",
];

/**
 * Helper function to parse text into array
 * Handles newlines first, then commas as separators
 * Matches implementation in ProfessionalProfile.tsx
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

// Language options
const languageOptions = [
  { value: "English", label: "English" },
  { value: "Malay", label: "Malay" },
  { value: "Mandarin", label: "Mandarin" },
  { value: "Tamil", label: "Tamil" },
  { value: "Cantonese", label: "Cantonese" },
  { value: "Hokkien", label: "Hokkien" },
];

// Availability options
const availabilityOptions = [
  { value: "weekdays", label: "Weekdays (Monday to Friday)" },
  { value: "weekends", label: "Weekends (Saturday and Sunday)" },
  { value: "evenings", label: "Evenings (after 6 PM)" },
  { value: "flexible", label: "Flexible Scheduling" },
];

const ProfessionalProfileSubmission: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [professionalProfile, setProfessionalProfile] = useState<any>(
    defaultProfessionalProfile,
  );
  const [documents, setDocuments] = useState<File[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<
    Array<{
      document_id: number;
      document_type: string;
      file_name: string;
      file_path: string;
      file_type: string;
      file_size?: number;
      uploaded_at?: string;
    }>
  >([]);
  const [documentsToRemove, setDocumentsToRemove] = useState<number[]>([]); // Document IDs marked for removal
  const [profileStatus, setProfileStatus] = useState<string | null>(null); // Track profile status for removal permission
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [documentUploadWarning, setDocumentUploadWarning] = useState("");
  const [isServiceLocationExpanded, setIsServiceLocationExpanded] =
    useState(false);
  // Profile image upload state
  const [selectedProfileImage, setSelectedProfileImage] = useState<File | null>(
    null,
  );
  const [profileImagePreview, setProfileImagePreview] = useState<string>("");
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [isProfileImageDragOver, setIsProfileImageDragOver] = useState(false);

  // Determine where to navigate back to
  const getBackPath = () => {
    // Check if referrer was passed in location state
    const referrer = (location.state as any)?.referrer;
    if (referrer) {
      return referrer;
    }

    // Check document.referrer as fallback
    const referrerUrl = document.referrer;
    if (referrerUrl) {
      if (referrerUrl.includes("/professional-profile")) {
        return "/professional-profile";
      }
      if (referrerUrl.includes("/professional-dashboard")) {
        return "/professional-dashboard";
      }
    }

    // Default to dashboard
    return "/professional-dashboard";
  };

  const handleBack = () => {
    // Clear removal marks when leaving the page
    setDocumentsToRemove([]);
    navigate(getBackPath());
  };

  // Check existing profile status on mount
  useEffect(() => {
    const checkExistingProfile = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          navigate("/login");
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/profile/professional`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          },
        );

        if (response.ok) {
          const data = await response.json();
          if (data.profile) {
            // Store profile status for removal permission check
            setProfileStatus(data.profile.profile_status);

            // Block access if profile is pending
            if (data.profile.profile_status === "pending") {
              toast.warning(
                "Your profile is currently under review and cannot be resubmitted. Please wait for coordinator approval.",
                {
                  position: "top-right",
                  autoClose: 5000,
                },
              );
              navigate("/professional-dashboard");
              return;
            }

            // If rejected or navigating from "Submit Profile Again", pre-fill form with existing data
            if (
              data.profile.profile_status === "rejected" ||
              data.profile.profile_status === "approved" ||
              (window.history.state && window.history.state.existingProfile)
            ) {
              const existingData =
                window.history.state?.existingProfile || data.profile;

              // Handle professional_type: if it's not in the predefined list, it's a custom type
              const storedProfessionalType =
                existingData.professional_type || "";
              const isCustomType =
                storedProfessionalType &&
                !professionalTypeOptions.includes(storedProfessionalType);
              const professionalTypeValue = isCustomType
                ? "other"
                : storedProfessionalType;
              const customProfessionalTypeValue = isCustomType
                ? storedProfessionalType
                : "";

              setProfessionalProfile({
                business_name: existingData.business_name || "",
                professional_type: professionalTypeValue,
                customProfessionalType: customProfessionalTypeValue,
                qualifications: existingData.qualifications || "",
                certifications: existingData.certifications || "",
                specializations: Array.isArray(existingData.specializations)
                  ? existingData.specializations
                  : existingData.specializations
                    ? existingData.specializations
                        .split(",")
                        .map((s: string) => s.trim())
                        .filter((s: string) => s)
                    : [],
                years_experience: existingData.years_experience || "",
                target_developmental_stages:
                  existingData.target_developmental_stages || [],
                languages: existingData.languages || [],
                availability: existingData.availability || [],
                address_line: existingData.address_line || "",
                city: existingData.city || "",
                state: existingData.state || "",
                postcode: existingData.postcode || "",
                country: existingData.country || "Malaysia",
                addGoogleMapsLink: !!existingData.google_maps_url,
                google_maps_url: existingData.google_maps_url || "",
                contact_email: existingData.contact_email || "",
                contact_phone: existingData.contact_phone || "",
                website_url: existingData.website_url || "",
                bio: existingData.bio || "",
                profile_image_url: existingData.profile_image_url || "",
              });

              // Set profile image preview if exists
              if (existingData.profile_image_url) {
                setProfileImagePreview(existingData.profile_image_url);
              }

              // Set existing documents from API response
              if (
                data.documents &&
                Array.isArray(data.documents) &&
                data.documents.length > 0
              ) {
                setExistingDocuments(data.documents);
              }
            }
          }
        }
      } catch (e) {
        console.error("Error checking existing profile:", e);
      }
    };
    checkExistingProfile();
  }, [navigate]);

  // TextField styles function
  const getTextFieldStyles = (
    hasValue: boolean,
    hasError: boolean = false,
  ) => ({
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      backgroundColor: hasValue ? "#F5F5F5" : "#EDEDED",
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
  const getSelectStyles = (hasValue: boolean, hasError: boolean = false) => ({
    borderRadius: "12px",
    backgroundColor: hasValue ? "#F5F5F5" : "#EDEDED",
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
  });

  // Label styles for FormControl
  const getLabelStyles = () => ({
    color: "#32332D",
    fontWeight: 500,
    fontFamily: "'Poppins', sans-serif",
    fontSize: "14px",
    transform: "translate(14px, 12px) scale(1)",
    "&.MuiInputLabel-shrink": {
      transform: "translate(14px, -9px) scale(0.75)",
    },
  });

  // Handlers
  const handleProfessionalChange = (field: string, value: any) => {
    setProfessionalProfile((prev: any) => ({ ...prev, [field]: value }));

    // Clear error for this field when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const processFiles = (files: File[]) => {
    const validFiles = files.filter((file) => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
      ];

      if (file.size > maxSize) {
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }

      if (!allowedTypes.includes(file.type)) {
        toast.error(
          `File ${file.name} is not a supported format. Accepted formats: PDF, JPG, PNG.`,
        );
        return false;
      }

      return true;
    });

    if (validFiles.length > 0) {
      setDocuments([...documents, ...validFiles]);
      setDocumentUploadWarning(""); // Clear warning when files are uploaded
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(Array.from(files));
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleRemoveExistingDocument = (documentId: number) => {
    // Mark document for removal (client-side only)
    setDocumentsToRemove((prev) => [...prev, documentId]);
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

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    // Validate required fields (additional check before submission)
    if (
      !professionalProfile.business_name ||
      !professionalProfile.qualifications ||
      !professionalProfile.specializations ||
      !professionalProfile.certifications ||
      !professionalProfile.years_experience ||
      !professionalProfile.contact_email ||
      !professionalProfile.contact_phone
    ) {
      setError("Please fill in all required fields before submitting");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Prepare profile data
      const profileToSave: any = {
        ...professionalProfile,
        profile_status: "pending", // Set status to pending on submission
        documents_to_delete:
          documentsToRemove.length > 0 ? documentsToRemove : undefined, // Include documents to delete
      };

      // Handle custom professional type
      if (
        profileToSave.professional_type === "other" &&
        profileToSave.customProfessionalType
      ) {
        profileToSave.professional_type = profileToSave.customProfessionalType;
      }
      delete profileToSave.customProfessionalType;

      // Handle Google Maps URL based on checkbox state
      if (profileToSave.addGoogleMapsLink) {
        // Checkbox is checked - generate URL if not manually provided
        if (!profileToSave.google_maps_url) {
          const generatedUrl = generateGoogleMapsUrl();
          if (generatedUrl) {
            profileToSave.google_maps_url = generatedUrl;
          }
        }
        // If URL exists (manually entered or previously generated), keep it
      } else {
        // Checkbox is unchecked - clear the Google Maps URL
        profileToSave.google_maps_url = "";
      }

      // Remove addGoogleMapsLink from data before saving (it's only a UI flag)
      delete profileToSave.addGoogleMapsLink;

      // Save professional profile FIRST (without image) - profile must exist before uploading image
      const profileRes = await fetch(
        `${API_BASE_URL}/api/profile/professional`,
        {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify(profileToSave),
        },
      );

      if (!profileRes.ok) {
        const data = await profileRes.json();
        setError(data.detail || "Failed to submit professional profile");
        setLoading(false);
        return;
      }

      // Upload profile image AFTER profile is created/updated (profile must exist first)
      if (selectedProfileImage) {
        setUploadingProfileImage(true);
        try {
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
            // Backend now automatically updates profile_image_url in database
            // No need for separate update call
            console.log(
              "Profile image uploaded and database updated successfully",
            );
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

      // Upload documents if any
      if (documents.length > 0) {
        const formData = new FormData();
        documents.forEach((file) => {
          formData.append(`documents`, file);
        });

        const docsRes = await fetch(
          `${API_BASE_URL}/api/profile/professional/documents`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
            body: formData,
          },
        );

        if (!docsRes.ok) {
          console.warn("Failed to upload documents, but profile was saved");
        }
      }

      // Move to Step 4 (Submission Complete)
      setCurrentStep(4);
    } catch (e) {
      console.error("Error submitting profile:", e);
      setError("Failed to submit profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Validation function for Step 1
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};

    // Required fields
    if (!professionalProfile.business_name?.trim()) {
      errors.business_name = "Business/Practice Name is required";
    }

    if (!professionalProfile.professional_type) {
      errors.professional_type = "Professional Type is required";
    }

    // If professional type is "other", custom type is required
    if (
      professionalProfile.professional_type === "other" &&
      !professionalProfile.customProfessionalType?.trim()
    ) {
      errors.customProfessionalType = "Please specify your professional type";
    }

    if (!professionalProfile.qualifications?.trim()) {
      errors.qualifications = "Qualifications are required";
    }

    if (!professionalProfile.certifications?.trim()) {
      errors.certifications = "Certifications are required";
    }

    if (
      !professionalProfile.specializations ||
      (Array.isArray(professionalProfile.specializations)
        ? professionalProfile.specializations.length === 0
        : !professionalProfile.specializations.trim())
    ) {
      errors.specializations = "At least one specialization is required";
    }

    if (
      !professionalProfile.years_experience ||
      professionalProfile.years_experience === ""
    ) {
      errors.years_experience = "Years of Experience is required";
    }

    // Filter fields - at least one required
    if (
      !professionalProfile.target_developmental_stages ||
      professionalProfile.target_developmental_stages.length === 0
    ) {
      errors.target_developmental_stages =
        "Please select at least one developmental stage";
    }

    if (
      !professionalProfile.languages ||
      professionalProfile.languages.length === 0
    ) {
      errors.languages = "Please select at least one language";
    }

    if (
      !professionalProfile.availability ||
      professionalProfile.availability.length === 0
    ) {
      errors.availability = "Please select at least one availability option";
    }

    // Validate email format if provided
    if (!professionalProfile.contact_email?.trim()) {
      errors.contact_email = "Contact Email is required";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        professionalProfile.contact_email.trim(),
      )
    ) {
      errors.contact_email = "Please enter a valid email address";
    }

    if (!professionalProfile.contact_phone?.trim()) {
      errors.contact_phone = "Contact Phone is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Navigation handlers
  const nextStep = () => {
    if (currentStep < 4) {
      // Validate Step 1 before proceeding
      if (currentStep === 1) {
        if (!validateStep1()) {
          // Scroll to first error field
          const firstErrorField = Object.keys(fieldErrors)[0];
          if (firstErrorField) {
            const element =
              document.querySelector(`[name="${firstErrorField}"]`) ||
              document.getElementById(firstErrorField);
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "center" });
              (element as HTMLElement).focus();
            }
          }
          return;
        }
      }

      // Validate Step 2 - Check if documents are uploaded (either existing not removed or new)
      if (currentStep === 2) {
        // Calculate remaining existing documents (not marked for removal)
        const remainingExisting = existingDocuments.filter(
          (doc) => !documentsToRemove.includes(doc.document_id),
        );

        // Check if at least one document remains (existing not removed + new)
        if (remainingExisting.length === 0 && documents.length === 0) {
          setDocumentUploadWarning(
            "Warning: Professional licenses, certifications, and qualifications documents are required for verification. You cannot proceed to the next step without at least one document (either keep existing documents or upload new ones).",
          );
          // Scroll to warning
          setTimeout(() => {
            const warningElement = document.getElementById(
              "document-upload-warning",
            );
            if (warningElement) {
              warningElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          }, 100);
          return;
        }
      }

      setCurrentStep(currentStep + 1);
      // Clear field errors and warnings when moving to next step
      setFieldErrors({});
      setDocumentUploadWarning("");
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Progress bar
  const renderProgressBar = () => (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span
          className="text-xs sm:text-sm font-medium font-['Poppins']"
          style={{ color: "#32332D" }}
        >
          Submission Progress
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

  // Step 1: Professional Information
  const renderProfessionalInfoStep = () => (
    <div>
      <div className="flex items-center mb-4 sm:mb-6">
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mr-3 sm:mr-4 shadow-md flex-shrink-0"
          style={{ backgroundColor: "#F2742C" }}
        >
          <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <h2
            className="text-lg sm:text-xl font-bold font-['Poppins']"
            style={{ color: "#32332D" }}
          >
            Professional Information
          </h2>
          <p
            className="text-xs sm:text-sm font-['Poppins']"
            style={{ color: "#AA855B" }}
          >
            Tell us about your professional practice
          </p>
        </div>
      </div>

      {/* Validation Error Message for Step 1 */}
      {Object.keys(fieldErrors).length > 0 && (
        <div
          id="professional-info-warning"
          className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl"
          style={{ backgroundColor: "#FFEBEE", border: "2px solid #D63B3B" }}
        >
          <div className="flex items-start">
            <AlertCircle
              className="w-4 h-4 sm:w-5 sm:h-5 mr-2 mt-0.5 flex-shrink-0"
              style={{ color: "#D63B3B" }}
            />
            <div>
              <p
                className="font-semibold text-xs sm:text-sm mb-1 font-['Poppins']"
                style={{ color: "#D63B3B" }}
              >
                Please complete all required fields
              </p>
              <p
                className="text-xs sm:text-sm font-['Poppins']"
                style={{ color: "#D63B3B" }}
              >
                Please fill in all required fields marked with * before
                proceeding to the next step.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <TextField
              name="business_name"
              id="business_name"
              label="Business/Practice Name"
              value={professionalProfile.business_name}
              onChange={(e) =>
                handleProfessionalChange("business_name", e.target.value)
              }
              fullWidth
              required
              placeholder="e.g., ABC Child Psychology Center"
              error={!!fieldErrors.business_name}
              helperText={fieldErrors.business_name}
              sx={getTextFieldStyles(
                !!professionalProfile.business_name,
                !!fieldErrors.business_name,
              )}
            />
          </div>

          <div>
            <FormControl
              fullWidth
              error={!!fieldErrors.professional_type}
              required
            >
              <InputLabel sx={getLabelStyles()}>Professional Type</InputLabel>
              <Select
                name="professional_type"
                id="professional_type"
                value={professionalProfile.professional_type}
                label="Professional Type"
                onChange={(e) =>
                  handleProfessionalChange("professional_type", e.target.value)
                }
                sx={getSelectStyles(
                  !!professionalProfile.professional_type,
                  !!fieldErrors.professional_type,
                )}
              >
                {professionalTypeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option === "other"
                      ? "Other"
                      : option
                          .split("_")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1),
                          )
                          .join(" ")}
                  </MenuItem>
                ))}
              </Select>
              {fieldErrors.professional_type && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "#D63B3B",
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: "12px",
                    mt: 0.5,
                    ml: 1.75,
                  }}
                >
                  {fieldErrors.professional_type}
                </Typography>
              )}
            </FormControl>
            {professionalProfile.professional_type === "other" && (
              <TextField
                name="customProfessionalType"
                id="customProfessionalType"
                label="Please specify your professional type"
                value={professionalProfile.customProfessionalType || ""}
                onChange={(e) =>
                  handleProfessionalChange(
                    "customProfessionalType",
                    e.target.value,
                  )
                }
                fullWidth
                required
                error={!!fieldErrors.customProfessionalType}
                helperText={fieldErrors.customProfessionalType}
                sx={{
                  mt: 2,
                  ...getTextFieldStyles(
                    !!professionalProfile.customProfessionalType,
                    !!fieldErrors.customProfessionalType,
                  ),
                }}
              />
            )}
          </div>

          <div>
            <TextField
              name="years_experience"
              id="years_experience"
              label="Years of Experience"
              type="number"
              value={professionalProfile.years_experience}
              onChange={(e) =>
                handleProfessionalChange("years_experience", e.target.value)
              }
              fullWidth
              required
              placeholder="e.g., 5"
              error={!!fieldErrors.years_experience}
              helperText={fieldErrors.years_experience}
              sx={getTextFieldStyles(
                !!professionalProfile.years_experience,
                !!fieldErrors.years_experience,
              )}
            />
          </div>

          <div className="sm:col-span-2">
            <TextField
              name="qualifications"
              id="qualifications"
              label="Qualifications"
              value={professionalProfile.qualifications}
              onChange={(e) =>
                handleProfessionalChange("qualifications", e.target.value)
              }
              fullWidth
              required
              multiline
              rows={2}
              placeholder="e.g., PhD in Child Psychology, Licensed Clinical Psychologist"
              error={!!fieldErrors.qualifications}
              helperText={fieldErrors.qualifications}
              sx={getTextFieldStyles(
                !!professionalProfile.qualifications,
                !!fieldErrors.qualifications,
              )}
            />
          </div>

          <div className="sm:col-span-2">
            <TextField
              name="certifications"
              id="certifications"
              label="Certifications"
              value={professionalProfile.certifications}
              onChange={(e) =>
                handleProfessionalChange("certifications", e.target.value)
              }
              fullWidth
              required
              multiline
              rows={2}
              placeholder="e.g., Board Certified in Clinical Child Psychology"
              error={!!fieldErrors.certifications}
              helperText={fieldErrors.certifications}
              sx={getTextFieldStyles(
                !!professionalProfile.certifications,
                !!fieldErrors.certifications,
              )}
            />
          </div>

          <div className="sm:col-span-2">
            <Autocomplete
              multiple
              freeSolo
              options={getSpecializationTags()}
              value={
                Array.isArray(professionalProfile.specializations)
                  ? professionalProfile.specializations
                  : []
              }
              onChange={(_, newValue) => {
                // Handle both string (from freeSolo) and existing array values
                const processedValue = newValue
                  .map((v) => (typeof v === "string" ? v.trim() : v))
                  .filter((v) => v);
                handleProfessionalChange("specializations", processedValue);
              }}
              onInputChange={(_, newInputValue, reason) => {
                // Handle Enter key or comma to add custom tag
                if (
                  reason === "input" &&
                  (newInputValue.endsWith(",") || newInputValue.endsWith("\n"))
                ) {
                  const tag = newInputValue.slice(0, -1).trim();
                  const currentSpecializations = Array.isArray(
                    professionalProfile.specializations,
                  )
                    ? professionalProfile.specializations
                    : [];
                  if (tag && !currentSpecializations.includes(tag)) {
                    handleProfessionalChange("specializations", [
                      ...currentSpecializations,
                      tag,
                    ]);
                  }
                }
              }}
              renderTags={(value: readonly string[], getTagProps) =>
                value.map((option: string, index: number) => (
                  <Chip
                    variant="filled"
                    label={option}
                    {...getTagProps({ index })}
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
                  label="Specializations"
                  placeholder="Select from suggestions or type and press Enter/comma"
                  required
                  error={!!fieldErrors.specializations}
                  helperText={
                    fieldErrors.specializations ||
                    "Click suggestions or type custom tags and press Enter or comma"
                  }
                  sx={{
                    ...getTextFieldStyles(
                      Array.isArray(professionalProfile.specializations)
                        ? professionalProfile.specializations.length > 0
                        : !!professionalProfile.specializations,
                      !!fieldErrors.specializations,
                    ),
                    "& .MuiFormHelperText-root": {
                      color: fieldErrors.specializations
                        ? "#D63B3B"
                        : "#AA855B",
                    },
                  }}
                />
              )}
            />
            {/* Suggestion Chips - Only show tags that aren't already selected */}
            <div className="flex flex-wrap gap-2 mt-2">
              {getSpecializationTags()
                .filter(
                  (tag) =>
                    !(professionalProfile.specializations || []).includes(tag),
                )
                .map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onClick={() => {
                      const current = professionalProfile.specializations || [];
                      if (!current.includes(tag)) {
                        handleProfessionalChange("specializations", [
                          ...current,
                          tag,
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
          </div>

          {/* Filter Fields for Professional Directory */}
          <div className="sm:col-span-2">
            <Typography
              variant="subtitle2"
              sx={{
                color: "#32332D",
                fontWeight: 600,
                fontFamily: "'Poppins', sans-serif",
                mb: 1,
              }}
            >
              Developmental Stages Served *
            </Typography>
            <Autocomplete
              multiple
              options={developmentalStageOptions.map((opt) => opt.value)}
              value={professionalProfile.target_developmental_stages || []}
              onChange={(_, newValue) =>
                handleProfessionalChange(
                  "target_developmental_stages",
                  newValue,
                )
              }
              getOptionLabel={(option: string) => {
                const found = developmentalStageOptions.find(
                  (opt) => opt.value === option,
                );
                return found ? found.label : option;
              }}
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
                      "& .MuiChip-deleteIcon": {
                        color: "#326586",
                        "&:hover": {
                          color: "#1A4A6B",
                        },
                      },
                    }}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select developmental stages you serve (ages 0-12)"
                  helperText={
                    fieldErrors.target_developmental_stages ||
                    "Help parents find you by selecting the age groups you work with"
                  }
                  error={!!fieldErrors.target_developmental_stages}
                  sx={{
                    ...getTextFieldStyles(
                      (professionalProfile.target_developmental_stages || [])
                        .length > 0,
                      !!fieldErrors.target_developmental_stages,
                    ),
                    "& .MuiFormHelperText-root": {
                      color: fieldErrors.target_developmental_stages
                        ? "#D63B3B"
                        : "#AA855B",
                    },
                  }}
                />
              )}
            />
            {/* Suggestion Chips - Only show options that aren't already selected */}
            <div className="flex flex-wrap gap-2 mt-2">
              {developmentalStageOptions
                .filter(
                  (option) =>
                    !(
                      professionalProfile.target_developmental_stages || []
                    ).includes(option.value),
                )
                .map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    size="small"
                    onClick={() => {
                      const current =
                        professionalProfile.target_developmental_stages || [];
                      if (!current.includes(option.value)) {
                        handleProfessionalChange(
                          "target_developmental_stages",
                          [...current, option.value],
                        );
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
          </div>

          <div className="sm:col-span-2">
            <Typography
              variant="subtitle2"
              sx={{
                color: "#32332D",
                fontWeight: 600,
                fontFamily: "'Poppins', sans-serif",
                mb: 1,
              }}
            >
              Languages Spoken *
            </Typography>
            <Autocomplete
              multiple
              options={languageOptions.map((opt) => opt.value)}
              value={professionalProfile.languages || []}
              onChange={(_, newValue) =>
                handleProfessionalChange("languages", newValue)
              }
              getOptionLabel={(option: string) => {
                const found = languageOptions.find(
                  (opt) => opt.value === option,
                );
                return found ? found.label : option;
              }}
              renderTags={(value: readonly string[], getTagProps) =>
                value.map((option: string, index: number) => (
                  <Chip
                    variant="filled"
                    size="small"
                    label={
                      languageOptions.find((opt) => opt.value === option)
                        ?.label || option
                    }
                    {...getTagProps({ index })}
                    sx={{
                      backgroundColor: "#E8F4F8",
                      color: "#326586",
                      border: "1px solid #C4D8E4",
                      fontFamily: "'Poppins', sans-serif",
                      "& .MuiChip-deleteIcon": {
                        color: "#326586",
                        "&:hover": {
                          color: "#1A4A6B",
                        },
                      },
                    }}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select languages you speak"
                  helperText={
                    fieldErrors.languages ||
                    "Help parents find professionals who speak their preferred language"
                  }
                  error={!!fieldErrors.languages}
                  sx={{
                    ...getTextFieldStyles(
                      (professionalProfile.languages || []).length > 0,
                      !!fieldErrors.languages,
                    ),
                    "& .MuiFormHelperText-root": {
                      color: fieldErrors.languages ? "#D63B3B" : "#AA855B",
                    },
                  }}
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
                      const current = professionalProfile.languages || [];
                      if (!current.includes(option.value)) {
                        handleProfessionalChange("languages", [
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
          </div>

          <div className="sm:col-span-2">
            <Typography
              variant="subtitle2"
              sx={{
                color: "#32332D",
                fontWeight: 600,
                fontFamily: "'Poppins', sans-serif",
                mb: 1,
              }}
            >
              Availability *
            </Typography>
            <Autocomplete
              multiple
              options={availabilityOptions.map((opt) => opt.value)}
              value={professionalProfile.availability || []}
              onChange={(_, newValue) =>
                handleProfessionalChange("availability", newValue)
              }
              getOptionLabel={(option: string) => {
                const found = availabilityOptions.find(
                  (opt) => opt.value === option,
                );
                return found ? found.label : option;
              }}
              renderTags={(value: readonly string[], getTagProps) =>
                value.map((option: string, index: number) => (
                  <Chip
                    variant="filled"
                    size="small"
                    label={
                      availabilityOptions.find((opt) => opt.value === option)
                        ?.label || option
                    }
                    {...getTagProps({ index })}
                    sx={{
                      backgroundColor: "#E8F4F8",
                      color: "#326586",
                      border: "1px solid #C4D8E4",
                      fontFamily: "'Poppins', sans-serif",
                      "& .MuiChip-deleteIcon": {
                        color: "#326586",
                        "&:hover": {
                          color: "#1A4A6B",
                        },
                      },
                    }}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select your availability"
                  helperText={
                    fieldErrors.availability ||
                    "Let parents know when you're available for consultations"
                  }
                  error={!!fieldErrors.availability}
                  sx={{
                    ...getTextFieldStyles(
                      (professionalProfile.availability || []).length > 0,
                      !!fieldErrors.availability,
                    ),
                    "& .MuiFormHelperText-root": {
                      color: fieldErrors.availability ? "#D63B3B" : "#AA855B",
                    },
                  }}
                />
              )}
            />
            {/* Suggestion Chips - Only show options that aren't already selected */}
            <div className="flex flex-wrap gap-2 mt-2">
              {availabilityOptions
                .filter(
                  (option) =>
                    !(professionalProfile.availability || []).includes(
                      option.value,
                    ),
                )
                .map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    size="small"
                    onClick={() => {
                      const current = professionalProfile.availability || [];
                      if (!current.includes(option.value)) {
                        handleProfessionalChange("availability", [
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
          </div>

          {/* Contact Information - Moved above Service Location */}
          <div>
            <TextField
              name="contact_email"
              id="contact_email"
              label="Contact Email"
              type="email"
              value={professionalProfile.contact_email}
              onChange={(e) =>
                handleProfessionalChange("contact_email", e.target.value)
              }
              fullWidth
              required
              placeholder="professional@example.com"
              error={!!fieldErrors.contact_email}
              helperText={fieldErrors.contact_email}
              sx={getTextFieldStyles(
                !!professionalProfile.contact_email,
                !!fieldErrors.contact_email,
              )}
            />
          </div>

          <div>
            <TextField
              name="contact_phone"
              id="contact_phone"
              label="Contact Phone"
              value={professionalProfile.contact_phone}
              onChange={(e) =>
                handleProfessionalChange("contact_phone", e.target.value)
              }
              fullWidth
              required
              placeholder="+60 12 345 6789"
              error={!!fieldErrors.contact_phone}
              helperText={fieldErrors.contact_phone}
              sx={getTextFieldStyles(
                !!professionalProfile.contact_phone,
                !!fieldErrors.contact_phone,
              )}
            />
          </div>

          {/* Service Location Section - Collapsible */}
          <div className="sm:col-span-2 my-4">
            <div
              className="rounded-xl"
              style={{
                backgroundColor: "#FAEFE2",
                border: "1px solid #AA855B",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setIsServiceLocationExpanded(!isServiceLocationExpanded)
                }
                className="w-full p-4 flex items-center justify-between transition-all duration-200"
                style={{ backgroundColor: "transparent" }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: "#32332D",
                    fontWeight: 600,
                    fontFamily: "'Poppins', sans-serif",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Service Location (Optional)
                </Typography>
                {isServiceLocationExpanded ? (
                  <ChevronUp className="w-5 h-5" style={{ color: "#AA855B" }} />
                ) : (
                  <ChevronDown
                    className="w-5 h-5"
                    style={{ color: "#AA855B" }}
                  />
                )}
              </button>

              {isServiceLocationExpanded && (
                <div className="px-4 pb-4 space-y-4">
                  <TextField
                    label="Address Line"
                    value={professionalProfile.address_line}
                    onChange={(e) =>
                      handleProfessionalChange("address_line", e.target.value)
                    }
                    fullWidth
                    placeholder="e.g., 123 Jalan Merdeka, Taman ABC"
                    sx={getTextFieldStyles(!!professionalProfile.address_line)}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      label="City"
                      value={professionalProfile.city}
                      onChange={(e) =>
                        handleProfessionalChange("city", e.target.value)
                      }
                      fullWidth
                      placeholder="e.g., Kuala Lumpur"
                      sx={getTextFieldStyles(!!professionalProfile.city)}
                    />

                    <FormControl fullWidth>
                      <InputLabel sx={getLabelStyles()}>State</InputLabel>
                      <Select
                        value={professionalProfile.state}
                        label="State"
                        onChange={(e) =>
                          handleProfessionalChange("state", e.target.value)
                        }
                        sx={getSelectStyles(!!professionalProfile.state)}
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
                      value={professionalProfile.postcode}
                      onChange={(e) =>
                        handleProfessionalChange("postcode", e.target.value)
                      }
                      fullWidth
                      placeholder="e.g., 50000"
                      inputProps={{ maxLength: 10 }}
                      sx={getTextFieldStyles(!!professionalProfile.postcode)}
                    />

                    <TextField
                      label="Country"
                      value={professionalProfile.country}
                      fullWidth
                      disabled
                      sx={getTextFieldStyles(true)}
                    />
                  </div>

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={professionalProfile.addGoogleMapsLink || false}
                        onChange={(e) =>
                          handleProfessionalChange(
                            "addGoogleMapsLink",
                            e.target.checked,
                          )
                        }
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

                  {professionalProfile.addGoogleMapsLink && (
                    <TextField
                      label="Google Maps URL (Optional)"
                      value={professionalProfile.google_maps_url}
                      onChange={(e) =>
                        handleProfessionalChange(
                          "google_maps_url",
                          e.target.value,
                        )
                      }
                      fullWidth
                      placeholder="Leave empty to auto-generate from address above"
                      sx={getTextFieldStyles(
                        !!professionalProfile.google_maps_url,
                      )}
                      helperText="If left empty, a Google Maps link will be automatically generated from your address"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Profile Image Upload */}
          <div className="sm:col-span-2">
            <Typography
              variant="subtitle2"
              sx={{
                color: "#32332D",
                fontWeight: 600,
                fontFamily: "'Poppins', sans-serif",
                mb: 1,
              }}
            >
              Profile Image (Optional)
            </Typography>
            {profileImagePreview ||
            (professionalProfile.profile_image_url && !selectedProfileImage) ? (
              <div className="space-y-2">
                <div className="relative">
                  {uploadingProfileImage ? (
                    <div
                      className="w-full h-48 flex items-center justify-center rounded-lg border"
                      style={{
                        borderColor: "#AA855B",
                        backgroundColor: "#F5F5F5",
                      }}
                    >
                      <div className="text-center">
                        <CircularProgress
                          size={32}
                          sx={{ color: "#F2742C", mb: 1 }}
                        />
                        <p
                          className="text-xs font-['Poppins']"
                          style={{ color: "#AA855B" }}
                        >
                          Uploading image...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <img
                        src={
                          profileImagePreview ||
                          professionalProfile.profile_image_url
                        }
                        alt="Profile preview"
                        className="w-full h-48 object-cover rounded-lg border"
                        style={{ borderColor: "#AA855B" }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProfileImage(null);
                          setProfileImagePreview("");
                          handleProfessionalChange("profile_image_url", "");
                          // Reset file input
                          const fileInput = document.getElementById(
                            "profile-image-upload",
                          ) as HTMLInputElement;
                          if (fileInput) {
                            fileInput.value = "";
                          }
                        }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors"
                      >
                        <X className="w-4 h-4" style={{ color: "#32332D" }} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 hover:bg-gray-50"
                style={{
                  borderColor: isProfileImageDragOver ? "#F2742C" : "#AA855B",
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
                  id="profile-image-upload"
                />
                <div className="space-y-2">
                  <div
                    className="w-12 h-12 mx-auto rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "#F5F5F5" }}
                  >
                    <ImageIcon
                      className="w-6 h-6"
                      style={{ color: "#AA855B" }}
                    />
                  </div>
                  <div>
                    <p
                      className="text-sm font-medium font-['Poppins']"
                      style={{ color: "#32332D" }}
                    >
                      Drop image here or click to upload
                    </p>
                    <p
                      className="text-xs font-['Poppins']"
                      style={{ color: "#AA855B" }}
                    >
                      PNG, JPG, WebP (max 5MB)
                    </p>
                  </div>
                  <label
                    htmlFor="profile-image-upload"
                    className="inline-block px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 font-['Poppins']"
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

          <div className="sm:col-span-2 mt-4">
            <TextField
              label="Website URL (Optional)"
              value={professionalProfile.website_url}
              onChange={(e) =>
                handleProfessionalChange("website_url", e.target.value)
              }
              fullWidth
              placeholder="https://www.yourwebsite.com"
              sx={getTextFieldStyles(!!professionalProfile.website_url)}
            />
          </div>

          <div className="sm:col-span-2">
            <TextField
              label="Professional Bio (Optional)"
              value={professionalProfile.bio}
              onChange={(e) => handleProfessionalChange("bio", e.target.value)}
              fullWidth
              multiline
              rows={4}
              placeholder="Tell us about your experience, approach, and what makes your practice unique..."
              sx={getTextFieldStyles(!!professionalProfile.bio)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Step 2: Document Upload
  const renderDocumentUploadStep = () => (
    <div>
      <div className="flex items-center mb-4 sm:mb-6">
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mr-3 sm:mr-4 shadow-md flex-shrink-0"
          style={{ backgroundColor: "#326586" }}
        >
          <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <h2
            className="text-lg sm:text-xl font-bold font-['Poppins']"
            style={{ color: "#32332D" }}
          >
            Verification Documents
          </h2>
          <p
            className="text-xs sm:text-sm font-['Poppins']"
            style={{ color: "#AA855B" }}
          >
            Upload your credentials for verification
          </p>
        </div>
      </div>

      {/* Warning Message for No Documents */}
      {documentUploadWarning && (
        <div
          id="document-upload-warning"
          className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl"
          style={{ backgroundColor: "#FFEBEE", border: "2px solid #D63B3B" }}
        >
          <div className="flex items-start">
            <AlertCircle
              className="w-4 h-4 sm:w-5 sm:h-5 mr-2 mt-0.5 flex-shrink-0"
              style={{ color: "#D63B3B" }}
            />
            <div>
              <p
                className="font-semibold text-xs sm:text-sm mb-1 font-['Poppins']"
                style={{ color: "#D63B3B" }}
              >
                Documents Required
              </p>
              <p
                className="text-xs sm:text-sm font-['Poppins']"
                style={{ color: "#D63B3B" }}
              >
                {documentUploadWarning}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Existing Documents Section */}
      {existingDocuments.filter(
        (doc) => !documentsToRemove.includes(doc.document_id),
      ).length > 0 && (
        <div
          className="mb-6 rounded-xl p-4 sm:p-6"
          style={{ backgroundColor: "#E8F5E9", border: "1px solid #0F5648" }}
        >
          <div className="flex items-center mb-3 sm:mb-4">
            <CheckCircle
              className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0"
              style={{ color: "#0F5648" }}
            />
            <h3
              className="text-sm sm:text-base font-semibold font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              Previously Uploaded Documents (
              {
                existingDocuments.filter(
                  (doc) => !documentsToRemove.includes(doc.document_id),
                ).length
              }
              )
            </h3>
          </div>
          <p
            className="text-xs sm:text-sm mb-3 sm:mb-4 font-['Poppins']"
            style={{ color: "#32332D" }}
          >
            These documents were uploaded with your previous submission and will
            be included in your resubmission.
          </p>
          <div className="space-y-2">
            {existingDocuments
              .filter((doc) => !documentsToRemove.includes(doc.document_id))
              .map((doc) => (
                <div
                  key={doc.document_id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg gap-2 sm:gap-0"
                  style={{
                    backgroundColor: "#F5F5F5",
                    border: "1px solid #AA855B",
                  }}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <FileText
                      className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0"
                      style={{ color: "#0F5648" }}
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
                        {doc.document_type || "Unknown type"}
                        {doc.file_size &&
                          ` • ${(doc.file_size / 1024 / 1024).toFixed(2)} MB`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 sm:ml-2">
                    {doc.file_path && (
                      <a
                        href={doc.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-1 rounded-lg transition-colors hover:bg-blue-50 font-['Poppins'] whitespace-nowrap"
                        style={{ color: "#326586" }}
                      >
                        View
                      </a>
                    )}
                    {/* Remove button - only show when profile_status is 'rejected' or 'approved' */}
                    {(profileStatus === "rejected" ||
                      profileStatus === "approved") && (
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveExistingDocument(doc.document_id)
                        }
                        className="text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-1 rounded-lg transition-colors hover:bg-red-50 font-['Poppins'] whitespace-nowrap"
                        style={{ color: "#D63B3B" }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div
        className="rounded-xl p-4 sm:p-6"
        style={{ backgroundColor: "#FAEFE2", border: "1px solid #AA855B" }}
      >
        <p
          className="text-xs sm:text-sm mb-3 sm:mb-4 font-['Poppins']"
          style={{ color: "#32332D" }}
        >
          Please upload copies of your professional licenses, certifications,
          and qualifications. Accepted formats: PDF, JPG, PNG (Max 10MB per
          file)
        </p>

        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileUpload}
          style={{ display: "none" }}
          id="document-upload"
        />

        {/* Drag and Drop Area */}
        <div
          className="border-2 border-dashed rounded-xl p-4 sm:p-6 md:p-8 text-center transition-all duration-200"
          style={{
            borderColor: isDragOver ? "#F2742C" : "#AA855B",
            backgroundColor: isDragOver ? "#FFF4E6" : "transparent",
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-2 sm:space-y-3">
            <div
              className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#F5F5F5" }}
            >
              <Upload
                className="w-6 h-6 sm:w-8 sm:h-8"
                style={{ color: "#F2742C" }}
              />
            </div>
            <div>
              <p
                className="text-xs sm:text-sm font-medium font-['Poppins']"
                style={{ color: "#32332D" }}
              >
                {isDragOver
                  ? "Drop files here"
                  : "Drop files here or click to upload"}
              </p>
              <p
                className="text-[10px] sm:text-xs mt-1 font-['Poppins']"
                style={{ color: "#AA855B" }}
              >
                PDF, JPG, PNG (max 10MB each)
              </p>
            </div>
            <label
              htmlFor="document-upload"
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
              Choose Files
            </label>
          </div>
        </div>

        {documents.length > 0 && (
          <div className="mt-3 sm:mt-4 space-y-2">
            <p
              className="text-xs sm:text-sm font-semibold font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              New Files to Upload ({documents.length}):
            </p>
            {documents.map((file, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg gap-2 sm:gap-0"
                style={{
                  backgroundColor: "#F5F5F5",
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
                      {file.name}
                    </p>
                    <p
                      className="text-[10px] sm:text-xs font-['Poppins']"
                      style={{ color: "#AA855B" }}
                    >
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeDocument(index)}
                  className="text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-1 rounded-lg transition-colors hover:bg-red-50 font-['Poppins'] whitespace-nowrap sm:ml-3"
                  style={{ color: "#722F37" }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Step 3: Review Your Information
  const renderReviewStep = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center mb-4 sm:mb-6">
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mr-3 sm:mr-4 shadow-md flex-shrink-0"
          style={{ backgroundColor: "#722F37" }}
        >
          <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <h2
            className="text-lg sm:text-xl font-bold font-['Poppins']"
            style={{ color: "#32332D" }}
          >
            Review Your Professional Information
          </h2>
          <p
            className="text-xs sm:text-sm font-['Poppins']"
            style={{ color: "#AA855B" }}
          >
            Please review the information you've provided before submitting for
            verification.
          </p>
        </div>
      </div>

      {/* Profile Summary */}
      <div className="space-y-4 sm:space-y-6">
        {/* Professional Profile Information Card */}
        <div
          className="rounded-xl p-4 sm:p-6"
          style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
        >
          <h3
            className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 font-['Poppins'] flex items-center"
            style={{ color: "#32332D" }}
          >
            <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
            Professional Profile Information
          </h3>
          {/* Profile Image Display */}
          {(profileImagePreview || professionalProfile.profile_image_url) && (
            <div className="mb-3 sm:mb-4">
              <span
                className="font-medium text-xs sm:text-sm font-['Poppins']"
                style={{ color: "#AA855B" }}
              >
                Profile Image:
              </span>
              <div className="mt-2">
                <img
                  src={
                    profileImagePreview || professionalProfile.profile_image_url
                  }
                  alt="Profile preview"
                  className="w-full sm:w-48 h-auto sm:h-48 object-cover rounded-lg border"
                  style={{ borderColor: "#AA855B" }}
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
            <div>
              <span className="font-medium" style={{ color: "#AA855B" }}>
                Business Name:
              </span>
              <span className="ml-2" style={{ color: "#32332D" }}>
                {professionalProfile.business_name || "-"}
              </span>
            </div>
            <div>
              <span className="font-medium" style={{ color: "#AA855B" }}>
                Professional Type:
              </span>
              <span className="ml-2" style={{ color: "#32332D" }}>
                {professionalProfile.professional_type
                  ? professionalProfile.professional_type === "other" &&
                    professionalProfile.customProfessionalType
                    ? professionalProfile.customProfessionalType
                    : professionalProfile.professional_type
                        .split("_")
                        .map(
                          (w: string) => w.charAt(0).toUpperCase() + w.slice(1),
                        )
                        .join(" ")
                  : "-"}
              </span>
            </div>
            <div>
              <span className="font-medium" style={{ color: "#AA855B" }}>
                Years of Experience:
              </span>
              <span className="ml-2" style={{ color: "#32332D" }}>
                {professionalProfile.years_experience
                  ? `${professionalProfile.years_experience} years`
                  : "-"}
              </span>
            </div>
            <div className="md:col-span-2">
              <span className="font-medium" style={{ color: "#AA855B" }}>
                Qualifications:
              </span>
              <div className="ml-2 mt-1" style={{ color: "#32332D" }}>
                {professionalProfile.qualifications
                  ? renderBulletPoints(professionalProfile.qualifications)
                  : "-"}
              </div>
            </div>
            <div className="md:col-span-2">
              <span className="font-medium" style={{ color: "#AA855B" }}>
                Certifications:
              </span>
              <div className="ml-2 mt-1" style={{ color: "#32332D" }}>
                {professionalProfile.certifications
                  ? renderBulletPoints(professionalProfile.certifications)
                  : "-"}
              </div>
            </div>
            <div className="md:col-span-2">
              <span className="font-medium" style={{ color: "#AA855B" }}>
                Specializations:
              </span>
              <div className="ml-2 mt-1" style={{ color: "#32332D" }}>
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
                              fontSize: "0.75rem",
                            }}
                          />
                        ),
                      )}
                    </div>
                  ) : (
                    renderBulletPoints(professionalProfile.specializations) // Fallback for text (backward compatibility)
                  )
                ) : (
                  "-"
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <span className="font-medium" style={{ color: "#AA855B" }}>
                Developmental Stages Served:
              </span>
              <div className="ml-2 mt-1">
                {professionalProfile.target_developmental_stages &&
                professionalProfile.target_developmental_stages.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {professionalProfile.target_developmental_stages.map(
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
                              fontSize: "11px",
                            }}
                          />
                        );
                      },
                    )}
                  </div>
                ) : (
                  <span style={{ color: "#32332D" }}>-</span>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <span className="font-medium" style={{ color: "#AA855B" }}>
                Languages Spoken:
              </span>
              <div className="ml-2 mt-1">
                {professionalProfile.languages &&
                professionalProfile.languages.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {professionalProfile.languages.map(
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
                              fontSize: "11px",
                            }}
                          />
                        );
                      },
                    )}
                  </div>
                ) : (
                  <span style={{ color: "#32332D" }}>-</span>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <span className="font-medium" style={{ color: "#AA855B" }}>
                Availability:
              </span>
              <div className="ml-2 mt-1">
                {professionalProfile.availability &&
                professionalProfile.availability.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {professionalProfile.availability.map(
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
                              fontSize: "11px",
                            }}
                          />
                        );
                      },
                    )}
                  </div>
                ) : (
                  <span style={{ color: "#32332D" }}>-</span>
                )}
              </div>
            </div>
            <div>
              <span className="font-medium" style={{ color: "#AA855B" }}>
                Contact Email:
              </span>
              {professionalProfile.contact_email ? (
                <a
                  href={`https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(professionalProfile.contact_email)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 underline hover:opacity-80 transition-opacity"
                  style={{ color: "#326586" }}
                  title="Click to open Gmail compose in a new tab"
                >
                  {professionalProfile.contact_email}
                </a>
              ) : (
                <span className="ml-2" style={{ color: "#32332D" }}>
                  -
                </span>
              )}
            </div>
            <div>
              <span className="font-medium" style={{ color: "#AA855B" }}>
                Contact Phone:
              </span>
              <span className="ml-2" style={{ color: "#32332D" }}>
                {professionalProfile.contact_phone || "-"}
              </span>
            </div>
            <div>
              <span
                className="font-medium font-['Poppins']"
                style={{ color: "#AA855B" }}
              >
                Website URL:
              </span>
              {professionalProfile.website_url ? (
                <a
                  href={professionalProfile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 font-['Poppins'] underline hover:opacity-80 transition-opacity"
                  style={{ color: "#326586" }}
                >
                  {professionalProfile.website_url}
                </a>
              ) : (
                <span
                  className="ml-2 font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  -
                </span>
              )}
            </div>
            <div>
              <span
                className="font-medium font-['Poppins']"
                style={{ color: "#AA855B" }}
              >
                Professional Bio:
              </span>
              <span
                className="ml-2 font-['Poppins']"
                style={{ color: "#32332D" }}
              >
                {professionalProfile.bio || "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Service Location Card */}
        <div
          className="rounded-xl p-4 sm:p-6"
          style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
        >
          <h3
            className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 font-['Poppins'] flex items-center"
            style={{ color: "#32332D" }}
          >
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
            Service Location
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
            <div className="md:col-span-2">
              <span className="font-medium" style={{ color: "#AA855B" }}>
                Address Line:
              </span>
              <span className="ml-2" style={{ color: "#32332D" }}>
                {professionalProfile.address_line || "-"}
              </span>
            </div>
            <div>
              <span className="font-medium" style={{ color: "#AA855B" }}>
                City:
              </span>
              <span className="ml-2" style={{ color: "#32332D" }}>
                {professionalProfile.city || "-"}
              </span>
            </div>
            <div>
              <span className="font-medium" style={{ color: "#AA855B" }}>
                State:
              </span>
              <span className="ml-2" style={{ color: "#32332D" }}>
                {professionalProfile.state || "-"}
              </span>
            </div>
            <div>
              <span className="font-medium" style={{ color: "#AA855B" }}>
                Postcode:
              </span>
              <span className="ml-2" style={{ color: "#32332D" }}>
                {professionalProfile.postcode || "-"}
              </span>
            </div>
            <div>
              <span className="font-medium" style={{ color: "#AA855B" }}>
                Country:
              </span>
              <span className="ml-2" style={{ color: "#32332D" }}>
                {professionalProfile.country || "-"}
              </span>
            </div>
            {professionalProfile.addGoogleMapsLink && (
              <div className="md:col-span-2">
                <span
                  className="font-medium font-['Poppins']"
                  style={{ color: "#AA855B" }}
                >
                  Google Maps URL:
                </span>
                {(() => {
                  // Use manually entered URL if available, otherwise generate from address
                  let mapsUrl = professionalProfile.google_maps_url;
                  if (!mapsUrl) {
                    // Auto-generate from address if field is empty and checkbox is checked
                    const { address_line, city, state, postcode, country } =
                      professionalProfile;
                    if (address_line || city || state) {
                      const address = [
                        address_line,
                        city,
                        state,
                        postcode,
                        country,
                      ]
                        .filter(Boolean)
                        .join(", ");
                      if (address) {
                        mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                      }
                    }
                  }

                  return mapsUrl ? (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 underline hover:opacity-80 transition-opacity break-all word-break break-words font-['Poppins'] block mt-1"
                      style={{ color: "#326586" }}
                    >
                      {mapsUrl}
                    </a>
                  ) : (
                    <span
                      className="ml-2 font-['Poppins']"
                      style={{ color: "#32332D" }}
                    >
                      -
                    </span>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Verification Documents Card */}
        <div
          className="rounded-xl p-4 sm:p-6"
          style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
        >
          <h3
            className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 font-['Poppins'] flex items-center"
            style={{ color: "#32332D" }}
          >
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
            Verification Documents
          </h3>
          {existingDocuments.filter(
            (doc) => !documentsToRemove.includes(doc.document_id),
          ).length > 0 || documents.length > 0 ? (
            <div className="space-y-3">
              {/* Existing Documents (not marked for removal) */}
              {existingDocuments.filter(
                (doc) => !documentsToRemove.includes(doc.document_id),
              ).length > 0 && (
                <div>
                  <p
                    className="text-xs sm:text-sm font-semibold mb-2 font-['Poppins']"
                    style={{ color: "#AA855B" }}
                  >
                    Previously Uploaded (
                    {
                      existingDocuments.filter(
                        (doc) => !documentsToRemove.includes(doc.document_id),
                      ).length
                    }
                    ):
                  </p>
                  <div className="space-y-2">
                    {existingDocuments
                      .filter(
                        (doc) => !documentsToRemove.includes(doc.document_id),
                      )
                      .map((doc) => (
                        <div
                          key={doc.document_id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 rounded-lg gap-2 sm:gap-0"
                          style={{
                            backgroundColor: "#E8F5E9",
                            border: "1px solid #0F5648",
                          }}
                        >
                          <div className="flex items-center flex-1 min-w-0">
                            <FileText
                              className="w-4 h-4 mr-2 flex-shrink-0"
                              style={{ color: "#0F5648" }}
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
                                {doc.document_type || "Unknown type"}
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
                </div>
              )}
              {/* New Documents */}
              {documents.length > 0 && (
                <div>
                  <p
                    className="text-xs sm:text-sm font-semibold mb-2 font-['Poppins']"
                    style={{ color: "#AA855B" }}
                  >
                    New Files to Upload ({documents.length}):
                  </p>
                  <div className="space-y-2">
                    {documents.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center p-2 sm:p-3 rounded-lg"
                        style={{
                          backgroundColor: "#FAEFE2",
                          border: "1px solid #F2742C",
                        }}
                      >
                        <FileText
                          className="w-4 h-4 mr-2 flex-shrink-0"
                          style={{ color: "#F2742C" }}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-xs sm:text-sm font-medium truncate font-['Poppins']"
                            style={{ color: "#32332D" }}
                          >
                            {file.name}
                          </p>
                          <p
                            className="text-[10px] sm:text-xs font-['Poppins']"
                            style={{ color: "#AA855B" }}
                          >
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p
              className="text-sm font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              -
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // Step 4: Submission Complete
  const renderSubmissionCompleteStep = () => (
    <div className="text-center space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      <div
        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto shadow-lg"
        style={{ backgroundColor: "#0F5648" }}
      >
        <Check className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
      </div>
      <h2
        className="text-lg sm:text-xl font-bold font-['Poppins']"
        style={{ color: "#32332D" }}
      >
        Submission Complete!
      </h2>
      <p
        className="text-sm sm:text-base max-w-2xl mx-auto px-2"
        style={{ color: "#AA855B" }}
      >
        Your professional profile has been submitted for verification. Our
        Professional Service Coordinators will review your information and
        documents.
      </p>

      <div
        className="rounded-xl p-4 sm:p-6 max-w-2xl mx-auto"
        style={{ backgroundColor: "#FFF4E6", border: "1px solid #F2742C" }}
      >
        <div className="flex items-start">
          <Shield
            className="w-4 h-4 sm:w-5 sm:h-5 mr-2 mt-0.5 flex-shrink-0"
            style={{ color: "#F2742C" }}
          />
          <div className="text-left">
            <h3
              className="text-sm sm:text-base font-semibold mb-1.5 sm:mb-2 font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              Verification in Progress
            </h3>
            <p className="text-xs sm:text-sm" style={{ color: "#32332D" }}>
              Your profile is now locked and under review. This typically takes
              3-5 business days. You'll receive an email notification once your
              account is verified.
            </p>
          </div>
        </div>
      </div>

      <div
        className="rounded-xl p-4 sm:p-6 max-w-2xl mx-auto"
        style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
      >
        <h3
          className="text-sm sm:text-base font-semibold mb-1.5 sm:mb-2 font-['Poppins']"
          style={{ color: "#32332D" }}
        >
          What's Next?
        </h3>
        <ul
          className="text-xs sm:text-sm space-y-0.5 sm:space-y-1 text-left"
          style={{ color: "#AA855B" }}
        >
          <li>• Access your professional dashboard</li>
          <li>• Track verification status</li>
          <li>• Once verified, appear in the professional directory</li>
          <li>
            • Parents will find your profile and contact you directly via your
            provided contact information
          </li>
        </ul>
      </div>

      <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 px-2">
        <button
          onClick={() => navigate("/professional-dashboard")}
          className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm"
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
          Go to Dashboard
        </button>
        <button
          onClick={() => navigate("/professional-profile")}
          className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm shadow-lg hover:shadow-xl"
          style={{ backgroundColor: "#F2742C" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#E55A1F";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#F2742C";
          }}
        >
          View My Profile
        </button>
      </div>
    </div>
  );

  if (loading && currentStep !== 4) {
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
    <div className="min-h-screen" style={{ backgroundColor: "#FAEFE2" }}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Fixed Header */}
        <div className="mb-4 sm:mb-6">
          {/* Back Button */}
          <div className="mb-3 sm:mb-4">
            <button
              onClick={handleBack}
              className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm font-medium font-['Poppins'] transition-all duration-200"
              style={{ color: "#AA855B" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#F2742C";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#AA855B";
              }}
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Back</span>
            </button>
          </div>

          <div className="text-center mb-3 sm:mb-4">
            <h1
              className="text-xl sm:text-2xl font-bold mb-0.5 sm:mb-1 font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              Submit Your Professional Profile
            </h1>
            <p
              className="text-sm sm:text-base font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              Share your services with the ParenZing community
            </p>
          </div>
          {renderProgressBar()}
        </div>

        {/* Important Notice */}
        {currentStep < 4 && (
          <div
            className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl"
            style={{ backgroundColor: "#FFF4E6", border: "1px solid #F2742C" }}
          >
            <div className="flex items-start">
              <Shield
                className="w-4 h-4 sm:w-5 sm:h-5 mr-2 mt-0.5 flex-shrink-0"
                style={{ color: "#F2742C" }}
              />
              <div>
                <p
                  className="font-semibold text-xs sm:text-sm mb-1 font-['Poppins']"
                  style={{ color: "#F2742C" }}
                >
                  Important Notice
                </p>
                <p
                  className="text-xs sm:text-sm font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  This is a one-time submission. Please ensure all information
                  is complete and accurate before submitting. All information
                  will be reviewed by our Professional Service Coordinators
                  before approval. Once submitted, your profile will be locked
                  and cannot be edited until the review process is complete.
                  Please review all details carefully before proceeding.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center text-red-600">
              <Shield className="w-4 h-4 mr-2" />
              {error}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="mb-6">
          {currentStep === 1 && renderProfessionalInfoStep()}
          {currentStep === 2 && renderDocumentUploadStep()}
          {currentStep === 3 && renderReviewStep()}
          {currentStep === 4 && renderSubmissionCompleteStep()}
        </div>

        {/* Fixed Navigation Footer */}
        {currentStep < 4 && (
          <div
            className="border-t pt-3 sm:pt-4"
            style={{ borderColor: "#AA855B" }}
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center justify-center space-x-2 px-4 sm:px-5 py-2 sm:py-2.5 border rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-xs sm:text-sm font-['Poppins']"
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

              {currentStep === 3 ? (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center justify-center space-x-2 px-4 sm:px-6 py-2 sm:py-2.5 text-white rounded-xl transition-all duration-200 font-medium text-xs sm:text-sm font-['Poppins'] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#0F5648" }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = "#0A4538";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#0F5648";
                  }}
                >
                  {loading ? (
                    <CircularProgress size={16} sx={{ color: "white" }} />
                  ) : (
                    <>
                      <span className="whitespace-nowrap">
                        Submit for Verification
                      </span>
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={nextStep}
                  className="flex items-center justify-center space-x-2 px-4 sm:px-5 py-2 sm:py-2.5 text-white rounded-xl transition-all duration-200 font-medium text-xs sm:text-sm font-['Poppins'] shadow-lg hover:shadow-xl"
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
              )}
            </div>
          </div>
        )}
      </div>

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

export default ProfessionalProfileSubmission;
