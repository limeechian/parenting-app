// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: AttachmentGallery.tsx
// Description: To provide image and video gallery component for displaying attachments
// First Written on: Monday, 06-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React hooks for state management and side effects
import React, { useState, useEffect } from "react";
// Import icons from lucide-react for UI elements
import {
  X,
  Play,
  Image as ImageIcon,
  Video,
  Maximize2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/**
 * Attachment interface
 * Defines the structure of an attachment object with file metadata
 */
interface Attachment {
  attachment_id: number; // Unique identifier for the attachment
  file_name: string; // Original filename
  file_path: string; // URL or path to the file
  file_type: string; // Type of file: 'image' or 'video'
  file_size?: number; // File size in bytes (optional)
  mime_type?: string; // MIME type of the file (optional)
  description?: string; // Optional description of the attachment
  is_primary?: boolean; // Whether this is the primary attachment (optional)
  created_at?: string; // Timestamp when attachment was created (optional)
}

/**
 * AttachmentGalleryProps interface
 * Defines the properties that can be passed to the AttachmentGallery component
 */
interface AttachmentGalleryProps {
  attachments: Attachment[]; // Array of attachments to display
  onDelete?: (attachmentId: number) => void; // Callback when attachment is deleted
  onMarkForDeletion?: (attachmentId: number) => void; // Callback to mark attachment for deletion
  onUnmarkForDeletion?: (attachmentId: number) => void; // Callback to unmark attachment from deletion
  markedForDeletion?: number[]; // Array of attachment IDs marked for deletion
  showActions?: boolean; // Whether to show action buttons (default: true)
  maxThumbnails?: number; // Maximum number of thumbnails to display (default: 6)
}

/**
 * AttachmentGallery Component
 *
 * A gallery component that displays image and video attachments in a grid layout.
 * Supports lightbox modal for full-screen viewing, keyboard navigation, and deletion marking.
 *
 * @param props - Component props defined in AttachmentGalleryProps interface
 * @returns JSX element representing the attachment gallery, or null if no attachments
 */
const AttachmentGallery: React.FC<AttachmentGalleryProps> = ({
  attachments,
  onDelete,
  onMarkForDeletion,
  onUnmarkForDeletion,
  markedForDeletion = [],
  showActions = true,
  maxThumbnails = 6,
}) => {
  // State for managing the lightbox modal
  const [selectedAttachment, setSelectedAttachment] =
    useState<Attachment | null>(null); // Currently selected attachment in lightbox
  const [currentIndex, setCurrentIndex] = useState(0); // Index of current attachment in lightbox

  /**
   * Closes the lightbox modal and resets the current index
   */
  const closeModal = () => {
    setSelectedAttachment(null);
    setCurrentIndex(0);
  };

  /**
   * Effect hook to automatically close modal if the selected attachment is deleted
   * Prevents showing deleted attachments in the lightbox
   */
  useEffect(() => {
    if (selectedAttachment) {
      // Check if the selected attachment still exists in the attachments array
      const attachmentStillExists = attachments.some(
        (att) => att.attachment_id === selectedAttachment.attachment_id,
      );
      // Close modal if attachment no longer exists
      if (!attachmentStillExists) {
        closeModal();
      }
    }
  }, [attachments, selectedAttachment]);

  // Return null if there are no attachments to display
  if (!attachments || attachments.length === 0) {
    return null;
  }

  // Filter attachments by type
  const images = attachments.filter((att) => att.file_type === "image"); // All image attachments
  const videos = attachments.filter((att) => att.file_type === "video"); // All video attachments
  const allMedia = [...images, ...videos]; // Combined array of all media (images first, then videos)
  const displayAttachments = allMedia.slice(0, maxThumbnails); // Limit displayed thumbnails to maxThumbnails

  /**
   * Opens the lightbox modal for viewing an attachment in full screen
   * @param attachment - The attachment to display in the lightbox
   * @param index - The index of the attachment in the display array
   */
  const openModal = (attachment: Attachment, index: number) => {
    // Find the actual index in allMedia array for proper navigation
    const actualIndex = allMedia.findIndex(
      (att) => att.attachment_id === attachment.attachment_id,
    );
    setSelectedAttachment(attachment);
    setCurrentIndex(actualIndex >= 0 ? actualIndex : index);
  };

  // Navigation state flags
  const hasPrevious = currentIndex > 0; // Whether there is a previous attachment
  const hasNext = currentIndex < allMedia.length - 1; // Whether there is a next attachment

  /**
   * Navigates to the previous attachment in the lightbox
   * Decrements the current index and updates the selected attachment
   */
  const navigateToPrevious = () => {
    if (hasPrevious) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setSelectedAttachment(allMedia[newIndex]);
    }
  };

  /**
   * Navigates to the next attachment in the lightbox
   * Increments the current index and updates the selected attachment
   */
  const navigateToNext = () => {
    if (hasNext) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setSelectedAttachment(allMedia[newIndex]);
    }
  };

  /**
   * Handles keyboard events for lightbox navigation
   * Escape key closes the modal, arrow keys navigate between attachments
   * @param e - Keyboard event object
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") closeModal(); // Close modal on Escape
    if (e.key === "ArrowLeft") navigateToPrevious(); // Previous attachment on Left Arrow
    if (e.key === "ArrowRight") navigateToNext(); // Next attachment on Right Arrow
  };

  return (
    <>
      <div className="mt-3 sm:mt-4">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
          <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
          <span className="text-xs sm:text-sm font-medium text-gray-700">
            Attachments ({attachments.length})
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 gap-2">
          {displayAttachments.map((attachment, index) => {
            const isMarkedForDeletion = markedForDeletion.includes(
              attachment.attachment_id,
            );
            return (
              <div
                key={attachment.attachment_id}
                className={`relative group rounded-lg bg-gray-100 aspect-square ${
                  isMarkedForDeletion ? "opacity-50" : "cursor-pointer"
                }`}
                style={{ overflow: "visible" }}
                onClick={() =>
                  !isMarkedForDeletion && openModal(attachment, index)
                }
              >
                <div className="w-full h-full rounded-lg overflow-hidden relative">
                  {attachment.file_type === "image" ? (
                    <img
                      src={attachment.file_path}
                      alt={attachment.file_name}
                      className={`w-full h-full object-cover transition-transform ${
                        isMarkedForDeletion ? "" : "group-hover:scale-105"
                      }`}
                      loading="lazy"
                      style={
                        isMarkedForDeletion ? { filter: "grayscale(100%)" } : {}
                      }
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <div className="text-center">
                        <Video className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500 mb-0.5 sm:mb-1" />
                        <div className="text-[10px] sm:text-xs text-gray-600 truncate px-1">
                          {attachment.file_name}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Overlay with play button for videos */}
                  {attachment.file_type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                      <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                  )}

                  {/* Strikethrough overlay for marked items */}
                  {isMarkedForDeletion && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
                      <div className="w-full h-0.5 bg-red-500 transform rotate-45"></div>
                    </div>
                  )}

                  {/* File type indicator */}
                  <div className="absolute top-0.5 sm:top-1 right-0.5 sm:right-1 z-10">
                    {attachment.file_type === "image" ? (
                      <ImageIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white bg-black bg-opacity-50 rounded" />
                    ) : (
                      <Video className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white bg-black bg-opacity-50 rounded" />
                    )}
                  </div>

                  {/* Expand icon - shows on hover for clickable images */}
                  {!isMarkedForDeletion && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg">
                      <Maximize2 className="w-6 h-6 sm:w-8 sm:h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </div>
                  )}
                </div>

                {/* X button for marking/unmarking deletion - positioned outside the image container */}
                {onMarkForDeletion && onUnmarkForDeletion && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isMarkedForDeletion) {
                        onUnmarkForDeletion(attachment.attachment_id);
                      } else {
                        onMarkForDeletion(attachment.attachment_id);
                      }
                    }}
                    className="absolute top-0.5 sm:top-1 right-0.5 sm:right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white border flex items-center justify-center hover:bg-gray-100 transition-colors z-20 shadow-md"
                    style={{
                      borderColor: isMarkedForDeletion ? "#EF4444" : "#F0DCC9",
                    }}
                    title={
                      isMarkedForDeletion
                        ? "Undo deletion"
                        : "Mark for deletion"
                    }
                  >
                    <X
                      className={`w-3 h-3 sm:w-4 sm:h-4 ${isMarkedForDeletion ? "text-red-500" : "text-gray-700"}`}
                    />
                  </button>
                )}
              </div>
            );
          })}

          {/* Show more indicator */}
          {allMedia.length > maxThumbnails && (
            <div className="aspect-square flex items-center justify-center bg-gray-200 rounded-lg text-gray-600">
              <span className="text-xs sm:text-sm">
                +{allMedia.length - maxThumbnails}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal for viewing attachments */}
      {selectedAttachment && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.95)" }}
          onClick={closeModal}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Close Button */}
          <button
            className="absolute top-3 sm:top-4 right-3 sm:right-4 z-10 p-1.5 sm:p-2 rounded-full transition-all duration-200 hover:bg-white hover:bg-opacity-20"
            onClick={closeModal}
            style={{ color: "#FFFFFF" }}
            aria-label="Close lightbox"
          >
            <X className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>

          {/* Previous Button */}
          {allMedia.length > 1 && hasPrevious && (
            <button
              className="absolute left-2 sm:left-4 z-10 p-2 sm:p-3 rounded-full transition-all duration-200 hover:bg-white hover:bg-opacity-20"
              onClick={(e) => {
                e.stopPropagation();
                navigateToPrevious();
              }}
              style={{ color: "#FFFFFF" }}
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          )}

          {/* Next Button */}
          {allMedia.length > 1 && hasNext && (
            <button
              className="absolute right-2 sm:right-4 z-10 p-2 sm:p-3 rounded-full transition-all duration-200 hover:bg-white hover:bg-opacity-20"
              onClick={(e) => {
                e.stopPropagation();
                navigateToNext();
              }}
              style={{ color: "#FFFFFF" }}
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          )}

          {/* Media Container */}
          <div
            className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedAttachment.file_type === "image" ? (
              <img
                src={selectedAttachment.file_path}
                alt={selectedAttachment.file_name}
                className="max-w-full max-h-[90vh] object-contain"
                style={{ borderRadius: "8px" }}
              />
            ) : (
              <video
                src={selectedAttachment.file_path}
                controls
                className="max-w-full max-h-[90vh] object-contain"
                style={{ borderRadius: "8px" }}
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>

          {/* Image Counter */}
          {allMedia.length > 1 && (
            <div
              className="absolute bottom-3 sm:bottom-4 left-1/2 transform -translate-x-1/2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                color: "#FFFFFF",
              }}
            >
              <span className="text-xs sm:text-sm font-medium font-['Poppins']">
                {currentIndex + 1} / {allMedia.length}
              </span>
            </div>
          )}

          {/* File Name (if available) */}
          {selectedAttachment.file_name && (
            <div
              className="absolute top-12 sm:top-16 left-1/2 transform -translate-x-1/2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg max-w-[85vw] sm:max-w-md text-center"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                color: "#FFFFFF",
              }}
            >
              <span className="text-xs sm:text-sm font-medium font-['Poppins'] truncate block">
                {selectedAttachment.file_name}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default AttachmentGallery;
