package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"

	"nexara.food/internal/dto"
	"nexara.food/internal/pkg/middleware"
	"nexara.food/internal/service"
)

type OrderHandler struct {
	svc      *service.OrderService
	validate *validator.Validate
}

func NewOrderHandler(svc *service.OrderService) *OrderHandler {
	return &OrderHandler{svc: svc, validate: NewValidator()}
}

func (h *OrderHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", "invalid request body")
		return
	}

	req.DeliveryAddress = sanitize(req.DeliveryAddress)
	req.DeliveryPhone = sanitize(req.DeliveryPhone)
	req.Note = sanitizePtr(req.Note)

	if err := h.validate.Struct(req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", formatValidationError(err))
		return
	}

	items := make([]service.CreateOrderItemInput, len(req.Items))
	for i, item := range req.Items {
		items[i] = service.CreateOrderItemInput{
			FoodID:   item.FoodID,
			Quantity: item.Quantity,
		}
	}

	var userID *uuid.UUID
	if uid := middleware.GetUserID(r.Context()); uid != "" {
		parsed, err := uuid.Parse(uid)
		if err == nil {
			userID = &parsed
		}
	}

	input := service.CreateOrderInput{
		UserID:          userID,
		RestaurantID:    req.RestaurantID,
		Items:           items,
		DeliveryAddress: req.DeliveryAddress,
		DeliveryPhone:   req.DeliveryPhone,
		Note:            req.Note,
	}

	order, err := h.svc.Create(r.Context(), input)
	if err != nil {
		slog.Error("create order", "error", err)
		writeError(w, http.StatusBadRequest, "VALIDATION", err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, dto.CreateOrderResponse{
		OrderID:     order.ID.String(),
		Status:      order.Status,
		Subtotal:    order.Subtotal,
		DeliveryFee: order.DeliveryFee,
		Total:       order.Total,
	})
}

func (h *OrderHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	order, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		slog.Error("get order", "error", err)
		writeError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
		return
	}
	writeJSON(w, http.StatusOK, order)
}

func (h *OrderHandler) ListMyOrders(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	status := sanitize(r.URL.Query().Get("status"))
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	orders, total, err := h.svc.ListByUser(r.Context(), userID, status, page, limit)
	if err != nil {
		slog.Error("list orders", "error", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to list orders")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"orders": orders,
		"total":  total,
		"page":   page,
		"limit":  limit,
	})
}

func (h *OrderHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	status := sanitize(r.URL.Query().Get("status"))
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	orders, total, err := h.svc.ListAll(r.Context(), status, page, limit)
	if err != nil {
		slog.Error("list all orders", "error", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to list orders")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"orders": orders,
		"total":  total,
		"page":   page,
		"limit":  limit,
	})
}

func (h *OrderHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req dto.UpdateOrderStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", "invalid request body")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", formatValidationError(err))
		return
	}

	if err := h.svc.UpdateStatus(r.Context(), id, req.Status); err != nil {
		slog.Error("update order status", "error", err)
		writeError(w, http.StatusBadRequest, "VALIDATION", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": req.Status})
}

func (h *OrderHandler) AssignCourier(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req dto.AssignCourierRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", "invalid request body")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", formatValidationError(err))
		return
	}

	if err := h.svc.AssignCourier(r.Context(), id, req.CourierID); err != nil {
		slog.Error("assign courier", "error", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to assign courier")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "courier assigned"})
}

func (h *OrderHandler) ListCourierOrders(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	status := sanitize(r.URL.Query().Get("status"))
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	orders, total, err := h.svc.ListByCourier(r.Context(), userID, status, page, limit)
	if err != nil {
		slog.Error("list courier orders", "error", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to list orders")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"orders": orders,
		"total":  total,
		"page":   page,
		"limit":  limit,
	})
}
