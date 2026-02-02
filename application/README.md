# Splash Banana - Suite de Production Vidéo IA

Suite complète de production vidéo avec intelligence artificielle, conçue pour les agences de création de contenu.

## Fonctionnalités

### Studio IA
- **Chat IA Multi-Provider** - Support de Gemini, OpenAI, Anthropic, Perplexity, DeepSeek
- **Génération d'Images** - Création d'images via n8n workflows ou APIs directes
- **Génération de Vidéos** - Production vidéo automatisée avec IA
- **Social Factory** - Création de contenu pour réseaux sociaux

### Gestion & Workspace
- **Google Workspace** - Intégration Gmail, Calendar, Drive
- **CRM Clients** - Gestion des clients avec sync Notion/Google Sheets/Supabase
- **Projets** - Suivi des projets de production vidéo
- **Facturation** - Gestion des devis, factures et contrats
- **Prospection** - Module de recherche et qualification de leads

### Administration
- **Console Admin** - Gestion des utilisateurs et permissions
- **Configuration** - Paramétrage des intégrations et webhooks n8n
- **Audit Logs** - Traçabilité des actions

## Prérequis

- Node.js 18+
- npm ou yarn
- Un compte Supabase (optionnel mais recommandé)
- Clés API pour les providers IA souhaités

## Installation

1. **Cloner ou extraire le projet** dans le dossier `application/`

2. **Installer les dépendances**
   ```bash
   cd application
   npm install
   ```

3. **Configurer les variables d'environnement**
   ```bash
   # Copier le fichier exemple
   cp .env.example .env.local

   # Éditer .env.local avec vos clés API
   ```

4. **Lancer l'application en développement**
   ```bash
   npm run dev
   ```

5. **Accéder à l'application**
   Ouvrez [http://localhost:3000](http://localhost:3000)

## Configuration

### Variables d'environnement principales

| Variable | Description | Obligatoire |
|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de votre projet Supabase | Non* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme Supabase | Non* |
| `GEMINI_API_KEY` | Clé API Google Gemini | Non |
| `OPENAI_API_KEY` | Clé API OpenAI | Non |
| `ANTHROPIC_API_KEY` | Clé API Anthropic Claude | Non |

*L'application fonctionne en mode "mock" sans Supabase

### Mode Mock (sans base de données)

Sans Supabase configuré, l'application utilise le localStorage du navigateur pour stocker les données. C'est idéal pour les tests et la démonstration.

**Compte par défaut :**
- Email: `pixelenroute@gmail.com`
- Mot de passe: `Victoria&8530`

## Architecture

```
application/
├── app/                    # Next.js App Router
│   ├── api/               # Routes API
│   │   ├── auth/         # Authentification Google
│   │   ├── chat/         # Endpoint chat IA
│   │   ├── proxy/        # Proxys API (Notion, Anthropic...)
│   │   └── admin/        # Administration
│   ├── layout.tsx        # Layout racine
│   ├── page.tsx          # Page principale
│   └── globals.css       # Styles globaux
├── components/            # Composants React
│   ├── admin/            # Composants administration
│   ├── auth/             # Composants authentification
│   ├── backgrounds/      # Fonds 3D (Three.js)
│   ├── google/           # Intégrations Google
│   ├── image-studio/     # Studio d'images
│   ├── library/          # Bibliothèque média
│   ├── n8n-hub/          # Hub n8n
│   ├── prospection/      # Module prospection
│   ├── ui/               # Composants UI réutilisables
│   └── video-studio/     # Studio vidéo
├── services/             # Services métier
├── lib/                  # Utilitaires et clients
├── hooks/                # Hooks React custom
├── context/              # Contextes React
└── types.ts              # Types TypeScript
```

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Lance le serveur de production |
| `npm run lint` | Vérifie le code avec ESLint |

## Déploiement

### Vercel (Recommandé)

1. Connectez votre repository à Vercel
2. Configurez les variables d'environnement
3. Déployez

### Hostinger / VPS

1. Build l'application
   ```bash
   npm run build
   ```

2. Lancez le serveur
   ```bash
   npm run start
   ```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Intégration n8n

L'application est conçue pour fonctionner avec des workflows n8n. Configurez les webhooks dans la console d'administration pour connecter :

- Chat IA
- Génération d'images
- Génération de vidéos
- Synchronisation clients
- Prospection automatisée

## Technologies utilisées

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **3D**: Three.js, React Three Fiber
- **Base de données**: Supabase (PostgreSQL)
- **Authentification**: Supabase Auth, Google OAuth
- **IA**: Multi-provider (Gemini, OpenAI, Anthropic, Perplexity)

## Support

Pour toute question ou problème, consultez la documentation ou ouvrez une issue.

## Licence

Projet privé - Tous droits réservés.
