package category

import "context"

// Repository defines the contract for persisting and retrieving Category entities.
type Repository interface {
	List(ctx context.Context, userID string, catType string) ([]*Category, error)
	Create(ctx context.Context, c *Category) error
	Delete(ctx context.Context, userID, id string) error
}
