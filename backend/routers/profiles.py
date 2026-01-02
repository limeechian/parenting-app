# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: profiles.py
# Description: To handle profile management endpoints for parent, child, and professional user profiles
# First Written on: Wednesday, 01-Oct-2025
# Edited on: Sunday, 10-Dec-2025

"""
Profile router - Handles parent, child, and professional profile management

This router provides endpoints for:
- Parent profiles (CRUD operations, statistics, recent activity)
- Child profiles (CRUD operations)
- Professional profiles (CRUD, document uploads, services, image uploads)
- Saved professionals (for parent users)

All endpoints require authentication and enforce ownership/role-based access control.
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, date
from pathlib import Path
import json
import uuid
from typing import List, Optional

from dependencies import get_current_user_flexible, get_session
from models.database import (
    User, ParentProfile, ChildProfile, ProfessionalProfile, ProfessionalDocument,
    ProfessionalService, AiConversation, DiaryEntry, CommunityMember, SavedProfessional,
    SavedResource, CommunityPost, CommunityPostComment, Resource
)
from schemas.schemas import (
    ParentProfileIn, ChildProfileIn, ProfessionalProfileIn,
    ProfessionalDocumentIn, ProfessionalServiceIn
)
from utils.helpers import normalize_string_array
from config import (
    CORS_ORIGINS, logger, supabase, PROFESSIONAL_DOCUMENTS_BUCKET,
    PROFESSIONAL_PROFILE_IMAGES_BUCKET
)

# Initialize router with prefix and tags for API documentation
router = APIRouter(prefix="/profile", tags=["profiles"])

# ============================================================================
# Parent Profile Endpoints
# ============================================================================

@router.get("/parent")
async def get_parent_profile(
    request: Request,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Get parent profile
    
    Retrieves the parent profile for the authenticated user.
    Returns all profile fields including personal information, parenting style,
    and preferences.
    
    Args:
        request: FastAPI Request object (for CORS headers)
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        Response: JSON response with parent profile data and CORS headers
    
    Raises:
        HTTPException:
            - 404 if parent profile not found
    """
    print(f"Getting parent profile for user {user.user_id} ({user.email})")
    result = await db.execute(select(ParentProfile).where(ParentProfile.user_id == user.user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")
    
    response_data = {
        key: value.isoformat() if isinstance(value, (datetime, date)) else value
        for key, value in profile.__dict__.items()
        if not key.startswith('_')
    }
    response = Response(content=json.dumps(response_data), media_type="application/json")
    
    origin = request.headers.get("origin")
    if origin in CORS_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        response.headers["Access-Control-Allow-Origin"] = CORS_ORIGINS[0]
    
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept, Accept-Language, Accept-Encoding, Referer, Origin"
    response.headers["Access-Control-Expose-Headers"] = "*"
    
    return response

@router.post("/parent")
async def create_or_update_parent_profile(
    profile: ParentProfileIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Create or update parent profile
    
    Creates a new parent profile if one doesn't exist, or updates the existing one.
    Handles date parsing and field updates.
    
    Args:
        profile: Parent profile data (from request body)
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Updated parent profile data
    
    Raises:
        HTTPException: If profile update fails
    """
    profile_data = profile.dict(exclude_unset=True)
    
    if "birthdate" in profile_data:
        if profile_data["birthdate"] and profile_data["birthdate"].strip():
            try:
                profile_data["birthdate"] = datetime.strptime(profile_data["birthdate"], "%Y-%m-%d").date()
            except ValueError:
                profile_data["birthdate"] = None
        else:
            profile_data["birthdate"] = None
    
    result = await db.execute(select(ParentProfile).where(ParentProfile.user_id == user.user_id))
    existing = result.scalar_one_or_none()
    if existing:
        for k, v in profile_data.items():
            setattr(existing, k, v)
        existing.updated_by = user.user_id
        existing.updated_at = datetime.now()
        db.add(existing)
        await db.commit()
        await db.refresh(existing)
    else:
        new_profile = ParentProfile(user_id=user.user_id, updated_by=user.user_id, **profile_data)
        db.add(new_profile)
        await db.commit()
        await db.refresh(new_profile)
    
    result = await db.execute(select(ParentProfile).where(ParentProfile.user_id == user.user_id))
    updated_profile = result.scalar_one_or_none()
    return updated_profile.__dict__ if updated_profile else {}

@router.get("/parent/stats")
async def get_parent_stats(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Get parent dashboard statistics
    
    Retrieves aggregated statistics for the parent's dashboard, including:
    - Number of children
    - Number of AI conversations
    - Number of saved resources
    - Number of diary entries
    - Number of communities joined
    - Days active (calculated from earliest activity)
    
    Args:
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Statistics dictionary with counts and days_active
    
    Raises:
        HTTPException: If statistics retrieval fails
    """
    try:
        # Count children
        children_result = await db.execute(
            select(func.count(ChildProfile.child_id))
            .where(ChildProfile.user_id == user.user_id)
        )
        children_count = children_result.scalar() or 0
        
        # Count AI conversations (only active ones, exclude soft-deleted)
        conversations_result = await db.execute(
            select(func.count(AiConversation.conversation_id))
            .where(
                AiConversation.user_id == user.user_id,
                AiConversation.is_active == True
            )
        )
        conversations_count = conversations_result.scalar() or 0
        
        # Count saved resources
        resources_result = await db.execute(
            select(func.count(SavedResource.saved_id))
            .where(SavedResource.user_id == user.user_id)
        )
        resources_count = resources_result.scalar() or 0
        
        # Count diary entries
        diary_result = await db.execute(
            select(func.count(DiaryEntry.entry_id))
            .where(DiaryEntry.user_id == user.user_id)
        )
        diary_count = diary_result.scalar() or 0
        
        # Count communities joined
        communities_result = await db.execute(
            select(func.count(CommunityMember.member_id))
            .where(CommunityMember.user_id == user.user_id)
        )
        communities_count = communities_result.scalar() or 0
        
        # Calculate Days Active - earliest activity from diary entries, AI conversations, or user registration
        # Get earliest diary entry date
        earliest_diary = await db.execute(
            select(func.min(DiaryEntry.created_at))
            .where(DiaryEntry.user_id == user.user_id)
        )
        earliest_diary_date = earliest_diary.scalar()
        
        # Get earliest AI conversation date
        earliest_conversation = await db.execute(
            select(func.min(AiConversation.created_at))
            .where(AiConversation.user_id == user.user_id)
        )
        earliest_conversation_date = earliest_conversation.scalar()
        
        # Get user registration date
        user_created_date = user.created_at if hasattr(user, 'created_at') else None
        
        # Find the earliest date among all activities
        dates = [d for d in [earliest_diary_date, earliest_conversation_date, user_created_date] if d is not None]
        
        if dates:
            earliest_date = min(dates)
            if isinstance(earliest_date, datetime):
                # Handle timezone-aware datetime
                now = datetime.now(earliest_date.tzinfo) if earliest_date.tzinfo else datetime.now()
                days_active = max(1, (now - earliest_date).days + 1)
            else:
                # Handle date object
                days_active = max(1, (date.today() - earliest_date).days + 1)
        else:
            days_active = 0
        
        return {
            "days_active": days_active,
            "children_count": children_count,
            "conversations_count": conversations_count,
            "diary_entries_count": diary_count,
            "communities_joined_count": communities_count,
            "resources_count": resources_count
        }
    except Exception as e:
        logger.error(f"Error getting parent stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")

@router.get("/parent/recent-activity")
async def get_parent_recent_activity(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session),
    limit: int = 5
):
    """
    Get recent activity for parent profile
    
    Retrieves recent activities across different features:
    - Recent diary entries
    - Recent AI conversations
    - Recent saved resources
    - Recent community posts
    
    Activities are sorted by timestamp (most recent first) and limited.
    
    Args:
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
        limit: Maximum number of activities to return (default: 5)
    
    Returns:
        dict: Dictionary with 'activities' list containing activity objects
    
    Raises:
        HTTPException: If activity retrieval fails
    """
    try:
        logger.info(f"Fetching recent activity for user {user.user_id}, limit={limit}")
        activities = []
        
        # Get recent diary entries
        diary_result = await db.execute(
            select(DiaryEntry)
            .where(DiaryEntry.user_id == user.user_id)
            .order_by(DiaryEntry.created_at.desc())
            .limit(limit)
        )
        diary_entries = diary_result.scalars().all()
        
        for entry in diary_entries:
            activities.append({
                "type": "diary_entry",
                "id": entry.entry_id,
                "title": entry.title or "Diary Entry",
                "description": f"Created diary entry: {entry.entry_type}",
                "timestamp": entry.created_at.isoformat() if entry.created_at else None,
                "icon": "check"
            })
        
        # Get recent AI conversations (only active ones, exclude soft-deleted)
        # Select only needed columns to avoid array type issues
        conversation_result = await db.execute(
            select(
                AiConversation.conversation_id,
                AiConversation.title,
                AiConversation.started_at
            )
            .where(
                AiConversation.user_id == user.user_id,
                AiConversation.is_active == True
            )
            .order_by(AiConversation.started_at.desc())
            .limit(limit)
        )
        conversations = conversation_result.all()
        
        for conv_id, title, started_at in conversations:
            activities.append({
                "type": "ai_chat",
                "id": conv_id,
                "title": title or "AI Chat",
                "description": f"Asked AI about {title or 'parenting'}" if title else "Started AI conversation",
                "timestamp": started_at.isoformat() if started_at else None,
                "icon": "message-circle"
            })
        
        # Get recent saved resources
        saved_resource_result = await db.execute(
            select(SavedResource)
            .where(SavedResource.user_id == user.user_id)
            .order_by(SavedResource.saved_at.desc())
            .limit(limit)
        )
        saved_resources = saved_resource_result.scalars().all()
        
        for saved in saved_resources:
            # Get the resource title for better display
            try:
                resource = await db.get(Resource, saved.resource_id)
                resource_title = resource.title if resource else "Resource"
            except Exception as e:
                logger.warning(f"Resource {saved.resource_id} not found for saved_resource {saved.saved_id}: {e}")
                resource_title = "Resource (deleted)"
            
            activities.append({
                "type": "saved_resource",
                "id": saved.saved_id,
                "title": resource_title,
                "description": f"Saved resource: {resource_title}",
                "timestamp": saved.saved_at.isoformat() if saved.saved_at else None,
                "icon": "bookmark"
            })
        
        # Get recent community posts
        post_result = await db.execute(
            select(CommunityPost)
            .where(CommunityPost.author_user_id == user.user_id)
            .order_by(CommunityPost.created_at.desc())
            .limit(limit)
        )
        posts = post_result.scalars().all()
        
        for post in posts:
            activities.append({
                "type": "community_post",
                "id": post.post_id,
                "title": post.title,
                "description": f"Posted in community",
                "timestamp": post.created_at.isoformat() if post.created_at else None,
                "icon": "users"
            })
        
        # Sort all activities by timestamp (most recent first) and limit
        # Handle None timestamps by using a far future date for sorting
        activities.sort(key=lambda x: x["timestamp"] if x["timestamp"] else "9999-12-31T23:59:59", reverse=True)
        activities = activities[:limit]
        
        return {
            "activities": activities
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Error getting recent activity: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to get recent activity: {str(e)}")

# ============================================================================
# Child Profile Endpoints
# ============================================================================

@router.get("/children")
async def get_children_profiles(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Get all children profiles for user
    
    Retrieves all child profiles associated with the authenticated parent user.
    
    Args:
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        List[dict]: List of child profile dictionaries with serialized dates
    
    Raises:
        HTTPException: If retrieval fails
    """
    print(f"Getting children for user {user.user_id} ({user.email})")
    result = await db.execute(select(ChildProfile).where(ChildProfile.user_id == user.user_id))
    children = result.scalars().all()
    
    def serialize(child):
        d = child.__dict__.copy()
        if isinstance(d.get("birthdate"), date):
            d["birthdate"] = d["birthdate"].isoformat()
        d["id"] = d.get("child_id")
        return d
    
    serialized_children = [serialize(c) for c in children]
    return serialized_children

@router.post("/children")
async def add_child_profile(
    child: ChildProfileIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Add a new child profile
    
    Creates a new child profile for the authenticated parent user.
    Handles date parsing and array field normalization.
    
    Args:
        child: Child profile data (from request body)
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Created child profile data with serialized dates
    
    Raises:
        HTTPException: If child profile creation fails
    """
    child_data = child.dict()
    
    if "birthdate" in child_data:
        if child_data["birthdate"] and child_data["birthdate"].strip():
            try:
                child_data["birthdate"] = datetime.strptime(child_data["birthdate"], "%Y-%m-%d").date()
            except ValueError:
                child_data["birthdate"] = None
        else:
            child_data["birthdate"] = None
    
    for field in ["interests", "characteristics", "special_considerations", "current_challenges"]:
        if field in child_data:
            child_data[field] = normalize_string_array(child_data[field])

    new_child = ChildProfile(user_id=user.user_id, updated_by=user.user_id, **child_data)
    db.add(new_child)
    await db.commit()
    await db.refresh(new_child)
    
    d = new_child.__dict__.copy()
    if isinstance(d.get("birthdate"), date):
        d["birthdate"] = d["birthdate"].isoformat()
    d["id"] = d.get("child_id")
    return d

@router.put("/children/{child_id}")
async def update_child_profile(
    child_id: int,
    child: ChildProfileIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Update a child profile
    
    Updates an existing child profile. Verifies ownership before allowing update.
    Handles date parsing, array normalization, and empty string handling.
    
    Args:
        child_id: ID of the child profile to update
        child: Updated child profile data (from request body)
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Updated child profile data with serialized dates
    
    Raises:
        HTTPException:
            - 404 if child profile not found or user doesn't own it
            - 500 if update fails
    """
    try:
        result = await db.execute(select(ChildProfile).where(ChildProfile.child_id == child_id, ChildProfile.user_id == user.user_id))
        existing = result.scalar_one_or_none()
        if not existing:
            raise HTTPException(status_code=404, detail="Child not found")
        
        child_data = child.dict()
        
        if "birthdate" in child_data:
            if child_data["birthdate"] and child_data["birthdate"].strip():
                try:
                    child_data["birthdate"] = datetime.strptime(child_data["birthdate"], "%Y-%m-%d").date()
                except ValueError:
                    child_data["birthdate"] = None
            else:
                child_data["birthdate"] = None
        
        if child_data.get("special_notes", "").strip() == "":
            child_data["special_notes"] = None
        
        for field in ["interests", "characteristics", "special_considerations", "current_challenges"]:
            if field in child_data:
                child_data[field] = normalize_string_array(child_data[field])

        for k, v in child_data.items():
            setattr(existing, k, v)
        
        existing.updated_by = user.user_id
        existing.updated_at = datetime.now()
        db.add(existing)
        await db.commit()
        await db.refresh(existing)
        
        d = existing.__dict__.copy()
        if isinstance(d.get("birthdate"), date):
            d["birthdate"] = d["birthdate"].isoformat()
        d["id"] = d.get("child_id")
        
        return d
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update child: {str(e)}")

@router.delete("/children/{child_id}")
async def delete_child_profile(
    child_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Delete a child profile
    
    Permanently deletes a child profile. Verifies ownership before deletion.
    
    Args:
        child_id: ID of the child profile to delete
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Deletion confirmation with status
    
    Raises:
        HTTPException:
            - 404 if child profile not found or user doesn't own it
            - 500 if deletion fails
    """
    try:
        print(f"DELETE request - child_id: {child_id}, user_id: {user.user_id}")
        result = await db.execute(select(ChildProfile).where(ChildProfile.child_id == child_id, ChildProfile.user_id == user.user_id))
        existing = result.scalar_one_or_none()
        if not existing:
            raise HTTPException(status_code=404, detail="Child not found")
        await db.delete(existing)
        await db.commit()
        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting child: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete child: {str(e)}")

# ============================================================================
# Professional Profile Endpoints
# ============================================================================

@router.get("/professional")
async def get_professional_profile(
    user: User = Depends(get_current_user_flexible), 
    db: AsyncSession = Depends(get_session)
):
    """
    Get professional profile for the logged-in user
    
    Retrieves the professional profile and associated documents for the authenticated user.
    Generates signed URLs for documents stored in private Supabase bucket.
    
    Args:
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Dictionary with:
            - profile: Professional profile data
            - documents: List of documents with signed URLs
    
    Raises:
        HTTPException: If profile retrieval fails
    """
    try:
        result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.user_id == user.user_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            return {"profile": None, "documents": []}
        
        docs_result = await db.execute(
            select(ProfessionalDocument).where(ProfessionalDocument.profile_id == profile.professional_id)
        )
        documents = docs_result.scalars().all()
        
        profile_dict = {
            "professional_id": profile.professional_id,
            "user_id": profile.user_id,
            "business_name": profile.business_name,
            "professional_type": profile.professional_type,
            "years_experience": profile.years_experience,
            "qualifications": profile.qualifications,
            "certifications": profile.certifications,
            "specializations": profile.specializations,
            # Filter fields for Professional Directory
            "target_developmental_stages": profile.target_developmental_stages or [],
            "languages": profile.languages or [],
            "availability": profile.availability or [],
            # Structured address fields
            "address_line": profile.address_line,
            "city": profile.city,
            "state": profile.state,
            "postcode": profile.postcode,
            "country": profile.country,
            # Google Maps integration
            "google_maps_url": profile.google_maps_url,
            "contact_email": profile.contact_email,
            "contact_phone": profile.contact_phone,
            "website_url": profile.website_url,
            "bio": profile.bio,
            "profile_image_url": profile.profile_image_url,
            "profile_status": profile.profile_status,
            "rejection_reason": profile.rejection_reason,
            "created_at": profile.created_at.isoformat() if profile.created_at else None,
            "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
        }
        
        # Generate signed URLs for documents (private bucket requires signed URLs)
        documents_list = []
        for doc in documents:
            # Generate signed URL for each document (expires in 1 hour)
            signed_url = doc.file_path  # Default to stored path
            try:
                if doc.file_path and not doc.file_path.startswith('http'):
                    # If file_path is a relative path (not already a URL), generate signed URL
                    signed_url_response = supabase.storage.from_(PROFESSIONAL_DOCUMENTS_BUCKET).create_signed_url(
                        doc.file_path,
                        expires_in=3600  # 1 hour expiration
                    )
                    
                    # Extract signed URL from response
                    if isinstance(signed_url_response, dict):
                        signed_url = signed_url_response.get('signedURL') or signed_url_response.get('signed_url') or signed_url_response.get('url')
                    elif isinstance(signed_url_response, str):
                        signed_url = signed_url_response
                    else:
                        signed_url = str(signed_url_response)
                    
                    if not signed_url or signed_url == 'None':
                        signed_url = doc.file_path  # Fallback to stored path
            except Exception as e:
                logger.warning(f"Failed to generate signed URL for document {doc.document_id}: {e}")
                signed_url = doc.file_path  # Fallback to stored path
            
            documents_list.append({
                "document_id": doc.document_id,
                "document_type": doc.document_type,
                "file_name": doc.file_name,
                "file_path": signed_url,  # Return signed URL (or stored path if generation failed)
                "file_type": doc.file_type,
                "file_size": doc.file_size,
                "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            })
        
        return {"profile": profile_dict, "documents": documents_list}
        
    except Exception as e:
        logger.error(f"Error getting professional profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get professional profile: {str(e)}")

@router.post("/professional")
async def create_or_update_professional_profile(
    profile: ProfessionalProfileIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Create or update professional profile
    
    Creates a new professional profile or updates an existing one.
    Handles profile status management, document deletion, and notification creation.
    
    Important behaviors:
    - Blocks updates if profile is pending (unless resubmitting)
    - Creates notifications for coordinators when profile is submitted/resubmitted
    - Handles document deletion if documents_to_delete is provided
    - Prevents clearing profile_image_url from profile data (managed separately)
    
    Args:
        profile: Professional profile data (from request body)
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Success message with professional_id and profile_status
    
    Raises:
        HTTPException:
            - 400 if profile is pending and update attempted
            - 422 if required fields missing for new profile
            - 500 if profile creation/update fails
    """
    try:
        result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.user_id == user.user_id)
        )
        existing_profile = result.scalar_one_or_none()
        
        if existing_profile:
            # Store previous status to determine if this is a resubmission
            previous_status = existing_profile.profile_status
            
            # Prevent updates if profile is pending (unless explicitly changing status)
            profile_data = profile.dict(exclude_unset=True)
            requested_status = profile_data.get('profile_status')
            
            # Block updates if status is pending, unless:
            # 1. Resubmitting after rejection (status = 'pending')
            # 2. Coordinator is approving/rejecting (status = 'approved' or 'rejected')
            if existing_profile.profile_status == 'pending':
                # Only allow if explicitly setting status to 'pending' (resubmission after rejection)
                # or if coordinator is approving/rejecting (but coordinators use different endpoint)
                if requested_status not in ['pending']:
                    raise HTTPException(
                        status_code=400,
                        detail="Profile is under review. Cannot update until approved or rejected. Please wait for coordinator review."
                    )
            
            # Handle profile_status - only set if provided (for initial submission or updates)
            if 'profile_status' in profile_data:
                existing_profile.profile_status = profile_data.pop('profile_status')
            
            # Handle documents_to_delete if provided
            documents_to_delete = profile_data.pop('documents_to_delete', None)
            if documents_to_delete and isinstance(documents_to_delete, list) and len(documents_to_delete) > 0:
                # Verify documents belong to this profile and delete them
                docs_result = await db.execute(
                    select(ProfessionalDocument).where(
                        ProfessionalDocument.profile_id == existing_profile.professional_id,
                        ProfessionalDocument.document_id.in_(documents_to_delete)
                    )
                )
                documents_to_remove = docs_result.scalars().all()
                
                for doc in documents_to_remove:
                    # Delete from Supabase Storage
                    if doc.file_path:
                        try:
                            # Extract relative path from full URL if needed
                            file_path = doc.file_path
                            if file_path.startswith('http'):
                                # Extract path from URL (e.g., "https://.../professional-documents/documents/123/file.pdf" -> "documents/123/file.pdf")
                                parts = file_path.split('/professional-documents/')
                                if len(parts) > 1:
                                    file_path = parts[1]
                                else:
                                    # Try to extract from other URL patterns
                                    parts = file_path.split('/storage/v1/object/public/professional-documents/')
                                    if len(parts) > 1:
                                        file_path = parts[1]
                            
                            supabase.storage.from_(PROFESSIONAL_DOCUMENTS_BUCKET).remove([file_path])
                            logger.info(f"Deleted professional document file from storage: {file_path}")
                        except Exception as e:
                            logger.warning(f"Failed to delete professional document file from storage: {e}")
                            # Continue with database deletion even if file deletion fails
                    
                    # Delete from database
                    await db.delete(doc)
                    logger.info(f"Deleted professional document record: {doc.document_id}")
            
            # Update all other fields (skip None values for required fields during partial updates)
            for key, value in profile_data.items():
                if hasattr(existing_profile, key):
                    # Skip None values for required fields during partial updates (they should not be updated)
                    if value is None and key in ['business_name', 'qualifications', 'specializations', 'professional_type', 'years_experience', 'certifications']:
                        continue  # Don't update required fields if they're None (partial update)
                    
                    # IMPORTANT: Never update profile_image_url from profile data - it's only set via upload endpoint
                    # This prevents accidentally clearing the image URL when updating other profile fields
                    if key == 'profile_image_url':
                        continue  # Skip profile_image_url - it's managed separately via upload endpoint
                    
                    # Handle empty strings for optional string fields - convert to None for consistency
                    # This ensures that clearing a field (e.g., unchecking Google Maps checkbox) properly clears the value
                    if value == "" and key in ['google_maps_url', 'website_url', 'bio', 'address_line', 'city', 'state', 'postcode', 'contact_email', 'contact_phone']:
                        setattr(existing_profile, key, None)
                    # Handle empty arrays for array fields - keep as empty array (not None)
                    elif isinstance(value, list) and key in ['target_developmental_stages', 'languages', 'availability', 'specializations']:
                        setattr(existing_profile, key, value)  # Allow empty arrays
                    else:
                        setattr(existing_profile, key, value)
            
            existing_profile.updated_by = user.user_id
            existing_profile.updated_at = datetime.now()
            db.add(existing_profile)
            await db.flush()  # Flush before creating notifications
            
            # Create notifications for all coordinators when profile is resubmitted (status changed to 'pending')
            if existing_profile.profile_status == 'pending' and requested_status == 'pending':
                try:
                    from utils.notifications import create_professional_profile_submission_notifications
                    # Determine if this is a resubmission
                    # If profile already exists and is being set to 'pending', it's a resubmission
                    # (new profiles are created, not updated)
                    # Also check if it was previously rejected
                    is_resubmission = (
                        previous_status == 'rejected' or
                        previous_status == 'approved' or  # Resubmission after approval (unlikely but possible)
                        (existing_profile.updated_at is not None and existing_profile.updated_at != existing_profile.created_at)
                    )
                    
                    notifications = await create_professional_profile_submission_notifications(
                        db=db,
                        profile_id=existing_profile.professional_id,
                        business_name=existing_profile.business_name,
                        is_resubmission=is_resubmission
                    )
                    if notifications:
                        logger.info(f"Created {len(notifications)} notifications for coordinators about profile {'resubmission' if is_resubmission else 'submission'}")
                except Exception as e:
                    logger.error(f"Error creating profile submission notifications: {e}")
                    # Don't fail the profile update if notification fails
            
            await db.commit()
            await db.refresh(existing_profile)
            
            return {
                "message": "Professional profile updated successfully",
                "professional_id": existing_profile.professional_id,
                "profile_status": existing_profile.profile_status
            }
        else:
            # Create new profile
            profile_data = profile.dict(exclude_unset=True)
            
            # Validate required fields for new profile creation
            if not profile.business_name:
                raise HTTPException(status_code=422, detail="business_name is required for profile creation")
            if not profile.qualifications:
                raise HTTPException(status_code=422, detail="qualifications is required for profile creation")
            if not profile.specializations or len(profile.specializations) == 0:
                raise HTTPException(status_code=422, detail="specializations is required for profile creation")
            
            # Handle empty strings for optional fields - convert to None for consistency
            google_maps_url = profile.google_maps_url if profile.google_maps_url else None
            website_url = profile.website_url if profile.website_url else None
            bio = profile.bio if profile.bio else None
            address_line = profile.address_line if profile.address_line else None
            city = profile.city if profile.city else None
            state = profile.state if profile.state else None
            postcode = profile.postcode if profile.postcode else None
            contact_email = profile.contact_email if profile.contact_email else None
            contact_phone = profile.contact_phone if profile.contact_phone else None
            profile_image_url = profile.profile_image_url if profile.profile_image_url else None
            
            new_profile = ProfessionalProfile(
                user_id=user.user_id,
                business_name=profile.business_name,
                professional_type=profile.professional_type,
                years_experience=profile.years_experience,
                qualifications=profile.qualifications,
                certifications=profile.certifications,
                specializations=profile.specializations or [],
                # Filter fields for Professional Directory
                target_developmental_stages=profile.target_developmental_stages or [],
                languages=profile.languages or [],
                availability=profile.availability or [],
                # Structured address fields
                address_line=address_line,
                city=city,
                state=state,
                postcode=postcode,
                country=profile.country or 'Malaysia',
                # Google Maps integration
                google_maps_url=google_maps_url,
                contact_email=contact_email,
                contact_phone=contact_phone,
                website_url=website_url,
                bio=bio,
                profile_image_url=profile_image_url,
                profile_status=profile.profile_status or 'pending',
                updated_by=user.user_id
            )
            db.add(new_profile)
            await db.flush()  # Flush to get the profile_id
            
            # Create notifications for all coordinators when profile is submitted
            if new_profile.profile_status == 'pending':
                try:
                    from utils.notifications import create_professional_profile_submission_notifications
                    notifications = await create_professional_profile_submission_notifications(
                        db=db,
                        profile_id=new_profile.professional_id,
                        business_name=new_profile.business_name
                    )
                    if notifications:
                        logger.info(f"Created {len(notifications)} notifications for coordinators about profile submission")
                except Exception as e:
                    logger.error(f"Error creating profile submission notifications: {e}")
                    # Don't fail the profile creation if notification fails
            
            await db.commit()
            await db.refresh(new_profile)
            
            return {
                "message": "Professional profile created successfully",
                "professional_id": new_profile.professional_id,
                "profile_status": new_profile.profile_status
            }
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating/updating professional profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save professional profile: {str(e)}")

@router.post("/professional/documents")
async def upload_professional_documents(
    documents: List[UploadFile] = File(...),  # Form field name must match frontend
    document_types: Optional[List[str]] = Form(None),  # Optional: ['certificate', 'license', 'qualification']
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Upload professional documents (PDF and images) to Supabase Storage
    
    Uploads one or more documents (PDFs or images) for the professional profile.
    Documents are stored in a private Supabase bucket and signed URLs are generated.
    
    Validates:
    - File count (at least one required)
    - File types (PDF, JPEG, PNG, WebP)
    - File size (max 10MB per file)
    
    Args:
        documents: List of files to upload (from multipart form)
        document_types: Optional list of document types (certificate, license, qualification)
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Success message and list of uploaded documents with metadata
    
    Raises:
        HTTPException:
            - 404 if professional profile not found
            - 400 if no files, invalid file type, or file too large
            - 500 if upload fails
    """
    try:
        result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.user_id == user.user_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Professional profile not found. Please create profile first.")
        
        # Validate file count
        if len(documents) == 0:
            raise HTTPException(status_code=400, detail="At least one file is required")
        
        # Validate file types and sizes
        allowed_types = [
            'application/pdf',  # PDF
            'image/jpeg', 'image/jpg', 'image/png', 'image/webp'  # Images
        ]
        allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp']
        max_file_size = 10 * 1024 * 1024  # 10MB
        
        uploaded_docs = []
        
        for idx, file in enumerate(documents):
            # Validate file size
            if file.size and file.size > max_file_size:
                raise HTTPException(
                    status_code=400,
                    detail=f"File '{file.filename}' exceeds 10MB limit"
                )
            
            # Validate file type
            file_extension = Path(file.filename).suffix.lower() if file.filename else ""
            is_valid = False
            
            if file.content_type:
                is_valid = file.content_type in allowed_types
            elif file_extension:
                is_valid = file_extension in allowed_extensions
            
            if not is_valid:
                raise HTTPException(
                    status_code=400,
                    detail=f"File '{file.filename}' is not a valid document type. Only PDF and images (JPEG, PNG, WebP) are allowed."
                )
            
            # Read file content
            content = await file.read()
            
            # Determine document type (use provided type or default to 'qualification')
            document_type = 'qualification'  # Default
            if document_types and idx < len(document_types):
                document_type = document_types[idx]
            
            # Determine file type from MIME type
            if file.content_type:
                if file.content_type == 'application/pdf':
                    file_type = 'application/pdf'
                elif file.content_type.startswith('image/'):
                    file_type = file.content_type
                else:
                    file_type = file.content_type
            else:
                # Infer from extension
                if file_extension == '.pdf':
                    file_type = 'application/pdf'
                elif file_extension in ['.jpg', '.jpeg']:
                    file_type = 'image/jpeg'
                elif file_extension == '.png':
                    file_type = 'image/png'
                elif file_extension == '.webp':
                    file_type = 'image/webp'
                else:
                    file_type = 'application/octet-stream'
            
            # Generate unique filename
            file_extension = Path(file.filename).suffix if file.filename else ".pdf"
            unique_filename = f"documents/{profile.professional_id}/{uuid.uuid4()}{file_extension}"
            
            logger.info(f"🔄 Uploading professional document to Supabase Storage...")
            logger.info(f"📦 Bucket: {PROFESSIONAL_DOCUMENTS_BUCKET}, Filename: {unique_filename}")
            
            # Upload to Supabase Storage
            try:
                upload_response = supabase.storage.from_(PROFESSIONAL_DOCUMENTS_BUCKET).upload(
                    unique_filename,
                    content,
                    file_options={"content-type": file_type, "upsert": "true"}
                )
                
                if isinstance(upload_response, dict) and upload_response.get('error'):
                    error_msg = upload_response['error']
                    logger.error(f"❌ Upload failed: {error_msg}")
                    raise HTTPException(status_code=500, detail=f"Failed to upload to storage: {error_msg}")
            
            except Exception as upload_exception:
                logger.error(f"❌ Upload exception: {upload_exception}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Storage upload failed: {str(upload_exception)}"
                )
            
            logger.info(f"✅ File uploaded successfully to Supabase Storage")
            
            # Generate signed URL (for private bucket - expires in 1 hour)
            # Store the file path in database, generate signed URLs on-demand when needed
            try:
                # For private buckets, we store the file path (not public URL)
                # Signed URLs will be generated on-demand when documents are accessed
                file_path_storage = unique_filename  # Store relative path: documents/{profile_id}/{uuid}.{ext}
                
                # Generate a signed URL for immediate use (expires in 1 hour)
                signed_url_response = supabase.storage.from_(PROFESSIONAL_DOCUMENTS_BUCKET).create_signed_url(
                    unique_filename,
                    expires_in=3600  # 1 hour expiration
                )
                
                # Extract signed URL from response
                if isinstance(signed_url_response, dict):
                    signed_url = signed_url_response.get('signedURL') or signed_url_response.get('signed_url') or signed_url_response.get('url')
                elif isinstance(signed_url_response, str):
                    signed_url = signed_url_response
                else:
                    signed_url = str(signed_url_response)
                
                if not signed_url or signed_url == 'None':
                    logger.warning(f"⚠️ Failed to generate signed URL, storing file path only")
                    signed_url = file_path_storage  # Fallback to file path
            except Exception as url_exception:
                logger.error(f"❌ Failed to generate signed URL: {url_exception}")
                # Store file path even if signed URL generation fails
                signed_url = file_path_storage
            
            logger.info(f"✅ Signed URL generated (expires in 1 hour)")
            
            # Create database record
            # Store the file path (relative path) in database for generating signed URLs on-demand
            new_doc = ProfessionalDocument(
                profile_id=profile.professional_id,
                document_type=document_type,
                file_name=file.filename or "unknown",
                file_path=file_path_storage,  # Store relative path for signed URL generation
                file_type=file_type,
                file_size=len(content)
            )
            db.add(new_doc)
            uploaded_docs.append(new_doc)
        
        await db.commit()
        
        for doc in uploaded_docs:
            await db.refresh(doc)
        
        return {
            "message": f"{len(uploaded_docs)} document(s) uploaded successfully",
            "documents": [
                {
                    "document_id": doc.document_id,
                    "document_type": doc.document_type,
                    "file_name": doc.file_name,
                    "file_path": doc.file_path,
                    "file_type": doc.file_type,
                    "file_size": doc.file_size,
                    "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
                }
                for doc in uploaded_docs
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error uploading professional documents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload documents: {str(e)}")

@router.post("/professional/upload-image")
async def upload_professional_profile_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Upload a profile image for professional profile using Supabase Storage
    
    Uploads a profile image for the professional profile.
    Replaces any existing profile image (deletes old one from storage).
    Image is stored in a public Supabase bucket.
    
    Validates:
    - File size (max 5MB)
    - File type (JPEG, PNG, GIF, WebP only)
    
    Args:
        file: Image file to upload (from multipart form)
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Upload confirmation with profile_image_url and file metadata
    
    Raises:
        HTTPException:
            - 404 if professional profile not found
            - 400 if file too large or invalid type
            - 500 if upload or database update fails
    """
    try:
        # Verify user is professional
        result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.user_id == user.user_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Professional profile not found. Please create profile first.")
        
        # Validate file size (5MB limit)
        if file.size and file.size > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
        
        # Validate file type - only images
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        file_extension = Path(file.filename).suffix.lower() if file.filename else ""
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        
        is_valid = False
        if file.content_type:
            is_valid = file.content_type in allowed_types
        elif file_extension:
            is_valid = file_extension in allowed_extensions
        
        if not is_valid:
            raise HTTPException(status_code=400, detail="Only images are allowed (JPEG, PNG, GIF, WebP)")
        
        # Read file content
        content = await file.read()
        
        # Delete old profile image(s) if they exist
        # We delete all files in the profile's directory to handle different extensions
        profile_dir = f"profiles/{profile.professional_id}/"
        if profile.profile_image_url:
            try:
                # Extract file path from URL
                old_url = profile.profile_image_url
                old_image_path = None
                
                # Extract path from URL (e.g., "https://.../professional-profile-images/profiles/1/uuid.jpg" -> "profiles/1/uuid.jpg")
                if '/professional-profile-images/' in old_url:
                    old_image_path = old_url.split('/professional-profile-images/')[1]
                elif '/storage/v1/object/public/professional-profile-images/' in old_url:
                    old_image_path = old_url.split('/storage/v1/object/public/professional-profile-images/')[1]
                elif old_url.startswith('profiles/'):
                    old_image_path = old_url
                
                if old_image_path:
                    # Remove query parameters if any
                    old_image_path = old_image_path.split('?')[0]
                    logger.info(f"🗑️ Deleting old profile image: {old_image_path}")
                    try:
                        supabase.storage.from_(PROFESSIONAL_PROFILE_IMAGES_BUCKET).remove([old_image_path])
                        logger.info(f"✅ Old profile image deleted: {old_image_path}")
                    except Exception as delete_exception:
                        logger.warning(f"⚠️ Failed to delete old image (continuing anyway): {delete_exception}")
                
                # Also try to list and delete all files in the profile directory (in case there are multiple files with different extensions)
                try:
                    files_list = supabase.storage.from_(PROFESSIONAL_PROFILE_IMAGES_BUCKET).list(profile_dir)
                    if files_list and isinstance(files_list, list):
                        files_to_delete = [f"{profile_dir}{f['name']}" for f in files_list if f.get('name')]
                        if files_to_delete:
                            logger.info(f"🗑️ Deleting all files in profile directory: {files_to_delete}")
                            supabase.storage.from_(PROFESSIONAL_PROFILE_IMAGES_BUCKET).remove(files_to_delete)
                            logger.info(f"✅ All old profile images deleted from directory")
                except Exception as list_exception:
                    logger.warning(f"⚠️ Could not list/delete files in directory (continuing anyway): {list_exception}")
            except Exception as extract_exception:
                logger.warning(f"⚠️ Could not extract old image path (continuing anyway): {extract_exception}")
        
        # Generate consistent filename (same filename for each profile, so it replaces the old one)
        file_extension = Path(file.filename).suffix if file.filename else ".jpg"
        # Use a consistent filename so it replaces the old image
        unique_filename = f"profiles/{profile.professional_id}/profile{file_extension}"
        
        logger.info(f"🔄 Uploading profile image to Supabase Storage...")
        logger.info(f"📦 Bucket: {PROFESSIONAL_PROFILE_IMAGES_BUCKET}, Filename: {unique_filename}")
        
        try:
            upload_response = supabase.storage.from_(PROFESSIONAL_PROFILE_IMAGES_BUCKET).upload(
                unique_filename,
                content,
                file_options={"content-type": file.content_type, "upsert": "true"}
            )
            
            # Check for errors in upload response
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
        
        # Get public URL (bucket is public)
        try:
            public_url = supabase.storage.from_(PROFESSIONAL_PROFILE_IMAGES_BUCKET).get_public_url(unique_filename)
            
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
        
        # Update the profile record with the image URL
        try:
            profile.profile_image_url = public_url
            profile.updated_at = datetime.now()
            profile.updated_by = user.user_id
            db.add(profile)
            await db.commit()
            await db.refresh(profile)
            logger.info(f"✅ Profile image URL updated in database: {public_url}")
        except Exception as db_exception:
            logger.error(f"❌ Failed to update profile_image_url in database: {db_exception}")
            await db.rollback()
            # Re-raise the exception so frontend knows the update failed
            # The image is uploaded but database wasn't updated
            raise HTTPException(
                status_code=500,
                detail=f"Image uploaded successfully but failed to update database: {str(db_exception)}"
            )
        
        return {
            "profile_image_url": public_url,
            "file_path": public_url,  # Return as file_path for consistency with frontend expectation
            "url": public_url,  # Keep url for backward compatibility
            "filename": file.filename or "unknown",
            "size": len(content),
            "content_type": file.content_type
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading profile image: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload profile image: {str(e)}")

# Professional Services Endpoints
@router.get("/professional/services")
async def get_professional_services(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get all services for the logged-in professional"""
    try:
        # Get professional profile to get profile_id
        result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.user_id == user.user_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Professional profile not found. Please submit your profile first.")
        
        # Get all services for this profile
        services_result = await db.execute(
            select(ProfessionalService).where(ProfessionalService.profile_id == profile.professional_id)
        )
        services = services_result.scalars().all()
        
        services_list = [
            {
                "service_id": service.service_id,
                "profile_id": service.profile_id,
                "service_name": service.service_name,
                "service_description": service.service_description,
                "service_category": service.service_category,
                "service_type": service.service_type,
                "price_range": service.price_range,
                "created_at": service.created_at.isoformat() if service.created_at else None,
                "updated_at": service.updated_at.isoformat() if service.updated_at else None,
            }
            for service in services
        ]
        
        return services_list
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting professional services: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get services: {str(e)}")

@router.post("/professional/services")
async def create_professional_service(
    service: ProfessionalServiceIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Create a new service for the logged-in professional"""
    try:
        # Get professional profile to get profile_id
        result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.user_id == user.user_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Professional profile not found. Please submit your profile first.")
        
        # Check if profile is approved (optional - can allow services even if pending)
        # For now, allow services regardless of status
        
        # Create new service
        new_service = ProfessionalService(
            profile_id=profile.professional_id,
            service_name=service.service_name,
            service_description=service.service_description,
            service_category=service.service_category,
            service_type=service.service_type,
            price_range=service.price_range,
        )
        
        db.add(new_service)
        await db.commit()
        await db.refresh(new_service)
        
        return {
            "service_id": new_service.service_id,
            "profile_id": new_service.profile_id,
            "service_name": new_service.service_name,
            "service_description": new_service.service_description,
            "service_category": new_service.service_category,
            "service_type": new_service.service_type,
            "price_range": new_service.price_range,
            "created_at": new_service.created_at.isoformat() if new_service.created_at else None,
            "updated_at": new_service.updated_at.isoformat() if new_service.updated_at else None,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating professional service: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create service: {str(e)}")

@router.put("/professional/services/{service_id}")
async def update_professional_service(
    service_id: int,
    service: ProfessionalServiceIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Update a service for the logged-in professional"""
    try:
        # Get professional profile to get profile_id
        result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.user_id == user.user_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Professional profile not found. Please submit your profile first.")
        
        # Get the service and verify ownership
        service_result = await db.execute(
            select(ProfessionalService).where(
                ProfessionalService.service_id == service_id,
                ProfessionalService.profile_id == profile.professional_id
            )
        )
        existing_service = service_result.scalar_one_or_none()
        
        if not existing_service:
            raise HTTPException(status_code=404, detail="Service not found or you don't have permission to update it.")
        
        # Update service fields
        existing_service.service_name = service.service_name
        existing_service.service_description = service.service_description
        existing_service.service_category = service.service_category
        existing_service.service_type = service.service_type
        existing_service.price_range = service.price_range
        existing_service.updated_at = datetime.now()
        
        await db.commit()
        await db.refresh(existing_service)
        
        return {
            "service_id": existing_service.service_id,
            "profile_id": existing_service.profile_id,
            "service_name": existing_service.service_name,
            "service_description": existing_service.service_description,
            "service_category": existing_service.service_category,
            "service_type": existing_service.service_type,
            "price_range": existing_service.price_range,
            "created_at": existing_service.created_at.isoformat() if existing_service.created_at else None,
            "updated_at": existing_service.updated_at.isoformat() if existing_service.updated_at else None,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating professional service: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update service: {str(e)}")

@router.delete("/professional/services/{service_id}")
async def delete_professional_service(
    service_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Delete a service for the logged-in professional"""
    try:
        # Get professional profile to get profile_id
        result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.user_id == user.user_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Professional profile not found. Please submit your profile first.")
        
        # Get the service and verify ownership
        service_result = await db.execute(
            select(ProfessionalService).where(
                ProfessionalService.service_id == service_id,
                ProfessionalService.profile_id == profile.professional_id
            )
        )
        existing_service = service_result.scalar_one_or_none()
        
        if not existing_service:
            raise HTTPException(status_code=404, detail="Service not found or you don't have permission to delete it.")
        
        # Delete the service
        await db.delete(existing_service)
        await db.commit()
        
        return {"message": "Service deleted successfully", "service_id": service_id}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting professional service: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete service: {str(e)}")

# Saved Professionals Endpoints (for Parent users)
@router.post("/saved-professionals/{professional_id}")
async def save_professional(
    professional_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Save a professional to the parent's saved list"""
    try:
        # Verify user is a parent
        if user.role != 'parent':
            raise HTTPException(status_code=403, detail="Only parent users can save professionals")
        
        # Verify professional exists and is approved
        result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.professional_id == professional_id)
        )
        professional = result.scalar_one_or_none()
        
        if not professional:
            raise HTTPException(status_code=404, detail="Professional not found")
        
        if professional.profile_status != 'approved':
            raise HTTPException(status_code=400, detail="Only approved professionals can be saved")
        
        # Check if already saved
        existing_result = await db.execute(
            select(SavedProfessional).where(
                SavedProfessional.user_id == user.user_id,
                SavedProfessional.professional_id == professional_id
            )
        )
        existing = existing_result.scalar_one_or_none()
        
        if existing:
            return {"message": "Professional already saved", "saved_id": existing.saved_id}
        
        # Create new saved professional record
        saved_professional = SavedProfessional(
            user_id=user.user_id,
            professional_id=professional_id
        )
        db.add(saved_professional)
        await db.commit()
        await db.refresh(saved_professional)
        
        return {
            "message": "Professional saved successfully",
            "saved_id": saved_professional.saved_id,
            "professional_id": professional_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error saving professional: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save professional: {str(e)}")

@router.delete("/saved-professionals/{professional_id}")
async def unsave_professional(
    professional_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Remove a professional from the parent's saved list"""
    try:
        # Verify user is a parent
        if user.role != 'parent':
            raise HTTPException(status_code=403, detail="Only parent users can unsave professionals")
        
        # Find the saved professional record
        result = await db.execute(
            select(SavedProfessional).where(
                SavedProfessional.user_id == user.user_id,
                SavedProfessional.professional_id == professional_id
            )
        )
        saved_professional = result.scalar_one_or_none()
        
        if not saved_professional:
            raise HTTPException(status_code=404, detail="Professional not found in saved list")
        
        # Delete the record
        await db.delete(saved_professional)
        await db.commit()
        
        return {"message": "Professional removed from saved list", "professional_id": professional_id}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error unsaving professional: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to unsave professional: {str(e)}")

@router.get("/saved-professionals")
async def get_saved_professionals(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get all saved professionals for the current parent user"""
    try:
        # Verify user is a parent
        if user.role != 'parent':
            raise HTTPException(status_code=403, detail="Only parent users can view saved professionals")
        
        # Get all saved professionals for this user
        result = await db.execute(
            select(SavedProfessional).where(SavedProfessional.user_id == user.user_id)
        )
        saved_professionals = result.scalars().all()
        
        # Extract professional IDs
        professional_ids = [sp.professional_id for sp in saved_professionals]
        
        return {
            "saved_professional_ids": professional_ids,
            "count": len(professional_ids)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting saved professionals: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get saved professionals: {str(e)}")

