package expense

import (
	"context"
	"errors"
	"testing"

	domainExpense "dash-fin/internal/domain/expense"
)

func TestDeleteExpense_Success(t *testing.T) {
	repo := &mockExpenseRepo{}
	uc := NewDeleteExpenseUseCase(repo)
	if err := uc.Execute(context.Background(), "u1", "e1"); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestDeleteExpense_NotFound(t *testing.T) {
	repo := &mockExpenseRepo{
		deleteFn: func(_ context.Context, _, _ string) error {
			return domainExpense.ErrExpenseNotFound
		},
	}
	uc := NewDeleteExpenseUseCase(repo)
	err := uc.Execute(context.Background(), "u1", "e1")
	if !errors.Is(err, domainExpense.ErrExpenseNotFound) {
		t.Errorf("expected ErrExpenseNotFound, got %v", err)
	}
}

func TestDeleteExpense_RepoError(t *testing.T) {
	repoErr := errors.New("db error")
	repo := &mockExpenseRepo{
		deleteFn: func(_ context.Context, _, _ string) error {
			return repoErr
		},
	}
	uc := NewDeleteExpenseUseCase(repo)
	err := uc.Execute(context.Background(), "u1", "e1")
	if !errors.Is(err, repoErr) {
		t.Errorf("expected repo error, got %v", err)
	}
}
