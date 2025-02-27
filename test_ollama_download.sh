#!/bin/bash

echo "=== Test de téléchargement d'Ollama pour macOS ==="

# Créer un répertoire temporaire
TMP_DIR=$(mktemp -d)
echo "Dossier temporaire: $TMP_DIR"

# Nettoyer à la sortie
cleanup() {
  echo "Nettoyage du dossier temporaire..."
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

# URL de téléchargement
DOWNLOAD_URL="https://ollama.com/download/Ollama-darwin.zip"
ZIP_FILE="$TMP_DIR/ollama.zip"

echo "Téléchargement depuis $DOWNLOAD_URL"
curl -L -o "$ZIP_FILE" "$DOWNLOAD_URL"

if [ $? -ne 0 ]; then
  echo "ERREUR: Échec du téléchargement"
  exit 1
fi

# Vérifier la taille du fichier
SIZE=$(stat -f%z "$ZIP_FILE")
echo "Taille du fichier téléchargé: $SIZE octets"

if [ $SIZE -lt 1000 ]; then
  echo "ERREUR: Le fichier semble trop petit, vérification du contenu:"
  cat "$ZIP_FILE"
  exit 1
fi

# Extraire l'archive
echo "Extraction de l'archive..."
unzip -o "$ZIP_FILE" -d "$TMP_DIR"

if [ $? -ne 0 ]; then
  echo "ERREUR: Échec de l'extraction"
  exit 1
fi

# Lister le contenu extrait
echo "Contenu extrait:"
find "$TMP_DIR" -type f | sort

# Rechercher l'application et le binaire
OLLAMA_APP=$(find "$TMP_DIR" -name "Ollama.app" -type d)
if [ -n "$OLLAMA_APP" ]; then
  echo "Application Ollama trouvée: $OLLAMA_APP"
  
  # Chercher le binaire dans l'application
  OLLAMA_BIN=$(find "$OLLAMA_APP" -name "ollama" -type f)
  if [ -n "$OLLAMA_BIN" ]; then
    echo "Binaire Ollama trouvé dans l'application: $OLLAMA_BIN"
    echo "Taille du binaire: $(stat -f%z "$OLLAMA_BIN") octets"
    
    # Vérifier que c'est un exécutable
    file "$OLLAMA_BIN"
    
    echo "=== Téléchargement et extraction réussis ==="
    exit 0
  else
    echo "ERREUR: Binaire Ollama non trouvé dans l'application"
    find "$OLLAMA_APP" -type f
  fi
else
  echo "ERREUR: Application Ollama.app non trouvée"
  # Chercher directement le binaire
  OLLAMA_BIN=$(find "$TMP_DIR" -name "ollama" -type f)
  if [ -n "$OLLAMA_BIN" ]; then
    echo "Binaire Ollama trouvé: $OLLAMA_BIN"
    echo "Taille du binaire: $(stat -f%z "$OLLAMA_BIN") octets"
    
    # Vérifier que c'est un exécutable
    file "$OLLAMA_BIN"
    
    echo "=== Téléchargement et extraction réussis ==="
    exit 0
  else
    echo "ERREUR: Binaire Ollama non trouvé"
  fi
fi

echo "ERREUR: Échec du test"
exit 1 