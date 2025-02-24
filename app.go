package main

import (
	"context"
	"fmt"
	"pureSQL/backend"
)

// App struct
type App struct {
	ctx context.Context
	*backend.ConnectionService
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		ctx:               nil,
		ConnectionService: backend.NewConnectionService(),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.ConnectionService.Startup(ctx)
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
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

func (a *App) ListTables(connUUID string) ([]string, error) {
	return a.ConnectionService.ListTables(connUUID)
}

func (a *App) GetTableInfo(connUUID string) ([]backend.TableInfo, error) {
	return a.ConnectionService.GetTableInfo(connUUID)
}
