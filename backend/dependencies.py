# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: dependencies.py
# Description: To provide shared dependencies and utilities for authentication and database access
# First Written on: Monday, 29-Sep-2025
# Edited on: Sunday, 10-Dec-2025

"""
Shared dependencies for FastAPI routes

This module provides shared dependencies and utilities for authentication,
user management, and database access across all API routes.
"""
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from fastapi_users import FastAPIUsers, BaseUserManager, IntegerIDMixin
from fastapi_users.authentication import CookieTransport, AuthenticationBackend, JWTStrategy
from fastapi_users.password import PasswordHelper
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import AsyncGenerator
from pydantic import SecretStr
import jwt

from models.database import User, AsyncSessionLocal
from config import SECRET_KEY

# ============================================================================
# Database Dependencies
# ============================================================================

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Get database session dependency
    
    This dependency provides an async database session that is automatically
    closed after the request completes. Use this in route handlers that need
    database access.
    
    Yields:
        AsyncSession: Database session
    """
    async with AsyncSessionLocal() as session:
        yield session

async def get_user_db() -> AsyncGenerator[SQLAlchemyUserDatabase, None]:
    """
    Get user database for FastAPI Users
    
    This dependency provides a SQLAlchemyUserDatabase instance for FastAPI Users
    authentication system. It's used internally by fastapi-users.
    
    Yields:
        SQLAlchemyUserDatabase: User database adapter
    """
    async with AsyncSessionLocal() as session:
        yield SQLAlchemyUserDatabase(session, User)

async def get_user_db_for_strategy() -> SQLAlchemyUserDatabase:
    """
    Get user database for strategy (non-generator version)
    
    This is a non-generator version used by authentication strategies
    that don't support dependency injection generators.
    
    Returns:
        SQLAlchemyUserDatabase: User database adapter
    """
    async with AsyncSessionLocal() as session:
        return SQLAlchemyUserDatabase(session, User)

# ============================================================================
# User Manager
# ============================================================================

class UserManager(IntegerIDMixin, BaseUserManager[User, int]):
    """
    Custom user manager for FastAPI Users
    
    This class extends the base user manager to add custom logic for:
    - User registration with role checking
    - Email verification
    - Profile creation
    - Notification preferences setup
    """
    # Secret keys for password reset and email verification tokens
    reset_password_token_secret = SecretStr(SECRET_KEY or "")
    verification_token_secret = SecretStr(SECRET_KEY or "")
    
    def __init__(self, *args, **kwargs):
        """
        Initialize the user manager with password hashing context
        
        Sets up bcrypt password hashing for secure password storage.
        """
        super().__init__(*args, **kwargs)
        from passlib.context import CryptContext
        # Use bcrypt for password hashing (industry standard)
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.password_helper = PasswordHelper(pwd_context)
    
    async def create(self, user_create, safe: bool = False, request=None):
        """
        Override create method to check for existing accounts and prevent duplicates
        
        This method validates that:
        1. The email isn't already registered with a different role
        2. Google accounts can't be registered with email/password
        3. Duplicate registrations are prevented
        
        Args:
            user_create: User creation data
            safe: Whether to use safe creation mode
            request: HTTP request object
        
        Returns:
            User: Created user object
        
        Raises:
            HTTPException: If email is already registered or validation fails
        """
        async with AsyncSessionLocal() as session:
            # Check if email already exists in the database
            result = await session.execute(
                select(User).where(User.email == user_create.email)
            )
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                # Check if trying to register with different role (most important check)
                # Users cannot have the same email with different roles
                if existing_user.role != user_create.role:
                    role_name = "parent" if existing_user.role == "parent" else "professional"
                    new_role_name = "professional" if user_create.role == "professional" else "parent"
                    # Include Google account info if applicable
                    if existing_user.google_id:
                        raise HTTPException(
                            status_code=400,
                            detail=f"This email is already registered with Google as a {role_name}. Please use a different email address to create a {new_role_name} account."
                        )
                    else:
                        raise HTTPException(
                            status_code=400,
                            detail=f"This email is already registered as a {role_name}. Please sign in with your existing account or use a different email address to create a {new_role_name} account."
                        )
                # Same role - check if it's a Google account
                # Google accounts must use Google Sign-In, not email/password
                elif existing_user.google_id:
                    raise HTTPException(
                        status_code=400, 
                        detail="This email is already registered with Google. Please use 'Sign in with Google' instead."
                    )
                else:
                    # Same email and same role - generic duplicate error
                    raise HTTPException(
                        status_code=400,
                        detail="This email is already registered. Please sign in or use a different email address."
                    )
        
        # If validation passes, create the user using the parent class method
        return await super().create(user_create, safe=safe, request=request)
    
    async def on_after_register(self, user: User, request=None):
        """
        Hook called after user registration completes
        
        This method is automatically called by FastAPI Users after a user
        successfully registers. It performs post-registration setup:
        1. Creates parent profile for parent users
        2. Sets up notification preferences
        3. Creates email verification record
        4. Sends verification email
        
        Args:
            user: The newly registered user
            request: HTTP request object (optional)
        """
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"User {user.email} has registered.")
        
        # Skip post-registration setup for Google accounts
        # Google accounts are already verified and don't need email verification
        if user.google_id:
            logger.warning(f"User {user.email} has google_id, should use Google sign-in")
            return
        
        # Perform post-registration setup in a database transaction
        async with AsyncSessionLocal() as session:
            try:
                # Create parent profile for parent users
                # This allows parents to store additional profile information
                if user.role == "parent":
                    from models.database import ParentProfile
                    profile = ParentProfile(user_id=user.user_id)
                    session.add(profile)
                    logger.info(f"Created parent profile for user {user.user_id}")
                
                # Create notification preferences for all new users
                # Default: both in-app and email notifications enabled
                from models.database import UserNotificationPreference
                notification_prefs = UserNotificationPreference(
                    user_id=user.user_id,
                    in_app_notifications=True,
                    email_notifications=True
                )
                session.add(notification_prefs)
                logger.info(f"Created notification preferences for user {user.user_id}")
                
                # Create email verification record and send verification email
                # This allows users to verify their email address
                from utils.helpers import create_verification_record, send_verification_email
                token = await create_verification_record(user.user_id, user.email, session)
                logger.info(f"Created verification record for {user.email}")
                
                # Commit all database changes
                await session.commit()
                
                # Send verification email (non-blocking - continue even if it fails)
                try:
                    display_name = user.email.split('@')[0]
                    email_sent = send_verification_email(user.email, token, display_name)
                    if email_sent:
                        logger.info(f"✅ Verification email sent successfully to {user.email}")
                    else:
                        logger.warning(f"❌ Failed to send verification email to {user.email} - continuing anyway")
                except Exception as email_error:
                    logger.error(f"❌ Email sending failed with exception: {email_error}")
                    logger.warning(f"Continuing registration despite email failure")
                
                logger.info(f"Registration completed for {user.email}")
            except Exception as e:
                # Rollback database changes if anything fails
                await session.rollback()
                logger.error(f"Error in on_after_register: {e}")

async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    """
    Get user manager dependency
    
    This dependency provides a UserManager instance for FastAPI Users.
    It's used internally by the authentication system.
    
    Args:
        user_db: User database adapter (injected dependency)
    
    Yields:
        UserManager: User manager instance
    """
    yield UserManager(user_db)

# ============================================================================
# Authentication Setup
# ============================================================================

# Cookie transport for authentication
# Cookies are used to store JWT tokens in the browser
# Max age: 7 days (604800 seconds) for "remember me" functionality
cookie_transport = CookieTransport(
    cookie_max_age=604800,  # 7 days
    cookie_name="fastapi-users-auth-jwt"
)

def get_jwt_strategy(remember_me: bool = True) -> JWTStrategy:
    """
    Get JWT strategy with conditional expiration based on remember_me
    
    This function creates a JWT authentication strategy with different
    token lifetimes based on whether the user selected "remember me":
    - Remember me: 7 days (604800 seconds) - for convenience
    - No remember me: 4 hours (14400 seconds) - for security
    
    Args:
        remember_me: Whether the user selected "remember me" option
    
    Returns:
        JWTStrategy: JWT authentication strategy
    """
    # Remember me: 7 days (604800 seconds) - for convenience while maintaining security
    # No remember me: 4 hours (14400 seconds) - absolute timeout for security
    lifetime = 604800 if remember_me else 14400
    print(f"DEBUG: Creating JWT strategy with SECRET_KEY length: {len(SECRET_KEY or '')}, lifetime: {lifetime} seconds (remember_me={remember_me})")
    return JWTStrategy(secret=SecretStr(SECRET_KEY or ""), lifetime_seconds=lifetime)

# Cookie-based authentication backend
# This backend uses cookies to store and transmit JWT tokens
cookie_auth_backend = AuthenticationBackend(
    name="jwt-cookie",
    transport=cookie_transport,  # Use cookies for token transport
    get_strategy=get_jwt_strategy,  # Use JWT strategy with conditional expiration
)

# Initialize FastAPI Users with our custom user manager and authentication backend
# This provides all the authentication endpoints and utilities
fastapi_users = FastAPIUsers[User, int](get_user_manager, [cookie_auth_backend])

# ============================================================================
# Authentication Dependencies
# ============================================================================

async def get_current_user_token(authorization: str = Depends(OAuth2PasswordBearer(tokenUrl="auth/jwt/login"))) -> User:
    """
    Authenticate users via Bearer token
    
    This dependency extracts and validates a JWT token from the Authorization header.
    It's used for API endpoints that require Bearer token authentication.
    
    Args:
        authorization: Bearer token from Authorization header (injected by OAuth2PasswordBearer)
    
    Returns:
        User: Authenticated user object
    
    Raises:
        HTTPException: If token is invalid, expired, or user is not active
    """
    try:
        # Decode and validate the JWT token
        payload = jwt.decode(
            authorization,
            SECRET_KEY or "",
            algorithms=["HS256"],  # Use HS256 algorithm for signing
            audience=["fastapi-users:auth"]  # Verify token audience
        )
        # Extract user ID from token payload
        user_id = int(payload.get("sub"))
        
        # Fetch user from database
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(User).where(User.user_id == user_id))
            user = result.scalar_one_or_none()
            
            # Verify user exists and is active
            if not user or not user.is_active:
                raise HTTPException(status_code=401, detail="User not authenticated")
            
            return user
    except jwt.ExpiredSignatureError:
        # Token has expired
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        # Token is invalid or malformed
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        # Any other authentication error
        print(f"Authentication error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

async def get_current_user_flexible(request: Request) -> User:
    """
    Flexible authentication: try cookie first, then bearer token, then query parameter
    
    This dependency provides flexible authentication that supports multiple methods:
    1. Cookie-based authentication (for web browsers)
    2. Bearer token authentication (for API clients)
    3. Query parameter token (for SSE/EventSource which doesn't support custom headers)
    
    This allows the same endpoint to work with different client types.
    
    Args:
        request: HTTP request object
    
    Returns:
        User: Authenticated user object
    
    Raises:
        HTTPException: If no valid authentication is found
    """
    print(f"DEBUG: get_current_user_flexible - Method: {request.method}, URL: {request.url}")
    
    # Try cookie authentication first (for web browsers)
    try:
        cookie_name = "fastapi-users-auth-jwt"
        if cookie_name in request.cookies:
            token = request.cookies[cookie_name]
            print(f"DEBUG: Found cookie token: {token[:20]}...")
            
            # Decode and validate JWT token from cookie
            payload = jwt.decode(
                token,
                SECRET_KEY or "",
                algorithms=["HS256"],
                audience=["fastapi-users:auth"]
            )
            
            # Extract user ID and fetch user from database
            user_id = payload.get("sub")
            if user_id:
                async with AsyncSessionLocal() as session:
                    result = await session.execute(select(User).where(User.user_id == int(user_id)))
                    user = result.scalar_one_or_none()
                    
                    # Verify user exists and is active
                    if user and user.is_active:
                        print(f"DEBUG: Cookie auth successful - User: {user.email} (ID: {user.user_id})")
                        return user
    except Exception as e:
        print(f"DEBUG: Cookie auth failed: {e}")
    
    # Try bearer token authentication (for API clients)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        print(f"DEBUG: Trying bearer token authentication...")
        token = auth_header.split(" ")[1]  # Extract token from "Bearer <token>"
        return await get_current_user_token(token)
    
    # Try token in query parameter (for SSE/EventSource which doesn't support custom headers)
    # This is useful for Server-Sent Events connections that can't set Authorization headers
    token_param = request.query_params.get("token")
    if token_param:
        print(f"DEBUG: Trying query parameter token authentication...")
        try:
            return await get_current_user_token(token_param)
        except Exception as e:
            print(f"DEBUG: Query parameter token auth failed: {e}")
    
    # No valid authentication found
    print(f"DEBUG: No valid authentication found")
    raise HTTPException(status_code=401, detail="Not authenticated")

