package http

import (
	"errors"
	"net/http"
	"strings"

	appCategory "dash-fin/internal/application/category"
	domainCategory "dash-fin/internal/domain/category"

	"github.com/go-chi/chi/v5"
)

type categoryHandler struct {
	listUC   *appCategory.ListCategoriesUseCase
	createUC *appCategory.CreateCategoryUseCase
	deleteUC *appCategory.DeleteCategoryUseCase
}

func newCategoryHandler(deps RouterDeps) *categoryHandler {
	return &categoryHandler{
		listUC:   deps.ListCategoriesUC,
		createUC: deps.CreateCategoryUC,
		deleteUC: deps.DeleteCategoryUC,
	}
}

func (h *categoryHandler) handleList(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}
	catType := r.URL.Query().Get("type")
	items, err := h.listUC.Execute(r.Context(), appCategory.ListCategoriesRequest{
		UserID: userID, Type: catType,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to list categories")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *categoryHandler) handleCreate(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}
	var req appCategory.CreateCategoryRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid json body")
		return
	}
	req.UserID = userID
	req.Name = strings.TrimSpace(req.Name)
	if req.Color == "" {
		req.Color = "#6b7280"
	}
	if req.Type == "" {
		req.Type = "expense"
	}
	if req.Type != "expense" && req.Type != "income" && req.Type != "both" {
		writeError(w, http.StatusBadRequest, "validation_error", "type must be expense, income, or both")
		return
	}

	resp, err := h.createUC.Execute(r.Context(), req)
	if err != nil {
		if errors.Is(err, domainCategory.ErrEmptyName) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to create category")
		return
	}
	writeJSON(w, http.StatusCreated, resp)
}

func (h *categoryHandler) handleDelete(w http.ResponseWriter, r *http.Request) {
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
		if errors.Is(err, domainCategory.ErrCategoryNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "category not found or is a default category")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to delete category")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
