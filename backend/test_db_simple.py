import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def test_db():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found")
        return
    
    # Convert to async URL
    async_database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    print(f"Using async database URL: {async_database_url}")
    
    try:
        engine = create_async_engine(async_database_url, echo=True)
        
        async with engine.begin() as conn:
            # Check conversations
            result = await conn.execute(text("""
                SELECT conversation_id, title, conversation_type, primary_agent_type, enabled_agents
                FROM ai_conversations
                ORDER BY conversation_id DESC
                LIMIT 3
            """))
            
            conversations = result.fetchall()
            print(f"\nFound {len(conversations)} conversations:")
            for conv in conversations:
                print(f"ID: {conv.conversation_id}, Title: {conv.title}, Type: {conv.conversation_type}, Primary: {conv.primary_agent_type}, Enabled: {conv.enabled_agents}")
        
        await engine.dispose()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_db()) 