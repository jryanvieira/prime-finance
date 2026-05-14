package http

import (
	"net/http"
	"strings"
	"time"
)

const (
	cookieAccessToken  = "access_token"
	cookieRefreshToken = "refresh_token"
)

// setAuthCookies seta os dois cookies após login/signup/refresh bem-sucedido.
// secure deve ser false em ambiente de desenvolvimento (HTTP local).
func setAuthCookies(w http.ResponseWriter, accessToken string, accessTTL time.Duration, refreshToken string, refreshTTL time.Duration, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieAccessToken,
		Value:    accessToken,
		Path:     "/",
		MaxAge:   int(accessTTL.Seconds()),
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteStrictMode,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     cookieRefreshToken,
		Value:    refreshToken,
		Path:     "/v1/auth/refresh",
		MaxAge:   int(refreshTTL.Seconds()),
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteStrictMode,
	})
}

// clearAuthCookies expira os dois cookies (logout).
func clearAuthCookies(w http.ResponseWriter, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieAccessToken,
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteStrictMode,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     cookieRefreshToken,
		Path:     "/v1/auth/refresh",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteStrictMode,
	})
}

// tokenFromCookieOrHeader lê o access_token do cookie; fallback para header Authorization Bearer.
func tokenFromCookieOrHeader(r *http.Request) string {
	if c, err := r.Cookie(cookieAccessToken); err == nil && c.Value != "" {
		return c.Value
	}
	h := r.Header.Get("Authorization")
	if strings.HasPrefix(h, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(h, "Bearer "))
	}
	return ""
}

// refreshTokenFromCookieOrBody lê o refresh_token do cookie; fallback para o valor já decodificado do body.
func refreshTokenFromCookieOrBody(r *http.Request, bodyToken string) string {
	if c, err := r.Cookie(cookieRefreshToken); err == nil && c.Value != "" {
		return c.Value
	}
	return bodyToken
}
