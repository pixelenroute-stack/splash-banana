#!/bin/bash

# Splash Banana - Script de déploiement Hostinger
# Usage: ./deploy.sh [environment]
# Environment: production (default), staging

set -e

ENVIRONMENT=${1:-production}
APP_NAME="splash-banana"

echo "🚀 Déploiement de $APP_NAME en mode $ENVIRONMENT"
echo "=================================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    log_error "Erreur: package.json non trouvé. Êtes-vous dans le bon répertoire?"
    exit 1
fi

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
    log_error "Node.js n'est pas installé"
    exit 1
fi

log_info "Node.js version: $(node --version)"
log_info "npm version: $(npm --version)"

# 1. Mettre à jour le code depuis Git
echo ""
echo "📥 Mise à jour du code depuis Git..."
if [ -d ".git" ]; then
    git fetch origin
    git reset --hard origin/main
    log_info "Code mis à jour depuis origin/main"
else
    log_warn "Pas de dépôt Git trouvé, passage à l'étape suivante"
fi

# 2. Installer les dépendances
echo ""
echo "📦 Installation des dépendances..."
if [ "$ENVIRONMENT" = "production" ]; then
    npm ci --only=production
else
    npm install
fi
log_info "Dépendances installées"

# 3. Build de l'application
echo ""
echo "🔨 Build de l'application Next.js..."
npm run build
log_info "Build terminé avec succès"

# 4. Créer le dossier logs s'il n'existe pas
if [ ! -d "logs" ]; then
    mkdir -p logs
    log_info "Dossier logs créé"
fi

# 5. Vérifier si PM2 est installé
if ! command -v pm2 &> /dev/null; then
    log_warn "PM2 n'est pas installé globalement"
    echo "Installation de PM2..."
    npm install -g pm2
    log_info "PM2 installé"
fi

# 6. Gérer le processus PM2
echo ""
echo "🔄 Gestion du processus PM2..."

if pm2 describe $APP_NAME > /dev/null 2>&1; then
    # L'application existe déjà, on la redémarre
    log_info "Redémarrage de l'application existante..."
    pm2 restart $APP_NAME --env $ENVIRONMENT
    pm2 save
else
    # Première installation, on démarre l'application
    log_info "Démarrage de la nouvelle application..."
    pm2 start ecosystem.config.js --env $ENVIRONMENT
    pm2 save

    # Configurer PM2 pour redémarrer au boot
    pm2 startup
fi

# 7. Afficher le statut
echo ""
echo "📊 Statut de l'application:"
pm2 status

# 8. Afficher les derniers logs
echo ""
echo "📋 Derniers logs (10 dernières lignes):"
pm2 logs $APP_NAME --lines 10 --nostream

# 9. Vérifier que l'application répond
echo ""
echo "🏥 Vérification de la santé de l'application..."
sleep 3

if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")

    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
        log_info "Application accessible (HTTP $HTTP_CODE)"
    else
        log_warn "Application ne répond pas correctement (HTTP $HTTP_CODE)"
        echo "Vérifiez les logs: pm2 logs $APP_NAME"
    fi
else
    log_warn "curl n'est pas installé, impossible de vérifier la santé de l'application"
fi

echo ""
echo "=================================================="
log_info "Déploiement terminé avec succès! 🎉"
echo ""
echo "Commandes utiles:"
echo "  pm2 status              - Voir le statut"
echo "  pm2 logs $APP_NAME      - Voir les logs"
echo "  pm2 monit               - Monitorer en temps réel"
echo "  pm2 restart $APP_NAME   - Redémarrer l'application"
echo ""
