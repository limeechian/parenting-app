# Programmer Name: Ms. Lim Ee Chian, APD3F2505SE, Software Engineering Student, Bachelor of Science (Hons) in Software Engineering
# Program Name: insights.py
# Description: To handle AI-generated insights and summary endpoints for diary entries
# First Written on: Friday, 03-Oct-2025
# Edited on: Sunday, 10-Dec-2025

"""
Insights router - Monthly/weekly summaries and AI insights

This router provides endpoints for:
- Monthly summary generation (AI-powered analysis of diary entries)
- Weekly summary generation (AI-powered weekly reflections)
- Insight retrieval and management (save, mark read, delete)

Summaries analyze diary entries to provide personalized insights, achievements,
progress tracking, challenges, and recommendations.
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, date
from calendar import monthrange
from typing import Optional
from collections import Counter
import json
import re

from dependencies import get_current_user_flexible, get_session
from models.database import User, ChildProfile, AIInsight
from schemas.schemas import GenerateMonthlySummaryRequest, GenerateWeeklySummaryRequest
from utils.helpers import (
    calculate_age_from_birthdate,
    extract_entry_data_by_type
)
from config import CORS_ORIGINS, logger
from langchain_openai import ChatOpenAI

# Initialize router with prefix and tags for API documentation
router = APIRouter(prefix="/insights", tags=["insights"])

# ============================================================================
# Helper Functions
# ============================================================================

def get_cors_headers(origin: Optional[str] = None) -> dict:
    """
    Get CORS headers for response
    
    Generates appropriate CORS headers based on the request origin.
    
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
# Summary Generation Endpoints
# ============================================================================

@router.post("/generate-monthly-summary")
async def generate_monthly_summary(
    request: GenerateMonthlySummaryRequest,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Generate a monthly summary for diary entries
    
    Generates an AI-powered monthly summary analyzing all diary entries for a given month.
    The summary includes:
    - Narrative analysis (3-4 paragraphs)
    - Structured data (achievements, progress, challenges, recommendations)
    - Statistics (entry counts, mood trends, tags, entry types)
    - Confidence score based on entry quality and quantity
    
    Flow:
    1. Fetches diary entries for the specified month
    2. Extracts entry data by type
    3. Builds comprehensive AI prompt with child context
    4. Generates summary using GPT-4o-mini
    5. Parses narrative and structured data from response
    6. Calculates statistics and confidence score
    7. Creates AIInsight record
    
    Args:
        request: Summary generation request (year, month, child_id)
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Generated insight with all summary data
    
    Raises:
        HTTPException:
            - 400 if not enough diary entries (minimum 1)
            - 500 if summary generation fails
    """
    try:
        from models.database import DiaryEntry
        
        # Calculate period dates
        period_start = date(request.year, request.month, 1)
        last_day = monthrange(request.year, request.month)[1]
        period_end = date(request.year, request.month, last_day)
        
        # Fetch diary entries for the period
        query = select(DiaryEntry).where(
            DiaryEntry.user_id == user.user_id,
            DiaryEntry.entry_date >= period_start,
            DiaryEntry.entry_date <= period_end
        )
        
        if request.child_id:
            query = query.where(DiaryEntry.child_id == request.child_id)
        
        result = await db.execute(query)
        entries = result.scalars().all()
        
        if len(entries) < 1:
            raise HTTPException(status_code=400, detail="Not enough diary entries for this period. Please create at least 1 entry.")
        
        # Extract entry data for AI processing
        entry_ids = [e.entry_id for e in entries]
        entries_data = []
        for entry in entries:
            entry_data = extract_entry_data_by_type(entry)
            entries_data.append(entry_data)
        
        # Get child information for context
        month_name = datetime(request.year, request.month, 1).strftime("%B")
        child_name = "All Children"
        child_info = ""
        if request.child_id:
            child_result = await db.execute(
                select(ChildProfile).where(ChildProfile.child_id == request.child_id)
            )
            child = child_result.scalar_one_or_none()
            if child:
                child_name = child.name
                child_age = calculate_age_from_birthdate(child.birthdate) if child.birthdate else None
                age_str = f"{child_age} years old" if child_age is not None else "Age not specified"
                child_info = f"""
Child Profile:
- Name: {child.name}
- Age: {age_str}
- Gender: {child.gender or 'Not specified'}
- Developmental Stage: {child.developmental_stage or 'Not specified'}
- Education Level: {child.education_level or 'Not specified'}
- Special Considerations: {', '.join(child.special_considerations or []) if child.special_considerations else 'None'}
- Current Challenges: {', '.join(child.current_challenges or []) if child.current_challenges else 'None'}
- Characteristics: {', '.join(child.characteristics or []) if child.characteristics else 'None'}
"""
        
        # Generate summary using AI
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7, max_tokens=1500)
        
        # Format diary entries for AI prompt
        entries_text = ""
        for idx, entry_data in enumerate(entries_data, 1):
            entry_text = f"\nEntry {idx} ({entry_data.get('date', 'Unknown date')}):\n"
            entry_text += f"Type: {entry_data.get('type', 'unknown')}\n"
            if entry_data.get('title'):
                entry_text += f"Title: {entry_data.get('title')}\n"
            if entry_data.get('content'):
                entry_text += f"Content: {entry_data.get('content')}\n"
            if entry_data.get('parent_mood'):
                entry_text += f"Parent Mood: {entry_data.get('parent_mood')}\n"
            if entry_data.get('child_mood'):
                entry_text += f"Child Mood: {entry_data.get('child_mood')}\n"
            
            # Add template-specific fields based on entry type
            entry_type = entry_data.get('type', 'free-form')
            if entry_type == "daily-behavior":
                if entry_data.get('observed_behaviors'):
                    entry_text += f"Observed Behaviors: {', '.join(entry_data.get('observed_behaviors', []))}\n"
                if entry_data.get('challenges'):
                    entry_text += f"Challenges: {', '.join(entry_data.get('challenges', []))}\n"
                if entry_data.get('strategies'):
                    entry_text += f"Strategies Used: {', '.join(entry_data.get('strategies', []))}\n"
                if entry_data.get('time_of_day'):
                    entry_text += f"Time of Day: {entry_data.get('time_of_day')}\n"
                if entry_data.get('duration'):
                    entry_text += f"Duration: {entry_data.get('duration')}\n"
                if entry_data.get('effectiveness'):
                    entry_text += f"Effectiveness: {entry_data.get('effectiveness')}\n"
            elif entry_type == "emotional-tracking":
                if entry_data.get('emotion_intensity') is not None:
                    entry_text += f"Emotion Intensity: {entry_data.get('emotion_intensity')}/10\n"
                if entry_data.get('stress_level') is not None:
                    entry_text += f"Stress Level: {entry_data.get('stress_level')}/10\n"
                if entry_data.get('triggers_identified'):
                    entry_text += f"Triggers Identified: {', '.join(entry_data.get('triggers_identified', []))}\n"
                if entry_data.get('coping_strategies'):
                    entry_text += f"Coping Strategies: {', '.join(entry_data.get('coping_strategies', []))}\n"
                if entry_data.get('physical_symptoms'):
                    entry_text += f"Physical Symptoms: {', '.join(entry_data.get('physical_symptoms', []))}\n"
                if entry_data.get('environmental_factors'):
                    entry_text += f"Environmental Factors: {entry_data.get('environmental_factors')}\n"
            elif entry_type == "intervention-tracking":
                if entry_data.get('situation_description'):
                    entry_text += f"Situation: {entry_data.get('situation_description')}\n"
                if entry_data.get('intervention_used'):
                    entry_text += f"Intervention Used: {entry_data.get('intervention_used')}\n"
                if entry_data.get('immediate_outcome'):
                    entry_text += f"Immediate Outcome: {entry_data.get('immediate_outcome')}\n"
                if entry_data.get('effectiveness_rating') is not None:
                    entry_text += f"Effectiveness Rating: {entry_data.get('effectiveness_rating')}/10\n"
                if entry_data.get('would_use_again') is not None:
                    entry_text += f"Would Use Again: {'Yes' if entry_data.get('would_use_again') else 'No'}\n"
            elif entry_type == "milestone-progress":
                if entry_data.get('skills'):
                    entry_text += f"Skills Observed: {', '.join(entry_data.get('skills', []))}\n"
                if entry_data.get('improvements'):
                    entry_text += f"Improvements: {entry_data.get('improvements')}\n"
                if entry_data.get('setbacks'):
                    entry_text += f"Setbacks/Concerns: {entry_data.get('setbacks')}\n"
                if entry_data.get('next_goals'):
                    entry_text += f"Next Goals: {entry_data.get('next_goals')}\n"
                if entry_data.get('professional_recommendations'):
                    entry_text += f"Professional Recommendations: {entry_data.get('professional_recommendations')}\n"
            
            if entry_data.get('tags'):
                entry_text += f"Tags: {', '.join(entry_data.get('tags', []))}\n"
            entries_text += entry_text + "\n"
        
        # Calculate statistics from actual entries
        all_tags = []
        all_moods = []
        entry_types_used = []
        for entry_data in entries_data:
            if entry_data.get('tags'):
                all_tags.extend(entry_data.get('tags', []))
            if entry_data.get('child_mood'):
                all_moods.append(entry_data.get('child_mood'))
            if entry_data.get('type'):
                entry_types_used.append(entry_data.get('type'))
        
        tag_counts = {}
        for tag in all_tags:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
        most_common_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        most_common_tags_list = [tag for tag, count in most_common_tags]
        
        mood_counts = {}
        for mood in all_moods:
            mood_counts[mood] = mood_counts.get(mood, 0) + 1
        average_mood = max(mood_counts.items(), key=lambda x: x[1])[0] if mood_counts else "neutral"
        
        # Create comprehensive AI prompt
        ai_prompt = f"""You are an expert parenting coach analyzing diary entries to generate a personalized monthly summary.

{child_info if child_info else "Context: General parenting summary for all children."}

Period: {month_name} {request.year}
Total Diary Entries: {len(entries_data)}

DIARY ENTRIES DATA:
{entries_text}

Based on the diary entries above, generate a comprehensive monthly summary that:

1. **Analyzes actual content** from the entries - reference specific behaviors, challenges, strategies, interventions, skills, improvements, setbacks mentioned in the entries
2. **Identifies real achievements** - what actual progress was made based on the entries (don't just say "consistent documentation")
3. **Highlights actual progress** - reference specific skills, improvements, mood trends, behavior changes documented in entries
4. **Identifies real challenges** - what actual challenges, setbacks, or concerns were documented
5. **Provides specific recommendations** - actionable advice based on patterns observed in the actual entries
6. **References entry types** - acknowledge what types of entries were used (daily-behavior, emotional-tracking, intervention-tracking, milestone-progress, free-form)

Generate the summary in this EXACT format:

===NARRATIVE===
[Write 3-4 paragraphs of narrative summary here covering: overview, achievements, progress, challenges, recommendations]

===STRUCTURED_DATA===
{{
  "achievements": ["specific achievement 1", "specific achievement 2", "specific achievement 3"],
  "progress": {{
    "mood_improvement": "specific observation about mood trends",
    "skill_development": "specific skills observed/improved",
    "behavior_changes": "specific behavior patterns noted"
  }},
  "challenges": ["specific challenge 1", "specific challenge 2"],
  "focus_areas": ["specific area 1", "specific area 2", "specific area 3"],
  "recommendations": ["specific recommendation 1", "specific recommendation 2", "specific recommendation 3"]
}}

IMPORTANT:
- Be specific and reference actual content from the entries
- Don't use generic phrases like "consistent documentation"
- Focus on what the child actually did, learned, or struggled with
- Make recommendations based on actual patterns observed
- If entries are limited, acknowledge that but still analyze what's available
- Be child-specific if child information is provided
"""
        
        try:
            response = await llm.ainvoke(ai_prompt)
            ai_response_text = response.content.strip()
            
            narrative_content = ""
            summary_data = {
                "achievements": [],
                "progress": {},
                "challenges": [],
                "focus_areas": [],
                "recommendations": []
            }
            
            if "===NARRATIVE===" in ai_response_text and "===STRUCTURED_DATA===" in ai_response_text:
                parts = ai_response_text.split("===STRUCTURED_DATA===")
                if len(parts) >= 2:
                    narrative_part = parts[0].replace("===NARRATIVE===", "").strip()
                    json_part = parts[1].strip()
                    narrative_content = narrative_part
                    
                    json_match = re.search(r'\{.*\}', json_part, re.DOTALL)
                    if json_match:
                        try:
                            summary_data = json.loads(json_match.group())
                        except Exception as parse_error:
                            logger.error(f"JSON parsing error: {parse_error}")
                else:
                    narrative_content = ai_response_text
            else:
                json_match = None
                for pattern in [
                    r'\{.*?"achievements".*?\}',
                    r'\{.*?"progress".*?\}',
                    r'\{.*?\}'
                ]:
                    matches = list(re.finditer(pattern, ai_response_text, re.DOTALL))
                    if matches:
                        for match in matches:
                            try:
                                test_json = json.loads(match.group())
                                if "achievements" in test_json or "progress" in test_json:
                                    json_match = match
                                    break
                            except:
                                continue
                        if json_match:
                            break
                
                if json_match:
                    try:
                        summary_data = json.loads(json_match.group())
                        narrative_content = ai_response_text[:json_match.start()].strip()
                    except Exception as parse_error:
                        logger.error(f"JSON parsing error: {parse_error}")
                        narrative_content = ai_response_text
                else:
                    narrative_content = ai_response_text
            
            summary_content = f"Monthly Summary - {month_name} {request.year}\n\n{narrative_content}"
            
            summary_data["statistics"] = {
                "total_entries": len(entries),
                "average_mood": average_mood,
                "most_common_tags": most_common_tags_list,
                "entry_types_used": list(set(entry_types_used))
            }
            
            # Calculate confidence score
            confidence_score = 0.5
            if len(entries) >= 5:
                confidence_score += 0.15
            if len(entries) >= 10:
                confidence_score += 0.1
            if len(set(entry_types_used)) >= 2:
                confidence_score += 0.1
            if len(set(entry_types_used)) >= 3:
                confidence_score += 0.1
            detailed_entries = sum(1 for e in entries_data if e.get('content') and len(e.get('content', '')) > 50)
            if detailed_entries >= len(entries) * 0.7:
                confidence_score += 0.05
            confidence_score = min(confidence_score, 1.0)
            
        except Exception as e:
            logger.error(f"Error generating AI summary: {e}")
            import traceback
            traceback.print_exc()
            summary_content = f"Monthly Summary - {month_name} {request.year}\n\nFor: {child_name}\n\nGenerated: just now\n\n{len(entries)} entries analyzed\n\nThis month you documented {len(entries)} diary entries. Please note: AI analysis encountered an error. Please try regenerating the summary."
            summary_data = {
                "achievements": [],
                "progress": {},
                "challenges": [],
                "focus_areas": [],
                "recommendations": [],
                "statistics": {
                    "total_entries": len(entries),
                    "average_mood": average_mood,
                    "most_common_tags": most_common_tags_list,
                    "entry_types_used": list(set(entry_types_used))
                }
            }
            confidence_score = 0.3
        
        # Create insight record
        title = f"Monthly Summary - {month_name} {request.year}"
        new_insight = AIInsight(
            user_id=user.user_id,
            child_id=request.child_id,
            insight_type="monthly_summary",
            period_type="monthly",
            period_start=period_start,
            period_end=period_end,
            month=request.month,
            year=request.year,
            title=title,
            content=summary_content,
            summary_data=summary_data,
            diary_entry_ids_used=entry_ids,
            diary_entries_count=len(entries),
            is_read=True,
            is_saved=False,
            ai_agent_type="monthly_summary_generator",
            confidence_score=confidence_score,
            model_version="gpt-4o-mini"
        )
        
        db.add(new_insight)
        await db.commit()
        await db.refresh(new_insight)
        
        return {
            "insight_id": new_insight.insight_id,
            "title": new_insight.title,
            "content": new_insight.content,
            "summary_data": new_insight.summary_data,
            "child_id": new_insight.child_id,
            "month": new_insight.month,
            "year": new_insight.year,
            "period_start": new_insight.period_start.isoformat() if new_insight.period_start else None,
            "period_end": new_insight.period_end.isoformat() if new_insight.period_end else None,
            "is_saved": new_insight.is_saved,
            "is_read": new_insight.is_read,
            "diary_entries_count": new_insight.diary_entries_count,
            "ai_agent_type": new_insight.ai_agent_type,
            "confidence_score": float(new_insight.confidence_score) if new_insight.confidence_score else None,
            "model_version": new_insight.model_version,
            "created_at": new_insight.created_at.isoformat() if new_insight.created_at else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating monthly summary: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate monthly summary: {str(e)}")

@router.get("/monthly-summaries")
async def get_monthly_summaries(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session),
    child_id: Optional[int] = None,
    saved_only: bool = True
):
    """
    Get saved monthly summaries for the user
    
    Retrieves monthly summaries with optional filtering by child and saved status.
    
    Args:
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
        child_id: Optional child ID filter
        saved_only: If True, only return saved summaries (default: True)
    
    Returns:
        dict: Dictionary with 'summaries' list containing summary metadata
    
    Raises:
        HTTPException: If summary retrieval fails
    """
    try:
        query = select(AIInsight).where(
            AIInsight.user_id == user.user_id,
            AIInsight.insight_type == "monthly_summary"
        )
        
        if saved_only:
            query = query.where(AIInsight.is_saved == True)
        
        if child_id is not None:
            query = query.where(AIInsight.child_id == child_id)
        
        query = query.order_by(AIInsight.created_at.desc())
        
        result = await db.execute(query)
        insights = result.scalars().all()
        
        summaries = []
        for insight in insights:
            summaries.append({
                "insight_id": insight.insight_id,
                "title": insight.title,
                "child_id": insight.child_id,
                "month": insight.month,
                "year": insight.year,
                "is_saved": insight.is_saved,
                "saved_at": insight.saved_at.isoformat() if insight.saved_at else None,
                "created_at": insight.created_at.isoformat() if insight.created_at else None
            })
        
        return {"summaries": summaries}
    
    except Exception as e:
        logger.error(f"Error getting monthly summaries: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get monthly summaries: {str(e)}")

@router.post("/generate-weekly-summary")
async def generate_weekly_summary(
    request: GenerateWeeklySummaryRequest,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Generate a weekly summary for diary entries
    
    Generates an AI-powered weekly reflection analyzing diary entries for a given week.
    Similar to monthly summary but more concise (1-2 paragraphs narrative).
    
    Flow:
    1. Fetches diary entries for the specified week
    2. Extracts entry data by type
    3. Builds concise AI prompt with child context
    4. Generates summary using GPT-4o-mini
    5. Parses narrative and structured data
    6. Calculates statistics and confidence score
    7. Creates AIInsight record
    
    Args:
        request: Summary generation request (week_start, week_end, child_id)
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Generated insight with all summary data
    
    Raises:
        HTTPException:
            - 400 if not enough diary entries (minimum 1)
            - 500 if summary generation fails
    """
    try:
        from models.database import DiaryEntry
        
        # Parse period dates
        period_start = datetime.strptime(request.week_start, "%Y-%m-%d").date()
        period_end = datetime.strptime(request.week_end, "%Y-%m-%d").date()
        
        # Fetch diary entries for the period
        query = select(DiaryEntry).where(
            DiaryEntry.user_id == user.user_id,
            DiaryEntry.entry_date >= period_start,
            DiaryEntry.entry_date <= period_end
        )
        
        if request.child_id:
            query = query.where(DiaryEntry.child_id == request.child_id)
        
        result = await db.execute(query)
        entries = result.scalars().all()
        
        if len(entries) < 1:
            raise HTTPException(status_code=400, detail="Not enough diary entries for this week. Please create at least 1 entry.")
        
        # Extract entry data for AI processing
        entry_ids = [e.entry_id for e in entries]
        entries_data = []
        for entry in entries:
            entry_data = extract_entry_data_by_type(entry)
            entries_data.append(entry_data)
        
        # Get child information for context
        week_display = f"{period_start.strftime('%b %d')} - {period_end.strftime('%b %d, %Y')}"
        child_name = "All Children"
        child_info = ""
        if request.child_id:
            child_result = await db.execute(
                select(ChildProfile).where(ChildProfile.child_id == request.child_id)
            )
            child = child_result.scalar_one_or_none()
            if child:
                child_name = child.name
                child_age = calculate_age_from_birthdate(child.birthdate) if child.birthdate else None
                age_str = f"{child_age} years old" if child_age is not None else "Age not specified"
                child_info = f"""
Child Profile:
- Name: {child.name}
- Age: {age_str}
- Gender: {child.gender or 'Not specified'}
- Developmental Stage: {child.developmental_stage or 'Not specified'}
- Education Level: {child.education_level or 'Not specified'}
- Special Considerations: {', '.join(child.special_considerations or []) if child.special_considerations else 'None'}
- Current Challenges: {', '.join(child.current_challenges or []) if child.current_challenges else 'None'}
- Characteristics: {', '.join(child.characteristics or []) if child.characteristics else 'None'}
"""
        
        # Generate summary using AI
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7, max_tokens=1000)
        
        # Format diary entries for AI prompt (similar to monthly but shorter)
        entries_text = ""
        for idx, entry_data in enumerate(entries_data, 1):
            entry_text = f"\nEntry {idx} ({entry_data.get('date', 'Unknown date')}):\n"
            entry_text += f"Type: {entry_data.get('type', 'unknown')}\n"
            if entry_data.get('title'):
                entry_text += f"Title: {entry_data.get('title')}\n"
            if entry_data.get('content'):
                entry_text += f"Content: {entry_data.get('content')}\n"
            if entry_data.get('parent_mood'):
                entry_text += f"Parent Mood: {entry_data.get('parent_mood')}\n"
            if entry_data.get('child_mood'):
                entry_text += f"Child Mood: {entry_data.get('child_mood')}\n"
            
            entry_type = entry_data.get('type', 'free-form')
            if entry_type == "daily-behavior":
                if entry_data.get('observed_behaviors'):
                    entry_text += f"Observed Behaviors: {', '.join(entry_data.get('observed_behaviors', []))}\n"
                if entry_data.get('challenges'):
                    entry_text += f"Challenges: {', '.join(entry_data.get('challenges', []))}\n"
                if entry_data.get('strategies'):
                    entry_text += f"Strategies Used: {', '.join(entry_data.get('strategies', []))}\n"
            elif entry_type == "emotional-tracking":
                if entry_data.get('emotion_intensity') is not None:
                    entry_text += f"Emotion Intensity: {entry_data.get('emotion_intensity')}/10\n"
                if entry_data.get('stress_level') is not None:
                    entry_text += f"Stress Level: {entry_data.get('stress_level')}/10\n"
                if entry_data.get('triggers'):
                    entry_text += f"Triggers: {', '.join(entry_data.get('triggers', []))}\n"
                if entry_data.get('coping_strategies'):
                    entry_text += f"Coping Strategies: {', '.join(entry_data.get('coping_strategies', []))}\n"
            elif entry_type == "intervention-tracking":
                if entry_data.get('situation_description'):
                    entry_text += f"Situation: {entry_data.get('situation_description')}\n"
                if entry_data.get('intervention_used'):
                    entry_text += f"Intervention: {entry_data.get('intervention_used')}\n"
                if entry_data.get('effectiveness_rating') is not None:
                    entry_text += f"Effectiveness Rating: {entry_data.get('effectiveness_rating')}/10\n"
            elif entry_type == "milestone-progress":
                if entry_data.get('skills_observed'):
                    entry_text += f"Skills Observed: {', '.join(entry_data.get('skills_observed', []))}\n"
                if entry_data.get('improvements_observed'):
                    entry_text += f"Improvements: {entry_data.get('improvements_observed')}\n"
                if entry_data.get('next_goals'):
                    entry_text += f"Next Goals: {entry_data.get('next_goals')}\n"
            
            if entry_data.get('tags'):
                entry_text += f"Tags: {', '.join(entry_data.get('tags', []))}\n"
            entries_text += entry_text
        
        # Collect tags and entry types for statistics
        all_tags = []
        entry_types_used = []
        for entry_data in entries_data:
            if entry_data.get('tags'):
                all_tags.extend(entry_data.get('tags', []))
            if entry_data.get('type'):
                entry_types_used.append(entry_data.get('type'))
        
        tag_counts = Counter(all_tags)
        most_common_tags_list = [tag for tag, _ in tag_counts.most_common(5)]
        
        all_moods = []
        for entry_data in entries_data:
            if entry_data.get('parent_mood'):
                all_moods.append(entry_data.get('parent_mood'))
            if entry_data.get('child_mood'):
                all_moods.append(entry_data.get('child_mood'))
        
        mood_counts = {}
        for mood in all_moods:
            mood_counts[mood] = mood_counts.get(mood, 0) + 1
        average_mood = max(mood_counts.items(), key=lambda x: x[1])[0] if mood_counts else "neutral"
        
        # Create AI prompt for weekly summary (shorter narrative)
        ai_prompt = f"""You are an expert parenting coach analyzing diary entries to generate a concise weekly reflection summary.

{child_info if child_info else "Context: General parenting summary for all children."}

Week: {week_display}
Total Diary Entries: {len(entries_data)}

DIARY ENTRIES DATA:
{entries_text}

Based on the diary entries above, generate a concise weekly reflection summary that:

1. **Analyzes actual content** from the entries - reference specific behaviors, challenges, strategies mentioned
2. **Identifies real achievements** - what actual progress was made this week
3. **Highlights actual progress** - reference specific skills, improvements, mood trends documented
4. **Identifies real challenges** - what actual challenges were documented this week
5. **Provides specific recommendations** - actionable advice for the coming week based on patterns observed
6. **References entry types** - acknowledge what types of entries were used

Generate the summary in this EXACT format (keep narrative concise - 1-2 short paragraphs):

===NARRATIVE===
[Write 1-2 short paragraphs of narrative summary here covering: brief overview, key achievements, progress highlights, and recommendations for the coming week]

===STRUCTURED_DATA===
{{
  "achievements": ["specific achievement 1", "specific achievement 2"],
  "progress": {{
    "mood_improvement": "brief observation about mood trends",
    "skill_development": "brief skills observed/improved",
    "behavior_changes": "brief behavior patterns noted"
  }},
  "challenges": ["specific challenge 1", "specific challenge 2"],
  "focus_areas": ["specific area 1", "specific area 2"],
  "recommendations": ["specific recommendation 1", "specific recommendation 2"]
}}

IMPORTANT:
- Keep narrative concise (1-2 short paragraphs) - this is a weekly reflection, not a monthly report
- Be specific and reference actual content from the entries
- Don't use generic phrases like "consistent documentation"
- Focus on what happened this week specifically
- Make recommendations actionable for the coming week
- If entries are limited, acknowledge that but still analyze what's available
- Be child-specific if child information is provided
"""
        
        try:
            response = await llm.ainvoke(ai_prompt)
            ai_response_text = response.content.strip()
            
            narrative_content = ""
            summary_data = {
                "achievements": [],
                "progress": {},
                "challenges": [],
                "focus_areas": [],
                "recommendations": []
            }
            
            if "===NARRATIVE===" in ai_response_text and "===STRUCTURED_DATA===" in ai_response_text:
                parts = ai_response_text.split("===STRUCTURED_DATA===")
                if len(parts) >= 2:
                    narrative_part = parts[0].replace("===NARRATIVE===", "").strip()
                    json_part = parts[1].strip()
                    narrative_content = narrative_part
                    
                    json_match = re.search(r'\{.*\}', json_part, re.DOTALL)
                    if json_match:
                        try:
                            summary_data = json.loads(json_match.group())
                        except Exception as parse_error:
                            logger.error(f"JSON parsing error: {parse_error}")
                else:
                    narrative_content = ai_response_text
            else:
                json_match = None
                for pattern in [
                    r'\{.*?"achievements".*?\}',
                    r'\{.*?"progress".*?\}',
                    r'\{.*?\}'
                ]:
                    matches = list(re.finditer(pattern, ai_response_text, re.DOTALL))
                    if matches:
                        for match in matches:
                            try:
                                test_json = json.loads(match.group())
                                if "achievements" in test_json or "progress" in test_json:
                                    json_match = match
                                    break
                            except:
                                continue
                        if json_match:
                            break
                
                if json_match:
                    try:
                        summary_data = json.loads(json_match.group())
                        narrative_content = ai_response_text[:json_match.start()].strip()
                    except Exception as parse_error:
                        logger.error(f"JSON parsing error: {parse_error}")
                        narrative_content = ai_response_text
                else:
                    narrative_content = ai_response_text
            
            summary_content = f"Weekly Reflection - {week_display}\n\n{narrative_content}"
            
            summary_data["statistics"] = {
                "total_entries": len(entries),
                "average_mood": average_mood,
                "most_common_tags": most_common_tags_list,
                "entry_types_used": list(set(entry_types_used))
            }
            
            # Calculate confidence score
            confidence_score = 0.5
            if len(entries) >= 3:
                confidence_score += 0.15
            if len(entries) >= 5:
                confidence_score += 0.1
            if len(set(entry_types_used)) >= 2:
                confidence_score += 0.1
            detailed_entries = sum(1 for e in entries_data if e.get('content') and len(e.get('content', '')) > 50)
            if detailed_entries >= len(entries) * 0.7:
                confidence_score += 0.05
            confidence_score = min(confidence_score, 1.0)
            
        except Exception as e:
            logger.error(f"Error generating AI summary: {e}")
            import traceback
            traceback.print_exc()
            summary_content = f"Weekly Reflection - {week_display}\n\nFor: {child_name}\n\nGenerated: just now\n\n{len(entries)} entries analyzed\n\nThis week you documented {len(entries)} diary entries. Please note: AI analysis encountered an error. Please try regenerating the summary."
            summary_data = {
                "achievements": [],
                "progress": {},
                "challenges": [],
                "focus_areas": [],
                "recommendations": [],
                "statistics": {
                    "total_entries": len(entries),
                    "average_mood": average_mood,
                    "most_common_tags": most_common_tags_list,
                    "entry_types_used": list(set(entry_types_used))
                }
            }
            confidence_score = 0.3
        
        # Create insight record
        title = f"Weekly Reflection - {week_display}"
        new_insight = AIInsight(
            user_id=user.user_id,
            child_id=request.child_id,
            insight_type="weekly_summary",
            period_type="weekly",
            period_start=period_start,
            period_end=period_end,
            month=None,
            year=period_start.year,
            title=title,
            content=summary_content,
            summary_data=summary_data,
            diary_entry_ids_used=entry_ids,
            diary_entries_count=len(entries),
            is_read=True,
            is_saved=False,
            ai_agent_type="weekly_summary_generator",
            confidence_score=confidence_score,
            model_version="gpt-4o-mini"
        )
        
        db.add(new_insight)
        await db.commit()
        await db.refresh(new_insight)
        
        return {
            "insight_id": new_insight.insight_id,
            "title": new_insight.title,
            "content": new_insight.content,
            "summary_data": new_insight.summary_data,
            "child_id": new_insight.child_id,
            "period_start": new_insight.period_start.isoformat() if new_insight.period_start else None,
            "period_end": new_insight.period_end.isoformat() if new_insight.period_end else None,
            "is_saved": new_insight.is_saved,
            "is_read": new_insight.is_read,
            "diary_entries_count": new_insight.diary_entries_count,
            "ai_agent_type": new_insight.ai_agent_type,
            "confidence_score": float(new_insight.confidence_score) if new_insight.confidence_score else None,
            "model_version": new_insight.model_version,
            "created_at": new_insight.created_at.isoformat() if new_insight.created_at else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating weekly summary: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate weekly summary: {str(e)}")

@router.get("/weekly-summaries")
async def get_weekly_summaries(
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session),
    child_id: Optional[int] = None,
    saved_only: bool = True
):
    """
    Get saved weekly summaries for the user
    
    Retrieves weekly summaries with optional filtering by child and saved status.
    
    Args:
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
        child_id: Optional child ID filter
        saved_only: If True, only return saved summaries (default: True)
    
    Returns:
        dict: Dictionary with 'summaries' list containing summary metadata
    
    Raises:
        HTTPException: If summary retrieval fails
    """
    try:
        query = select(AIInsight).where(
            AIInsight.user_id == user.user_id,
            AIInsight.insight_type == "weekly_summary"
        )
        
        if saved_only:
            query = query.where(AIInsight.is_saved == True)
        
        if child_id is not None:
            query = query.where(AIInsight.child_id == child_id)
        
        query = query.order_by(AIInsight.created_at.desc())
        
        result = await db.execute(query)
        insights = result.scalars().all()
        
        summaries = []
        for insight in insights:
            summaries.append({
                "insight_id": insight.insight_id,
                "title": insight.title,
                "child_id": insight.child_id,
                "period_start": insight.period_start.isoformat() if insight.period_start else None,
                "period_end": insight.period_end.isoformat() if insight.period_end else None,
                "is_saved": insight.is_saved,
                "saved_at": insight.saved_at.isoformat() if insight.saved_at else None,
                "created_at": insight.created_at.isoformat() if insight.created_at else None
            })
        
        return {"summaries": summaries}
    
    except Exception as e:
        logger.error(f"Error getting weekly summaries: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get weekly summaries: {str(e)}")

# ============================================================================
# Insight Management Endpoints
# ============================================================================

@router.get("/{insight_id}")
async def get_insight(
    insight_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Get a specific insight by ID
    
    Retrieves a single insight (monthly or weekly summary) by ID.
    Verifies ownership before returning.
    
    Args:
        insight_id: ID of the insight to retrieve
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Complete insight data including content and summary_data
    
    Raises:
        HTTPException:
            - 404 if insight not found or user doesn't own it
            - 500 if retrieval fails
    """
    try:
        result = await db.execute(
            select(AIInsight).where(
                AIInsight.insight_id == insight_id,
                AIInsight.user_id == user.user_id
            )
        )
        insight = result.scalar_one_or_none()
        
        if not insight:
            raise HTTPException(status_code=404, detail="Insight not found")
        
        return {
            "insight_id": insight.insight_id,
            "title": insight.title,
            "content": insight.content,
            "summary_data": insight.summary_data,
            "child_id": insight.child_id,
            "month": insight.month,
            "year": insight.year,
            "period_start": insight.period_start.isoformat() if insight.period_start else None,
            "period_end": insight.period_end.isoformat() if insight.period_end else None,
            "is_saved": insight.is_saved,
            "is_read": insight.is_read,
            "saved_at": insight.saved_at.isoformat() if insight.saved_at else None,
            "diary_entries_count": insight.diary_entries_count,
            "ai_agent_type": insight.ai_agent_type,
            "confidence_score": float(insight.confidence_score) if insight.confidence_score else None,
            "model_version": insight.model_version,
            "created_at": insight.created_at.isoformat() if insight.created_at else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting insight: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get insight: {str(e)}")

@router.options("/{insight_id}/save")
async def options_save_insight(request: Request):
    """Handle CORS preflight for save endpoint"""
    from fastapi.responses import Response
    response = Response(status_code=200)
    origin = request.headers.get("origin")
    cors_headers = get_cors_headers(origin)
    for key, value in cors_headers.items():
        response.headers[key] = value
    return response

@router.patch("/{insight_id}/save")
async def save_insight(
    insight_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Mark an insight as saved
    
    Marks an insight as saved and sets saved_at timestamp.
    Saved insights appear in saved summaries lists.
    
    Args:
        insight_id: ID of the insight to save
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Updated insight with is_saved and saved_at
    
    Raises:
        HTTPException:
            - 404 if insight not found or user doesn't own it
            - 500 if save operation fails
    """
    try:
        result = await db.execute(
            select(AIInsight).where(
                AIInsight.insight_id == insight_id,
                AIInsight.user_id == user.user_id
            )
        )
        insight = result.scalar_one_or_none()
        
        if not insight:
            raise HTTPException(status_code=404, detail="Insight not found")
        
        insight.is_saved = True
        insight.saved_at = datetime.utcnow()
        await db.commit()
        await db.refresh(insight)
        
        return {
            "insight_id": insight.insight_id,
            "is_saved": insight.is_saved,
            "saved_at": insight.saved_at.isoformat() if insight.saved_at else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving insight: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save insight: {str(e)}")

@router.options("/{insight_id}/mark-read")
async def options_mark_insight_as_read(request: Request):
    """Handle CORS preflight for mark-read endpoint"""
    from fastapi.responses import Response
    response = Response(status_code=200)
    origin = request.headers.get("origin")
    cors_headers = get_cors_headers(origin)
    for key, value in cors_headers.items():
        response.headers[key] = value
    return response

@router.patch("/{insight_id}/mark-read")
async def mark_insight_as_read(
    insight_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Mark an insight as read
    
    Marks an insight as read. Used for tracking which insights the user has viewed.
    
    Args:
        insight_id: ID of the insight to mark as read
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Confirmation with insight_id and is_read status
    
    Raises:
        HTTPException:
            - 404 if insight not found or user doesn't own it
            - 500 if mark-read operation fails
    """
    try:
        result = await db.execute(
            select(AIInsight).where(
                AIInsight.insight_id == insight_id,
                AIInsight.user_id == user.user_id
            )
        )
        insight = result.scalar_one_or_none()
        
        if not insight:
            raise HTTPException(status_code=404, detail="Insight not found")
        
        insight.is_read = True
        await db.commit()
        
        return {"insight_id": insight_id, "is_read": True}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking insight as read: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to mark insight as read: {str(e)}")

@router.delete("/{insight_id}")
async def delete_insight(
    insight_id: int,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_session)
):
    """
    Delete an insight
    
    Permanently deletes an insight. Verifies ownership before deletion.
    
    Args:
        insight_id: ID of the insight to delete
        user: Authenticated user (from dependency injection)
        db: Database session (from dependency injection)
    
    Returns:
        dict: Success message
    
    Raises:
        HTTPException:
            - 404 if insight not found or user doesn't own it
            - 500 if deletion fails
    """
    try:
        result = await db.execute(
            select(AIInsight).where(
                AIInsight.insight_id == insight_id,
                AIInsight.user_id == user.user_id
            )
        )
        insight = result.scalar_one_or_none()
        
        if not insight:
            raise HTTPException(status_code=404, detail="Insight not found")
        
        await db.delete(insight)
        await db.commit()
        
        return {"message": "Insight deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting insight: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete insight: {str(e)}")

