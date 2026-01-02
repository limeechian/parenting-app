# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: notifications.py
# Description: To provide helper functions for creating and managing user notifications
# First Written on: Sunday, 05-Oct-2025
# Edited on: Sunday, 10-Dec-2025

"""
Notification helper functions

This module provides helper functions for creating and managing notifications.
Notifications are used to alert users about various events such as:
- Post likes and comments
- Message receipts
- Profile approvals/rejections
- Community activities

All notification creation functions respect user notification preferences.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional
from datetime import datetime

from models.database import (
    Notification, User, CommunityPost, CommunityPostComment, Community,
    CommunityMember, ParentProfile, ProfessionalProfile, PromotionalMaterial,
    UserNotificationPreference
)
from config import logger


async def get_user_name(db: AsyncSession, user_id: int) -> str:
    """Get user's display name"""
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


async def get_user_notification_preferences(db: AsyncSession, user_id: int) -> tuple[bool, bool]:
    """Get user's notification preferences. Returns (in_app_notifications, email_notifications). Defaults to (True, True) if no preferences exist."""
    try:
        result = await db.execute(
            select(UserNotificationPreference).where(UserNotificationPreference.user_id == user_id)
        )
        preferences = result.scalar_one_or_none()
        
        if preferences:
            return (preferences.in_app_notifications, preferences.email_notifications)
        else:
            # Default to both enabled if no preferences exist
            return (True, True)
    except Exception as e:
        logger.error(f"Error getting notification preferences for user {user_id}: {e}")
        # Default to both enabled on error
        return (True, True)

async def create_notification(
    db: AsyncSession,
    recipient_id: int,
    notification_type: str,
    actor_id: Optional[int] = None,
    related_post_id: Optional[int] = None,
    related_comment_id: Optional[int] = None,
    related_community_id: Optional[int] = None,
    related_message_id: Optional[int] = None,
    related_profile_id: Optional[int] = None,
    related_material_id: Optional[int] = None,
    related_report_id: Optional[int] = None,
    title: Optional[str] = None,
    content: Optional[str] = None,
    notification_metadata: Optional[dict] = None,
    send_sse: bool = True
) -> Notification:
    """Create a notification"""
    # Don't notify yourself
    if actor_id and actor_id == recipient_id:
        return None
    
    # Check user's notification preferences
    in_app_enabled, email_enabled = await get_user_notification_preferences(db, recipient_id)
    
    # If in-app notifications are disabled, don't create the notification at all
    # (or create it but don't send SSE - we'll create it but skip SSE)
    # Actually, let's still create it in the database but skip SSE if disabled
    # This way users can still see historical notifications if they re-enable
    
    # If in-app notifications are disabled, skip SSE sending
    if not in_app_enabled:
        send_sse = False
    
    # Check for duplicate notification (same type, same actors, same related entities, within last hour)
    # This prevents spam notifications
    one_hour_ago = datetime.now().replace(microsecond=0)
    duplicate_check = await db.execute(
        select(Notification).where(
            and_(
                Notification.user_id == recipient_id,
                Notification.notification_type == notification_type,
                Notification.actor_id == actor_id,
                Notification.related_post_id == related_post_id,
                Notification.related_comment_id == related_comment_id,
                Notification.related_community_id == related_community_id,
                Notification.related_message_id == related_message_id,
                Notification.related_profile_id == related_profile_id,
                Notification.related_material_id == related_material_id,
                Notification.related_report_id == related_report_id,
                Notification.created_at >= one_hour_ago
            )
        )
    )
    if duplicate_check.scalar_one_or_none():
        # Duplicate found, skip creation
        return None
    
    notification = Notification(
        user_id=recipient_id,
        notification_type=notification_type,
        actor_id=actor_id,
        related_post_id=related_post_id,
        related_comment_id=related_comment_id,
        related_community_id=related_community_id,
        related_message_id=related_message_id,
        related_profile_id=related_profile_id,
        related_material_id=related_material_id,
        related_report_id=related_report_id,
        title=title,
        content=content,
        notification_metadata=notification_metadata or {},
        is_read=False
    )
    db.add(notification)
    await db.flush()
    
    # Send notification via SSE if enabled
    if send_sse:
        try:
            from utils.sse_manager import sse_manager
            # Get actor name for SSE payload
            actor_name = None
            if actor_id:
                actor_name = await get_user_name(db, actor_id)
            
            # Prepare notification data for SSE
            notification_data = {
                "type": "new_notification",
                "notification": {
                    "notification_id": notification.notification_id,
                    "notification_type": notification.notification_type,
                    "title": notification.title or "",
                    "content": notification.content or "",
                    "actor_name": actor_name,
                    "related_post_id": notification.related_post_id,
                    "related_comment_id": notification.related_comment_id,
                    "related_community_id": notification.related_community_id,
                    "related_message_id": notification.related_message_id,
                    "related_profile_id": notification.related_profile_id,
                    "related_material_id": notification.related_material_id,
                    "related_report_id": notification.related_report_id,
                    "created_at": notification.created_at.isoformat() if notification.created_at else None,
                    "is_read": notification.is_read
                },
                "unread_count": None  # Will be calculated by frontend or separate endpoint
            }
            
            # Send via SSE (non-blocking)
            await sse_manager.send_notification(recipient_id, notification_data)
        except Exception as e:
            # Log error but don't fail notification creation
            logger.error(f"Error sending notification via SSE: {e}")
    
    return notification


async def create_post_liked_notification(
    db: AsyncSession,
    post_id: int,
    actor_id: int
) -> Optional[Notification]:
    """Create notification when someone likes a post"""
    post = await db.get(CommunityPost, post_id)
    if not post:
        return None
    
    # Don't notify if user liked their own post
    if post.author_user_id == actor_id:
        return None
    
    actor_name = await get_user_name(db, actor_id)
    title = f"{actor_name} liked your post"
    content = post.title or "Your post"
    
    return await create_notification(
        db=db,
        recipient_id=post.author_user_id,
        notification_type='post_liked',
        actor_id=actor_id,
        related_post_id=post_id,
        related_community_id=post.community_id,
        title=title,
        content=content,
        notification_metadata={"actor_name": actor_name, "post_title": post.title or ""}
    )


async def create_post_commented_notification(
    db: AsyncSession,
    post_id: int,
    comment_id: int,
    actor_id: int,
    comment_body: str
) -> Optional[Notification]:
    """Create notification when someone comments on a post"""
    post = await db.get(CommunityPost, post_id)
    if not post:
        return None
    
    # Don't notify if user commented on their own post
    if post.author_user_id == actor_id:
        return None
    
    actor_name = await get_user_name(db, actor_id)
    title = f"{actor_name} commented on your post"
    content = comment_body[:200]  # Truncate to 200 chars
    
    return await create_notification(
        db=db,
        recipient_id=post.author_user_id,
        notification_type='post_commented',
        actor_id=actor_id,
        related_post_id=post_id,
        related_comment_id=comment_id,
        related_community_id=post.community_id,
        title=title,
        content=content,
        notification_metadata={"actor_name": actor_name, "comment_preview": comment_body[:100], "post_title": post.title or ""}
    )


async def create_comment_replied_notification(
    db: AsyncSession,
    post_id: int,
    comment_id: int,
    parent_comment_id: int,
    actor_id: int,
    reply_body: str
) -> Optional[Notification]:
    """Create notification when someone replies to a comment"""
    parent_comment = await db.get(CommunityPostComment, parent_comment_id)
    if not parent_comment:
        return None
    
    # Don't notify if user replied to their own comment
    if parent_comment.author_user_id == actor_id:
        return None
    
    post = await db.get(CommunityPost, post_id)
    actor_name = await get_user_name(db, actor_id)
    title = f"{actor_name} replied to your comment"
    content = reply_body[:200]  # Truncate to 200 chars
    
    return await create_notification(
        db=db,
        recipient_id=parent_comment.author_user_id,
        notification_type='comment_replied',
        actor_id=actor_id,
        related_post_id=post_id,
        related_comment_id=comment_id,
        related_community_id=post.community_id if post else None,
        title=title,
        content=content,
        notification_metadata={"actor_name": actor_name, "reply_preview": reply_body[:100]}
    )


async def create_comment_liked_notification(
    db: AsyncSession,
    comment_id: int,
    actor_id: int
) -> Optional[Notification]:
    """Create notification when someone likes a comment"""
    comment = await db.get(CommunityPostComment, comment_id)
    if not comment:
        return None
    
    # Don't notify if user liked their own comment
    if comment.author_user_id == actor_id:
        return None
    
    actor_name = await get_user_name(db, actor_id)
    title = f"{actor_name} liked your comment"
    content = comment.body[:200] if comment.body else "Your comment"
    
    post = await db.get(CommunityPost, comment.post_id)
    
    return await create_notification(
        db=db,
        recipient_id=comment.author_user_id,
        notification_type='comment_liked',
        actor_id=actor_id,
        related_post_id=comment.post_id,
        related_comment_id=comment_id,
        related_community_id=post.community_id if post else None,
        title=title,
        content=content,
        notification_metadata={"actor_name": actor_name, "comment_preview": comment.body[:100] if comment.body else ""}
    )


async def create_community_joined_notification(
    db: AsyncSession,
    community_id: int,
    actor_id: int
) -> list[Notification]:
    """Create notifications for community owners/moderators when someone joins"""
    community = await db.get(Community, community_id)
    if not community:
        logger.warning(f"Community {community_id} not found for community_joined notification")
        return []
    
    # Get all owners and moderators
    members_result = await db.execute(
        select(CommunityMember).where(
            and_(
                CommunityMember.community_id == community_id,
                CommunityMember.status == 'active',
                CommunityMember.role.in_(['owner', 'moderator'])
            )
        )
    )
    owners_moderators = members_result.scalars().all()
    
    if not owners_moderators:
        logger.warning(f"No owners/moderators found for community {community_id} (created_by: {community.created_by})")
        return []
    
    actor_name = await get_user_name(db, actor_id)
    title = f"{actor_name} joined your community"
    content = community.name or "Your community"
    
    notifications = []
    for member in owners_moderators:
        # Don't notify if the joiner is an owner/moderator themselves
        if member.user_id == actor_id:
            logger.info(f"Skipping notification for user {actor_id} - they are an owner/moderator themselves")
            continue
        
        notification = await create_notification(
            db=db,
            recipient_id=member.user_id,
            notification_type='community_joined',
            actor_id=actor_id,
            related_community_id=community_id,
            title=title,
            content=content,
            notification_metadata={"actor_name": actor_name, "community_name": community.name or ""}
        )
        if notification:
            notifications.append(notification)
            logger.info(f"Created community_joined notification for user {member.user_id} (role: {member.role})")
        else:
            logger.warning(f"Failed to create notification for user {member.user_id} - duplicate or self-notification")
    
    return notifications


async def create_message_received_notification(
    db: AsyncSession,
    message_id: int,
    sender_id: int,
    recipient_id: int,
    message_content: str
) -> Optional[Notification]:
    """Create notification when someone sends you a message"""
    # Don't notify if user sent message to themselves
    if sender_id == recipient_id:
        return None
    
    actor_name = await get_user_name(db, sender_id)
    title = f"{actor_name} sent you a message"
    content = message_content[:200] if message_content else "📎 Attachment"
    
    return await create_notification(
        db=db,
        recipient_id=recipient_id,
        notification_type='message_received',
        actor_id=sender_id,
        related_message_id=message_id,
        title=title,
        content=content,
        notification_metadata={"actor_name": actor_name, "message_preview": message_content[:100] if message_content else "Attachment"}
    )


async def create_message_reacted_notification(
    db: AsyncSession,
    message_id: int,
    message_sender_id: int,
    reactor_id: int,
    reaction_type: str
) -> Optional[Notification]:
    """Create notification when someone reacts to your message"""
    # Don't notify if user reacted to their own message
    if message_sender_id == reactor_id:
        return None
    
    reactor_name = await get_user_name(db, reactor_id)
    
    # Map reaction types to emojis for display
    reaction_emojis = {
        'like': '👍',
        'love': '❤️',
        'laugh': '😂',
        'support': '🤗',
        'helpful': '✅'
    }
    emoji = reaction_emojis.get(reaction_type, '👍')
    
    title = f"{reactor_name} reacted {emoji} to your message"
    content = "Your message"
    
    return await create_notification(
        db=db,
        recipient_id=message_sender_id,
        notification_type='message_reacted',
        actor_id=reactor_id,
        related_message_id=message_id,
        title=title,
        content=content,
        notification_metadata={"actor_name": reactor_name, "reaction_type": reaction_type, "reaction_emoji": emoji}
    )


async def create_professional_profile_submission_notifications(
    db: AsyncSession,
    profile_id: int,
    business_name: str,
    is_resubmission: bool = False
) -> list[Notification]:
    """Create notifications for all coordinators when a professional submits their profile"""
    # Get all coordinator users
    coordinators_result = await db.execute(
        select(User).where(User.role == 'coordinator')
    )
    coordinators = coordinators_result.scalars().all()
    
    if not coordinators:
        logger.warning("No coordinators found to notify about profile submission")
        return []
    
    # Determine title and content based on whether it's a new submission or resubmission
    if is_resubmission:
        title = "Updated Professional Profile Submission"
        content = f"{business_name} has resubmitted their profile for review"
    else:
        title = "New Professional Profile Submission"
        content = f"{business_name} has submitted their profile for review"
    
    notifications = []
    for coordinator in coordinators:
        notification = await create_notification(
            db=db,
            recipient_id=coordinator.user_id,
            notification_type='professional_profile_submission',
            actor_id=None,  # System notification
            related_profile_id=profile_id,
            title=title,
            content=content,
            notification_metadata={
                "business_name": business_name
            }
        )
        if notification:
            notifications.append(notification)
            logger.info(f"Created professional_profile_submission notification for coordinator {coordinator.user_id}")
    
    return notifications


async def create_promotional_material_submission_notifications(
    db: AsyncSession,
    material_id: int,
    title: str,
    business_name: str,
    profile_id: int,
    is_update: bool = False
) -> list[Notification]:
    """Create notifications for all coordinators when a professional submits promotional material"""
    # Get all coordinator users
    coordinators_result = await db.execute(
        select(User).where(User.role == 'coordinator')
    )
    coordinators = coordinators_result.scalars().all()
    
    if not coordinators:
        logger.warning("No coordinators found to notify about promotional material submission")
        return []
    
    # Determine title and content based on whether it's a new submission or update
    if is_update:
        notification_title = "Updated Promotional Material Submission"
        notification_content = f"{business_name} has updated a promotional material: {title}"
    else:
        notification_title = "New Promotional Material Submission"
        notification_content = f"{business_name} has submitted a promotional material: {title}"
    
    notifications = []
    for coordinator in coordinators:
        notification = await create_notification(
            db=db,
            recipient_id=coordinator.user_id,
            notification_type='promotional_material_submission',
            actor_id=None,  # System notification
            related_material_id=material_id,
            related_profile_id=profile_id,
            title=notification_title,
            content=notification_content,
            notification_metadata={
                "title": title,
                "business_name": business_name
            }
        )
        if notification:
            notifications.append(notification)
            logger.info(f"Created promotional_material_submission notification for coordinator {coordinator.user_id}")
    
    return notifications


async def create_report_created_notifications(
    db: AsyncSession,
    report_id: int,
    report_type: str,
    reporter_id: int,
    reason: str
) -> list[Notification]:
    """Create notifications for all content managers when a parent user submits a report"""
    from models.database import Report
    
    # Get all content_manager users
    content_managers_result = await db.execute(
        select(User).where(User.role == 'content_manager')
    )
    content_managers = content_managers_result.scalars().all()
    
    if not content_managers:
        logger.warning("No content managers found to notify about report submission")
        return []
    
    # Get reporter name
    reporter_name = await get_user_name(db, reporter_id)
    
    # Get report details for notification content
    report = await db.get(Report, report_id)
    if not report:
        logger.error(f"Report {report_id} not found when creating notifications")
        return []
    
    # Create notification title and content based on report type
    report_type_labels = {
        'post': 'Post',
        'comment': 'Comment',
        'community': 'Community',
        'user': 'User'
    }
    report_type_label = report_type_labels.get(report_type, report_type.capitalize())
    
    title = f"New {report_type_label} Report"
    content = f"{reporter_name} reported a {report_type_label.lower()} for: {reason}"
    
    notifications = []
    for content_manager in content_managers:
        notification = await create_notification(
            db=db,
            recipient_id=content_manager.user_id,
            notification_type='report_created',
            actor_id=reporter_id,
            related_report_id=report_id,
            title=title,
            content=content,
            notification_metadata={
                "report_type": report_type,
                "reason": reason,
                "reporter_name": reporter_name
            }
        )
        if notification:
            notifications.append(notification)
            logger.info(f"Created report_created notification for content manager {content_manager.user_id}")
    
    return notifications


async def create_profile_approval_notification(
    db: AsyncSession,
    profile: ProfessionalProfile,
    coordinator_id: int
) -> Optional[Notification]:
    """Create notification when coordinator approves a professional profile"""
    title = "Professional Profile Approved"
    content = f"Congratulations! Your professional profile '{profile.business_name}' has been approved and is now visible in the directory."
    
    return await create_notification(
        db=db,
        recipient_id=profile.user_id,
        notification_type='approval',
        actor_id=coordinator_id,
        related_profile_id=profile.professional_id,
        title=title,
        content=content,
        notification_metadata={
            "business_name": profile.business_name
        }
    )


async def create_profile_rejection_notification(
    db: AsyncSession,
    profile: ProfessionalProfile,
    coordinator_id: int,
    rejection_reason: str
) -> Optional[Notification]:
    """Create notification when coordinator rejects a professional profile"""
    title = "Professional Profile Requires Updates"
    content = f"Your professional profile '{profile.business_name}' needs additional information. Reason: {rejection_reason}"
    
    return await create_notification(
        db=db,
        recipient_id=profile.user_id,
        notification_type='rejection',
        actor_id=coordinator_id,
        related_profile_id=profile.professional_id,
        title=title,
        content=content,
        notification_metadata={
            "business_name": profile.business_name,
            "rejection_reason": rejection_reason
        }
    )


async def create_promotion_approval_notification(
    db: AsyncSession,
    material: PromotionalMaterial,
    coordinator_id: int,
    display_start_date: str,
    display_end_date: str
) -> Optional[Notification]:
    """Create notification when coordinator approves a promotional material"""
    # Get professional profile to get user_id
    profile_result = await db.execute(
        select(ProfessionalProfile).where(ProfessionalProfile.professional_id == material.profile_id)
    )
    profile = profile_result.scalar_one_or_none()
    
    if not profile:
        logger.warning(f"Profile {material.profile_id} not found for promotion approval notification")
        return None
    
    title = "Promotional Material Approved"
    content = f"Your promotional material '{material.title}' has been approved and will be displayed from {display_start_date} to {display_end_date}."
    
    return await create_notification(
        db=db,
        recipient_id=profile.user_id,
        notification_type='promotion_approved',
        actor_id=coordinator_id,
        related_material_id=material.material_id,
        related_profile_id=material.profile_id,
        title=title,
        content=content,
        notification_metadata={
            "title": material.title,
            "display_start_date": display_start_date,
            "display_end_date": display_end_date
        }
    )


async def create_promotion_rejection_notification(
    db: AsyncSession,
    material: PromotionalMaterial,
    coordinator_id: int,
    rejection_reason: str
) -> Optional[Notification]:
    """Create notification when coordinator rejects a promotional material"""
    # Get professional profile to get user_id
    profile_result = await db.execute(
        select(ProfessionalProfile).where(ProfessionalProfile.professional_id == material.profile_id)
    )
    profile = profile_result.scalar_one_or_none()
    
    if not profile:
        logger.warning(f"Profile {material.profile_id} not found for promotion rejection notification")
        return None
    
    title = "Promotional Material Rejected"
    content = f"Your promotional material '{material.title}' was not approved. Reason: {rejection_reason}"
    
    return await create_notification(
        db=db,
        recipient_id=profile.user_id,
        notification_type='promotion_rejected',
        actor_id=coordinator_id,
        related_material_id=material.material_id,
        related_profile_id=material.profile_id,
        title=title,
        content=content,
        notification_metadata={
            "title": material.title,
            "rejection_reason": rejection_reason
        }
    )

