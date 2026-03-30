#!/usr/bin/env bash
set -euo pipefail

# Quick tester for POST /voice/spell (binary audio)
# Usage:
#   ./scripts/test-voice.sh <audio-file> [mime-type]
# Example:
#   ./scripts/test-voice.sh ./samples/expelliarmus.webm audio/webm

if [ $# -lt 1 ]; then
  echo "Usage: $0 <audio-file> [mime-type]" >&2
  exit 1
fi

AUDIO_FILE="$1"
if [ ! -f "$AUDIO_FILE" ]; then
  echo "File not found: $AUDIO_FILE" >&2
  exit 1
fi

# Load local .env if present
if [ -f ./.env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-3000}"
CONTROLLER_ACCESS_KEY="${CONTROLLER_ACCESS_KEY:-}"

if [ -z "$CONTROLLER_ACCESS_KEY" ]; then
  echo "CONTROLLER_ACCESS_KEY is empty. Define it in .env or environment." >&2
  exit 1
fi

MIME_TYPE="${2:-}"
if [ -z "$MIME_TYPE" ]; then
  case "$AUDIO_FILE" in
    *.webm) MIME_TYPE="audio/webm" ;;
    *.wav) MIME_TYPE="audio/wav" ;;
    *.mp3) MIME_TYPE="audio/mpeg" ;;
    *.m4a) MIME_TYPE="audio/mp4" ;;
    *) MIME_TYPE="audio/webm" ;;
  esac
fi

URL="http://${HOST}:${PORT}/voice/spell?k=${CONTROLLER_ACCESS_KEY}"

echo "POST $URL"
echo "Audio: $AUDIO_FILE"
echo "Mime:  $MIME_TYPE"

echo
curl --silent --show-error --fail-with-body \
  -X POST "$URL" \
  -H "Content-Type: ${MIME_TYPE}" \
  --data-binary "@${AUDIO_FILE}"
echo

