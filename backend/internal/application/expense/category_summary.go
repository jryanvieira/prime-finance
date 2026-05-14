package expense

import (
	"context"

	domainExpense "dash-fin/internal/domain/expense"
	"dash-fin/internal/domain/shared"
)

type CategorySummaryRequest struct {
	UserID string
	Month  string // YYYY-MM
}

type CategorySummaryItemResponse struct {
	Category         string  `json:"category"`
	TotalCents       int64   `json:"total_cents"`
	TransactionCount int     `json:"transaction_count"`
	Percentage       float64 `json:"percentage"`
}

type CategorySummaryUseCase struct {
	repo domainExpense.Repository
}

func NewCategorySummaryUseCase(repo domainExpense.Repository) *CategorySummaryUseCase {
	return &CategorySummaryUseCase{repo: repo}
}

func (uc *CategorySummaryUseCase) Execute(ctx context.Context, req CategorySummaryRequest) ([]CategorySummaryItemResponse, error) {
	month, err := shared.ParseMonth(req.Month)
	if err != nil {
		return nil, domainExpense.ErrInvalidDate
	}

	from, to := shared.StartEndOfMonth(month)
	items, err := uc.repo.CategorySummary(ctx, req.UserID, from, to)
	if err != nil {
		return nil, err
	}

	var total int64
	for _, item := range items {
		total += item.TotalCents
	}

	out := make([]CategorySummaryItemResponse, 0, len(items))
	for _, item := range items {
		pct := 0.0
		if total > 0 {
			pct = float64(item.TotalCents) / float64(total) * 100
		}
		out = append(out, CategorySummaryItemResponse{
			Category:         item.Category,
			TotalCents:       item.TotalCents,
			TransactionCount: item.TransactionCount,
			Percentage:       pct,
		})
	}
	return out, nil
}
