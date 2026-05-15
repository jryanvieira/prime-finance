package alert

import (
	"context"
	"testing"
	"time"

	"dash-fin/internal/domain/expense"
	"dash-fin/internal/domain/recurringexpense"
)

// --- mocks ---

type mockClock struct{ t time.Time }

func (m mockClock) Now() time.Time { return m.t }

type mockRecurringRepo struct {
	items []*recurringexpense.RecurringExpense
}

func (r *mockRecurringRepo) Create(_ context.Context, _ *recurringexpense.RecurringExpense) error {
	return nil
}
func (r *mockRecurringRepo) List(_ context.Context, _ string) ([]*recurringexpense.RecurringExpense, error) {
	return r.items, nil
}
func (r *mockRecurringRepo) Update(_ context.Context, _ *recurringexpense.RecurringExpense) error {
	return nil
}
func (r *mockRecurringRepo) Delete(_ context.Context, _, _ string) error { return nil }
func (r *mockRecurringRepo) ListAll(_ context.Context) ([]*recurringexpense.RecurringExpense, error) {
	return nil, nil
}

type mockExpenseRepo struct {
	items []*expense.Expense
}

func (r *mockExpenseRepo) Create(_ context.Context, _ *expense.Expense) error { return nil }
func (r *mockExpenseRepo) GetByID(_ context.Context, _, _ string) (*expense.Expense, error) {
	return nil, nil
}
func (r *mockExpenseRepo) ListByDateRange(_ context.Context, _, _, _ string) ([]*expense.Expense, error) {
	return r.items, nil
}
func (r *mockExpenseRepo) CategorySummary(_ context.Context, _, _, _ string) ([]*expense.CategorySummaryItem, error) {
	return nil, nil
}
func (r *mockExpenseRepo) Update(_ context.Context, _ *expense.Expense) error { return nil }
func (r *mockExpenseRepo) Delete(_ context.Context, _, _ string) error         { return nil }
func (r *mockExpenseRepo) DeleteByInstallmentGroup(_ context.Context, _, _ string) (int64, error) {
	return 0, nil
}
func (r *mockExpenseRepo) CategoryHistory(_ context.Context, _, _, _ string) ([]*expense.CategoryHistoryRaw, error) {
	return nil, nil
}

// --- helpers ---

func makeRE(id, desc string, dayOfMonth int, amountCents int64) *recurringexpense.RecurringExpense {
	return &recurringexpense.RecurringExpense{
		ID:          id,
		UserID:      "user1",
		Description: desc,
		DayOfMonth:  dayOfMonth,
		AmountCents: amountCents,
	}
}

func makeExpense(desc string) *expense.Expense {
	return &expense.Expense{
		ID:          "exp1",
		UserID:      "user1",
		Description: desc,
		AmountCents: 1000,
		Date:        "2026-05-05",
	}
}

// --- tests ---

// Recorrente vencendo em 3 dias, sem despesa → upcoming, days_until_due=3
func TestListAlerts_Upcoming(t *testing.T) {
	// today = 2026-05-12; due = 15 → daysUntilDue = 3
	today := time.Date(2026, 5, 12, 0, 0, 0, 0, time.UTC)
	uc := NewListAlertsUseCase(
		&mockRecurringRepo{items: []*recurringexpense.RecurringExpense{makeRE("r1", "Netflix", 15, 3990)}},
		&mockExpenseRepo{items: nil},
		mockClock{t: today},
	)

	resp, err := uc.Execute(context.Background(), "user1")
	if err != nil {
		t.Fatal(err)
	}
	if len(resp.Alerts) != 1 {
		t.Fatalf("expected 1 alert, got %d", len(resp.Alerts))
	}
	a := resp.Alerts[0]
	if a.Status != "upcoming" {
		t.Errorf("expected upcoming, got %s", a.Status)
	}
	if a.DaysUntilDue != 3 {
		t.Errorf("expected days_until_due=3, got %d", a.DaysUntilDue)
	}
}

// Recorrente vencida há 2 dias, com despesa com mesmo nome → não aparece
func TestListAlerts_OverdueWithMatchingExpense(t *testing.T) {
	// today = 2026-05-12; due = 10 → daysUntilDue = -2
	today := time.Date(2026, 5, 12, 0, 0, 0, 0, time.UTC)
	uc := NewListAlertsUseCase(
		&mockRecurringRepo{items: []*recurringexpense.RecurringExpense{makeRE("r1", "Netflix", 10, 3990)}},
		&mockExpenseRepo{items: []*expense.Expense{makeExpense("Netflix mensal")}},
		mockClock{t: today},
	)

	resp, err := uc.Execute(context.Background(), "user1")
	if err != nil {
		t.Fatal(err)
	}
	if len(resp.Alerts) != 0 {
		t.Errorf("expected 0 alerts, got %d", len(resp.Alerts))
	}
}

// Recorrente vencida há 2 dias, sem despesa → overdue, days_until_due=-2
func TestListAlerts_OverdueNoExpense(t *testing.T) {
	// today = 2026-05-12; due = 10 → daysUntilDue = -2
	today := time.Date(2026, 5, 12, 0, 0, 0, 0, time.UTC)
	uc := NewListAlertsUseCase(
		&mockRecurringRepo{items: []*recurringexpense.RecurringExpense{makeRE("r1", "Netflix", 10, 3990)}},
		&mockExpenseRepo{items: nil},
		mockClock{t: today},
	)

	resp, err := uc.Execute(context.Background(), "user1")
	if err != nil {
		t.Fatal(err)
	}
	if len(resp.Alerts) != 1 {
		t.Fatalf("expected 1 alert, got %d", len(resp.Alerts))
	}
	a := resp.Alerts[0]
	if a.Status != "overdue" {
		t.Errorf("expected overdue, got %s", a.Status)
	}
	if a.DaysUntilDue != -2 {
		t.Errorf("expected days_until_due=-2, got %d", a.DaysUntilDue)
	}
}

// Sem recorrentes → retorna {"alerts": []} (não null)
func TestListAlerts_NoRecurrings(t *testing.T) {
	today := time.Date(2026, 5, 12, 0, 0, 0, 0, time.UTC)
	uc := NewListAlertsUseCase(
		&mockRecurringRepo{items: nil},
		&mockExpenseRepo{items: nil},
		mockClock{t: today},
	)

	resp, err := uc.Execute(context.Background(), "user1")
	if err != nil {
		t.Fatal(err)
	}
	if resp.Alerts == nil {
		t.Error("expected non-nil slice, got nil")
	}
	if len(resp.Alerts) != 0 {
		t.Errorf("expected 0 alerts, got %d", len(resp.Alerts))
	}
}
