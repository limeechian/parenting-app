// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: types.ts
// Description: To define TypeScript interfaces and types used throughout the application
// First Written on: Monday, 29-Sep-2025
// Edited on: Sunday, 10-Dec-2025

export interface UserInput {
  email: string;
  password: string;
  role?: string;
}

export interface ChatInput {
  query: string;
  child_age?: number;
}

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

export interface ParentProfile {
  first_name?: string;
  last_name?: string;
  gender?: string;
  birthdate?: string;
  address_line?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  occupation?: string;
  education_level?: string;
  experience_level?: string;
  parenting_style?: string;
  preferred_communication_style?: string;
  family_structure?: string;
  relationship_status?: string;
  relationship_with_child?: string;
  profile_picture_url?: string;
  customParentingStyle?: string;
  customFamilyStructure?: string;
  customRelationshipStatus?: string;
  customRelationshipWithChild?: string;
}

export interface ChildProfile {
  id?: string;
  name: string;
  gender: string;
  age?: number;
  birthdate: string;
  education_level?: string;
  developmental_stage: string;
  special_considerations?: string[];
  characteristics?: string[];
  current_challenges?: string[];
  special_notes?: string;
  interests?: string[];
  parenting_goals?: string;
  color_code?: string; // Hex color for calendar display
  customInterest?: string;
  customCharacteristic?: string;
  customSpecialConsideration?: string;
  customCurrentChallenge?: string;
}

export interface DiaryAttachment {
  attachment_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  is_primary?: boolean;
  created_at?: string;
}