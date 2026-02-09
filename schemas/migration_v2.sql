-- ============================================
-- MIGRATION V2 - Mise à jour du schéma existant
-- ============================================
-- Exécutez ce script SI vous avez déjà des tables existantes
-- ============================================

-- 1. Ajouter les colonnes manquantes à la table documents
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS workflow_source VARCHAR(100) DEFAULT 'jarvis';

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- 2. Créer l'index si manquant
CREATE INDEX IF NOT EXISTS documents_workflow_idx ON documents(workflow_source);

-- Maintenant vous pouvez exécuter le reste du schéma
