#!/usr/bin/env python3
"""
Simple test script to check backend connectivity
"""

import requests
import json

def test_backend():
    print("🔍 Testing Backend...")
    
    try:
        # Test basic endpoint
        response = requests.get("http://localhost:8000/test")
        print(f"✅ Basic endpoint: {response.status_code} - {response.text}")
    except requests.exceptions.ConnectionError:
        print("❌ Backend server is not running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    try:
        # Test new messages endpoint without auth
        response = requests.get("http://localhost:8000/api/test-messages/1")
        print(f"🔧 Test messages endpoint: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {data}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"❌ Error testing messages: {e}")
    
    try:
        # Test debug endpoint
        response = requests.get("http://localhost:8000/api/conversations/1/messages-debug")
        print(f"🔧 Debug endpoint: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {data}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"❌ Error testing debug: {e}")
    
    return True

if __name__ == "__main__":
    test_backend() 