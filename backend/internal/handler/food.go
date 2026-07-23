package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"

	"nexara.food/internal/dto"
	"nexara.food/internal/service"
)

type FoodHandler struct {
	svc      *service.FoodService
	validate *validator.Validate
}

func NewFoodHandler(svc *service.FoodService) *FoodHandler {
	return &FoodHandler{svc: svc, validate: NewValidator()}
}

func (h *FoodHandler) ListByRestaurant(w http.ResponseWriter, r *http.Request) {
	restaurantID := chi.URLParam(r, "id")
	foods, err := h.svc.ListByRestaurant(r.Context(), restaurantID)
	if err != nil {
		slog.Error("list foods", "error", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to list foods")
		return
	}
	writeJSON(w, http.StatusOK, foods)
}

func (h *FoodHandler) Create(w http.ResponseWriter, r *http.Request) {
	restaurantID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", "invalid restaurant id")
		return
	}

	var req dto.CreateFoodRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", "invalid request body")
		return
	}

	req.Name = sanitize(req.Name)
	req.Description = sanitize(req.Description)
	req.ImageURL = sanitize(req.ImageURL)

	if err := h.validate.Struct(req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", formatValidationError(err))
		return
	}

	categoryID, err := uuid.Parse(req.CategoryID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", "invalid category id")
		return
	}

	food, err := h.svc.Create(r.Context(), restaurantID, categoryID, req.Name, req.Description, req.ImageURL, req.Price)
	if err != nil {
		slog.Error("create food", "error", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to create food")
		return
	}
	writeJSON(w, http.StatusCreated, food)
}

func (h *FoodHandler) Update(w http.ResponseWriter, r *http.Request) {
	foodID := chi.URLParam(r, "foodID")

	var req dto.UpdateFoodRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", "invalid request body")
		return
	}

	req.Name = sanitize(req.Name)
	req.Description = sanitize(req.Description)
	req.ImageURL = sanitize(req.ImageURL)

	if err := h.validate.Struct(req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", formatValidationError(err))
		return
	}

	food, err := h.svc.Update(r.Context(), foodID, req.CategoryID, req.Name, req.Description, req.ImageURL, req.Price, req.IsAvailable)
	if err != nil {
		slog.Error("update food", "error", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to update food")
		return
	}
	writeJSON(w, http.StatusOK, food)
}

func (h *FoodHandler) Delete(w http.ResponseWriter, r *http.Request) {
	foodID := chi.URLParam(r, "foodID")
	if err := h.svc.Delete(r.Context(), foodID); err != nil {
		slog.Error("delete food", "error", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to delete food")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "deleted"})
}
