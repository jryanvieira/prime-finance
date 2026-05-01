package http

import (
	"context"
	"net/http"
	"strings"

	"dash-fin/internal/application/auth"
)

type ctxKey string

const ctxKeyUserID ctxKey = "userID"

func userIDFromContext(ctx context.Context) (string, bool) {
	v := ctx.Value(ctxKeyUserID)
	s, ok := v.(string)
	return s, ok && s != ""
}

func requireUserID(r *http.Request) (string, bool) {
	return userIDFromContext(r.Context())
}

// RequireAuth returns a middleware that validates Bearer tokens.
func RequireAuth(tokenService auth.TokenService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := r.Header.Get("Authorization")
			if h == "" || !strings.HasPrefix(h, "Bearer ") {
				writeError(w, http.StatusUnauthorized, "unauthorized", "missing bearer token")
				return
			}
			raw := strings.TrimSpace(strings.TrimPrefix(h, "Bearer "))
			userID, err := tokenService.ParseAccess(raw)
			if err != nil || userID == "" {
				writeError(w, http.StatusUnauthorized, "unauthorized", "invalid access token")
				return
			}
			ctx := context.WithValue(r.Context(), ctxKeyUserID, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
