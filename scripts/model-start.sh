#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
RUNTIME="$PROJECT_DIR/.local/ollama/ollama"
if [ ! -x "$RUNTIME" ]; then
  echo "Ollama is not installed at $RUNTIME. See docs/local-model.md." >&2
  exit 1
fi
mkdir -p "$PROJECT_DIR/.local/models"
echo "Starting local Ollama on 127.0.0.1:11434. Log: $PROJECT_DIR/.local/ollama-server.log"
export OLLAMA_HOST=127.0.0.1:11434
export OLLAMA_MODELS="$PROJECT_DIR/.local/models"
export OLLAMA_NO_CLOUD=1
export OLLAMA_NUM_PARALLEL=1
export OLLAMA_MAX_LOADED_MODELS=1
export OLLAMA_MAX_QUEUE=4
export OLLAMA_CONTEXT_LENGTH=4096
exec "$RUNTIME" serve >> "$PROJECT_DIR/.local/ollama-server.log" 2>&1
