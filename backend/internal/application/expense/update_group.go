package expense

import (
	"context"
	"strings"

	domainExpense "dash-fin/internal/domain/expense"
)

type UpdateInstallmentGroupRequest struct {
	UserID          string  `json:"-"`
	GroupID         string  `json:"-"`
	Description     string  `json:"description"`
	AmountCents     int64   `json:"amount_cents"`
	Category        *string `json:"category"`
	PaymentMethodID *string `json:"payment_method_id"`
}

type UpdateInstallmentGroupUseCase struct {
	repo domainExpense.Repository
}

func NewUpdateInstallmentGroupUseCase(repo domainExpense.Repository) *UpdateInstallmentGroupUseCase {
	return &UpdateInstallmentGroupUseCase{repo: repo}
}

func (uc *UpdateInstallmentGroupUseCase) Execute(ctx context.Context, req UpdateInstallmentGroupRequest) error {
	req.Description = strings.TrimSpace(req.Description)
	if req.Description == "" {
		return domainExpense.ErrEmptyDescription
	}
	if req.AmountCents <= 0 {
		return domainExpense.ErrInvalidAmount
	}
	return uc.repo.UpdateGroup(ctx, req.UserID, req.GroupID, req.Description, req.AmountCents, req.Category, req.PaymentMethodID)
}
