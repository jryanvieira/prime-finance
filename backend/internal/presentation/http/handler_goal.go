package http

import (
	"errors"
	"net/http"

	appGoal "dash-fin/internal/application/goal"
	domainGoal "dash-fin/internal/domain/goal"

	"github.com/go-chi/chi/v5"
)

type goalHandler struct {
	listUC        *appGoal.ListGoalsUseCase
	createUC      *appGoal.CreateGoalUseCase
	updateUC      *appGoal.UpdateGoalUseCase
	contributeUC  *appGoal.ContributeGoalUseCase
	deleteUC      *appGoal.DeleteGoalUseCase
}

func newGoalHandler(deps RouterDeps) *goalHandler {
	return &goalHandler{
		listUC:       deps.ListGoalsUC,
		createUC:     deps.CreateGoalUC,
		updateUC:     deps.UpdateGoalUC,
		contributeUC: deps.ContributeGoalUC,
		deleteUC:     deps.DeleteGoalUC,
	}
}

func (h *goalHandler) handleList(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}

	items, err := h.listUC.Execute(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to list goals")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *goalHandler) handleCreate(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}

	var req appGoal.CreateGoalRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid json body")
		return
	}
	req.UserID = userID

	resp, err := h.createUC.Execute(r.Context(), req)
	if err != nil {
		if errors.Is(err, domainGoal.ErrEmptyName) || errors.Is(err, domainGoal.ErrInvalidTargetAmount) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to create goal")
		return
	}
	writeJSON(w, http.StatusCreated, resp)
}

func (h *goalHandler) handleUpdate(w http.ResponseWriter, r *http.Request) {
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

	var req appGoal.UpdateGoalRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid json body")
		return
	}
	req.UserID = userID
	req.ID = id

	resp, err := h.updateUC.Execute(r.Context(), req)
	if err != nil {
		if errors.Is(err, domainGoal.ErrGoalNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "goal not found")
			return
		}
		if errors.Is(err, domainGoal.ErrEmptyName) || errors.Is(err, domainGoal.ErrInvalidTargetAmount) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to update goal")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *goalHandler) handleContribute(w http.ResponseWriter, r *http.Request) {
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

	var req appGoal.ContributeGoalRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid json body")
		return
	}
	req.UserID = userID
	req.ID = id

	resp, err := h.contributeUC.Execute(r.Context(), req)
	if err != nil {
		if errors.Is(err, domainGoal.ErrGoalNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "goal not found")
			return
		}
		if errors.Is(err, domainGoal.ErrNegativeContribution) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to contribute to goal")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *goalHandler) handleDelete(w http.ResponseWriter, r *http.Request) {
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
		if errors.Is(err, domainGoal.ErrGoalNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "goal not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to delete goal")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
