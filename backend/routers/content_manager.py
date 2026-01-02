# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: content_manager.py
# Description: To handle content manager endpoints for managing resources and moderating community content
# First Written on: Monday, 10-Nov-2025
# Edited on: Sunday, 10-Dec-2025

"""
Content Manager router - Handles content manager specific endpoints

This router provides endpoints for:
- Content reporting management (view, resolve, dismiss reports)
- Educational resource management (CRUD operations)
- Resource publishing (publish, unpublish resources)
- Resource attachments (upload, update, delete)
- Resource thumbnail management

All endpoints require content_manager role. Content managers handle
community content moderation and educational resource management.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from typing import Optional, List
from datetime import datetime
from pathlib import Path
import uuid
import requests

from dependencies import get_current_user_flexible, get_session
from models.database import User, Report, CommunityPost, CommunityPostComment, Community, Resource, ResourceAttachment
from schemas.schemas import (
    ReportOut, ResourceOut, ResourceIn, ResourceUpdate,
    ResourceAttachmentOut, ResourceAttachmentIn, ResourceAttachmentUpdate
)
from config import logger, supabase, EDUCATIONAL_RESOURCES_BUCKET, RESOURCE_THUMBNAILS_BUCKET
from pydantic import BaseModel

# Initialize router with prefix and tags for API documentation
router = APIRouter(prefix="/content-manager", tags=["content-manager"])

# ============================================================================
# Report Management Endpoints
# ============================================================================

@router.get("/reports", response_model=dict)
async def get_content_manager_reports(
    status: Optional[str] = Query(None, description="Filter by status: pending, resolved, dismissed"),
    report_type: Optional[str] = Query(None, description="Filter by type: post, comment, community, user"),
    created_after: Optional[str] = Query(None, description="Filter reports created after this date (ISO format)"),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get all reports for content managers"""
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
    
    if created_after:
        try:
            created_after_date = datetime.fromisoformat(created_after.replace('Z', '+00:00'))
            query = query.where(Report.created_at >= created_after_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid created_after date format. Use ISO format.")
    
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
    
    return {"reports": response}

@router.get("/reports/{report_id}", response_model=ReportOut)
async def get_content_manager_report(
    report_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get a specific report for content managers"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if user.role not in ['admin', 'content_manager']:
        raise HTTPException(status_code=403, detail="Only admins and content managers can view reports")
    
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return ReportOut(
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
    )

class ResolveReportIn(BaseModel):
    resolution_notes: Optional[str] = None

@router.put("/reports/{report_id}/resolve")
async def resolve_content_manager_report(
    report_id: int,
    resolution_data: Optional[ResolveReportIn] = None,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Resolve a report by flagging the entity (content manager endpoint)"""
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
async def dismiss_content_manager_report(
    report_id: int,
    resolution_data: Optional[ResolveReportIn] = None,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Dismiss a report as invalid/false (content manager endpoint)"""
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

# --- Resource Management Endpoints ---

@router.get("/resources", response_model=dict)
async def get_resources(
    status: Optional[str] = Query(None, description="Filter by status: draft, published, archived"),
    resource_type: Optional[str] = Query(None, description="Filter by type: article, video, guide"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search by title or description"),
    created_after: Optional[str] = Query(None, description="Filter resources created after this timestamp (ISO format)"),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get resources for content manager: published resources OR resources created by the logged-in user"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if user.role not in ['admin', 'content_manager']:
        raise HTTPException(status_code=403, detail="Only admins and content managers can view resources")
    
    # Base filter: Show published resources OR resources created by the logged-in user
    base_filter = or_(
        Resource.status == 'published',
        Resource.created_by == user.user_id
    )
    
    query = select(Resource).where(base_filter)
    
    if status:
        # Apply status filter while respecting the base rule
        # If status is 'published', the base filter already covers it
        # If status is 'draft' or 'archived', only show those created by the user
        if status == 'published':
            # Already covered by base filter, but we can be explicit
            query = query.where(Resource.status == 'published')
        else:
            # For draft/archived, must be created by the user
            query = query.where(
                and_(
                    Resource.status == status,
                    Resource.created_by == user.user_id
                )
            )
    if resource_type:
        query = query.where(Resource.resource_type == resource_type)
    if category:
        query = query.where(Resource.category == category)
    if search:
        query = query.where(
            or_(
                Resource.title.ilike(f"%{search}%"),
                Resource.description.ilike(f"%{search}%")
            )
        )
    if created_after:
        try:
            created_after_date = datetime.fromisoformat(created_after.replace('Z', '+00:00'))
            query = query.where(Resource.created_at >= created_after_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid created_after date format. Use ISO format.")
    
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

@router.get("/resources/{resource_id}", response_model=ResourceOut)
async def get_resource_detail(
    resource_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get details of a specific resource (content_manager only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if user.role not in ['admin', 'content_manager']:
        raise HTTPException(status_code=403, detail="Only admins and content managers can view resource details")
    
    resource = await db.get(Resource, resource_id)
    if not resource:
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
                "created_at": att.created_at.isoformat() if att.created_at else None,
            }
            for att in attachments
        ]
    }
    
    return ResourceOut(**resource_dict)

@router.post("/resources", response_model=ResourceOut)
async def create_resource(
    resource_data: ResourceIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Create a new resource (content_manager only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if user.role not in ['admin', 'content_manager']:
        raise HTTPException(status_code=403, detail="Only admins and content managers can create resources")
    
    # Handle target_developmental_stages
    target_developmental_stages = resource_data.target_developmental_stages or []

    new_resource = Resource(
        title=resource_data.title,
        description=resource_data.description,
        content=resource_data.content,
        resource_type=resource_data.resource_type,
        category=resource_data.category,
        target_developmental_stages=target_developmental_stages,
        external_url=resource_data.external_url,
        thumbnail_url=resource_data.thumbnail_url,
        excerpt=resource_data.excerpt,
        tags=resource_data.tags,
        status=resource_data.status,
        created_by=user.user_id,
        published_at=datetime.now() if resource_data.status == 'published' else None
    )
    db.add(new_resource)
    await db.flush()  # Flush to get resource_id
    
    # Move thumbnail from temp folder to resource_id folder if it's in temp
    if new_resource.thumbnail_url and "temp/" in new_resource.thumbnail_url:
        try:
            # Extract the file path from the URL
            url_parts = new_resource.thumbnail_url.split('/')
            if RESOURCE_THUMBNAILS_BUCKET in url_parts:
                bucket_index = url_parts.index(RESOURCE_THUMBNAILS_BUCKET)
                old_path = '/'.join(url_parts[bucket_index + 1:]).split('?')[0]  # Remove query params
                
                # Extract filename from old path (temp/user_id/filename)
                filename = old_path.split('/')[-1]
                new_path = f"{new_resource.resource_id}/{filename}"
                
                # Download the file from temp location using the public URL
                file_response = requests.get(new_resource.thumbnail_url)
                if file_response.status_code != 200:
                    raise Exception(f"Failed to download file from temp location: HTTP {file_response.status_code}")
                
                file_content = file_response.content
                
                # Determine content type from filename
                content_type = "image/jpeg"
                if filename.lower().endswith('.png'):
                    content_type = "image/png"
                elif filename.lower().endswith('.webp'):
                    content_type = "image/webp"
                
                # Upload to new location (resource_id folder)
                upload_response = supabase.storage.from_(RESOURCE_THUMBNAILS_BUCKET).upload(
                    new_path,
                    file_content,
                    file_options={"content-type": content_type, "upsert": "true"}
                )
                
                if isinstance(upload_response, dict) and upload_response.get('error'):
                    logger.warning(f"⚠️ Failed to move thumbnail to resource_id folder: {upload_response['error']}")
                else:
                    # Get new public URL
                    new_public_url = supabase.storage.from_(RESOURCE_THUMBNAILS_BUCKET).get_public_url(new_path)
                    if isinstance(new_public_url, dict):
                        new_public_url = new_public_url.get('publicUrl') or new_public_url.get('public_url')
                    elif not isinstance(new_public_url, str):
                        new_public_url = str(new_public_url)
                    
                    if new_public_url and new_public_url != 'None':
                        # Update thumbnail_url to new location
                        new_resource.thumbnail_url = new_public_url
                        
                        # Delete old temp file
                        try:
                            supabase.storage.from_(RESOURCE_THUMBNAILS_BUCKET).remove([old_path])
                            logger.info(f"✅ Moved thumbnail from temp to resource_id folder: {old_path} -> {new_path}")
                        except Exception as e:
                            logger.warning(f"⚠️ Failed to delete temp thumbnail file: {e}")
        except Exception as e:
            logger.warning(f"⚠️ Failed to move thumbnail from temp folder: {e}")
            # Continue with resource creation even if thumbnail move fails

    # Handle attachments
    if resource_data.attachments:
        for idx, att_data in enumerate(resource_data.attachments):
            new_attachment = ResourceAttachment(
                resource_id=new_resource.resource_id,
                file_name=att_data.file_name,
                file_path=att_data.file_path,
                file_type=att_data.file_type,
                file_size=att_data.file_size,
                mime_type=att_data.mime_type,
                display_order=att_data.display_order or idx
            )
            db.add(new_attachment)
    
    await db.commit()
    await db.refresh(new_resource)

    # Refresh attachments for the response
    attachments_result = await db.execute(
        select(ResourceAttachment)
        .where(ResourceAttachment.resource_id == new_resource.resource_id)
        .order_by(ResourceAttachment.display_order)
    )
    attachments = attachments_result.scalars().all()
    
    resource_dict = {
        "resource_id": new_resource.resource_id,
        "title": new_resource.title,
        "description": new_resource.description,
        "content": new_resource.content,
        "resource_type": new_resource.resource_type,
        "category": new_resource.category,
        "target_developmental_stages": new_resource.target_developmental_stages,
        "external_url": new_resource.external_url,
        "thumbnail_url": new_resource.thumbnail_url,
        "excerpt": new_resource.excerpt,
        "tags": new_resource.tags,
        "status": new_resource.status,
        "created_by": new_resource.created_by,
        "published_at": new_resource.published_at.isoformat() if new_resource.published_at else None,
        "created_at": new_resource.created_at.isoformat() if new_resource.created_at else None,
        "updated_at": new_resource.updated_at.isoformat() if new_resource.updated_at else None,
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
    
    return ResourceOut(**resource_dict)

@router.put("/resources/{resource_id}", response_model=ResourceOut)
async def update_resource(
    resource_id: int,
    resource_data: ResourceUpdate,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Update an existing resource (content_manager only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if user.role not in ['admin', 'content_manager']:
        raise HTTPException(status_code=403, detail="Only admins and content managers can update resources")
    
    resource = await db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    update_data = resource_data.dict(exclude_unset=True)
    
    # Handle special fields
    if 'target_developmental_stages' in update_data:
        resource.target_developmental_stages = update_data.pop('target_developmental_stages')
    if 'tags' in update_data:
        resource.tags = update_data.pop('tags')
    if 'status' in update_data:
        if update_data['status'] == 'published' and not resource.published_at:
            resource.published_at = datetime.now()
        elif update_data['status'] != 'published':
            resource.published_at = None  # Unset published_at if status is not published
        resource.status = update_data.pop('status')

    for key, value in update_data.items():
        if hasattr(resource, key):
            setattr(resource, key, value)
    
    resource.updated_at = datetime.now()

    # Handle attachments (full replacement for simplicity)
    if resource_data.attachments is not None:  # Check if attachments field was explicitly sent
        # Get existing attachments to delete files from storage
        existing_attachments_result = await db.execute(
            select(ResourceAttachment).where(ResourceAttachment.resource_id == resource_id)
        )
        existing_attachments = existing_attachments_result.scalars().all()
        
        # Get file paths from new attachments (to keep)
        new_attachment_paths = {att.file_path for att in resource_data.attachments if att.file_path}
        
        # Delete files from storage that are NOT in the new attachments list
        for existing_att in existing_attachments:
            # Only delete if this file is not being kept
            if existing_att.file_path not in new_attachment_paths:
                try:
                    if existing_att.file_path and EDUCATIONAL_RESOURCES_BUCKET in existing_att.file_path:
                        # Extract path from URL
                        path_in_bucket = existing_att.file_path.split(f"/{EDUCATIONAL_RESOURCES_BUCKET}/")[-1].split('?')[0]
                        supabase.storage.from_(EDUCATIONAL_RESOURCES_BUCKET).remove([path_in_bucket])
                except Exception as e:
                    logger.error(f"Error deleting attachment file {existing_att.attachment_id}: {e}")
                    # Continue even if file deletion fails
        
        # Delete existing attachments from database
        await db.execute(
            ResourceAttachment.__table__.delete().where(ResourceAttachment.resource_id == resource_id)
        )
        # Add new attachments
        for idx, att_data in enumerate(resource_data.attachments):
            new_attachment = ResourceAttachment(
                resource_id=resource.resource_id,
                file_name=att_data.file_name,
                file_path=att_data.file_path,
                file_type=att_data.file_type,
                file_size=att_data.file_size,
                mime_type=att_data.mime_type,
                display_order=att_data.display_order or idx,
            )
            db.add(new_attachment)
    
    await db.commit()
    await db.refresh(resource)

    # Refresh attachments for the response
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
    
    return ResourceOut(**resource_dict)

@router.delete("/resources/{resource_id}")
async def delete_resource(
    resource_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Delete a resource (content_manager only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if user.role not in ['admin', 'content_manager']:
        raise HTTPException(status_code=403, detail="Only admins and content managers can delete resources")
    
    resource = await db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    # Delete attachments from storage (cascade will handle database)
    attachments_result = await db.execute(
        select(ResourceAttachment).where(ResourceAttachment.resource_id == resource_id)
    )
    attachments = attachments_result.scalars().all()
    
    # Delete attachments from educational-resources bucket
    for attachment in attachments:
        try:
            # Extract path from URL
            if attachment.file_path:
                # Try to extract path from full URL
                if EDUCATIONAL_RESOURCES_BUCKET in attachment.file_path:
                    path_in_bucket = attachment.file_path.split(f"/{EDUCATIONAL_RESOURCES_BUCKET}/")[-1].split('?')[0]
                    supabase.storage.from_(EDUCATIONAL_RESOURCES_BUCKET).remove([path_in_bucket])
                    logger.info(f"✅ Deleted attachment from storage: {path_in_bucket}")
        except Exception as e:
            logger.error(f"Error deleting attachment file {attachment.attachment_id}: {e}")
            # Continue even if file deletion fails
    
    # Delete thumbnail from storage if it exists
    if resource.thumbnail_url:
        try:
            # Extract path from thumbnail URL
            if RESOURCE_THUMBNAILS_BUCKET in resource.thumbnail_url:
                thumbnail_path = resource.thumbnail_url.split(f"/{RESOURCE_THUMBNAILS_BUCKET}/")[-1].split('?')[0]
                supabase.storage.from_(RESOURCE_THUMBNAILS_BUCKET).remove([thumbnail_path])
                logger.info(f"✅ Deleted thumbnail from storage: {thumbnail_path}")
            else:
                logger.warning(f"⚠️ Thumbnail URL doesn't contain expected bucket name: {resource.thumbnail_url}")
        except Exception as e:
            logger.warning(f"⚠️ Error deleting thumbnail from storage: {e}")
            # Continue even if thumbnail deletion fails
    
    await db.delete(resource)
    await db.commit()
    
    return {"message": "Resource deleted successfully"}

@router.put("/resources/{resource_id}/publish")
async def publish_resource(
    resource_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Publish a resource (content_manager only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if user.role not in ['admin', 'content_manager']:
        raise HTTPException(status_code=403, detail="Only admins and content managers can publish resources")
    
    resource = await db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    resource.status = 'published'
    if not resource.published_at:
        resource.published_at = datetime.now()
    resource.updated_at = datetime.now()
    
    await db.commit()
    await db.refresh(resource)
    
    return {"message": "Resource published successfully", "status": "published"}

@router.put("/resources/{resource_id}/unpublish")
async def unpublish_resource(
    resource_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Unpublish a resource (content_manager only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if user.role not in ['admin', 'content_manager']:
        raise HTTPException(status_code=403, detail="Only admins and content managers can unpublish resources")
    
    resource = await db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    resource.status = 'draft'
    resource.published_at = None  # Unset published_at when unpublishing
    resource.updated_at = datetime.now()
    
    await db.commit()
    await db.refresh(resource)
    
    return {"message": "Resource unpublished successfully", "status": "draft"}

# --- Resource Attachment Endpoints ---

@router.post("/resources/{resource_id}/attachments", response_model=ResourceAttachmentOut)
async def upload_resource_attachment(
    resource_id: int,
    file: UploadFile = File(...),
    display_order: int = Form(0),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Upload an attachment for a resource (content_manager only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.role not in ['admin', 'content_manager']:
        raise HTTPException(status_code=403, detail="Only admins and content managers can upload attachments")

    resource = await db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    # Validate file size (10MB limit)
    MAX_FILE_SIZE_MB = 10
    if file.size and file.size > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File size exceeds {MAX_FILE_SIZE_MB}MB limit.")

    # Determine file type and validate
    mime_type = file.content_type or "application/octet-stream"
    file_type = 'document'
    allowed_image_types = ['image/jpeg', 'image/png', 'image/webp']
    allowed_video_types = ['video/mp4', 'video/webm']
    allowed_document_types = ['application/pdf']
    
    if mime_type.startswith('image/'):
        if mime_type not in allowed_image_types:
            raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are allowed (GIF not supported)")
        file_type = 'image'
    elif mime_type.startswith('video/'):
        if mime_type not in allowed_video_types:
            raise HTTPException(status_code=400, detail="Only MP4 and WebM videos are allowed")
        file_type = 'video'
    elif mime_type == 'application/pdf':
        file_type = 'document'
    else:
        raise HTTPException(status_code=400, detail="File type not allowed. Only images (JPEG, PNG, WebP), videos (MP4, WebM), and PDF documents are allowed.")

    # Upload to Supabase Storage
    file_extension = Path(file.filename).suffix if file.filename else ""
    if not file_extension:
        if file_type == 'image':
            file_extension = '.jpg' if 'jpeg' in mime_type else '.png'
        elif file_type == 'video':
            file_extension = '.mp4'
        else:
            file_extension = '.pdf'
    
    file_name_uuid = f"{uuid.uuid4()}{file_extension}"
    file_path_in_bucket = f"resources/{resource_id}/{file_name_uuid}"

    try:
        content = await file.read()
        upload_response = supabase.storage.from_(EDUCATIONAL_RESOURCES_BUCKET).upload(
            file_path_in_bucket,
            content,
            file_options={"content-type": mime_type, "upsert": "true"}
        )
        
        if isinstance(upload_response, dict) and upload_response.get('error'):
            error_msg = upload_response['error']
            logger.error(f"❌ Upload failed: {error_msg}")
            raise HTTPException(status_code=500, detail=f"Failed to upload file to storage: {error_msg}")
        
        # Get public URL
        public_url = supabase.storage.from_(EDUCATIONAL_RESOURCES_BUCKET).get_public_url(file_path_in_bucket)
        
        if isinstance(public_url, dict):
            public_url = public_url.get('publicUrl') or public_url.get('public_url')
        elif not isinstance(public_url, str):
            public_url = str(public_url)
        
        if not public_url or public_url == 'None':
            raise HTTPException(status_code=500, detail="Failed to get public URL from storage")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Supabase upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file to storage: {e}")
    
    new_attachment = ResourceAttachment(
        resource_id=resource_id,
        file_name=file.filename or "unknown",
        file_path=public_url,
        file_type=file_type,
        file_size=file.size,
        mime_type=mime_type,
        display_order=display_order,
    )
    db.add(new_attachment)
    await db.commit()
    await db.refresh(new_attachment)
    
    return ResourceAttachmentOut(
        attachment_id=new_attachment.attachment_id,
        resource_id=new_attachment.resource_id,
        file_name=new_attachment.file_name,
        file_path=new_attachment.file_path,
        file_type=new_attachment.file_type,
        file_size=new_attachment.file_size,
        mime_type=new_attachment.mime_type,
        display_order=new_attachment.display_order,
        created_at=new_attachment.created_at.isoformat() if new_attachment.created_at else None,
    )

@router.put("/attachments/{attachment_id}", response_model=ResourceAttachmentOut)
async def update_resource_attachment(
    attachment_id: int,
    attachment_data: ResourceAttachmentUpdate,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Update an existing resource attachment (content_manager only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.role not in ['admin', 'content_manager']:
        raise HTTPException(status_code=403, detail="Only admins and content managers can update attachments")

    attachment = await db.get(ResourceAttachment, attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    update_data = attachment_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(attachment, key):
            setattr(attachment, key, value)
    
    await db.commit()
    await db.refresh(attachment)
    
    return ResourceAttachmentOut(
        attachment_id=attachment.attachment_id,
        resource_id=attachment.resource_id,
        file_name=attachment.file_name,
        file_path=attachment.file_path,
        file_type=attachment.file_type,
        file_size=attachment.file_size,
        mime_type=attachment.mime_type,
        display_order=attachment.display_order,
        created_at=attachment.created_at.isoformat() if attachment.created_at else None,
    )

@router.delete("/attachments/{attachment_id}")
async def delete_resource_attachment(
    attachment_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Delete a resource attachment (content_manager only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.role not in ['admin', 'content_manager']:
        raise HTTPException(status_code=403, detail="Only admins and content managers can delete attachments")

    attachment = await db.get(ResourceAttachment, attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Delete from Supabase Storage
    try:
        if attachment.file_path and EDUCATIONAL_RESOURCES_BUCKET in attachment.file_path:
            # Extract path from URL
            path_in_bucket = attachment.file_path.split(f"/{EDUCATIONAL_RESOURCES_BUCKET}/")[-1].split('?')[0]
            supabase.storage.from_(EDUCATIONAL_RESOURCES_BUCKET).remove([path_in_bucket])
    except Exception as e:
        logger.error(f"Supabase delete error for attachment {attachment_id}: {e}")
        # Don't raise HTTPException, just log, as the database record is primary
    
    await db.delete(attachment)
    await db.commit()
    
    return {"message": "Attachment deleted successfully"}

# --- Thumbnail Upload Endpoint ---

@router.post("/resources/thumbnail/upload")
async def upload_thumbnail_temp(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user_flexible),
):
    """Upload a thumbnail image to temp folder and return the URL (for use before resource creation)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.role not in ['admin', 'content_manager']:
        raise HTTPException(status_code=403, detail="Only admins and content managers can upload thumbnails")

    # Validate file size (5MB limit for thumbnails)
    MAX_FILE_SIZE_MB = 5
    if file.size and file.size > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File size exceeds {MAX_FILE_SIZE_MB}MB limit.")

    # Validate file type - only images (no GIF)
    allowed_types = ['image/jpeg', 'image/png', 'image/webp']
    file_extension = Path(file.filename).suffix.lower() if file.filename else ""
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp']
    
    is_valid = False
    if file.content_type:
        is_valid = file.content_type in allowed_types
    elif file_extension:
        is_valid = file_extension in allowed_extensions
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="Only images are allowed (JPEG, PNG, WebP - GIF not supported)")

    # Upload to Supabase Storage (resource-thumbnails bucket) in temp folder
    file_extension = Path(file.filename).suffix if file.filename else ""
    if not file_extension:
        file_extension = '.jpg' if 'jpeg' in (file.content_type or '') else '.png'
    
    file_name_uuid = f"{uuid.uuid4()}{file_extension}"
    file_path_in_bucket = f"temp/{user.user_id}/{file_name_uuid}"

    try:
        content = await file.read()
        upload_response = supabase.storage.from_(RESOURCE_THUMBNAILS_BUCKET).upload(
            file_path_in_bucket,
            content,
            file_options={"content-type": file.content_type, "upsert": "true"}
        )
        
        if isinstance(upload_response, dict) and upload_response.get('error'):
            error_msg = upload_response['error']
            logger.error(f"❌ Upload failed: {error_msg}")
            raise HTTPException(status_code=500, detail=f"Failed to upload thumbnail to storage: {error_msg}")
        
        # Get public URL
        public_url = supabase.storage.from_(RESOURCE_THUMBNAILS_BUCKET).get_public_url(file_path_in_bucket)
        
        if isinstance(public_url, dict):
            public_url = public_url.get('publicUrl') or public_url.get('public_url')
        elif not isinstance(public_url, str):
            public_url = str(public_url)
        
        if not public_url or public_url == 'None':
            raise HTTPException(status_code=500, detail="Failed to get public URL from storage")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Supabase thumbnail upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload thumbnail to storage: {e}")
    
    return {
        "message": "Thumbnail uploaded successfully",
        "url": public_url,
        "thumbnail_url": public_url  # For compatibility
    }

@router.post("/resources/{resource_id}/thumbnail")
async def upload_resource_thumbnail(
    resource_id: int,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Upload a thumbnail image for a resource (content_manager only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.role not in ['admin', 'content_manager']:
        raise HTTPException(status_code=403, detail="Only admins and content managers can upload thumbnails")

    resource = await db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    # Validate file size (10MB limit)
    MAX_FILE_SIZE_MB = 10
    if file.size and file.size > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File size exceeds {MAX_FILE_SIZE_MB}MB limit.")

    # Validate file type - only images (no GIF)
    allowed_types = ['image/jpeg', 'image/png', 'image/webp']
    file_extension = Path(file.filename).suffix.lower() if file.filename else ""
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp']
    
    is_valid = False
    if file.content_type:
        is_valid = file.content_type in allowed_types
    elif file_extension:
        is_valid = file_extension in allowed_extensions
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="Only images are allowed (JPEG, PNG, WebP - GIF not supported)")

    # Upload to Supabase Storage (resource-thumbnails bucket)
    file_extension = Path(file.filename).suffix if file.filename else ""
    if not file_extension:
        file_extension = '.jpg' if 'jpeg' in (file.content_type or '') else '.png'
    
    file_name_uuid = f"{uuid.uuid4()}{file_extension}"
    file_path_in_bucket = f"{resource_id}/{file_name_uuid}"

    try:
        content = await file.read()
        upload_response = supabase.storage.from_(RESOURCE_THUMBNAILS_BUCKET).upload(
            file_path_in_bucket,
            content,
            file_options={"content-type": file.content_type, "upsert": "true"}
        )
        
        if isinstance(upload_response, dict) and upload_response.get('error'):
            error_msg = upload_response['error']
            logger.error(f"❌ Upload failed: {error_msg}")
            raise HTTPException(status_code=500, detail=f"Failed to upload thumbnail to storage: {error_msg}")
        
        # Get public URL
        public_url = supabase.storage.from_(RESOURCE_THUMBNAILS_BUCKET).get_public_url(file_path_in_bucket)
        
        if isinstance(public_url, dict):
            public_url = public_url.get('publicUrl') or public_url.get('public_url')
        elif not isinstance(public_url, str):
            public_url = str(public_url)
        
        if not public_url or public_url == 'None':
            raise HTTPException(status_code=500, detail="Failed to get public URL from storage")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Supabase thumbnail upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload thumbnail to storage: {e}")
    
    # Update resource thumbnail_url
    resource.thumbnail_url = public_url
    await db.commit()
    await db.refresh(resource)
    
    return {
        "message": "Thumbnail uploaded successfully",
        "thumbnail_url": public_url
    }

