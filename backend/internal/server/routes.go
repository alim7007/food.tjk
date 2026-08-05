package server

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"

	"nexara.food/internal/config"
	"nexara.food/internal/handler"
	"nexara.food/internal/pkg/middleware"
	"nexara.food/internal/repository"
	"nexara.food/internal/service"
	"nexara.food/internal/sse"
)

func NewRouter(pool *pgxpool.Pool, cfg config.Config) http.Handler {
	r := chi.NewRouter()

	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOriginList(),
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	userRepo := repository.NewUserRepo(pool)
	restaurantRepo := repository.NewRestaurantRepo(pool)
	categoryRepo := repository.NewCategoryRepo(pool)
	foodRepo := repository.NewFoodRepo(pool)
	orderRepo := repository.NewOrderRepo(pool)
	courierRepo := repository.NewCourierRepo(pool)

	authSvc := service.NewAuthService(userRepo, courierRepo, cfg)
	restaurantSvc := service.NewRestaurantService(restaurantRepo)
	categorySvc := service.NewCategoryService(categoryRepo)
	foodSvc := service.NewFoodService(foodRepo)
	orderSvc := service.NewOrderService(orderRepo, foodRepo, userRepo, courierRepo)
	courierSvc := service.NewCourierService(courierRepo)

	sseHub := sse.NewHub()
	orderSvc.SetSSEHub(sseHub)

	healthH := handler.NewHealthHandler()
	authH := handler.NewAuthHandler(authSvc)
	restaurantH := handler.NewRestaurantHandler(restaurantSvc)
	categoryH := handler.NewCategoryHandler(categorySvc)
	foodH := handler.NewFoodHandler(foodSvc)
	orderH := handler.NewOrderHandler(orderSvc)
	courierH := handler.NewCourierHandler(courierSvc)
	uploadH := handler.NewUploadHandler()
	sseH := handler.NewSSEHandler(sseHub)

	r.Get("/uploads/*", uploadH.ServeUpload)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", healthH.Health)

		r.Get("/restaurants", restaurantH.List)
		r.Get("/restaurants/{id}", restaurantH.GetByID)
		r.Get("/restaurants/{id}/foods", foodH.ListByRestaurant)
		r.Get("/categories", categoryH.List)

		r.Post("/auth/register", authH.Register)
		r.Post("/auth/login", authH.Login)
		r.Post("/auth/refresh", authH.Refresh)
		r.Post("/auth/logout", authH.Logout)

		r.With(middleware.OptionalAuth(cfg.JWTSecret)).Post("/orders", orderH.Create)

		r.Group(func(r chi.Router) {
			r.Use(chimiddleware.Timeout(30 * time.Second))
			r.Use(middleware.RequireAuth(cfg.JWTSecret))

			r.Get("/orders", orderH.ListMyOrders)
			r.Get("/orders/{id}", orderH.GetByID)
		})

		r.Group(func(r chi.Router) {
			r.Use(chimiddleware.Timeout(30 * time.Second))
			r.Use(middleware.RequireAuth(cfg.JWTSecret))
			r.Use(middleware.RequireRole("admin"))

			r.Post("/admin/upload", uploadH.Upload)

			r.Post("/admin/restaurants", restaurantH.Create)
			r.Put("/admin/restaurants/{id}", restaurantH.Update)
			r.Delete("/admin/restaurants/{id}", restaurantH.Delete)

			r.Post("/admin/restaurants/{id}/foods", foodH.Create)
			r.Put("/admin/foods/{foodID}", foodH.Update)
			r.Delete("/admin/foods/{foodID}", foodH.Delete)

			r.Get("/admin/orders", orderH.ListAll)
			r.Put("/admin/orders/{id}/status", orderH.UpdateStatus)
			r.Put("/admin/orders/{id}/assign", orderH.AssignCourier)

			r.Get("/admin/couriers", courierH.ListAll)
			r.Post("/admin/couriers", courierH.Create)
		})

		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireAuth(cfg.JWTSecret))
			r.Use(middleware.RequireRole("admin"))

			r.Get("/admin/orders/events", sseH.OrderEvents)
		})

		r.Group(func(r chi.Router) {
			r.Use(chimiddleware.Timeout(30 * time.Second))
			r.Use(middleware.RequireAuth(cfg.JWTSecret))
			r.Use(middleware.RequireRole("courier"))

			r.Get("/courier/orders", orderH.ListCourierOrders)
		})
	})

	return r
}
