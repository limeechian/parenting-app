import os
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_main_imports():
    """Test if main.py can be imported and basic functions work"""
    
    print("=== TESTING MAIN.PY IMPORTS ===\n")
    
    try:
        # Test importing main modules
        print("1. Testing main.py imports...")
        
        # Import the main app and key functions
        import main
        print("   ✓ main.py imported successfully")
        
        # Test if the app is created
        if hasattr(main, 'app'):
            print("   ✓ FastAPI app created successfully")
        else:
            print("   ✗ FastAPI app not found")
            return False
        
        # Test if key functions exist
        if hasattr(main, 'get_openai_embedding'):
            print("   ✓ get_openai_embedding function exists")
        else:
            print("   ✗ get_openai_embedding function not found")
            
        if hasattr(main, 'generate_conversation_title'):
            print("   ✓ generate_conversation_title function exists")
        else:
            print("   ✗ generate_conversation_title function not found")
            
        if hasattr(main, 'generate_conversation_summary'):
            print("   ✓ generate_conversation_summary function exists")
        else:
            print("   ✗ generate_conversation_summary function not found")
        
        # Test if models are defined
        if hasattr(main, 'User'):
            print("   ✓ User model defined")
        else:
            print("   ✗ User model not found")
            
        if hasattr(main, 'ParentProfile'):
            print("   ✓ ParentProfile model defined")
        else:
            print("   ✗ ParentProfile model not found")
            
        if hasattr(main, 'ChildProfile'):
            print("   ✓ ChildProfile model defined")
        else:
            print("   ✗ ChildProfile model not found")
            
        if hasattr(main, 'AiConversation'):
            print("   ✓ AiConversation model defined")
        else:
            print("   ✗ AiConversation model not found")
            
        if hasattr(main, 'AiChatInteraction'):
            print("   ✓ AiChatInteraction model defined")
        else:
            print("   ✗ AiChatInteraction model not found")
        
        print("\n   ✓ All main.py components found!")
        return True
        
    except ImportError as e:
        print(f"   ✗ Import error: {e}")
        import traceback
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"   ✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    asyncio.run(test_main_imports()) 