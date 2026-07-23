package service

import (
	"context"

	"nexara.food/internal/model"
	"nexara.food/internal/repository"
)

type CourierService struct {
	repo repository.CourierRepository
}

func NewCourierService(repo repository.CourierRepository) *CourierService {
	return &CourierService{repo: repo}
}

func (s *CourierService) ListAll(ctx context.Context) ([]model.Courier, error) {
	return s.repo.ListAll(ctx)
}

func (s *CourierService) Create(ctx context.Context, userID, name, phone string) (*model.Courier, error) {
	return s.repo.Create(ctx, userID, name, phone)
}
