import asyncio
import os
import json
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def test_conversation_loading():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found")
        return
    
    # Convert to async URL
    async_database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    print(f"Using async database URL: {async_database_url}")
    
    try:
        engine = create_async_engine(async_database_url, echo=False)
        
        async with engine.begin() as conn:
            # Simulate the get_conversations endpoint
            result = await conn.execute(text("""
                SELECT 
                    c.conversation_id,
                    c.title,
                    c.child_id,
                    c.started_at,
                    c.updated_at,
                    c.conversation_type,
                    c.primary_agent_type,
                    c.enabled_agents,
                    c.participating_agents,
                    c.summary,
                    cp.name as child_name,
                    cp.age as child_age,
                    (
                        SELECT query 
                        FROM ai_chat_interactions 
                        WHERE conversation_id = c.conversation_id 
                        ORDER BY generated_at DESC 
                        LIMIT 1
                    ) as last_message,
                    (
                        SELECT generated_at 
                        FROM ai_chat_interactions 
                        WHERE conversation_id = c.conversation_id 
                        ORDER BY generated_at DESC 
                        LIMIT 1
                    ) as last_message_time
                FROM ai_conversations c
                LEFT JOIN children_profile cp ON c.child_id = cp.child_id
                WHERE c.user_id = 3
                ORDER BY c.updated_at DESC
            """))
            
            conversations = result.fetchall()
            print(f"\nFound {len(conversations)} conversations:")
            
            for conv in conversations:
                print(f"\nConversation {conv.conversation_id}:")
                print(f"  Title: {conv.title}")
                print(f"  Child: {conv.child_name} (ID: {conv.child_id})")
                print(f"  Type: {conv.conversation_type}")
                print(f"  Primary: {conv.primary_agent_type}")
                print(f"  Enabled: {conv.enabled_agents}")
                
                # Simulate frontend processing
                enabled_agents = []
                if conv.enabled_agents:
                    if isinstance(conv.enabled_agents, str):
                        try:
                            enabled_agents = json.loads(conv.enabled_agents)
                        except:
                            enabled_agents = [conv.enabled_agents]
                    elif isinstance(conv.enabled_agents, list):
                        enabled_agents = conv.enabled_agents
                
                print(f"  Processed enabled_agents: {enabled_agents}")
                
                # Simulate restoreConversationState logic
                was_manual_mode = conv.conversation_type == 'agent-specific' or (enabled_agents and len(enabled_agents) > 0)
                new_auto_mode = not was_manual_mode
                
                print(f"  Frontend would set:")
                print(f"    wasManualMode: {was_manual_mode}")
                print(f"    autoMode: {new_auto_mode}")
                print(f"    enabledAgents: {enabled_agents}")
        
        await engine.dispose()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_conversation_loading()) 