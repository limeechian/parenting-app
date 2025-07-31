import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def check_database():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found")
        return
    
    print(f"Database URL: {database_url}")
    
    try:
        # Parse the DATABASE_URL properly
        # postgresql://username:password@host:port/database
        if database_url.startswith("postgresql://"):
            # Remove the protocol
            url_without_protocol = database_url.replace("postgresql://", "")
            
            # Split at @ to separate user:pass from host:port/database
            if "@" in url_without_protocol:
                user_pass_part, host_db_part = url_without_protocol.split("@", 1)
                
                # Parse user:password
                if ":" in user_pass_part:
                    username, password = user_pass_part.split(":", 1)
                else:
                    username = user_pass_part
                    password = ""
                
                # Parse host:port/database
                if "/" in host_db_part:
                    host_port_part, database = host_db_part.split("/", 1)
                else:
                    host_port_part = host_db_part
                    database = ""
                
                # Parse host:port
                if ":" in host_port_part:
                    host, port = host_port_part.split(":", 1)
                else:
                    host = host_port_part
                    port = "5432"
            else:
                print("Invalid database URL format")
                return
        else:
            print("Database URL doesn't start with postgresql://")
            return
        
        print(f"Parsed: host={host}, port={port}, database={database}, user={username}")
        
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=username,
            password=password
        )
        
        cursor = conn.cursor()
        
        # Check conversations
        cursor.execute("""
            SELECT conversation_id, title, conversation_type, primary_agent_type, enabled_agents
            FROM ai_conversations
            ORDER BY conversation_id DESC
            LIMIT 3
        """)
        
        conversations = cursor.fetchall()
        print(f"\nFound {len(conversations)} conversations:")
        for conv in conversations:
            print(f"ID: {conv[0]}, Title: {conv[1]}, Type: {conv[2]}, Primary: {conv[3]}, Enabled: {conv[4]}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_database() 