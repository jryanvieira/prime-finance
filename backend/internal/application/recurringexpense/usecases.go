package recurringexpense

import (
	"context"

	domainRE "dash-fin/internal/domain/recurringexpense"
)

// --- Response DTO ---

type RecurringExpenseResponse struct {
	ID              string  `json:"id"`
	PaymentMethodID *string `json:"payment_method_id,omitempty"`
	StartMonth      string  `json:"start_month"`
	DayOfMonth      int     `json:"day_of_month"`
	Description     string  `json:"description"`
	AmountCents     int64   `json:"amount_cents"`
	Category        *string `json:"category,omitempty"`
}

func toREResponse(re *domainRE.RecurringExpense) RecurringExpenseResponse {
	return RecurringExpenseResponse{
		ID:              re.ID,
		PaymentMethodID: re.PaymentMethodID,
		StartMonth:      re.StartMonth,
		DayOfMonth:      re.DayOfMonth,
		Description:     re.Description,
		AmountCents:     re.AmountCents,
		Category:        re.Category,
	}
}

// --- Create ---

type CreateRecurringExpenseRequest struct {
	UserID          string  `json:"-"`
	PaymentMethodID *string `json:"payment_method_id"`
	StartMonth      string  `json:"start_month"`
	DayOfMonth      int     `json:"day_of_month"`
	Description     string  `json:"description"`
	AmountCents     int64   `json:"amount_cents"`
	Category        *string `json:"category"`
}

type CreateRecurringExpenseUseCase struct {
	repo domainRE.Repository
}

func NewCreateRecurringExpenseUseCase(repo domainRE.Repository) *CreateRecurringExpenseUseCase {
	return &CreateRecurringExpenseUseCase{repo: repo}
}

func (uc *CreateRecurringExpenseUseCase) Execute(ctx context.Context, req CreateRecurringExpenseRequest) (*RecurringExpenseResponse, error) {
	re, err := domainRE.NewRecurringExpense(
		req.UserID, req.PaymentMethodID,
		req.StartMonth, req.DayOfMonth,
		req.Description, req.AmountCents, req.Category,
	)
	if err != nil {
		return nil, err
	}

	if err := uc.repo.Create(ctx, re); err != nil {
		return nil, err
	}

	resp := toREResponse(re)
	return &resp, nil
}

// --- List ---

type ListRecurringExpensesUseCase struct {
	repo domainRE.Repository
}

func NewListRecurringExpensesUseCase(repo domainRE.Repository) *ListRecurringExpensesUseCase {
	return &ListRecurringExpensesUseCase{repo: repo}
}

func (uc *ListRecurringExpensesUseCase) Execute(ctx context.Context, userID string) ([]RecurringExpenseResponse, error) {
	items, err := uc.repo.List(ctx, userID)
	if err != nil {
		return nil, err
	}

	out := make([]RecurringExpenseResponse, 0, len(items))
	for _, re := range items {
		out = append(out, toREResponse(re))
	}
	return out, nil
}

// --- Update ---

type UpdateRecurringExpenseRequest struct {
	UserID          string  `json:"-"`
	ID              string  `json:"-"`
	PaymentMethodID *string `json:"payment_method_id"`
	StartMonth      string  `json:"start_month"`
	DayOfMonth      int     `json:"day_of_month"`
	Description     string  `json:"description"`
	AmountCents     int64   `json:"amount_cents"`
	Category        *string `json:"category"`
}

type UpdateRecurringExpenseUseCase struct {
	repo domainRE.Repository
}

func NewUpdateRecurringExpenseUseCase(repo domainRE.Repository) *UpdateRecurringExpenseUseCase {
	return &UpdateRecurringExpenseUseCase{repo: repo}
}

func (uc *UpdateRecurringExpenseUseCase) Execute(ctx context.Context, req UpdateRecurringExpenseRequest) error {
	re := &domainRE.RecurringExpense{
		ID:     req.ID,
		UserID: req.UserID,
	}
	if err := re.Update(req.PaymentMethodID, req.StartMonth, req.DayOfMonth, req.Description, req.AmountCents, req.Category); err != nil {
		return err
	}
	return uc.repo.Update(ctx, re)
}

// --- Delete ---

type DeleteRecurringExpenseUseCase struct {
	repo domainRE.Repository
}

func NewDeleteRecurringExpenseUseCase(repo domainRE.Repository) *DeleteRecurringExpenseUseCase {
	return &DeleteRecurringExpenseUseCase{repo: repo}
}

func (uc *DeleteRecurringExpenseUseCase) Execute(ctx context.Context, userID, id string) error {
	return uc.repo.Delete(ctx, userID, id)
}
