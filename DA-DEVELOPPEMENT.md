# DA - Dossier d'Architecture de Developpement
# Splash Banana - Studio de Production Video IA

**Version**: 2.0 (Refonte APIs directes)
**Date**: 2026-02-13
**Stack**: Next.js 14 + React 18 + TypeScript 5 + TailwindCSS 3

---

## 1. VISION PRODUIT

Splash Banana est une suite SaaS de production video avec intelligence artificielle.
L'application centralise la gestion de clients, projets, facturation, et creation de contenu
(images, videos, moodboards) dans une interface unifiee avec un assistant IA.

### Public cible
- Studios de production video
- Freelances en creation de contenu
- Agences de communication

---

## 2. ARCHITECTURE TECHNIQUE

### 2.1 Stack Technologique

| Couche | Technologie | Version |
|--------|------------|---------|
| Framework | Next.js (App Router) | 14.2.13 |
| UI | React + TailwindCSS | 18 + 3.4 |
| Langage | TypeScript | 5.x |
| UI Components | Radix UI | 1.x-2.x |
| Icons | Lucide React | 0.446 |
| 3D | Three.js + React Three Fiber | 0.182 + 9.5 |
| Charts | Recharts | 2.12 |
| Forms | React Hook Form + Zod | 7.53 + 3.23 |
| PDF | jsPDF | 2.5 |
| Dates | date-fns | 3.6 |

### 2.2 APIs Externes

| API | Usage | SDK/Methode | Priorite |
|-----|-------|-------------|----------|
| **Google Gemini** | Chat IA, analyse creative, generation images | `@google/genai` v1.41 | CRITIQUE |
| **Google VEO 3** | Generation video IA | `@google/genai` (generateVideos) | HAUTE |
| **Anthropic Claude** | Chat IA fallback, analyses complexes | REST via `/api/proxy/anthropic` | MOYENNE |
| **Perplexity** | Recherche web, news, veille | REST via `/api/proxy/perplexity` | MOYENNE |
| **Notion** | CRM clients + gestion projets | REST via `/api/proxy/notion` | HAUTE |
| **Google OAuth** | Gmail, Calendar, Drive | OAuth 2.0 + REST | HAUTE |
| **Maton.ia** | Aggregateur multi-API | REST (Notion, Google unifie) | OPTIONNEL |

### 2.3 Architecture Applicative

```
[Navigateur]
    |
    v
[Next.js App Router]
    |
    +-- app/page.tsx (SSR disabled)
    |       |
    |       v
    |   App.tsx (Client Component)
    |       |
    |       +-- 14 Views (Dashboard, Chat, Images, Videos, CRM...)
    |       |       |
    |       |       v
    |       |   services/*.ts (Business Logic)
    |       |       |
    |       |       v
    |       |   lib/*.ts (Utilities)
    |       |
    |       +-- mockDatabase.ts (localStorage State)
    |
    +-- app/api/* (Server Routes)
            |
            +-- /api/chat (Gemini Direct)
            +-- /api/proxy/notion (Notion API)
            +-- /api/proxy/anthropic (Claude API)
            +-- /api/proxy/perplexity (Perplexity API)
            +-- /api/proxy/qonto (Qonto API)
            +-- /api/auth/google/* (OAuth Flow)
```

---

## 3. MODULES FONCTIONNELS

### 3.1 Dashboard (components/Dashboard.tsx)
- **Fonction**: Hub principal avec statistiques, horloge, activite recente
- **Donnees**: Stats clients/factures/tokens, emails Gmail, evenements Calendar
- **APIs**: Google Workspace (Gmail + Calendar)
- **Dependances**: mockDatabase, googleService

### 3.2 Chat IA (components/ChatInterface.tsx)
- **Fonction**: Interface de chat avec assistant IA multi-provider
- **Flow**: Message -> apiRouter -> Gemini/OpenAI/Perplexity -> Reponse
- **Outils integres**: 8 outils (sync Google, export, diagnostics, backup...)
- **APIs**: Gemini (principal), OpenAI (fallback), Perplexity (recherche)
- **Dependances**: apiRouter, geminiService, toolRegistry

### 3.3 Image Studio (components/image-studio/ImageStudio.tsx)
- **Fonction**: Generation d'images par IA avec templates
- **Modele**: Gemini 2.5 Flash Image
- **Flow**: Prompt -> imageService -> Gemini API -> Polling -> Asset
- **Sous-composants**: PromptBar, JobCard, ImageTemplates
- **APIs**: Google Gemini (image generation)

### 3.4 Video Studio (components/video-studio/VideoStudio.tsx)
- **Fonction**: Generation de videos par IA
- **Modele**: VEO 3.1 Fast Generate Preview
- **Options**: Aspect ratio (16:9/9:16), duree (5s/10s/20s), resolution
- **Sous-composants**: PromptBar, SettingsPanel, VideoJobItem, VideoTemplates
- **APIs**: Google VEO 3 (video generation)

### 3.5 CRM Clients (components/ClientList.tsx)
- **Fonction**: Gestion des clients avec sync Notion
- **Operations**: CRUD clients, filtrage, recherche, sync bidirectionnelle
- **Champs**: nom, email, entreprise, statut lead, services, commentaires
- **APIs**: Notion (base de donnees clients)
- **Dependances**: notionRepository, mockDatabase

### 3.6 Gestion Projets (components/ProjectList.tsx)
- **Fonction**: Suivi des projets avec statuts kanban
- **Statuts**: A faire -> En cours -> Montage -> Validation -> Termine
- **Types**: Shorts, Long-form, Publicite, TikTok, Autre
- **APIs**: Notion (base de donnees projets)
- **Dependances**: notionRepository, mockDatabase

### 3.7 Facturation (components/Billing.tsx)
- **Fonction**: Gestion factures/devis avec integration bancaire
- **Operations**: Creation, envoi, suivi paiements, export PDF
- **APIs**: Qonto (operations bancaires), Google Docs (templates)
- **Dependances**: billingService, qontoService, pdfExportService

### 3.8 News & Veille (components/NewsDashboard.tsx)
- **Fonction**: Agregation d'actualites par categorie
- **Categories**: tech, montage, motion, politique, general
- **APIs**: Perplexity (recherche IA), GNews, OpenWeatherMap
- **Dependances**: newsService, perplexityService

### 3.9 Prospection (components/prospection/ProspectionHub.tsx)
- **Fonction**: Scraping et gestion de leads
- **Sources**: LinkedIn, Google Maps, Instagram, manuel
- **Features**: Scoring, campagnes email, export Google Sheets
- **APIs**: Apify (scraping), Google Sheets
- **Dependances**: prospectionService, sheetsRepository

### 3.10 Social Factory (components/SocialFactory.tsx)
- **Fonction**: Creation de contenu multi-plateforme
- **Plateformes**: Instagram, TikTok, YouTube, LinkedIn
- **Features**: Scheduling, preview, publication
- **APIs**: APIs respectives des plateformes

### 3.11 Media Library (components/library/MediaLibrary.tsx)
- **Fonction**: Bibliotheque d'assets generes
- **Features**: Filtrage par type, recherche, preview, download, favoris
- **Storage**: Supabase (si configure) ou localStorage
- **Dependances**: mediaLibraryService, supabaseService

### 3.12 Moodboard (components/AssetGallery.tsx)
- **Fonction**: Board creatif avec analyse IA
- **Features**: Upload, organisation, analyse mood/couleurs/typo
- **APIs**: Gemini (analyse creative)
- **Dependances**: geminiService, imageService

### 3.13 Settings (components/Settings.tsx)
- **Fonction**: Configuration systeme complete
- **Sections**: API keys, integrations, branding, webhooks
- **Features**: Test connexion, versioning config, chiffrement cles
- **Dependances**: configService, integrationService

### 3.14 Admin Console (components/AdminConsole.tsx)
- **Fonction**: Administration complete du systeme
- **Onglets**: Infrastructure, Comptes, Personnalisation, Metriques, Logs, Workflows, Audit
- **Features**: Gestion utilisateurs, invitations, audit trail, monitoring
- **Sous-composants**: MetricsDashboard, BrandingEditor, WorkflowMonitor, SystemAuditor
- **Dependances**: adminService, configService, metricsCollector

---

## 4. SERVICES PRINCIPAUX

### 4.1 geminiService.ts (IA Principal)
```typescript
class GeminiService {
  getAI(useBackup?, overrideKey?): GoogleGenAI     // Factory avec rotation de cles
  testApiKey(key?): Promise<boolean>                 // Health check
  simpleChat(message): Promise<string>               // Chat rapide
  analyzeProjectBrief(brief): Promise<MoodboardData> // Analyse creative
  generateMoodboard(brief, data): Promise<string>    // Generation moodboard
  generateVideo(params): Promise<operation>           // Generation video VEO3
  runFullAudit(apiKey): Promise<string>              // Audit systeme
}
// Modeles: gemini-3-flash-preview, gemini-3-pro-preview, gemini-2.5-flash-image, veo-3.1
// Features: retry avec backoff, rotation de cles, cache, metriques
```

### 4.2 apiRouter.ts (Routage IA)
```typescript
class APIRouter {
  routeRequest(request: APIRequest): Promise<{content, provider, cost, tokensUsed}>
  // Routing intelligent: Gemini (defaut) -> OpenAI (fallback) -> Perplexity (recherche)
  // Cache TTL 5min, metriques par provider
}
```

### 4.3 notionRepository.ts (CRM)
```typescript
class NotionRepository {
  fetchClients(): Promise<NotionClient[]>
  createClient(client): Promise<NotionClient>
  updateClient(id, data): Promise<void>
  fetchProjects(): Promise<Project[]>
  createProject(project): Promise<Project>
  updateProject(id, data): Promise<void>
  // Proxy via /api/proxy/notion pour cacher l'API key
}
```

### 4.4 googleService.ts (Workspace)
```typescript
class GoogleService {
  getAuthUrl(): string                        // URL OAuth
  handleCallback(code): Promise<GoogleAccount> // Callback OAuth
  getEmails(userId, count): Promise<EmailMessage[]>
  getCalendarEvents(userId): Promise<CalendarEvent[]>
  getDriveFiles(userId, folderId?): Promise<DriveFile[]>
  sendEmail(userId, to, subject, body): Promise<void>
  // Gestion tokens (refresh auto), multi-compte
}
```

### 4.5 mockDatabase.ts (State Local)
```typescript
class MockDatabase {
  // CRUD: users, clients, projects, invoices, contracts, templates
  // CRUD: imageJobs, videoJobs, mediaAssets, auditLogs, invitations
  // SystemSettings: branding, APIs, integrations, webhooks
  // Persistence: localStorage (auto-save on change)
  getSystemSettings(): SystemSettings
  updateSystemSettings(partial): void
  // 30+ methodes CRUD
}
```

---

## 5. SCHEMA DE DONNEES

### 5.1 Types Principaux (types.ts - 691 lignes)

```
User
  id, email, name, role(ADMIN|COLLABORATOR|VIEWER), status, allowedViews

SystemSettings
  branding: { name, logo, colors, welcome messages }
  auth: { invitePageUrl }
  google: { clientId, clientSecret, redirectUri }
  aiConfig: { geminiKey, openaiKey, anthropicKey, perplexityKey }
  notionConfig: { apiKey, clientsDatabaseId, projectsDatabaseId }
  billingConfig: { qontoLogin, qontoSecretKey, templateIds }
  newsConfig: { newsApiKey, gnewsApiKey, openWeatherApiKey }

NotionClient
  id, name, email, companyName, leadStatus, serviceType, contactDate

Project
  id, clientId, title, type, status(A faire->Termine), price, deliveryUrl

Invoice
  id, number, clientId, amountHT, status(draft->paid), items[]

MediaAsset
  id, type(image|video|file), publicUrl, prompt, width, height, duration

ChatMessage
  id, role(user|assistant|system), text, timestamp, toolResponse?

Lead
  id, name, company, source(linkedin|google_maps), status, score, socials
```

---

## 6. API ROUTES (Server-Side)

| Route | Methode | Fonction | API Externe |
|-------|---------|----------|-------------|
| `/api/chat` | POST | Chat Gemini direct | Gemini |
| `/api/action` | POST | Actions generiques (local) | - |
| `/api/proxy/notion` | POST | Proxy Notion API | Notion |
| `/api/proxy/anthropic` | POST | Proxy Claude API | Anthropic |
| `/api/proxy/perplexity` | POST | Proxy Perplexity | Perplexity |
| `/api/proxy/qonto` | POST | Proxy Qonto banque | Qonto |
| `/api/auth/google/start` | GET | Demarrer OAuth flow | Google |
| `/api/auth/google/callback` | GET | Callback OAuth | Google |
| `/api/auth/google/refresh` | POST | Refresh token | Google |
| `/api/google/status` | GET | Status connexion Google | Google |
| `/api/admin/config` | GET/POST | CRUD configuration | - |
| `/api/admin/config/rollback` | POST | Rollback config | - |
| `/api/admin/config/versions` | GET | Historique configs | - |
| `/api/admin/webhooks/[module]/test` | POST | Test webhook | - |
| `/api/admin/audit` | GET | Logs d'audit | - |

---

## 7. AUTHENTIFICATION

### 7.1 Flow Login
```
1. App.tsx charge -> user = null -> Affiche formulaire login
2. Utilisateur saisit email/password
3. authService.login(email, password)
   a. Si Supabase configure -> supabase.auth.signInWithPassword()
   b. Sinon -> mockLogin() avec users du mockDatabase
4. User retourne -> App affiche le Dashboard
5. Session stockee en memoire (useState)
```

### 7.2 Roles & Permissions
- **ADMIN**: Acces total (14 views + admin console)
- **COLLABORATOR**: Toutes les views sauf admin
- **VIEWER**: Vues definies dans allowedViews[]

### 7.3 Google OAuth
```
1. GET /api/auth/google/start -> redirect Google OAuth
2. Google -> GET /api/auth/google/callback?code=XXX
3. Echange code -> access_token + refresh_token
4. Stockage chiffre dans mockDatabase
5. Refresh auto via /api/auth/google/refresh
```

---

## 8. CONFIGURATION DES APIs

### 8.1 Variables d'Environnement (.env.local)

```env
# IA
GEMINI_API_KEY=AIzaSy...            # Google Cloud Console API Key
ANTHROPIC_API_KEY=sk-ant-api03-...  # Anthropic Dashboard
PERPLEXITY_API_KEY=pplx-...         # Perplexity Dashboard

# CRM
NOTION_API_KEY=ntn_...              # Notion Integration Token
NOTION_CRM_DATABASE_ID=6bd8c6a6... # ID base clients
NOTION_PROJECTS_DATABASE_ID=1f75... # ID base projets

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=381234392877-...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://splashbanana.com/api/auth/callback

# Multi-API
MATON_API_KEY=KRkc...               # Maton.ia aggregateur
```

### 8.2 Configuration Admin (mockDatabase SystemSettings)
Les API keys peuvent aussi etre configurees via l'interface Admin > Infrastructure.
Priorite: Admin Settings > Environment Variables > Fallback

---

## 9. PLAN DE DEVELOPPEMENT (Repartir de zero)

### Phase 1 - Fondations (Semaine 1)
- [ ] Nettoyer la structure (supprimer `application/`, `modification/`)
- [ ] Corriger les erreurs TypeScript (desactiver `ignoreBuildErrors`)
- [ ] Configurer Supabase pour Auth + Storage (remplacer localStorage)
- [ ] Mettre en place les variables d'environnement sur l'hebergeur
- [ ] Tester le flow login avec les vrais credentials Google OAuth

### Phase 2 - APIs Core (Semaine 2)
- [ ] Valider l'integration Gemini (chat + images + videos)
- [ ] Connecter Notion CRM (clients + projets)
- [ ] Configurer Google OAuth (Gmail + Calendar + Drive)
- [ ] Tester Perplexity pour la recherche/news
- [ ] Integrer Claude comme fallback chat

### Phase 3 - Features Metier (Semaine 3)
- [ ] CRM: Sync bidirectionnelle Notion <-> App
- [ ] Projets: Kanban avec mise a jour Notion
- [ ] Facturation: Integration Qonto + generation PDF
- [ ] Dashboard: Stats reelles depuis Notion/Qonto

### Phase 4 - IA & Creation (Semaine 4)
- [ ] Image Studio: Generation avec Gemini 2.5 Flash Image
- [ ] Video Studio: Generation avec VEO 3.1
- [ ] Moodboard: Analyse creative avec Gemini Pro
- [ ] Social Factory: Templates multi-plateformes

### Phase 5 - Production (Semaine 5)
- [ ] Tests end-to-end de toutes les fonctionnalites
- [ ] Optimisation performances (lazy loading, caching)
- [ ] Securisation (CORS, rate limiting, validation inputs)
- [ ] Deploiement production avec CI/CD
- [ ] Monitoring et alertes

---

## 10. SECURITE

### Regles Critiques
1. **JAMAIS** de cles API dans le code source ou les commits
2. **TOUJOURS** utiliser les routes proxy (`/api/proxy/*`) pour les appels API
3. **TOUJOURS** `NEXT_PUBLIC_` prefix pour les variables client-side
4. Chiffrement des tokens Google OAuth dans le stockage
5. Validation des inputs cote serveur (Zod)
6. Rate limiting sur les routes API
7. CORS strict en production

### .gitignore (deja configure)
- `.env.local`, `.env`, `client_secret_*.json`, `*.pem`, `*.key`
- `node_modules/`, `.next/`, `build/`

---

## 11. DEPLOIEMENT

### Production actuelle
- **Hebergeur**: Hostinger (Node.js)
- **Build**: `next build` (output: standalone)
- **Start**: `node server.js` (custom server HTTP)
- **URL**: splashbanana.com

### Variables requises sur l'hebergeur
```
GEMINI_API_KEY
ANTHROPIC_API_KEY
PERPLEXITY_API_KEY
NOTION_API_KEY
NOTION_CRM_DATABASE_ID
NOTION_PROJECTS_DATABASE_ID
NEXT_PUBLIC_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
PORT (fourni par Hostinger)
```

---

## 12. STRUCTURE DES FICHIERS

```
splash-banana/
|-- app/                          # Next.js App Router (pages)
|   |-- page.tsx                  # Entry point (dynamic import App)
|   |-- layout.tsx                # Root layout (metadata, fonts)
|   |-- globals.css               # Tailwind + CSS custom
|   |-- api/                      # Server API routes
|       |-- chat/route.ts         # POST - Chat Gemini
|       |-- action/route.ts       # POST - Actions locales
|       |-- proxy/                # API proxies (securite)
|       |   |-- notion/route.ts
|       |   |-- anthropic/route.ts
|       |   |-- perplexity/route.ts
|       |   |-- qonto/route.ts
|       |-- auth/google/          # OAuth flow
|       |   |-- start/route.ts
|       |   |-- callback/route.ts
|       |   |-- refresh/route.ts
|       |-- admin/                # Admin routes
|           |-- config/route.ts
|           |-- audit/route.ts
|
|-- App.tsx                       # Main React app (14 views)
|-- types.ts                      # 60+ type definitions
|
|-- components/                   # 30+ React components
|   |-- Sidebar.tsx               # Navigation
|   |-- Dashboard.tsx             # Dashboard principal
|   |-- ChatInterface.tsx         # Chat IA
|   |-- ClientList.tsx            # CRM Clients
|   |-- ProjectList.tsx           # Gestion projets
|   |-- Billing.tsx               # Facturation
|   |-- Settings.tsx              # Configuration
|   |-- AdminConsole.tsx          # Console admin
|   |-- NewsDashboard.tsx         # Actualites
|   |-- SocialFactory.tsx         # Social media
|   |-- AssetGallery.tsx          # Moodboard
|   |-- image-studio/             # Generation images
|   |-- video-studio/             # Generation videos
|   |-- library/                  # Mediatheque
|   |-- backgrounds/              # Three.js (Stargate)
|   |-- prospection/              # Leads
|   |-- google/                   # Google Workspace
|   |-- admin/                    # Sous-composants admin
|   |-- auth/                     # Login overlay
|
|-- services/                     # 36 services
|   |-- geminiService.ts          # IA Gemini
|   |-- apiRouter.ts              # Routage multi-IA
|   |-- notionRepository.ts       # CRM Notion
|   |-- googleService.ts          # Google Workspace
|   |-- mockDatabase.ts           # State local
|   |-- authService.ts            # Authentification
|   |-- (... 30 autres services)
|
|-- lib/                          # Utilitaires
|   |-- supabaseClient.ts         # Client Supabase
|   |-- encryption.ts             # Chiffrement
|   |-- n8nAgentService.ts        # (neutralise)
|   |-- n8nService.ts             # (neutralise)
|
|-- context/                      # React Context
|   |-- NotificationContext.tsx    # Toast notifications
|
|-- public/                       # Assets statiques
|-- .env.local                    # Variables d'environnement (gitignored)
|-- .gitignore                    # Exclusions git
|-- next.config.mjs               # Config Next.js
|-- tailwind.config.ts            # Config Tailwind
|-- tsconfig.json                 # Config TypeScript
|-- package.json                  # Dependencies
|-- server.js                     # Custom server (production)
```

---

*Document genere le 2026-02-13 - Splash Banana v2.0*
