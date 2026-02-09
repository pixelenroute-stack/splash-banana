# N8N Consultant - All-in-One SaaS Platform

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8?logo=tailwind-css)
![n8n](https://img.shields.io/badge/n8n-Workflows-ea4b71)
![License](https://img.shields.io/badge/License-MIT-green)

Plateforme SaaS complète pour agences vidéo, intégrant IA générative, CRM Notion, Google Workspace et facturation automatisée via n8n.

## Description

N8N Consultant est une plateforme tout-en-un conçue pour les agences créatives et vidéastes professionnels. Elle combine des outils d'IA avancés, une gestion client centralisée, et une automatisation complète des processus métier via des workflows n8n.

La plateforme unifie :
- Création vidéo assistée par IA (vidéos, images, scripts)
- CRM et gestion de projets via Notion
- Synchronisation Google Workspace (Gmail, Calendar, Drive)
- Facturation et comptabilité Qonto
- Système multi-agents JARVIS (Gemini 2.5 Flash)

## Fonctionnalités

### Studio Créatif IA
- **Génération vidéo** : Support VEO 3, Banana Pro, Runway
- **Génération d'images** : Modèles DALL-E, Stable Diffusion, Flux
- **Scripts IA** : Rédaction automatisée de scripts vidéo
- **Chat Studio** : Interface conversationnelle pour édition vidéo

### Gestion Client & Projets
- **CRM Notion** : Base clients synchronisée en temps réel
- **Projets Notion** : Suivi des projets et statuts
- **Facturation** : Intégration Qonto pour transactions et reporting

### Google Workspace
- **Gmail** : Synchronisation emails et envoi automatisé
- **Calendar** : Gestion des événements et rappels
- **Drive** : Stockage et partage de fichiers

### Automatisation n8n
- **8 workflows actifs** : CRM, Facturation, Video Studio, Google Sync, JARVIS multi-agents
- **Webhooks sécurisés** : Communication app ↔ n8n
- **Validation robuste** : Gestion d'erreurs et retry logic

## Installation

### Prérequis
- Node.js 18+ et npm
- Compte n8n (cloud ou self-hosted)
- Comptes API : Notion, Google, Qonto, OpenAI

### Étapes

1. **Cloner le repository**
```bash
git clone https://github.com/votre-org/n8n-consultant.git
cd n8n-consultant
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer l'environnement**
```bash
cp .env.example .env.local
```
Éditer `.env.local` avec vos clés API (voir Configuration ci-dessous)

4. **Lancer le serveur de développement**
```bash
npm run dev
```

5. **Accéder à l'application**
```
http://localhost:3000
```

## Configuration

### Variables d'environnement critiques

```env
# n8n Instance
N8N_WEBHOOK_BASE_URL=https://n8n.srv1027050.hstgr.cloud/webhook

# Notion
NOTION_API_KEY=secret_...
NOTION_CRM_DATABASE_ID=6bd8c6a6a31342a09500ecff1a7516ca
NOTION_PROJECTS_DATABASE_ID=1f75ed7c2be880ada164f53f1773826c

# Google Workspace
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...

# Qonto
QONTO_API_KEY=...
QONTO_ORGANIZATION_SLUG=...

# OpenAI
OPENAI_API_KEY=sk-...

# Sécurité
WEBHOOK_SECRET=votre-secret-securise
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Webhooks n8n configurés

| Workflow | Webhook Key | Endpoint |
|----------|-------------|----------|
| JARVIS Main | `jarvis-main` | `/webhook/jarvis-main` |
| Video Studio | `video-studio` | `/webhook/video-studio` |
| CRM Clients | `crm-clients` | `/webhook/crm-clients` |
| Google Sync | `google-workspace-sync` | `/webhook/google-workspace-sync` |
| Pixel Unified | `pixel-unified` | `/webhook/pixel-unified` |

## Stack Technique

### Frontend
- **Next.js 14** : App Router, Server Components, API Routes
- **React 18** : Hooks, Context API
- **TypeScript 5** : Type safety complet
- **TailwindCSS 3** : Styling responsive

### Backend & Services
- **n8n** : Workflows d'automatisation (8 workflows actifs)
- **Notion API** : CRM et gestion de projets
- **Google APIs** : Gmail, Calendar, Drive
- **Qonto API** : Facturation et comptabilité
- **OpenAI API** : Génération de contenu IA

### IA & Agents
- **Gemini 2.5 Flash** : LLM principal (remplace GPT-4o)
- **JARVIS Multi-Agents** : 5 agents spécialisés (Sophie CRM, Claire Admin, Marc Recherche, Léa Créative)
- **AI Tool Nodes** : gmailTool v2.2, googleCalendarTool v1.3

## Structure du projet

```
d:\n8n\N8NCONSULTANT\
├── app/                          # Next.js App Router
│   ├── admin/                    # Console Admin
│   ├── api/                      # API Routes
│   │   ├── clients/              # Endpoints CRM
│   │   ├── projects/             # Endpoints Projets
│   │   ├── billing/              # Endpoints Facturation
│   │   ├── video-editor/         # Endpoints Vidéo
│   │   └── proxy/                # Proxies Google, Qonto
│   ├── dashboard/                # Tableau de bord
│   └── layout.tsx                # Layout principal
├── components/                   # Composants React
│   ├── AdminConsole.tsx          # Console configuration
│   ├── BillingDashboard.tsx      # Facturation
│   ├── ClientList.tsx            # Liste clients
│   ├── ProjectList.tsx           # Liste projets
│   └── VideoEditor.tsx           # Studio Créatif
├── lib/                          # Utilitaires
│   ├── mockDatabase.ts           # Config webhooks
│   ├── notionService.ts          # Notion API
│   ├── qontoService.ts           # Qonto API
│   ├── billingService.ts         # Service facturation
│   └── n8nAgentService.ts        # Communication n8n
├── workflows/                    # n8n workflows JSON
│   ├── jarvis-main.json          # JARVIS Coordinator
│   ├── sophie-crm.json           # Agent Sophie
│   ├── claire-admin.json         # Agent Claire
│   └── ...
├── skills/                       # n8n Skills (7 skills)
│   ├── n8n-mcp-tools-expert/
│   ├── n8n-workflow-patterns/
│   └── ...
└── .mcp.json                     # Configuration MCP n8n
```

## Sécurité

### Checklist sécurité

- [ ] **Credentials** : Jamais de clés API en dur dans le code
- [ ] **Webhooks** : Validation `WEBHOOK_SECRET` sur tous les endpoints
- [ ] **HTTPS** : Forcer HTTPS en production
- [ ] **CORS** : Configurer origines autorisées
- [ ] **Rate Limiting** : Implémenter limites d'appels API
- [ ] **Validation** : Valider toutes les entrées utilisateur
- [ ] **Logs** : Sanitize logs (pas de données sensibles)
- [ ] **Environment** : `.env.local` dans `.gitignore`

### Bonnes pratiques n8n

- **webhookId obligatoire** : Ajouter UUID sur tous les webhook nodes (sinon 404)
- **typeVersion 2.1** : Utiliser version récente des webhook nodes
- **Error handling** : Brancher error workflows sur nodes critiques
- **Credentials** : Stocker dans n8n Settings > Credentials, jamais en clair
- **Validation** : Utiliser profils `runtime` ou `ai-friendly` pour workflows

## Déploiement

### Vercel (Recommandé)

1. **Connecter repository GitHub**
```bash
vercel --prod
```

2. **Configurer variables d'environnement**
Dashboard Vercel > Settings > Environment Variables

3. **Domaine personnalisé**
Configurer DNS : `app.votredomaine.com`

### Hostinger (Instance n8n)

Instance n8n hébergée sur :
- **URL** : `https://n8n.srv1027050.hstgr.cloud`
- **Workflows actifs** : 8 (JARVIS, Video Studio, CRM, etc.)
- **Credentials stockés** : OpenAI, Gmail, Google Drive, Notion

### Build production

```bash
npm run build
npm start
```

## Workflows n8n

### IDs des workflows actifs

| Nom | ID Workflow | Nodes | Description |
|-----|-------------|-------|-------------|
| JARVIS Main | `Vm7WJQ8a9w6NqIwq` | 20 | Coordinateur Telegram + Gemini |
| Sophie CRM | `IlS7rA93vUWReqXv` | 12 | Assistante CRM/RH Notion |
| Claire Admin | `MkFpiGn6rdNbMcu1` | 8 | Assistante Gmail/Calendar/Qonto |
| Marc Recherche | `JFl8yZgdpqma82hB` | 11 | Perplexity/GNews/Météo |
| Léa Créative | `GWCe0wR6HuYGwYuJ` | 10 | VEO3/BananaPro vidéos |
| Video Studio | `JVr5JtxSAMyrPnP8` | 15 | Génération vidéo/image/script |
| Pixel Unified | `Bc80MMsQ4tWEbNtK` | 22 | Contrats/Email/Factures |
| Google Sync | `CIFRssQZYiSgjf9msLMFf` | 18 | Sync Gmail/Calendar/Drive |

### Architecture JARVIS Multi-Agents

```
JARVIS Main (Telegram)
    ├─> Sophie (CRM/Notion)
    ├─> Claire (Admin/Gmail/Qonto)
    ├─> Marc (Recherche/Perplexity)
    └─> Léa (Créative/VEO3)
```

Communication via **toolWorkflow nodes** (délégation inter-agents)

## Développement

### Commandes

```bash
npm run dev          # Serveur développement
npm run build        # Build production
npm run start        # Serveur production
npm run lint         # Linter ESLint
npm run type-check   # Vérification TypeScript
```

### Scripts utiles

```bash
# Tester webhook local
curl -X POST http://localhost:3000/webhook/video-studio \
  -H "Content-Type: application/json" \
  -d '{"type":"generate_video","data":{"action":"create","prompt":"test"}}'

# Valider workflow n8n
npm run validate-workflow <workflow-id>
```

## Support & Documentation

### Ressources

- **Documentation n8n** : [docs.n8n.io](https://docs.n8n.io)
- **CLAUDE.md** : Instructions complètes consultant n8n
- **Skills n8n** : 7 skills dans `skills/` (MCP Tools Expert, Workflow Patterns, etc.)
- **Templates n8n** : [n8n.io/workflows](https://n8n.io/workflows)

### Contact

Pour questions ou support :
- Issues GitHub : [github.com/votre-org/n8n-consultant/issues](https://github.com/votre-org/n8n-consultant/issues)
- Email : support@votredomaine.com

## Licence

MIT License - voir [LICENSE](LICENSE) pour détails.

---

Créé avec [n8n](https://n8n.io) + [Next.js](https://nextjs.org) + [Claude Code](https://claude.com/claude-code)
