package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"nexara.food/internal/model"
)

type CategoryRepository interface {
	ListAll(ctx context.Context) ([]model.Category, error)
}

type CategoryRepo struct {
	pool *pgxpool.Pool
}

func NewCategoryRepo(pool *pgxpool.Pool) *CategoryRepo {
	return &CategoryRepo{pool: pool}
}

func (r *CategoryRepo) ListAll(ctx context.Context) ([]model.Category, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, display_order, created_at, updated_at FROM categories ORDER BY display_order ASC`,
	)
	if err != nil {
		return nil, fmt.Errorf("query categories: %w", err)
	}
	defer rows.Close()

	var categories []model.Category
	for rows.Next() {
		var c model.Category
		if err := rows.Scan(&c.ID, &c.Name, &c.DisplayOrder, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan category: %w", err)
		}
		categories = append(categories, c)
	}
	if categories == nil {
		categories = []model.Category{}
	}
	return categories, rows.Err()
}
