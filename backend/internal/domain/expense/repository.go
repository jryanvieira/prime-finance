package expense

import "context"

// CategorySummaryItem aggregates expenses for one category in a period.
type CategorySummaryItem struct {
	Category         string
	TotalCents       int64
	TransactionCount int
}

// Repository defines the contract for persisting and retrieving Expense entities.
type Repository interface {
	Create(ctx context.Context, e *Expense) error
	GetByID(ctx context.Context, userID, id string) (*Expense, error)
	ListByDateRange(ctx context.Context, userID, from, to string) ([]*Expense, error)
	CategorySummary(ctx context.Context, userID, from, to string) ([]*CategorySummaryItem, error)
	Update(ctx context.Context, e *Expense) error
	Delete(ctx context.Context, userID, id string) error
	DeleteByInstallmentGroup(ctx context.Context, userID, groupID string) (int64, error)
}
