package dto

import "github.com/google/uuid"

type CreateOrderRequest struct {
	RestaurantID    uuid.UUID                `json:"restaurant_id"    validate:"required"`
	Items           []CreateOrderItemRequest `json:"items"            validate:"required,min=1,max=50,dive"`
	DeliveryAddress string                   `json:"delivery_address" validate:"required,min=1,max=500"`
	DeliveryPhone   string                   `json:"delivery_phone"   validate:"required,phone,max=20"`
	Note            *string                  `json:"note"              validate:"omitempty,max=1000"`
}

type CreateOrderItemRequest struct {
	FoodID   uuid.UUID `json:"food_id"  validate:"required"`
	Quantity int       `json:"quantity" validate:"required,min=1,max=99"`
}

type CreateOrderResponse struct {
	OrderID     string  `json:"order_id"`
	Status      string  `json:"status"`
	Subtotal    float64 `json:"subtotal"`
	DeliveryFee float64 `json:"delivery_fee"`
	Total       float64 `json:"total"`
}

type UpdateOrderStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=accepted delivered cancelled"`
}

type AssignCourierRequest struct {
	CourierID uuid.UUID `json:"courier_id" validate:"required"`
}
