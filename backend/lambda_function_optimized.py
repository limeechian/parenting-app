import os
import json
import sys
import time
from datetime import datetime

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Global variables for lazy loading
_ai_components_loaded = False
_ai_components = {}

def load_ai_components():
    """Lazy load AI components only when needed"""
    global _ai_components_loaded, _ai_components
    
    if not _ai_components_loaded:
        print("Loading AI components...")
        start_time = time.time()
        
        try:
            from langchain_openai import OpenAIEmbeddings
            from crewai import Agent, Crew, Task
            
            _ai_components['embeddings'] = OpenAIEmbeddings()
            _ai_components['Agent'] = Agent
            _ai_components['Crew'] = Crew
            _ai_components['Task'] = Task
            
            _ai_components_loaded = True
            load_time = time.time() - start_time
            print(f"AI components loaded in {load_time:.3f}s")
            
        except Exception as e:
            print(f"Error loading AI components: {e}")
            raise e
    
    return _ai_components

def lambda_handler(event, context):
    """Optimized Lambda handler with lazy loading and minimal FastAPI app"""
    start_time = time.time()
    
    try:
        # Parse the event
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '/test')
        
        # Step 1: Load basic components (fast)
        basic_start = time.time()
        import logging
        from dotenv import load_dotenv
        from fastapi import FastAPI
        from fastapi.middleware.cors import CORSMiddleware
        basic_time = time.time() - basic_start
        
        # Step 2: Load database components (moderate)
        db_start = time.time()
        from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean
        from sqlalchemy.ext.declarative import declarative_base
        from sqlalchemy.orm import sessionmaker
        db_time = time.time() - db_start
        
        # Step 3: Load auth components (fast)
        auth_start = time.time()
        from fastapi_users import FastAPIUsers, BaseUserManager, IntegerIDMixin
        from fastapi_users.authentication import AuthenticationBackend
        from fastapi_users.db import SQLAlchemyUserDatabase
        auth_time = time.time() - auth_start
        
        # Step 4: Create minimal FastAPI app (no AI components yet)
        app_start = time.time()
        app = FastAPI(title="Parenting App Backend", version="1.0.0")
        
        # Add CORS middleware
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Add basic health check endpoint
        @app.get("/health")
        async def health_check():
            return {"status": "healthy", "timestamp": datetime.now().isoformat()}
        
        app_time = time.time() - app_start
        
        # Step 5: Handle different paths
        if path == "/test":
            # Simple test endpoint - no AI components needed
            total_time = time.time() - start_time
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
                },
                'body': json.dumps({
                    'message': 'Optimized backend is working!',
                    'timestamp': datetime.now().isoformat(),
                    'cold_start': True,
                    'ai_components_loaded': _ai_components_loaded,
                    'timing': {
                        'basic_components': f"{basic_time:.3f}s",
                        'database_components': f"{db_time:.3f}s",
                        'auth_components': f"{auth_time:.3f}s",
                        'app_creation': f"{app_time:.3f}s",
                        'total_time': f"{total_time:.3f}s"
                    },
                    'path': path,
                    'method': http_method
                })
            }
        
        elif path == "/health":
            # Health check endpoint - no AI components needed
            total_time = time.time() - start_time
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
                },
                'body': json.dumps({
                    'status': 'healthy',
                    'timestamp': datetime.now().isoformat(),
                    'cold_start': True,
                    'ai_components_loaded': _ai_components_loaded,
                    'timing': {
                        'basic_components': f"{basic_time:.3f}s",
                        'database_components': f"{db_time:.3f}s",
                        'auth_components': f"{auth_time:.3f}s",
                        'app_creation': f"{app_time:.3f}s",
                        'total_time': f"{total_time:.3f}s"
                    },
                    'path': path,
                    'method': http_method
                })
            }
        
        elif path == "/api/chat":
            # Chat endpoint - load AI components on demand
            ai_start = time.time()
            ai_components = load_ai_components()
            ai_time = time.time() - ai_start
            
            total_time = time.time() - start_time
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
                },
                'body': json.dumps({
                    'message': 'Chat endpoint ready with AI components',
                    'timestamp': datetime.now().isoformat(),
                    'ai_components_loaded': _ai_components_loaded,
                    'timing': {
                        'basic_components': f"{basic_time:.3f}s",
                        'database_components': f"{db_time:.3f}s",
                        'auth_components': f"{auth_time:.3f}s",
                        'app_creation': f"{app_time:.3f}s",
                        'ai_components': f"{ai_time:.3f}s",
                        'total_time': f"{total_time:.3f}s"
                    },
                    'path': path,
                    'method': http_method
                })
            }
        
        else:
            # Default response for other paths
            total_time = time.time() - start_time
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
                },
                'body': json.dumps({
                    'error': 'Endpoint not found',
                    'message': f'Path {path} not implemented yet',
                    'timestamp': datetime.now().isoformat(),
                    'timing': {
                        'total_time': f"{total_time:.3f}s"
                    },
                    'path': path,
                    'method': http_method
                })
            }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            'body': json.dumps({
                'error': 'Optimized handler failed',
                'message': str(e),
                'timestamp': datetime.now().isoformat()
            })
        } 