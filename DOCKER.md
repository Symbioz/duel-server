# Docker Setup

Ce dossier contient la configuration Docker pour exécuter le duel-server avec tous ses dépendances.

## 📋 Fichiers

- **`Dockerfile`** - Image de production optimisée
- **`Dockerfile.dev`** - Image de développement avec hot-reload
- **`docker-compose.yml`** - Configuration principale (production)
- **`docker-compose.dev.yml`** - Configuration de développement (à combiner avec docker-compose.yml)
- **`.dockerignore`** - Fichiers à exclure lors de la construction

## 🚀 Quick Start

### Option 1: Production (avec Mistral API Cloud)

```bash
# Copier et configurer les variables d'environnement
cp .env.example .env

# Éditer .env et ajouter votre clé Mistral API
# MISTRAL_API_KEY=your_key_here

# Lancer les services
docker-compose up -d
```

### Option 2: Développement local (avec vLLM)

```bash
# Copier la configuration
cp .env.example .env

# Éditer .env et décommenter VOXTRAL_BASE_URL
# VOXTRAL_BASE_URL=http://vllm-server:8000

# Lancer avec hot-reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## 🔧 Services

### duel-server
- **Port**: 8787 (configurable via `PORT`)
- **Santé**: `http://localhost:8787/health`

### vllm-server (optionnel)
- **Port**: 8000 (configurable via `VLLM_PORT`)
- **Santé**: `http://localhost:8000/health`
- Utilisé pour la reconnaissance vocale locale

## 🌍 Variables d'Environnement Principales

```env
PORT=8787                                # Port du serveur
CONTROLLER_ACCESS_KEY=                   # Clé d'accès au contrôleur
MISTRAL_API_KEY=your_api_key            # Pour Voxtral cloud
VOXTRAL_BASE_URL=http://vllm-server:8000  # Pour vLLM local
VOXTRAL_TIMEOUT_MS=1800                 # Timeout transcription voix (fail-fast)
VOICE_MAX_AUDIO_BYTES=1048576           # Taille max payload audio (1 MB)
```

Voir `.env.example` pour tous les paramètres disponibles.

## 📊 Commandes Utiles

```bash
# Démarrer les services
docker-compose up -d

# Arrêter les services
docker-compose down

# Voir les logs
docker-compose logs -f duel-server

# Voir les logs d'un service spécifique
docker-compose logs -f vllm-server

# Reconstruire l'image
docker-compose up -d --build

# Nettoyer tout (images, volumes)
docker-compose down -v

# Exécuter une commande dans le container
docker-compose exec duel-server npm test

# Voir l'état des services
docker-compose ps
```

## 🔍 Vérifier l'État

```bash
# Health check du serveur principal
curl http://localhost:8787/health

# Health check de vLLM
curl http://localhost:8000/health

# Accéder au contrôleur
# http://localhost:8787/controller?k=<CONTROLLER_ACCESS_KEY>
```

## 📝 Notes

- **vLLM** est un service optionnel pour la reconnaissance vocale locale. Commentez-le dans docker-compose.yml si vous utilisez uniquement Mistral API.
- **Ressources**: vLLM nécessite 16GB de RAM minimum. Ajustez selon vos ressources.
- **Premier démarrage**: vLLM peut prendre plusieurs minutes pour télécharger le modèle.
- **Développement**: Utilisez `docker-compose.dev.yml` pour bénéficier du hot-reload.

## 🐛 Dépannage

### Conteneur ne démarre pas
```bash
docker-compose logs duel-server
```

### Port déjà utilisé
```bash
# Changer le port dans .env
PORT=8788
```

### vLLM prend trop de mémoire
Réduisez la limite de mémoire dans docker-compose.yml ou commentez le service.

### Clé d'accès au contrôleur
Si `CONTROLLER_ACCESS_KEY` n'est pas définie, une clé aléatoire est générée. Consultez les logs pour la voir:
```bash
docker-compose logs duel-server | grep "Access key"
```

