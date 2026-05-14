package goal

import "errors"

var (
	ErrGoalNotFound       = errors.New("goal not found")
	ErrEmptyName          = errors.New("name cannot be empty")
	ErrInvalidTargetAmount = errors.New("target_amount_cents must be positive")
	ErrNegativeContribution = errors.New("contribution amount must be positive")
)
