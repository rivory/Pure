#!/bin/bash

set -e  # Exit on any error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== Applying patches to fix Ollama detection ==="

# Backup original file
if [ ! -f "$PROJECT_ROOT/backend/ollama.go.orig" ]; then
  echo "Creating backup of original ollama.go file..."
  cp "$PROJECT_ROOT/backend/ollama.go" "$PROJECT_ROOT/backend/ollama.go.orig"
fi

# Apply the patch
echo "Applying patch to ollama.go..."
patch -N "$PROJECT_ROOT/backend/ollama.go" < "$SCRIPT_DIR/fix_ollama_detection.patch" || true

echo "=== Patch applied successfully ==="
echo "You can now rebuild the application with ./rebuild.sh" 