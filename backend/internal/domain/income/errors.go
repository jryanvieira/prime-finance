package income

import "errors"

var (
	ErrIncomeNotFound   = errors.New("income not found")
	ErrEmptyDescription = errors.New("description cannot be empty")
	ErrInvalidAmount    = errors.New("amount_cents must be positive")
	ErrInvalidDate      = errors.New("date is required")
)
