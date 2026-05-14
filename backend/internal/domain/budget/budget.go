package budget

import (
	"time"

	"github.com/google/uuid"
)

type Budget struct {
	ID          string
	UserID      string
	CategoryID  string
	Month       string // YYYY-MM
	AmountCents int64
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func NewBudget(userID, categoryID, month string, amountCents int64) (*Budget, error) {
	if categoryID == "" {
		return nil, ErrEmptyCategoryID
	}
	if month == "" {
		return nil, ErrEmptyMonth
	}
	if amountCents <= 0 {
		return nil, ErrInvalidAmount
	}

	now := time.Now().UTC()
	return &Budget{
		ID:          uuid.NewString(),
		UserID:      userID,
		CategoryID:  categoryID,
		Month:       month,
		AmountCents: amountCents,
		CreatedAt:   now,
		UpdatedAt:   now,
	}, nil
}
