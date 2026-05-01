package expense

import (
	"context"

	domainExpense "dash-fin/internal/domain/expense"
	"dash-fin/internal/domain/shared"
)

type ListExpensesRequest struct {
	UserID string
	From   string
	To     string
}

type ListExpensesUseCase struct {
	repo domainExpense.Repository
}

func NewListExpensesUseCase(repo domainExpense.Repository) *ListExpensesUseCase {
	return &ListExpensesUseCase{repo: repo}
}

func (uc *ListExpensesUseCase) Execute(ctx context.Context, req ListExpensesRequest) ([]ExpenseResponse, error) {
	if _, err := shared.ParseDate(req.From); err != nil {
		return nil, domainExpense.ErrInvalidDate
	}
	if _, err := shared.ParseDate(req.To); err != nil {
		return nil, domainExpense.ErrInvalidDate
	}

	items, err := uc.repo.ListByDateRange(ctx, req.UserID, req.From, req.To)
	if err != nil {
		return nil, err
	}

	out := make([]ExpenseResponse, 0, len(items))
	for _, e := range items {
		out = append(out, toExpenseResponse(e))
	}
	return out, nil
}

// --- Month Expenses ---

type MonthExpensesRequest struct {
	UserID string
	Month  string // "2025-01"
}

type MonthExpensesUseCase struct {
	repo domainExpense.Repository
}

func NewMonthExpensesUseCase(repo domainExpense.Repository) *MonthExpensesUseCase {
	return &MonthExpensesUseCase{repo: repo}
}

func (uc *MonthExpensesUseCase) Execute(ctx context.Context, req MonthExpensesRequest) ([]ExpenseResponse, error) {
	monthTime, err := shared.ParseMonth(req.Month)
	if err != nil {
		return nil, domainExpense.ErrInvalidDate
	}

	from, to := shared.StartEndOfMonth(monthTime)
	items, err := uc.repo.ListByDateRange(ctx, req.UserID, from, to)
	if err != nil {
		return nil, err
	}

	out := make([]ExpenseResponse, 0, len(items))
	for _, e := range items {
		out = append(out, toExpenseResponse(e))
	}
	return out, nil
}
