package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"nexara.food/internal/model"
	"nexara.food/internal/repository"
)

type TelegramWebhookHandler struct {
	repo repository.TelegramSubscriberRepository
}

func NewTelegramWebhookHandler(repo repository.TelegramSubscriberRepository) *TelegramWebhookHandler {
	return &TelegramWebhookHandler{repo: repo}
}

type telegramUpdate struct {
	Message struct {
		Chat struct {
			ID        int64  `json:"id"`
			Username  string `json:"username"`
			FirstName string `json:"first_name"`
		} `json:"chat"`
		Text string `json:"text"`
	} `json:"message"`
}

func (h *TelegramWebhookHandler) Handle(w http.ResponseWriter, r *http.Request) {
	var update telegramUpdate
	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		slog.Error("telegram webhook decode", "error", err)
		w.WriteHeader(http.StatusOK)
		return
	}

	if update.Message.Text != "/start" {
		w.WriteHeader(http.StatusOK)
		return
	}

	sub := model.TelegramSubscriber{
		ChatID: update.Message.Chat.ID,
	}

	if update.Message.Chat.Username != "" {
		sub.Username = &update.Message.Chat.Username
	}
	if update.Message.Chat.FirstName != "" {
		sub.FirstName = &update.Message.Chat.FirstName
	}

	if err := h.repo.Upsert(r.Context(), sub); err != nil {
		slog.Error("telegram webhook upsert", "error", err)
	}

	w.WriteHeader(http.StatusOK)
}
