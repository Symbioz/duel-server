#!/bin/bash
# Script pour démarrer l'application en production avec Docker Compose

set -e

echo "🚀 Démarrage du duel-server avec Docker Compose..."

# Vérifier si .env existe
if [ ! -f .env ]; then
    echo "⚠️  .env non trouvé. Création depuis .env.example..."
    cp .env.example .env
    echo "✅ .env créé. Veuillez éditer .env avec vos paramètres (clés API, etc.)"
    echo ""
fi

# Démarrer les services
docker-compose up -d

# Attendre que le serveur soit prêt
echo "⏳ Attente du démarrage du serveur..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:8787/health > /dev/null; then
        echo "✅ Serveur démarré avec succès!"
        break
    fi
    attempt=$((attempt + 1))
    sleep 1
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Timeout: Le serveur n'a pas pu démarrer"
    echo "Logs:"
    docker-compose logs duel-server
    exit 1
fi

# Afficher les informations de démarrage
echo ""
echo "📊 Services en cours d'exécution:"
docker-compose ps
echo ""
echo "🌐 Accès à l'application:"
echo "  - Serveur: http://localhost:8787"
echo "  - Health check: http://localhost:8787/health"

# Afficher la clé d'accès si elle a été générée
if ! grep -q "^CONTROLLER_ACCESS_KEY=." .env; then
    ACCESS_KEY=$(docker-compose logs duel-server | grep -oP "Access key: \K[^\s]+" | head -1)
    if [ -n "$ACCESS_KEY" ]; then
        echo "  - Clé d'accès: $ACCESS_KEY"
    fi
fi

echo ""
echo "📝 Logs en direct:"
docker-compose logs -f

