#!/bin/bash
# Script pour arrêter et nettoyer Docker Compose

set -e

echo "🛑 Arrêt des services..."

# Arrêter et supprimer les conteneurs
docker-compose down

echo "✅ Services arrêtés"
echo ""
echo "Pour supprimer également les volumes (données):"
echo "  docker-compose down -v"

