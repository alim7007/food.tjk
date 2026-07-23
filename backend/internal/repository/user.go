package repository

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"nexara.food/internal/model"
)

type UserRepository interface {
	CreateUser(ctx context.Context, email, passwordHash, name string, phone, address *string, role model.UserRole) (*model.User, error)
	FindUserByEmail(ctx context.Context, email string) (*model.User, error)
	FindUserByID(ctx context.Context, id string) (*model.User, error)
	SaveRefreshToken(ctx context.Context, userID string, token string, expiresAt time.Time) error
	FindRefreshTokenByHash(ctx context.Context, tokenHash string) (*model.RefreshToken, error)
	DeleteRefreshToken(ctx context.Context, tokenHash string) error
}

type UserRepo struct {
	pool *pgxpool.Pool
}

func NewUserRepo(pool *pgxpool.Pool) *UserRepo {
	return &UserRepo{pool: pool}
}

func (r *UserRepo) CreateUser(ctx context.Context, email, passwordHash, name string, phone, address *string, role model.UserRole) (*model.User, error) {
	var user model.User
	err := r.pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, name, phone, address, role)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, email, name, phone, address, role, is_active, created_at, updated_at`,
		email, passwordHash, name, phone, address, role,
	).Scan(&user.ID, &user.Email, &user.Name, &user.Phone, &user.Address, &user.Role, &user.IsActive, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	return &user, nil
}

func (r *UserRepo) FindUserByEmail(ctx context.Context, email string) (*model.User, error) {
	var user model.User
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, name, phone, address, role, is_active, created_at, updated_at
		 FROM users WHERE email = $1`, email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.Phone, &user.Address, &user.Role, &user.IsActive, &user.CreatedAt, &user.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("find user by email: %w", err)
	}
	return &user, nil
}

func (r *UserRepo) FindUserByID(ctx context.Context, id string) (*model.User, error) {
	var user model.User
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, name, phone, address, role, is_active, created_at, updated_at
		 FROM users WHERE id = $1`, id,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.Phone, &user.Address, &user.Role, &user.IsActive, &user.CreatedAt, &user.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("find user by id: %w", err)
	}
	return &user, nil
}

func (r *UserRepo) SaveRefreshToken(ctx context.Context, userID string, token string, expiresAt time.Time) error {
	tokenHash := hashToken(token)
	_, err := r.pool.Exec(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		userID, tokenHash, expiresAt,
	)
	if err != nil {
		return fmt.Errorf("save refresh token: %w", err)
	}
	return nil
}

func (r *UserRepo) FindRefreshTokenByHash(ctx context.Context, tokenHash string) (*model.RefreshToken, error) {
	var rt model.RefreshToken
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, token_hash, expires_at, created_at FROM refresh_tokens WHERE token_hash = $1`,
		tokenHash,
	).Scan(&rt.ID, &rt.UserID, &rt.TokenHash, &rt.ExpiresAt, &rt.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("find refresh token: %w", err)
	}
	return &rt, nil
}

func (r *UserRepo) DeleteRefreshToken(ctx context.Context, tokenHash string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM refresh_tokens WHERE token_hash = $1`, tokenHash)
	if err != nil {
		return fmt.Errorf("delete refresh token: %w", err)
	}
	return nil
}

func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}
