package expense_test

import (
	"context"
	"testing"

	appExpense "dash-fin/internal/application/expense"
	domainExpense "dash-fin/internal/domain/expense"
)

// mockRepo implementa apenas CategoryHistory para os testes.
type mockRepo struct {
	raw []*domainExpense.CategoryHistoryRaw
	err error
}

func (m *mockRepo) Create(ctx context.Context, e *domainExpense.Expense) error { return nil }
func (m *mockRepo) GetByID(ctx context.Context, userID, id string) (*domainExpense.Expense, error) {
	return nil, nil
}
func (m *mockRepo) ListByDateRange(ctx context.Context, userID, from, to string) ([]*domainExpense.Expense, error) {
	return nil, nil
}
func (m *mockRepo) CategorySummary(ctx context.Context, userID, from, to string) ([]*domainExpense.CategorySummaryItem, error) {
	return nil, nil
}
func (m *mockRepo) Update(ctx context.Context, e *domainExpense.Expense) error { return nil }
func (m *mockRepo) Delete(ctx context.Context, userID, id string) error        { return nil }
func (m *mockRepo) DeleteByInstallmentGroup(ctx context.Context, userID, groupID string) (int64, error) {
	return 0, nil
}
func (m *mockRepo) CategoryHistory(ctx context.Context, userID, from, to string) ([]*domainExpense.CategoryHistoryRaw, error) {
	return m.raw, m.err
}

func TestCategoryHistory_InvalidMonths(t *testing.T) {
	uc := appExpense.NewCategoryHistoryUseCase(&mockRepo{})

	for _, months := range []int{0, 13, -1} {
		_, err := uc.Execute(context.Background(), appExpense.CategoryHistoryRequest{
			UserID: "user-1",
			Months: months,
		})
		if err == nil {
			t.Errorf("months=%d: esperava erro, got nil", months)
		}
	}
}

func TestCategoryHistory_EmptyMonthsReturnZero(t *testing.T) {
	uc := appExpense.NewCategoryHistoryUseCase(&mockRepo{raw: nil})

	resp, err := uc.Execute(context.Background(), appExpense.CategoryHistoryRequest{
		UserID: "user-1",
		Months: 3,
	})
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(resp.Months) != 3 {
		t.Errorf("esperava 3 meses, got %d", len(resp.Months))
	}
	if len(resp.Items) != 0 {
		t.Errorf("esperava 0 itens, got %d", len(resp.Items))
	}
}

func TestCategoryHistory_MonthsWithGaps(t *testing.T) {
	// Repositório retorna dados apenas para um mês — o outro deve ter total_cents=0
	raw := []*domainExpense.CategoryHistoryRaw{
		{Category: "Alimentação", Month: "2026-03", TotalCents: 5000},
	}
	uc := appExpense.NewCategoryHistoryUseCase(&mockRepo{raw: raw})

	resp, err := uc.Execute(context.Background(), appExpense.CategoryHistoryRequest{
		UserID: "user-1",
		Months: 3,
	})
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(resp.Items) != 1 {
		t.Fatalf("esperava 1 categoria, got %d", len(resp.Items))
	}

	item := resp.Items[0]
	if item.Category != "Alimentação" {
		t.Errorf("categoria incorreta: %s", item.Category)
	}
	if len(item.History) != 3 {
		t.Fatalf("esperava 3 entradas de histórico, got %d", len(item.History))
	}

	// Todos os meses sem dado devem ter total_cents=0
	for _, h := range item.History {
		if h.Month == "2026-03" {
			if h.TotalCents != 5000 {
				t.Errorf("mês 2026-03: esperava 5000, got %d", h.TotalCents)
			}
		} else {
			if h.TotalCents != 0 {
				t.Errorf("mês %s: esperava 0, got %d", h.Month, h.TotalCents)
			}
		}
	}
}

func TestCategoryHistory_MonthsCountMatchesRequest(t *testing.T) {
	uc := appExpense.NewCategoryHistoryUseCase(&mockRepo{})

	for _, n := range []int{1, 6, 12} {
		resp, err := uc.Execute(context.Background(), appExpense.CategoryHistoryRequest{
			UserID: "user-1",
			Months: n,
		})
		if err != nil {
			t.Fatalf("months=%d: erro inesperado: %v", n, err)
		}
		if len(resp.Months) != n {
			t.Errorf("months=%d: esperava %d meses na resposta, got %d", n, n, len(resp.Months))
		}
	}
}
