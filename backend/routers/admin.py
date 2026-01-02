# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: admin.py
# Description: To handle administrator endpoints for user management and role assignment
# First Written on: Monday, 01-Dec-2025
# Edited on: Sunday, 10-Dec-2025

"""
Admin router - Handles user management and role assignment for administrators

This router provides endpoints for:
- User management (list, view details, create, update, delete)
- Role assignment (change user roles)
- User status management (activate/deactivate)
- User activity tracking
- Admin statistics

All endpoints require admin role. Provides full access to user management.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from dependencies import get_current_user_flexible, get_session
from models.database import User, ParentProfile, ProfessionalProfile
from config import logger

# Initialize router with prefix and tags for API documentation
router = APIRouter(prefix="/admin", tags=["admin"])

# ============================================================================
# Helper Functions
# ============================================================================

async def verify_admin(user: User) -> None:
    """
    Verify user is an admin
    
    Args:
        user: User to verify
    
    Raises:
        HTTPException: 403 if user is not an admin
    """
    if user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

# Schemas
class UserRoleUpdate(BaseModel):
    role: str

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserCreate(BaseModel):
    email: str
    password: str
    role: str
    is_active: bool = True

class UserUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None

class UserOut(BaseModel):
    user_id: int
    email: str
    role: str
    is_active: bool
    is_verified: bool
    created_at: str
    updated_at: Optional[str] = None
    parent_profile: Optional[dict] = None
    professional_profile: Optional[dict] = None

# Get all users with filters
@router.get("/users", response_model=List[UserOut])
async def get_users(
    role: Optional[str] = Query(None, description="Filter by role"),
    status: Optional[str] = Query(None, description="Filter by status (active, inactive)"),
    verified: Optional[str] = Query(None, description="Filter by verification (verified, unverified)"),
    search: Optional[str] = Query(None, description="Search by email or name"),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get all users with optional filters (Admin only)"""
    try:
        await verify_admin(user)
        
        query = select(User)
        
        # Apply filters
        if role:
            query = query.where(User.role == role)
        
        if status == 'active':
            query = query.where(User.is_active == True)
        elif status == 'inactive':
            query = query.where(User.is_active == False)
        
        if verified == 'verified':
            query = query.where(User.is_verified == True)
        elif verified == 'unverified':
            query = query.where(User.is_verified == False)
        
        if search:
            query = query.where(User.email.ilike(f"%{search}%"))
        
        query = query.order_by(User.created_at.desc())
        
        result = await db.execute(query)
        users = result.scalars().all()
        
        # Get profiles for each user
        user_list = []
        for u in users:
            user_dict = {
                "user_id": u.user_id,
                "email": u.email,
                "role": u.role,
                "is_active": u.is_active,
                "is_verified": u.is_verified,
                "created_at": u.created_at.isoformat() if u.created_at else "",
                "updated_at": u.updated_at.isoformat() if u.updated_at else None,
                "parent_profile": None,
                "professional_profile": None
            }
            
            # Get parent profile if exists
            if u.role == 'parent':
                parent_result = await db.execute(
                    select(ParentProfile).where(ParentProfile.user_id == u.user_id)
                )
                parent = parent_result.scalar_one_or_none()
                if parent:
                    user_dict["parent_profile"] = {
                        "parent_id": parent.parent_id,
                        "first_name": parent.first_name,
                        "last_name": parent.last_name,
                        "profile_picture_url": parent.profile_picture_url,
                    }
            
            # Get professional profile if exists
            if u.role == 'professional':
                prof_result = await db.execute(
                    select(ProfessionalProfile).where(ProfessionalProfile.user_id == u.user_id)
                )
                prof = prof_result.scalar_one_or_none()
                if prof:
                    user_dict["professional_profile"] = {
                        "professional_id": prof.professional_id,
                        "business_name": prof.business_name,
                        "profile_status": prof.profile_status,
                        "profile_image_url": prof.profile_image_url,
                    }
            
            user_list.append(user_dict)
        
        return user_list
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get users: {str(e)}")

# Get user details
@router.get("/users/{user_id}", response_model=UserOut)
async def get_user_details(
    user_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get detailed information about a specific user (Admin only)"""
    try:
        await verify_admin(user)
        
        result = await db.execute(select(User).where(User.user_id == user_id))
        target_user = result.scalar_one_or_none()
        
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_dict = {
            "user_id": target_user.user_id,
            "email": target_user.email,
            "role": target_user.role,
            "is_active": target_user.is_active,
            "is_verified": target_user.is_verified,
            "created_at": target_user.created_at.isoformat() if target_user.created_at else "",
            "updated_at": target_user.updated_at.isoformat() if target_user.updated_at else None,
            "parent_profile": None,
            "professional_profile": None
        }
        
        # Get parent profile if exists
        if target_user.role == 'parent':
            parent_result = await db.execute(
                select(ParentProfile).where(ParentProfile.user_id == target_user.user_id)
            )
            parent = parent_result.scalar_one_or_none()
            if parent:
                user_dict["parent_profile"] = {
                    "parent_id": parent.parent_id,
                    "first_name": parent.first_name,
                    "last_name": parent.last_name,
                    "profile_picture_url": parent.profile_picture_url,
                }
        
        # Get professional profile if exists
        if target_user.role == 'professional':
            prof_result = await db.execute(
                select(ProfessionalProfile).where(ProfessionalProfile.user_id == target_user.user_id)
            )
            prof = prof_result.scalar_one_or_none()
            if prof:
                user_dict["professional_profile"] = {
                    "professional_id": prof.professional_id,
                    "business_name": prof.business_name,
                    "profile_status": prof.profile_status,
                    "profile_image_url": prof.profile_image_url,
                }
        
        return user_dict
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user details: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user details: {str(e)}")

# Update user role
@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    role_update: UserRoleUpdate,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Update user role (Admin only)"""
    try:
        await verify_admin(user)
        
        # Validate role
        valid_roles = ['parent', 'professional', 'coordinator', 'content_manager', 'admin']
        if role_update.role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
        
        result = await db.execute(select(User).where(User.user_id == user_id))
        target_user = result.scalar_one_or_none()
        
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent changing own role
        if target_user.user_id == user.user_id:
            raise HTTPException(status_code=400, detail="Cannot change your own role")
        
        target_user.role = role_update.role
        target_user.updated_by = user.user_id
        target_user.updated_at = datetime.now()
        
        db.add(target_user)
        await db.commit()
        await db.refresh(target_user)
        
        return {
            "message": "User role updated successfully",
            "user_id": target_user.user_id,
            "new_role": target_user.role
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating user role: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update user role: {str(e)}")

# Update user status (suspend/activate)
@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    status_update: UserStatusUpdate,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Suspend or activate user account (Admin only)"""
    try:
        await verify_admin(user)
        
        result = await db.execute(select(User).where(User.user_id == user_id))
        target_user = result.scalar_one_or_none()
        
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent suspending own account
        if target_user.user_id == user.user_id:
            raise HTTPException(status_code=400, detail="Cannot suspend your own account")
        
        target_user.is_active = status_update.is_active
        target_user.updated_by = user.user_id
        target_user.updated_at = datetime.now()
        
        db.add(target_user)
        await db.commit()
        await db.refresh(target_user)
        
        return {
            "message": f"User account {'activated' if status_update.is_active else 'suspended'} successfully",
            "user_id": target_user.user_id,
            "is_active": target_user.is_active
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating user status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update user status: {str(e)}")

# Get user activity summary
@router.get("/users/{user_id}/activity")
async def get_user_activity(
    user_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get activity summary for a user (Admin only)"""
    try:
        await verify_admin(user)
        
        result = await db.execute(select(User).where(User.user_id == user_id))
        target_user = result.scalar_one_or_none()
        
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Count actual activity
        from models.database import CommunityPost, CommunityPostComment, PrivateMessage
        
        posts_result = await db.execute(
            select(func.count(CommunityPost.post_id)).where(CommunityPost.author_user_id == user_id)
        )
        posts_count = posts_result.scalar() or 0
        
        comments_result = await db.execute(
            select(func.count(CommunityPostComment.comment_id)).where(CommunityPostComment.author_user_id == user_id)
        )
        comments_count = comments_result.scalar() or 0
        
        messages_result = await db.execute(
            select(func.count(PrivateMessage.message_id)).where(
                or_(PrivateMessage.sender_id == user_id, PrivateMessage.recipient_id == user_id)
            )
        )
        messages_count = messages_result.scalar() or 0
        
        return {
            "user_id": target_user.user_id,
            "email": target_user.email,
            "role": target_user.role,
            "created_at": target_user.created_at.isoformat() if target_user.created_at else "",
            "activity_summary": {
                "posts": posts_count,
                "comments": comments_count,
                "messages": messages_count,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user activity: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user activity: {str(e)}")

# Create internal team member
@router.post("/users", response_model=UserOut)
async def create_user(
    user_data: UserCreate,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Create a new internal team member (Admin only)"""
    try:
        await verify_admin(user)
        
        # Validate role - only internal team roles allowed
        valid_internal_roles = ['content_manager', 'coordinator', 'admin']
        if user_data.role not in valid_internal_roles:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid role for internal team. Must be one of: {', '.join(valid_internal_roles)}"
            )
        
        # Check if email already exists
        existing_result = await db.execute(
            select(User).where(User.email == user_data.email)
        )
        existing_user = existing_result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Hash password using password helper
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed_password = pwd_context.hash(user_data.password)
        
        # Create new user
        new_user = User(
            email=user_data.email,
            hashed_password=hashed_password,
            role=user_data.role,
            is_active=user_data.is_active,
            is_verified=True,  # Internal team members are auto-verified
            updated_by=user.user_id
        )
        
        db.add(new_user)
        await db.flush()  # Flush to get user_id without committing
        
        # Create notification preferences for new user (default: both enabled)
        from models.database import UserNotificationPreference
        notification_prefs = UserNotificationPreference(
            user_id=new_user.user_id,
            in_app_notifications=True,
            email_notifications=True
        )
        db.add(notification_prefs)
        
        await db.commit()
        await db.refresh(new_user)
        
        # Return user in UserOut format
        return {
            "user_id": new_user.user_id,
            "email": new_user.email,
            "role": new_user.role,
            "is_active": new_user.is_active,
            "is_verified": new_user.is_verified,
            "created_at": new_user.created_at.isoformat() if new_user.created_at else "",
            "updated_at": new_user.updated_at.isoformat() if new_user.updated_at else None,
            "parent_profile": None,
            "professional_profile": None
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

# Delete user (soft delete by default, hard delete if soft=false)
@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    soft: bool = Query(True, description="Soft delete (set is_active=false) or hard delete"),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Delete a user account (Admin only)"""
    try:
        await verify_admin(user)
        
        result = await db.execute(select(User).where(User.user_id == user_id))
        target_user = result.scalar_one_or_none()
        
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent deleting own account
        if target_user.user_id == user.user_id:
            raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
        if soft:
            # Soft delete: set is_active = false
            target_user.is_active = False
            target_user.updated_by = user.user_id
            target_user.updated_at = datetime.now()
            db.add(target_user)
            await db.commit()
            
            return {
                "message": "User account deactivated successfully",
                "user_id": target_user.user_id,
                "is_active": False
            }
        else:
            # Hard delete: actual database deletion (cascade will handle related records)
            await db.delete(target_user)
            await db.commit()
            
            return {
                "message": "User account deleted permanently",
                "user_id": user_id
            }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")

# Update user (email, password, role) - for internal team members
@router.put("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Update user email, password, or role (Admin only, for internal team)"""
    try:
        await verify_admin(user)
        
        result = await db.execute(select(User).where(User.user_id == user_id))
        target_user = result.scalar_one_or_none()
        
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent updating own account (for security)
        if target_user.user_id == user.user_id:
            raise HTTPException(status_code=400, detail="Cannot update your own account from this endpoint")
        
        # Only allow updating internal team members
        if target_user.role not in ['content_manager', 'coordinator', 'admin']:
            raise HTTPException(status_code=400, detail="This endpoint is only for updating internal team members")
        
        # Update email if provided
        if user_update.email is not None:
            # Check if email already exists (excluding current user)
            existing_result = await db.execute(
                select(User).where(and_(User.email == user_update.email, User.user_id != user_id))
            )
            existing_user = existing_result.scalar_one_or_none()
            if existing_user:
                raise HTTPException(status_code=400, detail="Email already registered")
            target_user.email = user_update.email
        
        # Update password if provided
        if user_update.password is not None:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            target_user.hashed_password = pwd_context.hash(user_update.password)
        
        # Update role if provided
        if user_update.role is not None:
            # Validate role - only internal team roles allowed
            valid_internal_roles = ['content_manager', 'coordinator', 'admin']
            if user_update.role not in valid_internal_roles:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid role. Must be one of: {', '.join(valid_internal_roles)}"
                )
            target_user.role = user_update.role
        
        target_user.updated_by = user.user_id
        target_user.updated_at = datetime.now()
        
        db.add(target_user)
        await db.commit()
        await db.refresh(target_user)
        
        # Return user in UserOut format
        return {
            "user_id": target_user.user_id,
            "email": target_user.email,
            "role": target_user.role,
            "is_active": target_user.is_active,
            "is_verified": target_user.is_verified,
            "created_at": target_user.created_at.isoformat() if target_user.created_at else "",
            "updated_at": target_user.updated_at.isoformat() if target_user.updated_at else None,
            "parent_profile": None,
            "professional_profile": None
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update user: {str(e)}")

# Get dashboard statistics
@router.get("/stats")
async def get_admin_stats(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get dashboard statistics (Admin only)"""
    try:
        await verify_admin(user)
        
        # Count users by role
        users_by_role = {}
        roles = ['parent', 'professional', 'content_manager', 'coordinator', 'admin']
        for role in roles:
            result = await db.execute(
                select(func.count(User.user_id)).where(User.role == role)
            )
            users_by_role[role] = result.scalar() or 0
        
        # Count active vs suspended
        active_result = await db.execute(
            select(func.count(User.user_id)).where(User.is_active == True)
        )
        active_count = active_result.scalar() or 0
        
        suspended_result = await db.execute(
            select(func.count(User.user_id)).where(User.is_active == False)
        )
        suspended_count = suspended_result.scalar() or 0
        
        # Count internal team
        internal_roles = ['content_manager', 'coordinator', 'admin']
        internal_result = await db.execute(
            select(func.count(User.user_id)).where(User.role.in_(internal_roles))
        )
        internal_count = internal_result.scalar() or 0
        
        # Total users
        total_result = await db.execute(select(func.count(User.user_id)))
        total_count = total_result.scalar() or 0
        
        return {
            "total_users": total_count,
            "active_users": active_count,
            "suspended_users": suspended_count,
            "internal_team": internal_count,
            "users_by_role": users_by_role
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting admin stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")



