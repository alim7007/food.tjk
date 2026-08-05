// Package sse provides an in-memory Server-Sent Events hub for real-time notifications.
// This hub is safe for a single backend instance. If the backend is scaled to multiple
// instances, replace this with Redis Pub/Sub or another shared broker.
package sse

import (
	"encoding/json"
	"log/slog"
	"sync"
)

type Event struct {
	Type         string `json:"type"`
	OrderID      string `json:"order_id,omitempty"`
	Restaurant   string `json:"restaurant,omitempty"`
	CustomerName string `json:"customer_name,omitempty"`
	Total        string `json:"total,omitempty"`
}

type Hub struct {
	mu          sync.RWMutex
	subscribers map[chan []byte]struct{}
}

func NewHub() *Hub {
	return &Hub{
		subscribers: make(map[chan []byte]struct{}),
	}
}

func (h *Hub) Subscribe() chan []byte {
	ch := make(chan []byte, 16)
	h.mu.Lock()
	h.subscribers[ch] = struct{}{}
	h.mu.Unlock()
	return ch
}

func (h *Hub) Unsubscribe(ch chan []byte) {
	h.mu.Lock()
	delete(h.subscribers, ch)
	h.mu.Unlock()
	close(ch)
}

func (h *Hub) Broadcast(event Event) {
	data, err := json.Marshal(event)
	if err != nil {
		slog.Error("sse marshal event", "error", err)
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.subscribers {
		select {
		case ch <- data:
		default:
		}
	}
}
