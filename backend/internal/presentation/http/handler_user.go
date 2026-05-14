package http

import (
	"net/http"

	appAuth "dash-fin/internal/application/auth"
)

type userHandler struct {
	getMeUC              *appAuth.GetMeUseCase
	completeOnboardingUC *appAuth.CompleteOnboardingUseCase
}

func newUserHandler(deps RouterDeps) *userHandler {
	return &userHandler{
		getMeUC:              deps.GetMeUC,
		completeOnboardingUC: deps.CompleteOnboardingUC,
	}
}

func (h *userHandler) handleGetMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}

	profile, err := h.getMeUC.Execute(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to get user")
		return
	}
	writeJSON(w, http.StatusOK, profile)
}

func (h *userHandler) handleCompleteOnboarding(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing user")
		return
	}

	if err := h.completeOnboardingUC.Execute(r.Context(), userID); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to update onboarding")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
