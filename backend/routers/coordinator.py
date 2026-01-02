# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: coordinator.py
# Description: To handle coordinator endpoints for reviewing professional applications and managing directory
# First Written on: Monday, 27-Oct-2025
# Edited on: Sunday, 10-Dec-2025

"""
Coordinator router - Handles professional application review and directory management for coordinators

This router provides endpoints for:
- Professional application review (approve, reject, view applications)
- Professional directory management (update profiles, archive/unarchive)
- Promotional material review (approve, reject, update display settings)
- Coordinator statistics

All endpoints require coordinator role. Coordinators manage the professional
directory and review submissions.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, cast, String
from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel

from dependencies import get_current_user_flexible, get_session
from models.database import User, ProfessionalProfile, ProfessionalDocument, PromotionalMaterial, ProfessionalService
from config import logger, supabase, PROFESSIONAL_DOCUMENTS_BUCKET

# Initialize router with prefix and tags for API documentation
router = APIRouter(prefix="/coordinator", tags=["coordinator"])

# ============================================================================
# Helper Functions
# ============================================================================

async def verify_coordinator(user: User) -> None:
    """
    Verify user is a coordinator
    
    Args:
        user: User to verify
    
    Raises:
        HTTPException: 403 if user is not a coordinator
    """
    if user.role != 'coordinator':
        raise HTTPException(status_code=403, detail="Coordinator access required")

# Schemas
class ApplicationApproveRequest(BaseModel):
    approved_by: Optional[int] = None  # Will be set from user context

class ApplicationRejectRequest(BaseModel):
    rejection_reason: str
    approved_by: Optional[int] = None  # Will be set from user context

class PromotionApproveRequest(BaseModel):
    display_start_date: str  # YYYY-MM-DD format
    display_end_date: str  # YYYY-MM-DD format
    display_sequence: int
    approved_by: Optional[int] = None  # Will be set from user context

class PromotionRejectRequest(BaseModel):
    rejection_reason: str
    approved_by: Optional[int] = None  # Will be set from user context

class PromotionDisplaySettingsUpdate(BaseModel):
    display_start_date: Optional[str] = None  # YYYY-MM-DD format
    display_end_date: Optional[str] = None  # YYYY-MM-DD format
    display_sequence: Optional[int] = None

class DirectoryProfileUpdate(BaseModel):
    specializations: Optional[list[str]] = None  # Array of specialization tags (e.g., ['ADHD', 'Autism Spectrum Disorder'])
    profile_status: Optional[str] = None  # For archiving/unarchiving (set to 'archived' to hide from directory, 'approved' to restore)

# Statistics endpoint
@router.get("/stats")
async def get_coordinator_stats(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get coordinator dashboard statistics"""
    try:
        await verify_coordinator(user)
        
        # Count pending applications
        pending_result = await db.execute(
            select(func.count(ProfessionalProfile.professional_id))
            .where(ProfessionalProfile.profile_status == 'pending')
        )
        pending_count = pending_result.scalar() or 0
        
        # Count approved professionals
        approved_result = await db.execute(
            select(func.count(ProfessionalProfile.professional_id))
            .where(ProfessionalProfile.profile_status == 'approved')
        )
        approved_count = approved_result.scalar() or 0
        
        # Count total applications
        total_result = await db.execute(
            select(func.count(ProfessionalProfile.professional_id))
        )
        total_count = total_result.scalar() or 0
        
        # Count pending promotions
        pending_promo_result = await db.execute(
            select(func.count(PromotionalMaterial.material_id))
            .where(PromotionalMaterial.status == 'pending')
        )
        pending_promo_count = pending_promo_result.scalar() or 0
        
        return {
            "pendingApplications": pending_count,
            "verifiedProfessionals": approved_count,
            "totalApplications": total_count,
            "pendingPromotions": pending_promo_count
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting coordinator stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")

# Get all applications with filtering
@router.get("/applications")
async def get_coordinator_applications(
    status: Optional[str] = Query(None, description="Filter by status (pending, approved, rejected)"),
    page: Optional[int] = Query(1, ge=1),
    limit: Optional[int] = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get all professional applications with optional filtering"""
    try:
        await verify_coordinator(user)
        
        query = select(ProfessionalProfile)
        
        # Apply status filter
        if status and status != 'all':
            query = query.where(ProfessionalProfile.profile_status == status)
        
        # Order by creation date (newest first)
        query = query.order_by(ProfessionalProfile.created_at.desc())
        
        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        
        result = await db.execute(query)
        profiles = result.scalars().all()
        
        applications = []
        for profile in profiles:
            # Get documents count
            docs_result = await db.execute(
                select(func.count(ProfessionalDocument.document_id))
                .where(ProfessionalDocument.profile_id == profile.professional_id)
            )
            doc_count = docs_result.scalar() or 0
            
            profile_dict = {
                "professional_id": profile.professional_id,
                "user_id": profile.user_id,
                "business_name": profile.business_name,
                "professional_type": profile.professional_type,
                "years_experience": profile.years_experience,
                "qualifications": profile.qualifications,
                "certifications": profile.certifications,
                "specializations": profile.specializations,
                "target_developmental_stages": profile.target_developmental_stages or [],
                "languages": profile.languages or [],
                "availability": profile.availability or [],
                "address_line": profile.address_line,
                "city": profile.city,
                "state": profile.state,
                "postcode": profile.postcode,
                "country": profile.country,
                "google_maps_url": profile.google_maps_url,
                "contact_email": profile.contact_email,
                "contact_phone": profile.contact_phone,
                "website_url": profile.website_url,
                "bio": profile.bio,
                "profile_image_url": profile.profile_image_url,
                "profile_status": profile.profile_status,
                "approved_by": profile.approved_by,
                "approved_at": profile.approved_at.isoformat() if profile.approved_at else None,
                "rejection_reason": profile.rejection_reason,
                "created_at": profile.created_at.isoformat() if profile.created_at else None,
                "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
                "documents_count": doc_count
            }
            applications.append(profile_dict)
        
        return {"applications": applications}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting applications: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get applications: {str(e)}")

# Get single application with documents
@router.get("/applications/{profile_id}")
async def get_coordinator_application(
    profile_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get detailed application information with documents"""
    try:
        await verify_coordinator(user)
        
        result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.professional_id == profile_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Get documents
        docs_result = await db.execute(
            select(ProfessionalDocument).where(ProfessionalDocument.profile_id == profile.professional_id)
        )
        documents = docs_result.scalars().all()
        
        # Get services for this professional
        services_result = await db.execute(
            select(ProfessionalService).where(
                ProfessionalService.profile_id == profile.professional_id
            ).order_by(ProfessionalService.created_at.desc())
        )
        services = services_result.scalars().all()
        
        services_list = [
            {
                "service_id": service.service_id,
                "service_name": service.service_name,
                "service_description": service.service_description,
                "service_category": service.service_category,
                "service_type": service.service_type,
                "price_range": service.price_range,
            }
            for service in services
        ]
        
        # Generate signed URLs for documents (private bucket)
        documents_list = []
        for doc in documents:
            signed_url = doc.file_path  # Default to stored path
            try:
                if doc.file_path and not doc.file_path.startswith('http'):
                    signed_url_response = supabase.storage.from_(PROFESSIONAL_DOCUMENTS_BUCKET).create_signed_url(
                        doc.file_path,
                        expires_in=3600  # 1 hour expiration
                    )
                    
                    if isinstance(signed_url_response, dict):
                        signed_url = signed_url_response.get('signedURL') or signed_url_response.get('signed_url') or signed_url_response.get('url')
                    elif isinstance(signed_url_response, str):
                        signed_url = signed_url_response
                    else:
                        signed_url = str(signed_url_response)
                    
                    if not signed_url or signed_url == 'None':
                        signed_url = doc.file_path  # Fallback
            except Exception as e:
                logger.warning(f"Failed to generate signed URL for document {doc.document_id}: {e}")
                signed_url = doc.file_path  # Fallback
            
            documents_list.append({
                "document_id": doc.document_id,
                "document_type": doc.document_type,
                "file_name": doc.file_name,
                "file_path": signed_url,
                "file_type": doc.file_type,
                "file_size": doc.file_size,
                "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            })
        
        profile_dict = {
            "professional_id": profile.professional_id,
            "user_id": profile.user_id,
            "business_name": profile.business_name,
            "professional_type": profile.professional_type,
            "years_experience": profile.years_experience,
            "qualifications": profile.qualifications,
            "certifications": profile.certifications,
            "specializations": profile.specializations,
            "target_developmental_stages": profile.target_developmental_stages or [],
            "languages": profile.languages or [],
            "availability": profile.availability or [],
            "address_line": profile.address_line,
            "city": profile.city,
            "state": profile.state,
            "postcode": profile.postcode,
            "country": profile.country,
            "google_maps_url": profile.google_maps_url,
            "contact_email": profile.contact_email,
            "contact_phone": profile.contact_phone,
            "website_url": profile.website_url,
            "bio": profile.bio,
            "profile_image_url": profile.profile_image_url,
            "profile_status": profile.profile_status,
            "approved_by": profile.approved_by,
            "approved_at": profile.approved_at.isoformat() if profile.approved_at else None,
            "rejection_reason": profile.rejection_reason,
            "created_at": profile.created_at.isoformat() if profile.created_at else None,
            "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
            "documents": documents_list,
            "services": services_list,
        }
        
        return {"application": profile_dict}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting application: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get application: {str(e)}")

# Approve application
@router.put("/applications/{profile_id}/approve")
async def approve_application(
    profile_id: int,
    request: ApplicationApproveRequest = None,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Approve a professional application"""
    try:
        await verify_coordinator(user)
        
        result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.professional_id == profile_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Get user email for sending notification
        user_result = await db.execute(
            select(User).where(User.user_id == profile.user_id)
        )
        professional_user = user_result.scalar_one_or_none()
        professional_email = professional_user.email if professional_user else None
        
        # Update profile status
        profile.profile_status = 'approved'
        profile.approved_by = user.user_id
        profile.approved_at = datetime.now()
        profile.updated_by = user.user_id
        profile.updated_at = datetime.now()
        profile.rejection_reason = None  # Clear any previous rejection reason
        
        db.add(profile)
        await db.flush()  # Flush before creating notification
        
        # Create notification for professional user
        try:
            from utils.notifications import create_profile_approval_notification
            notification = await create_profile_approval_notification(
                db=db,
                profile=profile,
                coordinator_id=user.user_id
            )
            if notification:
                logger.info(f"Created profile approval notification for user {profile.user_id}")
        except Exception as e:
            logger.error(f"Error creating profile approval notification: {e}")
            # Don't fail the approval if notification fails
        
        # Send approval email to professional user (check email notification preference)
        if professional_email:
            try:
                # Check user's email notification preference
                from models.database import UserNotificationPreference
                pref_result = await db.execute(
                    select(UserNotificationPreference).where(UserNotificationPreference.user_id == profile.user_id)
                )
                user_prefs = pref_result.scalar_one_or_none()
                email_enabled = user_prefs.email_notifications if user_prefs else True  # Default to enabled
                
                if email_enabled:
                    from utils.helpers import send_professional_approval_email
                    email_sent = send_professional_approval_email(
                        email=professional_email,
                        business_name=profile.business_name,
                        display_name=profile.business_name
                    )
                    if email_sent:
                        logger.info(f"Approval email sent to {professional_email}")
                    else:
                        logger.warning(f"Failed to send approval email to {professional_email}")
                else:
                    logger.info(f"Email notifications disabled for user {profile.user_id}, skipping approval email")
            except Exception as e:
                logger.error(f"Error sending approval email to {professional_email}: {e}")
                # Don't fail the approval if email fails
        else:
            logger.warning(f"No email found for user {profile.user_id}, skipping email notification")
        
        await db.commit()
        await db.refresh(profile)
        
        return {
            "message": "Application approved successfully",
            "professional_id": profile.professional_id,
            "profile_status": profile.profile_status,
            "approved_at": profile.approved_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error approving application: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to approve application: {str(e)}")

# Reject application
@router.put("/applications/{profile_id}/reject")
async def reject_application(
    profile_id: int,
    request: ApplicationRejectRequest,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Reject a professional application with reason"""
    try:
        await verify_coordinator(user)
        
        if not request.rejection_reason or not request.rejection_reason.strip():
            raise HTTPException(status_code=400, detail="Rejection reason is required")
        
        result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.professional_id == profile_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Get user email for sending notification
        user_result = await db.execute(
            select(User).where(User.user_id == profile.user_id)
        )
        professional_user = user_result.scalar_one_or_none()
        professional_email = professional_user.email if professional_user else None
        
        # Update profile status
        profile.profile_status = 'rejected'
        profile.approved_by = user.user_id
        profile.approved_at = datetime.now()
        profile.rejection_reason = request.rejection_reason
        profile.updated_by = user.user_id
        profile.updated_at = datetime.now()
        
        db.add(profile)
        await db.flush()  # Flush before creating notification
        
        # Create notification for professional user
        try:
            from utils.notifications import create_profile_rejection_notification
            notification = await create_profile_rejection_notification(
                db=db,
                profile=profile,
                coordinator_id=user.user_id,
                rejection_reason=request.rejection_reason
            )
            if notification:
                logger.info(f"Created profile rejection notification for user {profile.user_id}")
        except Exception as e:
            logger.error(f"Error creating profile rejection notification: {e}")
            # Don't fail the rejection if notification fails
        
        # Send rejection email to professional user (check email notification preference)
        if professional_email:
            try:
                # Check user's email notification preference
                from models.database import UserNotificationPreference
                from sqlalchemy import select
                pref_result = await db.execute(
                    select(UserNotificationPreference).where(UserNotificationPreference.user_id == profile.user_id)
                )
                user_prefs = pref_result.scalar_one_or_none()
                email_enabled = user_prefs.email_notifications if user_prefs else True  # Default to enabled
                
                if email_enabled:
                    from utils.helpers import send_professional_rejection_email
                    email_sent = send_professional_rejection_email(
                        email=professional_email,
                        business_name=profile.business_name,
                        rejection_reason=request.rejection_reason,
                        display_name=profile.business_name
                    )
                    if email_sent:
                        logger.info(f"Rejection email sent to {professional_email}")
                    else:
                        logger.warning(f"Failed to send rejection email to {professional_email}")
                else:
                    logger.info(f"Email notifications disabled for user {profile.user_id}, skipping rejection email")
            except Exception as e:
                logger.error(f"Error sending rejection email to {professional_email}: {e}")
                # Don't fail the rejection if email fails
        else:
            logger.warning(f"No email found for user {profile.user_id}, skipping email notification")
        
        await db.commit()
        await db.refresh(profile)
        
        return {
            "message": "Application rejected",
            "professional_id": profile.professional_id,
            "profile_status": profile.profile_status,
            "rejection_reason": profile.rejection_reason,
            "approved_at": profile.approved_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error rejecting application: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reject application: {str(e)}")

# Get directory with search and filters
@router.get("/directory")
async def get_coordinator_directory(
    search: Optional[str] = Query(None, description="Search by name, location, specialization"),
    status: Optional[str] = Query('approved', description="Filter by status"),
    location: Optional[str] = Query(None, description="Filter by city or state"),
    specialization: Optional[str] = Query(None, description="Filter by specialization"),
    page: Optional[int] = Query(1, ge=1),
    limit: Optional[int] = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get professional directory with search and filtering"""
    try:
        await verify_coordinator(user)
        
        query = select(ProfessionalProfile)
        
        # Apply status filter (default to show both approved and archived for directory management)
        if status and status != 'all':
            query = query.where(ProfessionalProfile.profile_status == status)
        else:
            # Show both approved and archived by default (for directory management)
            query = query.where(ProfessionalProfile.profile_status.in_(['approved', 'archived']))
        
        # Apply search filter
        if search:
            # For array fields, convert to text for ILIKE search
            search_filter = or_(
                ProfessionalProfile.business_name.ilike(f"%{search}%"),
                ProfessionalProfile.city.ilike(f"%{search}%"),
                ProfessionalProfile.state.ilike(f"%{search}%"),
                func.array_to_string(ProfessionalProfile.specializations, ', ').ilike(f"%{search}%"),  # Search within array
                ProfessionalProfile.professional_type.ilike(f"%{search}%")
            )
            query = query.where(search_filter)
        
        # Apply location filter
        if location:
            location_filter = or_(
                ProfessionalProfile.city.ilike(f"%{location}%"),
                ProfessionalProfile.state.ilike(f"%{location}%")
            )
            query = query.where(location_filter)
        
        # Apply specialization filter (exact match in array)
        if specialization:
            # Use PostgreSQL ANY operator for array matching
            query = query.where(func.array_to_string(ProfessionalProfile.specializations, ', ').ilike(f"%{specialization}%"))
        
        # Order by business name
        query = query.order_by(ProfessionalProfile.business_name.asc())
        
        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        
        result = await db.execute(query)
        profiles = result.scalars().all()
        
        professionals = []
        for profile in profiles:
            # Get services for this professional
            services_result = await db.execute(
                select(ProfessionalService).where(
                    ProfessionalService.profile_id == profile.professional_id
                ).order_by(ProfessionalService.created_at.desc())
            )
            services = services_result.scalars().all()
            
            services_list = [
                {
                    "service_id": service.service_id,
                    "service_name": service.service_name,
                    "service_description": service.service_description,
                    "service_category": service.service_category,
                    "service_type": service.service_type,
                    "price_range": service.price_range,
                }
                for service in services
            ]
            
            profile_dict = {
                "professional_id": profile.professional_id,
                "business_name": profile.business_name,
                "professional_type": profile.professional_type,
                "specializations": profile.specializations,
                "target_developmental_stages": profile.target_developmental_stages or [],
                "languages": profile.languages or [],
                "availability": profile.availability or [],
                "address_line": profile.address_line,
                "city": profile.city,
                "state": profile.state,
                "postcode": profile.postcode,
                "country": profile.country,
                "profile_status": profile.profile_status,
                "profile_image_url": profile.profile_image_url,
                "services": services_list,
            }
            professionals.append(profile_dict)
        
        return {"professionals": professionals}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting directory: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get directory: {str(e)}")

# Get single directory profile
@router.get("/directory/{profile_id}")
async def get_coordinator_directory_profile(
    profile_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get detailed professional profile from directory"""
    try:
        await verify_coordinator(user)
        
        result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.professional_id == profile_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Get services for this professional
        services_result = await db.execute(
            select(ProfessionalService).where(
                ProfessionalService.profile_id == profile.professional_id
            ).order_by(ProfessionalService.created_at.desc())
        )
        services = services_result.scalars().all()
        
        services_list = [
            {
                "service_id": service.service_id,
                "service_name": service.service_name,
                "service_description": service.service_description,
                "service_category": service.service_category,
                "service_type": service.service_type,
                "price_range": service.price_range,
            }
            for service in services
        ]
        
        profile_dict = {
            "professional_id": profile.professional_id,
            "user_id": profile.user_id,
            "business_name": profile.business_name,
            "professional_type": profile.professional_type,
            "years_experience": profile.years_experience,
            "qualifications": profile.qualifications,
            "certifications": profile.certifications,
            "specializations": profile.specializations,
            "target_developmental_stages": profile.target_developmental_stages or [],
            "languages": profile.languages or [],
            "availability": profile.availability or [],
            "address_line": profile.address_line,
            "city": profile.city,
            "state": profile.state,
            "postcode": profile.postcode,
            "country": profile.country,
            "google_maps_url": profile.google_maps_url,
            "contact_email": profile.contact_email,
            "contact_phone": profile.contact_phone,
            "website_url": profile.website_url,
            "bio": profile.bio,
            "profile_image_url": profile.profile_image_url,
            "profile_status": profile.profile_status,
            "services": services_list,
            "approved_by": profile.approved_by,
            "approved_at": profile.approved_at.isoformat() if profile.approved_at else None,
            "rejection_reason": profile.rejection_reason,
            "created_at": profile.created_at.isoformat() if profile.created_at else None,
            "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
        }
        
        return {"profile": profile_dict}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting directory profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get directory profile: {str(e)}")

# Update directory profile (limited editing - only specializations)
@router.put("/directory/{profile_id}")
async def update_coordinator_directory_profile(
    profile_id: int,
    updates: DirectoryProfileUpdate,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Update professional profile in directory (coordinator can only edit specializations and status)"""
    try:
        await verify_coordinator(user)
        
        result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.professional_id == profile_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Only allow editing specializations and profile_status (for archiving/removing)
        if updates.specializations is not None:
            profile.specializations = updates.specializations
        
        if updates.profile_status is not None:
            # Validate status
            if updates.profile_status not in ['pending', 'approved', 'rejected', 'archived']:
                raise HTTPException(status_code=400, detail="Invalid profile status")
            
            previous_status = profile.profile_status
            profile.profile_status = updates.profile_status
            
            # Handle archiving/unarchiving
            if updates.profile_status == 'archived' and previous_status == 'approved':
                # Archive: Hide from public directory but keep profile intact
                profile.updated_by = user.user_id
                profile.updated_at = datetime.now()
                
                # Create notification for professional user
                try:
                    from utils.notifications import create_notification
                    notification = await create_notification(
                        db=db,
                        recipient_id=profile.user_id,
                        notification_type='profile_archived',
                        related_profile_id=profile.professional_id,
                        title='Your Profile Has Been Archived',
                        content=f'Your professional profile "{profile.business_name}" has been temporarily removed from the public directory. You can still access your dashboard and services.',
                        notification_metadata={"business_name": profile.business_name}
                    )
                    if notification:
                        await db.flush()
                        logger.info(f"Created profile_archived notification for user {profile.user_id}")
                except Exception as e:
                    logger.error(f"Error creating profile_archived notification: {e}")
                    # Don't fail the archive operation if notification fails
                    
            elif updates.profile_status == 'approved' and previous_status == 'archived':
                # Unarchive: Restore visibility in public directory
                profile.updated_by = user.user_id
                profile.updated_at = datetime.now()
                
                # Create notification for professional user
                try:
                    from utils.notifications import create_notification
                    notification = await create_notification(
                        db=db,
                        recipient_id=profile.user_id,
                        notification_type='profile_unarchived',
                        related_profile_id=profile.professional_id,
                        title='Your Profile Is Now Visible',
                        content=f'Your professional profile "{profile.business_name}" has been restored to the public directory and is now visible to parents.',
                        notification_metadata={"business_name": profile.business_name}
                    )
                    if notification:
                        await db.flush()
                        logger.info(f"Created profile_unarchived notification for user {profile.user_id}")
                except Exception as e:
                    logger.error(f"Error creating profile_unarchived notification: {e}")
                    # Don't fail the unarchive operation if notification fails
            
            if updates.profile_status == 'rejected':
                # When removing from directory, set rejection reason
                profile.rejection_reason = "Removed from directory by coordinator"
                profile.approved_by = user.user_id
                profile.approved_at = datetime.now()
        
        profile.updated_by = user.user_id
        profile.updated_at = datetime.now()
        
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        
        return {
            "message": "Profile updated successfully",
            "professional_id": profile.professional_id,
            "specializations": profile.specializations,
            "profile_status": profile.profile_status
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating directory profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")

# Archive professional profile
@router.put("/directory/{profile_id}/archive")
async def archive_professional_profile(
    profile_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Archive a professional profile (hide from public directory)"""
    try:
        await verify_coordinator(user)
        
        result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.professional_id == profile_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        if profile.profile_status != 'approved':
            raise HTTPException(status_code=400, detail="Only approved profiles can be archived")
        
        profile.profile_status = 'archived'
        profile.updated_by = user.user_id
        profile.updated_at = datetime.now()
        
        db.add(profile)
        
        # Create notification for professional user (before commit)
        try:
            from utils.notifications import create_notification
            notification = await create_notification(
                db=db,
                recipient_id=profile.user_id,
                notification_type='profile_archived',
                related_profile_id=profile.professional_id,
                title='Your Profile Has Been Archived',
                content=f'Your professional profile "{profile.business_name}" has been temporarily removed from the public directory. You can still access your dashboard and services.',
                notification_metadata={"business_name": profile.business_name}
            )
            if notification:
                logger.info(f"Created profile_archived notification for user {profile.user_id}")
        except Exception as e:
            logger.error(f"Error creating profile_archived notification: {e}")
            # Don't fail the archive operation if notification fails
        
        await db.commit()
        await db.refresh(profile)
        
        return {
            "message": "Profile archived successfully",
            "professional_id": profile.professional_id,
            "profile_status": profile.profile_status
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error archiving profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to archive profile: {str(e)}")

# Unarchive professional profile
@router.put("/directory/{profile_id}/unarchive")
async def unarchive_professional_profile(
    profile_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Unarchive a professional profile (restore to public directory)"""
    try:
        await verify_coordinator(user)
        
        result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.professional_id == profile_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        if profile.profile_status != 'archived':
            raise HTTPException(status_code=400, detail="Only archived profiles can be unarchived")
        
        profile.profile_status = 'approved'
        profile.updated_by = user.user_id
        profile.updated_at = datetime.now()
        
        db.add(profile)
        
        # Create notification for professional user (before commit)
        try:
            from utils.notifications import create_notification
            notification = await create_notification(
                db=db,
                recipient_id=profile.user_id,
                notification_type='profile_unarchived',
                related_profile_id=profile.professional_id,
                title='Your Profile Is Now Visible',
                content=f'Your professional profile "{profile.business_name}" has been restored to the public directory and is now visible to parents.',
                notification_metadata={"business_name": profile.business_name}
            )
            if notification:
                logger.info(f"Created profile_unarchived notification for user {profile.user_id}")
        except Exception as e:
            logger.error(f"Error creating profile_unarchived notification: {e}")
            # Don't fail the unarchive operation if notification fails
        
        await db.commit()
        await db.refresh(profile)
        
        return {
            "message": "Profile unarchived successfully",
            "professional_id": profile.professional_id,
            "profile_status": profile.profile_status
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error unarchiving profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to unarchive profile: {str(e)}")

# Get promotional materials with filtering
@router.get("/promotions")
async def get_coordinator_promotions(
    status: Optional[str] = Query(None, description="Filter by status (pending, approved, rejected)"),
    page: Optional[int] = Query(1, ge=1),
    limit: Optional[int] = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get all promotional materials with optional filtering"""
    try:
        await verify_coordinator(user)
        
        query = select(PromotionalMaterial, ProfessionalProfile.business_name).join(
            ProfessionalProfile, PromotionalMaterial.profile_id == ProfessionalProfile.professional_id
        )
        
        # Exclude promotional materials from archived profiles
        query = query.where(ProfessionalProfile.profile_status != 'archived')
        
        # Apply status filter
        if status and status != 'all':
            query = query.where(PromotionalMaterial.status == status)
        
        # Order by creation date (newest first)
        query = query.order_by(PromotionalMaterial.created_at.desc())
        
        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        
        result = await db.execute(query)
        rows = result.all()
        
        materials = []
        for row in rows:
            material, business_name = row
            material_dict = {
                "material_id": material.material_id,
                "profile_id": material.profile_id,
                "content_type": material.content_type,
                "title": material.title,
                "description": material.description,
                "file_path": material.file_path,
                "status": material.status,
                "approved_by": material.approved_by,
                "approved_at": material.approved_at.isoformat() if material.approved_at else None,
                "rejection_reason": material.rejection_reason,
                "display_start_date": material.display_start_date.isoformat() if material.display_start_date else None,
                "display_end_date": material.display_end_date.isoformat() if material.display_end_date else None,
                "display_sequence": material.display_sequence,
                "created_at": material.created_at.isoformat() if material.created_at else None,
                "updated_at": material.updated_at.isoformat() if material.updated_at else None,
                "business_name": business_name
            }
            materials.append(material_dict)
        
        return {"materials": materials}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting promotions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get promotions: {str(e)}")

# Approve promotional material
@router.put("/promotions/{material_id}/approve")
async def approve_promotion(
    material_id: int,
    request: PromotionApproveRequest,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Approve a promotional material and set display settings"""
    try:
        await verify_coordinator(user)
        
        # Validate dates
        try:
            display_start_date = datetime.strptime(request.display_start_date, "%Y-%m-%d").date()
            display_end_date = datetime.strptime(request.display_end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        if display_start_date > display_end_date:
            raise HTTPException(status_code=400, detail="Display start date must be before end date")
        
        if request.display_sequence < 0:
            raise HTTPException(status_code=400, detail="Display sequence must be a positive number")
        
        result = await db.execute(
            select(PromotionalMaterial).where(PromotionalMaterial.material_id == material_id)
        )
        material = result.scalar_one_or_none()
        
        if not material:
            raise HTTPException(status_code=404, detail="Promotional material not found")
        
        # Update material
        material.status = 'approved'
        material.approved_by = user.user_id
        material.approved_at = datetime.now()
        material.display_start_date = display_start_date
        material.display_end_date = display_end_date
        material.display_sequence = request.display_sequence
        material.updated_by = user.user_id
        material.updated_at = datetime.now()
        material.rejection_reason = None  # Clear any previous rejection reason
        
        db.add(material)
        await db.flush()  # Flush before creating notification
        
        # Create notification for professional user
        try:
            from utils.notifications import create_promotion_approval_notification
            notification = await create_promotion_approval_notification(
                db=db,
                material=material,
                coordinator_id=user.user_id,
                display_start_date=request.display_start_date,
                display_end_date=request.display_end_date
            )
            if notification:
                logger.info(f"Created promotion approval notification for material {material.material_id}")
        except Exception as e:
            logger.error(f"Error creating promotion approval notification: {e}")
            # Don't fail the approval if notification fails
        
        await db.commit()
        await db.refresh(material)
        
        return {
            "message": "Promotional material approved successfully",
                "material_id": material.material_id,
            "status": material.status,
            "display_start_date": material.display_start_date.isoformat(),
            "display_end_date": material.display_end_date.isoformat(),
            "display_sequence": material.display_sequence,
            "approved_at": material.approved_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error approving promotion: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to approve promotion: {str(e)}")

# Reject promotional material
@router.put("/promotions/{material_id}/reject")
async def reject_promotion(
    material_id: int,
    request: PromotionRejectRequest,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Reject a promotional material with reason"""
    try:
        await verify_coordinator(user)
        
        if not request.rejection_reason or not request.rejection_reason.strip():
            raise HTTPException(status_code=400, detail="Rejection reason is required")
        
        result = await db.execute(
            select(PromotionalMaterial).where(PromotionalMaterial.material_id == material_id)
        )
        material = result.scalar_one_or_none()
        
        if not material:
            raise HTTPException(status_code=404, detail="Promotional material not found")
        
        # Update material
        material.status = 'rejected'
        material.approved_by = user.user_id
        material.approved_at = datetime.now()
        material.rejection_reason = request.rejection_reason
        material.updated_by = user.user_id
        material.updated_at = datetime.now()
        
        db.add(material)
        await db.flush()  # Flush before creating notification
        
        # Create notification for professional user
        try:
            from utils.notifications import create_promotion_rejection_notification
            notification = await create_promotion_rejection_notification(
                db=db,
                material=material,
                coordinator_id=user.user_id,
                rejection_reason=request.rejection_reason
            )
            if notification:
                logger.info(f"Created promotion rejection notification for material {material.material_id}")
        except Exception as e:
            logger.error(f"Error creating promotion rejection notification: {e}")
            # Don't fail the rejection if notification fails
        
        await db.commit()
        await db.refresh(material)
        
        return {
            "message": "Promotional material rejected",
                "material_id": material.material_id,
            "status": material.status,
            "rejection_reason": material.rejection_reason,
            "approved_at": material.approved_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error rejecting promotion: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reject promotion: {str(e)}")

# Update promotional material display settings
@router.put("/promotions/{material_id}")
async def update_promotion_display_settings(
    material_id: int,
    updates: PromotionDisplaySettingsUpdate,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Update display settings for an approved promotional material"""
    try:
        await verify_coordinator(user)
        
        result = await db.execute(
            select(PromotionalMaterial).where(PromotionalMaterial.material_id == material_id)
        )
        material = result.scalar_one_or_none()
        
        if not material:
            raise HTTPException(status_code=404, detail="Promotional material not found")
        
        # Only allow updating display settings for approved materials
        if material.status != 'approved':
            raise HTTPException(status_code=400, detail="Can only update display settings for approved materials")
        
        # Update display start date
        if updates.display_start_date:
            try:
                display_start_date = datetime.strptime(updates.display_start_date, "%Y-%m-%d").date()
                material.display_start_date = display_start_date
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid display_start_date format. Use YYYY-MM-DD")
        
        # Update display end date
        if updates.display_end_date:
            try:
                display_end_date = datetime.strptime(updates.display_end_date, "%Y-%m-%d").date()
                material.display_end_date = display_end_date
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid display_end_date format. Use YYYY-MM-DD")
        
        # Validate date range if both are set
        if material.display_start_date and material.display_end_date:
            if material.display_start_date > material.display_end_date:
                raise HTTPException(status_code=400, detail="Display start date must be before end date")
        
        # Update display sequence
        if updates.display_sequence is not None:
            if updates.display_sequence < 0:
                raise HTTPException(status_code=400, detail="Display sequence must be a positive number")
            material.display_sequence = updates.display_sequence
        
        material.updated_by = user.user_id
        material.updated_at = datetime.now()
        
        db.add(material)
        await db.commit()
        await db.refresh(material)
        
        return {
            "message": "Display settings updated successfully",
                "material_id": material.material_id,
            "display_start_date": material.display_start_date.isoformat() if material.display_start_date else None,
            "display_end_date": material.display_end_date.isoformat() if material.display_end_date else None,
            "display_sequence": material.display_sequence
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating display settings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update display settings: {str(e)}")

