package sqlite

import (
	"context"
	"database/sql"
	"time"

	"dash-fin/internal/application/auth"

	"github.com/google/uuid"
)

// RefreshTokenRepository implements application/auth.RefreshTokenRepository.
type RefreshTokenRepository struct {
	db *sql.DB
}

func NewRefreshTokenRepository(db *sql.DB) *RefreshTokenRepository {
	return &RefreshTokenRepository{db: db}
}

func (r *RefreshTokenRepository) Create(ctx context.Context, userID string, tokenHash string, expiresAt time.Time) error {
	id := uuid.NewString()
	_, err := r.db.ExecContext(ctx, `
INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
VALUES (?, ?, ?, ?);
`, id, userID, tokenHash, expiresAt.UTC().Format(time.RFC3339Nano))
	return err
}

func (r *RefreshTokenRepository) GetByHash(ctx context.Context, hash string) (*auth.StoredRefreshToken, error) {
	var rt auth.StoredRefreshToken
	var expiresAt string
	var revokedAt sql.NullString
	var createdAt string

	err := r.db.QueryRowContext(ctx, `
SELECT id, user_id, token_hash, expires_at, revoked_at, created_at
FROM refresh_tokens
WHERE token_hash = ?
LIMIT 1;
`, hash).Scan(&rt.ID, &rt.UserID, &rt.TokenHash, &expiresAt, &revokedAt, &createdAt)
	if err == sql.ErrNoRows {
		return nil, auth.ErrInvalidRefreshToken
	}
	if err != nil {
		return nil, err
	}

	t, err := time.Parse(time.RFC3339Nano, expiresAt)
	if err != nil {
		return nil, err
	}
	rt.ExpiresAt = t

	if revokedAt.Valid {
		x, err := time.Parse(time.RFC3339Nano, revokedAt.String)
		if err != nil {
			return nil, err
		}
		rt.RevokedAt = &x
	}

	ct, err := time.Parse(time.RFC3339Nano, createdAt)
	if err == nil {
		rt.CreatedAt = ct
	}

	return &rt, nil
}

func (r *RefreshTokenRepository) RevokeByHash(ctx context.Context, hash string, now time.Time) error {
	_, err := r.db.ExecContext(ctx, `
UPDATE refresh_tokens
SET revoked_at = ?
WHERE token_hash = ? AND revoked_at IS NULL;
`, now.UTC().Format(time.RFC3339Nano), hash)
	return err
}
