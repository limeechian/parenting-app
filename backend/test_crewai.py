import asyncio
import os
from dotenv import load_dotenv
from crewai_agents import execute_crewai_response

# Load environment variables
load_dotenv()

async def test_crewai():
    """Test the CrewAI function"""
    try:
        print("Testing CrewAI function...")
        
        # Test query
        query = "What developmental milestones should my 5-year-old child be reaching?"
        context = "Parent: Mother, Style: Authoritative, Location: Urban"
        child_info = "CHILD PROFILE DETAILS:\nName: Liam\nAge: 5 years old\nGender: Male\nEducation Level: Kindergarten\nDevelopmental Stage: Early Childhood\nSpecial Needs: None\nCharacteristics: Active, curious\nCurrent Challenges: None\nSpecial Notes: None"
        
        print(f"Query: {query}")
        print(f"Context: {context}")
        print(f"Child info: {child_info[:100]}...")
        
        # Call the function
        result = await execute_crewai_response(
            query=query,
            context=context,
            child_info=child_info,
            manual_agent="child_development"
        )
        
        print(f"Result type: {type(result)}")
        print(f"Result keys: {result.keys() if isinstance(result, dict) else 'Not a dict'}")
        print(f"Response: {result.get('response', 'No response')[:200]}...")
        print(f"Agent type: {result.get('agent_type', 'No agent type')}")
        
        print("Test completed successfully!")
        
    except Exception as e:
        print(f"Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_crewai()) 