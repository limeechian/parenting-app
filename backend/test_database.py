import os
import asyncio
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Load environment variables
load_dotenv()

async def test_database():
    """Test database connection"""
    try:
        print("Testing database connection...")
        
        # Get database URL
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("✗ DATABASE_URL not found in environment variables")
            return False
            
        print(f"✓ Database URL found: {database_url[:20]}...")
        
        # Convert to async URL
        async_database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
        print(f"✓ Async database URL: {async_database_url[:30]}...")
        
        # Create async engine
        engine = create_async_engine(async_database_url, echo=False)
        print("✓ Async engine created")
        
        # Test connection
        from sqlalchemy import text
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            print("✓ Database connection successful")
            
        # Test if tables exist
        async with engine.begin() as conn:
            # Check if ai_conversations table exists
            result = await conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'ai_conversations'
                )
            """))
            conversations_exist = result.scalar()
            print(f"✓ ai_conversations table exists: {conversations_exist}")
            
            # Check if ai_chat_interactions table exists
            result = await conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'ai_chat_interactions'
                )
            """))
            interactions_exist = result.scalar()
            print(f"✓ ai_chat_interactions table exists: {interactions_exist}")
            
            # Check if embedding column exists
            result = await conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'ai_chat_interactions' 
                    AND column_name = 'embedding'
                )
            """))
            embedding_exists = result.scalar()
            print(f"✓ embedding column exists: {embedding_exists}")
        
        await engine.dispose()
        print("✓ Database test completed successfully!")
        return True
        
    except Exception as e:
        print(f"✗ Database test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    asyncio.run(test_database()) 