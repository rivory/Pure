# Ollama Integration

This document explains how the Ollama integration works in pureSQL and how to maintain it.

## Overview

pureSQL integrates [Ollama](https://ollama.ai/) to provide natural language to SQL translation functionality. The integration allows users to use this feature without having to install and run Ollama separately.

## How It Works

1. **Embedded Ollama**: When pureSQL starts, it checks if Ollama is already running on the default port (11434). If not, it extracts and starts its own embedded version of Ollama.

2. **Binary Management**:
   - The application downloads the appropriate Ollama binary for the user's operating system if it doesn't already exist in the user's home directory.
   - The binary is stored in `~/.pureSQL/` (or equivalent on Windows).
   - Models are stored in `~/.pureSQL/models/` by default.
   - A progress indicator shows the download status of the Ollama binary in the UI.

3. **Automatic Model Download**: The application will automatically download the required LLM model (llama3.2:latest) if it's not already available.

4. **Graceful Shutdown**: When the application closes, it properly shuts down the embedded Ollama process.

## Installation Status Monitoring

The application provides real-time feedback on the Ollama installation process:

1. **Status Indicators**:
   - In the query interface, a badge indicates the current state of Ollama (installing, downloading, ready, error).
   - When downloading the binary, a progress bar shows the download progress.
   - File size information is displayed during download.

2. **Status States**:
   - `idle`: Ollama is not yet initialized
   - `checking`: Checking if Ollama binary exists
   - `downloading`: Downloading the Ollama binary with progress indication
   - `extracting`: Finalizing the installation
   - `starting`: Starting the Ollama service
   - `running`: Ollama is operational
   - `error`: An error occurred

3. **Error Handling**:
   - If errors occur during installation, they are displayed in the UI.
   - Detailed error information is logged to help troubleshoot issues.

## Maintenance

### Updating Ollama Versions

To update the Ollama version used by pureSQL:

1. Modify the download URLs in `backend/ollama.go` to point to the desired version.
2. Consider adding a version check and upgrade mechanism if you want to support in-place updates.

### Embedded Binary Alternative

If you prefer to embed the Ollama binaries directly in the application instead of downloading them:

1. Download the Ollama binaries for all supported platforms from [Ollama's GitHub releases](https://github.com/ollama/ollama/releases).
2. Place them in a directory structure like:

   ```
   embedded/
     ollama/
       darwin-amd64/ollama
       darwin-arm64/ollama
       linux-amd64/ollama
       linux-arm64/ollama
       windows-amd64/ollama.exe
   ```

3. Use Go's `go:embed` feature to embed these binaries into the application.
4. Modify `extractOllamaBinary()` to extract the appropriate binary from the embedded resources.

## Troubleshooting

Common issues:

1. **Missing Execute Permissions**: Ensure the extracted Ollama binary has execute permissions.
2. **Port Conflicts**: If port 11434 is already in use by another application, Ollama won't start.
3. **Model Download Failures**: Ensure the user has internet access for the initial model download.
4. **Space Requirements**: The LLM models can be large (several GB). Ensure adequate disk space.
5. **Download Issues**: If binary download fails, check the error message displayed in the UI.

## Security Considerations

1. **Binary Integrity**: Consider implementing checksum validation for downloaded Ollama binaries.
2. **User Permissions**: Ensure the application has appropriate permissions to write to the user's home directory.
3. **API Security**: The Ollama API doesn't have authentication by default, but since it's bound to localhost, the risk is minimal.

## Future Enhancements

1. **Encrypted Password Storage**: Implement encryption for database passwords stored in connection.json.
2. **Progress Indicators**: Add visual feedback for model downloads.
3. **Offline Mode**: Bundle a smaller model for offline use when internet access is unavailable.
4. **Custom Model Selection**: Allow users to choose between different LLM models based on their requirements.
