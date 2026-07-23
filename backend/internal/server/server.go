package server

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func Graceful(ctx context.Context, srv *http.Server, timeout time.Duration) error {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down server")

	shutdownCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("forced shutdown", "error", err)
		return err
	}

	slog.Info("server stopped")
	return nil
}
