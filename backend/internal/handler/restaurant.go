package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"

	"nexara.food/internal/dto"
	"nexara.food/internal/service"
)

type RestaurantHandler struct {
	svc      *service.RestaurantService
	validate *validator.Validate
}

func NewRestaurantHandler(svc *service.RestaurantService) *RestaurantHandler {
	return &RestaurantHandler{svc: svc, validate: NewValidator()}
}

func (h *RestaurantHandler) List(w http.ResponseWriter, r *http.Request) {
	search := sanitize(r.URL.Query().Get("search"))
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}

	restaurants, total, err := h.svc.List(r.Context(), search, page, limit)
	if err != nil {
		slog.Error("list restaurants", "error", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to list restaurants")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"restaurants": restaurants,
		"total":       total,
		"page":        page,
		"limit":       limit,
	})
}

func (h *RestaurantHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	restaurant, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		slog.Error("get restaurant", "error", err)
		writeError(w, http.StatusNotFound, "NOT_FOUND", "restaurant not found")
		return
	}
	writeJSON(w, http.StatusOK, restaurant)
}

func (h *RestaurantHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateRestaurantRequest
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

	restaurant, err := h.svc.Create(r.Context(), req.Name, req.Description, req.ImageURL)
	if err != nil {
		slog.Error("create restaurant", "error", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to create restaurant")
		return
	}
	writeJSON(w, http.StatusCreated, restaurant)
}

func (h *RestaurantHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req dto.UpdateRestaurantRequest
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

	restaurant, err := h.svc.Update(r.Context(), id, req.Name, req.Description, req.ImageURL, req.IsActive)
	if err != nil {
		slog.Error("update restaurant", "error", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to update restaurant")
		return
	}
	writeJSON(w, http.StatusOK, restaurant)
}

func (h *RestaurantHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		slog.Error("delete restaurant", "error", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to delete restaurant")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "deleted"})
}
