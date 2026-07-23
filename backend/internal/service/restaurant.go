package service

import (
	"context"
	"fmt"

	"nexara.food/internal/model"
	"nexara.food/internal/repository"
)

type RestaurantService struct {
	repo repository.RestaurantRepository
}

func NewRestaurantService(repo repository.RestaurantRepository) *RestaurantService {
	return &RestaurantService{repo: repo}
}

func (s *RestaurantService) List(ctx context.Context, search string, page, limit int) ([]model.Restaurant, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}
	offset := (page - 1) * limit
	return s.repo.ListRestaurants(ctx, search, limit, offset)
}

func (s *RestaurantService) GetByID(ctx context.Context, id string) (*model.Restaurant, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *RestaurantService) Create(ctx context.Context, name, description, imageURL string) (*model.Restaurant, error) {
	if name == "" {
		return nil, fmt.Errorf("restaurant name is required")
	}
	return s.repo.Create(ctx, name, description, imageURL)
}

func (s *RestaurantService) Update(ctx context.Context, id, name, description, imageURL string, isActive *bool) (*model.Restaurant, error) {
	return s.repo.Update(ctx, id, name, description, imageURL, isActive)
}

func (s *RestaurantService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
