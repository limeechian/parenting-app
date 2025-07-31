#!/usr/bin/env python3
"""
Test script to verify memory retrieval logic and database structure
"""

import asyncio
import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL environment variable not found!")
    print("Please check your .env file contains DATABASE_URL")
    exit(1)

ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

async def test_memory_retrieval():
    """Test the memory retrieval logic"""
    
    print("🔍 Testing Memory Retrieval Logic")
    print("=" * 50)
    
    # Create async engine
    async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=False)
    AsyncSessionLocal = async_sessionmaker(bind=async_engine, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        # Test 1: Check database structure
        print("\n1. Checking database structure...")
        columns_sql = text('''
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'ai_chat_interactions' 
            ORDER BY ordinal_position
        ''')
        result = await session.execute(columns_sql)
        columns = result.fetchall()
        
        print("ai_chat_interactions table columns:")
        for col in columns:
            print(f"  - {col.column_name}: {col.data_type} (nullable: {col.is_nullable})")
        
        # Test 2: Check existing data
        print("\n2. Checking existing data...")
        data_sql = text('''
            SELECT chat_id, user_id, child_id, query, response, agent_type
            FROM ai_chat_interactions
            ORDER BY generated_at DESC
            LIMIT 10
        ''')
        result = await session.execute(data_sql)
        interactions = result.fetchall()
        
        print(f"Found {len(interactions)} recent interactions:")
        for interaction in interactions:
            print(f"  - chat_id: {interaction.chat_id}, user_id: {interaction.user_id}, child_id: {interaction.child_id}")
            print(f"    query: '{interaction.query[:50]}...'")
            print(f"    agent_type: {interaction.agent_type}")
            print()
        
        # Test 3: Check child-specific vs general data
        print("\n3. Analyzing child_id distribution...")
        child_dist_sql = text('''
            SELECT 
                child_id,
                COUNT(*) as count,
                CASE 
                    WHEN child_id IS NULL THEN 'General'
                    ELSE 'Child-specific'
                END as type
            FROM ai_chat_interactions
            GROUP BY child_id
            ORDER BY child_id NULLS FIRST
        ''')
        result = await session.execute(child_dist_sql)
        distribution = result.fetchall()
        
        print("Child ID distribution:")
        for dist in distribution:
            print(f"  - child_id: {dist.child_id} ({dist.type}): {dist.count} interactions")
        
        # Test 4: Test memory retrieval queries
        print("\n4. Testing memory retrieval queries...")
        
        # Test child-specific query (assuming child_id = 2 exists)
        print("\n   Testing child-specific query (child_id = 2):")
        child_specific_sql = text('''
            SELECT chat_id, child_id, query, (embedding <-> '[0.1,0.2,0.3]') AS distance
            FROM ai_chat_interactions
            WHERE user_id = 3 AND child_id = 2
            ORDER BY embedding <-> '[0.1,0.2,0.3]'
            LIMIT 3
        ''')
        try:
            result = await session.execute(child_specific_sql)
            child_memories = result.fetchall()
            print(f"   Found {len(child_memories)} child-specific memories")
            for mem in child_memories:
                print(f"     - chat_id: {mem.chat_id}, child_id: {mem.child_id}, distance: {mem.distance}")
        except Exception as e:
            print(f"   Error with child-specific query: {e}")
        
        # Test general query
        print("\n   Testing general query (child_id IS NULL):")
        general_sql = text('''
            SELECT chat_id, child_id, query, (embedding <-> '[0.1,0.2,0.3]') AS distance
            FROM ai_chat_interactions
            WHERE user_id = 3 AND child_id IS NULL
            ORDER BY embedding <-> '[0.1,0.2,0.3]'
            LIMIT 3
        ''')
        try:
            result = await session.execute(general_sql)
            general_memories = result.fetchall()
            print(f"   Found {len(general_memories)} general memories")
            for mem in general_memories:
                print(f"     - chat_id: {mem.chat_id}, child_id: {mem.child_id}, distance: {mem.distance}")
        except Exception as e:
            print(f"   Error with general query: {e}")
    
    await async_engine.dispose()
    print("\n✅ Memory retrieval test completed!")

if __name__ == "__main__":
    asyncio.run(test_memory_retrieval()) 