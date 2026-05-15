package budget

import "context"

type BudgetWithSpent struct {
	Budget     *Budget
	SpentCents int64
	CatName    string
}

// IsNearLimit retorna true quando o gasto acumulado atingiu ou ultrapassou 80% do orçamento.
func (b *BudgetWithSpent) IsNearLimit() bool {
	if b.Budget.AmountCents == 0 {
		return false
	}
	return float64(b.SpentCents)/float64(b.Budget.AmountCents) >= 0.8
}

type Repository interface {
	List(ctx context.Context, userID, month string) ([]*Budget, error)
	ListWithSpent(ctx context.Context, userID, month string) ([]BudgetWithSpent, error)
	Upsert(ctx context.Context, b *Budget) error
	Delete(ctx context.Context, userID, id string) error
}
