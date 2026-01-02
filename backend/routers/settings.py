# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: settings.py
# Description: To handle user notification preference settings endpoints
# First Written on: Sunday, 05-Oct-2025
# Edited on: Sunday, 10-Dec-2025

"""
Settings router - Handles user notification preferences

This router provides endpoints for users to manage their notification preferences,
including in-app notifications and email notifications.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from dependencies import get_current_user_flexible, get_session
from models.database import User, UserNotificationPreference
from config import logger

# Initialize router with prefix and tags for API documentation
router = APIRouter(prefix="/settings", tags=["settings"])

# ============================================================================
# Request/Response Schemas
# ============================================================================

class NotificationPreferencesOut(BaseModel):
    """
    Notification preferences output schema
    
    Returned when reading notification preferences.
    """
    in_app_notifications: bool  # Whether in-app notifications are enabled
    email_notifications: bool  # Whether email notifications are enabled

class NotificationPreferencesUpdate(BaseModel):
    """
    Notification preferences update schema
    
    Used when updating preferences. All fields are optional to allow partial updates.
    """
    in_app_notifications: Optional[bool] = None  # New in-app notification preference
    email_notifications: Optional[bool] = None  # New email notification preference

# ============================================================================
# Notification Preferences Endpoints
# ============================================================================

@router.get("/notifications", response_model=NotificationPreferencesOut)
async def get_notification_preferences(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Get current user's notification preferences
    
    Returns the user's notification preferences. If no preferences exist,
    creates default preferences with both in-app and email notifications enabled.
    
    Args:
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        NotificationPreferencesOut: User's notification preferences
    
    Raises:
        HTTPException: If an error occurs while fetching preferences
    """
    try:
        # Query database for existing notification preferences
        result = await db.execute(
            select(UserNotificationPreference).where(UserNotificationPreference.user_id == user.user_id)
        )
        preferences = result.scalar_one_or_none()
        
        # If no preferences exist, create default ones (both enabled)
        # This ensures all users have preferences even if they were created before preferences were added
        if not preferences:
            preferences = UserNotificationPreference(
                user_id=user.user_id,
                in_app_notifications=True,  # Default: enabled
                email_notifications=True  # Default: enabled
            )
            db.add(preferences)
            await db.commit()
            await db.refresh(preferences)
        
        # Return preferences in the response schema format
        return NotificationPreferencesOut(
            in_app_notifications=preferences.in_app_notifications,
            email_notifications=preferences.email_notifications
        )
    except Exception as e:
        logger.error(f"Error getting notification preferences: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get notification preferences: {str(e)}")

@router.put("/notifications", response_model=NotificationPreferencesOut)
async def update_notification_preferences(
    preferences_update: NotificationPreferencesUpdate,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Update current user's notification preferences
    
    Updates the user's notification preferences. Supports partial updates
    (only update fields that are provided). If preferences don't exist,
    creates them with the provided values or defaults.
    
    Args:
        preferences_update: Update data (partial update supported)
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        NotificationPreferencesOut: Updated notification preferences
    
    Raises:
        HTTPException: If an error occurs while updating preferences
    """
    try:
        # Get existing preferences from database
        result = await db.execute(
            select(UserNotificationPreference).where(UserNotificationPreference.user_id == user.user_id)
        )
        preferences = result.scalar_one_or_none()
        
        if not preferences:
            # Create new preferences with provided values or defaults
            # If a value is not provided (None), default to True (enabled)
            preferences = UserNotificationPreference(
                user_id=user.user_id,
                in_app_notifications=preferences_update.in_app_notifications if preferences_update.in_app_notifications is not None else True,
                email_notifications=preferences_update.email_notifications if preferences_update.email_notifications is not None else True
            )
            db.add(preferences)
        else:
            # Update existing preferences (partial update)
            # Only update fields that are explicitly provided (not None)
            if preferences_update.in_app_notifications is not None:
                preferences.in_app_notifications = preferences_update.in_app_notifications
            if preferences_update.email_notifications is not None:
                preferences.email_notifications = preferences_update.email_notifications
        
        # Commit changes to database
        await db.commit()
        await db.refresh(preferences)
        
        # Return updated preferences
        return NotificationPreferencesOut(
            in_app_notifications=preferences.in_app_notifications,
            email_notifications=preferences.email_notifications
        )
    except Exception as e:
        logger.error(f"Error updating notification preferences: {e}")
        await db.rollback()  # Rollback on error
        raise HTTPException(status_code=500, detail=f"Failed to update notification preferences: {str(e)}")

