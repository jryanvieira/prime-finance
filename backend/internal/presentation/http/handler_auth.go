package http

import (
	"errors"
	"net/http"

	"dash-fin/internal/application/auth"
	domainUser "dash-fin/internal/domain/user"
)

type authHandler struct {
	signupUC  *auth.SignupUseCase
	loginUC   *auth.LoginUseCase
	refreshUC *auth.RefreshUseCase
	logoutUC  *auth.LogoutUseCase
}

func newAuthHandler(deps RouterDeps) *authHandler {
	return &authHandler{
		signupUC:  deps.SignupUC,
		loginUC:   deps.LoginUC,
		refreshUC: deps.RefreshUC,
		logoutUC:  deps.LogoutUC,
	}
}

func (h *authHandler) handleSignup(w http.ResponseWriter, r *http.Request) {
	var req auth.SignupRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid json body")
		return
	}

	resp, err := h.signupUC.Execute(r.Context(), req)
	if err != nil {
		if errors.Is(err, domainUser.ErrEmailAlreadyExists) {
			writeError(w, http.StatusConflict, "email_taken", "email already registered")
			return
		}
		if errors.Is(err, domainUser.ErrInvalidEmail) || errors.Is(err, domainUser.ErrInvalidPassword) || errors.Is(err, domainUser.ErrEmptyName) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to create user")
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *authHandler) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req auth.LoginRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid json body")
		return
	}

	resp, err := h.loginUC.Execute(r.Context(), req)
	if err != nil {
		if errors.Is(err, auth.ErrInvalidCredentials) {
			writeError(w, http.StatusUnauthorized, "invalid_credentials", "invalid credentials")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "failed to login")
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *authHandler) handleRefresh(w http.ResponseWriter, r *http.Request) {
	var req auth.RefreshRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid json body")
		return
	}

	resp, err := h.refreshUC.Execute(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid_refresh", "invalid refresh token")
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *authHandler) handleLogout(w http.ResponseWriter, r *http.Request) {
	var req auth.LogoutRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "invalid json body")
		return
	}

	_ = h.logoutUC.Execute(r.Context(), req)
	w.WriteHeader(http.StatusNoContent)
}
