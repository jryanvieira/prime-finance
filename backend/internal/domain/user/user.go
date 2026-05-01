package user

import (
	"time"

	"github.com/google/uuid"
)

// User is the aggregate root representing a system user.
type User struct {
	ID           string
	Name         string
	Email        Email
	PasswordHash string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// PasswordHasher defines how we hash passwords without depending on a specific library in the domain.
type PasswordHasher interface {
	Hash(password string) (string, error)
	Verify(hash, password string) bool
}

// NewUser creates a new User entity. It applies business rules upon creation.
func NewUser(name string, email Email, password string, hasher PasswordHasher) (*User, error) {
	if name == "" {
		return nil, ErrEmptyName
	}
	if len(password) < 8 {
		return nil, ErrInvalidPassword
	}

	hashedPassword, err := hasher.Hash(password)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	return &User{
		ID:           uuid.NewString(),
		Name:         name,
		Email:        email,
		PasswordHash: hashedPassword,
		CreatedAt:    now,
		UpdatedAt:    now,
	}, nil
}

// ReconstructUser rebuilds a User from persistence data (no validation, no hashing).
func ReconstructUser(id, name, email, passwordHash string, createdAt, updatedAt time.Time) (*User, error) {
	emailVO, err := NewEmail(email)
	if err != nil {
		return nil, err
	}
	return &User{
		ID:           id,
		Name:         name,
		Email:        emailVO,
		PasswordHash: passwordHash,
		CreatedAt:    createdAt,
		UpdatedAt:    updatedAt,
	}, nil
}
