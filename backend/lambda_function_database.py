import os
import sys
import json
import time
import asyncio
from datetime import datetime, date
from typing import Optional, Dict, Any, List

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Database imports
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime, JSON, Boolean, select, text, or_, Text, Date
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.exc import IntegrityError
from sqlalchemy.dialects.postgresql import ARRAY

# Pydantic models
from pydantic import BaseModel, EmailStr

# Environment variables
DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Database setup
if DATABASE_URL is None:
    raise ValueError("DATABASE_URL environment variable is not set")

ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(bind=async_engine, expire_on_commit=False, class_=AsyncSession)

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

class AiConversation(Base):
    __tablename__ = "ai_conversations"
    conversation_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    child_id = Column(Integer, ForeignKey("children_profile.child_id"), nullable=True)
    title = Column(String(255), nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    ended_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), onupdate=datetime.utcnow)
    conversation_type = Column(String(50), default="general")
    primary_agent_type = Column(String(100), nullable=True)
    enabled_agents = Column(JSON, default=[])
    participating_agents = Column(JSON, default=[])
    from sqlalchemy import Float
    summary_embedding = Column(ARRAY(Float), nullable=True)

class AiChatInteraction(Base):
    __tablename__ = "ai_chat_interactions"
    chat_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    child_id = Column(Integer, ForeignKey("children_profile.child_id"), nullable=True)
    query = Column(String, nullable=False)
    response = Column(String, nullable=False)
    agent_type = Column(String(100))
    generated_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    retrieved_memories_pgvector = Column(String, nullable=True)
    conversation_id = Column(Integer, ForeignKey("ai_conversations.conversation_id"), nullable=True)
    from sqlalchemy import Float
    embedding = Column(ARRAY(Float), nullable=True)

# Pydantic models (from main.py)
class ParentProfileIn(BaseModel):
    full_name: Optional[str] = ""
    gender: Optional[str] = ""
    age: Optional[int] = 0
    phone_number: Optional[str] = ""
    education_level: Optional[str] = ""
    relationship_with_child: Optional[str] = ""
    relationship_status: Optional[str] = ""
    birthdate: Optional[str] = ""
    location: Optional[str] = ""
    occupation: Optional[str] = ""
    parenting_style: Optional[str] = ""

class ChildProfileIn(BaseModel):
    name: str
    gender: str
    age: int
    birthdate: str
    education_level: str = ""
    developmental_stage: str
    special_needs: list[str] = []
    characteristics: list[str] = []
    current_challenges: list[str] = []
    special_notes: str = ""

class ChatInput(BaseModel):
    query: str
    child_id: Optional[int] = None
    conversation_id: Optional[int] = None
    manual_agent: Optional[str] = None

# Database session dependency
async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        return session

# Simple authentication (for testing - in production use proper JWT)
async def get_current_user(user_id: int, db: AsyncSession) -> Optional[User]:
    """Simple user lookup for testing"""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

# OpenAI embedding function (from main.py)
async def get_openai_embedding(text: str) -> list[float]:
    try:
        import openai
        response = openai.embeddings.create(
            input=text,
            model="text-embedding-3-small"
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return [0.0] * 1536  # Fallback

# CrewAI functions (from crewai_agents.py)
async def execute_crewai_response(query: str, context: str, child_info: str = "", manual_agent: str = None) -> Dict[str, Any]:
    """Execute CrewAI response with automatic or manual agent selection"""
    try:
        from crewai import Agent, Task, Crew
        from langchain_openai import ChatOpenAI
        
        llm = ChatOpenAI(model="gpt-4", temperature=0.7)
        
        # Simple agent selection (from crewai_agents.py)
        def determine_primary_agent(query: str, context: str) -> str:
            query_lower = query.lower()
            
            crisis_keywords = ['emergency', 'crisis', 'dangerous', 'aggressive', 'violent', 'self-harm']
            if any(keyword in query_lower for keyword in crisis_keywords):
                return "crisis_intervention"
            
            development_keywords = ['milestone', 'development', 'learning', 'growth', 'age appropriate']
            if any(keyword in query_lower for keyword in development_keywords):
                return "child_development"
            
            community_keywords = ['resource', 'community', 'group', 'therapy', 'counselor']
            if any(keyword in query_lower for keyword in community_keywords):
                return "community_connector"
            
            return "parenting_style"
        
        # Determine agent
        if manual_agent and manual_agent in ["parenting_style", "child_development", "crisis_intervention", "community_connector"]:
            primary_agent = manual_agent
        else:
            primary_agent = determine_primary_agent(query, context)
        
        # Create simple agent
        agent = Agent(
            role=f"{primary_agent.replace('_', ' ').title()}",
            goal=f"Provide expert advice on {primary_agent.replace('_', ' ')}",
            backstory=f"You are an expert in {primary_agent.replace('_', ' ')} with years of experience.",
            verbose=True,
            allow_delegation=False,
            llm=llm
        )
        
        # Create task
        task = Task(
            description=f"Answer this parenting question: {query}\n\nContext: {context}\n\nChild Info: {child_info}",
            agent=agent,
            expected_output="A detailed, helpful response with practical advice."
        )
        
        # Execute
        crew = Crew(agents=[agent], tasks=[task], verbose=True)
        result = crew.kickoff()
        
        response_text = result.raw if hasattr(result, 'raw') else str(result)
        
        return {
            "response": response_text,
            "agent_type": agent.role,
            "agent_id": primary_agent
        }
    except Exception as e:
        print(f"Error in execute_crewai_response: {e}")
        return {
            "response": f"I apologize, but I encountered an error. Please try again. Error: {str(e)}",
            "agent_type": "AI Assistant",
            "agent_id": "general"
        }

def lambda_handler(event, context):
    """Database-enabled Lambda handler"""
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
                "message": "Database-enabled backend is working!",
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
                
                # Run async function
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                async def handle_chat():
                    async with AsyncSessionLocal() as db:
                        # Get user
                        user = await get_current_user(user_id, db)
                        if not user:
                            return {"error": "User not found"}, 404
                        
                        # Parse chat input
                        chat_input = ChatInput(**body_data)
                        
                        # Simple response for now
                        response = await execute_crewai_response(
                            query=chat_input.query,
                            context="Parent seeking advice",
                            child_info="",
                            manual_agent=chat_input.manual_agent
                        )
                        
                        return {
                            "response": response["response"],
                            "agent_type": response["agent_type"],
                            "conversation_id": chat_input.conversation_id or 1,
                            "child_id": chat_input.child_id
                        }, 200
                
                result, status_code = loop.run_until_complete(handle_chat())
                loop.close()
                
                response_body = result
                
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
                
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                async def get_profile():
                    async with AsyncSessionLocal() as db:
                        result = await db.execute(select(ParentProfile).where(ParentProfile.id == user_id))
                        profile = result.scalar_one_or_none()
                        if not profile:
                            return {"error": "Profile not found"}, 404
                        return profile.__dict__, 200
                
                result, status_code = loop.run_until_complete(get_profile())
                loop.close()
                
                response_body = result
                
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
                
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                async def get_children():
                    async with AsyncSessionLocal() as db:
                        result = await db.execute(select(ChildProfile).where(ChildProfile.parent_id == user_id))
                        children = result.scalars().all()
                        
                        # Serialize children
                        serialized = []
                        for child in children:
                            d = child.__dict__.copy()
                            if isinstance(d.get("birthdate"), date):
                                d["birthdate"] = d["birthdate"].isoformat()
                            d["id"] = d.get("child_id")
                            serialized.append(d)
                        
                        return serialized, 200
                
                result, status_code = loop.run_until_complete(get_children())
                loop.close()
                
                response_body = result
                
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