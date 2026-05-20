package alert

import (
	"context"
	"testing"
	"time"

	domainExpense "dash-fin/internal/domain/expense"
	domainUser "dash-fin/internal/domain/user"
	"dash-fin/pkg/timeutil"
)

type mockWeeklyExpenseRepo struct {
	expenses []*domainExpense.Expense
}

func (r *mockWeeklyExpenseRepo) Create(_ context.Context, _ *domainExpense.Expense) error {
	return nil
}
func (r *mockWeeklyExpenseRepo) GetByID(_ context.Context, _, _ string) (*domainExpense.Expense, error) {
	return nil, nil
}
func (r *mockWeeklyExpenseRepo) ListByDateRange(_ context.Context, _, _, _ string) ([]*domainExpense.Expense, error) {
	return r.expenses, nil
}
func (r *mockWeeklyExpenseRepo) CategorySummary(_ context.Context, _, _, _ string) ([]*domainExpense.CategorySummaryItem, error) {
	return nil, nil
}
func (r *mockWeeklyExpenseRepo) Update(_ context.Context, _ *domainExpense.Expense) error { return nil }
func (r *mockWeeklyExpenseRepo) Delete(_ context.Context, _, _ string) error              { return nil }
func (r *mockWeeklyExpenseRepo) DeleteByInstallmentGroup(_ context.Context, _, _ string) (int64, error) {
	return 0, nil
}
func (r *mockWeeklyExpenseRepo) UpdateGroup(_ context.Context, _, _, _ string, _ int64, _ *string, _ *string) error {
	return nil
}
func (r *mockWeeklyExpenseRepo) CategoryHistory(_ context.Context, _, _, _ string) ([]*domainExpense.CategoryHistoryRaw, error) {
	return nil, nil
}

func cat(s string) *string { return &s }

func TestSendWeeklySummary_Top3Ordered(t *testing.T) {
	// today = Monday 2026-05-18; prev week = 2026-05-11 to 2026-05-17
	today := time.Date(2026, 5, 18, 8, 0, 0, 0, time.UTC)
	m := &mockMailer{}

	u := makeUser("u1", "João", "joao@example.com")
	expenses := []*domainExpense.Expense{
		{ID: "e1", AmountCents: 5000, Category: cat("Alimentação"), Date: "2026-05-12"},
		{ID: "e2", AmountCents: 3000, Category: cat("Transporte"), Date: "2026-05-13"},
		{ID: "e3", AmountCents: 1000, Category: cat("Lazer"), Date: "2026-05-14"},
		{ID: "e4", AmountCents: 200, Category: cat("Outros"), Date: "2026-05-15"},
	}

	uc := NewSendWeeklySummaryUseCase(
		&mockUserRepo{users: map[string]*domainUser.User{"u1": u}},
		&mockWeeklyExpenseRepo{expenses: expenses},
		m,
		timeutil.FixedClock(today),
	)

	if err := uc.Execute(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(m.sent) != 1 {
		t.Fatalf("expected 1 email, got %d", len(m.sent))
	}
}

func TestSendWeeklySummary_NoExpenses_StillSendsEmail(t *testing.T) {
	today := time.Date(2026, 5, 18, 8, 0, 0, 0, time.UTC)
	m := &mockMailer{}
	u := makeUser("u1", "João", "joao@example.com")

	uc := NewSendWeeklySummaryUseCase(
		&mockUserRepo{users: map[string]*domainUser.User{"u1": u}},
		&mockWeeklyExpenseRepo{expenses: nil},
		m,
		timeutil.FixedClock(today),
	)

	if err := uc.Execute(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(m.sent) != 1 {
		t.Fatalf("expected 1 email even with no expenses, got %d", len(m.sent))
	}
}
