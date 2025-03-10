package main

import (
	"context"
	"fmt"
	"log"
	"pureSQL/backend"

	"github.com/wailsapp/wails/v2/pkg/runtime"
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

func (a *App) shutdown(ctx context.Context) {
	// kill the active connection at shutdown
	if a.ActiveConnection != nil && a.ActiveConnection.Conn != nil {
		err := a.ActiveConnection.Conn.Close(ctx)
		if err != nil {
			log.Fatal(err)
		}
	}
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

func (a *App) TitleBarPressedDouble() {
	// maximize window or minimize window in wails
	if runtime.WindowIsMaximised(a.ctx) {
		runtime.WindowUnmaximise(a.ctx)
	} else {
		runtime.WindowMaximise(a.ctx)
	}
}
