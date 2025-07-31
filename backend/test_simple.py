import requests
import json

def test_backend():
    try:
        # Test basic connectivity
        response = requests.get('http://localhost:8000/test')
        print(f"Backend test response: {response.status_code}")
        if response.ok:
            print(f"Response: {response.json()}")
        
        # Test conversations endpoint (will fail without auth, but we can see the error)
        response = requests.get('http://localhost:8000/api/conversations')
        print(f"Conversations endpoint response: {response.status_code}")
        if response.status_code == 401:
            print("Expected 401 - authentication required")
        else:
            print(f"Unexpected response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("Backend server is not running on localhost:8000")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_backend() 