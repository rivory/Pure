package backend

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"pureSQL/backend/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const (
	FILE_STORAGE_PATH = "./connection.json"
)

type ConnectionService struct {
	ctx        context.Context
	Conections []model.Connection
}

func NewConnectionService() *ConnectionService {
	return &ConnectionService{}
}

func (c *ConnectionService) Startup(ctx context.Context) {
	c.ctx = ctx
	c.read()
}

func TestConnection(ctx context.Context, conn model.Connection) error {
	connUrl := fmt.Sprintf("postgres://%s:%s@%s:%d", conn.Username, conn.Password, conn.Host, conn.Port)

	c, err := pgx.Connect(ctx, connUrl)
	if err != nil {
		// TODO: log

		return err
	}
	defer c.Close(ctx)

	return nil
}

func (c *ConnectionService) ListConnections() []model.Connection {
	return c.Conections
}

func (c *ConnectionService) AddConnection(name, username, password, host string, port int) error {
	conn := model.Connection{
		Uuid:     uuid.New(),
		Name:     name,
		Type:     model.Postgres,
		Host:     host,
		Port:     port,
		Username: username,
		Password: password,
	}
	err := TestConnection(c.ctx, conn)
	if err != nil {
		return err
	}

	c.Conections = append(c.Conections, conn)
	c.save()

	return nil
}

func (c *ConnectionService) read() error {
	fd, err := os.Open(FILE_STORAGE_PATH)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	b, err := io.ReadAll(fd)
	if err != nil {
		return err
	}

	var conns []model.Connection
	err = json.Unmarshal(b, &conns)
	if err != nil {
		return err
	}

	c.Conections = conns

	return nil
}

func (c *ConnectionService) save() error {
	fd, err := os.Create(FILE_STORAGE_PATH)
	if err != nil {
		return err
	}

	j, err := json.Marshal(c.Conections)
	if err != nil {
		return err
	}

	_, err = fd.Write(j)
	if err != nil {
		return err
	}

	return nil
}

type QueryResult struct {
	Columns []string        `json:"columns"`
	Rows    [][]interface{} `json:"rows"`
}

func (c *ConnectionService) Query(connUUID string, query string) (*QueryResult, error) {
	// Find the connection
	var conn model.Connection
	for _, c := range c.Conections {
		if c.Uuid.String() == connUUID {
			conn = c
			break
		}
	}
	if conn.Uuid.String() == "" {
		return nil, fmt.Errorf("connection not found")
	}

	// Connect to database
	connUrl := fmt.Sprintf("postgres://%s:%s@%s:%d", conn.Username, conn.Password, conn.Host, conn.Port)
	db, err := pgx.Connect(c.ctx, connUrl)
	if err != nil {
		return nil, err
	}
	defer db.Close(c.ctx)

	// Execute query
	rows, err := db.Query(c.ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Get column descriptions
	fieldDescriptions := rows.FieldDescriptions()
	columns := make([]string, len(fieldDescriptions))
	for i, fd := range fieldDescriptions {
		columns[i] = string(fd.Name)
	}

	// Get all rows
	var result [][]interface{}
	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return nil, err
		}
		result = append(result, values)
	}

	return &QueryResult{
		Columns: columns,
		Rows:    result,
	}, nil
}
