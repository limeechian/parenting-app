import requests
import json

def test_chat_request():
    print("Testing chat request simulation...")
    
    # Simulate the request that should be sent from frontend
    # Based on the conversation data you showed, this should be conversation 6
    request_data = {
        "query": "what learning activities can help him with those milestones?",
        "child_id": 2,  # Liam's child_id
        "conversation_id": 6,  # The conversation ID
        "manual_agent": "child-development"  # Should be sent if in manual mode
    }
    
    print(f"Request data: {json.dumps(request_data, indent=2)}")
    
    try:
        response = requests.post(
            'http://localhost:8000/api/chat',
            headers={
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:3000'
            },
            json=request_data
        )
        
        print(f"Response status: {response.status_code}")
        if response.status_code == 401:
            print("Expected 401 - authentication required")
        elif response.ok:
            data = response.json()
            print(f"Response data: {json.dumps(data, indent=2)}")
        else:
            print(f"Error response: {response.text}")
            
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_chat_request() 