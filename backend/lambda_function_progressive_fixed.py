import os
import sys
import json
import time
from datetime import datetime

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Global variables for lazy loading
_app_loaded = False
_app = None
_mangum_handler = None

def load_fastapi_app():
    """Lazy load the FastAPI app only when needed"""
    global _app_loaded, _app, _mangum_handler
    
    if not _app_loaded:
        print("Loading FastAPI app...")
        start_time = time.time()
        
        try:
            # Import only what's needed for basic functionality
            from fastapi import FastAPI
            from fastapi.middleware.cors import CORSMiddleware
            from mangum import Mangum
            
            # Create a minimal FastAPI app first
            _app = FastAPI(title="Parenting App Backend", version="1.0.0")
            
            # Add CORS middleware
            _app.add_middleware(
                CORSMiddleware,
                allow_origins=["*"],
                allow_credentials=True,
                allow_methods=["*"],
                allow_headers=["*"],
            )
            
            # Add basic endpoints
            @_app.get("/test")
            async def test_endpoint():
                return {
                    "message": "Progressive backend is working!",
                    "timestamp": datetime.now().isoformat(),
                    "status": "healthy"
                }
            
            @_app.get("/health")
            async def health_check():
                return {
                    "status": "healthy",
                    "timestamp": datetime.now().isoformat()
                }
            
            @_app.get("/api/test-cors")
            async def test_cors():
                return {
                    "message": "CORS test successful",
                    "timestamp": datetime.now().isoformat()
                }
            
            # Create Mangum handler
            _mangum_handler = Mangum(_app, lifespan="off")
            _app_loaded = True
            
            load_time = time.time() - start_time
            print(f"FastAPI app loaded in {load_time:.3f}s")
            
        except Exception as e:
            print(f"Error loading FastAPI app: {e}")
            raise e
    
    return _app, _mangum_handler

def format_event_for_mangum(event):
    """Format the event to be compatible with Mangum"""
    # If it's already a proper API Gateway event, return as is
    if 'requestContext' in event and 'http' in event.get('requestContext', {}):
        return event
    
    # If it's our simplified format, convert to API Gateway format
    http_method = event.get('httpMethod', 'GET')
    path = event.get('path', '/test')
    
    # Create a proper API Gateway v2 event
    api_gateway_event = {
        "version": "2.0",
        "routeKey": f"{http_method} {path}",
        "rawPath": path,
        "rawQueryString": "",
        "headers": {
            "Content-Type": "application/json",
            "User-Agent": "aws-cli/1.0",
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate",
            "Connection": "keep-alive"
        },
        "requestContext": {
            "http": {
                "method": http_method,
                "path": path
            },
            "requestId": "test-request-id",
            "stage": "$default",
            "time": datetime.now().isoformat(),
            "timeEpoch": int(time.time() * 1000),
            "domainName": "test.execute-api.ap-southeast-2.amazonaws.com",
            "domainPrefix": "test",
            "requestTime": datetime.now().isoformat(),
            "requestTimeEpoch": int(time.time() * 1000),
            "identity": {
                "sourceIp": "127.0.0.1",
                "userAgent": "aws-cli/1.0"
            }
        },
        "body": event.get('body', ''),
        "isBase64Encoded": False
    }
    
    return api_gateway_event

def lambda_handler(event, context):
    """Progressive Lambda handler with lazy loading"""
    start_time = time.time()
    
    try:
        print(f"Received event: {json.dumps(event, default=str)}")
        
        # Load FastAPI app on first request
        app, handler = load_fastapi_app()
        
        # Format event for Mangum
        formatted_event = format_event_for_mangum(event)
        print(f"Formatted event: {json.dumps(formatted_event, default=str)}")
        
        # Use Mangum to handle the request
        response = handler(formatted_event, context)
        
        # Add timing information
        total_time = time.time() - start_time
        print(f"Request completed in {total_time:.3f}s")
        
        return response
        
    except Exception as e:
        print(f"Lambda handler error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e),
                'timestamp': datetime.now().isoformat()
            })
        } 