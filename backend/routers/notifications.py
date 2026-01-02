# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: notifications.py
# Description: To handle notification endpoints for retrieving and managing user notifications
# First Written on: Sunday, 05-Oct-2025
# Edited on: Sunday, 10-Dec-2025

"""
Notifications router - Handles notification retrieval and management

This router provides endpoints for:
- Retrieving user notifications (all, unread, filtered by type)
- Getting unread notification count
- Marking notifications as read
- Server-Sent Events (SSE) stream for real-time notifications
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import Optional, List
from datetime import datetime
import json

from dependencies import get_current_user_flexible, get_session
from models.database import Notification, User, ParentProfile
from schemas.schemas import NotificationOut
from config import logger
from utils.sse_manager import sse_manager

# Initialize router with prefix and tags for API documentation
router = APIRouter(prefix="/notifications", tags=["notifications"])

# ============================================================================
# Helper Functions
# ============================================================================

async def get_user_name(db: AsyncSession, user_id: int) -> str:
    """
    Get user's display name for notifications
    
    Attempts to get the user's full name from their parent profile.
    Falls back to email username if no profile exists.
    
    Args:
        db: Database session
        user_id: User ID to get name for
    
    Returns:
        str: User's display name
    """
    user = await db.get(User, user_id)
    if not user:
        return "Unknown User"
    
    profile_result = await db.execute(
        select(ParentProfile).where(ParentProfile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()
    
    if profile:
        name = f"{profile.first_name or ''} {profile.last_name or ''}".strip()
        if name:
            return name
    
    return user.email.split('@')[0] if user.email else "Unknown User"


# ============================================================================
# Notification Endpoints
# ============================================================================

@router.get("", response_model=List[NotificationOut])
async def get_notifications(
    filter_type: Optional[str] = Query(None, alias="filter"),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Get all notifications for current user
    
    Retrieves notifications for the authenticated user with optional filtering:
    - 'unread': Only unread notifications
    - Specific notification type: Filter by type (e.g., 'post_liked', 'message_received')
    - 'all' or None: All notifications
    
    Args:
        filter_type: Optional filter type ('unread', notification type, or 'all')
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        List[NotificationOut]: List of notifications, ordered by creation date (newest first)
    
    Raises:
        HTTPException: If user is not authenticated or an error occurs
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Start with base query for user's notifications
        query = select(Notification).where(Notification.user_id == user.user_id)
        
        # Apply filters based on filter_type parameter
        if filter_type == 'unread':
            # Only show unread notifications
            query = query.where(Notification.is_read == False)
        elif filter_type and filter_type != 'all':
            # Filter by specific notification type (e.g., 'post_liked', 'message_received')
            query = query.where(Notification.notification_type == filter_type)
        # If filter_type is 'all' or None, show all notifications (no additional filter)
        
        # Order by creation date (newest first)
        query = query.order_by(Notification.created_at.desc())
        
        # Execute query and get all results
        result = await db.execute(query)
        notifications = result.scalars().all()
        
        # Build response with actor names
        response = []
        for notif in notifications:
            # Get actor name if notification has an actor
            actor_name = None
            if notif.actor_id:
                actor_name = await get_user_name(db, notif.actor_id)
            
            # Convert notification to output schema
            response.append(NotificationOut(
                notification_id=notif.notification_id,
                notification_type=notif.notification_type,
                title=notif.title or "",
                content=notif.content or "",
                actor_name=actor_name,
                related_post_id=notif.related_post_id,
                related_comment_id=notif.related_comment_id,
                related_community_id=notif.related_community_id,
                related_message_id=notif.related_message_id,
                created_at=notif.created_at.isoformat() if notif.created_at else None,
                is_read=notif.is_read
            ))
        
        return response
    except Exception as e:
        logger.error(f"Error getting notifications: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get notifications: {str(e)}")


@router.get("/unread/count")
async def get_unread_count(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get unread notification count"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        result = await db.execute(
            select(func.count(Notification.notification_id)).where(
                and_(
                    Notification.user_id == user.user_id,
                    Notification.is_read == False
                )
            )
        )
        count = result.scalar_one()
        return {"unread_count": count or 0}
    except Exception as e:
        logger.error(f"Error getting unread count: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get unread count: {str(e)}")


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Mark a notification as read"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        notification = await db.get(Notification, notification_id)
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        if notification.user_id != user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this notification")
        
        notification.is_read = True
        notification.read_at = datetime.now()
        await db.commit()
        
        return {"message": "Notification marked as read", "success": True}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error marking notification as read: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to mark notification as read: {str(e)}")


@router.put("/{notification_id}/unread")
async def mark_notification_unread(
    notification_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Mark a notification as unread"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        notification = await db.get(Notification, notification_id)
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        if notification.user_id != user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this notification")
        
        notification.is_read = False
        notification.read_at = None
        await db.commit()
        
        return {"message": "Notification marked as unread", "success": True}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error marking notification as unread: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to mark notification as unread: {str(e)}")


@router.put("/read-all")
async def mark_all_notifications_read(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Mark all notifications as read"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        result = await db.execute(
            select(Notification).where(
                and_(
                    Notification.user_id == user.user_id,
                    Notification.is_read == False
                )
            )
        )
        notifications = result.scalars().all()
        
        now = datetime.now()
        for notification in notifications:
            notification.is_read = True
            notification.read_at = now
        
        await db.commit()
        
        return {"message": f"Marked {len(notifications)} notifications as read", "success": True}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error marking all notifications as read: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to mark all notifications as read: {str(e)}")


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Delete a single notification"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        notification = await db.get(Notification, notification_id)
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        if notification.user_id != user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this notification")
        
        await db.delete(notification)
        await db.commit()
        
        return {"message": "Notification deleted", "success": True}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting notification: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete notification: {str(e)}")


@router.delete("/all")
async def delete_all_notifications(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Delete all notifications for current user"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        result = await db.execute(
            select(Notification).where(Notification.user_id == user.user_id)
        )
        notifications = result.scalars().all()
        
        count = len(notifications)
        for notification in notifications:
            await db.delete(notification)
        
        await db.commit()
        
        return {"message": f"Deleted {count} notification(s)", "success": True, "deleted_count": count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting all notifications: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete all notifications: {str(e)}")


@router.get("/stream")
async def stream_notifications(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Server-Sent Events (SSE) endpoint for real-time notifications
    
    Note: EventSource doesn't support custom headers, so authentication
    is handled via cookie or token in query parameter (get_current_user_flexible handles both)
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    logger.info(f"🔵 SSE: Connection request from user {user.user_id} ({user.email})")
    
    async def event_generator():
        """Generate SSE events for the connected user"""
        try:
            logger.info(f"🔵 SSE: Starting event generator for user {user.user_id}")
            
            # Get initial unread count to send on connection
            result = await db.execute(
                select(func.count(Notification.notification_id)).where(
                    and_(
                        Notification.user_id == user.user_id,
                        Notification.is_read == False
                    )
                )
            )
            initial_unread_count = result.scalar() or 0
            
            logger.info(f"🔵 SSE: Sending initial connection message with unread_count={initial_unread_count} to user {user.user_id}")
            
            # Send initial connection message with unread count
            yield f"data: {json.dumps({'type': 'connected', 'unread_count': initial_unread_count, 'timestamp': datetime.now().isoformat()})}\n\n"
            
            # Stream events from SSE manager
            async for event in sse_manager.event_generator(user.user_id):
                yield event
        except Exception as e:
            logger.error(f"🔵 SSE: Error in event generator for user {user.user_id}: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Connection error'})}\n\n"
    
    # Get origin from request for CORS
    from fastapi import Request
    from config import CORS_ORIGINS
    
    # Note: We can't access request here directly, so we'll set CORS headers in middleware
    # But we'll add explicit headers here too
    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",  # Disable buffering for nginx
        "Content-Type": "text/event-stream",
        "Access-Control-Allow-Origin": CORS_ORIGINS[0] if CORS_ORIGINS else "*",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "Cache-Control",
    }
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=headers
    )

