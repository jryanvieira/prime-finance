package http

import (
	"errors"
	"net/http"
	"strings"

	appPM "dash-fin/internal/application/paymentmethod"
	domainPM "dash-fin/internal/domain/paymentmethod"

	"github.com/go-chi/chi/v5"
)

type paymentMethodHandler struct {
	createUC *appPM.CreatePaymentMethodUseCase
	listUC   *appPM.ListPaymentMethodsUseCase
	updateUC *appPM.UpdatePaymentMethodUseCase
	deleteUC *appPM.DeletePaymentMethodUseCase
}

func newPaymentMethodHandler(deps RouterDeps) *paymentMethodHandler {
	return &paymentMethodHandler{
		createUC: deps.CreatePMUC,
		listUC:   deps.ListPMUC,
		updateUC: deps.UpdatePMUC,
		deleteUC: deps.DeletePMUC,
	}
}

func (h *paymentMethodHandler) handleCreate(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}
	var req appPM.CreatePaymentMethodRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid json body")
		return
	}
	req.UserID = userID
	req.Type = strings.TrimSpace(req.Type)
	req.Label = strings.TrimSpace(req.Label)
	req.Color = strings.TrimSpace(req.Color)
	if req.Color == "" {
		req.Color = "#3b82f6"
	}

	resp, err := h.createUC.Execute(r.Context(), req)
	if err != nil {
		if errors.Is(err, domainPM.ErrEmptyLabel) || errors.Is(err, domainPM.ErrEmptyType) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to create payment method")
		return
	}
	writeJSON(w, http.StatusCreated, resp)
}

func (h *paymentMethodHandler) handleList(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}
	items, err := h.listUC.Execute(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to list payment methods")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *paymentMethodHandler) handleUpdate(w http.ResponseWriter, r *http.Request) {
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
	var req appPM.UpdatePaymentMethodRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid json body")
		return
	}
	req.UserID = userID
	req.ID = id
	req.Type = strings.TrimSpace(req.Type)
	req.Label = strings.TrimSpace(req.Label)
	req.Color = strings.TrimSpace(req.Color)
	if req.Color == "" {
		req.Color = "#3b82f6"
	}

	if err := h.updateUC.Execute(r.Context(), req); err != nil {
		if errors.Is(err, domainPM.ErrPaymentMethodNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "payment method not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to update payment method")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *paymentMethodHandler) handleDelete(w http.ResponseWriter, r *http.Request) {
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
		if errors.Is(err, domainPM.ErrPaymentMethodNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "payment method not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to delete payment method")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
