# Guide de déploiement sur Hostinger

## Prérequis

- Un hébergement Hostinger avec **Node.js** activé (plan Business ou supérieur)
- Accès au terminal SSH ou au gestionnaire de fichiers
- Un compte GitHub avec ce dépôt

## Méthode 1 : Déploiement via Git (Recommandé)

### 1. Connecter GitHub à Hostinger

1. Connectez-vous à votre **hPanel Hostinger**
2. Allez dans **Avancé** → **Git**
3. Cliquez sur **Créer un nouveau dépôt**
4. Sélectionnez **GitHub** et autorisez l'accès
5. Choisissez votre dépôt `splash-banana-app`
6. Sélectionnez la branche `main`
7. Définissez le répertoire cible : `public_html` ou un sous-dossier

### 2. Configurer Node.js

1. Allez dans **Avancé** → **Node.js**
2. Activez Node.js
3. Configurez :
   - **Version Node.js** : 18.x ou 20.x
   - **Fichier de démarrage** : `server.js`
   - **Port** : 3000 (ou celui attribué par Hostinger)

### 3. Variables d'environnement

Dans **Node.js** → **Variables d'environnement**, ajoutez :

```
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_SUPABASE_URL=votre_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle
GEMINI_API_KEY=votre_cle_gemini
```

### 4. Déploiement automatique

Activez le **déploiement automatique** pour que chaque push sur `main` déclenche une mise à jour.

## Méthode 2 : Déploiement manuel via SSH

### 1. Connexion SSH

```bash
ssh u123456789@votre-domaine.com -p 65002
```

### 2. Cloner le dépôt

```bash
cd ~/public_html
git clone https://github.com/votre-username/splash-banana-app.git .
```

### 3. Installer et construire

```bash
npm install
npm run build
```

### 4. Démarrer l'application

```bash
# Avec PM2 (recommandé)
pm2 start ecosystem.config.js --env production

# Ou directement
npm start
```

## Structure des fichiers sur Hostinger

```
public_html/
├── .next/              # Build Next.js (généré)
├── node_modules/       # Dépendances (généré)
├── public/             # Fichiers statiques
├── app/                # Routes Next.js
├── components/         # Composants React
├── server.js           # Point d'entrée
├── package.json        # Configuration npm
└── .env.local          # Variables d'environnement
```

## Configuration du domaine

### Sous-domaine

1. hPanel → **Domaines** → **Sous-domaines**
2. Créez un sous-domaine : `app.votre-domaine.com`
3. Pointez vers le dossier de l'application

### SSL/HTTPS

1. hPanel → **SSL**
2. Activez le certificat SSL gratuit Let's Encrypt
3. Forcez HTTPS dans les paramètres

## Dépannage

### L'application ne démarre pas

1. Vérifiez les logs : `pm2 logs splash-banana`
2. Vérifiez le port dans les variables d'environnement
3. Assurez-vous que le build est complet : `npm run build`

### Erreur 503 / 502

1. Vérifiez que Node.js est bien démarré
2. Vérifiez le port configuré
3. Redémarrez l'application : `pm2 restart splash-banana`

### Erreur de mémoire

1. Augmentez la limite dans `ecosystem.config.js`
2. Contactez le support Hostinger pour plus de ressources

## Mise à jour de l'application

### Via Git (automatique)

```bash
git add .
git commit -m "Update"
git push origin main
```

### Via SSH (manuel)

```bash
cd ~/public_html
git pull origin main
npm install
npm run build
pm2 restart splash-banana
```

## Support

- Documentation Hostinger : https://support.hostinger.com/
- Documentation Next.js : https://nextjs.org/docs
