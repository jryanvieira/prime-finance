package auth

import (
	"context"
	"time"
)

// TokenService defines the contract for generating and validating JWT tokens.
// This interface lives in the application layer because auth is a use case concern,
// not a domain concern.
type TokenService interface {
	NewAccessToken(userID string, now time.Time) (token string, expiresAt time.Time, err error)
	NewRefreshToken(userID string, now time.Time) (token string, jti string, expiresAt time.Time, err error)
	ParseAccess(token string) (userID string, err error)
	ParseRefresh(token string) (userID string, jti string, err error)
	TokenHash(raw string) string
}

// RefreshTokenRepository defines persistence for refresh tokens.
type RefreshTokenRepository interface {
	Create(ctx context.Context, userID string, tokenHash string, expiresAt time.Time) error
	GetByHash(ctx context.Context, hash string) (*StoredRefreshToken, error)
	RevokeByHash(ctx context.Context, hash string, now time.Time) error
}

// StoredRefreshToken represents a persisted refresh token.
type StoredRefreshToken struct {
	ID        string
	UserID    string
	TokenHash string
	ExpiresAt time.Time
	RevokedAt *time.Time
	CreatedAt time.Time
}
