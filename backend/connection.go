package backend

import (
	"context"
	"fmt"
	"pureSQL/backend/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type ConnectionService struct {
	ctx        context.Context
	Conections []model.Connection
}

func NewConnectionService() *ConnectionService {
	return &ConnectionService{}
}

func TestConnection(ctx context.Context, conn model.Connection) error {
	connUrl := fmt.Sprintf("postgres://%s:%s@/%s:%d", conn.Username, conn.Password, conn.Host, conn.Port)
	c, err := pgx.Connect(ctx, connUrl)
	if err != nil {
		// TODO: log

		return err
	}
	defer c.Close(ctx)

	return nil
}

func (c *ConnectionService) Startup(ctx context.Context) {
	c.ctx = ctx
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

	return nil
}
