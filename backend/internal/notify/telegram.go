package notify

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Telegram struct {
	BotToken string
	ChatID   string
	client   *http.Client
}

func NewTelegram(botToken, chatID string) *Telegram {
	if botToken == "" || chatID == "" {
		return nil
	}
	return &Telegram{
		BotToken: botToken,
		ChatID:   chatID,
		client:   &http.Client{Timeout: 10 * time.Second},
	}
}

func (t *Telegram) SendNewOrder(orderID, total string) error {
	text := fmt.Sprintf("🔔 *Новый заказ* #%s\n💰 Сумма: %s TJS", orderID[:8], total)
	return t.send(text)
}

func (t *Telegram) send(text string) error {
	body := map[string]string{
		"chat_id":    t.ChatID,
		"text":       text,
		"parse_mode": "Markdown",
	}
	data, _ := json.Marshal(body)

	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", t.BotToken)
	resp, err := t.client.Post(url, "application/json", bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("telegram send: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("telegram returned %d", resp.StatusCode)
	}
	return nil
}
