package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"nexara.food/internal/model"
)

type RestaurantRepository interface {
	ListRestaurants(ctx context.Context, search string, limit, offset int) ([]model.Restaurant, int, error)
	GetByID(ctx context.Context, id string) (*model.Restaurant, error)
	Create(ctx context.Context, name, description, imageURL string) (*model.Restaurant, error)
	Update(ctx context.Context, id, name, description, imageURL string, isActive *bool) (*model.Restaurant, error)
	Delete(ctx context.Context, id string) error
}

type RestaurantRepo struct {
	pool *pgxpool.Pool
}

func NewRestaurantRepo(pool *pgxpool.Pool) *RestaurantRepo {
	return &RestaurantRepo{pool: pool}
}

func (r *RestaurantRepo) ListRestaurants(ctx context.Context, search string, limit, offset int) ([]model.Restaurant, int, error) {
	where := "WHERE is_active = true"
	args := []any{}
	argIdx := 1

	if search != "" {
		where += fmt.Sprintf(" AND (name ILIKE $%d OR description ILIKE $%d)", argIdx, argIdx+1)
		s := "%" + search + "%"
		args = append(args, s, s)
		argIdx += 2
	}

	var total int
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM restaurants "+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count restaurants: %w", err)
	}

	query := fmt.Sprintf(
		`SELECT id, name, description, image_url, is_active, created_at, updated_at
		 FROM restaurants %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`,
		where, argIdx, argIdx+1,
	)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query restaurants: %w", err)
	}
	defer rows.Close()

	var restaurants []model.Restaurant
	for rows.Next() {
		var rest model.Restaurant
		if err := rows.Scan(&rest.ID, &rest.Name, &rest.Description, &rest.ImageURL, &rest.IsActive, &rest.CreatedAt, &rest.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan restaurant: %w", err)
		}
		restaurants = append(restaurants, rest)
	}
	if restaurants == nil {
		restaurants = []model.Restaurant{}
	}
	return restaurants, total, rows.Err()
}

func (r *RestaurantRepo) GetByID(ctx context.Context, id string) (*model.Restaurant, error) {
	var rest model.Restaurant
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, description, image_url, is_active, created_at, updated_at FROM restaurants WHERE id = $1`, id,
	).Scan(&rest.ID, &rest.Name, &rest.Description, &rest.ImageURL, &rest.IsActive, &rest.CreatedAt, &rest.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("query restaurant: %w", err)
	}
	return &rest, nil
}

func (r *RestaurantRepo) Create(ctx context.Context, name, description, imageURL string) (*model.Restaurant, error) {
	var desc, img *string
	if description != "" {
		desc = &description
	}
	if imageURL != "" {
		img = &imageURL
	}
	var rest model.Restaurant
	err := r.pool.QueryRow(ctx,
		`INSERT INTO restaurants (name, description, image_url) VALUES ($1, $2, $3)
		 RETURNING id, name, description, image_url, is_active, created_at, updated_at`,
		name, desc, img,
	).Scan(&rest.ID, &rest.Name, &rest.Description, &rest.ImageURL, &rest.IsActive, &rest.CreatedAt, &rest.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create restaurant: %w", err)
	}
	return &rest, nil
}

func (r *RestaurantRepo) Update(ctx context.Context, id, name, description, imageURL string, isActive *bool) (*model.Restaurant, error) {
	var desc, img *string
	if description != "" {
		desc = &description
	}
	if imageURL != "" {
		img = &imageURL
	}
	var rest model.Restaurant
	err := r.pool.QueryRow(ctx,
		`UPDATE restaurants SET name = $1, description = $2, image_url = COALESCE($3, image_url), is_active = COALESCE($4, is_active), updated_at = NOW()
		 WHERE id = $5
		 RETURNING id, name, description, image_url, is_active, created_at, updated_at`,
		name, desc, img, isActive, id,
	).Scan(&rest.ID, &rest.Name, &rest.Description, &rest.ImageURL, &rest.IsActive, &rest.CreatedAt, &rest.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("update restaurant: %w", err)
	}
	return &rest, nil
}

func (r *RestaurantRepo) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM restaurants WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete restaurant: %w", err)
	}
	return nil
}
