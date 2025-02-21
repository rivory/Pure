package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

// type CustomError struct {
// 	Message string `json:"message"`
// 	Name    string `json:"name"`
// }

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "pureSQL",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
		// ErrorFormatter: func(err error) any {
		// 	return CustomError{
		// 		Message: err.Error(),
		// 		Name:    "CustomError",
		// 	}
		// },
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
