package expense

import "errors"

var (
	ErrExpenseNotFound    = errors.New("expense not found")
	ErrEmptyDescription   = errors.New("description cannot be empty")
	ErrInvalidAmount      = errors.New("amount_cents must be positive")
	ErrInvalidDate        = errors.New("date is required")
	ErrInvalidInstallments = errors.New("installments_count must be >= 2")
)
