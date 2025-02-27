#!/bin/bash

source ~/.zshrc

nvm use 20 

# Check if Ollama is already running
echo "Checking if Ollama is already running..."
if curl -s http://localhost:11434/api/health >/dev/null; then
  echo "✅ Ollama is already running on port 11434"
else
  echo "❌ Ollama is not running on port 11434"
  
  # Ask if the user wants to start Ollama manually
  echo "Do you want to start Ollama manually before continuing? (y/n)"
  read -r start_ollama
  if [[ "$start_ollama" == "y" ]]; then
    echo "Please start Ollama in a separate terminal window, then press Enter to continue"
    read -r
  fi
fi

# Stop any running Wails processes
pkill -f wails

# Generate updated Wails bindings without starting the app
wails generate module

# Start the app in development mode with debug logging
echo "Starting Wails with debug logging..."
OLLAMA_DEBUG=1 wails dev 