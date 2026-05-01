package expense

import (
	"context"

	domainExpense "dash-fin/internal/domain/expense"
	"dash-fin/internal/domain/shared"
)

type UpdateExpenseRequest struct {
	UserID          string  `json:"-"`
	ID              string  `json:"-"`
	PaymentMethodID *string `json:"payment_method_id"`
	Date            string  `json:"date"`
	Description     string  `json:"description"`
	AmountCents     int64   `json:"amount_cents"`
	Category        *string `json:"category"`
}

type UpdateExpenseUseCase struct {
	repo domainExpense.Repository
}

func NewUpdateExpenseUseCase(repo domainExpense.Repository) *UpdateExpenseUseCase {
	return &UpdateExpenseUseCase{repo: repo}
}

func (uc *UpdateExpenseUseCase) Execute(ctx context.Context, req UpdateExpenseRequest) error {
	if _, err := shared.ParseDate(req.Date); err != nil {
		return domainExpense.ErrInvalidDate
	}

	exp, err := uc.repo.GetByID(ctx, req.UserID, req.ID)
	if err != nil {
		return err
	}

	if err := exp.Update(req.PaymentMethodID, req.Date, req.Description, req.AmountCents, req.Category); err != nil {
		return err
	}

	return uc.repo.Update(ctx, exp)
}
