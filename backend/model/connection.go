package model

import (
	"fmt"

	"github.com/google/uuid"
)

type ConnectionType string

const (
	Postgres ConnectionType = "postgres"
	Mysql    ConnectionType = "mysql"
)

type Connection struct {
	Uuid     uuid.UUID      `json:"uuid"`
	Name     string         `json:"name"`
	Type     ConnectionType `json:"type"`
	Host     string         `json:"host"`
	Port     int            `json:"port"`
	Username string         `json:"username"`
	Password string         `json:"password"`
}

func (c Connection) GetDSN() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%d", c.Username, c.Password, c.Host, c.Port)
}

// TableInfo représente les informations d'une table avec ses colonnes
type TableInfo struct {
	Name    string   `json:"name"`
	Columns []string `json:"columns"`
}
