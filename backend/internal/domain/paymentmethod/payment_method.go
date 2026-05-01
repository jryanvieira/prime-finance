package paymentmethod

import (
	"time"

	"github.com/google/uuid"
)

// PaymentMethod represents a payment method owned by a user.
type PaymentMethod struct {
	ID        string
	UserID    string
	Type      string
	Label     string
	Color     string
	CreatedAt time.Time
	UpdatedAt time.Time
}

// NewPaymentMethod creates a new PaymentMethod entity.
func NewPaymentMethod(userID, typ, label, color string) (*PaymentMethod, error) {
	if label == "" {
		return nil, ErrEmptyLabel
	}
	if typ == "" {
		return nil, ErrEmptyType
	}

	now := time.Now().UTC()
	return &PaymentMethod{
		ID:        uuid.NewString(),
		UserID:    userID,
		Type:      typ,
		Label:     label,
		Color:     color,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

// Update modifies payment method fields.
func (pm *PaymentMethod) Update(typ, label, color string) error {
	if label == "" {
		return ErrEmptyLabel
	}
	if typ == "" {
		return ErrEmptyType
	}
	pm.Type = typ
	pm.Label = label
	pm.Color = color
	pm.UpdatedAt = time.Now().UTC()
	return nil
}
