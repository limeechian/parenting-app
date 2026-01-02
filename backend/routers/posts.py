# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: posts.py
# Description: To handle community post endpoints including CRUD operations, comments, reactions, and reporting
# First Written on: Friday, 03-Oct-2025
# Edited on: Sunday, 10-Dec-2025

"""
Posts router - Handles posts, comments, reactions, preferences, and reports

This router provides endpoints for:
- Community posts (CRUD operations, search, filtering)
- Post comments (create, nested replies, reactions)
- Post reactions (like/unlike)
- Post management (save, pin/unpin)
- User activity tracking (my posts, my comments, saved posts)
- Post image uploads
- Content reporting (create, view, resolve reports)

All endpoints require authentication and enforce community membership
and ownership rules.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, text
from typing import Optional, List
from datetime import datetime
from pathlib import Path
import uuid
from pydantic import BaseModel

from dependencies import get_current_user_flexible, get_session
from models.database import (
    User, Community, CommunityMember, CommunityPost, CommunityPostAttachment,
    CommunityPostComment, CommunityPostReaction, CommunityPostCommentReaction,
    SavedPost, Report, ParentProfile
)
from schemas.schemas import (
    CommunityPostIn, CommunityPostOut, CommunityPostCommentIn, CommunityPostCommentOut,
    ReportIn, ReportOut
)
from config import logger, supabase, POST_IMAGES_BUCKET
from utils.notifications import (
    create_post_liked_notification,
    create_post_commented_notification,
    create_comment_replied_notification,
    create_comment_liked_notification,
    create_report_created_notifications
)

# Initialize router with prefix and tags for API documentation
router = APIRouter(prefix="/posts", tags=["posts"])

# Helper functions
def format_timestamp(dt: Optional[datetime]) -> str:
    """Format datetime to relative time string"""
    if not dt:
        return "Unknown"
    now = datetime.now(dt.tzinfo) if dt.tzinfo else datetime.now()
    diff = now - dt
    
    if diff.days > 365:
        years = diff.days // 365
        return f"{years} year{'s' if years > 1 else ''} ago"
    elif diff.days > 30:
        months = diff.days // 30
        return f"{months} month{'s' if months > 1 else ''} ago"
    elif diff.days > 0:
        return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
    else:
        return "Just now"

async def get_user_name_avatar(db: AsyncSession, user_id: int) -> tuple[str, Optional[str]]:
    """Get user's name and avatar"""
    user = await db.get(User, user_id)
    if not user:
        return "Unknown User", None
    
    profile_result = await db.execute(
        select(ParentProfile).where(ParentProfile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()
    
    if profile:
        name = f"{profile.first_name or ''} {profile.last_name or ''}".strip() or user.email.split('@')[0]
        avatar = profile.profile_picture_url
    else:
        name = user.email.split('@')[0]
        avatar = None
    
    return name, avatar

async def update_member_last_activity(db: AsyncSession, user_id: int, community_id: int) -> None:
    """Update last_activity_at timestamp for a community member"""
    try:
        member_result = await db.execute(
            select(CommunityMember).where(and_(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == user_id,
                CommunityMember.status == 'active'
            ))
        )
        member = member_result.scalar_one_or_none()
        if member:
            member.last_activity_at = datetime.now()
            # Don't commit here - let the calling function commit
            logger.debug(f"Updated last_activity_at for user {user_id} in community {community_id}")
    except Exception as e:
        logger.warning(f"Failed to update last_activity_at for user {user_id} in community {community_id}: {e}")
        # Don't raise - this is a non-critical update

async def delete_post_images_from_storage(db: AsyncSession, post_id: int) -> None:
    """Delete all post images from Supabase Storage"""
    try:
        # Get all attachments for this post
        attachments_result = await db.execute(
            select(CommunityPostAttachment).where(
                CommunityPostAttachment.post_id == post_id
            )
        )
        attachments = attachments_result.scalars().all()
        
        if not attachments:
            return
        
        # Extract file paths from URLs and delete from storage
        file_paths_to_delete = []
        for attachment in attachments:
            if attachment.file_path:
                try:
                    # Extract the path from the Supabase public URL
                    # URL format: https://project.supabase.co/storage/v1/object/public/bucket/path/to/file
                    url_parts = attachment.file_path.split('/')
                    if POST_IMAGES_BUCKET in url_parts:
                        bucket_index = url_parts.index(POST_IMAGES_BUCKET)
                        file_path = '/'.join(url_parts[bucket_index + 1:])
                        file_paths_to_delete.append(file_path)
                except Exception as e:
                    logger.warning(f"⚠️ Error extracting file path from URL {attachment.file_path}: {e}")
                    continue
        
        if file_paths_to_delete:
            logger.info(f"🗑️ Deleting {len(file_paths_to_delete)} post image(s) from Supabase Storage")
            delete_result = supabase.storage.from_(POST_IMAGES_BUCKET).remove(file_paths_to_delete)
            
            # Handle delete result (can be dict or Response object)
            if isinstance(delete_result, dict) and delete_result.get('error'):
                error_msg = delete_result['error']
                logger.warning(f"⚠️ Failed to delete some files from Supabase Storage: {error_msg}")
            elif hasattr(delete_result, 'data') and isinstance(delete_result.data, dict) and delete_result.data.get('error'):
                error_msg = delete_result.data['error']
                logger.warning(f"⚠️ Failed to delete some files from Supabase Storage: {error_msg}")
            elif hasattr(delete_result, 'status_code') and delete_result.status_code >= 400:
                logger.warning(f"⚠️ Failed to delete files from Supabase Storage (HTTP {delete_result.status_code})")
            else:
                logger.info(f"✅ {len(file_paths_to_delete)} post image(s) deleted from Supabase Storage")
    except Exception as e:
        logger.warning(f"⚠️ Error deleting post images from storage: {e}")
        # Continue even if storage deletion fails

async def build_nested_comments(
    db: AsyncSession,
    post_id: int,
    current_user_id: Optional[int] = None,
    max_depth: int = 2
) -> List[CommunityPostCommentOut]:
    """Build nested comment structure with depth limit"""
    # Get all comments for this post
    logger.info(f"🔍 Querying comments for post_id={post_id}")
    comments_result = await db.execute(
        select(CommunityPostComment)
        .where(CommunityPostComment.post_id == post_id)
        .where(CommunityPostComment.status == 'visible')
        .order_by(CommunityPostComment.created_at.asc())
    )
    all_comments = comments_result.scalars().all()
    logger.info(f"📝 Fetched {len(all_comments)} comments for post_id={post_id}")
    if all_comments:
        logger.info(f"📝 Comment IDs: {[c.comment_id for c in all_comments]}")
        for comment in all_comments:
            logger.info(f"📝 Comment details: comment_id={comment.comment_id}, post_id={comment.post_id}, community_id={comment.community_id}, author_user_id={comment.author_user_id}, parent_comment_id={comment.parent_comment_id}, status={comment.status}, body={comment.body[:50]}...")
    else:
        # Debug: Check if comments exist with different status or post_id
        all_comments_check = await db.execute(
            select(CommunityPostComment)
            .where(CommunityPostComment.post_id == post_id)
        )
        all_comments_any_status = all_comments_check.scalars().all()
        logger.warning(f"⚠️ Found {len(all_comments_any_status)} comments for post_id={post_id} (any status)")
        for comment in all_comments_any_status:
            logger.warning(f"⚠️ Comment: comment_id={comment.comment_id}, status={comment.status}, parent_comment_id={comment.parent_comment_id}")
    
    # Get comment likes
    comment_ids = [c.comment_id for c in all_comments]
    likes_dict = {}
    if comment_ids:  # Only query if there are comments
        likes_result = await db.execute(
            select(
                CommunityPostCommentReaction.comment_id,
                func.count(CommunityPostCommentReaction.reaction_id).label('like_count')
            )
            .where(CommunityPostCommentReaction.comment_id.in_(comment_ids))
            .group_by(CommunityPostCommentReaction.comment_id)
        )
        likes_dict = {row[0]: row[1] for row in likes_result.all()}
    
    # Get which comments the current user has liked
    user_liked_comments = set()
    if current_user_id and comment_ids:
        user_likes_result = await db.execute(
            select(CommunityPostCommentReaction.comment_id)
            .where(and_(
                CommunityPostCommentReaction.comment_id.in_(comment_ids),
                CommunityPostCommentReaction.user_id == current_user_id,
                CommunityPostCommentReaction.reaction_type == 'like'
            ))
        )
        user_liked_comments = {row[0] for row in user_likes_result.all()}
    
    # Build comment map
    comment_map = {}
    for comment in all_comments:
        author_name, author_avatar = await get_user_name_avatar(db, comment.author_user_id)
        likes = likes_dict.get(comment.comment_id, 0)
        is_liked = comment.comment_id in user_liked_comments
        
        comment_out = CommunityPostCommentOut(
            comment_id=comment.comment_id,
            post_id=comment.post_id,
            author=author_name,
            avatar=author_avatar,
            time=format_timestamp(comment.created_at),
            body=comment.body,
            status=comment.status,
            likes=likes,
            user_id=comment.author_user_id,
            parent_comment_id=comment.parent_comment_id,
            replies=[],
            depth=0,
            is_liked=is_liked
        )
        comment_map[comment.comment_id] = comment_out
    
    # Build tree structure
    root_comments = []
    for comment in all_comments:
        comment_out = comment_map[comment.comment_id]
        if comment.parent_comment_id is None:
            # Top-level comment
            logger.info(f"📝 Adding root comment: comment_id={comment.comment_id}, body={comment.body[:50]}...")
            root_comments.append(comment_out)
        else:
            # Reply - add to parent's replies if depth allows
            parent = comment_map.get(comment.parent_comment_id)
            if parent and (not parent.depth or parent.depth < max_depth):
                comment_out.depth = (parent.depth or 0) + 1
                if parent.replies is None:
                    parent.replies = []
                parent.replies.append(comment_out)
                logger.info(f"📝 Adding reply: comment_id={comment.comment_id} to parent={comment.parent_comment_id}")
            else:
                logger.warning(f"⚠️ Reply comment_id={comment.comment_id} could not be added to parent={comment.parent_comment_id} (parent exists: {parent is not None}, depth check: {parent and (not parent.depth or parent.depth < max_depth) if parent else False})")
    
    logger.info(f"📝 Returning {len(root_comments)} root comments")
    return root_comments

# Posts endpoints
@router.get("", response_model=List[CommunityPostOut])
async def get_posts(
    community_id: Optional[int] = Query(None, description="Filter by community"),
    search: Optional[str] = Query(None, description="Search term"),
    user: Optional[User] = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get list of posts"""
    query = select(CommunityPost).where(CommunityPost.status == 'visible')
    
    if community_id:
        query = query.where(CommunityPost.community_id == community_id)
    
    if search:
        query = query.where(or_(
            CommunityPost.title.ilike(f"%{search}%"),
            CommunityPost.body.ilike(f"%{search}%")
        ))
    
    # Order by pinned posts first, then by creation date
    query = query.order_by(CommunityPost.is_pinned.desc(), CommunityPost.created_at.desc())
    
    result = await db.execute(query)
    posts = result.scalars().all()
    
    response = []
    for post in posts:
        # Get author info
        author_name, author_avatar = await get_user_name_avatar(db, post.author_user_id)
        
        # Get likes count
        likes_result = await db.execute(
            select(func.count(CommunityPostReaction.reaction_id))
            .where(CommunityPostReaction.post_id == post.post_id)
        )
        likes = likes_result.scalar() or 0
        
        # Check if current user has liked this post
        is_liked = False
        if user:
            like_check = await db.execute(
                select(CommunityPostReaction).where(and_(
                    CommunityPostReaction.post_id == post.post_id,
                    CommunityPostReaction.user_id == user.user_id,
                    CommunityPostReaction.reaction_type == 'like'
                ))
            )
            is_liked = like_check.scalar_one_or_none() is not None
        
        # Get comments count for list view (empty list, count in separate field if needed)
        comments_result = await db.execute(
            select(func.count(CommunityPostComment.comment_id))
            .where(and_(
                CommunityPostComment.post_id == post.post_id,
                CommunityPostComment.status == 'visible'
            ))
        )
        comments_count = comments_result.scalar() or 0
        
        # Get attachments
        attachments_result = await db.execute(
            select(CommunityPostAttachment)
            .where(CommunityPostAttachment.post_id == post.post_id)
            .order_by(CommunityPostAttachment.display_order.asc())
        )
        attachments = attachments_result.scalars().all()
        
        # Get community taxonomies for taxonomyLabels
        community_result = await db.execute(
            select(Community).where(Community.community_id == post.community_id)
        )
        community = community_result.scalar_one_or_none()
        taxonomy_labels = []
        if community:
            from models.database import CommunityTaxonomy, CommunityTaxonomyAssignment
            taxonomy_result = await db.execute(
                select(CommunityTaxonomy.label)
                .join(CommunityTaxonomyAssignment, CommunityTaxonomy.taxonomy_id == CommunityTaxonomyAssignment.taxonomy_id)
                .where(and_(
                    CommunityTaxonomyAssignment.community_id == community.community_id,
                    CommunityTaxonomy.taxonomy_type == 'topic',
                    CommunityTaxonomy.is_active == True
                ))
            )
            taxonomy_labels = [row[0] for row in taxonomy_result.all()]
            taxonomy_labels.append(community.name)
        
        # Build attachments list
        from schemas.schemas import CommunityPostAttachmentOut
        attachment_list = [
            CommunityPostAttachmentOut(
                attachment_id=att.attachment_id,
                file_name=att.file_name,
                file_path=att.file_path,
                file_type=att.file_type,
                file_size=att.file_size,
                mime_type=att.mime_type,
                display_order=att.display_order
            )
            for att in attachments
        ]
        
        response.append(CommunityPostOut(
            post_id=post.post_id,
            community_id=post.community_id,
            author=author_name,
            avatar=author_avatar,
            title=post.title,
            body=post.body,
            excerpt=post.body[:150] + "..." if len(post.body) > 150 else post.body,
            status=post.status,
            created_at=format_timestamp(post.created_at),
            likes=likes,
            comments=[],  # Empty list for list view (full comments in detail view)
            comments_count=comments_count,  # Include comment count for list view
            taxonomy_labels=taxonomy_labels,
            author_id=post.author_user_id,
            attachments=attachment_list if attachment_list else None,
            is_liked=is_liked,
            is_pinned=post.is_pinned
        ))
    
    return response

@router.get("/{post_id}", response_model=CommunityPostOut)
async def get_post(
    post_id: int,
    user: Optional[User] = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get post by ID with full details"""
    logger.info(f"🔍 Fetching post_id={post_id} for user_id={user.user_id if user else None}")
    post = await db.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    # Allow content managers and admins to see flagged posts
    if post.status != 'visible' and (not user or user.role not in ['content_manager', 'admin']):
        raise HTTPException(status_code=404, detail="Post not found")
    
    logger.info(f"📄 Post found: post_id={post.post_id}, community_id={post.community_id}, status={post.status}")
    
    # Get author info
    author_name, author_avatar = await get_user_name_avatar(db, post.author_user_id)
    
    # Get likes count
    likes_result = await db.execute(
        select(func.count(CommunityPostReaction.reaction_id))
        .where(CommunityPostReaction.post_id == post_id)
    )
    likes = likes_result.scalar() or 0
    
    # Check if current user has liked this post
    is_liked = False
    if user:
        like_check = await db.execute(
            select(CommunityPostReaction).where(and_(
                CommunityPostReaction.post_id == post_id,
                CommunityPostReaction.user_id == user.user_id,
                CommunityPostReaction.reaction_type == 'like'
            ))
        )
        is_liked = like_check.scalar_one_or_none() is not None
    
    # Get nested comments
    logger.info(f"💬 Fetching comments for post_id={post_id}")
    comments = await build_nested_comments(db, post_id, user.user_id if user else None)
    logger.info(f"💬 Returned {len(comments)} root comments for post_id={post_id}")
    
    # Get attachments
    attachments_result = await db.execute(
        select(CommunityPostAttachment)
        .where(CommunityPostAttachment.post_id == post_id)
        .order_by(CommunityPostAttachment.display_order.asc())
    )
    attachments = attachments_result.scalars().all()
    
    # Get community taxonomies
    community_result = await db.execute(
        select(Community).where(Community.community_id == post.community_id)
    )
    community = community_result.scalar_one_or_none()
    taxonomy_labels = []
    if community:
        from models.database import CommunityTaxonomy, CommunityTaxonomyAssignment
        taxonomy_result = await db.execute(
            select(CommunityTaxonomy.label)
            .join(CommunityTaxonomyAssignment, CommunityTaxonomy.taxonomy_id == CommunityTaxonomyAssignment.taxonomy_id)
            .where(and_(
                CommunityTaxonomyAssignment.community_id == community.community_id,
                CommunityTaxonomy.taxonomy_type == 'topic',
                CommunityTaxonomy.is_active == True
            ))
        )
        taxonomy_labels = [row[0] for row in taxonomy_result.all()]
        taxonomy_labels.append(community.name)
    
    # Build attachments list
        from schemas.schemas import CommunityPostAttachmentOut
        attachment_list = [
            CommunityPostAttachmentOut(
                attachment_id=att.attachment_id,
                file_name=att.file_name,
                file_path=att.file_path,
                file_type=att.file_type,
                file_size=att.file_size,
                mime_type=att.mime_type,
                display_order=att.display_order
            )
            for att in attachments
        ]
    
    # Calculate total comment count from nested structure
    def count_all_comments(comments_list):
        count = len(comments_list)
        for comment in comments_list:
            if comment.replies:
                count += count_all_comments(comment.replies)
        return count
    
    total_comments_count = count_all_comments(comments)
    
    return CommunityPostOut(
        post_id=post.post_id,
        community_id=post.community_id,
        author=author_name,
        avatar=author_avatar,
        title=post.title,
        body=post.body,
        excerpt=None,
        status=post.status,
        created_at=format_timestamp(post.created_at),
        likes=likes,
        comments=comments,
        comments_count=total_comments_count,  # Include comment count for detail view too
        taxonomy_labels=taxonomy_labels,
        author_id=post.author_user_id,
        attachments=attachment_list if attachment_list else None,
        is_liked=is_liked,
        is_pinned=post.is_pinned
    )

@router.post("", response_model=CommunityPostOut)
async def create_post(
    post_data: CommunityPostIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Create a new post"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify community exists and user is a member
    community = await db.get(Community, post_data.community_id)
    if not community or community.status != 'visible':
        raise HTTPException(status_code=404, detail="Community not found")
    
    member_result = await db.execute(
        select(CommunityMember).where(and_(
            CommunityMember.community_id == post_data.community_id,
            CommunityMember.user_id == user.user_id,
            CommunityMember.status == 'active'
        ))
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Must be a member to post")
    
    # Auto-generate excerpt (first 150 chars + "...")
    excerpt = None
    if post_data.body:
        if len(post_data.body) > 150:
            excerpt = post_data.body[:150] + "..."
        else:
            excerpt = post_data.body
    
    # Create post
    new_post = CommunityPost(
        community_id=post_data.community_id,
        author_user_id=user.user_id,
        title=post_data.title,
        body=post_data.body,
        excerpt=excerpt,
        status='visible'
    )
    db.add(new_post)
    await db.flush()
    
    # Handle attachments (images only for community posts)
    if post_data.attachments:
        for idx, attachment_data in enumerate(post_data.attachments):
            # Community posts only support images
            attachment = CommunityPostAttachment(
                post_id=new_post.post_id,
                file_name=attachment_data.file_name,
                file_path=attachment_data.url,
                file_type='image',  # Always 'image' for community posts
                file_size=attachment_data.file_size,
                mime_type=attachment_data.mime_type,
                display_order=idx
            )
            db.add(attachment)
    
    # Update member's last_activity_at
    await update_member_last_activity(db, user.user_id, post_data.community_id)
    
    await db.commit()
    await db.refresh(new_post)
    
    # Return full post
    return await get_post(new_post.post_id, user, db)

@router.put("/{post_id}", response_model=CommunityPostOut)
async def update_post(
    post_id: int,
    post_data: CommunityPostIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Update post (author only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    post = await db.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post.author_user_id != user.user_id:
        raise HTTPException(status_code=403, detail="Only author can edit post")
    
    post.title = post_data.title
    post.body = post_data.body
    # Auto-regenerate excerpt when body changes (first 150 chars + "...")
    if post_data.body:
        if len(post_data.body) > 150:
            post.excerpt = post_data.body[:150] + "..."
        else:
            post.excerpt = post_data.body
    else:
        post.excerpt = None
    # Manually update updated_at timestamp
    post.updated_at = datetime.now()
    
    # Update attachments
    # Get existing attachments before deletion
    existing_attachments_result = await db.execute(
        select(CommunityPostAttachment).where(
            CommunityPostAttachment.post_id == post_id
        )
    )
    existing_attachments = existing_attachments_result.scalars().all()
    existing_urls = {att.file_path for att in existing_attachments if att.file_path}
    
    # Get new URLs (frontend sends all remaining attachments as objects with 'url' property)
    new_urls = {att.url for att in (post_data.attachments or [])}
    
    # Find URLs that were removed (exist in old but not in new)
    removed_urls = existing_urls - new_urls
    
    # Delete removed images from Supabase Storage
    if removed_urls:
        try:
            file_paths_to_delete = []
            for url in removed_urls:
                try:
                    # Extract the path from the Supabase public URL
                    url_parts = url.split('/')
                    if POST_IMAGES_BUCKET in url_parts:
                        bucket_index = url_parts.index(POST_IMAGES_BUCKET)
                        file_path = '/'.join(url_parts[bucket_index + 1:])
                        file_paths_to_delete.append(file_path)
                except Exception as e:
                    logger.warning(f"⚠️ Error extracting file path from URL {url}: {e}")
                    continue
            
            if file_paths_to_delete:
                logger.info(f"🗑️ Deleting {len(file_paths_to_delete)} removed post image(s) from Supabase Storage")
                delete_result = supabase.storage.from_(POST_IMAGES_BUCKET).remove(file_paths_to_delete)
                
                # Handle delete result
                if isinstance(delete_result, dict) and delete_result.get('error'):
                    error_msg = delete_result['error']
                    logger.warning(f"⚠️ Failed to delete removed images from Supabase Storage: {error_msg}")
                elif hasattr(delete_result, 'data') and isinstance(delete_result.data, dict) and delete_result.data.get('error'):
                    error_msg = delete_result.data['error']
                    logger.warning(f"⚠️ Failed to delete removed images from Supabase Storage: {error_msg}")
                elif hasattr(delete_result, 'status_code') and delete_result.status_code >= 400:
                    logger.warning(f"⚠️ Failed to delete removed images from Supabase Storage (HTTP {delete_result.status_code})")
                else:
                    logger.info(f"✅ {len(file_paths_to_delete)} removed post image(s) deleted from Supabase Storage")
        except Exception as e:
            logger.warning(f"⚠️ Error deleting removed post images from storage: {e}")
            # Continue with database update even if storage deletion fails
    
    # Remove old attachments from database
    await db.execute(
        text("DELETE FROM community_post_attachments WHERE post_id = :post_id"),
        {"post_id": post_id}
    )
    
    # Add new attachments (images only for community posts)
    if post_data.attachments:
        for idx, attachment_data in enumerate(post_data.attachments):
            # Community posts only support images
            attachment = CommunityPostAttachment(
                post_id=post_id,
                file_name=attachment_data.file_name,
                file_path=attachment_data.url,
                file_type='image',  # Always 'image' for community posts
                file_size=attachment_data.file_size,
                mime_type=attachment_data.mime_type,
                display_order=idx
            )
            db.add(attachment)
    
    await db.commit()
    await db.refresh(post)
    
    return await get_post(post_id, user, db)

@router.delete("/{post_id}")
async def delete_post(
    post_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Delete post (author only) - deletes images from storage and database"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    post = await db.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post.author_user_id != user.user_id:
        raise HTTPException(status_code=403, detail="Only author can delete post")
    
    # Delete all post images from Supabase Storage
    await delete_post_images_from_storage(db, post_id)
    
    # Hard delete: Delete the post record from database
    # Note: Due to ON DELETE CASCADE constraints, this will automatically delete:
    # - community_post_attachments (via FK constraint)
    # - community_post_comments (via FK constraint)
    # - community_post_reactions (via FK constraint)
    # - community_post_comment_reactions (via comment FK)
    # - saved_posts (via FK constraint)
    # - reports (via FK constraint)
    # - notifications (via FK constraint)
    await db.delete(post)
    await db.commit()
    
    return {"message": "Post deleted successfully"}

@router.post("/{post_id}/like")
async def like_post(
    post_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Like a post"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    post = await db.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if already liked
    existing = await db.execute(
        select(CommunityPostReaction).where(and_(
            CommunityPostReaction.post_id == post_id,
            CommunityPostReaction.user_id == user.user_id,
            CommunityPostReaction.reaction_type == 'like'
        ))
    )
    reaction = existing.scalar_one_or_none()
    
    if reaction:
        # Unlike
        await db.delete(reaction)
        await db.commit()
        return {"message": "Post unliked", "liked": False}
    else:
        # Like
        reaction = CommunityPostReaction(
            post_id=post_id,
            user_id=user.user_id,
            reaction_type='like'
        )
        db.add(reaction)
        
        # Update member's last_activity_at
        await update_member_last_activity(db, user.user_id, post.community_id)
        
        # Create notification for post author (before commit)
        try:
            await create_post_liked_notification(db, post_id, user.user_id)
        except Exception as e:
            logger.error(f"Error creating post_liked notification: {e}")
            # Rollback if notification fails
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to like post: {str(e)}")
        
        # Commit everything together
        await db.commit()
        return {"message": "Post liked", "liked": True}

@router.post("/{post_id}/comments", response_model=CommunityPostCommentOut)
async def create_comment(
    post_id: int,
    comment_data: CommunityPostCommentIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Create a comment or reply"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    post = await db.get(CommunityPost, post_id)
    if not post or post.status != 'visible':
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if user is a member of the community
    member_result = await db.execute(
        select(CommunityMember).where(and_(
            CommunityMember.community_id == post.community_id,
            CommunityMember.user_id == user.user_id,
            CommunityMember.status == 'active'
        ))
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Must be a member of this community to comment")
    
    # Check depth if it's a reply
    if comment_data.parent_comment_id:
        parent_result = await db.execute(
            select(CommunityPostComment).where(
                CommunityPostComment.comment_id == comment_data.parent_comment_id
            )
        )
        parent = parent_result.scalar_one_or_none()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")
        
        # Calculate depth
        depth = 0
        current = parent
        while current.parent_comment_id:
            depth += 1
            current_result = await db.execute(
                select(CommunityPostComment).where(
                    CommunityPostComment.comment_id == current.parent_comment_id
                )
            )
            current = current_result.scalar_one_or_none()
            if not current:
                break
        
        if depth >= 2:  # Max depth is 2 (0, 1, 2)
            raise HTTPException(status_code=400, detail="Maximum nesting depth reached")
    
    # Create comment
    new_comment = CommunityPostComment(
        post_id=post_id,
        community_id=post.community_id,  # Required field - get from post
        author_user_id=user.user_id,
        body=comment_data.body,
        parent_comment_id=comment_data.parent_comment_id,
        status='visible'
    )
    db.add(new_comment)
    await db.flush()  # Flush to get comment_id without committing
    
    # Update member's last_activity_at
    await update_member_last_activity(db, user.user_id, post.community_id)
    
    # Create notification (before commit)
    try:
        if comment_data.parent_comment_id:
            # It's a reply - notify parent comment author
            notification = await create_comment_replied_notification(
                db, post_id, new_comment.comment_id, 
                comment_data.parent_comment_id, user.user_id, comment_data.body
            )
        else:
            # It's a top-level comment - notify post author
            notification = await create_post_commented_notification(
                db, post_id, new_comment.comment_id, 
                user.user_id, comment_data.body
            )
    except Exception as e:
        logger.error(f"Error creating comment notification: {e}")
        # Rollback if notification fails
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create comment: {str(e)}")
    
    # Commit everything together
    await db.commit()
    await db.refresh(new_comment)
    
    # Build and return comment
    author_name, author_avatar = await get_user_name_avatar(db, user.user_id)
    return CommunityPostCommentOut(
        comment_id=new_comment.comment_id,
        post_id=new_comment.post_id,
        author=author_name,
        avatar=author_avatar,
        time=format_timestamp(new_comment.created_at),
        body=new_comment.body,
        status=new_comment.status,
        likes=0,
        user_id=new_comment.author_user_id,
        parent_comment_id=new_comment.parent_comment_id,
        replies=[],
        depth=0,
        is_liked=False  # Newly created comments are not liked by creator
    )

@router.post("/comments/{comment_id}/like")
async def like_comment(
    comment_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Like a comment"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    comment = await db.get(CommunityPostComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check if already liked
    existing = await db.execute(
        select(CommunityPostCommentReaction).where(and_(
            CommunityPostCommentReaction.comment_id == comment_id,
            CommunityPostCommentReaction.user_id == user.user_id,
            CommunityPostCommentReaction.reaction_type == 'like'
        ))
    )
    reaction = existing.scalar_one_or_none()
    
    if reaction:
        # Unlike
        await db.delete(reaction)
        await db.commit()
        return {"message": "Comment unliked", "liked": False}
    else:
        # Like
        reaction = CommunityPostCommentReaction(
            comment_id=comment_id,
            user_id=user.user_id,
            reaction_type='like'
        )
        db.add(reaction)
        
        # Get post to access community_id for updating last_activity_at
        post_result = await db.execute(
            select(CommunityPost).where(CommunityPost.post_id == comment.post_id)
        )
        post = post_result.scalar_one_or_none()
        
        if post:
            # Update member's last_activity_at
            await update_member_last_activity(db, user.user_id, post.community_id)
        
        # Create notification for comment author (before commit)
        try:
            notification = await create_comment_liked_notification(db, comment_id, user.user_id)
        except Exception as e:
            logger.error(f"Error creating comment_liked notification: {e}")
            # Rollback if notification fails
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to like comment: {str(e)}")
        
        # Commit everything together
        await db.commit()
        return {"message": "Comment liked", "liked": True}

@router.post("/{post_id}/save")
async def save_post(
    post_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Save a post"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    post = await db.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if already saved
    existing = await db.execute(
        select(SavedPost).where(and_(
            SavedPost.post_id == post_id,
            SavedPost.user_id == user.user_id
        ))
    )
    saved = existing.scalar_one_or_none()
    
    if saved:
        # Unsave
        await db.delete(saved)
        await db.commit()
        return {"message": "Post unsaved", "saved": False}
    else:
        # Save
        saved = SavedPost(
            post_id=post_id,
            user_id=user.user_id
        )
        db.add(saved)
        await db.commit()
        return {"message": "Post saved", "saved": True}

@router.post("/{post_id}/pin")
async def pin_post(
    post_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Pin a post (owner/moderator only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    post = await db.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if user is owner or moderator of the community
    member_result = await db.execute(
        select(CommunityMember).where(and_(
            CommunityMember.community_id == post.community_id,
            CommunityMember.user_id == user.user_id,
            CommunityMember.status == 'active',
            CommunityMember.role.in_(['owner', 'moderator'])
        ))
    )
    member = member_result.scalar_one_or_none()
    
    if not member:
        raise HTTPException(status_code=403, detail="Only owner or moderator can pin posts")
    
    # Check current pinned count for this community (max 3)
    pinned_count_result = await db.execute(
        select(func.count(CommunityPost.post_id))
        .where(and_(
            CommunityPost.community_id == post.community_id,
            CommunityPost.is_pinned == True,
            CommunityPost.status == 'visible'
        ))
    )
    pinned_count = pinned_count_result.scalar() or 0
    
    if post.is_pinned:
        raise HTTPException(status_code=400, detail="Post is already pinned")
    
    if pinned_count >= 3:
        raise HTTPException(status_code=400, detail="Maximum 3 pinned posts allowed per community")
    
    # Update is_pinned and updated_at timestamp
    post.is_pinned = True
    post.updated_at = datetime.now()
    await db.commit()
    
    return {"message": "Post pinned successfully", "pinned": True}

@router.post("/{post_id}/unpin")
async def unpin_post(
    post_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Unpin a post (owner/moderator only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    post = await db.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if user is owner or moderator of the community
    member_result = await db.execute(
        select(CommunityMember).where(and_(
            CommunityMember.community_id == post.community_id,
            CommunityMember.user_id == user.user_id,
            CommunityMember.status == 'active',
            CommunityMember.role.in_(['owner', 'moderator'])
        ))
    )
    member = member_result.scalar_one_or_none()
    
    if not member:
        raise HTTPException(status_code=403, detail="Only owner or moderator can unpin posts")
    
    if not post.is_pinned:
        raise HTTPException(status_code=400, detail="Post is not pinned")
    
    # Update is_pinned and updated_at timestamp
    post.is_pinned = False
    post.updated_at = datetime.now()
    await db.commit()
    
    return {"message": "Post unpinned successfully", "pinned": False}

@router.get("/activity/my", response_model=List[CommunityPostOut])
async def get_my_activity(
    community_id: Optional[int] = Query(None, description="Filter by community"),
    activity_type: Optional[str] = Query('all', description="Filter by activity type: 'all', 'created', 'commented'"),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get posts where user participated (created or commented)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    logger.info(f"🔍 Fetching My Activity for user_id={user.user_id}, community_id={community_id}, activity_type={activity_type}")
    
    # Posts created by user
    created_posts_query = select(CommunityPost).where(and_(
        CommunityPost.author_user_id == user.user_id,
        CommunityPost.status == 'visible'
    ))
    if community_id:
        created_posts_query = created_posts_query.where(CommunityPost.community_id == community_id)
    
    created_posts_result = await db.execute(created_posts_query)
    created_posts = created_posts_result.scalars().all()
    logger.info(f"📝 Found {len(created_posts)} posts created by user_id={user.user_id}")
    
    # Posts where user commented
    commented_posts_query = select(CommunityPost).distinct()\
        .join(CommunityPostComment, CommunityPost.post_id == CommunityPostComment.post_id)\
        .where(and_(
            CommunityPostComment.author_user_id == user.user_id,
            CommunityPostComment.status == 'visible',
            CommunityPost.status == 'visible'
        ))
    if community_id:
        commented_posts_query = commented_posts_query.where(CommunityPost.community_id == community_id)
    
    commented_posts_result = await db.execute(commented_posts_query)
    commented_posts = commented_posts_result.scalars().all()
    logger.info(f"💬 Found {len(commented_posts)} posts where user_id={user.user_id} commented")
    
    # Filter by activity_type
    if activity_type == 'created':
        all_post_ids = {p.post_id for p in created_posts}
    elif activity_type == 'commented':
        all_post_ids = {p.post_id for p in commented_posts}
    else:  # 'all'
        all_post_ids = {p.post_id for p in created_posts} | {p.post_id for p in commented_posts}
    
    logger.info(f"📝 Combined post IDs: {all_post_ids}")
    
    if not all_post_ids:
        return []
    
    # Get all posts
    posts_result = await db.execute(
        select(CommunityPost).where(CommunityPost.post_id.in_(all_post_ids))
        .order_by(CommunityPost.created_at.desc())
    )
    posts = posts_result.scalars().all()
    
    # Build response (similar to get_posts)
    response = []
    for post in posts:
        author_name, author_avatar = await get_user_name_avatar(db, post.author_user_id)
        
        likes_result = await db.execute(
            select(func.count(CommunityPostReaction.reaction_id))
            .where(CommunityPostReaction.post_id == post.post_id)
        )
        likes = likes_result.scalar() or 0
        
        # Check if current user has liked this post
        is_liked = False
        like_check = await db.execute(
            select(CommunityPostReaction).where(and_(
                CommunityPostReaction.post_id == post.post_id,
                CommunityPostReaction.user_id == user.user_id,
                CommunityPostReaction.reaction_type == 'like'
            ))
        )
        is_liked = like_check.scalar_one_or_none() is not None
        
        comments_result = await db.execute(
            select(CommunityPostComment)
            .where(and_(
                CommunityPostComment.post_id == post.post_id,
                CommunityPostComment.status == 'visible',
                CommunityPostComment.parent_comment_id.is_(None)
            ))
        )
        top_level_comments = comments_result.scalars().all()
        
        # Get community taxonomies
        community_result = await db.execute(
            select(Community).where(Community.community_id == post.community_id)
        )
        community = community_result.scalar_one_or_none()
        taxonomy_labels = []
        if community:
            from models.database import CommunityTaxonomy, CommunityTaxonomyAssignment
            taxonomy_result = await db.execute(
                select(CommunityTaxonomy.label)
                .join(CommunityTaxonomyAssignment, CommunityTaxonomy.taxonomy_id == CommunityTaxonomyAssignment.taxonomy_id)
                .where(and_(
                    CommunityTaxonomyAssignment.community_id == community.community_id,
                    CommunityTaxonomy.taxonomy_type == 'topic',
                    CommunityTaxonomy.is_active == True
                ))
            )
            taxonomy_labels = [row[0] for row in taxonomy_result.all()]
            taxonomy_labels.append(community.name)
        
        # Get comments count for list view
        comments_count_result = await db.execute(
            select(func.count(CommunityPostComment.comment_id))
            .where(and_(
                CommunityPostComment.post_id == post.post_id,
                CommunityPostComment.status == 'visible'
            ))
        )
        comments_count = comments_count_result.scalar() or 0
        
        response.append(CommunityPostOut(
            post_id=post.post_id,
            community_id=post.community_id,
            author=author_name,
            avatar=author_avatar,
            title=post.title,
            body=post.body,
            excerpt=post.body[:150] + "..." if len(post.body) > 150 else post.body,
            status=post.status,
            created_at=format_timestamp(post.created_at),
            likes=likes,
            comments=[],  # Empty list for list view
            comments_count=comments_count,  # Include comment count
            taxonomy_labels=taxonomy_labels,
            author_id=post.author_user_id,
            is_liked=is_liked,
            is_pinned=post.is_pinned
        ))
    
    return response

@router.get("/saved/my", response_model=List[CommunityPostOut])
async def get_saved_posts(
    community_id: Optional[int] = Query(None, description="Filter by community"),
    topics: Optional[List[str]] = Query(None, description="Filter by topic labels"),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get user's saved posts"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    saved_result = await db.execute(
        select(SavedPost).where(SavedPost.user_id == user.user_id)
        .order_by(SavedPost.saved_at.desc())
    )
    saved_posts = saved_result.scalars().all()
    
    post_ids = [sp.post_id for sp in saved_posts]
    
    if not post_ids:
        return []
    
    # Build query with filters
    posts_query = select(CommunityPost).where(and_(
        CommunityPost.post_id.in_(post_ids),
        CommunityPost.status == 'visible'
    ))
    
    if community_id:
        posts_query = posts_query.where(CommunityPost.community_id == community_id)
    
    posts_result = await db.execute(posts_query.order_by(CommunityPost.created_at.desc()))
    posts = posts_result.scalars().all()
    
    # Filter by topics if provided
    if topics:
        from models.database import CommunityTaxonomy, CommunityTaxonomyAssignment
        filtered_posts = []
        for post in posts:
            # Get community taxonomies for this post
            community_result = await db.execute(
                select(Community).where(Community.community_id == post.community_id)
            )
            community = community_result.scalar_one_or_none()
            if community:
                taxonomy_result = await db.execute(
                    select(CommunityTaxonomy.label)
                    .join(CommunityTaxonomyAssignment, CommunityTaxonomy.taxonomy_id == CommunityTaxonomyAssignment.taxonomy_id)
                    .where(and_(
                        CommunityTaxonomyAssignment.community_id == community.community_id,
                        CommunityTaxonomy.taxonomy_type == 'topic',
                        CommunityTaxonomy.is_active == True
                    ))
                )
                post_topics = [row[0] for row in taxonomy_result.all()]
                # Check if any of the post's topics match the filter
                if any(topic in post_topics for topic in topics):
                    filtered_posts.append(post)
        posts = filtered_posts
    
    # Build response (similar to get_posts)
    response = []
    for post in posts:
        author_name, author_avatar = await get_user_name_avatar(db, post.author_user_id)
        
        likes_result = await db.execute(
            select(func.count(CommunityPostReaction.reaction_id))
            .where(CommunityPostReaction.post_id == post.post_id)
        )
        likes = likes_result.scalar() or 0
        
        # Check if current user has liked this post
        is_liked = False
        like_check = await db.execute(
            select(CommunityPostReaction).where(and_(
                CommunityPostReaction.post_id == post.post_id,
                CommunityPostReaction.user_id == user.user_id,
                CommunityPostReaction.reaction_type == 'like'
            ))
        )
        is_liked = like_check.scalar_one_or_none() is not None
        
        comments_result = await db.execute(
            select(CommunityPostComment)
            .where(and_(
                CommunityPostComment.post_id == post.post_id,
                CommunityPostComment.status == 'visible',
                CommunityPostComment.parent_comment_id.is_(None)
            ))
        )
        top_level_comments = comments_result.scalars().all()
        
        # Get community taxonomies
        community_result = await db.execute(
            select(Community).where(Community.community_id == post.community_id)
        )
        community = community_result.scalar_one_or_none()
        taxonomy_labels = []
        if community:
            from models.database import CommunityTaxonomy, CommunityTaxonomyAssignment
            taxonomy_result = await db.execute(
                select(CommunityTaxonomy.label)
                .join(CommunityTaxonomyAssignment, CommunityTaxonomy.taxonomy_id == CommunityTaxonomyAssignment.taxonomy_id)
                .where(and_(
                    CommunityTaxonomyAssignment.community_id == community.community_id,
                    CommunityTaxonomy.taxonomy_type == 'topic',
                    CommunityTaxonomy.is_active == True
                ))
            )
            taxonomy_labels = [row[0] for row in taxonomy_result.all()]
            taxonomy_labels.append(community.name)
        
        # Get comments count for list view
        comments_count_result = await db.execute(
            select(func.count(CommunityPostComment.comment_id))
            .where(and_(
                CommunityPostComment.post_id == post.post_id,
                CommunityPostComment.status == 'visible'
            ))
        )
        comments_count = comments_count_result.scalar() or 0
        
        response.append(CommunityPostOut(
            post_id=post.post_id,
            community_id=post.community_id,
            author=author_name,
            avatar=author_avatar,
            title=post.title,
            body=post.body,
            excerpt=post.body[:150] + "..." if len(post.body) > 150 else post.body,
            status=post.status,
            created_at=format_timestamp(post.created_at),
            likes=likes,
            comments=[],  # Empty list for list view
            comments_count=comments_count,  # Include comment count
            taxonomy_labels=taxonomy_labels,
            author_id=post.author_user_id,
            is_liked=is_liked,
            is_pinned=post.is_pinned
        ))
    
    return response

@router.get("/activity/my/communities")
async def get_my_activity_communities(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get distinct communities where user has activity (for filter dropdown)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Get communities from posts created by user
    created_communities_result = await db.execute(
        select(Community.community_id, Community.name)
        .join(CommunityPost, Community.community_id == CommunityPost.community_id)
        .where(and_(
            CommunityPost.author_user_id == user.user_id,
            CommunityPost.status == 'visible'
        ))
        .distinct()
    )
    created_communities = created_communities_result.all()
    
    # Get communities from posts where user commented
    commented_communities_result = await db.execute(
        select(Community.community_id, Community.name)
        .join(CommunityPost, Community.community_id == CommunityPost.community_id)
        .join(CommunityPostComment, CommunityPost.post_id == CommunityPostComment.post_id)
        .where(and_(
            CommunityPostComment.author_user_id == user.user_id,
            CommunityPostComment.status == 'visible',
            CommunityPost.status == 'visible'
        ))
        .distinct()
    )
    commented_communities = commented_communities_result.all()
    
    # Combine and deduplicate
    all_communities = {}
    for row in created_communities + commented_communities:
        all_communities[row[0]] = {"community_id": row[0], "name": row[1]}
    
    return list(all_communities.values())

@router.get("/saved/my/communities")
async def get_saved_posts_communities(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get distinct communities with saved posts (for filter dropdown)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Get communities from saved posts
    communities_result = await db.execute(
        select(Community.community_id, Community.name)
        .join(CommunityPost, Community.community_id == CommunityPost.community_id)
        .join(SavedPost, CommunityPost.post_id == SavedPost.post_id)
        .where(and_(
            SavedPost.user_id == user.user_id,
            CommunityPost.status == 'visible'
        ))
        .distinct()
    )
    communities = communities_result.all()
    
    return [{"community_id": row[0], "name": row[1]} for row in communities]

@router.get("/saved/my/topics")
async def get_saved_posts_topics(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get distinct topics from saved posts' communities (for filter dropdown)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Get communities from saved posts
    saved_communities_result = await db.execute(
        select(Community.community_id).distinct()
        .join(CommunityPost, Community.community_id == CommunityPost.community_id)
        .join(SavedPost, CommunityPost.post_id == SavedPost.post_id)
        .where(and_(
            SavedPost.user_id == user.user_id,
            CommunityPost.status == 'visible'
        ))
    )
    saved_community_ids = [row[0] for row in saved_communities_result.all()]
    
    if not saved_community_ids:
        return []
    
    # Get topics from these communities
    from models.database import CommunityTaxonomy, CommunityTaxonomyAssignment
    topics_result = await db.execute(
        select(CommunityTaxonomy.label).distinct()
        .join(CommunityTaxonomyAssignment, CommunityTaxonomy.taxonomy_id == CommunityTaxonomyAssignment.taxonomy_id)
        .where(and_(
            CommunityTaxonomyAssignment.community_id.in_(saved_community_ids),
            CommunityTaxonomy.taxonomy_type == 'topic',
            CommunityTaxonomy.is_active == True
        ))
        .order_by(CommunityTaxonomy.label.asc())
    )
    topics = [row[0] for row in topics_result.all()]
    
    return topics

@router.post("/upload-image")
async def upload_post_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Upload an image for a post using Supabase Storage"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Validate file size (10MB limit)
        if file.size and file.size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
        
        # Validate file type - only images
        # Note: 'image/jpeg' is the correct MIME type for both .jpg and .jpeg files
        allowed_types = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp'
        ]
        
        # Get file extension for validation
        file_extension = Path(file.filename).suffix.lower() if file.filename else ""
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        
        # Normalize content_type - handle common variations
        content_type = file.content_type.lower().strip() if file.content_type else ""
        # Handle common MIME type variations
        if content_type == 'image/jpg':
            content_type = 'image/jpeg'
        
        # Validate: check both content_type and file extension independently
        # File is valid if EITHER content_type OR file extension matches
        content_type_valid = content_type and content_type in allowed_types
        extension_valid = file_extension and file_extension in allowed_extensions
        is_valid = content_type_valid or extension_valid
        
        if not is_valid:
            logger.warning(f"Invalid file type - content_type: '{file.content_type}' (normalized: '{content_type}'), extension: '{file_extension}', filename: '{file.filename}'")
            raise HTTPException(status_code=400, detail="Only images are allowed (JPEG, PNG, GIF, WebP)")
        
        # Read file content
        content = await file.read()
        
        # Generate unique filename with proper extension
        file_extension = Path(file.filename).suffix if file.filename else ""
        if not file_extension:
            if file.content_type.startswith('image/'):
                file_extension = '.jpg' if 'jpeg' in file.content_type else '.png'
        
        unique_filename = f"posts/{user.user_id}/{uuid.uuid4()}{file_extension}"
        
        logger.info(f"🔄 Uploading post image to Supabase Storage...")
        logger.info(f"📦 Bucket: {POST_IMAGES_BUCKET}, Filename: {unique_filename}")
        
        try:
            upload_response = supabase.storage.from_(POST_IMAGES_BUCKET).upload(
                unique_filename,
                content,
                file_options={"content-type": file.content_type, "upsert": "true"}
            )
            
            # Supabase client's upload method can return a dict or a Response object
            # Handle both cases for error checking
            if isinstance(upload_response, dict) and upload_response.get('error'):
                error_msg = upload_response['error']
                logger.error(f"❌ Upload failed (dict error): {error_msg}")
                if 'row-level security' in str(error_msg).lower() or 'unauthorized' in str(error_msg).lower():
                    raise HTTPException(
                        status_code=500,
                        detail="Storage upload failed due to RLS policy. Please ensure SUPABASE_SERVICE_ROLE_KEY (not SUPABASE_KEY) is set in your backend .env file and restart the backend server."
                    )
                raise HTTPException(status_code=500, detail=f"Failed to upload to storage: {error_msg}")
            elif hasattr(upload_response, 'data') and isinstance(upload_response.data, dict) and upload_response.data.get('error'):
                error_msg = upload_response.data['error']
                logger.error(f"❌ Upload failed (response object error): {error_msg}")
                raise HTTPException(status_code=500, detail=f"Failed to upload to storage: {error_msg}")
            elif hasattr(upload_response, 'status_code') and upload_response.status_code >= 400:
                error_content = upload_response.json() if hasattr(upload_response, 'json') else str(upload_response)
                logger.error(f"❌ Upload failed (HTTP error {upload_response.status_code}): {error_content}")
                raise HTTPException(status_code=upload_response.status_code, detail=f"Storage upload failed: {error_content}")
        
        except HTTPException:
            raise
        except Exception as upload_exception:
            logger.error(f"❌ Upload exception: {upload_exception}")
            raise HTTPException(
                status_code=500,
                detail=f"Storage upload failed: {str(upload_exception)}. Please check that SUPABASE_SERVICE_ROLE_KEY is set in your .env file."
            )
        
        logger.info(f"✅ File uploaded successfully to Supabase Storage")
        
        # Get public URL - get_public_url() returns a string directly
        try:
            public_url = supabase.storage.from_(POST_IMAGES_BUCKET).get_public_url(unique_filename)
            
            if isinstance(public_url, dict):
                public_url = public_url.get('publicUrl') or public_url.get('public_url')
            elif not isinstance(public_url, str):
                public_url = str(public_url)
            
            if not public_url or public_url == 'None':
                raise HTTPException(status_code=500, detail="Failed to get public URL from storage")
        except Exception as url_exception:
            logger.error(f"❌ Failed to get public URL: {url_exception}")
            raise HTTPException(status_code=500, detail=f"Failed to retrieve public URL: {str(url_exception)}")
        
        logger.info(f"✅ Public URL: {public_url}")
        
        return {
            "url": public_url,
            "filename": file.filename or "unknown",
            "size": len(content),
            "content_type": file.content_type
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading post image: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload post image: {str(e)}")

@router.post("/reports")
async def submit_report(
    report_data: ReportIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Submit a report (post, comment, or community)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Validate reported entity exists and set appropriate field
    reported_post_id = None
    reported_comment_id = None
    reported_community_id = None
    reported_user_id = None
    
    if report_data.entity_type == 'post':
        entity = await db.get(CommunityPost, report_data.entity_id)
        if not entity:
            raise HTTPException(status_code=404, detail="Post not found")
        reported_post_id = report_data.entity_id
    elif report_data.entity_type == 'comment':
        entity = await db.get(CommunityPostComment, report_data.entity_id)
        if not entity:
            raise HTTPException(status_code=404, detail="Comment not found")
        reported_comment_id = report_data.entity_id
    elif report_data.entity_type == 'community':
        entity = await db.get(Community, report_data.entity_id)
        if not entity:
            raise HTTPException(status_code=404, detail="Community not found")
        reported_community_id = report_data.entity_id
    elif report_data.entity_type == 'user':
        # Validate user exists
        entity = await db.get(User, report_data.entity_id)
        if not entity:
            raise HTTPException(status_code=404, detail="User not found")
        reported_user_id = report_data.entity_id
    else:
        raise HTTPException(status_code=400, detail="Invalid entity_type. Must be 'post', 'comment', 'community', or 'user'")
    
    # Create report
    new_report = Report(
        reporter_id=user.user_id,
        report_type=report_data.entity_type,
        reported_post_id=reported_post_id,
        reported_comment_id=reported_comment_id,
        reported_community_id=reported_community_id,
        reported_user_id=reported_user_id,
        reason=report_data.reason,
        details=report_data.details,
        status='pending'
    )
    db.add(new_report)
    await db.commit()
    await db.refresh(new_report)
    
    # Create notifications for all content managers
    try:
        await create_report_created_notifications(
            db=db,
            report_id=new_report.report_id,
            report_type=new_report.report_type,
            reporter_id=user.user_id,
            reason=new_report.reason
        )
        await db.commit()  # Commit notifications
    except Exception as e:
        # Log error but don't fail report creation
        logger.error(f"Error creating report notifications: {e}")
    
    return {
        "message": "Report submitted successfully",
        "report_id": new_report.report_id
    }

# Admin/Content Manager report management endpoints
@router.get("/reports", response_model=List[ReportOut])
async def get_reports(
    status: Optional[str] = Query(None, description="Filter by status: pending, resolved, dismissed"),
    report_type: Optional[str] = Query(None, description="Filter by type: post, comment, community, user"),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get all reports (admin/content_manager only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Check if user is admin or content_manager
    if user.role not in ['admin', 'content_manager']:
        raise HTTPException(status_code=403, detail="Only admins and content managers can view reports")
    
    query = select(Report)
    
    if status:
        query = query.where(Report.status == status)
    
    if report_type:
        query = query.where(Report.report_type == report_type)
    
    query = query.order_by(Report.created_at.desc())
    
    result = await db.execute(query)
    reports = result.scalars().all()
    
    response = []
    for report in reports:
        response.append(ReportOut(
            report_id=report.report_id,
            reporter_id=report.reporter_id,
            report_type=report.report_type,
            reported_post_id=report.reported_post_id,
            reported_comment_id=report.reported_comment_id,
            reported_community_id=report.reported_community_id,
            reported_user_id=report.reported_user_id,
            reason=report.reason,
            details=report.details,
            status=report.status,
            reviewed_by=report.reviewed_by,
            reviewed_at=report.reviewed_at,
            resolution_notes=report.resolution_notes,
            created_at=report.created_at,
            updated_at=report.updated_at
        ))
    
    return response

class ResolveReportIn(BaseModel):
    resolution_notes: Optional[str] = None

@router.put("/reports/{report_id}/resolve")
async def resolve_report(
    report_id: int,
    resolution_data: Optional[ResolveReportIn] = None,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Resolve a report by flagging the entity (admin/content_manager only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if user.role not in ['admin', 'content_manager']:
        raise HTTPException(status_code=403, detail="Only admins and content managers can resolve reports")
    
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Set entity status to 'flagged' based on report type
    if report.report_type == 'post' and report.reported_post_id:
        post = await db.get(CommunityPost, report.reported_post_id)
        if post:
            post.status = 'flagged'
    elif report.report_type == 'comment' and report.reported_comment_id:
        comment = await db.get(CommunityPostComment, report.reported_comment_id)
        if comment:
            comment.status = 'flagged'
    elif report.report_type == 'community' and report.reported_community_id:
        community = await db.get(Community, report.reported_community_id)
        if community:
            community.status = 'flagged'
    # Note: User reports don't change user status (users table doesn't have status field for moderation)
    
    # Update report status
    report.status = 'resolved'
    report.reviewed_by = user.user_id
    report.reviewed_at = datetime.now()
    if resolution_data and resolution_data.resolution_notes:
        report.resolution_notes = resolution_data.resolution_notes
    
    await db.commit()
    await db.refresh(report)
    
    return {"message": "Report resolved and entity flagged", "status": "resolved"}

@router.put("/reports/{report_id}/dismiss")
async def dismiss_report(
    report_id: int,
    resolution_data: Optional[ResolveReportIn] = None,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Dismiss a report as invalid/false (admin/content_manager only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if user.role not in ['admin', 'content_manager']:
        raise HTTPException(status_code=403, detail="Only admins and content managers can dismiss reports")
    
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Update report status (entity stays 'visible')
    report.status = 'dismissed'
    report.reviewed_by = user.user_id
    report.reviewed_at = datetime.now()
    if resolution_data and resolution_data.resolution_notes:
        report.resolution_notes = resolution_data.resolution_notes
    
    await db.commit()
    await db.refresh(report)
    
    return {"message": "Report dismissed", "status": "dismissed"}

