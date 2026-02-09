# Workflows N8N - Architecture et Guide

## Vue d'ensemble

Ce projet utilise 5 workflows n8n interconnectés qui partagent une base de données Supabase commune.

```
                    ┌─────────────────┐
                    │   APP WEB       │
                    │  (Frontend)     │
                    └────────┬────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│                      SUPABASE                            │
│  ┌──────────┬──────────┬──────────┬──────────┬────────┐ │
│  │ users    │documents │ leads    │ projects │ video_ │ │
│  │ sessions │chat_hist │companies │ tasks    │projects│ │
│  │ notifs   │validatns │campaigns │milestones│ assets │ │
│  └──────────┴──────────┴──────────┴──────────┴────────┘ │
└────────────────────────┬─────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│   JARVIS      │ │  ACTUALITES   │ │  PROSPECTION  │
│  (AI Agent)   │ │  (Veille)     │ │   (CRM)       │
└───────────────┘ └───────────────┘ └───────────────┘
        │
        ├────────────────┬────────────────┐
        ▼                ▼                ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│   PROJETS     │ │  VIDEO STUDIO │ │  Sub-agents   │
│ (Production)  │ │  (Montage)    │ │ CRM,RH,Gmail..│
└───────────────┘ └───────────────┘ └───────────────┘
```

## Workflows

### 1. Jarvis (AI Agent) - EXISTANT
**ID**: `1eXnSRLwgg66sqUB3psjJ`
**URL**: https://n8n.srv1027050.hstgr.cloud/workflow/1eXnSRLwgg66sqUB3psjJ

**Fonctionnalités**:
- Assistant IA multi-canal (Web + Telegram)
- Sous-agents spécialisés: CRM, RH, Calendrier, Gmail, Google Drive, RAG Memory
- Système de validation pour actions sensibles
- Apprentissage des patterns utilisateur

**Tables Supabase utilisées**:
- `chat_history` - Historique des conversations
- `validations` - Actions en attente d'approbation
- `user_patterns` - Apprentissage des préférences
- `documents` - Base RAG

---

### 2. Actualités & Veille - À CRÉER

**Objectif**: Collecter, analyser et alerter sur les actualités pertinentes.

**Architecture proposée**:
```
Schedule Trigger (toutes les heures)
        │
        ▼
┌─────────────────────────────────────┐
│  Récupérer les sources actives      │
│  (Supabase: news_sources)           │
└─────────────────┬───────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌──────────────┐    ┌──────────────┐
│ RSS Parser   │    │ API/Scraper  │
└──────┬───────┘    └──────┬───────┘
       │                   │
       └─────────┬─────────┘
                 ▼
┌─────────────────────────────────────┐
│  Dédupliquer (external_id)          │
│  Stocker articles bruts             │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│  AI Processing (OpenAI)             │
│  - Résumé                           │
│  - Sentiment analysis               │
│  - Tags auto                        │
│  - Embedding                        │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│  Vérifier alertes utilisateurs      │
│  Notifier si match                  │
└─────────────────────────────────────┘
```

**Tables utilisées**:
- `news_sources` - Sources configurées
- `news_articles` - Articles collectés
- `news_tags` - Catégorisation
- `news_alerts` - Alertes personnalisées
- `notifications` - Envoi des alertes

---

### 3. Prospection - À CRÉER

**Objectif**: Automatiser la recherche de leads et les campagnes de prospection.

**Architecture proposée**:
```
┌─────────────────────────────────────┐
│  WORKFLOW A: Lead Enrichment        │
│  ─────────────────────────────────  │
│  Webhook (nouveau lead)             │
│        │                            │
│        ▼                            │
│  Recherche LinkedIn (RapidAPI)      │
│        │                            │
│        ▼                            │
│  Enrichir profil + entreprise       │
│        │                            │
│        ▼                            │
│  Calculer score (Supabase function) │
│        │                            │
│        ▼                            │
│  Assigner à campagne si qualifié    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  WORKFLOW B: Campaign Sequencer     │
│  ─────────────────────────────────  │
│  Schedule (toutes les 15 min)       │
│        │                            │
│        ▼                            │
│  Récupérer leads à contacter        │
│  (campaign_leads.next_send_at)      │
│        │                            │
│        ▼                            │
│  Générer email personnalisé (AI)    │
│        │                            │
│        ▼                            │
│  Envoyer via Gmail/SMTP             │
│        │                            │
│        ▼                            │
│  Logger activité                    │
│  Planifier prochain step            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  WORKFLOW C: Reply Handler          │
│  ─────────────────────────────────  │
│  Email Trigger (IMAP)               │
│        │                            │
│        ▼                            │
│  Identifier le lead (email)         │
│        │                            │
│        ▼                            │
│  Analyser sentiment (AI)            │
│        │                            │
│        ▼                            │
│  IF positif → Notifier + update     │
│  IF négatif → Opt-out               │
└─────────────────────────────────────┘
```

**Tables utilisées**:
- `leads` - Contacts
- `companies` - Entreprises
- `campaigns` - Campagnes
- `campaign_leads` - Leads dans campagnes
- `email_templates` - Templates
- `prospect_activities` - Timeline

---

### 4. Gestion de Projets - À CRÉER

**Objectif**: Gérer les projets, tâches et équipes.

**Architecture proposée**:
```
┌─────────────────────────────────────┐
│  WORKFLOW A: Daily Digest           │
│  ─────────────────────────────────  │
│  Schedule (9h chaque jour)          │
│        │                            │
│        ▼                            │
│  Récupérer tâches du jour           │
│  Récupérer tâches en retard         │
│        │                            │
│        ▼                            │
│  Générer digest par utilisateur     │
│        │                            │
│        ▼                            │
│  Envoyer email/Telegram/Slack       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  WORKFLOW B: Deadline Alerts        │
│  ─────────────────────────────────  │
│  Schedule (toutes les heures)       │
│        │                            │
│        ▼                            │
│  Tâches due dans 24h                │
│  Tâches devenues en retard          │
│        │                            │
│        ▼                            │
│  Notifier assignés + managers       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  WORKFLOW C: Jarvis Integration     │
│  ─────────────────────────────────  │
│  Webhook (depuis Jarvis)            │
│        │                            │
│        ▼                            │
│  Actions: create/update/list tasks  │
│        │                            │
│        ▼                            │
│  Retourner résultat à Jarvis        │
└─────────────────────────────────────┘
```

**Tables utilisées**:
- `projects` - Projets
- `tasks` - Tâches
- `milestones` - Jalons
- `project_members` - Équipes
- `time_entries` - Temps passé
- `task_comments` - Commentaires

---

### 5. Monteur Vidéo (Studio) - À CRÉER

**Objectif**: Gérer la production vidéo et les rendus.

**Architecture proposée**:
```
┌─────────────────────────────────────┐
│  WORKFLOW A: Asset Upload Handler   │
│  ─────────────────────────────────  │
│  Webhook (upload terminé)           │
│        │                            │
│        ▼                            │
│  Extraire métadonnées (ffprobe)     │
│        │                            │
│        ▼                            │
│  Générer thumbnail                  │
│        │                            │
│        ▼                            │
│  Stocker dans Supabase              │
│  Notifier l'équipe                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  WORKFLOW B: Render Queue Manager   │
│  ─────────────────────────────────  │
│  Schedule (toutes les 5 min)        │
│        │                            │
│        ▼                            │
│  Vérifier jobs en attente           │
│        │                            │
│        ▼                            │
│  Lancer rendu (ffmpeg/API)          │
│        │                            │
│        ▼                            │
│  Mettre à jour progrès              │
│        │                            │
│        ▼                            │
│  Notifier fin de rendu              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  WORKFLOW C: Review Notification    │
│  ─────────────────────────────────  │
│  Webhook (revision créée)           │
│        │                            │
│        ▼                            │
│  Générer lien de preview            │
│        │                            │
│        ▼                            │
│  Envoyer au client                  │
│        │                            │
│        ▼                            │
│  Webhook callback (feedback)        │
│        │                            │
│        ▼                            │
│  Parser timecodes, créer tâches     │
└─────────────────────────────────────┘
```

**Tables utilisées**:
- `video_projects` - Projets vidéo
- `media_assets` - Rushes et assets
- `video_timelines` - Montages
- `render_jobs` - Jobs de rendu
- `video_revisions` - Feedbacks clients

---

## Configuration Supabase

### 1. Exécuter le schéma
1. Ouvrez Supabase SQL Editor
2. Copiez le contenu de `schemas/complete_schema.sql`
3. Exécutez le script

### 2. Configurer les credentials n8n
Dans n8n, créez un credential Supabase avec:
- **Host**: `https://urhxjbytaqzyvqiltwfa.supabase.co`
- **Service Role Key**: (depuis Settings > API > service_role)

### 3. Activer RLS (optionnel mais recommandé)
Décommentez les lignes RLS dans le schéma si vous activez l'authentification utilisateur.

---

## Requêtes fréquentes

Voir `queries/workflow_queries.sql` pour toutes les requêtes organisées par workflow.

---

## Bonnes pratiques

1. **Gestion d'erreurs**: Toujours ajouter des branches d'erreur
2. **Idempotence**: Utiliser `ON CONFLICT` pour éviter les doublons
3. **Logs**: Logger dans `workflow_logs` pour le debugging
4. **Notifications**: Utiliser la table `notifications` centralisée
5. **Audit**: Logger les actions sensibles dans `audit_logs`
