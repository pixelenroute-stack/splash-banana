-- ============================================
-- SCHEMA SQL SAFE - Gère les tables existantes
-- ============================================
-- Version: 2.1 (Safe Migration)
-- ============================================

-- ============================================
-- EXTENSIONS REQUISES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- PARTIE 1: TABLES COMMUNES (APP WEB)
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user', 'viewer')),
    preferences JSONB DEFAULT '{}',
    telegram_id VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_telegram_idx ON users(telegram_id);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    source VARCHAR(50) DEFAULT 'web',
    device_info JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(session_token);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    source_workflow VARCHAR(100),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications(user_id, is_read, created_at DESC);

-- ============================================
-- PARTIE 2: MIGRATION TABLE DOCUMENTS (existante)
-- ============================================

-- Ajouter les colonnes manquantes si la table existe
DO $$
BEGIN
    -- Ajouter workflow_source si manquant
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documents' AND column_name = 'workflow_source'
    ) THEN
        ALTER TABLE documents ADD COLUMN workflow_source VARCHAR(100) DEFAULT 'jarvis';
    END IF;

    -- Ajouter created_by si manquant
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documents' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE documents ADD COLUMN created_by UUID;
    END IF;
END $$;

-- Créer l'index si manquant
CREATE INDEX IF NOT EXISTS documents_workflow_idx ON documents(workflow_source);

-- ============================================
-- PARTIE 2B: TABLES JARVIS (créer si manquantes)
-- ============================================

-- Table documents (si elle n'existe pas encore)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding VECTOR(1536),
    source VARCHAR(255),
    title VARCHAR(500),
    category VARCHAR(100),
    workflow_source VARCHAR(100) DEFAULT 'jarvis',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS documents_category_idx ON documents(category);

-- Chat history
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    user_id UUID,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    source VARCHAR(50) DEFAULT 'web',
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_history_session_idx ON chat_history(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_history_user_idx ON chat_history(user_id, created_at DESC);

-- Validations
CREATE TABLE IF NOT EXISTS validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    user_id UUID,
    action_type VARCHAR(100) NOT NULL,
    action_description TEXT NOT NULL,
    action_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    response_by UUID,
    response_note TEXT,
    execution_result JSONB,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS validations_status_idx ON validations(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS validations_user_idx ON validations(user_id);

-- User patterns
CREATE TABLE IF NOT EXISTS user_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    pattern_type VARCHAR(100) NOT NULL,
    pattern_data JSONB NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.5,
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_patterns_user_idx ON user_patterns(user_id, pattern_type);

-- ============================================
-- PARTIE 3: WORKFLOW ACTUALITES & VEILLE
-- ============================================

CREATE TABLE IF NOT EXISTS news_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    check_frequency_minutes INTEGER DEFAULT 60,
    last_checked_at TIMESTAMP WITH TIME ZONE,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS news_sources_active_idx ON news_sources(is_active, last_checked_at);

CREATE TABLE IF NOT EXISTS news_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID,
    external_id VARCHAR(255),
    title TEXT NOT NULL,
    content TEXT,
    summary TEXT,
    url TEXT,
    image_url TEXT,
    author VARCHAR(255),
    published_at TIMESTAMP WITH TIME ZONE,
    sentiment_score DECIMAL(3,2),
    relevance_score DECIMAL(3,2),
    embedding VECTOR(1536),
    metadata JSONB DEFAULT '{}',
    is_processed BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS news_articles_source_idx ON news_articles(source_id, published_at DESC);
CREATE INDEX IF NOT EXISTS news_articles_embedding_idx ON news_articles USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS news_articles_published_idx ON news_articles(published_at DESC);

CREATE TABLE IF NOT EXISTS news_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    description TEXT,
    is_auto_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS news_article_tags (
    article_id UUID,
    tag_id UUID,
    confidence DECIMAL(3,2) DEFAULT 1.0,
    PRIMARY KEY (article_id, tag_id)
);

CREATE TABLE IF NOT EXISTS news_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    name VARCHAR(255) NOT NULL,
    keywords TEXT[] NOT NULL,
    excluded_keywords TEXT[],
    source_ids UUID[],
    min_relevance_score DECIMAL(3,2) DEFAULT 0.5,
    notification_channels VARCHAR(50)[] DEFAULT ARRAY['web'],
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS news_alerts_user_idx ON news_alerts(user_id, is_active);

-- ============================================
-- PARTIE 4: WORKFLOW PROSPECTION
-- ============================================

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    industry VARCHAR(100),
    size VARCHAR(50),
    linkedin_url TEXT,
    website TEXT,
    description TEXT,
    logo_url TEXT,
    location JSONB DEFAULT '{}',
    social_profiles JSONB DEFAULT '{}',
    enrichment_data JSONB DEFAULT '{}',
    last_enriched_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS companies_domain_idx ON companies(domain);
CREATE INDEX IF NOT EXISTS companies_industry_idx ON companies(industry);

CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    job_title VARCHAR(255),
    linkedin_url TEXT,
    linkedin_profile JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'new',
    score INTEGER DEFAULT 0,
    source VARCHAR(100),
    tags TEXT[],
    notes TEXT,
    assigned_to UUID,
    last_contacted_at TIMESTAMP WITH TIME ZONE,
    next_action_date DATE,
    next_action_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_company_idx ON leads(company_id);
CREATE INDEX IF NOT EXISTS leads_email_idx ON leads(email);
CREATE INDEX IF NOT EXISTS leads_score_idx ON leads(score DESC);

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    description TEXT,
    target_criteria JSONB DEFAULT '{}',
    sequence_config JSONB DEFAULT '{}',
    stats JSONB DEFAULT '{"sent": 0, "opened": 0, "clicked": 0, "replied": 0, "meetings": 0}',
    created_by UUID,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS campaigns_status_idx ON campaigns(status);

CREATE TABLE IF NOT EXISTS campaign_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID,
    lead_id UUID,
    status VARCHAR(50) DEFAULT 'pending',
    current_step INTEGER DEFAULT 0,
    sequence_data JSONB DEFAULT '{}',
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS campaign_leads_campaign_idx ON campaign_leads(campaign_id, status);
CREATE INDEX IF NOT EXISTS campaign_leads_lead_idx ON campaign_leads(lead_id);

CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'outreach',
    variables TEXT[],
    is_active BOOLEAN DEFAULT true,
    stats JSONB DEFAULT '{"sent": 0, "opened": 0, "clicked": 0, "replied": 0}',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prospect_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID,
    campaign_id UUID,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    performed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prospect_activities_lead_idx ON prospect_activities(lead_id, created_at DESC);

-- ============================================
-- PARTIE 5: WORKFLOW GESTION DE PROJETS
-- ============================================

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client_company_id UUID,
    status VARCHAR(50) DEFAULT 'planning',
    priority VARCHAR(20) DEFAULT 'medium',
    type VARCHAR(100),
    budget DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    start_date DATE,
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    progress INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);
CREATE INDEX IF NOT EXISTS projects_due_date_idx ON projects(due_date);

CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID,
    user_id UUID,
    role VARCHAR(50) DEFAULT 'member',
    permissions JSONB DEFAULT '{}',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS project_members_project_idx ON project_members(project_id);
CREATE INDEX IF NOT EXISTS project_members_user_idx ON project_members(user_id);

CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS milestones_project_idx ON milestones(project_id, order_index);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID,
    milestone_id UUID,
    parent_task_id UUID,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo',
    priority VARCHAR(20) DEFAULT 'medium',
    assigned_to UUID,
    estimated_hours DECIMAL(6,2),
    actual_hours DECIMAL(6,2),
    due_date TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    tags TEXT[],
    order_index INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tasks_project_idx ON tasks(project_id, status);
CREATE INDEX IF NOT EXISTS tasks_assigned_idx ON tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks(due_date);

CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID,
    user_id UUID,
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS task_comments_task_idx ON task_comments(task_id, created_at DESC);

CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID,
    user_id UUID,
    description TEXT,
    hours DECIMAL(6,2) NOT NULL,
    date DATE NOT NULL,
    billable BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS time_entries_task_idx ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS time_entries_user_idx ON time_entries(user_id, date DESC);

-- ============================================
-- PARTIE 6: WORKFLOW VIDEO STUDIO
-- ============================================

CREATE TABLE IF NOT EXISTS video_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'planning',
    client_name VARCHAR(255),
    specs JSONB DEFAULT '{"resolution": "1920x1080", "fps": 30, "format": "mp4"}',
    duration_seconds INTEGER,
    deadline DATE,
    delivery_formats TEXT[],
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS video_projects_status_idx ON video_projects(status);

CREATE TABLE IF NOT EXISTS media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_project_id UUID,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT,
    duration_seconds DECIMAL(10,3),
    resolution VARCHAR(20),
    codec VARCHAR(50),
    thumbnail_url TEXT,
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    is_favorite BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS media_assets_project_idx ON media_assets(video_project_id, type);

CREATE TABLE IF NOT EXISTS video_timelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_project_id UUID,
    name VARCHAR(255) NOT NULL,
    version INTEGER DEFAULT 1,
    is_main BOOLEAN DEFAULT false,
    duration_seconds DECIMAL(10,3),
    timeline_data JSONB DEFAULT '{}',
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS video_timelines_project_idx ON video_timelines(video_project_id);

CREATE TABLE IF NOT EXISTS render_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_project_id UUID,
    timeline_id UUID,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'queued',
    priority INTEGER DEFAULT 5,
    output_format VARCHAR(50),
    output_settings JSONB DEFAULT '{}',
    output_path TEXT,
    output_size_bytes BIGINT,
    progress INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    render_time_seconds INTEGER,
    requested_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS render_jobs_status_idx ON render_jobs(status, priority DESC);

CREATE TABLE IF NOT EXISTS video_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_project_id UUID,
    timeline_id UUID,
    render_job_id UUID,
    version_number INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    review_url TEXT,
    feedback TEXT,
    timecode_comments JSONB DEFAULT '[]',
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS video_revisions_project_idx ON video_revisions(video_project_id, version_number DESC);

-- ============================================
-- PARTIE 7: LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name VARCHAR(100) NOT NULL,
    workflow_id VARCHAR(100),
    execution_id VARCHAR(100),
    status VARCHAR(50),
    message TEXT,
    data JSONB DEFAULT '{}',
    error_details JSONB,
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workflow_logs_workflow_idx ON workflow_logs(workflow_name, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id);

-- ============================================
-- PARTIE 8: FONCTIONS
-- ============================================

-- Fonction: Recherche vectorielle (RAG)
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5,
    filter_category VARCHAR DEFAULT NULL,
    filter_workflow VARCHAR DEFAULT NULL
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
        AND (filter_workflow IS NULL OR d.workflow_source = filter_workflow)
        AND d.embedding IS NOT NULL
        AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Fonction: Recherche d'articles similaires
CREATE OR REPLACE FUNCTION match_news_articles(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    summary TEXT,
    url TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.title,
        a.summary,
        a.url,
        a.published_at,
        1 - (a.embedding <=> query_embedding) AS similarity
    FROM news_articles a
    WHERE
        a.embedding IS NOT NULL
        AND 1 - (a.embedding <=> query_embedding) > match_threshold
    ORDER BY a.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Fonction: Récupérer l'historique de chat
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

-- Fonction: Statistiques projet
CREATE OR REPLACE FUNCTION get_project_stats(p_project_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_tasks', COUNT(*),
        'completed_tasks', COUNT(*) FILTER (WHERE status = 'done'),
        'in_progress_tasks', COUNT(*) FILTER (WHERE status = 'in_progress'),
        'blocked_tasks', COUNT(*) FILTER (WHERE status = 'blocked'),
        'overdue_tasks', COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('done')),
        'total_hours_estimated', COALESCE(SUM(estimated_hours), 0),
        'total_hours_actual', COALESCE(SUM(actual_hours), 0)
    ) INTO result
    FROM tasks
    WHERE project_id = p_project_id;

    RETURN result;
END;
$$;

-- Fonction: Nettoyer les validations expirées
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

-- Fonction: Calculer le score d'un lead
CREATE OR REPLACE FUNCTION calculate_lead_score(p_lead_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_score INTEGER := 0;
    v_lead RECORD;
    v_activity_count INTEGER;
BEGIN
    SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    IF v_lead.email IS NOT NULL THEN v_score := v_score + 10; END IF;
    IF v_lead.phone IS NOT NULL THEN v_score := v_score + 5; END IF;
    IF v_lead.linkedin_url IS NOT NULL THEN v_score := v_score + 10; END IF;
    IF v_lead.company_id IS NOT NULL THEN v_score := v_score + 15; END IF;

    SELECT COUNT(*) INTO v_activity_count
    FROM prospect_activities
    WHERE lead_id = p_lead_id AND type IN ('email_opened', 'email_clicked', 'email_replied');

    v_score := v_score + LEAST(v_activity_count * 5, 30);

    CASE v_lead.status
        WHEN 'qualified' THEN v_score := v_score + 20;
        WHEN 'meeting' THEN v_score := v_score + 30;
        WHEN 'proposal' THEN v_score := v_score + 40;
        WHEN 'negotiation' THEN v_score := v_score + 50;
        ELSE v_score := v_score;
    END CASE;

    RETURN LEAST(v_score, 100);
END;
$$;

-- ============================================
-- PARTIE 9: TRIGGER updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PARTIE 10: VUES
-- ============================================

CREATE OR REPLACE VIEW v_project_dashboard AS
SELECT
    p.id,
    p.name,
    p.status,
    p.priority,
    p.due_date,
    p.progress,
    c.name as client_name,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'done') as completed_tasks,
    COUNT(DISTINCT pm.user_id) as team_size
FROM projects p
LEFT JOIN companies c ON p.client_company_id = c.id
LEFT JOIN tasks t ON p.id = t.project_id
LEFT JOIN project_members pm ON p.id = pm.project_id
GROUP BY p.id, c.name;

CREATE OR REPLACE VIEW v_prospect_pipeline AS
SELECT
    l.status,
    COUNT(*) as count,
    SUM(CASE WHEN l.score >= 70 THEN 1 ELSE 0 END) as hot_leads,
    AVG(l.score)::INTEGER as avg_score
FROM leads l
GROUP BY l.status;

CREATE OR REPLACE VIEW v_video_status AS
SELECT
    vp.id,
    vp.name,
    vp.status,
    vp.deadline,
    vp.client_name,
    COUNT(DISTINCT ma.id) as asset_count,
    COUNT(DISTINCT vt.id) as timeline_count,
    MAX(rj.progress) FILTER (WHERE rj.status = 'rendering') as current_render_progress,
    COUNT(DISTINCT vr.id) FILTER (WHERE vr.status = 'changes_requested') as pending_revisions
FROM video_projects vp
LEFT JOIN media_assets ma ON vp.id = ma.video_project_id
LEFT JOIN video_timelines vt ON vp.id = vt.video_project_id
LEFT JOIN render_jobs rj ON vp.id = rj.video_project_id
LEFT JOIN video_revisions vr ON vp.id = vr.video_project_id
GROUP BY vp.id;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT
    'Tables' as type,
    COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 'Fonctions', COUNT(*)
FROM information_schema.routines
WHERE routine_schema = 'public'
UNION ALL
SELECT 'Vues', COUNT(*)
FROM information_schema.views
WHERE table_schema = 'public';
