# SPLASH BANANA - Document de Référence Complet

> **Date de création** : 2 février 2026
> **Version** : 1.0.0
> **GitHub** : https://github.com/pixelenroute-stack/splash-banana

---

## 1. IDENTIFIANTS ET ACCÈS

### 1.1 Compte Administrateur (Mode Dev/Mock)
```
Email    : pixelenroute@gmail.com
Password : Victoria&8530
Rôle     : ADMIN
User ID  : user_1
```

### 1.2 GitHub
```
Repository : https://github.com/pixelenroute-stack/splash-banana.git
User       : pixelenroute-stack
Email Git  : pixelenroute@gmail.com
```

### 1.3 Accès Hostinger (à configurer)
```
URL Production : https://splashbanana.com (à confirmer)
```

---

## 2. VARIABLES D'ENVIRONNEMENT

Créer un fichier `.env.local` dans `/application/` avec :

```env
# APPLICATION
NEXT_PUBLIC_APP_URL=https://splashbanana.com
NODE_ENV=production

# GOOGLE OAUTH (OBLIGATOIRE)
GOOGLE_CLIENT_ID=votre_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=https://splashbanana.com/api/auth/google/callback

# PROVIDERS IA (Mode Développeur)
GEMINI_API_KEY=AIzaSy...
OPENAI_API_KEY=sk-...           # Optionnel
ANTHROPIC_API_KEY=sk-ant-...    # Optionnel
PERPLEXITY_API_KEY=pplx-...     # Optionnel

# SUPABASE (Optionnel - sinon utilise localStorage)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# NOTION CRM (Optionnel)
NOTION_API_KEY=secret_...
NOTION_DATABASE_ID=xxx-xxx-xxx

# SÉCURITÉ
ENCRYPTION_KEY=une_cle_de_32_caracteres_minimum
```

---

## 3. ARCHITECTURE DE L'APPLICATION

### 3.1 Stack Technique
| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | Next.js | 14.2.13 |
| UI | React | 18.2.0 |
| Styling | Tailwind CSS | 3.4.1 |
| 3D Graphics | Three.js / React Three Fiber | 0.160.0 |
| Database | Supabase / localStorage (mock) | 2.45.4 |
| AI SDK | @google/genai | 1.0.0 |
| Charts | Recharts | 2.12.7 |

### 3.2 Structure des Dossiers
```
application/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/google/   # OAuth Google
│   │   ├── chat/          # Chat AI
│   │   ├── admin/         # Admin endpoints
│   │   └── proxy/         # Proxies API (Anthropic, Perplexity)
│   ├── layout.tsx
│   └── page.tsx
├── components/            # Composants React
│   ├── AdminConsole.tsx   # Console d'administration
│   ├── ChatInterface.tsx  # Interface de chat IA
│   ├── image-studio/      # Studio de génération d'images
│   ├── video-studio/      # Studio de génération vidéos
│   ├── google/            # Google Workspace
│   └── ...
├── services/              # Services métier
│   ├── mockDatabase.ts    # Base de données locale
│   ├── geminiService.ts   # Service Gemini AI
│   ├── imageService.ts    # Service génération images
│   ├── videoService.ts    # Service génération vidéos
│   ├── configService.ts   # Gestion configuration
│   └── authService.ts     # Authentification
├── lib/                   # Utilitaires
│   ├── encryption.ts      # Chiffrement AES
│   └── googleConfig.ts    # Config OAuth
└── types.ts               # Types TypeScript
```

---

## 4. MODES DE FONCTIONNEMENT

### 4.1 Mode Développeur (`appMode: 'developer'`)
- **Génération Images** : Pollinations.ai (gratuit, sans clé API)
- **Génération Vidéos** : Pollinations.ai (preview image)
- **Chat IA** : Gemini API direct
- **Base de données** : localStorage (mockDatabase)
- **DevToolbar** : Visible en bas à droite

### 4.2 Mode Production (`appMode: 'production'`)
- **Génération Images** : n8n webhook → service externe
- **Génération Vidéos** : n8n webhook → Runway/Pika
- **Chat IA** : n8n webhook
- **Base de données** : Supabase
- **DevToolbar** : Masquée

### 4.3 Changement de Mode
1. Aller dans **Admin > Infrastructure**
2. Cliquer sur "Passer en DEV/PROD"
3. Entrer le mot de passe admin : `Victoria&8530`
4. L'overlay de transition s'affiche (2.5s)
5. L'application bascule **sans perte de session**

---

## 5. CORRECTIONS APPLIQUÉES (Session actuelle)

### 5.1 GeminiService (`services/geminiService.ts`)
**Problème** : Import incorrect de `GoogleGenerativeAI`
**Solution** :
```typescript
// AVANT (erreur)
import { GoogleGenerativeAI } from "@google/genai";

// APRÈS (corrigé)
import { GoogleGenAI } from "@google/genai";

private getClient(): GoogleGenAI {
  const apiKey = this.getApiKey();
  return new GoogleGenAI({ apiKey });
}
```

**Ajouts** :
- `generateImage(prompt, aspectRatio)` → Pollinations.ai
- `generateVideo(prompt, duration)` → Pollinations.ai

### 5.2 ImageService (`services/imageService.ts`)
**Changement** : Architecture dev/prod
```typescript
if (isDev) {
  imageUrl = await geminiService.generateImage(params.prompt, params.aspectRatio);
} else {
  // Appel n8n webhook
  const response = await fetch(webhookUrl, {...});
}
```

### 5.3 VideoService (`services/videoService.ts`)
**Changement** : Même architecture que ImageService

### 5.4 MockDatabase (`services/mockDatabase.ts`)
**Problème** : Comptes Google perdus au refresh
**Solution** : Persistance localStorage
```typescript
const loadGoogleAccounts = (): Map<string, any> => {
  const saved = localStorage.getItem('pixel_google_accounts');
  if (saved) return new Map(Object.entries(JSON.parse(saved)));
  return new Map();
};

const saveGoogleAccounts = (accounts: Map<string, any>) => {
  localStorage.setItem('pixel_google_accounts', JSON.stringify(Object.fromEntries(accounts)));
};
```

### 5.5 Mode Switching sans rechargement
**Fichiers** : `AdminConsole.tsx` + `App.tsx`

**AdminConsole.tsx** (ligne ~770) :
```typescript
// AVANT
window.location.reload();

// APRÈS
window.dispatchEvent(new CustomEvent('app-mode-changed', {
  detail: { mode: switchingMode }
}));
setSettings(newSettings);
setIsSaving(false);
```

**App.tsx** (nouveau useEffect) :
```typescript
useEffect(() => {
  const handleModeChange = (event: CustomEvent<{ mode: string }>) => {
    setRefreshKey(prev => prev + 1);
  };
  window.addEventListener('app-mode-changed', handleModeChange as EventListener);
  return () => window.removeEventListener('app-mode-changed', handleModeChange as EventListener);
}, []);
```

### 5.6 Routes API Google ajoutées/corrigées
| Route | Action |
|-------|--------|
| `/api/auth/google/disconnect` | Déconnexion compte Google |
| `/api/google/status` | Statut avec validation token expiry |

---

## 6. CONFIGURATION GOOGLE OAUTH

### 6.1 Console Google Cloud
1. Créer un projet : https://console.cloud.google.com/
2. Activer les APIs :
   - Gmail API
   - Google Calendar API
   - Google Drive API
   - Google Sheets API
3. Créer OAuth 2.0 Client ID (Web Application)
4. Ajouter les URIs autorisées :
   - `https://splashbanana.com/api/auth/google/callback`
   - `http://localhost:3000/api/auth/google/callback` (dev)

### 6.2 Scopes demandés
```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/drive.readonly
```

---

## 7. WEBHOOKS N8N (Mode Production)

Configurer dans **Admin > Infrastructure** :

| Module | URL Webhook | Action |
|--------|-------------|--------|
| Chat | `https://n8n.domaine.com/webhook/chat` | `{ action: 'chat', message, userId }` |
| Images | `https://n8n.domaine.com/webhook/images` | `{ action: 'generate_image', prompt, params }` |
| Vidéos | `https://n8n.domaine.com/webhook/videos` | `{ action: 'generate_video', prompt, params }` |
| Assets | `https://n8n.domaine.com/webhook/assets` | `{ action: 'save_asset', type, url }` |

---

## 8. COMMANDES UTILES

```bash
# Développement
cd application
npm install
npm run dev

# Build production
npm run build

# Démarrage production
npm run start

# Git
git add .
git commit -m "message"
git push origin main
```

---

## 9. PROBLÈMES CONNUS ET SOLUTIONS

| Problème | Cause | Solution |
|----------|-------|----------|
| "GoogleGenerativeAI is not exported" | Mauvais import SDK | Utiliser `GoogleGenAI` |
| Session perdue au changement de mode | `window.location.reload()` | Event-based refresh |
| Google account disparu au refresh | Stockage en mémoire | localStorage persistence |
| Erreur JSON dans chat | Méthodes manquantes | Ajout generateImage/generateVideo |

---

## 10. FICHIERS CRITIQUES

| Fichier | Rôle | Sensibilité |
|---------|------|-------------|
| `.env.local` | Variables d'environnement | **SECRET** |
| `services/mockDatabase.ts` | Base de données mock + users | Contient passwords |
| `lib/encryption.ts` | Chiffrement tokens | Clé dans env |
| `services/authService.ts` | Authentification | Logic login |

---

## 11. DÉPLOIEMENT HOSTINGER

1. **Build local** :
   ```bash
   npm run build
   ```

2. **Upload** : Copier le contenu de `.next/` et `public/` vers Hostinger

3. **Variables d'environnement** : Configurer dans le panel Hostinger :
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`
   - `GEMINI_API_KEY`
   - `ENCRYPTION_KEY`

4. **Node.js** : Version 18+ requise

---

## 12. CONTACTS ET RESSOURCES

- **Email admin** : pixelenroute@gmail.com
- **GitHub** : https://github.com/pixelenroute-stack/splash-banana
- **Documentation Next.js** : https://nextjs.org/docs
- **Google Cloud Console** : https://console.cloud.google.com/
- **n8n Documentation** : https://docs.n8n.io/

---

*Document généré automatiquement - Session Claude du 2 février 2026*
