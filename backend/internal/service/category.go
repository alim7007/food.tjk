package service

import (
	"context"

	"nexara.food/internal/model"
	"nexara.food/internal/repository"
)

type CategoryService struct {
	repo repository.CategoryRepository
}

func NewCategoryService(repo repository.CategoryRepository) *CategoryService {
	return &CategoryService{repo: repo}
}

func (s *CategoryService) ListAll(ctx context.Context) ([]model.Category, error) {
	return s.repo.ListAll(ctx)
}
