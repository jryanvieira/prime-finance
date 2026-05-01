package user

import "context"

// Repository defines the contract for persisting and retrieving User entities.
type Repository interface {
	Save(ctx context.Context, u *User) error
	GetByEmail(ctx context.Context, email string) (*User, error)
}
