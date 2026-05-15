package expense

import (
	"context"
	"errors"
	"testing"

	domainExpense "dash-fin/internal/domain/expense"
)

func TestListExpenses_Success(t *testing.T) {
	e := &domainExpense.Expense{ID: "e1", Description: "Almoço", AmountCents: 5000, Date: "2025-01-15"}
	repo := &mockExpenseRepo{
		listByDateRangeFn: func(_ context.Context, _, _, _ string) ([]*domainExpense.Expense, error) {
			return []*domainExpense.Expense{e}, nil
		},
	}
	uc := NewListExpensesUseCase(repo)
	req := ListExpensesRequest{UserID: "u1", From: "2025-01-01", To: "2025-01-31"}
	result, err := uc.Execute(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
}

func TestListExpenses_Empty(t *testing.T) {
	repo := &mockExpenseRepo{
		listByDateRangeFn: func(_ context.Context, _, _, _ string) ([]*domainExpense.Expense, error) {
			return []*domainExpense.Expense{}, nil
		},
	}
	uc := NewListExpensesUseCase(repo)
	req := ListExpensesRequest{UserID: "u1", From: "2025-01-01", To: "2025-01-31"}
	result, err := uc.Execute(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result")
	}
}

func TestListExpenses_InvalidDate(t *testing.T) {
	repo := &mockExpenseRepo{}
	uc := NewListExpensesUseCase(repo)
	req := ListExpensesRequest{UserID: "u1", From: "bad", To: "2025-01-31"}
	_, err := uc.Execute(context.Background(), req)
	if !errors.Is(err, domainExpense.ErrInvalidDate) {
		t.Errorf("expected ErrInvalidDate, got %v", err)
	}
}

func TestListExpenses_RepoError(t *testing.T) {
	repoErr := errors.New("db error")
	repo := &mockExpenseRepo{
		listByDateRangeFn: func(_ context.Context, _, _, _ string) ([]*domainExpense.Expense, error) {
			return nil, repoErr
		},
	}
	uc := NewListExpensesUseCase(repo)
	req := ListExpensesRequest{UserID: "u1", From: "2025-01-01", To: "2025-01-31"}
	_, err := uc.Execute(context.Background(), req)
	if !errors.Is(err, repoErr) {
		t.Errorf("expected repo error, got %v", err)
	}
}
