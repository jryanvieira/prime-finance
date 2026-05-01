package recurringexpense

import "errors"

var (
	ErrRecurringExpenseNotFound = errors.New("recurring expense not found")
	ErrEmptyDescription         = errors.New("description cannot be empty")
	ErrInvalidAmount            = errors.New("amount_cents must be positive")
	ErrInvalidDay               = errors.New("day_of_month must be between 1 and 31")
)
