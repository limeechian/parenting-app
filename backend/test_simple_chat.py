import requests
import json

def test_simple_chat():
    print("Testing simple chat request...")
    
    # Test with a simple request
    request_data = {
        "query": "Hello, this is a test message",
        "child_id": None,
        "conversation_id": None,
        "manual_agent": None
    }
    
    print(f"Request data: {json.dumps(request_data, indent=2)}")
    
    try:
        response = requests.post(
            'http://localhost:8000/api/chat',
            headers={
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:3000'
            },
            json=request_data,
            timeout=30  # 30 second timeout
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 401:
            print("Expected 401 - authentication required")
        elif response.ok:
            data = response.json()
            print(f"Response data: {json.dumps(data, indent=2)}")
        else:
            print(f"Error response: {response.text}")
            
    except requests.exceptions.Timeout:
        print("Request timed out - backend might be hanging")
    except requests.exceptions.ConnectionError as e:
        print(f"Connection error: {e}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_simple_chat() 