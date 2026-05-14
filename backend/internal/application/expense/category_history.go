package expense

import (
	"context"
	"errors"
	"fmt"
	"time"

	domainExpense "dash-fin/internal/domain/expense"
)

var ErrInvalidMonthsParam = errors.New("expense: months must be between 1 and 12")

type CategoryHistoryRequest struct {
	UserID string
	Months int // 1–12, default 6
}

type CategoryHistoryUseCase struct {
	repo domainExpense.Repository
}

func NewCategoryHistoryUseCase(repo domainExpense.Repository) *CategoryHistoryUseCase {
	return &CategoryHistoryUseCase{repo: repo}
}

func (uc *CategoryHistoryUseCase) Execute(ctx context.Context, req CategoryHistoryRequest) (*domainExpense.CategoryHistoryResponse, error) {
	if req.Months < 1 || req.Months > 12 {
		return nil, ErrInvalidMonthsParam
	}

	now := time.Now().UTC()
	// from = primeiro dia de N meses atrás (contando o mês atual)
	fromTime := time.Date(now.Year(), now.Month()-time.Month(req.Months-1), 1, 0, 0, 0, 0, time.UTC)
	// to = último dia do mês atual
	toTime := time.Date(now.Year(), now.Month()+1, 0, 0, 0, 0, 0, time.UTC)

	from := fromTime.Format("2006-01-02")
	to := toTime.Format("2006-01-02")

	raw, err := uc.repo.CategoryHistory(ctx, req.UserID, from, to)
	if err != nil {
		return nil, err
	}

	// Construir lista de meses esperados
	months := make([]string, 0, req.Months)
	for i := 0; i < req.Months; i++ {
		m := time.Date(fromTime.Year(), fromTime.Month()+time.Month(i), 1, 0, 0, 0, 0, time.UTC)
		months = append(months, fmt.Sprintf("%d-%02d", m.Year(), m.Month()))
	}

	// Indexar raw por categoria+mês
	type key struct{ category, month string }
	index := make(map[key]int64)
	categories := make(map[string]struct{})
	for _, r := range raw {
		index[key{r.Category, r.Month}] = r.TotalCents
		categories[r.Category] = struct{}{}
	}

	// Montar items
	items := make([]domainExpense.CategoryHistoryItem, 0, len(categories))
	for cat := range categories {
		history := make([]domainExpense.MonthTotal, 0, req.Months)
		for _, m := range months {
			history = append(history, domainExpense.MonthTotal{
				Month:      m,
				TotalCents: index[key{cat, m}],
			})
		}
		items = append(items, domainExpense.CategoryHistoryItem{
			Category: cat,
			History:  history,
		})
	}

	return &domainExpense.CategoryHistoryResponse{
		Months: months,
		Items:  items,
	}, nil
}
