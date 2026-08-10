package notify

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

func TestNewTelegramNilOnEmptyToken(t *testing.T) {
	tg := NewTelegram("")
	if tg != nil {
		t.Error("expected nil for empty token")
	}
}

func TestNewTelegramWithToken(t *testing.T) {
	tg := NewTelegram("test-token")
	if tg == nil {
		t.Fatal("expected non-nil for valid token")
	}
	if tg.BotToken != "test-token" {
		t.Errorf("token = %s, want test-token", tg.BotToken)
	}
}

func TestSendNewOrder(t *testing.T) {
	received := make(chan map[string]interface{}, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]interface{}
		json.NewDecoder(r.Body).Decode(&body)
		received <- body
		w.WriteHeader(200)
		w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	tg := newTelegramWithClient("test-token", server.URL, &http.Client{Timeout: 5 * time.Second})

	tg.SendNewOrder([]int64{123456}, "abc-def-gh", "50", "  • Шаурма x2 — 40 TJS\n", "ул. Рудаки", "+992900000001", "без лука", "http://localhost:3000")

	select {
	case body := <-received:
		if body["chat_id"].(float64) != 123456 {
			t.Errorf("chat_id = %v, want 123456", body["chat_id"])
		}
		text := body["text"].(string)
		if text == "" {
			t.Error("text should not be empty")
		}
		if body["parse_mode"] != "Markdown" {
			t.Errorf("parse_mode = %s, want Markdown", body["parse_mode"])
		}
	case <-time.After(3 * time.Second):
		t.Fatal("timeout waiting for HTTP request")
	}
}

func TestSendNewOrderMultipleChats(t *testing.T) {
	var count atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		count.Add(1)
		w.WriteHeader(200)
		w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	tg := newTelegramWithClient("test-token", server.URL, &http.Client{Timeout: 5 * time.Second})

	tg.SendNewOrder([]int64{1, 2, 3}, "order-1", "100", "items", "addr", "phone", "", "http://localhost:3000")

	time.Sleep(500 * time.Millisecond)

	if count.Load() != 3 {
		t.Errorf("expected 3 sends, got %d", count.Load())
	}
}

func TestSetWebhook(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("url") != "https://example.com/webhook" {
			t.Errorf("webhook url mismatch: %s", r.URL.Query().Get("url"))
		}
		w.WriteHeader(200)
		w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	tg := newTelegramWithClient("test-token", server.URL, &http.Client{Timeout: 5 * time.Second})

	err := tg.SetWebhook("https://example.com/webhook")
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestSetWebhookError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(500)
	}))
	defer server.Close()

	tg := newTelegramWithClient("test-token", server.URL, &http.Client{Timeout: 5 * time.Second})

	err := tg.SetWebhook("https://example.com/webhook")
	if err == nil {
		t.Error("expected error for 500 response")
	}
}
