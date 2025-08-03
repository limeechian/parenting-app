import os
import json
import time
from datetime import datetime

def lambda_handler(event, context):
    """Minimal Lambda handler for testing"""
    start_time = time.time()
    
    try:
        print(f"Received event: {json.dumps(event, default=str)}")
        
        # Parse the event
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '/test')
        body = event.get('body', '{}')
        
        # Parse body if it's a string
        if isinstance(body, str):
            try:
                body_data = json.loads(body)
            except:
                body_data = {}
        else:
            body_data = body
        
        print(f"Processing request: {http_method} {path}")
        
        # Handle different endpoints
        if path == "/test":
            # Get database URL without importing asyncpg
            database_url = os.getenv("DATABASE_URL")
            database_url_clean = None
            if database_url:
                # Remove asyncpg reference to avoid import issues
                database_url_clean = database_url.replace("postgresql+asyncpg://", "postgresql://")
            
            response_body = {
                "message": "Minimal backend is working!",
                "timestamp": datetime.now().isoformat(),
                "status": "healthy",
                "method": http_method,
                "path": path,
                "database_url_set": database_url is not None,
                "database_url_clean": database_url_clean,
                "openai_key_set": os.getenv("OPENAI_API_KEY") is not None
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
            
        elif path == "/api/chat" and http_method == "POST":
            # Simple chat response without database
            try:
                query = body_data.get('query', '')
                manual_agent = body_data.get('manual_agent', 'general')
                
                response_body = {
                    "response": f"This is a test response for: {query} (Agent: {manual_agent})",
                    "agent_type": manual_agent.replace("_", " ").title(),
                    "conversation_id": body_data.get('conversation_id', 1),
                    "child_id": body_data.get('child_id'),
                    "note": "This is a minimal version without database or AI"
                }
                status_code = 200
                
            except Exception as e:
                response_body = {
                    "error": "Chat processing failed",
                    "message": str(e),
                    "timestamp": datetime.now().isoformat()
                }
                status_code = 500
                
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