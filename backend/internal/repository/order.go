package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"nexara.food/internal/model"
)

type OrderRepository interface {
	Create(ctx context.Context, order *model.Order, items []model.OrderItem) (*model.Order, error)
	GetByID(ctx context.Context, id string) (*model.Order, error)
	ListOrders(ctx context.Context, filter OrderListFilter) ([]model.Order, int, error)
	UpdateStatus(ctx context.Context, id string, status string) error
	AssignCourier(ctx context.Context, orderID string, courierID uuid.UUID) error
}

type OrderListFilter struct {
	UserID    string
	CourierID string
	Status    string
	Limit     int
	Offset    int
}

type OrderRepo struct {
	pool *pgxpool.Pool
}

func NewOrderRepo(pool *pgxpool.Pool) *OrderRepo {
	return &OrderRepo{pool: pool}
}

func (r *OrderRepo) Create(ctx context.Context, order *model.Order, items []model.OrderItem) (*model.Order, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	orderID := uuid.New()

	err = tx.QueryRow(ctx,
		`INSERT INTO orders (id, user_id, restaurant_id, subtotal, delivery_fee, total, status, delivery_address, delivery_phone, note)
		 VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9)
		 RETURNING id, status, subtotal, delivery_fee, total, created_at, updated_at`,
		orderID, order.UserID, order.RestaurantID, order.Subtotal, order.DeliveryFee, order.Total,
		order.DeliveryAddress, order.DeliveryPhone, order.Note,
	).Scan(&order.ID, &order.Status, &order.Subtotal, &order.DeliveryFee, &order.Total, &order.CreatedAt, &order.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert order: %w", err)
	}

	for i := range items {
		items[i].OrderID = order.ID
		_, err := tx.Exec(ctx,
			`INSERT INTO order_items (order_id, food_id, food_name, quantity, unit_price, total_price)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			items[i].OrderID, items[i].FoodID, items[i].FoodName, items[i].Quantity, items[i].UnitPrice, items[i].TotalPrice,
		)
		if err != nil {
			return nil, fmt.Errorf("insert order item: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}
	return order, nil
}

func (r *OrderRepo) GetByID(ctx context.Context, id string) (*model.Order, error) {
	var order model.Order
	var note, courierName, courierPhone *string
	err := r.pool.QueryRow(ctx,
		`SELECT o.id, o.user_id, o.restaurant_id, o.courier_id, o.subtotal, o.delivery_fee, o.total,
				o.status, o.delivery_address, o.delivery_phone, o.note, o.created_at, o.updated_at,
				r.name as restaurant_name,
				COALESCE(u.name, '') as customer_name,
				COALESCE(u.phone, '') as customer_phone,
				c.name as courier_name,
				c.phone as courier_phone
		 FROM orders o
		 JOIN restaurants r ON r.id = o.restaurant_id
		 LEFT JOIN users u ON u.id = o.user_id
		 LEFT JOIN couriers c ON c.id = o.courier_id
		 WHERE o.id = $1`, id,
	).Scan(
		&order.ID, &order.UserID, &order.RestaurantID, &order.CourierID,
		&order.Subtotal, &order.DeliveryFee, &order.Total,
		&order.Status, &order.DeliveryAddress, &order.DeliveryPhone, &note,
		&order.CreatedAt, &order.UpdatedAt,
		&order.RestaurantName, &order.CustomerName, &order.CustomerPhone,
		&courierName, &courierPhone,
	)
	if err != nil {
		return nil, fmt.Errorf("query order: %w", err)
	}
	if note != nil {
		order.Note = note
	}
	if courierName != nil {
		order.CourierName = *courierName
	}
	if courierPhone != nil {
		order.CourierPhone = *courierPhone
	}

	items, err := r.getOrderItems(ctx, order.ID.String())
	if err != nil {
		return nil, err
	}
	order.Items = items
	return &order, nil
}

func (r *OrderRepo) ListOrders(ctx context.Context, filter OrderListFilter) ([]model.Order, int, error) {
	where := "WHERE 1=1"
	args := []any{}
	argIdx := 1

	if filter.UserID != "" {
		where += fmt.Sprintf(" AND o.user_id = $%d", argIdx)
		args = append(args, filter.UserID)
		argIdx++
	}
	if filter.CourierID != "" {
		where += fmt.Sprintf(" AND o.courier_id = $%d", argIdx)
		args = append(args, filter.CourierID)
		argIdx++
	}
	if filter.Status != "" {
		where += fmt.Sprintf(" AND o.status = $%d", argIdx)
		args = append(args, filter.Status)
		argIdx++
	}

	var total int
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM orders o "+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count orders: %w", err)
	}

	query := fmt.Sprintf(
		`SELECT o.id, o.user_id, o.restaurant_id, o.courier_id, o.subtotal, o.delivery_fee, o.total,
				o.status, o.delivery_address, o.delivery_phone, o.note, o.created_at, o.updated_at,
				r.name as restaurant_name,
				COALESCE(u.name, '') as customer_name,
				COALESCE(u.phone, '') as customer_phone,
				COALESCE(c.name, '') as courier_name,
				COALESCE(c.phone, '') as courier_phone
		 FROM orders o
		 JOIN restaurants r ON r.id = o.restaurant_id
		 LEFT JOIN users u ON u.id = o.user_id
		 LEFT JOIN couriers c ON c.id = o.courier_id
		 %s ORDER BY o.created_at DESC LIMIT $%d OFFSET $%d`,
		where, argIdx, argIdx+1,
	)
	args = append(args, filter.Limit, filter.Offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query orders: %w", err)
	}
	defer rows.Close()

	var orders []model.Order
	for rows.Next() {
		var o model.Order
		var note, courierName, courierPhone *string
		if err := rows.Scan(
			&o.ID, &o.UserID, &o.RestaurantID, &o.CourierID,
			&o.Subtotal, &o.DeliveryFee, &o.Total,
			&o.Status, &o.DeliveryAddress, &o.DeliveryPhone, &note,
			&o.CreatedAt, &o.UpdatedAt,
			&o.RestaurantName, &o.CustomerName, &o.CustomerPhone,
			&courierName, &courierPhone,
		); err != nil {
			return nil, 0, fmt.Errorf("scan order: %w", err)
		}
		if note != nil {
			o.Note = note
		}
		if courierName != nil {
			o.CourierName = *courierName
		}
		if courierPhone != nil {
			o.CourierPhone = *courierPhone
		}
		orders = append(orders, o)
	}
	if orders == nil {
		orders = []model.Order{}
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate orders: %w", err)
	}

	if len(orders) > 0 {
		orderIDs := make([]uuid.UUID, len(orders))
		for i, o := range orders {
			orderIDs[i] = o.ID
		}
		itemRows, err := r.pool.Query(ctx,
			`SELECT oi.id, oi.order_id, oi.food_id, oi.food_name, oi.quantity, oi.unit_price, oi.total_price, oi.created_at
			 FROM order_items oi WHERE oi.order_id = ANY($1) ORDER BY oi.created_at ASC`,
			orderIDs,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("query order items batch: %w", err)
		}
		defer itemRows.Close()

		itemsByOrder := make(map[uuid.UUID][]model.OrderItem)
		for itemRows.Next() {
			var item model.OrderItem
			if err := itemRows.Scan(&item.ID, &item.OrderID, &item.FoodID, &item.FoodName, &item.Quantity, &item.UnitPrice, &item.TotalPrice, &item.CreatedAt); err != nil {
				return nil, 0, fmt.Errorf("scan order item: %w", err)
			}
			itemsByOrder[item.OrderID] = append(itemsByOrder[item.OrderID], item)
		}
		for i := range orders {
			orders[i].Items = itemsByOrder[orders[i].ID]
			if orders[i].Items == nil {
				orders[i].Items = []model.OrderItem{}
			}
		}
	}

	return orders, total, nil
}

func (r *OrderRepo) UpdateStatus(ctx context.Context, id string, status string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`, status, id,
	)
	if err != nil {
		return fmt.Errorf("update order status: %w", err)
	}
	return nil
}

func (r *OrderRepo) AssignCourier(ctx context.Context, orderID string, courierID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE orders SET courier_id = $1, updated_at = NOW() WHERE id = $2`,
		courierID, orderID,
	)
	if err != nil {
		return fmt.Errorf("assign courier: %w", err)
	}
	return nil
}

func (r *OrderRepo) getOrderItems(ctx context.Context, orderID string) ([]model.OrderItem, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, order_id, food_id, food_name, quantity, unit_price, total_price, created_at
		 FROM order_items WHERE order_id = $1`, orderID,
	)
	if err != nil {
		return nil, fmt.Errorf("query order items: %w", err)
	}
	defer rows.Close()

	var items []model.OrderItem
	for rows.Next() {
		var item model.OrderItem
		if err := rows.Scan(&item.ID, &item.OrderID, &item.FoodID, &item.FoodName, &item.Quantity, &item.UnitPrice, &item.TotalPrice, &item.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan order item: %w", err)
		}
		items = append(items, item)
	}
	if items == nil {
		items = []model.OrderItem{}
	}
	return items, rows.Err()
}
