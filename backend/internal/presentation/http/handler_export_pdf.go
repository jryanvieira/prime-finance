package http

import (
	"net/http"
	"regexp"

	appCashflow "dash-fin/internal/application/cashflow"

	"github.com/go-chi/chi/v5"
)

type exportPDFHandler struct {
	exportUC *appCashflow.ExportPDFUseCase
}

func newExportPDFHandler(deps RouterDeps) *exportPDFHandler {
	return &exportPDFHandler{exportUC: deps.ExportPDFUC}
}

func (h *exportPDFHandler) handleExportPDF(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}

	month := chi.URLParam(r, "month")
	if month == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "month is required")
		return
	}

	matched, _ := regexp.MatchString(`^\d{4}-\d{2}$`, month)
	if !matched {
		writeError(w, http.StatusBadRequest, "bad_request", "month must be YYYY-MM")
		return
	}

	data, err := h.exportUC.Execute(r.Context(), appCashflow.ExportPDFRequest{
		UserID: userID,
		Month:  month,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "erro ao gerar PDF")
		return
	}

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", `attachment; filename="extrato-`+month+`.pdf"`)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}
