package user

import "errors"

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrEmailAlreadyExists = errors.New("email already exists")
	ErrInvalidEmail      = errors.New("invalid email address")
	ErrInvalidPassword   = errors.New("invalid password (min 8 chars)")
	ErrEmptyName         = errors.New("name cannot be empty")
)
