import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_crewai_simple():
    """Simple test of CrewAI Task creation"""
    try:
        print("Testing CrewAI Task creation...")
        
        from crewai import Task
        from langchain_openai import ChatOpenAI
        
        # Test creating a simple task
        llm = ChatOpenAI(model="gpt-4", temperature=0.7)
        
        task = Task(
            description="Answer this question: What are good activities for a 5-year-old?",
            expected_output="A detailed response with specific activities for a 5-year-old child."
        )
        
        print("✓ Task created successfully")
        print(f"Task description: {task.description}")
        print(f"Expected output: {task.expected_output}")
        
        return True
        
    except Exception as e:
        print(f"✗ Task creation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    asyncio.run(test_crewai_simple()) 