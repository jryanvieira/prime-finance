package cashflow

import (
	"context"
	"errors"
	"sort"

	domainBudget "dash-fin/internal/domain/budget"
	domainExpense "dash-fin/internal/domain/expense"
	domainIncome "dash-fin/internal/domain/income"
	domainRE "dash-fin/internal/domain/recurringexpense"
	"dash-fin/internal/domain/shared"
)

var ErrInvalidMonth = errors.New("cashflow: invalid month format, use YYYY-MM")

type BudgetComparisonItem struct {
	Category    string `json:"category"`
	BudgetCents int64  `json:"budget_cents"`
	SpentCents  int64  `json:"spent_cents"`
}

type ExpenseSummaryItem struct {
	ID          string  `json:"id"`
	Description string  `json:"description"`
	AmountCents int64   `json:"amount_cents"`
	Date        string  `json:"date"`
	Category    *string `json:"category"`
}

type CategorySummaryItem struct {
	Category         string `json:"category"`
	TotalCents       int64  `json:"total_cents"`
	TransactionCount int    `json:"transaction_count"`
}

type MonthlySummaryResponse struct {
	Month               string                 `json:"month"`
	TotalExpensesCents  int64                  `json:"total_expenses_cents"`
	TotalIncomeCents    int64                  `json:"total_income_cents"`
	TotalRecurringCents int64                  `json:"total_recurring_cents"`
	BalanceCents        int64                  `json:"balance_cents"`
	CategorySummary     []CategorySummaryItem  `json:"category_summary"`
	BudgetComparison    []BudgetComparisonItem `json:"budget_comparison"`
	TopExpenses         []ExpenseSummaryItem   `json:"top_expenses"`
}

type MonthlySummaryRequest struct {
	UserID string
	Month  string // "YYYY-MM"
}

type MonthlySummaryUseCase struct {
	expenseRepo domainExpense.Repository
	incomeRepo  domainIncome.Repository
	budgetRepo  domainBudget.Repository
	recurringRepo domainRE.Repository
}

func NewMonthlySummaryUseCase(
	expenseRepo domainExpense.Repository,
	incomeRepo domainIncome.Repository,
	budgetRepo domainBudget.Repository,
	recurringRepo domainRE.Repository,
) *MonthlySummaryUseCase {
	return &MonthlySummaryUseCase{
		expenseRepo:   expenseRepo,
		incomeRepo:    incomeRepo,
		budgetRepo:    budgetRepo,
		recurringRepo: recurringRepo,
	}
}

func (uc *MonthlySummaryUseCase) Execute(ctx context.Context, req MonthlySummaryRequest) (*MonthlySummaryResponse, error) {
	month, err := shared.ParseMonth(req.Month)
	if err != nil {
		return nil, ErrInvalidMonth
	}

	from, to := shared.StartEndOfMonth(month)

	expenses, err := uc.expenseRepo.ListByDateRange(ctx, req.UserID, from, to)
	if err != nil {
		return nil, err
	}

	incomes, err := uc.incomeRepo.ListByDateRange(ctx, req.UserID, from, to)
	if err != nil {
		return nil, err
	}

	budgets, err := uc.budgetRepo.List(ctx, req.UserID, req.Month)
	if err != nil {
		return nil, err
	}

	recurringList, err := uc.recurringRepo.List(ctx, req.UserID)
	if err != nil {
		return nil, err
	}

	// Totals
	var totalExpenses, totalIncome, totalRecurring int64

	for _, e := range expenses {
		totalExpenses += e.AmountCents
	}

	for _, inc := range incomes {
		totalIncome += inc.AmountCents
	}

	for _, re := range recurringList {
		start, parseErr := shared.ParseMonth(re.StartMonth)
		if parseErr != nil || start.After(month) {
			continue
		}
		totalRecurring += re.AmountCents
	}

	// Category summary
	catTotals := map[string]int64{}
	catCounts := map[string]int{}
	for _, e := range expenses {
		cat := "(sem categoria)"
		if e.Category != nil {
			cat = *e.Category
		}
		catTotals[cat] += e.AmountCents
		catCounts[cat]++
	}

	categorySummary := make([]CategorySummaryItem, 0, len(catTotals))
	for cat, total := range catTotals {
		categorySummary = append(categorySummary, CategorySummaryItem{
			Category:         cat,
			TotalCents:       total,
			TransactionCount: catCounts[cat],
		})
	}
	sort.Slice(categorySummary, func(i, j int) bool {
		return categorySummary[i].TotalCents > categorySummary[j].TotalCents
	})

	// Budget comparison: index budgets by CategoryID
	budgetByCat := map[string]int64{}
	for _, b := range budgets {
		budgetByCat[b.CategoryID] += b.AmountCents
	}

	budgetComparison := make([]BudgetComparisonItem, 0, len(categorySummary))
	for _, cs := range categorySummary {
		budgetComparison = append(budgetComparison, BudgetComparisonItem{
			Category:    cs.Category,
			BudgetCents: budgetByCat[cs.Category],
			SpentCents:  cs.TotalCents,
		})
	}

	// Top 5 expenses
	sortedExpenses := make([]*domainExpense.Expense, len(expenses))
	copy(sortedExpenses, expenses)
	sort.Slice(sortedExpenses, func(i, j int) bool {
		return sortedExpenses[i].AmountCents > sortedExpenses[j].AmountCents
	})
	if len(sortedExpenses) > 5 {
		sortedExpenses = sortedExpenses[:5]
	}

	topExpenses := make([]ExpenseSummaryItem, 0, len(sortedExpenses))
	for _, e := range sortedExpenses {
		topExpenses = append(topExpenses, ExpenseSummaryItem{
			ID:          e.ID,
			Description: e.Description,
			AmountCents: e.AmountCents,
			Date:        e.Date,
			Category:    e.Category,
		})
	}

	return &MonthlySummaryResponse{
		Month:               req.Month,
		TotalExpensesCents:  totalExpenses,
		TotalIncomeCents:    totalIncome,
		TotalRecurringCents: totalRecurring,
		BalanceCents:        totalIncome - totalExpenses - totalRecurring,
		CategorySummary:     categorySummary,
		BudgetComparison:    budgetComparison,
		TopExpenses:         topExpenses,
	}, nil
}
