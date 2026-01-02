# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: schemas.py
# Description: To define Pydantic schemas for request validation and response serialization
# First Written on: Monday, 29-Sep-2025
# Edited on: Sunday, 10-Dec-2025

"""
Pydantic schemas for request/response models

This module defines all Pydantic models used for:
- Request validation (input schemas)
- Response serialization (output schemas)
- Data transfer between frontend and backend

All schemas use Pydantic for automatic validation and serialization.
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from fastapi_users import schemas as fausers_schemas

# ============================================================================
# User Schemas
# ============================================================================

class UserRead(fausers_schemas.BaseUser[int]):
    """
    User read schema - returned when reading user information
    
    Extends FastAPI Users BaseUser with additional fields:
    - role: User's role (parent, professional, etc.)
    - google_id: Google OAuth ID if user signed in with Google
    """
    role: str
    google_id: Optional[str] = None

class UserCreate(fausers_schemas.BaseUserCreate):
    """
    User creation schema - used for user registration
    
    Extends FastAPI Users BaseUserCreate with:
    - role: User's role (required for registration)
    - google_id: Google OAuth ID (optional, for Google sign-in)
    """
    role: str
    google_id: Optional[str] = None

class UserUpdate(fausers_schemas.BaseUserUpdate):
    """
    User update schema - used for updating user information
    
    All fields are optional to allow partial updates.
    """
    role: Optional[str] = None
    google_id: Optional[str] = None

# ============================================================================
# Profile Schemas
# ============================================================================

class ParentProfileIn(BaseModel):
    """
    Parent profile input schema - used when creating/updating parent profiles
    
    Contains all fields for parent user profiles including:
    - Personal information (name, gender, birthdate)
    - Location information (address, city, state, postcode, country)
    - Professional information (occupation, education)
    - Parenting information (style, experience, family structure)
    """
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    gender: Optional[str] = ""
    birthdate: Optional[str] = ""
    address_line: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    postcode: Optional[str] = ""
    country: Optional[str] = "Malaysia"
    occupation: Optional[str] = ""
    education_level: Optional[str] = ""
    experience_level: Optional[str] = ""
    parenting_style: Optional[str] = ""
    preferred_communication_style: Optional[str] = ""
    family_structure: Optional[str] = ""
    relationship_status: Optional[str] = ""
    relationship_with_child: Optional[str] = ""
    profile_picture_url: Optional[str] = ""

class ChildProfileIn(BaseModel):
    """
    Child profile input schema - used when creating/updating child profiles
    
    Contains all information about a child including:
    - Basic information (name, birthdate, gender)
    - Developmental information (stage, education level)
    - Interests, characteristics, and special considerations
    - Parenting goals and current challenges
    - Color code for UI display
    """
    name: str  # Child's name (required)
    birthdate: str  # YYYY-MM-DD format
    gender: str = ""  # Child's gender
    developmental_stage: str = ""  # Current developmental stage
    education_level: str = ""  # Education level
    interests: list[str] = []  # List of child's interests
    characteristics: list[str] = []  # List of child's characteristics
    special_considerations: list[str] = []  # Special needs or considerations
    parenting_goals: str = ""  # Parent's goals for this child
    current_challenges: list[str] = []  # Current challenges the parent is facing
    special_notes: str = ""  # Additional notes about the child
    color_code: str = "#326586"  # Color code for UI display (default blue)

class ProfessionalProfileIn(BaseModel):
    """
    Professional profile input schema - used when creating/updating professional profiles
    
    Contains all information about professional service providers including:
    - Business information (name, type, experience, qualifications)
    - Specializations and target developmental stages
    - Location and contact information
    - Profile status and document management
    """
    business_name: Optional[str] = None  # Business/professional name (required for new profiles, optional for updates)
    professional_type: Optional[str] = ""  # Type of professional (e.g., "Therapist", "Pediatrician")
    years_experience: Optional[int] = None  # Years of professional experience
    qualifications: Optional[str] = None  # Professional qualifications (required for new profiles)
    certifications: Optional[str] = ""  # Additional certifications
    specializations: Optional[list[str]] = None  # Array of specialization tags (e.g., ['ADHD', 'Autism Spectrum Disorder'])
    
    # Filter fields for Professional Directory search
    target_developmental_stages: Optional[list[str]] = []  # Developmental stages this professional works with
    languages: Optional[list[str]] = []  # Languages spoken
    availability: Optional[list[str]] = []  # Availability options (weekdays, weekends, evenings, etc.)
    
    # Structured address fields
    address_line: Optional[str] = ""  # Street address
    city: Optional[str] = ""  # City
    state: Optional[str] = ""  # State/Province
    postcode: Optional[str] = ""  # Postal code
    country: Optional[str] = "Malaysia"  # Country (default: Malaysia)
    
    # Google Maps integration
    google_maps_url: Optional[str] = ""  # Google Maps URL for location
    
    # Contact information
    contact_email: Optional[str] = ""  # Contact email address
    contact_phone: Optional[str] = ""  # Contact phone number
    website_url: Optional[str] = ""  # Professional website URL
    bio: Optional[str] = ""  # Professional biography
    
    # Profile management
    profile_image_url: Optional[str] = None  # Profile image URL from Supabase Storage
    profile_status: Optional[str] = None  # Status to set on submission/update (pending, approved, rejected)
    documents_to_delete: Optional[list[int]] = None  # Document IDs to delete when resubmitting profile

class ProfessionalDocumentIn(BaseModel):
    """
    Professional document input schema - used when uploading professional documents
    
    Documents are used for verification and credential proof.
    """
    document_type: str  # Type of document (e.g., "license", "certification", "diploma")
    file_name: str  # Original file name
    file_path: str  # Path to file in Supabase Storage
    file_type: str  # File type/extension
    file_size: Optional[int] = None  # File size in bytes

class ProfessionalServiceIn(BaseModel):
    """
    Professional service input schema - used when creating/updating services offered
    
    Professionals can offer multiple services with different categories and types.
    """
    service_name: str  # Name of the service
    service_description: Optional[str] = None  # Description of the service
    service_category: Optional[str] = None  # Category: 'therapy', 'counseling', 'assessment', etc.
    service_type: Optional[str] = None  # Type: 'individual', 'group', 'online', etc.
    price_range: Optional[str] = None  # Price range: e.g., "RM 100-200", "Free", "Contact for pricing"

# ============================================================================
# Promotional Content Schemas
# ============================================================================

class PromotionalMaterialIn(BaseModel):
    """
    Promotional material input schema - used when professionals submit promotional content
    
    Promotional materials are reviewed by coordinators before being displayed.
    """
    content_type: str  # Type: 'banner', 'event', 'campaign'
    title: str  # Title of the promotional material
    description: Optional[str] = ""  # Description of the promotional content
    file_path: Optional[str] = None  # Path to promotional image/file in Supabase Storage
    display_start_date: Optional[str] = None  # YYYY-MM-DD format (set by coordinator when approving)
    display_end_date: Optional[str] = None  # YYYY-MM-DD format (set by coordinator when approving)

class PromotionalMaterialOut(BaseModel):
    """
    Promotional material output schema - returned when reading promotional materials
    
    Includes approval status and display information.
    """
    material_id: int
    profile_id: int
    content_type: str
    title: str
    description: Optional[str] = None
    file_path: Optional[str] = None
    status: str
    approved_by: Optional[int] = None
    approved_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    display_start_date: Optional[str] = None
    display_end_date: Optional[str] = None
    display_sequence: Optional[int] = None
    created_at: str
    updated_at: Optional[str] = None

# ============================================================================
# Diary Schemas
# ============================================================================

class DiaryEntryIn(BaseModel):
    """
    Diary entry input schema - used when creating/updating diary entries
    
    Supports multiple entry types with type-specific fields:
    - free-form: General diary entries
    - daily-behavior: Behavior observation entries
    - emotional-tracking: Emotional state and stress tracking
    - intervention-tracking: Successful intervention documentation
    - milestone-progress: Child development progress tracking
    """
    child_id: Optional[int] = None  # Associated child (optional for general entries)
    entry_date: str  # YYYY-MM-DD format
    entry_type: str = "free-form"  # Type of diary entry
    title: Optional[str] = ""  # Entry title
    content: str  # Main entry content (required)
    parent_mood: Optional[str] = None
    child_mood: Optional[str] = None
    observed_behaviors: Optional[list[str]] = []
    challenges_encountered: Optional[list[str]] = []
    strategies_used: Optional[list[str]] = []
    time_of_day: Optional[str] = None
    duration: Optional[str] = None
    effectiveness: Optional[str] = None
    emotion_intensity: Optional[int] = None
    stress_level: Optional[int] = None
    triggers_identified: Optional[list[str]] = []
    coping_strategies: Optional[list[str]] = []
    physical_symptoms: Optional[list[str]] = []
    environmental_factors: Optional[str] = ""
    situation_description: Optional[str] = ""
    intervention_used: Optional[str] = ""
    immediate_outcome: Optional[str] = ""
    effectiveness_rating: Optional[int] = None
    would_use_again: Optional[bool] = None
    skills_observed: Optional[list[str]] = []
    improvements_observed: Optional[str] = ""
    setbacks_concerns: Optional[str] = ""
    next_goals: Optional[str] = ""
    professional_recommendations: Optional[str] = ""
    tags: Optional[list[str]] = []

class DiaryAttachmentIn(BaseModel):
    file_name: str
    file_path: str
    file_type: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    is_primary: bool = False

class DiaryDraftIn(BaseModel):
    child_id: Optional[int] = None
    entry_date: Optional[str] = None  # YYYY-MM-DD format
    entry_type: str = "free-form"
    title: Optional[str] = None
    form_data: dict

# ============================================================================
# Insights Schemas
# ============================================================================

class GenerateMonthlySummaryRequest(BaseModel):
    """
    Monthly summary generation request schema
    
    Used to request AI-generated monthly summaries of diary entries.
    """
    child_id: Optional[int] = None  # Child to generate summary for (optional for general summaries)
    month: int  # Month number (1-12)
    year: int  # Year (e.g., 2025)

class GenerateWeeklySummaryRequest(BaseModel):
    """
    Weekly summary generation request schema
    
    Used to request AI-generated weekly summaries of diary entries.
    """
    child_id: Optional[int] = None  # Child to generate summary for (optional for general summaries)
    week_start: str  # YYYY-MM-DD format - Start date of the week
    week_end: str    # YYYY-MM-DD format - End date of the week

# ============================================================================
# Chat Schemas
# ============================================================================

class ChatInput(BaseModel):
    """
    Chat input schema - used when sending messages to AI agents
    
    Contains the user's query and optional parameters for customizing
    the AI response and context retrieval.
    """
    query: str  # User's question or message
    child_id: Optional[int] = None  # Associated child (for child-specific context)
    conversation_id: Optional[int] = None  # Conversation ID (for continuing conversations)
    manual_agent: Optional[str] = None  # Specific agent to use (manual mode)
    enabled_agents: Optional[list[str]] = None  # List of enabled agents (constrained auto mode)
    diary_window_days: Optional[int] = None  # Number of days to look back in diary entries
    diary_types: Optional[list[str]] = None  # Specific diary entry types to include
    per_type_limit: Optional[int] = None  # Maximum entries per diary type
    overall_limit: Optional[int] = None  # Maximum total diary entries to include

# ============================================================================
# Community Schemas
# ============================================================================

class CommunityTaxonomyOut(BaseModel):
    """
    Community taxonomy output schema - represents community tags/categories
    
    Taxonomies are used to categorize communities by:
    - Age groups (newborn, infant, toddler, etc.)
    - Developmental stages
    - Topics (ADHD, autism, sleep, etc.)
    """
    taxonomy_id: int  # Unique taxonomy identifier
    taxonomy_type: str  # Type: 'age_group', 'stage', 'topic'
    label: str  # Display label (e.g., "Toddler", "ADHD Support")

class CommunityMemberOut(BaseModel):
    member_id: int
    user_id: int
    name: str
    avatar: Optional[str] = None
    role: str
    status: str
    joined_at: str
    last_activity_at: Optional[str] = None

class CommunityIn(BaseModel):
    """
    Community input schema - used when creating/updating communities
    
    Communities are parent support groups that can be categorized by
    topics, age groups, and developmental stages.
    """
    name: str  # Community name (required)
    description: Optional[str] = None  # Community description
    cover_image_url: Optional[str] = None  # Cover image URL from Supabase Storage
    rules: Optional[list[str]] = []  # Community rules/guidelines
    topics: Optional[list[str]] = []  # Topic labels for categorization
    age_groups: Optional[list[str]] = []  # Age group labels (e.g., "toddler", "preschool")
    stages: Optional[list[str]] = []  # Developmental stage labels
    moderators: Optional[list[str]] = []  # Email addresses or usernames of moderators

class CommunityOut(BaseModel):
    community_id: int
    name: str
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    status: str  # 'visible', 'flagged'
    member_count: int
    post_count: int
    tags: list[CommunityTaxonomyOut]
    rules: list[str]
    moderators: list[str]
    members: Optional[list[CommunityMemberOut]] = None
    recent_posts: Optional[list] = None
    is_joined: bool
    created_by: Optional[int] = None
    created_at: str
    updated_at: Optional[str] = None

class CommunityPostAttachmentOut(BaseModel):
    attachment_id: int
    file_name: str
    file_path: str
    file_type: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    display_order: int

class CommunityPostCommentOut(BaseModel):
    comment_id: int
    post_id: int
    author: str
    avatar: Optional[str] = None
    time: str
    body: str
    status: str
    likes: int
    user_id: Optional[int] = None
    parent_comment_id: Optional[int] = None
    replies: Optional[list['CommunityPostCommentOut']] = None
    depth: Optional[int] = None
    is_liked: Optional[bool] = False  # Whether current user has liked this comment

class PostAttachmentIn(BaseModel):
    url: str  # File URL from upload
    file_name: str
    file_size: Optional[int] = None  # File size in bytes
    mime_type: Optional[str] = None  # MIME type (e.g., 'image/jpeg', 'image/png')

class CommunityPostIn(BaseModel):
    community_id: int
    title: str
    body: str
    excerpt: Optional[str] = None
    attachments: Optional[list[PostAttachmentIn]] = []  # Attachment metadata with URLs

class CommunityPostOut(BaseModel):
    post_id: int
    community_id: int
    author: str
    avatar: Optional[str] = None
    title: str
    body: str
    excerpt: Optional[str] = None
    status: str
    created_at: str
    likes: int
    comments: list[CommunityPostCommentOut]  # List of comments (can be empty for list view)
    comments_count: Optional[int] = None  # Total comment count (for list view when comments array is empty)
    taxonomy_labels: list[str]
    author_id: Optional[int] = None
    attachments: Optional[list[CommunityPostAttachmentOut]] = None
    is_liked: Optional[bool] = False  # Whether current user has liked this post
    is_pinned: Optional[bool] = False  # Whether post is pinned

class CommunityPostCommentIn(BaseModel):
    body: str
    parent_comment_id: Optional[int] = None

class ReportIn(BaseModel):
    entity_type: str  # 'post', 'comment', 'community', 'user'
    entity_id: int  # ID of the reported item
    reason: str  # 'spam', 'harassment', 'inappropriate', 'misinformation', 'other'
    details: Optional[str] = None

class ReportOut(BaseModel):
    report_id: int
    reporter_id: int
    report_type: str  # 'post', 'comment', 'community', 'user'
    reported_post_id: Optional[int] = None
    reported_comment_id: Optional[int] = None
    reported_community_id: Optional[int] = None
    reported_user_id: Optional[int] = None
    reason: str
    details: Optional[str] = None
    status: str  # 'pending', 'resolved', 'dismissed'
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Private Messaging Schemas
class PrivateMessageAttachmentOut(BaseModel):
    attachment_id: int
    message_id: int
    file_name: str
    file_path: str
    file_type: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class PrivateMessageReactionOut(BaseModel):
    reaction_id: int
    message_id: int
    user_id: int
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None
    reaction_type: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class PrivateMessageOut(BaseModel):
    message_id: int
    conversation_id: int
    sender_id: int
    recipient_id: int
    content: str
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime
    attachments: Optional[list[PrivateMessageAttachmentOut]] = None
    reactions: Optional[list[PrivateMessageReactionOut]] = None
    
    class Config:
        from_attributes = True

class PrivateMessageIn(BaseModel):
    content: str
    attachments: Optional[list[str]] = None  # List of file URLs (uploaded separately)

class ConversationParticipantOut(BaseModel):
    user_id: int
    name: str
    avatar: Optional[str] = None

class ConversationOut(BaseModel):
    conversation_id: int
    participant: ConversationParticipantOut
    last_message: Optional[PrivateMessageOut] = None
    unread_count: int
    last_message_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class CreateConversationIn(BaseModel):
    recipient_id: int

class MessageReactionIn(BaseModel):
    reaction_type: str

class NotificationOut(BaseModel):
    notification_id: int
    notification_type: str
    title: str
    content: str
    actor_name: Optional[str] = None
    related_post_id: Optional[int] = None
    related_comment_id: Optional[int] = None
    related_community_id: Optional[int] = None
    related_message_id: Optional[int] = None
    created_at: Optional[str] = None
    is_read: bool
    
    class Config:
        from_attributes = True  # 'like', 'love', 'laugh', 'support', 'helpful'

# ============================================================================
# Resource Schemas
# ============================================================================

class ResourceAttachmentOut(BaseModel):
    """
    Resource attachment output schema - represents files attached to resources
    
    Resources can have multiple attachments (images, videos, documents).
    """
    attachment_id: int
    resource_id: int
    file_name: str
    file_path: str
    file_type: str  # 'image', 'video', 'document'
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    display_order: int
    created_at: Optional[str] = None
    
    class Config:
        from_attributes = True

class ResourceAttachmentIn(BaseModel):
    file_name: str
    file_path: str
    file_type: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    display_order: int = 0

class ResourceAttachmentUpdate(BaseModel):
    display_order: Optional[int] = None

class ResourceIn(BaseModel):
    """
    Resource input schema - used when creating/updating educational resources
    
    Resources are educational content (articles, videos, guides) for parents.
    They can be in draft, published, or archived status.
    """
    title: str  # Resource title (required)
    description: Optional[str] = None  # Resource description
    content: Optional[str] = None  # Resource content (for articles/guides)
    resource_type: str  # Type: 'article', 'video', 'guide'
    category: Optional[str] = None  # Resource category
    target_developmental_stages: Optional[list[str]] = None  # Developmental stages this resource targets
    external_url: Optional[str] = None  # External URL (for videos or external resources)
    thumbnail_url: Optional[str] = None  # Thumbnail image URL (set after thumbnail upload)
    excerpt: Optional[str] = None  # Short excerpt for preview
    tags: Optional[list[str]] = None  # Tags for categorization and search
    status: str = 'draft'  # Status: 'draft', 'published', 'archived'
    attachments: Optional[list[ResourceAttachmentIn]] = None  # File attachments

class ResourceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    resource_type: Optional[str] = None
    category: Optional[str] = None
    target_developmental_stages: Optional[list[str]] = None
    external_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    excerpt: Optional[str] = None
    tags: Optional[list[str]] = None
    status: Optional[str] = None
    attachments: Optional[list[ResourceAttachmentIn]] = None

class ResourceOut(BaseModel):
    resource_id: int
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    resource_type: str
    category: Optional[str] = None
    target_developmental_stages: Optional[list[str]] = None
    external_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    excerpt: Optional[str] = None
    tags: Optional[list[str]] = None
    status: str
    created_by: int
    published_at: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    attachments: Optional[list[ResourceAttachmentOut]] = []
    
    class Config:
        from_attributes = True

