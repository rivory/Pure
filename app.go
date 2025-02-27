package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"pureSQL/backend"
	"pureSQL/backend/model"
)

// App struct
type App struct {
	ctx               context.Context
	ConnectionService *backend.ConnectionService
	OllamaService     *backend.OllamaService
}

// NewApp creates a new App application struct
func NewApp() *App {
	// Determine models directory in user's home/.pureSQL/models
	homeDir, err := os.UserHomeDir()
	modelsDir := ""
	if err == nil {
		modelsDir = filepath.Join(homeDir, ".pureSQL", "models")
		// Ensure the directory exists
		os.MkdirAll(modelsDir, 0755)
	}
	
	return &App{
		ctx:               nil,
		ConnectionService: backend.NewConnectionService(),
		OllamaService:     backend.NewOllamaService(modelsDir),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.ConnectionService.Startup(ctx)
	
	// Start the Ollama service
	err := a.OllamaService.Start()
	if err != nil {
		fmt.Printf("Warning: Failed to start embedded Ollama: %v\n", err)
		fmt.Println("Natural language to SQL translation feature may not work without Ollama running.")
	}
}

// shutdown is called when the app is closing
func (a *App) shutdown(ctx context.Context) {
	// Stop the Ollama service
	if a.OllamaService != nil {
		if err := a.OllamaService.Stop(); err != nil {
			fmt.Printf("Error stopping Ollama: %v\n", err)
		}
	}
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// TranslateToSQL traduit du texte en langage naturel en SQL
func (a *App) TranslateToSQL(naturalText string, tableInfoJSON string) (string, error) {
	return a.ConnectionService.TranslateToSQL(naturalText, tableInfoJSON)
}

// IsOllamaRunning checks if Ollama is available
func (a *App) IsOllamaRunning() bool {
	if a.OllamaService == nil {
		return false
	}
	return a.OllamaService.IsRunning()
}

// ListConnections returns all connections
func (a *App) ListConnections() []model.Connection {
	return a.ConnectionService.ListConnections()
}

// AddConnection adds a new connection
func (a *App) AddConnection(name, username, password, host string, port int) error {
	return a.ConnectionService.AddConnection(name, username, password, host, port)
}

// Query executes a SQL query on the specified connection
func (a *App) Query(connUUID string, query string) (*backend.QueryResult, error) {
	return a.ConnectionService.Query(connUUID, query)
}

// ListTables returns all tables for a connection
func (a *App) ListTables(connUUID string) ([]string, error) {
	return a.ConnectionService.ListTables(connUUID)
}

// GetTableInfo returns detailed information about tables for a connection
func (a *App) GetTableInfo(connUUID string) ([]backend.TableInfo, error) {
	return a.ConnectionService.GetTableInfo(connUUID)
}

// GetOllamaStatus returns the current status of Ollama
func (a *App) GetOllamaStatus() backend.OllamaStatus {
	if a.OllamaService == nil {
		return backend.OllamaStatus{
			State:    "error",
			Progress: 0,
			Message:  "Service Ollama non initialisé",
			Error:    "OllamaService est nil",
		}
	}
	return a.OllamaService.GetStatus()
}

// func (a *App) ListDB() []model.DB {
// 	return a.Dbs
// }

// func (a *App) AddDB(name, username, password, host string, port int) error {
// 	a.Dbs = append(a.Dbs, model.DB{
// 		Uuid:     uuid.New(),
// 		Name:     name,
// 		Type:     model.Postgres,
// 		Host:     host,
// 		Port:     port,
// 		Username: username,
// 		Password: password,
// 	})

// 	return nil
// }
