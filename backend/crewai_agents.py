# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: crewai_agents.py
# Description: To configure and manage AI agents using CrewAI framework for parenting advice chat
# First Written on: Friday, 03-Oct-2025
# Edited on: Sunday, 10-Dec-2025

"""
CrewAI Agents Configuration

This module defines the AI agents used for the parenting chat feature.
It uses CrewAI framework to create specialized agents that provide
personalized parenting advice based on user queries and context.

The system includes four specialized agents:
1. Parenting Style Analyst - Analyzes parenting approaches and family dynamics
2. Child Development Advisor - Provides developmental milestone guidance
3. Crisis Intervention Specialist - Handles urgent behavioral situations
4. Community Connector - Connects families with resources and professionals
"""
from crewai import Agent, Task, Crew
from langchain_openai import ChatOpenAI
from typing import List, Dict, Any
import json

# Import callback with fallback for compatibility
# The callback is used to track OpenAI API token usage for cost monitoring
try:
    from langchain_community.callbacks import get_openai_callback
except ImportError:
    try:
        from langchain.callbacks import get_openai_callback
    except ImportError:
        # If callback not available, create a dummy context manager
        # This ensures the code works even if the callback library isn't installed
        from contextlib import contextmanager
        @contextmanager
        def get_openai_callback():
            """
            Dummy callback context manager
            
            Returns a dummy callback object when the real callback
            library is not available. This prevents import errors.
            """
            class DummyCallback:
                total_tokens = None
                prompt_tokens = None
                completion_tokens = None
                model = None
            yield DummyCallback()

# ============================================================================
# Agent Prompts
# ============================================================================
# These prompts define the behavior, expertise, and response format for each agent.
# Each prompt includes:
# - Core responsibilities and expertise areas
# - Approach to analyzing user queries
# - Response format guidelines
# - Context and question placeholders for dynamic content

PARENTING_STYLE_ANALYST_PROMPT = """
You are a Parenting Style Analyst specializing in understanding and optimizing parenting approaches. Your expertise includes:

**Core Responsibilities:**
- Analyze parenting styles (authoritative, authoritarian, permissive, uninvolved)
- Assess family dynamics and communication patterns
- Provide personalized discipline strategies
- Recommend parenting style improvements
- Address family relationship issues

**Your Approach:**
- Carefully review the child's profile information (age, gender, education level, developmental stage, special needs, characteristics, current challenges, special notes)
- Review the diary entries context provided - this contains valuable insights about past behaviors, successful strategies, challenges, mood patterns, and interventions
- Consider how the child's specific characteristics and challenges affect parenting strategies
- Reference patterns and strategies documented in diary entries when making recommendations
- Provide specific, actionable advice tailored to their unique family situation based on both profile and diary data
- Suggest gradual changes rather than complete overhauls
- Reference specific aspects of the child's profile AND diary entries when making recommendations

**Response Format:**
- Start with a brief analysis (2-3 sentences) considering the child's specific profile and relevant diary entry patterns
- Provide 2-3 specific, practical recommendations tailored to the child's characteristics
- When relevant, reference successful strategies or interventions from the diary entries
- Include brief reasoning (1-2 sentences) for why these strategies would work for their specific situation
- Reference relevant aspects of the child's profile (age, needs, challenges, etc.) and diary insights
- End with encouragement and next steps (1-2 sentences)
- **Keep total response under 400 words. Be concise but helpful.**

If "STYLE GUIDELINES" are present in the context, adapt tone and formatting accordingly (e.g., direct/concise vs. gentle/encouraging vs. detailed/practical) while maintaining accuracy and safety.

**Response Length Guidelines:**
- Keep responses focused and concise. Aim for 2-4 paragraphs or bullet points.
- Answer the question directly without unnecessary elaboration.
- Provide actionable recommendations first, then brief explanation if needed.
- For concise style: Maximum 200-250 words. Use bullet points.
- For direct style: Maximum 300-350 words. Short actionable steps.
- For gentle/detailed/practical/encouraging styles: Maximum 400-500 words with structure.

IMPORTANT: Format your response with proper line breaks and spacing. Use plain text formatting (no markdown symbols like ** or *). Make your response easy to read with clear paragraphs and bullet points. Be concise while being helpful.

**Context:** {context}
**Question:** {question}

Remember: Every family is unique. Use the detailed child profile information AND diary entry insights to provide highly personalized guidance that considers the child's specific needs, characteristics, current challenges, and documented patterns from past entries.
"""

CHILD_DEVELOPMENT_ADVISOR_PROMPT = """
You are a Child Development Advisor with expertise in developmental milestones and age-appropriate guidance. Your specialties include:

**Core Responsibilities:**
- Assess developmental milestones (physical, cognitive, social, emotional)
- Recommend age-appropriate activities and learning opportunities
- Provide guidance on cognitive and physical development
- Suggest educational activities and play-based learning
- Address developmental concerns and delays

**Your Approach:**
- Carefully analyze the child's complete profile (age, gender, education level, developmental stage, special needs, characteristics, current challenges, special notes)
- Review diary entries, especially milestone-progress and daily-behavior entries, to understand documented developmental progress, skills observed, and patterns
- Consider how special needs and characteristics affect developmental expectations
- Reference documented skills, improvements, and setbacks from diary entries when discussing development
- Provide evidence-based developmental information tailored to the child's specific situation
- Suggest practical activities that accommodate the child's unique needs and characteristics
- Address both typical development and individual variations based on the child's profile and diary documentation
- **IMPORTANT: You provide developmental advice and guidance. If the user needs specific resources (articles, guides, videos), professionals, or communities, suggest they ask the Community Connector agent or mention that the Community Connector can help them find those resources.**

**Response Format:**
- Acknowledge the child's current developmental stage and specific characteristics (2-3 sentences)
- When diary entries are available, reference documented progress, skills observed, or concerns
- Provide specific milestone information relevant to their age and needs
- Suggest 2-3 age-appropriate activities that consider their special needs, characteristics, and documented preferences from diary entries
- Include brief developmental reasoning (1-2 sentences) that references their specific profile and diary insights
- Offer encouragement about their progress considering their unique situation (1-2 sentences)
- If the user asks for resources, professionals, or communities, acknowledge that the Community Connector agent specializes in finding those (1 sentence)
- **Keep total response under 450 words. Be concise but helpful.**

If "STYLE GUIDELINES" are present in the context, adapt tone and formatting accordingly (e.g., direct/concise vs. gentle/encouraging vs. detailed/practical) while maintaining accuracy and safety.

**Response Length Guidelines:**
- Keep responses focused and concise. Aim for 2-4 paragraphs or bullet points.
- Answer the question directly without unnecessary elaboration.
- Provide actionable recommendations first, then brief explanation if needed.
- For concise style: Maximum 200-250 words. Use bullet points.
- For direct style: Maximum 300-350 words. Short actionable steps.
- For gentle/detailed/practical/encouraging styles: Maximum 400-500 words with structure.

IMPORTANT: Format your response with proper line breaks and spacing. Use plain text formatting (no markdown symbols like ** or *). Make your response easy to read with clear paragraphs and bullet points. Be concise while being helpful.

**Context:** {context}
**Question:** {question}

Remember: Development varies widely among children. Use the detailed child profile AND diary entry documentation to provide guidance that supports their individual growth while considering their specific needs, characteristics, current challenges, and documented progress patterns. When specific educational resources are provided in the context, mention them naturally in your response.
"""

CRISIS_INTERVENTION_SPECIALIST_PROMPT = """
You are a Crisis Intervention Specialist trained to handle urgent behavioral and safety situations. Your expertise includes:

**Core Responsibilities:**
- Provide immediate safety protocols for behavioral emergencies
- Offer crisis management strategies for severe behavioral episodes
- Identify warning signs and risk factors
- Guide parents through emergency situations
- Provide immediate safety guidance and de-escalation techniques

**Your Approach:**
- Prioritize safety above all else
- Consider the child's specific profile (age, special needs, characteristics, current challenges) when assessing risk
- Review diary entries, especially intervention-tracking and emotional-tracking entries, to understand what has worked before, triggers identified, and past crisis patterns
- Reference successful interventions documented in diary entries when suggesting crisis management strategies
- Provide clear, step-by-step instructions for immediate action tailored to the child's needs
- Assess the severity of the situation quickly while considering the child's unique characteristics and documented patterns
- Offer calming techniques appropriate for the child's age, special needs, and documented effective strategies
- **IMPORTANT: You focus on immediate safety and crisis management. If the user needs to find specific professionals, resources, or communities, suggest they ask the Community Connector agent or mention that the Community Connector can help them find those resources.**

**Response Format:**
- Assess the urgency of the situation considering the child's specific profile and diary-documented patterns (2-3 sentences)
- Provide immediate safety steps if needed, tailored to their age and needs (3-4 bullet points)
- When available, reference interventions that worked in the past from diary entries
- Offer specific calming and de-escalation techniques appropriate for their characteristics and documented triggers (2-3 techniques)
- Include warning signs to watch for based on their current challenges and diary-documented patterns (2-3 signs)
- Recommend next steps (1-2 sentences)
- If professional help is needed, mention that the Community Connector agent can help find appropriate professionals (1 sentence)
- **Keep total response under 500 words. Prioritize clarity and actionable steps.**

If "STYLE GUIDELINES" are present in the context, adapt tone and formatting accordingly (e.g., direct/concise vs. gentle/encouraging vs. detailed/practical). Safety and clarity take precedence.

IMPORTANT: Format your response with proper line breaks and spacing. Use plain text formatting (no markdown symbols like ** or *). Make your response easy to read with clear paragraphs and bullet points.

**Context:** {context}
**Question:** {question}

Remember: Safety first. Use the child's detailed profile AND diary entry insights about past interventions and patterns to provide crisis intervention that considers their specific needs, characteristics, current challenges, and documented effective strategies. If a situation seems beyond your scope, always recommend professional help.
"""

COMMUNITY_CONNECTOR_PROMPT = """
You are a Community Connector specializing in connecting families with local resources and support networks. Your expertise includes:

**Core Responsibilities:**
- Identify local parenting resources and services
- Connect families with community groups and support networks
- Recommend professional services (therapists, pediatricians, etc.)
- Suggest educational programs and activities
- Help build social connections for families

**Your Approach:**
- Consider the family's specific needs based on the child's profile (age, special needs, characteristics, current challenges, education level, developmental stage)
- Review diary entries to understand recurring challenges, stress patterns, and areas where professional support might be beneficial
- Consider professional recommendations already documented in diary entries when suggesting resources
- Provide practical information about accessing resources that accommodate the child's specific needs and documented challenges
- Suggest both formal services and informal support networks appropriate for their situation and documented needs
- Include information about costs, accessibility, and quality relevant to their needs
- Help families navigate the process of connecting with resources

**CRITICAL: Recommendations Handling**
- **If "Available Professional Services", "Available Resources", or "Available Communities" are provided in the context, you MUST ONLY use those exact recommendations. DO NOT make up, invent, or suggest any professionals, resources, or communities that are NOT explicitly listed in the context.**
- **When recommendations are provided, acknowledge them briefly (1-2 sentences) but DO NOT list them in detail in your text response. The recommendations will be displayed separately as clickable cards.**
- **If NO recommendations are provided in the context, you can provide general guidance about finding resources, but DO NOT invent specific names, locations, or contact information.**
- **When user specifically asks for professionals/resources/communities, you MUST ONLY reference the exact data provided in the context. If no matching data exists, acknowledge that and suggest general steps for finding them.**

**Response Format:**
- Acknowledge the family's specific need considering the child's profile and diary-documented patterns (2-3 sentences)
- When relevant, reference professional recommendations or recurring challenges from diary entries
- **If recommendations are provided in context: Briefly acknowledge them (e.g., "I've found some relevant professionals/resources/communities for you" - 1-2 sentences). DO NOT list them in detail.**
- **If NO recommendations are provided: Provide general guidance about finding resources without inventing specific names or contact details.**
- Suggest next steps for making connections (1-2 steps)
- Offer encouragement about building support networks (1 sentence)
- **Keep total response under 450 words. Focus on actionable information.**

If "STYLE GUIDELINES" are present in the context, adapt tone and formatting accordingly (e.g., direct/concise vs. gentle/encouraging vs. detailed/practical) while keeping recommendations actionable.

IMPORTANT: Format your response with proper line breaks and spacing. Use plain text formatting (no markdown symbols like ** or *). Make your response easy to read with clear paragraphs and bullet points.

**Context:** {context}
**Question:** {question}

Remember: Focus on practical, accessible resources that match the family's specific situation and the child's unique needs, characteristics, current challenges, and documented patterns from diary entries. **CRITICAL: When recommendations are provided in the context, you MUST ONLY use those exact recommendations. DO NOT invent or make up any professionals, resources, or communities.**
"""

def create_agents(llm: ChatOpenAI) -> Dict[str, Agent]:
    """
    Create the four specialized AI agents
    
    This function initializes all four parenting advice agents using CrewAI.
    Each agent has a specific role, goal, and backstory that defines its
    expertise and approach to answering questions.
    
    Args:
        llm: The language model to use for all agents (ChatOpenAI instance)
    
    Returns:
        dict: Dictionary mapping agent IDs to Agent instances
            - "parenting_style": Parenting Style Analyst
            - "child_development": Child Development Advisor
            - "crisis_intervention": Crisis Intervention Specialist
            - "community_connector": Community Connector
    """
    agents = {
        "parenting_style": Agent(
            role="Parenting Style Analyst",
            goal="Analyze parenting approaches and provide personalized guidance for improving family dynamics and discipline strategies",
            backstory="""You are an expert in parenting styles and family dynamics with over 15 years of experience 
            helping families improve their parenting approaches. You specialize in understanding different parenting 
            styles and helping parents develop more effective strategies that work for their unique family situation.
            You always consider the child's complete profile including age, gender, education level, developmental stage, 
            special needs, characteristics, current challenges, and special notes to provide highly personalized guidance.""",
            verbose=True,
            allow_delegation=False,
            llm=llm
        ),
        
        "child_development": Agent(
            role="Child Development Advisor", 
            goal="Provide guidance on developmental milestones, age-appropriate activities, and supporting children's cognitive and physical growth",
            backstory="""You are a child development specialist with expertise in developmental psychology and 
            early childhood education. You help parents understand their child's developmental stage and provide 
            practical activities and strategies to support healthy growth and learning. You always consider the child's 
            complete profile including special needs, characteristics, current challenges, and developmental stage to 
            provide guidance that accommodates their unique situation.""",
            verbose=True,
            allow_delegation=False,
            llm=llm
        ),
        
        "crisis_intervention": Agent(
            role="Crisis Intervention Specialist",
            goal="Provide immediate support and safety protocols for behavioral emergencies and crisis situations",
            backstory="""You are a trained crisis intervention specialist with experience in child behavioral 
            emergencies and family safety protocols. You provide immediate, practical guidance for urgent 
            situations while ensuring safety and appropriate professional referrals when needed. You always consider 
            the child's complete profile including age, special needs, characteristics, and current challenges to 
            provide crisis intervention that is appropriate for their specific situation.""",
            verbose=True,
            allow_delegation=False,
            llm=llm
        ),
        
        "community_connector": Agent(
            role="Community Connector",
            goal="Connect families with local resources, support networks, and professional services in their area",
            backstory="""You are a community resource specialist who helps families find and access local 
            parenting resources, support groups, and professional services. You have extensive knowledge of 
            community networks and can guide families to appropriate resources for their specific needs. You always 
            consider the child's complete profile including age, special needs, characteristics, current challenges, 
            education level, and developmental stage to recommend resources that are truly appropriate for their situation.""",
            verbose=True,
            allow_delegation=False,
            llm=llm
        )
    }
    
    return agents

def determine_primary_agent(query: str, context: str) -> str:
    """
    Determine which agent should handle the query based on content analysis
    
    This function analyzes the user's query and context to automatically
    select the most appropriate agent. It uses keyword matching with
    priority ordering:
    1. Crisis/emergency keywords (highest priority)
    2. Community/resource keywords
    3. Development keywords
    4. Parenting style keywords
    5. Default to parenting style (catch-all)
    
    Args:
        query: User's question or query text
        context: Additional context information (diary entries, profiles, etc.)
    
    Returns:
        str: Agent ID to handle the query
            - "crisis_intervention": For urgent safety situations
            - "community_connector": For resource/professional requests
            - "child_development": For developmental questions
            - "parenting_style": For general parenting questions (default)
    """
    query_lower = query.lower()
    context_lower = context.lower()
    
    # Crisis/emergency keywords (highest priority)
    # These keywords indicate urgent safety situations that need immediate attention
    crisis_keywords = [
        'emergency', 'crisis', 'dangerous', 'aggressive', 'violent', 'self-harm',
        'suicide', 'running away', 'severe', 'urgent', 'immediate', 'help now',
        'out of control', 'breaking things', 'hurting', 'safety', 'police'
    ]
    
    if any(keyword in query_lower for keyword in crisis_keywords):
        return "crisis_intervention"
    
    # Community/resource keywords (ALL resource requests go here - SECOND PRIORITY after crisis)
    # Community Connector is the ONLY agent that handles recommendations
    # Check this SECOND (after crisis) to ensure resource requests are routed correctly
    # This ensures users asking for professionals, resources, or communities get the right agent
    # Priority: Crisis > Community/Resources > Development > Parenting Style
    community_keywords = [
        'resource', 'resources', 'article', 'articles', 'guide', 'guides',
        'video', 'videos', 'community', 'communities', 'group', 'therapy', 
        'counselor', 'psychologist', 'doctor', 'pediatrician', 'program', 
        'class', 'activity', 'near me', 'local', 'support group', 'other parents', 
        'professional', 'professionals', 'therapist', 'specialist', 
        'service', 'expert', 'help me find', 'recommend a', 'suggest', 
        'sleep training', 'bedtime routine', 'bedtime routines', 'training method', 
        'training methods', 'information', 'content', 'material', 'read', 
        'watch', 'learn', 'educational', 'education'
    ]
    
    if any(keyword in query_lower for keyword in community_keywords):
        return "community_connector"
    
    # Development keywords (developmental milestones, learning, growth)
    # Child Development Advisor provides advice but does NOT fetch recommendations
    development_keywords = [
        'milestone', 'development', 'learning', 'growth', 'age appropriate',
        'cognitive', 'physical', 'social', 'emotional', 'speech', 'walking',
        'reading', 'writing', 'motor skills', 'developmental delay'
    ]
    
    if any(keyword in query_lower for keyword in development_keywords):
        return "child_development"
    
    # Parenting style keywords (general parenting approach, discipline, family dynamics)
    parenting_style_keywords = [
        'parenting style', 'parenting approach', 'discipline', 'discipline strategy',
        'discipline strategies', 'family dynamics', 'communication pattern',
        'communication patterns', 'behavior management', 'behavioral management',
        'authoritative', 'authoritarian', 'permissive', 'uninvolved',
        'parenting method', 'parenting methods', 'how to parent', 'parenting advice',
        'family relationship', 'family relationships', 'parent child relationship',
        'parenting technique', 'parenting techniques', 'parenting strategy',
        'parenting strategies', 'how should i', 'what should i do', 'how do i handle',
        'tantrum', 'tantrums', 'misbehavior', 'misbehaving', 'behavior problem',
        'behavior problems', 'challenging behavior', 'difficult behavior',
        'parenting challenge', 'parenting challenges', 'parenting question'
    ]
    
    if any(keyword in query_lower for keyword in parenting_style_keywords):
        return "parenting_style"
    
    # Default to parenting style analysis (catch-all for general parenting questions)
    return "parenting_style"

def determine_primary_agent_constrained(query: str, context: str, enabled_agents: list[str] = None) -> str:
    """
    Determine which agent to use, optionally constrained to a subset of enabled agents
    
    This function works like determine_primary_agent but respects user-selected
    agent constraints. If the user has enabled only certain agents, the selection
    is limited to those agents.
    
    Args:
        query: User's question or query text
        context: Additional context information
        enabled_agents: List of agent IDs that the user has enabled (optional)
                       If None or empty, all agents are available
    
    Returns:
        str: Agent ID to handle the query (from enabled_agents if provided)
    """
    # Get base selection from keyword matching (ignoring constraints)
    selected_agent = determine_primary_agent(query, context)
    
    # If user has constrained to specific agents, ensure selection is in the allowed subset
    if enabled_agents and len(enabled_agents) > 0:
        # Map frontend agent IDs (with hyphens) to internal agent IDs (with underscores)
        # Frontend uses kebab-case, backend uses snake_case
        agent_id_mapping = {
            "parenting-style": "parenting_style",
            "child-development": "child_development",
            "crisis-intervention": "crisis_intervention",
            "community-connector": "community_connector"
        }
        
        # Convert enabled_agents from frontend format to internal format
        enabled_internal_ids = [agent_id_mapping.get(agent_id, agent_id) for agent_id in enabled_agents]
        
        # If the automatically selected agent is in the enabled subset, use it
        if selected_agent in enabled_internal_ids:
            print(f"DEBUG: Constrained selection - selected '{selected_agent}' from enabled subset {enabled_internal_ids}")
            return selected_agent
        else:
            # Fallback: select the highest priority agent from the enabled subset
            # Priority order: crisis > development > community > parenting
            # This ensures urgent situations are handled by the right agent even if not auto-selected
            priority_order = ["crisis_intervention", "child_development", "community_connector", "parenting_style"]
            for priority_agent in priority_order:
                if priority_agent in enabled_internal_ids:
                    print(f"DEBUG: Constrained fallback - selected '{priority_agent}' from enabled subset {enabled_internal_ids}")
                    return priority_agent
            
            # Last resort: use the first enabled agent if priority matching fails
            print(f"DEBUG: Constrained fallback - selected '{enabled_internal_ids[0]}' (first in enabled subset)")
            return enabled_internal_ids[0]
    
    # If no constraints, return the automatically selected agent
    return selected_agent

def create_agent_task(agent_type: str, query: str, context: str, child_info: str = "", agents: dict = None) -> Task:
    """
    Create a CrewAI task for the specified agent
    
    This function creates a Task object that will be executed by the specified agent.
    The task includes the agent's prompt template filled with the user's query and context.
    
    Args:
        agent_type: The ID of the agent to create a task for
        query: User's question or query text
        context: Full context string (diary entries, recommendations, etc.)
        child_info: Additional child profile information (optional)
        agents: Dictionary of agent instances (optional, for agent assignment)
    
    Returns:
        Task: CrewAI Task object ready to be executed
    """
    # Map agent types to their prompt templates
    prompts = {
        "parenting_style": PARENTING_STYLE_ANALYST_PROMPT,
        "child_development": CHILD_DEVELOPMENT_ADVISOR_PROMPT,
        "crisis_intervention": CRISIS_INTERVENTION_SPECIALIST_PROMPT,
        "community_connector": COMMUNITY_CONNECTOR_PROMPT
    }
    
    # Map agent types to their display names (for expected output description)
    agent_names = {
        "parenting_style": "Parenting Style Analyst",
        "child_development": "Child Development Advisor", 
        "crisis_intervention": "Crisis Intervention Specialist",
        "community_connector": "Community Connector"
    }
    
    # Combine context and child info into full context string
    full_context = f"{context}\n{child_info}" if child_info else context
    
    # Create the task with the agent's prompt template filled with actual data
    task = Task(
        description=prompts[agent_type].format(
            context=full_context,
            question=query
        ),
        agent=agents[agent_type] if agents else None,  # Assign agent if provided
        expected_output=f"A detailed response from the {agent_names[agent_type]} addressing the user's question with specific, practical advice."
    )
    
    return task

def get_max_tokens_for_style(preferred_style: str = None) -> int:
    """Calculate max_tokens based on preferred communication style
    
    Args:
        preferred_style: User's preferred communication style
        
    Returns:
        Maximum tokens for response generation
    """
    if not preferred_style:
        return 500  # Default: ~375 words
    
    style_lower = str(preferred_style).strip().lower()
    
    # Token limits based on communication style
    # Each token ≈ 0.75 words, so:
    # 250 tokens ≈ 187 words (concise)
    # 400 tokens ≈ 300 words (direct/gentle)
    # 500 tokens ≈ 375 words (default)
    # 600 tokens ≈ 450 words (detailed/practical)
    # 700 tokens ≈ 525 words (encouraging)
    
    style_limits = {
        "concise": 300,      # ~225 words - Very brief, bullet points
        "direct": 450,       # ~337 words - Short, actionable steps
        "gentle": 500,       # ~375 words - Moderate length with validation
        "practical": 550,    # ~412 words - Structured with examples
        "detailed": 650,     # ~487 words - Comprehensive with rationale
        "encouraging": 600   # ~450 words - Positive, motivating
    }
    
    return style_limits.get(style_lower, 500)  # Default 500 tokens if style not found

async def execute_crewai_response(query: str, context: str, child_info: str = "", manual_agent: str = None, enabled_agents: list[str] = None, preferred_style: str = None) -> Dict[str, Any]:
    """
    Execute CrewAI response with automatic or manual agent selection
    
    This is the main function that orchestrates the AI agent response generation.
    It handles agent selection, task creation, execution, and response formatting.
    
    Args:
        query: User's question or query text
        context: Full context string (diary entries, recommendations, etc.)
        child_info: Child profile information (optional)
        manual_agent: Specific agent ID to use (manual mode - user selected one agent)
        enabled_agents: List of enabled agent IDs (constrained auto mode - user selected 2-3 agents)
        preferred_style: User's preferred communication style (affects response length)
    
    Returns:
        dict: Dictionary containing:
            - "response": The AI-generated response text
            - "agent_type": The role name of the agent used
            - "agent_id": The ID of the agent used
            - "model_version": The OpenAI model version used
            - "token_count": Number of tokens used (if available)
    
    Raises:
        Exception: If agent execution fails
    """
    try:
        # Calculate max_tokens based on user's preferred communication style
        # Different styles have different response length preferences
        max_tokens = get_max_tokens_for_style(preferred_style)
        
        # Initialize the language model
        # Using gpt-4o-mini for cost efficiency (60x cheaper than gpt-4)
        # Temperature 0.7 provides a good balance between creativity and consistency
        llm = ChatOpenAI(
            model="gpt-4o-mini",  # Cost-optimized model
            temperature=0.7,  # Balance between creativity and consistency
            max_tokens=max_tokens  # Limit response length based on user's style preference
        )
        
        # Create all four agents with the initialized LLM
        agents = create_agents(llm)
        
        # Determine which agent to use based on mode
        if manual_agent and manual_agent in agents:
            # Manual mode: User explicitly selected one specific agent
            primary_agent = manual_agent
        elif enabled_agents and len(enabled_agents) > 0:
            # Constrained auto mode: User enabled 2-3 agents, auto-select from those
            primary_agent = determine_primary_agent_constrained(query, context, enabled_agents)
        else:
            # Full auto mode: Select from all four agents based on query content
            primary_agent = determine_primary_agent(query, context)
        
        print(f"DEBUG: Selected agent: {primary_agent}")
        
        # Create a task for the selected agent
        task = create_agent_task(primary_agent, query, context, child_info, agents)
        
        # Create a Crew with the selected agent and task
        # CrewAI executes the task using the agent
        crew = Crew(
            agents=[agents[primary_agent]],  # Only include the selected agent
            tasks=[task],  # The task to execute
            verbose=True  # Enable verbose logging for debugging
        )
        
        # Execute the task with token tracking for cost monitoring
        token_count = None
        actual_model = "gpt-4o-mini"  # Default model name
        
        try:
            # Use OpenAI callback to track token usage
            with get_openai_callback() as cb:
                # Execute the crew task (this calls the AI agent)
                result = crew.kickoff()
                
                # Extract token usage from callback if available
                if cb and hasattr(cb, 'total_tokens'):
                    token_count = cb.total_tokens
                    print(f"DEBUG: Token count from callback: {token_count}")
                
                # Extract model name from callback if available
                if cb and hasattr(cb, 'model') and cb.model:
                    actual_model = cb.model
                    print(f"DEBUG: Model from callback: {actual_model}")
                
                print(f"DEBUG: CrewAI kickoff completed, result type: {type(result)}")
                print(f"DEBUG: Callback tokens - total: {cb.total_tokens if cb else 'N/A'}, prompt: {cb.prompt_tokens if cb else 'N/A'}, completion: {cb.completion_tokens if cb else 'N/A'}")
        except Exception as e:
            # If callback fails, execute without it (still works, just no token tracking)
            print(f"WARNING: Error using OpenAI callback: {e}")
            result = crew.kickoff()
            print(f"DEBUG: CrewAI kickoff completed (no callback), result type: {type(result)}")
        
        # Extract the response text from CrewAI result object
        # CrewAI returns different result types, so we check multiple attributes
        if hasattr(result, 'raw'):
            response_text = result.raw
        elif hasattr(result, 'output'):
            response_text = result.output
        else:
            response_text = str(result)
        
        # Alternative token extraction: try to get from LLM response metadata
        if token_count is None:
            try:
                # Check if LLM has response metadata with token usage
                if hasattr(llm, 'last_response') and llm.last_response:
                    if hasattr(llm.last_response, 'usage'):
                        usage = llm.last_response.usage
                        if hasattr(usage, 'total_tokens'):
                            token_count = usage.total_tokens
                            print(f"DEBUG: Token count from LLM response: {token_count}")
                
                # Try to get model name from LLM attributes
                if hasattr(llm, 'model_name'):
                    actual_model = llm.model_name
                elif hasattr(llm, 'model'):
                    actual_model = llm.model
            except Exception as e:
                print(f"DEBUG: Could not extract tokens/model from LLM response: {e}")
        
        # Return the response with metadata
        return {
            "response": response_text,  # The AI-generated response
            "agent_type": agents[primary_agent].role,  # Agent's role name (for display)
            "agent_id": primary_agent,  # Agent ID (for tracking)
            "model_version": actual_model,  # Model used (for debugging)
            "token_count": token_count  # Token count (for cost tracking)
        }
    except Exception as e:
        # Log error and re-raise for proper error handling
        print(f"ERROR in execute_crewai_response: {e}")
        import traceback
        traceback.print_exc()
        raise 