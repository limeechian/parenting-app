-- Database setup script for Amazon RDS PostgreSQL
-- Run this after creating your RDS instance

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR,
    role VARCHAR(50) NOT NULL,
    google_id VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    is_superuser BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create parent profile table
CREATE TABLE IF NOT EXISTS parent_users_profile (
    id INTEGER PRIMARY KEY REFERENCES users(id),
    full_name VARCHAR(100),
    gender VARCHAR(10),
    age INTEGER,
    phone_number VARCHAR(50),
    education_level VARCHAR(50),
    relationship_with_child VARCHAR(50),
    relationship_status VARCHAR(20),
    birthdate DATE,
    location VARCHAR(255),
    occupation VARCHAR(100),
    parenting_style VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- Create children profile table
CREATE TABLE IF NOT EXISTS children_profile (
    child_id SERIAL PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR(100),
    gender VARCHAR(10),
    age INTEGER,
    birthdate DATE,
    education_level VARCHAR(50),
    developmental_stage VARCHAR(50),
    special_needs TEXT[],
    characteristics TEXT[],
    current_challenges TEXT[],
    special_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- Create AI conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
    conversation_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    child_id INTEGER REFERENCES children_profile(child_id),
    title VARCHAR(255),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    conversation_type VARCHAR(50) DEFAULT 'general',
    primary_agent_type VARCHAR(100),
    enabled_agents JSONB DEFAULT '[]',
    participating_agents JSONB DEFAULT '[]',
    summary_embedding vector(1536)
);

-- Create AI chat interactions table
CREATE TABLE IF NOT EXISTS ai_chat_interactions (
    chat_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    child_id INTEGER REFERENCES children_profile(child_id),
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    agent_type VARCHAR(100),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    generated_by INTEGER REFERENCES users(id),
    retrieved_memories_pgvector TEXT,
    conversation_id INTEGER REFERENCES ai_conversations(conversation_id),
    embedding vector(1536)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_children_parent_id ON children_profile(parent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_child_id ON ai_conversations(child_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON ai_chat_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_child_id ON ai_chat_interactions(child_id);
CREATE INDEX IF NOT EXISTS idx_interactions_conversation_id ON ai_chat_interactions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_interactions_embedding ON ai_chat_interactions USING ivfflat (embedding vector_cosine_ops);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parent_profile_updated_at BEFORE UPDATE ON parent_users_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_children_profile_updated_at BEFORE UPDATE ON children_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON ai_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 