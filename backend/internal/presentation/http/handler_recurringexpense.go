package http

import (
	"errors"
	"net/http"
	"strings"

	appRE "dash-fin/internal/application/recurringexpense"
	domainRE "dash-fin/internal/domain/recurringexpense"

	"github.com/go-chi/chi/v5"
)

type recurringExpenseHandler struct {
	createUC *appRE.CreateRecurringExpenseUseCase
	listUC   *appRE.ListRecurringExpensesUseCase
	updateUC *appRE.UpdateRecurringExpenseUseCase
	deleteUC *appRE.DeleteRecurringExpenseUseCase
}

func newRecurringExpenseHandler(deps RouterDeps) *recurringExpenseHandler {
	return &recurringExpenseHandler{
		createUC: deps.CreateREUC,
		listUC:   deps.ListREUC,
		updateUC: deps.UpdateREUC,
		deleteUC: deps.DeleteREUC,
	}
}

func (h *recurringExpenseHandler) handleCreate(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}
	var req appRE.CreateRecurringExpenseRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid json body")
		return
	}
	req.UserID = userID
	req.Description = strings.TrimSpace(req.Description)

	resp, err := h.createUC.Execute(r.Context(), req)
	if err != nil {
		if errors.Is(err, domainRE.ErrEmptyDescription) || errors.Is(err, domainRE.ErrInvalidAmount) || errors.Is(err, domainRE.ErrInvalidDay) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to create recurring expense")
		return
	}
	writeJSON(w, http.StatusCreated, resp)
}

func (h *recurringExpenseHandler) handleList(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}
	items, err := h.listUC.Execute(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to list recurring expenses")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *recurringExpenseHandler) handleUpdate(w http.ResponseWriter, r *http.Request) {
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
	var req appRE.UpdateRecurringExpenseRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid json body")
		return
	}
	req.UserID = userID
	req.ID = id
	req.Description = strings.TrimSpace(req.Description)

	if err := h.updateUC.Execute(r.Context(), req); err != nil {
		if errors.Is(err, domainRE.ErrRecurringExpenseNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "recurring expense not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to update recurring expense")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *recurringExpenseHandler) handleDelete(w http.ResponseWriter, r *http.Request) {
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
		if errors.Is(err, domainRE.ErrRecurringExpenseNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "recurring expense not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to delete recurring expense")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
