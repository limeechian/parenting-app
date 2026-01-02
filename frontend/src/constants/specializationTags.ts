// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: specializationTags.ts
// Description: To define standardized specialization tags constants for professional profiles
// First Written on: Tuesday, 14-Oct-2025
// Edited on: Sunday, 10-Dec-2025

/**
 * Standardized specialization tags for professional profiles
 * 
 * These tags are used in:
 * - ProfessionalProfile.tsx (display and edit)
 * - ProfessionalProfileSubmission.tsx (submission form)
 * - CoordinatorDashboard.tsx (coordinator editing)
 * - Professional Directory filtering (parent users)
 * 
 * Users can:
 * - Select from this predefined list (Autocomplete suggestions)
 * - Enter custom tags (freeSolo mode - press Enter or comma to add)
 * 
 * Coordinators can:
 * - Edit tags (add/remove from predefined list or custom tags)
 * - Re-categorize custom tags to standardized ones
 */

export const SPECIALIZATION_TAGS = [
  // Therapy & Counseling Specializations
  'ADHD',
  'Autism Spectrum Disorder',
  'Anxiety Disorders',
  'Depression',
  'Learning Disabilities',
  'Speech and Language Delays',
  'Behavioral Issues',
  'Developmental Delays',
  'Sensory Processing',
  'Trauma and PTSD',
  'Attachment Issues',
  'Sleep Disorders',
  'Eating Disorders',
  'Social Skills',
  'Emotional Regulation',
  'Play Therapy',
  'Family Therapy',
  'Parent Coaching',
  'School Counseling',
  'Early Intervention',
  
  // Educational & Academic Support
  'Academic Tutoring',
  'Early Childhood Education',
  'Special Education',
  'Reading Support',
  'Math Support',
  'Study Skills',
  
  // Additional Specializations
  'Grief Counseling',
  'Anger Management',
  'Self-Esteem',
  'Peer Relationships',
  'Bullying Prevention',
  'Career Counseling',
  'Life Skills',
  'Executive Functioning',
  'Motor Skills',
  'Visual Processing',
  'Auditory Processing',
] as const;

/**
 * Get all specialization tags as an array of strings
 */
export const getSpecializationTags = (): string[] => {
  return [...SPECIALIZATION_TAGS];
};

/**
 * Check if a tag is in the predefined list
 */
export const isPredefinedTag = (tag: string): boolean => {
  return SPECIALIZATION_TAGS.includes(tag as any);
};


