import json
import os
import sys
from datetime import datetime
from mangum import Mangum
from main import app

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Create Mangum handler for FastAPI app
handler = Mangum(app, lifespan="off")

def lambda_handler(event, context):
    """Lambda handler for FastAPI application"""
    try:
        # Use Mangum to handle the request
        return handler(event, context)
    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
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