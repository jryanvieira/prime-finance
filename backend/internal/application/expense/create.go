package expense

import (
	"context"

	domainExpense "dash-fin/internal/domain/expense"
	"dash-fin/internal/domain/shared"

	"github.com/google/uuid"
)

// --- Create Single Expense ---

type CreateExpenseRequest struct {
	UserID          string  `json:"-"`
	PaymentMethodID *string `json:"payment_method_id"`
	Date            string  `json:"date"`
	Description     string  `json:"description"`
	AmountCents     *int64  `json:"amount_cents"`
	Category        *string `json:"category"`

	InstallmentsCount  *int   `json:"installments_count"`
	MonthlyAmountCents *int64 `json:"monthly_amount_cents"`
	TotalAmountCents   *int64 `json:"total_amount_cents"`
}

type ExpenseResponse struct {
	ID                 string  `json:"id"`
	PaymentMethodID    *string `json:"payment_method_id,omitempty"`
	Date               string  `json:"date"`
	Description        string  `json:"description"`
	AmountCents        int64   `json:"amount_cents"`
	Category           *string `json:"category,omitempty"`
	InstallmentGroupID *string `json:"installment_group_id,omitempty"`
	InstallmentsCount  *int    `json:"installments_count,omitempty"`
	InstallmentIndex   *int    `json:"installment_index,omitempty"`
	MonthlyAmountCents *int64  `json:"monthly_amount_cents,omitempty"`
	TotalAmountCents   *int64  `json:"total_amount_cents,omitempty"`
}

type CreateExpenseUseCase struct {
	repo domainExpense.Repository
}

func NewCreateExpenseUseCase(repo domainExpense.Repository) *CreateExpenseUseCase {
	return &CreateExpenseUseCase{repo: repo}
}

func (uc *CreateExpenseUseCase) Execute(ctx context.Context, req CreateExpenseRequest) (interface{}, error) {
	baseDate, err := shared.ParseDate(req.Date)
	if err != nil {
		return nil, domainExpense.ErrInvalidDate
	}

	// Installment purchase
	if req.InstallmentsCount != nil {
		n := *req.InstallmentsCount
		if n < 2 {
			return nil, domainExpense.ErrInvalidInstallments
		}

		hasTotal := req.TotalAmountCents != nil
		hasMonthly := req.MonthlyAmountCents != nil
		if hasTotal == hasMonthly {
			return nil, domainExpense.ErrInvalidAmount
		}

		var monthly []int64
		var total int64
		if hasTotal {
			total = *req.TotalAmountCents
			monthly, err = shared.SplitTotalIntoInstallments(total, n)
			if err != nil {
				return nil, domainExpense.ErrInvalidAmount
			}
		} else {
			ma := *req.MonthlyAmountCents
			if ma <= 0 {
				return nil, domainExpense.ErrInvalidAmount
			}
			total = ma * int64(n)
			monthly = make([]int64, n)
			for i := 0; i < n; i++ {
				monthly[i] = ma
			}
		}

		groupID := uuid.NewString()
		created := make([]ExpenseResponse, 0, n)
		for i := 0; i < n; i++ {
			d := shared.AddMonthsKeepingDay(baseDate, i)
			idx := i + 1
			amt := monthly[i]

			exp, err := domainExpense.NewInstallmentExpense(
				req.UserID, req.PaymentMethodID,
				shared.MustFormatDate(d), req.Description,
				amt, req.Category,
				groupID, n, idx, amt, total,
			)
			if err != nil {
				return nil, err
			}

			if err := uc.repo.Create(ctx, exp); err != nil {
				return nil, err
			}
			created = append(created, toExpenseResponse(exp))
		}

		return map[string]interface{}{
			"installment_group_id": groupID,
			"items":                created,
		}, nil
	}

	// Single expense
	if req.AmountCents == nil || *req.AmountCents <= 0 {
		return nil, domainExpense.ErrInvalidAmount
	}

	exp, err := domainExpense.NewExpense(
		req.UserID, req.PaymentMethodID,
		shared.MustFormatDate(baseDate), req.Description,
		*req.AmountCents, req.Category,
	)
	if err != nil {
		return nil, err
	}

	if err := uc.repo.Create(ctx, exp); err != nil {
		return nil, err
	}

	return toExpenseResponse(exp), nil
}

func toExpenseResponse(e *domainExpense.Expense) ExpenseResponse {
	return ExpenseResponse{
		ID:                 e.ID,
		PaymentMethodID:    e.PaymentMethodID,
		Date:               e.Date,
		Description:        e.Description,
		AmountCents:        e.AmountCents,
		Category:           e.Category,
		InstallmentGroupID: e.InstallmentGroupID,
		InstallmentsCount:  e.InstallmentsCount,
		InstallmentIndex:   e.InstallmentIndex,
		MonthlyAmountCents: e.MonthlyAmountCents,
		TotalAmountCents:   e.TotalAmountCents,
	}
}
