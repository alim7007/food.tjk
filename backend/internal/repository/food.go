package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"nexara.food/internal/model"
)

type FoodRepository interface {
	ListByRestaurant(ctx context.Context, restaurantID string) ([]model.Food, error)
	GetByIDs(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID]*model.Food, error)
	Create(ctx context.Context, restaurantID, categoryID uuid.UUID, name, description, imageURL string, price float64) (*model.Food, error)
	Update(ctx context.Context, foodID, categoryID, name, description, imageURL string, price float64, isAvailable *bool) (*model.Food, error)
	Delete(ctx context.Context, foodID string) error
}

type FoodRepo struct {
	pool *pgxpool.Pool
}

func NewFoodRepo(pool *pgxpool.Pool) *FoodRepo {
	return &FoodRepo{pool: pool}
}

func (r *FoodRepo) ListByRestaurant(ctx context.Context, restaurantID string) ([]model.Food, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, restaurant_id, category_id, name, description, price, image_url, is_available, created_at, updated_at
		 FROM foods WHERE restaurant_id = $1 AND is_available = true ORDER BY name ASC`,
		restaurantID,
	)
	if err != nil {
		return nil, fmt.Errorf("query foods: %w", err)
	}
	defer rows.Close()

	var foods []model.Food
	for rows.Next() {
		var f model.Food
		if err := rows.Scan(&f.ID, &f.RestaurantID, &f.CategoryID, &f.Name, &f.Description, &f.Price, &f.ImageURL, &f.IsAvailable, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan food: %w", err)
		}
		foods = append(foods, f)
	}
	if foods == nil {
		foods = []model.Food{}
	}
	return foods, rows.Err()
}

func (r *FoodRepo) GetByIDs(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID]*model.Food, error) {
	if len(ids) == 0 {
		return map[uuid.UUID]*model.Food{}, nil
	}
	rows, err := r.pool.Query(ctx,
		`SELECT id, restaurant_id, category_id, name, description, price, image_url, is_available, created_at, updated_at
		 FROM foods WHERE id = ANY($1)`, ids,
	)
	if err != nil {
		return nil, fmt.Errorf("query foods by ids: %w", err)
	}
	defer rows.Close()

	result := make(map[uuid.UUID]*model.Food, len(ids))
	for rows.Next() {
		var f model.Food
		if err := rows.Scan(&f.ID, &f.RestaurantID, &f.CategoryID, &f.Name, &f.Description, &f.Price, &f.ImageURL, &f.IsAvailable, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan food: %w", err)
		}
		result[f.ID] = &f
	}
	return result, rows.Err()
}

func (r *FoodRepo) Create(ctx context.Context, restaurantID, categoryID uuid.UUID, name, description, imageURL string, price float64) (*model.Food, error) {
	var desc, img *string
	if description != "" {
		desc = &description
	}
	if imageURL != "" {
		img = &imageURL
	}
	var f model.Food
	err := r.pool.QueryRow(ctx,
		`INSERT INTO foods (restaurant_id, category_id, name, description, price, image_url, is_available)
		 VALUES ($1, $2, $3, $4, $5, $6, true)
		 RETURNING id, restaurant_id, category_id, name, description, price, image_url, is_available, created_at, updated_at`,
		restaurantID, categoryID, name, desc, price, img,
	).Scan(&f.ID, &f.RestaurantID, &f.CategoryID, &f.Name, &f.Description, &f.Price, &f.ImageURL, &f.IsAvailable, &f.CreatedAt, &f.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create food: %w", err)
	}
	return &f, nil
}

func (r *FoodRepo) Update(ctx context.Context, foodID, categoryID, name, description, imageURL string, price float64, isAvailable *bool) (*model.Food, error) {
	var desc, img *string
	if description != "" {
		desc = &description
	}
	if imageURL != "" {
		img = &imageURL
	}
	var f model.Food
	err := r.pool.QueryRow(ctx,
		`UPDATE foods SET
			name = CASE WHEN $1 = '' THEN name ELSE $1 END,
			description = COALESCE($2, description),
			price = CASE WHEN $3 = -1 THEN price ELSE $3 END,
			category_id = CASE WHEN $4 = '' THEN category_id ELSE $4::uuid END,
			image_url = COALESCE($5, image_url),
			is_available = COALESCE($6, is_available),
			updated_at = NOW()
		 WHERE id = $7
		 RETURNING id, restaurant_id, category_id, name, description, price, image_url, is_available, created_at, updated_at`,
		name, desc, price, categoryID, img, isAvailable, foodID,
	).Scan(&f.ID, &f.RestaurantID, &f.CategoryID, &f.Name, &f.Description, &f.Price, &f.ImageURL, &f.IsAvailable, &f.CreatedAt, &f.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("update food: %w", err)
	}
	return &f, nil
}

func (r *FoodRepo) Delete(ctx context.Context, foodID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM foods WHERE id = $1`, foodID)
	if err != nil {
		return fmt.Errorf("delete food: %w", err)
	}
	return nil
}
