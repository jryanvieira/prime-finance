package income

import (
	"time"

	"github.com/google/uuid"
)

// Income is the aggregate root representing a financial income entry.
type Income struct {
	ID          string
	UserID      string
	Date        string
	Description string
	AmountCents int64
	Category    *string
	IsRecurring bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// NewIncome creates a new Income entity with validations.
func NewIncome(userID, date, description string, amountCents int64, category *string, isRecurring bool) (*Income, error) {
	if description == "" {
		return nil, ErrEmptyDescription
	}
	if amountCents <= 0 {
		return nil, ErrInvalidAmount
	}
	if date == "" {
		return nil, ErrInvalidDate
	}

	now := time.Now().UTC()
	return &Income{
		ID:          uuid.NewString(),
		UserID:      userID,
		Date:        date,
		Description: description,
		AmountCents: amountCents,
		Category:    category,
		IsRecurring: isRecurring,
		CreatedAt:   now,
		UpdatedAt:   now,
	}, nil
}

// Update modifies income fields with validation.
func (i *Income) Update(date, description string, amountCents int64, category *string, isRecurring bool) error {
	if description == "" {
		return ErrEmptyDescription
	}
	if amountCents <= 0 {
		return ErrInvalidAmount
	}
	if date == "" {
		return ErrInvalidDate
	}
	i.Date = date
	i.Description = description
	i.AmountCents = amountCents
	i.Category = category
	i.IsRecurring = isRecurring
	i.UpdatedAt = time.Now().UTC()
	return nil
}
