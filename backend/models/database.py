# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: database.py
# Description: To define SQLAlchemy database models and configure async database connection engine
# First Written on: Monday, 29-Sep-2025
# Edited on: Sunday, 10-Dec-2025

"""
Database models and setup

This module defines all SQLAlchemy database models (tables) and sets up
the async database connection engine. All database tables are defined
here using SQLAlchemy ORM.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON, Boolean, Text, Float, Date, text
from sqlalchemy.orm import declarative_base
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.dialects.postgresql import ARRAY
from datetime import datetime

from config import DATABASE_URL

# ============================================================================
# Database Setup
# ============================================================================

# Validate that DATABASE_URL is configured
if DATABASE_URL is None:
    raise ValueError("DATABASE_URL environment variable is not set")

# Convert PostgreSQL URL to asyncpg format for async operations
# postgresql:// -> postgresql+asyncpg://
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Create async database engine with connection pooling
# Connection pooling improves performance by reusing database connections
async_engine = create_async_engine(
    ASYNC_DATABASE_URL, 
    echo=True,  # Log all SQL queries (useful for debugging)
    pool_size=10,  # Number of connections to keep in the pool (reduced to match Supabase pooler limit of 15)
    max_overflow=5,  # Maximum number of connections to create beyond pool_size (max 15 total to match Supabase limit)
    pool_pre_ping=True,  # Verify connections are alive before using them
    pool_recycle=3600,  # Recycle connections after 1 hour to prevent stale connections
    pool_timeout=30  # Timeout (seconds) for getting a connection from the pool
)

# Create async session factory
# This is used to create database sessions in route handlers
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    expire_on_commit=False,  # Don't expire objects after commit (allows access after commit)
    class_=AsyncSession
)

# Base class for all database models
# All models inherit from this to get SQLAlchemy ORM functionality
Base = declarative_base()

# ============================================================================
# User Models
# ============================================================================

# User model for FastAPI Users
# This is the main user account table that stores authentication information
class User(Base):
    """
    User account model
    
    Stores user authentication and account information.
    Supports both email/password and Google OAuth authentication.
    """
    __tablename__ = "users"
    
    # Primary key - unique user identifier
    user_id = Column(Integer, primary_key=True, index=True)
    
    # Email address - must be unique and is used for login
    email = Column(String(255), unique=True, nullable=False)
    
    # Hashed password - nullable because Google users don't have passwords
    hashed_password = Column(String(255), nullable=True)
    
    # Google OAuth ID - unique identifier from Google (nullable for email/password users)
    google_id = Column(String(255), unique=True, nullable=True)
    
    # User role - determines permissions and access level
    # Values: 'parent', 'professional', 'coordinator', 'content_manager', 'admin'
    role = Column(String(50), nullable=False)
    
    # Account status - inactive users cannot log in
    is_active = Column(Boolean, nullable=False, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)  # User who last updated this record
    
    # Email verification status
    is_verified = Column(Boolean, nullable=False, default=False)
    
    # Property aliases for FastAPI Users compatibility
    # FastAPI Users expects 'id' but we use 'user_id'
    @property
    def id(self):
        return self.user_id
    
    @id.setter
    def id(self, value):
        self.user_id = value

# ============================================================================
# Profile Models
# ============================================================================

# Parent profile model
# Stores additional information about parent users beyond basic account data
class ParentProfile(Base):
    """
    Parent user profile model
    
    Stores detailed information about parent users including:
    - Personal information (name, gender, birthdate)
    - Location information (address, city, state, postcode, country)
    - Professional information (occupation, education)
    - Parenting information (style, experience, family structure)
    """
    __tablename__ = "parent_users_profile"
    parent_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    first_name = Column(String(100), nullable=False)  # Required field
    last_name = Column(String(100), nullable=False)  # Required field
    gender = Column(String(20), nullable=False)  # Required field
    birthdate = Column(Date, nullable=False)  # Required field
    address_line = Column(String(200))
    city = Column(String(100))
    state = Column(String(50))
    postcode = Column(String(10))
    country = Column(String(50), default='Malaysia')
    occupation = Column(String(100))
    education_level = Column(String(50))
    experience_level = Column(String(50))
    parenting_style = Column(String(50))
    preferred_communication_style = Column(String(50))
    family_structure = Column(String(50))
    relationship_status = Column(String(50))
    relationship_with_child = Column(String(50))
    profile_picture_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)

# Child profile model
# Stores information about children associated with parent accounts
class ChildProfile(Base):
    """
    Child profile model
    
    Stores information about each child in a parent's account including:
    - Basic information (name, birthdate, gender)
    - Developmental information (stage, education level)
    - Interests, characteristics, and special considerations
    - Parenting goals and current challenges
    - Color code for UI display
    """
    __tablename__ = "children_profile"
    child_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    name = Column(String(100), nullable=False)  # Required field
    birthdate = Column(Date, nullable=False)  # Required field
    gender = Column(String(20), nullable=False)  # Required field
    developmental_stage = Column(String(50))
    education_level = Column(String(50))
    interests = Column(ARRAY(String), default=[])
    characteristics = Column(ARRAY(String), default=[])
    special_considerations = Column(ARRAY(String), default=[])
    parenting_goals = Column(String)
    current_challenges = Column(ARRAY(String), default=[])
    special_notes = Column(String)
    color_code = Column(String(7), default='#326586')
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)

# ============================================================================
# Authentication & Verification Models
# ============================================================================

# Email verification model
# Tracks email verification tokens and their status
class EmailVerification(Base):
    """
    Email verification model
    
    Stores email verification tokens sent to users during registration.
    Tokens expire after 24 hours and can only be used once.
    """
    __tablename__ = "email_verifications"
    verification_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    email = Column(String(255), nullable=False)
    verification_token = Column(String(255), nullable=False, unique=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    is_used = Column(Boolean, nullable=False, default=False)
    is_verified = Column(Boolean, nullable=False, default=False)

# Password reset model
# Tracks password reset tokens sent to users for password recovery
class PasswordReset(Base):
    """
    Password reset model
    
    Stores password reset tokens sent to users when they request a password reset.
    Tokens expire after 1 hour and can only be used once.
    """
    __tablename__ = "password_resets"
    reset_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    email = Column(String(255), nullable=False)
    reset_token = Column(String(255), nullable=False, unique=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))

# ============================================================================
# Professional Models
# ============================================================================

# Professional profile model
# Stores information about professional service providers
class ProfessionalProfile(Base):
    """
    Professional user profile model
    
    Stores detailed information about professional service providers including:
    - Business information (name, type, qualifications)
    - Specializations and target developmental stages
    - Location and contact information
    - Profile status (pending, approved, rejected)
    - Approval tracking (who approved, when, rejection reasons)
    """
    __tablename__ = "professional_users_profile"
    professional_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, unique=True)
    business_name = Column(String(200), nullable=False)
    professional_type = Column(String(100), nullable=False)
    years_experience = Column(Integer, nullable=False)
    qualifications = Column(String, nullable=False)
    certifications = Column(String, nullable=False)
    specializations = Column(ARRAY(String), nullable=False)  # Array of specialization tags (e.g., ['ADHD', 'Autism Spectrum Disorder'])
    # Filter fields for Professional Directory
    target_developmental_stages = Column(ARRAY(String), nullable=False)  # Array: ['newborn', 'infant', 'toddler', 'early_childhood', 'middle_childhood']. Must have at least one value (enforced via CHECK constraint).
    languages = Column(ARRAY(String), nullable=False)  # Array: ['English', 'Malay', 'Mandarin', etc.]. Must have at least one value (enforced via CHECK constraint).
    availability = Column(ARRAY(String), nullable=False)  # Array: ['weekdays', 'weekends', 'evenings', 'flexible']. Must have at least one value (enforced via CHECK constraint).
    # Structured address fields (replaces geographic_locations)
    address_line = Column(String(200))
    city = Column(String(100))
    state = Column(String(50))
    postcode = Column(String(10))
    country = Column(String(50), default='Malaysia')
    # Google Maps integration
    google_maps_url = Column(String(500))
    contact_email = Column(String(255), nullable=False)
    contact_phone = Column(String(50), nullable=False)
    website_url = Column(String(500))
    bio = Column(String)
    profile_image_url = Column(String(500))
    profile_status = Column(String(20), nullable=False, default='pending')
    approved_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)

# Professional documents model
# Stores verification documents uploaded by professionals (licenses, certifications, etc.)
class ProfessionalDocument(Base):
    """
    Professional document model
    
    Stores verification documents uploaded by professional users for credential proof.
    Documents are used during profile review and approval by coordinators.
    """
    __tablename__ = "professional_documents"
    document_id = Column(Integer, primary_key=True)
    profile_id = Column(Integer, ForeignKey("professional_users_profile.professional_id"), nullable=False)
    document_type = Column(String(50), nullable=False)  # Type of document (e.g., "license", "certification", "diploma")
    file_name = Column(String(255), nullable=False)  # Original file name
    file_path = Column(String(500), nullable=False)  # Path to file in Supabase Storage
    file_type = Column(String(50), nullable=False)  # File extension/type
    file_size = Column(Integer)  # File size in bytes
    uploaded_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))

# Professional services model
# Stores services offered by professional users
class ProfessionalService(Base):
    """
    Professional service model
    
    Stores services offered by professional users. Each professional can offer
    multiple services with different categories, types, and pricing.
    Services are displayed in the professional directory and profile pages.
    """
    __tablename__ = "professional_services"
    service_id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("professional_users_profile.professional_id", ondelete="CASCADE"), nullable=False)
    service_name = Column(String(200), nullable=False)  # Name of the service
    service_description = Column(Text, nullable=True)  # Detailed description of the service
    service_category = Column(String(100), nullable=True)  # Category: 'therapy', 'counseling', 'assessment', etc.
    service_type = Column(String(50), nullable=True)  # Type: 'individual', 'group', 'online', etc.
    price_range = Column(String(100), nullable=True)  # Price range: e.g., "RM 100-200", "Free", "Contact for pricing"
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)

# Promotional content model
class PromotionalMaterial(Base):
    __tablename__ = "promotional_materials"
    material_id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("professional_users_profile.professional_id"), nullable=False)
    content_type = Column(String(50), nullable=False)  # 'banner', 'event', 'campaign'
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String(500), nullable=True)
    status = Column(String(20), nullable=False, default='pending')  # 'pending', 'approved', 'rejected'
    approved_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    display_start_date = Column(Date, nullable=True)
    display_end_date = Column(Date, nullable=True)
    display_sequence = Column(Integer, nullable=True)  # For homepage banner ordering
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)

# ============================================================================
# Diary Models
# ============================================================================

# Diary entries model
# Stores parent diary entries with various entry types
class DiaryEntry(Base):
    """
    Diary entry model
    
    Stores diary entries created by parents. Supports multiple entry types:
    - free-form: General diary entries
    - daily-behavior: Behavior observation entries
    - emotional-tracking: Emotional state and stress tracking
    - intervention-tracking: Successful intervention documentation
    - milestone-progress: Child development progress tracking
    
    Each entry type has specific fields relevant to that type.
    """
    __tablename__ = "diary_entries"
    entry_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    child_id = Column(Integer, ForeignKey("children_profile.child_id"), nullable=True)
    entry_date = Column(Date, nullable=False)
    entry_type = Column(String(50), nullable=False, default='free-form')
    title = Column(String(200))
    content = Column(Text, nullable=False)
    
    # Mood tracking
    parent_mood = Column(String(20))
    child_mood = Column(String(20))
    
    # Daily Behavior Observations fields
    observed_behaviors = Column(ARRAY(String))
    challenges_encountered = Column(ARRAY(String))
    strategies_used = Column(ARRAY(String))
    time_of_day = Column(String(20))
    duration = Column(String(20))
    effectiveness = Column(String(20))
    
    # Emotional States & Stress Levels fields
    emotion_intensity = Column(Integer)
    stress_level = Column(Integer)
    triggers_identified = Column(ARRAY(String))
    coping_strategies = Column(ARRAY(String))
    physical_symptoms = Column(ARRAY(String))
    environmental_factors = Column(Text)
    
    # Successful Interventions fields
    situation_description = Column(Text)
    intervention_used = Column(Text)
    immediate_outcome = Column(Text)
    effectiveness_rating = Column(Integer)
    would_use_again = Column(Boolean)
    
    # Child Development Progress fields
    skills_observed = Column(ARRAY(String))
    improvements_observed = Column(Text)
    setbacks_concerns = Column(Text)
    next_goals = Column(Text)
    professional_recommendations = Column(Text)
    
    # General fields
    tags = Column(ARRAY(String))
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)

# Diary attachments model
class DiaryAttachment(Base):
    __tablename__ = "diary_attachments"
    attachment_id = Column(Integer, primary_key=True)
    entry_id = Column(Integer, ForeignKey("diary_entries.entry_id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(Integer)
    mime_type = Column(String(100))
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))

# Diary drafts model
class DiaryDraft(Base):
    __tablename__ = "diary_drafts"
    draft_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    child_id = Column(Integer, ForeignKey("children_profile.child_id"), nullable=True)
    entry_date = Column(Date, nullable=True)
    entry_type = Column(String(50), nullable=False, default='free-form')
    title = Column(String(200), nullable=True)
    form_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)

# ============================================================================
# AI Models
# ============================================================================

# AI Insights model
# Stores AI-generated insights and summaries
class AIInsight(Base):
    """
    AI Insight model
    
    Stores AI-generated insights and summaries for parents including:
    - Monthly and weekly summaries
    - Pattern recognition insights
    - Recommendations based on diary entries
    - User interaction tracking (read, saved)
    """
    __tablename__ = "ai_insights"
    insight_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    child_id = Column(Integer, ForeignKey("children_profile.child_id"), nullable=True)
    
    # Insight Classification
    insight_type = Column(String(50), nullable=False)
    period_type = Column(String(20), nullable=True)
    
    # Period Information
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)
    month = Column(Integer, nullable=True)
    year = Column(Integer, nullable=True)
    
    # Content
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    summary_data = Column(JSON, nullable=True)
    
    # AI Metadata
    ai_agent_type = Column(String(50), nullable=True)
    confidence_score = Column(Float, nullable=True)
    model_version = Column(String(50), nullable=True)
    
    # Diary Context
    diary_entry_ids_used = Column(JSON, default=[])
    diary_entries_count = Column(Integer, default=0)
    
    # User Interaction
    is_read = Column(Boolean, default=False, nullable=False)
    is_saved = Column(Boolean, default=False, nullable=False)
    saved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)

# AI Conversations model
# Stores conversation metadata and summaries
class AiConversation(Base):
    """
    AI Conversation model
    
    Represents a conversation between a user and AI agents. Tracks:
    - Conversation metadata (type, enabled agents, primary agent)
    - Summary and embedding for semantic search
    - Diary entry references and context
    - Communication style preferences
    - Token usage and interaction counts
    
    Conversations can be:
    - General: All agents enabled, auto-selection
    - Agent-specific: Specific agents enabled, constrained auto-selection or manual mode
    """
    __tablename__ = "ai_conversations"
    conversation_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    child_id = Column(Integer, ForeignKey("children_profile.child_id"), nullable=True)
    title = Column(String(255), nullable=True)  # AI-generated or user-set conversation title
    started_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)  # When conversation was ended/deleted
    is_active = Column(Boolean, default=True, nullable=False)  # Soft delete flag
    summary = Column(Text, nullable=True)  # AI-generated conversation summary
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow, nullable=False)
    conversation_type = Column(String(50), default="general", nullable=False)  # 'general' or 'agent-specific'
    primary_agent_type = Column(String(100), nullable=True)  # Most frequently used agent in this conversation
    enabled_agents = Column(JSON, default=[])  # List of agent IDs enabled for this conversation
    participating_agents = Column(JSON, default=[])  # List of agent role names that have participated
    summary_embedding = Column(ARRAY(Float), nullable=True)  # Embedding of conversation summary for semantic search
    diary_entry_ids_referenced = Column(JSON, default=[])  # All diary entry IDs referenced across all interactions
    diary_context_summary = Column(Text, nullable=True)  # Summary of diary context used
    diary_lookback_date_range = Column(JSON, nullable=True)  # Date range of diary entries used
    last_diary_context_hash = Column(String(64), nullable=True)  # Hash of last diary context for change detection
    preferred_communication_style = Column(String(50), nullable=True)  # User's preferred communication style
    total_interactions = Column(Integer, default=0, nullable=False)  # Total number of messages in this conversation
    total_token_estimate = Column(Integer, nullable=True)  # Cumulative token count estimate for the conversation

# AI Chat Interactions model
# Stores individual chat interactions (user queries and AI responses)
class AiChatInteraction(Base):
    """
    AI Chat Interaction model
    
    Stores individual chat interactions between users and AI agents. Each interaction includes:
    - User query and AI response
    - Agent type that generated the response
    - Context information (diary entries, profiles, memories)
    - Embeddings for semantic search and memory retrieval (stored via raw SQL, not in ORM model)
    - Recommendations (professionals, resources, communities) if applicable
    - Performance metrics (response time, token count, similarity scores)
    
    This model enables:
    - Conversation history tracking
    - Semantic memory retrieval using pgvector
    - Context-aware responses based on past interactions
    - Recommendation tracking and display
    
    Note: Embedding fields (embedding, query_embedding, response_embedding) are stored in the database
    via raw SQL queries in chat.py to avoid ARRAY(Float) type issues with SQLAlchemy. These fields
    are not defined in this ORM model but are used for pgvector similarity search.
    """
    __tablename__ = "ai_chat_interactions"
    chat_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    child_id = Column(Integer, ForeignKey("children_profile.child_id"), nullable=True)
    query = Column(Text, nullable=False)  # User's question or message
    response = Column(Text, nullable=False)  # AI-generated response
    agent_type = Column(String(100))  # Type of agent that generated the response
    generated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False)
    retrieved_memories_pgvector = Column(Text, nullable=True)  # Formatted text of retrieved similar past interactions
    conversation_id = Column(Integer, ForeignKey("ai_conversations.conversation_id"), nullable=True)
    diary_entry_ids_used = Column(JSON, default=[])  # IDs of diary entries used for context
    diary_context_snippet = Column(Text, nullable=True)  # Truncated diary context text
    diary_window_days = Column(Integer, nullable=True)  # Number of days looked back for diary entries
    diary_types_used = Column(JSON, nullable=True)  # Types of diary entries included in context
    diary_entries_count = Column(Integer, default=0, nullable=False)  # Count of diary entries used
    parent_profile_snapshot = Column(JSON, nullable=True)  # Snapshot of parent profile at time of interaction
    child_profile_snapshot = Column(JSON, nullable=True)  # Snapshot of child profile at time of interaction
    context_hash = Column(String(64), nullable=True)  # Hash of context for duplicate detection
    full_context_length = Column(Integer, nullable=True)  # Total length of context string sent to AI
    retrieved_memory_ids = Column(JSON, nullable=True)  # IDs of past interactions retrieved via pgvector
    similarity_score = Column(Float, nullable=True)  # Average similarity score from memory retrieval
    response_time_ms = Column(Integer, nullable=True)  # Response generation time in milliseconds
    token_count_estimate = Column(Integer, nullable=True)  # Estimated token count for this interaction
    model_version = Column(String(50), nullable=True)  # OpenAI model version used
    confidence_score = Column(Float, nullable=True)  # Best similarity score from memory retrieval
    recommendations = Column(JSON, nullable=True)  # Recommendations (professionals, resources, communities) stored as JSON
    
    # Note: The following embedding fields exist in the database but are not defined in this ORM model:
    # - embedding: ARRAY(Float) - Combined embedding for semantic search (stored via raw SQL)
    # - query_embedding: ARRAY(Float) - Embedding of user query (stored via raw SQL)
    # - response_embedding: ARRAY(Float) - Embedding of AI response (stored via raw SQL)
    # These fields are used for pgvector similarity search and are inserted/queried using raw SQL
    # in backend/routers/chat.py to avoid SQLAlchemy ARRAY type compatibility issues.

# ============================================================================
# Community Models
# ============================================================================

# Community models
# Community-related tables for parent support groups
class Community(Base):
    """
    Community model
    
    Represents a parent support community/group. Communities can be:
    - Created by any user
    - Categorized by age groups, stages, and topics
    - Moderated by owners and moderators
    - Visible or flagged for review
    """
    __tablename__ = "communities"
    community_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)  # Required field
    cover_image_url = Column(String(500), nullable=True)
    rules = Column(JSON, default=[])
    status = Column(String(20), nullable=False, default='visible')  # 'visible', 'flagged'
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)

class CommunityTaxonomy(Base):
    __tablename__ = "community_taxonomies"
    taxonomy_id = Column(Integer, primary_key=True, index=True)
    taxonomy_type = Column(String(50), nullable=False)  # 'age_group', 'stage', 'topic'
    label = Column(String(150), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)

class CommunityTaxonomyAssignment(Base):
    __tablename__ = "community_taxonomy_assignments"
    assignment_id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("communities.community_id"), nullable=False)
    taxonomy_id = Column(Integer, ForeignKey("community_taxonomies.taxonomy_id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)

class CommunityMember(Base):
    __tablename__ = "community_members"
    member_id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("communities.community_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    role = Column(String(20), nullable=False, default='member')  # 'member', 'moderator', 'owner'
    status = Column(String(20), nullable=False, default='active')  # 'active', 'banned', 'left'
    joined_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    last_activity_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)

class CommunityPost(Base):
    __tablename__ = "community_posts"
    post_id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("communities.community_id"), nullable=False)
    author_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    excerpt = Column(String(300), nullable=True)
    status = Column(String(20), nullable=False, default='visible')  # 'visible', 'flagged'
    is_pinned = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)

class CommunityPostAttachment(Base):
    __tablename__ = "community_post_attachments"
    attachment_id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("community_posts.post_id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False, default='image')  # Only 'image' supported for community posts
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))

class CommunityPostComment(Base):
    __tablename__ = "community_post_comments"
    comment_id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("community_posts.post_id"), nullable=False)
    community_id = Column(Integer, ForeignKey("communities.community_id"), nullable=False)
    author_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    parent_comment_id = Column(Integer, ForeignKey("community_post_comments.comment_id"), nullable=True)
    body = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default='visible')  # 'visible', 'flagged'
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)

class CommunityPostReaction(Base):
    __tablename__ = "community_post_reactions"
    reaction_id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("community_posts.post_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    reaction_type = Column(String(30), nullable=False, default='like')
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))

class CommunityPostCommentReaction(Base):
    __tablename__ = "community_post_comment_reactions"
    reaction_id = Column(Integer, primary_key=True, index=True)
    comment_id = Column(Integer, ForeignKey("community_post_comments.comment_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    reaction_type = Column(String(30), nullable=False, default='like')
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))

class SavedPost(Base):
    __tablename__ = "saved_posts"
    saved_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    post_id = Column(Integer, ForeignKey("community_posts.post_id"), nullable=False)
    saved_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))

class SavedProfessional(Base):
    __tablename__ = "saved_professionals"
    saved_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    professional_id = Column(Integer, ForeignKey("professional_users_profile.professional_id"), nullable=False)
    saved_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))

class SavedResource(Base):
    __tablename__ = "saved_resources"
    saved_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    resource_id = Column(Integer, ForeignKey("resources.resource_id"), nullable=False)
    saved_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))

class Report(Base):
    __tablename__ = "reports"
    report_id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    report_type = Column(String(50), nullable=False)  # 'post', 'comment', 'community', 'user'
    reported_post_id = Column(Integer, ForeignKey("community_posts.post_id"), nullable=True)
    reported_comment_id = Column(Integer, ForeignKey("community_post_comments.comment_id"), nullable=True)
    reported_community_id = Column(Integer, ForeignKey("communities.community_id"), nullable=True)
    reported_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    reason = Column(String(50), nullable=False)  # 'spam', 'harassment', 'inappropriate', 'misinformation', 'other'
    details = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default='pending')  # 'pending', 'reviewed', 'resolved', 'dismissed'
    reviewed_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)

# ============================================================================
# Private Messaging Models
# ============================================================================

# Private Messaging Models (Conversation-Based)
# Private messaging system using conversation-based architecture
class PrivateMessageConversation(Base):
    """
    Private message conversation model
    
    Represents a conversation between two users. Each conversation:
    - Links two participants (participant1_id < participant2_id for consistency)
    - Tracks the last message and unread counts for each participant
    - Supports soft deletion (participants can delete their view)
    """
    __tablename__ = "private_message_conversations"
    conversation_id = Column(Integer, primary_key=True, index=True)
    participant1_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)  # Always smaller user_id
    participant2_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)  # Always larger user_id
    last_message_id = Column(Integer, ForeignKey("private_messages.message_id"), nullable=True)
    last_message_at = Column(DateTime(timezone=True), nullable=True)
    participant1_unread_count = Column(Integer, nullable=False, default=0)
    participant2_unread_count = Column(Integer, nullable=False, default=0)
    participant1_deleted_at = Column(DateTime(timezone=True), nullable=True)
    participant2_deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)

class PrivateMessage(Base):
    __tablename__ = "private_messages"
    message_id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("private_message_conversations.conversation_id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    is_deleted_by_sender = Column(Boolean, nullable=False, default=False)
    is_deleted_by_recipient = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)

class PrivateMessageAttachment(Base):
    __tablename__ = "private_message_attachments"
    attachment_id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("private_messages.message_id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)  # 'image', 'video', 'document'
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))

class PrivateMessageReaction(Base):
    __tablename__ = "private_message_reactions"
    reaction_id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("private_messages.message_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    reaction_type = Column(String(20), nullable=False, default='like')  # 'like', 'love', 'laugh', 'support', 'helpful'
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))

# ============================================================================
# Notification Models
# ============================================================================

class UserNotificationPreference(Base):
    """
    User notification preferences model
    
    Stores user preferences for receiving notifications:
    - In-app notifications (shown in the app)
    - Email notifications (sent via email)
    
    Default: Both enabled for new users
    """
    __tablename__ = "user_notification_preferences"
    preference_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, unique=True)
    in_app_notifications = Column(Boolean, nullable=False, default=True)
    email_notifications = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)

class Notification(Base):
    """
    Notification model
    
    Stores in-app notifications for users. Notifications can be related to:
    - Posts (likes, comments)
    - Comments (replies, likes)
    - Communities (new members, posts)
    - Messages (new messages, reactions)
    - Professional profiles (approvals, rejections)
    - Promotional materials (approvals, rejections)
    - Reports (submission, resolution)
    
    Includes metadata for flexible notification content.
    """
    __tablename__ = "notifications"
    notification_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    notification_type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=True)
    content = Column(Text, nullable=True)
    actor_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    related_post_id = Column(Integer, ForeignKey("community_posts.post_id", ondelete="CASCADE"), nullable=True)
    related_comment_id = Column(Integer, ForeignKey("community_post_comments.comment_id", ondelete="CASCADE"), nullable=True)
    related_community_id = Column(Integer, ForeignKey("communities.community_id", ondelete="CASCADE"), nullable=True)
    related_message_id = Column(Integer, ForeignKey("private_messages.message_id", ondelete="CASCADE"), nullable=True)
    related_profile_id = Column(Integer, ForeignKey("professional_users_profile.professional_id", ondelete="CASCADE"), nullable=True)
    related_material_id = Column(Integer, ForeignKey("promotional_materials.material_id", ondelete="CASCADE"), nullable=True)
    related_report_id = Column(Integer, ForeignKey("reports.report_id", ondelete="CASCADE"), nullable=True)
    # Use 'metadata' as the database column name but map it to 'notification_metadata' in Python to avoid SQLAlchemy reserved word conflict
    notification_metadata = Column('metadata', JSON, nullable=True, default={})
    is_read = Column(Boolean, nullable=False, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))

# ============================================================================
# Resource Models
# ============================================================================

class Resource(Base):
    """
    Educational resource model
    
    Stores educational resources (articles, videos, guides) for parents.
    Resources can be:
    - Draft (not yet published)
    - Published (visible to parents)
    - Archived (no longer active)
    
    Resources are categorized by type, developmental stages, and tags.
    """
    __tablename__ = "resources"
    resource_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)  # Required field
    content = Column(Text, nullable=True)  # Conditionally required: only for 'article' and 'guide' types (validated in application layer)
    resource_type = Column(String(50), nullable=False)  # 'article', 'video', 'guide'
    category = Column(String(100), nullable=False)  # Required field
    target_developmental_stages = Column(ARRAY(String), nullable=False)  # Required array, must have at least one value (enforced via CHECK constraint)
    external_url = Column(String(500), nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    excerpt = Column(Text, nullable=True)
    tags = Column(ARRAY(String), nullable=True)
    status = Column(String(20), nullable=False, default='draft')  # 'draft', 'published', 'archived'
    created_by = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)

class ResourceAttachment(Base):
    __tablename__ = "resource_attachments"
    attachment_id = Column(Integer, primary_key=True, index=True)
    resource_id = Column(Integer, ForeignKey("resources.resource_id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)  # 'image', 'video', 'document'
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    display_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))

