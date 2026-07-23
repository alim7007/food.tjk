package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/go-playground/validator/v10"

	"nexara.food/internal/dto"
	"nexara.food/internal/service"
)

type CourierHandler struct {
	svc      *service.CourierService
	validate *validator.Validate
}

func NewCourierHandler(svc *service.CourierService) *CourierHandler {
	return &CourierHandler{svc: svc, validate: NewValidator()}
}

func (h *CourierHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	couriers, err := h.svc.ListAll(r.Context())
	if err != nil {
		slog.Error("list couriers", "error", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to list couriers")
		return
	}
	writeJSON(w, http.StatusOK, couriers)
}

func (h *CourierHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateCourierRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", "invalid request body")
		return
	}

	req.Name = sanitize(req.Name)
	req.Phone = sanitize(req.Phone)

	if err := h.validate.Struct(req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", formatValidationError(err))
		return
	}

	courier, err := h.svc.Create(r.Context(), req.UserID, req.Name, req.Phone)
	if err != nil {
		slog.Error("create courier", "error", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to create courier")
		return
	}
	writeJSON(w, http.StatusCreated, courier)
}
