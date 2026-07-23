package handler

import (
	"log/slog"
	"net/http"

	"nexara.food/internal/service"
)

type CategoryHandler struct {
	svc *service.CategoryService
}

func NewCategoryHandler(svc *service.CategoryService) *CategoryHandler {
	return &CategoryHandler{svc: svc}
}

func (h *CategoryHandler) List(w http.ResponseWriter, r *http.Request) {
	categories, err := h.svc.ListAll(r.Context())
	if err != nil {
		slog.Error("list categories", "error", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to list categories")
		return
	}
	writeJSON(w, http.StatusOK, categories)
}
