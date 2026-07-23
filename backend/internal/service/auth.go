package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"

	"nexara.food/internal/config"
	"nexara.food/internal/model"
	"nexara.food/internal/pkg/jwt"
	"nexara.food/internal/repository"
)

type AuthService struct {
	userRepo    repository.UserRepository
	courierRepo repository.CourierRepository
	cfg         config.Config
}

func NewAuthService(userRepo repository.UserRepository, courierRepo repository.CourierRepository, cfg config.Config) *AuthService {
	return &AuthService{userRepo: userRepo, courierRepo: courierRepo, cfg: cfg}
}

type RegisterInput struct {
	Email    string
	Password string
	Name     string
	Phone    *string
	Address  *string
	Role     model.UserRole
}

type AuthTokens struct {
	AccessToken  string
	RefreshToken string
}

func (s *AuthService) Register(ctx context.Context, input RegisterInput) (*model.User, *AuthTokens, error) {
	existing, err := s.userRepo.FindUserByEmail(ctx, input.Email)
	if err != nil {
		return nil, nil, fmt.Errorf("check existing user: %w", err)
	}
	if existing != nil {
		return nil, nil, fmt.Errorf("email already registered")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), s.cfg.BcryptCost)
	if err != nil {
		return nil, nil, fmt.Errorf("hash password: %w", err)
	}

	user, err := s.userRepo.CreateUser(ctx, input.Email, string(hash), input.Name, input.Phone, input.Address, input.Role)
	if err != nil {
		return nil, nil, fmt.Errorf("create user: %w", err)
	}

	if input.Role == model.RoleCourier {
		phone := ""
		if input.Phone != nil {
			phone = *input.Phone
		}
		if _, err := s.courierRepo.Create(ctx, user.ID.String(), input.Name, phone); err != nil {
			return nil, nil, fmt.Errorf("create courier: %w", err)
		}
	}

	tokens, err := s.generateTokens(ctx, user)
	if err != nil {
		return nil, nil, err
	}
	return user, tokens, nil
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*model.User, *AuthTokens, error) {
	user, err := s.userRepo.FindUserByEmail(ctx, email)
	if err != nil {
		return nil, nil, fmt.Errorf("find user: %w", err)
	}
	if user == nil {
		return nil, nil, fmt.Errorf("invalid email or password")
	}
	if !user.IsActive {
		return nil, nil, fmt.Errorf("account is deactivated")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, nil, fmt.Errorf("invalid email or password")
	}
	tokens, err := s.generateTokens(ctx, user)
	if err != nil {
		return nil, nil, err
	}
	return user, tokens, nil
}

func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (*AuthTokens, error) {
	tokenHash := hashToken(refreshToken)
	stored, err := s.userRepo.FindRefreshTokenByHash(ctx, tokenHash)
	if err != nil {
		return nil, fmt.Errorf("find refresh token: %w", err)
	}
	if stored == nil {
		return nil, fmt.Errorf("invalid refresh token")
	}
	if time.Now().After(stored.ExpiresAt) {
		return nil, fmt.Errorf("refresh token expired")
	}
	if err := s.userRepo.DeleteRefreshToken(ctx, tokenHash); err != nil {
		return nil, fmt.Errorf("delete old refresh token: %w", err)
	}
	user, err := s.userRepo.FindUserByID(ctx, stored.UserID.String())
	if err != nil {
		return nil, fmt.Errorf("find user: %w", err)
	}
	if user == nil || !user.IsActive {
		return nil, fmt.Errorf("user not found or deactivated")
	}
	return s.generateTokens(ctx, user)
}

func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	return s.userRepo.DeleteRefreshToken(ctx, hashToken(refreshToken))
}

func (s *AuthService) generateTokens(ctx context.Context, user *model.User) (*AuthTokens, error) {
	accessToken, err := jwt.GenerateAccessToken(user.ID, user.Role, s.cfg.JWTSecret, s.cfg.JWTExpiryMinutes)
	if err != nil {
		return nil, fmt.Errorf("generate access token: %w", err)
	}
	refreshToken, err := jwt.GenerateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("generate refresh token: %w", err)
	}
	expiry := time.Now().Add(time.Duration(s.cfg.JWTRefreshExpiryDays) * 24 * time.Hour)
	if err := s.userRepo.SaveRefreshToken(ctx, user.ID.String(), refreshToken, expiry); err != nil {
		return nil, fmt.Errorf("save refresh token: %w", err)
	}
	return &AuthTokens{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}

func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}
