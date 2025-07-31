import asyncio
import json
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check_conversation_6():
    # Use the same database URL as main.py
    DATABASE_URL = "postgresql+asyncpg://postgres:limeechian@localhost:5432/parenting_db"
    
    engine = create_async_engine(DATABASE_URL, echo=True)
    
    async with engine.begin() as conn:
        # Check conversation 6
        result = await conn.execute(text('''
            SELECT conversation_id, user_id, child_id, title, conversation_type, 
                   primary_agent_type, enabled_agents, participating_agents
            FROM ai_conversations
            WHERE conversation_id = 6
        '''))
        
        conv = result.fetchone()
        if conv:
            print(f"Conversation 6:")
            print(f"  conversation_id: {conv.conversation_id}")
            print(f"  user_id: {conv.user_id}")
            print(f"  child_id: {conv.child_id}")
            print(f"  title: {conv.title}")
            print(f"  conversation_type: {conv.conversation_type}")
            print(f"  primary_agent_type: {conv.primary_agent_type}")
            print(f"  enabled_agents: {conv.enabled_agents}")
            print(f"  participating_agents: {conv.participating_agents}")
            
            # Check if enabled_agents is JSON string
            if isinstance(conv.enabled_agents, str):
                try:
                    enabled_agents = json.loads(conv.enabled_agents)
                    print(f"  Parsed enabled_agents: {enabled_agents}")
                except:
                    print(f"  Failed to parse enabled_agents JSON")
            else:
                print(f"  enabled_agents is already a list: {conv.enabled_agents}")
        else:
            print("Conversation 6 not found")
        
        # Check the latest interaction for conversation 6
        result = await conn.execute(text('''
            SELECT chat_id, user_id, child_id, query, response, agent_type, 
                   generated_at, conversation_id
            FROM ai_chat_interactions
            WHERE conversation_id = 6
            ORDER BY generated_at DESC
            LIMIT 1
        '''))
        
        interaction = result.fetchone()
        if interaction:
            print(f"\nLatest interaction for conversation 6:")
            print(f"  chat_id: {interaction.chat_id}")
            print(f"  user_id: {interaction.user_id}")
            print(f"  child_id: {interaction.child_id}")
            print(f"  agent_type: {interaction.agent_type}")
            print(f"  query: {interaction.query[:50]}...")
            print(f"  response: {interaction.response[:50]}...")
        else:
            print("No interactions found for conversation 6")

if __name__ == "__main__":
    asyncio.run(check_conversation_6()) 