#!/usr/bin/env bash

set -u

echo "[voxtral:doctor] 1/3 - GPU host (nvidia-smi)"
if ! nvidia-smi >/dev/null 2>&1; then
  echo "[ERROR] nvidia-smi indisponible. Installe/corrige le driver NVIDIA sur l'hote."
  exit 1
fi
nvidia-smi | sed -n '1,8p'

DRIVER_VERSION="$(nvidia-smi --query-gpu=driver_version --format=csv,noheader | head -n1 | cut -d. -f1)"
if [[ -n "${DRIVER_VERSION:-}" ]] && [[ "$DRIVER_VERSION" -lt 550 ]]; then
  echo "[WARN] Driver NVIDIA detecte (${DRIVER_VERSION}xx): potentiellement trop ancien pour vllm/vllm-openai:latest."
  echo "[HINT] Si les logs vLLM montrent 'Error 804', mets a jour le driver (550+) ou epingle une image vLLM plus ancienne."
fi

echo
echo "[voxtral:doctor] 2/3 - Runtime Docker"
RUNTIME_INFO="$(docker info --format '{{json .Runtimes}} {{.DefaultRuntime}}' 2>/dev/null || true)"
if [[ -z "$RUNTIME_INFO" ]]; then
  echo "[ERROR] Impossible de lire docker info. Docker est-il demarre ?"
  exit 1
fi

DEFAULT_RUNTIME="$(docker info --format '{{.DefaultRuntime}}' 2>/dev/null || true)"
echo "Default runtime: ${DEFAULT_RUNTIME:-unknown}"

if [[ "$RUNTIME_INFO" != *"nvidia"* ]]; then
  echo "[ERROR] Runtime NVIDIA absent dans Docker. Installe nvidia-container-toolkit."
  exit 1
fi

if [[ "$RUNTIME_INFO" == *"/snap/docker/"* ]]; then
  DOCKER_NVIDIA_PATH="/snap/docker/.../nvidia-container-runtime"
  echo "[WARN] Docker Snap detecte: compatibilite GPU NVIDIA souvent instable avec vLLM."
else
  DOCKER_NVIDIA_PATH="nvidia-container-runtime"
fi

echo
echo "[voxtral:doctor] 3/3 - Conteneur GPU test"
set +e
TEST_OUTPUT="$(docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi 2>&1)"
TEST_EXIT=$?
set -e

if [[ $TEST_EXIT -ne 0 ]]; then
  echo "$TEST_OUTPUT"
  echo
  if [[ "$DOCKER_NVIDIA_PATH" == *"/snap/docker/"* ]] && [[ "$TEST_OUTPUT" == *"libnvidia-ml.so.1"* ]]; then
    echo "[HINT] Cause probable: Docker installe via Snap ne mappe pas correctement les libs NVIDIA."
    echo "[HINT] Solution recommandee: installer Docker CE (apt) + nvidia-container-toolkit, puis redemarrer Docker."
  else
    echo "[ERROR] Le test GPU Docker echoue. Corrige la stack nvidia-container-toolkit."
  fi
  exit 1
fi

echo "$TEST_OUTPUT" | sed -n '1,8p'
echo "[OK] GPU disponible dans Docker."

echo
echo "[voxtral:doctor] Tip"
echo "Si vLLM boucle avec 'cudaGetDeviceCount ... Error 804', c'est un mismatch driver/runtime CUDA."
echo "- Option A (recommandee): mettre a jour le driver NVIDIA host."
echo "- Option B: epingler une image vLLM plus ancienne via VLLM_IMAGE."

