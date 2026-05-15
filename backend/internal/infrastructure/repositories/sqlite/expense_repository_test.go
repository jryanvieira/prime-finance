package sqlite_test

import (
	"context"
	"testing"

	"dash-fin/internal/domain/expense"
	infra "dash-fin/internal/infrastructure/repositories/sqlite"

	"github.com/google/uuid"
)

func TestExpenseRepository_CreateAndGet(t *testing.T) {
	db := newTestDB(t)
	seedUser(t, db, "u1")
	repo := infra.NewExpenseRepository(db)
	ctx := context.Background()

	e, err := expense.NewExpense("u1", nil, "2025-01-15", "Almoço", 5000, nil)
	if err != nil {
		t.Fatalf("NewExpense: %v", err)
	}

	if err := repo.Create(ctx, e); err != nil {
		t.Fatalf("Create: %v", err)
	}

	got, err := repo.GetByID(ctx, "u1", e.ID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.AmountCents != 5000 {
		t.Errorf("expected 5000, got %d", got.AmountCents)
	}
}

func TestExpenseRepository_GetByID_NotFound(t *testing.T) {
	db := newTestDB(t)
	repo := infra.NewExpenseRepository(db)
	_, err := repo.GetByID(context.Background(), "u1", uuid.NewString())
	if err == nil {
		t.Fatal("expected error for not found")
	}
}

func TestExpenseRepository_ListByDateRange(t *testing.T) {
	db := newTestDB(t)
	seedUser(t, db, "u1")
	repo := infra.NewExpenseRepository(db)
	ctx := context.Background()

	e, _ := expense.NewExpense("u1", nil, "2025-01-15", "Almoço", 5000, nil)
	_ = repo.Create(ctx, e)

	items, err := repo.ListByDateRange(ctx, "u1", "2025-01-01", "2025-01-31")
	if err != nil {
		t.Fatalf("ListByDateRange: %v", err)
	}
	if len(items) != 1 {
		t.Errorf("expected 1, got %d", len(items))
	}
}

func TestExpenseRepository_Delete(t *testing.T) {
	db := newTestDB(t)
	seedUser(t, db, "u1")
	repo := infra.NewExpenseRepository(db)
	ctx := context.Background()

	e, _ := expense.NewExpense("u1", nil, "2025-01-15", "Almoço", 5000, nil)
	_ = repo.Create(ctx, e)

	if err := repo.Delete(ctx, "u1", e.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}

	_, err := repo.GetByID(ctx, "u1", e.ID)
	if err == nil {
		t.Error("expected error after delete")
	}
}
