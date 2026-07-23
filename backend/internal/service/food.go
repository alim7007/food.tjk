package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"nexara.food/internal/model"
	"nexara.food/internal/repository"
)

type FoodService struct {
	repo repository.FoodRepository
}

func NewFoodService(repo repository.FoodRepository) *FoodService {
	return &FoodService{repo: repo}
}

func (s *FoodService) ListByRestaurant(ctx context.Context, restaurantID string) ([]model.Food, error) {
	return s.repo.ListByRestaurant(ctx, restaurantID)
}

func (s *FoodService) Create(ctx context.Context, restaurantID, categoryID uuid.UUID, name, description, imageURL string, price float64) (*model.Food, error) {
	if name == "" {
		return nil, fmt.Errorf("food name is required")
	}
	if price <= 0 {
		return nil, fmt.Errorf("price must be positive")
	}
	return s.repo.Create(ctx, restaurantID, categoryID, name, description, imageURL, price)
}

func (s *FoodService) Update(ctx context.Context, foodID, categoryID, name, description, imageURL string, price float64, isAvailable *bool) (*model.Food, error) {
	return s.repo.Update(ctx, foodID, categoryID, name, description, imageURL, price, isAvailable)
}

func (s *FoodService) Delete(ctx context.Context, foodID string) error {
	return s.repo.Delete(ctx, foodID)
}
