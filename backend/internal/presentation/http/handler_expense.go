package http

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	appExpense "dash-fin/internal/application/expense"
	domainExpense "dash-fin/internal/domain/expense"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type expenseHandler struct {
	createUC          *appExpense.CreateExpenseUseCase
	listUC            *appExpense.ListExpensesUseCase
	updateUC          *appExpense.UpdateExpenseUseCase
	deleteUC          *appExpense.DeleteExpenseUseCase
	deleteGroupUC     *appExpense.DeleteInstallmentGroupUseCase
	updateGroupUC     *appExpense.UpdateInstallmentGroupUseCase
	categoryHistoryUC *appExpense.CategoryHistoryUseCase
}

func newExpenseHandler(deps RouterDeps) *expenseHandler {
	return &expenseHandler{
		createUC:          deps.CreateExpenseUC,
		listUC:            deps.ListExpensesUC,
		updateUC:          deps.UpdateExpenseUC,
		deleteUC:          deps.DeleteExpenseUC,
		deleteGroupUC:     deps.DeleteInstGroupUC,
		updateGroupUC:     deps.UpdateInstGroupUC,
		categoryHistoryUC: deps.CategoryHistoryUC,
	}
}

func (h *expenseHandler) handleCreate(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}

	var req appExpense.CreateExpenseRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid json body")
		return
	}
	req.UserID = userID
	req.Description = strings.TrimSpace(req.Description)

	resp, err := h.createUC.Execute(r.Context(), req)
	if err != nil {
		if errors.Is(err, domainExpense.ErrEmptyDescription) || errors.Is(err, domainExpense.ErrInvalidAmount) ||
			errors.Is(err, domainExpense.ErrInvalidDate) || errors.Is(err, domainExpense.ErrInvalidInstallments) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to create expense")
		return
	}

	writeJSON(w, http.StatusCreated, resp)
}

func (h *expenseHandler) handleList(w http.ResponseWriter, r *http.Request) {
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

	items, err := h.listUC.Execute(r.Context(), appExpense.ListExpensesRequest{
		UserID: userID, From: from, To: to,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to list expenses")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *expenseHandler) handleUpdate(w http.ResponseWriter, r *http.Request) {
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

	var req appExpense.UpdateExpenseRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid json body")
		return
	}
	req.UserID = userID
	req.ID = id
	req.Description = strings.TrimSpace(req.Description)

	err := h.updateUC.Execute(r.Context(), req)
	if err != nil {
		if errors.Is(err, domainExpense.ErrExpenseNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "expense not found")
			return
		}
		if errors.Is(err, domainExpense.ErrEmptyDescription) || errors.Is(err, domainExpense.ErrInvalidAmount) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to update expense")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *expenseHandler) handleDelete(w http.ResponseWriter, r *http.Request) {
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
		if errors.Is(err, domainExpense.ErrExpenseNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "expense not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to delete expense")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *expenseHandler) handleCategoryHistory(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}

	months := 6
	if m := r.URL.Query().Get("months"); m != "" {
		var n int
		if _, err := fmt.Sscanf(m, "%d", &n); err != nil || n < 1 || n > 12 {
			writeError(w, http.StatusBadRequest, "validation_error", "months must be between 1 and 12")
			return
		}
		months = n
	}

	resp, err := h.categoryHistoryUC.Execute(r.Context(), appExpense.CategoryHistoryRequest{
		UserID: userID,
		Months: months,
	})
	if err != nil {
		if errors.Is(err, appExpense.ErrInvalidMonthsParam) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to get category history")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *expenseHandler) handleUpdateInstallmentGroup(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}
	groupID := chi.URLParam(r, "group_id")
	if groupID == "" {
		writeError(w, http.StatusBadRequest, "validation_error", "group_id is required")
		return
	}
	if _, err := uuid.Parse(groupID); err != nil {
		writeError(w, http.StatusBadRequest, "validation_error", "invalid group_id")
		return
	}

	var req appExpense.UpdateInstallmentGroupRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid json body")
		return
	}
	req.UserID = userID
	req.GroupID = groupID

	if err := h.updateGroupUC.Execute(r.Context(), req); err != nil {
		if errors.Is(err, domainExpense.ErrExpenseNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "installment group not found")
			return
		}
		if errors.Is(err, domainExpense.ErrEmptyDescription) || errors.Is(err, domainExpense.ErrInvalidAmount) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to update installment group")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"updated": true})
}

func (h *expenseHandler) handleDeleteInstallmentGroup(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}
	groupID := chi.URLParam(r, "group_id")
	if groupID == "" {
		writeError(w, http.StatusBadRequest, "validation_error", "group_id is required")
		return
	}
	if _, err := uuid.Parse(groupID); err != nil {
		writeError(w, http.StatusBadRequest, "validation_error", "invalid group_id")
		return
	}

	if err := h.deleteGroupUC.Execute(r.Context(), userID, groupID); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to delete installment group")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
