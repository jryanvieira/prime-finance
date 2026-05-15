package sqlite_test

import (
	"context"
	"testing"

	"dash-fin/internal/domain/goal"
	infra "dash-fin/internal/infrastructure/repositories/sqlite"
)

func TestGoalRepository_CreateAndList(t *testing.T) {
	db := newTestDB(t)
	seedUser(t, db, "u1")
	repo := infra.NewGoalRepository(db)
	ctx := context.Background()

	g, err := goal.NewGoal("u1", "Viagem", 100000, nil)
	if err != nil {
		t.Fatalf("NewGoal: %v", err)
	}

	if err := repo.Create(ctx, g); err != nil {
		t.Fatalf("Create: %v", err)
	}

	items, err := repo.List(ctx, "u1")
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(items) != 1 {
		t.Errorf("expected 1, got %d", len(items))
	}
	if items[0].TargetAmountCents != 100000 {
		t.Errorf("expected 100000, got %d", items[0].TargetAmountCents)
	}
}

func TestGoalRepository_GetByID(t *testing.T) {
	db := newTestDB(t)
	seedUser(t, db, "u1")
	repo := infra.NewGoalRepository(db)
	ctx := context.Background()

	g, _ := goal.NewGoal("u1", "Viagem", 100000, nil)
	_ = repo.Create(ctx, g)

	got, err := repo.GetByID(ctx, "u1", g.ID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.Name != "Viagem" {
		t.Errorf("expected Viagem, got %s", got.Name)
	}
}

func TestGoalRepository_GetByID_NotFound(t *testing.T) {
	db := newTestDB(t)
	repo := infra.NewGoalRepository(db)
	_, err := repo.GetByID(context.Background(), "u1", "nonexistent")
	if err == nil {
		t.Fatal("expected error for not found")
	}
}

func TestGoalRepository_Delete(t *testing.T) {
	db := newTestDB(t)
	seedUser(t, db, "u1")
	repo := infra.NewGoalRepository(db)
	ctx := context.Background()

	g, _ := goal.NewGoal("u1", "Viagem", 100000, nil)
	_ = repo.Create(ctx, g)

	if err := repo.Delete(ctx, "u1", g.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}

	items, _ := repo.List(ctx, "u1")
	if len(items) != 0 {
		t.Errorf("expected empty after delete")
	}
}
