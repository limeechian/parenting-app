// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: AdminDashboard.tsx
// Description: To display the main dashboard for administrators to manage user accounts
// First Written on: Monday, 01-Dec-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state and lifecycle management
import React, { useState, useEffect } from "react";
// Import React Router hooks for URL parameters
import { useSearchParams } from "react-router-dom";
// Import lucide-react icons for UI elements
import {
  Users,
  Shield,
  UserPlus,
  Edit3,
  Trash2,
  Search,
  X,
  CheckCircle,
  XCircle,
  UserX,
  UserCheck,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  User as UserIcon,
  Filter,
} from "lucide-react";
// Import toast notification components
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Import Poppins font weights for consistent typography
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
// Import API functions for admin operations
import {
  getAdminUsers,
  getAdminUser,
  updateUserStatus,
  createAdminUser,
  deleteAdminUser,
  getAdminStats,
  updateAdminUser,
} from "../services/api";

/**
 * Dashboard tab type definition
 */
type DashboardTab = "overview" | "external" | "internal";

/**
 * User interface
 * Defines the structure of a user object with profile information
 */
interface User {
  user_id: number;
  email: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at?: string | null;
  parent_profile?: {
    parent_id: number;
    first_name?: string;
    last_name?: string;
    profile_picture_url?: string | null;
  } | null;
  professional_profile?: {
    professional_id: number;
    business_name?: string;
    profile_status?: string;
    profile_image_url?: string | null;
  } | null;
}

/**
 * AdminStats interface
 * Defines the structure of admin dashboard statistics
 */
interface AdminStats {
  total_users: number;
  active_users: number;
  suspended_users: number;
  internal_team: number;
  users_by_role: {
    parent: number;
    professional: number;
    content_manager: number;
    coordinator: number;
    admin: number;
  };
}

/**
 * AdminDashboard Component
 * 
 * Main dashboard for administrators to manage user accounts.
 * Features include:
 * - User statistics overview
 * - External user management (parents, professionals)
 * - Internal team management (admins, coordinators, content managers)
 * - User status updates (activate/suspend)
 * - Create and edit internal team members
 * - User search and filtering
 * 
 * @returns JSX element representing the admin dashboard
 */
const AdminDashboard: React.FC = () => {
  // React Router hook
  const [searchParams, setSearchParams] = useSearchParams();  // URL search parameters
  
  // Component state management
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => {
    // Initialize active tab from URL parameter or default to "overview"
    const tabParam = searchParams.get("tab");
    if (tabParam && ["overview", "external", "internal"].includes(tabParam)) {
      return tabParam as DashboardTab;
    }
    return "overview";
  });

  // Stats and data
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [externalUsers, setExternalUsers] = useState<User[]>([]);
  const [internalUsers, setInternalUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [internalRoleFilter, setInternalRoleFilter] = useState<string>("all");
  const [internalStatusFilter, setInternalStatusFilter] =
    useState<string>("all");
  const [internalSearchTerm, setInternalSearchTerm] = useState("");

  // Selector focus states for chevron icons
  const [externalRoleFocused, setExternalRoleFocused] = useState(false);
  const [externalStatusFocused, setExternalStatusFocused] = useState(false);
  const [internalRoleFocused, setInternalRoleFocused] = useState(false);
  const [internalStatusFocused, setInternalStatusFocused] = useState(false);
  const [createRoleFocused, setCreateRoleFocused] = useState(false);
  const [editRoleFocused, setEditRoleFocused] = useState(false);

  // Modals
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Create form
  const [createFormData, setCreateFormData] = useState({
    email: "",
    password: "",
    role: "content_manager",
  });

  // Updating state
  const [updating, setUpdating] = useState(false);

  // Internal team edit form
  const [editingInternalUser, setEditingInternalUser] = useState(false);
  const [editFormData, setEditFormData] = useState({
    email: "",
    password: "",
    role: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  /**
   * Loads admin dashboard statistics
   * Fetches user counts and statistics from the API
   */
  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load statistics");
    } finally {
      setLoadingStats(false);
    }
  };

  // Load external users (parent, professional)
  const loadExternalUsers = async () => {
    try {
      const filters: any = {
        role: roleFilter === "all" ? undefined : roleFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchTerm || undefined,
      };
      const data = await getAdminUsers(filters);
      const external = data.filter((u: User) =>
        ["parent", "professional"].includes(u.role),
      );
      setExternalUsers(external);
    } catch (error: any) {
      toast.error(error.message || "Failed to load external users");
    }
  };

  // Load internal team (content_manager, coordinator, admin)
  const loadInternalUsers = async () => {
    try {
      const filters: any = {
        role: internalRoleFilter === "all" ? undefined : internalRoleFilter,
        status:
          internalStatusFilter === "all" ? undefined : internalStatusFilter,
        search: internalSearchTerm || undefined,
      };
      const data = await getAdminUsers(filters);
      const internal = data.filter((u: User) =>
        ["content_manager", "coordinator", "admin"].includes(u.role),
      );
      setInternalUsers(internal);
    } catch (error: any) {
      toast.error(error.message || "Failed to load internal team");
    }
  };

  // Load all data
  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadExternalUsers(), loadInternalUsers()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "external") {
      loadExternalUsers();
    } else if (activeTab === "internal") {
      loadInternalUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    roleFilter,
    statusFilter,
    searchTerm,
    internalRoleFilter,
    internalStatusFilter,
    internalSearchTerm,
  ]);

  // Handle tab change
  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("tab", tab);
    setSearchParams(newSearchParams, { replace: true });
  };

  // Handle view user
  const handleViewUser = async (userId: number) => {
    try {
      const user = await getAdminUser(userId);
      setSelectedUser(user);

      // Set edit form data for internal team
      if (["content_manager", "coordinator", "admin"].includes(user.role)) {
        setEditFormData({
          email: user.email,
          password: "",
          role: user.role,
        });
        setEditingInternalUser(false);
      }

      setShowUserDetailModal(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to load user details");
    }
  };

  // Handle update internal team user (email, password, role)
  const handleUpdateInternalUser = async () => {
    if (!selectedUser) return;

    if (!editFormData.email || !editFormData.role) {
      toast.error("Please fill in all required fields");
      return;
    }

    setUpdating(true);
    try {
      const updateData: any = {
        email: editFormData.email,
        role: editFormData.role,
      };

      // Only include password if it's been changed (not empty)
      if (editFormData.password) {
        updateData.password = editFormData.password;
      }

      await updateAdminUser(selectedUser.user_id, updateData);
      toast.success("User updated successfully!");
      setEditingInternalUser(false);
      await loadData();
      const updatedUser = await getAdminUser(selectedUser.user_id);
      setSelectedUser(updatedUser);
      setEditFormData({
        email: updatedUser.email,
        password: "",
        role: updatedUser.role,
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to update user");
    } finally {
      setUpdating(false);
    }
  };

  // Handle update status
  const handleUpdateStatus = async (userId: number, isActive: boolean) => {
    try {
      await updateUserStatus(userId, isActive);
      toast.success(
        `User ${isActive ? "activated" : "suspended"} successfully!`,
      );
      await loadData();
      if (selectedUser && selectedUser.user_id === userId) {
        const updatedUser = await getAdminUser(userId);
        setSelectedUser(updatedUser);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update user status");
    }
  };

  // Handle create user
  const handleCreateUser = async () => {
    if (!createFormData.email || !createFormData.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    setUpdating(true);
    try {
      await createAdminUser(createFormData);
      toast.success("Internal team member created successfully!");
      setShowCreateModal(false);
      setCreateFormData({
        email: "",
        password: "",
        role: "content_manager",
      });
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    } finally {
      setUpdating(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (soft: boolean = true) => {
    if (!userToDelete) return;

    setUpdating(true);
    try {
      await deleteAdminUser(userToDelete.user_id, soft);
      toast.success(
        `User ${soft ? "deleted (permanently deactivated)" : "deleted permanently"} successfully!`,
      );
      setShowDeleteModal(false);
      setUserToDelete(null);
      await loadData();
      if (selectedUser && selectedUser.user_id === userToDelete.user_id) {
        setShowUserDetailModal(false);
        setSelectedUser(null);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
    } finally {
      setUpdating(false);
    }
  };

  // Get role color
  const getRoleColor = (role: string) => {
    const colors: {
      [key: string]: { bg: string; text: string; border: string };
    } = {
      parent: { bg: "#326586", text: "#FFFFFF", border: "#93C5FD" },
      professional: { bg: "#0F5648", text: "#FFFFFF", border: "#86EFAC" },
      content_manager: { bg: "#F2742C", text: "#FFFFFF", border: "#F0DCC9" },
      coordinator: { bg: "#7C3AED", text: "#FFFFFF", border: "#C4B5FD" },
      admin: { bg: "#D63B3B", text: "#FFFFFF", border: "#FCA5A5" },
    };
    return colors[role] || colors.parent;
  };

  // Get role label
  const getRoleLabel = (role: string) => {
    return role
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  // Handle reset external users filters
  const handleResetExternalFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  // Handle reset internal team filters
  const handleResetInternalFilters = () => {
    setInternalSearchTerm("");
    setInternalRoleFilter("all");
    setInternalStatusFilter("all");
  };

  // Stats cards for Overview
  const statsCards = stats
    ? [
        {
          label: "Total Users",
          value: stats.total_users.toString(),
          icon: Users,
          color: "#326586",
        },
        {
          label: "Active Users",
          value: stats.active_users.toString(),
          icon: CheckCircle,
          color: "#0F5648",
        },
        {
          label: "Suspended Users",
          value: stats.suspended_users.toString(),
          icon: XCircle,
          color: "#DC2626",
        },
        {
          label: "Internal Team",
          value: stats.internal_team.toString(),
          icon: Shield,
          color: "#F2742C",
        },
      ]
    : [];

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
                System Administrator Dashboard
              </h1>
              <p className="text-sm sm:text-base" style={{ color: "#AA855B" }}>
                Manage users, assign roles, and monitor platform activity
              </p>
            </div>
            {activeTab === "overview" && (
              <button
                onClick={loadData}
                className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg font-['Poppins'] text-xs sm:text-sm w-full sm:w-auto"
                style={{
                  backgroundColor: "#0F5648",
                  color: "#F5F5F5",
                  boxShadow: "0 4px 15px rgba(15, 86, 72, 0.3)",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = "#0A4538";
                  event.currentTarget.style.boxShadow =
                    "0 6px 20px rgba(15, 86, 72, 0.4)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = "#0F5648";
                  event.currentTarget.style.boxShadow =
                    "0 4px 15px rgba(15, 86, 72, 0.3)";
                }}
                title="Refresh data"
              >
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Refresh Data</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 sm:mb-6">
          <div
            className="flex space-x-1 p-1.5 sm:p-2 rounded-lg w-full sm:w-fit overflow-x-auto"
            style={{ backgroundColor: "#FCF9F8" }}
          >
            {[
              { id: "overview", label: "Overview" },
              { id: "external", label: "External Users" },
              { id: "internal", label: "Internal Team" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as DashboardTab)}
                className={`flex items-center space-x-1.5 sm:space-x-2 py-1.5 sm:py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? "shadow-sm"
                    : "opacity-70 hover:opacity-100"
                }`}
                style={{
                  backgroundColor:
                    activeTab === tab.id ? "#32332D" : "transparent",
                  color: activeTab === tab.id ? "#FFFFFF" : "#32332D",
                }}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div>
            {/* Stats Cards */}
            {!loadingStats && stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statsCards.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={index}
                      className="rounded-2xl shadow-xl p-4 sm:p-5 transition-all duration-300 hover:shadow-2xl hover:scale-105"
                      style={{
                        backgroundColor: "#F5F5F5",
                        border: "1px solid #AA855B",
                      }}
                    >
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-md"
                          style={{ backgroundColor: stat.color }}
                        >
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                      </div>
                      <p
                        className="text-xl sm:text-2xl font-bold font-['Poppins'] mb-0.5 sm:mb-1"
                        style={{ color: "#32332D" }}
                      >
                        {stat.value}
                      </p>
                      <p
                        className="text-xs sm:text-sm font-['Poppins']"
                        style={{ color: "#AA855B" }}
                      >
                        {stat.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* User Distribution */}
            {stats && (
              <div
                className="rounded-2xl shadow-xl p-4 sm:p-6 transition-all duration-300 hover:shadow-2xl"
                style={{
                  backgroundColor: "#F5F5F5",
                  border: "1px solid #AA855B",
                }}
              >
                <h2
                  className="text-lg sm:text-xl font-bold font-['Poppins'] mb-4 sm:mb-6"
                  style={{ color: "#32332D" }}
                >
                  User Distribution by Role
                </h2>
                <div className="space-y-3 sm:space-y-4">
                  {Object.entries(stats.users_by_role).map(([role, count]) => {
                    const percentage =
                      stats.total_users > 0
                        ? ((count / stats.total_users) * 100).toFixed(1)
                        : "0";
                    const roleColor = getRoleColor(role);
                    return (
                      <div key={role} className="space-y-1.5 sm:space-y-2">
                        <div className="flex justify-between">
                          <span
                            className="text-xs sm:text-sm font-medium font-['Poppins']"
                            style={{ color: "#32332D" }}
                          >
                            {getRoleLabel(role)}
                          </span>
                          <span
                            className="text-xs sm:text-sm font-['Poppins']"
                            style={{ color: "#AA855B" }}
                          >
                            {count} ({percentage}%)
                          </span>
                        </div>
                        <div
                          className="w-full rounded-full h-2"
                          style={{ backgroundColor: "#E5E7EB" }}
                        >
                          <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: roleColor.bg,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "external" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-0">
              <h2
                className="text-lg sm:text-xl font-bold font-['Poppins']"
                style={{ color: "#32332D" }}
              >
                External Users
              </h2>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
              {/* Search Bar */}
              <div className="flex-1">
                <div className="relative">
                  <Search
                    className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5"
                    style={{ color: "#AA855B" }}
                  />
                  <input
                    type="text"
                    placeholder="Search by email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-wrap">
                <Filter
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  style={{ color: "#AA855B" }}
                />

                {/* Role Filter */}
                <div className="relative">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    onFocus={() => setExternalRoleFocused(true)}
                    onBlur={() => setExternalRoleFocused(false)}
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
                    <option value="all">All Roles</option>
                    <option value="parent">Parent</option>
                    <option value="professional">Professional</option>
                  </select>
                  {externalRoleFocused ? (
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

                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    onFocus={() => setExternalStatusFocused(true)}
                    onBlur={() => setExternalStatusFocused(false)}
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
                    <option value="active">Active</option>
                    <option value="inactive">Suspended</option>
                  </select>
                  {externalStatusFocused ? (
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
                  onClick={handleResetExternalFilters}
                  className="px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-center"
                  style={{ backgroundColor: "#AA855B", color: "#F5F5F5" }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor = "#8B6F4A";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor = "#AA855B";
                  }}
                  title="Reset search and filters"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div
              className="rounded-2xl shadow-xl p-3 sm:p-6"
              style={{
                backgroundColor: "#F5F5F5",
                border: "1px solid #AA855B",
              }}
            >
              {loading ? (
                <div className="text-center py-6 sm:py-8">
                  <div
                    className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2"
                    style={{ borderColor: "#326586" }}
                  ></div>
                </div>
              ) : externalUsers.length === 0 ? (
                <p
                  className="text-center py-6 sm:py-8 font-['Poppins'] text-xs sm:text-sm"
                  style={{ color: "#AA855B" }}
                >
                  No external users found
                </p>
              ) : (
                <div
                  className="overflow-x-scroll -mx-3 sm:mx-0"
                  style={{
                    scrollbarWidth: "auto",
                    scrollbarColor: "#AA855B #F5F5F5",
                  }}
                >
                  <style>{`
                    div.overflow-x-scroll::-webkit-scrollbar {
                      height: 12px;
                    }
                    div.overflow-x-scroll::-webkit-scrollbar-track {
                      background: #F5F5F5;
                      border-radius: 6px;
                      border: 1px solid #E5E7EB;
                    }
                    div.overflow-x-scroll::-webkit-scrollbar-thumb {
                      background: #AA855B;
                      border-radius: 6px;
                      border: 2px solid #F5F5F5;
                      min-width: 40px;
                    }
                    div.overflow-x-scroll::-webkit-scrollbar-thumb:hover {
                      background: #8B6F4A;
                    }
                    div.overflow-x-scroll::-webkit-scrollbar-thumb:active {
                      background: #7A5F3F;
                    }
                  `}</style>
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr
                        className="border-b"
                        style={{ borderColor: "#AA855B" }}
                      >
                        <th
                          className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold font-['Poppins'] text-xs sm:text-sm"
                          style={{ color: "#32332D" }}
                        >
                          User
                        </th>
                        <th
                          className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold font-['Poppins'] text-xs sm:text-sm"
                          style={{ color: "#32332D" }}
                        >
                          Role
                        </th>
                        <th
                          className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold font-['Poppins'] text-xs sm:text-sm"
                          style={{ color: "#32332D" }}
                        >
                          Status
                        </th>
                        <th
                          className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold font-['Poppins'] text-xs sm:text-sm hidden md:table-cell"
                          style={{ color: "#32332D" }}
                        >
                          Created
                        </th>
                        <th
                          className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold font-['Poppins'] text-xs sm:text-sm"
                          style={{ color: "#32332D" }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {externalUsers.map((user) => {
                        const roleColor = getRoleColor(user.role);
                        const displayName = user.parent_profile
                          ? `${user.parent_profile.first_name || ""} ${user.parent_profile.last_name || ""}`.trim() ||
                            user.email
                          : user.professional_profile?.business_name ||
                            user.email;
                        return (
                          <tr
                            key={user.user_id}
                            className="border-b hover:bg-white transition-colors"
                            style={{ borderColor: "#E5E7EB" }}
                          >
                            <td className="py-2 sm:py-3 px-2 sm:px-4">
                              <div>
                                <p
                                  className="font-medium font-['Poppins'] text-xs sm:text-sm"
                                  style={{ color: "#32332D" }}
                                >
                                  {user.email}
                                </p>
                                {displayName !== user.email && (
                                  <p
                                    className="text-[10px] sm:text-sm font-['Poppins']"
                                    style={{ color: "#AA855B" }}
                                  >
                                    {displayName}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4">
                              <span
                                className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full font-['Poppins']"
                                style={{
                                  backgroundColor: roleColor.bg,
                                  color: roleColor.text,
                                }}
                              >
                                {getRoleLabel(user.role)}
                              </span>
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4">
                              <span
                                className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full font-['Poppins'] inline-flex items-center gap-0.5 sm:gap-1"
                                style={{
                                  backgroundColor: user.is_active
                                    ? "#DCFCE7"
                                    : "#FEE2E2",
                                  color: user.is_active ? "#0F5648" : "#DC2626",
                                }}
                              >
                                {user.is_active ? (
                                  <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                ) : (
                                  <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                )}
                                {user.is_active ? "Active" : "Suspended"}
                              </span>
                            </td>
                            <td
                              className="py-2 sm:py-3 px-2 sm:px-4 font-['Poppins'] text-xs sm:text-sm hidden md:table-cell"
                              style={{ color: "#32332D" }}
                            >
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleViewUser(user.user_id)}
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
                                  title="View user details"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                {user.is_active ? (
                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(user.user_id, false)
                                    }
                                    className="p-2 rounded-lg transition-colors"
                                    style={{ color: "#DC2626" }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        "#FEE2E2";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        "transparent";
                                    }}
                                    title="Suspend user (temporary)"
                                  >
                                    <UserX className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(user.user_id, true)
                                    }
                                    className="p-2 rounded-lg transition-colors"
                                    style={{ color: "#0F5648" }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        "#DCFCE7";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        "transparent";
                                    }}
                                    title="Activate user"
                                  >
                                    <UserCheck className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setUserToDelete(user);
                                    setShowDeleteModal(true);
                                  }}
                                  className="p-2 rounded-lg transition-colors"
                                  style={{ color: "#DC2626" }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      "#FEE2E2";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      "transparent";
                                  }}
                                  title="Delete user (permanent deactivation)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "internal" && (
          <div className="space-y-6">
            {/* Header with Create Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
              <h2
                className="text-lg sm:text-xl font-bold font-['Poppins']"
                style={{ color: "#32332D" }}
              >
                Internal Team Members
              </h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg font-['Poppins'] text-xs sm:text-sm w-full sm:w-auto"
                style={{
                  backgroundColor: "#F2742C",
                  color: "#F5F5F5",
                  boxShadow: "0 4px 15px rgba(242, 116, 44, 0.3)",
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
                <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Add Team Member</span>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
              {/* Search Bar */}
              <div className="flex-1">
                <div className="relative">
                  <Search
                    className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5"
                    style={{ color: "#AA855B" }}
                  />
                  <input
                    type="text"
                    placeholder="Search by email..."
                    value={internalSearchTerm}
                    onChange={(e) => setInternalSearchTerm(e.target.value)}
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
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-wrap">
                <Filter
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  style={{ color: "#AA855B" }}
                />

                {/* Role Filter */}
                <div className="relative">
                  <select
                    value={internalRoleFilter}
                    onChange={(e) => setInternalRoleFilter(e.target.value)}
                    onFocus={() => setInternalRoleFocused(true)}
                    onBlur={() => setInternalRoleFocused(false)}
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
                    <option value="all">All Roles</option>
                    <option value="content_manager">Content Manager</option>
                    <option value="coordinator">Coordinator</option>
                    <option value="admin">Admin</option>
                  </select>
                  {internalRoleFocused ? (
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

                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={internalStatusFilter}
                    onChange={(e) => setInternalStatusFilter(e.target.value)}
                    onFocus={() => setInternalStatusFocused(true)}
                    onBlur={() => setInternalStatusFocused(false)}
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
                    <option value="active">Active</option>
                    <option value="inactive">Suspended</option>
                  </select>
                  {internalStatusFocused ? (
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
                  onClick={handleResetInternalFilters}
                  className="px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-center"
                  style={{ backgroundColor: "#AA855B", color: "#F5F5F5" }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor = "#8B6F4A";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor = "#AA855B";
                  }}
                  title="Reset search and filters"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div
              className="rounded-2xl shadow-xl p-3 sm:p-6"
              style={{
                backgroundColor: "#F5F5F5",
                border: "1px solid #AA855B",
              }}
            >
              {loading ? (
                <div className="text-center py-6 sm:py-8">
                  <div
                    className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2"
                    style={{ borderColor: "#326586" }}
                  ></div>
                </div>
              ) : internalUsers.length === 0 ? (
                <p
                  className="text-center py-6 sm:py-8 font-['Poppins'] text-xs sm:text-sm"
                  style={{ color: "#AA855B" }}
                >
                  No internal team members found
                </p>
              ) : (
                <div
                  className="overflow-x-scroll -mx-3 sm:mx-0"
                  style={{
                    scrollbarWidth: "auto",
                    scrollbarColor: "#AA855B #F5F5F5",
                  }}
                >
                  <style>{`
                    div.overflow-x-scroll::-webkit-scrollbar {
                      height: 12px;
                    }
                    div.overflow-x-scroll::-webkit-scrollbar-track {
                      background: #F5F5F5;
                      border-radius: 6px;
                      border: 1px solid #E5E7EB;
                    }
                    div.overflow-x-scroll::-webkit-scrollbar-thumb {
                      background: #AA855B;
                      border-radius: 6px;
                      border: 2px solid #F5F5F5;
                      min-width: 40px;
                    }
                    div.overflow-x-scroll::-webkit-scrollbar-thumb:hover {
                      background: #8B6F4A;
                    }
                    div.overflow-x-scroll::-webkit-scrollbar-thumb:active {
                      background: #7A5F3F;
                    }
                  `}</style>
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr
                        className="border-b"
                        style={{ borderColor: "#AA855B" }}
                      >
                        <th
                          className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold font-['Poppins'] text-xs sm:text-sm"
                          style={{ color: "#32332D" }}
                        >
                          Email
                        </th>
                        <th
                          className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold font-['Poppins'] text-xs sm:text-sm"
                          style={{ color: "#32332D" }}
                        >
                          Role
                        </th>
                        <th
                          className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold font-['Poppins'] text-xs sm:text-sm"
                          style={{ color: "#32332D" }}
                        >
                          Status
                        </th>
                        <th
                          className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold font-['Poppins'] text-xs sm:text-sm hidden md:table-cell"
                          style={{ color: "#32332D" }}
                        >
                          Created
                        </th>
                        <th
                          className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold font-['Poppins'] text-xs sm:text-sm"
                          style={{ color: "#32332D" }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {internalUsers.map((user) => {
                        const roleColor = getRoleColor(user.role);
                        return (
                          <tr
                            key={user.user_id}
                            className="border-b hover:bg-white transition-colors"
                            style={{ borderColor: "#E5E7EB" }}
                          >
                            <td
                              className="py-2 sm:py-3 px-2 sm:px-4 font-medium font-['Poppins'] text-xs sm:text-sm"
                              style={{ color: "#32332D" }}
                            >
                              {user.email}
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4">
                              <span
                                className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full font-['Poppins']"
                                style={{
                                  backgroundColor: roleColor.bg,
                                  color: roleColor.text,
                                }}
                              >
                                {getRoleLabel(user.role)}
                              </span>
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4">
                              <span
                                className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full font-['Poppins'] inline-flex items-center gap-0.5 sm:gap-1"
                                style={{
                                  backgroundColor: user.is_active
                                    ? "#DCFCE7"
                                    : "#FEE2E2",
                                  color: user.is_active ? "#0F5648" : "#DC2626",
                                }}
                              >
                                {user.is_active ? (
                                  <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                ) : (
                                  <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                )}
                                {user.is_active ? "Active" : "Suspended"}
                              </span>
                            </td>
                            <td
                              className="py-2 sm:py-3 px-2 sm:px-4 font-['Poppins'] text-xs sm:text-sm hidden md:table-cell"
                              style={{ color: "#32332D" }}
                            >
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4">
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <button
                                  onClick={() => handleViewUser(user.user_id)}
                                  className="p-1.5 sm:p-2 rounded-lg transition-colors"
                                  style={{ color: "#326586" }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      "#E8F4F8";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      "transparent";
                                  }}
                                  title="View user details"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setUserToDelete(user);
                                    setShowDeleteModal(true);
                                  }}
                                  className="p-2 rounded-lg transition-colors"
                                  style={{ color: "#DC2626" }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      "#FEE2E2";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      "transparent";
                                  }}
                                  title="Delete user (permanent deactivation)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* External User Detail Modal */}
        {showUserDetailModal &&
          selectedUser &&
          ["parent", "professional"].includes(selectedUser.role) && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                style={{ border: "1px solid #AA855B" }}
              >
                <div
                  className="p-6 border-b"
                  style={{ borderColor: "#AA855B" }}
                >
                  <div className="flex items-center justify-between">
                    <h2
                      className="text-xl font-bold font-['Poppins']"
                      style={{ color: "#32332D" }}
                    >
                      User Details
                    </h2>
                    <button
                      onClick={() => {
                        setShowUserDetailModal(false);
                        setSelectedUser(null);
                      }}
                      className="p-2 rounded-lg transition-colors"
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
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label
                      className="block text-sm font-medium font-['Poppins'] mb-1"
                      style={{ color: "#32332D" }}
                    >
                      Email
                    </label>
                    <p
                      className="font-['Poppins']"
                      style={{ color: "#AA855B" }}
                    >
                      {selectedUser.email}
                    </p>
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium font-['Poppins'] mb-1"
                      style={{ color: "#32332D" }}
                    >
                      Role
                    </label>
                    <span
                      className="px-2 py-1 text-xs font-medium rounded-full font-['Poppins'] inline-block"
                      style={{
                        backgroundColor: getRoleColor(selectedUser.role).bg,
                        color: getRoleColor(selectedUser.role).text,
                      }}
                    >
                      {getRoleLabel(selectedUser.role)}
                    </span>
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium font-['Poppins'] mb-1"
                      style={{ color: "#32332D" }}
                    >
                      Status
                    </label>
                    <span
                      className="px-2 py-1 text-xs font-medium rounded-full font-['Poppins'] inline-flex items-center gap-1"
                      style={{
                        backgroundColor: selectedUser.is_active
                          ? "#DCFCE7"
                          : "#FEE2E2",
                        color: selectedUser.is_active ? "#0F5648" : "#DC2626",
                      }}
                    >
                      {selectedUser.is_active ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {selectedUser.is_active ? "Active" : "Suspended"}
                    </span>
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium font-['Poppins'] mb-1"
                      style={{ color: "#32332D" }}
                    >
                      Created At
                    </label>
                    <p
                      className="font-['Poppins']"
                      style={{ color: "#AA855B" }}
                    >
                      {new Date(selectedUser.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 pt-4">
                    {selectedUser.is_active ? (
                      <button
                        onClick={() =>
                          handleUpdateStatus(selectedUser.user_id, false)
                        }
                        className="px-4 py-2 rounded-lg font-['Poppins'] font-medium transition-colors"
                        style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#FECACA";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#FEE2E2";
                        }}
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          handleUpdateStatus(selectedUser.user_id, true)
                        }
                        className="px-4 py-2 rounded-lg font-['Poppins'] font-medium transition-colors"
                        style={{ backgroundColor: "#DCFCE7", color: "#0F5648" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#BBF7D0";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#DCFCE7";
                        }}
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setUserToDelete(selectedUser);
                        setShowDeleteModal(true);
                      }}
                      className="px-4 py-2 rounded-lg font-['Poppins'] font-medium transition-colors"
                      style={{ backgroundColor: "#DC2626", color: "#FFFFFF" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#B91C1C";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#DC2626";
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Internal Team User Detail Modal */}
        {showUserDetailModal &&
          selectedUser &&
          ["content_manager", "coordinator", "admin"].includes(
            selectedUser.role,
          ) && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                style={{ border: "1px solid #AA855B" }}
              >
                <div
                  className="p-6 border-b"
                  style={{ borderColor: "#AA855B" }}
                >
                  <div className="flex items-center justify-between">
                    <h2
                      className="text-xl font-bold font-['Poppins']"
                      style={{ color: "#32332D" }}
                    >
                      User Details
                    </h2>
                    <button
                      onClick={() => {
                        setShowUserDetailModal(false);
                        setSelectedUser(null);
                        setEditingInternalUser(false);
                      }}
                      className="p-2 rounded-lg transition-colors"
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
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label
                      className="block text-sm font-medium font-['Poppins'] mb-1"
                      style={{ color: "#32332D" }}
                    >
                      Email
                    </label>
                    {editingInternalUser ? (
                      <input
                        type="email"
                        value={editFormData.email}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            email: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg font-['Poppins']"
                        style={{
                          backgroundColor: "#F5F5F5",
                          border: "1px solid #AA855B",
                          color: "#32332D",
                        }}
                      />
                    ) : (
                      <p
                        className="font-['Poppins']"
                        style={{ color: "#AA855B" }}
                      >
                        {selectedUser.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium font-['Poppins'] mb-1"
                      style={{ color: "#32332D" }}
                    >
                      Password
                    </label>
                    {editingInternalUser ? (
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={editFormData.password}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              password: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 pr-10 rounded-lg font-['Poppins']"
                          style={{
                            backgroundColor: "#F5F5F5",
                            border: "1px solid #AA855B",
                            color: "#32332D",
                          }}
                          placeholder="Leave blank to keep current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          style={{ color: "#AA855B" }}
                        >
                          {showPassword ? (
                            <Eye className="w-5 h-5" />
                          ) : (
                            <EyeOff className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <p
                        className="font-['Poppins']"
                        style={{ color: "#AA855B" }}
                      >
                        ••••••••
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium font-['Poppins'] mb-1"
                      style={{ color: "#32332D" }}
                    >
                      Role
                    </label>
                    {editingInternalUser ? (
                      <div className="relative">
                        <select
                          value={editFormData.role}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              role: e.target.value,
                            })
                          }
                          onFocus={() => setEditRoleFocused(true)}
                          onBlur={() => setEditRoleFocused(false)}
                          className="w-full px-3 py-2 pr-8 rounded-lg font-['Poppins']"
                          style={{
                            backgroundColor: "#F5F5F5",
                            border: "1px solid #AA855B",
                            color: "#32332D",
                            appearance: "none",
                            WebkitAppearance: "none",
                            MozAppearance: "none",
                            backgroundImage: "none",
                          }}
                        >
                          <option value="content_manager">
                            Content Manager
                          </option>
                          <option value="coordinator">Coordinator</option>
                          <option value="admin">Admin</option>
                        </select>
                        {editRoleFocused ? (
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
                    ) : (
                      <span
                        className="px-2 py-1 text-xs font-medium rounded-full font-['Poppins'] inline-block"
                        style={{
                          backgroundColor: getRoleColor(selectedUser.role).bg,
                          color: getRoleColor(selectedUser.role).text,
                        }}
                      >
                        {getRoleLabel(selectedUser.role)}
                      </span>
                    )}
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium font-['Poppins'] mb-1"
                      style={{ color: "#32332D" }}
                    >
                      Status
                    </label>
                    <span
                      className="px-2 py-1 text-xs font-medium rounded-full font-['Poppins'] inline-flex items-center gap-1"
                      style={{
                        backgroundColor: selectedUser.is_active
                          ? "#DCFCE7"
                          : "#FEE2E2",
                        color: selectedUser.is_active ? "#0F5648" : "#DC2626",
                      }}
                    >
                      {selectedUser.is_active ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {selectedUser.is_active ? "Active" : "Suspended"}
                    </span>
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium font-['Poppins'] mb-1"
                      style={{ color: "#32332D" }}
                    >
                      Created At
                    </label>
                    <p
                      className="font-['Poppins']"
                      style={{ color: "#AA855B" }}
                    >
                      {new Date(selectedUser.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 pt-4">
                    {editingInternalUser ? (
                      <>
                        <button
                          onClick={handleUpdateInternalUser}
                          disabled={updating}
                          className="px-4 py-2 rounded-lg font-['Poppins'] font-medium transition-colors"
                          style={{
                            backgroundColor: "#0F5648",
                            color: "#FFFFFF",
                          }}
                          onMouseEnter={(e) => {
                            if (!updating)
                              e.currentTarget.style.backgroundColor = "#0A4538";
                          }}
                          onMouseLeave={(e) => {
                            if (!updating)
                              e.currentTarget.style.backgroundColor = "#0F5648";
                          }}
                        >
                          {updating ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => {
                            setEditingInternalUser(false);
                            setEditFormData({
                              email: selectedUser.email,
                              password: "",
                              role: selectedUser.role,
                            });
                          }}
                          className="px-4 py-2 rounded-lg font-['Poppins'] font-medium transition-colors"
                          style={{
                            backgroundColor: "#F5F5F5",
                            color: "#32332D",
                            border: "1px solid #AA855B",
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingInternalUser(true)}
                          className="px-4 py-2 rounded-lg font-['Poppins'] font-medium transition-colors"
                          style={{
                            backgroundColor: "#326586",
                            color: "#FFFFFF",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#2563EB";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#326586";
                          }}
                        >
                          Edit
                        </button>
                        {selectedUser.is_active ? (
                          <button
                            onClick={() => {
                              setUserToDelete(selectedUser);
                              setShowDeleteModal(true);
                            }}
                            className="px-4 py-2 rounded-lg font-['Poppins'] font-medium transition-colors"
                            style={{
                              backgroundColor: "#DC2626",
                              color: "#FFFFFF",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#B91C1C";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#DC2626";
                            }}
                          >
                            Delete
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                handleUpdateStatus(selectedUser.user_id, true)
                              }
                              className="px-4 py-2 rounded-lg font-['Poppins'] font-medium transition-colors"
                              style={{
                                backgroundColor: "#DCFCE7",
                                color: "#0F5648",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#BBF7D0";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#DCFCE7";
                              }}
                            >
                              Reactivate
                            </button>
                            <button
                              onClick={() => {
                                setUserToDelete(selectedUser);
                                setShowDeleteModal(true);
                              }}
                              className="px-4 py-2 rounded-lg font-['Poppins'] font-medium transition-colors"
                              style={{
                                backgroundColor: "#DC2626",
                                color: "#FFFFFF",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#B91C1C";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#DC2626";
                              }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
              style={{ border: "1px solid #AA855B" }}
            >
              <div className="p-6 border-b" style={{ borderColor: "#AA855B" }}>
                <div className="flex items-center justify-between">
                  <h2
                    className="text-xl font-bold font-['Poppins']"
                    style={{ color: "#32332D" }}
                  >
                    Add Team Member
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateFormData({
                        email: "",
                        password: "",
                        role: "content_manager",
                      });
                    }}
                    className="p-2 rounded-lg transition-colors"
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
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label
                    className="block text-sm font-medium font-['Poppins'] mb-1"
                    style={{ color: "#32332D" }}
                  >
                    Email *
                  </label>
                  <input
                    type="email"
                    value={createFormData.email}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        email: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg font-['Poppins']"
                    style={{
                      backgroundColor: "#F5F5F5",
                      border: "1px solid #AA855B",
                      color: "#32332D",
                    }}
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium font-['Poppins'] mb-1"
                    style={{ color: "#32332D" }}
                  >
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showCreatePassword ? "text" : "password"}
                      value={createFormData.password}
                      onChange={(e) =>
                        setCreateFormData({
                          ...createFormData,
                          password: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 pr-10 rounded-lg font-['Poppins']"
                      style={{
                        backgroundColor: "#F5F5F5",
                        border: "1px solid #AA855B",
                        color: "#32332D",
                      }}
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      style={{ color: "#AA855B" }}
                    >
                      {showCreatePassword ? (
                        <Eye className="w-5 h-5" />
                      ) : (
                        <EyeOff className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label
                    className="block text-sm font-medium font-['Poppins'] mb-1"
                    style={{ color: "#32332D" }}
                  >
                    Role *
                  </label>
                  <div className="relative">
                    <select
                      value={createFormData.role}
                      onChange={(e) =>
                        setCreateFormData({
                          ...createFormData,
                          role: e.target.value,
                        })
                      }
                      onFocus={() => setCreateRoleFocused(true)}
                      onBlur={() => setCreateRoleFocused(false)}
                      className="w-full px-3 py-2 pr-8 rounded-lg font-['Poppins']"
                      style={{
                        backgroundColor: "#F5F5F5",
                        border: "1px solid #AA855B",
                        color: "#32332D",
                        appearance: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                        backgroundImage: "none",
                      }}
                    >
                      <option value="content_manager">Content Manager</option>
                      <option value="coordinator">Coordinator</option>
                      <option value="admin">Admin</option>
                    </select>
                    {createRoleFocused ? (
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
                <div className="flex items-center space-x-2 pt-4">
                  <button
                    onClick={handleCreateUser}
                    disabled={updating}
                    className="flex-1 px-4 py-2 rounded-lg font-['Poppins'] font-medium transition-colors"
                    style={{ backgroundColor: "#0F5648", color: "#FFFFFF" }}
                    onMouseEnter={(e) => {
                      if (!updating)
                        e.currentTarget.style.backgroundColor = "#0A4538";
                    }}
                    onMouseLeave={(e) => {
                      if (!updating)
                        e.currentTarget.style.backgroundColor = "#0F5648";
                    }}
                  >
                    {updating ? "Creating..." : "Create User"}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateFormData({
                        email: "",
                        password: "",
                        role: "content_manager",
                      });
                    }}
                    className="px-4 py-2 rounded-lg font-['Poppins'] font-medium transition-colors"
                    style={{
                      backgroundColor: "#F5F5F5",
                      color: "#32332D",
                      border: "1px solid #AA855B",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && userToDelete && (
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
                  Delete User Account
                </h3>
                <button
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                  }}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {userToDelete.role === "parent" &&
                  userToDelete.parent_profile?.profile_picture_url ? (
                    <img
                      src={userToDelete.parent_profile.profile_picture_url}
                      alt={
                        userToDelete.parent_profile.first_name ||
                        userToDelete.email
                      }
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : userToDelete.role === "professional" &&
                    userToDelete.professional_profile?.profile_image_url ? (
                    <img
                      src={userToDelete.professional_profile.profile_image_url}
                      alt={
                        userToDelete.professional_profile.business_name ||
                        userToDelete.email
                      }
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: getRoleColor(userToDelete.role).bg,
                      }}
                    >
                      <UserIcon
                        className="w-6 h-6"
                        style={{ color: getRoleColor(userToDelete.role).text }}
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4
                      className="font-medium font-['Poppins']"
                      style={{ color: "#32332D" }}
                    >
                      {userToDelete.role === "parent" &&
                      userToDelete.parent_profile
                        ? `${userToDelete.parent_profile.first_name || ""} ${userToDelete.parent_profile.last_name || ""}`.trim() ||
                          userToDelete.email
                        : userToDelete.role === "professional" &&
                            userToDelete.professional_profile
                          ? userToDelete.professional_profile.business_name ||
                            userToDelete.email
                          : userToDelete.email}
                    </h4>
                    <p
                      className="text-xs font-['Poppins']"
                      style={{ color: "#64635E" }}
                    >
                      {getRoleLabel(userToDelete.role)} •{" "}
                      {userToDelete.is_active ? "Active" : "Inactive"}
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
                    {userToDelete.is_active
                      ? "Deleting this user will permanently deactivate the account (soft delete). The user will not be able to log in, but their data will be preserved."
                      : "Deleting this user will permanently remove the account and all associated data. This action cannot be undone."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="confirm-delete-user"
                    className="w-4 h-4 rounded"
                    style={{ accentColor: "#EF4444" }}
                  />
                  <label
                    htmlFor="confirm-delete-user"
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
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                  }}
                >
                  Cancel
                </button>
                {!userToDelete.is_active && (
                  <button
                    className="px-4 py-2 rounded-lg font-medium font-['Poppins'] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: "#DC2626",
                      color: "#FFFFFF",
                      border: "1px solid #DC2626",
                    }}
                    onClick={() => {
                      const checkbox = document.getElementById(
                        "confirm-delete-user",
                      ) as HTMLInputElement;
                      if (checkbox?.checked) {
                        handleDeleteUser(false);
                      } else {
                        alert(
                          "Please confirm that you understand this action cannot be undone.",
                        );
                      }
                    }}
                    disabled={updating}
                  >
                    {updating ? "Deleting..." : "Hard Delete"}
                  </button>
                )}
                <button
                  className="px-4 py-2 rounded-lg font-medium font-['Poppins'] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#EF4444", color: "#FFFFFF" }}
                  onClick={() => {
                    const checkbox = document.getElementById(
                      "confirm-delete-user",
                    ) as HTMLInputElement;
                    if (checkbox?.checked) {
                      handleDeleteUser(true);
                    } else {
                      alert(
                        "Please confirm that you understand this action cannot be undone.",
                      );
                    }
                  }}
                  disabled={updating}
                >
                  {updating
                    ? "Deleting..."
                    : userToDelete.is_active
                      ? "Delete (Deactivate)"
                      : "Delete"}
                </button>
              </div>
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

export default AdminDashboard;
