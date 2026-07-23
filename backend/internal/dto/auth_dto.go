package dto

type RegisterRequest struct {
	Email    string `json:"email"    validate:"required,email,max=255"`
	Password string `json:"password" validate:"required,min=8,max=128"`
	Name     string `json:"name"     validate:"required,min=1,max=100"`
	Phone    string `json:"phone"    validate:"phone,max=20"`
	Address  string `json:"address"  validate:"max=500"`
	Role     string `json:"role"     validate:"required,oneof=customer courier admin"`
}

type RegisterResponse struct {
	UserID       string `json:"user_id"`
	Email        string `json:"email"`
	Name         string `json:"name"`
	Role         string `json:"role"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type LoginRequest struct {
	Email    string `json:"email"    validate:"required,email,max=255"`
	Password string `json:"password" validate:"required,max=128"`
}

type LoginResponse struct {
	UserID       string `json:"user_id"`
	Email        string `json:"email"`
	Name         string `json:"name"`
	Role         string `json:"role"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type RefreshResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}
