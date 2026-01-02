# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: config.py
# Description: To load and manage application configuration settings from environment variables
# First Written on: Monday, 29-Sep-2025
# Edited on: Sunday, 10-Dec-2025

"""
Configuration and environment variables

This module loads and manages all configuration settings from environment variables,
including database connections, API keys, Supabase storage, and email settings.
"""
import os
import logging
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings
from supabase import create_client, Client
import openai

# Set up logging configuration
# Logs are set to INFO level to capture important application events
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
# This allows configuration to be stored in a file rather than hardcoded
load_dotenv()

# Database configuration
# PostgreSQL database connection URL
DATABASE_URL = os.getenv("DATABASE_URL")

# Secret key for JWT token signing and encryption
# This should be a long, random string for security
SECRET_KEY = os.getenv("SECRET_KEY")

# OpenAI API configuration
# Used for AI chat functionality and embeddings generation
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    print("⚠️ WARNING: OPENAI_API_KEY environment variable is missing!")
    print("Please add OPENAI_API_KEY to your backend .env file")
    raise ValueError("OPENAI_API_KEY is required")
else:
    # Set the API key in the environment for OpenAI client initialization
    os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
    # Initialize OpenAI client for direct API calls
    openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)
    print(f"✅ OpenAI API key loaded (length: {len(OPENAI_API_KEY)})")

# Initialize OpenAI embeddings model for vector operations
# This is used for semantic search and similarity matching
EMBEDDINGS_MODEL = OpenAIEmbeddings()

# Supabase configuration
# Supabase is used for file storage (images, documents, attachments)
SUPABASE_URL = os.getenv("SUPABASE_URL")

# For backend operations, use service role key to bypass RLS (Row Level Security)
# Service role key has full access and bypasses Row Level Security policies
# This is necessary for server-side file uploads and operations
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

# Supabase Storage bucket names
# Each bucket stores a specific type of file for organization
DIARY_ATTACHMENTS_BUCKET = "diary-attachments"  # Files attached to diary entries
COMMUNITY_IMAGES_BUCKET = "community-images"  # Community cover images
POST_IMAGES_BUCKET = "post-images"  # Images attached to community posts
PRIVATE_MESSAGE_ATTACHMENTS_BUCKET = "private-message-attachments"  # Files in private messages
PROMOTIONAL_MATERIALS_BUCKET = "promotional-materials"  # Promotional content from professionals
PROFESSIONAL_DOCUMENTS_BUCKET = "professional-documents"  # Professional verification documents
PROFESSIONAL_PROFILE_IMAGES_BUCKET = "professional-profile-images"  # Professional profile pictures
EDUCATIONAL_RESOURCES_BUCKET = "educational-resources"  # Educational resource files
RESOURCE_THUMBNAILS_BUCKET = "resource-thumbnails"  # Thumbnail images for resources (one per resource)
STATIC_ASSETS_BUCKET = "static-assets"  # Static assets like logos and branding images

# Validate Supabase configuration
# Both URL and service role key are required for backend file operations
if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("ERROR: Supabase environment variables are missing!")
    print("⚠️  For backend uploads, SUPABASE_SERVICE_ROLE_KEY is required to bypass RLS")
    raise ValueError("Supabase configuration is incomplete")

# Check if we're using the service role key or falling back to anon key
# Service role key is preferred as it bypasses Row Level Security
if os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
    print(f"✅ Using SUPABASE_SERVICE_ROLE_KEY (service role key - bypasses RLS)")
else:
    print(f"⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY not found, falling back to SUPABASE_KEY")
    print(f"⚠️  This might be the anon key, which will NOT bypass RLS policies!")
    print(f"⚠️  Please set SUPABASE_SERVICE_ROLE_KEY in your .env file for backend uploads")

# Initialize Supabase client for file storage operations
try:
    # Use service role key for backend operations (bypasses RLS)
    # This allows the backend to upload files without being restricted by RLS policies
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    key_length = len(SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_SERVICE_ROLE_KEY else 0
    print(f"✅ Supabase client initialized successfully (key length: {key_length})")
except Exception as e:
    print(f"❌ Failed to initialize Supabase client: {e}")
    raise

# Email/SMTP configuration
# Used for sending verification emails, password reset emails, and notifications
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")  # Default to Gmail SMTP
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))  # Default to SSL port 465
SMTP_USERNAME = os.getenv("SMTP_USERNAME")  # Email account username
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")  # Email account password or app password
FROM_EMAIL = os.getenv("FROM_EMAIL", "parenzing.app@gmail.com")  # Sender email address
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")  # Frontend URL for email links

# Email logo URL - can be set via env var, or will be generated from Supabase Storage
# This logo appears in email templates
EMAIL_LOGO_URL = os.getenv("EMAIL_LOGO_URL")

# Firebase/Google configuration
# Used for Google Sign-In authentication
FIREBASE_CLIENT_ID = os.getenv("FIREBASE_CLIENT_ID")  # Firebase OAuth client ID
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")  # Firebase project ID

logger.info(f"FIREBASE_PROJECT_ID at startup: {FIREBASE_PROJECT_ID}")

# CORS (Cross-Origin Resource Sharing) allowed origins
# These are the frontend URLs that are allowed to make requests to the API
# Requests from other origins will be blocked by the browser
CORS_ORIGINS = [
    "http://localhost:3000",  # Local development
    "http://localhost:8080",  # Alternative local port
    "https://master.dcmcchu8q16tm.amplifyapp.com",  # AWS Amplify master branch
    "https://dcmcchu8q16tm.amplifyapp.com",  # AWS Amplify production
    "https://www.parenzing.com",  # Production domain with www (HTTPS)
    "http://www.parenzing.com",  # Production domain with www (HTTP)
    "https://parenzing.com",  # Production domain root (HTTPS)
    "http://parenzing.com",  # Production domain root (HTTP)
    "http://parenting-app-alb-1579687963.ap-southeast-2.elb.amazonaws.com",  # AWS Load Balancer (HTTP)
    "https://parenting-app-alb-1579687963.ap-southeast-2.elb.amazonaws.com"  # AWS Load Balancer (HTTPS)
]

# Export supabase client for use in routers
__all__ = [
    "DATABASE_URL", "SECRET_KEY", "OPENAI_API_KEY", "EMBEDDINGS_MODEL",
    "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", 
    "DIARY_ATTACHMENTS_BUCKET", "COMMUNITY_IMAGES_BUCKET", "POST_IMAGES_BUCKET", 
    "PRIVATE_MESSAGE_ATTACHMENTS_BUCKET", "PROMOTIONAL_MATERIALS_BUCKET",
    "PROFESSIONAL_DOCUMENTS_BUCKET", "PROFESSIONAL_PROFILE_IMAGES_BUCKET", "EDUCATIONAL_RESOURCES_BUCKET", "RESOURCE_THUMBNAILS_BUCKET", "STATIC_ASSETS_BUCKET",
    "EMAIL_LOGO_URL", "supabase",
    "SMTP_SERVER", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD",
    "FROM_EMAIL", "FRONTEND_URL", "FIREBASE_CLIENT_ID", "FIREBASE_PROJECT_ID",
    "CORS_ORIGINS", "logger"
]

