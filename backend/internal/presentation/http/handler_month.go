package http

import (
	"net/http"

	appExpense "dash-fin/internal/application/expense"
	appIncome "dash-fin/internal/application/income"
	appRE "dash-fin/internal/application/recurringexpense"
	"dash-fin/internal/domain/shared"

	"github.com/go-chi/chi/v5"
)

type monthHandler struct {
	monthExpensesUC *appExpense.MonthExpensesUseCase
	recurringListUC *appRE.ListRecurringExpensesUseCase
	incomeListUC    *appIncome.ListIncomesUseCase
}

func newMonthHandler(deps RouterDeps) *monthHandler {
	return &monthHandler{
		monthExpensesUC: deps.MonthExpensesUC,
		recurringListUC: deps.RecurringListUC,
		incomeListUC:    deps.IncomeListUC,
	}
}

type monthExpenseItem struct {
	Source string `json:"source"` // "expense" | "recurring"

	appExpense.ExpenseResponse

	RecurringID *string `json:"recurring_id,omitempty"`
}

func (h *monthHandler) handleMonthExpenses(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}

	monthStr := chi.URLParam(r, "month")
	month, err := shared.ParseMonth(monthStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "validation_error", "invalid month (expected YYYY-MM)")
		return
	}

	from, to := shared.StartEndOfMonth(month)

	// Get expenses
	expenses, err := h.monthExpensesUC.Execute(r.Context(), appExpense.MonthExpensesRequest{
		UserID: userID, Month: monthStr,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to list expenses")
		return
	}

	// Get recurring expenses
	recurring, err := h.recurringListUC.Execute(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to list recurring expenses")
		return
	}

	// Get incomes
	incomes, err := h.incomeListUC.Execute(r.Context(), appIncome.ListIncomesRequest{
		UserID: userID, From: from, To: to,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to list incomes")
		return
	}

	var items []monthExpenseItem
	var totalExpenses int64

	for _, e := range expenses {
		items = append(items, monthExpenseItem{
			Source:          "expense",
			ExpenseResponse: e,
		})
		totalExpenses += e.AmountCents
	}

	for _, re := range recurring {
		start, err := shared.ParseMonth(re.StartMonth)
		if err != nil {
			continue
		}
		if start.After(month) {
			continue
		}
		d, err := shared.DateForMonthDay(month, re.DayOfMonth)
		if err != nil {
			continue
		}
		date := shared.MustFormatDate(d)
		recID := re.ID
		items = append(items, monthExpenseItem{
			Source: "recurring",
			ExpenseResponse: appExpense.ExpenseResponse{
				ID:              "",
				PaymentMethodID: re.PaymentMethodID,
				Date:            date,
				Description:     re.Description,
				AmountCents:     re.AmountCents,
				Category:        re.Category,
			},
			RecurringID: &recID,
		})
		totalExpenses += re.AmountCents
	}

	var totalIncomes int64
	for _, inc := range incomes {
		totalIncomes += inc.AmountCents
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"month":          monthStr,
		"from":           from,
		"to":             to,
		"items":          items,
		"incomes":        incomes,
		"total_expenses": totalExpenses,
		"total_incomes":  totalIncomes,
		"balance":        totalIncomes - totalExpenses,
	})
}
