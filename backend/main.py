from fastapi import FastAPI, HTTPException, Depends, Request, Response, Body, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi_users import FastAPIUsers, BaseUserManager, IntegerIDMixin
from fastapi_users.authentication import CookieTransport, AuthenticationBackend, JWTStrategy
from fastapi_users.password import PasswordHelper

# Using older version of fastapi-users to avoid Argon2 dependency issues
from fastapi_users.db import SQLAlchemyUserDatabase, SQLAlchemyBaseUserTable
from fastapi.responses import Response
from fastapi_users.schemas import BaseUser, BaseUserCreate as FastAPIBaseUserCreate
from fastapi_users.router import ErrorCode
from fastapi_users.authentication.strategy.base import Strategy
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from fastapi import FastAPI, Depends, Query
from fastapi import Body

from pydantic import BaseModel, EmailStr, SecretStr

from sqlalchemy.exc import IntegrityError
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime, JSON, Boolean, select, text, or_, Text
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select, text
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy import Date

from sqlalchemy.dialects.postgresql import ARRAY


from langchain_openai import OpenAI
from langchain.prompts import PromptTemplate    
from langchain.agents import AgentExecutor
from langchain.agents import create_openai_tools_agent
from langchain.memory import ConversationBufferMemory
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains import LLMChain, ConversationChain
from langchain_core.runnables import RunnableConfig
#from langchain.embeddings import OpenAIEmbeddings
#from langchain.vectorstores import FAISS
from langchain.schema import Document
from langchain_openai import OpenAIEmbeddings
# Removed FAISS import since we're using pgvector instead

from crewai import Agent, Crew, Task
from crewai_agents import execute_crewai_response, determine_primary_agent

from datetime import datetime, date

from dotenv import load_dotenv

from typing import Optional, AsyncGenerator, cast, Literal

from google.oauth2 import id_token
from google.auth.transport import requests as grequests

import types
import inspect
import random
import string
import os
import requests
import logging
import json
import jwt
import base64
import requests
import inspect
import openai
# import faiss  # Removed since we're using pgvector
import numpy as np
from passlib.context import CryptContext
import re



pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter()


# -------------------- Google Setup --------------------
# Verify Firebase ID token
print(requests.get("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com").json())

'''
My son does not want to eat vegetables, how to solve this?
He also dislikes green things on his plate. Any advice
What if he spits them out every time we try?
'''

# -------------------- Setup --------------------
# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()  # This loads the .env file
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")  # This is the secret key for the JWT token
FIREBASE_CLIENT_ID = os.getenv("FIREBASE_CLIENT_ID")
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
EMBEDDINGS_MODEL = OpenAIEmbeddings()
# FAISS_INDEX_PATH = "faiss_index"  # Removed since we're using pgvector


# Helper to verify Firebase ID token
logger.info(f"FIREBASE_PROJECT_ID at startup: {FIREBASE_PROJECT_ID}")

def verify_firebase_token(token: str):
    try:
        # DEBUG: Print the decoded token payload without verifying signature
        decoded = jwt.decode(token, options={"verify_signature": False})
        #logger.info(f"Decoded JWT payload (no verify): {json.dumps(decoded, indent=2)}")
        return decoded  # <-- Return decoded payload without verification (INSECURE)
    except Exception as e:
        logger.error(f"Token decode failed: {e}")
        return None

'''
def verify_firebase_token(token: str):
    try:
        # DEBUG: Print the decoded token payload without verifying signature
        try:
            decoded = jwt.decode(token, options={"verify_signature": False})
            logger.info(f"Decoded JWT payload (no verify): {json.dumps(decoded, indent=2)}")
            
            # Print JWT header
            header_b64 = token.split('.')[0]
            padded = header_b64 + '=' * (-len(header_b64) % 4)
            header_json = base64.urlsafe_b64decode(padded.encode()).decode()
            logger.info(f"JWT header: {header_json}")

        except Exception as e:
            logger.error(f"PyJWT decode failed: {e}")

        # DEBUG: Try to fetch Google's public keys
        try:
            resp = requests.get("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com")
            logger.info(f"Google public keys fetch status: {resp.status_code}")
            logger.info(f"Google public keys: {resp.text[:200]}...")  # Print first 200 chars
        except Exception as e:
            logger.error(f"Failed to fetch Google public keys: {e}")

        idinfo = id_token.verify_oauth2_token(token, grequests.Request(), audience=FIREBASE_PROJECT_ID)
        return idinfo
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        return None
'''

# -------------------- OpenAI Setup --------------------
# Get embedding from OpenAI
# Generate Embeddings When Storing Interactions
# Note: We use pgvector for vector search instead of FAISS

# -------------------- FastAPI App --------------------
# FastAPI app
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://localhost:8080",  # Local test server
        "https://master.dcmcchu8q16tm.amplifyapp.com",  # Production frontend
        "https://dcmcchu8q16tm.amplifyapp.com",  # Alternative frontend URL
        "https://parenzing.com",  # Custom domain
        "http://parenzing.com",  # Custom domain (HTTP)
        "http://parenting-app-alb-1579687963.ap-southeast-2.elb.amazonaws.com",  # Backend domain (HTTP)
        "https://parenting-app-alb-1579687963.ap-southeast-2.elb.amazonaws.com"  # Backend domain (HTTPS)
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept", "Accept-Language", "Accept-Encoding", "Referer", "Origin"],
    expose_headers=["*"]
)

# Add explicit OPTIONS handler for all routes
@app.options("/{full_path:path}")
async def options_handler(request: Request):
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Accept-Language, Accept-Encoding, Referer, Origin",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "86400"
        }
    )

@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"Request: {request.method} {request.url}")
    print(f"Headers: {dict(request.headers)}")
    print(f"Cookies: {request.cookies}")
    print(f"Query params: {dict(request.query_params)}")
    
    response = await call_next(request)
    
    print(f"Response status: {response.status_code}")
    print(f"Response headers: {dict(response.headers)}")
    
    return response

@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    # Handle preflight requests
    if request.method == "OPTIONS":
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Accept-Language, Accept-Encoding, Referer, Origin",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Max-Age": "86400"
            }
        )
    
    response = await call_next(request)
    
    # Add CORS headers to all responses
    origin = request.headers.get("origin")
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:8080", 
        "https://master.dcmcchu8q16tm.amplifyapp.com",
        "https://dcmcchu8q16tm.amplifyapp.com",
        "https://parenzing.com",
        "http://parenzing.com"
    ]
    
    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        response.headers["Access-Control-Allow-Origin"] = "https://master.dcmcchu8q16tm.amplifyapp.com"
    
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept, Accept-Language, Accept-Encoding, Referer, Origin"
    response.headers["Access-Control-Expose-Headers"] = "*"
    
    return response



# -------------------- Database Setup --------------------
# Use async engine/session for FastAPI Users
if DATABASE_URL is None:
    raise ValueError("DATABASE_URL environment variable is not set")
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=True)
AsyncSessionLocal = async_sessionmaker(bind=async_engine, expire_on_commit=False, class_=AsyncSession)

Base = declarative_base()

# User model for FastAPI Users
class User(Base, SQLAlchemyBaseUserTable[int]):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String)
    role = Column(String(50), nullable=False)
    google_id = Column(String(255), unique=True, nullable=True)

# Parent profile model (already correct)
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

# Child profile model (updated to match DB schema)
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
    birthdate: str  # Expecting 'YYYY-MM-DD' from frontend
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
    manual_agent: Optional[str] = None  # For manual agent selection

async def get_openai_embedding(text: str) -> list[float]:
    response = openai.embeddings.create(
        input=text,
        model="text-embedding-3-small"  # or "text-embedding-ada-002"
    )
    return response.data[0].embedding

# Note: For even more efficient summary updates, consider implementing a database trigger:
# 
# CREATE OR REPLACE FUNCTION update_conversation_summary()
# RETURNS TRIGGER AS $$
# BEGIN
#     -- This would automatically call the summary generation function
#     -- whenever a new ai_chat_interaction is inserted
#     -- However, this requires the function to be available in the database
#     -- and might be complex to implement with AI calls
#     RETURN NEW;
# END;
# $$ LANGUAGE plpgsql;
# 
# CREATE TRIGGER trigger_update_summary
#     AFTER INSERT ON ai_chat_interactions
#     FOR EACH ROW
#     EXECUTE FUNCTION update_conversation_summary();
# 
# For now, we're using the application-level approach which is simpler
# and gives us more control over the AI generation process.

async def generate_conversation_title(query: str, child_name: str = None) -> str:
    """Generate a descriptive title for the conversation using AI"""
    try:
        llm = ChatOpenAI(model="gpt-4", temperature=0.7)
        prompt = f"""
        Generate a concise, descriptive title (max 50 characters) for a parenting conversation.
        
        User's question: {query}
        Child's name: {child_name if child_name else 'General'}
        
        The title should be:
        - Descriptive of the main topic
        - Under 50 characters
        - Professional but friendly
        - Include child's name if provided
        
        Examples:
        - "Liam's Bedtime Struggles"
        - "Managing Tantrums"
        - "General Parenting Tips"
        
        Title:"""
        
        response = await llm.ainvoke(prompt)
        title = response.content.strip().strip('"').strip("'")
        return title[:50]  # Ensure max length
    except Exception as e:
        print(f"Error generating title: {e}")
        # Fallback to simple truncation
        return query[:50] + "..." if len(query) > 50 else query

async def generate_conversation_summary(conversation_id: int, db: AsyncSession) -> str:
    """Generate a summary of the conversation using AI"""
    try:
        # Get all messages for this conversation
        messages_sql = text('''
            SELECT query, response, agent_type, generated_at
            FROM ai_chat_interactions
            WHERE conversation_id = :conversation_id
            ORDER BY generated_at
        ''')
        
        result = await db.execute(messages_sql, {"conversation_id": conversation_id})
        messages = result.fetchall()
        
        if not messages:
            return "No messages in conversation"
        
        # For very short conversations (1-2 messages), create a simple summary
        if len(messages) <= 2:
            conversation_text = ""
            for i, msg in enumerate(messages, 1):
                conversation_text += f"Message {i}:\n"
                conversation_text += f"User: {msg.query}\n"
                conversation_text += f"AI ({msg.agent_type}): {msg.response}\n\n"
            
            llm = ChatOpenAI(model="gpt-4", temperature=0.7)
            prompt = f"""
            Generate a brief summary (max 100 words) of this short parenting conversation.
            
            Conversation:
            {conversation_text}
            
            The summary should:
            - Briefly describe the main topic
            - Mention the agent involved
            - Be concise and clear
            
            Summary:"""
            
            response = await llm.ainvoke(prompt)
            summary = response.content.strip()
            return summary[:200]  # Shorter for brief conversations
        
        # For longer conversations, create comprehensive summary
        conversation_text = ""
        for i, msg in enumerate(messages, 1):
            conversation_text += f"Message {i}:\n"
            conversation_text += f"User: {msg.query}\n"
            conversation_text += f"AI ({msg.agent_type}): {msg.response}\n\n"
        
        llm = ChatOpenAI(model="gpt-4", temperature=0.7)
        prompt = f"""
        Generate a comprehensive summary (max 200 words) of this parenting conversation.
        
        Conversation:
        {conversation_text}
        
        The summary should:
        - Highlight the main topics discussed
        - Mention which agents were involved
        - Include key insights and recommendations
        - Be professional and informative
        - Be under 200 words
        
        Summary:"""
        
        response = await llm.ainvoke(prompt)
        summary = response.content.strip()
        return summary[:500]  # Ensure reasonable length
    except Exception as e:
        print(f"Error generating summary: {e}")
        return "Summary generation failed"




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
    
    # Use ARRAY(Float) instead of VECTOR to avoid type issues
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
    
    # Exclude embedding column to avoid vector type issues
    # embedding = Column(ARRAY(Float), nullable=True)

# Ensure get_user_manager and auth_backend are defined before FastAPI Users setup

async def get_user_db() -> AsyncGenerator[SQLAlchemyUserDatabase, None]:
    async with AsyncSessionLocal() as session:
        yield SQLAlchemyUserDatabase(session, User)

async def get_user_db_for_strategy() -> SQLAlchemyUserDatabase:
    async with AsyncSessionLocal() as session:
        return SQLAlchemyUserDatabase(session, User)

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    yield UserManager(user_db)

cookie_transport = CookieTransport(cookie_max_age=3600, cookie_name="fastapi-users-auth-jwt")

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=SecretStr(SECRET_KEY or ""), lifetime_seconds=3600)

auth_backend = AuthenticationBackend(
    name="jwt",
    transport=cookie_transport,
    get_strategy=get_jwt_strategy,
)

# FastAPI Users setup (no custom /auth/register needed)
fastapi_users = FastAPIUsers[User, int](get_user_manager, [auth_backend])
current_active_user = fastapi_users.current_user(active=True)

# Pydantic schemas for FastAPI Users
from fastapi_users import schemas as fausers_schemas

class UserRead(fausers_schemas.BaseUser[int]):
    username: str
    role: str
    google_id: Optional[str] = None
    #google_id: str | None = None

class UserCreate(fausers_schemas.BaseUserCreate):
    username: str
    role: str
    google_id: Optional[str] = None
    #google_id: str | None = None

class UserUpdate(fausers_schemas.BaseUserUpdate):
    username: Optional[str] = None
    role: Optional[str] = None
    google_id: Optional[str] = None
    #username: str | None = None
    #role: str | None = None
    #google_id: str | None = None

# UserManager with on_after_register hook
class UserManager(IntegerIDMixin, BaseUserManager[User, int]):
    reset_password_token_secret = SecretStr(SECRET_KEY or "")
    verification_token_secret = SecretStr(SECRET_KEY or "")
    
    # Override the password helper to use bcrypt only
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from passlib.context import CryptContext
        # Use passlib's CryptContext with bcrypt
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.password_helper = PasswordHelper(pwd_context)

    async def on_after_register(self, user: User, request=None):
        logger.info(f"User {user.email} has registered.")
        # Create blank parent profile if role is parent
        if getattr(user, "role", None) == "parent":
            async with AsyncSessionLocal() as session:
                profile = ParentProfile(id=user.id)
                session.add(profile)
                await session.commit()
# Only include the register router, not the auth router since we have a custom login
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"]
)

# auth/google endpoint
def generate_random_string(length=6):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

@app.post("/auth/google")
#async def google_auth(request: Request, db: AsyncSession = Depends(get_user_db)):
async def google_auth(request: Request, db: AsyncSession = Depends(get_session)):
    data = await request.json()
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.error("Missing or invalid Authorization header")
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth_header.split(" ")[1]
    idinfo = verify_firebase_token(token)
    if not idinfo:
        logger.error("Invalid ID token")
        raise HTTPException(status_code=401, detail="Invalid ID token")

    email = idinfo.get("email")
    name = idinfo.get("name")
    sub = idinfo.get("sub")  # Firebase UID

    # Check if user exists
    #result = await db.execute(User.__table__.select().where(User.email == email))
    #user_row = result.fetchone()
    #result = await db.execute(select(User).where(User.email == email))
    
    # Check if user exists by email or google_id
    result = await db.execute(select(User).where(
        or_(User.email == email, User.google_id == sub)
    ))
    user_row = result.scalar_one_or_none()
    user = None

    if not user_row:
        # Generate a unique username
        base_username = (name or email.split("@")[0]).replace(" ", "_")
        username = base_username
        # Ensure username is unique
        for _ in range(5):
            result = await db.execute(User.__table__.select().where(User.username == username))
            if not result.fetchone():
                break
            username = f"{base_username}_{generate_random_string(4)}"
        else:
            logger.error("Could not generate unique username for Google user")
            raise HTTPException(status_code=500, detail="Could not generate unique username")

        new_user = User(
            email=email,
            username=username,
            hashed_password=None, 
            google_id=sub,
            role="parent",  
            is_active=True,
            is_superuser=False,
        )
        db.add(new_user)
        try:
            await db.commit()
            await db.refresh(new_user)
            user = new_user
            # Create blank parent profile in a new transaction
            profile = ParentProfile(id=user.id)
            db.add(profile)
            await db.commit()
            logger.info(f"Created new Google user: {email} ({username})")
        except IntegrityError as e:
            await db.rollback()
            logger.error(f"IntegrityError creating Google user: {e}")
            raise HTTPException(status_code=400, detail="A user with this email or username already exists.")
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating Google user: {e}")
            raise HTTPException(status_code=500, detail="Failed to create user.")
    else:
        user = user_row
        logger.info(f"Google user exists: {email}")

    # Check profile completion (same as /auth/jwt/login)
    parent_profile_result = await db.execute(select(ParentProfile).where(ParentProfile.id == user.id))
    parent_profile = parent_profile_result.scalar_one_or_none()
    profile_complete = False
    if parent_profile:
        required_fields = [
            parent_profile.full_name,
            parent_profile.gender,
            parent_profile.age,
            parent_profile.relationship_with_child,
            parent_profile.relationship_status,
            parent_profile.parenting_style,
        ]
        profile_complete = all(f not in (None, "") for f in required_fields)

    # Issue JWT cookie (same as /auth/jwt/login)
    strategy = get_jwt_strategy()
    token = await strategy.write_token(user)
    logger.info(f"JWT token: {token}")
    logger.info(f"Setting cookie for origin: {request.headers.get('origin')}")
    response_content = {"profileComplete": profile_complete, "id": user.id}
    response = Response(content=json.dumps(response_content), media_type="application/json")

    # Helper to ensure samesite is correct type
    from typing import cast, Literal

    def get_samesite(val):
        allowed = {"lax", "strict", "none"}
        if val is None:
            return None
        val_lower = str(val).lower()
        if val_lower in allowed:
            return cast(Literal["lax", "strict", "none"], val_lower)
        return None

    response.set_cookie(
        key="fastapi-users-auth-jwt",
        value=token,
        max_age=3600,
        expires=3600,
        path="/",
        httponly=True,
        samesite="none",  # "none" for cross-origin HTTPS
        secure=True,      # True for HTTPS
        # domain omitted for cross-origin compatibility
    )

    # Ensure CORS headers are set for manual response (dynamic by origin)
    origin = request.headers.get("origin")
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:8080",
        "https://master.dcmcchu8q16tm.amplifyapp.com",
        "https://dcmcchu8q16tm.amplifyapp.com",
        "https://parenzing.com",
        "http://parenzing.com",
    ]
    response.headers["Access-Control-Allow-Origin"] = origin if origin in allowed_origins else "https://parenzing.com"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Expose-Headers"] = "*"

    return response

'''
    response.set_cookie(
        key=cookie_transport.cookie_name,
        value=token,
        max_age=cookie_transport.cookie_max_age,
        expires=cookie_transport.cookie_max_age,
        path=cookie_transport.cookie_path,
        domain=cookie_transport.cookie_domain,
        secure=cookie_transport.cookie_secure,
        httponly=True,
        samesite=get_samesite(cookie_transport.cookie_samesite),
    )
'''    

@app.get("/")
async def root():
    return {"message": "Parenting App Backend API", "status": "running"}

@app.get("/sitemap.xml")
async def sitemap():
    """Return a basic sitemap for SEO"""
    return Response(
        content="""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://parenzing.com/</loc>
        <lastmod>2025-01-06</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
</urlset>""",
        media_type="application/xml"
    )

@app.get("/robots.txt")
async def robots():
    """Return robots.txt for SEO"""
    return Response(
        content="""User-agent: *
Allow: /
Disallow: /api/
Disallow: /auth/
Disallow: /profile/
Sitemap: https://parenzing.com/sitemap.xml""",
        media_type="text/plain"
    )

@app.get("/favicon.ico")
async def favicon():
    """Return a simple favicon response"""
    return Response(
        content="",  # Empty favicon
        media_type="image/x-icon"
    )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Service is running"}

@app.get("/test")
async def test_endpoint():
    return {"message": "Backend is running"}

@app.get("/test-db")
async def test_database_connection(db: AsyncSession = Depends(get_session)):
    try:
        # Test database connection
        result = await db.execute(text("SELECT 1 as test"))
        db_test = result.scalar()
        
        # Test if users table exists and has data
        result = await db.execute(text("SELECT COUNT(*) FROM users"))
        user_count = result.scalar()
        
        return {
            "database_connection": "success",
            "db_test": db_test,
            "user_count": user_count,
            "message": "Database is accessible"
        }
    except Exception as e:
        print(f"Database test error: {e}")
        return {
            "database_connection": "failed",
            "error": str(e),
            "message": "Database connection failed"
        }

@app.get("/test-auth")
async def test_auth_status(request: Request):
    """Test authentication status without requiring authentication"""
    cookies = request.cookies
    headers = dict(request.headers)
    
    return {
        "cookies": cookies,
        "authorization_header": headers.get("authorization"),
        "content_type": headers.get("content-type"),
        "origin": headers.get("origin"),
        "message": "Auth test endpoint"
    }

@app.get("/api/test-cors")
async def test_cors_endpoint():
    return {"message": "CORS is working!", "timestamp": datetime.now().isoformat()}

@app.get("/api/test-messages/{conversation_id}")
async def test_messages_endpoint(
    conversation_id: int,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    """Test endpoint to check if messages exist without authentication"""
    
    print(f"TEST: Checking messages for conversation {conversation_id}")
    
    try:
        # First check if tables exist
        tables_sql = text('''
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('ai_conversations', 'ai_chat_interactions')
        ''')
        tables_result = await db.execute(tables_sql)
        tables = [row.table_name for row in tables_result.fetchall()]
        print(f"TEST: Found tables: {tables}")
        
        # Check if conversation exists
        conv_sql = text('''
            SELECT conversation_id, title, child_id, user_id
            FROM ai_conversations
            WHERE conversation_id = :conversation_id
        ''')
        conv_result = await db.execute(conv_sql, {"conversation_id": conversation_id})
        conversation = conv_result.fetchone()
        
        if not conversation:
            return {"error": "Conversation not found", "conversation_id": conversation_id}
        
        # Check if messages exist
        messages_sql = text('''
            SELECT COUNT(*) as message_count
            FROM ai_chat_interactions
            WHERE conversation_id = :conversation_id
        ''')
        
        messages_result = await db.execute(messages_sql, {"conversation_id": conversation_id})
        message_count = messages_result.fetchone().message_count
        
        # Also check table structure
        columns_sql = text('''
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'ai_chat_interactions' 
            ORDER BY ordinal_position
        ''')
        columns_result = await db.execute(columns_sql)
        columns = [(row.column_name, row.data_type) for row in columns_result.fetchall()]
        print(f"TEST: ai_chat_interactions columns: {columns}")
        
        return {
            "conversation_id": conversation_id,
            "conversation_title": conversation.title,
            "message_count": message_count,
            "conversation_exists": True,
            "tables_found": tables,
            "columns": columns
        }
        
    except Exception as e:
        print(f"TEST ERROR: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e), "conversation_id": conversation_id}

@app.get("/api/conversations/{conversation_id}/messages-test")
async def get_conversation_messages_test(
    conversation_id: int,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    """Test endpoint without authentication to check if CORS works"""
    
    print(f"TEST: Getting messages for conversation {conversation_id}")
    print(f"TEST: Request headers: {dict(request.headers)}")
    print(f"TEST: Request cookies: {request.cookies}")
    
    return {
        "message": "Test endpoint working",
        "conversation_id": conversation_id,
        "headers": dict(request.headers),
        "cookies": request.cookies
    }

@app.get("/api/conversations/{conversation_id}/messages-debug")
async def get_conversation_messages_debug(
    conversation_id: int,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    """Debug endpoint to test authentication and database access"""
    
    print(f"DEBUG: Getting messages for conversation {conversation_id}")
    print(f"DEBUG: Request headers: {dict(request.headers)}")
    print(f"DEBUG: Request cookies: {request.cookies}")
    
    # Try to get user from cookies
    auth_cookie = request.cookies.get("fastapi-users-auth-jwt")
    print(f"DEBUG: Auth cookie: {auth_cookie}")
    
    if not auth_cookie:
        return {
            "error": "No authentication cookie found",
            "message": "Please log in first"
        }
    
    try:
        # Try to decode the JWT token manually
        import jwt
        # Try without audience first to see if that's the issue
        try:
            decoded = jwt.decode(
                auth_cookie, 
                SECRET_KEY or "", 
                algorithms=["HS256"]
            )
            print(f"DEBUG: Token decoded without audience: {decoded}")
        except Exception as e:
            print(f"DEBUG: Failed without audience: {e}")
            # Try with audience
            decoded = jwt.decode(
                auth_cookie, 
                SECRET_KEY or "", 
                algorithms=["HS256"],
                audience=["fastapi-users:auth"]  # Add the correct audience
            )
            print(f"DEBUG: Token decoded with audience: {decoded}")
        user_id = decoded.get("sub")
        
        if user_id:
            print(f"DEBUG: Token decoded successfully, user_id: {user_id}")
            return {
                "message": "Token decoded successfully",
                "user_id": user_id,
                "decoded_token": decoded
            }
        else:
            return {
                "error": "Invalid token format",
                "message": "Token does not contain user ID"
            }
    except jwt.ExpiredSignatureError:
        return {
            "error": "Token expired",
            "message": "Please log in again"
        }
    except jwt.InvalidTokenError as e:
        return {
            "error": "Invalid token",
            "message": str(e)
        }
    except Exception as e:
        print(f"DEBUG: Authentication error: {e}")
        return {
            "error": "Authentication failed",
            "message": str(e)
        }



@app.get("/me")
async def get_me(user: User = Depends(current_active_user)):
    print(f"User authenticated: {user.email} (ID: {user.id})")
    return user



@app.post("/auth/jwt/login")
async def custom_login(
    request: Request,
    credentials: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_session),
    user_manager: BaseUserManager[User, int] = Depends(get_user_manager),
):
    # Debug logging
    print(f"Login attempt - username: {credentials.username}")
    print(f"Login attempt - password length: {len(credentials.password) if credentials.password else 0}")
    
    identifier = str(credentials.username)
    print(f"Looking for user with identifier: '{identifier}'")
    result = await db.execute(
        select(User).where(
            or_(User.username == identifier, User.email == identifier)
        )
    )
    user = result.scalar_one_or_none()
    
    # Debug: Check what users exist in the database
    all_users_result = await db.execute(select(User.username, User.email))
    all_users = all_users_result.fetchall()
    print(f"All users in database:")
    for u in all_users:
        print(f"  Username: '{u[0]}', Email: '{u[1]}'")
    
    # Debug logging
    if user:
        print(f"User found: {user.email} (ID: {user.id})")
        print(f"User has password: {user.hashed_password is not None}")
        print(f"User is active: {user.is_active}")
        if user.hashed_password:
            print(f"Password hash starts with: {user.hashed_password[:20]}...")
    else:
        print(f"No user found for identifier: {identifier}")
    
    if not user or not user.is_active:
        print(f"Login failed: user={user is not None}, is_active={user.is_active if user else False}")
        raise HTTPException(status_code=400, detail=ErrorCode.LOGIN_BAD_CREDENTIALS)
    
    # Check if user has a password (Google users don't have passwords)
    if not user.hashed_password:
        print(f"User {user.email} has no password (likely a Google user)")
        raise HTTPException(status_code=400, detail="This account was created with Google sign-in. Please use Google sign-in to log in.")
    
        # Debug password verification
    print(f"Attempting password verification...")
    # Use the correct method for password verification with passlib
    try:
        # Use verify_and_update method for PasswordHelper
        valid, _ = user_manager.password_helper.verify_and_update(
            credentials.password, user.hashed_password
        )
        print(f"Password verification result: {valid}")
    except Exception as e:
        print(f"Password verification error: {e}")
        # If password hash is corrupted/unknown, treat as invalid password
        if "UnknownHashError" in str(e) or "hash could not be identified" in str(e):
            print(f"Invalid password hash detected for user {user.email}, treating as bad credentials")
            valid = False
        else:
            print(f"PasswordHelper type: {type(user_manager.password_helper)}")
            print(f"PasswordHelper methods: {dir(user_manager.password_helper)}")
            raise

    if not valid:
        print(f"Password verification failed")
        raise HTTPException(status_code=400, detail=ErrorCode.LOGIN_BAD_CREDENTIALS)

    strategy = get_jwt_strategy()
    token = await strategy.write_token(user)

    # Check profile completion (parent profile)
    parent_profile_result = await db.execute(select(ParentProfile).where(ParentProfile.id == user.id))
    parent_profile = parent_profile_result.scalar_one_or_none()
    profile_complete = False
    if parent_profile:
        required_fields = [
            parent_profile.full_name,
            parent_profile.gender,
            parent_profile.age,
            parent_profile.relationship_with_child,
            parent_profile.relationship_status,
            parent_profile.parenting_style,
        ]
        profile_complete = all(f not in (None, "") for f in required_fields)

    response_content = {"access_token": token, "token_type": "bearer", "profileComplete": profile_complete}
    response = Response(content=json.dumps(response_content), media_type="application/json")
    
    # Get origin from request headers for dynamic CORS
    origin = request.headers.get("origin")
    allowed_origins = [
        "http://localhost:3000",  # React dev server
        "http://localhost:8080",  # Local test server
        "https://master.dcmcchu8q16tm.amplifyapp.com",  # Production frontend
        "https://dcmcchu8q16tm.amplifyapp.com",  # Alternative frontend URL
        "https://parenzing.com",  # Custom domain (not used for frontend currently)
        "http://parenzing.com",  # Custom domain (HTTP)
    ]
    
    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        response.headers["Access-Control-Allow-Origin"] = "https://master.dcmcchu8q16tm.amplifyapp.com"

    def get_samesite(val):
        allowed = {"lax", "strict", "none"}
        if val is None:
            return None
        val_lower = str(val).lower()
        return val_lower if val_lower in allowed else "lax"

    response.set_cookie(
        key="fastapi-users-auth-jwt",
        value=token,
        max_age=3600,
        expires=3600,
        path="/",
        httponly=True,
        samesite="none",  # "none" for cross-origin HTTPS
        secure=True,      # True for HTTPS
        # domain omitted for cross-origin compatibility
    )

    # Ensure CORS headers are set for manual response (dynamic by origin)
    origin = request.headers.get("origin")
    allowed_origins = [
        "http://localhost:3000",  # React dev server
        "http://localhost:8080",  # Local test server
        "https://master.dcmcchu8q16tm.amplifyapp.com",  # Production frontend
        "https://dcmcchu8q16tm.amplifyapp.com",  # Alternative frontend URL
        "https://parenzing.com",  # Custom domain
        "http://parenzing.com",  # Custom domain (HTTP)
    ]
    response.headers["Access-Control-Allow-Origin"] = origin if origin in allowed_origins else "https://parenzing.com"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Expose-Headers"] = "*"

    return response

'''
    response.set_cookie(
        key=cookie_transport.cookie_name,
        value=token,
        max_age=cookie_transport.cookie_max_age,
        expires=cookie_transport.cookie_max_age,
        path=cookie_transport.cookie_path,
        domain=cookie_transport.cookie_domain,
        secure=cookie_transport.cookie_secure,
        httponly=True,
        samesite=cast(Literal["lax", "strict", "none"], get_samesite(cookie_transport.cookie_samesite)),
    )
'''



# -------------------- Parent Profile Endpoints --------------------
@app.get("/profile/parent")
async def get_parent_profile(user: User = Depends(current_active_user), db: AsyncSession = Depends(get_session)):
    print(f"Getting parent profile for user {user.id} ({user.email})")
    result = await db.execute(select(ParentProfile).where(ParentProfile.id == user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")
    return profile.__dict__

@app.post("/profile/parent")
async def create_or_update_parent_profile(
    profile: ParentProfileIn,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session)
):
    # Convert birthdate string to date object if necessary
    profile_data = profile.dict(exclude_unset=True)
    if profile_data.get("birthdate"):
        if isinstance(profile_data["birthdate"], str) and profile_data["birthdate"]:
            profile_data["birthdate"] = datetime.strptime(profile_data["birthdate"], "%Y-%m-%d").date()
    # 1. Update parent_users_profile
    result = await db.execute(select(ParentProfile).where(ParentProfile.id == user.id))
    existing = result.scalar_one_or_none()
    if existing:
        for k, v in profile_data.items():
            setattr(existing, k, v)
        db.add(existing)
        await db.commit()
        await db.refresh(existing)
    else:
        new_profile = ParentProfile(id=user.id, **profile_data)
        db.add(new_profile)
        await db.commit()
        await db.refresh(new_profile)
    # 3. Return the updated parent profile
    result = await db.execute(select(ParentProfile).where(ParentProfile.id == user.id))
    updated_profile = result.scalar_one_or_none()
    return updated_profile.__dict__ if updated_profile else {}

# -------------------- Children Profile Endpoints --------------------
@app.get("/profile/children")
async def get_children_profiles(user: User = Depends(current_active_user), db: AsyncSession = Depends(get_session)):
    print(f"Getting children for user {user.id} ({user.email})")
    result = await db.execute(select(ChildProfile).where(ChildProfile.parent_id == user.id))
    children = result.scalars().all()
    
    # Debug: Print children data
    print(f"Children for user {user.id}:")
    for child in children:
        print(f"  Child {child.child_id}: {child.name}, age={child.age}")
    
    # Convert birthdate to string for frontend
    def serialize(child):
        d = child.__dict__.copy()
        if isinstance(d.get("birthdate"), date):
            d["birthdate"] = d["birthdate"].isoformat()
        # Map child_id to id for frontend compatibility
        d["id"] = d.get("child_id")
        print(f"  Serialized child {child.child_id}: {d}")
        print(f"  Child keys: {list(d.keys())}")
        print(f"  Child id value: {d.get('id')}")
        return d
    
    serialized_children = [serialize(c) for c in children]
    print(f"Returning {len(serialized_children)} children: {serialized_children}")
    return serialized_children

@app.post("/profile/children")
async def add_child_profile(child: ChildProfileIn, user: User = Depends(current_active_user), db: AsyncSession = Depends(get_session)):
    # Convert birthdate string to date
    child_data = child.dict()
    if child_data.get("birthdate"):
        child_data["birthdate"] = datetime.strptime(child_data["birthdate"], "%Y-%m-%d").date()
    new_child = ChildProfile(parent_id=user.id, **child_data)
    db.add(new_child)
    await db.commit()
    await db.refresh(new_child)
    # Serialize for frontend
    d = new_child.__dict__.copy()
    if isinstance(d.get("birthdate"), date):
        d["birthdate"] = d["birthdate"].isoformat()
    return d

@app.put("/profile/children/{child_id}")
async def update_child_profile(child_id: int, child: ChildProfileIn, user: User = Depends(current_active_user), db: AsyncSession = Depends(get_session)):
    try:
        result = await db.execute(select(ChildProfile).where(ChildProfile.child_id == child_id, ChildProfile.parent_id == user.id))
        existing = result.scalar_one_or_none()
        if not existing:
            raise HTTPException(status_code=404, detail="Child not found")
        
        child_data = child.dict()
        if child_data.get("birthdate"):
            child_data["birthdate"] = datetime.strptime(child_data["birthdate"], "%Y-%m-%d").date()
        if child_data.get("special_notes", "").strip() == "":
            child_data["special_notes"] = None
        
        # Update the existing child with new data
        for k, v in child_data.items():
            setattr(existing, k, v)
        
        db.add(existing)
        await db.commit()
        await db.refresh(existing)
        
        # Serialize for frontend with proper id mapping
        d = existing.__dict__.copy()
        if isinstance(d.get("birthdate"), date):
            d["birthdate"] = d["birthdate"].isoformat()
        # Map child_id to id for frontend compatibility
        d["id"] = d.get("child_id")
        
        return d
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update child: {str(e)}")

@app.delete("/profile/children/{child_id}")
async def delete_child_profile(child_id: int, user: User = Depends(current_active_user), db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(ChildProfile).where(ChildProfile.child_id == child_id, ChildProfile.parent_id == user.id))
    existing = result.scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="Child not found")
    await db.delete(existing)
    await db.commit()
    return {"status": "deleted"}


# Note: FAISS search endpoint removed - we use pgvector for vector search

@app.post("/api/chat")
async def chat(
    input: ChatInput,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session)
):
    # 1. Fetch parent profile
    parent_result = await db.execute(select(ParentProfile).where(ParentProfile.id == user.id))
    parent_profile = parent_result.scalar_one_or_none()
    if not parent_profile:
        raise HTTPException(status_code=400, detail="Parent profile not found.")

    # 2. Fetch child profile (if provided and not 'general')
    child_profile = None
    if input.child_id and str(input.child_id).lower() != 'general':
        child_result = await db.execute(select(ChildProfile).where(
            ChildProfile.child_id == input.child_id,
            ChildProfile.parent_id == user.id
        ))
        child_profile = child_result.scalar_one_or_none()

    # 3. Handle conversation creation/retrieval
    conversation = None
    if input.conversation_id:
        # Get existing conversation using raw SQL to avoid embedding column issues
        conv_sql = text('''
            SELECT conversation_id, user_id, child_id, title, conversation_type, 
                   primary_agent_type, enabled_agents, participating_agents
            FROM ai_conversations
            WHERE conversation_id = :conversation_id AND user_id = :user_id
        ''')
        conv_result = await db.execute(conv_sql, {
            "conversation_id": input.conversation_id,
            "user_id": user.id
        })
        conv_row = conv_result.fetchone()
        if not conv_row:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Create a conversation object from database row
        class ConversationFromDB:
            def __init__(self, row):
                self.conversation_id = row.conversation_id
                self.user_id = row.user_id
                self.child_id = row.child_id
                self.title = row.title
                self.conversation_type = row.conversation_type
                self.primary_agent_type = row.primary_agent_type
                self.enabled_agents = row.enabled_agents
                self.participating_agents = row.participating_agents
        
        conversation = ConversationFromDB(conv_row)
    else:
        # Determine conversation type and enabled agents based on manual mode
        is_manual_mode = input.manual_agent is not None
        
        if is_manual_mode:
            # Manual mode: only the selected agent is enabled
            agent_mapping = {
                "parenting-style": "Parenting Style Analyst",
                "child-development": "Child Development Advisor", 
                "crisis-intervention": "Crisis Intervention Specialist",
                "community-connector": "Community Connector"
            }
            selected_agent = agent_mapping.get(input.manual_agent, "Parenting Style Analyst")
            # Store agent IDs for enabled_agents, but full names for primary_agent_type
            enabled_agents = [input.manual_agent]  # Store the agent ID
            conversation_type = "agent-specific"
            primary_agent_type = selected_agent  # Store the full name
        else:
            # Auto mode: all agents enabled
            enabled_agents = ["parenting-style", "child-development", "crisis-intervention", "community-connector"]  # Store agent IDs
            conversation_type = "general"
            primary_agent_type = None  # Will be set based on first agent used
        
        # Generate AI title
        child_name = child_profile.name if child_profile else None
        ai_title = await generate_conversation_title(input.query, child_name)
        
        # Debug: Print input values
        print(f"Creating new conversation: input.child_id={input.child_id}, child_profile={child_profile}, manual_mode={is_manual_mode}")
        
        # Create conversation using raw SQL to avoid embedding column issues
        conv_insert_sql = text('''
            INSERT INTO ai_conversations 
            (user_id, child_id, title, conversation_type, primary_agent_type, enabled_agents, participating_agents)
            VALUES (:user_id, :child_id, :title, :conversation_type, :primary_agent_type, :enabled_agents, :participating_agents)
            RETURNING conversation_id, user_id, child_id, title, conversation_type, primary_agent_type, enabled_agents, participating_agents
        ''')
        
        conv_result = await db.execute(conv_insert_sql, {
            "user_id": user.id,
            "child_id": input.child_id,  # Always set child_id if provided, even if child_profile not found
            "title": ai_title,
            "conversation_type": conversation_type,
            "primary_agent_type": primary_agent_type,
            "enabled_agents": json.dumps(enabled_agents),
            "participating_agents": json.dumps([])
        })
        
        conv_row = conv_result.fetchone()
        
        # Create a conversation object from database row
        class ConversationFromDB:
            def __init__(self, row):
                self.conversation_id = row.conversation_id
                self.user_id = row.user_id
                self.child_id = row.child_id
                self.title = row.title
                self.conversation_type = row.conversation_type
                self.primary_agent_type = row.primary_agent_type
                # Handle enabled_agents - could be string (JSON) or already a list
                if isinstance(row.enabled_agents, str):
                    self.enabled_agents = json.loads(row.enabled_agents) if row.enabled_agents else []
                else:
                    self.enabled_agents = row.enabled_agents if row.enabled_agents else []
                # Handle participating_agents - could be string (JSON) or already a list
                if isinstance(row.participating_agents, str):
                    self.participating_agents = json.loads(row.participating_agents) if row.participating_agents else []
                else:
                    self.participating_agents = row.participating_agents if row.participating_agents else []
        
        conversation = ConversationFromDB(conv_row)
        
        # Debug: Print created conversation
        print(f"Created conversation: id={conversation.conversation_id}, child_id={conversation.child_id}")

    # 4. Generate embedding for the query
    try:
        print(f"DEBUG: Generating embedding for query: {input.query[:50]}...")
        embedding = await get_openai_embedding(input.query)
        print(f"DEBUG: Embedding generated successfully, length: {len(embedding)}")
    except Exception as e:
        print(f"ERROR: Failed to generate embedding: {e}")
        # Use a fallback embedding (zeros)
        embedding = [0.0] * 1536  # OpenAI embedding dimension

    # 5. Retrieve similar memories using pgvector (child-specific)
    k = 5
    
    # Debug: Print the input values
    print(f"DEBUG: input.child_id = {input.child_id} (type: {type(input.child_id)})")
    print(f"DEBUG: conversation.child_id = {conversation.child_id} (type: {type(conversation.child_id)})")
    print(f"DEBUG: child_profile = {child_profile}")
    
    # Determine if this is a child-specific or general query based on conversation
    is_child_specific = (conversation.child_id is not None and 
                        conversation.child_id != 0)
    
    print(f"DEBUG: is_child_specific = {is_child_specific}")
    
    try:
        if is_child_specific:
            # Search within specific child's interactions ONLY
            print(f"DEBUG: Searching for child-specific memories for child_id = {conversation.child_id}")
            sql = text('''
                SELECT *, (embedding <-> :embedding) AS distance
                FROM ai_chat_interactions
                WHERE user_id = :user_id AND child_id = :child_id
                ORDER BY embedding <-> :embedding
                LIMIT :k
            ''')
            embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
            result = await db.execute(sql, {
                "embedding": embedding_str, 
                "user_id": user.id, 
                "child_id": conversation.child_id,
                "k": k
            })
            memories = result.fetchall()
            print(f"DEBUG: Found {len(memories)} child-specific memories for child_id = {conversation.child_id}")
        else:
            # Search ONLY for general memories (child_id IS NULL)
            print(f"DEBUG: Searching for general memories (child_id IS NULL)")
            sql = text('''
                SELECT *, (embedding <-> :embedding) AS distance
                FROM ai_chat_interactions
                WHERE user_id = :user_id AND child_id IS NULL
                ORDER BY embedding <-> :embedding
                LIMIT :k
            ''')
            embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
            result = await db.execute(sql, {"embedding": embedding_str, "user_id": user.id, "k": k})
            memories = result.fetchall()
            print(f"DEBUG: Found {len(memories)} general memories (child_id IS NULL)")
    except Exception as e:
        print(f"ERROR: Failed to retrieve memories: {e}")
        memories = []
    
    print(f"DEBUG: Total memories found: {len(memories)}")
    for i, mem in enumerate(memories):
        print(f"DEBUG: Memory {i+1}: child_id={mem.child_id}, query='{mem.query[:50]}...'")

    # 6. Format memories for prompt
    def format_memories(memories):
        lines = []
        for m in memories:
            q = getattr(m, "query", None) or (m["query"] if "query" in m else "")
            r = getattr(m, "response", None) or (m["response"] if "response" in m else "")
            dt = getattr(m, "generated_at", None) or (m["generated_at"] if "generated_at" in m else None)
            date_str = dt.date().isoformat() if dt else ""
            lines.append(f'On {date_str}, you asked: "{q}"\nAI replied: "{r}"')
        return "\n".join(lines)
    
    memories_text = format_memories(memories)
    print(f"DEBUG: Formatted memories text length: {len(memories_text)}")
    if memories_text:
        print(f"DEBUG: First 200 chars of memories: {memories_text[:200]}...")
    else:
        print(f"DEBUG: No memories found - memories_text is empty")

    # 7. Build context for LLM
    parent_ctx = f"Parent: {parent_profile.relationship_with_child}, Style: {parent_profile.parenting_style}, Location: {getattr(parent_profile, 'location', '')}"
    child_ctx = ""
    if child_profile:
        def ensure_list(val):
            if isinstance(val, list):
                return val
            elif hasattr(val, 'split'):
                return [v.strip() for v in val.split(',') if v.strip()]
            elif val is None:
                return []
            else:
                return list(val) if hasattr(val, '__iter__') else [str(val)]
        
        # Get all child profile fields
        special_needs = ensure_list(getattr(child_profile, 'special_needs', []))
        characteristics = ensure_list(getattr(child_profile, 'characteristics', []))
        current_challenges = ensure_list(getattr(child_profile, 'current_challenges', []))
        
        # Format child context with all relevant information
        child_ctx = (
            f"Child Profile: {child_profile.name}, Age: {child_profile.age}, Gender: {child_profile.gender}, "
            f"Education Level: {getattr(child_profile, 'education_level', 'Not specified')}, "
            f"Developmental Stage: {child_profile.developmental_stage}, "
            f"Special Needs: {', '.join(special_needs) if special_needs else 'None'}, "
            f"Characteristics: {', '.join(characteristics) if characteristics else 'None'}, "
            f"Current Challenges: {', '.join(current_challenges) if current_challenges else 'None'}, "
            f"Special Notes: {getattr(child_profile, 'special_notes', 'None')}"
        )
    context = f"{parent_ctx}\n{child_ctx}\n"
    if memories_text:
        context += f"Relevant past Q&A:\n{memories_text}\n"

    # 8. Execute CrewAI response with automatic agent selection
    child_info = ""
    if child_profile:
        # Create comprehensive child info for agents
        special_needs = ensure_list(getattr(child_profile, 'special_needs', []))
        characteristics = ensure_list(getattr(child_profile, 'characteristics', []))
        current_challenges = ensure_list(getattr(child_profile, 'current_challenges', []))
        
        child_info = (
            f"CHILD PROFILE DETAILS:\n"
            f"Name: {child_profile.name}\n"
            f"Age: {child_profile.age} years old\n"
            f"Gender: {child_profile.gender}\n"
            f"Education Level: {getattr(child_profile, 'education_level', 'Not specified')}\n"
            f"Developmental Stage: {child_profile.developmental_stage}\n"
            f"Special Needs: {', '.join(special_needs) if special_needs else 'None'}\n"
            f"Characteristics: {', '.join(characteristics) if characteristics else 'None'}\n"
            f"Current Challenges: {', '.join(current_challenges) if current_challenges else 'None'}\n"
            f"Special Notes: {getattr(child_profile, 'special_notes', 'None')}"
        )
    
    # Map frontend agent IDs to backend agent types
    agent_mapping = {
        "parenting-style": "parenting_style",
        "child-development": "child_development", 
        "crisis-intervention": "crisis_intervention",
        "community-connector": "community_connector"
    }
    
    manual_agent = None
    print(f"DEBUG: Backend received manual_agent: {input.manual_agent}")
    if input.manual_agent and input.manual_agent in agent_mapping:
        manual_agent = agent_mapping[input.manual_agent]
        print(f"DEBUG: Mapped manual_agent to: {manual_agent}")
    else:
        print(f"DEBUG: No manual agent or not in mapping. Available agents: {list(agent_mapping.keys())}")
    
    try:
        print(f"DEBUG: Executing CrewAI response for query: {input.query[:100]}...")
        print(f"DEBUG: Manual agent: {manual_agent}")
        print(f"DEBUG: Context length: {len(context)}")
        print(f"DEBUG: Child info length: {len(child_info)}")
        
        crewai_result = await execute_crewai_response(
            query=input.query,
            context=context,
            child_info=child_info,
            manual_agent=manual_agent  # Use mapped manual agent if provided
        )
        
        print(f"DEBUG: CrewAI result received: {type(crewai_result)}")
        print(f"DEBUG: CrewAI result keys: {crewai_result.keys() if isinstance(crewai_result, dict) else 'Not a dict'}")
        
        style_result = crewai_result["response"]
        agent_type = crewai_result["agent_type"]
        
        # Clean up the response - remove markdown formatting and ensure proper spacing
        def clean_response(text):
            import re
            if not text:
                return text
            
            # Remove markdown symbols
            text = text.replace('**', '')  # Remove bold
            text = text.replace('*', '')   # Remove italic
            text = text.replace('`', '')   # Remove code blocks
            
            # First, normalize line breaks
            text = text.replace('\r\n', '\n').replace('\r', '\n')
            
            # MORE AGGRESSIVE: Add line breaks before numbered points
            # This pattern matches numbers followed by a period and optional space
            text = re.sub(r'(\d+\.\s*)', r'\n\n\1', text)
            
            # Also add line breaks before bullet points and other list markers
            text = re.sub(r'([•\-*]\s)', r'\n\n\1', text)
            
            # Add line breaks before "References:" section
            text = re.sub(r'(References:)', r'\n\n\1', text)
            
            # Clean up multiple consecutive line breaks (more than 2)
            text = re.sub(r'\n{3,}', '\n\n', text)
            
            # Process the text line by line for better control
            lines = text.split('\n')
            processed_lines = []
            
            for i, line in enumerate(lines):
                line = line.strip()
                if not line:  # Skip empty lines
                    continue
                
                # Check if this line starts with a number and period
                if re.match(r'^\d+\.', line):
                    # Add a blank line before numbered items (unless it's the first item)
                    if processed_lines and processed_lines[-1].strip():
                        processed_lines.append('')
                    processed_lines.append(line)
                else:
                    # For non-numbered lines, just add them
                    processed_lines.append(line)
            
            # Join the processed lines
            result = '\n'.join(processed_lines)
            
            # Final cleanup: ensure proper spacing
            result = re.sub(r'\n{3,}', '\n\n', result)
            
            # Ensure the result doesn't start with extra line breaks
            result = result.strip()
            
            return result
        
        style_result = clean_response(style_result)
        
        print(f"DEBUG: AI response generated successfully")
        print(f"DEBUG: Response length: {len(style_result) if style_result else 0}")
        print(f"DEBUG: Agent type: {agent_type}")
        print(f"DEBUG: Cleaned response preview: {style_result[:200]}...")
        
    except Exception as e:
        print(f"ERROR: Failed to generate AI response: {e}")
        import traceback
        traceback.print_exc()
        
        # Provide a fallback response
        style_result = f"I apologize, but I encountered an error while processing your request. Please try again. Error: {str(e)}"
        agent_type = "AI Assistant"

    # 9. Store new interaction in DB using raw SQL to handle embedding
    try:
        print(f"DEBUG: Storing interaction in database...")
        print(f"DEBUG: Using conversation.child_id: {conversation.child_id}")
        print(f"DEBUG: Input child_id: {input.child_id}")
        print(f"DEBUG: Child profile found: {child_profile is not None}")
        
        interaction_sql = text('''
            INSERT INTO ai_chat_interactions 
            (user_id, child_id, query, response, agent_type, embedding, generated_by, retrieved_memories_pgvector, conversation_id)
            VALUES (:user_id, :child_id, :query, :response, :agent_type, :embedding, :generated_by, :retrieved_memories_pgvector, :conversation_id)
        ''')
        
        # Convert embedding to proper format for PostgreSQL vector
        embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
        
        await db.execute(interaction_sql, {
            "user_id": user.id,
            "child_id": conversation.child_id,  # Use conversation's child_id for existing conversations
            "query": input.query,
            "response": style_result,
            "agent_type": agent_type,
            "embedding": embedding_str,
            "generated_by": user.id,
            "retrieved_memories_pgvector": memories_text,
            "conversation_id": conversation.conversation_id
        })
        print(f"DEBUG: Interaction stored successfully")
    except Exception as e:
        print(f"ERROR: Failed to store interaction: {e}")
        import traceback
        traceback.print_exc()

    # 10. Update conversation participating agents and primary agent type using raw SQL
    if agent_type not in conversation.participating_agents:
        conversation.participating_agents.append(agent_type)
    
    # Determine primary agent type based on usage frequency
    if not conversation.primary_agent_type:
        # First message: set the agent used
        conversation.primary_agent_type = agent_type
    else:
        # Check if this agent is used more frequently
        agent_counts = {}
        for agent in conversation.participating_agents:
            agent_counts[agent] = agent_counts.get(agent, 0) + 1
        
        # Find the most frequently used agent
        most_used_agent = max(agent_counts.items(), key=lambda x: x[1])[0]
        conversation.primary_agent_type = most_used_agent
    
    # 11. Generate conversation summary for every new message (to include latest content)
    try:
        print(f"DEBUG: Generating summary for conversation {conversation.conversation_id}")
        summary = await generate_conversation_summary(conversation.conversation_id, db)
        print(f"DEBUG: Generated summary: {summary[:100]}...")
        
        # Generate summary embedding for the updated summary
        summary_embedding = await get_openai_embedding(summary)
        summary_embedding_str = "[" + ",".join(str(x) for x in summary_embedding) + "]"
        print(f"DEBUG: Generated summary embedding length: {len(summary_embedding)}")
    except Exception as e:
        print(f"ERROR: Failed to generate summary: {e}")
        summary = "Summary generation failed"
        summary_embedding_str = "[]"

    # Update conversation with new summary and embedding
    try:
        conv_update_sql = text('''
            UPDATE ai_conversations 
            SET participating_agents = :participating_agents,
                primary_agent_type = :primary_agent_type,
                summary = :summary,
                summary_embedding = :summary_embedding,
                updated_at = CURRENT_TIMESTAMP
            WHERE conversation_id = :conversation_id
        ''')
        
        print(f"DEBUG: Updating conversation {conversation.conversation_id}")
        print(f"DEBUG: participating_agents: {conversation.participating_agents}")
        print(f"DEBUG: primary_agent_type: {conversation.primary_agent_type}")
        
        await db.execute(conv_update_sql, {
            "participating_agents": json.dumps(conversation.participating_agents),
            "primary_agent_type": conversation.primary_agent_type,
            "summary": summary,
            "summary_embedding": summary_embedding_str,
            "conversation_id": conversation.conversation_id
        })
        print(f"DEBUG: Conversation updated successfully")
    except Exception as e:
        print(f"ERROR: Failed to update conversation: {e}")
        import traceback
        traceback.print_exc()

    try:
        await db.commit()
        print(f"DEBUG: Database commit successful")
    except Exception as e:
        print(f"ERROR: Failed to commit database transaction: {e}")
        await db.rollback()
        import traceback
        traceback.print_exc()

    # 12. Return response and conversation info
    # Convert memories to proper format - handle both Row objects and dict-like objects
    def format_memory(memory):
        if hasattr(memory, '_mapping'):
            return dict(memory._mapping)
        elif hasattr(memory, '__dict__'):
            return memory.__dict__
        else:
            return dict(memory)
    
    response_data = {
        "response": style_result,
        "memories": [format_memory(row) for row in memories],
        "child_id": conversation.child_id,  # Use conversation's child_id
        "conversation_id": conversation.conversation_id,
        "agent_type": agent_type
    }
    
    print(f"DEBUG: Returning response data: {response_data}")
    return response_data

@app.get("/api/conversations")
async def get_conversations(
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session)
):
    """Get all conversations for the current user with their latest messages"""
    print(f"Getting conversations for user {user.id} ({user.email})")
    
    # Get conversations with child information and latest message
    sql = text('''
        SELECT 
            c.conversation_id,
            c.title,
            c.child_id,
            c.started_at,
            c.updated_at,
            c.conversation_type,
            c.primary_agent_type,
            c.enabled_agents,
            c.participating_agents,
            c.summary,
            cp.name as child_name,
            cp.age as child_age,
            (
                SELECT query 
                FROM ai_chat_interactions 
                WHERE conversation_id = c.conversation_id 
                ORDER BY generated_at DESC 
                LIMIT 1
            ) as last_message,
            (
                SELECT generated_at 
                FROM ai_chat_interactions 
                WHERE conversation_id = c.conversation_id 
                ORDER BY generated_at DESC 
                LIMIT 1
            ) as last_message_time
        FROM ai_conversations c
        LEFT JOIN children_profile cp ON c.child_id = cp.child_id
        WHERE c.user_id = :user_id
        ORDER BY c.updated_at DESC
    ''')
    
    result = await db.execute(sql, {"user_id": user.id})
    conversations = result.fetchall()
    
    # Debug: List all children for current user
    children_result = await db.execute(select(ChildProfile).where(ChildProfile.parent_id == user.id))
    user_children = children_result.scalars().all()
    print(f"Children for user {user.id}:")
    for child in user_children:
        print(f"  Child {child.child_id}: {child.name} (age {child.age})")
    
    # Debug: Print raw conversation data
    print(f"Raw conversations for user {user.id}:")
    for conv in conversations:
        print(f"  Conversation {conv.conversation_id}: child_id={conv.child_id}, title={conv.title}")
    
    # Format conversations for frontend
    formatted_conversations = []
    for conv in conversations:
        # Get child name if available
        child_name = None
        if conv.child_name:
            child_name = conv.child_name
        
        # Debug: Print child information
        print(f"  Formatting conversation {conv.conversation_id}: child_id={conv.child_id}, child_name={child_name}")
        
        # Check if child exists and belongs to current user
        if conv.child_id:
            child_check_result = await db.execute(select(ChildProfile).where(
                ChildProfile.child_id == conv.child_id,
                ChildProfile.parent_id == user.id
            ))
            child_exists = child_check_result.scalar_one_or_none()
            print(f"  Child {conv.child_id} exists for user {user.id}: {child_exists is not None}")
            if not child_exists:
                print(f"  WARNING: Child {conv.child_id} does not exist or does not belong to user {user.id}")
        
        # Format participating agents
        participating_agents = []
        if conv.participating_agents:
            if isinstance(conv.participating_agents, str):
                try:
                    participating_agents = json.loads(conv.participating_agents)
                except:
                    participating_agents = [conv.participating_agents]
            elif isinstance(conv.participating_agents, list):
                participating_agents = conv.participating_agents
        
        # Format enabled agents
        enabled_agents = []
        if conv.enabled_agents:
            if isinstance(conv.enabled_agents, str):
                try:
                    enabled_agents = json.loads(conv.enabled_agents)
                except:
                    enabled_agents = [conv.enabled_agents]
            elif isinstance(conv.enabled_agents, list):
                enabled_agents = conv.enabled_agents
        
        # Debug: Print enabled agents information
        print(f"  DEBUG: Conversation {conv.conversation_id} enabled_agents:")
        print(f"    Raw enabled_agents: {conv.enabled_agents}")
        print(f"    Type: {type(conv.enabled_agents)}")
        print(f"    Formatted enabled_agents: {enabled_agents}")
        print(f"    Primary agent type: {conv.primary_agent_type}")
        print(f"    Conversation type: {conv.conversation_type}")
        
        formatted_conversation = {
            "id": str(conv.conversation_id),
            "title": conv.title or "New conversation",
            "childId": str(conv.child_id) if conv.child_id is not None else None,
            "childName": child_name,
            "lastMessage": conv.last_message or "No messages yet",
            "lastUpdated": conv.last_message_time if conv.last_message_time else conv.updated_at,
            "participatingAgents": participating_agents,
            "conversationType": conv.conversation_type,
            "primaryAgentType": conv.primary_agent_type,
            "enabledAgents": enabled_agents,
            "messages": []  # We'll load messages separately if needed
        }
        
        print(f"  Formatted conversation: {formatted_conversation}")
        print(f"  Raw child_id: {conv.child_id} (type: {type(conv.child_id)})")
        print(f"  Formatted childId: {formatted_conversation['childId']} (type: {type(formatted_conversation['childId'])})")
        formatted_conversations.append(formatted_conversation)
    
    return formatted_conversations



@app.get("/api/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: int,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    """Get all messages for a specific conversation"""
    
    print(f"Getting messages for conversation {conversation_id}")
    print(f"Request headers: {dict(request.headers)}")
    print(f"Request cookies: {request.cookies}")
    
    # Get authentication cookie
    auth_cookie = request.cookies.get("fastapi-users-auth-jwt")
    if not auth_cookie:
        raise HTTPException(status_code=401, detail="No authentication cookie found")
    
    try:
        # Decode JWT token manually
        import jwt
        print(f"DEBUG: Attempting to decode token: {auth_cookie[:50]}...")
        print(f"DEBUG: SECRET_KEY length: {len(SECRET_KEY or '')}")
        
        # Try without audience first to see if that's the issue
        try:
            decoded = jwt.decode(
                auth_cookie, 
                SECRET_KEY or "", 
                algorithms=["HS256"]
            )
            print(f"DEBUG: Token decoded without audience: {decoded}")
        except Exception as e:
            print(f"DEBUG: Failed without audience: {e}")
            # Try with audience
            decoded = jwt.decode(
                auth_cookie, 
                SECRET_KEY or "", 
                algorithms=["HS256"],
                audience=["fastapi-users:auth"]  # Add the correct audience
            )
            print(f"DEBUG: Token decoded with audience: {decoded}")
        print(f"DEBUG: Token decoded successfully: {decoded}")
        
        user_id = int(decoded.get("sub"))
        print(f"DEBUG: User ID from token: {user_id}")
        
        # Get user from database
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        
        if not user or not user.is_active:
            print(f"ERROR: User not found or not active: {user}")
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        print(f"User authenticated: {user.email} (ID: {user.id})")
        
    except jwt.ExpiredSignatureError as e:
        print(f"ERROR: Token expired: {e}")
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        print(f"ERROR: Invalid token: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
    except ValueError as e:
        print(f"ERROR: Value error in token processing: {e}")
        raise HTTPException(status_code=401, detail=f"Token processing error: {e}")
    except Exception as e:
        print(f"ERROR: Authentication failed: {e}")
        print(f"ERROR: Exception type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=401, detail="Authentication failed")
    
    # Verify conversation belongs to user using raw SQL to avoid embedding column issues
    try:
        print(f"DEBUG: Checking conversation {conversation_id} for user {user.id}")
        
        # First check if conversation exists at all
        conv_check_sql = text('''
            SELECT conversation_id, title, child_id, user_id
            FROM ai_conversations
            WHERE conversation_id = :conversation_id
        ''')
        conv_check_result = await db.execute(conv_check_sql, {"conversation_id": conversation_id})
        conv_check = conv_check_result.fetchone()
        
        if not conv_check:
            print(f"Conversation {conversation_id} does not exist in database")
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        print(f"Conversation exists: {conv_check.conversation_id}, title: {conv_check.title}, user_id: {conv_check.user_id}")
        
        # Now check if it belongs to the current user
        if conv_check.user_id != user.id:
            print(f"Conversation {conversation_id} belongs to user {conv_check.user_id}, not {user.id}")
            raise HTTPException(status_code=403, detail="Access denied")
        
        conversation = conv_check
        print(f"Found conversation: {conversation.conversation_id}, title: {conversation.title}")
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        print(f"ERROR: Database error checking conversation: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Database error")
    
    # Get messages using raw SQL to avoid embedding column issues
    try:
        print(f"Searching for messages with conversation_id = {conversation_id}")
        
        # Use the correct column name from the database
        messages_sql = text('''
            SELECT chat_id, user_id, child_id, query, response, agent_type, 
                   generated_at, generated_by, retrieved_memories_pgvector, conversation_id
            FROM ai_chat_interactions
            WHERE conversation_id = :conversation_id
            ORDER BY generated_at
        ''')
        
        messages_result = await db.execute(messages_sql, {"conversation_id": conversation_id})
        messages = messages_result.fetchall()
        print(f"Found {len(messages)} messages for conversation {conversation_id}")
        
        # Debug: Print first message structure
        if messages:
            first_msg = messages[0]
            print(f"First message structure: {dir(first_msg)}")
            print(f"First message keys: {first_msg._mapping.keys() if hasattr(first_msg, '_mapping') else 'No _mapping'}")
        
    except Exception as e:
        print(f"ERROR: Database error fetching messages: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Database error fetching messages")
    
    # Debug: Check all messages in the database for this conversation
    all_messages_result = await db.execute(messages_sql, {"conversation_id": conversation_id})
    all_messages = all_messages_result.fetchall()
    print(f"Total messages in database for conversation {conversation_id}: {len(all_messages)}")
    for msg in all_messages:
        print(f"  Message {msg.chat_id}: conversation_id={msg.conversation_id}, query='{msg.query[:30]}...'")
    
    formatted_messages = []
    for msg in messages:
        print(f"Processing message {msg.chat_id}: query='{msg.query[:50]}...', response='{msg.response[:50]}...'")
        
        formatted_messages.append({
            "id": str(msg.chat_id),
            "content": msg.query,  # User message
            "sender": "user",
            "timestamp": msg.generated_at.isoformat(),
            "type": "text"
        })
        
        # Parse retrieved memories for references
        references = []
        if msg.retrieved_memories_pgvector:
            try:
                # Split by newlines and extract relevant parts
                memory_lines = msg.retrieved_memories_pgvector.split('\n')
                for line in memory_lines:
                    if 'you asked:' in line or 'AI replied:' in line:
                        references.append(line.strip())
            except:
                references = [msg.retrieved_memories_pgvector]
        
        formatted_messages.append({
            "id": f"{msg.chat_id}_response",
            "content": msg.response,  # AI response
            "sender": "ai",
            "timestamp": msg.generated_at.isoformat(),
            "type": "text",
            "agent": msg.agent_type,
            "confidence": 85,  # Default confidence
            "references": references
        })
    
    print(f"Returning {len(formatted_messages)} formatted messages")
    print(f"First few messages: {formatted_messages[:2] if formatted_messages else 'No messages'}")
    
    return formatted_messages

@app.post("/api/conversations/{conversation_id}/generate-summary")
async def generate_conversation_summary_endpoint(
    conversation_id: int,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session)
):
    """Generate or regenerate a summary for a specific conversation"""
    
    # Verify conversation belongs to user
    conv_sql = text('''
        SELECT conversation_id, title, child_id, user_id
        FROM ai_conversations
        WHERE conversation_id = :conversation_id AND user_id = :user_id
    ''')
    conv_result = await db.execute(conv_sql, {
        "conversation_id": conversation_id,
        "user_id": user.id
    })
    conversation = conv_result.fetchone()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Generate summary
    summary = await generate_conversation_summary(conversation_id, db)
    
    # Generate summary embedding
    summary_embedding = await get_openai_embedding(summary)
    summary_embedding_str = "[" + ",".join(str(x) for x in summary_embedding) + "]"
    
    # Update conversation with new summary
    update_sql = text('''
        UPDATE ai_conversations 
        SET summary = :summary,
            summary_embedding = :summary_embedding,
            updated_at = CURRENT_TIMESTAMP
        WHERE conversation_id = :conversation_id
    ''')
    
    await db.execute(update_sql, {
        "summary": summary,
        "summary_embedding": summary_embedding_str,
        "conversation_id": conversation_id
    })
    
    await db.commit()
    
    return {
        "conversation_id": conversation_id,
        "summary": summary,
        "message": "Summary generated successfully"
    }

@app.post("/api/conversations/{conversation_id}/end")
async def end_conversation(
    conversation_id: int,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session)
):
    """Mark a conversation as ended"""
    
    # Verify conversation belongs to user
    conv_sql = text('''
        SELECT conversation_id, title, child_id, user_id
        FROM ai_conversations
        WHERE conversation_id = :conversation_id AND user_id = :user_id
    ''')
    conv_result = await db.execute(conv_sql, {
        "conversation_id": conversation_id,
        "user_id": user.id
    })
    conversation = conv_result.fetchone()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Update conversation to mark as ended
    update_sql = text('''
        UPDATE ai_conversations 
        SET ended_at = CURRENT_TIMESTAMP,
            is_active = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE conversation_id = :conversation_id
    ''')
    
    await db.execute(update_sql, {
        "conversation_id": conversation_id
    })
    
    await db.commit()
    
    return {
        "conversation_id": conversation_id,
        "message": "Conversation ended successfully"
    }

@app.put("/api/conversations/{conversation_id}/update-metadata")
async def update_conversation_metadata(
    conversation_id: int,
    metadata: dict = Body(...),
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session)
):
    """Update conversation metadata (conversation_type, enabled_agents, primary_agent_type)"""
    
    # Verify conversation belongs to user
    conv_sql = text('''
        SELECT conversation_id, title, child_id, user_id
        FROM ai_conversations
        WHERE conversation_id = :conversation_id AND user_id = :user_id
    ''')
    conv_result = await db.execute(conv_sql, {
        "conversation_id": conversation_id,
        "user_id": user.id
    })
    conversation = conv_result.fetchone()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Extract metadata fields
    conversation_type = metadata.get("conversation_type", "general")
    enabled_agents = metadata.get("enabled_agents", [])
    primary_agent_type = metadata.get("primary_agent_type")
    
    # Debug logging
    print(f"DEBUG: Updating conversation {conversation_id} metadata:")
    print(f"  conversation_type: {conversation_type}")
    print(f"  enabled_agents: {enabled_agents}")
    print(f"  primary_agent_type: {primary_agent_type}")
    
    # Update conversation metadata
    update_sql = text('''
        UPDATE ai_conversations 
        SET conversation_type = :conversation_type,
            enabled_agents = :enabled_agents,
            primary_agent_type = :primary_agent_type,
            updated_at = CURRENT_TIMESTAMP
        WHERE conversation_id = :conversation_id
    ''')
    
    await db.execute(update_sql, {
        "conversation_id": conversation_id,
        "conversation_type": conversation_type,
        "enabled_agents": json.dumps(enabled_agents),
        "primary_agent_type": primary_agent_type
    })
    
    await db.commit()
    
    return {
        "conversation_id": conversation_id,
        "message": "Conversation metadata updated successfully",
        "updated_metadata": {
            "conversation_type": conversation_type,
            "enabled_agents": enabled_agents,
            "primary_agent_type": primary_agent_type
        }
    }


