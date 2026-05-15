package http

import (
	"net/http"

	appHS "dash-fin/internal/application/healthscore"
)

type healthScoreHandler struct {
	calculateUC *appHS.CalculateHealthScoreUseCase
}

func newHealthScoreHandler(deps RouterDeps) *healthScoreHandler {
	return &healthScoreHandler{calculateUC: deps.CalculateHealthScoreUC}
}

func (h *healthScoreHandler) handleGet(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}

	resp, err := h.calculateUC.Execute(r.Context(), appHS.CalculateHealthScoreRequest{UserID: userID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "erro ao calcular health score")
		return
	}

	writeJSON(w, http.StatusOK, resp)
}
