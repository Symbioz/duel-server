# Duel Server

Serveur Node.js/TypeScript pour un jeu de duel magique, avec :

- contrôleur mobile (page HTTP + WebSocket),
- capture de gestes,
- reconnaissance vocale de sorts via Voxtral (Mistral),
- endpoint HTTP pour convertir un audio prononcé en sort.

## Prérequis

- Node.js 20+
- npm
- (Optionnel) une clé API Mistral pour la voix cloud
- (Optionnel) un serveur vLLM local pour Voxtral

## Installation

```bash
npm install
cp .env.example .env
```

## Configuration

Le serveur lit `.env` automatiquement via `app.config.ts`.

Variables principales :

- `HOST` (défaut `0.0.0.0`)
- `PORT` (défaut `8787`)
- `CONTROLLER_ACCESS_KEY` (obligatoire en pratique)
- `MAX_CONTROLLERS`
- `WS_RATE_LIMIT_PER_SEC`
- `WS_MAX_PAYLOAD_BYTES`
- `ALLOWED_ORIGINS` (optionnel)

Variables voix (Voxtral) :

- `MISTRAL_API_KEY` : active la reconnaissance vocale
- `VOXTRAL_MODEL` : défaut `voxtral-mini-latest`
- `VOXTRAL_BASE_URL` : optionnel, pour pointer vers un serveur local compatible API (`http://localhost:8000/v1`)

Si `MISTRAL_API_KEY` est absent, le serveur démarre quand même, mais `POST /voice/spell` renvoie `503`.

## Lancer le projet

Développement :

```bash
npm run dev
```

Build + production :

```bash
npm run build
npm start
```

Tests :

```bash
npm test -- --run
```

## Utilisation côté contrôleur mobile

1. Lance le serveur.
2. Ouvre l'URL affichée en console sur ton téléphone :
   `http://<ip-locale>:8787/controller?k=<access-key>`
3. Dessine sur la zone tactile.
4. Le serveur reçoit les messages de gestes et traite les sessions.

## Endpoints HTTP

### Contrôleur & santé

- `GET /health` : santé (`{ "status": "ok" }`)
- `GET /controller?k=<access-key>` : page contrôleur mobile

### Reconnaissance de gestes (API publique, CORS enabled)

Servi sur `http://localhost:8787/api/gesture-recognition/*` (pas d'authentification requise)

- `GET /api/gesture-recognition/health` : état du service
- `POST /api/gesture-recognition/warmup` : pré-charger les templates SVG
- `POST /api/gesture-recognition/recognize` : reconnaître un geste

### Reconnaissance vocale de sorts

- `POST /voice/spell?k=<access-key>` : reconnaissance vocale d'un sort

### `POST /voice/spell`

Mode unique supporte: envoyer l'audio brut en binaire.

Exemple cote front:

```ts
await fetch(`/voice/spell?k=${encodeURIComponent(accessKey)}`, {
  method: 'POST',
  headers: { 'Content-Type': 'audio/webm;codecs=opus' },
  body: audioBlob
});
```

Réponse JSON :

```json
{
  "spellName": "expelliarmus",
  "transcript": "expelliarmus",
  "confidence": 0.98
}
```

Notes :

- taille max de payload audio : 10 MB,
- en cas de sort non reconnu : `spellName` peut être `null`.

## Tester rapidement la voix

Le repo contient un script : `scripts/test-voice.sh`.

Utilisation :

```bash
npm run test:voice -- ./chemin/vers/audio.webm
```

Ou avec type MIME explicite :

```bash
npm run test:voice -- ./chemin/vers/audio.wav audio/wav
```

Le script :

- charge `.env` si présent,
- lit `HOST`, `PORT`, `CONTROLLER_ACCESS_KEY`,
- envoie le fichier audio brut en binaire,
- appelle `POST /voice/spell` avec `Content-Type: audio/*`.

## Voxtral en local (optionnel)

Exemple de lancement vLLM avec dépendances Python :

```bash
# Créer et activer un venv (une fois)
python3 -m venv .venv
source .venv/bin/activate

# Installer les dépendances (une fois, ou après chaque pull si requirements.txt change)
pip install -r requirements.txt

# Lancer le serveur vLLM
vllm serve mistralai/Voxtral-Mini-3B-2507 --port 8000
```

Puis dans `.env` :

```bash
MISTRAL_API_KEY=dummy-local-key
VOXTRAL_BASE_URL=http://localhost:8000/v1
VOXTRAL_MODEL=mistralai/Voxtral-Mini-3B-2507
```

**Note :** Le dossier `.venv/` n'est pas commité (voir `.gitignore`). Sur une autre machine, réexécutez les 3 commandes ci-dessus.

## Configuration front

Le front s'attend aux endpoints suivants sur `http://localhost:8787` :

```
GET /api/gesture-recognition/health
POST /api/gesture-recognition/warmup
POST /api/gesture-recognition/recognize
POST /voice/spell?k=<VOICE_SPELL_ACCESS_KEY>
```

Configure ton front avec :
- `VITE_GESTURE_RECOGNITION_API_BASE_URL='http://localhost:8787'`
- `VITE_VOICE_SPELL_ACCESS_KEY='<ton-access-key>'`

## Dépannage

- `401` sur `/controller` ou `/voice/spell` : vérifier `k=<CONTROLLER_ACCESS_KEY>`.
- `503` sur `/voice/spell` : vérifier `MISTRAL_API_KEY` (ou config locale vLLM).
- `415` sur `/voice/spell` : `Content-Type` invalide (utiliser `audio/*`).
- `400` sur `/voice/spell` : payload audio vide.
- `413` sur `/voice/spell` : audio trop volumineux (> 10 MB).
