package sse

import (
	"encoding/json"
	"testing"
	"time"
)

func TestCourierHubSubscribeSend(t *testing.T) {
	hub := NewCourierHub()
	ch := hub.Subscribe("courier-user-1")

	hub.SendToCourier("courier-user-1", Event{
		Type:         "order_assigned",
		OrderID:      "order-123",
		Restaurant:   "Test Restaurant",
		CustomerName: "John",
		Total:        "60",
	})

	select {
	case data := <-ch:
		var ev Event
		if err := json.Unmarshal(data, &ev); err != nil {
			t.Fatalf("unmarshal: %v", err)
		}
		if ev.Type != "order_assigned" {
			t.Errorf("type = %s, want order_assigned", ev.Type)
		}
		if ev.Restaurant != "Test Restaurant" {
			t.Errorf("restaurant = %s, want Test Restaurant", ev.Restaurant)
		}
	case <-time.After(time.Second):
		t.Fatal("timeout waiting for event")
	}

	hub.Unsubscribe("courier-user-1", ch)
}

func TestCourierHubOnlyTargetedCourier(t *testing.T) {
	hub := NewCourierHub()
	ch1 := hub.Subscribe("courier-1")
	ch2 := hub.Subscribe("courier-2")

	hub.SendToCourier("courier-1", Event{Type: "order_assigned", OrderID: "only-for-1"})

	select {
	case data := <-ch1:
		var ev Event
		json.Unmarshal(data, &ev)
		if ev.OrderID != "only-for-1" {
			t.Errorf("courier-1 got wrong order: %s", ev.OrderID)
		}
	case <-time.After(time.Second):
		t.Fatal("courier-1 should have received event")
	}

	select {
	case <-ch2:
		t.Error("courier-2 should NOT have received event")
	default:
	}

	hub.Unsubscribe("courier-1", ch1)
	hub.Unsubscribe("courier-2", ch2)
}

func TestCourierHubUnsubscribeCleansUp(t *testing.T) {
	hub := NewCourierHub()
	ch := hub.Subscribe("courier-x")
	hub.Unsubscribe("courier-x", ch)

	hub.SendToCourier("courier-x", Event{Type: "order_assigned"})

	hub.mu.RLock()
	_, exists := hub.subscribers["courier-x"]
	hub.mu.RUnlock()

	if exists {
		t.Error("courier-x should be removed from subscribers after unsubscribe")
	}
}

func TestCourierHubSendToNonexistent(t *testing.T) {
	hub := NewCourierHub()
	hub.SendToCourier("nonexistent", Event{Type: "order_assigned"})
}
