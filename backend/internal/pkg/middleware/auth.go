package middleware

import (
	"context"
	"net/http"
	"strings"

	"nexara.food/internal/pkg/jwt"
)

type contextKey string

const (
	UserIDKey   contextKey = "user_id"
	UserRoleKey contextKey = "user_role"
)

func RequireAuth(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := extractToken(r)
			if token == "" {
				writeUnauthorized(w, "missing auth token")
				return
			}

			claims, err := jwt.ValidateAccessToken(token, secret)
			if err != nil {
				writeUnauthorized(w, "invalid or expired token")
				return
			}

			ctx := r.Context()
			ctx = context.WithValue(ctx, UserIDKey, claims.UserID)
			ctx = context.WithValue(ctx, UserRoleKey, string(claims.Role))
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func OptionalAuth(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := extractToken(r)
			if token == "" {
				next.ServeHTTP(w, r)
				return
			}

			claims, err := jwt.ValidateAccessToken(token, secret)
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}

			ctx := r.Context()
			ctx = context.WithValue(ctx, UserIDKey, claims.UserID)
			ctx = context.WithValue(ctx, UserRoleKey, string(claims.Role))
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireRole(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role, _ := r.Context().Value(UserRoleKey).(string)
			for _, allowed := range roles {
				if role == allowed {
					next.ServeHTTP(w, r)
					return
				}
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			w.Write([]byte(`{"error":{"code":"FORBIDDEN","message":"insufficient permissions"}}`))
		})
	}
}

func extractToken(r *http.Request) string {
	if cookie, err := r.Cookie("access_token"); err == nil {
		return cookie.Value
	}
	header := r.Header.Get("Authorization")
	if strings.HasPrefix(header, "Bearer ") {
		return strings.TrimPrefix(header, "Bearer ")
	}
	return ""
}

func GetUserID(ctx context.Context) string {
	id, _ := ctx.Value(UserIDKey).(string)
	return id
}

func GetUserRole(ctx context.Context) string {
	role, _ := ctx.Value(UserRoleKey).(string)
	return role
}

func writeUnauthorized(w http.ResponseWriter, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	w.Write([]byte(`{"error":{"code":"UNAUTHORIZED","message":"` + msg + `"}}`))
}
