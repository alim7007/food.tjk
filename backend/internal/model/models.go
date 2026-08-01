package model

import (
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	RoleCustomer UserRole = "customer"
	RoleCourier  UserRole = "courier"
	RoleAdmin    UserRole = "admin"
)

type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Name         string    `json:"name"`
	Phone        *string   `json:"phone"`
	Address      *string   `json:"address"`
	Role         UserRole  `json:"role"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type RefreshToken struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	TokenHash string    `json:"-"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

type Restaurant struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	ImageURL    *string   `json:"image_url"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Category struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	DisplayOrder int       `json:"display_order"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Food struct {
	ID           uuid.UUID `json:"id"`
	RestaurantID uuid.UUID `json:"restaurant_id"`
	CategoryID   uuid.UUID `json:"category_id"`
	Name         string    `json:"name"`
	Description  *string   `json:"description"`
	Price        float64   `json:"price"`
	ImageURL     *string   `json:"image_url"`
	IsAvailable  bool      `json:"is_available"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Courier struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Name      string    `json:"name"`
	Phone     string    `json:"phone"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Order struct {
	ID               uuid.UUID   `json:"id"`
	UserID           *uuid.UUID  `json:"user_id"`
	RestaurantID     uuid.UUID   `json:"restaurant_id"`
	RestaurantName   string      `json:"restaurant_name"`
	CourierID        *uuid.UUID  `json:"courier_id"`
	CourierName      string      `json:"courier_name"`
	CourierPhone     string      `json:"courier_phone"`
	Subtotal         float64     `json:"subtotal"`
	DeliveryFee      float64     `json:"delivery_fee"`
	Total            float64     `json:"total"`
	Status           string      `json:"status"`
	DeliveryAddress  string      `json:"delivery_address"`
	DeliveryPhone    string      `json:"delivery_phone"`
	Note             *string     `json:"note"`
	Items            []OrderItem `json:"items"`
	CustomerName     string      `json:"customer_name"`
	CustomerPhone    string      `json:"customer_phone"`
	CreatedAt        time.Time   `json:"created_at"`
	UpdatedAt        time.Time   `json:"updated_at"`
}

type OrderItem struct {
	ID         uuid.UUID `json:"id"`
	OrderID    uuid.UUID `json:"order_id"`
	FoodID     uuid.UUID `json:"food_id"`
	FoodName   string    `json:"food_name"`
	Quantity   int       `json:"quantity"`
	UnitPrice  float64   `json:"unit_price"`
	TotalPrice float64   `json:"total_price"`
	CreatedAt  time.Time `json:"created_at"`
}

var ValidOrderStatuses = []string{"pending", "accepted", "delivered", "cancelled"}

var AllowedTransitions = map[string][]string{
	"pending":   {"accepted", "cancelled"},
	"accepted":  {"delivered", "cancelled"},
	"delivered": {},
	"cancelled": {},
}
