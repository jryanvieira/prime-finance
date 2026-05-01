package paymentmethod

import "context"

// Repository defines the contract for persisting and retrieving PaymentMethod entities.
type Repository interface {
	Create(ctx context.Context, pm *PaymentMethod) error
	List(ctx context.Context, userID string) ([]*PaymentMethod, error)
	Update(ctx context.Context, pm *PaymentMethod) error
	Delete(ctx context.Context, userID, id string) error
}
