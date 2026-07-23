package database

import (
	"context"
	"fmt"
	"time"

	"github.com/avast/retry-go/v4"
	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	poolConfig, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database URL: %w", err)
	}

	poolConfig.MaxConns = 20
	poolConfig.MinConns = 2
	poolConfig.MaxConnLifetime = 5 * time.Minute

	var pool *pgxpool.Pool

	err = retry.Do(
		func() error {
			var connErr error
			pool, connErr = pgxpool.NewWithConfig(ctx, poolConfig)
			if connErr != nil {
				return connErr
			}
			return pool.Ping(ctx)
		},
		retry.Attempts(10),
		retry.Delay(2*time.Second),
		retry.DelayType(retry.FixedDelay),
	)
	if err != nil {
		return nil, fmt.Errorf("connect to database: %w", err)
	}

	return pool, nil
}
