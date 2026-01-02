# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: auth.py
# Description: To handle user authentication endpoints including login, registration, email verification, and password management
# First Written on: Monday, 29-Sep-2025
# Edited on: Sunday, 10-Dec-2025

"""
Authentication router - Handles user authentication and account management

This router provides endpoints for:
- Google OAuth authentication (Firebase token verification)
- JWT-based login with "Remember Me" support
- Email verification (send and verify)
- Password reset (forgot password, verify token, reset password)
- Password change
- Account deletion (soft delete)
- Current user information retrieval

All authentication endpoints support CORS and set appropriate cookies for session management.
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from fastapi_users import BaseUserManager
from fastapi_users.router import ErrorCode
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.exc import IntegrityError
from typing import cast, Literal
from datetime import datetime, timezone
import json
import logging

from dependencies import (
    get_session, get_user_manager, get_jwt_strategy, get_current_user_flexible
)
from models.database import (
    User, ParentProfile, ProfessionalProfile, EmailVerification, PasswordReset
)
from utils.helpers import (
    verify_firebase_token, send_verification_email, create_verification_record,
    send_password_reset_email, create_password_reset_record
)
from config import CORS_ORIGINS, logger

# Initialize router with prefix and tags for API documentation
router = APIRouter(prefix="/auth", tags=["auth"])

# ============================================================================
# Helper Functions
# ============================================================================

def get_samesite(val):
    """
    Helper to ensure samesite cookie attribute is correct type
    
    Validates and converts samesite value to one of the allowed values:
    'lax', 'strict', or 'none'. Returns None if value is invalid.
    
    Args:
        val: The samesite value to validate
    
    Returns:
        Literal["lax", "strict", "none"] or None: Validated samesite value
    """
    allowed = {"lax", "strict", "none"}
    if val is None:
        return None
    val_lower = str(val).lower()
    if val_lower in allowed:
        return cast(Literal["lax", "strict", "none"], val_lower)
    return None

# ============================================================================
# OAuth Authentication Endpoints
# ============================================================================

@router.post("/google")
async def google_auth(request: Request, db: AsyncSession = Depends(get_session)):
    """
    Google OAuth authentication endpoint
    
    Authenticates users using Google OAuth via Firebase ID tokens.
    Handles both new user registration and existing user login.
    Supports linking Google accounts to existing email/password accounts.
    
    Flow:
    1. Verifies Firebase ID token from Authorization header
    2. Extracts user information (email, name, Firebase UID)
    3. Checks if user exists (by email or google_id)
    4. Creates new user if doesn't exist, or links Google account if exists
    5. Creates parent profile and notification preferences for new users
    6. Generates JWT token and sets authentication cookie
    7. Returns user info with isFirstLogin flag
    
    Args:
        request: FastAPI Request object (contains Authorization header and JSON body)
        db: Database session (from dependency injection)
    
    Returns:
        Response: JSON response with:
            - isFirstLogin: bool indicating if this is user's first login
            - id: User ID
            - role: User role (parent/professional)
            - access_token: JWT token
            - token_type: "bearer"
        Also sets authentication cookie (7-day expiration for Google sign-in)
    
    Raises:
        HTTPException: 
            - 401 if Authorization header missing/invalid or token invalid
            - 400 if user already exists with different role
            - 500 if user creation/linking fails
    """
    # Extract request body and authorization header
    data = await request.json()
    auth_header = request.headers.get("Authorization")
    
    # Validate authorization header format
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.error("Missing or invalid Authorization header")
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    # Extract and verify Firebase ID token
    token = auth_header.split(" ")[1]
    idinfo = verify_firebase_token(token)
    if not idinfo:
        logger.error("Invalid ID token")
        raise HTTPException(status_code=401, detail="Invalid ID token")

    # Extract user information from verified token
    email = idinfo.get("email")
    name = idinfo.get("name")
    sub = idinfo.get("sub")  # Firebase UID
    role = data.get("role", "parent")  # Default to "parent" if not specified

    # Check if user exists (by email or google_id)
    result = await db.execute(select(User).where(
        or_(User.email == email, User.google_id == sub)
    ))
    user_row = result.scalar_one_or_none()
    user = None

    # Handle new user registration
    if not user_row:
        new_user = User(
            email=email,
            hashed_password=None, 
            google_id=sub,
            role=role,
            is_active=True,
            is_verified=True,
        )
        db.add(new_user)
        try:
            await db.commit()
            await db.refresh(new_user)
            user = new_user
            
            # Create parent profile for parent users
            if role != "professional":
                profile = ParentProfile(user_id=user.user_id)
                db.add(profile)
            
            # Create notification preferences for all new users (default: both enabled)
            from models.database import UserNotificationPreference
            notification_prefs = UserNotificationPreference(
                user_id=user.user_id,
                in_app_notifications=True,
                email_notifications=True
            )
            db.add(notification_prefs)
            
            await db.commit()
            logger.info(f"Created new Google user: {email} with role: {role}")
        except IntegrityError as e:
            await db.rollback()
            logger.error(f"IntegrityError creating Google user: {e}")
            raise HTTPException(status_code=400, detail="A user with this email already exists.")
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating Google user: {e}")
            raise HTTPException(status_code=500, detail="Failed to create user.")
    else:
        # Handle existing user login or account linking
        user = user_row
        
        # Case 1: User already has google_id - normal Google sign-in
        if user.google_id:
            logger.info(f"Google user signing in: {email} with role: {user.role}")
        # Case 2: User has password but no google_id - link Google account to existing account
        elif user.hashed_password and not user.google_id:
            # When linking, use existing user's role - don't check role mismatch
            # This allows linking Google to any existing account regardless of role
            logger.info(f"Linking Google account to existing manual account: {email} with role: {user.role}")
            user.google_id = sub
            user.is_verified = True  # Google accounts are automatically verified
            db.add(user)
            try:
                await db.commit()
                await db.refresh(user)
                logger.info(f"Successfully linked Google account for: {email}")
            except Exception as e:
                await db.rollback()
                logger.error(f"Error linking Google account: {e}")
                raise HTTPException(status_code=500, detail="Failed to link Google account.")
        else:
            # Case 3: Edge case - User exists but no password and no google_id
            # Check role mismatch only when trying to create account with different role
            if user.role != role:
                role_name = "parent" if user.role == "parent" else "professional"
                new_role_name = "professional" if role == "professional" else "parent"
                raise HTTPException(
                    status_code=400,
                    detail=f"This email is already registered as a {role_name}. Please sign in with your existing account or use a different email address to create a {new_role_name} account."
                )
            logger.info(f"User already exists: {email} with role: {user.role}")

    # Check if profile exists for first-time login detection
    # Used to determine if user should see onboarding flow
    is_first_login = False
    if user.role == "professional":
        # For professionals, check if profile exists
        professional_profile_result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.user_id == user.user_id)
        )
        professional_profile = professional_profile_result.scalar_one_or_none()
        is_first_login = professional_profile is None
    else:
        # For parents, check if profile exists and has meaningful data
        parent_profile_result = await db.execute(
            select(ParentProfile).where(ParentProfile.user_id == user.user_id)
        )
        parent_profile = parent_profile_result.scalar_one_or_none()
        if parent_profile is None:
            is_first_login = True
        else:
            # Check if profile has been filled out (has meaningful data)
            has_meaningful_data = (
                parent_profile.first_name or 
                parent_profile.last_name or 
                parent_profile.parenting_style or
                parent_profile.relationship_with_child
            )
            is_first_login = not has_meaningful_data

    # Generate JWT token for authenticated session
    strategy = get_jwt_strategy()
    token = await strategy.write_token(user)
    logger.info(f"JWT token: {token}")
    
    # Build response with user information
    response_content = {
        "isFirstLogin": is_first_login, 
        "id": user.user_id, 
        "role": user.role,
        "access_token": token, 
        "token_type": "bearer"
    }
    response = Response(content=json.dumps(response_content), media_type="application/json")

    # Set authentication cookie (7 days for Google sign-in, treated as "remember me")
    response.set_cookie(
        key="fastapi-users-auth-jwt",
        value=token,
        max_age=604800,  # 7 days for Google sign-in (treated as remember me)
        expires=604800,
        path="/",
        httponly=True,  # Prevent XSS attacks
        samesite="none",  # Required for cross-origin requests
        secure=True,  # Only send over HTTPS
        domain=None,
    )

    # Set CORS headers for cross-origin requests
    origin = request.headers.get("origin")
    response.headers["Access-Control-Allow-Origin"] = origin if origin in CORS_ORIGINS else CORS_ORIGINS[0]
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Expose-Headers"] = "*"

    return response

# ============================================================================
# JWT Login Endpoints
# ============================================================================

@router.post("/jwt/login")
async def custom_login(
    request: Request,
    db: AsyncSession = Depends(get_session),
    user_manager: BaseUserManager[User, int] = Depends(get_user_manager),
):
    """
    JWT login endpoint with Remember Me support
    
    Authenticates users using email/password credentials and generates JWT tokens.
    Supports both JSON and form-data request formats.
    Implements "Remember Me" functionality with different token expiration times.
    
    Flow:
    1. Extracts credentials from request (JSON or form data)
    2. Validates user exists, is active, and is verified
    3. Verifies password using password helper
    4. Checks if account is Google-only (no password)
    5. Generates JWT token with appropriate expiration based on remember_me
    6. Sets authentication cookie
    7. Returns user info with isFirstLogin flag
    
    Args:
        request: FastAPI Request object (contains credentials in body)
        db: Database session (from dependency injection)
        user_manager: FastAPI Users user manager (from dependency injection)
    
    Returns:
        Response: JSON response with:
            - access_token: JWT token
            - token_type: "bearer"
            - isFirstLogin: bool indicating if this is user's first login
            - role: User role
        Also sets authentication cookie with appropriate expiration
    
    Raises:
        HTTPException:
            - 400 if credentials missing/invalid, user not verified, or account is Google-only
            - 500 if authentication fails
    """
    # Try to get credentials from JSON first, then fall back to form data
    remember_me = False
    identifier = ""
    password = ""
    
    content_type = request.headers.get("content-type", "")
    
    # Handle JSON request format
    if "application/json" in content_type:
        try:
            body = await request.json()
            identifier = body.get("username", "").strip()
            password = body.get("password", "").strip()
            remember_me = body.get("remember_me", False)
        except:
            raise HTTPException(status_code=400, detail="Invalid JSON request")
    else:
        # Handle form data (OAuth2PasswordRequestForm format)
        try:
            form_data = await request.form()
            identifier = form_data.get("username", "").strip()
            password = form_data.get("password", "").strip()
            remember_me = form_data.get("remember_me", "false").lower() == "true"
        except:
            raise HTTPException(status_code=400, detail="Invalid form data")
    
    # Validate credentials are provided
    if not identifier or not password:
        raise HTTPException(status_code=400, detail=ErrorCode.LOGIN_BAD_CREDENTIALS)
    
    print(f"Login attempt - username: {identifier}, remember_me: {remember_me}")
    
    # Find user by email
    result = await db.execute(select(User).where(User.email == identifier))
    user = result.scalar_one_or_none()
    
    # Validate user exists and is active
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail=ErrorCode.LOGIN_BAD_CREDENTIALS)
    
    # Check email verification status
    if not user.is_verified:
        raise HTTPException(status_code=400, detail="Please verify your email before logging in")
    
    # Check if account has password (not Google-only)
    if not user.hashed_password:
        raise HTTPException(status_code=400, detail="This account was created with Google sign-in. Please use Google sign-in to log in.")
    
    # Verify password
    try:
        valid, _ = user_manager.password_helper.verify_and_update(
            password, user.hashed_password
        )
    except Exception as e:
        # Handle unknown hash format errors gracefully
        if "UnknownHashError" in str(e) or "hash could not be identified" in str(e):
            valid = False
        else:
            raise

    if not valid:
        raise HTTPException(status_code=400, detail=ErrorCode.LOGIN_BAD_CREDENTIALS)

    # Use conditional token expiration based on remember_me
    # Remember me: 7 days (604800 seconds) - for convenience while maintaining security
    # No remember me: 4 hours (14400 seconds) - absolute timeout for security
    token_lifetime = 604800 if remember_me else 14400
    strategy = get_jwt_strategy(remember_me=remember_me)
    token = await strategy.write_token(user)

    # Check if profile exists for first-time login detection
    # Used to determine if user should see onboarding flow
    is_first_login = False
    if user.role == "professional":
        professional_profile_result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.user_id == user.user_id)
        )
        professional_profile = professional_profile_result.scalar_one_or_none()
        is_first_login = professional_profile is None
    else:
        parent_profile_result = await db.execute(
            select(ParentProfile).where(ParentProfile.user_id == user.user_id)
        )
        parent_profile = parent_profile_result.scalar_one_or_none()
        if parent_profile is None:
            is_first_login = True
        else:
            # Check if profile has been filled out (has meaningful data)
            has_meaningful_data = (
                parent_profile.first_name or 
                parent_profile.last_name or 
                parent_profile.parenting_style or
                parent_profile.relationship_with_child
            )
            is_first_login = not has_meaningful_data
    
    # Build response with authentication token and user info
    response_content = {
        "access_token": token, 
        "token_type": "bearer",
        "isFirstLogin": is_first_login,
        "role": user.role
    }
    response = Response(content=json.dumps(response_content), media_type="application/json")
    
    # Set CORS headers
    origin = request.headers.get("origin")
    if origin in CORS_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        response.headers["Access-Control-Allow-Origin"] = CORS_ORIGINS[0]

    # Set cookie expiration based on remember_me setting
    response.set_cookie(
        key="fastapi-users-auth-jwt",
        value=token,
        max_age=token_lifetime,
        expires=token_lifetime,
        path="/",
        httponly=True,  # Prevent XSS attacks
        samesite="none",  # Required for cross-origin requests
        secure=True,  # Only send over HTTPS
        domain=None,
    )

    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Expose-Headers"] = "*"

    return response

# ============================================================================
# Email Verification Endpoints
# ============================================================================

@router.post("/send-verification-email")
async def send_verification_email_endpoint(
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    """
    Send verification email to user
    
    Sends an email verification link to the user's email address.
    If a valid unverified token already exists, reuses it; otherwise creates a new one.
    
    Args:
        request: FastAPI Request object (contains email in JSON body)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Success message
    
    Raises:
        HTTPException:
            - 400 if email is missing, user not found, or email already verified
            - 500 if email sending fails
    """
    data = await request.json()
    email = data.get("email")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified")
    
    verification_result = await db.execute(
        select(EmailVerification).where(
            EmailVerification.user_id == user.user_id,
            EmailVerification.email == email,
            EmailVerification.is_verified == False
        )
    )
    existing_verification = verification_result.scalar_one_or_none()
    
    if existing_verification and not existing_verification.is_used:
        token = existing_verification.verification_token
    else:
        token = await create_verification_record(user.user_id, email, db)
    
    display_name = email.split('@')[0]
    try:
        parent_result = await db.execute(
            select(ParentProfile).where(ParentProfile.user_id == user.user_id)
        )
        parent_profile = parent_result.scalar_one_or_none()
        if parent_profile and (parent_profile.first_name or parent_profile.last_name):
            display_name = f"{parent_profile.first_name or ''} {parent_profile.last_name or ''}".strip()
    except:
        pass
    
    email_sent = send_verification_email(email, token, display_name)
    
    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send verification email")
    
    return {"message": "Verification email sent successfully"}

@router.get("/verify-email")
async def verify_email_endpoint(
    token: str,
    db: AsyncSession = Depends(get_session)
):
    """
    Verify email with token
    
    Verifies a user's email address using a verification token from the email link.
    Marks the verification record as used and updates the user's verification status.
    
    Args:
        token: Verification token from email link (query parameter)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Success message
    
    Raises:
        HTTPException:
            - 400 if token is missing, already used, or expired
            - 404 if token is invalid
    """
    print(f"Verify email endpoint called with token: {token}")
    if not token:
        raise HTTPException(status_code=400, detail="Token is required")
    
    from datetime import timezone, datetime
    result = await db.execute(
        select(EmailVerification).where(EmailVerification.verification_token == token)
    )
    verification = result.scalar_one_or_none()
    
    if not verification:
        raise HTTPException(status_code=404, detail="Invalid verification token")
    
    if verification.is_used:
        raise HTTPException(status_code=400, detail="Token already used")
    
    if verification.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification token expired")
    
    verification.is_used = True
    verification.is_verified = True
    verification.verified_at = datetime.now(timezone.utc)
    
    user_result = await db.execute(select(User).where(User.user_id == verification.user_id))
    user = user_result.scalar_one_or_none()
    
    if user:
        user.is_verified = True
    
    await db.commit()
    
    return {"message": "Email verified successfully"}

@router.get("/debug/logo-url")
async def debug_logo_url():
    """
    Debug endpoint to check logo URL
    
    Utility endpoint for debugging email logo URL generation.
    Returns the current logo URL configuration.
    
    Returns:
        dict: Logo URL and debug message
    """
    from utils.helpers import get_email_logo_url
    logo_url = get_email_logo_url()
    return {
        "logo_url": logo_url,
        "message": "Check backend logs for detailed debugging information"
    }

@router.post("/forgot-password")
async def forgot_password_endpoint(
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    """
    Request password reset - sends email with reset link
    
    Initiates the password reset process by sending a reset link to the user's email.
    For security, always returns success message even if email doesn't exist
    (to prevent email enumeration attacks).
    
    Flow:
    1. Validates email format
    2. Finds user by email
    3. Validates user is active and has password (not Google-only)
    4. Creates password reset record with token
    5. Sends reset email with token
    6. Returns success message (always, for security)
    
    Args:
        request: FastAPI Request object (contains email in JSON body)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Success message (always returned, even if email doesn't exist)
    
    Raises:
        HTTPException:
            - 400 if email is missing
            - 500 if an error occurs
    """
    try:
        data = await request.json()
        email = data.get("email", "").strip().lower()
        
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        
        # Find user by email
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        # Always return success message (security: don't reveal if email exists)
        if not user:
            logger.warning(f"Password reset requested for non-existent email: {email}")
            return {"message": "If an account with that email exists, a password reset link has been sent."}
        
        if not user.is_active:
            logger.warning(f"Password reset requested for inactive account: {email}")
            return {"message": "If an account with that email exists, a password reset link has been sent."}
        
        # Check if user has password (not Google-only account)
        if not user.hashed_password:
            logger.warning(f"Password reset requested for Google-only account: {email}")
            return {"message": "If an account with that email exists, a password reset link has been sent."}
        
        # Create password reset record
        token = await create_password_reset_record(user.user_id, email, db)
        
        # Send reset email
        display_name = email.split('@')[0]
        email_sent = send_password_reset_email(email, token, display_name)
        
        if email_sent:
            logger.info(f"✅ Password reset email sent successfully to {email}")
        else:
            logger.warning(f"❌ Failed to send password reset email to {email}")
        
        return {"message": "If an account with that email exists, a password reset link has been sent."}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in forgot_password_endpoint: {e}")
        raise HTTPException(status_code=500, detail="An error occurred. Please try again later.")

@router.post("/verify-reset-token")
async def verify_reset_token_endpoint(
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    """
    Verify if a password reset token is valid
    
    Validates a password reset token before allowing password reset.
    Checks if token exists, is not expired, and hasn't been used.
    
    Args:
        request: FastAPI Request object (contains token in JSON body)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Validation result with email if valid:
            - valid: bool indicating token validity
            - email: User's email address (if valid)
    
    Raises:
        HTTPException:
            - 400 if token is missing, expired, or already used
            - 500 if an error occurs
    """
    try:
        data = await request.json()
        token = data.get("token", "").strip()
        
        if not token:
            raise HTTPException(status_code=400, detail="Token is required")
        
        # Find reset record
        result = await db.execute(
            select(PasswordReset).where(PasswordReset.reset_token == token)
        )
        reset_record = result.scalar_one_or_none()
        
        if not reset_record:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
        # Check if token is expired
        from datetime import timezone
        if reset_record.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Reset token has expired")
        
        # Check if token has already been used
        if reset_record.used_at:
            raise HTTPException(status_code=400, detail="Reset token has already been used")
        
        return {"valid": True, "email": reset_record.email}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in verify_reset_token_endpoint: {e}")
        raise HTTPException(status_code=500, detail="An error occurred. Please try again later.")

@router.post("/reset-password")
async def reset_password_endpoint(
    request: Request,
    db: AsyncSession = Depends(get_session),
    user_manager: BaseUserManager[User, int] = Depends(get_user_manager),
):
    """
    Reset password using reset token
    
    Completes the password reset process by setting a new password.
    Validates the reset token, then hashes and updates the user's password.
    
    Flow:
    1. Validates token and new password
    2. Checks token is valid, not expired, and not used
    3. Validates password meets minimum length (8 characters)
    4. Hashes new password
    5. Updates user password
    6. Marks token as used
    
    Args:
        request: FastAPI Request object (contains token and password in JSON body)
        db: Database session (from dependency injection)
        user_manager: FastAPI Users user manager (from dependency injection)
    
    Returns:
        dict: Success message
    
    Raises:
        HTTPException:
            - 400 if token/password missing, token invalid/expired/used, or password too short
            - 500 if password reset fails
    """
    try:
        data = await request.json()
        token = data.get("token", "").strip()
        new_password = data.get("password", "").strip()
        
        if not token:
            raise HTTPException(status_code=400, detail="Token is required")
        
        if not new_password:
            raise HTTPException(status_code=400, detail="Password is required")
        
        if len(new_password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
        
        # Find reset record
        result = await db.execute(
            select(PasswordReset).where(PasswordReset.reset_token == token)
        )
        reset_record = result.scalar_one_or_none()
        
        if not reset_record:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
        # Check if token is expired
        if reset_record.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Reset token has expired")
        
        # Check if token has already been used
        if reset_record.used_at:
            raise HTTPException(status_code=400, detail="Reset token has already been used")
        
        # Get user
        user_result = await db.execute(select(User).where(User.user_id == reset_record.user_id))
        user = user_result.scalar_one_or_none()
        
        if not user or not user.is_active:
            raise HTTPException(status_code=400, detail="User account not found or inactive")
        
        # Hash and update password
        hashed_password = user_manager.password_helper.hash(new_password)
        user.hashed_password = hashed_password
        await db.commit()
        
        # Mark token as used
        reset_record.used_at = datetime.now(timezone.utc)
        await db.commit()
        
        logger.info(f"✅ Password reset successful for user: {user.email}")
        
        return {"message": "Password has been reset successfully. You can now log in with your new password."}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in reset_password_endpoint: {e}")
        raise HTTPException(status_code=500, detail="An error occurred. Please try again later.")

@router.get("/me")
async def get_me(user: User = Depends(get_current_user_flexible)):
    """
    Get current user information
    
    Returns basic information about the currently authenticated user.
    Useful for checking authentication status and user details.
    
    Args:
        user: Authenticated user (from dependency injection)
    
    Returns:
        dict: User information:
            - user_id: User ID
            - email: User email
            - role: User role (parent/professional)
            - is_verified: Email verification status
            - is_active: Account active status
    """
    logger.info(f"User authenticated: {user.email} (ID: {user.user_id})")
    return {
        "user_id": user.user_id,
        "email": user.email,
        "role": user.role,
        "is_verified": user.is_verified,
        "is_active": user.is_active
    }

@router.get("/debug-auth")
async def debug_auth(user: User = Depends(get_current_user_flexible)):
    """
    Debug endpoint to check authentication status
    
    Utility endpoint for debugging authentication.
    Returns detailed authentication status information.
    
    Args:
        user: Authenticated user (from dependency injection)
    
    Returns:
        dict: Authentication status and user details
    """
    logger.info("=== DEBUG AUTH ENDPOINT ===")
    logger.info(f"User found: {user.email} (ID: {user.user_id})")
    return {
        "status": "authenticated",
        "user_id": user.user_id,
        "email": user.email
    }

# ============================================================================
# Account Management Endpoints
# ============================================================================

@router.post("/change-password")
async def change_password(
    request: Request,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session),
    user_manager: BaseUserManager[User, int] = Depends(get_user_manager)
):
    """
    Change user password
    
    Allows authenticated users to change their password.
    Requires verification of current password before setting new one.
    
    Flow:
    1. Validates current and new passwords are provided
    2. Checks password length (minimum 8 characters)
    3. Verifies current password
    4. Hashes and updates to new password
    
    Args:
        request: FastAPI Request object (contains current_password and new_password in JSON body)
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
        user_manager: FastAPI Users user manager (from dependency injection)
    
    Returns:
        dict: Success message
    
    Raises:
        HTTPException:
            - 400 if passwords missing, current password incorrect, or new password too short
            - 403 if user role doesn't allow password change
            - 500 if password change fails
    """
    # Only allow parent and professional users
    if user.role not in ['parent', 'professional']:
        raise HTTPException(status_code=403, detail="Password change is only available for parent and professional users")
    
    # Check if user has password (not Google OAuth)
    if not user.hashed_password:
        raise HTTPException(status_code=400, detail="This account was created with Google sign-in. Password change is not available for Google accounts.")
    
    data = await request.json()
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")
    
    if not current_password:
        raise HTTPException(status_code=400, detail="Current password is required")
    
    if not new_password:
        raise HTTPException(status_code=400, detail="New password is required")
    
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long")
    
    # Verify current password
    try:
        valid, _ = user_manager.password_helper.verify_and_update(
            current_password, user.hashed_password
        )
        if not valid:
            raise HTTPException(status_code=400, detail="Current password is incorrect")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Hash and update password
    try:
        # Re-fetch user from the current session to ensure it's tracked
        result = await db.execute(select(User).where(User.user_id == user.user_id))
        db_user = result.scalar_one_or_none()
        
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Hash new password
        hashed_password = user_manager.password_helper.hash(new_password)
        
        # Update password in database
        db_user.hashed_password = hashed_password
        
        # Commit the changes
        await db.commit()
        
        # Refresh the user object to ensure it's updated
        await db.refresh(db_user)
        
        logger.info(f"✅ Password changed successfully for user: {user.email}")
        
        return {
            "message": "Password changed successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to change password: {str(e)}")

