package recurringexpense

import (
	"time"

	"github.com/google/uuid"
)

// RecurringExpense is the aggregate root representing a recurring monthly expense.
type RecurringExpense struct {
	ID              string
	UserID          string
	PaymentMethodID *string
	StartMonth      string
	DayOfMonth      int
	Description     string
	AmountCents     int64
	Category        *string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// NewRecurringExpense creates a new RecurringExpense entity.
func NewRecurringExpense(userID string, paymentMethodID *string, startMonth string, dayOfMonth int, description string, amountCents int64, category *string) (*RecurringExpense, error) {
	if description == "" {
		return nil, ErrEmptyDescription
	}
	if amountCents <= 0 {
		return nil, ErrInvalidAmount
	}
	if dayOfMonth < 1 || dayOfMonth > 31 {
		return nil, ErrInvalidDay
	}

	now := time.Now().UTC()
	return &RecurringExpense{
		ID:              uuid.NewString(),
		UserID:          userID,
		PaymentMethodID: paymentMethodID,
		StartMonth:      startMonth,
		DayOfMonth:      dayOfMonth,
		Description:     description,
		AmountCents:     amountCents,
		Category:        category,
		CreatedAt:       now,
		UpdatedAt:       now,
	}, nil
}

// Update modifies recurring expense fields.
func (re *RecurringExpense) Update(paymentMethodID *string, startMonth string, dayOfMonth int, description string, amountCents int64, category *string) error {
	if description == "" {
		return ErrEmptyDescription
	}
	if amountCents <= 0 {
		return ErrInvalidAmount
	}
	if dayOfMonth < 1 || dayOfMonth > 31 {
		return ErrInvalidDay
	}
	re.PaymentMethodID = paymentMethodID
	re.StartMonth = startMonth
	re.DayOfMonth = dayOfMonth
	re.Description = description
	re.AmountCents = amountCents
	re.Category = category
	re.UpdatedAt = time.Now().UTC()
	return nil
}
