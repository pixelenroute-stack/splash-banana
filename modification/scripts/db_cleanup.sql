
-- =====================================================================================
-- SCRIPT D'AUDIT ET DE NETTOYAGE DE PRODUCTION (PIXEL EN ROUTE)
-- Auteur: Senior DevOps
-- Date: 2024
-- Usage: Copier/Coller dans Supabase Dashboard > SQL Editor
-- Sécurité: La section DELETE est encapsulée dans une transaction.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. SECTION ANALYSE (READ-ONLY) - Exécutez ceci pour voir l'étendue des dégâts
-- -------------------------------------------------------------------------------------

-- A. Identifier les utilisateurs de test / spam
SELECT 'Potential Test Users' as metric, count(*) as count, array_agg(email) as examples
FROM auth.users 
WHERE email ILIKE '%test%' 
   OR email ILIKE '%demo%' 
   OR email ILIKE '%example%'
   OR email ILIKE '%yopmail%'
   OR email ILIKE '%localhost%';

-- B. Identifier les factures orphelines (Client supprimé)
-- Suppose une table 'invoices' et 'clients' (ajuster selon le schéma réel Supabase)
-- SELECT 'Orphan Invoices' as metric, count(*) FROM invoices i 
-- LEFT JOIN clients c ON i.client_id = c.id WHERE c.id IS NULL;

-- C. Identifier les sessions expirées
SELECT 'Expired Sessions' as metric, count(*) FROM auth.sessions WHERE not_after < NOW();

-- D. Identifier les Assets Média sans Job parent (si applicable)
-- SELECT 'Orphan Assets' as metric, count(*) FROM media_assets WHERE job_id IS NOT NULL AND job_id NOT IN (SELECT id FROM image_jobs);

-- -------------------------------------------------------------------------------------
-- 2. SECTION NETTOYAGE (TRANSACTIONNEL) - Décommentez pour exécuter
-- -------------------------------------------------------------------------------------

/*
BEGIN;

    -- 2.1. Nettoyage des Logs d'Audit anciens (> 6 mois)
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '6 months';

    -- 2.2. Suppression des utilisateurs "poubelle" (Attention: Cascade Delete doit être actif)
    DELETE FROM auth.users 
    WHERE email ILIKE '%yopmail.com' 
       OR email ILIKE '%@example.com' 
       OR email = 'test@test.com';

    -- 2.3. Nettoyage des sessions expirées pour alléger la table auth
    DELETE FROM auth.sessions WHERE not_after < NOW() - INTERVAL '7 days';

    -- 2.4. Nettoyage des jobs IA bloqués depuis plus de 24h
    -- DELETE FROM image_jobs WHERE status IN ('PROCESSING', 'PENDING') AND created_at < NOW() - INTERVAL '24 hours';

COMMIT;
*/

-- -------------------------------------------------------------------------------------
-- 3. MAINTENANCE STORAGE (Requiert l'extension pg_net ou script externe)
-- -------------------------------------------------------------------------------------
-- Note: Le nettoyage du Storage (S3) ne peut pas être fait purement en SQL standard 
-- sans extensions spécifiques Supabase. Utilisez le script JS dédié pour cela.
