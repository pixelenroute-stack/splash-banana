# Guide de déploiement Hostinger - Splash Banana App

## Application déployée

**Dépôt GitHub**: https://github.com/pixelenroute-stack/splash-banana

## Déploiement rapide

### Étape 1 : Connexion Hostinger avec GitHub

1. Accédez à votre **hPanel Hostinger**
2. Naviguez vers **Avancé** → **Git**
3. Cliquez sur **Créer un nouveau dépôt**
4. Sélectionnez **GitHub** et autorisez l'accès
5. Choisissez le dépôt : `pixelenroute-stack/splash-banana`
6. Branche : `main`
7. Répertoire cible : `public_html` (ou sous-dossier de votre choix)

### Étape 2 : Configuration Node.js

1. Dans hPanel, allez à **Avancé** → **Node.js**
2. Activez Node.js
3. Configurez les paramètres :
   - **Version Node.js** : 18.x ou 20.x (recommandé : 20.x)
   - **Fichier de démarrage** : `server.js`
   - **Port d'application** : 3000 (ou le port assigné par Hostinger)
   - **Mode de démarrage** : PM2

### Étape 3 : Variables d'environnement

Dans **Node.js** → **Variables d'environnement**, configurez :

```env
NODE_ENV=production
PORT=3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon

# Google Gemini AI
GEMINI_API_KEY=votre_cle_gemini_api

# Google OAuth (optionnel)
GOOGLE_CLIENT_ID=votre_client_id
GOOGLE_CLIENT_SECRET=votre_client_secret
GOOGLE_REDIRECT_URI=https://votre-domaine.com/api/auth/google/callback

# n8n Webhooks (optionnel)
N8N_WEBHOOK_URL_NEWS=https://n8n.srv1027050.hstgr.cloud/webhook/news
N8N_WEBHOOK_URL_IMAGES=https://n8n.srv1027050.hstgr.cloud/webhook/images
N8N_WEBHOOK_URL_VIDEOS=https://n8n.srv1027050.hstgr.cloud/webhook/videos
```

### Étape 4 : Déploiement automatique

1. Dans **Git**, activez le **déploiement automatique**
2. Chaque push sur `main` déclenchera automatiquement :
   - Pull du code
   - `npm install`
   - `npm run build`
   - Redémarrage de l'application

## Déploiement manuel via SSH

Si vous préférez le déploiement manuel :

### Connexion SSH

```bash
ssh u123456789@votre-domaine.com -p 65002
```

### Installation

```bash
# Naviguer vers le répertoire web
cd ~/public_html

# Cloner le dépôt (si première fois)
git clone https://github.com/pixelenroute-stack/splash-banana.git .

# Ou mettre à jour (si déjà cloné)
git pull origin main

# Installer les dépendances
npm install

# Construire l'application
npm run build

# Créer le dossier logs
mkdir -p logs

# Démarrer avec PM2
pm2 start ecosystem.config.js --env production

# Sauvegarder la configuration PM2
pm2 save
pm2 startup
```

## Configuration du domaine

### SSL/HTTPS

1. Dans hPanel → **SSL**
2. Activez le certificat SSL gratuit (Let's Encrypt)
3. Forcez HTTPS dans les paramètres

### Sous-domaine (optionnel)

1. hPanel → **Domaines** → **Sous-domaines**
2. Créez : `app.votre-domaine.com`
3. Pointez vers le dossier de déploiement

## Structure des fichiers

```
public_html/
├── .next/              # Build Next.js (auto-généré)
├── node_modules/       # Dépendances (auto-généré)
├── logs/              # Logs PM2
├── app/               # Routes Next.js API
├── components/        # Composants React
├── services/          # Services backend
├── lib/               # Bibliothèques
├── server.js          # Serveur Node.js
├── ecosystem.config.js # Configuration PM2
├── package.json       # Dépendances npm
└── .env.local         # Variables d'environnement (créer manuellement)
```

## Mises à jour

### Automatique (via Git Hostinger)

Simplement pousser vers GitHub :

```bash
git add .
git commit -m "Update: description des changements

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push origin main
```

Hostinger détectera automatiquement et déploiera.

### Manuel (via SSH)

```bash
cd ~/public_html
git pull origin main
npm install
npm run build
pm2 restart splash-banana
```

## Commandes PM2 utiles

```bash
# Voir le statut
pm2 status

# Voir les logs
pm2 logs splash-banana

# Redémarrer
pm2 restart splash-banana

# Arrêter
pm2 stop splash-banana

# Relancer après un reboot serveur
pm2 resurrect
```

## Dépannage

### Erreur 503/502 Bad Gateway

1. Vérifier que Node.js est actif :
   ```bash
   pm2 status
   ```

2. Vérifier les logs :
   ```bash
   pm2 logs splash-banana --lines 100
   ```

3. Redémarrer l'application :
   ```bash
   pm2 restart splash-banana
   ```

### Erreur de build

1. Supprimer les fichiers de cache :
   ```bash
   rm -rf .next node_modules
   npm install
   npm run build
   ```

2. Vérifier les variables d'environnement

### Application lente / Mémoire

1. Vérifier l'utilisation mémoire :
   ```bash
   pm2 monit
   ```

2. Augmenter la limite dans `ecosystem.config.js` :
   ```javascript
   max_memory_restart: '1G',
   ```

3. Contacter le support Hostinger si nécessaire

## Support

- **Documentation Hostinger** : https://support.hostinger.com/
- **Documentation Next.js** : https://nextjs.org/docs
- **Documentation PM2** : https://pm2.keymetrics.io/

## Notes importantes

- Cette application Next.js nécessite Node.js 18.x ou supérieur
- Le plan Hostinger doit supporter Node.js (Business ou supérieur)
- Les webhooks n8n sont optionnels et peuvent être configurés plus tard
- Assurez-vous que toutes les variables d'environnement sont correctement configurées avant le démarrage
