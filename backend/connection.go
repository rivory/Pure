package backend

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"pureSQL/backend/model"
	"strings"

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
	c, err := pgx.Connect(ctx, conn.GetDSN())
	if err != nil {
		return err
	}
	c.Close(ctx)

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

	// Add active

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

// Structure pour la requête à l'API Ollama
type OllamaGenerateRequest struct {
	Model   string                 `json:"model"`
	Prompt  string                 `json:"prompt"`
	Stream  bool                   `json:"stream"`
	Options map[string]interface{} `json:"options,omitempty"`
}

// Structure pour la réponse de l'API Ollama
type OllamaGenerateResponse struct {
	Model    string `json:"model"`
	Response string `json:"response"`
	Done     bool   `json:"done"`
}

// TranslateToSQL traduit une requête en langage naturel en SQL en utilisant Ollama
func (c *ConnectionService) TranslateToSQL(naturalText string, tableInfoJSON string) (string, error) {
	// Vérifier si Ollama est accessible
	_, err := http.Get("http://localhost:11434/api/version")
	if err != nil {
		return "", fmt.Errorf("impossible de se connecter à Ollama: %v", err)
	}

	// Construire le prompt avec les informations des tables
	tableInfoText := ""
	if tableInfoJSON != "" {
		var tableInfo []model.TableInfo
		if err := json.Unmarshal([]byte(tableInfoJSON), &tableInfo); err == nil {
			tableInfoText = "\nInformations sur les tables disponibles:\n"
			for _, table := range tableInfo {
				tableInfoText += fmt.Sprintf("Table \"%s\" avec les colonnes: %s\n", 
					table.Name, strings.Join(table.Columns, ", "))
			}
		}
	}

	prompt := fmt.Sprintf(`Tu es un expert en SQL qui convertit des questions en langage naturel en requêtes SQL optimisées.
    
%s

Voici la demande en langage naturel à traduire en SQL:
"%s"

Réponds uniquement avec la requête SQL valide, sans explications ni commentaires. N'inclus pas de backticks, de marqueurs de code, ou tout autre formatage qui n'est pas du SQL pur.`, tableInfoText, naturalText)

	// Préparer la requête pour Ollama
	requestBody, err := json.Marshal(OllamaGenerateRequest{
		Model:  "llama3.2:latest",
		Prompt: prompt,
		Stream: false,
	})
	if err != nil {
		return "", err
	}

	// Envoyer la requête à Ollama
	resp, err := http.Post(
		"http://localhost:11434/api/generate",
		"application/json",
		strings.NewReader(string(requestBody)),
	)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	// Lire la réponse
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	// Décoder la réponse
	var ollamaResponse OllamaGenerateResponse
	if err := json.Unmarshal(responseBody, &ollamaResponse); err != nil {
		return "", err
	}

	// Nettoyer la réponse SQL
	sqlQuery := strings.TrimSpace(ollamaResponse.Response)

	// Enlever les backticks si présents
	if strings.HasPrefix(sqlQuery, "```sql") && strings.HasSuffix(sqlQuery, "```") {
		sqlQuery = strings.TrimSpace(sqlQuery[6 : len(sqlQuery)-3])
	} else if strings.HasPrefix(sqlQuery, "```") && strings.HasSuffix(sqlQuery, "```") {
		sqlQuery = strings.TrimSpace(sqlQuery[3 : len(sqlQuery)-3])
	}

	return sqlQuery, nil
}
