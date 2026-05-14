package budget

import "errors"

var (
	ErrBudgetNotFound  = errors.New("budget not found")
	ErrEmptyCategoryID = errors.New("category_id cannot be empty")
	ErrEmptyMonth      = errors.New("month cannot be empty")
	ErrInvalidAmount   = errors.New("amount must be positive")
)
