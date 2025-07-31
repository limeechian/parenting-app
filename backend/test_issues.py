import requests
import json

def test_issues():
    print("Testing current issues...")
    
    # Test CORS
    try:
        response = requests.options('http://localhost:8000/api/chat', 
                                  headers={'Origin': 'http://localhost:3000'})
        print(f"✓ CORS preflight: {response.status_code}")
        if response.status_code == 200:
            print("  CORS headers:", dict(response.headers))
        else:
            print("  CORS still failing")
    except Exception as e:
        print(f"✗ CORS test failed: {e}")
    
    # Test conversation data
    try:
        response = requests.get('http://localhost:8000/api/conversations')
        if response.status_code == 401:
            print("✓ Conversations endpoint requires auth (expected)")
        else:
            print(f"Conversations response: {response.status_code}")
            if response.ok:
                data = response.json()
                print(f"Found {len(data)} conversations")
                for conv in data[:3]:  # Show first 3
                    print(f"  Conversation {conv.get('id')}: childId={conv.get('childId')}, type={conv.get('conversationType')}, agents={conv.get('enabledAgents')}")
    except Exception as e:
        print(f"✗ Conversations test failed: {e}")

if __name__ == "__main__":
    test_issues() 