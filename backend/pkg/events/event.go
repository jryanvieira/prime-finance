package events

import "time"

// Event represents a generic domain event.
type Event interface {
	EventName() string
	OccurredAt() time.Time
	Payload() interface{}
}

// EventHandler represents a subscriber/handler for a specific event.
type EventHandler interface {
	Handle(event Event) error
}

// EventDispatcher is responsible for registering handlers and dispatching events.
type EventDispatcher interface {
	Register(eventName string, handler EventHandler) error
	Dispatch(event Event) error
}
