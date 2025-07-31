#!/usr/bin/env python3
"""
Debug script to test backend connectivity and CORS issues
"""

import requests
import json

def test_backend_connectivity():
    """Test if backend is accessible"""
    print("🔍 Testing Backend Connectivity...")
    
    try:
        # Test basic endpoint
        response = requests.get("http://localhost:8000/test")
        print(f"✅ Basic endpoint: {response.status_code} - {response.text}")
    except requests.exceptions.ConnectionError:
        print("❌ Backend server is not running on http://localhost:8000")
        print("   Please start the backend server first:")
        print("   cd backend && python main.py")
        return False
    except Exception as e:
        print(f"❌ Error connecting to backend: {e}")
        return False
    
    try:
        # Test CORS endpoint
        response = requests.get("http://localhost:8000/api/test-cors")
        print(f"✅ CORS test endpoint: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error testing CORS endpoint: {e}")
        return False
    
    return True

def test_conversations_endpoint():
    """Test conversations endpoint"""
    print("\n🔍 Testing Conversations Endpoint...")
    
    try:
        # Test conversations list (this should work without auth)
        response = requests.get("http://localhost:8000/api/conversations")
        print(f"📊 Conversations endpoint: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Found {len(data)} conversations")
            for conv in data[:3]:  # Show first 3
                print(f"   - ID: {conv.get('id')}, Title: {conv.get('title')}")
        elif response.status_code == 401:
            print("   ⚠️  Authentication required (this is expected)")
        else:
            print(f"   ❌ Unexpected status: {response.text}")
    except Exception as e:
        print(f"❌ Error testing conversations endpoint: {e}")

def test_messages_endpoint():
    """Test messages endpoint"""
    print("\n🔍 Testing Messages Endpoint...")
    
    try:
        # Test messages endpoint (this requires auth)
        response = requests.get("http://localhost:8000/api/conversations/1/messages")
        print(f"📝 Messages endpoint: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Found {len(data)} messages")
        elif response.status_code == 401:
            print("   ⚠️  Authentication required (this is expected)")
        elif response.status_code == 404:
            print("   ⚠️  Conversation not found (this might be expected)")
        else:
            print(f"   ❌ Unexpected status: {response.text}")
    except Exception as e:
        print(f"❌ Error testing messages endpoint: {e}")
    
    try:
        # Test debug endpoint
        response = requests.get("http://localhost:8000/api/conversations/1/messages-debug")
        print(f"🔧 Messages debug endpoint: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Debug response: {data}")
        else:
            print(f"   ❌ Debug endpoint failed: {response.text}")
    except Exception as e:
        print(f"❌ Error testing debug endpoint: {e}")
    
    try:
        # Test messages without auth
        response = requests.get("http://localhost:8000/api/test-messages/1")
        print(f"🔧 Test messages endpoint: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Test response: {data}")
        else:
            print(f"   ❌ Test messages failed: {response.text}")
    except Exception as e:
        print(f"❌ Error testing messages endpoint: {e}")

def test_cors_headers():
    """Test CORS headers"""
    print("\n🔍 Testing CORS Headers...")
    
    try:
        # Test with OPTIONS request (preflight)
        response = requests.options("http://localhost:8000/api/conversations/1/messages")
        print(f"📋 OPTIONS request: {response.status_code}")
        
        # Check CORS headers
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
            'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials')
        }
        
        print("   CORS Headers:")
        for header, value in cors_headers.items():
            status = "✅" if value else "❌"
            print(f"   {status} {header}: {value}")
            
    except Exception as e:
        print(f"❌ Error testing CORS headers: {e}")

def test_with_cookies():
    """Test with cookies from browser"""
    print("\n🔍 Testing with Browser Cookies...")
    
    # This is the cookie from your browser
    cookies = {
        "fastapi-users-auth-jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwiYXVkIjpbImZhc3RhcGktdXNlcnM6YXV0aCJdLCJleHAiOjE3NTMzNzkxNjV9.4LOVVmvXRosnNLfyf-Ei8Egp4ZKZlLeVMGPWUDygpT4"
    }
    
    try:
        # Test conversations with cookies
        response = requests.get("http://localhost:8000/api/conversations", cookies=cookies)
        print(f"📊 Conversations with cookies: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Found {len(data)} conversations")
        else:
            print(f"   ❌ Failed: {response.text}")
    except Exception as e:
        print(f"❌ Error testing with cookies: {e}")
    
    try:
        # Test messages with cookies
        response = requests.get("http://localhost:8000/api/conversations/1/messages", cookies=cookies)
        print(f"📝 Messages with cookies: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Found {len(data)} messages")
        else:
            print(f"   ❌ Failed: {response.text}")
    except Exception as e:
        print(f"❌ Error testing messages with cookies: {e}")

if __name__ == "__main__":
    print("🚀 Backend CORS Debug Script")
    print("=" * 50)
    
    # Test basic connectivity
    if test_backend_connectivity():
        # Test endpoints
        test_conversations_endpoint()
        test_messages_endpoint()
        test_cors_headers()
        test_with_cookies()
    
    print("\n" + "=" * 50)
    print("📋 Summary:")
    print("1. If backend connectivity fails: Start the backend server")
    print("2. If CORS headers are missing: Check CORS middleware configuration")
    print("3. If authentication fails: Check login status and cookies")
    print("4. If conversations work but messages don't: Authentication issue") 