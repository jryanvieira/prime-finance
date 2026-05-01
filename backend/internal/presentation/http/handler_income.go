package http

import (
	"errors"
	"net/http"
	"strings"

	appIncome "dash-fin/internal/application/income"
	domainIncome "dash-fin/internal/domain/income"

	"github.com/go-chi/chi/v5"
)

type incomeHandler struct {
	createUC *appIncome.CreateIncomeUseCase
	listUC   *appIncome.ListIncomesUseCase
	updateUC *appIncome.UpdateIncomeUseCase
	deleteUC *appIncome.DeleteIncomeUseCase
}

func newIncomeHandler(deps RouterDeps) *incomeHandler {
	return &incomeHandler{
		createUC: deps.CreateIncomeUC,
		listUC:   deps.ListIncomesUC,
		updateUC: deps.UpdateIncomeUC,
		deleteUC: deps.DeleteIncomeUC,
	}
}

func (h *incomeHandler) handleCreate(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}
	var req appIncome.CreateIncomeRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid json body")
		return
	}
	req.UserID = userID
	req.Description = strings.TrimSpace(req.Description)

	resp, err := h.createUC.Execute(r.Context(), req)
	if err != nil {
		if errors.Is(err, domainIncome.ErrEmptyDescription) || errors.Is(err, domainIncome.ErrInvalidAmount) || errors.Is(err, domainIncome.ErrInvalidDate) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to create income")
		return
	}
	writeJSON(w, http.StatusCreated, resp)
}

func (h *incomeHandler) handleList(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	if from == "" || to == "" {
		writeError(w, http.StatusBadRequest, "validation_error", "from and to are required")
		return
	}
	items, err := h.listUC.Execute(r.Context(), appIncome.ListIncomesRequest{
		UserID: userID, From: from, To: to,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to list incomes")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *incomeHandler) handleUpdate(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "validation_error", "id is required")
		return
	}
	var req appIncome.UpdateIncomeRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid json body")
		return
	}
	req.UserID = userID
	req.ID = id
	req.Description = strings.TrimSpace(req.Description)

	if err := h.updateUC.Execute(r.Context(), req); err != nil {
		if errors.Is(err, domainIncome.ErrIncomeNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "income not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to update income")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *incomeHandler) handleDelete(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "validation_error", "id is required")
		return
	}
	if err := h.deleteUC.Execute(r.Context(), userID, id); err != nil {
		if errors.Is(err, domainIncome.ErrIncomeNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "income not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to delete income")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
