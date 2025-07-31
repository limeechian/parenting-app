import requests
import json

def test_cors():
    print("Testing CORS and backend connectivity...")
    
    # Test basic connectivity
    try:
        response = requests.get('http://localhost:8000/test')
        print(f"✓ Backend is running: {response.status_code}")
        print(f"  Response: {response.json()}")
    except Exception as e:
        print(f"✗ Backend not accessible: {e}")
        return
    
    # Test CORS preflight
    try:
        response = requests.options('http://localhost:8000/api/chat', 
                                  headers={'Origin': 'http://localhost:3000'})
        print(f"✓ CORS preflight: {response.status_code}")
        print(f"  CORS headers: {dict(response.headers)}")
    except Exception as e:
        print(f"✗ CORS preflight failed: {e}")
    
    # Test actual POST request (will fail without auth, but should not be CORS error)
    try:
        response = requests.post('http://localhost:8000/api/chat',
                               headers={
                                   'Content-Type': 'application/json',
                                   'Origin': 'http://localhost:3000'
                               },
                               json={'query': 'test'})
        print(f"✓ POST request: {response.status_code}")
        if response.status_code == 401:
            print("  Expected 401 - authentication required")
        else:
            print(f"  Response: {response.text[:200]}")
    except Exception as e:
        print(f"✗ POST request failed: {e}")

if __name__ == "__main__":
    test_cors() 