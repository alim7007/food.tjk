package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"nexara.food/internal/model"
)

type CourierRepository interface {
	Create(ctx context.Context, userID, name, phone string) (*model.Courier, error)
	GetByID(ctx context.Context, id string) (*model.Courier, error)
	GetByUserID(ctx context.Context, userID string) (*model.Courier, error)
	ListAll(ctx context.Context) ([]model.Courier, error)
}

type CourierRepo struct {
	pool *pgxpool.Pool
}

func NewCourierRepo(pool *pgxpool.Pool) *CourierRepo {
	return &CourierRepo{pool: pool}
}

func (r *CourierRepo) Create(ctx context.Context, userID, name, phone string) (*model.Courier, error) {
	var c model.Courier
	err := r.pool.QueryRow(ctx,
		`INSERT INTO couriers (user_id, name, phone) VALUES ($1, $2, $3)
		 RETURNING id, user_id, name, phone, is_active, created_at, updated_at`,
		userID, name, phone,
	).Scan(&c.ID, &c.UserID, &c.Name, &c.Phone, &c.IsActive, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create courier: %w", err)
	}
	return &c, nil
}

func (r *CourierRepo) GetByUserID(ctx context.Context, userID string) (*model.Courier, error) {
	var c model.Courier
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, name, phone, is_active, created_at, updated_at FROM couriers WHERE user_id = $1`,
		userID,
	).Scan(&c.ID, &c.UserID, &c.Name, &c.Phone, &c.IsActive, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get courier by user id: %w", err)
	}
	return &c, nil
}

func (r *CourierRepo) GetByID(ctx context.Context, id string) (*model.Courier, error) {
	var c model.Courier
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, name, phone, is_active, created_at, updated_at FROM couriers WHERE id = $1`,
		id,
	).Scan(&c.ID, &c.UserID, &c.Name, &c.Phone, &c.IsActive, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get courier by id: %w", err)
	}
	return &c, nil
}

func (r *CourierRepo) ListAll(ctx context.Context) ([]model.Courier, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, user_id, name, phone, is_active, created_at, updated_at FROM couriers ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, fmt.Errorf("list couriers: %w", err)
	}
	defer rows.Close()

	var couriers []model.Courier
	for rows.Next() {
		var c model.Courier
		if err := rows.Scan(&c.ID, &c.UserID, &c.Name, &c.Phone, &c.IsActive, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan courier: %w", err)
		}
		couriers = append(couriers, c)
	}
	if couriers == nil {
		couriers = []model.Courier{}
	}
	return couriers, rows.Err()
}
