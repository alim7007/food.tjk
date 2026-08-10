package notify

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

type Telegram struct {
	BotToken string
	baseURL  string
	client   *http.Client
}

func NewTelegram(botToken string) *Telegram {
	if botToken == "" {
		return nil
	}
	return &Telegram{
		BotToken: botToken,
		baseURL:  "https://api.telegram.org",
		client:   &http.Client{Timeout: 10 * time.Second},
	}
}

func newTelegramWithClient(botToken, baseURL string, client *http.Client) *Telegram {
	return &Telegram{
		BotToken: botToken,
		baseURL:  baseURL,
		client:   client,
	}
}

func (t *Telegram) SendNewOrder(chatIDs []int64, orderID, total, items, address, phone, note, adminURL string) {
	for _, chatID := range chatIDs {
		go t.send(chatID, orderID, total, items, address, phone, note, adminURL)
	}
}

func (t *Telegram) send(chatID int64, orderID, total, items, address, phone, note, adminURL string) {
	shortID := orderID
	if len(shortID) > 8 {
		shortID = shortID[:8]
	}
	text := fmt.Sprintf("🔔 *Новый заказ* #%s\n\n", shortID)
	text += fmt.Sprintf("🍽 *Состав:*\n%s\n", items)
	text += fmt.Sprintf("💰 *Сумма:* %s TJS\n", total)
	text += fmt.Sprintf("📍 *Адрес:* %s\n", address)
	text += fmt.Sprintf("📞 *Телефон:* %s\n", phone)
	if note != "" {
		text += fmt.Sprintf("📝 *Заметка:* %s\n", note)
	}
	text += fmt.Sprintf("\n[📋 Открыть заказ](%s/admin/orders/%s)", adminURL, orderID)

	body := map[string]interface{}{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": "Markdown",
	}
	data, _ := json.Marshal(body)

	url := fmt.Sprintf("%s/bot%s/sendMessage", t.baseURL, t.BotToken)
	resp, err := t.client.Post(url, "application/json", bytes.NewReader(data))
	if err != nil {
		slog.Error("telegram send failed", "chat_id", chatID, "error", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		slog.Error("telegram send non-200", "chat_id", chatID, "status", resp.StatusCode)
	}
}

func (t *Telegram) SetWebhook(webhookURL string) error {
	url := fmt.Sprintf("%s/bot%s/setWebhook?url=%s", t.baseURL, t.BotToken, webhookURL)
	resp, err := t.client.Get(url)
	if err != nil {
		return fmt.Errorf("set webhook: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("set webhook returned %d", resp.StatusCode)
	}
	return nil
}
