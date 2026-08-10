package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-playground/validator/v10"

	"nexara.food/internal/dto"
	"nexara.food/internal/model"
	"nexara.food/internal/service"
)

type AuthHandler struct {
	svc          *service.AuthService
	validate     *validator.Validate
	secureCookie bool
}

func NewAuthHandler(svc *service.AuthService, secureCookie bool) *AuthHandler {
	return &AuthHandler{svc: svc, validate: NewValidator(), secureCookie: secureCookie}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req dto.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", "invalid request body")
		return
	}

	req.Email = sanitize(req.Email)
	req.Name = sanitize(req.Name)
	req.Phone = sanitize(req.Phone)
	req.Address = sanitize(req.Address)

	if err := h.validate.Struct(req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", formatValidationError(err))
		return
	}

	var phone, address *string
	if req.Phone != "" {
		phone = &req.Phone
	}
	if req.Address != "" {
		address = &req.Address
	}

	input := service.RegisterInput{
		Email:    req.Email,
		Password: req.Password,
		Name:     req.Name,
		Phone:    phone,
		Address:  address,
		Role:     model.UserRole(req.Role),
	}

	user, tokens, err := h.svc.Register(r.Context(), input)
	if err != nil {
		slog.Error("register", "error", err)
		msg := err.Error()
		if strings.Contains(msg, "already registered") {
			writeError(w, http.StatusConflict, "CONFLICT", msg)
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to register")
		return
	}

	h.setAuthCookie(w, tokens.AccessToken)

	writeJSON(w, http.StatusCreated, dto.RegisterResponse{
		UserID:       user.ID.String(),
		Email:        user.Email,
		Name:         user.Name,
		Role:         string(user.Role),
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req dto.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", "invalid request body")
		return
	}

	req.Email = sanitize(req.Email)

	if err := h.validate.Struct(req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", formatValidationError(err))
		return
	}

	user, tokens, err := h.svc.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		slog.Error("login", "error", err)
		msg := err.Error()
		if strings.Contains(msg, "invalid email or password") {
			writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", msg)
			return
		}
		if strings.Contains(msg, "deactivated") {
			writeError(w, http.StatusForbidden, "FORBIDDEN", msg)
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to login")
		return
	}

	h.setAuthCookie(w, tokens.AccessToken)

	writeJSON(w, http.StatusOK, dto.LoginResponse{
		UserID:       user.ID.String(),
		Email:        user.Email,
		Name:         user.Name,
		Role:         string(user.Role),
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
	})
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req dto.RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", "invalid request body")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", formatValidationError(err))
		return
	}

	tokens, err := h.svc.Refresh(r.Context(), req.RefreshToken)
	if err != nil {
		slog.Error("refresh token", "error", err)
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "invalid or expired refresh token")
		return
	}

	h.setAuthCookie(w, tokens.AccessToken)

	writeJSON(w, http.StatusOK, dto.RefreshResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
	})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req dto.LogoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", "invalid request body")
		return
	}
	if err := h.validate.Struct(req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", formatValidationError(err))
		return
	}

	if err := h.svc.Logout(r.Context(), req.RefreshToken); err != nil {
		slog.Error("logout", "error", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to logout")
		return
	}

	clearAuthCookie(w)
	writeJSON(w, http.StatusOK, map[string]string{"message": "logged out"})
}

func (h *AuthHandler) setAuthCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    token,
		HttpOnly: true,
		Secure:   h.secureCookie,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   3600,
	})
}

func clearAuthCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    "",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   -1,
	})
}
