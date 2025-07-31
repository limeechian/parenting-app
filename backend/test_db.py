import asyncio
from main import AsyncSessionLocal
from sqlalchemy import text

async def check_conversations():
    async with AsyncSessionLocal() as session:
        # Check conversations with child_id 2
        result = await session.execute(text('SELECT conversation_id, child_id, title FROM ai_conversations WHERE child_id = 2'))
        rows = result.fetchall()
        print('Conversations with child_id 2:')
        for row in rows:
            print(f'  {row.conversation_id}: {row.title}')
        
        # Check all conversations
        result = await session.execute(text('SELECT conversation_id, child_id, title FROM ai_conversations ORDER BY conversation_id'))
        rows = result.fetchall()
        print('\nAll conversations:')
        for row in rows:
            print(f'  {row.conversation_id}: child_id={row.child_id}, title={row.title}')

if __name__ == "__main__":
    asyncio.run(check_conversations()) 