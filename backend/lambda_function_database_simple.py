import os
import sys
import json
import time
from datetime import datetime, date
from typing import Optional, Dict, Any, List

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Database imports - using psycopg2 instead of asyncpg for Lambda compatibility
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime, JSON, Boolean, select, text, or_, Text, Date
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy.dialects.postgresql import ARRAY

# Environment variables
DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Database setup - using synchronous engine for Lambda compatibility
if DATABASE_URL is None:
    raise ValueError("DATABASE_URL environment variable is not set")

# Convert async URL to sync URL for Lambda compatibility
SYNC_DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
engine = create_engine(SYNC_DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

Base = declarative_base()

# Database Models (from main.py)
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String)
    role = Column(String(50), nullable=False)
    google_id = Column(String(255), unique=True, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

class ParentProfile(Base):
    __tablename__ = "parent_users_profile"
    id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    full_name = Column(String(100))
    gender = Column(String(10))
    age = Column(Integer)
    phone_number = Column(String(50))
    education_level = Column(String(50))
    relationship_with_child = Column(String(50))
    relationship_status = Column(String(20))
    birthdate = Column(Date)
    location = Column(String(255))
    occupation = Column(String(100))
    parenting_style = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default="now()")
    updated_at = Column(DateTime(timezone=True), server_default="now()")
    updated_by = Column(Integer, nullable=True)

class ChildProfile(Base):
    __tablename__ = "children_profile"
    child_id = Column(Integer, primary_key=True)
    parent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100))
    gender = Column(String(10))
    age = Column(Integer)
    birthdate = Column(Date)
    education_level = Column(String(50))
    developmental_stage = Column(String(50))
    special_needs = Column(ARRAY(String), default=[])
    characteristics = Column(ARRAY(String), default=[])
    current_challenges = Column(ARRAY(String), default=[])
    special_notes = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

# Database session dependency - synchronous for Lambda
def get_session() -> Session:
    return SessionLocal()

# Simple authentication (for testing - in production use proper JWT)
def get_current_user(user_id: int, db: Session) -> Optional[User]:
    """Simple user lookup for testing"""
    return db.query(User).filter(User.id == user_id).first()

# Simple AI response function (without complex dependencies)
def get_simple_ai_response(query: str, agent_type: str = "general") -> Dict[str, Any]:
    """Simple AI response without complex dependencies"""
    try:
        import openai
        
        # Simple prompt based on agent type
        prompts = {
            "parenting_style": "You are a parenting style analyst. Provide advice on: ",
            "child_development": "You are a child development advisor. Provide guidance on: ",
            "crisis_intervention": "You are a crisis intervention specialist. Provide immediate help for: ",
            "community_connector": "You are a community connector. Suggest resources for: ",
            "general": "You are a parenting expert. Provide helpful advice on: "
        }
        
        prompt = prompts.get(agent_type, prompts["general"]) + query
        
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful parenting assistant. Provide practical, actionable advice."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        return {
            "response": response.choices[0].message.content,
            "agent_type": agent_type.replace("_", " ").title(),
            "agent_id": agent_type
        }
    except Exception as e:
        print(f"Error in get_simple_ai_response: {e}")
        return {
            "response": f"I apologize, but I encountered an error. Please try again. Error: {str(e)}",
            "agent_type": "AI Assistant",
            "agent_id": "general"
        }

def lambda_handler(event, context):
    """Simple database-enabled Lambda handler without async dependencies"""
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
            response_body = {
                "message": "Simple database-enabled backend is working!",
                "timestamp": datetime.now().isoformat(),
                "status": "healthy",
                "method": http_method,
                "path": path,
                "database_connected": DATABASE_URL is not None
            }
            status_code = 200
            
        elif path == "/health":
            response_body = {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "method": http_method,
                "path": path,
                "database_connected": DATABASE_URL is not None
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
            # Handle chat endpoint
            try:
                # For testing, use a default user ID
                user_id = body_data.get('user_id', 1)  # Default to user ID 1 for testing
                query = body_data.get('query', '')
                manual_agent = body_data.get('manual_agent', 'general')
                
                # Use synchronous database session
                db = get_session()
                try:
                    # Get user
                    user = get_current_user(user_id, db)
                    if not user:
                        response_body = {"error": "User not found"}
                        status_code = 404
                    else:
                        # Simple response
                        response = get_simple_ai_response(
                            query=query,
                            agent_type=manual_agent
                        )
                        
                        response_body = {
                            "response": response["response"],
                            "agent_type": response["agent_type"],
                            "conversation_id": body_data.get('conversation_id', 1),
                            "child_id": body_data.get('child_id')
                        }
                        status_code = 200
                finally:
                    db.close()
                
            except Exception as e:
                response_body = {
                    "error": "Chat processing failed",
                    "message": str(e),
                    "timestamp": datetime.now().isoformat()
                }
                status_code = 500
                
        elif path == "/profile/parent" and http_method == "GET":
            # Get parent profile
            try:
                user_id = body_data.get('user_id', 1)  # Default for testing
                
                db = get_session()
                try:
                    profile = db.query(ParentProfile).filter(ParentProfile.id == user_id).first()
                    if not profile:
                        response_body = {"error": "Profile not found"}
                        status_code = 404
                    else:
                        # Convert to dict and handle date serialization
                        profile_dict = {}
                        for key, value in profile.__dict__.items():
                            if key.startswith('_'):
                                continue
                            if isinstance(value, date):
                                profile_dict[key] = value.isoformat()
                            else:
                                profile_dict[key] = value
                        response_body = profile_dict
                        status_code = 200
                finally:
                    db.close()
                
            except Exception as e:
                response_body = {
                    "error": "Failed to get profile",
                    "message": str(e),
                    "timestamp": datetime.now().isoformat()
                }
                status_code = 500
                
        elif path == "/profile/children" and http_method == "GET":
            # Get children profiles
            try:
                user_id = body_data.get('user_id', 1)  # Default for testing
                
                db = get_session()
                try:
                    children = db.query(ChildProfile).filter(ChildProfile.parent_id == user_id).all()
                    
                    # Serialize children
                    serialized = []
                    for child in children:
                        d = {}
                        for key, value in child.__dict__.items():
                            if key.startswith('_'):
                                continue
                            if isinstance(value, date):
                                d[key] = value.isoformat()
                            else:
                                d[key] = value
                        d["id"] = d.get("child_id")
                        serialized.append(d)
                    
                    response_body = serialized
                    status_code = 200
                finally:
                    db.close()
                
            except Exception as e:
                response_body = {
                    "error": "Failed to get children",
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