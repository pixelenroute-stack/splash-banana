# Configuration du déploiement automatique GitHub → Hostinger

## Problème identifié
Le code a été poussé sur GitHub mais le déploiement automatique vers Hostinger n'est PAS configuré.

## Solution : Configuration étape par étape

### Étape 1 : Connexion GitHub dans Hostinger

1. **Connectez-vous à hPanel Hostinger**
   - URL : https://hpanel.hostinger.com
   - Utilisez vos identifiants Hostinger

2. **Naviguez vers Git**
   - Cliquez sur **Avancé** dans le menu latéral
   - Sélectionnez **Git**

3. **Créer une nouvelle connexion Git**
   - Cliquez sur le bouton **"Créer un nouveau dépôt"** ou **"Add New Repository"**
   - Sélectionnez **GitHub** comme source

4. **Autoriser l'accès GitHub**
   - Vous serez redirigé vers GitHub
   - Cliquez sur **"Authorize Hostinger"**
   - Sélectionnez l'organisation : **pixelenroute-stack**
   - Accordez l'accès au dépôt : **splash-banana**

5. **Configurer le dépôt**
   - **Repository** : `pixelenroute-stack/splash-banana`
   - **Branch** : `main`
   - **Deploy path** : `/public_html` (ou `/public_html/app` si vous préférez un sous-dossier)
   - Cochez **"Deploy on push"** pour activer le déploiement automatique

6. **Sauvegarder la configuration**

### Étape 2 : Configuration Node.js dans Hostinger

1. **Naviguez vers Node.js**
   - Dans hPanel, cliquez sur **Avancé** → **Node.js**

2. **Activer Node.js**
   - Activez le toggle **"Enable Node.js"**

3. **Configurer l'application**
   - **Application mode** : Production
   - **Application root** : `/public_html` (ou le chemin configuré à l'étape 1)
   - **Application URL** : Votre domaine (ex: splash-banana.com ou app.votredomaine.com)
   - **Application startup file** : `server.js`
   - **Node.js version** : 20.x (recommandé) ou 18.x minimum

4. **Configurer le port**
   - **Port** : Laissez Hostinger assigner automatiquement (généralement 3000)
   - Notez le port assigné pour les variables d'environnement

### Étape 3 : Variables d'environnement

Dans la section **Node.js**, trouvez **"Environment Variables"** et ajoutez :

```env
# Environment
NODE_ENV=production
PORT=3000

# Supabase (REQUIS)
NEXT_PUBLIC_SUPABASE_URL=https://xyzabc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Google Gemini AI (REQUIS)
GEMINI_API_KEY=AIzaSy...

# Google OAuth (Optionnel - pour intégration Google)
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://votredomaine.com/api/auth/google/callback

# n8n Webhooks (Optionnel - pour automatisation)
N8N_WEBHOOK_URL_NEWS=https://n8n.srv1027050.hstgr.cloud/webhook/news
N8N_WEBHOOK_URL_IMAGES=https://n8n.srv1027050.hstgr.cloud/webhook/images
N8N_WEBHOOK_URL_VIDEOS=https://n8n.srv1027050.hstgr.cloud/webhook/videos

# API Keys additionnelles (Optionnel)
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...
```

### Étape 4 : Premier déploiement

1. **Déployer manuellement la première fois**
   - Dans hPanel → **Git**, trouvez votre dépôt
   - Cliquez sur **"Pull"** ou **"Deploy"**
   - Attendez que le déploiement se termine (cela peut prendre 2-5 minutes)

2. **Installation des dépendances**
   - Hostinger devrait automatiquement exécuter `npm install`
   - Si ce n'est pas le cas, connectez-vous via SSH et exécutez :
     ```bash
     cd ~/public_html
     npm install
     npm run build
     ```

3. **Démarrer l'application**
   - Dans **Node.js**, cliquez sur **"Restart Application"**
   - Ou via SSH :
     ```bash
     pm2 start ecosystem.config.js --env production
     pm2 save
     ```

### Étape 5 : Vérification du déploiement automatique

1. **Tester le webhook**
   - Faites un changement mineur dans le code
   - Commitez et poussez vers GitHub :
     ```bash
     git add .
     git commit -m "test: Verify auto-deployment"
     git push origin main
     ```

2. **Vérifier dans Hostinger**
   - Allez dans hPanel → **Git**
   - Vous devriez voir une nouvelle entrée de déploiement
   - Le statut devrait être "Success" après quelques minutes

3. **Vérifier l'application**
   - Accédez à votre domaine
   - L'application devrait afficher les derniers changements

## Dépannage

### Le déploiement échoue

**Vérifier les logs de déploiement :**
1. hPanel → **Git** → Cliquez sur votre dépôt
2. Onglet **"Deployment History"**
3. Cliquez sur le dernier déploiement pour voir les logs

**Erreurs communes :**

#### Erreur : "npm install failed"
```bash
# Solution via SSH
cd ~/public_html
rm -rf node_modules package-lock.json
npm install
```

#### Erreur : "Build failed"
```bash
# Vérifier les variables d'environnement
# Elles doivent être configurées dans hPanel → Node.js → Environment Variables

# Rebuilder manuellement
npm run build
```

#### Erreur : "Application won't start"
```bash
# Vérifier que server.js existe
ls -la server.js

# Vérifier les logs PM2
pm2 logs splash-banana

# Redémarrer
pm2 restart splash-banana
```

### Le webhook GitHub ne fonctionne pas

1. **Vérifier les webhooks GitHub**
   - Allez sur : https://github.com/pixelenroute-stack/splash-banana/settings/hooks
   - Vous devriez voir un webhook Hostinger
   - Status : dernière livraison devrait être en vert (200)

2. **Re-livrer un webhook manuellement**
   - Cliquez sur le webhook
   - Onglet **"Recent Deliveries"**
   - Cliquez sur **"Redeliver"**

3. **Reconfigurer la connexion Git**
   - Dans hPanel → **Git**
   - Supprimez la connexion existante
   - Recréez-la en suivant l'Étape 1

### L'application ne se met pas à jour

1. **Forcer un déploiement manuel**
   ```bash
   # Via SSH
   cd ~/public_html
   git pull origin main
   npm install
   npm run build
   pm2 restart splash-banana
   ```

2. **Vérifier le cache**
   - Videz le cache du navigateur (Ctrl+Shift+R)
   - Vérifiez si le changement est visible dans le code source

## Commandes utiles SSH

### Connexion SSH
```bash
# Remplacez par vos identifiants Hostinger
ssh u123456789@srv1027050.hstgr.cloud -p 65002
```

### Vérifier le statut
```bash
# Statut de l'application
pm2 status

# Logs en temps réel
pm2 logs splash-banana

# Utilisation mémoire
pm2 monit
```

### Redémarrer
```bash
# Redémarrage simple
pm2 restart splash-banana

# Redémarrage complet avec rebuild
cd ~/public_html
git pull origin main
npm install
npm run build
pm2 restart splash-banana
```

## Contacts de support

- **Support Hostinger** : https://support.hostinger.com/
- **Live Chat Hostinger** : Disponible 24/7 dans hPanel
- **Documentation GitHub** : https://docs.github.com/webhooks

## Checklist de vérification

Avant de demander de l'aide, vérifiez :

- [ ] La connexion Git est configurée dans hPanel
- [ ] Le déploiement automatique est activé ("Deploy on push")
- [ ] Node.js est activé avec la bonne version (18.x ou 20.x)
- [ ] Le fichier `server.js` existe dans le dépôt
- [ ] Toutes les variables d'environnement requises sont configurées
- [ ] Le port dans les variables d'environnement correspond au port Hostinger
- [ ] Le webhook GitHub est actif (voir Settings → Webhooks)
- [ ] Les logs de déploiement ne montrent pas d'erreurs
- [ ] L'application démarre sans erreur (vérifier `pm2 logs`)

## Notes importantes

- Le premier déploiement peut prendre 5-10 minutes
- Les déploiements suivants sont plus rapides (1-3 minutes)
- Si vous changez les variables d'environnement, redémarrez l'application
- Hostinger peut limiter les ressources selon votre plan d'hébergement
- Pour les applications Next.js, assurez-vous d'avoir le plan Business ou supérieur
