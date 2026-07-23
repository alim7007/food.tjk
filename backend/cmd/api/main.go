package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"nexara.food/internal/config"
	"nexara.food/internal/database"
	"nexara.food/internal/server"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	ctx := context.Background()

	pool, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	slog.Info("database connected")

	readTimeout, _ := time.ParseDuration(cfg.ReadTimeout)
	writeTimeout, _ := time.ParseDuration(cfg.WriteTimeout)

	router := server.NewRouter(pool, cfg)

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.ServerPort),
		Handler:      router,
		ReadTimeout:  readTimeout,
		WriteTimeout: writeTimeout,
	}

	slog.Info("server starting", "port", cfg.ServerPort)

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server listen error", "error", err)
			os.Exit(1)
		}
	}()

	if err := server.Graceful(ctx, srv, 10*time.Second); err != nil {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}
}
