package http

import (
	"fmt"
	"io"
	"net/http"
	"strings"

	appExpense "dash-fin/internal/application/expense"
)

type importHandler struct {
	importUC *appExpense.ImportCSVUseCase
}

func newImportHandler(deps RouterDeps) *importHandler {
	return &importHandler{importUC: deps.ImportCSVUC}
}

func (h *importHandler) handleImportCSV(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}

	if err := r.ParseMultipartForm(5 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "failed to parse multipart form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "file field is required")
		return
	}
	defer file.Close()

	if !strings.HasSuffix(strings.ToLower(header.Filename), ".csv") {
		writeError(w, http.StatusBadRequest, "validation_error", "file must be a .csv file")
		return
	}

	paymentMethodID := r.FormValue("payment_method_id")
	var pmID *string
	if paymentMethodID != "" {
		pmID = &paymentMethodID
	}

	data, err := io.ReadAll(file)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to read file")
		return
	}

	resp, err := h.importUC.Execute(r.Context(), appExpense.ImportCSVRequest{
		UserID:          userID,
		PaymentMethodID: pmID,
		FileData:        data,
	})
	if err != nil {
		writeError(w, http.StatusBadRequest, "parse_error", fmt.Sprintf("failed to parse CSV: %s", err.Error()))
		return
	}

	writeJSON(w, http.StatusOK, resp)
}
