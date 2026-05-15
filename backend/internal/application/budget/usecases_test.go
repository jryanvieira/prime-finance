package budget

import (
	"context"
	"errors"
	"testing"

	domainBudget "dash-fin/internal/domain/budget"
)

// --- Mock ---

type mockBudgetRepo struct {
	listWithSpentFn func(ctx context.Context, userID, month string) ([]domainBudget.BudgetWithSpent, error)
	upsertFn        func(ctx context.Context, b *domainBudget.Budget) error
	deleteFn        func(ctx context.Context, userID, id string) error
}

func (m *mockBudgetRepo) List(ctx context.Context, userID, month string) ([]*domainBudget.Budget, error) {
	return nil, nil
}

func (m *mockBudgetRepo) ListWithSpent(ctx context.Context, userID, month string) ([]domainBudget.BudgetWithSpent, error) {
	if m.listWithSpentFn != nil {
		return m.listWithSpentFn(ctx, userID, month)
	}
	return nil, nil
}

func (m *mockBudgetRepo) Upsert(ctx context.Context, b *domainBudget.Budget) error {
	if m.upsertFn != nil {
		return m.upsertFn(ctx, b)
	}
	return nil
}

func (m *mockBudgetRepo) Delete(ctx context.Context, userID, id string) error {
	if m.deleteFn != nil {
		return m.deleteFn(ctx, userID, id)
	}
	return nil
}

// --- List ---

func TestListBudgets_Success(t *testing.T) {
	b := &domainBudget.Budget{ID: "b1", CategoryID: "cat1", Month: "2025-01", AmountCents: 10000}
	repo := &mockBudgetRepo{
		listWithSpentFn: func(_ context.Context, _, _ string) ([]domainBudget.BudgetWithSpent, error) {
			return []domainBudget.BudgetWithSpent{{Budget: b, SpentCents: 5000, CatName: "Food"}}, nil
		},
	}
	uc := NewListBudgetsUseCase(repo)
	result, err := uc.Execute(context.Background(), "u1", "2025-01")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].SpentCents != 5000 {
		t.Errorf("expected spent 5000, got %d", result[0].SpentCents)
	}
}

func TestListBudgets_Empty(t *testing.T) {
	repo := &mockBudgetRepo{
		listWithSpentFn: func(_ context.Context, _, _ string) ([]domainBudget.BudgetWithSpent, error) {
			return []domainBudget.BudgetWithSpent{}, nil
		},
	}
	uc := NewListBudgetsUseCase(repo)
	result, err := uc.Execute(context.Background(), "u1", "2025-01")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result")
	}
}

func TestListBudgets_RepoError(t *testing.T) {
	repoErr := errors.New("db error")
	repo := &mockBudgetRepo{
		listWithSpentFn: func(_ context.Context, _, _ string) ([]domainBudget.BudgetWithSpent, error) {
			return nil, repoErr
		},
	}
	uc := NewListBudgetsUseCase(repo)
	_, err := uc.Execute(context.Background(), "u1", "2025-01")
	if !errors.Is(err, repoErr) {
		t.Errorf("expected repo error, got %v", err)
	}
}

// --- Upsert ---

func TestUpsertBudget_Success(t *testing.T) {
	repo := &mockBudgetRepo{}
	uc := NewUpsertBudgetUseCase(repo)
	req := UpsertBudgetRequest{
		UserID:      "u1",
		CategoryID:  "cat1",
		Month:       "2025-01",
		AmountCents: 10000,
	}
	resp, err := uc.Execute(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp == nil {
		t.Fatal("expected response, got nil")
	}
	if resp.AmountCents != 10000 {
		t.Errorf("expected 10000, got %d", resp.AmountCents)
	}
}

func TestUpsertBudget_InvalidAmount(t *testing.T) {
	repo := &mockBudgetRepo{}
	uc := NewUpsertBudgetUseCase(repo)
	req := UpsertBudgetRequest{
		UserID:      "u1",
		CategoryID:  "cat1",
		Month:       "2025-01",
		AmountCents: 0,
	}
	_, err := uc.Execute(context.Background(), req)
	if !errors.Is(err, domainBudget.ErrInvalidAmount) {
		t.Errorf("expected ErrInvalidAmount, got %v", err)
	}
}

func TestUpsertBudget_EmptyCategoryID(t *testing.T) {
	repo := &mockBudgetRepo{}
	uc := NewUpsertBudgetUseCase(repo)
	req := UpsertBudgetRequest{
		UserID:      "u1",
		CategoryID:  "",
		Month:       "2025-01",
		AmountCents: 10000,
	}
	_, err := uc.Execute(context.Background(), req)
	if !errors.Is(err, domainBudget.ErrEmptyCategoryID) {
		t.Errorf("expected ErrEmptyCategoryID, got %v", err)
	}
}

func TestUpsertBudget_RepoError(t *testing.T) {
	repoErr := errors.New("db error")
	repo := &mockBudgetRepo{
		upsertFn: func(_ context.Context, _ *domainBudget.Budget) error {
			return repoErr
		},
	}
	uc := NewUpsertBudgetUseCase(repo)
	req := UpsertBudgetRequest{
		UserID:      "u1",
		CategoryID:  "cat1",
		Month:       "2025-01",
		AmountCents: 10000,
	}
	_, err := uc.Execute(context.Background(), req)
	if !errors.Is(err, repoErr) {
		t.Errorf("expected repo error, got %v", err)
	}
}

// --- Delete ---

func TestDeleteBudget_Success(t *testing.T) {
	repo := &mockBudgetRepo{}
	uc := NewDeleteBudgetUseCase(repo)
	if err := uc.Execute(context.Background(), "u1", "b1"); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestDeleteBudget_NotFound(t *testing.T) {
	repo := &mockBudgetRepo{
		deleteFn: func(_ context.Context, _, _ string) error {
			return domainBudget.ErrBudgetNotFound
		},
	}
	uc := NewDeleteBudgetUseCase(repo)
	err := uc.Execute(context.Background(), "u1", "b1")
	if !errors.Is(err, domainBudget.ErrBudgetNotFound) {
		t.Errorf("expected ErrBudgetNotFound, got %v", err)
	}
}

func TestDeleteBudget_RepoError(t *testing.T) {
	repoErr := errors.New("db error")
	repo := &mockBudgetRepo{
		deleteFn: func(_ context.Context, _, _ string) error {
			return repoErr
		},
	}
	uc := NewDeleteBudgetUseCase(repo)
	err := uc.Execute(context.Background(), "u1", "b1")
	if !errors.Is(err, repoErr) {
		t.Errorf("expected repo error, got %v", err)
	}
}
