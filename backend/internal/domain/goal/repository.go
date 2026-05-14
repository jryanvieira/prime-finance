package goal

import "context"

type Repository interface {
	List(ctx context.Context, userID string) ([]*Goal, error)
	GetByID(ctx context.Context, userID, id string) (*Goal, error)
	Create(ctx context.Context, g *Goal) error
	Update(ctx context.Context, g *Goal) error
	Delete(ctx context.Context, userID, id string) error
}
