package income

import (
	"context"

	domainIncome "dash-fin/internal/domain/income"
	"dash-fin/internal/domain/shared"
)

// --- Response DTO ---

type IncomeResponse struct {
	ID          string  `json:"id"`
	Date        string  `json:"date"`
	Description string  `json:"description"`
	AmountCents int64   `json:"amount_cents"`
	Category    *string `json:"category,omitempty"`
	IsRecurring bool    `json:"is_recurring"`
}

func toIncomeResponse(i *domainIncome.Income) IncomeResponse {
	return IncomeResponse{
		ID:          i.ID,
		Date:        i.Date,
		Description: i.Description,
		AmountCents: i.AmountCents,
		Category:    i.Category,
		IsRecurring: i.IsRecurring,
	}
}

// --- Create ---

type CreateIncomeRequest struct {
	UserID      string  `json:"-"`
	Date        string  `json:"date"`
	Description string  `json:"description"`
	AmountCents int64   `json:"amount_cents"`
	Category    *string `json:"category"`
	IsRecurring bool    `json:"is_recurring"`
}

type CreateIncomeUseCase struct {
	repo domainIncome.Repository
}

func NewCreateIncomeUseCase(repo domainIncome.Repository) *CreateIncomeUseCase {
	return &CreateIncomeUseCase{repo: repo}
}

func (uc *CreateIncomeUseCase) Execute(ctx context.Context, req CreateIncomeRequest) (*IncomeResponse, error) {
	if _, err := shared.ParseDate(req.Date); err != nil {
		return nil, domainIncome.ErrInvalidDate
	}

	inc, err := domainIncome.NewIncome(req.UserID, req.Date, req.Description, req.AmountCents, req.Category, req.IsRecurring)
	if err != nil {
		return nil, err
	}

	if err := uc.repo.Create(ctx, inc); err != nil {
		return nil, err
	}

	resp := toIncomeResponse(inc)
	return &resp, nil
}

// --- List ---

type ListIncomesRequest struct {
	UserID string
	From   string
	To     string
}

type ListIncomesUseCase struct {
	repo domainIncome.Repository
}

func NewListIncomesUseCase(repo domainIncome.Repository) *ListIncomesUseCase {
	return &ListIncomesUseCase{repo: repo}
}

func (uc *ListIncomesUseCase) Execute(ctx context.Context, req ListIncomesRequest) ([]IncomeResponse, error) {
	if _, err := shared.ParseDate(req.From); err != nil {
		return nil, domainIncome.ErrInvalidDate
	}
	if _, err := shared.ParseDate(req.To); err != nil {
		return nil, domainIncome.ErrInvalidDate
	}

	items, err := uc.repo.ListByDateRange(ctx, req.UserID, req.From, req.To)
	if err != nil {
		return nil, err
	}

	out := make([]IncomeResponse, 0, len(items))
	for _, i := range items {
		out = append(out, toIncomeResponse(i))
	}
	return out, nil
}

// --- Update ---

type UpdateIncomeRequest struct {
	UserID      string  `json:"-"`
	ID          string  `json:"-"`
	Date        string  `json:"date"`
	Description string  `json:"description"`
	AmountCents int64   `json:"amount_cents"`
	Category    *string `json:"category"`
	IsRecurring bool    `json:"is_recurring"`
}

type UpdateIncomeUseCase struct {
	repo domainIncome.Repository
}

func NewUpdateIncomeUseCase(repo domainIncome.Repository) *UpdateIncomeUseCase {
	return &UpdateIncomeUseCase{repo: repo}
}

func (uc *UpdateIncomeUseCase) Execute(ctx context.Context, req UpdateIncomeRequest) error {
	// For simplicity, we create a reconstructed domain object
	// In a full DDD you'd load from repo first. Here we delegate to the repo.
	inc := &domainIncome.Income{
		ID:     req.ID,
		UserID: req.UserID,
	}
	if err := inc.Update(req.Date, req.Description, req.AmountCents, req.Category, req.IsRecurring); err != nil {
		return err
	}
	return uc.repo.Update(ctx, inc)
}

// --- Delete ---

type DeleteIncomeUseCase struct {
	repo domainIncome.Repository
}

func NewDeleteIncomeUseCase(repo domainIncome.Repository) *DeleteIncomeUseCase {
	return &DeleteIncomeUseCase{repo: repo}
}

func (uc *DeleteIncomeUseCase) Execute(ctx context.Context, userID, id string) error {
	return uc.repo.Delete(ctx, userID, id)
}
