// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: ProfessionalDashboard.tsx
// Description: To display the main dashboard for professional users to manage their services and promotional materials
// First Written on: Tuesday, 14-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state and lifecycle management
import React, { useState, useEffect } from "react";
// Import React Router hooks for navigation and URL parameters
import { useNavigate, useSearchParams } from "react-router-dom";
// Import Material-UI components for form elements and UI
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  FormHelperText,
  CircularProgress,
  Typography,
  Chip,
} from "@mui/material";
// Import lucide-react icons for UI elements
import {
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit3,
  Megaphone,
  Heart,
  HeartHandshake,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
// Import Poppins font weights for consistent typography
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
// Import API functions for professional operations
import {
  getProfessionalProfile,
  getPromotionalMaterials,
  createPromotionalMaterial,
  updatePromotionalMaterial,
  deletePromotionalMaterial,
  uploadPromotionalImage,
  getProfessionalServices,
  createProfessionalService,
  updateProfessionalService,
  deleteProfessionalService,
} from "../services/api";
// Import toast notification components
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * Dashboard tab type definition
 */
type DashboardTab = "services" | "promotional";

/**
 * Dashboard tabs configuration
 * Defines available tabs with their labels and icons
 */
const DASHBOARD_TABS: {
  id: DashboardTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "services", label: "Services", icon: HeartHandshake },
  { id: "promotional", label: "Promotional Materials", icon: Megaphone },
];

/**
 * Service category options for dropdown
 * Available categories for professional services
 */
const serviceCategoryOptions = [
  { value: "therapy", label: "Therapy" },
  { value: "counseling", label: "Counseling" },
  { value: "assessment", label: "Assessment" },
  { value: "coaching", label: "Coaching" },
  { value: "consultation", label: "Consultation" },
  { value: "workshops", label: "Workshops" },
  { value: "support_groups", label: "Support Groups" },
];

/**
 * Service type options for dropdown
 * Available delivery types for professional services
 */
const serviceTypeOptions = [
  { value: "individual", label: "Individual" },
  { value: "group", label: "Group" },
  { value: "family", label: "Family" },
  { value: "online", label: "Online" },
  { value: "in_person", label: "In-Person" },
  { value: "home_visits", label: "Home Visits" },
  { value: "hybrid", label: "Hybrid (Online + In-Person)" },
];

/**
 * ProfessionalService interface
 * Defines the structure of a professional service
 */
interface ProfessionalService {
  service_id: number;
  profile_id: number;
  service_name: string;
  service_description?: string;
  service_category?: string;
  service_type?: string;
  price_range?: string;
  created_at: string;
  updated_at: string;
}

/**
 * ProfessionalDashboard Component
 * 
 * Main dashboard for professional users to manage their services and promotional materials.
 * Features include:
 * - Service management (create, edit, delete)
 * - Promotional materials management
 * - Status tracking (pending, approved, rejected)
 * - Tab-based navigation
 * 
 * @returns JSX element representing the professional dashboard
 */
const ProfessionalDashboard: React.FC = () => {
  // React Router hooks
  const navigate = useNavigate();        // Navigation function for programmatic routing
  const [searchParams, setSearchParams] = useSearchParams();  // URL search parameters
  
  // Component state management
  const [professionalProfile, setProfessionalProfile] = useState<any>(null);  // Professional profile data
  const [services, setServices] = useState<ProfessionalService[]>([]);  // List of professional services
  const [promotionalMaterials, setPromotionalMaterials] = useState<any[]>([]);  // List of promotional materials
  const [loading, setLoading] = useState(true);  // Loading state during data fetch
  const [promoFilter, setPromoFilter] = useState<
    | "all"
    | "pending"
    | "approved"
    | "rejected"
    | "active"
    | "expired"
    | "upcoming"
  >("all");  // Filter for promotional materials
  const [promoFilterFocused, setPromoFilterFocused] = useState<boolean>(false);  // Whether promo filter dropdown is focused
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => {
    // Initialize active tab from URL parameter or default to "services"
    const tabParam = searchParams.get("tab");
    if (tabParam === "promotional") return "promotional";
    return "services";
  });

  // Service modal state
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] =
    useState<ProfessionalService | null>(null);
  const [serviceForm, setServiceForm] = useState({
    service_name: "",
    service_description: "",
    service_category: "",
    service_type: "",
    price_range: "",
  });
  const [savingService, setSavingService] = useState(false);
  const [serviceErrors, setServiceErrors] = useState<Record<string, string>>(
    {},
  );

  // Promotional materials modal state
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [promoForm, setPromoForm] = useState({
    content_type: "banner",
    title: "",
    description: "",
    file_path: "",
    display_start_date: "",
    display_end_date: "",
    display_sequence: null as number | null,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [promoErrors, setPromoErrors] = useState<Record<string, string>>({});

  // Delete confirmation modals
  const [showDeleteServiceModal, setShowDeleteServiceModal] =
    useState<ProfessionalService | null>(null);
  const [showDeletePromoModal, setShowDeletePromoModal] = useState<any | null>(
    null,
  );

  // Handle tab changes from URL query params
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "promotional") {
      setActiveTab("promotional");
    } else {
      setActiveTab("services");
    }
  }, [searchParams]);

  /**
   * Fetches all dashboard data from the API
   * 
   * Retrieves professional profile, services, and promotional materials.
   * Handles missing profiles gracefully - if profile doesn't exist (404 response),
   * sets all data to empty/null values. This allows the dashboard to display
   * properly even for users who haven't completed profile setup.
   */
  const fetchData = async () => {
    setLoading(true);
    try {
      const profileData = await getProfessionalProfile();
      // Handle null profile (profile doesn't exist yet - user skipped setup)
      // Set all related data to empty/null to allow dashboard to display
      if (profileData === null) {
        setProfessionalProfile(null);
        setServices([]);
        setPromotionalMaterials([]);
      } else {
        setProfessionalProfile(profileData.profile || null);

        if (profileData.profile) {
          // Only fetch services and materials if profile exists
          const servicesData = await getProfessionalServices();
          setServices(servicesData || []);

          // Only fetch promotional materials if profile exists
          try {
            const materials = await getPromotionalMaterials();
            setPromotionalMaterials(materials || []);
          } catch (e: any) {
            // If no profile or error, set empty array
            console.warn("Failed to load promotional materials:", e);
            setPromotionalMaterials([]);
          }
        } else {
          setServices([]);
          setPromotionalMaterials([]);
        }
      }
    } catch (e: any) {
      console.error("Failed to load dashboard data:", e);
      setProfessionalProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle tab changes from URL query params (including refresh parameter)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const refreshParam = searchParams.get("refresh"); // Used to force reload when navigating via notification

    // Set active tab
    if (tabParam === "promotional") {
      setActiveTab("promotional");
    } else {
      setActiveTab("services");
    }

    // If refresh param is present (e.g., from notification click), force reload regardless of tab
    if (refreshParam) {
      fetchData();
      // Remove refresh param from URL to clean it up
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("refresh");
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload data when page becomes visible (e.g., user switches back to tab after coordinator action)
  useEffect(() => {
    let wasHidden = false;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        wasHidden = true;
      } else if (wasHidden) {
        // Page became visible after being hidden, reload data to get latest status
        fetchData();
        wasHidden = false;
      }
    };

    const handleFocus = () => {
      // Window gained focus, reload data to get latest updates
      if (wasHidden) {
        fetchData();
        wasHidden = false;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Service management functions
  const openServiceModal = (service?: ProfessionalService) => {
    if (service) {
      setEditingService(service);
      setServiceForm({
        service_name: service.service_name || "",
        service_description: service.service_description || "",
        service_category: service.service_category || "",
        service_type: service.service_type || "",
        price_range: service.price_range || "",
      });
    } else {
      setEditingService(null);
      setServiceForm({
        service_name: "",
        service_description: "",
        service_category: "",
        service_type: "",
        price_range: "",
      });
    }
    setServiceModalOpen(true);
  };

  const closeServiceModal = () => {
    setServiceModalOpen(false);
    setEditingService(null);
    setServiceErrors({});
  };

  const handleServiceChange = (field: string, value: any) => {
    setServiceForm((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (serviceErrors[field]) {
      setServiceErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSaveService = async () => {
    // Validate all required fields
    const errors: Record<string, string> = {};

    if (!serviceForm.service_name.trim()) {
      errors.service_name = "Please enter a service name";
    }
    if (!serviceForm.service_description.trim()) {
      errors.service_description = "Please enter a service description";
    }
    if (!serviceForm.service_category) {
      errors.service_category = "Please select a service category";
    }
    if (!serviceForm.service_type) {
      errors.service_type = "Please select a service type";
    }
    if (!serviceForm.price_range.trim()) {
      errors.price_range = "Please enter a price range";
    }

    if (Object.keys(errors).length > 0) {
      setServiceErrors(errors);
      return;
    }

    setServiceErrors({});

    setSavingService(true);
    try {
      if (editingService) {
        await updateProfessionalService(editingService.service_id, serviceForm);
        toast.success("Service updated successfully!");
      } else {
        await createProfessionalService(serviceForm);
        toast.success("Service created successfully!");
      }

      // Refresh services list
      const servicesData = await getProfessionalServices();
      setServices(servicesData || []);
      closeServiceModal();
    } catch (e: any) {
      toast.error(e.message || "Failed to save service");
    } finally {
      setSavingService(false);
    }
  };

  const handleDeleteServiceClick = (service: ProfessionalService) => {
    setShowDeleteServiceModal(service);
  };

  const confirmDeleteService = async () => {
    if (!showDeleteServiceModal) return;

    const checkbox = document.getElementById(
      "confirm-delete-service",
    ) as HTMLInputElement;
    if (!checkbox?.checked) {
      toast.error(
        "Please confirm that you understand this action cannot be undone.",
      );
      return;
    }

    try {
      await deleteProfessionalService(showDeleteServiceModal.service_id);
      toast.success("Service deleted successfully!");
      const servicesData = await getProfessionalServices();
      setServices(servicesData || []);
      setShowDeleteServiceModal(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete service");
    }
  };

  // Promotional materials functions
  const openPromoModal = (material?: any) => {
    if (material) {
      setEditingMaterial(material);
      setPromoForm({
        content_type: material.content_type || "banner",
        title: material.title || "",
        description: material.description || "",
        file_path: material.file_path || "",
        display_start_date: material.display_start_date || "",
        display_end_date: material.display_end_date || "",
        display_sequence: material.display_sequence || null,
      });
      setSelectedImage(null);
      setSelectedImagePreview(material.file_path || "");
    } else {
      setEditingMaterial(null);
      setPromoForm({
        content_type: "banner",
        title: "",
        description: "",
        file_path: "",
        display_start_date: "",
        display_end_date: "",
        display_sequence: null,
      });
      setSelectedImage(null);
      setSelectedImagePreview("");
    }
    setPromoModalOpen(true);
  };

  const closePromoModal = () => {
    setPromoModalOpen(false);
    setEditingMaterial(null);
    setSelectedImage(null);
    setSelectedImagePreview("");
    setIsDragOver(false);
    setPromoErrors({});
  };

  const handlePromoChange = (field: string, value: any) => {
    setPromoForm((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (promoErrors[field]) {
      setPromoErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // TextField styles function (matching ChildFormDialog)
  const getTextFieldStyles = (
    hasValue: boolean,
    hasError: boolean = false,
  ) => ({
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      backgroundColor: hasValue ? "#F5F5F5" : "#EDEDED",
      fontFamily: "'Poppins', sans-serif",
      "&.Mui-focused": {
        backgroundColor: "#F5F5F5",
        boxShadow: "0 0 0 2px #F2742C",
      },
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: hasError ? "#D63B3B" : "#AA855B",
        borderWidth: hasError ? "2px" : "1px",
      },
      "&.Mui-error .MuiOutlinedInput-notchedOutline": {
        borderColor: "#D63B3B",
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

  // Select styles function (matching ChildFormDialog)
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
    "&.Mui-error .MuiOutlinedInput-notchedOutline": {
      borderColor: "#D63B3B",
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

  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, etc.)");
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be less than 10MB");
      return false;
    }
    return true;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && processImageFile(file)) {
      setSelectedImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Clear image error when file is selected
      if (promoErrors.image) {
        setPromoErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.image;
          return newErrors;
        });
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (processImageFile(file)) {
        setSelectedImage(file);
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        // Clear image error when file is selected
        if (promoErrors.image) {
          setPromoErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.image;
            return newErrors;
          });
        }
      }
    }
  };

  const handleSavePromo = async () => {
    // Validate all required fields
    const errors: Record<string, string> = {};

    if (!promoForm.title.trim()) {
      errors.title = "Please enter a title";
    }
    if (!promoForm.description.trim()) {
      errors.description = "Please enter a description";
    }
    if (
      !selectedImage &&
      !selectedImagePreview &&
      !editingMaterial?.file_path
    ) {
      errors.image = "Please upload an image";
    }

    if (Object.keys(errors).length > 0) {
      setPromoErrors(errors);
      return;
    }

    setPromoErrors({});

    setSaving(true);
    try {
      let filePath = promoForm.file_path;

      // Upload image if selected
      if (selectedImage) {
        setUploadingImage(true);
        const uploadResult = await uploadPromotionalImage(selectedImage);
        filePath = uploadResult.file_path;
        setUploadingImage(false);
      }

      const materialData = {
        ...promoForm,
        file_path: filePath || undefined,
      };

      if (editingMaterial) {
        await updatePromotionalMaterial(
          editingMaterial.material_id,
          materialData,
        );
        toast.success(
          "Promotional material updated successfully! It will be reviewed again.",
        );
      } else {
        await createPromotionalMaterial(materialData);
        toast.success("Promotional material submitted successfully!");
      }

      // Refresh materials list to show updated status (rejected -> pending)
      const materials = await getPromotionalMaterials();
      setPromotionalMaterials(materials || []);
      closePromoModal();
    } catch (e: any) {
      toast.error(e.message || "Failed to save promotional material");
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const handleDeletePromoClick = (material: any) => {
    setShowDeletePromoModal(material);
  };

  const confirmDeletePromo = async () => {
    if (!showDeletePromoModal) return;

    const checkbox = document.getElementById(
      "confirm-delete-promo",
    ) as HTMLInputElement;
    if (!checkbox?.checked) {
      toast.error(
        "Please confirm that you understand this action cannot be undone.",
      );
      return;
    }

    try {
      await deletePromotionalMaterial(showDeletePromoModal.material_id);
      toast.success("Promotional material deleted successfully!");
      const materials = await getPromotionalMaterials();
      setPromotionalMaterials(materials || []);
      setShowDeletePromoModal(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete promotional material");
    }
  };

  const getStatusBadge = (profileStatus: string) => {
    switch (profileStatus) {
      case "archived":
        return {
          label: "Archived",
          bg: "#F5F5F5",
          color: "#AA855B",
          border: "#AA855B",
        };
      case "pending":
        return {
          label: "Pending",
          color: "#F2742C",
          bg: "#FFF4E6",
          border: "#F2742C",
        };
      case "rejected":
        return {
          label: "Rejected",
          color: "#D63B3B",
          bg: "#FFEBEE",
          border: "#D63B3B",
        };
      case "approved":
        return {
          label: "Verified",
          color: "#0F5648",
          bg: "#E8F5E9",
          border: "#0F5648",
        };
      default:
        return {
          label: "Unknown",
          color: "#AA855B",
          bg: "#FAEFE2",
          border: "#AA855B",
        };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return { bg: "#E8F5E9", text: "#0F5648", border: "#0F5648" };
      case "rejected":
        return { bg: "#FFEBEE", text: "#D63B3B", border: "#D63B3B" };
      default:
        return { bg: "#FFF4E6", text: "#F2742C", border: "#F2742C" };
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  // Helper function to calculate days remaining
  const calculateDaysRemaining = (
    endDate: string | null | undefined,
  ): number | null => {
    if (!endDate) return null;
    try {
      const end = new Date(endDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      const diff = end.getTime() - now.getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };

  // Helper function to get promotion status (Active/Expired/Upcoming)
  const getPromotionStatus = (
    material: any,
  ): {
    status: "active" | "expired" | "upcoming" | null;
    badge: { bg: string; text: string; label: string };
  } => {
    if (!material.display_start_date || !material.display_end_date) {
      return {
        status: null,
        badge: { bg: "#F5F5F5", text: "#AA855B", label: "No dates set" },
      };
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(material.display_start_date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(material.display_end_date);
    end.setHours(0, 0, 0, 0);

    if (now < start) {
      return {
        status: "upcoming",
        badge: { bg: "#FFF4E6", text: "#F2742C", label: "Upcoming" },
      };
    } else if (now > end) {
      return {
        status: "expired",
        badge: { bg: "#F5F5F5", text: "#64635E", label: "Expired" },
      };
    } else {
      return {
        status: "active",
        badge: { bg: "#E8F5E9", text: "#0F5648", label: "Active" },
      };
    }
  };

  const displayName =
    professionalProfile?.business_name ||
    localStorage.getItem("userEmail")?.split("@")[0] ||
    "Professional";

  const statusBadge = professionalProfile
    ? getStatusBadge(professionalProfile.profile_status)
    : null;

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#FAEFE2" }}
      >
        <CircularProgress sx={{ color: "#F2742C" }} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pt-16 sm:pt-20 py-6 sm:py-8"
      style={{ backgroundColor: "#FAEFE2" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 sm:mb-3 gap-2 sm:gap-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <Heart
                className="w-6 h-6 sm:w-8 sm:h-8"
                style={{ color: "#F2742C" }}
              />
              <h1
                className="text-xl sm:text-2xl md:text-3xl font-bold font-['Poppins']"
                style={{ color: "#32332D" }}
              >
                Welcome back, {displayName}!
              </h1>
            </div>
            {statusBadge && (
              <Chip
                label={statusBadge.label}
                sx={{
                  backgroundColor: statusBadge.bg,
                  color: statusBadge.color,
                  border: `1px solid ${statusBadge.border}`,
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                  fontSize: { xs: "11px", sm: "13px" },
                  padding: { xs: "6px 12px", sm: "8px 16px" },
                  height: "auto",
                }}
              />
            )}
          </div>
          <p
            className="text-sm sm:text-base md:text-lg font-['Poppins']"
            style={{ color: "#32332D" }}
          >
            Your professional dashboard for managing services and promotional
            materials
          </p>
        </div>
        {/* Status Banners */}
        {professionalProfile &&
          professionalProfile.profile_status === "pending" && (
            <div
              className="mb-4 sm:mb-8 p-4 sm:p-6 rounded-xl"
              style={{
                backgroundColor: "#FFF4E6",
                border: "1px solid #F2742C",
              }}
            >
              <div className="flex items-start">
                <Clock
                  className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 mt-0.5 flex-shrink-0"
                  style={{ color: "#F2742C" }}
                />
                <div className="flex-1">
                  <h2
                    className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    Profile Under Review
                  </h2>
                  <p
                    className="text-xs sm:text-sm"
                    style={{ color: "#32332D" }}
                  >
                    Your submission is being verified. Your profile and
                    documents are currently under review by our Professional
                    Service Coordinators. This typically takes 3-5 business
                    days. You'll receive an email notification once your account
                    is verified.
                  </p>
                </div>
              </div>
            </div>
          )}

        {professionalProfile &&
          professionalProfile.profile_status === "approved" && (
            <div
              className="mb-4 sm:mb-8 p-4 sm:p-6 rounded-xl"
              style={{
                backgroundColor: "#E8F5E9",
                border: "1px solid #0F5648",
              }}
            >
              <div className="flex items-start">
                <CheckCircle
                  className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 mt-0.5 flex-shrink-0"
                  style={{ color: "#0F5648" }}
                />
                <div className="flex-1">
                  <h2
                    className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    Profile Verified
                  </h2>
                  <p
                    className="text-xs sm:text-sm"
                    style={{ color: "#32332D" }}
                  >
                    Your profile is live in the directory. Parents can now
                    discover and contact you through the Professional Directory.
                  </p>
                </div>
              </div>
            </div>
          )}

        {professionalProfile &&
          professionalProfile.profile_status === "archived" && (
            <div
              className="mb-4 sm:mb-8 p-4 sm:p-6 rounded-xl"
              style={{
                backgroundColor: "#FFF4E6",
                border: "1px solid #AA855B",
              }}
            >
              <div className="flex items-start">
                <AlertCircle
                  className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 mt-0.5 flex-shrink-0"
                  style={{ color: "#AA855B" }}
                />
                <div className="flex-1">
                  <h2
                    className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    Profile Archived
                  </h2>
                  <p
                    className="text-xs sm:text-sm"
                    style={{ color: "#32332D" }}
                  >
                    Your professional profile has been temporarily removed from
                    the public directory. You can still access your dashboard
                    and manage your services. Contact support if you have
                    questions.
                  </p>
                </div>
              </div>
            </div>
          )}

        {professionalProfile &&
          professionalProfile.profile_status === "rejected" && (
            <div
              className="mb-4 sm:mb-8 p-4 sm:p-6 rounded-xl"
              style={{
                backgroundColor: "#FFEBEE",
                border: "1px solid #D63B3B",
              }}
            >
              <div className="flex items-start">
                <AlertCircle
                  className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 mt-0.5 flex-shrink-0"
                  style={{ color: "#D63B3B" }}
                />
                <div className="flex-1">
                  <h2
                    className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    Profile Rejected
                  </h2>
                  <p
                    className="text-xs sm:text-sm mb-2 sm:mb-3"
                    style={{ color: "#32332D" }}
                  >
                    Your profile has been rejected due to the following reason.
                    Please review the feedback and submit your profile again.
                  </p>
                  {professionalProfile.rejection_reason && (
                    <div
                      className="mt-2 sm:mt-3 mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-lg"
                      style={{
                        backgroundColor: "#FFF9F0",
                        border: "1px solid #F2742C",
                      }}
                    >
                      <p
                        className="text-xs sm:text-sm font-semibold mb-1 font-['Poppins']"
                        style={{ color: "#F2742C" }}
                      >
                        Rejection Reason:
                      </p>
                      <p
                        className="text-[11px] sm:text-xs"
                        style={{ color: "#32332D" }}
                      >
                        {professionalProfile.rejection_reason}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() =>
                      navigate("/professional-profile-submission", {
                        state: {
                          existingProfile: professionalProfile,
                          referrer: "/professional-dashboard",
                        },
                      })
                    }
                    className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm shadow-lg hover:shadow-xl"
                    style={{
                      backgroundColor: "#D63B3B",
                      color: "white",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#C02A2A";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#D63B3B";
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Submit Profile Again</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* Tabs - Always show */}
        {/* Tab Navigation */}
        <div className="mb-4 sm:mb-6">
          <div
            className="flex space-x-1 p-1.5 sm:p-2 rounded-lg w-full sm:w-fit overflow-x-auto"
            style={{ backgroundColor: "#FCF9F8" }}
          >
            {DASHBOARD_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchParams({ tab: tab.id });
                  }}
                  className={`flex items-center space-x-1.5 sm:space-x-2 py-1.5 sm:py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.id
                      ? "shadow-sm"
                      : "opacity-70 hover:opacity-100"
                  }`}
                  style={{
                    backgroundColor:
                      activeTab === tab.id ? "#32332D" : "transparent",
                    color: activeTab === tab.id ? "#FFFFFF" : "#32332D",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "services" && (
          <div>
            {!professionalProfile ||
            (professionalProfile.profile_status !== "approved" &&
              professionalProfile.profile_status !== "archived") ? (
              <div
                className="text-center py-8 sm:py-12 px-4 sm:px-8 rounded-xl"
                style={{
                  backgroundColor: "#FFF4E6",
                  border: "2px solid #F2742C",
                }}
              >
                <HeartHandshake
                  className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4"
                  style={{ color: "#F2742C" }}
                />
                <h3
                  className="text-lg sm:text-xl font-semibold font-['Poppins'] mb-1.5 sm:mb-2"
                  style={{ color: "#32332D" }}
                >
                  {!professionalProfile
                    ? "Submit Your Professional Profile First"
                    : "Profile Verification Required"}
                </h3>
                <p
                  className="text-xs sm:text-sm font-['Poppins'] mb-3 sm:mb-4 max-w-3xl mx-auto"
                  style={{ color: "#32332D" }}
                >
                  {!professionalProfile
                    ? "To manage your services and reach parents in the ParenZing community, please submit your professional profile for verification. Once approved, you'll be able to add, edit, and manage your services here."
                    : professionalProfile.profile_status === "rejected"
                      ? "Your profile has been rejected. Please submit your profile again after addressing the feedback."
                      : "Your profile is currently under review by our Professional Service Coordinators. This typically takes 3-5 business days. Once verified, you'll be able to add and manage your services here."}
                </p>
                {!professionalProfile && (
                  <button
                    onClick={() =>
                      navigate("/professional-profile-submission", {
                        state: { referrer: "/professional-dashboard" },
                      })
                    }
                    className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm shadow-lg hover:shadow-xl mx-auto"
                    style={{
                      backgroundColor: "#F2742C",
                      color: "white",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#E55A1F";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#F2742C";
                    }}
                  >
                    <span>Start Profile Submission</span>
                  </button>
                )}
                {professionalProfile &&
                  professionalProfile.profile_status === "rejected" && (
                    <button
                      onClick={() =>
                        navigate("/professional-profile-submission", {
                          state: {
                            existingProfile: professionalProfile,
                            referrer: "/professional-dashboard",
                          },
                        })
                      }
                      className="flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 font-medium font-['Poppins'] shadow-lg hover:shadow-xl mx-auto"
                      style={{
                        backgroundColor: "#D63B3B",
                        color: "white",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#C02A2A";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#D63B3B";
                      }}
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Submit Profile Again</span>
                    </button>
                  )}
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
                  <h2
                    className="text-lg sm:text-xl font-semibold font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    Your Services
                  </h2>
                  <button
                    onClick={() => openServiceModal()}
                    className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg font-['Poppins'] text-xs sm:text-sm"
                    style={{
                      backgroundColor: "#F2742C",
                      color: "#F5F5F5",
                      boxShadow: "0 4px 15px rgba(242, 116, 44, 0.3)",
                      fontFamily: "'Poppins', sans-serif",
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
                    <span>Add New Service</span>
                  </button>
                </div>

                {services.length === 0 ? (
                  <div
                    className="text-center py-12 rounded-2xl"
                    style={{
                      backgroundColor: "#F5F5F5",
                      border: "1px solid #AA855B",
                    }}
                  >
                    <HeartHandshake
                      className="w-16 h-16 mx-auto mb-4"
                      style={{ color: "#AA855B" }}
                    />
                    <p
                      className="text-lg font-semibold font-['Poppins'] mb-2"
                      style={{ color: "#32332D" }}
                    >
                      No services yet
                    </p>
                    <p
                      className="text-sm font-['Poppins']"
                      style={{ color: "#AA855B" }}
                    >
                      Add your first service to help parents discover what you
                      offer
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {services.map((service) => (
                      <div
                        key={service.service_id}
                        className="p-4 sm:p-6 rounded-xl transition-all duration-200 hover:shadow-lg"
                        style={{
                          backgroundColor: "#F5F5F5",
                          border: "1px solid #AA855B",
                        }}
                      >
                        <div className="flex justify-between items-start mb-3 sm:mb-4">
                          <h3
                            className="text-base sm:text-lg font-semibold font-['Poppins'] flex-1"
                            style={{ color: "#32332D" }}
                          >
                            {service.service_name}
                          </h3>
                          <div className="flex space-x-2 ml-2">
                            <button
                              onClick={() => openServiceModal(service)}
                              className="p-2 rounded-lg transition-colors"
                              style={{ color: "#326586" }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#E8F4F8";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                              }}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteServiceClick(service)}
                              className="p-2 rounded-lg transition-colors"
                              style={{ color: "#D63B3B" }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#FFEBEE";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {service.service_description && (
                          <p
                            className="text-xs sm:text-sm mb-3 sm:mb-4 font-['Poppins']"
                            style={{ color: "#64635E" }}
                          >
                            {service.service_description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                          {service.service_category && (
                            <Chip
                              label={
                                serviceCategoryOptions.find(
                                  (opt) =>
                                    opt.value === service.service_category,
                                )?.label || service.service_category
                              }
                              size="small"
                              sx={{
                                backgroundColor: "#E8F4F8",
                                color: "#326586",
                                fontFamily: "'Poppins', sans-serif",
                                fontSize: { xs: "10px", sm: "11px" },
                                height: { xs: "22px", sm: "24px" },
                              }}
                            />
                          )}
                          {service.service_type && (
                            <Chip
                              label={
                                serviceTypeOptions.find(
                                  (opt) => opt.value === service.service_type,
                                )?.label || service.service_type
                              }
                              size="small"
                              sx={{
                                backgroundColor: "#FDF2E8",
                                color: "#F2742C",
                                fontFamily: "'Poppins', sans-serif",
                                fontSize: { xs: "10px", sm: "11px" },
                                height: { xs: "22px", sm: "24px" },
                              }}
                            />
                          )}
                        </div>

                        {service.price_range && (
                          <p
                            className="text-xs sm:text-sm font-medium font-['Poppins']"
                            style={{ color: "#32332D" }}
                          >
                            Price: {service.price_range}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "promotional" && (
          <div>
            {!professionalProfile ||
            (professionalProfile.profile_status !== "approved" &&
              professionalProfile.profile_status !== "archived") ? (
              <div
                className="text-center py-8 sm:py-12 px-4 sm:px-8 rounded-xl"
                style={{
                  backgroundColor: "#FFF4E6",
                  border: "2px solid #F2742C",
                }}
              >
                <Megaphone
                  className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4"
                  style={{ color: "#F2742C" }}
                />
                <h3
                  className="text-lg sm:text-xl font-semibold font-['Poppins'] mb-1.5 sm:mb-2"
                  style={{ color: "#32332D" }}
                >
                  {!professionalProfile
                    ? "Submit Your Professional Profile First"
                    : "Profile Verification Required"}
                </h3>
                <p
                  className="text-xs sm:text-sm font-['Poppins'] mb-3 sm:mb-4 max-w-2xl mx-auto"
                  style={{ color: "#32332D" }}
                >
                  {!professionalProfile
                    ? "To submit promotional materials, please submit your professional profile for verification. Once approved, you'll be able to submit banners, events, and campaigns here."
                    : professionalProfile.profile_status === "rejected"
                      ? "Your profile has been rejected. Please submit your profile again after addressing the feedback."
                      : "Your profile is currently under review. Once verified, you'll be able to submit promotional materials here."}
                </p>
                {!professionalProfile && (
                  <button
                    onClick={() =>
                      navigate("/professional-profile-submission", {
                        state: { referrer: "/professional-dashboard" },
                      })
                    }
                    className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm shadow-lg hover:shadow-xl mx-auto"
                    style={{
                      backgroundColor: "#F2742C",
                      color: "white",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#E55A1F";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#F2742C";
                    }}
                  >
                    <span>Start Profile Submission</span>
                  </button>
                )}
                {professionalProfile &&
                  professionalProfile.profile_status === "rejected" && (
                    <button
                      onClick={() =>
                        navigate("/professional-profile-submission", {
                          state: {
                            existingProfile: professionalProfile,
                            referrer: "/professional-dashboard",
                          },
                        })
                      }
                      className="flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 font-medium font-['Poppins'] shadow-lg hover:shadow-xl mx-auto"
                      style={{
                        backgroundColor: "#D63B3B",
                        color: "white",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#C02A2A";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#D63B3B";
                      }}
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Submit Profile Again</span>
                    </button>
                  )}
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
                  <h2
                    className="text-lg sm:text-xl font-semibold font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    Promotional Materials
                  </h2>
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="relative">
                      <select
                        value={promoFilter}
                        onChange={(e) => setPromoFilter(e.target.value as any)}
                        onFocus={() => setPromoFilterFocused(true)}
                        onBlur={() => setPromoFilterFocused(false)}
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 pr-6 sm:pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
                        style={{
                          borderColor: "#AA855B",
                          backgroundColor: "#FAEFE2",
                          color: "#32332D",
                          fontFamily: "'Poppins', sans-serif",
                          appearance: "none",
                          WebkitAppearance: "none",
                          MozAppearance: "none",
                          backgroundImage: "none",
                        }}
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="upcoming">Upcoming</option>
                      </select>
                      {promoFilterFocused ? (
                        <ChevronUp
                          className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 pointer-events-none w-3.5 h-3.5 sm:w-4 sm:h-4"
                          style={{ color: "#AA855B" }}
                        />
                      ) : (
                        <ChevronDown
                          className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 pointer-events-none w-3.5 h-3.5 sm:w-4 sm:h-4"
                          style={{ color: "#AA855B" }}
                        />
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setPromoFilter("all");
                        fetchData();
                      }}
                      className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200 flex items-center justify-center"
                      style={{ backgroundColor: "#AA855B", color: "#F5F5F5" }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.backgroundColor = "#8B6F4A";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.backgroundColor = "#AA855B";
                      }}
                      title="Reset filter"
                    >
                      <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => openPromoModal()}
                      className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg font-['Poppins'] text-xs sm:text-sm"
                      style={{
                        backgroundColor: "#F2742C",
                        color: "#F5F5F5",
                        boxShadow: "0 4px 15px rgba(242, 116, 44, 0.3)",
                        fontFamily: "'Poppins', sans-serif",
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
                      <span>Submit Material</span>
                    </button>
                  </div>
                </div>

                {promotionalMaterials.length === 0 ? (
                  <div
                    className="text-center py-12 rounded-2xl"
                    style={{
                      backgroundColor: "#F5F5F5",
                      border: "1px solid #AA855B",
                    }}
                  >
                    <ImageIcon
                      className="w-16 h-16 mx-auto mb-4"
                      style={{ color: "#AA855B" }}
                    />
                    <p
                      className="text-lg font-semibold font-['Poppins'] mb-2"
                      style={{ color: "#32332D" }}
                    >
                      No promotional materials submitted yet
                    </p>
                    <p
                      className="text-sm font-['Poppins']"
                      style={{ color: "#AA855B" }}
                    >
                      Submit banners, events, or campaigns to promote your
                      services
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {promotionalMaterials
                      .filter((material) => {
                        if (promoFilter === "all") return true;
                        if (
                          promoFilter === "pending" &&
                          material.status === "pending"
                        )
                          return true;
                        if (
                          promoFilter === "approved" &&
                          material.status === "approved"
                        )
                          return true;
                        if (
                          promoFilter === "rejected" &&
                          material.status === "rejected"
                        )
                          return true;
                        if (material.status === "approved") {
                          const promotionStatus = getPromotionStatus(material);
                          if (
                            promoFilter === "active" &&
                            promotionStatus.status === "active"
                          )
                            return true;
                          if (
                            promoFilter === "expired" &&
                            promotionStatus.status === "expired"
                          )
                            return true;
                          if (
                            promoFilter === "upcoming" &&
                            promotionStatus.status === "upcoming"
                          )
                            return true;
                        }
                        return false;
                      })
                      .map((material) => {
                        const statusColors = getStatusColor(material.status);
                        const promotionStatus =
                          material.status === "approved"
                            ? getPromotionStatus(material)
                            : null;
                        const daysRemaining =
                          material.status === "approved"
                            ? calculateDaysRemaining(material.display_end_date)
                            : null;
                        // Allow edit for rejected materials (can fix and resubmit)
                        // Allow delete for rejected and pending materials (can cancel pending submission or delete rejected)
                        // Approved materials cannot be edited/deleted (read-only, backend blocks)
                        const canEdit = material.status === "rejected";
                        const canDelete =
                          material.status === "rejected" ||
                          material.status === "pending";

                        return (
                          <div
                            key={material.material_id}
                            className="bg-white rounded-xl shadow-sm overflow-hidden border flex flex-col h-full relative transition-all duration-200 hover:shadow-lg"
                            style={{ borderColor: "#AA855B" }}
                          >
                            {/* Image at the top - similar to Community cards */}
                            {material.file_path && (
                              <img
                                src={material.file_path}
                                alt={material.title}
                                className="w-full h-48 object-cover flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            )}

                            <div className="flex flex-col flex-grow px-6 pt-6 pb-6 justify-between">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h3
                                      className="text-lg font-semibold font-['Poppins'] mb-2"
                                      style={{ color: "#32332D" }}
                                    >
                                      {material.title}
                                    </h3>
                                  </div>
                                  <div className="flex items-center ml-2 flex-shrink-0">
                                    <Chip
                                      label={
                                        material.status
                                          .charAt(0)
                                          .toUpperCase() +
                                        material.status.slice(1)
                                      }
                                      size="small"
                                      sx={{
                                        backgroundColor: statusColors.bg,
                                        color: statusColors.text,
                                        border: `1px solid ${statusColors.border}`,
                                        fontFamily: "'Poppins', sans-serif",
                                        fontSize: "11px",
                                        height: "24px",
                                      }}
                                    />
                                  </div>
                                </div>

                                {material.description && (
                                  <p
                                    className="text-sm mb-3 font-['Poppins']"
                                    style={{ color: "#64635E" }}
                                  >
                                    {material.description}
                                  </p>
                                )}

                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex flex-wrap gap-2">
                                    <Chip
                                      label={
                                        material.content_type
                                          .charAt(0)
                                          .toUpperCase() +
                                        material.content_type.slice(1)
                                      }
                                      size="small"
                                      sx={{
                                        backgroundColor: "#E8F4F8",
                                        color: "#326586",
                                        fontFamily: "'Poppins', sans-serif",
                                        fontSize: "11px",
                                        height: "24px",
                                      }}
                                    />
                                    {promotionStatus && (
                                      <Chip
                                        label={promotionStatus.badge.label}
                                        size="small"
                                        sx={{
                                          backgroundColor:
                                            promotionStatus.badge.bg,
                                          color: promotionStatus.badge.text,
                                          fontFamily: "'Poppins', sans-serif",
                                          fontSize: "11px",
                                          height: "24px",
                                        }}
                                      />
                                    )}
                                  </div>
                                  {(canEdit || canDelete) && (
                                    <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                                      {canEdit && (
                                        <button
                                          onClick={() =>
                                            openPromoModal(material)
                                          }
                                          className="p-2 rounded-lg transition-colors"
                                          style={{ color: "#326586" }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                              "#E8F4F8";
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                              "transparent";
                                          }}
                                        >
                                          <Edit3 className="w-4 h-4" />
                                        </button>
                                      )}
                                      {canDelete && (
                                        <button
                                          onClick={() =>
                                            handleDeletePromoClick(material)
                                          }
                                          className="p-2 rounded-lg transition-colors"
                                          style={{ color: "#D63B3B" }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                              "#FFEBEE";
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                              "transparent";
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Duration display for approved materials */}
                                {material.status === "approved" &&
                                  material.display_start_date &&
                                  material.display_end_date && (
                                    <div
                                      className="mt-3 pt-3 border-t"
                                      style={{ borderColor: "#AA855B" }}
                                    >
                                      <p
                                        className="text-xs font-medium font-['Poppins'] mb-1"
                                        style={{ color: "#AA855B" }}
                                      >
                                        Display Duration
                                      </p>
                                      <p
                                        className="text-sm font-['Poppins'] mb-1"
                                        style={{ color: "#32332D" }}
                                      >
                                        {formatDate(
                                          material.display_start_date,
                                        )}{" "}
                                        -{" "}
                                        {formatDate(material.display_end_date)}
                                      </p>
                                      {daysRemaining !== null && (
                                        <p
                                          className="text-xs font-['Poppins']"
                                          style={{
                                            color:
                                              daysRemaining >= 0
                                                ? "#0F5648"
                                                : "#64635E",
                                          }}
                                        >
                                          {daysRemaining >= 0
                                            ? `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining`
                                            : "Expired"}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                {material.rejection_reason && (
                                  <div
                                    className="mt-3 pt-3 border-t"
                                    style={{ borderColor: "#AA855B" }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: "#D63B3B",
                                        fontFamily: "'Poppins', sans-serif",
                                        display: "block",
                                      }}
                                    >
                                      Rejection reason:{" "}
                                      {material.rejection_reason}
                                    </Typography>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Add/Edit Service Modal */}
        <Dialog
          open={serviceModalOpen}
          onClose={closeServiceModal}
          maxWidth="md"
          fullWidth
          disableScrollLock={true}
          PaperProps={{
            sx: {
              borderRadius: { xs: "0", sm: "16px", md: "20px" },
              boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              border: "1px solid #AA855B",
              margin: { xs: "0", sm: "24px" },
              width: { xs: "100%", sm: "auto" },
              maxWidth: { xs: "100%", sm: "600px", md: "700px" },
              height: { xs: "100vh", sm: "auto" },
              maxHeight: { xs: "100vh", sm: "90vh" },
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
              fontSize: { xs: "1rem", sm: "1.125rem", md: "1.25rem" },
              fontFamily: "'Poppins', sans-serif",
              borderBottom: "1px solid #AA855B",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: { xs: "12px 16px", sm: "16px 24px" },
              flexShrink: 0,
            }}
          >
            <div className="flex items-center">
              <HeartHandshake
                className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2"
                style={{ color: "#F2742C" }}
              />
              <span>{editingService ? "Edit" : "Add"} Service</span>
            </div>
            <button
              onClick={closeServiceModal}
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

          <DialogContent
            sx={{
              padding: { xs: "16px", sm: "20px", md: "24px" },
              backgroundColor: "#F5F5F5",
              flex: "1 1 auto",
              overflowY: "auto",
              minHeight: 0,
            }}
          >
            <div className="space-y-4 mt-4">
              <TextField
                label="Service Name"
                value={serviceForm.service_name}
                onChange={(e) =>
                  handleServiceChange("service_name", e.target.value)
                }
                fullWidth
                required
                error={!!serviceErrors.service_name}
                helperText={serviceErrors.service_name}
                sx={getTextFieldStyles(
                  !!serviceForm.service_name,
                  !!serviceErrors.service_name,
                )}
              />

              <TextField
                label="Service Description"
                value={serviceForm.service_description}
                onChange={(e) =>
                  handleServiceChange("service_description", e.target.value)
                }
                fullWidth
                multiline
                rows={4}
                required
                error={!!serviceErrors.service_description}
                helperText={serviceErrors.service_description}
                sx={{
                  ...getTextFieldStyles(
                    !!serviceForm.service_description,
                    !!serviceErrors.service_description,
                  ),
                  "& .MuiOutlinedInput-root": {
                    ...getTextFieldStyles(
                      !!serviceForm.service_description,
                      !!serviceErrors.service_description,
                    )["& .MuiOutlinedInput-root"],
                    alignItems: "flex-start",
                  },
                }}
              />

              <FormControl
                fullWidth
                required
                error={!!serviceErrors.service_category}
              >
                <InputLabel sx={getLabelStyles()}>Service Category</InputLabel>
                <Select
                  value={serviceForm.service_category}
                  label="Service Category"
                  onChange={(e) =>
                    handleServiceChange("service_category", e.target.value)
                  }
                  sx={getSelectStyles(
                    !!serviceForm.service_category,
                    !!serviceErrors.service_category,
                  )}
                >
                  {serviceCategoryOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {serviceErrors.service_category && (
                  <FormHelperText
                    sx={{
                      color: "#D63B3B",
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: "12px",
                    }}
                  >
                    {serviceErrors.service_category}
                  </FormHelperText>
                )}
              </FormControl>

              <FormControl
                fullWidth
                required
                error={!!serviceErrors.service_type}
              >
                <InputLabel sx={getLabelStyles()}>Service Type</InputLabel>
                <Select
                  value={serviceForm.service_type}
                  label="Service Type"
                  onChange={(e) =>
                    handleServiceChange("service_type", e.target.value)
                  }
                  sx={getSelectStyles(
                    !!serviceForm.service_type,
                    !!serviceErrors.service_type,
                  )}
                >
                  {serviceTypeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {serviceErrors.service_type && (
                  <FormHelperText
                    sx={{
                      color: "#D63B3B",
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: "12px",
                    }}
                  >
                    {serviceErrors.service_type}
                  </FormHelperText>
                )}
              </FormControl>

              <TextField
                label="Price Range"
                value={serviceForm.price_range}
                onChange={(e) =>
                  handleServiceChange("price_range", e.target.value)
                }
                fullWidth
                required
                placeholder="e.g., RM 100-200, Free, Contact for pricing"
                error={!!serviceErrors.price_range}
                helperText={serviceErrors.price_range}
                sx={getTextFieldStyles(
                  !!serviceForm.price_range,
                  !!serviceErrors.price_range,
                )}
              />
            </div>
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
              onClick={closeServiceModal}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm"
              style={{
                borderColor: "#AA855B",
                color: "#AA855B",
                backgroundColor: "transparent",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveService}
              disabled={savingService}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm shadow-lg hover:shadow-xl disabled:opacity-50"
              style={{ backgroundColor: "#0F5648" }}
            >
              {savingService ? (
                <CircularProgress size={18} sx={{ color: "white" }} />
              ) : editingService ? (
                "Update"
              ) : (
                "Create"
              )}
            </button>
          </DialogActions>
        </Dialog>

        {/* Promotional Materials Submission Modal */}
        <Dialog
          open={promoModalOpen}
          onClose={closePromoModal}
          maxWidth="md"
          fullWidth
          disableScrollLock={true}
          PaperProps={{
            sx: {
              borderRadius: { xs: "0", sm: "16px", md: "20px" },
              boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              border: "1px solid #AA855B",
              margin: { xs: "0", sm: "24px" },
              width: { xs: "100%", sm: "auto" },
              maxWidth: { xs: "100%", sm: "600px", md: "700px" },
              height: { xs: "100vh", sm: "auto" },
              maxHeight: { xs: "100vh", sm: "90vh" },
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
              fontSize: { xs: "1rem", sm: "1.125rem", md: "1.25rem" },
              fontFamily: "'Poppins', sans-serif",
              borderBottom: "1px solid #AA855B",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: { xs: "12px 16px", sm: "16px 24px" },
              flexShrink: 0,
            }}
          >
            <div className="flex items-center">
              <Megaphone
                className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2"
                style={{ color: "#F2742C" }}
              />
              <span>{editingMaterial ? "Edit" : "Submit"} Material</span>
            </div>
            <button
              onClick={closePromoModal}
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

          <DialogContent
            sx={{
              padding: { xs: "16px", sm: "20px", md: "24px" },
              backgroundColor: "#F5F5F5",
              flex: "1 1 auto",
              overflowY: "auto",
              minHeight: 0,
            }}
          >
            <div className="space-y-4 mt-4">
              <FormControl fullWidth required>
                <InputLabel sx={getLabelStyles()}>Content Type</InputLabel>
                <Select
                  value={promoForm.content_type}
                  label="Content Type"
                  onChange={(e) =>
                    handlePromoChange("content_type", e.target.value)
                  }
                  sx={getSelectStyles(!!promoForm.content_type)}
                >
                  <MenuItem value="banner">Banner</MenuItem>
                  <MenuItem value="event">Event</MenuItem>
                  <MenuItem value="campaign">Campaign</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Title"
                value={promoForm.title}
                onChange={(e) => handlePromoChange("title", e.target.value)}
                fullWidth
                required
                error={!!promoErrors.title}
                helperText={promoErrors.title}
                sx={getTextFieldStyles(!!promoForm.title, !!promoErrors.title)}
              />

              <TextField
                label="Description"
                value={promoForm.description}
                onChange={(e) =>
                  handlePromoChange("description", e.target.value)
                }
                fullWidth
                multiline
                rows={3}
                required
                error={!!promoErrors.description}
                helperText={promoErrors.description}
                sx={{
                  ...getTextFieldStyles(
                    !!promoForm.description,
                    !!promoErrors.description,
                  ),
                  "& .MuiOutlinedInput-root": {
                    ...getTextFieldStyles(
                      !!promoForm.description,
                      !!promoErrors.description,
                    )["& .MuiOutlinedInput-root"],
                    alignItems: "flex-start",
                  },
                }}
              />

              {/* Drag and Drop Image Upload */}
              <div>
                <label
                  className="block text-sm font-medium mb-2 font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  Image
                </label>
                {selectedImagePreview ||
                (editingMaterial?.file_path && !selectedImage) ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <img
                        src={selectedImagePreview || editingMaterial?.file_path}
                        alt="Promotional material preview"
                        className="w-full h-48 object-cover rounded-lg border"
                        style={{ borderColor: "#AA855B" }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImage(null);
                          setSelectedImagePreview("");
                          // Clear file_path if editing
                          if (editingMaterial) {
                            handlePromoChange("file_path", "");
                          }
                          // Reset file input
                          const fileInput = document.getElementById(
                            "promo-image-upload",
                          ) as HTMLInputElement;
                          if (fileInput) {
                            fileInput.value = "";
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
                    style={{
                      borderColor: promoErrors.image
                        ? "#D63B3B"
                        : isDragOver
                          ? "#F2742C"
                          : "#AA855B",
                      backgroundColor: isDragOver ? "#FFF4E6" : "transparent",
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragOver(true);
                      e.currentTarget.style.backgroundColor = "#FFF4E6";
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragOver(false);
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="promo-image-upload"
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
                          PNG, JPG (max 10MB)
                        </p>
                      </div>
                      <label
                        htmlFor="promo-image-upload"
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
                {promoErrors.image && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#D63B3B",
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: "12px",
                      display: "block",
                      mt: 1,
                      ml: 1,
                    }}
                  >
                    {promoErrors.image}
                  </Typography>
                )}
              </div>

              {/* Display fields - only show when editing approved materials */}
              {editingMaterial && editingMaterial.status === "approved" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <TextField
                      label="Display Start Date"
                      type="date"
                      value={promoForm.display_start_date}
                      onChange={(e) =>
                        handlePromoChange("display_start_date", e.target.value)
                      }
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      helperText="Set by coordinator when approving"
                      disabled
                      sx={getTextFieldStyles(!!promoForm.display_start_date)}
                    />

                    <TextField
                      label="Display End Date"
                      type="date"
                      value={promoForm.display_end_date}
                      onChange={(e) =>
                        handlePromoChange("display_end_date", e.target.value)
                      }
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      helperText="Set by coordinator when approving"
                      disabled
                      sx={getTextFieldStyles(!!promoForm.display_end_date)}
                    />
                  </div>

                  <TextField
                    label="Display Sequence"
                    type="number"
                    value={promoForm.display_sequence || ""}
                    onChange={(e) =>
                      handlePromoChange(
                        "display_sequence",
                        e.target.value ? parseInt(e.target.value) : null,
                      )
                    }
                    fullWidth
                    helperText="Set by coordinator when approving. Lower number = higher priority"
                    disabled
                    sx={getTextFieldStyles(!!promoForm.display_sequence)}
                  />
                </>
              )}
            </div>
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
              onClick={closePromoModal}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm"
              style={{
                borderColor: "#AA855B",
                color: "#AA855B",
                backgroundColor: "transparent",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSavePromo}
              disabled={saving || uploadingImage}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm shadow-lg hover:shadow-xl disabled:opacity-50"
              style={{ backgroundColor: "#0F5648" }}
            >
              {saving || uploadingImage ? (
                <CircularProgress size={18} sx={{ color: "white" }} />
              ) : editingMaterial ? (
                "Update"
              ) : (
                "Submit"
              )}
            </button>
          </DialogActions>
        </Dialog>

        {/* Delete Service Confirmation Modal */}
        {showDeleteServiceModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDeleteServiceModal(null);
              }
            }}
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3
                  className="text-lg font-semibold font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  Delete Service
                </h3>
                <button
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowDeleteServiceModal(null)}
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
                      {showDeleteServiceModal.service_name}
                    </h4>
                    {showDeleteServiceModal.service_description && (
                      <p
                        className="text-xs font-['Poppins'] line-clamp-2"
                        style={{ color: "#64635E" }}
                      >
                        {showDeleteServiceModal.service_description}
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
                    Deleting this service will permanently remove it from your
                    profile. This action cannot be undone.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="confirm-delete-service"
                    className="w-4 h-4 rounded"
                    style={{ accentColor: "#EF4444" }}
                  />
                  <label
                    htmlFor="confirm-delete-service"
                    className="text-sm font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    I understand this action cannot be undone
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-lg font-medium border transition-all duration-200 font-['Poppins']"
                  style={{ borderColor: "#AA855B", color: "#AA855B" }}
                  onClick={() => setShowDeleteServiceModal(null)}
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
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-200 font-['Poppins']"
                  style={{ backgroundColor: "#EF4444", color: "#FFFFFF" }}
                  onClick={confirmDeleteService}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#DC2626";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#EF4444";
                  }}
                >
                  Delete Service
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Promotional Material Confirmation Modal */}
        {showDeletePromoModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDeletePromoModal(null);
              }
            }}
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3
                  className="text-lg font-semibold font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  Delete Promotional Material
                </h3>
                <button
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowDeletePromoModal(null)}
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
                      {showDeletePromoModal.title}
                    </h4>
                    {showDeletePromoModal.description && (
                      <p
                        className="text-xs font-['Poppins'] line-clamp-2"
                        style={{ color: "#64635E" }}
                      >
                        {showDeletePromoModal.description}
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
                    Deleting this promotional material will permanently remove
                    it. This action cannot be undone.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="confirm-delete-promo"
                    className="w-4 h-4 rounded"
                    style={{ accentColor: "#EF4444" }}
                  />
                  <label
                    htmlFor="confirm-delete-promo"
                    className="text-sm font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    I understand this action cannot be undone
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-lg font-medium border transition-all duration-200 font-['Poppins']"
                  style={{ borderColor: "#AA855B", color: "#AA855B" }}
                  onClick={() => setShowDeletePromoModal(null)}
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
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-200 font-['Poppins']"
                  style={{ backgroundColor: "#EF4444", color: "#FFFFFF" }}
                  onClick={confirmDeletePromo}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#DC2626";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#EF4444";
                  }}
                >
                  Delete Material
                </button>
              </div>
            </div>
          </div>
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

export default ProfessionalDashboard;
