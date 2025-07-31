-- Check the children table to see the actual child_id values
SELECT child_id, name, age, gender FROM children_profile ORDER BY child_id;

-- Check the conversations table to see current child_id assignments
SELECT conversation_id, child_id, title FROM ai_conversations ORDER BY conversation_id; 