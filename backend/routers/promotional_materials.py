# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: promotional_materials.py
# Description: To handle promotional material endpoints for professionals to submit and manage promotional content
# First Written on: Tuesday, 14-Oct-2025
# Edited on: Sunday, 10-Dec-2025

"""
Promotional Materials router - Handles promotional content submission and management for professionals

This router provides endpoints for:
- Promotional material submission (banners, events, campaigns)
- Material management (CRUD operations)
- Image uploads for promotional materials
- Status tracking (pending, approved, rejected)

All endpoints require professional role and verified professional profile.
Materials are stored in Supabase Storage and require coordinator approval.
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional, List
from datetime import datetime, date
from pathlib import Path
import uuid

from dependencies import get_current_user_flexible, get_session
from models.database import User, ProfessionalProfile, PromotionalMaterial
from schemas.schemas import PromotionalMaterialIn, PromotionalMaterialOut
from config import logger, supabase, PROMOTIONAL_MATERIALS_BUCKET

# Initialize router with prefix and tags for API documentation
router = APIRouter(prefix="/promotional-materials", tags=["promotional-materials"])

# ============================================================================
# Helper Functions
# ============================================================================

async def verify_professional(user: User, db: AsyncSession) -> ProfessionalProfile:
    """
    Verify user is a professional and has a profile
    
    Args:
        user: User to verify
        db: Database session
    
    Returns:
        ProfessionalProfile: User's professional profile
    
    Raises:
        HTTPException: 403 if user is not a professional or profile not found
    """
    if user.role != 'professional':
        raise HTTPException(status_code=403, detail="Only professionals can submit promotional materials")
    
    result = await db.execute(
        select(ProfessionalProfile).where(ProfessionalProfile.user_id == user.user_id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Professional profile not found. Please complete your profile first.")
    
    return profile

# Upload promotional image
@router.post("/upload")
async def upload_promotional_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Upload an image for promotional material using Supabase Storage"""
    try:
        # Verify user is professional
        profile = await verify_professional(user, db)
        
        # Validate file size (10MB limit)
        if file.size and file.size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
        
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
        
        # Generate unique filename
        file_extension = Path(file.filename).suffix if file.filename else ".jpg"
        unique_filename = f"promotions/{profile.professional_id}/{uuid.uuid4()}{file_extension}"
        
        logger.info(f"🔄 Uploading promotional image to Supabase Storage...")
        logger.info(f"📦 Bucket: {PROMOTIONAL_MATERIALS_BUCKET}, Filename: {unique_filename}")
        
        try:
            upload_response = supabase.storage.from_(PROMOTIONAL_MATERIALS_BUCKET).upload(
                unique_filename,
                content,
                file_options={"content-type": file.content_type, "upsert": "true"}
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
        
        # Get public URL
        try:
            public_url = supabase.storage.from_(PROMOTIONAL_MATERIALS_BUCKET).get_public_url(unique_filename)
            
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
            "file_path": public_url,  # Return as file_path for consistency with database field
            "url": public_url,  # Keep url for backward compatibility
            "filename": file.filename or "unknown",
            "size": len(content),
            "content_type": file.content_type
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading promotional image: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload promotional image: {str(e)}")

# Get all promotional materials for current professional
@router.get("", response_model=List[PromotionalMaterialOut])
async def get_promotional_materials(
    status: Optional[str] = Query(None, description="Filter by status (pending, approved, rejected)"),
    content_type: Optional[str] = Query(None, description="Filter by type (banner, event, campaign)"),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get all promotional materials for the logged-in professional"""
    try:
        profile = await verify_professional(user, db)
        
        query = select(PromotionalMaterial).where(
            PromotionalMaterial.profile_id == profile.professional_id
        )
        
        if status:
            query = query.where(PromotionalMaterial.status == status)
        
        if content_type:
            query = query.where(PromotionalMaterial.content_type == content_type)
        
        query = query.order_by(PromotionalMaterial.created_at.desc())
        
        result = await db.execute(query)
        materials = result.scalars().all()
        
        return [
            PromotionalMaterialOut(
                material_id=m.material_id,
                profile_id=m.profile_id,
                content_type=m.content_type,
                title=m.title,
                description=m.description,
                file_path=m.file_path,
                status=m.status,
                approved_by=m.approved_by,
                approved_at=m.approved_at.isoformat() if m.approved_at else None,
                rejection_reason=m.rejection_reason,
                display_start_date=m.display_start_date.isoformat() if m.display_start_date else None,
                display_end_date=m.display_end_date.isoformat() if m.display_end_date else None,
                display_sequence=m.display_sequence,
                created_at=m.created_at.isoformat() if m.created_at else "",
                updated_at=m.updated_at.isoformat() if m.updated_at else None,
            )
            for m in materials
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting promotional materials: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get promotional materials: {str(e)}")

# Get specific promotional material
@router.get("/{material_id}", response_model=PromotionalMaterialOut)
async def get_promotional_material(
    material_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get a specific promotional material"""
    try:
        profile = await verify_professional(user, db)
        
        result = await db.execute(
            select(PromotionalMaterial).where(
                and_(
                    PromotionalMaterial.material_id == material_id,
                    PromotionalMaterial.profile_id == profile.professional_id
                )
            )
        )
        material = result.scalar_one_or_none()
        
        if not material:
            raise HTTPException(status_code=404, detail="Promotional material not found")
        
        return PromotionalMaterialOut(
            material_id=material.material_id,
            profile_id=material.profile_id,
            content_type=material.content_type,
            title=material.title,
            description=material.description,
            file_path=material.file_path,
            status=material.status,
            approved_by=material.approved_by,
            approved_at=material.approved_at.isoformat() if material.approved_at else None,
            rejection_reason=material.rejection_reason,
            display_start_date=material.display_start_date.isoformat() if material.display_start_date else None,
            display_end_date=material.display_end_date.isoformat() if material.display_end_date else None,
            display_sequence=material.display_sequence,
            created_at=material.created_at.isoformat() if material.created_at else "",
            updated_at=material.updated_at.isoformat() if material.updated_at else None,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting promotional material: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get promotional material: {str(e)}")

# Create new promotional material
@router.post("", response_model=PromotionalMaterialOut)
async def create_promotional_material(
    material: PromotionalMaterialIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Create a new promotional material"""
    try:
        profile = await verify_professional(user, db)
        
        # Parse dates if provided
        display_start_date = None
        display_end_date = None
        if material.display_start_date:
            try:
                display_start_date = datetime.strptime(material.display_start_date, "%Y-%m-%d").date()
            except ValueError:
                pass
        if material.display_end_date:
            try:
                display_end_date = datetime.strptime(material.display_end_date, "%Y-%m-%d").date()
            except ValueError:
                pass
        
        new_material = PromotionalMaterial(
            profile_id=profile.professional_id,
            content_type=material.content_type,
            title=material.title,
            description=material.description,
            file_path=material.file_path,
            display_start_date=display_start_date,
            display_end_date=display_end_date,
            status='pending',
            updated_by=user.user_id
        )
        
        db.add(new_material)
        await db.flush()  # Flush to get the material_id
        
        # Create notifications for all coordinators when promotional material is submitted
        try:
            from utils.notifications import create_promotional_material_submission_notifications
            notifications = await create_promotional_material_submission_notifications(
                db=db,
                material_id=new_material.material_id,
                title=new_material.title,
                business_name=profile.business_name,
                profile_id=profile.professional_id
            )
            if notifications:
                logger.info(f"Created {len(notifications)} notifications for coordinators about promotional material submission")
        except Exception as e:
            logger.error(f"Error creating promotional material submission notifications: {e}")
            # Don't fail the material creation if notification fails
        
        await db.commit()
        await db.refresh(new_material)
        
        return PromotionalMaterialOut(
            material_id=new_material.material_id,
            profile_id=new_material.profile_id,
            content_type=new_material.content_type,
            title=new_material.title,
            description=new_material.description,
            file_path=new_material.file_path,
            status=new_material.status,
            approved_by=new_material.approved_by,
            approved_at=new_material.approved_at.isoformat() if new_material.approved_at else None,
            rejection_reason=new_material.rejection_reason,
            display_start_date=new_material.display_start_date.isoformat() if new_material.display_start_date else None,
            display_end_date=new_material.display_end_date.isoformat() if new_material.display_end_date else None,
            display_sequence=new_material.display_sequence,
            created_at=new_material.created_at.isoformat() if new_material.created_at else "",
            updated_at=new_material.updated_at.isoformat() if new_material.updated_at else None,
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating promotional material: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create promotional material: {str(e)}")

# Update promotional material
@router.put("/{material_id}", response_model=PromotionalMaterialOut)
async def update_promotional_material(
    material_id: int,
    material: PromotionalMaterialIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Update a promotional material (only if status is 'pending' or 'rejected')"""
    try:
        profile = await verify_professional(user, db)
        
        result = await db.execute(
            select(PromotionalMaterial).where(
                and_(
                    PromotionalMaterial.material_id == material_id,
                    PromotionalMaterial.profile_id == profile.professional_id
                )
            )
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            raise HTTPException(status_code=404, detail="Promotional material not found")
        
        # Only allow updates if rejected (to fix and resubmit)
        # Pending materials cannot be edited (under review)
        if existing.status == 'approved':
            raise HTTPException(status_code=400, detail="Cannot update approved promotional material. Please create a new submission.")
        if existing.status == 'pending':
            raise HTTPException(status_code=400, detail="Cannot update promotional material while it's under review. Please wait for coordinator decision.")
        
        # Parse dates if provided
        if material.display_start_date:
            try:
                existing.display_start_date = datetime.strptime(material.display_start_date, "%Y-%m-%d").date()
            except ValueError:
                pass
        if material.display_end_date:
            try:
                existing.display_end_date = datetime.strptime(material.display_end_date, "%Y-%m-%d").date()
            except ValueError:
                pass
        
        # Store previous status to determine if this is an update/resubmission
        previous_status = existing.status
        
        # Update fields (only professional-editable fields)
        existing.content_type = material.content_type
        existing.title = material.title
        existing.description = material.description
        existing.file_path = material.file_path
        existing.status = 'pending'  # Reset to pending when updated
        existing.updated_by = user.user_id
        existing.updated_at = datetime.now()
        
        db.add(existing)
        await db.flush()  # Flush before creating notifications
        
        # Create notifications for all coordinators when promotional material is updated/resubmitted
        try:
            from utils.notifications import create_promotional_material_submission_notifications
            # Determine if this is an update (was rejected or pending before)
            is_update = previous_status in ['rejected', 'pending']
            notifications = await create_promotional_material_submission_notifications(
                db=db,
                material_id=existing.material_id,
                title=existing.title,
                business_name=profile.business_name,
                profile_id=profile.professional_id,
                is_update=is_update
            )
            if notifications:
                logger.info(f"Created {len(notifications)} notifications for coordinators about promotional material {'update' if is_update else 'submission'}")
        except Exception as e:
            logger.error(f"Error creating promotional material submission notifications: {e}")
            # Don't fail the material update if notification fails
        
        await db.commit()
        await db.refresh(existing)
        
        return PromotionalMaterialOut(
            material_id=existing.material_id,
            profile_id=existing.profile_id,
            content_type=existing.content_type,
            title=existing.title,
            description=existing.description,
            file_path=existing.file_path,
            status=existing.status,
            approved_by=existing.approved_by,
            approved_at=existing.approved_at.isoformat() if existing.approved_at else None,
            rejection_reason=existing.rejection_reason,
            display_start_date=existing.display_start_date.isoformat() if existing.display_start_date else None,
            display_end_date=existing.display_end_date.isoformat() if existing.display_end_date else None,
            display_sequence=existing.display_sequence,
            created_at=existing.created_at.isoformat() if existing.created_at else "",
            updated_at=existing.updated_at.isoformat() if existing.updated_at else None,
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating promotional material: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update promotional material: {str(e)}")

# Delete promotional material
@router.delete("/{material_id}")
async def delete_promotional_material(
    material_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Delete a promotional material (only if status is 'pending' or 'rejected', not 'approved')"""
    try:
        profile = await verify_professional(user, db)
        
        result = await db.execute(
            select(PromotionalMaterial).where(
                and_(
                    PromotionalMaterial.material_id == material_id,
                    PromotionalMaterial.profile_id == profile.professional_id
                )
            )
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            raise HTTPException(status_code=404, detail="Promotional material not found")
        
        # Only allow deletion if rejected or pending (professionals can cancel pending submissions)
        # Approved materials cannot be deleted (active/displayed)
        if existing.status == 'approved':
            raise HTTPException(status_code=400, detail="Cannot delete approved promotional material. Please contact coordinator.")
        
        # Delete file from Supabase Storage if file_path exists
        if existing.file_path:
            try:
                # Extract storage path from public URL
                # Supabase public URL format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
                # Storage path format: promotions/{profile_id}/{uuid}{extension}
                file_path = existing.file_path
                storage_path = None
                
                if file_path.startswith('http'):
                    # Remove any query parameters from the URL
                    file_path = file_path.split('?')[0]
                    
                    # Extract path from public URL by finding bucket name and getting everything after it
                    url_parts = file_path.split('/')
                    try:
                        bucket_index = url_parts.index(PROMOTIONAL_MATERIALS_BUCKET)
                        # Get everything after the bucket name
                        storage_path = '/'.join(url_parts[bucket_index + 1:])
                        # Remove any trailing slashes or empty parts
                        storage_path = storage_path.strip('/')
                    except ValueError:
                        # Bucket name not found in URL, try alternative patterns
                        bucket_pattern = f'/public/{PROMOTIONAL_MATERIALS_BUCKET}/'
                        if bucket_pattern in file_path:
                            storage_path = file_path.split(bucket_pattern)[-1].split('?')[0].strip('/')
                        else:
                            alt_pattern = f'/{PROMOTIONAL_MATERIALS_BUCKET}/'
                            if alt_pattern in file_path:
                                storage_path = file_path.split(alt_pattern)[-1].split('?')[0].strip('/')
                            else:
                                logger.warning(f"Could not find bucket '{PROMOTIONAL_MATERIALS_BUCKET}' in URL: {file_path}")
                                storage_path = None
                else:
                    # If it's already a storage path (not a URL), use it directly
                    storage_path = file_path.strip('/')
                
                if storage_path:
                    # Remove the file from Supabase Storage using the full storage path
                    logger.info(f"🗑️ Attempting to delete file from storage")
                    logger.info(f"   Bucket: {PROMOTIONAL_MATERIALS_BUCKET}")
                    logger.info(f"   Storage path: {storage_path}")
                    logger.info(f"   Original file_path: {file_path}")
                    
                    try:
                        result = supabase.storage.from_(PROMOTIONAL_MATERIALS_BUCKET).remove([storage_path])
                        
                        # Log the result for debugging
                        logger.info(f"   Remove result type: {type(result)}")
                        logger.info(f"   Remove result: {result}")
                        
                        # Check for errors in the result (Supabase can return different formats)
                        deletion_failed = False
                        error_msg = None
                        
                        if isinstance(result, dict):
                            if result.get('error'):
                                error_msg = result['error']
                                deletion_failed = True
                            elif result.get('data') is not None:
                                # Check if data contains error
                                if isinstance(result.get('data'), dict) and result.get('data', {}).get('error'):
                                    error_msg = result['data']['error']
                                    deletion_failed = True
                        elif hasattr(result, 'data'):
                            # Response object with data attribute
                            if isinstance(result.data, dict) and result.data.get('error'):
                                error_msg = result.data['error']
                                deletion_failed = True
                        elif hasattr(result, 'status_code'):
                            # HTTP response object
                            if result.status_code >= 400:
                                error_content = result.json() if hasattr(result, 'json') else str(result)
                                error_msg = f"HTTP {result.status_code}: {error_content}"
                                deletion_failed = True
                        
                        if deletion_failed:
                            logger.error(f"❌ Storage deletion error: {error_msg}")
                            if 'row-level security' in str(error_msg).lower() or 'unauthorized' in str(error_msg).lower() or 'permission' in str(error_msg).lower() or 'policy' in str(error_msg).lower():
                                logger.error(f"❌ RLS/Permission/Policy error detected!")
                                logger.error(f"   Ensure SUPABASE_SERVICE_ROLE_KEY (not SUPABASE_KEY) is set in backend .env")
                                logger.error(f"   Check Supabase Storage bucket policies for 'promotional-materials' bucket")
                                logger.error(f"   Service role key should bypass RLS policies")
                            # Don't raise exception - continue with DB deletion even if storage deletion fails
                        else:
                            logger.info(f"✅ Successfully deleted promotional material file from storage: {storage_path}")
                    except Exception as remove_exception:
                        logger.error(f"❌ Exception during storage.remove() call: {remove_exception}")
                        logger.error(f"   Exception type: {type(remove_exception)}")
                        logger.error(f"   Exception details: {str(remove_exception)}")
                        # Don't raise - continue with DB deletion even if storage deletion fails
                        # This ensures the database record is deleted even if storage deletion has issues
                else:
                    logger.warning(f"⚠️ Could not determine storage path for file: {file_path}")
            except Exception as e:
                logger.error(f"❌ Failed to delete file from storage: {e}")
                # Continue with database deletion even if storage deletion fails
        
        await db.delete(existing)
        await db.commit()
        
        return {"message": "Promotional material deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting promotional material: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete promotional material: {str(e)}")



