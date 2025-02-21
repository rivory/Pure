package model

import "github.com/google/uuid"

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
