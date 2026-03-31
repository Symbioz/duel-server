#!/bin/bash
# Script pour exécuter les tests dans Docker

set -e

echo "🧪 Exécution des tests..."

# Assurez-vous que les services sont en cours d'exécution
if ! docker-compose ps duel-server | grep -q "Up"; then
    echo "⚠️  Le service n'est pas en cours d'exécution. Démarrage..."
    docker-compose up -d
    sleep 5
fi

# Exécuter les tests
docker-compose exec -T duel-server npm test

echo "✅ Tests terminés"

