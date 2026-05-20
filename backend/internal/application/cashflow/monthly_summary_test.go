package cashflow

import (
	"context"
	"errors"
	"testing"

	domainBudget "dash-fin/internal/domain/budget"
	domainExpense "dash-fin/internal/domain/expense"
	domainIncome "dash-fin/internal/domain/income"
	domainRE "dash-fin/internal/domain/recurringexpense"
)

// --- mocks ---

type mockExpenseRepo struct {
	expenses []*domainExpense.Expense
}

func (m *mockExpenseRepo) Create(_ context.Context, _ *domainExpense.Expense) error { return nil }
func (m *mockExpenseRepo) GetByID(_ context.Context, _, _ string) (*domainExpense.Expense, error) {
	return nil, nil
}
func (m *mockExpenseRepo) ListByDateRange(_ context.Context, _, _, _ string) ([]*domainExpense.Expense, error) {
	return m.expenses, nil
}
func (m *mockExpenseRepo) CategorySummary(_ context.Context, _, _, _ string) ([]*domainExpense.CategorySummaryItem, error) {
	return nil, nil
}
func (m *mockExpenseRepo) Update(_ context.Context, _ *domainExpense.Expense) error { return nil }
func (m *mockExpenseRepo) Delete(_ context.Context, _, _ string) error              { return nil }
func (m *mockExpenseRepo) DeleteByInstallmentGroup(_ context.Context, _, _ string) (int64, error) {
	return 0, nil
}
func (m *mockExpenseRepo) UpdateGroup(_ context.Context, _, _, _ string, _ int64, _ *string, _ *string) error {
	return nil
}
func (m *mockExpenseRepo) CategoryHistory(_ context.Context, _ string, _, _ string) ([]*domainExpense.CategoryHistoryRaw, error) {
	return nil, nil
}

type mockIncomeRepo struct {
	incomes []*domainIncome.Income
}

func (m *mockIncomeRepo) Create(_ context.Context, _ *domainIncome.Income) error { return nil }
func (m *mockIncomeRepo) ListByDateRange(_ context.Context, _, _, _ string) ([]*domainIncome.Income, error) {
	return m.incomes, nil
}
func (m *mockIncomeRepo) Update(_ context.Context, _ *domainIncome.Income) error { return nil }
func (m *mockIncomeRepo) Delete(_ context.Context, _, _ string) error            { return nil }

type mockBudgetRepo struct {
	budgets []*domainBudget.Budget
}

func (m *mockBudgetRepo) List(_ context.Context, _, _ string) ([]*domainBudget.Budget, error) {
	return m.budgets, nil
}
func (m *mockBudgetRepo) ListWithSpent(_ context.Context, _, _ string) ([]domainBudget.BudgetWithSpent, error) {
	return nil, nil
}
func (m *mockBudgetRepo) Upsert(_ context.Context, _ *domainBudget.Budget) error { return nil }
func (m *mockBudgetRepo) Delete(_ context.Context, _, _ string) error            { return nil }

type mockRERepo struct {
	list []*domainRE.RecurringExpense
}

func (m *mockRERepo) Create(_ context.Context, _ *domainRE.RecurringExpense) error { return nil }
func (m *mockRERepo) List(_ context.Context, _ string) ([]*domainRE.RecurringExpense, error) {
	return m.list, nil
}
func (m *mockRERepo) Update(_ context.Context, _ *domainRE.RecurringExpense) error { return nil }
func (m *mockRERepo) Delete(_ context.Context, _, _ string) error { return nil }
func (m *mockRERepo) ListAll(_ context.Context) ([]*domainRE.RecurringExpense, error) {
	return nil, nil
}

// --- helpers ---

func strPtr(s string) *string { return &s }

func newUseCase(expenses []*domainExpense.Expense, incomes []*domainIncome.Income, budgets []*domainBudget.Budget, recurring []*domainRE.RecurringExpense) *MonthlySummaryUseCase {
	return NewMonthlySummaryUseCase(
		&mockExpenseRepo{expenses: expenses},
		&mockIncomeRepo{incomes: incomes},
		&mockBudgetRepo{budgets: budgets},
		&mockRERepo{list: recurring},
	)
}

// --- tests ---

func TestMonthlySummary_InvalidMonth(t *testing.T) {
	uc := newUseCase(nil, nil, nil, nil)
	_, err := uc.Execute(context.Background(), MonthlySummaryRequest{UserID: "u1", Month: "2024/01"})
	if !errors.Is(err, ErrInvalidMonth) {
		t.Fatalf("expected ErrInvalidMonth, got %v", err)
	}
}

func TestMonthlySummary_ValidData(t *testing.T) {
	cat := strPtr("food")
	expenses := []*domainExpense.Expense{
		{ID: "e1", Description: "Lunch", AmountCents: 3000, Date: "2024-03-10", Category: cat},
		{ID: "e2", Description: "Dinner", AmountCents: 5000, Date: "2024-03-15", Category: cat},
		{ID: "e3", Description: "Coffee", AmountCents: 800, Date: "2024-03-20", Category: nil},
	}
	incomes := []*domainIncome.Income{
		{ID: "i1", Description: "Salary", AmountCents: 200000, Date: "2024-03-05"},
	}
	budgets := []*domainBudget.Budget{
		{ID: "b1", CategoryID: "food", AmountCents: 10000, Month: "2024-03"},
	}
	recurring := []*domainRE.RecurringExpense{
		{ID: "r1", Description: "Netflix", AmountCents: 4500, StartMonth: "2024-01", DayOfMonth: 1},
	}

	uc := newUseCase(expenses, incomes, budgets, recurring)
	resp, err := uc.Execute(context.Background(), MonthlySummaryRequest{UserID: "u1", Month: "2024-03"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.Month != "2024-03" {
		t.Errorf("expected month 2024-03, got %s", resp.Month)
	}
	if resp.TotalExpensesCents != 8800 {
		t.Errorf("expected total expenses 8800, got %d", resp.TotalExpensesCents)
	}
	if resp.TotalIncomeCents != 200000 {
		t.Errorf("expected total income 200000, got %d", resp.TotalIncomeCents)
	}
	if resp.TotalRecurringCents != 4500 {
		t.Errorf("expected total recurring 4500, got %d", resp.TotalRecurringCents)
	}
	expectedBalance := int64(200000 - 8800 - 4500)
	if resp.BalanceCents != expectedBalance {
		t.Errorf("expected balance %d, got %d", expectedBalance, resp.BalanceCents)
	}
	if len(resp.CategorySummary) == 0 {
		t.Error("expected non-empty category summary")
	}
	if len(resp.TopExpenses) != 3 {
		t.Errorf("expected 3 top expenses, got %d", len(resp.TopExpenses))
	}
	// top expense should be Dinner (5000)
	if resp.TopExpenses[0].Description != "Dinner" {
		t.Errorf("expected Dinner as top expense, got %s", resp.TopExpenses[0].Description)
	}
}

func TestMonthlySummary_CategoryNoBudget(t *testing.T) {
	cat := strPtr("transport")
	expenses := []*domainExpense.Expense{
		{ID: "e1", Description: "Uber", AmountCents: 2000, Date: "2024-03-10", Category: cat},
	}

	uc := newUseCase(expenses, nil, nil, nil)
	resp, err := uc.Execute(context.Background(), MonthlySummaryRequest{UserID: "u1", Month: "2024-03"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(resp.BudgetComparison) == 0 {
		t.Fatal("expected budget comparison to have entries")
	}
	if resp.BudgetComparison[0].BudgetCents != 0 {
		t.Errorf("expected budget_cents=0, got %d", resp.BudgetComparison[0].BudgetCents)
	}
}
