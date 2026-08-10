package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"nexara.food/internal/model"
)

type TelegramSubscriberRepository interface {
	Upsert(ctx context.Context, sub model.TelegramSubscriber) error
	ListAll(ctx context.Context) ([]model.TelegramSubscriber, error)
}

type TelegramSubscriberRepo struct {
	pool *pgxpool.Pool
}

func NewTelegramSubscriberRepo(pool *pgxpool.Pool) *TelegramSubscriberRepo {
	return &TelegramSubscriberRepo{pool: pool}
}

func (r *TelegramSubscriberRepo) Upsert(ctx context.Context, sub model.TelegramSubscriber) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO telegram_subscribers (chat_id, username, first_name)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (chat_id) DO UPDATE SET username = $2, first_name = $3`,
		sub.ChatID, sub.Username, sub.FirstName,
	)
	if err != nil {
		return fmt.Errorf("upsert telegram subscriber: %w", err)
	}
	return nil
}

func (r *TelegramSubscriberRepo) ListAll(ctx context.Context) ([]model.TelegramSubscriber, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, chat_id, username, first_name, subscribed_at
		 FROM telegram_subscribers ORDER BY subscribed_at DESC`,
	)
	if err != nil {
		return nil, fmt.Errorf("list telegram subscribers: %w", err)
	}
	defer rows.Close()

	var subs []model.TelegramSubscriber
	for rows.Next() {
		var s model.TelegramSubscriber
		if err := rows.Scan(&s.ID, &s.ChatID, &s.Username, &s.FirstName, &s.SubscribedAt); err != nil {
			return nil, fmt.Errorf("scan subscriber: %w", err)
		}
		subs = append(subs, s)
	}
	if subs == nil {
		subs = []model.TelegramSubscriber{}
	}
	return subs, rows.Err()
}
