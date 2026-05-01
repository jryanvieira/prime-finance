package expense

import (
	"context"

	domainExpense "dash-fin/internal/domain/expense"
)

type DeleteExpenseUseCase struct {
	repo domainExpense.Repository
}

func NewDeleteExpenseUseCase(repo domainExpense.Repository) *DeleteExpenseUseCase {
	return &DeleteExpenseUseCase{repo: repo}
}

func (uc *DeleteExpenseUseCase) Execute(ctx context.Context, userID, id string) error {
	return uc.repo.Delete(ctx, userID, id)
}

// DeleteInstallmentGroupUseCase deletes all expenses in an installment group.
type DeleteInstallmentGroupUseCase struct {
	repo domainExpense.Repository
}

func NewDeleteInstallmentGroupUseCase(repo domainExpense.Repository) *DeleteInstallmentGroupUseCase {
	return &DeleteInstallmentGroupUseCase{repo: repo}
}

func (uc *DeleteInstallmentGroupUseCase) Execute(ctx context.Context, userID, groupID string) error {
	_, err := uc.repo.DeleteByInstallmentGroup(ctx, userID, groupID)
	return err
}
