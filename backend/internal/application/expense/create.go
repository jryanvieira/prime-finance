package expense

import (
	"context"
	"fmt"
	"log/slog"

	domainBudget "dash-fin/internal/domain/budget"
	domainExpense "dash-fin/internal/domain/expense"
	"dash-fin/internal/domain/shared"
	domainUser "dash-fin/internal/domain/user"
	pkgmailer "dash-fin/pkg/mailer"

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
	repo       domainExpense.Repository
	budgetRepo domainBudget.Repository
	userRepo   domainUser.Repository
	mailer     pkgmailer.Mailer // nil = alertas desabilitados
}

func NewCreateExpenseUseCase(
	repo domainExpense.Repository,
	budgetRepo domainBudget.Repository,
	userRepo domainUser.Repository,
	mailer pkgmailer.Mailer,
) *CreateExpenseUseCase {
	return &CreateExpenseUseCase{
		repo:       repo,
		budgetRepo: budgetRepo,
		userRepo:   userRepo,
		mailer:     mailer,
	}
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

	uc.checkBudgetAlert(ctx, exp)

	return toExpenseResponse(exp), nil
}

func (uc *CreateExpenseUseCase) checkBudgetAlert(ctx context.Context, exp *domainExpense.Expense) {
	if uc.mailer == nil || exp.Category == nil {
		return
	}

	month := exp.Date[:7] // "YYYY-MM"
	budgets, err := uc.budgetRepo.ListWithSpent(ctx, exp.UserID, month)
	if err != nil {
		return
	}

	for _, b := range budgets {
		if b.Budget.CategoryID != *exp.Category {
			continue
		}
		if b.Budget.AmountCents == 0 {
			return
		}
		pct := float64(b.SpentCents) / float64(b.Budget.AmountCents)
		if pct < 0.8 {
			return
		}

		u, err := uc.userRepo.GetByID(ctx, exp.UserID)
		if err != nil {
			return
		}

		subject := fmt.Sprintf("Alerta: orçamento de %s atingiu %.0f%%", *exp.Category, pct*100)
		html := fmt.Sprintf(
			"<p>Olá, %s!</p><p>O orçamento da categoria <strong>%s</strong> atingiu <strong>%.0f%%</strong> (R$ %.2f de R$ %.2f).</p>",
			u.Name, *exp.Category, pct*100,
			float64(b.SpentCents)/100, float64(b.Budget.AmountCents)/100,
		)

		if err := uc.mailer.Send(ctx, u.Email.String(), subject, html); err != nil {
			slog.Warn("budget alert send failed", "error", err, "user_id", exp.UserID)
		}
		return
	}
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
