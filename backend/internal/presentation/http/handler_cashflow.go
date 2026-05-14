package http

import (
	"errors"
	"net/http"

	appCashflow "dash-fin/internal/application/cashflow"

	"github.com/go-chi/chi/v5"
)

type cashflowHandler struct {
	uc              *appCashflow.CashflowUseCase
	monthlySummaryUC *appCashflow.MonthlySummaryUseCase
}

func newCashflowHandler(deps RouterDeps) *cashflowHandler {
	return &cashflowHandler{
		uc:               deps.CashflowUC,
		monthlySummaryUC: deps.MonthlySummaryUC,
	}
}

func (h *cashflowHandler) handleMonthlySummary(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}

	month := chi.URLParam(r, "month")
	resp, err := h.monthlySummaryUC.Execute(r.Context(), appCashflow.MonthlySummaryRequest{
		UserID: userID,
		Month:  month,
	})
	if err != nil {
		if errors.Is(err, appCashflow.ErrInvalidMonth) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to get monthly summary")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *cashflowHandler) handleGet(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}

	month := r.URL.Query().Get("month")
	if month == "" {
		writeError(w, http.StatusBadRequest, "validation_error", "month query param required (YYYY-MM)")
		return
	}

	resp, err := h.uc.Execute(r.Context(), userID, month)
	if err != nil {
		writeError(w, http.StatusBadRequest, "validation_error", "invalid month format (expected YYYY-MM)")
		return
	}

	writeJSON(w, http.StatusOK, resp)
}
