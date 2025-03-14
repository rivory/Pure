package backend

import (
	"context"
	"encoding/json"
	"errors"
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
	ctx              context.Context
	Connections      []model.Connection
	ActiveConnection *model.ActiveConnection
}

func NewConnectionService() *ConnectionService {
	return &ConnectionService{}
}

func (c *ConnectionService) Startup(ctx context.Context) {
	c.ctx = ctx
	c.read()
}

func TestConnection(ctx context.Context, conn model.Connection) error {
	c, err := pgx.Connect(ctx, conn.GetDSN())
	if err != nil {
		return err
	}
	c.Close(ctx)

	return nil
}

func (c *ConnectionService) ListConnections() []model.Connection {
	return c.Connections
}

func (c *ConnectionService) AddConnection(name, username, password, host string, port int) error {
	id := 1
	if len(c.Connections) > 0 {
		id = len(c.Connections) + 1
	}

	conn := model.Connection{
		ID:       id,
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

	c.Connections = append(c.Connections, conn)
	c.save()

	return nil
}

func (c *ConnectionService) UpdateConnection(conn model.Connection) error {
	// First test if the connection is valid
	err := TestConnection(c.ctx, conn)
	if err != nil {
		return err
	}

	// Find and update the connection in the list
	found := false
	for i, existingConn := range c.Connections {
		if existingConn.Uuid == conn.Uuid {
			c.Connections[i] = conn
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf("connection with UUID %s not found", conn.Uuid)
	}

	// Save the updated connections
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

	c.Connections = conns

	return nil
}

func (c *ConnectionService) save() error {
	fd, err := os.Create(FILE_STORAGE_PATH)
	if err != nil {
		return err
	}

	j, err := json.Marshal(c.Connections)
	if err != nil {
		return err
	}

	_, err = fd.Write(j)
	if err != nil {
		return err
	}

	return nil
}

func (c *ConnectionService) isActive() error {
	if c.ActiveConnection == nil || c.ActiveConnection.Conn == nil {
		return errors.New("no active connection")
	}

	return nil
}

func (c *ConnectionService) ListDatabase() ([]model.Database, error) {
	// check if active connection
	if err := c.isActive(); err != nil {
		return nil, err
	}

	rows, err := c.ActiveConnection.Conn.Query(c.ctx, "SELECT datname FROM pg_database;")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var res []string
	for rows.Next() {
		var db string
		err := rows.Scan(&db)
		if err != nil {
			return nil, err
		}
		res = append(res, db)
	}

	var dbs []model.Database
	for _, db := range res {
		tables, err := c.ListTableForDatabase(db)
		if err != nil {
			continue // TODO: find a way to not try to list table for db that are not needed (template etc...)
		}
		db := model.Database{
			Name:   db,
			Tables: tables,
		}
		dbs = append(dbs, db)
	}

	return dbs, nil
}

func (c *ConnectionService) ListTableForDatabase(db string) ([]string, error) {
	// check if active connection
	if err := c.isActive(); err != nil {
		return nil, err
	}

	dsn := c.ActiveConnection.Connection.GetDSN()
	dsn = fmt.Sprintf("%s/%s", dsn, db)

	conn, err := pgx.Connect(c.ctx, dsn)
	if err != nil {
		return nil, err
	}
	defer conn.Close(c.ctx)

	// Query to get all table names
	rows, err := conn.Query(c.ctx, `
		SELECT table_name 
		FROM information_schema.tables 
		WHERE table_schema = 'public'
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			return nil, err
		}
		tables = append(tables, tableName)
	}

	return tables, nil
}

type QueryResult struct {
	Columns []string        `json:"columns"`
	Rows    [][]interface{} `json:"rows"`
}

func (c *ConnectionService) Query(connUUID string, query string) (*QueryResult, error) {
	// Find the connection
	var conn model.Connection
	for _, c := range c.Connections {
		if c.Uuid.String() == connUUID {
			conn = c
			break
		}
	}
	if conn.Uuid.String() == "" {
		return nil, fmt.Errorf("connection not found")
	}

	// Connect to database
	db, err := pgx.Connect(c.ctx, conn.GetDSN())
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

func (c *ConnectionService) ListTables(connUUID string) ([]string, error) {
	// Find the connection
	var conn model.Connection
	for _, c := range c.Connections {
		if c.Uuid.String() == connUUID {
			conn = c
			break
		}
	}
	if conn.Uuid.String() == "" {
		return nil, fmt.Errorf("connection not found")
	}

	// Connect to database
	db, err := pgx.Connect(c.ctx, conn.GetDSN())
	if err != nil {
		return nil, err
	}
	defer db.Close(c.ctx)

	// Query to get all table names
	rows, err := db.Query(c.ctx, `
		SELECT table_name 
		FROM information_schema.tables 
		WHERE table_schema = 'public'
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			return nil, err
		}
		tables = append(tables, tableName)
	}

	return tables, nil
}

type TableInfo struct {
	Name    string   `json:"name"`
	Columns []string `json:"columns"`
}

func (c *ConnectionService) GetTableInfo(connUUID string) ([]TableInfo, error) {
	// Find the connection
	var conn model.Connection
	for _, c := range c.Connections {
		if c.Uuid.String() == connUUID {
			conn = c
			break
		}
	}
	if conn.Uuid.String() == "" {
		return nil, fmt.Errorf("connection not found")
	}
	// Connect to database
	db, err := pgx.Connect(c.ctx, conn.GetDSN())
	if err != nil {
		return nil, err
	}
	defer db.Close(c.ctx)

	// Query to get all tables and their columns
	rows, err := db.Query(c.ctx, `
		SELECT 
			t.table_name,
			array_agg(c.column_name::text) as columns
		FROM 
			information_schema.tables t
			JOIN information_schema.columns c ON c.table_name = t.table_name
		WHERE 
			t.table_schema = 'public'
			AND c.table_schema = 'public'
		GROUP BY 
			t.table_name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []TableInfo
	for rows.Next() {
		var table TableInfo
		var columns []string
		if err := rows.Scan(&table.Name, &columns); err != nil {
			return nil, err
		}
		table.Columns = columns
		tables = append(tables, table)
	}

	return tables, nil
}

func (c *ConnectionService) SetActiveConnection(conn model.Connection) error {
	// close the previous active connection before opening a new one
	if c.ActiveConnection != nil && c.ActiveConnection.Conn != nil {
		err := c.ActiveConnection.Conn.Close(c.ctx)
		if err != nil {
			return err
		}
	}

	connection, err := pgx.Connect(c.ctx, conn.GetDSN())
	if err != nil {
		return err
	}
	var active = model.ActiveConnection{
		Connection: conn,
		Conn:       connection,
	}
	c.ActiveConnection = &active

	return nil
}
