package expense

import (
	"context"
	"testing"

	domainExpense "dash-fin/internal/domain/expense"
)

func TestUpdateInstallmentGroup_EmptyDescription(t *testing.T) {
	uc := NewUpdateInstallmentGroupUseCase(&mockExpenseRepo{})
	err := uc.Execute(context.Background(), UpdateInstallmentGroupRequest{
		UserID:      "u1",
		GroupID:     "g1",
		Description: "   ",
		AmountCents: 1000,
	})
	if err != domainExpense.ErrEmptyDescription {
		t.Fatalf("expected ErrEmptyDescription, got %v", err)
	}
}

func TestUpdateInstallmentGroup_ZeroAmount(t *testing.T) {
	uc := NewUpdateInstallmentGroupUseCase(&mockExpenseRepo{})
	err := uc.Execute(context.Background(), UpdateInstallmentGroupRequest{
		UserID:      "u1",
		GroupID:     "g1",
		Description: "Netflix",
		AmountCents: 0,
	})
	if err != domainExpense.ErrInvalidAmount {
		t.Fatalf("expected ErrInvalidAmount, got %v", err)
	}
}

func TestUpdateInstallmentGroup_NotFound(t *testing.T) {
	repo := &mockExpenseRepo{
		updateGroupFn: func(_ context.Context, _, _, _ string, _ int64, _ *string, _ *string) error {
			return domainExpense.ErrExpenseNotFound
		},
	}
	uc := NewUpdateInstallmentGroupUseCase(repo)
	err := uc.Execute(context.Background(), UpdateInstallmentGroupRequest{
		UserID:      "u1",
		GroupID:     "g-other-user",
		Description: "Netflix",
		AmountCents: 1000,
	})
	if err != domainExpense.ErrExpenseNotFound {
		t.Fatalf("expected ErrExpenseNotFound, got %v", err)
	}
}

func TestUpdateInstallmentGroup_HappyPath(t *testing.T) {
	called := false
	cat := "Lazer"
	pm := "pm-1"
	repo := &mockExpenseRepo{
		updateGroupFn: func(_ context.Context, userID, groupID, description string, amountCents int64, category *string, paymentMethodID *string) error {
			called = true
			if userID != "u1" || groupID != "g1" {
				t.Errorf("unexpected userID/groupID: %s/%s", userID, groupID)
			}
			if description != "Netflix" {
				t.Errorf("unexpected description: %s", description)
			}
			if amountCents != 4990 {
				t.Errorf("unexpected amountCents: %d", amountCents)
			}
			if category == nil || *category != "Lazer" {
				t.Errorf("unexpected category: %v", category)
			}
			if paymentMethodID == nil || *paymentMethodID != "pm-1" {
				t.Errorf("unexpected paymentMethodID: %v", paymentMethodID)
			}
			return nil
		},
	}
	uc := NewUpdateInstallmentGroupUseCase(repo)
	err := uc.Execute(context.Background(), UpdateInstallmentGroupRequest{
		UserID:          "u1",
		GroupID:         "g1",
		Description:     "Netflix",
		AmountCents:     4990,
		Category:        &cat,
		PaymentMethodID: &pm,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !called {
		t.Fatal("repo.UpdateGroup was not called")
	}
}
