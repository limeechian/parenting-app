# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: communities.py
# Description: To handle community management endpoints including CRUD operations, membership, and taxonomy
# First Written on: Friday, 03-Oct-2025
# Edited on: Sunday, 10-Dec-2025

"""
Community router - Handles community management

This router provides endpoints for:
- Community CRUD operations (create, read, update, delete)
- Community membership (join, leave, get members)
- Community search and filtering (by age group, stage, topics)
- Community cover image uploads
- Taxonomy management (age groups, developmental stages, topics)
- User search for community invitations

All endpoints require authentication. Community creation and management
are restricted to parent users.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, text
from typing import Optional, List
from datetime import datetime
from pathlib import Path
import re
import uuid

from dependencies import get_current_user_flexible, get_session
from models.database import (
    User, Community, CommunityTaxonomy, CommunityTaxonomyAssignment,
    CommunityMember, ParentProfile, CommunityPost,
    CommunityPostAttachment
)
from schemas.schemas import (
    CommunityIn, CommunityOut, CommunityMemberOut, CommunityTaxonomyOut
)
from config import logger, supabase, COMMUNITY_IMAGES_BUCKET, POST_IMAGES_BUCKET
from utils.notifications import create_community_joined_notification

# Initialize router with prefix and tags for API documentation
router = APIRouter(prefix="/communities", tags=["communities"])

# ============================================================================
# Helper Functions
# ============================================================================

def format_timestamp(dt: Optional[datetime]) -> str:
    """
    Format datetime to relative time string
    
    Converts a datetime to a human-readable relative time string
    (e.g., "2 hours ago", "3 days ago").
    
    Args:
        dt: Datetime object to format
    
    Returns:
        str: Formatted relative time string
    """
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
    
    # Try to get from parent profile
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

async def delete_community_cover_image_from_storage(cover_image_url: Optional[str]) -> None:
    """Delete community cover image from Supabase Storage"""
    if not cover_image_url:
        return
    
    try:
        # Extract file path from the public URL
        # URL format: https://project.supabase.co/storage/v1/object/public/bucket/path/to/file
        # Example: https://xxx.supabase.co/storage/v1/object/public/community-images/covers/1/bdef4dd2-2e4e-45a2-8527-f4af01295469.jpg
        logger.info(f"🗑️ Attempting to delete community cover image from Supabase Storage")
        logger.info(f"📋 Original URL: {cover_image_url}")
        
        url_parts = cover_image_url.split('/')
        logger.info(f"📋 URL parts: {url_parts}")
        
        if COMMUNITY_IMAGES_BUCKET in url_parts:
            bucket_index = url_parts.index(COMMUNITY_IMAGES_BUCKET)
            file_path = '/'.join(url_parts[bucket_index + 1:])
            logger.info(f"📋 Extracted file path: {file_path}")
            
            # Delete from Supabase Storage
            logger.info(f"🗑️ Calling supabase.storage.from_('{COMMUNITY_IMAGES_BUCKET}').remove(['{file_path}'])")
            delete_result = supabase.storage.from_(COMMUNITY_IMAGES_BUCKET).remove([file_path])
            logger.info(f"📋 Delete result type: {type(delete_result)}")
            logger.info(f"📋 Delete result: {delete_result}")
            
            # Handle delete result (can be dict, list, Response object, or None)
            # Supabase Storage remove() returns a list of deleted file paths on success
            deletion_success = False
            if isinstance(delete_result, list):
                # Success: Supabase returns a list of deleted file paths
                if file_path in delete_result or len(delete_result) > 0:
                    deletion_success = True
                    logger.info(f"✅ Cover image deleted from Supabase Storage (list response: {delete_result})")
                else:
                    logger.warning(f"⚠️ File path not in deletion result list: {delete_result}")
            elif isinstance(delete_result, dict):
                if delete_result.get('error'):
                    error_msg = delete_result['error']
                    logger.error(f"❌ Failed to delete file from Supabase Storage: {error_msg}")
                else:
                    # Dict without error might be success
                    deletion_success = True
                    logger.info(f"✅ Cover image deleted from Supabase Storage (dict response: {delete_result})")
            elif hasattr(delete_result, 'data'):
                # Response object with .data attribute
                if isinstance(delete_result.data, dict) and delete_result.data.get('error'):
                    error_msg = delete_result.data['error']
                    logger.error(f"❌ Failed to delete file from Supabase Storage: {error_msg}")
                elif isinstance(delete_result.data, list):
                    # Success: data is a list of deleted paths
                    deletion_success = True
                    logger.info(f"✅ Cover image deleted from Supabase Storage (Response.data list: {delete_result.data})")
                else:
                    deletion_success = True
                    logger.info(f"✅ Cover image deleted from Supabase Storage (Response.data: {delete_result.data})")
            elif hasattr(delete_result, 'status_code'):
                # HTTP Response object
                if 200 <= delete_result.status_code < 300:
                    deletion_success = True
                    logger.info(f"✅ Cover image deleted from Supabase Storage (HTTP {delete_result.status_code})")
                else:
                    logger.error(f"❌ Failed to delete file from Supabase Storage (HTTP {delete_result.status_code})")
            elif delete_result is None:
                # Some Supabase clients return None on success
                deletion_success = True
                logger.info(f"✅ Cover image deletion completed (None response, assuming success)")
            else:
                # Unknown response type - log it but don't assume success
                logger.warning(f"⚠️ Unknown delete result type: {type(delete_result)}, result: {delete_result}")
                # Try to check if it has any success indicators
                if hasattr(delete_result, 'json'):
                    try:
                        result_data = delete_result.json()
                        if isinstance(result_data, list):
                            deletion_success = True
                            logger.info(f"✅ Cover image deleted from Supabase Storage (JSON list response)")
                        elif isinstance(result_data, dict) and not result_data.get('error'):
                            deletion_success = True
                            logger.info(f"✅ Cover image deleted from Supabase Storage (JSON dict response)")
                    except:
                        pass
            
            if not deletion_success:
                error_msg = f"Failed to delete cover image from Supabase Storage. File path: {file_path}, Result: {delete_result}"
                logger.error(f"❌ {error_msg}")
                raise Exception(error_msg)
            else:
                logger.info(f"✅ Successfully deleted cover image from Supabase Storage: {file_path}")
        else:
            error_msg = f"Could not find bucket '{COMMUNITY_IMAGES_BUCKET}' in URL: {cover_image_url}"
            logger.error(f"❌ {error_msg}")
            logger.error(f"📋 URL parts: {url_parts}")
            raise Exception(error_msg)
    except Exception as e:
        logger.error(f"❌ Exception during cover image deletion: {e}", exc_info=True)
        # Re-raise the exception so the caller knows deletion failed
        raise

async def cleanup_unused_taxonomies(db: AsyncSession) -> None:
    """Delete taxonomies that are no longer assigned to any active community"""
    try:
        # Get all taxonomies that have no assignments to any active community
        # Use a subquery to find taxonomy_ids that have assignments
        assigned_taxonomy_ids_result = await db.execute(
            select(CommunityTaxonomyAssignment.taxonomy_id).distinct()
            .join(Community, CommunityTaxonomyAssignment.community_id == Community.community_id)
            .where(Community.status == 'visible')
        )
        assigned_taxonomy_ids = {row[0] for row in assigned_taxonomy_ids_result.all()}
        
        # Get all active taxonomies
        all_taxonomies_result = await db.execute(
            select(CommunityTaxonomy).where(CommunityTaxonomy.is_active == True)
        )
        all_taxonomies = all_taxonomies_result.scalars().all()
        
        # Find taxonomies that are not assigned to any active community
        unused_taxonomies = [
            t for t in all_taxonomies 
            if t.taxonomy_id not in assigned_taxonomy_ids
        ]
        
        if unused_taxonomies:
            logger.info(f"🗑️ Deleting {len(unused_taxonomies)} unused taxonomies: {[f'{t.taxonomy_type}:{t.label}' for t in unused_taxonomies]}")
            
            # Delete unused taxonomies
            # Note: ON DELETE CASCADE will automatically delete any remaining assignments (though there shouldn't be any)
            for taxonomy in unused_taxonomies:
                await db.delete(taxonomy)
            
            await db.commit()
            logger.info(f"✅ Successfully deleted {len(unused_taxonomies)} unused taxonomies")
        else:
            logger.info("✅ No unused taxonomies to clean up")
    except Exception as e:
        logger.warning(f"⚠️ Error cleaning up unused taxonomies: {e}")
        # Don't raise - cleanup failure shouldn't break the main operation
        await db.rollback()

async def delete_post_images_from_storage_for_community(db: AsyncSession, community_id: int) -> None:
    """Delete all post images from all posts in a community from Supabase Storage"""
    try:
        # Get all posts for this community
        posts_result = await db.execute(
            select(CommunityPost).where(CommunityPost.community_id == community_id)
        )
        posts = posts_result.scalars().all()
        
        if not posts:
            return
        
        # Get all attachments for all posts
        post_ids = [post.post_id for post in posts]
        attachments_result = await db.execute(
            select(CommunityPostAttachment).where(
                CommunityPostAttachment.post_id.in_(post_ids)
            )
        )
        attachments = attachments_result.scalars().all()
        
        if not attachments:
            return
        
        # Extract file paths from URLs and delete from storage
        file_paths_to_delete = []
        for attachment in attachments:
            if attachment.attachment_url:
                try:
                    # Extract the path from the Supabase public URL
                    url_parts = attachment.attachment_url.split('/')
                    if POST_IMAGES_BUCKET in url_parts:
                        bucket_index = url_parts.index(POST_IMAGES_BUCKET)
                        file_path = '/'.join(url_parts[bucket_index + 1:])
                        file_paths_to_delete.append(file_path)
                except Exception as e:
                    logger.warning(f"⚠️ Error extracting file path from URL {attachment.attachment_url}: {e}")
                    continue
        
        if file_paths_to_delete:
            logger.info(f"🗑️ Deleting {len(file_paths_to_delete)} post image(s) from community {community_id} from Supabase Storage")
            delete_result = supabase.storage.from_(POST_IMAGES_BUCKET).remove(file_paths_to_delete)
            
            # Handle delete result
            if isinstance(delete_result, dict) and delete_result.get('error'):
                error_msg = delete_result['error']
                logger.warning(f"⚠️ Failed to delete post images from Supabase Storage: {error_msg}")
            elif hasattr(delete_result, 'data') and isinstance(delete_result.data, dict) and delete_result.data.get('error'):
                error_msg = delete_result.data['error']
                logger.warning(f"⚠️ Failed to delete post images from Supabase Storage: {error_msg}")
            elif hasattr(delete_result, 'status_code') and delete_result.status_code >= 400:
                logger.warning(f"⚠️ Failed to delete post images from Supabase Storage (HTTP {delete_result.status_code})")
            else:
                logger.info(f"✅ {len(file_paths_to_delete)} post image(s) deleted from Supabase Storage")
    except Exception as e:
        logger.warning(f"⚠️ Error deleting post images from storage: {e}")
        # Continue even if storage deletion fails

async def build_community_response(
    db: AsyncSession,
    community: Community,
    user: Optional[User] = None
) -> CommunityOut:
    """Helper function to build CommunityOut response"""
    # Get member count
    member_count_result = await db.execute(
        select(func.count(CommunityMember.member_id))
        .where(and_(
            CommunityMember.community_id == community.community_id,
            CommunityMember.status == 'active'
        ))
    )
    member_count = member_count_result.scalar() or 0
    
    # Get post count
    post_count_result = await db.execute(
        select(func.count(CommunityPost.post_id))
        .where(and_(
            CommunityPost.community_id == community.community_id,
            CommunityPost.status == 'visible'
        ))
    )
    post_count = post_count_result.scalar() or 0
    
    # Get taxonomies
    taxonomy_result = await db.execute(
        select(CommunityTaxonomy)
        .join(CommunityTaxonomyAssignment, CommunityTaxonomy.taxonomy_id == CommunityTaxonomyAssignment.taxonomy_id)
        .where(CommunityTaxonomyAssignment.community_id == community.community_id)
        .where(CommunityTaxonomy.is_active == True)
        .order_by(CommunityTaxonomy.label.asc())
    )
    taxonomies = taxonomy_result.scalars().all()
    tags = [CommunityTaxonomyOut(
        taxonomy_id=t.taxonomy_id,
        taxonomy_type=t.taxonomy_type,
        label=t.label
    ) for t in taxonomies]
    
    # Get moderators
    moderators_result = await db.execute(
        select(CommunityMember)
        .where(and_(
            CommunityMember.community_id == community.community_id,
            CommunityMember.role.in_(['moderator', 'owner']),
            CommunityMember.status == 'active'
        ))
    )
    moderators_list = moderators_result.scalars().all()
    moderator_names = []
    for mod in moderators_list:
        name, _ = await get_user_name_avatar(db, mod.user_id)
        moderator_names.append(name)
    
    # Check if user is joined
    is_joined = False
    if user:
        member_check = await db.execute(
            select(CommunityMember)
            .where(and_(
                CommunityMember.community_id == community.community_id,
                CommunityMember.user_id == user.user_id,
                CommunityMember.status == 'active'
            ))
        )
        is_joined = member_check.scalar_one_or_none() is not None
    
    # Get rules
    rules = community.rules if community.rules else []
    
    # Get all members (including owner) - only return member list if user is a member
    members_out = []
    if is_joined:
        # User is a member - return full member list
        members_result = await db.execute(
            select(CommunityMember).where(and_(
                CommunityMember.community_id == community.community_id,
                CommunityMember.status == 'active'
            )).order_by(CommunityMember.joined_at.desc())
        )
        members_list = members_result.scalars().all()
        for member in members_list:
            name, avatar = await get_user_name_avatar(db, member.user_id)
            members_out.append(CommunityMemberOut(
                member_id=member.member_id,
                user_id=member.user_id,
                name=name,
                avatar=avatar,
                role=member.role,
                status=member.status,
                joined_at=format_timestamp(member.joined_at),
                last_activity_at=format_timestamp(member.last_activity_at) if member.last_activity_at else None
            ))
    # If user is not a member, members_out remains empty (privacy - don't expose member list)
    
    return CommunityOut(
        community_id=community.community_id,
        name=community.name,
        description=community.description,
        cover_image_url=community.cover_image_url,
        status=community.status,
        member_count=member_count,
        post_count=post_count,
        tags=tags,
        rules=rules,
        moderators=moderator_names,
        members=members_out,  # Empty array for non-members
        recent_posts=None,  # Can be populated if needed
        is_joined=is_joined,
        created_by=community.created_by,
        created_at=format_timestamp(community.created_at),
        updated_at=format_timestamp(community.updated_at) if community.updated_at else None
    )

# Communities endpoints
@router.get("", response_model=List[CommunityOut])
async def get_communities(
    search: Optional[str] = Query(None, description="Search term"),
    age_group: Optional[str] = Query(None, description="Filter by age group"),
    stage: Optional[str] = Query(None, description="Filter by developmental stage"),
    topics: Optional[List[str]] = Query(None, description="Filter by topics"),
    user: Optional[User] = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get list of communities with optional filters"""
    query = select(Community).where(Community.status == 'visible')
    
    # Apply search filter
    if search:
        query = query.where(
            or_(
                Community.name.ilike(f"%{search}%"),
                Community.description.ilike(f"%{search}%")
            )
        )
    
    # Apply taxonomy filters
    if age_group or stage or topics:
        # Get taxonomy IDs
        taxonomy_query = select(CommunityTaxonomy.taxonomy_id)
        if age_group:
            taxonomy_query = taxonomy_query.where(
                and_(
                    CommunityTaxonomy.taxonomy_type == 'age_group',
                    CommunityTaxonomy.label.ilike(f"%{age_group}%")
                )
            )
        if stage:
            taxonomy_query = taxonomy_query.where(
                and_(
                    CommunityTaxonomy.taxonomy_type == 'stage',
                    CommunityTaxonomy.label.ilike(f"%{stage}%")
                )
            )
        if topics:
            # Use case-insensitive comparison for topics
            from sqlalchemy import func
            taxonomy_query = taxonomy_query.where(
                and_(
                    CommunityTaxonomy.taxonomy_type == 'topic',
                    func.lower(CommunityTaxonomy.label).in_([t.lower() for t in topics])
                )
            )
        
        taxonomy_ids_result = await db.execute(taxonomy_query)
        taxonomy_ids = [row[0] for row in taxonomy_ids_result.all()]
        
        if taxonomy_ids:
            # Get communities with these taxonomies
            assignment_query = select(CommunityTaxonomyAssignment.community_id).where(
                CommunityTaxonomyAssignment.taxonomy_id.in_(taxonomy_ids)
            )
            community_ids_result = await db.execute(assignment_query)
            community_ids = [row[0] for row in community_ids_result.all()]
            
            if community_ids:
                query = query.where(Community.community_id.in_(community_ids))
            else:
                # No communities match
                return []
    
    result = await db.execute(query)
    communities = result.scalars().all()
    
    # Build response with computed fields
    response = []
    for community in communities:
        community_out = await build_community_response(db, community, user)
        response.append(community_out)
    
    return response

@router.get("/{community_id}", response_model=CommunityOut)
async def get_community_by_id(
    community_id: int,
    user: Optional[User] = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get community by ID (public access for shared links)"""
    result = await db.execute(
        select(Community).where(and_(
            Community.community_id == community_id,
            Community.status == 'visible'
        ))
    )
    community = result.scalar_one_or_none()
    
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    
    return await build_community_response(db, community, user)

@router.post("", response_model=CommunityOut)
async def create_community(
    community_data: CommunityIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Create a new community"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Create community (using numeric ID for URLs, consistent with resources)
    new_community = Community(
        name=community_data.name,
        description=community_data.description,
        cover_image_url=community_data.cover_image_url,
        rules=community_data.rules or [],
        status='visible',
        created_by=user.user_id
    )
    db.add(new_community)
    await db.flush()
    
    # Add creator as owner
    owner_member = CommunityMember(
        community_id=new_community.community_id,
        user_id=user.user_id,
        role='owner',
        status='active'
    )
    db.add(owner_member)
    
    # Handle taxonomies
    all_taxonomy_labels = []
    if community_data.topics:
        all_taxonomy_labels.extend([('topic', t) for t in community_data.topics])
    if community_data.age_groups:
        all_taxonomy_labels.extend([('age_group', a) for a in community_data.age_groups])
    if community_data.stages:
        all_taxonomy_labels.extend([('stage', s) for s in community_data.stages])
    
    for taxonomy_type, label in all_taxonomy_labels:
        # Find or create taxonomy
        taxonomy_result = await db.execute(
            select(CommunityTaxonomy).where(and_(
                CommunityTaxonomy.taxonomy_type == taxonomy_type,
                CommunityTaxonomy.label.ilike(label)
            ))
        )
        taxonomy = taxonomy_result.scalar_one_or_none()
        
        if not taxonomy:
            # Create new taxonomy (custom taxonomy)
            taxonomy = CommunityTaxonomy(
                taxonomy_type=taxonomy_type,
                label=label,
                is_active=True,
                created_by=user.user_id
            )
            db.add(taxonomy)
            await db.flush()
        
        # Create assignment
        assignment = CommunityTaxonomyAssignment(
            community_id=new_community.community_id,
            taxonomy_id=taxonomy.taxonomy_id,
            created_by=user.user_id
        )
        db.add(assignment)
    
    # Handle moderators (by email/username)
    if community_data.moderators:
        for moderator_email in community_data.moderators:
            # Find user by email
            user_result = await db.execute(
                select(User).where(User.email.ilike(moderator_email.strip()))
            )
            moderator_user = user_result.scalar_one_or_none()
            
            if moderator_user:
                # Add as moderator
                mod_member = CommunityMember(
                    community_id=new_community.community_id,
                    user_id=moderator_user.user_id,
                    role='moderator',
                    status='active'
                )
                db.add(mod_member)
    
    await db.commit()
    await db.refresh(new_community)
    
    return await build_community_response(db, new_community, user)

@router.put("/{community_id}", response_model=CommunityOut)
async def update_community(
    community_id: int,
    community_data: CommunityIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Update community (owner/moderator only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    community = await db.get(Community, community_id)
    if not community or community.status != 'visible':
        raise HTTPException(status_code=404, detail="Community not found")
    
    # Check permissions
    member_result = await db.execute(
        select(CommunityMember).where(and_(
            CommunityMember.community_id == community_id,
            CommunityMember.user_id == user.user_id,
            CommunityMember.status == 'active'
        ))
    )
    member = member_result.scalar_one_or_none()
    
    if not member or member.role not in ['owner', 'moderator']:
        raise HTTPException(status_code=403, detail="Only owner or moderator can edit community")
    
    # Update fields (only owner can change name)
    if member.role == 'owner':
        community.name = community_data.name
    
    community.description = community_data.description
    # Handle cover_image_url: update, delete, or preserve
    # Get the raw dict to check if cover_image_url was explicitly provided
    # Frontend sends: null (delete), string (update), or omits field (preserve)
    community_data_dict = community_data.model_dump(exclude_unset=True)
    
    if 'cover_image_url' in community_data_dict:
        # Field was explicitly provided in request
        if community_data_dict['cover_image_url'] is None:
            # Explicitly set to None/null - delete existing image from storage
            if community.cover_image_url:
                # Use the helper function to delete from storage
                # If deletion fails, we still update the database (orphaned file in storage)
                try:
                    await delete_community_cover_image_from_storage(community.cover_image_url)
                except Exception as e:
                    logger.error(f"❌ Failed to delete cover image from storage, but continuing with database update: {e}")
                    # Continue with database update even if storage deletion fails
                    # The file will remain in storage but won't be referenced in the database
            
            community.cover_image_url = None
        elif community_data_dict['cover_image_url']:
            # Update with new URL (non-empty string)
            community.cover_image_url = community_data_dict['cover_image_url']
    # If cover_image_url is not in community_data_dict, preserve existing (don't change)
    community.rules = community_data.rules or []
    # Manually update updated_at timestamp
    community.updated_at = datetime.now()
    
    # Update taxonomies (remove old, add new)
    # Always process taxonomies - frontend should always send them (even if empty)
    await db.execute(
        text("DELETE FROM community_taxonomy_assignments WHERE community_id = :community_id"),
        {"community_id": community_id}
    )
    
    # Add new taxonomies (similar to create)
    all_taxonomy_labels = []
    if community_data.topics:
        all_taxonomy_labels.extend([('topic', t.strip()) for t in community_data.topics if t and t.strip()])
    if community_data.age_groups:
        all_taxonomy_labels.extend([('age_group', a.strip()) for a in community_data.age_groups if a and a.strip()])
    if community_data.stages:
        all_taxonomy_labels.extend([('stage', s.strip()) for s in community_data.stages if s and s.strip()])
    
    for taxonomy_type, label in all_taxonomy_labels:
        # Try exact match first (case-insensitive), then create if not found
        taxonomy_result = await db.execute(
            select(CommunityTaxonomy).where(and_(
                CommunityTaxonomy.taxonomy_type == taxonomy_type,
                func.lower(CommunityTaxonomy.label) == func.lower(label)
            ))
        )
        taxonomy = taxonomy_result.scalar_one_or_none()
        
        if not taxonomy:
            # Create new taxonomy (custom taxonomy)
            taxonomy = CommunityTaxonomy(
                taxonomy_type=taxonomy_type,
                label=label,
                is_active=True,
                created_by=user.user_id
            )
            db.add(taxonomy)
            await db.flush()
        
        # Create assignment
        assignment = CommunityTaxonomyAssignment(
            community_id=community_id,
            taxonomy_id=taxonomy.taxonomy_id,
            created_by=user.user_id
        )
        db.add(assignment)
    
    # Handle moderators update (similar to create_community)
    if community_data.moderators is not None:
        # Get current moderators (excluding owner)
        current_moderators_result = await db.execute(
            select(CommunityMember).where(and_(
                CommunityMember.community_id == community_id,
                CommunityMember.role == 'moderator',
                CommunityMember.status == 'active'
            ))
        )
        current_moderators = current_moderators_result.scalars().all()
        current_moderator_user_ids = {m.user_id for m in current_moderators}
        
        # Normalize new moderator emails (lowercase, strip)
        new_moderator_emails = {email.strip().lower() for email in community_data.moderators if email and email.strip()}
        
        # Find users for new moderators
        new_moderator_user_ids = set()
        if new_moderator_emails:
            users_result = await db.execute(
                select(User).where(func.lower(User.email).in_(new_moderator_emails))
            )
            found_users = users_result.scalars().all()
            new_moderator_user_ids = {u.user_id for u in found_users}
        
        # Remove moderators that are no longer in the list
        # Change their role from 'moderator' to 'member' (don't remove membership)
        moderators_to_remove = current_moderator_user_ids - new_moderator_user_ids
        if moderators_to_remove:
            for moderator_user_id in moderators_to_remove:
                # Find the member record
                member_result = await db.execute(
                    select(CommunityMember).where(and_(
                        CommunityMember.community_id == community_id,
                        CommunityMember.user_id == moderator_user_id,
                        CommunityMember.status == 'active'
                    ))
                )
                member_record = member_result.scalar_one_or_none()
                if member_record:
                    # Change role from 'moderator' to 'member'
                    member_record.role = 'member'
        
        # Add new moderators
        moderators_to_add = new_moderator_user_ids - current_moderator_user_ids
        # Also exclude owner from being added as moderator (owner is already a moderator by default)
        if community.created_by:
            moderators_to_add.discard(community.created_by)
        
        if moderators_to_add:
            for moderator_user_id in moderators_to_add:
                # Check if user is already a member
                existing_member_result = await db.execute(
                    select(CommunityMember).where(and_(
                        CommunityMember.community_id == community_id,
                        CommunityMember.user_id == moderator_user_id
                    ))
                )
                existing_member = existing_member_result.scalar_one_or_none()
                
                if existing_member:
                    # Update existing member to moderator
                    if existing_member.status == 'left':
                        # Rejoin as moderator
                        existing_member.status = 'active'
                    existing_member.role = 'moderator'
                else:
                    # Add as new moderator member
                    mod_member = CommunityMember(
                        community_id=community_id,
                        user_id=moderator_user_id,
                        role='moderator',
                        status='active'
                    )
                    db.add(mod_member)
    
    await db.commit()
    await db.refresh(community)
    
    # Clean up unused taxonomies after updating assignments
    await cleanup_unused_taxonomies(db)
    
    return await build_community_response(db, community, user)

@router.delete("/{community_id}")
async def delete_community(
    community_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Delete community (owner only) - hard delete with CASCADE cleanup"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    community = await db.get(Community, community_id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    
    # Check if user is owner
    if community.created_by != user.user_id:
        raise HTTPException(status_code=403, detail="Only owner can delete community")
    
    # Delete cover image from Supabase Storage
    await delete_community_cover_image_from_storage(community.cover_image_url)
    
    # Delete all post images from this community's posts before CASCADE deletion
    await delete_post_images_from_storage_for_community(db, community_id)
    
    # Hard delete: Delete the community record from database
    # Note: Due to ON DELETE CASCADE constraints, this will automatically delete:
    # - community_taxonomy_assignments (via FK constraint)
    # - community_members (via FK constraint)
    # - community_posts (via FK constraint, which cascades to all post-related data)
    # - community_post_comments (via community FK)
    # - reports (via FK constraint)
    # - notifications (via FK constraint)
    await db.delete(community)
    await db.commit()
    
    # Clean up unused taxonomies after community deletion
    # (assignments were auto-deleted via CASCADE, so check for orphaned taxonomies)
    await cleanup_unused_taxonomies(db)
    
    return {"message": "Community deleted successfully"}

@router.post("/{community_id}/join")
async def join_community(
    community_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Join a community"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    community = await db.get(Community, community_id)
    if not community or community.status != 'visible':
        raise HTTPException(status_code=404, detail="Community not found")
    
    # Check if already a member
    existing = await db.execute(
        select(CommunityMember).where(and_(
            CommunityMember.community_id == community_id,
            CommunityMember.user_id == user.user_id
        ))
    )
    member = existing.scalar_one_or_none()
    
    is_new_member = False
    is_rejoining = False
    if member:
        if member.status == 'active':
            raise HTTPException(status_code=400, detail="Already a member")
        else:
            # Reactivate - user is rejoining
            is_rejoining = True
            member.status = 'active'
            member.joined_at = datetime.now()
    else:
        # Create new membership
        is_new_member = True
        member = CommunityMember(
            community_id=community_id,
            user_id=user.user_id,
            role='member',
            status='active'
        )
        db.add(member)
    
    # Create notifications for owners/moderators if this is a new member OR rejoining
    # Do this BEFORE commit so everything is in the same transaction
    if is_new_member or is_rejoining:
        try:
            notifications = await create_community_joined_notification(db, community_id, user.user_id)
            if notifications:
                logger.info(f"Created {len(notifications)} community_joined notification(s) for community {community_id} ({'new member' if is_new_member else 'rejoining'})")
            else:
                logger.warning(f"No notifications created for community {community_id} - no owners/moderators found or joiner is owner/moderator")
        except Exception as e:
            logger.error(f"Error creating community_joined notification: {e}")
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to join community: {str(e)}")
    
    # Commit everything together (membership + notifications)
    await db.commit()
    
    return {"message": "Joined community successfully"}

@router.delete("/{community_id}/leave")
async def leave_community(
    community_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Leave a community"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Check if user is owner
    community = await db.get(Community, community_id)
    if community and community.created_by == user.user_id:
        raise HTTPException(status_code=400, detail="Owner cannot leave community. Delete it instead.")
    
    member_result = await db.execute(
        select(CommunityMember).where(and_(
            CommunityMember.community_id == community_id,
            CommunityMember.user_id == user.user_id,
            CommunityMember.status == 'active'
        ))
    )
    member = member_result.scalar_one_or_none()
    
    if not member:
        raise HTTPException(status_code=404, detail="Not a member of this community")
    
    member.status = 'left'
    await db.commit()
    
    return {"message": "Left community successfully"}

@router.get("/{community_id}/members", response_model=List[CommunityMemberOut])
async def get_community_members(
    community_id: int,
    search: Optional[str] = Query(None, description="Search members by name"),
    user: Optional[User] = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get community members"""
    community = await db.get(Community, community_id)
    if not community or community.status != 'visible':
        raise HTTPException(status_code=404, detail="Community not found")
    
    query = select(CommunityMember).where(and_(
        CommunityMember.community_id == community_id,
        CommunityMember.status == 'active'
    ))
    
    if search:
        # This would need a join with users table for name search
        # For now, return all members
        pass
    
    result = await db.execute(query.order_by(CommunityMember.joined_at.desc()))
    members = result.scalars().all()
    
    response = []
    for member in members:
        name, avatar = await get_user_name_avatar(db, member.user_id)
        response.append(CommunityMemberOut(
            member_id=member.member_id,
            user_id=member.user_id,
            name=name,
            avatar=avatar,
            role=member.role,
            status=member.status,
            joined_at=format_timestamp(member.joined_at),
            last_activity_at=format_timestamp(member.last_activity_at) if member.last_activity_at else None
        ))
    
    return response

@router.get("/taxonomies/all", response_model=List[CommunityTaxonomyOut])
async def get_all_taxonomies(
    taxonomy_type: Optional[str] = Query(None, description="Filter by type: age_group, stage, topic"),
    only_in_use: Optional[bool] = Query(False, description="Only return taxonomies assigned to at least one active community"),
    db: AsyncSession = Depends(get_session)
):
    """Get all taxonomies (for filter dropdowns)"""
    query = select(CommunityTaxonomy).where(CommunityTaxonomy.is_active == True)
    
    if taxonomy_type:
        query = query.where(CommunityTaxonomy.taxonomy_type == taxonomy_type)
    
    # If only_in_use is True, only return taxonomies that are assigned to at least one active community
    if only_in_use:
        query = query.join(
            CommunityTaxonomyAssignment,
            CommunityTaxonomy.taxonomy_id == CommunityTaxonomyAssignment.taxonomy_id
        ).join(
            Community,
            CommunityTaxonomyAssignment.community_id == Community.community_id
        ).where(
            Community.status == 'visible'
        ).distinct()
    
    query = query.order_by(CommunityTaxonomy.label.asc())
    
    result = await db.execute(query)
    taxonomies = result.scalars().all()
    
    return [CommunityTaxonomyOut(
        taxonomy_id=t.taxonomy_id,
        taxonomy_type=t.taxonomy_type,
        label=t.label
    ) for t in taxonomies]

@router.get("/users/search")
async def search_users(
    query: str = Query(..., description="Search by email or username"),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Search users by email or username (for moderator assignment)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Search by email
    users_result = await db.execute(
        select(User).where(User.email.ilike(f"%{query}%")).limit(10)
    )
    users = users_result.scalars().all()
    
    # Also search by profile name
    profiles_result = await db.execute(
        select(ParentProfile, User).join(User, ParentProfile.user_id == User.user_id)
        .where(or_(
            ParentProfile.first_name.ilike(f"%{query}%"),
            ParentProfile.last_name.ilike(f"%{query}%")
        )).limit(10)
    )
    profile_users = profiles_result.all()
    
    response = []
    seen_user_ids = set()
    
    for user_obj in users:
        if user_obj.user_id not in seen_user_ids:
            name, avatar = await get_user_name_avatar(db, user_obj.user_id)
            response.append({
                "user_id": user_obj.user_id,
                "email": user_obj.email,
                "name": name,
                "avatar": avatar
            })
            seen_user_ids.add(user_obj.user_id)
    
    for profile, user_obj in profile_users:
        if user_obj.user_id not in seen_user_ids:
            name, avatar = await get_user_name_avatar(db, user_obj.user_id)
            response.append({
                "user_id": user_obj.user_id,
                "email": user_obj.email,
                "name": name,
                "avatar": avatar
            })
            seen_user_ids.add(user_obj.user_id)
    
    return {"users": response}

@router.post("/upload-cover-image")
async def upload_community_cover_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Upload a cover image for a community using Supabase Storage"""
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
        
        # Get file extension for fallback validation
        file_extension = Path(file.filename).suffix.lower() if file.filename else ""
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        
        # Validate: check content_type first, fallback to file extension if content_type is missing
        is_valid = False
        if file.content_type:
            is_valid = file.content_type in allowed_types
        elif file_extension:
            is_valid = file_extension in allowed_extensions
        
        if not is_valid:
            raise HTTPException(status_code=400, detail="Only images are allowed (JPEG, PNG, GIF, WebP)")
        
        # Read file content
        content = await file.read()
        
        # Generate unique filename with proper extension
        file_extension = Path(file.filename).suffix if file.filename else ""
        if not file_extension:
            if file.content_type.startswith('image/'):
                file_extension = '.jpg' if 'jpeg' in file.content_type else '.png'
        
        unique_filename = f"covers/{user.user_id}/{uuid.uuid4()}{file_extension}"
        
        logger.info(f"🔄 Uploading community cover image to Supabase Storage...")
        logger.info(f"📦 Bucket: {COMMUNITY_IMAGES_BUCKET}, Filename: {unique_filename}")
        
        try:
            upload_result = supabase.storage.from_(COMMUNITY_IMAGES_BUCKET).upload(
                unique_filename,
                content,
                file_options={"content-type": file.content_type, "upsert": "true"}
            )
            
            # Check for errors - upload_result can be a dict, response object, or None
            if upload_result is None:
                raise HTTPException(status_code=500, detail="Upload returned no result")
            
            # If it's a dict, check for error
            if isinstance(upload_result, dict):
                if upload_result.get('error'):
                    error_msg = upload_result['error']
                    logger.error(f"❌ Upload failed: {error_msg}")
                    
                    # Provide helpful error message for RLS errors
                    if 'row-level security' in str(error_msg).lower() or 'unauthorized' in str(error_msg).lower():
                        raise HTTPException(
                            status_code=500,
                            detail="Storage upload failed due to RLS policy. Please ensure SUPABASE_SERVICE_ROLE_KEY (not SUPABASE_KEY) is set in your backend .env file and restart the backend server."
                        )
                    raise HTTPException(status_code=500, detail=f"Failed to upload to storage: {error_msg}")
            
            # If it's a response object, check if it has error data
            if hasattr(upload_result, 'data') and isinstance(upload_result.data, dict) and upload_result.data.get('error'):
                error_msg = upload_result.data['error']
                logger.error(f"❌ Upload failed: {error_msg}")
                raise HTTPException(status_code=500, detail=f"Failed to upload to storage: {error_msg}")
                
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
            public_url = supabase.storage.from_(COMMUNITY_IMAGES_BUCKET).get_public_url(unique_filename)
            
            # Handle if it's a dict with 'publicUrl' key or a string
            if isinstance(public_url, dict):
                public_url = public_url.get('publicUrl') or public_url.get('public_url')
            elif not isinstance(public_url, str):
                # If it's not a string or dict, convert to string
                public_url = str(public_url)
            
            if not public_url or public_url == 'None':
                raise HTTPException(status_code=500, detail="Failed to get public URL from storage")
        except Exception as url_exception:
            logger.error(f"❌ Failed to get public URL: {url_exception}")
            raise HTTPException(status_code=500, detail=f"Failed to get public URL from storage: {str(url_exception)}")
        
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
        logger.error(f"Error uploading community cover image: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload community cover image: {str(e)}")

