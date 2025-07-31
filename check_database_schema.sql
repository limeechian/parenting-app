-- Check database schema for ai_chat_interactions table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'ai_chat_interactions' 
ORDER BY ordinal_position;

-- Check if embedding column exists and its type
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ai_chat_interactions' 
AND column_name = 'embedding';

-- Check database schema for ai_conversations table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'ai_conversations' 
ORDER BY ordinal_position;

-- Check if pgvector extension is installed
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check recent conversations
SELECT conversation_id, title, child_id, user_id, created_at 
FROM ai_conversations 
ORDER BY created_at DESC 
LIMIT 10;

-- Check recent chat interactions
SELECT chat_id, conversation_id, query, response, agent_type, generated_at 
FROM ai_chat_interactions 
ORDER BY generated_at DESC 
LIMIT 10;

-- Check if there are any conversations without messages
SELECT c.conversation_id, c.title, COUNT(i.chat_id) as message_count
FROM ai_conversations c
LEFT JOIN ai_chat_interactions i ON c.conversation_id = i.conversation_id
GROUP BY c.conversation_id, c.title
ORDER BY c.conversation_id; 