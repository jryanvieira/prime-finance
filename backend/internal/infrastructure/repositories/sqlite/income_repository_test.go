package sqlite_test

import (
	"context"
	"testing"

	"dash-fin/internal/domain/income"
	infra "dash-fin/internal/infrastructure/repositories/sqlite"
)

func TestIncomeRepository_CreateAndList(t *testing.T) {
	db := newTestDB(t)
	seedUser(t, db, "u1")
	repo := infra.NewIncomeRepository(db)
	ctx := context.Background()

	inc, err := income.NewIncome("u1", "2025-01-15", "Salário", 500000, nil, false)
	if err != nil {
		t.Fatalf("NewIncome: %v", err)
	}

	if err := repo.Create(ctx, inc); err != nil {
		t.Fatalf("Create: %v", err)
	}

	items, err := repo.ListByDateRange(ctx, "u1", "2025-01-01", "2025-01-31")
	if err != nil {
		t.Fatalf("ListByDateRange: %v", err)
	}
	if len(items) != 1 {
		t.Errorf("expected 1, got %d", len(items))
	}
	if items[0].AmountCents != 500000 {
		t.Errorf("expected 500000, got %d", items[0].AmountCents)
	}
}

func TestIncomeRepository_ListEmpty(t *testing.T) {
	db := newTestDB(t)
	repo := infra.NewIncomeRepository(db)
	items, err := repo.ListByDateRange(context.Background(), "u1", "2025-01-01", "2025-01-31")
	if err != nil {
		t.Fatalf("ListByDateRange: %v", err)
	}
	if len(items) != 0 {
		t.Errorf("expected empty, got %d", len(items))
	}
}

func TestIncomeRepository_Delete(t *testing.T) {
	db := newTestDB(t)
	seedUser(t, db, "u1")
	repo := infra.NewIncomeRepository(db)
	ctx := context.Background()

	inc, _ := income.NewIncome("u1", "2025-01-15", "Salário", 500000, nil, false)
	_ = repo.Create(ctx, inc)

	if err := repo.Delete(ctx, "u1", inc.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}

	items, _ := repo.ListByDateRange(ctx, "u1", "2025-01-01", "2025-01-31")
	if len(items) != 0 {
		t.Errorf("expected empty after delete")
	}
}
