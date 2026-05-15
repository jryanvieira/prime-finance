package recurringexpense

import "context"

// Repository defines the contract for persisting and retrieving RecurringExpense entities.
type Repository interface {
	Create(ctx context.Context, re *RecurringExpense) error
	List(ctx context.Context, userID string) ([]*RecurringExpense, error)
	Update(ctx context.Context, re *RecurringExpense) error
	Delete(ctx context.Context, userID, id string) error
	ListAll(ctx context.Context) ([]*RecurringExpense, error)
}
