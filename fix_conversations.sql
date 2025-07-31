-- Update ai_conversations table to set child_id = 2 for conversations that should be associated with child_id 2
-- First, let's see what conversations exist
SELECT conversation_id, child_id, title FROM ai_conversations ORDER BY conversation_id;

-- Update conversations to have child_id = 2 (replace with the actual conversation_id you want to update)
-- For example, if conversation_id 2 should be associated with child_id 2:
UPDATE ai_conversations 
SET child_id = 2 
WHERE conversation_id = 2;

-- Or if you want to update multiple conversations:
-- UPDATE ai_conversations 
-- SET child_id = 2 
-- WHERE conversation_id IN (2, 3, 4); -- replace with actual conversation_ids

-- Verify the update
SELECT conversation_id, child_id, title FROM ai_conversations ORDER BY conversation_id; 