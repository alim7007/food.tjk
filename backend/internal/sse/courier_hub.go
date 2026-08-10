package sse

import (
	"encoding/json"
	"log/slog"
	"sync"
)

type CourierHub struct {
	mu          sync.RWMutex
	subscribers map[string]map[chan []byte]struct{}
}

func NewCourierHub() *CourierHub {
	return &CourierHub{
		subscribers: make(map[string]map[chan []byte]struct{}),
	}
}

func (h *CourierHub) Subscribe(courierID string) chan []byte {
	ch := make(chan []byte, 16)
	h.mu.Lock()
	if h.subscribers[courierID] == nil {
		h.subscribers[courierID] = make(map[chan []byte]struct{})
	}
	h.subscribers[courierID][ch] = struct{}{}
	h.mu.Unlock()
	return ch
}

func (h *CourierHub) Unsubscribe(courierID string, ch chan []byte) {
	h.mu.Lock()
	if subs, ok := h.subscribers[courierID]; ok {
		delete(subs, ch)
		if len(subs) == 0 {
			delete(h.subscribers, courierID)
		}
	}
	h.mu.Unlock()
	close(ch)
}

func (h *CourierHub) SendToCourier(courierID string, event Event) {
	data, err := json.Marshal(event)
	if err != nil {
		slog.Error("courier sse marshal", "error", err)
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.subscribers[courierID] {
		select {
		case ch <- data:
		default:
		}
	}
}
