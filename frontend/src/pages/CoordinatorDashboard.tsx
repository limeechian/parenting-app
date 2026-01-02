// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: CoordinatorDashboard.tsx
// Description: To display the main dashboard for coordinators to manage professional profile and promotional material approvals
// First Written on: Monday, 27-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state and lifecycle management
import React, { useState, useEffect } from "react";
// Import React Router hooks for URL parameters
import { useSearchParams } from "react-router-dom";
// Import lucide-react icons for UI elements
import {
  Clock,
  CheckCircle,
  Users,
  User,
  Megaphone,
  Mail,
  Phone,
  MapPin,
  FileText,
  Search,
  Edit3,
  Trash2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Globe,
  Shield,
  RefreshCw,
  HeartHandshake,
  Filter,
} from "lucide-react";
// Import Material-UI components for UI elements
import {
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Typography,
  Autocomplete,
} from "@mui/material";
// Import toast notification components
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Import Poppins font weights for consistent typography
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
// Import API functions for coordinator operations
import {
  getCoordinatorStats,
  getCoordinatorApplications,
  getCoordinatorApplication,
  approveApplication,
  rejectApplication,
  getCoordinatorDirectory,
  getCoordinatorDirectoryProfile,
  updateCoordinatorDirectoryProfile,
  getCoordinatorPromotions,
  approvePromotion,
  rejectPromotion,
  updatePromotionDisplaySettings,
  archiveProfessionalProfile,
  unarchiveProfessionalProfile,
} from "../services/api";
// Import specialization tags constant
import { getSpecializationTags } from "../constants/specializationTags";

/**
 * Type definitions for coordinator dashboard
 */

/**
 * Active tab type definition
 */
type ActiveTab = "overview" | "applications" | "directory" | "promotions";

/**
 * Application status filter type
 */
type ApplicationStatus =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "archived";

/**
 * Promotion status filter type
 */
type PromotionStatus =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "active"
  | "expired"
  | "upcoming";

/**
 * CoordinatorStats interface
 * Defines the structure of coordinator dashboard statistics
 */
interface CoordinatorStats {
  pendingApplications: number;
  verifiedProfessionals: number;
  totalApplications: number;
  pendingPromotions: number;
}

/**
 * ProfessionalApplication interface
 * Defines the structure of a professional profile application
 */
interface ProfessionalApplication {
  professional_id: number;
  user_id: number;
  business_name: string;
  professional_type: string;
  years_experience?: number;
  qualifications: string;
  certifications?: string;
  specializations: string[]; // Array of specialization tags
  address_line?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  google_maps_url?: string;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  profile_image_url?: string;
  bio?: string;
  target_developmental_stages?: string[];
  languages?: string[];
  availability?: string[];
  profile_status: "pending" | "approved" | "rejected" | "archived";
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  documents?: Array<{
    document_id: number;
    document_type: string;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size?: number;
    uploaded_at: string;
  }>;
  services?: Array<{
    service_id: number;
    service_name: string;
    service_description?: string;
    service_category?: string;
    service_type?: string;
    price_range?: string;
  }>;
}

/**
 * ProfessionalDirectory interface
 * Defines the structure of a professional in the directory
 */
interface ProfessionalDirectory {
  professional_id: number;
  business_name: string;
  professional_type?: string;
  specializations: string[]; // Array of specialization tags
  target_developmental_stages?: string[];
  languages?: string[];
  availability?: string[];
  address_line?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  google_maps_url?: string;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  profile_image_url?: string;
  profile_status: "pending" | "approved" | "rejected" | "archived";
  services?: Array<{
    service_id: number;
    service_name: string;
    service_description?: string;
    service_category?: string;
    service_type?: string;
    price_range?: string;
  }>;
}

interface PromotionalMaterial {
  material_id: number;
  profile_id: number;
  content_type: "banner" | "event" | "campaign";
  title: string;
  description?: string;
  file_path?: string;
  status: "pending" | "approved" | "rejected";
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  display_start_date?: string;
  display_end_date?: string;
  display_sequence?: number;
  created_at: string;
  business_name?: string;
}

const CoordinatorDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam &&
      ["overview", "applications", "directory", "promotions"].includes(tabParam)
    ) {
      return tabParam as ActiveTab;
    }
    return "overview";
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CoordinatorStats>({
    pendingApplications: 0,
    verifiedProfessionals: 0,
    totalApplications: 0,
    pendingPromotions: 0,
  });
  const [applications, setApplications] = useState<ProfessionalApplication[]>(
    [],
  );
  const [directory, setDirectory] = useState<ProfessionalDirectory[]>([]);
  const [promotions, setPromotions] = useState<PromotionalMaterial[]>([]);
  const [recentActivities, setRecentActivities] = useState<
    Array<{
      type: "application" | "promotion";
      data: ProfessionalApplication | PromotionalMaterial;
      timestamp: string;
    }>
  >([]);
  const [selectedStatus, setSelectedStatus] =
    useState<ApplicationStatus>("all");
  const [promotionStatus, setPromotionStatus] =
    useState<PromotionStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [applicationSearchTerm, setApplicationSearchTerm] = useState("");
  const [statusFilterFocused, setStatusFilterFocused] =
    useState<boolean>(false);
  const [promotionStatusFilterFocused, setPromotionStatusFilterFocused] =
    useState<boolean>(false);

  // Modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showProfileDetailModal, setShowProfileDetailModal] = useState(false);
  const [showPromotionApproveModal, setShowPromotionApproveModal] =
    useState(false);
  const [showPromotionRejectModal, setShowPromotionRejectModal] =
    useState(false);
  const [showPromotionEditModal, setShowPromotionEditModal] = useState(false);
  const [showEditSpecializationsModal, setShowEditSpecializationsModal] =
    useState(false);

  const [selectedApplication, setSelectedApplication] =
    useState<ProfessionalApplication | null>(null);
  const [selectedPromotion, setSelectedPromotion] =
    useState<PromotionalMaterial | null>(null);
  const [selectedProfile, setSelectedProfile] =
    useState<ProfessionalDirectory | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [newSpecializations, setNewSpecializations] = useState<string[]>([]);

  // Archive confirmation modal
  const [showArchiveModal, setShowArchiveModal] =
    useState<ProfessionalDirectory | null>(null);

  // Promotion approval/edit fields
  const [displayStartDate, setDisplayStartDate] = useState("");
  const [displayEndDate, setDisplayEndDate] = useState("");
  const [displaySequence, setDisplaySequence] = useState<number>(0);

  const [processing, setProcessing] = useState(false);
  const [modalImageError, setModalImageError] = useState(false);

  // Helper functions for text formatting (matching ProfessionalProfile.tsx)
  const parseTextToArray = (text: string): string[] => {
    if (!text) return [];
    // Replace escaped newlines with actual newlines, then split
    const normalizedText = text.replace(/\\n/g, "\n");
    // First try splitting by newlines, then by commas if no newlines found
    const hasNewlines = normalizedText.includes("\n");
    const separator = hasNewlines ? "\n" : ",";
    return normalizedText
      .split(separator)
      .map((s) => s.trim())
      .filter((s) => s);
  };

  // Helper function to render text as bullet points
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

  // Format professional type for display (matching ProfessionalProfile.tsx)
  const formatProfessionalType = (type: string) => {
    if (!type) return "Not provided";
    return type
      .split("_")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  // Handle tab changes from URL query params and force reload
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const refreshParam = searchParams.get("refresh"); // Used to force reload when navigating via notification

    if (
      tabParam &&
      ["overview", "applications", "directory", "promotions"].includes(tabParam)
    ) {
      const newTab = tabParam as ActiveTab;
      if (newTab !== activeTab) {
        setActiveTab(newTab);
      } else if (refreshParam) {
        // Same tab but refresh param present (e.g., from notification click), force reload
        loadData();
        // Remove refresh param from URL to clean it up
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete("refresh");
        setSearchParams(newSearchParams, { replace: true });
      }
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload data when tab, status filter, or promotion status filter changes
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedStatus, promotionStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "overview") {
        const statsData = await getCoordinatorStats();
        setStats(statsData);

        // Load pending applications and promotions for Recent Activities
        const [appsData, promoData] = await Promise.all([
          getCoordinatorApplications({ status: "pending", limit: 5 }),
          getCoordinatorPromotions({ status: "pending", limit: 5 }),
        ]);

        const apps = appsData.applications || appsData || [];
        const promos = promoData.materials || promoData || [];

        // Combine and sort by timestamp (newest first)
        const activities = [
          ...apps.map((app: ProfessionalApplication) => ({
            type: "application" as const,
            data: app,
            timestamp: app.created_at,
          })),
          ...promos.map((promo: PromotionalMaterial) => ({
            type: "promotion" as const,
            data: promo,
            timestamp: promo.created_at,
          })),
        ].sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );

        setRecentActivities(activities.slice(0, 10));
        setApplications(apps);
      } else if (activeTab === "applications") {
        const appsData = await getCoordinatorApplications({
          status: selectedStatus === "all" ? undefined : selectedStatus,
        });
        const apps = appsData.applications || appsData || [];
        // Fetch documents for each application
        const appsWithDocuments = await Promise.all(
          apps.map(async (app: ProfessionalApplication) => {
            try {
              const fullData = await getCoordinatorApplication(
                app.professional_id,
              );
              return fullData.application || fullData;
            } catch (error) {
              // If fetching documents fails, return app without documents
              return app;
            }
          }),
        );
        setApplications(appsWithDocuments);
      } else if (activeTab === "directory") {
        const dirData = await getCoordinatorDirectory({
          search: searchQuery || undefined,
          status: "approved",
        });
        setDirectory(dirData.professionals || dirData || []);
      } else if (activeTab === "promotions") {
        const promoData = await getCoordinatorPromotions({
          status: promotionStatus === "all" ? undefined : promotionStatus,
        });
        setPromotions(promoData.materials || promoData || []);
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveApplication = async () => {
    if (!selectedApplication) return;
    setProcessing(true);
    try {
      await approveApplication(selectedApplication.professional_id);
      toast.success("Application approved successfully");
      setShowApproveModal(false);
      setSelectedApplication(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve application");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectApplication = async () => {
    if (!selectedApplication || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setProcessing(true);
    try {
      await rejectApplication(
        selectedApplication.professional_id,
        rejectionReason,
      );
      toast.success("Application rejected");
      setShowRejectModal(false);
      setRejectionReason("");
      setSelectedApplication(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject application");
    } finally {
      setProcessing(false);
    }
  };

  const handleViewProfile = async (profile: ProfessionalDirectory) => {
    try {
      const fullData = await getCoordinatorDirectoryProfile(
        profile.professional_id,
      );
      setSelectedProfile(fullData.profile || fullData);
      setModalImageError(false); // Reset image error when loading new profile
      setShowProfileDetailModal(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to load profile");
    }
  };

  const handleEditSpecializations = async () => {
    if (!selectedProfile || newSpecializations.length === 0) {
      toast.error("Please select at least one specialization");
      return;
    }
    setProcessing(true);
    try {
      await updateCoordinatorDirectoryProfile(selectedProfile.professional_id, {
        specializations: newSpecializations,
      });
      toast.success("Specializations updated");
      setShowEditSpecializationsModal(false);
      setNewSpecializations([]);
      setSelectedProfile(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update specializations");
    } finally {
      setProcessing(false);
    }
  };

  const handleApprovePromotion = async () => {
    if (
      !selectedPromotion ||
      !displayStartDate ||
      !displayEndDate ||
      !displaySequence
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    setProcessing(true);
    try {
      await approvePromotion(selectedPromotion.material_id, {
        display_start_date: displayStartDate,
        display_end_date: displayEndDate,
        display_sequence: displaySequence,
      });
      toast.success("Promotion approved");
      setShowPromotionApproveModal(false);
      setSelectedPromotion(null);
      setDisplayStartDate("");
      setDisplayEndDate("");
      setDisplaySequence(0);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve promotion");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectPromotion = async () => {
    if (!selectedPromotion || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setProcessing(true);
    try {
      await rejectPromotion(selectedPromotion.material_id, rejectionReason);
      toast.success("Promotion rejected");
      setShowPromotionRejectModal(false);
      setRejectionReason("");
      setSelectedPromotion(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject promotion");
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdatePromotionDisplay = async () => {
    if (!selectedPromotion) return;
    setProcessing(true);
    try {
      await updatePromotionDisplaySettings(selectedPromotion.material_id, {
        display_start_date: displayStartDate || undefined,
        display_end_date: displayEndDate || undefined,
        display_sequence: displaySequence || undefined,
      });
      toast.success("Display settings updated");
      setShowPromotionEditModal(false);
      setSelectedPromotion(null);
      setDisplayStartDate("");
      setDisplayEndDate("");
      setDisplaySequence(0);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update display settings");
    } finally {
      setProcessing(false);
    }
  };

  const handleArchiveProfileClick = (profile: ProfessionalDirectory) => {
    setShowArchiveModal(profile);
  };

  const confirmArchiveProfile = async () => {
    if (!showArchiveModal) return;

    const checkbox = document.getElementById(
      "confirm-archive-profile",
    ) as HTMLInputElement;
    if (!checkbox?.checked) {
      toast.error("Please confirm that you understand this action.");
      return;
    }

    setProcessing(true);
    try {
      await archiveProfessionalProfile(showArchiveModal.professional_id);
      toast.success("Profile archived successfully");
      setShowArchiveModal(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to archive profile");
    } finally {
      setProcessing(false);
    }
  };

  const handleUnarchiveProfile = async (profileId: number) => {
    setProcessing(true);
    try {
      await unarchiveProfessionalProfile(profileId);
      toast.success("Profile unarchived successfully");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to unarchive profile");
    } finally {
      setProcessing(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60)
      return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
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

  // Helper function to calculate duration in days
  const calculateDurationDays = (
    startDate: string | null | undefined,
    endDate: string | null | undefined,
  ): number | null => {
    if (!startDate || !endDate) return null;
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diff = end.getTime() - start.getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    } catch {
      return null;
    }
  };

  // Helper function to get promotion status (Active/Expired/Upcoming)
  const getPromotionStatus = (
    promo: PromotionalMaterial,
  ): {
    status: "active" | "expired" | "upcoming" | null;
    badge: { bg: string; text: string; label: string };
  } => {
    if (!promo.display_start_date || !promo.display_end_date) {
      return {
        status: null,
        badge: { bg: "#F5F5F5", text: "#AA855B", label: "No dates set" },
      };
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(promo.display_start_date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(promo.display_end_date);
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

  const renderOverviewTab = () => {
    return (
      <div className="space-y-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div
            className="cursor-pointer rounded-2xl shadow-xl p-4 sm:p-5 transition-all duration-300 hover:shadow-2xl hover:scale-105"
            style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
            onClick={() => {
              setActiveTab("applications");
              setSelectedStatus("pending");
            }}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-md"
                style={{ backgroundColor: "#F2742C" }}
              >
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <p
              className="text-xl sm:text-2xl font-bold font-['Poppins'] mb-0.5 sm:mb-1"
              style={{ color: "#32332D" }}
            >
              {stats.pendingApplications}
            </p>
            <p
              className="text-xs sm:text-sm font-['Poppins']"
              style={{ color: "#AA855B" }}
            >
              Pending Applications
            </p>
          </div>

          <div
            className="cursor-pointer rounded-2xl shadow-xl p-4 sm:p-5 transition-all duration-300 hover:shadow-2xl hover:scale-105"
            onClick={() => setActiveTab("directory")}
            style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-md"
                style={{ backgroundColor: "#0F5648" }}
              >
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <p
              className="text-xl sm:text-2xl font-bold font-['Poppins'] mb-0.5 sm:mb-1"
              style={{ color: "#32332D" }}
            >
              {stats.verifiedProfessionals}
            </p>
            <p
              className="text-xs sm:text-sm font-['Poppins']"
              style={{ color: "#AA855B" }}
            >
              Verified Professionals
            </p>
          </div>

          <div
            className="rounded-2xl shadow-xl p-4 sm:p-5 transition-all duration-300 hover:shadow-2xl hover:scale-105"
            style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-md"
                style={{ backgroundColor: "#326586" }}
              >
                <HeartHandshake className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <p
              className="text-xl sm:text-2xl font-bold font-['Poppins'] mb-0.5 sm:mb-1"
              style={{ color: "#32332D" }}
            >
              {stats.totalApplications}
            </p>
            <p
              className="text-xs sm:text-sm font-['Poppins']"
              style={{ color: "#AA855B" }}
            >
              Total Applications
            </p>
          </div>

          <div
            className="cursor-pointer rounded-2xl shadow-xl p-4 sm:p-5 transition-all duration-300 hover:shadow-2xl hover:scale-105"
            onClick={() => {
              setActiveTab("promotions");
              setPromotionStatus("pending");
            }}
            style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-md"
                style={{ backgroundColor: "#8B4C9F" }}
              >
                <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <p
              className="text-xl sm:text-2xl font-bold font-['Poppins'] mb-0.5 sm:mb-1"
              style={{ color: "#32332D" }}
            >
              {stats.pendingPromotions}
            </p>
            <p
              className="text-xs sm:text-sm font-['Poppins']"
              style={{ color: "#AA855B" }}
            >
              Pending Promotions
            </p>
          </div>
        </div>

        {/* Recent Activities - Full Width */}
        <div
          className="rounded-2xl shadow-xl p-4 sm:p-6 transition-all duration-300 hover:shadow-2xl"
          style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
            <h2
              className="text-lg sm:text-xl font-bold font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              Recent Activities
            </h2>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setActiveTab("applications");
                }}
                className="text-xs sm:text-sm font-medium font-['Poppins'] flex items-center justify-center sm:justify-start space-x-1 w-full sm:w-auto"
                style={{ color: "#326586" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#1A4A6B";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#326586";
                }}
              >
                <span>View All Applications</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setActiveTab("promotions");
                }}
                className="text-xs sm:text-sm font-medium font-['Poppins'] flex items-center justify-center sm:justify-start space-x-1 w-full sm:w-auto"
                style={{ color: "#326586" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#1A4A6B";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#326586";
                }}
              >
                <span>View All Promotions</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-8">
              <div
                className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
                style={{ borderColor: "#326586" }}
              ></div>
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="py-4">
              <p
                className="text-sm text-center font-['Poppins']"
                style={{ color: "#AA855B" }}
              >
                No recent activities
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivities.map((activity, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border transition-all hover:shadow-md"
                  style={{ backgroundColor: "#FAEFE2", borderColor: "#AA855B" }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {activity.type === "application" ? (
                        <FileText
                          className="w-5 h-5 mt-1"
                          style={{ color: "#326586" }}
                        />
                      ) : (
                        <Megaphone
                          className="w-5 h-5 mt-1"
                          style={{ color: "#8B4C9F" }}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4
                            className="text-base font-semibold font-['Poppins']"
                            style={{ color: "#32332D" }}
                          >
                            {activity.type === "application"
                              ? `New Application: ${(activity.data as ProfessionalApplication).business_name}`
                              : `New Promotion: ${(activity.data as PromotionalMaterial).title}`}
                          </h4>
                        </div>
                        {activity.type === "application" && (
                          <>
                            <p
                              className="text-xs font-['Poppins']"
                              style={{ color: "#AA855B" }}
                            >
                              {formatProfessionalType(
                                (activity.data as ProfessionalApplication)
                                  .professional_type || "",
                              )}
                              {(activity.data as ProfessionalApplication)
                                .years_experience
                                ? ` • ${(activity.data as ProfessionalApplication).years_experience} years experience`
                                : ""}
                            </p>
                            <p
                              className="text-xs font-['Poppins']"
                              style={{ color: "#AA855B" }}
                            >
                              {formatTimeAgo(activity.timestamp)}
                            </p>
                            <p
                              className="text-xs font-['Poppins']"
                              style={{ color: "#AA855B" }}
                            >
                              {(activity.data as ProfessionalApplication)
                                .city &&
                              (activity.data as ProfessionalApplication).state
                                ? `${(activity.data as ProfessionalApplication).city}, ${(activity.data as ProfessionalApplication).state}`
                                : "Location not specified"}
                            </p>
                          </>
                        )}
                        {activity.type === "promotion" && (
                          <p
                            className="text-xs font-['Poppins']"
                            style={{ color: "#AA855B" }}
                          >
                            {formatTimeAgo(activity.timestamp)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2 ml-4">
                      {(() => {
                        const status =
                          (activity.data as any).profile_status ||
                          (activity.data as any).status;
                        const statusStyles = {
                          pending: { bg: "#FFF4E6", text: "#F2742C" },
                          approved: { bg: "#E8F5E9", text: "#0F5648" },
                          rejected: { bg: "#FFEBEE", text: "#D63B3B" },
                          archived: { bg: "#F5F5F5", text: "#AA855B" },
                        };
                        const style =
                          statusStyles[status as keyof typeof statusStyles] ||
                          statusStyles.pending;
                        return (
                          <span
                            className="px-2 py-1 text-xs font-medium rounded-full font-['Poppins'] capitalize"
                            style={{
                              backgroundColor: style.bg,
                              color: style.text,
                            }}
                          >
                            {status}
                          </span>
                        );
                      })()}
                      <div className="flex items-center space-x-2">
                        {activity.type === "application" ? (
                          <>
                            <button
                              onClick={() => {
                                setSelectedApplication(
                                  activity.data as ProfessionalApplication,
                                );
                                setShowApproveModal(true);
                              }}
                              className="px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200"
                              style={{
                                backgroundColor: "#0F5648",
                                color: "white",
                                fontFamily: "'Poppins', sans-serif",
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
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedApplication(
                                  activity.data as ProfessionalApplication,
                                );
                                setShowRejectModal(true);
                              }}
                              className="px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200"
                              style={{
                                backgroundColor: "#D63B3B",
                                color: "white",
                                fontFamily: "'Poppins', sans-serif",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#C02A2A";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#D63B3B";
                              }}
                            >
                              Reject
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const fullData =
                                    await getCoordinatorApplication(
                                      (activity.data as ProfessionalApplication)
                                        .professional_id,
                                    );
                                  setSelectedApplication(
                                    fullData.application || fullData,
                                  );
                                  setShowProfileDetailModal(true);
                                } catch (error: any) {
                                  toast.error(
                                    error.message ||
                                      "Failed to load application details",
                                  );
                                }
                              }}
                              className="px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200"
                              style={{
                                color: "#326586",
                                fontFamily: "'Poppins', sans-serif",
                                backgroundColor: "transparent",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#E8F4F8";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                              }}
                            >
                              View Details
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setSelectedPromotion(
                                  activity.data as PromotionalMaterial,
                                );
                                setDisplayStartDate("");
                                setDisplayEndDate("");
                                setDisplaySequence(0);
                                setShowPromotionApproveModal(true);
                              }}
                              className="px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200"
                              style={{
                                backgroundColor: "#0F5648",
                                color: "white",
                                fontFamily: "'Poppins', sans-serif",
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
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPromotion(
                                  activity.data as PromotionalMaterial,
                                );
                                setRejectionReason("");
                                setShowPromotionRejectModal(true);
                              }}
                              className="px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200"
                              style={{
                                backgroundColor: "#D63B3B",
                                color: "white",
                                fontFamily: "'Poppins', sans-serif",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#C02A2A";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#D63B3B";
                              }}
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPromotion(
                                  activity.data as PromotionalMaterial,
                                );
                                setShowPromotionEditModal(true);
                              }}
                              className="px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200"
                              style={{
                                color: "#326586",
                                fontFamily: "'Poppins', sans-serif",
                                backgroundColor: "transparent",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#E8F4F8";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                              }}
                            >
                              View Details
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleResetApplicationFilters = () => {
    setApplicationSearchTerm("");
    setSelectedStatus("all");
    loadData();
  };

  const handleResetPromotionFilters = () => {
    setPromotionStatus("all");
    loadData();
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      !applicationSearchTerm ||
      app.business_name
        .toLowerCase()
        .includes(applicationSearchTerm.toLowerCase()) ||
      app.contact_email
        ?.toLowerCase()
        .includes(applicationSearchTerm.toLowerCase()) ||
      app.city?.toLowerCase().includes(applicationSearchTerm.toLowerCase()) ||
      app.state?.toLowerCase().includes(applicationSearchTerm.toLowerCase());

    const matchesStatus =
      selectedStatus === "all" || app.profile_status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const renderApplicationsTab = () => {
    return (
      <div className="space-y-6">
        {/* Applications Header */}
        <div
          className="rounded-2xl shadow-xl p-4 sm:p-6 transition-all duration-300 hover:shadow-2xl"
          style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
        >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2
              className="text-lg sm:text-xl font-bold font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              Professional Applications
            </h2>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search
                className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5"
                style={{ color: "#AA855B" }}
              />
              <input
                type="search"
                placeholder="Search applications..."
                value={applicationSearchTerm}
                onChange={(e) => setApplicationSearchTerm(e.target.value)}
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
                style={{
                  borderColor: "#AA855B",
                  backgroundColor: "#FAEFE2",
                  color: "#32332D",
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

            {/* Filters Row */}
            <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-nowrap">
              <Filter
                className="w-4 h-4 sm:w-5 sm:h-5"
                style={{ color: "#AA855B" }}
              />

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) =>
                    setSelectedStatus(e.target.value as ApplicationStatus)
                  }
                  onFocus={() => setStatusFilterFocused(true)}
                  onBlur={() => setStatusFilterFocused(false)}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 pr-7 sm:pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
                  style={{
                    borderColor: "#AA855B",
                    backgroundColor: "#FAEFE2",
                    color: "#32332D",
                    fontFamily: "inherit",
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
                  <option value="archived">Archived</option>
                </select>
                {statusFilterFocused ? (
                  <ChevronUp
                    className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                    style={{ color: "#AA855B" }}
                    size={14}
                  />
                ) : (
                  <ChevronDown
                    className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                    style={{ color: "#AA855B" }}
                    size={14}
                  />
                )}
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleResetApplicationFilters}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200 flex items-center justify-center"
                style={{ backgroundColor: "#AA855B", color: "#F5F5F5" }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = "#8B6F4A";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = "#AA855B";
                }}
                title="Reset search and filters"
              >
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* Applications List */}
          {loading ? (
            <div className="text-center py-12">
              <div
                className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
                style={{ borderColor: "#326586" }}
              ></div>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div
              className="text-center py-12 rounded-2xl"
              style={{
                backgroundColor: "#F5F5F5",
                border: "1px solid #AA855B",
              }}
            >
              <FileText
                className="w-16 h-16 mx-auto mb-4"
                style={{ color: "#AA855B" }}
              />
              <h3
                className="text-lg font-medium mb-2 font-['Poppins']"
                style={{ color: "#32332D" }}
              >
                No applications found
              </h3>
              <p
                className="text-sm mb-4 font-['Poppins']"
                style={{ color: "#AA855B" }}
              >
                {applicationSearchTerm || selectedStatus !== "all"
                  ? "Try adjusting your filters"
                  : "No applications available"}
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredApplications.map((app) => {
                return (
                  <div
                    key={app.professional_id}
                    className="p-4 sm:p-6 rounded-xl transition-all duration-300 hover:shadow-lg cursor-pointer"
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #AA855B",
                    }}
                    onClick={async () => {
                      try {
                        const fullData = await getCoordinatorApplication(
                          app.professional_id,
                        );
                        setSelectedApplication(
                          fullData.application || fullData,
                        );
                        setShowProfileDetailModal(true);
                      } catch (error: any) {
                        toast.error(
                          error.message || "Failed to load application details",
                        );
                      }
                    }}
                  >
                    <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                      {/* Profile Image - Square, Left Side */}
                      <div className="flex-shrink-0">
                        {app.profile_image_url ? (
                          <img
                            src={app.profile_image_url}
                            alt={app.business_name}
                            className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl"
                            style={{ border: "1px solid #AA855B" }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                              const parent = (e.target as HTMLImageElement)
                                .parentElement;
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center" style="background-color: #F5F5F5; border: 1px solid #AA855B;">
                                    <span class="text-xl sm:text-2xl font-bold font-['Poppins']" style="color: #AA855B;">
                                      ${app.business_name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                `;
                              }
                            }}
                          />
                        ) : (
                          <div
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center"
                            style={{
                              backgroundColor: "#F5F5F5",
                              border: "1px solid #AA855B",
                            }}
                          >
                            <span
                              className="text-xl sm:text-2xl font-bold font-['Poppins']"
                              style={{ color: "#AA855B" }}
                            >
                              {app.business_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Information Section */}
                      <div className="flex-1 min-w-0 w-full sm:w-auto">
                        {/* Row 1: Business Name | Professional Type | Created Date | Status Badge */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2 sm:gap-0">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1.5 sm:space-y-0 sm:space-x-2 sm:flex-1">
                            <h3
                              className="text-base sm:text-lg font-semibold font-['Poppins']"
                              style={{ color: "#32332D" }}
                            >
                              {app.business_name}
                            </h3>
                            <span
                              className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full font-['Poppins']"
                              style={{
                                backgroundColor: "#DBEAFE",
                                color: "#2563EB",
                              }}
                            >
                              {formatProfessionalType(
                                app.professional_type || "",
                              )}
                            </span>
                            <p
                              className="text-xs sm:text-sm font-['Poppins']"
                              style={{ color: "#AA855B" }}
                            >
                              {new Date(app.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1.5 sm:space-x-2">
                            {(() => {
                              const statusStyles = {
                                pending: { bg: "#FFF4E6", text: "#F2742C" },
                                approved: { bg: "#E8F5E9", text: "#0F5648" },
                                rejected: { bg: "#FFEBEE", text: "#D63B3B" },
                                archived: { bg: "#F5F5F5", text: "#AA855B" },
                              };
                              const style =
                                statusStyles[
                                  app.profile_status as keyof typeof statusStyles
                                ] || statusStyles.pending;
                              return (
                                <span
                                  className="px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-medium rounded-full font-['Poppins'] capitalize"
                                  style={{
                                    backgroundColor: style.bg,
                                    color: style.text,
                                  }}
                                >
                                  {app.profile_status}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Row 2: Specializations (display all) */}
                        {app.specializations &&
                          Array.isArray(app.specializations) &&
                          app.specializations.length > 0 && (
                            <div className="flex items-center space-x-2 mb-2 flex-wrap">
                              {app.specializations.map(
                                (spec: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 text-xs font-medium rounded-full font-['Poppins']"
                                    style={{
                                      backgroundColor: "#E8F4F8",
                                      color: "#326586",
                                    }}
                                  >
                                    {spec}
                                  </span>
                                ),
                              )}
                            </div>
                          )}

                        {/* Row 3: View Details Button and Action Buttons */}
                        <div className="flex items-center justify-between mt-2">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const fullData =
                                  await getCoordinatorApplication(
                                    app.professional_id,
                                  );
                                setSelectedApplication(
                                  fullData.application || fullData,
                                );
                                setShowProfileDetailModal(true);
                              } catch (error: any) {
                                toast.error(
                                  error.message ||
                                    "Failed to load application details",
                                );
                              }
                            }}
                            className="text-xs font-medium font-['Poppins'] hover:underline"
                            style={{ color: "#326586" }}
                          >
                            View Details →
                          </button>
                          <div className="flex items-center space-x-2">
                            {(app.profile_status === "pending" ||
                              app.profile_status === "rejected") && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const fullData =
                                      await getCoordinatorApplication(
                                        app.professional_id,
                                      );
                                    setSelectedApplication(
                                      fullData.application || fullData,
                                    );
                                    setShowApproveModal(true);
                                  } catch (error: any) {
                                    toast.error(
                                      error.message ||
                                        "Failed to load application details",
                                    );
                                  }
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-medium font-['Poppins'] transition-colors"
                                style={{
                                  backgroundColor: "#0F5648",
                                  color: "#FFFFFF",
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
                                Approve
                              </button>
                            )}
                            {(app.profile_status === "pending" ||
                              app.profile_status === "approved") && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const fullData =
                                      await getCoordinatorApplication(
                                        app.professional_id,
                                      );
                                    setSelectedApplication(
                                      fullData.application || fullData,
                                    );
                                    setRejectionReason("");
                                    setShowRejectModal(true);
                                  } catch (error: any) {
                                    toast.error(
                                      error.message ||
                                        "Failed to load application details",
                                    );
                                  }
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-medium font-['Poppins'] transition-colors"
                                style={{
                                  backgroundColor: "#D63B3B",
                                  color: "#FFFFFF",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    "#B83232";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    "#D63B3B";
                                }}
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDirectoryTab = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <h2
            className="text-lg sm:text-xl font-bold font-['Poppins']"
            style={{ color: "#32332D" }}
          >
            Professional Directory Management
          </h2>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search
                className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5"
                style={{ color: "#AA855B" }}
              />
              <input
                type="search"
                placeholder="Search professionals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    loadData();
                  }
                }}
                className="w-full min-w-0 sm:min-w-[200px] md:min-w-[300px] pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
                style={{
                  borderColor: "#AA855B",
                  backgroundColor: "#FAEFE2",
                  color: "#32332D",
                  fontFamily: "'Poppins', sans-serif",
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
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <CircularProgress style={{ color: "#F2742C" }} />
          </div>
        ) : directory.length === 0 ? (
          <div
            className="text-center py-12 rounded-2xl"
            style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
          >
            <p
              className="text-lg font-medium mb-2 font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              No professionals found
            </p>
            <p
              className="text-sm font-['Poppins']"
              style={{ color: "#AA855B" }}
            >
              {searchQuery
                ? "Try adjusting your search"
                : "No professionals available"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {directory.map((prof) => (
              <div
                key={prof.professional_id}
                className="bg-white rounded-xl shadow-sm overflow-hidden border flex flex-col h-full relative transition-all duration-200 hover:shadow-lg"
                style={{ borderColor: "#AA855B" }}
              >
                {/* Image Section with Absolute Badges */}
                <div className="relative">
                  {prof.profile_image_url ? (
                    <img
                      src={prof.profile_image_url}
                      alt={prof.business_name}
                      className="w-full h-48 object-cover flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className="w-full h-48 flex flex-col items-center justify-center p-4"
                      style={{
                        background:
                          "linear-gradient(135deg, #E8F4F8 0%, #E8F4F8dd 100%)",
                      }}
                    >
                      <User
                        className="w-12 h-12 mb-2"
                        style={{ color: "#326586" }}
                      />
                      <h4
                        className="text-sm font-semibold font-['Poppins'] text-center line-clamp-2 mb-1"
                        style={{ color: "#326586" }}
                      >
                        {prof.business_name}
                      </h4>
                    </div>
                  )}
                  {/* Absolute Badge - Status */}
                  <div className="absolute top-4 right-4">
                    {prof.profile_status === "approved" ? (
                      <div
                        className="flex items-center space-x-1 px-2 py-1 rounded-full"
                        style={{ backgroundColor: "#E8F5E9" }}
                      >
                        <CheckCircle
                          className="w-4 h-4"
                          style={{ color: "#0F5648" }}
                        />
                        <span
                          className="text-xs font-medium font-['Poppins']"
                          style={{ color: "#0F5648" }}
                        >
                          Verified
                        </span>
                      </div>
                    ) : (
                      <div
                        className="px-2 py-1 rounded-full text-xs font-medium font-['Poppins'] capitalize"
                        style={{
                          backgroundColor:
                            prof.profile_status === "pending"
                              ? "#FFF4E6"
                              : "#F5F5F5",
                          color:
                            prof.profile_status === "pending"
                              ? "#F2742C"
                              : "#AA855B",
                        }}
                      >
                        {prof.profile_status}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col flex-grow px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-6">
                  {/* Business Name */}
                  <Typography
                    variant="h6"
                    className="mb-1.5 sm:mb-2"
                    sx={{
                      color: "#32332D",
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 600,
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    }}
                  >
                    {prof.business_name}
                  </Typography>

                  {/* Professional Type */}
                  {prof.professional_type && (
                    <Typography
                      variant="body2"
                      className="mb-2 sm:mb-3"
                      sx={{
                        color: "#64635E",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      }}
                    >
                      {formatProfessionalType(prof.professional_type)}
                    </Typography>
                  )}

                  {/* Specializations */}
                  {prof.specializations &&
                    (Array.isArray(prof.specializations)
                      ? prof.specializations.length > 0
                      : prof.specializations) && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const specs: string[] = Array.isArray(
                              prof.specializations,
                            )
                              ? prof.specializations
                              : prof.specializations
                                ? (prof.specializations as string)
                                    .split(",")
                                    .map((s: string) => s.trim())
                                    .filter((s: string) => s)
                                : [];
                            return specs.map((spec: string, idx: number) => (
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
                            ));
                          })()}
                        </div>
                      </div>
                    )}

                  {/* Target Developmental Stages */}
                  {prof.target_developmental_stages &&
                    prof.target_developmental_stages.length > 0 && (
                      <div className="mb-3">
                        <Typography
                          variant="caption"
                          className="block mb-1"
                          style={{
                            color: "#AA855B",
                            fontFamily: "'Poppins', sans-serif",
                            fontWeight: 500,
                          }}
                        >
                          Developmental Stages
                        </Typography>
                        <div className="flex flex-wrap gap-1">
                          {prof.target_developmental_stages.map(
                            (stage: string, idx: number) => (
                              <Chip
                                key={idx}
                                label={stage
                                  .replace("_", " ")
                                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                                size="small"
                                sx={{
                                  backgroundColor: "#E8F5E9",
                                  color: "#0F5648",
                                  fontFamily: "'Poppins', sans-serif",
                                  fontSize: "0.7rem",
                                }}
                              />
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {/* Languages */}
                  {prof.languages && prof.languages.length > 0 && (
                    <div className="mb-3">
                      <Typography
                        variant="caption"
                        className="block mb-1"
                        style={{
                          color: "#AA855B",
                          fontFamily: "'Poppins', sans-serif",
                          fontWeight: 500,
                        }}
                      >
                        Languages
                      </Typography>
                      <div className="flex flex-wrap gap-1">
                        {prof.languages.map((lang: string, idx: number) => (
                          <Chip
                            key={idx}
                            label={lang}
                            size="small"
                            sx={{
                              backgroundColor: "#FFF4E6",
                              color: "#F2742C",
                              fontFamily: "'Poppins', sans-serif",
                              fontSize: "0.7rem",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Availability */}
                  {prof.availability && prof.availability.length > 0 && (
                    <div className="mb-3">
                      <Typography
                        variant="caption"
                        className="block mb-1"
                        style={{
                          color: "#AA855B",
                          fontFamily: "'Poppins', sans-serif",
                          fontWeight: 500,
                        }}
                      >
                        Availability
                      </Typography>
                      <div className="flex flex-wrap gap-1">
                        {prof.availability.map((avail: string, idx: number) => (
                          <Chip
                            key={idx}
                            label={avail
                              .replace("_", " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                            size="small"
                            sx={{
                              backgroundColor: "#E8F4F8",
                              color: "#326586",
                              fontFamily: "'Poppins', sans-serif",
                              fontSize: "0.7rem",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  <div className="mb-4">
                    <Typography
                      variant="body2"
                      style={{
                        color: "#AA855B",
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      {(() => {
                        const locationParts = [
                          prof.city,
                          prof.state,
                          prof.country,
                        ].filter(Boolean);
                        return locationParts.length > 0
                          ? locationParts.join(", ")
                          : "Location not specified";
                      })()}
                    </Typography>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between flex-wrap gap-2 mt-auto">
                    <button
                      onClick={() => handleViewProfile(prof)}
                      className="px-4 py-2 rounded-xl text-sm font-medium font-['Poppins'] transition-colors"
                      style={{ color: "#326586", backgroundColor: "#E8F4F8" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#D1E7F0";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#E8F4F8";
                      }}
                    >
                      View Details
                    </button>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedProfile(prof);
                          const specializationsArray: string[] = Array.isArray(
                            prof.specializations,
                          )
                            ? prof.specializations
                            : prof.specializations
                              ? (prof.specializations as string)
                                  .split(",")
                                  .map((s: string) => s.trim())
                                  .filter((s: string) => s)
                              : [];
                          setNewSpecializations(specializationsArray);
                          setShowEditSpecializationsModal(true);
                        }}
                        className="px-3 py-2 rounded-xl text-sm font-medium font-['Poppins'] transition-colors flex items-center space-x-1"
                        style={{ color: "#F2742C", backgroundColor: "#FDF2E8" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#FBE9D0";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#FDF2E8";
                        }}
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      {prof.profile_status === "approved" ? (
                        <button
                          onClick={() => handleArchiveProfileClick(prof)}
                          disabled={processing}
                          className="px-3 py-2 rounded-xl text-sm font-medium font-['Poppins'] transition-colors flex items-center space-x-1 disabled:opacity-50"
                          style={{
                            color: "#AA855B",
                            backgroundColor: "#FAEFE2",
                          }}
                          onMouseEnter={(e) => {
                            if (!processing) {
                              e.currentTarget.style.backgroundColor = "#F5E5D0";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#FAEFE2";
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Archive</span>
                        </button>
                      ) : prof.profile_status === "archived" ? (
                        <button
                          onClick={() =>
                            handleUnarchiveProfile(prof.professional_id)
                          }
                          disabled={processing}
                          className="px-3 py-2 rounded-xl text-sm font-medium font-['Poppins'] transition-colors disabled:opacity-50"
                          style={{
                            backgroundColor: "#0F5648",
                            color: "#FFFFFF",
                          }}
                          onMouseEnter={(e) => {
                            if (!processing) {
                              e.currentTarget.style.backgroundColor = "#0A4538";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#0F5648";
                          }}
                        >
                          Unarchive
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderPromotionsTab = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <h2
            className="text-lg sm:text-xl font-bold font-['Poppins']"
            style={{ color: "#32332D" }}
          >
            Promotional Materials
          </h2>
          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-wrap w-full sm:w-auto">
            <Filter
              className="w-4 h-4 sm:w-5 sm:h-5"
              style={{ color: "#AA855B" }}
            />

            {/* Status Filter */}
            <div className="relative">
              <select
                value={promotionStatus}
                onChange={(e) =>
                  setPromotionStatus(e.target.value as PromotionStatus)
                }
                onFocus={() => setPromotionStatusFilterFocused(true)}
                onBlur={() => setPromotionStatusFilterFocused(false)}
                className="px-2 sm:px-3 py-1.5 sm:py-2 pr-7 sm:pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
                style={{
                  borderColor: "#AA855B",
                  backgroundColor: "#FAEFE2",
                  color: "#32332D",
                  fontFamily: "inherit",
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
              {promotionStatusFilterFocused ? (
                <ChevronUp
                  className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                  style={{ color: "#AA855B" }}
                  size={14}
                />
              ) : (
                <ChevronDown
                  className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                  style={{ color: "#AA855B" }}
                  size={14}
                />
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleResetPromotionFilters}
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
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div
              className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ borderColor: "#326586" }}
            ></div>
          </div>
        ) : promotions.filter((promo) => {
            if (promotionStatus === "all") return true;
            if (promotionStatus === "pending" && promo.status === "pending")
              return true;
            if (promotionStatus === "approved" && promo.status === "approved")
              return true;
            if (promotionStatus === "rejected" && promo.status === "rejected")
              return true;
            if (promo.status === "approved") {
              const promoStatus = getPromotionStatus(promo);
              if (
                promotionStatus === "active" &&
                promoStatus.status === "active"
              )
                return true;
              if (
                promotionStatus === "expired" &&
                promoStatus.status === "expired"
              )
                return true;
              if (
                promotionStatus === "upcoming" &&
                promoStatus.status === "upcoming"
              )
                return true;
            }
            return false;
          }).length === 0 ? (
          <div
            className="text-center py-12 rounded-2xl"
            style={{ backgroundColor: "#F5F5F5", border: "1px solid #AA855B" }}
          >
            <Megaphone
              className="w-16 h-16 mx-auto mb-4"
              style={{ color: "#AA855B" }}
            />
            <h3
              className="text-lg font-medium mb-2 font-['Poppins']"
              style={{ color: "#32332D" }}
            >
              No promotional materials found
            </h3>
            <p
              className="text-sm font-['Poppins']"
              style={{ color: "#AA855B" }}
            >
              {promotionStatus !== "all"
                ? `No ${promotionStatus} promotional materials`
                : "No promotional materials available"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {promotions
              .filter((promo) => {
                if (promotionStatus === "all") return true;
                if (promotionStatus === "pending" && promo.status === "pending")
                  return true;
                if (
                  promotionStatus === "approved" &&
                  promo.status === "approved"
                )
                  return true;
                if (
                  promotionStatus === "rejected" &&
                  promo.status === "rejected"
                )
                  return true;
                if (promo.status === "approved") {
                  const promoStatus = getPromotionStatus(promo);
                  if (
                    promotionStatus === "active" &&
                    promoStatus.status === "active"
                  )
                    return true;
                  if (
                    promotionStatus === "expired" &&
                    promoStatus.status === "expired"
                  )
                    return true;
                  if (
                    promotionStatus === "upcoming" &&
                    promoStatus.status === "upcoming"
                  )
                    return true;
                }
                return false;
              })
              .map((promo) => {
                const promotionStatus =
                  promo.status === "approved"
                    ? getPromotionStatus(promo)
                    : null;
                const daysRemaining =
                  promo.status === "approved"
                    ? calculateDaysRemaining(promo.display_end_date)
                    : null;

                return (
                  <div
                    key={promo.material_id}
                    className="rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg"
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #AA855B",
                    }}
                  >
                    <div className="relative">
                      {promo.file_path ? (
                        <img
                          src={promo.file_path}
                          alt={promo.title}
                          className="w-full h-40 sm:h-48 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <div
                          className="w-full h-40 sm:h-48 flex flex-col items-center justify-center p-3 sm:p-4"
                          style={{
                            background:
                              "linear-gradient(135deg, #E8F4F8 0%, #E8F4F8dd 100%)",
                          }}
                        >
                          <Megaphone
                            className="w-10 h-10 sm:w-12 sm:h-12 mb-1.5 sm:mb-2"
                            style={{ color: "#326586" }}
                          />
                          <h4
                            className="text-xs sm:text-sm font-semibold font-['Poppins'] text-center line-clamp-2 mb-1"
                            style={{ color: "#326586" }}
                          >
                            {promo.title}
                          </h4>
                        </div>
                      )}
                      <div className="absolute top-2 sm:top-4 left-2 sm:left-4">
                        <span
                          className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium font-['Poppins']"
                          style={{
                            backgroundColor: "#E8F4F8",
                            color: "#326586",
                          }}
                        >
                          {promo.content_type.charAt(0).toUpperCase() +
                            promo.content_type.slice(1)}
                        </span>
                      </div>
                      <div className="absolute top-2 sm:top-4 right-2 sm:right-4">
                        {(() => {
                          const statusStyles = {
                            pending: { bg: "#FFF4E6", text: "#F2742C" },
                            approved: { bg: "#E8F5E9", text: "#0F5648" },
                            rejected: { bg: "#FFEBEE", text: "#D63B3B" },
                          };
                          const style =
                            statusStyles[
                              promo.status as keyof typeof statusStyles
                            ] || statusStyles.pending;
                          return (
                            <span
                              className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium font-['Poppins']"
                              style={{
                                backgroundColor: style.bg,
                                color: style.text,
                              }}
                            >
                              {promo.status.charAt(0).toUpperCase() +
                                promo.status.slice(1)}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="p-4 sm:p-6">
                      <h3
                        className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 font-['Poppins']"
                        style={{ color: "#32332D" }}
                      >
                        {promo.title}
                      </h3>

                      <div className="flex items-center space-x-1.5 sm:space-x-2 mb-1.5 sm:mb-2 flex-wrap">
                        {promotionStatus && (
                          <span
                            className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full font-['Poppins']"
                            style={{
                              backgroundColor: promotionStatus.badge.bg,
                              color: promotionStatus.badge.text,
                            }}
                          >
                            {promotionStatus.badge.label}
                          </span>
                        )}
                        <span
                          className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full font-['Poppins']"
                          style={{
                            backgroundColor: "#F5F5F5",
                            color: "#AA855B",
                          }}
                        >
                          By: {promo.business_name || "Unknown"}
                        </span>
                      </div>

                      {promo.description && (
                        <p
                          className="text-xs sm:text-sm mb-3 sm:mb-4"
                          style={{ color: "#AA855B" }}
                        >
                          {promo.description}
                        </p>
                      )}

                      {/* Duration display for approved materials */}
                      {promo.status === "approved" &&
                        promo.display_start_date &&
                        promo.display_end_date && (
                          <div
                            className="mb-3 sm:mb-4 p-2 sm:p-3 rounded-lg"
                            style={{
                              backgroundColor: "#F5F5F5",
                              border: "1px solid #AA855B",
                            }}
                          >
                            <p
                              className="text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1 font-['Poppins']"
                              style={{ color: "#AA855B" }}
                            >
                              Display Duration
                            </p>
                            <p
                              className="text-[10px] sm:text-xs font-['Poppins'] mb-0.5 sm:mb-1"
                              style={{ color: "#32332D" }}
                            >
                              {formatDate(promo.display_start_date)} -{" "}
                              {formatDate(promo.display_end_date)}
                            </p>
                            {daysRemaining !== null && (
                              <p
                                className="text-[10px] sm:text-xs font-['Poppins']"
                                style={{
                                  color:
                                    daysRemaining >= 0 ? "#0F5648" : "#64635E",
                                }}
                              >
                                {daysRemaining >= 0
                                  ? `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining`
                                  : "Expired"}
                              </p>
                            )}
                          </div>
                        )}

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                        {promo.status === "pending" && (
                          <>
                            <button
                              className="flex-1 py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl text-white font-medium font-['Poppins'] text-xs sm:text-sm transition-colors"
                              style={{ backgroundColor: "#0F5648" }}
                              onClick={() => {
                                setSelectedPromotion(promo);
                                setDisplayStartDate("");
                                setDisplayEndDate("");
                                setDisplaySequence(0);
                                setShowPromotionApproveModal(true);
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
                              Approve
                            </button>
                            <button
                              className="flex-1 py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl text-white font-medium font-['Poppins'] text-xs sm:text-sm transition-colors"
                              style={{ backgroundColor: "#D63B3B" }}
                              onClick={() => {
                                setSelectedPromotion(promo);
                                setRejectionReason("");
                                setShowPromotionRejectModal(true);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#C02A2A";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#D63B3B";
                              }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {promo.status === "approved" && (
                          <>
                            <button
                              className="flex-1 py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl font-medium font-['Poppins'] text-xs sm:text-sm transition-colors"
                              style={{
                                border: "1px solid #AA855B",
                                color: "#326586",
                              }}
                              onClick={() => {
                                setSelectedPromotion(promo);
                                setDisplayStartDate(
                                  promo.display_start_date || "",
                                );
                                setDisplayEndDate(promo.display_end_date || "");
                                setDisplaySequence(promo.display_sequence || 0);
                                setShowPromotionEditModal(true);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#FAEFE2";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                              }}
                            >
                              Edit Settings
                            </button>
                            <button
                              className="flex-1 py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl text-white font-medium font-['Poppins'] text-xs sm:text-sm transition-colors"
                              style={{ backgroundColor: "#D63B3B" }}
                              onClick={() => {
                                setSelectedPromotion(promo);
                                setRejectionReason("");
                                setShowPromotionRejectModal(true);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#C02A2A";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#D63B3B";
                              }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {promo.status === "rejected" && (
                          <button
                            className="flex-1 py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl text-white font-medium font-['Poppins'] text-xs sm:text-sm transition-colors"
                            style={{ backgroundColor: "#0F5648" }}
                            onClick={() => {
                              setSelectedPromotion(promo);
                              setDisplayStartDate("");
                              setDisplayEndDate("");
                              setDisplaySequence(0);
                              setShowPromotionApproveModal(true);
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#0A4538";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#0F5648";
                            }}
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    );
  };

  // Render modals
  const renderModals = () => {
    return (
      <>
        {/* Approve Application Modal */}
        {showApproveModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowApproveModal(false);
              }
            }}
          >
            <div
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6"
              style={{ maxHeight: "90vh", overflowY: "auto" }}
            >
              <div className="flex items-center justify-between">
                <h3
                  className="text-lg font-semibold"
                  style={{
                    color: "#32332D",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Approve Application
                </h3>
                <button
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => {
                    setShowApproveModal(false);
                  }}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <p
                  className="text-sm"
                  style={{
                    color: "#32332D",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Are you sure you want to approve{" "}
                  {selectedApplication?.business_name}?
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  className="px-4 py-2 rounded-lg font-medium border transition-all duration-200"
                  style={{
                    borderColor: "#AA855B",
                    color: "#AA855B",
                    backgroundColor: "transparent",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                  onClick={() => {
                    setShowApproveModal(false);
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
                  className="px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  style={{
                    backgroundColor: "#0F5648",
                    color: "#FFFFFF",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                  onClick={handleApproveApplication}
                  disabled={processing}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = "#0A4538";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = "#0F5648";
                    }
                  }}
                >
                  {processing ? (
                    <span className="flex items-center gap-2">
                      <CircularProgress
                        size={16}
                        style={{ color: "#FFFFFF" }}
                      />
                      Processing...
                    </span>
                  ) : (
                    "Approve"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Application Modal */}
        {showRejectModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowRejectModal(false);
                setRejectionReason("");
              }
            }}
          >
            <div
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6"
              style={{ maxHeight: "90vh", overflowY: "auto" }}
            >
              <div className="flex items-center justify-between">
                <h3
                  className="text-lg font-semibold"
                  style={{
                    color: "#32332D",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Reject Application
                </h3>
                <button
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason("");
                  }}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{
                      color: "#32332D",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    Rejection Reason *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a reason for rejecting this application..."
                    rows={6}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent resize-none transition-all duration-200"
                    style={{
                      borderColor: "#AA855B",
                      backgroundColor: rejectionReason ? "#F5F5F5" : "#EDEDED",
                      color: "#32332D",
                      fontSize: "14px",
                      fontFamily: "'Poppins', sans-serif",
                      outline: "none",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLTextAreaElement).style.backgroundColor =
                        "#F5F5F5";
                      (e.target as HTMLTextAreaElement).style.borderColor =
                        "#AA855B";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLTextAreaElement).style.backgroundColor =
                        rejectionReason ? "#F5F5F5" : "#EDEDED";
                      (e.target as HTMLTextAreaElement).style.borderColor =
                        "#AA855B";
                      (e.target as HTMLTextAreaElement).style.boxShadow =
                        "none";
                    }}
                    onFocus={(e) => {
                      (e.target as HTMLTextAreaElement).style.backgroundColor =
                        "#F5F5F5";
                      (e.target as HTMLTextAreaElement).style.borderColor =
                        "#AA855B";
                      (e.target as HTMLTextAreaElement).style.boxShadow =
                        "0 0 0 2px #F2742C";
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLTextAreaElement).style.backgroundColor =
                        rejectionReason ? "#F5F5F5" : "#EDEDED";
                      (e.target as HTMLTextAreaElement).style.borderColor =
                        "#AA855B";
                      (e.target as HTMLTextAreaElement).style.boxShadow =
                        "none";
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  className="px-4 py-2 rounded-lg font-medium border transition-all duration-200 hover:opacity-80"
                  style={{
                    borderColor: "#AA855B",
                    color: "#AA855B",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:opacity-90"
                  style={{
                    backgroundColor: "#D63B3B",
                    color: "#FFFFFF",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                  onClick={handleRejectApplication}
                  disabled={processing || !rejectionReason.trim()}
                >
                  {processing ? (
                    <span className="flex items-center gap-2">
                      <CircularProgress
                        size={16}
                        style={{ color: "#FFFFFF" }}
                      />
                      Processing...
                    </span>
                  ) : (
                    "Reject"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Detail Modal - Matching ProfessionalDirectoryPage design */}
        {showProfileDetailModal &&
          (selectedApplication || selectedProfile) &&
          (() => {
            const profile = selectedApplication || selectedProfile;
            if (!profile) return null;

            const location =
              [
                profile.address_line,
                profile.city,
                profile.state,
                profile.postcode,
              ]
                .filter(Boolean)
                .join(", ") || "Location not specified";

            return (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4"
                onClick={() => setShowProfileDetailModal(false)}
              >
                <div
                  className="rounded-none sm:rounded-xl max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto flex flex-col"
                  style={{
                    backgroundColor: "#F5F5F5",
                    border: "1px solid #AA855B",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div
                    className="p-4 sm:p-6 border-b flex-shrink-0"
                    style={{
                      borderColor: "#AA855B",
                      backgroundColor: "#FAEFE2",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                        {/* Profile Image */}
                        {(profile as any).profile_image_url &&
                        !modalImageError ? (
                          <img
                            src={(profile as any).profile_image_url}
                            alt={profile.business_name}
                            className="w-14 h-14 sm:w-20 sm:h-20 rounded-full object-cover flex-shrink-0 border-2"
                            style={{ borderColor: "#AA855B" }}
                            onError={() => setModalImageError(true)}
                          />
                        ) : (
                          <div
                            className="w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: "#EDEDED" }}
                          >
                            <Users
                              className="w-7 h-7 sm:w-10 sm:h-10"
                              style={{ color: "#AA855B" }}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {/* Row 1: Business Name */}
                          <h2
                            className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2 truncate"
                            style={{
                              color: "#32332D",
                              fontFamily: "'Poppins', sans-serif",
                            }}
                          >
                            {profile.business_name}
                          </h2>
                          {/* Row 2: Professional Type */}
                          {profile.professional_type && (
                            <p
                              className="text-xs sm:text-sm mb-1 sm:mb-2"
                              style={{
                                color: "#64635E",
                                fontFamily: "'Poppins', sans-serif",
                              }}
                            >
                              {formatProfessionalType(
                                profile.professional_type,
                              )}
                            </p>
                          )}
                          {/* Row 3: Verified | Years Experience */}
                          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap gap-1">
                            {profile.profile_status === "approved" && (
                              <div
                                className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium flex items-center space-x-0.5 sm:space-x-1"
                                style={{
                                  backgroundColor: "#E8F5E9",
                                  color: "#0F5648",
                                }}
                              >
                                <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                <span>Verified</span>
                              </div>
                            )}
                            {(selectedApplication?.years_experience ||
                              (selectedProfile as any)?.years_experience) && (
                              <span
                                className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium"
                                style={{
                                  backgroundColor: "#FDF2E8",
                                  color: "#F2742C",
                                }}
                              >
                                {selectedApplication?.years_experience ||
                                  (selectedProfile as any)
                                    ?.years_experience}{" "}
                                years experience
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowProfileDetailModal(false)}
                        className="transition-colors ml-2 sm:ml-4 flex-shrink-0"
                        style={{ color: "#AA855B" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#8B6F4A";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "#AA855B";
                        }}
                      >
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                      </button>
                    </div>
                  </div>

                  {/* Content - Scrollable area */}
                  <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 flex-grow overflow-y-auto">
                    {/* Professional Overview */}
                    <div>
                      <h3
                        className="text-base sm:text-lg font-semibold mb-3 sm:mb-4"
                        style={{
                          color: "#32332D",
                          fontFamily: "'Poppins', sans-serif",
                        }}
                      >
                        Professional Overview
                      </h3>
                      {/* Bio */}
                      {(selectedApplication?.bio ||
                        (selectedProfile as any)?.bio) && (
                        <p
                          className="mb-3 sm:mb-4 text-sm sm:text-base"
                          style={{
                            color: "#32332D",
                            fontFamily: "'Poppins', sans-serif",
                          }}
                        >
                          {selectedApplication?.bio ||
                            (selectedProfile as any)?.bio}
                        </p>
                      )}
                      {/* Specializations */}
                      {profile.specializations &&
                        (Array.isArray(profile.specializations)
                          ? profile.specializations.length > 0
                          : profile.specializations) && (
                          <div className="mb-3 sm:mb-4">
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                              {Array.isArray(profile.specializations)
                                ? profile.specializations.map(
                                    (spec: string, index: number) => (
                                      <span
                                        key={index}
                                        className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm"
                                        style={{
                                          backgroundColor: "#FDF2E8",
                                          color: "#F2742C",
                                          border: "1px solid #F0DCC9",
                                        }}
                                      >
                                        {spec}
                                      </span>
                                    ),
                                  )
                                : renderBulletPoints(profile.specializations)}
                            </div>
                          </div>
                        )}
                      {/* Developmental Stages | Languages | Availability */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                        {((selectedApplication?.target_developmental_stages &&
                          selectedApplication.target_developmental_stages
                            .length > 0) ||
                          ((selectedProfile as any)
                            ?.target_developmental_stages &&
                            (selectedProfile as any).target_developmental_stages
                              .length > 0)) && (
                          <div>
                            <h4
                              className="font-medium mb-1.5 sm:mb-2 text-xs sm:text-sm"
                              style={{
                                color: "#AA855B",
                                fontFamily: "'Poppins', sans-serif",
                              }}
                            >
                              Developmental Stages
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {(
                                selectedApplication?.target_developmental_stages ||
                                (selectedProfile as any)
                                  ?.target_developmental_stages ||
                                []
                              ).map((stage: string, index: number) => (
                                <span
                                  key={index}
                                  className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs"
                                  style={{
                                    backgroundColor: "#E8F5E9",
                                    color: "#0F5648",
                                  }}
                                >
                                  {stage
                                    .replace("_", " ")
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {((selectedApplication?.languages &&
                          selectedApplication.languages.length > 0) ||
                          ((selectedProfile as any)?.languages &&
                            (selectedProfile as any).languages.length > 0)) && (
                          <div>
                            <h4
                              className="font-medium mb-1.5 sm:mb-2 text-xs sm:text-sm"
                              style={{
                                color: "#AA855B",
                                fontFamily: "'Poppins', sans-serif",
                              }}
                            >
                              Languages
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {(
                                selectedApplication?.languages ||
                                (selectedProfile as any)?.languages ||
                                []
                              ).map((lang: string, index: number) => (
                                <span
                                  key={index}
                                  className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs"
                                  style={{
                                    backgroundColor: "#FFF4E6",
                                    color: "#F2742C",
                                  }}
                                >
                                  {lang}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {((selectedApplication?.availability &&
                          selectedApplication.availability.length > 0) ||
                          ((selectedProfile as any)?.availability &&
                            (selectedProfile as any).availability.length >
                              0)) && (
                          <div>
                            <h4
                              className="font-medium mb-1.5 sm:mb-2 text-xs sm:text-sm"
                              style={{
                                color: "#AA855B",
                                fontFamily: "'Poppins', sans-serif",
                              }}
                            >
                              Availability
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {(
                                selectedApplication?.availability ||
                                (selectedProfile as any)?.availability ||
                                []
                              ).map((avail: string, index: number) => (
                                <span
                                  key={index}
                                  className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs"
                                  style={{
                                    backgroundColor: "#E8F4F8",
                                    color: "#326586",
                                  }}
                                >
                                  {avail
                                    .replace("_", " ")
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Qualifications & Credentials */}
                    {(selectedApplication?.qualifications ||
                      (selectedProfile as any)?.qualifications ||
                      selectedApplication?.certifications ||
                      (selectedProfile as any)?.certifications) && (
                      <div>
                        <h3
                          className="text-base sm:text-lg font-semibold mb-3 sm:mb-4"
                          style={{
                            color: "#32332D",
                            fontFamily: "'Poppins', sans-serif",
                          }}
                        >
                          Qualifications & Credentials
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                          {(selectedApplication?.qualifications ||
                            (selectedProfile as any)?.qualifications) && (
                            <div>
                              <h4
                                className="font-medium mb-1.5 sm:mb-2 text-xs sm:text-sm"
                                style={{
                                  color: "#AA855B",
                                  fontFamily: "'Poppins', sans-serif",
                                }}
                              >
                                Education & Qualifications
                              </h4>
                              {renderBulletPoints(
                                selectedApplication?.qualifications ||
                                  (selectedProfile as any)?.qualifications,
                              )}
                            </div>
                          )}

                          {(selectedApplication?.certifications ||
                            (selectedProfile as any)?.certifications) && (
                            <div>
                              <h4
                                className="font-medium mb-1.5 sm:mb-2 text-xs sm:text-sm"
                                style={{
                                  color: "#AA855B",
                                  fontFamily: "'Poppins', sans-serif",
                                }}
                              >
                                Certifications
                              </h4>
                              {renderBulletPoints(
                                selectedApplication?.certifications ||
                                  (selectedProfile as any)?.certifications,
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Services & Pricing */}
                    {((selectedApplication?.services &&
                      selectedApplication.services.length > 0) ||
                      ((selectedProfile as any)?.services &&
                        (selectedProfile as any).services.length > 0)) && (
                      <div>
                        <h3
                          className="text-base sm:text-lg font-semibold mb-3 sm:mb-4"
                          style={{
                            color: "#32332D",
                            fontFamily: "'Poppins', sans-serif",
                          }}
                        >
                          Services & Pricing
                        </h3>
                        <div className="space-y-3 sm:space-y-4">
                          {(
                            selectedApplication?.services ||
                            (selectedProfile as any)?.services ||
                            []
                          ).map((service: any) => (
                            <div
                              key={service.service_id}
                              className="p-3 sm:p-4 rounded-lg sm:rounded-xl"
                              style={{
                                backgroundColor: "#FAEFE2",
                                border: "1px solid #F0DCC9",
                              }}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-1 sm:gap-0">
                                <h4
                                  className="font-semibold text-sm sm:text-base"
                                  style={{
                                    color: "#32332D",
                                    fontFamily: "'Poppins', sans-serif",
                                  }}
                                >
                                  {service.service_name}
                                </h4>
                                {service.price_range && (
                                  <span
                                    className="text-xs sm:text-sm font-semibold"
                                    style={{
                                      color: "#F2742C",
                                      fontFamily: "'Poppins', sans-serif",
                                    }}
                                  >
                                    {service.price_range}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
                                {service.service_category && (
                                  <span
                                    className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium"
                                    style={{
                                      backgroundColor: "#FDF2E8",
                                      color: "#F2742C",
                                    }}
                                  >
                                    {service.service_category}
                                  </span>
                                )}
                                {service.service_type && (
                                  <span
                                    className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium"
                                    style={{
                                      backgroundColor: "#FDF2E8",
                                      color: "#F2742C",
                                    }}
                                  >
                                    {service.service_type}
                                  </span>
                                )}
                              </div>
                              {service.service_description && (
                                <p
                                  className="text-xs sm:text-sm"
                                  style={{
                                    color: "#64635E",
                                    fontFamily: "'Poppins', sans-serif",
                                  }}
                                >
                                  {service.service_description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contact Information & Location - Side by Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {/* Contact Information */}
                      <div>
                        <h3
                          className="text-base sm:text-lg font-semibold mb-3 sm:mb-4"
                          style={{
                            color: "#32332D",
                            fontFamily: "'Poppins', sans-serif",
                          }}
                        >
                          Contact Information
                        </h3>
                        <div className="space-y-2 sm:space-y-3">
                          {(profile as any).contact_phone && (
                            <div className="flex items-center space-x-1.5 sm:space-x-2">
                              <Phone
                                className="w-4 h-4 sm:w-5 sm:h-5"
                                style={{ color: "#F2742C" }}
                              />
                              <a
                                href={`tel:${(profile as any).contact_phone}`}
                                className="text-xs sm:text-sm break-all"
                                style={{
                                  color: "#326586",
                                  fontFamily: "'Poppins', sans-serif",
                                  textDecoration: "none",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.textDecoration =
                                    "underline";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.textDecoration = "none";
                                }}
                              >
                                {(profile as any).contact_phone}
                              </a>
                            </div>
                          )}
                          {(profile as any).contact_email && (
                            <div className="flex items-center space-x-1.5 sm:space-x-2">
                              <Mail
                                className="w-4 h-4 sm:w-5 sm:h-5"
                                style={{ color: "#F2742C" }}
                              />
                              <a
                                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${
                                  (profile as any).contact_email
                                }&tf=1`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs sm:text-sm break-all"
                                style={{
                                  color: "#326586",
                                  fontFamily: "'Poppins', sans-serif",
                                  textDecoration: "none",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.textDecoration =
                                    "underline";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.textDecoration = "none";
                                }}
                              >
                                {(profile as any).contact_email}
                              </a>
                            </div>
                          )}
                          {(profile as any).website_url && (
                            <div className="flex items-center space-x-1.5 sm:space-x-2">
                              <Globe
                                className="w-4 h-4 sm:w-5 sm:h-5"
                                style={{ color: "#F2742C" }}
                              />
                              <a
                                href={(profile as any).website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs sm:text-sm break-all"
                                style={{
                                  color: "#326586",
                                  fontFamily: "'Poppins', sans-serif",
                                  textDecoration: "none",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.textDecoration =
                                    "underline";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.textDecoration = "none";
                                }}
                              >
                                {(profile as any).website_url}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Location */}
                      <div>
                        <h3
                          className="text-base sm:text-lg font-semibold mb-3 sm:mb-4"
                          style={{
                            color: "#32332D",
                            fontFamily: "'Poppins', sans-serif",
                          }}
                        >
                          Location
                        </h3>
                        <div className="space-y-1.5 sm:space-y-2">
                          <p
                            className="text-xs sm:text-sm"
                            style={{
                              color: "#32332D",
                              fontFamily: "'Poppins', sans-serif",
                            }}
                          >
                            {location}
                          </p>
                          {(profile as any).google_maps_url && (
                            <a
                              href={(profile as any).google_maps_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm font-medium transition-colors"
                              style={{
                                color: "#326586",
                                fontFamily: "'Poppins', sans-serif",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.textDecoration =
                                  "underline";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.textDecoration = "none";
                              }}
                            >
                              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span>View on Google Maps</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Verification Documents */}
                    {selectedApplication?.documents &&
                      selectedApplication.documents.length > 0 && (
                        <div>
                          <h3
                            className="text-base sm:text-lg font-semibold mb-3 sm:mb-4"
                            style={{
                              color: "#32332D",
                              fontFamily: "'Poppins', sans-serif",
                            }}
                          >
                            Verification Documents
                          </h3>
                          <div className="space-y-3">
                            {selectedApplication.documents.map((doc) => (
                              <div
                                key={doc.document_id}
                                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 p-2 sm:p-3 rounded-lg"
                                style={{
                                  backgroundColor: "#FAEFE2",
                                  border: "1px solid #AA855B",
                                }}
                              >
                                <div className="flex items-center flex-1 min-w-0">
                                  <FileText
                                    className="w-5 h-5 mr-3 flex-shrink-0"
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
                                      {doc.document_type || "Unknown type"}
                                      {doc.file_size &&
                                        ` • ${(
                                          doc.file_size /
                                          1024 /
                                          1024
                                        ).toFixed(2)} MB`}
                                    </p>
                                  </div>
                                </div>
                                {doc.file_path && (
                                  <a
                                    href={doc.file_path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full sm:w-auto text-center sm:text-left text-xs sm:text-sm font-semibold px-2 sm:px-2.5 py-1 rounded-lg transition-colors hover:bg-blue-50 font-['Poppins'] whitespace-nowrap sm:ml-3"
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

                    {/* Action Buttons - Only show for applications */}
                    {selectedApplication && (
                      <div
                        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t"
                        style={{ borderColor: "#AA855B" }}
                      >
                        {(selectedApplication.profile_status === "pending" ||
                          selectedApplication.profile_status ===
                            "rejected") && (
                          <button
                            onClick={() => {
                              setShowProfileDetailModal(false);
                              setShowApproveModal(true);
                            }}
                            className="w-full sm:w-auto px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-medium font-['Poppins'] transition-colors"
                            style={{
                              backgroundColor: "#0F5648",
                              color: "#FFFFFF",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#0A4538";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#0F5648";
                            }}
                          >
                            Approve
                          </button>
                        )}
                        {(selectedApplication.profile_status === "pending" ||
                          selectedApplication.profile_status ===
                            "approved") && (
                          <button
                            onClick={() => {
                              setShowProfileDetailModal(false);
                              setRejectionReason("");
                              setShowRejectModal(true);
                            }}
                            className="w-full sm:w-auto px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-medium font-['Poppins'] transition-colors"
                            style={{
                              backgroundColor: "#D63B3B",
                              color: "#FFFFFF",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#B83232";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#D63B3B";
                            }}
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

        {/* Approve Promotion Modal */}
        <Dialog
          open={showPromotionApproveModal}
          onClose={() => setShowPromotionApproveModal(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: { xs: "16px", sm: "16px", md: "20px" },
              boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              border: "1px solid #AA855B",
              margin: { xs: "16px", sm: "24px" },
              maxWidth: { xs: "calc(100% - 32px)", sm: "500px" },
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
            }}
          >
            <span>Approve Promotional Material</span>
            <button
              onClick={() => setShowPromotionApproveModal(false)}
              className="p-1 rounded-full transition-all duration-200 hover:bg-gray-200"
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
            }}
          >
            <div className="space-y-4 mt-2">
              <TextField
                fullWidth
                type="date"
                label="Display Start Date"
                value={displayStartDate}
                onChange={(e) => setDisplayStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
                error={
                  !!displayStartDate &&
                  !!displayEndDate &&
                  new Date(displayStartDate) > new Date(displayEndDate)
                }
                helperText={
                  displayStartDate &&
                  displayEndDate &&
                  new Date(displayStartDate) > new Date(displayEndDate)
                    ? "Start date must be before end date"
                    : "Date when the promotion will start displaying"
                }
                style={{ fontFamily: "'Poppins', sans-serif" }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    backgroundColor: displayStartDate ? "#F5F5F5" : "#EDEDED",
                    fontFamily: "'Poppins', sans-serif",
                  },
                }}
              />
              <TextField
                fullWidth
                type="date"
                label="Display End Date"
                value={displayEndDate}
                onChange={(e) => setDisplayEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
                error={
                  !!displayStartDate &&
                  !!displayEndDate &&
                  new Date(displayStartDate) > new Date(displayEndDate)
                }
                helperText={
                  displayStartDate &&
                  displayEndDate &&
                  new Date(displayStartDate) > new Date(displayEndDate)
                    ? "End date must be after start date"
                    : "Date when the promotion will stop displaying"
                }
                style={{ fontFamily: "'Poppins', sans-serif" }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    backgroundColor: displayEndDate ? "#F5F5F5" : "#EDEDED",
                    fontFamily: "'Poppins', sans-serif",
                  },
                }}
              />

              {/* Duration Preview */}
              {displayStartDate &&
                displayEndDate &&
                new Date(displayStartDate) <= new Date(displayEndDate) && (
                  <div
                    className="p-3 rounded-lg"
                    style={{
                      backgroundColor: "#E8F5E9",
                      border: "1px solid #0F5648",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#0F5648",
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: 500,
                        mb: 0.5,
                      }}
                    >
                      Duration Preview
                    </Typography>
                    <Typography
                      variant="body2"
                      style={{
                        color: "#32332D",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: "0.875rem",
                      }}
                    >
                      {formatDate(displayStartDate)} -{" "}
                      {formatDate(displayEndDate)}
                    </Typography>
                    <Typography
                      variant="caption"
                      style={{
                        color: "#0F5648",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: "0.75rem",
                      }}
                    >
                      {(() => {
                        const duration = calculateDurationDays(
                          displayStartDate,
                          displayEndDate,
                        );
                        return duration !== null
                          ? `${duration} day${duration !== 1 ? "s" : ""}`
                          : "Invalid duration";
                      })()}
                    </Typography>
                  </div>
                )}

              <TextField
                fullWidth
                type="number"
                label="Display Sequence"
                value={displaySequence}
                onChange={(e) =>
                  setDisplaySequence(parseInt(e.target.value) || 0)
                }
                helperText="Lower number = higher priority (shown first)"
                required
                style={{ fontFamily: "'Poppins', sans-serif" }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    backgroundColor: displaySequence ? "#F5F5F5" : "#EDEDED",
                    fontFamily: "'Poppins', sans-serif",
                  },
                }}
              />
            </div>
          </DialogContent>
          <DialogActions
            sx={{
              padding: { xs: "12px 16px", sm: "16px 24px" },
              backgroundColor: "#FAEFE2",
              borderTop: "1px solid #AA855B",
              gap: "8px",
              flexDirection: { xs: "column-reverse", sm: "row" },
            }}
          >
            <button
              onClick={() => setShowPromotionApproveModal(false)}
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-sm sm:text-base"
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
              onClick={handleApprovePromotion}
              disabled={
                processing ||
                !displayStartDate ||
                !displayEndDate ||
                !displaySequence ||
                (!!displayStartDate &&
                  !!displayEndDate &&
                  new Date(displayStartDate) > new Date(displayEndDate))
              }
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-sm sm:text-base shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#0F5648" }}
              onMouseEnter={(e) => {
                if (
                  !processing &&
                  displayStartDate &&
                  displayEndDate &&
                  displaySequence &&
                  !(!!displayStartDate &&
                    !!displayEndDate &&
                    new Date(displayStartDate) > new Date(displayEndDate))
                ) {
                  e.currentTarget.style.backgroundColor = "#0A4538";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#0F5648";
              }}
            >
              {processing ? (
                <CircularProgress size={20} style={{ color: "white" }} />
              ) : (
                "Approve"
              )}
            </button>
          </DialogActions>
        </Dialog>

        {/* Reject Promotion Modal */}
        {showPromotionRejectModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowPromotionRejectModal(false);
                setRejectionReason("");
              }
            }}
          >
            <div
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6"
              style={{ maxHeight: "90vh", overflowY: "auto" }}
            >
              <div className="flex items-center justify-between">
                <h3
                  className="text-lg font-semibold"
                  style={{
                    color: "#32332D",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Reject Promotional Material
                </h3>
                <button
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => {
                    setShowPromotionRejectModal(false);
                    setRejectionReason("");
                  }}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{
                      color: "#32332D",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    Rejection Reason *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a reason for rejecting this promotional material..."
                    rows={6}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent resize-none transition-all duration-200"
                    style={{
                      borderColor: "#AA855B",
                      backgroundColor: rejectionReason ? "#F5F5F5" : "#EDEDED",
                      color: "#32332D",
                      fontSize: "14px",
                      fontFamily: "'Poppins', sans-serif",
                      outline: "none",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLTextAreaElement).style.backgroundColor =
                        "#F5F5F5";
                      (e.target as HTMLTextAreaElement).style.borderColor =
                        "#AA855B";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLTextAreaElement).style.backgroundColor =
                        rejectionReason ? "#F5F5F5" : "#EDEDED";
                      (e.target as HTMLTextAreaElement).style.borderColor =
                        "#AA855B";
                      (e.target as HTMLTextAreaElement).style.boxShadow =
                        "none";
                    }}
                    onFocus={(e) => {
                      (e.target as HTMLTextAreaElement).style.backgroundColor =
                        "#F5F5F5";
                      (e.target as HTMLTextAreaElement).style.borderColor =
                        "#AA855B";
                      (e.target as HTMLTextAreaElement).style.boxShadow =
                        "0 0 0 2px #F2742C";
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLTextAreaElement).style.backgroundColor =
                        rejectionReason ? "#F5F5F5" : "#EDEDED";
                      (e.target as HTMLTextAreaElement).style.borderColor =
                        "#AA855B";
                      (e.target as HTMLTextAreaElement).style.boxShadow =
                        "none";
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  className="px-4 py-2 rounded-lg font-medium border transition-all duration-200 hover:opacity-80"
                  style={{
                    borderColor: "#AA855B",
                    color: "#AA855B",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                  onClick={() => {
                    setShowPromotionRejectModal(false);
                    setRejectionReason("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:opacity-90"
                  style={{
                    backgroundColor: "#D63B3B",
                    color: "#FFFFFF",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                  onClick={handleRejectPromotion}
                  disabled={processing || !rejectionReason.trim()}
                >
                  {processing ? (
                    <span className="flex items-center gap-2">
                      <CircularProgress
                        size={16}
                        style={{ color: "#FFFFFF" }}
                      />
                      Processing...
                    </span>
                  ) : (
                    "Reject"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Promotion Display Settings Modal */}
        <Dialog
          open={showPromotionEditModal}
          onClose={() => setShowPromotionEditModal(false)}
          maxWidth="sm"
          fullWidth
          disableScrollLock={true}
          PaperProps={{
            sx: {
              borderRadius: { xs: "0", sm: "16px", md: "20px" },
              boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              border: "1px solid #AA855B",
              margin: { xs: "0", sm: "24px" },
              maxWidth: { xs: "100%", sm: "500px" },
              width: { xs: "100%", sm: "auto" },
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
              fontSize: { xs: "1rem", sm: "1.25rem" },
              fontFamily: "'Poppins', sans-serif",
              borderBottom: "1px solid #AA855B",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: { xs: "12px 16px", sm: "16px 24px" },
              flexShrink: 0,
            }}
          >
            <span>Edit Display Settings</span>
            <button
              onClick={() => setShowPromotionEditModal(false)}
              className="p-1 rounded-full transition-all duration-200 hover:bg-gray-200"
              style={{ color: "#AA855B" }}
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </DialogTitle>
          <DialogContent
            sx={{
              padding: { xs: "16px", sm: "24px" },
              backgroundColor: "#F5F5F5",
              flex: "1 1 auto",
              overflowY: "auto",
              minHeight: 0,
            }}
          >
            <div className="space-y-4 mt-2">
              <TextField
                fullWidth
                type="date"
                label="Display Start Date"
                value={displayStartDate}
                onChange={(e) => setDisplayStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                error={
                  !!displayStartDate &&
                  !!displayEndDate &&
                  new Date(displayStartDate) > new Date(displayEndDate)
                }
                helperText={
                  displayStartDate &&
                  displayEndDate &&
                  new Date(displayStartDate) > new Date(displayEndDate)
                    ? "Start date must be before end date"
                    : "Date when the promotion will start displaying"
                }
                style={{ fontFamily: "'Poppins', sans-serif" }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    backgroundColor: displayStartDate ? "#F5F5F5" : "#EDEDED",
                    fontFamily: "'Poppins', sans-serif",
                  },
                }}
              />
              <TextField
                fullWidth
                type="date"
                label="Display End Date"
                value={displayEndDate}
                onChange={(e) => setDisplayEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                error={
                  !!displayStartDate &&
                  !!displayEndDate &&
                  new Date(displayStartDate) > new Date(displayEndDate)
                }
                helperText={
                  displayStartDate &&
                  displayEndDate &&
                  new Date(displayStartDate) > new Date(displayEndDate)
                    ? "End date must be after start date"
                    : "Date when the promotion will stop displaying"
                }
                style={{ fontFamily: "'Poppins', sans-serif" }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    backgroundColor: displayEndDate ? "#F5F5F5" : "#EDEDED",
                    fontFamily: "'Poppins', sans-serif",
                  },
                }}
              />

              {/* Duration Preview */}
              {displayStartDate &&
                displayEndDate &&
                new Date(displayStartDate) <= new Date(displayEndDate) && (
                  <div
                    className="p-3 rounded-lg"
                    style={{
                      backgroundColor: "#E8F5E9",
                      border: "1px solid #0F5648",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#0F5648",
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: 500,
                        mb: 0.5,
                      }}
                    >
                      Duration Preview
                    </Typography>
                    <Typography
                      variant="body2"
                      style={{
                        color: "#32332D",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: "0.875rem",
                      }}
                    >
                      {formatDate(displayStartDate)} -{" "}
                      {formatDate(displayEndDate)}
                    </Typography>
                    <Typography
                      variant="caption"
                      style={{
                        color: "#0F5648",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: "0.75rem",
                      }}
                    >
                      {(() => {
                        const duration = calculateDurationDays(
                          displayStartDate,
                          displayEndDate,
                        );
                        return duration !== null
                          ? `${duration} day${duration !== 1 ? "s" : ""}`
                          : "Invalid duration";
                      })()}
                    </Typography>
                  </div>
                )}

              <TextField
                fullWidth
                type="number"
                label="Display Sequence"
                value={displaySequence}
                onChange={(e) =>
                  setDisplaySequence(parseInt(e.target.value) || 0)
                }
                helperText="Lower number = higher priority (shown first)"
                style={{ fontFamily: "'Poppins', sans-serif" }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    backgroundColor: displaySequence ? "#F5F5F5" : "#EDEDED",
                    fontFamily: "'Poppins', sans-serif",
                  },
                }}
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
              onClick={() => setShowPromotionEditModal(false)}
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
              onClick={handleUpdatePromotionDisplay}
              disabled={
                processing ||
                (!!displayStartDate &&
                  !!displayEndDate &&
                  new Date(displayStartDate) > new Date(displayEndDate))
              }
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "#0F5648",
                color: "white",
                fontFamily: "'Poppins', sans-serif",
              }}
              onMouseEnter={(e) => {
                if (!processing && !e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = "#0A4538";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#0F5648";
              }}
            >
              {processing ? (
                <CircularProgress size={20} style={{ color: "white" }} />
              ) : (
                "Save Changes"
              )}
            </button>
          </DialogActions>
        </Dialog>

        {/* Edit Specializations Modal */}
        <Dialog
          open={showEditSpecializationsModal}
          onClose={() => setShowEditSpecializationsModal(false)}
          maxWidth="md"
          fullWidth
          disableScrollLock={true}
          PaperProps={{
            sx: {
              borderRadius: { xs: "0", sm: "16px", md: "20px" },
              boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              border: "1px solid #AA855B",
              margin: { xs: "0", sm: "24px" },
              maxWidth: { xs: "100%", sm: "600px", md: "700px" },
              width: { xs: "100%", sm: "auto" },
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
              fontSize: { xs: "1rem", sm: "1.25rem" },
              fontFamily: "'Poppins', sans-serif",
              borderBottom: "1px solid #AA855B",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: { xs: "12px 16px", sm: "16px 24px" },
              flexShrink: 0,
            }}
          >
            <span>Edit Specializations</span>
            <button
              onClick={() => {
                setShowEditSpecializationsModal(false);
                setNewSpecializations([]);
              }}
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
            <div className="mt-2 sm:mt-4">
              <Typography
                variant="subtitle2"
                sx={{
                  color: "#32332D",
                  fontWeight: 600,
                  fontFamily: "'Poppins', sans-serif",
                  mb: { xs: 1, sm: 1.5 },
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                }}
              >
                Specializations
              </Typography>
              <Autocomplete
                multiple
                freeSolo
                options={getSpecializationTags()}
                value={newSpecializations}
                onChange={(_, newValue) => {
                  // Handle both string (from freeSolo) and existing array values
                  const processedValue = newValue
                    .map((v) => (typeof v === "string" ? v.trim() : v))
                    .filter((v) => v);
                  setNewSpecializations(processedValue);
                }}
                onInputChange={(_, newInputValue, reason) => {
                  // Handle Enter key or comma to add custom tag
                  if (
                    reason === "input" &&
                    (newInputValue.endsWith(",") ||
                      newInputValue.endsWith("\n"))
                  ) {
                    const tag = newInputValue.slice(0, -1).trim();
                    if (tag && !newSpecializations.includes(tag)) {
                      setNewSpecializations([...newSpecializations, tag]);
                    }
                  }
                }}
                renderTags={(value: readonly string[], getTagProps) =>
                  value.map((option: string, index: number) => (
                    <Chip
                      variant="filled"
                      size="small"
                      label={option}
                      {...getTagProps({ index })}
                      sx={{
                        backgroundColor: "#E8F4F8",
                        color: "#326586",
                        border: "1px solid #C4D8E4",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      }}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Type and press Enter"
                    style={{ fontFamily: "'Poppins', sans-serif" }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                        backgroundColor: "#F5F5F5",
                        fontFamily: "'Poppins', sans-serif",
                        "&:hover": {
                          backgroundColor: "#F5F5F5",
                        },
                        "&.Mui-focused": {
                          backgroundColor: "#F5F5F5",
                          boxShadow: "0 0 0 2px #F2742C",
                        },
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#AA855B",
                          borderWidth: "1px",
                        },
                      },
                      "& .MuiInputLabel-root": {
                        color: "#32332D",
                        fontWeight: 500,
                        fontFamily: "'Poppins', sans-serif",
                      },
                    }}
                  />
                )}
              />
              {/* Suggestions Section */}
              <div className="mt-2 sm:mt-3">
                <div
                  className="text-[10px] sm:text-xs mb-1 sm:mb-1.5 font-['Poppins']"
                  style={{ color: "#AA855B" }}
                >
                  Suggestions
                </div>
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {getSpecializationTags()
                    .filter((s) => {
                      const currentSpecializations = (
                        newSpecializations || []
                      ).map((x: string) => x.toLowerCase().trim());
                      const suggestionNormalized = s.toLowerCase().trim();
                      return !currentSpecializations.includes(
                        suggestionNormalized,
                      );
                    })
                    .map((s) => (
                      <Button
                        key={s}
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          const normalized = s.trim();
                          if (
                            normalized &&
                            !newSpecializations.includes(normalized)
                          ) {
                            setNewSpecializations([
                              ...newSpecializations,
                              normalized,
                            ]);
                          }
                        }}
                        sx={{
                          textTransform: "none",
                          m: 0.25,
                          fontSize: { xs: "0.625rem", sm: "0.75rem" },
                          fontFamily: "'Poppins', sans-serif",
                          borderRadius: "8px",
                          borderColor: "#AA855B",
                          color: "#32332D",
                          "&:hover": {
                            borderColor: "#8B6F4A",
                            backgroundColor: "#FAEFE2",
                          },
                        }}
                      >
                        {s}
                      </Button>
                    ))}
                </div>
              </div>
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
              onClick={() => {
                setShowEditSpecializationsModal(false);
                setNewSpecializations([]);
              }}
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
              onClick={handleEditSpecializations}
              disabled={processing || newSpecializations.length === 0}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-white rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-xs sm:text-sm shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor:
                  processing || newSpecializations.length === 0
                    ? "#D4C4A8"
                    : "#0F5648",
                color: "white",
                fontFamily: "'Poppins', sans-serif",
              }}
              onMouseEnter={(e) => {
                if (
                  !processing &&
                  newSpecializations.length > 0 &&
                  !e.currentTarget.disabled
                ) {
                  e.currentTarget.style.backgroundColor = "#0A4538";
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor =
                    processing || newSpecializations.length === 0
                      ? "#D4C4A8"
                      : "#0F5648";
                }
              }}
            >
              {processing ? (
                <CircularProgress size={20} style={{ color: "white" }} />
              ) : (
                "Save Changes"
              )}
            </button>
          </DialogActions>
        </Dialog>

        {/* Archive Profile Confirmation Modal */}
        {showArchiveModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowArchiveModal(null);
              }
            }}
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3
                  className="text-lg font-semibold font-['Poppins']"
                  style={{ color: "#32332D" }}
                >
                  Archive Professional Profile
                </h3>
                <button
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowArchiveModal(null)}
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
                      {showArchiveModal.business_name}
                    </h4>
                    {showArchiveModal.city && showArchiveModal.state && (
                      <p
                        className="text-xs font-['Poppins']"
                        style={{ color: "#64635E" }}
                      >
                        {showArchiveModal.city}, {showArchiveModal.state}
                      </p>
                    )}
                  </div>
                </div>
                <div
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: "#FFF4E6",
                    border: "1px solid #F2742C",
                  }}
                >
                  <p
                    className="text-sm font-medium mb-2 font-['Poppins']"
                    style={{ color: "#F2742C" }}
                  >
                    ⚠️ Warning: This will hide the profile from the public
                    directory
                  </p>
                  <p
                    className="text-sm font-['Poppins']"
                    style={{ color: "#64635E" }}
                  >
                    Archiving this profile will remove it from the public
                    directory. The professional will be notified and can still
                    access their dashboard. You can unarchive it later if
                    needed.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="confirm-archive-profile"
                    className="w-4 h-4 rounded"
                    style={{ accentColor: "#F2742C" }}
                  />
                  <label
                    htmlFor="confirm-archive-profile"
                    className="text-sm font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    I understand this will hide the profile from the public
                    directory
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-lg font-medium border transition-all duration-200 font-['Poppins']"
                  style={{ borderColor: "#AA855B", color: "#AA855B" }}
                  onClick={() => setShowArchiveModal(null)}
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
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-200 font-['Poppins'] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#F2742C", color: "#FFFFFF" }}
                  onClick={confirmArchiveProfile}
                  disabled={processing}
                  onMouseEnter={(e) => {
                    if (!processing) {
                      e.currentTarget.style.backgroundColor = "#E55A1F";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#F2742C";
                  }}
                >
                  {processing ? (
                    <span className="flex items-center gap-2">
                      <CircularProgress
                        size={16}
                        style={{ color: "#FFFFFF" }}
                      />
                      Archiving...
                    </span>
                  ) : (
                    "Archive Profile"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div
      className="min-h-screen pt-16 sm:pt-20 py-6 sm:py-8 font-['Poppins']"
      style={{ backgroundColor: "#FAEFE2" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-10">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <h1
                className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2"
                style={{ color: "#32332D" }}
              >
                Professional Services Coordinator
              </h1>
            </div>
          </div>
          <p className="text-sm sm:text-base" style={{ color: "#AA855B" }}>
            Manage professional applications, directory listings, and
            promotional materials
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-4 sm:mb-6">
          <div
            className="grid grid-cols-2 sm:flex sm:space-x-1 gap-1.5 sm:gap-1 p-1.5 sm:p-2 rounded-lg w-full sm:w-fit"
            style={{ backgroundColor: "#FCF9F8" }}
          >
            {[
              { id: "overview", label: "Overview" },
              { id: "applications", label: "Applications" },
              { id: "directory", label: "Directory" },
              { id: "promotions", label: "Promotional Materials" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as ActiveTab);
                  setSearchParams({ tab: tab.id });
                }}
                className={`flex items-center justify-center space-x-1.5 sm:space-x-2 py-1.5 sm:py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
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
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && renderOverviewTab()}
        {activeTab === "applications" && renderApplicationsTab()}
        {activeTab === "directory" && renderDirectoryTab()}
        {activeTab === "promotions" && renderPromotionsTab()}
      </div>

      {renderModals()}
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

export default CoordinatorDashboard;
