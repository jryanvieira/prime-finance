package http

import (
	"net/http"

	appAlert "dash-fin/internal/application/alert"
)

type alertHandler struct {
	listUC *appAlert.ListAlertsUseCase
}

func newAlertHandler(deps RouterDeps) *alertHandler {
	return &alertHandler{listUC: deps.ListAlertsUC}
}

func (h *alertHandler) handleListAlerts(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}

	resp, err := h.listUC.Execute(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to get alerts")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}
