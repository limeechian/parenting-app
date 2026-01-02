# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: messages.py
# Description: To handle private messaging endpoints including conversations, messages, attachments, and reactions
# First Written on: Saturday, 04-Oct-2025
# Edited on: Sunday, 10-Dec-2025

"""
Private Messages router - Handles conversations, messages, attachments, and reactions

This router provides endpoints for:
- Private message conversations (create, list, delete)
- Messages (send, retrieve, delete)
- Message attachments (upload photos/videos)
- Message reactions (add, remove, list)
- Real-time message streaming (Server-Sent Events)
- User search for starting conversations

All endpoints require authentication. Messaging is restricted to parent users only.
Messages are stored in Supabase Storage with signed URLs for private access.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, text
from typing import Optional, List
from datetime import datetime
from pathlib import Path
import uuid
import json

from dependencies import get_current_user_flexible, get_session
from models.database import (
    User, PrivateMessageConversation, PrivateMessage, PrivateMessageAttachment,
    PrivateMessageReaction, ParentProfile, ProfessionalProfile
)
from schemas.schemas import (
    ConversationOut, ConversationParticipantOut, PrivateMessageOut, PrivateMessageIn,
    PrivateMessageAttachmentOut, PrivateMessageReactionOut, CreateConversationIn,
    MessageReactionIn
)
from config import logger, supabase, PRIVATE_MESSAGE_ATTACHMENTS_BUCKET, CORS_ORIGINS
from utils.notifications import create_message_received_notification, create_message_reacted_notification
from utils.sse_manager import sse_manager

# Initialize router with prefix and tags for API documentation
router = APIRouter(prefix="/messages", tags=["messages"])

# ============================================================================
# Helper Functions
# ============================================================================

def verify_parent_role(user: User) -> None:
    """
    Verify that the user is a parent - messaging is only available for parent users
    
    Args:
        user: User to verify
    
    Raises:
        HTTPException: 403 if user is not a parent
    """
    if user.role != 'parent':
        raise HTTPException(
            status_code=403,
            detail="Messaging is only available for parent users. Please contact support if you need access."
        )

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
    try:
        # Try parent profile first
        parent_result = await db.execute(
            select(ParentProfile).where(ParentProfile.user_id == user_id)
        )
        parent = parent_result.scalar_one_or_none()
        if parent:
            name = f"{parent.first_name or ''} {parent.last_name or ''}".strip()
            if name:
                return name, parent.profile_picture_url
        
        # Try professional profile
        prof_result = await db.execute(
            select(ProfessionalProfile).where(ProfessionalProfile.user_id == user_id)
        )
        prof = prof_result.scalar_one_or_none()
        if prof:
            return prof.business_name or "Professional", None
        
        # Fallback to email
        user_result = await db.execute(
            select(User).where(User.user_id == user_id)
        )
        user = user_result.scalar_one_or_none()
        if user:
            email_prefix = user.email.split('@')[0] if user.email else "User"
            return email_prefix, None
        
        return "Unknown User", None
    except Exception as e:
        logger.error(f"Error getting user name/avatar: {e}")
        return "Unknown User", None

def get_conversation_participants(conversation: PrivateMessageConversation, current_user_id: int) -> int:
    """Get the other participant's user_id"""
    if conversation.participant1_id == current_user_id:
        return conversation.participant2_id
    return conversation.participant1_id

def get_unread_count(conversation: PrivateMessageConversation, current_user_id: int) -> int:
    """Get unread count for current user"""
    if conversation.participant1_id == current_user_id:
        return conversation.participant1_unread_count
    return conversation.participant2_unread_count

def is_conversation_deleted(conversation: PrivateMessageConversation, current_user_id: int) -> bool:
    """Check if conversation is deleted for current user
    Returns False if there are new messages after deletion (conversation should be restored)"""
    deleted_at = None
    if conversation.participant1_id == current_user_id:
        deleted_at = conversation.participant1_deleted_at
    else:
        deleted_at = conversation.participant2_deleted_at
    
    # If not deleted, return False
    if deleted_at is None:
        return False
    
    # If deleted but there are new messages after deletion, restore it (return False)
    if conversation.last_message_at and conversation.last_message_at > deleted_at:
        return False
    
    # Otherwise, it's deleted
    return True

async def build_conversation_out(conv: PrivateMessageConversation, current_user_id: int, db: AsyncSession) -> ConversationOut:
    """Helper function to build ConversationOut from PrivateMessageConversation"""
    # Get other participant
    other_user_id = get_conversation_participants(conv, current_user_id)
    name, avatar = await get_user_name_avatar(db, other_user_id)
    
    # Get last message if exists
    last_message = None
    if conv.last_message_id:
        msg_result = await db.execute(
            select(PrivateMessage)
            .where(PrivateMessage.message_id == conv.last_message_id)
        )
        msg = msg_result.scalar_one_or_none()
        if msg and not (msg.is_deleted_by_sender and msg.sender_id == current_user_id) and not (msg.is_deleted_by_recipient and msg.recipient_id == current_user_id):
            # Get attachments
            att_result = await db.execute(
                select(PrivateMessageAttachment)
                .where(PrivateMessageAttachment.message_id == msg.message_id)
            )
            att_list = att_result.scalars().all()
            
            # Generate signed URLs for attachments
            attachments = []
            for att in att_list:
                signed_url = att.file_path
                try:
                    if att.file_path and not att.file_path.startswith('http'):
                        signed_url_response = supabase.storage.from_(PRIVATE_MESSAGE_ATTACHMENTS_BUCKET).create_signed_url(
                            att.file_path,
                            expires_in=3600
                        )
                        if isinstance(signed_url_response, dict):
                            signed_url = signed_url_response.get('signedURL') or signed_url_response.get('signed_url') or signed_url_response.get('url')
                        elif isinstance(signed_url_response, str):
                            signed_url = signed_url_response
                        else:
                            signed_url = str(signed_url_response)
                        if not signed_url or signed_url == 'None':
                            signed_url = att.file_path
                except Exception as e:
                    logger.warning(f"Failed to generate signed URL for attachment {att.attachment_id}: {e}")
                    signed_url = att.file_path
                
                att_dict = att.__dict__.copy()
                att_dict['file_path'] = signed_url
                attachments.append(PrivateMessageAttachmentOut(**att_dict))
            
            last_message = PrivateMessageOut(
                message_id=msg.message_id,
                conversation_id=msg.conversation_id,
                sender_id=msg.sender_id,
                recipient_id=msg.recipient_id,
                content=msg.content,
                is_read=msg.is_read,
                read_at=msg.read_at,
                created_at=msg.created_at,
                attachments=attachments if attachments else None
            )
    
    return ConversationOut(
        conversation_id=conv.conversation_id,
        participant=ConversationParticipantOut(
            user_id=other_user_id,
            name=name,
            avatar=avatar
        ),
        last_message=last_message,
        unread_count=get_unread_count(conv, current_user_id),
        last_message_at=conv.last_message_at,
        created_at=conv.created_at
    )

# Get all conversations for current user
@router.get("/conversations", response_model=List[ConversationOut])
async def get_conversations(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get all conversations for the current user (Parent users only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify user is a parent
    verify_parent_role(user)
    
    try:
        # Get conversations where user is participant1 or participant2
        result = await db.execute(
            select(PrivateMessageConversation)
            .where(
                or_(
                    PrivateMessageConversation.participant1_id == user.user_id,
                    PrivateMessageConversation.participant2_id == user.user_id
                )
            )
            .order_by(PrivateMessageConversation.last_message_at.desc().nulls_last())
        )
        conversations = result.scalars().all()
        
        response = []
        for conv in conversations:
            # Skip if deleted for current user
            if is_conversation_deleted(conv, user.user_id):
                continue
            
            conversation_out = await build_conversation_out(conv, user.user_id, db)
            response.append(conversation_out)
        
        return response
    except Exception as e:
        logger.error(f"Error getting conversations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get conversations: {str(e)}")

# SSE endpoint for real-time conversation updates
@router.get("/stream")
async def stream_messages(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Server-Sent Events (SSE) endpoint for real-time message/conversation updates (Parent users only)
    
    Note: EventSource doesn't support custom headers, so authentication
    is handled via cookie or token in query parameter (get_current_user_flexible handles both)
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify user is a parent
    verify_parent_role(user)
    
    logger.info(f"🔵 Messages SSE: Connection request from user {user.user_id} ({user.email})")
    
    async def event_generator():
        """Generate SSE events for the connected user"""
        try:
            logger.info(f"🔵 Messages SSE: Starting event generator for user {user.user_id}")
            
            # Get initial conversations list to send on connection
            result = await db.execute(
                select(PrivateMessageConversation)
                .where(
                    or_(
                        PrivateMessageConversation.participant1_id == user.user_id,
                        PrivateMessageConversation.participant2_id == user.user_id
                    )
                )
                .order_by(PrivateMessageConversation.last_message_at.desc().nulls_last())
            )
            conversations = result.scalars().all()
            
            # Build conversation list
            initial_conversations = []
            for conv in conversations:
                if not is_conversation_deleted(conv, user.user_id):
                    conversation_out = await build_conversation_out(conv, user.user_id, db)
                    # Convert to dict for JSON serialization (mode='json' handles datetime serialization)
                    initial_conversations.append(conversation_out.model_dump(mode='json'))
            
            logger.info(f"🔵 Messages SSE: Sending initial connection message with {len(initial_conversations)} conversations to user {user.user_id}")
            
            # Send initial connection message with conversations list
            yield f"data: {json.dumps({'type': 'connected', 'conversations': initial_conversations, 'timestamp': datetime.now().isoformat()})}\n\n"
            
            # Stream events from SSE manager
            async for event in sse_manager.event_generator(user.user_id):
                yield event
        except Exception as e:
            logger.error(f"🔵 Messages SSE: Error in event generator for user {user.user_id}: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Connection error'})}\n\n"
    
    # Set SSE headers
    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",  # Disable buffering for nginx
        "Content-Type": "text/event-stream",
        "Access-Control-Allow-Origin": CORS_ORIGINS[0] if CORS_ORIGINS else "*",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "Cache-Control",
    }
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=headers
    )

# Get messages for a conversation
@router.get("/conversations/{conversation_id}/messages", response_model=List[PrivateMessageOut])
async def get_messages(
    conversation_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get messages for a conversation (Parent users only)"""
    # Verify user is a parent
    verify_parent_role(user)
    """Get messages for a conversation with pagination"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Verify user is participant
        conv_result = await db.execute(
            select(PrivateMessageConversation)
            .where(PrivateMessageConversation.conversation_id == conversation_id)
        )
        conversation = conv_result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if conversation.participant1_id != user.user_id and conversation.participant2_id != user.user_id:
            raise HTTPException(status_code=403, detail="Not a participant in this conversation")
        
        # Get messages (exclude deleted ones for current user)
        offset = (page - 1) * limit
        result = await db.execute(
            select(PrivateMessage)
            .where(
                and_(
                    PrivateMessage.conversation_id == conversation_id,
                    or_(
                        and_(PrivateMessage.is_deleted_by_sender == False, PrivateMessage.sender_id == user.user_id),
                        and_(PrivateMessage.is_deleted_by_recipient == False, PrivateMessage.recipient_id == user.user_id),
                        and_(PrivateMessage.sender_id != user.user_id, PrivateMessage.recipient_id != user.user_id)
                    )
                )
            )
            .order_by(PrivateMessage.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        messages = result.scalars().all()
        
        # Reverse to show oldest first
        messages = list(reversed(messages))
        
        response = []
        for msg in messages:
            # Get attachments
            att_result = await db.execute(
                select(PrivateMessageAttachment)
                .where(PrivateMessageAttachment.message_id == msg.message_id)
            )
            att_list = att_result.scalars().all()
            
            # Generate signed URLs for attachments (private bucket requires signed URLs)
            attachments = []
            for att in att_list:
                # Generate signed URL for each attachment (expires in 1 hour)
                signed_url = att.file_path  # Default to stored path
                try:
                    if att.file_path and not att.file_path.startswith('http'):
                        # If file_path is a relative path (not already a URL), generate signed URL
                        signed_url_response = supabase.storage.from_(PRIVATE_MESSAGE_ATTACHMENTS_BUCKET).create_signed_url(
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
                except Exception as e:
                    logger.warning(f"Failed to generate signed URL for attachment {att.attachment_id}: {e}")
                    signed_url = att.file_path  # Fallback to stored path
                
                # Create attachment output with signed URL
                att_dict = att.__dict__.copy()
                att_dict['file_path'] = signed_url  # Replace with signed URL
                attachments.append(PrivateMessageAttachmentOut(**att_dict))
            
            # Get reactions
            react_result = await db.execute(
                select(PrivateMessageReaction)
                .where(PrivateMessageReaction.message_id == msg.message_id)
            )
            reactions = []
            for react in react_result.scalars().all():
                name, avatar = await get_user_name_avatar(db, react.user_id)
                reactions.append(PrivateMessageReactionOut(
                    reaction_id=react.reaction_id,
                    message_id=react.message_id,
                    user_id=react.user_id,
                    user_name=name,
                    user_avatar=avatar,
                    reaction_type=react.reaction_type,
                    created_at=react.created_at
                ))
            
            response.append(PrivateMessageOut(
                message_id=msg.message_id,
                conversation_id=msg.conversation_id,
                sender_id=msg.sender_id,
                recipient_id=msg.recipient_id,
                content=msg.content,
                is_read=msg.is_read,
                read_at=msg.read_at,
                created_at=msg.created_at,
                attachments=attachments if attachments else None,
                reactions=reactions if reactions else None
            ))
        
        # Mark messages as read
        await db.execute(
            text("""
                UPDATE private_messages 
                SET is_read = true, read_at = CURRENT_TIMESTAMP
                WHERE conversation_id = :conversation_id 
                AND recipient_id = :user_id 
                AND is_read = false
            """),
            {"conversation_id": conversation_id, "user_id": user.user_id}
        )
        
        # Reset unread count
        if conversation.participant1_id == user.user_id:
            conversation.participant1_unread_count = 0
        else:
            conversation.participant2_unread_count = 0
        
        await db.commit()
        
        # NOTE: get_messages marks messages as read but doesn't send SSE event
        # This prevents loops where get_messages -> SSE -> frontend refresh -> get_messages
        # The frontend should handle marking as read separately if needed via mark_conversation_read endpoint
        logger.info(f"🔵 DEBUG: get_messages - marked messages as read, unread_count reset to 0 (no SSE sent)")
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting messages: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get messages: {str(e)}")

# Send a message
@router.post("/conversations/{conversation_id}/messages", response_model=PrivateMessageOut)
async def send_message(
    conversation_id: int,
    message_data: PrivateMessageIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Send a message in a conversation (Parent users only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify user is a parent
    verify_parent_role(user)
    
    try:
        # Verify conversation exists and user is participant
        conv_result = await db.execute(
            select(PrivateMessageConversation)
            .where(PrivateMessageConversation.conversation_id == conversation_id)
        )
        conversation = conv_result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if conversation.participant1_id != user.user_id and conversation.participant2_id != user.user_id:
            raise HTTPException(status_code=403, detail="Not a participant in this conversation")
        
        # Determine recipient
        recipient_id = conversation.participant2_id if conversation.participant1_id == user.user_id else conversation.participant1_id
        
        # Create message
        # Note: Content can be empty if attachments will be uploaded separately after message creation
        # This is the correct flow - message must exist first so attachments can reference message_id
        new_message = PrivateMessage(
            conversation_id=conversation_id,
            sender_id=user.user_id,
            recipient_id=recipient_id,
            content=message_data.content or ""  # Allow empty string if attachments will be added
        )
        db.add(new_message)
        await db.flush()
        
        # Add attachments if provided
        attachments = []
        if message_data.attachments:
            for file_path in message_data.attachments:
                # Extract file name from path
                file_name = file_path.split('/')[-1].split('?')[0] if file_path else "attachment"
                file_name_lower = file_name.lower()
                if any(ext in file_name_lower for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
                    file_type = 'image'
                elif any(ext in file_name_lower for ext in ['.mp4', '.avi', '.mov', '.wmv', '.webm']):
                    file_type = 'video'
                else:
                    file_type = 'document'
                
                attachment = PrivateMessageAttachment(
                    message_id=new_message.message_id,
                    file_name=file_name,
                    file_path=file_path,
                    file_type=file_type
                )
                db.add(attachment)
                attachments.append(attachment)
        
        await db.flush()
        
        # Update conversation
        conversation.last_message_id = new_message.message_id
        conversation.last_message_at = new_message.created_at
        
        # Restore conversation if it was deleted by recipient (new message restores deleted conversation)
        # This matches real-world messaging app behavior (WhatsApp, iMessage, etc.)
        if conversation.participant1_id == recipient_id and conversation.participant1_deleted_at is not None:
            conversation.participant1_deleted_at = None
        elif conversation.participant2_id == recipient_id and conversation.participant2_deleted_at is not None:
            conversation.participant2_deleted_at = None
        
        # Increment unread count for recipient
        if conversation.participant1_id == recipient_id:
            conversation.participant1_unread_count += 1
        else:
            conversation.participant2_unread_count += 1
        
        # Create notification for recipient (before commit to ensure transaction consistency)
        try:
            notification = await create_message_received_notification(
                db, new_message.message_id, user.user_id, recipient_id, new_message.content
            )
        except Exception as e:
            logger.error(f"Error creating message_received notification: {e}")
            # Rollback the transaction if notification creation fails
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")
        
        # Commit everything together (message + notification)
        await db.commit()
        await db.refresh(new_message)
        
        # Build message output with attachments
        attachment_outs = [PrivateMessageAttachmentOut(**a.__dict__) for a in attachments]
        message_out = PrivateMessageOut(
            message_id=new_message.message_id,
            conversation_id=new_message.conversation_id,
            sender_id=new_message.sender_id,
            recipient_id=new_message.recipient_id,
            content=new_message.content,
            is_read=new_message.is_read,
            read_at=new_message.read_at,
            created_at=new_message.created_at,
            attachments=attachment_outs if attachment_outs else None
        )
        
        # Send SSE update to recipient (new message received)
        try:
            # Refresh conversation to get latest state
            await db.refresh(conversation)
            conversation_update = await build_conversation_out(conversation, recipient_id, db)
            
            sse_data = {
                "type": "new_message",
                "conversation_id": conversation_id,
                "message": message_out.model_dump(mode='json'),
                "conversation_update": conversation_update.model_dump(mode='json')
            }
            await sse_manager.send_message_update(recipient_id, sse_data)
        except Exception as e:
            logger.error(f"Error sending SSE update for new message: {e}")
            # Don't fail the request if SSE fails
        
        # Send SSE update to sender (conversation updated)
        try:
            conversation_update_sender = await build_conversation_out(conversation, user.user_id, db)
            sse_data_sender = {
                "type": "conversation_updated",
                "conversation_id": conversation_id,
                "conversation": conversation_update_sender.model_dump(mode='json')
            }
            await sse_manager.send_message_update(user.user_id, sse_data_sender)
        except Exception as e:
            logger.error(f"Error sending SSE update to sender: {e}")
            # Don't fail the request if SSE fails
        
        return message_out
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")

# Create new conversation or get existing
@router.post("/conversations", response_model=ConversationOut)
async def create_conversation(
    conversation_data: CreateConversationIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Create a new conversation or return existing one (Parent users only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify user is a parent
    verify_parent_role(user)
    
    if conversation_data.recipient_id == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot create conversation with yourself")
    
    try:
        # Verify recipient exists and check role-based messaging restrictions
        recipient_result = await db.execute(
            select(User).where(User.user_id == conversation_data.recipient_id)
        )
        recipient = recipient_result.scalar_one_or_none()
        
        if not recipient:
            raise HTTPException(status_code=404, detail="Recipient user not found")
        
        if not recipient.is_active:
            raise HTTPException(status_code=400, detail="Cannot create conversation with inactive user")
        
        # Role-based messaging restrictions
        # According to functionalities_deliverables.txt:
        # "To communicate with other parents through private messaging"
        # Parents can only message other parents
        if recipient.role != 'parent':
            raise HTTPException(
                status_code=403, 
                detail="Parents can only send messages to other parents. Please use external contact details for professionals."
            )
        
        # Ensure consistent ordering (smaller user_id first)
        participant1_id = min(user.user_id, conversation_data.recipient_id)
        participant2_id = max(user.user_id, conversation_data.recipient_id)
        
        # Check if conversation already exists
        result = await db.execute(
            select(PrivateMessageConversation)
            .where(
                and_(
                    PrivateMessageConversation.participant1_id == participant1_id,
                    PrivateMessageConversation.participant2_id == participant2_id
                )
            )
        )
        existing_conv = result.scalar_one_or_none()
        
        if existing_conv:
            # Restore if deleted
            if user.user_id == participant1_id and existing_conv.participant1_deleted_at:
                existing_conv.participant1_deleted_at = None
            elif user.user_id == participant2_id and existing_conv.participant2_deleted_at:
                existing_conv.participant2_deleted_at = None
            await db.commit()
            await db.refresh(existing_conv)
            
            # Get participant info
            other_user_id = participant2_id if user.user_id == participant1_id else participant1_id
            name, avatar = await get_user_name_avatar(db, other_user_id)
            
            conversation_out = ConversationOut(
                conversation_id=existing_conv.conversation_id,
                participant=ConversationParticipantOut(
                    user_id=other_user_id,
                    name=name,
                    avatar=avatar
                ),
                last_message=None,
                unread_count=get_unread_count(existing_conv, user.user_id),
                last_message_at=existing_conv.last_message_at,
                created_at=existing_conv.created_at
            )
            
            # Send SSE update to user (conversation restored/updated)
            try:
                sse_data = {
                    "type": "conversation_updated",
                    "conversation_id": existing_conv.conversation_id,
                    "conversation": conversation_out.model_dump(mode='json')
                }
                await sse_manager.send_message_update(user.user_id, sse_data)
            except Exception as e:
                logger.error(f"Error sending SSE update for conversation restore: {e}")
                # Don't fail the request if SSE fails
            
            return conversation_out
        
        # Create new conversation
        new_conv = PrivateMessageConversation(
            participant1_id=participant1_id,
            participant2_id=participant2_id
        )
        db.add(new_conv)
        await db.commit()
        await db.refresh(new_conv)
        
        # Get participant info
        other_user_id = participant2_id if user.user_id == participant1_id else participant1_id
        name, avatar = await get_user_name_avatar(db, other_user_id)
        
        conversation_out = ConversationOut(
            conversation_id=new_conv.conversation_id,
            participant=ConversationParticipantOut(
                user_id=other_user_id,
                name=name,
                avatar=avatar
            ),
            last_message=None,
            unread_count=0,
            last_message_at=None,
            created_at=new_conv.created_at
        )
        
        # Send SSE update to user (new conversation created)
        try:
            sse_data = {
                "type": "conversation_updated",
                "conversation_id": new_conv.conversation_id,
                "conversation": conversation_out.model_dump(mode='json')
            }
            await sse_manager.send_message_update(user.user_id, sse_data)
        except Exception as e:
            logger.error(f"Error sending SSE update for new conversation: {e}")
            # Don't fail the request if SSE fails
        
        return conversation_out
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create conversation: {str(e)}")

# Mark messages as read
@router.put("/conversations/{conversation_id}/read")
async def mark_conversation_read(
    conversation_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Mark all messages in conversation as read (Parent users only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify user is a parent
    verify_parent_role(user)
    
    try:
        # Verify user is participant
        conv_result = await db.execute(
            select(PrivateMessageConversation)
            .where(PrivateMessageConversation.conversation_id == conversation_id)
        )
        conversation = conv_result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if conversation.participant1_id != user.user_id and conversation.participant2_id != user.user_id:
            raise HTTPException(status_code=403, detail="Not a participant in this conversation")
        
        # Mark messages as read
        await db.execute(
            text("""
                UPDATE private_messages 
                SET is_read = true, read_at = CURRENT_TIMESTAMP
                WHERE conversation_id = :conversation_id 
                AND recipient_id = :user_id 
                AND is_read = false
            """),
            {"conversation_id": conversation_id, "user_id": user.user_id}
        )
        
        # Reset unread count
        if conversation.participant1_id == user.user_id:
            conversation.participant1_unread_count = 0
        else:
            conversation.participant2_unread_count = 0
        
        await db.commit()
        
        # Send SSE update to user (conversation updated)
        # NOTE: This SSE event might trigger frontend to refresh, but frontend should handle this
        # by checking if it's currently fetching messages
        try:
            await db.refresh(conversation)
            conversation_update = await build_conversation_out(conversation, user.user_id, db)
            logger.info(f"🔵 DEBUG: Sending SSE conversation_updated for mark_as_read - conversation {conversation_id}, unread_count: {conversation_update.unread_count}")
            sse_data = {
                "type": "conversation_updated",
                "conversation_id": conversation_id,
                "conversation": conversation_update.model_dump(mode='json')
            }
            await sse_manager.send_message_update(user.user_id, sse_data)
        except Exception as e:
            logger.error(f"Error sending SSE update for mark as read: {e}")
            # Don't fail the request if SSE fails
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error marking conversation as read: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to mark conversation as read: {str(e)}")

# Delete conversation (soft delete)
@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Soft delete conversation for current user (Parent users only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify user is a parent
    verify_parent_role(user)
    
    try:
        # Verify user is participant
        conv_result = await db.execute(
            select(PrivateMessageConversation)
            .where(PrivateMessageConversation.conversation_id == conversation_id)
        )
        conversation = conv_result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if conversation.participant1_id != user.user_id and conversation.participant2_id != user.user_id:
            raise HTTPException(status_code=403, detail="Not a participant in this conversation")
        
        # Soft delete
        if conversation.participant1_id == user.user_id:
            conversation.participant1_deleted_at = datetime.utcnow()
        else:
            conversation.participant2_deleted_at = datetime.utcnow()
        
        await db.commit()
        
        # Send SSE update to user (conversation deleted)
        try:
            sse_data = {
                "type": "conversation_deleted",
                "conversation_id": conversation_id
            }
            await sse_manager.send_message_update(user.user_id, sse_data)
        except Exception as e:
            logger.error(f"Error sending SSE update for conversation deletion: {e}")
            # Don't fail the request if SSE fails
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")

# Search users for new message
@router.get("/users/search")
async def search_users(
    q: str = Query(..., description="Search by email or name"),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Search users by email or name for starting new conversations (Parent users only)
    
    Only parent users can search for and message other parent users.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify user is a parent
    verify_parent_role(user)
    
    try:
        query = q.strip()
        if not query:
            return {"users": []}
        
        # Only allow searching for other parent users
        # According to functionalities_deliverables.txt:
        # "To communicate with other parents through private messaging"
        # Parents can only message other parents
        allowed_roles = ['parent']
        
        # Search by email in users table - filtered to parent role only
        users_result = await db.execute(
            select(User).where(
                and_(
                    User.user_id != user.user_id,
                    User.is_active == True,
                    User.role == 'parent',  # Only parent users
                    User.email.ilike(f"%{query}%")
                )
            ).limit(10)
        )
        users = users_result.scalars().all()
        
        # Also search by parent profile name
        profile_users = []
        try:
            profiles_result = await db.execute(
                select(ParentProfile, User)
                .join(User, ParentProfile.user_id == User.user_id)
                .where(
                    and_(
                        User.user_id != user.user_id,
                        User.is_active == True,
                        User.role == 'parent',  # Ensure only parent users
                        or_(
                            ParentProfile.first_name.ilike(f"%{query}%"),
                            ParentProfile.last_name.ilike(f"%{query}%")
                        )
                    )
                ).limit(10)
            )
            profile_users = profiles_result.all()
        except Exception as profile_error:
            # Parent profile table might not exist, skip it
            logger.warning(f"Parent profile search skipped: {profile_error}")
            profile_users = []
        
        response = []
        seen_user_ids = set()
        
        # Process users found by email (already filtered to parent role)
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
        
        # Process parent profile results
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
        
        return {"users": response[:10]}  # Limit to 10 total
    except Exception as e:
        logger.error(f"Error searching users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search users: {str(e)}")

# Upload message attachment
@router.post("/attachments/{message_id}/upload")
async def upload_message_attachment(
    message_id: int,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Upload an attachment for a message using Supabase Storage (Parent users only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify user is a parent
    verify_parent_role(user)
    
    try:
        # Verify message exists and user is sender
        msg_result = await db.execute(
            select(PrivateMessage).where(PrivateMessage.message_id == message_id)
        )
        message = msg_result.scalar_one_or_none()
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        if message.sender_id != user.user_id:
            raise HTTPException(status_code=403, detail="Can only attach files to your own messages")
        
        # Validate file size (10MB limit)
        if file.size and file.size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
        
        # Validate file type
        allowed_types = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/quicktime', 'video/webm',
            'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain', 'text/csv',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ]
        
        file_extension = Path(file.filename).suffix.lower() if file.filename else ""
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.avi', '.mov', '.wmv', '.webm', '.pdf', '.doc', '.docx', '.txt', '.csv', '.xls', '.xlsx', '.ppt', '.pptx']
        
        is_valid = False
        if file.content_type:
            is_valid = file.content_type in allowed_types
        elif file_extension:
            is_valid = file_extension in allowed_extensions
        
        if not is_valid:
            raise HTTPException(status_code=400, detail="File type not allowed. Allowed: images (JPEG, PNG, GIF, WebP), videos (MP4, AVI, MOV, WMV, WebM), and documents (PDF, DOC, DOCX, TXT, CSV, XLS, XLSX, PPT, PPTX)")
        
        content = await file.read()
        
        file_extension = Path(file.filename).suffix if file.filename else ""
        if not file_extension:
            if file.content_type and file.content_type.startswith('image/'):
                file_extension = '.jpg' if 'jpeg' in file.content_type else '.png'
            elif file.content_type and file.content_type.startswith('video/'):
                file_extension = '.mp4'  # Default to mp4 for videos
            elif file.content_type == 'application/pdf':
                file_extension = '.pdf'
        
        unique_filename = f"messages/{message_id}/{uuid.uuid4()}{file_extension}"
        
        logger.info(f"🔄 Uploading message attachment to Supabase Storage...")
        logger.info(f"📦 Bucket: {PRIVATE_MESSAGE_ATTACHMENTS_BUCKET}, Filename: {unique_filename}")
        
        try:
            upload_response = supabase.storage.from_(PRIVATE_MESSAGE_ATTACHMENTS_BUCKET).upload(
                unique_filename,
                content,
                file_options={"content-type": file.content_type or "application/octet-stream", "upsert": "true"}
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
            
            # For private bucket, store relative path and generate signed URL
            # Store the relative path in database for generating signed URLs on-demand
            file_path_storage = unique_filename  # Store relative path: {message_id}/{uuid}.{ext}
            
            # Generate signed URL (for private bucket - expires in 1 hour)
            try:
                signed_url_response = supabase.storage.from_(PRIVATE_MESSAGE_ATTACHMENTS_BUCKET).create_signed_url(
                    unique_filename,
                    expires_in=3600  # 1 hour expiration
                )
                
                # Extract signed URL from response
                if isinstance(signed_url_response, dict):
                    file_url = signed_url_response.get('signedURL') or signed_url_response.get('signed_url') or signed_url_response.get('url')
                elif isinstance(signed_url_response, str):
                    file_url = signed_url_response
                else:
                    file_url = str(signed_url_response)
                
                if not file_url or file_url == 'None':
                    logger.warning(f"⚠️ Failed to generate signed URL, storing file path only")
                    file_url = file_path_storage  # Fallback to file path
            except Exception as url_exception:
                logger.error(f"❌ Failed to generate signed URL: {url_exception}")
                # Store file path even if signed URL generation fails
                file_url = file_path_storage
            
            logger.info(f"✅ Message attachment uploaded successfully (signed URL expires in 1 hour)")
            
            # Create attachment record
            # Store the relative path (not the signed URL) for generating signed URLs on-demand
            if file.content_type and file.content_type.startswith('image/'):
                file_type = 'image'
            elif file.content_type and file.content_type.startswith('video/'):
                file_type = 'video'
            else:
                file_type = 'document'
            attachment = PrivateMessageAttachment(
                message_id=message_id,
                file_name=file.filename or "attachment",
                file_path=file_path_storage,  # Store relative path for signed URL generation
                file_type=file_type,
                file_size=file.size,
                mime_type=file.content_type
            )
            db.add(attachment)
            await db.commit()
            await db.refresh(attachment)
            
            return PrivateMessageAttachmentOut(**attachment.__dict__)
        except HTTPException:
            raise
        except Exception as upload_exception:
            logger.error(f"❌ Supabase upload exception: {upload_exception}")
            if 'row-level security' in str(upload_exception).lower() or 'unauthorized' in str(upload_exception).lower():
                raise HTTPException(
                    status_code=500,
                    detail="Storage upload failed due to RLS policy. Please ensure SUPABASE_SERVICE_ROLE_KEY (not SUPABASE_KEY) is set in your backend .env file and restart the backend server."
                )
            raise HTTPException(status_code=500, detail=f"Failed to upload attachment: {str(upload_exception)}")
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error uploading message attachment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload attachment: {str(e)}")

# Add message reaction
@router.post("/reactions/{message_id}", response_model=PrivateMessageReactionOut)
async def add_reaction(
    message_id: int,
    reaction_data: MessageReactionIn,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Add a reaction to a message (Parent users only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify user is a parent
    verify_parent_role(user)
    
    try:
        # Verify message exists
        msg_result = await db.execute(
            select(PrivateMessage).where(PrivateMessage.message_id == message_id)
        )
        message = msg_result.scalar_one_or_none()
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        # Check if reaction already exists
        existing_result = await db.execute(
            select(PrivateMessageReaction)
            .where(
                and_(
                    PrivateMessageReaction.message_id == message_id,
                    PrivateMessageReaction.user_id == user.user_id,
                    PrivateMessageReaction.reaction_type == reaction_data.reaction_type
                )
            )
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            # Return existing reaction
            name, avatar = await get_user_name_avatar(db, user.user_id)
            return PrivateMessageReactionOut(
                reaction_id=existing.reaction_id,
                message_id=existing.message_id,
                user_id=existing.user_id,
                user_name=name,
                user_avatar=avatar,
                reaction_type=existing.reaction_type,
                created_at=existing.created_at
            )
        
        # Create new reaction
        reaction = PrivateMessageReaction(
            message_id=message_id,
            user_id=user.user_id,
            reaction_type=reaction_data.reaction_type
        )
        db.add(reaction)
        
        # Update conversation's last_message_at to show reaction in conversation list
        # This allows the recipient to see that there's a new reaction
        conv_result = await db.execute(
            select(PrivateMessageConversation)
            .where(PrivateMessageConversation.conversation_id == message.conversation_id)
        )
        conversation = conv_result.scalar_one_or_none()
        if conversation:
            # Update last_message_at to current time so reaction shows in conversation list
            conversation.last_message_at = datetime.now()
            # Increment unread count for the message owner (sender) when someone else reacts
            # If User A sends a message to User B, and User B reacts, User A should see the notification
            if message.sender_id != user.user_id:
                # Reaction is on someone else's message, increment unread count for the message sender
                if conversation.participant1_id == message.sender_id:
                    conversation.participant1_unread_count += 1
                else:
                    conversation.participant2_unread_count += 1
            # If user reacts to their own message, no need to increment unread count
        
        # Create notification for message sender if someone else reacted (before commit)
        if message.sender_id != user.user_id:
            try:
                notification = await create_message_reacted_notification(
                    db, message_id, message.sender_id, user.user_id, reaction_data.reaction_type
                )
            except Exception as e:
                logger.error(f"Error creating message_reacted notification: {e}")
                # Rollback if notification fails
                await db.rollback()
                raise HTTPException(status_code=500, detail=f"Failed to add reaction: {str(e)}")
        
        # Commit everything together
        await db.commit()
        await db.refresh(reaction)
        
        name, avatar = await get_user_name_avatar(db, user.user_id)
        reaction_out = PrivateMessageReactionOut(
            reaction_id=reaction.reaction_id,
            message_id=reaction.message_id,
            user_id=reaction.user_id,
            user_name=name,
            user_avatar=avatar,
            reaction_type=reaction.reaction_type,
            created_at=reaction.created_at
        )
        
        # Send SSE updates to both participants
        if conversation:
            try:
                await db.refresh(conversation)
                # Get both participants
                participant1_id = conversation.participant1_id
                participant2_id = conversation.participant2_id
                
                # Update for both participants
                for participant_id in [participant1_id, participant2_id]:
                    conversation_update = await build_conversation_out(conversation, participant_id, db)
                    sse_data = {
                        "type": "message_reaction",
                        "conversation_id": message.conversation_id,
                        "message_id": message_id,
                        "reaction": reaction_out.model_dump(mode='json'),
                        "conversation_update": conversation_update.model_dump(mode='json')
                    }
                    await sse_manager.send_message_update(participant_id, sse_data)
            except Exception as e:
                logger.error(f"Error sending SSE update for reaction: {e}")
                # Don't fail the request if SSE fails
        
        return reaction_out
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error adding reaction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add reaction: {str(e)}")

# Remove message reaction
@router.delete("/reactions/{message_id}/{reaction_type}")
async def remove_reaction(
    message_id: int,
    reaction_type: str,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Remove a reaction from a message (Parent users only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify user is a parent
    verify_parent_role(user)
    
    try:
        result = await db.execute(
            select(PrivateMessageReaction)
            .where(
                and_(
                    PrivateMessageReaction.message_id == message_id,
                    PrivateMessageReaction.user_id == user.user_id,
                    PrivateMessageReaction.reaction_type == reaction_type
                )
            )
        )
        reaction = result.scalar_one_or_none()
        if not reaction:
            raise HTTPException(status_code=404, detail="Reaction not found")
        
        # Get message to find conversation
        msg_result = await db.execute(
            select(PrivateMessage).where(PrivateMessage.message_id == message_id)
        )
        message = msg_result.scalar_one_or_none()
        
        await db.delete(reaction)
        await db.commit()
        
        # Send SSE updates to both participants (reaction removed, refresh conversation)
        if message:
            try:
                conv_result = await db.execute(
                    select(PrivateMessageConversation)
                    .where(PrivateMessageConversation.conversation_id == message.conversation_id)
                )
                conversation = conv_result.scalar_one_or_none()
                
                if conversation:
                    # Get both participants
                    participant1_id = conversation.participant1_id
                    participant2_id = conversation.participant2_id
                    
                    # Update for both participants
                    for participant_id in [participant1_id, participant2_id]:
                        await db.refresh(conversation)
                        conversation_update = await build_conversation_out(conversation, participant_id, db)
                        sse_data = {
                            "type": "message_reaction",
                            "conversation_id": message.conversation_id,
                            "message_id": message_id,
                            "reaction": None,  # Reaction removed
                            "conversation_update": conversation_update.model_dump(mode='json')
                        }
                        await sse_manager.send_message_update(participant_id, sse_data)
            except Exception as e:
                logger.error(f"Error sending SSE update for reaction removal: {e}")
                # Don't fail the request if SSE fails
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error removing reaction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to remove reaction: {str(e)}")

# Get message reactions
@router.get("/reactions/{message_id}", response_model=List[PrivateMessageReactionOut])
async def get_message_reactions(
    message_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Get all reactions for a message (Parent users only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify user is a parent
    verify_parent_role(user)
    
    try:
        result = await db.execute(
            select(PrivateMessageReaction)
            .where(PrivateMessageReaction.message_id == message_id)
        )
        reactions = result.scalars().all()
        
        response = []
        for react in reactions:
            name, avatar = await get_user_name_avatar(db, react.user_id)
            response.append(PrivateMessageReactionOut(
                reaction_id=react.reaction_id,
                message_id=react.message_id,
                user_id=react.user_id,
                user_name=name,
                user_avatar=avatar,
                reaction_type=react.reaction_type,
                created_at=react.created_at
            ))
        
        return response
    except Exception as e:
        logger.error(f"Error getting reactions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get reactions: {str(e)}")

# Delete message (soft delete)
@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """Soft delete a message - sender deletes with is_deleted_by_sender, recipient deletes with is_deleted_by_recipient (Parent users only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify user is a parent
    verify_parent_role(user)
    
    try:
        # Verify message exists
        msg_result = await db.execute(
            select(PrivateMessage).where(PrivateMessage.message_id == message_id)
        )
        message = msg_result.scalar_one_or_none()
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        # Verify user is either sender or recipient
        if message.sender_id != user.user_id and message.recipient_id != user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this message")
        
        # Soft delete based on user role
        if message.sender_id == user.user_id:
            # Sender deleting their own message
            message.is_deleted_by_sender = True
        else:
            # Recipient deleting message sent to them
            message.is_deleted_by_recipient = True
        
        await db.commit()
        
        # Send SSE updates to both participants (message deleted, refresh conversation)
        try:
            conv_result = await db.execute(
                select(PrivateMessageConversation)
                .where(PrivateMessageConversation.conversation_id == message.conversation_id)
            )
            conversation = conv_result.scalar_one_or_none()
            
            if conversation:
                # Get both participants
                participant1_id = conversation.participant1_id
                participant2_id = conversation.participant2_id
                
                # Update for both participants
                for participant_id in [participant1_id, participant2_id]:
                    await db.refresh(conversation)
                    conversation_update = await build_conversation_out(conversation, participant_id, db)
                    sse_data = {
                        "type": "conversation_updated",
                        "conversation_id": message.conversation_id,
                        "conversation": conversation_update.model_dump(mode='json')
                    }
                    await sse_manager.send_message_update(participant_id, sse_data)
        except Exception as e:
            logger.error(f"Error sending SSE update for message deletion: {e}")
            # Don't fail the request if SSE fails
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting message: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete message: {str(e)}")

