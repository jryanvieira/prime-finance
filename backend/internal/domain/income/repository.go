package income

import "context"

// Repository defines the contract for persisting and retrieving Income entities.
type Repository interface {
	Create(ctx context.Context, i *Income) error
	ListByDateRange(ctx context.Context, userID, from, to string) ([]*Income, error)
	Update(ctx context.Context, i *Income) error
	Delete(ctx context.Context, userID, id string) error
}
