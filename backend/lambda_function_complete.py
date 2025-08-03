import os
import json
import time
import logging
import requests
import jwt
import base64
import re
import random
import string
import numpy as np
from datetime import datetime, date
from typing import Optional, Dict, Any, List, AsyncGenerator, cast, Literal
from passlib.context import CryptContext

# Database imports
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime, JSON, Boolean, select, text, or_, Text, Float
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy import Date
from sqlalchemy.dialects.postgresql import ARRAY

# FastAPI and authentication imports
from fastapi import FastAPI, HTTPException, Depends, Request, Response, Body, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi_users import FastAPIUsers, BaseUserManager, IntegerIDMixin
from fastapi_users.authentication import CookieTransport, AuthenticationBackend, JWTStrategy
from fastapi_users.password import PasswordHelper
from fastapi_users.db import SQLAlchemyUserDatabase, SQLAlchemyBaseUserTable
from fastapi.responses import Response
from fastapi_users.schemas import BaseUser, BaseUserCreate as FastAPIBaseUserCreate
from fastapi_users.router import ErrorCode
from fastapi_users.authentication.strategy.base import Strategy
from fastapi import APIRouter, Depends, HTTPException
from fastapi import FastAPI, Depends, Query
from fastapi import Body

# Pydantic imports
from pydantic import BaseModel, EmailStr, SecretStr

# LangChain and CrewAI imports
from langchain_openai import OpenAI, ChatOpenAI, OpenAIEmbeddings
from langchain.prompts import PromptTemplate, ChatPromptTemplate, MessagesPlaceholder
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain.memory import ConversationBufferMemory
from langchain.chains import LLMChain, ConversationChain
from langchain_core.runnables import RunnableConfig
from langchain.schema import Document

# CrewAI imports
from crewai import Agent, Crew, Task

# Google auth imports
from google.oauth2 import id_token
from google.auth.transport import requests as grequests

# Environment variables
from dotenv import load_dotenv
load_dotenv()

# Environment variables
DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
FIREBASE_CLIENT_ID = os.getenv("FIREBASE_CLIENT_ID")
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")

# Setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup - convert async URL to sync URL for Lambda compatibility
if DATABASE_URL is None:
    raise ValueError("DATABASE_URL environment variable is not set")

# Convert async URL to sync URL for Lambda compatibility
SYNC_DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+pg8000://")
engine = create_engine(SYNC_DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

Base = declarative_base()

# Database Models (100% copied from main.py)
class User(Base, SQLAlchemyBaseUserTable[int]):
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

# Pydantic models (100% copied from main.py)
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