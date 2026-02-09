-- ============================================
-- SCHEMA SQL POUR N8N RAG AGENT ORCHESTRATOR
-- ============================================
-- Exécutez ce script dans Supabase SQL Editor
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- 1. Activer l'extension pgvector pour les embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- TABLE: documents (RAG - Base de connaissances)
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding VECTOR(1536), -- OpenAI ada-002 = 1536 dimensions
    source VARCHAR(255),
    title VARCHAR(500),
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche vectorielle (HNSW - plus rapide)
CREATE INDEX IF NOT EXISTS documents_embedding_idx
ON documents USING hnsw (embedding vector_cosine_ops);

-- Index pour filtrage par catégorie
CREATE INDEX IF NOT EXISTS documents_category_idx ON documents(category);

-- ============================================
-- TABLE: chat_history (Historique des conversations)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    source VARCHAR(50) DEFAULT 'web' CHECK (source IN ('web', 'telegram', 'api')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour récupérer l'historique par session
CREATE INDEX IF NOT EXISTS chat_history_session_idx ON chat_history(session_id, created_at DESC);

-- Index pour récupérer par utilisateur
CREATE INDEX IF NOT EXISTS chat_history_user_idx ON chat_history(user_id, created_at DESC);

-- ============================================
-- TABLE: validations (Actions sensibles en attente)
-- ============================================
CREATE TABLE IF NOT EXISTS validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    action_type VARCHAR(100) NOT NULL,
    action_description TEXT NOT NULL,
    action_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    response_by VARCHAR(255),
    response_note TEXT,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Index pour récupérer les validations en attente
CREATE INDEX IF NOT EXISTS validations_status_idx ON validations(status, requested_at DESC);

-- Index pour récupérer par session
CREATE INDEX IF NOT EXISTS validations_session_idx ON validations(session_id);

-- ============================================
-- TABLE: user_patterns (Apprentissage des préférences)
-- ============================================
CREATE TABLE IF NOT EXISTS user_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    pattern_type VARCHAR(100) NOT NULL,
    pattern_data JSONB NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.5,
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour patterns par utilisateur
CREATE INDEX IF NOT EXISTS user_patterns_user_idx ON user_patterns(user_id, pattern_type);

-- ============================================
-- FONCTION: Recherche vectorielle (RAG)
-- ============================================
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5,
    filter_category VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    title VARCHAR,
    category VARCHAR,
    source VARCHAR,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.content,
        d.title,
        d.category,
        d.source,
        d.metadata,
        1 - (d.embedding <=> query_embedding) AS similarity
    FROM documents d
    WHERE
        (filter_category IS NULL OR d.category = filter_category)
        AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- FONCTION: Récupérer l'historique de chat
-- ============================================
CREATE OR REPLACE FUNCTION get_chat_history(
    p_session_id VARCHAR,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    role VARCHAR,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ch.role,
        ch.content,
        ch.created_at
    FROM chat_history ch
    WHERE ch.session_id = p_session_id
    ORDER BY ch.created_at DESC
    LIMIT p_limit;
END;
$$;

-- ============================================
-- FONCTION: Nettoyer les validations expirées
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_validations()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    rows_updated INTEGER;
BEGIN
    UPDATE validations
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < NOW();

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RETURN rows_updated;
END;
$$;

-- ============================================
-- TRIGGER: Mise à jour automatique de updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS (Row Level Security) - Optionnel mais recommandé
-- ============================================
-- Décommentez ces lignes si vous voulez activer RLS

-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE validations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_patterns ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre l'accès via service_role
-- CREATE POLICY "Service role access" ON documents FOR ALL USING (true);
-- CREATE POLICY "Service role access" ON chat_history FOR ALL USING (true);
-- CREATE POLICY "Service role access" ON validations FOR ALL USING (true);
-- CREATE POLICY "Service role access" ON user_patterns FOR ALL USING (true);

-- ============================================
-- DONNÉES DE TEST (Optionnel)
-- ============================================
-- Insérer quelques documents de test pour vérifier que tout fonctionne

-- INSERT INTO documents (content, title, category, source, metadata) VALUES
-- ('Ceci est un document de test pour le RAG.', 'Document Test', 'test', 'manual', '{"test": true}'),
-- ('Les workflows n8n permettent d''automatiser des tâches.', 'Guide n8n', 'documentation', 'manual', '{"topic": "n8n"}');

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Exécutez cette requête pour vérifier que tout est créé

SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('documents', 'chat_history', 'validations', 'user_patterns')
ORDER BY table_name;
