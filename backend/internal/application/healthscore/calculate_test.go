package healthscore

import (
	"context"
	"testing"
	"time"

	domainBudget "dash-fin/internal/domain/budget"
	domainExpense "dash-fin/internal/domain/expense"
	domainGoal "dash-fin/internal/domain/goal"
	domainIncome "dash-fin/internal/domain/income"
	domainRE "dash-fin/internal/domain/recurringexpense"
)

// ── Mocks ──────────────────────────────────────────────────────────────────

type mockExpenseRepo struct {
	expenses []*domainExpense.Expense
}

func (m *mockExpenseRepo) Create(ctx context.Context, e *domainExpense.Expense) error { return nil }
func (m *mockExpenseRepo) GetByID(ctx context.Context, userID, id string) (*domainExpense.Expense, error) {
	return nil, nil
}
func (m *mockExpenseRepo) ListByDateRange(ctx context.Context, userID, from, to string) ([]*domainExpense.Expense, error) {
	return m.expenses, nil
}
func (m *mockExpenseRepo) CategorySummary(ctx context.Context, userID, from, to string) ([]*domainExpense.CategorySummaryItem, error) {
	return nil, nil
}
func (m *mockExpenseRepo) Update(ctx context.Context, e *domainExpense.Expense) error { return nil }
func (m *mockExpenseRepo) Delete(ctx context.Context, userID, id string) error        { return nil }
func (m *mockExpenseRepo) DeleteByInstallmentGroup(ctx context.Context, userID, groupID string) (int64, error) {
	return 0, nil
}
func (m *mockExpenseRepo) CategoryHistory(ctx context.Context, userID, from, to string) ([]*domainExpense.CategoryHistoryRaw, error) {
	return nil, nil
}

type mockIncomeRepo struct {
	incomes []*domainIncome.Income
}

func (m *mockIncomeRepo) Create(ctx context.Context, i *domainIncome.Income) error { return nil }
func (m *mockIncomeRepo) ListByDateRange(ctx context.Context, userID, from, to string) ([]*domainIncome.Income, error) {
	return m.incomes, nil
}
func (m *mockIncomeRepo) Update(ctx context.Context, i *domainIncome.Income) error { return nil }
func (m *mockIncomeRepo) Delete(ctx context.Context, userID, id string) error      { return nil }

type mockBudgetRepo struct {
	budgets []domainBudget.BudgetWithSpent
}

func (m *mockBudgetRepo) List(ctx context.Context, userID, month string) ([]*domainBudget.Budget, error) {
	return nil, nil
}
func (m *mockBudgetRepo) ListWithSpent(ctx context.Context, userID, month string) ([]domainBudget.BudgetWithSpent, error) {
	return m.budgets, nil
}
func (m *mockBudgetRepo) Upsert(ctx context.Context, b *domainBudget.Budget) error        { return nil }
func (m *mockBudgetRepo) Delete(ctx context.Context, userID, id string) error              { return nil }

type mockRecurringRepo struct {
	recurrings []*domainRE.RecurringExpense
}

func (m *mockRecurringRepo) Create(ctx context.Context, re *domainRE.RecurringExpense) error {
	return nil
}
func (m *mockRecurringRepo) List(ctx context.Context, userID string) ([]*domainRE.RecurringExpense, error) {
	return m.recurrings, nil
}
func (m *mockRecurringRepo) Update(ctx context.Context, re *domainRE.RecurringExpense) error {
	return nil
}
func (m *mockRecurringRepo) Delete(ctx context.Context, userID, id string) error { return nil }

type mockGoalRepo struct {
	goals []*domainGoal.Goal
}

func (m *mockGoalRepo) List(ctx context.Context, userID string) ([]*domainGoal.Goal, error) {
	return m.goals, nil
}
func (m *mockGoalRepo) GetByID(ctx context.Context, userID, id string) (*domainGoal.Goal, error) {
	return nil, nil
}
func (m *mockGoalRepo) Create(ctx context.Context, g *domainGoal.Goal) error { return nil }
func (m *mockGoalRepo) Update(ctx context.Context, g *domainGoal.Goal) error { return nil }
func (m *mockGoalRepo) Delete(ctx context.Context, userID, id string) error  { return nil }

type mockClock struct{ t time.Time }

func (c mockClock) Now() time.Time { return c.t }

// ── Helpers ─────────────────────────────────────────────────────────────────

func newUC(
	expenses []*domainExpense.Expense,
	incomes []*domainIncome.Income,
	budgets []domainBudget.BudgetWithSpent,
	recurrings []*domainRE.RecurringExpense,
	goals []*domainGoal.Goal,
) *CalculateHealthScoreUseCase {
	return NewCalculateHealthScoreUseCase(
		&mockExpenseRepo{expenses},
		&mockIncomeRepo{incomes},
		&mockBudgetRepo{budgets},
		&mockRecurringRepo{recurrings},
		&mockGoalRepo{goals},
		mockClock{time.Date(2026, 5, 14, 0, 0, 0, 0, time.UTC)},
	)
}

func expense(amountCents int64) *domainExpense.Expense {
	return &domainExpense.Expense{AmountCents: amountCents, Date: "2026-05-01"}
}

func income(amountCents int64) *domainIncome.Income {
	return &domainIncome.Income{AmountCents: amountCents, Date: "2026-05-01"}
}

func recurring(amountCents int64) *domainRE.RecurringExpense {
	return &domainRE.RecurringExpense{AmountCents: amountCents, DayOfMonth: 5}
}

func budgetWithSpent(budgetCents, spentCents int64) domainBudget.BudgetWithSpent {
	return domainBudget.BudgetWithSpent{
		Budget:     &domainBudget.Budget{AmountCents: budgetCents},
		SpentCents: spentCents,
	}
}

func goal(targetCents, currentCents int64) *domainGoal.Goal {
	return &domainGoal.Goal{
		TargetAmountCents:  targetCents,
		CurrentAmountCents: currentCents,
	}
}

// ── Testes ──────────────────────────────────────────────────────────────────

func TestCalculateHealthScore_FullData(t *testing.T) {
	uc := newUC(
		[]*domainExpense.Expense{expense(200_00)},
		[]*domainIncome.Income{income(500_00)},
		[]domainBudget.BudgetWithSpent{budgetWithSpent(300_00, 200_00)},
		[]*domainRE.RecurringExpense{recurring(100_00)},
		[]*domainGoal.Goal{goal(1000_00, 500_00)},
	)

	resp, err := uc.Execute(context.Background(), CalculateHealthScoreRequest{UserID: "u1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Score < 0 || resp.Score > 100 {
		t.Errorf("score out of range: %d", resp.Score)
	}
	validLevels := map[string]bool{"crítico": true, "atenção": true, "ok": true, "ótimo": true}
	if !validLevels[resp.Level] {
		t.Errorf("invalid level: %s", resp.Level)
	}
	if len(resp.Insights) == 0 {
		t.Error("expected at least one insight")
	}
}

func TestCalculateHealthScore_NoIncome(t *testing.T) {
	uc := newUC(
		[]*domainExpense.Expense{expense(200_00)},
		nil,
		nil,
		[]*domainRE.RecurringExpense{recurring(100_00)},
		nil,
	)

	resp, err := uc.Execute(context.Background(), CalculateHealthScoreRequest{UserID: "u1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.SavingsRate != 0.0 {
		t.Errorf("expected savings_rate=0.0, got %f", resp.SavingsRate)
	}
}

func TestCalculateHealthScore_NoBudgets(t *testing.T) {
	uc := newUC(
		nil,
		[]*domainIncome.Income{income(500_00)},
		nil,
		nil,
		nil,
	)

	resp, err := uc.Execute(context.Background(), CalculateHealthScoreRequest{UserID: "u1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.BudgetAdherence != 1.0 {
		t.Errorf("expected budget_adherence=1.0, got %f", resp.BudgetAdherence)
	}
}

func TestCalculateHealthScore_NoGoals(t *testing.T) {
	uc := newUC(
		nil,
		[]*domainIncome.Income{income(500_00)},
		nil,
		nil,
		nil,
	)

	resp, err := uc.Execute(context.Background(), CalculateHealthScoreRequest{UserID: "u1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.GoalProgress != 0.0 {
		t.Errorf("expected goal_progress=0.0, got %f", resp.GoalProgress)
	}
}

func TestCalculateHealthScore_InsightsNotEmpty(t *testing.T) {
	uc := newUC(nil, nil, nil, nil, nil)

	resp, err := uc.Execute(context.Background(), CalculateHealthScoreRequest{UserID: "u1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Insights) < 1 {
		t.Error("expected at least one insight")
	}
	if resp.Insights[0] == "" {
		t.Error("first insight must not be empty")
	}
}

func TestCalculateHealthScore_FullCommitment(t *testing.T) {
	// 100% da renda comprometida com recorrentes → commitmentRate = 0 → 0 pontos nessa dimensão
	uc := newUC(
		nil,
		[]*domainIncome.Income{income(500_00)},
		nil,
		[]*domainRE.RecurringExpense{recurring(500_00)},
		nil,
	)

	resp, err := uc.Execute(context.Background(), CalculateHealthScoreRequest{UserID: "u1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Score > 60 {
		t.Errorf("expected score <= 60 with full commitment, got %d", resp.Score)
	}
}

func TestCalculateHealthScore_Otimo(t *testing.T) {
	// Renda alta, poucos fixos, poucos gastos, categorias dentro do orçamento, meta quase batida
	uc := newUC(
		[]*domainExpense.Expense{expense(50_00)},
		[]*domainIncome.Income{income(1000_00)},
		[]domainBudget.BudgetWithSpent{
			budgetWithSpent(200_00, 50_00),
			budgetWithSpent(100_00, 30_00),
		},
		[]*domainRE.RecurringExpense{recurring(100_00)},
		[]*domainGoal.Goal{goal(1000_00, 900_00)},
	)

	resp, err := uc.Execute(context.Background(), CalculateHealthScoreRequest{UserID: "u1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Level != "ótimo" {
		t.Errorf("expected level=ótimo, got %s (score=%d)", resp.Level, resp.Score)
	}
	if resp.Score < 76 {
		t.Errorf("expected score >= 76, got %d", resp.Score)
	}
}

func TestCalculateHealthScore_GoalWithZeroTarget(t *testing.T) {
	// Meta com targetAmountCents=0 deve ser ignorada (sem divisão por zero)
	uc := newUC(
		nil,
		[]*domainIncome.Income{income(500_00)},
		nil,
		nil,
		[]*domainGoal.Goal{goal(0, 0)},
	)

	resp, err := uc.Execute(context.Background(), CalculateHealthScoreRequest{UserID: "u1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.GoalProgress != 0.0 {
		t.Errorf("expected goal_progress=0.0 for zero-target goal, got %f", resp.GoalProgress)
	}
}
