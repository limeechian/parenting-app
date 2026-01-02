# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: chat.py
# Description: To handle AI chat endpoints and conversation management using CrewAI agents
# First Written on: Friday, 03-Oct-2025
# Edited on: Sunday, 10-Dec-2025

"""
Chat router - AI chat endpoints and conversation management

This router provides endpoints for:
- AI chat interactions (main chat endpoint with CrewAI agents)
- Conversation management (create, list, get messages, delete)
- Conversation summaries and metadata updates

The main chat endpoint integrates:
- OpenAI embeddings for semantic search
- pgvector for memory retrieval
- Diary entry context fetching
- Professional/resource/community recommendations
- CrewAI agent orchestration with automatic agent selection

All endpoints require authentication and enforce user ownership.
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Response, Body
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from datetime import datetime, date
from typing import Optional
import json
import hashlib
import time
import jwt
import sys
import re

from dependencies import get_current_user_flexible, get_session
from models.database import User, ParentProfile, ChildProfile, AiConversation, AiChatInteraction
from schemas.schemas import ChatInput
from utils.helpers import (
    get_openai_embedding,
    generate_conversation_title,
    calculate_age_from_birthdate,
    fetch_relevant_diary_entries,
    format_diary_entries_for_context,
    generate_conversation_summary,
    clean_response,
    analyze_query_for_recommendations,
    fetch_matching_professionals,
    fetch_matching_resources,
    fetch_matching_communities,
    format_recommendations_for_context
)
from config import SECRET_KEY, CORS_ORIGINS, logger
from crewai_agents import execute_crewai_response

# Initialize router with no prefix - routes are /api/chat, /api/conversations, etc.
router = APIRouter(prefix="", tags=["chat"])

# ============================================================================
# Helper Functions
# ============================================================================

def get_cors_headers(origin: Optional[str] = None) -> dict:
    """
    Get CORS headers for response
    
    Generates appropriate CORS headers based on the request origin.
    Used for cross-origin requests from frontend.
    
    Args:
        origin: Request origin header (optional)
    
    Returns:
        dict: CORS headers dictionary
    """
    allowed_origins = CORS_ORIGINS
    headers = {
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Accept-Language, Accept-Encoding, Referer, Origin",
        "Access-Control-Expose-Headers": "*",
        "Access-Control-Max-Age": "3600"
    }
    if origin and origin in allowed_origins:
        headers["Access-Control-Allow-Origin"] = origin
    else:
        headers["Access-Control-Allow-Origin"] = allowed_origins[0]
    return headers

# ============================================================================
# AI Chat Endpoints
# ============================================================================

@router.post("/chat")
async def chat(
    input: ChatInput,
    request: Request,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Main chat endpoint - handles AI chat interactions
    
    This is the core AI chat endpoint that processes user queries and generates
    intelligent responses using CrewAI agents. It integrates multiple data sources
    and AI capabilities:
    
    Flow:
    1. Fetches parent and child profiles for context
    2. Creates or retrieves conversation
    3. Generates query embedding for semantic search
    4. Retrieves similar past interactions (memories) using pgvector
    5. Fetches relevant diary entries for context
    6. Analyzes query and fetches recommendations (professionals, resources, communities)
    7. Builds comprehensive context for AI
    8. Executes CrewAI response with automatic agent selection
    9. Stores interaction with embeddings and metadata
    10. Updates conversation summary and metadata
    11. Returns response with recommendations
    
    Args:
        input: Chat input data (query, conversation_id, child_id, etc.)
        request: FastAPI Request object (for CORS headers)
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        JSONResponse: Response containing:
            - response: AI-generated response text
            - memories: Retrieved similar past interactions
            - child_id: Associated child ID
            - conversation_id: Conversation ID
            - agent_type: Agent that generated the response
            - recommendations: Optional recommendations (professionals, resources, communities)
    
    Raises:
        HTTPException:
            - 400 if parent profile not found
            - 404 if conversation not found
            - 500 if AI response generation fails
    """
    # 1. Fetch parent profile
    parent_result = await db.execute(select(ParentProfile).where(ParentProfile.user_id == user.user_id))
    parent_profile = parent_result.scalar_one_or_none()
    if not parent_profile:
        raise HTTPException(status_code=400, detail="Parent profile not found.")

    # 2. Fetch child profile (if provided and not 'general')
    child_profile = None
    if input.child_id and str(input.child_id).lower() != 'general':
        child_result = await db.execute(select(ChildProfile).where(
            ChildProfile.child_id == input.child_id,
            ChildProfile.user_id == user.user_id
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
            WHERE conversation_id = :conversation_id 
              AND user_id = :user_id 
              AND is_active = true
        ''')
        conv_result = await db.execute(conv_sql, {
            "conversation_id": input.conversation_id,
            "user_id": user.user_id
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
        # Determine conversation type and enabled agents based on conversation mode
        # Three conversation modes are supported:
        # 1. Manual mode: User explicitly selects one agent (input.manual_agent is set)
        #    - Only the selected agent is enabled
        #    - conversation_type = "agent-specific"
        #    - Agent selection is fixed (no auto-selection)
        # 2. Constrained auto mode: User enables 2-3 agents (input.enabled_agents is set)
        #    - Only the specified agents are enabled
        #    - conversation_type = "agent-specific"
        #    - Agent selection is automatic from the enabled subset
        # 3. Auto mode: No agent restrictions (default)
        #    - All agents are enabled
        #    - conversation_type = "general"
        #    - Agent selection is automatic from all agents
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
            enabled_agents = [input.manual_agent]  # Store the agent ID
            conversation_type = "agent-specific"
            primary_agent_type = selected_agent  # Store the full name
        elif input.enabled_agents and len(input.enabled_agents) > 0:
            # Constrained auto mode: 2-3 agents enabled - auto-select from enabled subset
            enabled_agents = input.enabled_agents  # Store the agent IDs
            conversation_type = "agent-specific"
            primary_agent_type = None  # Will be set based on selected agent
        else:
            # Auto mode: all agents enabled
            enabled_agents = ["parenting-style", "child-development", "crisis-intervention", "community-connector"]
            conversation_type = "general"
            primary_agent_type = None
        
        # Generate AI title
        child_name = child_profile.name if child_profile else None
        ai_title = await generate_conversation_title(input.query, child_name)
        
        # Create conversation using raw SQL to avoid embedding column issues
        preferred_style = getattr(parent_profile, 'preferred_communication_style', None) if parent_profile else None
        conv_insert_sql = text('''
            INSERT INTO ai_conversations 
            (user_id, child_id, title, conversation_type, primary_agent_type, enabled_agents, participating_agents, preferred_communication_style)
            VALUES (:user_id, :child_id, :title, :conversation_type, :primary_agent_type, :enabled_agents, :participating_agents, :preferred_communication_style)
            RETURNING conversation_id, user_id, child_id, title, conversation_type, primary_agent_type, enabled_agents, participating_agents
        ''')
        
        conv_result = await db.execute(conv_insert_sql, {
            "user_id": user.user_id,
            "child_id": input.child_id,
            "title": ai_title,
            "conversation_type": conversation_type,
            "primary_agent_type": primary_agent_type,
            "enabled_agents": json.dumps(enabled_agents),
            "participating_agents": json.dumps([]),
            "preferred_communication_style": preferred_style
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
                if isinstance(row.enabled_agents, str):
                    self.enabled_agents = json.loads(row.enabled_agents) if row.enabled_agents else []
                else:
                    self.enabled_agents = row.enabled_agents if row.enabled_agents else []
                if isinstance(row.participating_agents, str):
                    self.participating_agents = json.loads(row.participating_agents) if row.participating_agents else []
                else:
                    self.participating_agents = row.participating_agents if row.participating_agents else []
        
        conversation = ConversationFromDB(conv_row)

    # 4. Generate embedding for the query
    try:
        embedding = await get_openai_embedding(input.query)
    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")
        embedding = [0.0] * 1536

    # 5. Retrieve similar memories using pgvector (child-specific)
    k = 5
    is_child_specific = (conversation.child_id is not None and conversation.child_id != 0)
    
    try:
        if is_child_specific:
            sql = text('''
                SELECT aci.*, (aci.embedding <-> :embedding) AS distance
                FROM ai_chat_interactions aci
                LEFT JOIN ai_conversations c ON aci.conversation_id = c.conversation_id
                WHERE aci.user_id = :user_id 
                  AND aci.child_id = :child_id
                  AND (aci.conversation_id IS NULL OR c.is_active = true)
                ORDER BY aci.embedding <-> :embedding
                LIMIT :k
            ''')
            embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
            result = await db.execute(sql, {
                "embedding": embedding_str, 
                "user_id": user.user_id, 
                "child_id": conversation.child_id,
                "k": k
            })
            memories = result.fetchall()
        else:
            sql = text('''
                SELECT aci.*, (aci.embedding <-> :embedding) AS distance
                FROM ai_chat_interactions aci
                LEFT JOIN ai_conversations c ON aci.conversation_id = c.conversation_id
                WHERE aci.user_id = :user_id 
                  AND aci.child_id IS NULL
                  AND (aci.conversation_id IS NULL OR c.is_active = true)
                ORDER BY aci.embedding <-> :embedding
                LIMIT :k
            ''')
            embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
            result = await db.execute(sql, {"embedding": embedding_str, "user_id": user.user_id, "k": k})
            memories = result.fetchall()
    except Exception as e:
        logger.error(f"Failed to retrieve memories: {e}")
        memories = []
    
    # Calculate similarity scores from memory retrieval
    best_similarity = None
    average_similarity = None
    
    if memories:
        try:
            distances = [getattr(mem, 'distance', None) for mem in memories if hasattr(mem, 'distance')]
            if distances:
                similarities = []
                for distance in [d for d in distances if d is not None]:
                    similarity = max(0.0, min(1.0, 1.0 - (distance / 2.0)))
                    similarities.append(similarity)
                
                if similarities:
                    best_similarity = max(similarities)
                    average_similarity = sum(similarities) / len(similarities)
        except Exception as e:
            logger.debug(f"Error calculating similarity from memories: {e}")

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

    # 6.5. Fetch relevant diary entries for context
    diary_entries = []
    diary_context_text = ""
    try:
        diary_child_id = conversation.child_id if conversation.child_id else None
        entries, overflow_by_type, overall_trimmed = await fetch_relevant_diary_entries(
            user_id=user.user_id,
            child_id=diary_child_id,
            query=input.query,
            db=db,
            diary_window_days=input.diary_window_days,
            diary_types=input.diary_types,
            per_type_limit=input.per_type_limit,
            overall_limit=input.overall_limit,
        )
        
        if entries:
            diary_context_text = await format_diary_entries_for_context(entries, overflow_by_type, overall_trimmed)
    except Exception as e:
        logger.error(f"Failed to fetch diary entries for context: {e}")
        diary_context_text = ""

    # 7. Build context for LLM
    def map_preferred_style(style_val: Optional[str]) -> Optional[str]:
        if not style_val:
            return None
        style_val_lower = str(style_val).strip().lower()
        guidelines = {
            "direct": "Use a direct, clear tone. Provide short, actionable steps. Avoid fluff.",
            "gentle": "Use a gentle, validating tone. Acknowledge feelings. Offer gradual, low-pressure steps.",
            "detailed": "Provide structured, step-by-step guidance with brief rationale for each step.",
            "concise": "Be concise. Use bullet points. Prioritize key actions over context.",
            "encouraging": "Use a positive, strengths-based tone. Highlight what's working and motivate next steps.",
            "practical": "Focus on practical checklists, concrete examples, and ready-to-use scripts/templates.",
        }
        return guidelines.get(style_val_lower)

    preferred_style = getattr(parent_profile, 'preferred_communication_style', None)
    style_guidelines = map_preferred_style(preferred_style)

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
        
        special_needs = ensure_list(getattr(child_profile, 'special_needs', []))
        characteristics = ensure_list(getattr(child_profile, 'characteristics', []))
        current_challenges = ensure_list(getattr(child_profile, 'current_challenges', []))
        
        child_age = calculate_age_from_birthdate(child_profile.birthdate) if child_profile.birthdate else None
        age_str = f"{child_age} years old" if child_age is not None else "Age not specified"
        
        child_ctx = (
            f"Child Profile: {child_profile.name}, Age: {age_str}, Gender: {child_profile.gender}, "
            f"Education Level: {getattr(child_profile, 'education_level', 'Not specified')}, "
            f"Developmental Stage: {child_profile.developmental_stage}, "
            f"Special Needs: {', '.join(special_needs) if special_needs else 'None'}, "
            f"Characteristics: {', '.join(characteristics) if characteristics else 'None'}, "
            f"Current Challenges: {', '.join(current_challenges) if current_challenges else 'None'}, "
            f"Special Notes: {getattr(child_profile, 'special_notes', 'None')}"
        )
    
    style_ctx = f"STYLE GUIDELINES: {style_guidelines}\n" if style_guidelines else ""
    context = f"{style_ctx}{parent_ctx}\n{child_ctx}\n"
    
    if diary_context_text:
        context += f"\n{diary_context_text}\n"
    
    if memories_text:
        context += f"Relevant past Q&A:\n{memories_text}\n"

    # 8. Execute CrewAI response with automatic agent selection
    child_info = ""
    if child_profile:
        special_needs = ensure_list(getattr(child_profile, 'special_needs', []))
        characteristics = ensure_list(getattr(child_profile, 'characteristics', []))
        current_challenges = ensure_list(getattr(child_profile, 'current_challenges', []))
        
        child_age = calculate_age_from_birthdate(child_profile.birthdate) if child_profile.birthdate else None
        age_str = f"{child_age} years old" if child_age is not None else "Age not specified"
        
        child_info = (
            f"CHILD PROFILE DETAILS:\n"
            f"Name: {child_profile.name}\n"
            f"Age: {age_str}\n"
            f"Gender: {child_profile.gender}\n"
            f"Education Level: {getattr(child_profile, 'education_level', 'Not specified')}\n"
            f"Developmental Stage: {child_profile.developmental_stage}\n"
            f"Special Needs: {', '.join(special_needs) if special_needs else 'None'}\n"
            f"Characteristics: {', '.join(characteristics) if characteristics else 'None'}\n"
            f"Current Challenges: {', '.join(current_challenges) if current_challenges else 'None'}\n"
            f"Special Notes: {getattr(child_profile, 'special_notes', 'None')}"
        )

    if style_guidelines:
        child_info = (child_info + f"\n\nSTYLE GUIDELINES:\n{style_guidelines}") if child_info else f"STYLE GUIDELINES:\n{style_guidelines}"
    
    diary_info = ""
    if entries:
        diary_info = (
            f"\n\nRECENT DIARY ENTRIES INSIGHTS:\n"
            f"The parent has documented {len(entries)} recent diary entries that provide context:\n"
            f"- Review the diary entries context above for specific behaviors, challenges, strategies, and patterns\n"
            f"- Use this information to provide more personalized recommendations\n"
            f"- Reference successful interventions and strategies from the diary entries when relevant\n"
            f"- Consider mood patterns and stress levels documented in the entries\n"
            f"- Note any developmental progress or setbacks mentioned in milestone entries"
        )
    
    agent_mapping = {
        "parenting-style": "parenting_style",
        "child-development": "child_development", 
        "crisis-intervention": "crisis_intervention",
        "community-connector": "community_connector"
    }
    
    manual_agent = None
    enabled_agents_list = None
    if input.manual_agent and input.manual_agent in agent_mapping:
        manual_agent = agent_mapping[input.manual_agent]
    elif input.enabled_agents and len(input.enabled_agents) > 0:
        enabled_agents_list = input.enabled_agents
    
    # Determine which agent will be used (for recommendation analysis)
    selected_agent_id = manual_agent
    if not selected_agent_id and enabled_agents_list:
        # Will be determined by constrained selection, but we can use first enabled agent for analysis
        selected_agent_id = agent_mapping.get(enabled_agents_list[0], "parenting_style")
    if not selected_agent_id:
        # Auto mode - will be determined by determine_primary_agent, but we can analyze query
        from crewai_agents import determine_primary_agent
        selected_agent_id = determine_primary_agent(input.query, context)
    
    # 6.6. Analyze query and fetch recommendations
    recommendations_context = ""
    professionals = []
    resources = []
    communities = []
    
    try:
        # Analyze query to determine what recommendations to fetch
        should_fetch = analyze_query_for_recommendations(input.query, selected_agent_id)
        
        # Extract topics from query itself (not just diary)
        query_lower = input.query.lower()
        query_topics = []
        topic_keywords = ['sleep', 'behavior', 'tantrum', 'anxiety', 'adhd', 'development', 'learning', 
                        'social', 'emotional', 'feeding', 'routine', 'discipline', 'communication',
                        'therapy', 'therapist', 'counseling', 'autism', 'trauma', 'depression']
        query_topics = [topic for topic in topic_keywords if topic in query_lower]
        
        # Extract diary topics for matching
        diary_topics = []
        if diary_context_text:
            # Simple extraction: look for common parenting topics in diary text
            diary_lower = diary_context_text.lower()
            diary_topics = [topic for topic in topic_keywords if topic in diary_lower]
        
        # Combine query topics and diary topics (remove duplicates)
        all_topics = list(set(query_topics + diary_topics))
        
        # Build child profile dict for matching
        child_profile_dict = None
        if child_profile:
            child_profile_dict = {
                'developmental_stage': getattr(child_profile, 'developmental_stage', None),
                'special_needs': ensure_list(getattr(child_profile, 'special_needs', [])),
                'current_challenges': ensure_list(getattr(child_profile, 'current_challenges', []))
            }
        
        # Extract location from query first (user might mention location in query)
        query_location = None
        # Common Malaysian cities/states
        malaysian_locations = [
            'kuala lumpur', 'kl', 'selangor', 'petaling jaya', 'pj', 'penang', 'johor', 'johor bahru',
            'melaka', 'malacca', 'sabah', 'sarawak', 'kedah', 'perak', 'kelantan', 'terengganu',
            'pahang', 'negeri sembilan', 'perlis', 'putrajaya', 'labuan'
        ]
        for loc in malaysian_locations:
            if loc in query_lower:
                query_location = loc
                break
        
        # Get parent location for professional matching (fallback if not in query)
        parent_location = query_location
        if not parent_location and parent_profile:
            city = getattr(parent_profile, 'city', None)
            state = getattr(parent_profile, 'state', None)
            if city or state:
                parent_location = f"{city or ''} {state or ''}".strip()
        
        # Fetch recommendations based on analysis
        logger.info(f"🔍 Recommendation fetch decision: professionals={should_fetch.get('professionals', False)}, resources={should_fetch.get('resources', False)}, communities={should_fetch.get('communities', False)}")
        if should_fetch['professionals']:
            logger.info(f"Fetching professionals - topics: {all_topics}, location: {parent_location}, child_stage: {child_profile_dict.get('developmental_stage') if child_profile_dict else None}")
            professionals = await fetch_matching_professionals(
                diary_topics=all_topics,  # Use combined topics
                child_profile=child_profile_dict,
                parent_location=parent_location,
                db=db,
                limit=3
            )
            logger.info(f"Found {len(professionals)} professionals: {[p.get('business_name') for p in professionals]}")
        
        # Extract child-related information from query (age, developmental concerns, special needs)
        query_child_info = {}
        if query_lower:
            # Extract age from query (e.g., "3-year-old", "5 years old", "2 months")
            age_patterns = [
                r'(\d+)[-\s]?(?:year|yr|month|mo|week|wk)[\s-]?old',
                r'(\d+)\s*(?:years?|months?|weeks?)\s*old',
                r'age\s+(\d+)',
                r'(\d+)\s*years?\s*of\s*age'
            ]
            for pattern in age_patterns:
                match = re.search(pattern, query_lower)
                if match:
                    age_num = int(match.group(1))
                    # Map age to developmental stage if not already set
                    if not child_profile_dict or not child_profile_dict.get('developmental_stage'):
                        if age_num < 1:
                            query_child_info['developmental_stage'] = 'infant'
                        elif age_num < 2:
                            query_child_info['developmental_stage'] = 'toddler'
                        elif age_num < 6:
                            query_child_info['developmental_stage'] = 'early_childhood'
                        elif age_num < 12:
                            query_child_info['developmental_stage'] = 'middle_childhood'
                    break
            
            # Extract special needs/challenges from query
            special_needs_keywords = ['adhd', 'autism', 'asperger', 'dyslexia', 'sensory', 'down syndrome', 
                                     'developmental delay', 'speech delay', 'learning disability']
            query_special_needs = [kw for kw in special_needs_keywords if kw in query_lower]
            if query_special_needs:
                query_child_info['special_needs'] = query_special_needs
            
            # Extract challenges from query
            challenge_keywords = ['anxiety', 'depression', 'tantrum', 'meltdown', 'aggression', 
                                'sleep problem', 'feeding issue', 'communication difficulty']
            query_challenges = [kw for kw in challenge_keywords if kw in query_lower]
            if query_challenges:
                query_child_info['current_challenges'] = query_challenges
        
        # Enhance child_profile_dict with query-extracted information
        if query_child_info:
            if not child_profile_dict:
                child_profile_dict = {}
            # Merge query info with profile info (query info takes precedence for age/stage if provided)
            if 'developmental_stage' in query_child_info:
                child_profile_dict['developmental_stage'] = query_child_info['developmental_stage']
            if 'special_needs' in query_child_info:
                existing_needs = child_profile_dict.get('special_needs', [])
                child_profile_dict['special_needs'] = list(set(existing_needs + query_child_info['special_needs']))
            if 'current_challenges' in query_child_info:
                existing_challenges = child_profile_dict.get('current_challenges', [])
                child_profile_dict['current_challenges'] = list(set(existing_challenges + query_child_info['current_challenges']))
        
        if should_fetch['resources']:
            logger.info(f"Fetching resources - topics: {all_topics}, child_stage: {child_profile_dict.get('developmental_stage') if child_profile_dict else None}")
            resources = await fetch_matching_resources(
                diary_topics=all_topics,  # Use combined topics (query + diary)
                child_profile=child_profile_dict,
                db=db,
                limit=3
            )
            logger.info(f"Found {len(resources)} resources: {[r.get('title') for r in resources]}")
        
        if should_fetch['communities']:
            logger.info(f"Fetching communities - topics: {all_topics}, child_stage: {child_profile_dict.get('developmental_stage') if child_profile_dict else None}")
            communities = await fetch_matching_communities(
                diary_topics=all_topics,  # Use combined topics (query + diary)
                child_profile=child_profile_dict,
                db=db,
                limit=3
            )
            logger.info(f"Found {len(communities)} communities: {[c.get('name') for c in communities]}")
        
        # Format recommendations for context (only if non-empty)
        if professionals or resources or communities:
            recommendations_context = format_recommendations_for_context(
                professionals=professionals,
                resources=resources,
                communities=communities
            )
    except Exception as e:
        logger.error(f"Failed to fetch recommendations: {e}")
        recommendations_context = ""
    
    try:
        full_child_info = child_info + diary_info if child_info else diary_info
        
        # Add recommendations to context if available
        if recommendations_context:
            context += f"\n{recommendations_context}\n"
        
        crewai_start_time = time.time()
        
        crewai_result = await execute_crewai_response(
            query=input.query,
            context=context,
            child_info=full_child_info,
            manual_agent=manual_agent,
            enabled_agents=enabled_agents_list,
            preferred_style=preferred_style
        )
        
        crewai_end_time = time.time()
        response_time_ms_val = int((crewai_end_time - crewai_start_time) * 1000)
        
        style_result = crewai_result["response"]
        agent_type = crewai_result["agent_type"]
        model_version_val = crewai_result.get("model_version", "gpt-4o-mini")
        token_count_estimate_val = crewai_result.get("token_count", None)
        
        style_result = clean_response(style_result)
        
    except Exception as e:
        logger.error(f"Failed to generate AI response: {e}")
        import traceback
        traceback.print_exc()
        style_result = f"I apologize, but I encountered an error while processing your request. Please try again. Error: {str(e)}"
        agent_type = "AI Assistant"
        model_version_val = "gpt-4o-mini"
        token_count_estimate_val = None
        response_time_ms_val = 0

    # 9. Generate response embedding and prepare metadata
    try:
        response_embedding = await get_openai_embedding(style_result)
        response_embedding_str = "[" + ",".join(str(x) for x in response_embedding) + "]"
    except Exception as e:
        logger.error(f"Failed to generate response embedding: {e}")
        response_embedding = [0.0] * 1536
        response_embedding_str = "[" + ",".join(str(x) for x in response_embedding) + "]"
    
    diary_entry_ids_used_list = [e.get("entry_id") for e in entries if e.get("entry_id")]
    diary_types_used_list = list(set([e.get("entry_type") for e in entries if e.get("entry_type")]))
    
    if diary_context_text:
        if len(diary_context_text) > 500:
            truncated = diary_context_text[:500]
            last_newline = truncated.rfind('\n')
            last_space = truncated.rfind(' ')
            if last_newline > 450:
                diary_context_snippet = diary_context_text[:last_newline] + "..."
            elif last_space > 450:
                diary_context_snippet = diary_context_text[:last_space] + "..."
            else:
                diary_context_snippet = truncated + "..."
        else:
            diary_context_snippet = diary_context_text
    else:
        diary_context_snippet = None
    
    if input.diary_window_days:
        diary_window_days_val = input.diary_window_days
    elif entries:
        today = date.today()
        oldest_date = min([e.get("entry_date") for e in entries if e.get("entry_date")])
        if isinstance(oldest_date, str):
            oldest_date = datetime.fromisoformat(oldest_date).date()
        diary_window_days_val = (today - oldest_date).days
    else:
        diary_window_days_val = None
    
    parent_profile_snapshot_dict = {
        "relationship_with_child": getattr(parent_profile, 'relationship_with_child', None),
        "parenting_style": getattr(parent_profile, 'parenting_style', None),
        "preferred_communication_style": getattr(parent_profile, 'preferred_communication_style', None),
    } if parent_profile else None
    
    child_profile_snapshot_dict = None
    if child_profile:
        child_age = calculate_age_from_birthdate(child_profile.birthdate) if child_profile.birthdate else None
        child_profile_snapshot_dict = {
            "name": getattr(child_profile, 'name', None),
            "age": child_age,
            "developmental_stage": getattr(child_profile, 'developmental_stage', None),
            "special_needs": getattr(child_profile, 'special_needs', []) or [],
            "characteristics": getattr(child_profile, 'characteristics', []) or [],
        }
    
    context_hash_input = f"{input.query}|{diary_context_text}|{parent_profile_snapshot_dict}|{child_profile_snapshot_dict}"
    context_hash = hashlib.sha256(context_hash_input.encode()).hexdigest()
    
    full_context_length_val = len(context)
    
    retrieved_memory_ids_list = [mem.chat_id for mem in memories if hasattr(mem, 'chat_id')] if memories else []
    
    # Prepare recommendations for storage (if available)
    # Store ALL recommendation types: professionals, resources, AND communities
    recommendations_json = None
    try:
        if professionals or resources or communities:
            recommendations_dict = {}
            if professionals and len(professionals) > 0:
                recommendations_dict["professionals"] = professionals
                logger.info(f"Storing {len(professionals)} professionals in recommendations")
            if resources and len(resources) > 0:
                recommendations_dict["resources"] = resources
                logger.info(f"Storing {len(resources)} resources in recommendations")
            if communities and len(communities) > 0:
                recommendations_dict["communities"] = communities
                logger.info(f"Storing {len(communities)} communities in recommendations")
            
            if recommendations_dict:
                # Serialize to JSON string for database storage
                recommendations_json = json.dumps(recommendations_dict)
                logger.info(f"Successfully prepared recommendations JSON with keys: {list(recommendations_dict.keys())}")
            else:
                recommendations_json = None
    except Exception as e:
        logger.error(f"Failed to prepare recommendations for storage: {e}")
        import traceback
        traceback.print_exc()
        recommendations_json = None
    
    # Store new interaction in DB using raw SQL to handle embedding
    try:
        embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
        
        interaction_sql = text('''
            INSERT INTO ai_chat_interactions 
            (user_id, child_id, query, response, agent_type, embedding, query_embedding, response_embedding,
             retrieved_memories_pgvector, retrieved_memory_ids, conversation_id,
             diary_entry_ids_used, diary_context_snippet, diary_window_days, diary_types_used, diary_entries_count,
             parent_profile_snapshot, child_profile_snapshot, context_hash, full_context_length, response_time_ms, token_count_estimate, model_version, similarity_score, confidence_score, recommendations)
            VALUES (:user_id, :child_id, :query, :response, :agent_type, :embedding, :query_embedding, :response_embedding,
                    :retrieved_memories_pgvector, :retrieved_memory_ids, :conversation_id,
                    :diary_entry_ids_used, :diary_context_snippet, :diary_window_days, :diary_types_used, :diary_entries_count,
                    :parent_profile_snapshot, :child_profile_snapshot, :context_hash, :full_context_length, :response_time_ms, :token_count_estimate, :model_version, :similarity_score, :confidence_score, :recommendations)
        ''')
        
        await db.execute(interaction_sql, {
            "user_id": user.user_id,
            "child_id": conversation.child_id,
            "query": input.query,
            "response": style_result,
            "agent_type": agent_type,
            "embedding": embedding_str,
            "query_embedding": embedding_str,
            "response_embedding": response_embedding_str,
            "retrieved_memories_pgvector": memories_text,
            "retrieved_memory_ids": json.dumps(retrieved_memory_ids_list),
            "conversation_id": conversation.conversation_id,
            "diary_entry_ids_used": json.dumps(diary_entry_ids_used_list),
            "diary_context_snippet": diary_context_snippet,
            "diary_window_days": diary_window_days_val,
            "diary_types_used": json.dumps(diary_types_used_list),
            "diary_entries_count": len(diary_entry_ids_used_list),
            "parent_profile_snapshot": json.dumps(parent_profile_snapshot_dict) if parent_profile_snapshot_dict else None,
            "child_profile_snapshot": json.dumps(child_profile_snapshot_dict) if child_profile_snapshot_dict else None,
            "context_hash": context_hash,
            "full_context_length": full_context_length_val,
            "response_time_ms": response_time_ms_val,
            "token_count_estimate": token_count_estimate_val,
            "model_version": model_version_val,
            "similarity_score": average_similarity,
            "confidence_score": best_similarity,
            "recommendations": recommendations_json,
        })
    except Exception as e:
        logger.error(f"Failed to store interaction: {e}")
        import traceback
        traceback.print_exc()

    # 10. Update conversation participating agents and primary agent type
    if agent_type not in conversation.participating_agents:
        conversation.participating_agents.append(agent_type)
    
    if not conversation.primary_agent_type:
        conversation.primary_agent_type = agent_type
    else:
        agent_counts = {}
        for agent in conversation.participating_agents:
            agent_counts[agent] = agent_counts.get(agent, 0) + 1
        most_used_agent = max(agent_counts.items(), key=lambda x: x[1])[0]
        conversation.primary_agent_type = most_used_agent
    
    # 11. Generate conversation summary
    try:
        summary = await generate_conversation_summary(conversation.conversation_id, db)
        summary_embedding = await get_openai_embedding(summary)
        summary_embedding_str = "[" + ",".join(str(x) for x in summary_embedding) + "]"
    except Exception as e:
        logger.error(f"Failed to generate summary: {e}")
        summary = "Summary generation failed"
        summary_embedding_str = "[]"
    
    # 11.5. Aggregate diary entry IDs for conversation
    try:
        existing_diary_ids_sql = text('''
            SELECT diary_entry_ids_referenced 
            FROM ai_conversations 
            WHERE conversation_id = :conversation_id
        ''')
        existing_result = await db.execute(existing_diary_ids_sql, {"conversation_id": conversation.conversation_id})
        existing_row = existing_result.fetchone()
        existing_diary_ids = json.loads(existing_row.diary_entry_ids_referenced) if existing_row and existing_row.diary_entry_ids_referenced else []
        all_diary_ids = list(set(existing_diary_ids + diary_entry_ids_used_list))
    except Exception as e:
        logger.error(f"Failed to aggregate diary entry IDs: {e}")
        all_diary_ids = diary_entry_ids_used_list

    # 12. Prepare diary context summary and metadata
    diary_context_summary_val = None
    if diary_context_text:
        entry_count = len(diary_entry_ids_used_list)
        summary_start = diary_context_text[:800]
        if len(diary_context_text) > 800:
            last_newline = summary_start.rfind('\n')
            if last_newline > 600:
                summary_start = diary_context_text[:last_newline]
        diary_context_summary_val = f"Referenced {entry_count} diary entries: {summary_start}..."
    
    diary_lookback_date_range_val = None
    if entries:
        entry_dates = [e.get("entry_date") for e in entries if e.get("entry_date")]
        if entry_dates:
            if isinstance(entry_dates[0], str):
                entry_dates = [datetime.fromisoformat(d).date() if isinstance(d, str) else d for d in entry_dates]
            oldest_date = min(entry_dates)
            newest_date = max(entry_dates)
            diary_lookback_date_range_val = {
                "start_date": oldest_date.isoformat() if isinstance(oldest_date, date) else str(oldest_date),
                "end_date": newest_date.isoformat() if isinstance(newest_date, date) else str(newest_date),
                "window_days": diary_window_days_val
            }
    
    last_diary_context_hash_val = context_hash
    
    # Aggregate total token estimate for conversation
    try:
        existing_token_sql = text('''
            SELECT total_token_estimate 
            FROM ai_conversations 
            WHERE conversation_id = :conversation_id
        ''')
        existing_token_result = await db.execute(existing_token_sql, {"conversation_id": conversation.conversation_id})
        existing_token_row = existing_token_result.fetchone()
        existing_token_estimate = existing_token_row.total_token_estimate if existing_token_row and existing_token_row.total_token_estimate else 0
        
        if token_count_estimate_val is not None and token_count_estimate_val > 0:
            new_token_total = existing_token_estimate + token_count_estimate_val
        else:
            new_token_total = existing_token_estimate
    except Exception as e:
        logger.error(f"Failed to get existing token estimate: {e}")
        new_token_total = token_count_estimate_val if token_count_estimate_val else None

    # 12. Update conversation with new summary, embedding, and metadata
    try:
        conv_update_sql = text('''
            UPDATE ai_conversations 
            SET participating_agents = :participating_agents,
                primary_agent_type = :primary_agent_type,
                summary = :summary,
                summary_embedding = :summary_embedding,
                diary_entry_ids_referenced = :diary_entry_ids_referenced,
                diary_context_summary = :diary_context_summary,
                diary_lookback_date_range = :diary_lookback_date_range,
                last_diary_context_hash = :last_diary_context_hash,
                total_token_estimate = :total_token_estimate,
                total_interactions = total_interactions + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE conversation_id = :conversation_id
        ''')
        
        await db.execute(conv_update_sql, {
            "participating_agents": json.dumps(conversation.participating_agents),
            "primary_agent_type": conversation.primary_agent_type,
            "summary": summary,
            "summary_embedding": summary_embedding_str,
            "diary_entry_ids_referenced": json.dumps(all_diary_ids),
            "diary_context_summary": diary_context_summary_val,
            "diary_lookback_date_range": json.dumps(diary_lookback_date_range_val) if diary_lookback_date_range_val else None,
            "last_diary_context_hash": last_diary_context_hash_val,
            "total_token_estimate": new_token_total,
            "conversation_id": conversation.conversation_id
        })
    except Exception as e:
        logger.error(f"Failed to update conversation: {e}")
        import traceback
        traceback.print_exc()

    try:
        await db.commit()
    except Exception as e:
        logger.error(f"Failed to commit database transaction: {e}")
        await db.rollback()
        import traceback
        traceback.print_exc()

    # 13. Return response and conversation info
    def format_memory(memory):
        if hasattr(memory, '_mapping'):
            return dict(memory._mapping)
        elif hasattr(memory, '__dict__'):
            return memory.__dict__
        else:
            return dict(memory)
    
    def serialize_datetime(obj):
        """Recursively convert datetime objects to ISO format strings"""
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, date):
            return obj.isoformat()
        elif isinstance(obj, dict):
            return {key: serialize_datetime(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [serialize_datetime(item) for item in obj]
        elif isinstance(obj, tuple):
            return tuple(serialize_datetime(item) for item in obj)
        else:
            return obj
    
    # Prepare recommendations data for frontend (if available)
    # Include ALL recommendation types: professionals, resources, AND communities
    recommendations_data = {}
    try:
        if professionals and len(professionals) > 0:
            recommendations_data["professionals"] = professionals
        if resources and len(resources) > 0:
            recommendations_data["resources"] = resources
        if communities and len(communities) > 0:
            recommendations_data["communities"] = communities
        
        if recommendations_data:
            logger.info(f"Sending recommendations to frontend with keys: {list(recommendations_data.keys())}")
    except Exception as e:
        logger.error(f"Failed to prepare recommendations for frontend: {e}")
        # If variables not in scope, recommendations_data stays empty
    
    response_data = {
        "response": style_result,
        "memories": [serialize_datetime(format_memory(row)) for row in memories],
        "child_id": conversation.child_id,
        "conversation_id": conversation.conversation_id,
        "agent_type": agent_type
    }
    
    # Add recommendations if available
    if recommendations_data:
        response_data["recommendations"] = serialize_datetime(recommendations_data)
    
    # Serialize entire response to handle any remaining datetime objects
    response_data = serialize_datetime(response_data)
    
    origin = request.headers.get("origin")
    cors_headers = get_cors_headers(origin)
    
    response = JSONResponse(content=response_data)
    for key, value in cors_headers.items():
        response.headers[key] = value
    
    return response

# ============================================================================
# Conversation Management Endpoints
# ============================================================================

@router.options("/conversations")
async def options_conversations(request: Request):
    """
    Handle CORS preflight requests
    
    Handles OPTIONS requests for CORS preflight checks.
    
    Args:
        request: FastAPI Request object
    
    Returns:
        Response: Empty response with CORS headers
    """
    from fastapi.responses import Response as FastAPIResponse
    response = FastAPIResponse(status_code=200)
    origin = request.headers.get("origin")
    cors_headers = get_cors_headers(origin)
    for key, value in cors_headers.items():
        response.headers[key] = value
    return response

@router.get("/conversations")
async def get_conversations(
    request: Request,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Get all conversations for the current user with their latest messages
    
    Retrieves all active conversations for the authenticated user.
    Includes conversation metadata, child information, and the last message.
    
    Args:
        request: FastAPI Request object (for CORS headers)
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        JSONResponse: List of conversation objects with metadata
    
    Raises:
        HTTPException: If conversation retrieval fails
    """
    try:
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
                cp.birthdate as child_birthdate,
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
            WHERE c.user_id = :user_id AND c.is_active = true
            ORDER BY c.updated_at DESC
        ''')
        
        result = await db.execute(sql, {"user_id": user.user_id})
        conversations = result.fetchall()
        
        formatted_conversations = []
        for conv in conversations:
            try:
                child_name = None
                if conv.child_name:
                    child_name = conv.child_name
                
                if conv.child_id:
                    child_check_result = await db.execute(select(ChildProfile).where(
                        ChildProfile.child_id == conv.child_id,
                        ChildProfile.user_id == user.user_id
                    ))
                    child_exists = child_check_result.scalar_one_or_none()
                    if not child_exists:
                        continue
                
                participating_agents = []
                if conv.participating_agents:
                    if isinstance(conv.participating_agents, str):
                        try:
                            participating_agents = json.loads(conv.participating_agents)
                        except:
                            participating_agents = [conv.participating_agents]
                    elif isinstance(conv.participating_agents, list):
                        participating_agents = conv.participating_agents
                
                enabled_agents = []
                if conv.enabled_agents:
                    if isinstance(conv.enabled_agents, str):
                        try:
                            enabled_agents = json.loads(conv.enabled_agents)
                        except:
                            enabled_agents = [conv.enabled_agents]
                    elif isinstance(conv.enabled_agents, list):
                        enabled_agents = conv.enabled_agents
                
                last_updated = None
                if conv.last_message_time:
                    last_updated = conv.last_message_time.isoformat() if hasattr(conv.last_message_time, 'isoformat') else str(conv.last_message_time)
                elif conv.updated_at:
                    last_updated = conv.updated_at.isoformat() if hasattr(conv.updated_at, 'isoformat') else str(conv.updated_at)
                
                formatted_conversation = {
                    "id": str(conv.conversation_id),
                    "title": conv.title or "New conversation",
                    "childId": str(conv.child_id) if conv.child_id is not None else None,
                    "childName": child_name,
                    "lastMessage": conv.last_message or "No messages yet",
                    "lastUpdated": last_updated,
                    "participatingAgents": participating_agents,
                    "conversationType": conv.conversation_type,
                    "primaryAgentType": conv.primary_agent_type,
                    "enabledAgents": enabled_agents,
                    "messages": []
                }
                
                formatted_conversations.append(formatted_conversation)
            except Exception as e:
                logger.error(f"Error formatting conversation {conv.conversation_id if hasattr(conv, 'conversation_id') else 'unknown'}: {str(e)}")
                continue
        
        origin = request.headers.get("origin")
        cors_headers = get_cors_headers(origin)
        
        response = JSONResponse(content=formatted_conversations)
        for key, value in cors_headers.items():
            response.headers[key] = value
        
        return response
    except Exception as e:
        logger.error(f"Error in get_conversations: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch conversations: {str(e)}")

@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: int,
    request: Request,
    db: AsyncSession = Depends(get_session)
):
    """
    Get all messages for a specific conversation
    
    Retrieves all messages (user queries and AI responses) for a conversation.
    Verifies conversation ownership and includes recommendations if available.
    
    Args:
        conversation_id: ID of the conversation
        request: FastAPI Request object (contains authentication cookie)
        db: Database session (from dependency injection)
    
    Returns:
        List[dict]: List of message objects with user queries and AI responses
    
    Raises:
        HTTPException:
            - 401 if not authenticated
            - 403 if user doesn't own the conversation
            - 404 if conversation not found or inactive
            - 500 if message retrieval fails
    """
    auth_cookie = request.cookies.get("fastapi-users-auth-jwt")
    if not auth_cookie:
        raise HTTPException(status_code=401, detail="No authentication cookie found")
    
    try:
        try:
            decoded = jwt.decode(auth_cookie, SECRET_KEY or "", algorithms=["HS256"])
        except:
            decoded = jwt.decode(auth_cookie, SECRET_KEY or "", algorithms=["HS256"], audience=["fastapi-users:auth"])
        
        user_id = int(decoded.get("sub"))
        user_result = await db.execute(select(User).where(User.user_id == user_id))
        user = user_result.scalar_one_or_none()
        
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not authenticated")
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")
    
    try:
        conv_check_sql = text('''
            SELECT conversation_id, title, child_id, user_id, is_active
            FROM ai_conversations
            WHERE conversation_id = :conversation_id
        ''')
        conv_check_result = await db.execute(conv_check_sql, {"conversation_id": conversation_id})
        conv_check = conv_check_result.fetchone()
        
        if not conv_check:
            logger.warning(f"Conversation {conversation_id} not found in database for user {user.user_id}")
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if not conv_check.is_active:
            logger.warning(f"Conversation {conversation_id} is inactive (soft-deleted) for user {user.user_id}")
            raise HTTPException(status_code=404, detail="Conversation not found or has been deleted")
        
        if conv_check.user_id != user.user_id:
            logger.warning(f"User {user.user_id} attempted to access conversation {conversation_id} owned by user {conv_check.user_id}")
            raise HTTPException(status_code=403, detail="Access denied")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error checking conversation: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    
    try:
        messages_sql = text('''
            SELECT chat_id, user_id, child_id, query, response, agent_type, 
                   generated_at, retrieved_memories_pgvector, conversation_id, recommendations
            FROM ai_chat_interactions
            WHERE conversation_id = :conversation_id
            ORDER BY generated_at
        ''')
        
        messages_result = await db.execute(messages_sql, {"conversation_id": conversation_id})
        messages = messages_result.fetchall()
        logger.info(f"Found {len(messages)} messages for conversation {conversation_id}")
    except Exception as e:
        logger.error(f"Database error fetching messages for conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail="Database error fetching messages")
    
    formatted_messages = []
    for msg in messages:
        formatted_messages.append({
            "id": str(msg.chat_id),
            "content": msg.query,
            "sender": "user",
            "timestamp": msg.generated_at.isoformat(),
            "type": "text"
        })
        
        references = []
        if msg.retrieved_memories_pgvector:
            try:
                memory_lines = msg.retrieved_memories_pgvector.split('\n')
                for line in memory_lines:
                    if 'you asked:' in line or 'AI replied:' in line:
                        references.append(line.strip())
            except:
                references = [msg.retrieved_memories_pgvector]
        
        # Parse recommendations from database (if available)
        # This includes professionals, resources, AND communities
        recommendations_data = None
        if hasattr(msg, 'recommendations') and msg.recommendations:
            try:
                recommendations_data = json.loads(msg.recommendations) if isinstance(msg.recommendations, str) else msg.recommendations
                if recommendations_data:
                    # Log what types of recommendations were retrieved
                    rec_types = []
                    if recommendations_data.get('professionals'):
                        rec_types.append(f"{len(recommendations_data.get('professionals', []))} professionals")
                    if recommendations_data.get('resources'):
                        rec_types.append(f"{len(recommendations_data.get('resources', []))} resources")
                    if recommendations_data.get('communities'):
                        rec_types.append(f"{len(recommendations_data.get('communities', []))} communities")
                    if rec_types:
                        logger.info(f"Retrieved recommendations from database for message {msg.chat_id}: {', '.join(rec_types)}")
            except Exception as e:
                logger.error(f"Failed to parse recommendations from database for message {msg.chat_id}: {e}")
                import traceback
                traceback.print_exc()
                recommendations_data = None
        
        formatted_messages.append({
            "id": f"{msg.chat_id}_response",
            "content": msg.response,
            "sender": "ai",
            "timestamp": msg.generated_at.isoformat(),
            "type": "text",
            "agent": msg.agent_type,
            "confidence": 85,
            "references": references,
            "recommendations": recommendations_data
        })
    
    return formatted_messages

@router.post("/conversations/{conversation_id}/generate-summary")
async def generate_conversation_summary_endpoint(
    conversation_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Generate or regenerate a summary for a specific conversation
    
    Generates an AI-powered summary of the conversation using all messages.
    Updates the conversation record with the summary and its embedding.
    
    Args:
        conversation_id: ID of the conversation
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Summary data with conversation_id and summary text
    
    Raises:
        HTTPException:
            - 404 if conversation not found or user doesn't own it
            - 500 if summary generation fails
    """
    conv_sql = text('''
        SELECT conversation_id, title, child_id, user_id, is_active
        FROM ai_conversations
        WHERE conversation_id = :conversation_id AND user_id = :user_id
    ''')
    conv_result = await db.execute(conv_sql, {
        "conversation_id": conversation_id,
        "user_id": user.user_id
    })
    conversation = conv_result.fetchone()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if not conversation.is_active:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    summary = await generate_conversation_summary(conversation_id, db)
    summary_embedding = await get_openai_embedding(summary)
    summary_embedding_str = "[" + ",".join(str(x) for x in summary_embedding) + "]"
    
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

@router.post("/conversations/{conversation_id}/end")
async def end_conversation(
    conversation_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Mark a conversation as ended
    
    Soft-deletes a conversation by setting is_active=false and ended_at timestamp.
    Verifies ownership before ending.
    
    Args:
        conversation_id: ID of the conversation to end
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Success message with conversation_id
    
    Raises:
        HTTPException:
            - 404 if conversation not found or user doesn't own it
            - 500 if conversation ending fails
    """
    conv_sql = text('''
        SELECT conversation_id, title, child_id, user_id
        FROM ai_conversations
        WHERE conversation_id = :conversation_id AND user_id = :user_id
    ''')
    conv_result = await db.execute(conv_sql, {
        "conversation_id": conversation_id,
        "user_id": user.user_id
    })
    conversation = conv_result.fetchone()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    update_sql = text('''
        UPDATE ai_conversations 
        SET ended_at = CURRENT_TIMESTAMP,
            is_active = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE conversation_id = :conversation_id
    ''')
    
    await db.execute(update_sql, {"conversation_id": conversation_id})
    await db.commit()
    
    return {
        "conversation_id": conversation_id,
        "message": "Conversation ended successfully"
    }

@router.put("/conversations/{conversation_id}/update-metadata")
async def update_conversation_metadata(
    conversation_id: int,
    metadata: dict = Body(...),
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Update conversation metadata
    
    Updates conversation metadata such as conversation_type, enabled_agents,
    and primary_agent_type. Verifies ownership before updating.
    
    Args:
        conversation_id: ID of the conversation
        metadata: Metadata to update (from request body)
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Success message with updated metadata
    
    Raises:
        HTTPException:
            - 404 if conversation not found or user doesn't own it
            - 500 if metadata update fails
    """
    conv_sql = text('''
        SELECT conversation_id, title, child_id, user_id, is_active
        FROM ai_conversations
        WHERE conversation_id = :conversation_id AND user_id = :user_id
    ''')
    conv_result = await db.execute(conv_sql, {
        "conversation_id": conversation_id,
        "user_id": user.user_id
    })
    conversation = conv_result.fetchone()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if not conversation.is_active:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation_type = metadata.get("conversation_type", "general")
    enabled_agents = metadata.get("enabled_agents", [])
    primary_agent_type = metadata.get("primary_agent_type")
    
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

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Delete a conversation (soft delete)
    
    Soft-deletes a conversation by setting is_active=false.
    Verifies ownership before deletion. Messages are preserved.
    
    Args:
        conversation_id: ID of the conversation to delete
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Success message with conversation_id
    
    Raises:
        HTTPException:
            - 404 if conversation not found or user doesn't own it
            - 500 if conversation deletion fails
    """
    conv_sql = text('''
        SELECT conversation_id, title, child_id, user_id, is_active
        FROM ai_conversations
        WHERE conversation_id = :conversation_id AND user_id = :user_id
    ''')
    conv_result = await db.execute(conv_sql, {
        "conversation_id": conversation_id,
        "user_id": user.user_id
    })
    conversation = conv_result.fetchone()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    update_sql = text('''
        UPDATE ai_conversations 
        SET is_active = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE conversation_id = :conversation_id
    ''')
    
    await db.execute(update_sql, {"conversation_id": conversation_id})
    await db.commit()
    
    return {
        "conversation_id": conversation_id,
        "message": "Conversation deleted successfully"
    }

