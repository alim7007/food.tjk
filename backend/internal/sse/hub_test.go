package sse

import (
	"encoding/json"
	"testing"
	"time"
)

func TestHubSubscribeBroadcast(t *testing.T) {
	hub := NewHub()
	ch := hub.Subscribe()

	hub.Broadcast(Event{Type: "new_order", OrderID: "abc", Total: "50"})

	select {
	case data := <-ch:
		var ev Event
		if err := json.Unmarshal(data, &ev); err != nil {
			t.Fatalf("unmarshal: %v", err)
		}
		if ev.Type != "new_order" {
			t.Errorf("type = %s, want new_order", ev.Type)
		}
		if ev.OrderID != "abc" {
			t.Errorf("orderID = %s, want abc", ev.OrderID)
		}
		if ev.Total != "50" {
			t.Errorf("total = %s, want 50", ev.Total)
		}
	case <-time.After(time.Second):
		t.Fatal("timeout waiting for event")
	}

	hub.Unsubscribe(ch)
	_, ok := <-ch
	if ok {
		t.Error("channel should be closed after unsubscribe")
	}
}

func TestHubMultipleSubscribers(t *testing.T) {
	hub := NewHub()
	ch1 := hub.Subscribe()
	ch2 := hub.Subscribe()

	hub.Broadcast(Event{Type: "new_order", OrderID: "x"})

	for i, ch := range []chan []byte{ch1, ch2} {
		select {
		case <-ch:
		default:
			t.Errorf("subscriber %d did not receive event", i)
		}
	}

	hub.Unsubscribe(ch1)
	hub.Unsubscribe(ch2)
}

func TestHubBroadcastNoSubscribers(t *testing.T) {
	hub := NewHub()
	hub.Broadcast(Event{Type: "new_order"})
}

func TestHubChannelFull(t *testing.T) {
	hub := NewHub()
	ch := hub.Subscribe()

	for i := 0; i < 20; i++ {
		hub.Broadcast(Event{Type: "new_order", OrderID: "x"})
	}

	count := 0
	for {
		select {
		case <-ch:
			count++
		default:
			goto done
		}
	}
done:
	if count < 16 {
		t.Errorf("expected at least 16 events in buffer, got %d", count)
	}

	hub.Unsubscribe(ch)
}
