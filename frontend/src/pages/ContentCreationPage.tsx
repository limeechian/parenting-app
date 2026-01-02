// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: ContentCreationPage.tsx
// Description: To provide interface for content managers to create and edit resource content
// First Written on: Tuesday, 11-Nov-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for component state and lifecycle management
import React, { useState, useEffect } from "react";
// Import React Router hooks for navigation and URL parameters
import { useNavigate, useParams } from "react-router-dom";
// Import Material-UI components for form elements
import { CircularProgress, Autocomplete, TextField, Chip } from "@mui/material";
// Import lucide-react icons for UI elements
import {
  Save,
  X,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Plus,
  Eye,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
// Import toast notification components
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Import API base URL configuration
import { API_BASE_URL } from "../config/api";
// Import Poppins font weights for consistent typography
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";

/**
 * Attachment interface
 * Defines the structure of a resource attachment
 */
interface Attachment {
  attachment_id?: number;
  file_name: string;
  file_path: string;
  file_type: "image" | "video" | "document";
  file_size?: number;
  mime_type?: string;
  display_order: number; // Unified position in the combined list (0, 1, 2...)
  preview?: string;
  file?: File;
}

/**
 * SelectedFileWithMetadata interface
 * Defines the structure of a newly selected file with preview and order
 */
interface SelectedFileWithMetadata {
  file: File;
  preview?: string;
  display_order: number; // Unified position minus number of attachments before it
}

/**
 * Unified file item type for reordering
 * Allows reordering across both existing attachments and newly selected files
 */
type UnifiedFileItem =
  | { type: "attachment"; data: Attachment; originalIndex: number }
  | {
      type: "selectedFile";
      data: SelectedFileWithMetadata;
      originalIndex: number;
    };

/**
 * ResourceForm interface
 * Defines the structure of the resource form data
 */
interface ResourceForm {
  title: string;
  description: string;
  content: string;
  resource_type: "article" | "video" | "guide";
  category: string;
  target_developmental_stages: string[];
  external_url: string;
  excerpt: string;
  tags: string[];
  status: "draft" | "published" | "archived";
}

/**
 * Converts Markdown text to HTML
 * Supports headers, lists, bold, italic, and paragraphs
 * 
 * @param markdown - Markdown text string
 * @returns HTML string
 */
const markdownToHtml = (markdown: string): string => {
  if (!markdown) return "";

  const lines = markdown.split("\n");
  const result: string[] = [];
  let inList = false;
  let listItems: string[] = [];
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const paraText = currentParagraph.join(" ").trim();
      if (paraText) {
        // Process inline formatting
        let processed = paraText
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/__(.+?)__/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>")
          .replace(/_(.+?)_/g, "<em>$1</em>");
        result.push(`<p>${processed}</p>`);
      }
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      const listHtml = listItems
        .map((item) => {
          // Process inline formatting in list items
          const processed = item
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/__(.+?)__/g, "<strong>$1</strong>")
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            .replace(/_(.+?)_/g, "<em>$1</em>");
          return `<li>${processed}</li>`;
        })
        .join("\n");
      result.push(`<ul>${listHtml}</ul>`);
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith("### ")) {
      flushList();
      flushParagraph();
      const text = trimmed.substring(4).trim();
      result.push(`<h3>${text}</h3>`);
    } else if (trimmed.startsWith("## ")) {
      flushList();
      flushParagraph();
      const text = trimmed.substring(3).trim();
      result.push(`<h2>${text}</h2>`);
    } else if (trimmed.startsWith("# ")) {
      flushList();
      flushParagraph();
      const text = trimmed.substring(2).trim();
      result.push(`<h1>${text}</h1>`);
    }
    // Unordered list items
    else if (/^[-*+]\s+/.test(trimmed)) {
      flushParagraph();
      if (!inList) {
        inList = true;
      }
      const text = trimmed.replace(/^[-*+]\s+/, "").trim();
      listItems.push(text);
    }
    // Ordered list items
    else if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      if (!inList) {
        inList = true;
      }
      const text = trimmed.replace(/^\d+\.\s+/, "").trim();
      listItems.push(text);
    }
    // Empty line
    else if (trimmed === "") {
      flushList();
      flushParagraph();
    }
    // Regular paragraph text
    else {
      flushList();
      currentParagraph.push(trimmed);
    }
  });

  // Flush any remaining content
  flushList();
  flushParagraph();

  return result.join("\n");
};

const ContentCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [formData, setFormData] = useState<ResourceForm>({
    title: "",
    description: "",
    content: "",
    resource_type: "article",
    category: "",
    target_developmental_stages: [],
    external_url: "",
    excerpt: "",
    tags: [],
    status: "draft",
  });

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<
    SelectedFileWithMetadata[]
  >([]);
  // Track attachment IDs to delete (only in edit mode, deleted when saving)
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<number[]>([]);
  const [newTag, setNewTag] = useState("");
  const [categoryOther, setCategoryOther] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedSelect, setFocusedSelect] = useState<string | null>(null);
  // Thumbnail upload state
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [thumbnailUploadError, setThumbnailUploadError] = useState<string>("");
  const [attachmentSizeError, setAttachmentSizeError] = useState<string>("");
  // Content preview state
  const [showContentPreview, setShowContentPreview] = useState(false);

  const categories = [
    "Behavior",
    "Development",
    "Sleep",
    "Nutrition",
    "Social-Emotional",
    "Technology",
    "Education",
    "Health",
    "Safety",
    "Communication",
    "Play",
    "Routine",
  ];

  // Developmental stage options (matching ProfessionalProfileSubmission.tsx, ages 0-12 only)
  const developmentalStageOptions = [
    { value: "newborn", label: "Newborn (0–2 months)" },
    { value: "infant", label: "Infant (2–12 months)" },
    { value: "toddler", label: "Toddler (1–3 years)" },
    { value: "early_childhood", label: "Early Childhood (3–5 years)" },
    { value: "middle_childhood", label: "Middle Childhood (6–12 years)" },
  ];

  useEffect(() => {
    if (isEditMode && id) {
      loadResource(parseInt(id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, id]);

  const loadResource = async (resourceId: number) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${API_BASE_URL}/api/content-manager/resources/${resourceId}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to load resource");
      }

      const data = await response.json();

      // Check if category is in predefined list or is "Other"
      const categoryValue = data.category || "";
      const isOtherCategory =
        categoryValue && !categories.includes(categoryValue);

      setFormData({
        title: data.title || "",
        description: data.description || "",
        content: data.content || "",
        resource_type: data.resource_type || "article",
        category: isOtherCategory ? "Other" : categoryValue,
        target_developmental_stages: Array.isArray(
          data.target_developmental_stages,
        )
          ? data.target_developmental_stages
          : data.target_developmental_stages
            ? [data.target_developmental_stages]
            : [],
        external_url: data.external_url || "",
        excerpt: data.excerpt || "",
        tags: data.tags || [],
        status: data.status || "draft",
      });

      // Set categoryOther if it's a custom category
      if (isOtherCategory) {
        setCategoryOther(categoryValue);
      }
      // Set attachments with preview URLs for images
      // Sort by display_order first, then reset display_order to match array indices (0, 1, 2...)
      // This ensures UI works with simple indices regardless of original display_order values
      const sortedAttachments = (data.attachments || []).sort(
        (a: any, b: any) => (a.display_order || 0) - (b.display_order || 0),
      );
      const attachmentsWithPreviews = sortedAttachments.map(
        (att: any, index: number) => ({
          ...att,
          display_order: index, // Reset to match array index
          preview:
            att.file_type === "image"
              ? att.preview || att.file_path
              : undefined,
        }),
      );
      setAttachments(attachmentsWithPreviews);
      // Reset attachments to delete when loading resource
      setAttachmentsToDelete([]);
      // Load thumbnail preview if exists
      if (data.thumbnail_url) {
        setThumbnailPreview(data.thumbnail_url);
      }
    } catch (error: any) {
      console.error("Error loading resource:", error);
      toast.error(error.message || "Failed to load resource");
      navigate("/content-manager");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ResourceForm, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-generate excerpt from content when content changes
      if (field === "content" && value) {
        // Strip HTML tags and get first 150-200 characters
        const textContent = value.replace(/<[^>]*>/g, "").trim();
        const excerpt = textContent.substring(0, 200).trim();
        if (excerpt) {
          updated.excerpt = excerpt;
        }
      }
      return updated;
    });
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      handleChange("tags", [...formData.tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tag: string) => {
    handleChange(
      "tags",
      formData.tags.filter((t) => t !== tag),
    );
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type - only images
      if (!file.type.startsWith("image/")) {
        setThumbnailUploadError("Please upload an image file (JPG, PNG, WebP)");
        return;
      }

      // Validate file size (5MB for thumbnails)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setThumbnailUploadError("Thumbnail image size must be less than 5MB");
        return;
      }

      setSelectedThumbnail(file);
      setThumbnailUploadError("");

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      const oversizedFiles: string[] = [];
      const validFiles = fileArray.filter((file) => {
        // Validate file type
        const fileType = file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
            ? "video"
            : file.type === "application/pdf"
              ? "document"
              : null;

        if (!fileType) {
          toast.error(`${file.name} is not a supported file type`);
          return false;
        }

        // Validate file size (10MB for all files)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          oversizedFiles.push(file.name);
          return false;
        }

        return true;
      });

      // Set attachment size error if any files are too large
      if (oversizedFiles.length > 0) {
        setAttachmentSizeError(
          `The following files exceed the 10MB limit: ${oversizedFiles.join(", ")}`,
        );
      } else {
        setAttachmentSizeError("");
      }

      if (validFiles.length > 0) {
        const attachmentsCount = attachments.filter(
          (att) => !attachmentsToDelete.includes(att.attachment_id || -1),
        ).length;
        const currentSelectedFilesCount = selectedFiles.length;
        const newFiles: SelectedFileWithMetadata[] = [];

        // Create previews and metadata for selected files
        // display_order should be the unified position (attachmentsCount + currentSelectedFilesCount + index)
        validFiles.forEach((file, index) => {
          const displayOrder =
            attachmentsCount + currentSelectedFilesCount + index;

          if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const fileWithMetadata: SelectedFileWithMetadata = {
                file,
                preview: reader.result as string,
                display_order: displayOrder,
              };
              setSelectedFiles((prev) => [...prev, fileWithMetadata]);
            };
            reader.readAsDataURL(file);
          } else {
            // For videos and documents, no preview needed
            const fileWithMetadata: SelectedFileWithMetadata = {
              file,
              display_order: displayOrder,
            };
            newFiles.push(fileWithMetadata);
          }
        });

        // Add non-image files immediately
        if (newFiles.length > 0) {
          setSelectedFiles((prev) => [...prev, ...newFiles]);
        }
      }
    }
  };

  // Build unified list from attachments and selectedFiles for display/reordering
  // Uses unified display_order that spans across both arrays
  // Both attachments and selectedFiles use display_order as their absolute position in the unified list (0, 1, 2, 3...)
  const buildUnifiedList = (): UnifiedFileItem[] => {
    const allItems: UnifiedFileItem[] = [];

    // Add all attachments - their display_order represents their unified position (0, 1, 2...)
    attachments
      .filter((att) => !attachmentsToDelete.includes(att.attachment_id || -1))
      .forEach((att) => {
        allItems.push({
          type: "attachment" as const,
          data: att,
          originalIndex: 0, // Not used
        });
      });

    // Add all selectedFiles - their display_order also represents their unified position (0, 1, 2...)
    selectedFiles.forEach((file) => {
      allItems.push({
        type: "selectedFile" as const,
        data: file,
        originalIndex: 0, // Not used
      });
    });

    // Sort by unified display_order (same for both types now)
    return allItems.sort((a, b) => {
      return a.data.display_order - b.data.display_order;
    });
  };

  // Move item in unified list (can swap across attachments and selectedFiles)
  const handleMoveUnifiedItem = (
    unifiedIndex: number,
    direction: "up" | "down",
  ) => {
    const unifiedList = buildUnifiedList();

    if (direction === "up" && unifiedIndex === 0) return;
    if (direction === "down" && unifiedIndex === unifiedList.length - 1) return;

    const newIndex = direction === "up" ? unifiedIndex - 1 : unifiedIndex + 1;

    // Create a new array with swapped items (don't mutate the original)
    const newUnifiedList = [...unifiedList];
    [newUnifiedList[unifiedIndex], newUnifiedList[newIndex]] = [
      newUnifiedList[newIndex],
      newUnifiedList[unifiedIndex],
    ];

    // Update display_order for all items based on their new position in unified list
    // Both types now use the same unified position (0, 1, 2, 3...)
    const newAttachments: Attachment[] = [];
    const newSelectedFiles: SelectedFileWithMetadata[] = [];

    newUnifiedList.forEach((item, index) => {
      if (item.type === "attachment") {
        newAttachments.push({
          ...item.data,
          display_order: index,
        });
      } else {
        newSelectedFiles.push({
          ...item.data,
          display_order: index,
        });
      }
    });

    // Update state - this will trigger a re-render and rebuild the unified list
    setAttachments(newAttachments);
    setSelectedFiles(newSelectedFiles);
  };

  const removeUnifiedFile = (unifiedIndex: number) => {
    const unifiedList = buildUnifiedList();
    const item = unifiedList[unifiedIndex];

    if (item.type === "attachment") {
      // Find the actual index in attachments array
      const attachmentIndex = attachments.findIndex(
        (att) =>
          att.attachment_id === item.data.attachment_id &&
          att.file_path === item.data.file_path,
      );
      if (attachmentIndex !== -1) {
        handleRemoveAttachment(attachmentIndex);
      }
    } else {
      setSelectedFiles((prev) => {
        const newFiles = prev.filter((f) => f.file !== item.data.file);
        // Reorder display_order
        const sorted = newFiles.sort(
          (a, b) => a.display_order - b.display_order,
        );
        return sorted.map((f, i) => ({
          ...f,
          display_order: i,
        }));
      });
    }
  };

  const handleRemoveAttachment = (index: number) => {
    const attachment = attachments[index];

    // In edit mode: mark for deletion (don't delete from database yet)
    // In create mode: just remove from UI state
    if (attachment.attachment_id && isEditMode) {
      // Mark this attachment for deletion when saving
      setAttachmentsToDelete((prev) => [...prev, attachment.attachment_id!]);
    }

    // Clean up preview URL if it exists
    if (attachment.preview) {
      URL.revokeObjectURL(attachment.preview);
    }

    // Remove from UI state and reorder display_order
    setAttachments((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((a, i) => ({ ...a, display_order: i })),
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.resource_type) {
      newErrors.resource_type = "Resource type is required";
    }

    if (!formData.category || formData.category === "") {
      newErrors.category = "Category is required";
    } else if (formData.category === "Other") {
      // If "Other" is selected, categoryOther must be filled
      if (!categoryOther.trim()) {
        newErrors.category = "Please specify the category";
      }
    }

    if (
      !formData.target_developmental_stages ||
      formData.target_developmental_stages.length === 0
    ) {
      newErrors.target_developmental_stages =
        "At least one target developmental stage is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (
      (formData.resource_type === "article" ||
        formData.resource_type === "guide") &&
      !formData.content.trim()
    ) {
      newErrors.content = "Content is required";
    }

    // Validate thumbnail - required
    if (!selectedThumbnail && !thumbnailPreview) {
      newErrors.thumbnail = "Thumbnail image is required";
    }

    // Validate attachments - required for all resource types
    if (attachments.length === 0 && selectedFiles.length === 0) {
      newErrors.attachments = "Attachments are required";
    } else {
      // Validate attachments based on resource type
      if (formData.resource_type === "video") {
        const hasVideo =
          attachments.some((a) => a.file_type === "video") ||
          selectedFiles.some((f) => f.file.type.startsWith("video/"));
        if (!hasVideo) {
          newErrors.attachments = "Video resource must have a video file";
        }
      } else if (formData.resource_type === "guide") {
        const hasDocument =
          attachments.some((a) => a.file_type === "document") ||
          selectedFiles.some((f) => f.file.type === "application/pdf");
        if (!hasDocument) {
          newErrors.attachments = "Guide resource must have a PDF file";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (publish: boolean = false) => {
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    if (publish) {
      setPublishing(true);
    } else {
      setSaving(true);
    }
    try {
      const token = localStorage.getItem("auth_token");

      // Handle category: if "Other" is selected, use categoryOther value
      const categoryValue =
        formData.category === "Other" && categoryOther
          ? categoryOther
          : formData.category;

      // Create resourceData (thumbnail_url will be added after upload)
      const resourceData: any = {
        ...formData,
        category: categoryValue,
        target_developmental_stages: formData.target_developmental_stages || [],
        status: publish ? "published" : formData.status,
        published_at: publish
          ? new Date().toISOString()
          : formData.status === "published"
            ? undefined
            : null,
      };

      // Upload thumbnail FIRST (before creating resource) - similar to community cover image
      let thumbnailUrl = "";
      if (selectedThumbnail) {
        // Upload thumbnail to temp folder first
        const thumbnailFormData = new FormData();
        thumbnailFormData.append("file", selectedThumbnail);

        const thumbnailEndpoint =
          isEditMode && id
            ? `${API_BASE_URL}/api/content-manager/resources/${id}/thumbnail`
            : `${API_BASE_URL}/api/content-manager/resources/thumbnail/upload`;

        const thumbnailResponse = await fetch(thumbnailEndpoint, {
          method: "POST",
          credentials: "include",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: thumbnailFormData,
        });

        if (!thumbnailResponse.ok) {
          const errorText = await thumbnailResponse.text();
          throw new Error(`Failed to upload thumbnail: ${errorText}`);
        }

        const thumbnailData = await thumbnailResponse.json();
        thumbnailUrl = thumbnailData.thumbnail_url || thumbnailData.url || "";
      } else if (thumbnailPreview && !thumbnailPreview.startsWith("data:")) {
        // Use existing thumbnail URL (not base64 data URL)
        thumbnailUrl = thumbnailPreview;
      } else if (!isEditMode) {
        // For new resources, thumbnail is required
        throw new Error("Thumbnail is required");
      }

      // Set thumbnail_url in resourceData (will be moved from temp to resource_id folder after creation)
      if (thumbnailUrl) {
        resourceData.thumbnail_url = thumbnailUrl;
      }

      let resourceId: number;
      if (isEditMode && id) {
        // Update existing resource
        const { API_BASE_URL } = await import("../config/api");
        const response = await fetch(
          `${API_BASE_URL}/api/content-manager/resources/${id}`,
          {
            method: "PUT",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(resourceData),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to update resource: ${errorText}`);
        }

        const data = await response.json();
        resourceId = data.resource_id || parseInt(id);
      } else {
        // Create new resource (now with thumbnail_url)
        const { API_BASE_URL } = await import("../config/api");
        const response = await fetch(
          `${API_BASE_URL}/api/content-manager/resources`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(resourceData),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to create resource: ${errorText}`);
        }

        const data = await response.json();
        resourceId = data.resource_id;
        // Thumbnail is already uploaded and will be moved from temp to resource_id folder by backend
      }

      // Upload selected files via API (which handles both storage and database)
      // Use unified list order to determine correct display_order
      if (selectedFiles.length > 0) {
        const unifiedList = buildUnifiedList();
        const sortedFiles = [...selectedFiles].sort(
          (a, b) => a.display_order - b.display_order,
        );

        for (let i = 0; i < sortedFiles.length; i++) {
          const selectedFile = sortedFiles[i];
          const file = selectedFile.file;

          // Find position in unified list to get correct display_order
          const unifiedIndex = unifiedList.findIndex(
            (item) => item.type === "selectedFile" && item.data.file === file,
          );

          const uploadFormData = new FormData();
          uploadFormData.append("file", file);
          // display_order should reflect position in unified list
          uploadFormData.append("display_order", unifiedIndex.toString());

          const uploadResponse = await fetch(
            `${API_BASE_URL}/api/content-manager/resources/${resourceId}/attachments`,
            {
              method: "POST",
              credentials: "include",
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: uploadFormData,
            },
          );

          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }
        }
        setSelectedFiles([]);
      }

      // For edit mode: Delete marked attachments, then update resource with remaining attachments
      if (isEditMode) {
        // First, delete attachments that were marked for deletion
        if (attachmentsToDelete.length > 0) {
          for (const attachmentId of attachmentsToDelete) {
            try {
              const deleteResponse = await fetch(
                `${API_BASE_URL}/api/content-manager/attachments/${attachmentId}`,
                {
                  method: "DELETE",
                  credentials: "include",
                  headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                },
              );

              if (!deleteResponse.ok) {
                console.error(`Failed to delete attachment ${attachmentId}`);
                // Continue with other deletions even if one fails
              }
            } catch (error) {
              console.error(
                `Error deleting attachment ${attachmentId}:`,
                error,
              );
              // Continue with other deletions even if one fails
            }
          }
        }

        // Reload resource to get all remaining attachments (existing + newly uploaded)
        const reloadResponse = await fetch(
          `${API_BASE_URL}/api/content-manager/resources/${resourceId}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );

        if (reloadResponse.ok) {
          const reloadData = await reloadResponse.json();
          // Get all attachments from backend (existing + newly uploaded, excluding deleted ones)
          const allAttachments = (reloadData.attachments || []).filter(
            (att: any) => !attachmentsToDelete.includes(att.attachment_id),
          );

          // Map existing attachments from state to their current order
          // Newly uploaded attachments are already in the backend
          const existingAttachmentPaths = new Set(
            attachments.map((a) => a.file_path),
          );
          const newAttachments = allAttachments.filter(
            (att: any) => !existingAttachmentPaths.has(att.file_path),
          );

          // Combine: existing attachments (in current UI order from state) + newly uploaded ones
          // Exclude attachments that were marked for deletion
          const orderedAttachments = [
            ...attachments
              .filter(
                (att) => !attachmentsToDelete.includes(att.attachment_id || -1),
              ) // Exclude deleted attachments
              .map((att) => {
                // Find matching attachment from backend by file_path
                const backendAtt = allAttachments.find(
                  (a: any) => a.file_path === att.file_path,
                );
                return backendAtt || att;
              }),
            ...newAttachments,
          ];

          // Use unified list order to determine correct display_order for all attachments
          const unifiedList = buildUnifiedList();

          // Map current UI order to display_order based on unified list position
          const attachmentData = orderedAttachments.map((att: any) => {
            // Find position in unified list
            const unifiedIndex = unifiedList.findIndex(
              (item) =>
                item.type === "attachment" &&
                item.data.file_path === att.file_path &&
                item.data.attachment_id === att.attachment_id,
            );

            return {
              file_name: att.file_name,
              file_path: att.file_path,
              file_type: att.file_type,
              file_size: att.file_size,
              mime_type: att.mime_type,
              display_order:
                unifiedIndex >= 0
                  ? unifiedIndex
                  : orderedAttachments.indexOf(att), // Use unified list position or fallback
            };
          });

          // Update resource with all attachments (backend will replace - delete old files, keep new ones)
          if (attachmentData.length > 0) {
            const updateResponse = await fetch(
              `${API_BASE_URL}/api/content-manager/resources/${resourceId}`,
              {
                method: "PUT",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                  attachments: attachmentData,
                }),
              },
            );

            if (!updateResponse.ok) {
              throw new Error("Failed to update attachments");
            }
          } else if (
            attachments.filter(
              (att) => !attachmentsToDelete.includes(att.attachment_id || -1),
            ).length === 0 &&
            selectedFiles.length === 0
          ) {
            // If no attachments remain (after filtering out deleted ones), explicitly set empty array to delete all
            const updateResponse = await fetch(
              `${API_BASE_URL}/api/content-manager/resources/${resourceId}`,
              {
                method: "PUT",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                  attachments: [],
                }),
              },
            );

            if (!updateResponse.ok) {
              throw new Error("Failed to update attachments");
            }
          }
        }

        // Clear attachments to delete after successful save
        setAttachmentsToDelete([]);
      }

      // Navigate with success message in URL params
      const successMessage = publish
        ? "Resource published successfully!"
        : isEditMode
          ? "Resource updated successfully!"
          : "Resource saved as draft";
      navigate(
        `/content-manager?success=${encodeURIComponent(successMessage)}&tab=content`,
      );
    } catch (error: any) {
      console.error("Error saving resource:", error);
      toast.error(error.message || "Failed to save resource");
    } finally {
      if (publish) {
        setPublishing(false);
      } else {
        setSaving(false);
      }
    }
  };

  const getInputStyles = (value: any, hasError: boolean = false) => ({
    borderColor: hasError ? "#D63B3B" : "#AA855B",
    backgroundColor: value ? "#F5F5F5" : "#EDEDED",
    color: "#32332D",
    borderRadius: "12px",
    borderWidth: hasError ? "2px" : "1px",
    fontFamily: "'Poppins', sans-serif",
    fontSize: "14px",
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

  const getInputBlurStyles = (value: any, hasError: boolean = false) => ({
    backgroundColor: value ? "#F5F5F5" : "#EDEDED",
    borderColor: hasError ? "#D63B3B" : "#AA855B",
    boxShadow: "none",
  });

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#F5F5F5" }}
      >
        <CircularProgress style={{ color: "#326586" }} />
      </div>
    );
  }

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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <button
                onClick={() => {
                  // Get the last tab from sessionStorage, default to 'overview'
                  const lastTab =
                    sessionStorage.getItem("contentManagerLastTab") ||
                    "overview";
                  navigate(`/content-manager?tab=${lastTab}`);
                }}
                className="p-1.5 sm:p-2 rounded-lg transition-all duration-200 flex-shrink-0"
                style={{
                  backgroundColor: "transparent",
                  color: "#AA855B",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#F0DCC9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                <div
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#F2742C" }}
                >
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h1
                    className="font-bold truncate"
                    style={{
                      color: "#32332D",
                      fontSize: "1rem",
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    <span className="sm:hidden">
                      {isEditMode ? "Edit" : "Create"}
                    </span>
                    <span className="hidden sm:inline">
                      {isEditMode ? "Edit Resource" : "Create New Resource"}
                    </span>
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3 flex-shrink-0">
              <button
                onClick={() => handleSave(false)}
                disabled={saving || publishing}
                className="flex items-center space-x-1 sm:space-x-2 px-2.5 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                style={{
                  backgroundColor: "#AA855B",
                  color: "#F5F5F5",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "11px",
                  opacity: saving || publishing ? 0.6 : 1,
                  cursor: saving || publishing ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!saving && !publishing) {
                    e.currentTarget.style.backgroundColor = "#8B6F4A";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving && !publishing) {
                    e.currentTarget.style.backgroundColor = "#AA855B";
                  }
                }}
              >
                {saving ? (
                  <>
                    <CircularProgress size={12} style={{ color: "#F5F5F5" }} />
                    <span className="hidden sm:inline">
                      {isEditMode ? "Updating..." : "Saving..."}
                    </span>
                    <span className="sm:hidden">
                      {isEditMode ? "Updating..." : "Saving..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">
                      {isEditMode ? "Update Draft" : "Save Draft"}
                    </span>
                    <span className="sm:hidden">
                      {isEditMode ? "Update" : "Save"}
                    </span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving || publishing}
                className="flex items-center space-x-1 sm:space-x-2 px-2.5 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                style={{
                  backgroundColor: "#0F5648",
                  color: "#F5F5F5",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "11px",
                  opacity: saving || publishing ? 0.6 : 1,
                  cursor: saving || publishing ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!saving && !publishing) {
                    e.currentTarget.style.backgroundColor = "#0A4538";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving && !publishing) {
                    e.currentTarget.style.backgroundColor = "#0F5648";
                  }
                }}
              >
                {publishing ? (
                  <>
                    <CircularProgress size={12} style={{ color: "#F5F5F5" }} />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Publish</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 md:py-8">
        <div className="space-y-6">
          {/* Row 1: Resource Type | Category (2 columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Resource Type */}
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "#32332D" }}
              >
                Resource Type <span style={{ color: "#D63B3B" }}>*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={formData.resource_type}
                  onChange={(e) =>
                    handleChange("resource_type", e.target.value)
                  }
                  onFocus={() => {
                    setFocusedSelect("resource_type");
                    const element = document.activeElement as HTMLSelectElement;
                    if (element) {
                      Object.assign(element.style, getInputFocusStyles());
                    }
                  }}
                  onBlur={() => {
                    setFocusedSelect(null);
                    const element = document.activeElement as HTMLSelectElement;
                    if (element) {
                      Object.assign(
                        element.style,
                        getInputBlurStyles(
                          formData.resource_type,
                          !!errors.resource_type,
                        ),
                      );
                    }
                  }}
                  className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 custom-select"
                  style={{
                    ...getInputStyles(
                      formData.resource_type,
                      !!errors.resource_type,
                    ),
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
                      getInputBlurStyles(
                        formData.resource_type,
                        !!errors.resource_type,
                      ),
                    )
                  }
                >
                  <option value="article">Article</option>
                  <option value="video">Video</option>
                  <option value="guide">Guide</option>
                </select>
                {focusedSelect === "resource_type" ? (
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
              {errors.resource_type && (
                <p className="text-xs mt-1" style={{ color: "#D63B3B" }}>
                  {errors.resource_type}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: "#32332D" }}
              >
                Category <span style={{ color: "#D63B3B" }}>*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={
                    formData.category === "Other" ||
                    (formData.category &&
                      !categories.includes(formData.category))
                      ? "Other"
                      : formData.category
                  }
                  onChange={(e) => {
                    const selectedValue = e.target.value;
                    if (selectedValue === "Other") {
                      handleChange("category", "Other");
                      // Keep categoryOther value if it exists, otherwise clear it
                      if (!categoryOther) {
                        setCategoryOther("");
                      }
                    } else {
                      handleChange("category", selectedValue);
                      setCategoryOther("");
                    }
                  }}
                  onFocus={() => {
                    setFocusedSelect("category");
                    const element = document.activeElement as HTMLSelectElement;
                    if (element) {
                      Object.assign(element.style, getInputFocusStyles());
                    }
                  }}
                  onBlur={(e) => {
                    // Don't blur if clicking on the "Other" input field
                    const relatedTarget = e.relatedTarget as HTMLElement;
                    if (
                      relatedTarget &&
                      relatedTarget.closest(".category-other-input")
                    ) {
                      return;
                    }
                    setFocusedSelect(null);
                    const element = document.activeElement as HTMLSelectElement;
                    if (element) {
                      Object.assign(
                        element.style,
                        getInputBlurStyles(
                          formData.category,
                          !!errors.category,
                        ),
                      );
                    }
                  }}
                  className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 custom-select"
                  style={{
                    ...getInputStyles(formData.category, !!errors.category),
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
                      getInputBlurStyles(formData.category, !!errors.category),
                    )
                  }
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
                {focusedSelect === "category" ? (
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
              {formData.category === "Other" && (
                <div className="mt-2 category-other-input">
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "#32332D" }}
                  >
                    Specify category <span style={{ color: "#D63B3B" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={categoryOther}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCategoryOther(value);
                      // Don't update formData.category here - keep it as 'Other'
                    }}
                    onMouseDown={(e) => {
                      // Prevent the select from losing focus when clicking on the input
                      e.preventDefault();
                      (e.target as HTMLInputElement).focus();
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                    style={getInputStyles(categoryOther, !!errors.category)}
                    onMouseEnter={(e) =>
                      Object.assign(
                        (e.target as HTMLInputElement).style,
                        getInputHoverStyles(),
                      )
                    }
                    onMouseLeave={(e) =>
                      Object.assign(
                        (e.target as HTMLInputElement).style,
                        getInputBlurStyles(categoryOther, !!errors.category),
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
                        getInputBlurStyles(categoryOther, !!errors.category),
                      )
                    }
                    placeholder="Specify category"
                  />
                </div>
              )}
              {errors.category && (
                <p className="text-xs mt-1" style={{ color: "#D63B3B" }}>
                  {errors.category}
                </p>
              )}
            </div>
          </div>

          {/* Row 2: Target Developmental Stages (Full width) */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Target Developmental Stages{" "}
              <span style={{ color: "#D63B3B" }}>*</span>
            </label>
            <Autocomplete
              multiple
              options={developmentalStageOptions.map((opt) => opt.value)}
              value={formData.target_developmental_stages || []}
              onChange={(_, newValue) =>
                handleChange("target_developmental_stages", newValue)
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
                      fontSize: "0.75rem",
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
                  placeholder="Select developmental stages (ages 0-12)"
                  helperText={
                    errors.target_developmental_stages ||
                    "Select one or more age groups this resource targets"
                  }
                  error={!!errors.target_developmental_stages}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      backgroundColor:
                        (formData.target_developmental_stages || []).length > 0
                          ? "#F5F5F5"
                          : "#EDEDED",
                      fontFamily: "'Poppins', sans-serif",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: errors.target_developmental_stages
                          ? "#D63B3B"
                          : "#AA855B",
                        borderWidth: errors.target_developmental_stages
                          ? "2px"
                          : "1px",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: errors.target_developmental_stages
                          ? "#D63B3B"
                          : "#AA855B",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: errors.target_developmental_stages
                          ? "#D63B3B"
                          : "#F2742C",
                        borderWidth: "2px",
                      },
                    },
                    "& .MuiFormHelperText-root": {
                      color: errors.target_developmental_stages
                        ? "#D63B3B"
                        : "#AA855B",
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: "12px",
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
                    !(formData.target_developmental_stages || []).includes(
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
                        formData.target_developmental_stages || [];
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
            {errors.target_developmental_stages && (
              <p className="text-xs mt-1" style={{ color: "#D63B3B" }}>
                {errors.target_developmental_stages}
              </p>
            )}
          </div>

          {/* Thumbnail Upload Section - Above Title */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "#32332D" }}
            >
              Thumbnail Image <span style={{ color: "#D63B3B" }}>*</span>
            </label>
            {thumbnailPreview ? (
              <div className="space-y-2">
                <div className="relative">
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="w-full h-48 object-cover rounded-lg border"
                    style={{ borderColor: "#AA855B" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedThumbnail(null);
                      setThumbnailPreview("");
                      setThumbnailUploadError("");
                      // Reset file input
                      const fileInput = document.getElementById(
                        "thumbnail-upload",
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
                style={{ borderColor: "#AA855B" }}
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleThumbnailSelect}
                  className="hidden"
                  id="thumbnail-upload"
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
                    htmlFor="thumbnail-upload"
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
            {thumbnailUploadError && (
              <p className="text-xs mt-1" style={{ color: "#D63B3B" }}>
                {thumbnailUploadError}
              </p>
            )}
            {errors.thumbnail && (
              <p className="text-xs mt-1" style={{ color: "#D63B3B" }}>
                {errors.thumbnail}
              </p>
            )}
          </div>

          {/* Row 2: Title */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Title <span style={{ color: "#D63B3B" }}>*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
              style={getInputStyles(formData.title, !!errors.title)}
              onMouseEnter={(e) =>
                Object.assign(
                  (e.target as HTMLInputElement).style,
                  getInputHoverStyles(),
                )
              }
              onMouseLeave={(e) =>
                Object.assign(
                  (e.target as HTMLInputElement).style,
                  getInputBlurStyles(formData.title, !!errors.title),
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
                  getInputBlurStyles(formData.title, !!errors.title),
                )
              }
              placeholder="Enter resource title"
            />
            {errors.title && (
              <p className="text-xs mt-1" style={{ color: "#D63B3B" }}>
                {errors.title}
              </p>
            )}
          </div>

          {/* Row 3: Description */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Description <span style={{ color: "#D63B3B" }}>*</span>
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 resize-none"
              style={getInputStyles(formData.description, !!errors.description)}
              onMouseEnter={(e) =>
                Object.assign(
                  (e.target as HTMLTextAreaElement).style,
                  getInputHoverStyles(),
                )
              }
              onMouseLeave={(e) =>
                Object.assign(
                  (e.target as HTMLTextAreaElement).style,
                  getInputBlurStyles(
                    formData.description,
                    !!errors.description,
                  ),
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
                  getInputBlurStyles(
                    formData.description,
                    !!errors.description,
                  ),
                )
              }
              placeholder="Enter resource description"
            />
            {errors.description && (
              <p className="text-xs mt-1" style={{ color: "#D63B3B" }}>
                {errors.description}
              </p>
            )}
          </div>

          {/* Row 4: Content (for articles/guides) */}
          {(formData.resource_type === "article" ||
            formData.resource_type === "guide") && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  className="block text-sm font-medium"
                  style={{ color: "#32332D" }}
                >
                  Content <span style={{ color: "#D63B3B" }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowContentPreview(true)}
                  disabled={!formData.content.trim()}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all duration-200 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: formData.content.trim()
                      ? "#0F5648"
                      : "#EDEDED",
                    color: formData.content.trim() ? "#F5F5F5" : "#AA855B",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    if (formData.content.trim()) {
                      e.currentTarget.style.backgroundColor = "#0A4538";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (formData.content.trim()) {
                      e.currentTarget.style.backgroundColor = "#0F5648";
                    }
                  }}
                >
                  <Eye className="w-3 h-3" />
                  <span>Preview</span>
                </button>
              </div>
              <textarea
                required
                value={formData.content}
                onChange={(e) => handleChange("content", e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 resize-none"
                style={getInputStyles(formData.content, !!errors.content)}
                onMouseEnter={(e) =>
                  Object.assign(
                    (e.target as HTMLTextAreaElement).style,
                    getInputHoverStyles(),
                  )
                }
                onMouseLeave={(e) =>
                  Object.assign(
                    (e.target as HTMLTextAreaElement).style,
                    getInputBlurStyles(formData.content, !!errors.content),
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
                    getInputBlurStyles(formData.content, !!errors.content),
                  )
                }
                placeholder="Enter resource content (HTML or Markdown formatting supported)"
              />
              <p className="text-xs mt-1" style={{ color: "#AA855B" }}>
                You can use HTML (e.g., &lt;b&gt;bold&lt;/b&gt;,
                &lt;strong&gt;strong&lt;/strong&gt;,
                &lt;p&gt;paragraph&lt;/p&gt;) or Markdown (e.g., **bold**, ##
                heading, - list item)
              </p>
              {errors.content && (
                <p className="text-xs mt-1" style={{ color: "#D63B3B" }}>
                  {errors.content}
                </p>
              )}
            </div>
          )}

          {/* Row 5: External URL (Optional) */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              External URL (Optional)
            </label>
            <input
              type="url"
              value={formData.external_url}
              onChange={(e) => handleChange("external_url", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
              style={getInputStyles(formData.external_url)}
              onMouseEnter={(e) =>
                Object.assign(
                  (e.target as HTMLInputElement).style,
                  getInputHoverStyles(),
                )
              }
              onMouseLeave={(e) =>
                Object.assign(
                  (e.target as HTMLInputElement).style,
                  getInputBlurStyles(formData.external_url),
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
                  getInputBlurStyles(formData.external_url),
                )
              }
              placeholder="https://..."
            />
            <p className="text-xs mt-1" style={{ color: "#AA855B" }}>
              For resources hosted outside the platform
            </p>
          </div>

          {/* Row 6: Tags (Optional) */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "#32332D" }}
            >
              Tags (Optional)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: "#DBEAFE",
                    color: "#2563EB",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:opacity-70"
                    style={{ color: "#2563EB" }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Add tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                  style={getInputStyles(newTag)}
                  onMouseEnter={(e) =>
                    Object.assign(
                      (e.target as HTMLInputElement).style,
                      getInputHoverStyles(),
                    )
                  }
                  onMouseLeave={(e) =>
                    Object.assign(
                      (e.target as HTMLInputElement).style,
                      getInputBlurStyles(newTag),
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
                      getInputBlurStyles(newTag),
                    )
                  }
                />
                <p className="text-xs mt-1" style={{ color: "#AA855B" }}>
                  Press comma, enter or click Add to create a tag
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddTag}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium self-start"
                style={{
                  backgroundColor: "#0F5648",
                  color: "#F5F5F5",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "14px",
                  marginTop: "0px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#0A4538";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#0F5648";
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Row 7: Resources Attachments */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "#32332D" }}
            >
              Resources Attachments <span style={{ color: "#D63B3B" }}>*</span>
            </label>

            {/* File Upload Area */}
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 hover:bg-gray-50"
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
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                disabled={false}
                id="attachment-upload"
                multiple
              />
              <div className="space-y-2">
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{
                      color: "#32332D",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    Drop files here or click to upload
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{
                      color: "#AA855B",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    Images (JPG, PNG, WebP), Videos (MP4, WebM), Documents (PDF)
                    (max 10MB each)
                  </p>
                </div>
                <label
                  htmlFor="attachment-upload"
                  className="inline-block px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200"
                  style={{
                    backgroundColor: "#F2742C",
                    color: "#F5F5F5",
                    fontFamily: "'Poppins', sans-serif",
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
            {errors.attachments && (
              <p className="text-xs mt-1" style={{ color: "#D63B3B" }}>
                {errors.attachments}
              </p>
            )}

            {/* File Size Warning */}
            {attachmentSizeError && (
              <div
                className="mt-2 p-3 rounded-lg"
                style={{
                  backgroundColor: "#FFEBEE",
                  border: "1px solid #D63B3B",
                }}
              >
                <p
                  className="text-xs font-['Poppins']"
                  style={{ color: "#D63B3B" }}
                >
                  {attachmentSizeError}
                </p>
              </div>
            )}

            {/* Unified Files List - All files together (attachments + selectedFiles) */}
            {(() => {
              const unifiedList = buildUnifiedList();
              if (unifiedList.length === 0) return null;

              return (
                <div className="space-y-3 mt-4">
                  <h3
                    className="text-sm font-medium mb-2"
                    style={{
                      color: "#32332D",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    Selected Files ({unifiedList.length})
                  </h3>
                  <div className="space-y-3">
                    {unifiedList.map((item, unifiedIndex) => {
                      let fileName: string;
                      let fileType: "image" | "video" | "document";
                      let fileSize: number | undefined;
                      let preview: string | undefined;
                      let key: string;
                      let removeTitle: string;

                      if (item.type === "attachment") {
                        const attachment = item.data;
                        fileName = attachment.file_name;
                        fileType = attachment.file_type;
                        fileSize = attachment.file_size;
                        preview =
                          attachment.file_type === "image"
                            ? attachment.preview || attachment.file_path
                            : undefined;
                        key = `att-${attachment.attachment_id || attachment.file_path}`;
                        removeTitle =
                          "Remove attachment (will be deleted when you save)";
                      } else {
                        const selectedFile = item.data;
                        if (!selectedFile.file) return null;
                        fileName = selectedFile.file.name;
                        fileType = selectedFile.file.type.startsWith("image/")
                          ? "image"
                          : selectedFile.file.type.startsWith("video/")
                            ? "video"
                            : selectedFile.file.type === "application/pdf"
                              ? "document"
                              : "image";
                        fileSize = selectedFile.file.size;
                        preview = selectedFile.preview;
                        key = `sel-${selectedFile.file.name}-${selectedFile.file.size}`;
                        removeTitle = "Remove file";
                      }

                      const canMoveUp = unifiedIndex > 0;
                      const canMoveDown = unifiedIndex < unifiedList.length - 1;

                      return (
                        <div
                          key={key}
                          className="p-3 sm:p-4 rounded-lg flex items-center gap-2 sm:gap-4 border"
                          style={{
                            backgroundColor: "#FFFFFF",
                            borderColor: "#AA855B",
                          }}
                        >
                          {/* Preview and file info */}
                          {fileType === "image" && preview ? (
                            <img
                              src={preview}
                              alt={fileName}
                              className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg flex-shrink-0"
                              style={{ border: "1px solid #F0DCC9" }}
                            />
                          ) : fileType === "video" ? (
                            <div
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{
                                backgroundColor: "#FEE2E2",
                                border: "1px solid #F0DCC9",
                              }}
                            >
                              <VideoIcon
                                className="w-5 h-5 sm:w-6 sm:h-6"
                                style={{ color: "#DC2626" }}
                              />
                            </div>
                          ) : (
                            <div
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{
                                backgroundColor: "#DCFCE7",
                                border: "1px solid #F0DCC9",
                              }}
                            >
                              <FileText
                                className="w-5 h-5 sm:w-6 sm:h-6"
                                style={{ color: "#0F5648" }}
                              />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <p
                              className="font-medium font-['Poppins'] text-xs sm:text-sm"
                              style={{ color: "#32332D" }}
                            >
                              {fileName}
                            </p>
                            <p
                              className="text-[10px] sm:text-xs"
                              style={{ color: "#AA855B" }}
                            >
                              {fileType} •{" "}
                              {fileSize
                                ? `${(fileSize / 1024 / 1024).toFixed(2)} MB`
                                : "Unknown size"}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 sm:gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveUnifiedItem(unifiedIndex, "up");
                              }}
                              disabled={!canMoveUp}
                              className="p-2 sm:p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                              style={{
                                backgroundColor: !canMoveUp
                                  ? "transparent"
                                  : "#EDEDED",
                                color: "#AA855B",
                                minWidth: "36px",
                                minHeight: "36px",
                              }}
                              onMouseEnter={(e) => {
                                if (canMoveUp) {
                                  e.currentTarget.style.backgroundColor =
                                    "#F0DCC9";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (canMoveUp) {
                                  e.currentTarget.style.backgroundColor =
                                    "#EDEDED";
                                }
                              }}
                            >
                              <ArrowUp className="w-4 h-4 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveUnifiedItem(unifiedIndex, "down");
                              }}
                              disabled={!canMoveDown}
                              className="p-2 sm:p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                              style={{
                                backgroundColor: !canMoveDown
                                  ? "transparent"
                                  : "#EDEDED",
                                color: "#AA855B",
                                minWidth: "36px",
                                minHeight: "36px",
                              }}
                              onMouseEnter={(e) => {
                                if (canMoveDown) {
                                  e.currentTarget.style.backgroundColor =
                                    "#F0DCC9";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (canMoveDown) {
                                  e.currentTarget.style.backgroundColor =
                                    "#EDEDED";
                                }
                              }}
                            >
                              <ArrowDown className="w-4 h-4 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeUnifiedFile(unifiedIndex);
                              }}
                              className="p-2 sm:p-2 rounded-lg transition-all duration-200 touch-manipulation"
                              style={{
                                backgroundColor: "transparent",
                                color: "#D63B3B",
                                minWidth: "36px",
                                minHeight: "36px",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#FFEBEE";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                              }}
                              title={removeTitle}
                            >
                              <X className="w-4 h-4 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Content Preview Dialog - Full screen on mobile/tablet, modal on desktop */}
      {showContentPreview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4"
          onClick={() => setShowContentPreview(false)}
        >
          <div
            className="bg-white rounded-none sm:rounded-xl max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col font-['Poppins'] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ border: "2px solid #AA855B" }}
          >
            {/* Modal Header */}
            <div
              className="p-3 sm:p-4 md:p-6 border-b flex items-center justify-between flex-shrink-0"
              style={{ borderColor: "#AA855B", backgroundColor: "#FAEFE2" }}
            >
              <h2
                className="text-base sm:text-lg md:text-xl font-bold font-['Poppins']"
                style={{ color: "#32332D" }}
              >
                Content Preview
              </h2>
              <button
                onClick={() => setShowContentPreview(false)}
                className="p-1.5 sm:p-2 rounded-full transition-all duration-200 flex-shrink-0"
                style={{ color: "#AA855B" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#F0DCC9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div
              className="p-3 sm:p-4 md:p-6 overflow-y-auto flex-1"
              style={{ backgroundColor: "#F5F5F5" }}
            >
              <div
                className="content-preview"
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  color: "#32332D",
                  lineHeight: "1.6",
                }}
                dangerouslySetInnerHTML={{
                  __html: formData.content
                    ? formData.content.includes("<") &&
                      formData.content.includes(">")
                      ? formData.content
                      : markdownToHtml(formData.content)
                    : '<p style="color: #9CA3AF;">No content to preview</p>',
                }}
              />
              <style>{`
            .content-preview {
              font-size: 14px;
              line-height: 1.6;
            }
            .content-preview h1 {
              font-size: 2em;
              font-weight: 700;
              margin-top: 1em;
              margin-bottom: 0.5em;
              color: #32332D;
              line-height: 1.2;
            }
            .content-preview h2 {
              font-size: 1.5em;
              font-weight: 600;
              margin-top: 0.8em;
              margin-bottom: 0.4em;
              color: #32332D;
              line-height: 1.3;
            }
            .content-preview h3 {
              font-size: 1.25em;
              font-weight: 600;
              margin-top: 0.6em;
              margin-bottom: 0.3em;
              color: #32332D;
              line-height: 1.4;
            }
            .content-preview h4 {
              font-size: 1.1em;
              font-weight: 600;
              margin-top: 0.5em;
              margin-bottom: 0.3em;
              color: #32332D;
            }
            .content-preview p {
              margin-top: 0.5em;
              margin-bottom: 0.5em;
              color: #32332D;
            }
            .content-preview strong,
            .content-preview b {
              font-weight: 600;
              color: #32332D;
            }
            .content-preview em,
            .content-preview i {
              font-style: italic;
            }
            .content-preview ul,
            .content-preview ol {
              margin-top: 0.5em;
              margin-bottom: 0.5em;
              padding-left: 1.5em;
            }
            .content-preview ul {
              list-style-type: disc;
            }
            .content-preview ol {
              list-style-type: decimal;
            }
            .content-preview li {
              margin-top: 0.25em;
              margin-bottom: 0.25em;
              color: #32332D;
            }
            .content-preview ul ul,
            .content-preview ol ol,
            .content-preview ul ol,
            .content-preview ol ul {
              margin-top: 0.25em;
              margin-bottom: 0.25em;
            }
            .content-preview a {
              color: #326586;
              text-decoration: underline;
            }
            .content-preview a:hover {
              color: #1A4A6B;
            }
            .content-preview blockquote {
              border-left: 4px solid #AA855B;
              padding-left: 1em;
              margin-left: 0;
              margin-top: 0.5em;
              margin-bottom: 0.5em;
              font-style: italic;
              color: #64635E;
            }
            .content-preview code {
              background-color: #F5F5F5;
              padding: 0.2em 0.4em;
              border-radius: 4px;
              font-family: 'Courier New', monospace;
              font-size: 0.9em;
              color: #DC2626;
            }
            .content-preview pre {
              background-color: #F5F5F5;
              padding: 1em;
              border-radius: 8px;
              overflow-x: auto;
              margin-top: 0.5em;
              margin-bottom: 0.5em;
            }
            .content-preview pre code {
              background-color: transparent;
              padding: 0;
              color: #32332D;
            }
            .content-preview hr {
              border: none;
              border-top: 1px solid #E5E5E5;
              margin-top: 1em;
              margin-bottom: 1em;
            }
            .content-preview img {
              max-width: 100%;
              height: auto;
              border-radius: 8px;
              margin-top: 0.5em;
              margin-bottom: 0.5em;
            }
          `}</style>
            </div>

            {/* Modal Footer */}
            <div
              className="p-3 sm:p-4 md:p-6 border-t flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 flex-shrink-0"
              style={{ borderColor: "#AA855B", backgroundColor: "#FAEFE2" }}
            >
              <button
                onClick={() => setShowContentPreview(false)}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border rounded-xl transition-all duration-200 font-medium font-['Poppins'] text-sm sm:text-base"
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
                Close
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

export default ContentCreationPage;
