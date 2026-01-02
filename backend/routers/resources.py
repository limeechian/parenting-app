# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: resources.py
# Description: To handle resource endpoints for parents to browse and save published educational resources
# First Written on: Saturday, 04-Oct-2025
# Edited on: Sunday, 10-Dec-2025

"""
Resources router - Handles resource endpoints for parents (published resources only)

This router provides endpoints for parents to:
- Browse published educational resources (articles, videos, guides)
- View resource details
- Save/unsave resources
- Search and filter resources

Note: Only published resources are visible to parents. Draft and archived
resources are only accessible to content managers.
"""
from fastapi import APIRouter, HTTPException, Query, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, and_
from typing import Optional

from dependencies import get_session, get_current_user_flexible
from models.database import Resource, ResourceAttachment, SavedResource, User
from config import logger

# Initialize router with prefix and tags for API documentation
router = APIRouter(prefix="/resources", tags=["resources"])

# ============================================================================
# Saved Resources Endpoints
# ============================================================================
# Note: These endpoints must be defined BEFORE /{resource_id} to avoid route conflicts
# FastAPI matches routes in order, so /saved must come before /{resource_id}

@router.get("/saved")
async def get_saved_resources(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Get list of saved resource IDs for the current user
    
    Returns a list of resource IDs that the user has saved for later viewing.
    Only parent users can save resources.
    
    Args:
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Dictionary with 'saved_resource_ids' list
    
    Raises:
        HTTPException: If user is not authenticated, not a parent, or an error occurs
    """
    try:
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        if user.role != 'parent':
            raise HTTPException(status_code=403, detail="Only parent users can view saved resources")
        
        saved_result = await db.execute(
            select(SavedResource).where(SavedResource.user_id == user.user_id)
            .order_by(SavedResource.saved_at.desc())
        )
        saved_resources = saved_result.scalars().all()
        
        saved_resource_ids = [sr.resource_id for sr in saved_resources]
        
        return {"saved_resource_ids": saved_resource_ids}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting saved resources: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get saved resources: {str(e)}")

# ============================================================================
# Resource Listing and Search Endpoints
# ============================================================================

@router.get("", response_model=dict)
async def get_resources(
    status: Optional[str] = Query('published', description="Filter by status (default: published)"),
    resource_type: Optional[str] = Query(None, description="Filter by type: article, video, guide"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search by title, description, excerpt, or tags"),
    db: AsyncSession = Depends(get_session)
):
    """
    Get published resources for parents (authentication optional)
    
    Retrieves a list of published educational resources with optional filtering and search.
    This endpoint is accessible without authentication, but authenticated users will
    see which resources they have saved.
    
    Args:
        status: Resource status filter (default: 'published')
        resource_type: Filter by resource type ('article', 'video', 'guide')
        category: Filter by category
        search: Search term to match against title, description, excerpt, or tags
        db: Database session (from dependency injection)
    
    Returns:
        dict: Dictionary containing:
            - 'resources': List of resource dictionaries with attachments
            - 'total': Total count of resources matching filters
    
    Raises:
        HTTPException: If an error occurs while fetching resources
    """
    try:
        # Only show published resources to parents
        # Draft and archived resources are only visible to content managers
        query = select(Resource).where(Resource.status == 'published')
        
        if resource_type:
            query = query.where(Resource.resource_type == resource_type)
        if category:
            query = query.where(Resource.category == category)
        if search:
            query = query.where(
                or_(
                    Resource.title.ilike(f"%{search}%"),
                    Resource.description.ilike(f"%{search}%"),
                    Resource.excerpt.ilike(f"%{search}%"),
                    # Search in tags array
                    func.array_to_string(Resource.tags, ', ').ilike(f"%{search}%")
                )
            )
        
        query = query.order_by(Resource.created_at.desc())
        
        result = await db.execute(query)
        resources = result.scalars().all()
        
        # Fetch attachments for each resource
        resources_with_attachments = []
        for resource in resources:
            attachments_result = await db.execute(
                select(ResourceAttachment)
                .where(ResourceAttachment.resource_id == resource.resource_id)
                .order_by(ResourceAttachment.display_order)
            )
            attachments = attachments_result.scalars().all()
            
            resource_dict = {
                "resource_id": resource.resource_id,
                "title": resource.title,
                "description": resource.description,
                "content": resource.content,
                "resource_type": resource.resource_type,
                "category": resource.category,
                "target_developmental_stages": resource.target_developmental_stages,
                "external_url": resource.external_url,
                "thumbnail_url": resource.thumbnail_url,
                "excerpt": resource.excerpt,
                "tags": resource.tags,
                "status": resource.status,
                "created_by": resource.created_by,
                "published_at": resource.published_at.isoformat() if resource.published_at else None,
                "created_at": resource.created_at.isoformat() if resource.created_at else None,
                "updated_at": resource.updated_at.isoformat() if resource.updated_at else None,
                "attachments": [
                    {
                        "attachment_id": att.attachment_id,
                        "resource_id": att.resource_id,
                        "file_name": att.file_name,
                        "file_path": att.file_path,
                        "file_type": att.file_type,
                        "file_size": att.file_size,
                        "mime_type": att.mime_type,
                        "display_order": att.display_order,
                        "created_at": att.created_at.isoformat() if att.created_at else None,
                    }
                    for att in attachments
                ]
            }
            resources_with_attachments.append(resource_dict)
        
        return {"resources": resources_with_attachments}
    except Exception as e:
        logger.error(f"Error getting resources: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get resources: {str(e)}")

@router.get("/{resource_id}", response_model=dict)
async def get_resource_detail(
    resource_id: int,
    db: AsyncSession = Depends(get_session)
):
    """Get details of a specific published resource (authentication optional)"""
    try:
        resource = await db.get(Resource, resource_id)
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")
        
        # Only allow access to published resources
        if resource.status != 'published':
            raise HTTPException(status_code=404, detail="Resource not found")
        
        attachments_result = await db.execute(
            select(ResourceAttachment)
            .where(ResourceAttachment.resource_id == resource.resource_id)
            .order_by(ResourceAttachment.display_order)
        )
        attachments = attachments_result.scalars().all()
        
        resource_dict = {
            "resource_id": resource.resource_id,
            "title": resource.title,
            "description": resource.description,
            "content": resource.content,
            "resource_type": resource.resource_type,
            "category": resource.category,
            "target_developmental_stages": resource.target_developmental_stages,
            "external_url": resource.external_url,
            "thumbnail_url": resource.thumbnail_url,
            "excerpt": resource.excerpt,
            "tags": resource.tags,
            "status": resource.status,
            "created_by": resource.created_by,
            "published_at": resource.published_at.isoformat() if resource.published_at else None,
            "created_at": resource.created_at.isoformat() if resource.created_at else None,
            "updated_at": resource.updated_at.isoformat() if resource.updated_at else None,
                "attachments": [
                {
                    "attachment_id": att.attachment_id,
                    "resource_id": att.resource_id,
                    "file_name": att.file_name,
                    "file_path": att.file_path,
                    "file_type": att.file_type,
                    "file_size": att.file_size,
                    "mime_type": att.mime_type,
                    "display_order": att.display_order,
                    "description": att.description,
                    "created_at": att.created_at.isoformat() if att.created_at else None,
                }
                for att in attachments
            ]
        }
        
        return resource_dict
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting resource detail: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get resource: {str(e)}")

# Saved Resources Endpoints (for Parent users)
@router.post("/{resource_id}/save")
async def save_resource(
    resource_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Save a resource to the parent's saved list"""
    try:
        # Verify user is a parent
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        if user.role != 'parent':
            raise HTTPException(status_code=403, detail="Only parent users can save resources")
        
        # Verify resource exists and is published
        resource = await db.get(Resource, resource_id)
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")
        
        if resource.status != 'published':
            raise HTTPException(status_code=400, detail="Only published resources can be saved")
        
        # Check if already saved
        existing_result = await db.execute(
            select(SavedResource).where(
                and_(
                    SavedResource.user_id == user.user_id,
                    SavedResource.resource_id == resource_id
                )
            )
        )
        existing = existing_result.scalar_one_or_none()
        
        if existing:
            # Already saved, return success without doing anything
            return {
                "message": "Resource already saved",
                "saved": True,
                "saved_id": existing.saved_id,
                "resource_id": resource_id
            }
        
        # Create new saved resource record
        saved_resource = SavedResource(
            user_id=user.user_id,
            resource_id=resource_id
        )
        db.add(saved_resource)
        await db.flush()  # Flush to get any immediate errors (like unique constraint violations)
        await db.commit()
        await db.refresh(saved_resource)
        
        logger.info(f"Resource {resource_id} saved successfully for user {user.user_id}, saved_id: {saved_resource.saved_id}")
        
        return {
            "message": "Resource saved successfully",
            "saved": True,
            "saved_id": saved_resource.saved_id,
            "resource_id": resource_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error saving resource {resource_id} for user {user.user_id if user else 'unknown'}: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to save resource: {str(e)}")

@router.delete("/{resource_id}/save")
async def unsave_resource(
    resource_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Remove a resource from the parent's saved list"""
    try:
        # Verify user is a parent
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        if user.role != 'parent':
            raise HTTPException(status_code=403, detail="Only parent users can unsave resources")
        
        # Find the saved resource record
        result = await db.execute(
            select(SavedResource).where(
                and_(
                    SavedResource.user_id == user.user_id,
                    SavedResource.resource_id == resource_id
                )
            )
        )
        saved_resource = result.scalar_one_or_none()
        
        if not saved_resource:
            raise HTTPException(status_code=404, detail="Resource not found in saved list")
        
        # Delete the record
        await db.delete(saved_resource)
        await db.commit()
        
        return {"message": "Resource removed from saved list", "resource_id": resource_id}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error unsaving resource: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to unsave resource: {str(e)}")

