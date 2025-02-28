package model

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
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

type ActiveConnection struct {
	Connection Connection
	Conn       *pgx.Conn
}

type Table string

type Database struct {
	Name   string
	Tables []string
}
