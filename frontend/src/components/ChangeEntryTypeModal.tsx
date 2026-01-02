// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: ChangeEntryTypeModal.tsx
// Description: To provide modal component for changing diary entry type
// First Written on: Thursday, 02-Oct-2025
// Edited on: Sunday, 10-Dec-2025

// Import React for component functionality
import React from "react";
// Import X icon from lucide-react for close button
import { X } from "lucide-react";

/**
 * Props interface for ChangeEntryTypeModal component
 * Defines the properties needed to control the modal behavior
 */
interface ChangeEntryTypeModalProps {
  open: boolean; // Controls whether the modal is visible
  onClose: () => void; // Callback when modal backdrop is clicked
  onCancel: () => void; // Callback when user cancels the action
  onDiscard: () => void; // Callback when user chooses to discard changes
  onSave: () => void; // Callback when user chooses to save as draft
}

/**
 * ChangeEntryTypeModal Component
 *
 * A confirmation modal that appears when a user attempts to change the diary entry type
 * while having unsaved changes. Provides options to cancel, discard changes, or save as draft.
 *
 * @param props - Component props defined in ChangeEntryTypeModalProps interface
 * @returns JSX element representing the confirmation modal, or null if not open
 */
const ChangeEntryTypeModal: React.FC<ChangeEntryTypeModalProps> = ({
  open,
  onClose,
  onCancel,
  onDiscard,
  onSave,
}) => {
  // Don't render anything if modal is not open
  if (!open) return null;

  /**
   * Render the modal overlay and content
   * Modal appears centered on screen with backdrop that closes on click
   */
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      {/* Modal content container - white card with rounded corners */}
      <div
        className="bg-white rounded-lg sm:rounded-2xl shadow-xl max-w-md w-full p-4 sm:p-6 space-y-4 sm:space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header - title and close button */}
        <div className="flex items-center justify-between">
          {/* Modal title */}
          <h3
            className="text-base sm:text-lg font-semibold font-['Poppins']"
            style={{ color: "#32332D" }}
          >
            Change Entry Type?
          </h3>
          {/* Close button (X icon) */}
          <button
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            onClick={onClose}
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Warning message section */}
        <div className="space-y-3">
          {/* Warning box with red/pink background to draw attention */}
          <div
            className="p-3 sm:p-4 rounded-lg"
            style={{ backgroundColor: "#FDECEF", border: "1px solid #F0DCC9" }}
          >
            {/* Warning heading */}
            <p
              className="text-xs sm:text-sm font-medium mb-2 font-['Poppins']"
              style={{ color: "#EF4444" }}
            >
              ⚠️ Warning: Unsaved changes will be lost
            </p>
            {/* Warning description explaining the consequences */}
            <p
              className="text-xs sm:text-sm font-['Poppins']"
              style={{ color: "#64635E" }}
            >
              Changing entry type will clear your current form. What would you
              like to do?
            </p>
          </div>
        </div>

        {/* Action buttons section */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          {/* Cancel button - returns to form without changing entry type */}
          <button
            className="w-full sm:w-auto px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium border font-['Poppins'] transition-all duration-200 hover:bg-opacity-10"
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
            onClick={onCancel}
          >
            Cancel
          </button>
          {/* Discard Changes button - discards current form data and changes entry type */}
          <button
            className="w-full sm:w-auto px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium border font-['Poppins'] transition-all duration-200 hover:bg-opacity-10"
            style={{
              borderColor: "#722F37",
              color: "#722F37",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#F5E8E8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            onClick={onDiscard}
          >
            Discard Changes
          </button>
          {/* Save as Draft button - saves current form as draft before changing entry type */}
          <button
            className="w-full sm:w-auto px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium font-['Poppins'] transition-all duration-200 hover:shadow-lg"
            style={{ backgroundColor: "#0F5648", color: "#FFFFFF" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#0A4538";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#0F5648";
            }}
            onClick={onSave}
          >
            Save as Draft
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangeEntryTypeModal;
