package service

import (
	"context"
	"fmt"
	"strconv"

	"github.com/google/uuid"

	"nexara.food/internal/model"
	"nexara.food/internal/notify"
	"nexara.food/internal/repository"
	"nexara.food/internal/sse"
)

type OrderService struct {
	orderRepo      repository.OrderRepository
	foodRepo       repository.FoodRepository
	userRepo       repository.UserRepository
	courierRepo    repository.CourierRepository
	sseHub         *sse.Hub
	courierHub     *sse.CourierHub
	telegram       *notify.Telegram
	telegramRepo   repository.TelegramSubscriberRepository
	telegramChatID string
	frontendURL    string
}

func NewOrderService(orderRepo repository.OrderRepository, foodRepo repository.FoodRepository, userRepo repository.UserRepository, courierRepo repository.CourierRepository) *OrderService {
	return &OrderService{orderRepo: orderRepo, foodRepo: foodRepo, userRepo: userRepo, courierRepo: courierRepo}
}

func (s *OrderService) SetSSEHub(hub *sse.Hub) {
	s.sseHub = hub
}

func (s *OrderService) SetCourierHub(hub *sse.CourierHub) {
	s.courierHub = hub
}

func (s *OrderService) SetTelegram(tg *notify.Telegram) {
	s.telegram = tg
}

func (s *OrderService) SetTelegramRepo(repo repository.TelegramSubscriberRepository) {
	s.telegramRepo = repo
}

func (s *OrderService) SetTelegramChatID(chatID string) {
	s.telegramChatID = chatID
}

func (s *OrderService) SetFrontendURL(url string) {
	s.frontendURL = url
}

type CreateOrderInput struct {
	UserID          *uuid.UUID
	RestaurantID    uuid.UUID
	Items           []CreateOrderItemInput
	DeliveryAddress string
	DeliveryPhone   string
	Note            *string
}

type CreateOrderItemInput struct {
	FoodID   uuid.UUID
	Quantity int
}

func (s *OrderService) Create(ctx context.Context, input CreateOrderInput) (*model.Order, error) {
	if len(input.Items) == 0 {
		return nil, fmt.Errorf("order must have at least one item")
	}
	if input.DeliveryAddress == "" {
		return nil, fmt.Errorf("delivery address is required")
	}
	if input.DeliveryPhone == "" {
		return nil, fmt.Errorf("delivery phone is required")
	}

	userID := input.UserID
	if userID != nil {
		u, err := s.userRepo.FindUserByID(ctx, userID.String())
		if err != nil || u == nil {
			userID = nil
		}
	}

	foodIDs := make([]uuid.UUID, len(input.Items))
	for i, item := range input.Items {
		foodIDs[i] = item.FoodID
	}

	foods, err := s.foodRepo.GetByIDs(ctx, foodIDs)
	if err != nil {
		return nil, fmt.Errorf("fetch foods: %w", err)
	}

	var subtotal float64
	orderItems := make([]model.OrderItem, 0, len(input.Items))

	for _, item := range input.Items {
		food, ok := foods[item.FoodID]
		if !ok {
			return nil, fmt.Errorf("food not found: %s", item.FoodID)
		}
		if !food.IsAvailable {
			return nil, fmt.Errorf("food not available: %s", food.Name)
		}
		if item.Quantity < 1 {
			item.Quantity = 1
		}
		totalPrice := food.Price * float64(item.Quantity)
		subtotal += totalPrice

		orderItems = append(orderItems, model.OrderItem{
			FoodID:     food.ID,
			FoodName:   food.Name,
			Quantity:   item.Quantity,
			UnitPrice:  food.Price,
			TotalPrice: totalPrice,
		})
	}

	deliveryFee := 10.0
	total := subtotal + deliveryFee

	order := &model.Order{
		UserID:          userID,
		RestaurantID:    input.RestaurantID,
		Subtotal:        subtotal,
		DeliveryFee:     deliveryFee,
		Total:           total,
		DeliveryAddress: input.DeliveryAddress,
		DeliveryPhone:   input.DeliveryPhone,
		Note:            input.Note,
	}

	var createErr error
	order, createErr = s.orderRepo.Create(ctx, order, orderItems)
	if createErr != nil {
		return nil, createErr
	}

	if s.sseHub != nil {
		s.sseHub.Broadcast(sse.Event{
			Type:    "new_order",
			OrderID: order.ID.String(),
			Total:   fmt.Sprintf("%.0f", order.Total),
		})
	}

	if s.telegram != nil {
		go func() {
			var chatIDs []int64

			if s.telegramRepo != nil {
				subs, err := s.telegramRepo.ListAll(context.Background())
				if err == nil {
					for _, sub := range subs {
						chatIDs = append(chatIDs, sub.ChatID)
					}
				}
			}

			if len(chatIDs) == 0 && s.telegramChatID != "" {
				id, err := strconv.ParseInt(s.telegramChatID, 10, 64)
				if err == nil {
					chatIDs = append(chatIDs, id)
				}
			}

			if len(chatIDs) > 0 {
				itemsStr := ""
				for _, item := range orderItems {
					itemsStr += fmt.Sprintf("  • %s x%d — %.0f TJS\n", item.FoodName, item.Quantity, item.TotalPrice)
				}
				noteStr := ""
				if input.Note != nil {
					noteStr = *input.Note
				}
				adminURL := s.frontendURL
				if adminURL == "" {
					adminURL = "http://localhost:3000"
				}
				s.telegram.SendNewOrder(chatIDs, order.ID.String(), fmt.Sprintf("%.0f", order.Total),
					itemsStr, input.DeliveryAddress, input.DeliveryPhone, noteStr, adminURL)
			}
		}()
	}

	return order, nil
}

func (s *OrderService) GetByID(ctx context.Context, id string) (*model.Order, error) {
	return s.orderRepo.GetByID(ctx, id)
}

func (s *OrderService) ListByUser(ctx context.Context, userID string, status string, page, limit int) ([]model.Order, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}
	return s.orderRepo.ListOrders(ctx, repository.OrderListFilter{
		UserID: userID,
		Status: status,
		Limit:  limit,
		Offset: (page - 1) * limit,
	})
}

func (s *OrderService) ListAll(ctx context.Context, status string, page, limit int) ([]model.Order, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}
	return s.orderRepo.ListOrders(ctx, repository.OrderListFilter{
		Status: status,
		Limit:  limit,
		Offset: (page - 1) * limit,
	})
}

func (s *OrderService) UpdateStatus(ctx context.Context, id string, newStatus string) error {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get order: %w", err)
	}

	allowed, ok := model.AllowedTransitions[order.Status]
	if !ok {
		return fmt.Errorf("unknown current status: %s", order.Status)
	}

	valid := false
	for _, s := range allowed {
		if s == newStatus {
			valid = true
			break
		}
	}
	if !valid {
		return fmt.Errorf("cannot transition from %s to %s", order.Status, newStatus)
	}

	return s.orderRepo.UpdateStatus(ctx, id, newStatus)
}

func (s *OrderService) AssignCourier(ctx context.Context, orderID string, courierID uuid.UUID) error {
	if err := s.orderRepo.AssignCourier(ctx, orderID, courierID); err != nil {
		return err
	}

	if s.courierHub != nil {
		courier, err := s.courierRepo.GetByID(ctx, courierID.String())
		if err == nil {
			order, err := s.orderRepo.GetByID(ctx, orderID)
			if err == nil {
				s.courierHub.SendToCourier(courier.UserID.String(), sse.Event{
					Type:         "order_assigned",
					OrderID:      orderID,
					Restaurant:   order.RestaurantName,
					CustomerName: order.CustomerName,
					Total:        fmt.Sprintf("%.0f", order.Total),
				})
			}
		}
	}

	return nil
}

func (s *OrderService) ListByCourier(ctx context.Context, userID string, status string, page, limit int) ([]model.Order, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}

	courier, err := s.courierRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, 0, fmt.Errorf("get courier: %w", err)
	}

	return s.orderRepo.ListOrders(ctx, repository.OrderListFilter{
		CourierID: courier.ID.String(),
		Status:    status,
		Limit:     limit,
		Offset:    (page - 1) * limit,
	})
}
