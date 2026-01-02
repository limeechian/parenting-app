# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: public.py
# Description: To handle public professionals endpoints that do not require authentication
# First Written on: Monday, 29-Sep-2025
# Edited on: Sunday, 10-Dec-2025

"""
Public router - Handles public endpoints (no authentication required)

This router provides public-facing endpoints that don't require authentication:
- Professional directory (approved professionals only)
- Promotional materials (approved and currently active)
- Published resources

These endpoints are accessible to anyone, including non-authenticated users.
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, distinct
from typing import Optional, List
from datetime import date, datetime

from dependencies import get_session
from models.database import (
    ProfessionalProfile, ProfessionalService, PromotionalMaterial,
    Resource, ResourceAttachment
)
from config import logger

# Initialize router with prefix and tags for API documentation
router = APIRouter(prefix="/public", tags=["public"])

# ============================================================================
# Professional Directory Endpoints
# ============================================================================

@router.get("/professionals")
async def get_public_professionals(
    search: Optional[str] = Query(None, description="Search by name, specialization, location"),
    city: Optional[str] = Query(None, description="Filter by city"),
    state: Optional[str] = Query(None, description="Filter by state"),
    specialization: Optional[str] = Query(None, description="Filter by specialization tag"),
    developmental_stage: Optional[str] = Query(None, description="Filter by target_developmental_stages"),
    language: Optional[str] = Query(None, description="Filter by languages"),
    availability: Optional[str] = Query(None, description="Filter by availability"),
    service_category: Optional[str] = Query(None, description="Filter by service category"),
    service_type: Optional[str] = Query(None, description="Filter by service type"),
    price_range: Optional[str] = Query(None, description="Filter by price range"),
    page: Optional[int] = Query(1, ge=1),
    limit: Optional[int] = Query(20, ge=1, le=100),
    sort: Optional[str] = Query('name', description="Sort by: 'name' (default)"),
    db: AsyncSession = Depends(get_session)
):
    """Get approved professionals for public directory with search and filtering (no authentication required)"""
    try:
        # Base query - only approved professionals
        query = select(ProfessionalProfile).where(
            ProfessionalProfile.profile_status == 'approved'
        )
        
        # Apply search filter
        if search:
            search_filter = or_(
                ProfessionalProfile.business_name.ilike(f"%{search}%"),
                ProfessionalProfile.city.ilike(f"%{search}%"),
                ProfessionalProfile.state.ilike(f"%{search}%"),
                func.array_to_string(ProfessionalProfile.specializations, ', ').ilike(f"%{search}%"),
                ProfessionalProfile.professional_type.ilike(f"%{search}%"),
                ProfessionalProfile.bio.ilike(f"%{search}%")
            )
            query = query.where(search_filter)
        
        # Apply location filters
        if city:
            query = query.where(ProfessionalProfile.city.ilike(f"%{city}%"))
        if state:
            query = query.where(ProfessionalProfile.state.ilike(f"%{state}%"))
        
        # Apply profile-level array filters
        if specialization:
            # Check if specialization exists in array
            query = query.where(
                func.array_to_string(ProfessionalProfile.specializations, ', ').ilike(f"%{specialization}%")
            )
        
        if developmental_stage:
            # Check if developmental_stage exists in target_developmental_stages array
            query = query.where(
                ProfessionalProfile.target_developmental_stages.contains([developmental_stage])
            )
        
        if language:
            # Check if language exists in languages array
            query = query.where(
                ProfessionalProfile.languages.contains([language])
            )
        
        if availability:
            # Check if availability exists in availability array
            query = query.where(
                ProfessionalProfile.availability.contains([availability])
            )
        
        # Apply service-level filters (requires join)
        if service_category or service_type or price_range:
            # Join with professional_services
            query = query.join(
                ProfessionalService,
                ProfessionalService.profile_id == ProfessionalProfile.professional_id
            ).distinct()
            
            if service_category:
                query = query.where(ProfessionalService.service_category == service_category)
            if service_type:
                query = query.where(ProfessionalService.service_type == service_type)
            if price_range:
                # Price range is stored as text, so we do a text search
                query = query.where(ProfessionalService.price_range.ilike(f"%{price_range}%"))
        
        # Apply sorting
        if sort == 'name':
            query = query.order_by(ProfessionalProfile.business_name.asc())
        # Future: Add other sort options (distance, price, etc.)
        
        # Get total count before pagination
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        
        result = await db.execute(query)
        profiles = result.scalars().all()
        
        # Build response with services
        professionals = []
        for profile in profiles:
            # Get services for this professional
            services_query = select(ProfessionalService).where(
                ProfessionalService.profile_id == profile.professional_id
            )
            services_result = await db.execute(services_query)
            services = services_result.scalars().all()
            
            profile_dict = {
                "professional_id": profile.professional_id,
                "business_name": profile.business_name,
                "professional_type": profile.professional_type,
                "years_experience": profile.years_experience,
                "qualifications": profile.qualifications,
                "certifications": profile.certifications,
                "specializations": profile.specializations or [],
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
                "services": [
                    {
                        "service_id": s.service_id,
                        "service_name": s.service_name,
                        "service_description": s.service_description,
                        "service_category": s.service_category,
                        "service_type": s.service_type,
                        "price_range": s.price_range
                    }
                    for s in services
                ]
            }
            professionals.append(profile_dict)
        
        total_pages = (total + limit - 1) // limit if total > 0 else 0
        
        return {
            "professionals": professionals,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages
        }
    except Exception as e:
        logger.error(f"Error getting public professionals: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get professionals: {str(e)}")

# Get single professional detail (public)
@router.get("/professionals/{professional_id}")
async def get_public_professional_detail(
    professional_id: int,
    db: AsyncSession = Depends(get_session)
):
    """Get detailed professional profile for public directory (no authentication required)"""
    try:
        # Get profile - only approved
        result = await db.execute(
            select(ProfessionalProfile).where(
                and_(
                    ProfessionalProfile.professional_id == professional_id,
                    ProfessionalProfile.profile_status == 'approved'
                )
            )
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Professional profile not found or not approved")
        
        # Get services
        services_query = select(ProfessionalService).where(
            ProfessionalService.profile_id == profile.professional_id
        )
        services_result = await db.execute(services_query)
        services = services_result.scalars().all()
        
        profile_dict = {
            "professional_id": profile.professional_id,
            "business_name": profile.business_name,
            "professional_type": profile.professional_type,
            "years_experience": profile.years_experience,
            "qualifications": profile.qualifications,
            "certifications": profile.certifications,
            "specializations": profile.specializations or [],
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
            "services": [
                {
                    "service_id": s.service_id,
                    "service_name": s.service_name,
                    "service_description": s.service_description,
                    "service_category": s.service_category,
                    "service_type": s.service_type,
                    "price_range": s.price_range
                }
                for s in services
            ]
        }
        
        return {"profile": profile_dict}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting public professional detail: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get professional profile: {str(e)}")

# Get active promotional banners (public)
@router.get("/promotional-banners")
async def get_public_promotional_banners(
    limit: Optional[int] = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_session)
):
    """Get active promotional materials (banners, events, campaigns) for carousel (no authentication required)"""
    try:
        today = date.today()
        
        # Get approved promotional materials that are currently active
        # Exclude materials from archived profiles
        # Show all types: banner, event, campaign
        query = select(PromotionalMaterial, ProfessionalProfile.business_name).join(
            ProfessionalProfile,
            PromotionalMaterial.profile_id == ProfessionalProfile.professional_id
        ).where(
            and_(
                PromotionalMaterial.status == 'approved',
                ProfessionalProfile.profile_status == 'approved',  # Only show materials from approved (non-archived) profiles
                PromotionalMaterial.display_start_date <= today,
                PromotionalMaterial.display_end_date >= today
                # Removed content_type filter to show all types (banner, event, campaign)
            )
        ).order_by(
            PromotionalMaterial.display_sequence.asc().nulls_last(),
            PromotionalMaterial.created_at.desc()
        ).limit(limit)
        
        result = await db.execute(query)
        rows = result.all()
        
        banners = []
        for row in rows:
            content, business_name = row
            banners.append({
                "material_id": content.material_id,
                "profile_id": content.profile_id,
                "content_type": content.content_type,
                "title": content.title,
                "description": content.description,
                "file_path": content.file_path,
                "display_start_date": content.display_start_date.isoformat() if content.display_start_date else None,
                "display_end_date": content.display_end_date.isoformat() if content.display_end_date else None,
                "display_sequence": content.display_sequence,
                "business_name": business_name
            })
        
        return {"banners": banners}
    except Exception as e:
        logger.error(f"Error getting promotional banners: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get promotional banners: {str(e)}")

# --- Resource Endpoints (for Parents) ---

@router.get("/resources", response_model=dict)
async def get_public_resources(
    status: Optional[str] = Query('published', description="Filter by status (default: published)"),
    resource_type: Optional[str] = Query(None, description="Filter by type: article, video, guide"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search by title, description, excerpt, or tags"),
    db: AsyncSession = Depends(get_session)
):
    """Get published resources for parents (no authentication required)"""
    try:
        # Only show published resources
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
                        "is_primary": att.is_primary,
                        "description": att.description,
                        "created_at": att.created_at.isoformat() if att.created_at else None,
                    }
                    for att in attachments
                ]
            }
            resources_with_attachments.append(resource_dict)
        
        return {"resources": resources_with_attachments}
    except Exception as e:
        logger.error(f"Error getting public resources: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get resources: {str(e)}")

