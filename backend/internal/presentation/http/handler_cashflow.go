package http

import (
	"net/http"

	appCashflow "dash-fin/internal/application/cashflow"
)

type cashflowHandler struct {
	uc *appCashflow.CashflowUseCase
}

func newCashflowHandler(deps RouterDeps) *cashflowHandler {
	return &cashflowHandler{uc: deps.CashflowUC}
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
