import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_imports():
    """Test if all required imports work"""
    try:
        print("Testing imports...")
        
        # Test basic imports
        from crewai import Agent, Task, Crew
        print("✓ CrewAI imports successful")
        
        from langchain_openai import ChatOpenAI, OpenAIEmbeddings
        print("✓ LangChain OpenAI imports successful")
        
        from sqlalchemy.orm import declarative_base
        print("✓ SQLAlchemy imports successful")
        
        # Test OpenAI API key
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            print("✓ OpenAI API key found")
        else:
            print("✗ OpenAI API key not found")
            
        # Test database URL
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            print("✓ Database URL found")
        else:
            print("✗ Database URL not found")
            
        print("All imports successful!")
        return True
        
    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == "__main__":
    test_imports() 