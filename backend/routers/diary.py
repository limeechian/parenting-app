# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: diary.py
# Description: To handle diary entry endpoints including CRUD operations, drafts, and attachment management
# First Written on: Thursday, 02-Oct-2025
# Edited on: Sunday, 10-Dec-2025

"""
Diary router - Handles diary entries, drafts, and attachments

This router provides endpoints for:
- Diary entries (CRUD operations with filtering)
- Diary drafts (save/load draft entries)
- Diary attachments (upload/manage photos and videos)

All endpoints require authentication and enforce user ownership.
Attachments are stored in Supabase Storage with signed URLs for private access.
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, date
from pathlib import Path
import uuid
from typing import Optional

from dependencies import get_current_user_flexible, get_session
from models.database import User, DiaryEntry, DiaryDraft, DiaryAttachment
from schemas.schemas import DiaryEntryIn, DiaryDraftIn, DiaryAttachmentIn
from utils.helpers import normalize_string_array
from config import supabase, DIARY_ATTACHMENTS_BUCKET, logger

# Initialize router with prefix and tags for API documentation
router = APIRouter(prefix="/diary", tags=["diary"])

# ============================================================================
# Diary Entries Endpoints
# ============================================================================

@router.get("/entries")
async def get_diary_entries(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    child_id: Optional[int] = None
):
    """
    Get diary entries with optional filtering
    
    Retrieves diary entries for the authenticated user with optional filters:
    - Date range (start_date, end_date)
    - Child ID (filter by specific child)
    
    Entries are ordered by entry_date (newest first), then created_at.
    
    Args:
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
        start_date: Optional start date filter (YYYY-MM-DD format)
        end_date: Optional end date filter (YYYY-MM-DD format)
        child_id: Optional child ID filter
    
    Returns:
        dict: Dictionary with 'entries' list containing serialized diary entries
    
    Raises:
        HTTPException: If entry retrieval fails
    """
    try:
        query = select(DiaryEntry).where(DiaryEntry.user_id == user.user_id)
        
        if start_date:
            start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
            query = query.where(DiaryEntry.entry_date >= start_date_obj)
        
        if end_date:
            end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.where(DiaryEntry.entry_date <= end_date_obj)
        
        if child_id:
            query = query.where(DiaryEntry.child_id == child_id)
        
        query = query.order_by(DiaryEntry.entry_date.desc(), DiaryEntry.created_at.desc())
        
        result = await db.execute(query)
        entries = result.scalars().all()
        
        serialized_entries = []
        for entry in entries:
            entry_dict = {
                "entry_id": entry.entry_id,
                "child_id": entry.child_id,
                "entry_date": entry.entry_date.isoformat() if entry.entry_date else None,
                "entry_type": entry.entry_type,
                "title": entry.title,
                "content": entry.content,
                "parent_mood": entry.parent_mood,
                "child_mood": entry.child_mood,
                "observed_behaviors": entry.observed_behaviors or [],
                "challenges_encountered": entry.challenges_encountered or [],
                "strategies_used": entry.strategies_used or [],
                "time_of_day": entry.time_of_day,
                "duration": entry.duration,
                "effectiveness": entry.effectiveness,
                "emotion_intensity": entry.emotion_intensity,
                "stress_level": entry.stress_level,
                "triggers_identified": entry.triggers_identified or [],
                "coping_strategies": entry.coping_strategies or [],
                "physical_symptoms": entry.physical_symptoms or [],
                "environmental_factors": entry.environmental_factors,
                "situation_description": entry.situation_description,
                "intervention_used": entry.intervention_used,
                "immediate_outcome": entry.immediate_outcome,
                "effectiveness_rating": entry.effectiveness_rating,
                "would_use_again": entry.would_use_again,
                "skills_observed": entry.skills_observed or [],
                "improvements_observed": entry.improvements_observed,
                "setbacks_concerns": entry.setbacks_concerns,
                "next_goals": entry.next_goals,
                "professional_recommendations": entry.professional_recommendations,
                "tags": entry.tags or [],
                "created_at": entry.created_at.isoformat() if entry.created_at else None,
                "updated_at": entry.updated_at.isoformat() if entry.updated_at else None
            }
            serialized_entries.append(entry_dict)
        
        return {"entries": serialized_entries}
    
    except Exception as e:
        print(f"Error fetching diary entries: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch diary entries: {str(e)}")

@router.get("/entries/{entry_id}")
async def get_diary_entry(
    entry_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Get a specific diary entry
    
    Retrieves a single diary entry by ID. Verifies ownership before returning.
    
    Args:
        entry_id: ID of the diary entry to retrieve
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Serialized diary entry data
    
    Raises:
        HTTPException:
            - 404 if entry not found or user doesn't own it
            - 500 if retrieval fails
    """
    try:
        result = await db.execute(
            select(DiaryEntry).where(
                DiaryEntry.entry_id == entry_id,
                DiaryEntry.user_id == user.user_id
            )
        )
        entry = result.scalar_one_or_none()
        
        if not entry:
            raise HTTPException(status_code=404, detail="Diary entry not found")
        
        entry_dict = {
            "entry_id": entry.entry_id,
            "child_id": entry.child_id,
            "entry_date": entry.entry_date.isoformat() if entry.entry_date else None,
            "entry_type": entry.entry_type,
            "title": entry.title,
            "content": entry.content,
            "parent_mood": entry.parent_mood,
            "child_mood": entry.child_mood,
            "observed_behaviors": entry.observed_behaviors or [],
            "challenges_encountered": entry.challenges_encountered or [],
            "strategies_used": entry.strategies_used or [],
            "time_of_day": entry.time_of_day,
            "duration": entry.duration,
            "effectiveness": entry.effectiveness,
            "emotion_intensity": entry.emotion_intensity,
            "stress_level": entry.stress_level,
            "triggers_identified": entry.triggers_identified or [],
            "coping_strategies": entry.coping_strategies or [],
            "physical_symptoms": entry.physical_symptoms or [],
            "environmental_factors": entry.environmental_factors,
            "situation_description": entry.situation_description,
            "intervention_used": entry.intervention_used,
            "immediate_outcome": entry.immediate_outcome,
            "effectiveness_rating": entry.effectiveness_rating,
            "would_use_again": entry.would_use_again,
            "skills_observed": entry.skills_observed or [],
            "improvements_observed": entry.improvements_observed,
            "setbacks_concerns": entry.setbacks_concerns,
            "next_goals": entry.next_goals,
            "professional_recommendations": entry.professional_recommendations,
            "tags": entry.tags or [],
            "created_at": entry.created_at.isoformat() if entry.created_at else None,
            "updated_at": entry.updated_at.isoformat() if entry.updated_at else None
        }
        
        return entry_dict
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching diary entry: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch diary entry: {str(e)}")

@router.post("/entries")
async def create_diary_entry(
    entry: DiaryEntryIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Create a new diary entry
    
    Creates a new diary entry for the authenticated user.
    Handles date parsing, array field normalization, and validation.
    
    Args:
        entry: Diary entry data (from request body)
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Created diary entry data with serialized dates
    
    Raises:
        HTTPException:
            - 400 if entry_date is missing or invalid format
            - 500 if entry creation fails
    """
    try:
        entry_data = entry.dict()
        
        if "entry_date" in entry_data:
            if entry_data["entry_date"] and entry_data["entry_date"].strip():
                try:
                    entry_data["entry_date"] = datetime.strptime(entry_data["entry_date"], "%Y-%m-%d").date()
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
            else:
                raise HTTPException(status_code=400, detail="Entry date is required")
        
        entry_data["observed_behaviors"] = normalize_string_array(entry_data.get("observed_behaviors"))
        entry_data["challenges_encountered"] = normalize_string_array(entry_data.get("challenges_encountered"))
        entry_data["strategies_used"] = normalize_string_array(entry_data.get("strategies_used"))
        entry_data["triggers_identified"] = normalize_string_array(entry_data.get("triggers_identified"))
        entry_data["coping_strategies"] = normalize_string_array(entry_data.get("coping_strategies"))
        entry_data["physical_symptoms"] = normalize_string_array(entry_data.get("physical_symptoms"))
        entry_data["skills_observed"] = normalize_string_array(entry_data.get("skills_observed"))
        entry_data["tags"] = normalize_string_array(entry_data.get("tags"))
        
        new_entry = DiaryEntry(user_id=user.user_id, **entry_data)
        db.add(new_entry)
        await db.commit()
        await db.refresh(new_entry)
        
        entry_dict = {
            "entry_id": new_entry.entry_id,
            "child_id": new_entry.child_id,
            "entry_date": new_entry.entry_date.isoformat() if new_entry.entry_date else None,
            "entry_type": new_entry.entry_type,
            "title": new_entry.title,
            "content": new_entry.content,
            "parent_mood": new_entry.parent_mood,
            "child_mood": new_entry.child_mood,
            "created_at": new_entry.created_at.isoformat() if new_entry.created_at else None
        }
        
        return entry_dict
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating diary entry: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create diary entry: {str(e)}")

@router.put("/entries/{entry_id}")
async def update_diary_entry(
    entry_id: int,
    entry: DiaryEntryIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Update an existing diary entry
    
    Updates a diary entry. Verifies ownership before allowing update.
    Handles date parsing, array normalization, and field updates.
    
    Args:
        entry_id: ID of the diary entry to update
        entry: Updated diary entry data (from request body)
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Updated diary entry data with serialized dates
    
    Raises:
        HTTPException:
            - 404 if entry not found or user doesn't own it
            - 400 if entry_date is missing or invalid format
            - 500 if update fails
    """
    try:
        result = await db.execute(
            select(DiaryEntry).where(
                DiaryEntry.entry_id == entry_id,
                DiaryEntry.user_id == user.user_id
            )
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            raise HTTPException(status_code=404, detail="Diary entry not found")
        
        entry_data = entry.dict()
        
        if "entry_date" in entry_data:
            if entry_data["entry_date"] and entry_data["entry_date"].strip():
                try:
                    entry_data["entry_date"] = datetime.strptime(entry_data["entry_date"], "%Y-%m-%d").date()
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
            else:
                raise HTTPException(status_code=400, detail="Entry date is required")
        
        entry_data["observed_behaviors"] = normalize_string_array(entry_data.get("observed_behaviors"))
        entry_data["challenges_encountered"] = normalize_string_array(entry_data.get("challenges_encountered"))
        entry_data["strategies_used"] = normalize_string_array(entry_data.get("strategies_used"))
        entry_data["triggers_identified"] = normalize_string_array(entry_data.get("triggers_identified"))
        entry_data["coping_strategies"] = normalize_string_array(entry_data.get("coping_strategies"))
        entry_data["physical_symptoms"] = normalize_string_array(entry_data.get("physical_symptoms"))
        entry_data["skills_observed"] = normalize_string_array(entry_data.get("skills_observed"))
        entry_data["tags"] = normalize_string_array(entry_data.get("tags"))
        
        for key, value in entry_data.items():
            setattr(existing, key, value)
        
        existing.updated_at = datetime.utcnow()
        existing.updated_by = user.user_id
        
        db.add(existing)
        await db.commit()
        await db.refresh(existing)
        
        entry_dict = {
            "entry_id": existing.entry_id,
            "child_id": existing.child_id,
            "entry_date": existing.entry_date.isoformat() if existing.entry_date else None,
            "entry_type": existing.entry_type,
            "title": existing.title,
            "content": existing.content,
            "parent_mood": existing.parent_mood,
            "child_mood": existing.child_mood,
            "updated_at": existing.updated_at.isoformat() if existing.updated_at else None
        }
        
        return entry_dict
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating diary entry: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update diary entry: {str(e)}")

async def delete_diary_attachments_from_storage(db: AsyncSession, entry_id: int) -> None:
    """Delete all diary entry attachments from Supabase Storage"""
    try:
        # Get all attachments for this entry
        attachments_result = await db.execute(
            select(DiaryAttachment).where(
                DiaryAttachment.entry_id == entry_id
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
                    # Extract the path from the Supabase URL
                    # URL format: https://project.supabase.co/storage/v1/object/public/bucket/path/to/file
                    # OR: https://project.supabase.co/storage/v1/object/sign/bucket/path/to/file?token=...
                    url_parts = attachment.file_path.split('/')
                    if DIARY_ATTACHMENTS_BUCKET in url_parts:
                        bucket_index = url_parts.index(DIARY_ATTACHMENTS_BUCKET)
                        file_path = '/'.join(url_parts[bucket_index + 1:]).split('?')[0]  # Remove query params if present
                        file_paths_to_delete.append(file_path)
                except Exception as e:
                    logger.warning(f"⚠️ Error extracting file path from URL {attachment.file_path}: {e}")
                    continue
        
        if file_paths_to_delete:
            logger.info(f"🗑️ Deleting {len(file_paths_to_delete)} diary attachment(s) from Supabase Storage")
            delete_result = supabase.storage.from_(DIARY_ATTACHMENTS_BUCKET).remove(file_paths_to_delete)
            
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
                logger.info(f"✅ {len(file_paths_to_delete)} diary attachment(s) deleted from Supabase Storage")
    except Exception as e:
        logger.warning(f"⚠️ Error deleting diary attachments from storage: {e}")
        # Continue even if storage deletion fails

@router.delete("/entries/{entry_id}")
async def delete_diary_entry(
    entry_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Delete a diary entry
    
    Permanently deletes a diary entry and all its attachments from both database and Supabase Storage.
    Verifies ownership before deletion.
    
    Args:
        entry_id: ID of the diary entry to delete
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Deletion confirmation with status and entry_id
    
    Raises:
        HTTPException:
            - 404 if entry not found or user doesn't own it
            - 500 if deletion fails
    """
    try:
        result = await db.execute(
            select(DiaryEntry).where(
                DiaryEntry.entry_id == entry_id,
                DiaryEntry.user_id == user.user_id
            )
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            raise HTTPException(status_code=404, detail="Diary entry not found")
        
        # Delete all attachments from Supabase Storage before deleting the entry
        # (CASCADE will handle database deletion of attachment records)
        await delete_diary_attachments_from_storage(db, entry_id)
        
        # Delete the entry (CASCADE will delete attachment records from database)
        await db.delete(existing)
        await db.commit()
        
        return {"status": "deleted", "entry_id": entry_id}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting diary entry: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete diary entry: {str(e)}")

# ============================================================================
# Diary Drafts Endpoints
# ============================================================================

@router.get("/drafts")
async def get_diary_drafts(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Get all diary drafts for the current user
    
    Retrieves all saved drafts for the authenticated user.
    Drafts are ordered by updated_at (most recently updated first).
    
    Args:
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Dictionary with 'drafts' list containing serialized draft data
    
    Raises:
        HTTPException: If draft retrieval fails
    """
    try:
        result = await db.execute(
            select(DiaryDraft).where(DiaryDraft.user_id == user.user_id)
            .order_by(DiaryDraft.updated_at.desc())
        )
        drafts = result.scalars().all()
        
        serialized_drafts = []
        for draft in drafts:
            draft_dict = {
                "draft_id": draft.draft_id,
                "child_id": draft.child_id,
                "entry_date": draft.entry_date.isoformat() if draft.entry_date else None,
                "entry_type": draft.entry_type,
                "title": draft.title,
                "form_data": draft.form_data,
                "created_at": draft.created_at.isoformat() if draft.created_at else None,
                "updated_at": draft.updated_at.isoformat() if draft.updated_at else None
            }
            serialized_drafts.append(draft_dict)
        
        return {"drafts": serialized_drafts}
    
    except Exception as e:
        print(f"Error fetching diary drafts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch diary drafts: {str(e)}")

@router.get("/drafts/{draft_id}")
async def get_diary_draft(
    draft_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get a specific diary draft"""
    try:
        result = await db.execute(
            select(DiaryDraft).where(
                DiaryDraft.draft_id == draft_id,
                DiaryDraft.user_id == user.user_id
            )
        )
        draft = result.scalar_one_or_none()
        
        if not draft:
            raise HTTPException(status_code=404, detail="Diary draft not found")
        
        draft_dict = {
            "draft_id": draft.draft_id,
            "child_id": draft.child_id,
            "entry_date": draft.entry_date.isoformat() if draft.entry_date else None,
            "entry_type": draft.entry_type,
            "title": draft.title,
            "form_data": draft.form_data,
            "created_at": draft.created_at.isoformat() if draft.created_at else None,
            "updated_at": draft.updated_at.isoformat() if draft.updated_at else None
        }
        
        return draft_dict
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching diary draft: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch diary draft: {str(e)}")

@router.post("/drafts")
async def create_diary_draft(
    draft: DiaryDraftIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Create a new diary draft"""
    try:
        draft_data = draft.dict()
        
        if "entry_date" in draft_data and draft_data["entry_date"]:
            try:
                draft_data["entry_date"] = datetime.strptime(draft_data["entry_date"], "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        new_draft = DiaryDraft(user_id=user.user_id, **draft_data)
        db.add(new_draft)
        await db.commit()
        await db.refresh(new_draft)
        
        draft_dict = {
            "draft_id": new_draft.draft_id,
            "child_id": new_draft.child_id,
            "entry_date": new_draft.entry_date.isoformat() if new_draft.entry_date else None,
            "entry_type": new_draft.entry_type,
            "title": new_draft.title,
            "form_data": new_draft.form_data,
            "created_at": new_draft.created_at.isoformat() if new_draft.created_at else None
        }
        
        return draft_dict
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating diary draft: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create diary draft: {str(e)}")

@router.put("/drafts/{draft_id}")
async def update_diary_draft(
    draft_id: int,
    draft: DiaryDraftIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Update an existing diary draft"""
    try:
        result = await db.execute(
            select(DiaryDraft).where(
                DiaryDraft.draft_id == draft_id,
                DiaryDraft.user_id == user.user_id
            )
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            raise HTTPException(status_code=404, detail="Diary draft not found")
        
        draft_data = draft.dict()
        
        if "entry_date" in draft_data and draft_data["entry_date"]:
            try:
                draft_data["entry_date"] = datetime.strptime(draft_data["entry_date"], "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        for key, value in draft_data.items():
            setattr(existing, key, value)
        
        existing.updated_at = datetime.utcnow()
        
        db.add(existing)
        await db.commit()
        await db.refresh(existing)
        
        draft_dict = {
            "draft_id": existing.draft_id,
            "child_id": existing.child_id,
            "entry_date": existing.entry_date.isoformat() if existing.entry_date else None,
            "entry_type": existing.entry_type,
            "title": existing.title,
            "form_data": existing.form_data,
            "updated_at": existing.updated_at.isoformat() if existing.updated_at else None
        }
        
        return draft_dict
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating diary draft: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update diary draft: {str(e)}")

@router.delete("/drafts/{draft_id}")
async def delete_diary_draft(
    draft_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Delete a diary draft"""
    try:
        result = await db.execute(
            select(DiaryDraft).where(
                DiaryDraft.draft_id == draft_id,
                DiaryDraft.user_id == user.user_id
            )
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            raise HTTPException(status_code=404, detail="Diary draft not found")
        
        await db.delete(existing)
        await db.commit()
        
        return {"status": "deleted", "draft_id": draft_id}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting diary draft: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete diary draft: {str(e)}")

# ============================================================================
# Diary Attachments Endpoints
# ============================================================================

@router.get("/entries/{entry_id}/attachments")
async def get_diary_attachments(
    entry_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Get all attachments for a diary entry
    
    Retrieves all attachments (photos/videos) for a diary entry.
    Generates signed URLs for attachments stored in private Supabase bucket.
    Verifies entry ownership before returning attachments.
    
    Args:
        entry_id: ID of the diary entry
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Dictionary with 'attachments' list containing attachment data with signed URLs
    
    Raises:
        HTTPException:
            - 404 if entry not found or user doesn't own it
            - 500 if attachment retrieval fails
    """
    try:
        entry_result = await db.execute(
            select(DiaryEntry).where(
                DiaryEntry.entry_id == entry_id,
                DiaryEntry.user_id == user.user_id
            )
        )
        entry = entry_result.scalar_one_or_none()
        
        if not entry:
            raise HTTPException(status_code=404, detail="Diary entry not found")
        
        result = await db.execute(
            select(DiaryAttachment).where(DiaryAttachment.entry_id == entry_id)
        )
        attachments = result.scalars().all()
        
        # Generate signed URLs for attachments (private bucket requires signed URLs)
        attachment_list = []
        for att in attachments:
            # Generate signed URL for each attachment (expires in 1 hour)
            signed_url = att.file_path  # Default to stored path
            try:
                if att.file_path and not att.file_path.startswith('http'):
                    # If file_path is a relative path (not already a URL), generate signed URL
                    signed_url_response = supabase.storage.from_(DIARY_ATTACHMENTS_BUCKET).create_signed_url(
                        att.file_path,
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
                        signed_url = att.file_path  # Fallback to stored path
                elif att.file_path and att.file_path.startswith('http') and DIARY_ATTACHMENTS_BUCKET in att.file_path:
                    # If file_path is a public URL, try to extract the path and generate signed URL
                    # This handles the case where bucket is private but public URLs were stored
                    try:
                        # Extract path from URL: https://...supabase.co/storage/v1/object/public/diary-attachments/33/file.jpg
                        url_parts = att.file_path.split('/')
                        if DIARY_ATTACHMENTS_BUCKET in url_parts:
                            bucket_index = url_parts.index(DIARY_ATTACHMENTS_BUCKET)
                            file_path = '/'.join(url_parts[bucket_index + 1:]).split('?')[0]  # Remove query params
                            
                            # Generate signed URL for private bucket
                            signed_url_response = supabase.storage.from_(DIARY_ATTACHMENTS_BUCKET).create_signed_url(
                                file_path,
                                expires_in=3600  # 1 hour expiration
                            )
                            
                            if isinstance(signed_url_response, dict):
                                signed_url = signed_url_response.get('signedURL') or signed_url_response.get('signed_url') or signed_url_response.get('url')
                            elif isinstance(signed_url_response, str):
                                signed_url = signed_url_response
                            else:
                                signed_url = str(signed_url_response)
                            
                            if not signed_url or signed_url == 'None':
                                signed_url = att.file_path  # Fallback to stored public URL
                    except Exception as e:
                        logger.warning(f"Failed to extract path from public URL for attachment {att.attachment_id}: {e}")
                        # If extraction fails, use the stored public URL (bucket might be public)
                        signed_url = att.file_path
            except Exception as e:
                logger.warning(f"Failed to generate signed URL for attachment {att.attachment_id}: {e}")
                signed_url = att.file_path  # Fallback to stored path
            
            attachment_list.append({
                "attachment_id": att.attachment_id,
                "file_name": att.file_name,
                "file_path": signed_url,  # Return signed URL (or stored path if generation failed)
                "file_type": att.file_type,
                "file_size": att.file_size,
                "mime_type": att.mime_type,
                "is_primary": att.is_primary,
                "created_at": att.created_at.isoformat() if att.created_at else None
            })
        
        return {"attachments": attachment_list}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting diary attachments: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get diary attachments: {str(e)}")

@router.post("/entries/{entry_id}/attachments")
async def create_diary_attachment(
    entry_id: int,
    attachment: DiaryAttachmentIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Create a new attachment for a diary entry"""
    try:
        entry_result = await db.execute(
            select(DiaryEntry).where(
                DiaryEntry.entry_id == entry_id,
                DiaryEntry.user_id == user.user_id
            )
        )
        entry = entry_result.scalar_one_or_none()
        
        if not entry:
            raise HTTPException(status_code=404, detail="Diary entry not found")
        
        new_attachment = DiaryAttachment(
            entry_id=entry_id,
            file_name=attachment.file_name,
            file_path=attachment.file_path,
            file_type=attachment.file_type,
            file_size=attachment.file_size,
            mime_type=attachment.mime_type,
            is_primary=attachment.is_primary
        )
        
        db.add(new_attachment)
        await db.commit()
        await db.refresh(new_attachment)
        
        return {
            "attachment_id": new_attachment.attachment_id,
            "file_name": new_attachment.file_name,
            "file_path": new_attachment.file_path,
            "file_type": new_attachment.file_type,
            "file_size": new_attachment.file_size,
            "mime_type": new_attachment.mime_type,
            "is_primary": new_attachment.is_primary,
            "created_at": new_attachment.created_at.isoformat() if new_attachment.created_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating diary attachment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create diary attachment: {str(e)}")

@router.put("/attachments/{attachment_id}")
async def update_diary_attachment(
    attachment_id: int,
    attachment: DiaryAttachmentIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Update a diary attachment"""
    try:
        result = await db.execute(
            select(DiaryAttachment, DiaryEntry).join(DiaryEntry).where(
                DiaryAttachment.attachment_id == attachment_id,
                DiaryEntry.user_id == user.user_id
            )
        )
        attachment_data = result.first()
        
        if not attachment_data:
            raise HTTPException(status_code=404, detail="Diary attachment not found")
        
        existing_attachment = attachment_data[0]
        
        existing_attachment.file_name = attachment.file_name
        existing_attachment.file_path = attachment.file_path
        existing_attachment.file_type = attachment.file_type
        existing_attachment.file_size = attachment.file_size
        existing_attachment.mime_type = attachment.mime_type
        existing_attachment.is_primary = attachment.is_primary
        
        await db.commit()
        await db.refresh(existing_attachment)
        
        return {
            "attachment_id": existing_attachment.attachment_id,
            "file_name": existing_attachment.file_name,
            "file_path": existing_attachment.file_path,
            "file_type": existing_attachment.file_type,
            "file_size": existing_attachment.file_size,
            "mime_type": existing_attachment.mime_type,
            "is_primary": existing_attachment.is_primary,
            "created_at": existing_attachment.created_at.isoformat() if existing_attachment.created_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating diary attachment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update diary attachment: {str(e)}")

@router.delete("/attachments/{attachment_id}")
async def delete_diary_attachment(
    attachment_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Delete a diary attachment from both database and Supabase Storage"""
    try:
        result = await db.execute(
            select(DiaryAttachment, DiaryEntry).join(DiaryEntry).where(
                DiaryAttachment.attachment_id == attachment_id,
                DiaryEntry.user_id == user.user_id
            )
        )
        attachment_data = result.first()
        
        if not attachment_data:
            raise HTTPException(status_code=404, detail="Diary attachment not found")
        
        existing_attachment = attachment_data[0]
        
        if existing_attachment.file_path:
            try:
                url_parts = existing_attachment.file_path.split('/')
                bucket_index = url_parts.index(DIARY_ATTACHMENTS_BUCKET)
                file_path = '/'.join(url_parts[bucket_index + 1:])
                
                delete_result = supabase.storage.from_(DIARY_ATTACHMENTS_BUCKET).remove([file_path])
                
                # Check for errors in the result
                if isinstance(delete_result, dict) and delete_result.get('error'):
                    error_msg = delete_result['error']
                    logger.warning(f"⚠️ Failed to delete diary attachment file from Supabase Storage: {error_msg}")
                elif hasattr(delete_result, 'data') and isinstance(delete_result.data, dict) and delete_result.data.get('error'):
                    error_msg = delete_result.data['error']
                    logger.warning(f"⚠️ Failed to delete diary attachment file from Supabase Storage: {error_msg}")
                elif hasattr(delete_result, 'status_code') and delete_result.status_code >= 400:
                    logger.warning(f"⚠️ Failed to delete diary attachment file from Supabase Storage (HTTP {delete_result.status_code})")
                else:
                    logger.info(f"✅ Successfully deleted diary attachment file from storage: {file_path}")
            except Exception as e:
                logger.warning(f"⚠️ Error extracting file path or deleting diary attachment from storage: {e}")
                # Continue with database deletion even if storage deletion fails
        
        await db.delete(existing_attachment)
        await db.commit()
        
        return {"message": "Diary attachment deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting diary attachment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete diary attachment: {str(e)}")

@router.post("/entries/{entry_id}/upload-attachment")
async def upload_diary_attachment(
    entry_id: int,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Upload a file attachment for a diary entry using Supabase Storage
    
    Uploads a photo or video attachment for a diary entry.
    Files are stored in a private Supabase bucket with signed URLs for access.
    
    Validates:
    - File size (max 10MB)
    - File type (images: JPEG, PNG, GIF, WebP; videos: MP4, AVI, MOV, WMV)
    
    Args:
        entry_id: ID of the diary entry to attach file to
        file: File to upload (from multipart form)
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Upload confirmation with attachment metadata
    
    Raises:
        HTTPException:
            - 404 if entry not found or user doesn't own it
            - 400 if file too large or invalid type
            - 500 if upload fails
    """
    try:
        entry_result = await db.execute(
            select(DiaryEntry).where(
                DiaryEntry.entry_id == entry_id,
                DiaryEntry.user_id == user.user_id
            )
        )
        entry = entry_result.scalar_one_or_none()
        
        if not entry:
            raise HTTPException(status_code=404, detail="Diary entry not found")
        
        if file.size and file.size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
        
        # Validate file type - photos and videos
        # Note: 'image/jpeg' is the correct MIME type for both .jpg and .jpeg files
        allowed_types = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/quicktime'
        ]
        
        # Get file extension for fallback validation
        file_extension = Path(file.filename).suffix.lower() if file.filename else ""
        allowed_image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        allowed_video_extensions = ['.mp4', '.avi', '.mov', '.wmv']
        allowed_extensions = allowed_image_extensions + allowed_video_extensions
        
        # Validate: check content_type first, fallback to file extension if content_type is missing
        is_valid = False
        if file.content_type:
            is_valid = file.content_type in allowed_types
        elif file_extension:
            is_valid = file_extension in allowed_extensions
        
        if not is_valid:
            raise HTTPException(status_code=400, detail="Only photos and videos are allowed")
        
        content = await file.read()
        
        file_extension = Path(file.filename).suffix if file.filename else ""
        if not file_extension:
            if file.content_type.startswith('image/'):
                file_extension = '.jpg' if 'jpeg' in file.content_type else '.png'
            elif file.content_type.startswith('video/'):
                file_extension = '.mp4'
        
        unique_filename = f"{entry_id}/{uuid.uuid4()}{file_extension}"
        
        logger.info(f"🔄 Uploading file to Supabase Storage...")
        logger.info(f"📦 Bucket: {DIARY_ATTACHMENTS_BUCKET}, Filename: {unique_filename}")
        
        try:
            upload_response = supabase.storage.from_(DIARY_ATTACHMENTS_BUCKET).upload(
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
        
        # For private bucket, store relative path and generate signed URL
        # Store the relative path in database for generating signed URLs on-demand
        file_path_storage = unique_filename  # Store relative path: {entry_id}/{uuid}.{ext}
        
        # Generate signed URL (for private bucket - expires in 1 hour)
        try:
            signed_url_response = supabase.storage.from_(DIARY_ATTACHMENTS_BUCKET).create_signed_url(
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
        
        file_type = "image" if file.content_type.startswith('image/') else "video"
        
        # Create database record
        # Store the relative path (not the signed URL) for generating signed URLs on-demand
        new_attachment = DiaryAttachment(
            entry_id=entry_id,
            file_name=file.filename or "unknown",
            file_path=file_path_storage,  # Store relative path for signed URL generation
            file_type=file_type,
            file_size=len(content),
            mime_type=file.content_type,
            is_primary=False
        )
        
        db.add(new_attachment)
        await db.commit()
        await db.refresh(new_attachment)
        
        return {
            "attachment_id": new_attachment.attachment_id,
            "file_name": new_attachment.file_name,
            "file_path": new_attachment.file_path,
            "file_type": new_attachment.file_type,
            "file_size": new_attachment.file_size,
            "mime_type": new_attachment.mime_type,
            "is_primary": new_attachment.is_primary,
            "created_at": new_attachment.created_at.isoformat() if new_attachment.created_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading diary attachment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload diary attachment: {str(e)}")

