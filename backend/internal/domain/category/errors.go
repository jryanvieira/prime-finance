package category

import "errors"

var (
	ErrCategoryNotFound = errors.New("category not found")
	ErrEmptyName        = errors.New("name cannot be empty")
	ErrEmptyColor       = errors.New("color cannot be empty")
	ErrInvalidType      = errors.New("type must be expense, income, or both")
)
