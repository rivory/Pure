package backend

import (
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

// OllamaStatus représente l'état actuel d'Ollama
type OllamaStatus struct {
	State          string  `json:"state"` // "idle", "downloading", "extracting", "starting", "running", "error"
	DownloadedSize int64   `json:"downloadedSize"`
	TotalSize      int64   `json:"totalSize"`
	Progress       float64 `json:"progress"` // 0-100
	Message        string  `json:"message"`
	Error          string  `json:"error,omitempty"`
}

// OllamaService manages the embedded Ollama instance
type OllamaService struct {
	cmd            *exec.Cmd
	ollamaPath     string
	modelName      string
	port           int
	preferExternal bool
	apiURL         string
	isRunning      bool
	modelsDir      string
	defaultModels  []string
	startupTimeout time.Duration
	status         OllamaStatus
	statusMutex    sync.RWMutex
}

// NewOllamaService creates a new Ollama service manager
func NewOllamaService(modelsDir string) *OllamaService {
	port := 11434
	return &OllamaService{
		port:           port,
		preferExternal: true,  // Prefer using external Ollama if available
		apiURL:         fmt.Sprintf("http://localhost:%d", port),
		modelName:      "llama3.2:latest",
		modelsDir:      modelsDir,
		defaultModels:  []string{"llama3.2:latest"},
		startupTimeout: 60 * time.Second, // 60 seconds timeout for Ollama startup
		status: OllamaStatus{
			State:    "idle",
			Progress: 0,
			Message:  "En attente d'initialisation",
		},
	}
}

// GetStatus retourne l'état actuel d'Ollama
func (s *OllamaService) GetStatus() OllamaStatus {
	s.statusMutex.RLock()
	defer s.statusMutex.RUnlock()
	return s.status
}

// updateStatus met à jour l'état d'Ollama
func (s *OllamaService) updateStatus(state string, message string, progress float64) {
	s.statusMutex.Lock()
	defer s.statusMutex.Unlock()
	
	s.status.State = state
	s.status.Message = message
	s.status.Progress = progress
	
	if state == "running" {
		s.status.Progress = 100
	}
}

// setError met à jour l'état d'erreur
func (s *OllamaService) setError(message string, err error) {
	s.statusMutex.Lock()
	defer s.statusMutex.Unlock()
	
	s.status.State = "error"
	s.status.Message = message
	if err != nil {
		s.status.Error = err.Error()
	} else {
		s.status.Error = message
	}
}

// extractOllamaBinary extracts the embedded Ollama binary to a location
func (s *OllamaService) extractOllamaBinary() error {
	// Check if there's already an external Ollama running and we prefer using it
	if s.preferExternal && s.IsRunning() {
		s.isRunning = true
		s.updateStatus("running", "Ollama externe détecté et utilisé", 100)
		return nil
	}

	s.updateStatus("checking", "Vérification du binaire Ollama", 0)
	
	// Determine user's home directory for storing the binary
	homeDir, err := os.UserHomeDir()
	if err != nil {
		s.setError("Impossible de déterminer le répertoire utilisateur", err)
		return fmt.Errorf("failed to get user home directory: %v", err)
	}

	// Create pureSQL directory in user's home if it doesn't exist
	appDir := filepath.Join(homeDir, ".pureSQL")
	if err := os.MkdirAll(appDir, 0755); err != nil {
		s.setError("Impossible de créer le répertoire d'installation", err)
		return fmt.Errorf("failed to create directory: %v", err)
	}

	// Path to extract Ollama binary
	s.ollamaPath = filepath.Join(appDir, "ollama")
	if runtime.GOOS == "windows" {
		s.ollamaPath = filepath.Join(appDir, "ollama.exe")
	}

	// Check if binary already exists
	if _, err := os.Stat(s.ollamaPath); err == nil {
		s.updateStatus("found", "Binaire Ollama trouvé", 50)
		return nil
	}

	s.updateStatus("downloading", "Téléchargement du binaire Ollama", 10)

	// Déterminer la plateforme et l'architecture pour télécharger le bon binaire
	var downloadURL string
	isMacOS := false
	switch runtime.GOOS {
	case "darwin":
		isMacOS = true
		// Sur macOS, nous devons télécharger l'application sous forme d'archive zip
		downloadURL = "https://ollama.com/download/Ollama-darwin.zip"
		fmt.Printf("Utilisation de l'URL macOS: %s\n", downloadURL)
	case "linux":
		if runtime.GOARCH == "arm64" {
			downloadURL = "https://ollama.com/download/ollama-linux-arm64"
		} else {
			downloadURL = "https://ollama.com/download/ollama-linux-amd64"
		}
	case "windows":
		downloadURL = "https://ollama.com/download/ollama-windows-amd64.exe"
	default:
		s.setError("Système d'exploitation non supporté", fmt.Errorf("système d'exploitation non pris en charge: %s", runtime.GOOS))
		return fmt.Errorf("unsupported OS: %s", runtime.GOOS)
	}

	// Download the binary
	fmt.Printf("Downloading Ollama from %s\n", downloadURL)
	client := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			// Afficher les redirections pour le débogage
			fmt.Printf("Redirection: %s -> %s\n", via[len(via)-1].URL.String(), req.URL.String())
			return nil
		},
	}
	
	req, err := http.NewRequest("GET", downloadURL, nil)
	if err != nil {
		s.setError("Erreur lors de la création de la requête HTTP", err)
		return fmt.Errorf("failed to create HTTP request: %v", err)
	}
	
	// Ajouter des en-têtes pour simuler un navigateur
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36")
	req.Header.Set("Accept", "application/octet-stream")
	
	resp, err := client.Do(req)
	if err != nil {
		s.setError("Erreur lors du téléchargement d'Ollama", err)
		return fmt.Errorf("failed to download Ollama: %v", err)
	}
	defer resp.Body.Close()

	// Pour le débogage
	fmt.Printf("Code de statut: %d\n", resp.StatusCode)
	fmt.Printf("En-têtes: %v\n", resp.Header)

	if resp.StatusCode != 200 {
		errMsg := fmt.Sprintf("failed to download Ollama, status code: %d", resp.StatusCode)
		s.setError(errMsg, nil)
		return fmt.Errorf(errMsg)
	}

	// Obtenir la taille totale pour le suivi de progression
	totalSize := resp.ContentLength
	s.statusMutex.Lock()
	s.status.TotalSize = totalSize
	s.statusMutex.Unlock()

	// Pour macOS, nous devons télécharger le .zip puis l'extraire
	if isMacOS {
		// Créer le dossier temporaire
		tmpDir := filepath.Join(filepath.Dir(s.ollamaPath), "tmp")
		if err := os.MkdirAll(tmpDir, 0755); err != nil {
			s.setError("Erreur lors de la création du dossier temporaire", err)
			return fmt.Errorf("failed to create temp directory: %v", err)
		}
		defer os.RemoveAll(tmpDir) // Nettoyer après utilisation

		// Fichier .zip temporaire
		zipFile := filepath.Join(tmpDir, "ollama.zip")
		out, err := os.Create(zipFile)
		if err != nil {
			s.setError("Erreur lors de la création du fichier temporaire", err)
			return fmt.Errorf("failed to create temporary file: %v", err)
		}

		// Télécharger le fichier .zip avec progress
		var downloaded int64
		updateProgress := func(n int64) {
			downloaded += n
			progress := float64(downloaded) / float64(totalSize) * 70 // 70% max pour le téléchargement
			
			s.statusMutex.Lock()
			s.status.State = "downloading"
			s.status.DownloadedSize = downloaded
			s.status.Progress = progress
			s.status.Message = fmt.Sprintf("Téléchargement: %.1f%%", progress)
			s.statusMutex.Unlock()
		}

		// Copier les données
		buf := make([]byte, 32*1024) // Buffer de 32KB
		for {
			n, err := resp.Body.Read(buf)
			if n > 0 {
				_, writeErr := out.Write(buf[:n])
				if writeErr != nil {
					out.Close()
					s.setError("Erreur d'écriture du fichier", writeErr)
					return fmt.Errorf("error writing to file: %v", writeErr)
				}
				updateProgress(int64(n))
			}
			
			if err != nil {
				if err == io.EOF {
					break
				}
				out.Close()
				s.setError("Erreur lors du téléchargement", err)
				return fmt.Errorf("error downloading file: %v", err)
			}
		}
		out.Close()

		// Extraire le fichier .zip
		s.updateStatus("extracting", "Extraction de l'archive Ollama", 75)
		fmt.Printf("Extraction du fichier zip: %s\n", zipFile)
		
		// Utiliser la commande unzip (disponible sur macOS)
		cmd := exec.Command("unzip", "-o", zipFile, "-d", tmpDir)
		output, err := cmd.CombinedOutput()
		if err != nil {
			fmt.Printf("Erreur lors de l'extraction avec unzip: %v\nSortie: %s\n", err, string(output))
			s.setError("Erreur lors de l'extraction de l'archive", err)
			return fmt.Errorf("failed to extract archive: %v - %s", err, string(output))
		}
		
		// Lister les fichiers après extraction
		files, _ := os.ReadDir(tmpDir)
		fmt.Printf("Fichiers dans %s après extraction: %v\n", tmpDir, filesNames(files))
		
		// Chercher l'application Ollama.app
		appPath := ""
		filepath.Walk(tmpDir, func(path string, info os.FileInfo, err error) error {
			if err == nil && info.IsDir() && strings.HasSuffix(path, "Ollama.app") {
				appPath = path
				fmt.Printf("Application Ollama trouvée: %s\n", appPath)
			}
			return nil
		})
		
		if appPath == "" {
			// Cherchons le binaire ollama dans l'archive
			filepath.Walk(tmpDir, func(path string, info os.FileInfo, err error) error {
				if err == nil && !info.IsDir() && (filepath.Base(path) == "ollama") {
					appPath = path
					fmt.Printf("Binaire Ollama trouvé: %s\n", appPath)
				}
				return nil
			})
		}
		
		if appPath == "" {
			// Si on ne trouve pas le binaire, regardons tous les fichiers
			fmt.Println("Contenu détaillé de l'archive:")
			filepath.Walk(tmpDir, func(path string, info os.FileInfo, err error) error {
				if err == nil {
					fmt.Printf("- %s (%d octets)\n", path, info.Size())
				}
				return nil
			})
			
			s.setError("Application ou binaire Ollama non trouvé dans l'archive extraite", nil)
			return fmt.Errorf("ollama application or binary not found in extracted archive")
		}
		
		// Si nous avons trouvé une application, nous devons extraire le binaire ollama
		if strings.HasSuffix(appPath, "Ollama.app") {
			binPath := filepath.Join(appPath, "Contents", "MacOS", "ollama")
			if _, err := os.Stat(binPath); err != nil {
				fmt.Printf("Recherche du binaire dans l'application: %s\n", binPath)
				
				// Listons le contenu de l'application
				filepath.Walk(appPath, func(path string, info os.FileInfo, err error) error {
					if err == nil {
						fmt.Printf("  - %s (%d octets)\n", path, info.Size())
					}
					return nil
				})
				
				s.setError("Binaire ollama non trouvé dans l'application", nil)
				return fmt.Errorf("ollama binary not found in the application")
			}
			
			fmt.Printf("Binaire trouvé: %s\n", binPath)
			appPath = binPath
		}
		
		// Déplacer le binaire extrait vers l'emplacement final
		s.updateStatus("installing", "Installation du binaire Ollama", 90)
		fmt.Printf("Déplacement du binaire %s vers %s\n", appPath, s.ollamaPath)
		
		if err := os.Rename(appPath, s.ollamaPath); err != nil {
			// Si le renommage échoue, tenter une copie
			fmt.Printf("Renommage échoué, tentative de copie: %v\n", err)
			
			// Copier le fichier
			source, err := os.Open(appPath)
			if err != nil {
				s.setError("Erreur lors de l'ouverture du binaire source", err)
				return fmt.Errorf("failed to open source binary: %v", err)
			}
			defer source.Close()
			
			destination, err := os.Create(s.ollamaPath)
			if err != nil {
				s.setError("Erreur lors de la création du fichier de destination", err)
				return fmt.Errorf("failed to create destination file: %v", err)
			}
			defer destination.Close()
			
			_, err = io.Copy(destination, source)
			if err != nil {
				s.setError("Erreur lors de la copie du binaire", err)
				return fmt.Errorf("failed to copy binary: %v", err)
			}
			
			destination.Close()
		}

		// Rendre le fichier exécutable
		if err := os.Chmod(s.ollamaPath, 0755); err != nil {
			s.setError("Erreur lors de la définition des permissions", err)
			return fmt.Errorf("failed to make binary executable: %v", err)
		}

		// Vérifier que le binaire est bien en place
		_, err = os.Stat(s.ollamaPath)
		if err != nil {
			s.setError("Le binaire final n'est pas accessible", err)
			return fmt.Errorf("final binary is not accessible: %v", err)
		}
		
		fmt.Printf("Installation d'Ollama terminée avec succès à %s\n", s.ollamaPath)
		s.updateStatus("installed", "Installation d'Ollama terminée", 100)
		return nil
	}

	// Pour les autres OS (non-macOS), continuer avec le téléchargement direct du binaire
	// Créer le fichier temporaire
	tmpFile := s.ollamaPath + ".download"
	out, err := os.Create(tmpFile)
	if err != nil {
		s.setError("Erreur lors de la création du fichier temporaire", err)
		return fmt.Errorf("failed to create temporary file: %v", err)
	}
	defer out.Close()

	// Utiliser un lecteur avec compteur pour suivre la progression
	var downloaded int64

	// Créer une fonction pour mettre à jour la progression
	updateProgress := func(n int64) {
		downloaded += n
		progress := float64(downloaded) / float64(totalSize) * 90 // 90% maximum pour laisser place à l'extraction
		
		s.statusMutex.Lock()
		s.status.State = "downloading"
		s.status.DownloadedSize = downloaded
		s.status.Progress = progress
		s.status.Message = fmt.Sprintf("Téléchargement: %.1f%%", progress)
		s.statusMutex.Unlock()
	}

	// Copier les données du téléchargement dans le fichier avec mise à jour de la progression
	buf := make([]byte, 32*1024) // Buffer de 32KB
	for {
		n, err := resp.Body.Read(buf)
		if n > 0 {
			_, writeErr := out.Write(buf[:n])
			if writeErr != nil {
				out.Close()
				s.setError("Erreur d'écriture du fichier", writeErr)
				return fmt.Errorf("error writing to file: %v", writeErr)
			}
			updateProgress(int64(n))
		}
		
		if err != nil {
			if err == io.EOF {
				break
			}
			out.Close()
			s.setError("Erreur lors du téléchargement", err)
			return fmt.Errorf("error downloading file: %v", err)
		}
	}

	out.Close()

	s.updateStatus("extracting", "Finalisation de l'installation d'Ollama", 95)

	// Renommer le fichier temporaire vers le fichier final
	if err := os.Rename(tmpFile, s.ollamaPath); err != nil {
		s.setError("Erreur lors de la finalisation de l'installation", err)
		return fmt.Errorf("failed to rename downloaded file: %v", err)
	}

	// Rendre le fichier exécutable
	if runtime.GOOS != "windows" {
		if err := os.Chmod(s.ollamaPath, 0755); err != nil {
			s.setError("Erreur lors de la définition des permissions", err)
			return fmt.Errorf("failed to make binary executable: %v", err)
		}
	}

	s.updateStatus("installed", "Installation d'Ollama terminée", 100)

	return nil
}

// Start initializes and starts the embedded Ollama service
func (s *OllamaService) Start() error {
	// Si Ollama est déjà en cours d'exécution, ne rien faire
	externalRunning := s.IsRunning()
	if externalRunning {
		s.isRunning = true
		s.updateStatus("running", "Ollama externe détecté et utilisé", 100)
		return nil
	}
	
	s.updateStatus("starting", "Démarrage du service Ollama", 95)
	
	// Extraire le binaire Ollama si nécessaire
	if err := s.extractOllamaBinary(); err != nil {
		return err
	}

	// Check if Ollama is already running externally
	if s.IsRunning() {
		s.isRunning = true
		fmt.Println("External Ollama instance detected, using it instead of launching embedded version")
		return nil
	}

	// Set up environment variables for Ollama
	env := os.Environ()
	if s.modelsDir != "" {
		// If a custom models directory is specified, use it
		env = append(env, fmt.Sprintf("OLLAMA_MODELS=%s", s.modelsDir))
	}

	// Start Ollama in server mode
	s.cmd = exec.Command(s.ollamaPath, "serve")
	s.cmd.Env = env
	
	// Start the process
	if err := s.cmd.Start(); err != nil {
		s.setError("Erreur lors du démarrage d'Ollama", err)
		return fmt.Errorf("failed to start Ollama: %v", err)
	}

	// Attendre que le service soit prêt
	ready := make(chan bool, 1)
	failed := make(chan error, 1)
	
	go func() {
		// Vérifier périodiquement si Ollama a démarré
		timeout := time.After(s.startupTimeout)
		ticker := time.NewTicker(500 * time.Millisecond)
		defer ticker.Stop()
		
		for {
			select {
			case <-ticker.C:
				// Faire une requête HTTP pour voir si Ollama répond
				resp, err := http.Get(fmt.Sprintf("%s/api/health", s.apiURL))
				if err == nil {
					resp.Body.Close()
					if resp.StatusCode == http.StatusOK {
						s.isRunning = true
						ready <- true
						return
					}
				}
				
				// Vérifier également si le processus a planté ou s'est terminé
				if s.cmd.ProcessState != nil && s.cmd.ProcessState.Exited() {
					failed <- fmt.Errorf("Ollama process exited prematurely")
					return
				}
			case <-timeout:
				failed <- fmt.Errorf("timeout waiting for Ollama to start")
				return
			}
		}
	}()
	
	// Attendre que le service soit prêt ou en échec
	select {
	case <-ready:
		s.updateStatus("running", "Ollama est opérationnel", 100)
		
		// Charger les modèles par défaut en arrière-plan
		go s.ensureDefaultModelIsAvailable()
		
		return nil
	case err := <-failed:
		s.setError("Échec du démarrage d'Ollama", err)
		
		// Tentative de nettoyage du processus
		if s.cmd != nil && s.cmd.Process != nil {
			s.cmd.Process.Kill()
		}
		
		return err
	}
}

// Stop terminates the Ollama service
func (s *OllamaService) Stop() error {
	if s.cmd == nil || s.cmd.Process == nil {
		// Ollama was never started by us or is already stopped
		return nil
	}

	s.updateStatus("stopping", "Arrêt du service Ollama", 50)
	
	// Gracefully terminate the process
	var err error
	if runtime.GOOS == "windows" {
		err = s.cmd.Process.Kill() // Sous Windows, Kill() est la seule option
	} else {
		err = s.cmd.Process.Signal(os.Interrupt) // SIGINT sur Unix
	}
	
	if err != nil {
		s.setError("Erreur lors de l'arrêt d'Ollama", err)
		return fmt.Errorf("failed to send signal to Ollama: %v", err)
	}

	// Wait for the process to exit
	done := make(chan error, 1)
	go func() {
		done <- s.cmd.Wait()
	}()
	
	// Attendre max 10 secondes
	select {
	case <-done:
		s.isRunning = false
		s.updateStatus("idle", "Ollama arrêté", 0)
		return nil
	case <-time.After(10 * time.Second):
		// Forcer l'arrêt si nécessaire
		s.cmd.Process.Kill()
		s.isRunning = false
		s.updateStatus("idle", "Ollama a été forcé à s'arrêter", 0)
		return fmt.Errorf("Ollama did not terminate gracefully")
	}
}

// IsRunning checks if Ollama is running
func (s *OllamaService) IsRunning() bool {
	// Si nous savons déjà qu'il est en cours d'exécution
	if s.isRunning {
		return true
	}
	
	// Vérifier si Ollama répond sur son API
	resp, err := http.Get(fmt.Sprintf("%s/api/health", s.apiURL))
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	
	// Marquer comme en cours d'exécution si la requête a réussi
	if resp.StatusCode == http.StatusOK {
		s.isRunning = true
		s.updateStatus("running", "Ollama est opérationnel", 100)
		return true
	}
	
	return false
}

// ensureDefaultModelIsAvailable makes sure the default model is downloaded
func (s *OllamaService) ensureDefaultModelIsAvailable() error {
	for _, model := range s.defaultModels {
		if !s.isModelAvailable(model) {
			s.updateStatus("downloading_model", fmt.Sprintf("Téléchargement du modèle %s", model), 0)
			if err := s.pullModel(model); err != nil {
				s.setError(fmt.Sprintf("Erreur lors du téléchargement du modèle %s", model), err)
				return err
			}
		}
	}
	return nil
}

// isModelAvailable checks if a model is already downloaded
func (s *OllamaService) isModelAvailable(model string) bool {
	client := http.Client{
		Timeout: 5 * time.Second,
	}
	
	// Prepare request to list models
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/api/tags", s.apiURL), nil)
	if err != nil {
		return false
	}
	
	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != 200 {
		return false
	}
	
	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false
	}
	
	// Simple check if model name appears in the response
	// In a real implementation, you'd properly parse the JSON
	return strings.Contains(string(body), fmt.Sprintf(`"name":"%s"`, model))
}

// pullModel downloads a model from Ollama
func (s *OllamaService) pullModel(model string) error {
	client := http.Client{
		Timeout: 0, // No timeout for downloads
	}
	
	// Prepare request to pull model
	requestBody := strings.NewReader(fmt.Sprintf(`{"name": "%s"}`, model))
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/api/pull", s.apiURL), requestBody)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != 200 {
		return fmt.Errorf("failed to pull model %s: HTTP %d", model, resp.StatusCode)
	}
	
	// For long downloads, we don't wait for completion
	// In a real implementation, you might want to track progress
	
	return nil
}

// Helper pour afficher les noms de fichiers
func filesNames(files []os.DirEntry) []string {
	names := make([]string, len(files))
	for i, file := range files {
		names[i] = file.Name()
	}
	return names
}

func (s *OllamaService) downloadOllama() (err error) {
	s.updateStatus("downloading", "Téléchargement d'Ollama", 0)

	// Déterminer l'URL de téléchargement en fonction du système d'exploitation et de l'architecture
	var downloadURL string
	arch := runtime.GOARCH
	isMacOS := runtime.GOOS == "darwin"

	if isMacOS {
		// Pour macOS, on télécharge le .zip qui contient l'application
		downloadURL = "https://ollama.com/download/Ollama-darwin.zip"
		fmt.Printf("URL de téléchargement pour macOS: %s\n", downloadURL)
	} else if runtime.GOOS == "linux" {
		if arch == "arm64" {
			downloadURL = "https://ollama.com/download/ollama-linux-arm64"
		} else {
			downloadURL = "https://ollama.com/download/ollama-linux-amd64"
		}
	} else if runtime.GOOS == "windows" {
		downloadURL = "https://ollama.com/download/ollama-windows-amd64.exe"
		// Ajouter l'extension .exe sur Windows
		if !strings.HasSuffix(s.ollamaPath, ".exe") {
			s.ollamaPath += ".exe"
		}
	} else {
		s.setError("Système d'exploitation non pris en charge", fmt.Errorf("système d'exploitation non pris en charge: %s", runtime.GOOS))
		return
	}

	// Créer un dossier temporaire pour le téléchargement
	tmpDir := filepath.Join(filepath.Dir(s.ollamaPath), "tmp")
	os.MkdirAll(tmpDir, 0755)
	defer os.RemoveAll(tmpDir) // Nettoyage du dossier temporaire à la fin

	var tempFile string
	var resp *http.Response

	if isMacOS {
		// Pour macOS, télécharger le zip
		zipFile := filepath.Join(tmpDir, "ollama.zip")
		tempFile = zipFile
		
		// Création de la requête avec un User-Agent
		req, err := http.NewRequest("GET", downloadURL, nil)
		if err != nil {
			s.setError("Erreur lors de la création de la requête", fmt.Errorf("erreur lors de la création de la requête: %v", err))
			return err
		}
		
		// Simuler un navigateur pour les téléchargements
		req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36")
		req.Header.Set("Accept", "application/octet-stream")
		
		// Exécution de la requête
		client := &http.Client{}
		resp, err = client.Do(req)
		if err != nil {
			s.setError("Erreur lors du téléchargement d'Ollama", fmt.Errorf("erreur lors du téléchargement d'Ollama: %v", err))
			return err
		}
		defer resp.Body.Close()
		
		if resp.StatusCode != http.StatusOK {
			s.setError("Erreur lors du téléchargement d'Ollama", fmt.Errorf("erreur lors du téléchargement d'Ollama, code HTTP: %d", resp.StatusCode))
			return fmt.Errorf("statut HTTP incorrect: %d", resp.StatusCode)
		}
		
		fmt.Printf("Téléchargement de %s, taille: %d octets\n", downloadURL, resp.ContentLength)
	} else {
		// Pour les autres OS, téléchargement direct du binaire
		tempFile = filepath.Join(tmpDir, "ollama")
		if runtime.GOOS == "windows" {
			tempFile += ".exe"
		}
		
		resp, err = http.Get(downloadURL)
		if err != nil {
			s.setError("Erreur lors du téléchargement d'Ollama", fmt.Errorf("erreur lors du téléchargement d'Ollama: %v", err))
			return err
		}
		defer resp.Body.Close()
		
		if resp.StatusCode != http.StatusOK {
			s.setError("Erreur lors du téléchargement d'Ollama", fmt.Errorf("erreur lors du téléchargement d'Ollama, code HTTP: %d", resp.StatusCode))
			return fmt.Errorf("statut HTTP incorrect: %d", resp.StatusCode)
		}
	}

	// Créer le fichier temporaire pour stocker le téléchargement
	out, err := os.Create(tempFile)
	if err != nil {
		s.setError("Erreur lors de la création du fichier temporaire", fmt.Errorf("erreur lors de la création du fichier temporaire: %v", err))
		return err
	}
	defer out.Close()

	// Définir une fonction pour mettre à jour la progression du téléchargement
	var totalBytes int64
	if resp.ContentLength > 0 {
		totalBytes = resp.ContentLength
	} else {
		totalBytes = 100000000 // Valeur par défaut si la taille est inconnue
	}

	buf := make([]byte, 32*1024) // Buffer de 32KB
	var written int64

	// Boucle de lecture/écriture avec mise à jour de la progression
	for {
		nr, er := resp.Body.Read(buf)
		if nr > 0 {
			nw, ew := out.Write(buf[0:nr])
			if nw > 0 {
				written += int64(nw)
				progress := float64(written) / float64(totalBytes) * 100
				s.updateStatus("downloading", fmt.Sprintf("Téléchargement d'Ollama (%.1f%%)", progress), progress)
			}
			if ew != nil {
				err = ew
				break
			}
			if nr != nw {
				err = io.ErrShortWrite
				break
			}
		}
		if er != nil {
			if er != io.EOF {
				err = er
			}
			break
		}
	}

	if err != nil {
		s.setError("Erreur lors de l'écriture du fichier téléchargé", err)
		return err
	}

	// Vérifier que le fichier a bien été téléchargé
	fileInfo, err := os.Stat(tempFile)
	if err != nil {
		s.setError("Erreur lors de la vérification du fichier téléchargé", fmt.Errorf("erreur lors de la vérification du fichier téléchargé: %v", err))
		return err
	}
	fmt.Printf("Taille du fichier téléchargé: %d octets\n", fileInfo.Size())

	// Mettre à jour le statut
	s.updateStatus("extracting", "Extraction du binaire Ollama", 70)

	if isMacOS {
		// Pour macOS, on extrait le zip
		zipFile := tempFile
		
		// Créer un dossier pour l'extraction
		extractDir := filepath.Join(tmpDir, "extract")
		os.MkdirAll(extractDir, 0755)

		// Extraire le zip avec la commande unzip
		cmd := exec.Command("unzip", zipFile, "-d", extractDir)
		output, err := cmd.CombinedOutput()
		if err != nil {
			s.setError("Erreur lors de l'extraction du zip", fmt.Errorf("erreur lors de l'extraction du zip: %v\n%s", err, output))
			return err
		}
		
		fmt.Printf("Résultat de l'extraction: %s\n", output)
		
		// Vérifier si l'application Ollama.app existe
		ollamaAppPath := filepath.Join(extractDir, "Ollama.app")
		if _, err := os.Stat(ollamaAppPath); os.IsNotExist(err) {
			s.setError("Application Ollama.app non trouvée", fmt.Errorf("l'application Ollama.app n'a pas été trouvée après extraction"))
			return err
		}
		
		// Vérifier si le binaire est présent dans l'application
		ollamaBinInApp := filepath.Join(ollamaAppPath, "Contents", "Resources", "ollama")
		if _, err := os.Stat(ollamaBinInApp); os.IsNotExist(err) {
			s.setError("Binaire Ollama non trouvé", fmt.Errorf("le binaire ollama n'a pas été trouvé dans l'application"))
			return err
		}
		
		// Copier le binaire vers son emplacement final
		fmt.Printf("Copie du binaire de %s vers %s\n", ollamaBinInApp, s.ollamaPath)
		
		// Lire le binaire source
		binData, err := ioutil.ReadFile(ollamaBinInApp)
		if err != nil {
			s.setError("Erreur lors de la lecture du binaire", fmt.Errorf("erreur lors de la lecture du binaire: %v", err))
			return err
		}
		
		// Écrire le binaire à sa destination
		err = ioutil.WriteFile(s.ollamaPath, binData, 0755)
		if err != nil {
			s.setError("Erreur lors de l'écriture du binaire", fmt.Errorf("erreur lors de l'écriture du binaire: %v", err))
			return err
		}
	} else {
		// Pour les autres OS, on déplace simplement le binaire
		err = os.Rename(tempFile, s.ollamaPath)
		if err != nil {
			// Si le renommage échoue, essayer de copier
			s.updateStatus("downloading", "Copie du binaire Ollama", 80)
			sourceFile, err := os.Open(tempFile)
			if err != nil {
				s.setError("Erreur lors de l'ouverture du fichier source", fmt.Errorf("erreur lors de l'ouverture du fichier source: %v", err))
				return err
			}
			defer sourceFile.Close()

			destFile, err := os.Create(s.ollamaPath)
			if err != nil {
				s.setError("Erreur lors de la création du fichier de destination", fmt.Errorf("erreur lors de la création du fichier de destination: %v", err))
				return err
			}
			defer destFile.Close()

			_, err = io.Copy(destFile, sourceFile)
			if err != nil {
				s.setError("Erreur lors de la copie du fichier", fmt.Errorf("erreur lors de la copie du fichier: %v", err))
				return err
			}
		}
	}

	// Vérifier que le binaire a bien les permissions d'exécution
	err = os.Chmod(s.ollamaPath, 0755)
	if err != nil {
		s.setError("Erreur lors de la modification des permissions", fmt.Errorf("erreur lors de la modification des permissions du binaire: %v", err))
		return err
	}

	// Vérifier que le binaire est accessible
	_, err = os.Stat(s.ollamaPath)
	if err != nil {
		s.setError("Erreur lors de la vérification du binaire", fmt.Errorf("erreur lors de la vérification du binaire final: %v", err))
		return err
	}

	fmt.Printf("Ollama a été téléchargé et installé avec succès à %s\n", s.ollamaPath)
	s.updateStatus("installed", "Installation d'Ollama terminée", 100)
	return nil
} 