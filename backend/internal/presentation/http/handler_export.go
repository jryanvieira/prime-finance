package http

import (
	"errors"
	"fmt"
	"net/http"

	appExpense "dash-fin/internal/application/expense"
	domainExpense "dash-fin/internal/domain/expense"
)

type exportHandler struct {
	exportCSVUC *appExpense.ExportCSVUseCase
}

func newExportHandler(deps RouterDeps) *exportHandler {
	return &exportHandler{exportCSVUC: deps.ExportCSVUC}
}

func (h *exportHandler) handleExportCSV(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}

	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	if from == "" || to == "" {
		writeError(w, http.StatusBadRequest, "validation_error", "from and to query params are required (YYYY-MM-DD)")
		return
	}

	data, err := h.exportCSVUC.Execute(r.Context(), appExpense.ExportCSVRequest{
		UserID: userID, From: from, To: to,
	})
	if err != nil {
		if errors.Is(err, domainExpense.ErrInvalidDate) {
			writeError(w, http.StatusBadRequest, "validation_error", "invalid date format (expected YYYY-MM-DD)")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to export")
		return
	}

	filename := fmt.Sprintf("gastos-%s-%s.csv", from, to)
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}
