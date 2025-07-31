import os
import asyncio
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def debug_chat_functionality():
    """Debug the chat functionality step by step"""
    
    print("=== CHAT FUNCTIONALITY DEBUG ===\n")
    
    # Step 1: Check environment variables
    print("1. Checking environment variables...")
    openai_key = os.getenv("OPENAI_API_KEY")
    db_url = os.getenv("DATABASE_URL")
    secret_key = os.getenv("SECRET_KEY")
    
    print(f"   OpenAI API Key: {'✓ Found' if openai_key else '✗ Missing'}")
    print(f"   Database URL: {'✓ Found' if db_url else '✗ Missing'}")
    print(f"   Secret Key: {'✓ Found' if secret_key else '✗ Missing'}")
    
    if not all([openai_key, db_url, secret_key]):
        print("   ✗ Missing required environment variables!")
        return False
    
    # Step 2: Test imports
    print("\n2. Testing imports...")
    try:
        from crewai import Agent, Task, Crew
        from langchain_openai import ChatOpenAI, OpenAIEmbeddings
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
        from sqlalchemy.orm import sessionmaker
        print("   ✓ All imports successful")
    except ImportError as e:
        print(f"   ✗ Import error: {e}")
        return False
    
    # Step 3: Test database connection
    print("\n3. Testing database connection...")
    try:
        from sqlalchemy import text
        async_database_url = db_url.replace("postgresql://", "postgresql+asyncpg://")
        engine = create_async_engine(async_database_url, echo=False)
        
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            print("   ✓ Database connection successful")
        
        await engine.dispose()
    except Exception as e:
        print(f"   ✗ Database connection failed: {e}")
        return False
    
    # Step 4: Test OpenAI connection
    print("\n4. Testing OpenAI connection...")
    try:
        llm = ChatOpenAI(model="gpt-4", temperature=0.7)
        embeddings = OpenAIEmbeddings()
        print("   ✓ OpenAI clients created successfully")
    except Exception as e:
        print(f"   ✗ OpenAI connection failed: {e}")
        return False
    
    # Step 5: Test CrewAI function
    print("\n5. Testing CrewAI function...")
    try:
        from crewai_agents import execute_crewai_response
        
        # Test with a simple query
        test_query = "What are some good activities for a 5-year-old?"
        test_context = "Parent: Mother, Style: Authoritative"
        test_child_info = "CHILD PROFILE DETAILS:\nName: Liam\nAge: 5 years old\nGender: Male"
        
        print(f"   Testing with query: {test_query}")
        
        result = await execute_crewai_response(
            query=test_query,
            context=test_context,
            child_info=test_child_info,
            manual_agent="child_development"
        )
        
        print(f"   ✓ CrewAI function executed successfully")
        print(f"   Response type: {type(result)}")
        print(f"   Response keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
        
        if isinstance(result, dict) and 'response' in result:
            print(f"   Response preview: {result['response'][:100]}...")
            print(f"   Agent type: {result.get('agent_type', 'Unknown')}")
        else:
            print(f"   ✗ Unexpected result format: {result}")
            return False
            
    except Exception as e:
        print(f"   ✗ CrewAI function failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Step 6: Test embedding generation
    print("\n6. Testing embedding generation...")
    try:
        test_text = "This is a test query for embedding generation"
        embedding = await embeddings.aembed_query(test_text)
        print(f"   ✓ Embedding generated successfully, length: {len(embedding)}")
    except Exception as e:
        print(f"   ✗ Embedding generation failed: {e}")
        return False
    
    print("\n=== ALL TESTS PASSED! ===")
    print("The chat functionality should work correctly.")
    return True

if __name__ == "__main__":
    asyncio.run(debug_chat_functionality()) 