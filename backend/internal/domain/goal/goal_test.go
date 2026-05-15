package goal

import (
	"testing"
	"time"
)

func ptr[T any](v T) *T { return &v }

func makeGoal(targetCents, currentCents int64, deadline *string, createdAt time.Time) *Goal {
	return &Goal{
		ID:                 "test-id",
		UserID:             "user-id",
		Name:               "Test Goal",
		TargetAmountCents:  targetCents,
		CurrentAmountCents: currentCents,
		Deadline:           deadline,
		CreatedAt:          createdAt,
		UpdatedAt:          createdAt,
	}
}

func TestCalculateProgress_NoDeadline(t *testing.T) {
	g := makeGoal(100000, 30000, nil, time.Now().UTC().AddDate(0, -2, 0))
	p := g.CalculateProgress(time.Now().UTC())

	if p.MonthlyRequiredCents != nil || p.MonthsRemaining != nil || p.OnTrack != nil {
		t.Fatal("esperava GoalProgress zero value quando Deadline é nil")
	}
}

func TestCalculateProgress_InvalidDeadline(t *testing.T) {
	g := makeGoal(100000, 30000, ptr("not-a-date"), time.Now().UTC().AddDate(0, -2, 0))
	p := g.CalculateProgress(time.Now().UTC())

	if p.MonthlyRequiredCents != nil || p.MonthsRemaining != nil || p.OnTrack != nil {
		t.Fatal("esperava GoalProgress zero value para deadline malformado")
	}
}

func TestCalculateProgress_GoalAlreadyReached(t *testing.T) {
	now := time.Date(2026, 5, 14, 12, 0, 0, 0, time.UTC)
	deadline := "2026-12-31"
	g := makeGoal(100000, 100000, &deadline, now.AddDate(0, -3, 0))
	p := g.CalculateProgress(now)

	if p.MonthlyRequiredCents == nil || *p.MonthlyRequiredCents != 0 {
		t.Fatalf("esperava monthly_required_cents=0, obteve %v", p.MonthlyRequiredCents)
	}
	if p.MonthsRemaining == nil || *p.MonthsRemaining != 0 {
		t.Fatalf("esperava months_remaining=0, obteve %v", p.MonthsRemaining)
	}
	if p.OnTrack == nil || !*p.OnTrack {
		t.Fatal("esperava on_track=true quando meta atingida")
	}
}

func TestCalculateProgress_GoalCurrentExceedsTarget(t *testing.T) {
	now := time.Date(2026, 5, 14, 12, 0, 0, 0, time.UTC)
	deadline := "2026-12-31"
	g := makeGoal(100000, 120000, &deadline, now.AddDate(0, -3, 0))
	p := g.CalculateProgress(now)

	if p.MonthsRemaining == nil || *p.MonthsRemaining != 0 {
		t.Fatal("esperava months_remaining=0 quando current > target")
	}
	if p.OnTrack == nil || !*p.OnTrack {
		t.Fatal("esperava on_track=true quando current > target")
	}
}

func TestCalculateProgress_DeadlineInPast(t *testing.T) {
	now := time.Date(2026, 5, 14, 12, 0, 0, 0, time.UTC)
	deadline := "2026-01-01" // passado
	g := makeGoal(100000, 20000, &deadline, now.AddDate(0, -6, 0))
	p := g.CalculateProgress(now)

	if p.MonthsRemaining == nil || *p.MonthsRemaining != 1 {
		t.Fatalf("esperava months_remaining=1 (mínimo) para deadline passado, obteve %v", p.MonthsRemaining)
	}
	// monthly_required = (100000 - 20000) / 1 = 80000
	if p.MonthlyRequiredCents == nil || *p.MonthlyRequiredCents != 80000 {
		t.Fatalf("esperava monthly_required_cents=80000, obteve %v", p.MonthlyRequiredCents)
	}
}

func TestCalculateProgress_OnTrackTrue(t *testing.T) {
	now := time.Date(2026, 5, 14, 12, 0, 0, 0, time.UTC)
	deadline := "2026-11-14" // ~6 meses à frente
	createdAt := now.AddDate(0, -6, 0)
	// Contribuiu 60000 em 6 meses → avg = 10000/mês
	// Falta 40000 em 6 meses → monthly_required = ~6666
	// avg (10000) >= monthly_required (6666) → on_track = true
	g := makeGoal(100000, 60000, &deadline, createdAt)
	p := g.CalculateProgress(now)

	if p.OnTrack == nil || !*p.OnTrack {
		t.Fatalf("esperava on_track=true, monthly_required=%v", p.MonthlyRequiredCents)
	}
}

func TestCalculateProgress_OnTrackFalse(t *testing.T) {
	now := time.Date(2026, 5, 14, 12, 0, 0, 0, time.UTC)
	deadline := "2026-07-14" // ~2 meses à frente
	createdAt := now.AddDate(0, -6, 0)
	// Contribuiu 10000 em 6 meses → avg = 1666/mês
	// Falta 90000 em 2 meses → monthly_required = 45000
	// avg (1666) < monthly_required (45000) → on_track = false
	g := makeGoal(100000, 10000, &deadline, createdAt)
	p := g.CalculateProgress(now)

	if p.OnTrack == nil || *p.OnTrack {
		t.Fatal("esperava on_track=false")
	}
}

func TestCalculateProgress_NewGoalElapsedForcedToOne(t *testing.T) {
	now := time.Date(2026, 5, 14, 12, 0, 0, 0, time.UTC)
	deadline := "2026-11-14"
	createdAt := now.AddDate(0, 0, -10) // menos de 1 mês
	g := makeGoal(100000, 5000, &deadline, createdAt)
	p := g.CalculateProgress(now)

	// elapsed forçado para 1; avg_monthly = 5000 / 1 = 5000
	// months_remaining = monthsBetween(now, deadline) com arredondamento
	if p.MonthlyRequiredCents == nil {
		t.Fatal("esperava MonthlyRequiredCents não-nil")
	}
	// avg (5000) vs monthly_required — sem validar valor exato, só que retornou
	if p.OnTrack == nil {
		t.Fatal("esperava OnTrack não-nil")
	}
}

// Testes de monthsBetween

func TestMonthsBetween_SameMonth(t *testing.T) {
	from := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	to := time.Date(2026, 5, 20, 0, 0, 0, 0, time.UTC)
	// to.Day (20) > from.Day (1) → total = 0 + 1 = 1
	got := monthsBetween(from, to)
	if got != 1 {
		t.Fatalf("esperava 1, obteve %d", got)
	}
}

func TestMonthsBetween_ExactMonthBoundary(t *testing.T) {
	from := time.Date(2026, 1, 14, 0, 0, 0, 0, time.UTC)
	to := time.Date(2026, 5, 14, 0, 0, 0, 0, time.UTC)
	// 4 meses exatos, mesmo dia, sem horas → não arredonda
	got := monthsBetween(from, to)
	if got != 4 {
		t.Fatalf("esperava 4, obteve %d", got)
	}
}

func TestMonthsBetween_CrossingYearBoundary(t *testing.T) {
	from := time.Date(2025, 11, 1, 0, 0, 0, 0, time.UTC)
	to := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	got := monthsBetween(from, to)
	if got != 4 {
		t.Fatalf("esperava 4, obteve %d", got)
	}
}

func TestMonthsBetween_ToBeforeFrom(t *testing.T) {
	from := time.Date(2026, 5, 14, 0, 0, 0, 0, time.UTC)
	to := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	got := monthsBetween(from, to)
	if got != 0 {
		t.Fatalf("esperava 0 quando to < from, obteve %d", got)
	}
}
