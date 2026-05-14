package budget

import (
	"context"

	domainBudget "dash-fin/internal/domain/budget"
)

// --- Response DTO ---

type BudgetResponse struct {
	ID          string  `json:"id"`
	CategoryID  string  `json:"category_id"`
	CategoryName string `json:"category_name"`
	Month       string  `json:"month"`
	AmountCents int64   `json:"amount_cents"`
	SpentCents  int64   `json:"spent_cents"`
	Percentage  float64 `json:"percentage"`
}

func toResponse(b *domainBudget.Budget, spentCents int64, catName string) BudgetResponse {
	pct := 0.0
	if b.AmountCents > 0 {
		pct = float64(spentCents) / float64(b.AmountCents) * 100
	}
	return BudgetResponse{
		ID:           b.ID,
		CategoryID:   b.CategoryID,
		CategoryName: catName,
		Month:        b.Month,
		AmountCents:  b.AmountCents,
		SpentCents:   spentCents,
		Percentage:   pct,
	}
}

// --- List ---

type ListBudgetsUseCase struct {
	repo domainBudget.Repository
}

func NewListBudgetsUseCase(repo domainBudget.Repository) *ListBudgetsUseCase {
	return &ListBudgetsUseCase{repo: repo}
}

func (uc *ListBudgetsUseCase) Execute(ctx context.Context, userID, month string) ([]BudgetResponse, error) {
	items, err := uc.repo.ListWithSpent(ctx, userID, month)
	if err != nil {
		return nil, err
	}

	out := make([]BudgetResponse, 0, len(items))
	for _, item := range items {
		out = append(out, toResponse(item.Budget, item.SpentCents, item.CatName))
	}
	return out, nil
}

// --- Upsert ---

type UpsertBudgetRequest struct {
	UserID      string `json:"-"`
	CategoryID  string `json:"category_id"`
	Month       string `json:"month"`
	AmountCents int64  `json:"amount_cents"`
}

type UpsertBudgetUseCase struct {
	repo domainBudget.Repository
}

func NewUpsertBudgetUseCase(repo domainBudget.Repository) *UpsertBudgetUseCase {
	return &UpsertBudgetUseCase{repo: repo}
}

func (uc *UpsertBudgetUseCase) Execute(ctx context.Context, req UpsertBudgetRequest) (*BudgetResponse, error) {
	b, err := domainBudget.NewBudget(req.UserID, req.CategoryID, req.Month, req.AmountCents)
	if err != nil {
		return nil, err
	}

	if err := uc.repo.Upsert(ctx, b); err != nil {
		return nil, err
	}

	resp := toResponse(b, 0, req.CategoryID)
	return &resp, nil
}

// --- Delete ---

type DeleteBudgetUseCase struct {
	repo domainBudget.Repository
}

func NewDeleteBudgetUseCase(repo domainBudget.Repository) *DeleteBudgetUseCase {
	return &DeleteBudgetUseCase{repo: repo}
}

func (uc *DeleteBudgetUseCase) Execute(ctx context.Context, userID, id string) error {
	return uc.repo.Delete(ctx, userID, id)
}
