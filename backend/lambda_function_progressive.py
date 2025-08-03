import os
import json
import sys
import time
from datetime import datetime

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def lambda_handler(event, context):
    """Progressive Lambda handler to identify initialization bottlenecks"""
    start_time = time.time()
    
    try:
        # Parse the event
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '/test')
        
        # Step 1: Basic imports (should be fast)
        step1_start = time.time()
        import logging
        import os
        from dotenv import load_dotenv
        step1_time = time.time() - step1_start
        
        # Step 2: FastAPI and basic web framework imports
        step2_start = time.time()
        from fastapi import FastAPI
        from fastapi.middleware.cors import CORSMiddleware
        step2_time = time.time() - step2_start
        
        # Step 3: Database imports
        step3_start = time.time()
        from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean
        from sqlalchemy.ext.declarative import declarative_base
        from sqlalchemy.orm import sessionmaker
        step3_time = time.time() - step3_start
        
        # Step 4: Authentication imports
        step4_start = time.time()
        from fastapi_users import FastAPIUsers, BaseUserManager, IntegerIDMixin
        #from fastapi_users.authentication import JWTAuthentication
        from fastapi_users.authentication import AuthenticationBackend
        from fastapi_users.db import SQLAlchemyUserDatabase
        step4_time = time.time() - step4_start
        
        # Step 5: AI/ML imports (likely the slowest)
        step5_start = time.time()
        from langchain_openai import OpenAIEmbeddings
        from crewai import Agent, Crew, Task
        step5_time = time.time() - step5_start
        
        total_time = time.time() - start_time
        
        # Return detailed timing information
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            'body': json.dumps({
                'message': 'Progressive import test completed',
                'timestamp': datetime.now().isoformat(),
                'cold_start': True,
                'timing': {
                    'step1_basic_imports': f"{step1_time:.3f}s",
                    'step2_fastapi_imports': f"{step2_time:.3f}s", 
                    'step3_database_imports': f"{step3_time:.3f}s",
                    'step4_auth_imports': f"{step4_time:.3f}s",
                    'step5_ai_imports': f"{step5_time:.3f}s",
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
                'error': 'Import test failed',
                'message': str(e),
                'timestamp': datetime.now().isoformat(),
                'step_failed': 'Unknown'
            })
        } 