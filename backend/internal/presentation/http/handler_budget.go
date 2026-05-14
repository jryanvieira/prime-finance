package http

import (
	"errors"
	"net/http"
	"time"

	appBudget "dash-fin/internal/application/budget"
	domainBudget "dash-fin/internal/domain/budget"

	"github.com/go-chi/chi/v5"
)

type budgetHandler struct {
	listUC   *appBudget.ListBudgetsUseCase
	upsertUC *appBudget.UpsertBudgetUseCase
	deleteUC *appBudget.DeleteBudgetUseCase
}

func newBudgetHandler(deps RouterDeps) *budgetHandler {
	return &budgetHandler{
		listUC:   deps.ListBudgetsUC,
		upsertUC: deps.UpsertBudgetUC,
		deleteUC: deps.DeleteBudgetUC,
	}
}

func (h *budgetHandler) handleList(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}

	month := r.URL.Query().Get("month")
	if month == "" {
		month = time.Now().UTC().Format("2006-01")
	}

	items, err := h.listUC.Execute(r.Context(), userID, month)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to list budgets")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "month": month})
}

func (h *budgetHandler) handleUpsert(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}

	var req appBudget.UpsertBudgetRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid json body")
		return
	}
	req.UserID = userID

	resp, err := h.upsertUC.Execute(r.Context(), req)
	if err != nil {
		if errors.Is(err, domainBudget.ErrEmptyCategoryID) || errors.Is(err, domainBudget.ErrEmptyMonth) || errors.Is(err, domainBudget.ErrInvalidAmount) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to save budget")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *budgetHandler) handleDelete(w http.ResponseWriter, r *http.Request) {
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
		if errors.Is(err, domainBudget.ErrBudgetNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "budget not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to delete budget")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
