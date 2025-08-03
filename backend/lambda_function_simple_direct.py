import os
import sys
import json
import time
from datetime import datetime

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def lambda_handler(event, context):
    """Simple direct Lambda handler without Mangum"""
    start_time = time.time()
    
    try:
        print(f"Received event: {json.dumps(event, default=str)}")
        
        # Parse the event
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '/test')
        
        print(f"Processing request: {http_method} {path}")
        
        # Handle different endpoints directly
        if path == "/test":
            response_body = {
                "message": "Simple direct backend is working!",
                "timestamp": datetime.now().isoformat(),
                "status": "healthy",
                "method": http_method,
                "path": path
            }
            status_code = 200
            
        elif path == "/health":
            response_body = {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "method": http_method,
                "path": path
            }
            status_code = 200
            
        elif path == "/api/test-cors":
            response_body = {
                "message": "CORS test successful",
                "timestamp": datetime.now().isoformat(),
                "method": http_method,
                "path": path
            }
            status_code = 200
            
        else:
            response_body = {
                "error": "Endpoint not found",
                "message": f"Path {path} not implemented",
                "timestamp": datetime.now().isoformat(),
                "method": http_method,
                "path": path
            }
            status_code = 404
        
        # Calculate timing
        total_time = time.time() - start_time
        print(f"Request completed in {total_time:.3f}s")
        
        # Return Lambda response
        return {
            'statusCode': status_code,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            'body': json.dumps(response_body)
        }
        
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