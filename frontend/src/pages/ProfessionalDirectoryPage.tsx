// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: ProfessionalDirectoryPage.tsx
// Description: To provide interface for parent users to browse and search for professional services
// First Written on: Monday, 13-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state, lifecycle, and callbacks
import React, { useState, useEffect, useCallback } from "react";
// Import React Router hooks for navigation and URL parameters
import { useParams, useNavigate } from "react-router-dom";
// Import lucide-react icons for UI elements
import {
  Search,
  Filter,
  MapPin,
  Heart,
  Phone,
  Mail,
  Globe,
  Shield,
  Bookmark,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  HeartHandshake,
} from "lucide-react";
// Import API functions for professional directory operations
import {
  getPublicProfessionals,
  getPublicProfessionalDetail,
  getPublicPromotionalBanners,
  saveProfessional,
  unsaveProfessional,
  getSavedProfessionalsList,
} from "../services/api";
// Import toast notification components
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Import specialization tags constant
import { SPECIALIZATION_TAGS } from "../constants/specializationTags";

/**
 * Constants for filter options
 */

/**
 * Developmental stage options for filtering professionals
 */
const DEVELOPMENTAL_STAGES = [
  { value: "newborn", label: "Newborn (0-2 months)" },
  { value: "infant", label: "Infant (2-12 months)" },
  { value: "toddler", label: "Toddler (1-3 years)" },
  { value: "early_childhood", label: "Early Childhood (3-5 years)" },
  { value: "middle_childhood", label: "Middle Childhood (6-12 years)" },
];

/**
 * Language options for filtering professionals
 */
const LANGUAGES = [
  { value: "English", label: "English" },
  { value: "Malay", label: "Malay" },
  { value: "Mandarin", label: "Mandarin" },
  { value: "Tamil", label: "Tamil" },
  { value: "Cantonese", label: "Cantonese" },
  { value: "Hokkien", label: "Hokkien" },
];

/**
 * Availability options for filtering professionals
 */
const AVAILABILITY_OPTIONS = [
  { value: "weekdays", label: "Weekdays (Monday to Friday)" },
  { value: "weekends", label: "Weekends (Saturday and Sunday)" },
  { value: "evenings", label: "Evenings (after 6 PM)" },
  { value: "flexible", label: "Flexible Scheduling" },
];

/**
 * Service category options for filtering professionals
 */
const SERVICE_CATEGORIES = [
  { value: "therapy", label: "Therapy" },
  { value: "counseling", label: "Counseling" },
  { value: "assessment", label: "Assessment" },
  { value: "coaching", label: "Coaching" },
  { value: "consultation", label: "Consultation" },
  { value: "workshops", label: "Workshops" },
  { value: "support_groups", label: "Support Groups" },
];

/**
 * Service type options for filtering professionals
 */
const SERVICE_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "group", label: "Group" },
  { value: "family", label: "Family" },
  { value: "online", label: "Online" },
  { value: "in_person", label: "In-Person" },
  { value: "home_visits", label: "Home Visits" },
  { value: "hybrid", label: "Hybrid" },
];

/**
 * List of Malaysian states for location filtering
 */
const MALAYSIAN_STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Kuala Lumpur",
  "Labuan",
  "Malacca",
  "Negeri Sembilan",
  "Pahang",
  "Penang",
  "Perak",
  "Perlis",
  "Putrajaya",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
];

/**
 * Professional interface
 * Defines the structure of a professional profile
 */
interface Professional {
  professional_id: number;
  business_name: string;
  professional_type: string | null;
  years_experience: number | null;
  qualifications: string;
  certifications: string | null;
  specializations: string[];
  target_developmental_stages: string[];
  languages: string[];
  availability: string[];
  address_line: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  google_maps_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  bio: string | null;
  profile_image_url: string | null;
  services: Service[];
}

/**
 * Service interface
 * Defines the structure of a professional service
 */
interface Service {
  service_id: number;
  service_name: string;
  service_description: string | null;
  service_category: string | null;
  service_type: string | null;
  price_range: string | null;
}

/**
 * PromotionalBanner interface
 * Defines the structure of a promotional banner
 */
interface PromotionalBanner {
  material_id: number;
  profile_id: number;
  content_type: string;
  title: string;
  description: string | null;
  file_path: string | null;
  display_start_date: string | null;
  display_end_date: string | null;
  display_sequence: number | null;
  business_name: string;
}

interface Filters {
  search: string;
  city: string;
  state: string;
  specialization: string;
  developmental_stage: string;
  language: string;
  availability: string;
  service_category: string;
  service_type: string;
  price_range: string;
}

const ProfessionalDirectoryPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [selectedProfessional, setSelectedProfessional] =
    useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [savedFilter, setSavedFilter] = useState(false);
  const [recentlyViewedFilter, setRecentlyViewedFilter] = useState(false);
  const [modalImageError, setModalImageError] = useState(false);
  const [savedProfessionalIds, setSavedProfessionalIds] = useState<number[]>(
    [],
  );
  const [loadingSaved, setLoadingSaved] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    search: "",
    city: "",
    state: "",
    specialization: "",
    developmental_stage: "",
    language: "",
    availability: "",
    service_category: "",
    service_type: "",
    price_range: "",
  });

  // Focus states for chevron icons
  const [stateFilterFocused, setStateFilterFocused] = useState<boolean>(false);
  const [specializationFilterFocused, setSpecializationFilterFocused] =
    useState<boolean>(false);
  const [developmentalStageFilterFocused, setDevelopmentalStageFilterFocused] =
    useState<boolean>(false);
  const [languageFilterFocused, setLanguageFilterFocused] =
    useState<boolean>(false);
  const [availabilityFilterFocused, setAvailabilityFilterFocused] =
    useState<boolean>(false);
  const [serviceCategoryFilterFocused, setServiceCategoryFilterFocused] =
    useState<boolean>(false);
  const [serviceTypeFilterFocused, setServiceTypeFilterFocused] =
    useState<boolean>(false);

  // localStorage keys (for recently viewed only - saved professionals now use database)
  const RECENTLY_VIEWED_KEY = "recently_viewed_professionals";

  // Get recently viewed professionals from localStorage
  const getRecentlyViewed = (): number[] => {
    try {
      const viewed = localStorage.getItem(RECENTLY_VIEWED_KEY);
      return viewed ? JSON.parse(viewed) : [];
    } catch {
      return [];
    }
  };

  // Save/unsave professional using API
  const toggleSaved = async (professionalId: number) => {
    try {
      setLoadingSaved(true);
      const isCurrentlySaved = savedProfessionalIds.includes(professionalId);

      if (isCurrentlySaved) {
        // Unsave
        await unsaveProfessional(professionalId);
        setSavedProfessionalIds((prev) =>
          prev.filter((id) => id !== professionalId),
        );
        toast.success("Removed from saved professionals");
      } else {
        // Save
        await saveProfessional(professionalId);
        setSavedProfessionalIds((prev) => [...prev, professionalId]);
        toast.success("Saved to your list");
      }

      // Trigger re-render if saved filter is active
      if (savedFilter) {
        loadProfessionals();
      }
    } catch (error: any) {
      console.error("Error toggling saved professional:", error);
      toast.error(error.message || "Failed to update saved professionals");
    } finally {
      setLoadingSaved(false);
    }
  };

  // Add to recently viewed
  const addToRecentlyViewed = (professionalId: number) => {
    const viewed = getRecentlyViewed();
    const index = viewed.indexOf(professionalId);
    if (index > -1) {
      viewed.splice(index, 1);
    }
    viewed.unshift(professionalId);
    // Keep only last 5
    const limited = viewed.slice(0, 5);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(limited));
  };

  // Check if professional is saved
  const isSaved = (professionalId: number): boolean => {
    return savedProfessionalIds.includes(professionalId);
  };

  // Load saved professionals from API
  const loadSavedProfessionals = useCallback(async () => {
    try {
      const response = await getSavedProfessionalsList();
      setSavedProfessionalIds(response.saved_professional_ids || []);
    } catch (error: any) {
      console.error("Error loading saved professionals:", error);
      // Don't show error toast for this - it's okay if user is not logged in
      // Only logged-in parent users can save professionals
    }
  }, []);

  // Load promotional banners
  const loadBanners = useCallback(async () => {
    try {
      setBannersLoading(true);
      const response = await getPublicPromotionalBanners(10);
      setBanners(response.banners || []);
    } catch (error: any) {
      console.error("Error loading banners:", error);
      toast.error("Failed to load promotional banners");
    } finally {
      setBannersLoading(false);
    }
  }, []);

  // Load professionals
  const loadProfessionals = useCallback(async () => {
    try {
      setLoading(true);

      // Build filter object
      const filterParams: any = {
        page,
        limit: 20,
        sort: "name",
      };

      // Apply filters
      if (filters.search) filterParams.search = filters.search;
      if (filters.city) filterParams.city = filters.city;
      if (filters.state) filterParams.state = filters.state;
      if (filters.specialization)
        filterParams.specialization = filters.specialization;
      if (filters.developmental_stage)
        filterParams.developmental_stage = filters.developmental_stage;
      if (filters.language) filterParams.language = filters.language;
      if (filters.availability)
        filterParams.availability = filters.availability;
      if (filters.service_category)
        filterParams.service_category = filters.service_category;
      if (filters.service_type)
        filterParams.service_type = filters.service_type;
      if (filters.price_range) filterParams.price_range = filters.price_range;

      const response = await getPublicProfessionals(filterParams);

      let professionalsList = response.professionals || [];

      // Apply saved filter
      if (savedFilter) {
        professionalsList = professionalsList.filter((p: Professional) =>
          savedProfessionalIds.includes(p.professional_id),
        );
      }

      // Apply recently viewed filter
      if (recentlyViewedFilter) {
        const viewed = getRecentlyViewed();
        professionalsList = professionalsList.filter((p: Professional) =>
          viewed.includes(p.professional_id),
        );
      }

      setProfessionals(professionalsList);
      setTotal(response.total || 0);
      setTotalPages(response.total_pages || 1);
    } catch (error: any) {
      console.error("Error loading professionals:", error);
      toast.error("Failed to load professionals");
      setProfessionals([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page, savedFilter, recentlyViewedFilter, savedProfessionalIds]);

  // Load professional detail
  const loadProfessionalDetail = async (professionalId: number) => {
    try {
      const response = await getPublicProfessionalDetail(professionalId);
      setSelectedProfessional(response.profile);
      setModalImageError(false); // Reset image error when loading new professional
      addToRecentlyViewed(professionalId);
    } catch (error: any) {
      console.error("Error loading professional detail:", error);
      toast.error("Failed to load professional details");
    }
  };

  // Auto-rotate banners
  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBanner((prev) => (prev + 1) % banners.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [banners.length]);

  // Load data on mount and filter changes
  useEffect(() => {
    loadBanners();
    loadSavedProfessionals(); // Load saved professionals from database
  }, [loadBanners, loadSavedProfessionals]);

  useEffect(() => {
    loadProfessionals();
  }, [loadProfessionals]);

  // Handle URL parameter for professional ID (open modal automatically)
  useEffect(() => {
    if (id) {
      const professionalId = parseInt(id, 10);
      if (!isNaN(professionalId)) {
        loadProfessionalDetail(professionalId);
      }
    }
  }, [id, loadProfessionalDetail]);

  // Clear filters
  const clearFilters = () => {
    setFilters({
      search: "",
      city: "",
      state: "",
      specialization: "",
      developmental_stage: "",
      language: "",
      availability: "",
      service_category: "",
      service_type: "",
      price_range: "",
    });
    setSavedFilter(false);
    setRecentlyViewedFilter(false);
    setPage(1);
  };

  // Handle filter toggle
  const handleSavedToggle = () => {
    setSavedFilter(!savedFilter);
    setRecentlyViewedFilter(false);
    setPage(1);
  };

  const handleRecentlyViewedToggle = () => {
    setRecentlyViewedFilter(!recentlyViewedFilter);
    setSavedFilter(false);
    setPage(1);
  };

  // Render promotional banner carousel
  const renderPromoBanner = () => {
    if (bannersLoading || banners.length === 0) return null;

    return (
      <div
        className="relative rounded-lg sm:rounded-xl overflow-hidden mb-6 sm:mb-8"
        style={{
          border: "1px solid #F0DCC9",
          backgroundColor: "#F5F5F5",
        }}
      >
        <div className="relative h-48 sm:h-64 md:h-80">
          {banners.map((banner, index) => (
            <div
              key={banner.material_id}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentBanner ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="relative h-full">
                {banner.file_path && (
                  <img
                    src={banner.file_path}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black bg-opacity-40" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white max-w-2xl px-4 sm:px-6">
                    <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">
                      {banner.title}
                    </h2>
                    <p className="text-sm sm:text-base md:text-lg mb-0.5 sm:mb-1">
                      {banner.business_name}
                    </p>
                    {banner.description && (
                      <p className="text-xs sm:text-sm opacity-90 mb-3 sm:mb-4">
                        {banner.description}
                      </p>
                    )}
                    <button
                      onClick={() => loadProfessionalDetail(banner.profile_id)}
                      className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: "#F2742C",
                        color: "#FFFFFF",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#E55A1F";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#F2742C";
                      }}
                    >
                      Learn More
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Navigation arrows */}
          {banners.length > 1 && (
            <>
              <button
                onClick={() =>
                  setCurrentBanner(
                    (prev) => (prev - 1 + banners.length) % banners.length,
                  )
                }
                className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 p-1.5 sm:p-2 rounded-full transition-all"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  color: "#FFFFFF",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.2)";
                }}
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </button>
              <button
                onClick={() =>
                  setCurrentBanner((prev) => (prev + 1) % banners.length)
                }
                className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 p-1.5 sm:p-2 rounded-full transition-all"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  color: "#FFFFFF",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.2)";
                }}
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </button>
            </>
          )}
        </div>

        {/* Dots indicator */}
        {banners.length > 1 && (
          <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-1.5 sm:space-x-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentBanner(index)}
                className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${
                  index === currentBanner
                    ? "bg-white"
                    : "bg-white bg-opacity-50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render filters panel
  const renderFilters = () => (
    <div
      className={`${showFilters ? "block" : "hidden"} lg:block rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6`}
      style={{
        backgroundColor: "#F5F5F5",
        border: "1px solid #AA855B",
      }}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3
          className="text-base sm:text-lg font-semibold"
          style={{ color: "#32332D", fontFamily: "'Poppins', sans-serif" }}
        >
          Filters
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearFilters}
            className="text-xs sm:text-sm font-medium transition-colors"
            style={{ color: "#F2742C" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#E55A1F";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#F2742C";
            }}
          >
            Clear All
          </button>
          <button
            onClick={() => setShowFilters(false)}
            className="lg:hidden transition-colors"
            style={{ color: "#AA855B" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#8B6F4A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#AA855B";
            }}
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {/* Location Filters */}
        <div>
          <label
            className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
            style={{ color: "#32332D", fontFamily: "'Poppins', sans-serif" }}
          >
            City
          </label>
          <input
            type="text"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            placeholder="Search city..."
            className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm"
            style={{
              backgroundColor: "#EDEDED",
              border: "1px solid #AA855B",
              color: "#32332D",
              fontFamily: "'Poppins', sans-serif",
            }}
          />
        </div>

        <div>
          <label
            className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
            style={{ color: "#32332D", fontFamily: "'Poppins', sans-serif" }}
          >
            State
          </label>
          <div className="relative">
            <select
              value={filters.state}
              onChange={(e) =>
                setFilters({ ...filters, state: e.target.value })
              }
              onFocus={() => setStateFilterFocused(true)}
              onBlur={() => setStateFilterFocused(false)}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-7 sm:pr-8 rounded-lg text-xs sm:text-sm"
              style={{
                backgroundColor: "#EDEDED",
                border: "1px solid #AA855B",
                color: "#32332D",
                fontFamily: "'Poppins', sans-serif",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                backgroundImage: "none",
              }}
            >
              <option value="">All States</option>
              {MALAYSIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            {stateFilterFocused ? (
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
        </div>

        {/* Profile-Level Filters */}
        <div>
          <label
            className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
            style={{ color: "#32332D", fontFamily: "'Poppins', sans-serif" }}
          >
            Specialization
          </label>
          <div className="relative">
            <select
              value={filters.specialization}
              onChange={(e) =>
                setFilters({ ...filters, specialization: e.target.value })
              }
              onFocus={() => setSpecializationFilterFocused(true)}
              onBlur={() => setSpecializationFilterFocused(false)}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-7 sm:pr-8 rounded-lg text-xs sm:text-sm"
              style={{
                backgroundColor: "#EDEDED",
                border: "1px solid #AA855B",
                color: "#32332D",
                fontFamily: "'Poppins', sans-serif",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                backgroundImage: "none",
              }}
            >
              <option value="">All Specializations</option>
              {SPECIALIZATION_TAGS.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
            {specializationFilterFocused ? (
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
        </div>

        <div>
          <label
            className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
            style={{ color: "#32332D", fontFamily: "'Poppins', sans-serif" }}
          >
            Developmental Stage
          </label>
          <div className="relative">
            <select
              value={filters.developmental_stage}
              onChange={(e) =>
                setFilters({ ...filters, developmental_stage: e.target.value })
              }
              onFocus={() => setDevelopmentalStageFilterFocused(true)}
              onBlur={() => setDevelopmentalStageFilterFocused(false)}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-7 sm:pr-8 rounded-lg text-xs sm:text-sm"
              style={{
                backgroundColor: "#EDEDED",
                border: "1px solid #AA855B",
                color: "#32332D",
                fontFamily: "'Poppins', sans-serif",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                backgroundImage: "none",
              }}
            >
              <option value="">All Ages</option>
              {DEVELOPMENTAL_STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
            {developmentalStageFilterFocused ? (
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
        </div>

        <div>
          <label
            className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
            style={{ color: "#32332D", fontFamily: "'Poppins', sans-serif" }}
          >
            Language
          </label>
          <div className="relative">
            <select
              value={filters.language}
              onChange={(e) =>
                setFilters({ ...filters, language: e.target.value })
              }
              onFocus={() => setLanguageFilterFocused(true)}
              onBlur={() => setLanguageFilterFocused(false)}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-7 sm:pr-8 rounded-lg text-xs sm:text-sm"
              style={{
                backgroundColor: "#EDEDED",
                border: "1px solid #AA855B",
                color: "#32332D",
                fontFamily: "'Poppins', sans-serif",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                backgroundImage: "none",
              }}
            >
              <option value="">All Languages</option>
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
            {languageFilterFocused ? (
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
        </div>

        <div>
          <label
            className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
            style={{ color: "#32332D", fontFamily: "'Poppins', sans-serif" }}
          >
            Availability
          </label>
          <div className="relative">
            <select
              value={filters.availability}
              onChange={(e) =>
                setFilters({ ...filters, availability: e.target.value })
              }
              onFocus={() => setAvailabilityFilterFocused(true)}
              onBlur={() => setAvailabilityFilterFocused(false)}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-7 sm:pr-8 rounded-lg text-xs sm:text-sm"
              style={{
                backgroundColor: "#EDEDED",
                border: "1px solid #AA855B",
                color: "#32332D",
                fontFamily: "'Poppins', sans-serif",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                backgroundImage: "none",
              }}
            >
              <option value="">Any Time</option>
              {AVAILABILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {availabilityFilterFocused ? (
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
        </div>

        {/* Service-Level Filters */}
        <div>
          <label
            className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
            style={{ color: "#32332D", fontFamily: "'Poppins', sans-serif" }}
          >
            Service Category
          </label>
          <div className="relative">
            <select
              value={filters.service_category}
              onChange={(e) =>
                setFilters({ ...filters, service_category: e.target.value })
              }
              onFocus={() => setServiceCategoryFilterFocused(true)}
              onBlur={() => setServiceCategoryFilterFocused(false)}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-7 sm:pr-8 rounded-lg text-xs sm:text-sm"
              style={{
                backgroundColor: "#EDEDED",
                border: "1px solid #AA855B",
                color: "#32332D",
                fontFamily: "'Poppins', sans-serif",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                backgroundImage: "none",
              }}
            >
              <option value="">All Categories</option>
              {SERVICE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            {serviceCategoryFilterFocused ? (
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
        </div>

        <div>
          <label
            className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
            style={{ color: "#32332D", fontFamily: "'Poppins', sans-serif" }}
          >
            Service Type
          </label>
          <div className="relative">
            <select
              value={filters.service_type}
              onChange={(e) =>
                setFilters({ ...filters, service_type: e.target.value })
              }
              onFocus={() => setServiceTypeFilterFocused(true)}
              onBlur={() => setServiceTypeFilterFocused(false)}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-7 sm:pr-8 rounded-lg text-xs sm:text-sm"
              style={{
                backgroundColor: "#EDEDED",
                border: "1px solid #AA855B",
                color: "#32332D",
                fontFamily: "'Poppins', sans-serif",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                backgroundImage: "none",
              }}
            >
              <option value="">All Types</option>
              {SERVICE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {serviceTypeFilterFocused ? (
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
        </div>
      </div>
    </div>
  );

  // Format professional type for display
  const formatProfessionalType = (type: string | null) => {
    if (!type) return null;
    return type
      .split("_")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  // Helper functions for text formatting
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
      <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 mt-0.5 sm:mt-1">
        {items.map((item, idx) => (
          <li
            key={idx}
            className="text-xs sm:text-sm"
            style={{ color: "#32332D", fontFamily: "'Poppins', sans-serif" }}
          >
            {item}
          </li>
        ))}
      </ul>
    );
  };

  // Render professional card
  const renderProfessionalCard = (professional: Professional) => {
    const saved = isSaved(professional.professional_id);
    const location =
      [professional.city, professional.state, professional.country]
        .filter(Boolean)
        .join(", ") || "Location not specified";

    return (
      <div
        key={professional.professional_id}
        className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden border flex flex-col h-full relative transition-all duration-200 hover:shadow-lg"
        style={{ borderColor: "#AA855B" }}
      >
        {/* Profile Image - Full width, no padding */}
        {professional.profile_image_url ? (
          <div className="w-full h-40 sm:h-48 flex-shrink-0 relative">
            <img
              src={professional.profile_image_url}
              alt={professional.business_name}
              className="w-full h-40 sm:h-48 object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div class="w-full h-48 flex items-center justify-center" style="background-color: #EDEDED;">
                      <svg class="w-16 h-16" style="color: #AA855B;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                    </div>
                  `;
                }
              }}
            />
            {/* Save button */}
            <button
              onClick={() => toggleSaved(professional.professional_id)}
              disabled={loadingSaved}
              className="absolute top-2 sm:top-3 right-2 sm:right-3 p-1.5 sm:p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: saved ? "#F2742C" : "rgba(255, 255, 255, 0.9)",
                color: saved ? "#FFFFFF" : "#AA855B",
              }}
              onMouseEnter={(e) => {
                if (!saved && !loadingSaved) {
                  e.currentTarget.style.backgroundColor = "#FDF2E8";
                }
              }}
              onMouseLeave={(e) => {
                if (!saved && !loadingSaved) {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.9)";
                }
              }}
            >
              <Heart
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${saved ? "fill-current" : ""}`}
              />
            </button>
            {/* Verified badge */}
            <div
              className="absolute top-2 sm:top-3 left-2 sm:left-3 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium flex items-center space-x-0.5 sm:space-x-1"
              style={{
                backgroundColor: "#E8F5E9",
                color: "#0F5648",
              }}
            >
              <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>Verified</span>
            </div>
          </div>
        ) : (
          <div
            className="w-full h-40 sm:h-48 flex-shrink-0 relative"
            style={{ backgroundColor: "#EDEDED" }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <HeartHandshake
                className="w-12 h-12 sm:w-16 sm:h-16"
                style={{ color: "#AA855B" }}
              />
            </div>
            {/* Save button */}
            <button
              onClick={() => toggleSaved(professional.professional_id)}
              disabled={loadingSaved}
              className="absolute top-2 sm:top-3 right-2 sm:right-3 p-1.5 sm:p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: saved ? "#F2742C" : "rgba(255, 255, 255, 0.9)",
                color: saved ? "#FFFFFF" : "#AA855B",
              }}
              onMouseEnter={(e) => {
                if (!saved && !loadingSaved) {
                  e.currentTarget.style.backgroundColor = "#FDF2E8";
                }
              }}
              onMouseLeave={(e) => {
                if (!saved && !loadingSaved) {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.9)";
                }
              }}
            >
              <Heart
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${saved ? "fill-current" : ""}`}
              />
            </button>
            {/* Verified badge */}
            <div
              className="absolute top-2 sm:top-3 left-2 sm:left-3 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium flex items-center space-x-0.5 sm:space-x-1"
              style={{
                backgroundColor: "#E8F5E9",
                color: "#0F5648",
              }}
            >
              <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>Verified</span>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6 flex flex-col flex-grow">
          {/* Business Name */}
          <h3
            className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2"
            style={{ color: "#32332D", fontFamily: "'Poppins', sans-serif" }}
          >
            {professional.business_name}
          </h3>

          {/* Professional Type */}
          {professional.professional_type && (
            <p
              className="text-xs sm:text-sm mb-2 sm:mb-3"
              style={{ color: "#64635E", fontFamily: "'Poppins', sans-serif" }}
            >
              {formatProfessionalType(professional.professional_type)}
            </p>
          )}

          {/* Specializations - Show all */}
          {professional.specializations &&
            professional.specializations.length > 0 && (
              <div className="mb-2 sm:mb-3">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {professional.specializations.map((spec, index) => (
                    <span
                      key={index}
                      className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium"
                      style={{
                        backgroundColor: "#FDF2E8",
                        color: "#F2742C",
                        border: "1px solid #F0DCC9",
                      }}
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Target Developmental Stages */}
          {professional.target_developmental_stages &&
            professional.target_developmental_stages.length > 0 && (
              <div className="mb-2 sm:mb-3">
                <p
                  className="text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1"
                  style={{
                    color: "#AA855B",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Developmental Stages
                </p>
                <div className="flex flex-wrap gap-1">
                  {professional.target_developmental_stages.map(
                    (stage, index) => (
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
                    ),
                  )}
                </div>
              </div>
            )}

          {/* Languages */}
          {professional.languages && professional.languages.length > 0 && (
            <div className="mb-2 sm:mb-3">
              <p
                className="text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1"
                style={{
                  color: "#AA855B",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Languages
              </p>
              <div className="flex flex-wrap gap-1">
                {professional.languages.map((lang, index) => (
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

          {/* Availability */}
          {professional.availability &&
            professional.availability.length > 0 && (
              <div className="mb-2 sm:mb-3">
                <p
                  className="text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1"
                  style={{
                    color: "#AA855B",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Availability
                </p>
                <div className="flex flex-wrap gap-1">
                  {professional.availability.map((avail, index) => (
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

          {/* Location */}
          <div className="mb-3 sm:mb-4">
            <div
              className="flex items-center space-x-1 text-xs sm:text-sm"
              style={{ color: "#64635E" }}
            >
              <MapPin
                className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                style={{ color: "#AA855B" }}
              />
              <span>{location}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 mt-auto">
            <button
              onClick={() =>
                loadProfessionalDetail(professional.professional_id)
              }
              className="flex-1 py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: "#F2742C",
                color: "#FFFFFF",
                fontFamily: "'Poppins', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#E55A1F";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#F2742C";
              }}
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render professional detail modal
  const renderProfessionalModal = () => {
    if (!selectedProfessional) return null;

    const location =
      [
        selectedProfessional.address_line,
        selectedProfessional.city,
        selectedProfessional.state,
        selectedProfessional.postcode,
      ]
        .filter(Boolean)
        .join(", ") || "Location not specified";

    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
        onClick={() => {
          setSelectedProfessional(null);
          if (id) {
            navigate("/professional-directory", { replace: true });
          }
        }}
      >
        <div
          className="rounded-lg sm:rounded-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto flex flex-col"
          style={{
            backgroundColor: "#F5F5F5",
            border: "1px solid #AA855B",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="p-4 sm:p-6 border-b flex-shrink-0"
            style={{ borderColor: "#AA855B", backgroundColor: "#FAEFE2" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                {/* Profile Image */}
                {selectedProfessional.profile_image_url && !modalImageError ? (
                  <img
                    src={selectedProfessional.profile_image_url}
                    alt={selectedProfessional.business_name}
                    className="w-14 h-14 sm:w-20 sm:h-20 rounded-full object-cover flex-shrink-0 border-2"
                    style={{ borderColor: "#AA855B" }}
                    onError={() => setModalImageError(true)}
                  />
                ) : (
                  <div
                    className="w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#EDEDED" }}
                  >
                    <HeartHandshake
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
                    {selectedProfessional.business_name}
                  </h2>
                  {/* Row 2: Professional Type */}
                  {selectedProfessional.professional_type && (
                    <p
                      className="text-xs sm:text-sm mb-1 sm:mb-2"
                      style={{
                        color: "#64635E",
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      {formatProfessionalType(
                        selectedProfessional.professional_type,
                      )}
                    </p>
                  )}
                  {/* Row 3: Verified | Years Experience */}
                  <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap gap-1">
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
                    {selectedProfessional.years_experience && (
                      <span
                        className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium"
                        style={{
                          backgroundColor: "#FDF2E8",
                          color: "#F2742C",
                        }}
                      >
                        {selectedProfessional.years_experience} years experience
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedProfessional(null);
                  if (id) {
                    navigate("/professional-directory", { replace: true });
                  }
                }}
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
              {selectedProfessional.bio && (
                <p
                  className="mb-3 sm:mb-4 text-sm sm:text-base"
                  style={{
                    color: "#32332D",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  {selectedProfessional.bio}
                </p>
              )}
              {/* Specializations */}
              {selectedProfessional.specializations &&
                selectedProfessional.specializations.length > 0 && (
                  <div className="mb-3 sm:mb-4">
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {selectedProfessional.specializations.map(
                        (spec, index) => (
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
                      )}
                    </div>
                  </div>
                )}
              {/* Developmental Stages | Languages | Availability */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                {selectedProfessional.target_developmental_stages &&
                  selectedProfessional.target_developmental_stages.length >
                    0 && (
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
                        {selectedProfessional.target_developmental_stages.map(
                          (stage, index) => (
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
                          ),
                        )}
                      </div>
                    </div>
                  )}
                {selectedProfessional.languages &&
                  selectedProfessional.languages.length > 0 && (
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
                        {selectedProfessional.languages.map((lang, index) => (
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
                {selectedProfessional.availability &&
                  selectedProfessional.availability.length > 0 && (
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
                        {selectedProfessional.availability.map(
                          (avail, index) => (
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
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Qualifications & Credentials */}
            {(selectedProfessional.qualifications ||
              selectedProfessional.certifications) && (
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
                  {selectedProfessional.qualifications && (
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
                      {renderBulletPoints(selectedProfessional.qualifications)}
                    </div>
                  )}

                  {selectedProfessional.certifications && (
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
                      {renderBulletPoints(selectedProfessional.certifications)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Services & Pricing */}
            {selectedProfessional.services &&
              selectedProfessional.services.length > 0 && (
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
                    {selectedProfessional.services.map((service) => (
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
                  {selectedProfessional.contact_phone && (
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <Phone
                        className="w-4 h-4 sm:w-5 sm:h-5"
                        style={{ color: "#F2742C" }}
                      />
                      <a
                        href={`tel:${selectedProfessional.contact_phone}`}
                        className="text-xs sm:text-sm break-all"
                        style={{
                          color: "#326586",
                          fontFamily: "'Poppins', sans-serif",
                          textDecoration: "none",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = "underline";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = "none";
                        }}
                      >
                        {selectedProfessional.contact_phone}
                      </a>
                    </div>
                  )}
                  {selectedProfessional.contact_email && (
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <Mail
                        className="w-4 h-4 sm:w-5 sm:h-5"
                        style={{ color: "#F2742C" }}
                      />
                      <a
                        href={`https://mail.google.com/mail/?view=cm&fs=1&to=${selectedProfessional.contact_email}&tf=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm break-all"
                        style={{
                          color: "#326586",
                          fontFamily: "'Poppins', sans-serif",
                          textDecoration: "none",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = "underline";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = "none";
                        }}
                      >
                        {selectedProfessional.contact_email}
                      </a>
                    </div>
                  )}
                  {selectedProfessional.website_url && (
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <Globe
                        className="w-4 h-4 sm:w-5 sm:h-5"
                        style={{ color: "#F2742C" }}
                      />
                      <a
                        href={selectedProfessional.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm break-all"
                        style={{
                          color: "#326586",
                          fontFamily: "'Poppins', sans-serif",
                          textDecoration: "none",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = "underline";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = "none";
                        }}
                      >
                        {selectedProfessional.website_url}
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
                  {selectedProfessional.google_maps_url && (
                    <a
                      href={selectedProfessional.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm font-medium transition-colors"
                      style={{
                        color: "#326586",
                        fontFamily: "'Poppins', sans-serif",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = "underline";
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
          </div>
        </div>
      </div>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <div
      className="border rounded-lg sm:rounded-2xl p-6 sm:p-10 text-center space-y-2 sm:space-y-3"
      style={{ borderColor: "#F0DCC9", backgroundColor: "#FAEFE2" }}
    >
      <HeartHandshake
        className="w-12 h-12 sm:w-16 sm:h-16 mx-auto"
        style={{ color: "#AA855B" }}
      />
      <h3
        className="text-base sm:text-lg font-semibold"
        style={{ color: "#32332D", fontFamily: "'Poppins', sans-serif" }}
      >
        No professionals found
      </h3>
      <p
        className="text-xs sm:text-sm"
        style={{ color: "#64635E", fontFamily: "'Poppins', sans-serif" }}
      >
        Try adjusting your search criteria or filters
      </p>
      <button
        onClick={clearFilters}
        className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
        style={{ backgroundColor: "#F2742C", color: "#FFFFFF" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#E55A1F";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#F2742C";
        }}
      >
        Clear All Filters
      </button>
    </div>
  );

  const savedCount = savedProfessionalIds.length;
  const recentlyViewedCount = getRecentlyViewed().length;

  return (
    <div
      className="min-h-screen pt-16 sm:pt-20 py-6 sm:py-8 font-['Poppins']"
      style={{ backgroundColor: "#FAEFE2" }}
    >
      <div className="max-w-full lg:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-10">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            <div>
              <h1
                className="text-2xl sm:text-3xl font-bold mb-1.5 sm:mb-2"
                style={{
                  color: "#32332D",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Professional Services Directory
              </h1>
              <p
                className="text-xs sm:text-sm"
                style={{
                  color: "#AA855B",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Find qualified parenting professionals and specialists in your
                area
              </p>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap gap-2">
              <button
                onClick={() => {
                  setSavedFilter(false);
                  setRecentlyViewedFilter(false);
                  setPage(1);
                }}
                className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm ${
                  !savedFilter && !recentlyViewedFilter ? "font-semibold" : ""
                }`}
                style={{
                  backgroundColor:
                    !savedFilter && !recentlyViewedFilter
                      ? "#F2742C"
                      : "#F5F5F5",
                  color:
                    !savedFilter && !recentlyViewedFilter
                      ? "#FFFFFF"
                      : "#32332D",
                  border:
                    !savedFilter && !recentlyViewedFilter
                      ? "none"
                      : "1px solid #AA855B",
                  fontFamily: "'Poppins', sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (savedFilter || recentlyViewedFilter) {
                    e.currentTarget.style.backgroundColor = "#EDEDED";
                  }
                }}
                onMouseLeave={(e) => {
                  if (savedFilter || recentlyViewedFilter) {
                    e.currentTarget.style.backgroundColor = "#F5F5F5";
                  }
                }}
              >
                <HeartHandshake
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${!savedFilter && !recentlyViewedFilter ? "fill-current" : ""}`}
                />
                <span>All</span>
              </button>
              <button
                onClick={handleSavedToggle}
                className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm ${
                  savedFilter ? "font-semibold" : ""
                }`}
                style={{
                  backgroundColor: savedFilter ? "#F2742C" : "#F5F5F5",
                  color: savedFilter ? "#FFFFFF" : "#32332D",
                  border: savedFilter ? "none" : "1px solid #AA855B",
                  fontFamily: "'Poppins', sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (!savedFilter) {
                    e.currentTarget.style.backgroundColor = "#EDEDED";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!savedFilter) {
                    e.currentTarget.style.backgroundColor = "#F5F5F5";
                  }
                }}
              >
                <Bookmark
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${savedFilter ? "fill-current" : ""}`}
                />
                <span>Saved ({savedCount})</span>
              </button>
              <button
                onClick={handleRecentlyViewedToggle}
                className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm ${
                  recentlyViewedFilter ? "font-semibold" : ""
                }`}
                style={{
                  backgroundColor: recentlyViewedFilter ? "#F2742C" : "#F5F5F5",
                  color: recentlyViewedFilter ? "#FFFFFF" : "#32332D",
                  border: recentlyViewedFilter ? "none" : "1px solid #AA855B",
                  fontFamily: "'Poppins', sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (!recentlyViewedFilter) {
                    e.currentTarget.style.backgroundColor = "#EDEDED";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!recentlyViewedFilter) {
                    e.currentTarget.style.backgroundColor = "#F5F5F5";
                  }
                }}
              >
                <Eye
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${recentlyViewedFilter ? "fill-current" : ""}`}
                />
                <span className="hidden lg:inline">
                  Recently Viewed ({recentlyViewedCount})
                </span>
                <span className="lg:hidden">
                  Recent ({recentlyViewedCount})
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Promotional Banner */}
        {renderPromoBanner()}

        {/* Search Bar */}
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search
                className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5"
                style={{ color: "#AA855B" }}
              />
              <input
                type="text"
                placeholder="Search professionals, specialties, or services..."
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-xs sm:text-sm"
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

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-colors text-xs sm:text-sm lg:hidden"
              style={{
                backgroundColor: "#EDEDED",
                border: "1px solid #AA855B",
                color: "#32332D",
                fontFamily: "'Poppins', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F5F5F5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#EDEDED";
              }}
            >
              <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Filters</span>
              {showFilters ? (
                <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Filters */}
        {renderFilters()}

        {/* Results Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2
              className="text-lg sm:text-xl font-bold"
              style={{ color: "#32332D", fontFamily: "'Poppins', sans-serif" }}
            >
              {loading
                ? "Loading..."
                : `${total} Professional${total !== 1 ? "s" : ""} Found`}
            </h2>
            {filters.city || filters.state ? (
              <p
                className="text-xs sm:text-sm"
                style={{
                  color: "#64635E",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Showing results{" "}
                {filters.city && filters.state
                  ? `in ${filters.city}, ${filters.state}`
                  : filters.city
                    ? `in ${filters.city}`
                    : `in ${filters.state}`}
              </p>
            ) : (
              <p
                className="text-xs sm:text-sm"
                style={{
                  color: "#64635E",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Showing all professionals
              </p>
            )}
          </div>
        </div>

        {/* Professional Grid */}
        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <div
              className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2"
              style={{ borderColor: "#F2742C" }}
            ></div>
            <p
              className="mt-3 sm:mt-4 text-xs sm:text-sm"
              style={{ color: "#64635E" }}
            >
              Loading professionals...
            </p>
          </div>
        ) : professionals.length === 0 ? (
          savedFilter ? (
            <div
              className="border rounded-lg sm:rounded-2xl p-6 sm:p-10 text-center space-y-2 sm:space-y-3"
              style={{ borderColor: "#F0DCC9", backgroundColor: "#FAEFE2" }}
            >
              <Bookmark
                className="w-12 h-12 sm:w-16 sm:h-16 mx-auto"
                style={{ color: "#AA855B" }}
              />
              <h3
                className="text-base sm:text-lg font-semibold"
                style={{
                  color: "#32332D",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                No professionals saved yet
              </h3>
              <p
                className="text-xs sm:text-sm"
                style={{
                  color: "#64635E",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                You can start saving professionals by clicking the heart icon on
                any professional card
              </p>
            </div>
          ) : recentlyViewedFilter ? (
            <div
              className="border rounded-lg sm:rounded-2xl p-6 sm:p-10 text-center space-y-2 sm:space-y-3"
              style={{ borderColor: "#F0DCC9", backgroundColor: "#FAEFE2" }}
            >
              <Eye
                className="w-12 h-12 sm:w-16 sm:h-16 mx-auto"
                style={{ color: "#AA855B" }}
              />
              <h3
                className="text-base sm:text-lg font-semibold"
                style={{
                  color: "#32332D",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                No recently viewed professionals
              </h3>
              <p
                className="text-xs sm:text-sm"
                style={{
                  color: "#64635E",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Professionals you view will appear here
              </p>
            </div>
          ) : (
            renderEmptyState()
          )
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {professionals.map(renderProfessionalCard)}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: page === 1 ? "#EDEDED" : "#F5F5F5",
                    border: "1px solid #AA855B",
                    color: "#32332D",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Previous
                </button>
                <span
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm"
                  style={{
                    color: "#32332D",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor:
                      page === totalPages ? "#EDEDED" : "#F5F5F5",
                    border: "1px solid #AA855B",
                    color: "#32332D",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Professional Detail Modal */}
        {renderProfessionalModal()}
      </div>
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

export default ProfessionalDirectoryPage;
