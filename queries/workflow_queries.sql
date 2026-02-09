-- ============================================
-- REQUETES SQL PAR WORKFLOW
-- ============================================
-- Utilisez ces requêtes dans vos workflows n8n
-- avec le node Supabase ou HTTP Request
-- ============================================

-- ============================================
-- WORKFLOW 1: JARVIS (ASSISTANT IA)
-- ============================================

-- Insérer un message dans l'historique
INSERT INTO chat_history (session_id, user_id, role, content, source, metadata)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, created_at;

-- Récupérer les 10 derniers messages d'une session
SELECT role, content, created_at
FROM chat_history
WHERE session_id = $1
ORDER BY created_at DESC
LIMIT 10;

-- Créer une demande de validation
INSERT INTO validations (session_id, user_id, action_type, action_description, action_data)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, expires_at;

-- Approuver une validation
UPDATE validations
SET
    status = 'approved',
    responded_at = NOW(),
    response_by = $2,
    response_note = $3
WHERE id = $1 AND status = 'pending'
RETURNING *;

-- Rejeter une validation
UPDATE validations
SET
    status = 'rejected',
    responded_at = NOW(),
    response_by = $2,
    response_note = $3
WHERE id = $1 AND status = 'pending'
RETURNING *;

-- Recherche RAG avec embedding
SELECT * FROM match_documents(
    $1::vector,  -- embedding du query
    0.7,         -- seuil de similarité
    5,           -- nombre de résultats
    NULL,        -- filtre catégorie (optionnel)
    'jarvis'     -- filtre workflow
);

-- Ajouter un document au RAG
INSERT INTO documents (content, title, category, source, metadata, embedding, workflow_source)
VALUES ($1, $2, $3, $4, $5, $6, 'jarvis')
RETURNING id;

-- Enregistrer un pattern utilisateur
INSERT INTO user_patterns (user_id, pattern_type, pattern_data, confidence)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id, pattern_type)
DO UPDATE SET
    pattern_data = $3,
    confidence = LEAST(user_patterns.confidence + 0.1, 1.0),
    usage_count = user_patterns.usage_count + 1,
    last_used_at = NOW();

-- ============================================
-- WORKFLOW 2: ACTUALITES & VEILLE
-- ============================================

-- Ajouter une source de news
INSERT INTO news_sources (name, type, url, config, check_frequency_minutes)
VALUES ($1, $2, $3, $4, $5)
RETURNING id;

-- Lister les sources actives à vérifier
SELECT id, name, type, url, config
FROM news_sources
WHERE is_active = true
AND (last_checked_at IS NULL OR last_checked_at < NOW() - (check_frequency_minutes || ' minutes')::interval)
ORDER BY last_checked_at ASC NULLS FIRST
LIMIT 10;

-- Mettre à jour le statut d'une source après check
UPDATE news_sources
SET
    last_checked_at = NOW(),
    error_count = CASE WHEN $2 THEN 0 ELSE error_count + 1 END,
    last_error = CASE WHEN $2 THEN NULL ELSE $3 END
WHERE id = $1;

-- Insérer un nouvel article (évite les doublons)
INSERT INTO news_articles (source_id, external_id, title, content, summary, url, image_url, author, published_at, metadata)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
ON CONFLICT (source_id, external_id) DO NOTHING
RETURNING id;

-- Recherche d'articles par mots-clés
SELECT
    a.id,
    a.title,
    a.summary,
    a.url,
    a.published_at,
    s.name as source_name,
    array_agg(t.name) as tags
FROM news_articles a
LEFT JOIN news_sources s ON a.source_id = s.id
LEFT JOIN news_article_tags at ON a.id = at.article_id
LEFT JOIN news_tags t ON at.tag_id = t.id
WHERE
    a.title ILIKE ANY($1)  -- array de patterns '%keyword%'
    OR a.content ILIKE ANY($1)
GROUP BY a.id, s.name
ORDER BY a.published_at DESC
LIMIT 50;

-- Récupérer les articles non traités
SELECT id, title, content, url
FROM news_articles
WHERE is_processed = false
ORDER BY published_at DESC
LIMIT 20;

-- Marquer un article comme traité + ajouter embedding
UPDATE news_articles
SET
    is_processed = true,
    summary = $2,
    embedding = $3,
    sentiment_score = $4,
    relevance_score = $5
WHERE id = $1;

-- Vérifier les alertes pour un article
SELECT
    al.id as alert_id,
    al.user_id,
    al.name as alert_name,
    al.notification_channels
FROM news_alerts al
WHERE
    al.is_active = true
    AND (
        al.keywords && $1::text[]  -- mots-clés trouvés dans l'article
        OR $2 >= al.min_relevance_score  -- score de pertinence
    )
    AND NOT (al.excluded_keywords && $1::text[]);

-- Recherche sémantique d'articles
SELECT * FROM match_news_articles(
    $1::vector,  -- embedding de la recherche
    0.6,         -- seuil
    20           -- limite
);

-- ============================================
-- WORKFLOW 3: PROSPECTION
-- ============================================

-- Créer ou mettre à jour une entreprise
INSERT INTO companies (name, domain, industry, website, linkedin_url, description)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (domain) DO UPDATE SET
    name = EXCLUDED.name,
    industry = COALESCE(EXCLUDED.industry, companies.industry),
    website = COALESCE(EXCLUDED.website, companies.website),
    linkedin_url = COALESCE(EXCLUDED.linkedin_url, companies.linkedin_url),
    updated_at = NOW()
RETURNING id;

-- Créer un nouveau lead
INSERT INTO leads (company_id, first_name, last_name, email, job_title, linkedin_url, source, tags)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (email) DO UPDATE SET
    company_id = COALESCE(EXCLUDED.company_id, leads.company_id),
    linkedin_url = COALESCE(EXCLUDED.linkedin_url, leads.linkedin_url),
    updated_at = NOW()
RETURNING id;

-- Enrichir un lead avec les données LinkedIn
UPDATE leads
SET
    linkedin_profile = $2,
    job_title = COALESCE($3, job_title),
    score = calculate_lead_score(id),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- Récupérer les leads à contacter
SELECT
    l.id,
    l.first_name,
    l.last_name,
    l.email,
    l.job_title,
    l.score,
    c.name as company_name,
    c.industry
FROM leads l
LEFT JOIN companies c ON l.company_id = c.id
WHERE
    l.status = 'new'
    AND l.email IS NOT NULL
    AND (l.last_contacted_at IS NULL OR l.last_contacted_at < NOW() - interval '7 days')
ORDER BY l.score DESC
LIMIT 50;

-- Mettre à jour le statut d'un lead
UPDATE leads
SET
    status = $2,
    last_contacted_at = NOW(),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- Logger une activité de prospection
INSERT INTO prospect_activities (lead_id, campaign_id, type, description, metadata, performed_by)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id;

-- Statistiques d'une campagne
SELECT
    c.id,
    c.name,
    c.status,
    COUNT(cl.id) as total_leads,
    COUNT(cl.id) FILTER (WHERE cl.status = 'completed') as completed,
    COUNT(cl.id) FILTER (WHERE cl.status = 'replied') as replied,
    c.stats
FROM campaigns c
LEFT JOIN campaign_leads cl ON c.id = cl.campaign_id
WHERE c.id = $1
GROUP BY c.id;

-- Récupérer le prochain lead à contacter dans une campagne
SELECT
    l.id as lead_id,
    l.email,
    l.first_name,
    l.last_name,
    c.name as company_name,
    cl.current_step,
    cl.sequence_data
FROM campaign_leads cl
JOIN leads l ON cl.lead_id = l.id
LEFT JOIN companies c ON l.company_id = c.id
WHERE
    cl.campaign_id = $1
    AND cl.status = 'in_progress'
    AND (
        cl.sequence_data->>'next_send_at' IS NULL
        OR (cl.sequence_data->>'next_send_at')::timestamp <= NOW()
    )
ORDER BY cl.enrolled_at ASC
LIMIT 10;

-- Pipeline de prospection (pour dashboard)
SELECT * FROM v_prospect_pipeline;

-- ============================================
-- WORKFLOW 4: GESTION DE PROJETS
-- ============================================

-- Créer un nouveau projet
INSERT INTO projects (name, description, client_company_id, type, budget, start_date, due_date, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id;

-- Ajouter un membre au projet
INSERT INTO project_members (project_id, user_id, role)
VALUES ($1, $2, $3)
ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- Créer une tâche
INSERT INTO tasks (project_id, milestone_id, title, description, priority, assigned_to, estimated_hours, due_date, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id;

-- Mettre à jour le statut d'une tâche
UPDATE tasks
SET
    status = $2,
    started_at = CASE WHEN $2 = 'in_progress' AND started_at IS NULL THEN NOW() ELSE started_at END,
    completed_at = CASE WHEN $2 = 'done' THEN NOW() ELSE NULL END,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- Récupérer les tâches d'un projet (kanban)
SELECT
    t.id,
    t.title,
    t.status,
    t.priority,
    t.due_date,
    t.estimated_hours,
    t.actual_hours,
    u.full_name as assignee_name,
    m.name as milestone_name
FROM tasks t
LEFT JOIN users u ON t.assigned_to = u.id
LEFT JOIN milestones m ON t.milestone_id = m.id
WHERE t.project_id = $1
ORDER BY t.order_index, t.created_at;

-- Tâches en retard
SELECT
    t.id,
    t.title,
    t.due_date,
    p.name as project_name,
    u.full_name as assignee_name,
    u.email as assignee_email
FROM tasks t
JOIN projects p ON t.project_id = p.id
LEFT JOIN users u ON t.assigned_to = u.id
WHERE
    t.status NOT IN ('done')
    AND t.due_date < NOW()
ORDER BY t.due_date ASC;

-- Logger du temps sur une tâche
INSERT INTO time_entries (task_id, user_id, description, hours, date, billable)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id;

-- Mise à jour automatique des heures réelles
UPDATE tasks t
SET actual_hours = (
    SELECT COALESCE(SUM(hours), 0)
    FROM time_entries
    WHERE task_id = t.id
)
WHERE id = $1;

-- Dashboard projet
SELECT * FROM v_project_dashboard WHERE id = $1;

-- Statistiques projet
SELECT get_project_stats($1) as stats;

-- ============================================
-- WORKFLOW 5: MONTEUR VIDEO (STUDIO)
-- ============================================

-- Créer un projet vidéo
INSERT INTO video_projects (name, description, type, client_name, specs, deadline, project_id, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id;

-- Uploader un asset média
INSERT INTO media_assets (video_project_id, name, type, file_path, file_size_bytes, duration_seconds, resolution, codec, metadata, uploaded_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING id;

-- Lister les assets d'un projet
SELECT
    id,
    name,
    type,
    file_path,
    duration_seconds,
    resolution,
    thumbnail_url,
    is_favorite,
    tags
FROM media_assets
WHERE video_project_id = $1
AND is_archived = false
ORDER BY
    is_favorite DESC,
    type,
    created_at DESC;

-- Créer une timeline
INSERT INTO video_timelines (video_project_id, name, version, timeline_data, created_by)
VALUES ($1, $2, $3, $4, $5)
RETURNING id;

-- Mettre à jour une timeline
UPDATE video_timelines
SET
    timeline_data = $2,
    duration_seconds = $3,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- Soumettre un job de rendu
INSERT INTO render_jobs (video_project_id, timeline_id, name, output_format, output_settings, priority, requested_by)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id;

-- Mettre à jour le progrès d'un rendu
UPDATE render_jobs
SET
    status = $2,
    progress = $3,
    started_at = CASE WHEN $2 = 'rendering' AND started_at IS NULL THEN NOW() ELSE started_at END,
    completed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE NULL END,
    output_path = $4,
    output_size_bytes = $5,
    render_time_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
WHERE id = $1
RETURNING *;

-- Jobs de rendu en attente
SELECT
    rj.id,
    rj.name,
    rj.output_format,
    rj.output_settings,
    rj.priority,
    vp.name as project_name,
    vt.timeline_data
FROM render_jobs rj
JOIN video_projects vp ON rj.video_project_id = vp.id
LEFT JOIN video_timelines vt ON rj.timeline_id = vt.id
WHERE rj.status = 'queued'
ORDER BY rj.priority DESC, rj.created_at ASC
LIMIT 5;

-- Créer une révision
INSERT INTO video_revisions (video_project_id, timeline_id, render_job_id, version_number, review_url)
VALUES ($1, $2, $3, $4, $5)
RETURNING id;

-- Soumettre un feedback client
UPDATE video_revisions
SET
    status = $2,
    feedback = $3,
    timecode_comments = $4,
    reviewed_by = $5,
    reviewed_at = NOW()
WHERE id = $1
RETURNING *;

-- Statut des projets vidéo
SELECT * FROM v_video_status;

-- ============================================
-- REQUETES UTILITAIRES
-- ============================================

-- Créer un utilisateur
INSERT INTO users (email, full_name, role, telegram_id)
VALUES ($1, $2, $3, $4)
ON CONFLICT (email) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    telegram_id = COALESCE(EXCLUDED.telegram_id, users.telegram_id),
    updated_at = NOW()
RETURNING id;

-- Créer une notification
INSERT INTO notifications (user_id, type, title, message, data, source_workflow)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id;

-- Marquer les notifications comme lues
UPDATE notifications
SET is_read = true, read_at = NOW()
WHERE user_id = $1 AND is_read = false
RETURNING id;

-- Logger un workflow
INSERT INTO workflow_logs (workflow_name, workflow_id, execution_id, status, message, data, duration_ms)
VALUES ($1, $2, $3, $4, $5, $6, $7);

-- Audit trail
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
VALUES ($1, $2, $3, $4, $5, $6);

-- Nettoyer les données anciennes (à exécuter périodiquement)
-- Supprime les logs de plus de 90 jours
DELETE FROM workflow_logs WHERE created_at < NOW() - interval '90 days';
DELETE FROM audit_logs WHERE created_at < NOW() - interval '180 days';
DELETE FROM chat_history WHERE created_at < NOW() - interval '30 days';

-- Nettoyer les validations expirées
SELECT cleanup_expired_validations();
