# Patches for PureSQL

This directory contains patches to fix issues in the PureSQL application.

## Available Patches

### fix_ollama_detection.patch

This patch fixes an issue with Ollama detection in the application. The problem is that even if Ollama is already running on your system (on the default port 11434), the application still tries to download and extract its own copy of Ollama binary.

The patch makes the following changes:
1. Adds a `preferExternal` flag to the OllamaService (set to true by default)
2. Enhances the `extractOllamaBinary` function to check first if an external Ollama is running
3. Improves the `Start` function to explicitly mark an external Ollama as running

#### How to Apply

Run the following command from the project root:

```bash
./patches/apply_patches.sh
```

Then rebuild the application:

```bash
./rebuild.sh
```

## Reverting Patches

If you need to revert the patches, you can restore the original files from the `.orig` backups:

```bash
cp backend/ollama.go.orig backend/ollama.go
``` 