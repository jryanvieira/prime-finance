package income

import (
	"context"
	"errors"
	"testing"

	domainIncome "dash-fin/internal/domain/income"
)

// --- Mock ---

type mockIncomeRepo struct {
	createFn          func(ctx context.Context, i *domainIncome.Income) error
	listByDateRangeFn func(ctx context.Context, userID, from, to string) ([]*domainIncome.Income, error)
	updateFn          func(ctx context.Context, i *domainIncome.Income) error
	deleteFn          func(ctx context.Context, userID, id string) error
}

func (m *mockIncomeRepo) Create(ctx context.Context, i *domainIncome.Income) error {
	if m.createFn != nil {
		return m.createFn(ctx, i)
	}
	return nil
}

func (m *mockIncomeRepo) ListByDateRange(ctx context.Context, userID, from, to string) ([]*domainIncome.Income, error) {
	if m.listByDateRangeFn != nil {
		return m.listByDateRangeFn(ctx, userID, from, to)
	}
	return nil, nil
}

func (m *mockIncomeRepo) Update(ctx context.Context, i *domainIncome.Income) error {
	if m.updateFn != nil {
		return m.updateFn(ctx, i)
	}
	return nil
}

func (m *mockIncomeRepo) Delete(ctx context.Context, userID, id string) error {
	if m.deleteFn != nil {
		return m.deleteFn(ctx, userID, id)
	}
	return nil
}

// --- Create ---

func TestCreateIncome_Success(t *testing.T) {
	repo := &mockIncomeRepo{}
	uc := NewCreateIncomeUseCase(repo)
	req := CreateIncomeRequest{
		UserID:      "u1",
		Date:        "2025-01-15",
		Description: "Salário",
		AmountCents: 500000,
	}
	resp, err := uc.Execute(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp == nil {
		t.Fatal("expected response, got nil")
	}
	if resp.AmountCents != 500000 {
		t.Errorf("expected 500000, got %d", resp.AmountCents)
	}
}

func TestCreateIncome_InvalidDate(t *testing.T) {
	repo := &mockIncomeRepo{}
	uc := NewCreateIncomeUseCase(repo)
	req := CreateIncomeRequest{
		UserID:      "u1",
		Date:        "not-a-date",
		Description: "Salário",
		AmountCents: 500000,
	}
	_, err := uc.Execute(context.Background(), req)
	if !errors.Is(err, domainIncome.ErrInvalidDate) {
		t.Errorf("expected ErrInvalidDate, got %v", err)
	}
}

func TestCreateIncome_EmptyDescription(t *testing.T) {
	repo := &mockIncomeRepo{}
	uc := NewCreateIncomeUseCase(repo)
	req := CreateIncomeRequest{
		UserID:      "u1",
		Date:        "2025-01-15",
		Description: "",
		AmountCents: 500000,
	}
	_, err := uc.Execute(context.Background(), req)
	if !errors.Is(err, domainIncome.ErrEmptyDescription) {
		t.Errorf("expected ErrEmptyDescription, got %v", err)
	}
}

func TestCreateIncome_InvalidAmount(t *testing.T) {
	repo := &mockIncomeRepo{}
	uc := NewCreateIncomeUseCase(repo)
	req := CreateIncomeRequest{
		UserID:      "u1",
		Date:        "2025-01-15",
		Description: "Salário",
		AmountCents: 0,
	}
	_, err := uc.Execute(context.Background(), req)
	if !errors.Is(err, domainIncome.ErrInvalidAmount) {
		t.Errorf("expected ErrInvalidAmount, got %v", err)
	}
}

func TestCreateIncome_RepoError(t *testing.T) {
	repoErr := errors.New("db error")
	repo := &mockIncomeRepo{
		createFn: func(_ context.Context, _ *domainIncome.Income) error {
			return repoErr
		},
	}
	uc := NewCreateIncomeUseCase(repo)
	req := CreateIncomeRequest{
		UserID:      "u1",
		Date:        "2025-01-15",
		Description: "Salário",
		AmountCents: 500000,
	}
	_, err := uc.Execute(context.Background(), req)
	if !errors.Is(err, repoErr) {
		t.Errorf("expected repo error, got %v", err)
	}
}

// --- List ---

func TestListIncomes_Success(t *testing.T) {
	inc := &domainIncome.Income{ID: "i1", Description: "Salário", AmountCents: 500000, Date: "2025-01-15"}
	repo := &mockIncomeRepo{
		listByDateRangeFn: func(_ context.Context, _, _, _ string) ([]*domainIncome.Income, error) {
			return []*domainIncome.Income{inc}, nil
		},
	}
	uc := NewListIncomesUseCase(repo)
	req := ListIncomesRequest{UserID: "u1", From: "2025-01-01", To: "2025-01-31"}
	result, err := uc.Execute(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
}

func TestListIncomes_Empty(t *testing.T) {
	repo := &mockIncomeRepo{
		listByDateRangeFn: func(_ context.Context, _, _, _ string) ([]*domainIncome.Income, error) {
			return []*domainIncome.Income{}, nil
		},
	}
	uc := NewListIncomesUseCase(repo)
	req := ListIncomesRequest{UserID: "u1", From: "2025-01-01", To: "2025-01-31"}
	result, err := uc.Execute(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result")
	}
}

func TestListIncomes_InvalidDate(t *testing.T) {
	repo := &mockIncomeRepo{}
	uc := NewListIncomesUseCase(repo)
	req := ListIncomesRequest{UserID: "u1", From: "bad", To: "2025-01-31"}
	_, err := uc.Execute(context.Background(), req)
	if !errors.Is(err, domainIncome.ErrInvalidDate) {
		t.Errorf("expected ErrInvalidDate, got %v", err)
	}
}

func TestListIncomes_RepoError(t *testing.T) {
	repoErr := errors.New("db error")
	repo := &mockIncomeRepo{
		listByDateRangeFn: func(_ context.Context, _, _, _ string) ([]*domainIncome.Income, error) {
			return nil, repoErr
		},
	}
	uc := NewListIncomesUseCase(repo)
	req := ListIncomesRequest{UserID: "u1", From: "2025-01-01", To: "2025-01-31"}
	_, err := uc.Execute(context.Background(), req)
	if !errors.Is(err, repoErr) {
		t.Errorf("expected repo error, got %v", err)
	}
}

// --- Delete ---

func TestDeleteIncome_Success(t *testing.T) {
	repo := &mockIncomeRepo{}
	uc := NewDeleteIncomeUseCase(repo)
	if err := uc.Execute(context.Background(), "u1", "i1"); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestDeleteIncome_NotFound(t *testing.T) {
	repo := &mockIncomeRepo{
		deleteFn: func(_ context.Context, _, _ string) error {
			return domainIncome.ErrIncomeNotFound
		},
	}
	uc := NewDeleteIncomeUseCase(repo)
	err := uc.Execute(context.Background(), "u1", "i1")
	if !errors.Is(err, domainIncome.ErrIncomeNotFound) {
		t.Errorf("expected ErrIncomeNotFound, got %v", err)
	}
}

func TestDeleteIncome_RepoError(t *testing.T) {
	repoErr := errors.New("db error")
	repo := &mockIncomeRepo{
		deleteFn: func(_ context.Context, _, _ string) error {
			return repoErr
		},
	}
	uc := NewDeleteIncomeUseCase(repo)
	err := uc.Execute(context.Background(), "u1", "i1")
	if !errors.Is(err, repoErr) {
		t.Errorf("expected repo error, got %v", err)
	}
}
