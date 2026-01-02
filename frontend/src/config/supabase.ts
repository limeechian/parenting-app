// Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
// Program Name: supabase.ts
// Description: To initialize and configure Supabase client for database operations
// First Written on: Monday, 29-Sep-2025
// Edited on: Sunday, 10-Dec-2025

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Storage bucket names
// Note: Buckets are categorized by access method (direct Supabase storage vs backend API endpoints)

// Direct Supabase Storage Access (client uploads directly to Supabase)
export const PROFILE_PICTURES_BUCKET = 'profile-pictures'; // Direct access - used in Profile.tsx
export const DIARY_ATTACHMENTS_BUCKET = 'diary-attachments'; // Direct access - used in DiaryPage.tsx and DiaryEntryEditor.tsx

// Backend API Endpoints (files uploaded through backend API for validation, processing, and security)
export const EDUCATIONAL_RESOURCES_BUCKET = 'educational-resources'; // Backend API - content manager uploads
export const RESOURCE_THUMBNAILS_BUCKET = 'resource-thumbnails'; // Backend API - used in ContentCreationPage.tsx
export const COMMUNITY_IMAGES_BUCKET = 'community-images'; // Backend API - used via uploadCommunityCoverImage() in CommunityPage.tsx
export const POST_IMAGES_BUCKET = 'post-images'; // Backend API - used via uploadPostImage() in CommunityPage.tsx
export const PRIVATE_MESSAGE_ATTACHMENTS_BUCKET = 'private-message-attachments'; // Backend API - used via uploadMessageAttachment() in PrivateMessagePage.tsx
export const PROMOTIONAL_MATERIALS_BUCKET = 'promotional-materials'; // Backend API - professional promotional content with approval workflow
export const PROFESSIONAL_DOCUMENTS_BUCKET = 'professional-documents'; // Backend API - verification documents requiring security
export const PROFESSIONAL_PROFILE_IMAGES_BUCKET = 'professional-profile-images'; // Backend API - professional profile images
export const STATIC_ASSETS_BUCKET = 'static-assets'; // Backend API - static assets like logos and branding images
