package budget

import "context"

type BudgetWithSpent struct {
	Budget     *Budget
	SpentCents int64
	CatName    string
}

type Repository interface {
	List(ctx context.Context, userID, month string) ([]*Budget, error)
	ListWithSpent(ctx context.Context, userID, month string) ([]BudgetWithSpent, error)
	Upsert(ctx context.Context, b *Budget) error
	Delete(ctx context.Context, userID, id string) error
}
