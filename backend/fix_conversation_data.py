import asyncio
import os
import json
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def fix_conversation_data():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found")
        return
    
    # Convert to async URL
    async_database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    print(f"Using async database URL: {async_database_url}")
    
    # Agent name to ID mapping
    agent_mapping = {
        'Parenting Style Analyst': 'parenting-style',
        'Child Development Advisor': 'child-development',
        'Crisis Intervention Specialist': 'crisis-intervention',
        'Community Connector': 'community-connector'
    }
    
    try:
        engine = create_async_engine(async_database_url, echo=True)
        
        async with engine.begin() as conn:
            # First, let's see what we have
            result = await conn.execute(text("""
                SELECT conversation_id, title, conversation_type, primary_agent_type, enabled_agents
                FROM ai_conversations
                ORDER BY conversation_id DESC
            """))
            
            conversations = result.fetchall()
            print(f"\nFound {len(conversations)} conversations to check:")
            
            for conv in conversations:
                print(f"\nConversation {conv.conversation_id}:")
                print(f"  Title: {conv.title}")
                print(f"  Type: {conv.conversation_type}")
                print(f"  Primary: {conv.primary_agent_type}")
                print(f"  Enabled: {conv.enabled_agents}")
                
                # Check if enabled_agents needs fixing
                needs_fix = False
                new_enabled_agents = []
                
                if conv.enabled_agents:
                    if isinstance(conv.enabled_agents, str):
                        try:
                            enabled_agents = json.loads(conv.enabled_agents)
                        except:
                            enabled_agents = [conv.enabled_agents]
                    else:
                        enabled_agents = conv.enabled_agents
                    
                    # Convert full names to IDs
                    for agent in enabled_agents:
                        if agent in agent_mapping:
                            new_enabled_agents.append(agent_mapping[agent])
                            needs_fix = True
                        else:
                            new_enabled_agents.append(agent)
                
                # Check if conversation_type needs fixing
                new_conversation_type = conv.conversation_type
                if conv.conversation_type == 'general' and new_enabled_agents and len(new_enabled_agents) == 1:
                    new_conversation_type = 'agent-specific'
                    needs_fix = True
                
                if needs_fix:
                    print(f"  NEEDS FIX:")
                    print(f"    New enabled_agents: {new_enabled_agents}")
                    print(f"    New conversation_type: {new_conversation_type}")
                    
                    # Update the conversation
                    await conn.execute(text("""
                        UPDATE ai_conversations 
                        SET enabled_agents = :enabled_agents,
                            conversation_type = :conversation_type
                        WHERE conversation_id = :conversation_id
                    """), {
                        "enabled_agents": json.dumps(new_enabled_agents),
                        "conversation_type": new_conversation_type,
                        "conversation_id": conv.conversation_id
                    })
                    print(f"    ✓ Fixed conversation {conv.conversation_id}")
                else:
                    print(f"  ✓ No fix needed")
        
        print("\n✅ All conversations processed!")
        await engine.dispose()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(fix_conversation_data()) 