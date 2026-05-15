package sqlite_test

import (
	"context"
	"testing"

	"dash-fin/internal/domain/budget"
	infra "dash-fin/internal/infrastructure/repositories/sqlite"
)

func TestBudgetRepository_UpsertAndList(t *testing.T) {
	db := newTestDB(t)
	seedUser(t, db, "u1")
	repo := infra.NewBudgetRepository(db)
	ctx := context.Background()

	b, err := budget.NewBudget("u1", "cat-alimentacao", "2025-01", 10000)
	if err != nil {
		t.Fatalf("NewBudget: %v", err)
	}

	if err := repo.Upsert(ctx, b); err != nil {
		t.Fatalf("Upsert: %v", err)
	}

	items, err := repo.List(ctx, "u1", "2025-01")
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(items) != 1 {
		t.Errorf("expected 1, got %d", len(items))
	}
	if items[0].AmountCents != 10000 {
		t.Errorf("expected 10000, got %d", items[0].AmountCents)
	}
}

func TestBudgetRepository_UpsertUpdates(t *testing.T) {
	db := newTestDB(t)
	seedUser(t, db, "u1")
	repo := infra.NewBudgetRepository(db)
	ctx := context.Background()

	b, _ := budget.NewBudget("u1", "cat-alimentacao", "2025-01", 10000)
	_ = repo.Upsert(ctx, b)

	b2, _ := budget.NewBudget("u1", "cat-alimentacao", "2025-01", 20000)
	_ = repo.Upsert(ctx, b2)

	items, _ := repo.List(ctx, "u1", "2025-01")
	if len(items) != 1 {
		t.Fatalf("expected 1 after upsert, got %d", len(items))
	}
	if items[0].AmountCents != 20000 {
		t.Errorf("expected 20000, got %d", items[0].AmountCents)
	}
}

func TestBudgetRepository_Delete(t *testing.T) {
	db := newTestDB(t)
	seedUser(t, db, "u1")
	repo := infra.NewBudgetRepository(db)
	ctx := context.Background()

	b, _ := budget.NewBudget("u1", "cat-alimentacao", "2025-01", 10000)
	_ = repo.Upsert(ctx, b)

	if err := repo.Delete(ctx, "u1", b.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}

	items, _ := repo.List(ctx, "u1", "2025-01")
	if len(items) != 0 {
		t.Errorf("expected empty after delete")
	}
}

func TestBudgetRepository_Delete_NotFound(t *testing.T) {
	db := newTestDB(t)
	repo := infra.NewBudgetRepository(db)
	err := repo.Delete(context.Background(), "u1", "nonexistent")
	if err == nil {
		t.Fatal("expected error for not found")
	}
}
