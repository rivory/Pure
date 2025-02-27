package main

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
	"time"
)

const VERSION = "1.0.0"

type OllamaStatus struct {
	State    string  `json:"state"`
	Progress float64 `json:"progress"`
	Message  string  `json:"message"`
	Error    string  `json:"error"`
}

type OllamaService struct {
	ollamaPath string
	status     OllamaStatus
}

func NewOllamaService(basePath string) *OllamaService {
	ollamaPath := filepath.Join(basePath, "ollama")
	if runtime.GOOS == "windows" && !strings.HasSuffix(ollamaPath, ".exe") {
		ollamaPath += ".exe"
	}
	return &OllamaService{
		ollamaPath: ollamaPath,
		status: OllamaStatus{
			State:    "not_installed",
			Progress: 0,
			Message:  "Ollama not installed",
		},
	}
}

func (s *OllamaService) updateStatus(state string, message string, progress float64) {
	s.status.State = state
	s.status.Message = message
	s.status.Progress = progress
	fmt.Printf("Status: %s - %s (%.1f%%)\n", state, message, progress)
}

func (s *OllamaService) setError(message string, err error) {
	s.status.State = "error"
	s.status.Message = message
	if err != nil {
		s.status.Error = err.Error()
		fmt.Printf("Error: %s - %v\n", message, err)
	} else {
		fmt.Printf("Error: %s\n", message)
	}
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

func TestOllamaDownload() {
	fmt.Println("=== Test de téléchargement d'Ollama ===")
	
	// Obtenir le répertoire personnel de l'utilisateur
	homeDir, err := os.UserHomeDir()
	if err != nil {
		fmt.Printf("Erreur lors de la récupération du répertoire personnel: %v\n", err)
		return
	}
	
	// Créer un dossier .pureSQL_test pour le test
	testDir := filepath.Join(homeDir, ".pureSQL_test")
	os.RemoveAll(testDir) // Nettoyage si le dossier existe déjà
	err = os.MkdirAll(testDir, 0755)
	if err != nil {
		fmt.Printf("Erreur lors de la création du dossier de test: %v\n", err)
		return
	}
	
	// Initialiser le service Ollama avec le dossier de test
	service := NewOllamaService(testDir)
	
	// Afficher l'emplacement du binaire Ollama
	fmt.Printf("Emplacement du binaire Ollama: %s\n", service.ollamaPath)
	
	// Télécharger Ollama
	err = service.downloadOllama()
	if err != nil {
		fmt.Printf("Erreur lors du téléchargement d'Ollama: %v\n", err)
		return
	}
	
	// Vérifier que le binaire existe
	if _, err := os.Stat(service.ollamaPath); os.IsNotExist(err) {
		fmt.Printf("Le binaire Ollama n'a pas été trouvé à l'emplacement attendu: %s\n", service.ollamaPath)
		return
	}
	
	// Vérifier les permissions du binaire
	fileInfo, err := os.Stat(service.ollamaPath)
	if err != nil {
		fmt.Printf("Erreur lors de la vérification du binaire: %v\n", err)
		return
	}
	
	// Afficher les informations sur le binaire
	fmt.Printf("Binaire Ollama:\n")
	fmt.Printf("  Taille: %d octets\n", fileInfo.Size())
	fmt.Printf("  Permissions: %s\n", fileInfo.Mode().String())
	fmt.Printf("  Date de modification: %s\n", fileInfo.ModTime().Format(time.RFC3339))
	
	// Exécuter la commande file pour vérifier le type de fichier
	cmd := exec.Command("file", service.ollamaPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		fmt.Printf("Erreur lors de l'exécution de la commande file: %v\n", err)
	} else {
		fmt.Printf("  Type de fichier: %s\n", string(output))
	}
	
	fmt.Println("=== Test terminé avec succès ===")
}

func main() {
	fmt.Println("=== Démarrage du test de téléchargement d'Ollama ===")
	TestOllamaDownload()
} 