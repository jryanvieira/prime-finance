package expense

import (
	"time"

	"github.com/google/uuid"
)

// Expense is the aggregate root representing a financial expense.
type Expense struct {
	ID              string
	UserID          string
	PaymentMethodID *string
	Date            string
	Description     string
	AmountCents     int64
	Category        *string

	// Installment info (nil/zero for single expenses)
	InstallmentGroupID *string
	InstallmentsCount  *int
	InstallmentIndex   *int
	MonthlyAmountCents *int64
	TotalAmountCents   *int64

	CreatedAt time.Time
	UpdatedAt time.Time
}

// NewExpense creates a single (non-installment) expense with validations.
func NewExpense(userID string, paymentMethodID *string, date, description string, amountCents int64, category *string) (*Expense, error) {
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
	return &Expense{
		ID:              uuid.NewString(),
		UserID:          userID,
		PaymentMethodID: paymentMethodID,
		Date:            date,
		Description:     description,
		AmountCents:     amountCents,
		Category:        category,
		CreatedAt:       now,
		UpdatedAt:       now,
	}, nil
}

// NewInstallmentExpense creates a single installment entry within a group.
func NewInstallmentExpense(
	userID string,
	paymentMethodID *string,
	date, description string,
	amountCents int64,
	category *string,
	groupID string,
	count, index int,
	monthlyCents, totalCents int64,
) (*Expense, error) {
	if description == "" {
		return nil, ErrEmptyDescription
	}
	if amountCents <= 0 {
		return nil, ErrInvalidAmount
	}
	if count < 2 {
		return nil, ErrInvalidInstallments
	}

	now := time.Now().UTC()
	return &Expense{
		ID:                 uuid.NewString(),
		UserID:             userID,
		PaymentMethodID:    paymentMethodID,
		Date:               date,
		Description:        description,
		AmountCents:        amountCents,
		Category:           category,
		InstallmentGroupID: &groupID,
		InstallmentsCount:  &count,
		InstallmentIndex:   &index,
		MonthlyAmountCents: &monthlyCents,
		TotalAmountCents:   &totalCents,
		CreatedAt:          now,
		UpdatedAt:          now,
	}, nil
}

// Update modifies expense fields with validation.
func (e *Expense) Update(paymentMethodID *string, date, description string, amountCents int64, category *string) error {
	if description == "" {
		return ErrEmptyDescription
	}
	if amountCents <= 0 {
		return ErrInvalidAmount
	}
	if date == "" {
		return ErrInvalidDate
	}
	e.PaymentMethodID = paymentMethodID
	e.Date = date
	e.Description = description
	e.AmountCents = amountCents
	e.Category = category
	e.UpdatedAt = time.Now().UTC()
	return nil
}
