import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

def test_conversation_data():
    # Get database URL
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found in environment")
        return
    
    # Create engine
    engine = create_engine(database_url)
    
    try:
        with engine.connect() as conn:
            # Check conversations table
            result = conn.execute(text("""
                SELECT conversation_id, title, conversation_type, primary_agent_type, enabled_agents, participating_agents
                FROM ai_conversations
                ORDER BY conversation_id DESC
                LIMIT 5
            """))
            
            print("=== CONVERSATIONS DATA ===")
            for row in result:
                print(f"Conversation ID: {row.conversation_id}")
                print(f"Title: {row.title}")
                print(f"Conversation Type: {row.conversation_type}")
                print(f"Primary Agent Type: {row.primary_agent_type}")
                print(f"Enabled Agents: {row.enabled_agents}")
                print(f"Participating Agents: {row.participating_agents}")
                print("---")
            
            # Check if there are any conversations with enabled_agents
            result = conn.execute(text("""
                SELECT COUNT(*) as count
                FROM ai_conversations
                WHERE enabled_agents IS NOT NULL AND enabled_agents != '[]' AND enabled_agents != 'null'
            """))
            
            count = result.fetchone().count
            print(f"Conversations with enabled_agents: {count}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_conversation_data() 