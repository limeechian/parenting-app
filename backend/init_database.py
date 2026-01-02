# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: init_database.py
# Description: Script to create all database tables from SQLAlchemy models
# First Written on: Friday, 02-Jan-2026

"""
Database Initialization Script

This script creates all database tables defined in the SQLAlchemy models.
Run this script once to set up the database schema in Supabase.

Usage:
    python init_database.py
"""

import asyncio
from models.database import Base, async_engine


async def init_database():
    """
    Create all database tables from SQLAlchemy models.
    """
    print("🔄 Connecting to database...")
    
    # Import all models to ensure they're registered with Base
    # This ensures all table definitions are loaded before creating tables
    from models.database import (
        User,
        ParentProfile,
        ChildProfile,
        EmailVerification,
        PasswordReset,
        ProfessionalProfile,
        ProfessionalDocument,
        ProfessionalService,
        PromotionalMaterial,
        DiaryEntry,
        DiaryAttachment,
        DiaryDraft,
        AIInsight,
        AiConversation,
        AiChatInteraction,
        Community,
        CommunityTaxonomy,
        CommunityTaxonomyAssignment,
        CommunityMember,
        CommunityPost,
        CommunityPostAttachment,
        CommunityPostComment,
        CommunityPostReaction,
        CommunityPostCommentReaction,
        SavedPost,
        SavedProfessional,
        SavedResource,
        Report,
        PrivateMessageConversation,
        PrivateMessage,
        PrivateMessageAttachment,
        PrivateMessageReaction,
        UserNotificationPreference,
        Notification,
        Resource,
        ResourceAttachment
    )
    
    print("📋 Creating database tables...")
    print("   This may take a few moments...")
    
    # Create all tables
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    print("✅ Database tables created successfully!")
    print("\n📊 Tables created:")
    for table_name in sorted(Base.metadata.tables.keys()):
        print(f"   - {table_name}")
    
    print("\n🎉 Database initialization complete!")
    print("   You can now use the application.")


if __name__ == "__main__":
    asyncio.run(init_database())

