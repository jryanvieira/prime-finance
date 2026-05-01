package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// JWTTokenService implements application/auth.TokenService using JWT.
type JWTTokenService struct {
	accessSecret  string
	refreshSecret string
	accessTTL     time.Duration
	refreshTTL    time.Duration
}

type JWTConfig struct {
	AccessSecret  string
	RefreshSecret string
	AccessTTL     time.Duration
	RefreshTTL    time.Duration
}

func NewJWTTokenService(cfg JWTConfig) *JWTTokenService {
	return &JWTTokenService{
		accessSecret:  cfg.AccessSecret,
		refreshSecret: cfg.RefreshSecret,
		accessTTL:     cfg.AccessTTL,
		refreshTTL:    cfg.RefreshTTL,
	}
}

type accessClaims struct {
	jwt.RegisteredClaims
	Type string `json:"typ"`
}

type refreshClaims struct {
	jwt.RegisteredClaims
	Type string `json:"typ"`
}

func (s *JWTTokenService) NewAccessToken(userID string, now time.Time) (string, time.Time, error) {
	expiresAt := now.Add(s.accessTTL)
	claims := accessClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
		Type: "access",
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	token, err := t.SignedString([]byte(s.accessSecret))
	return token, expiresAt, err
}

func (s *JWTTokenService) NewRefreshToken(userID string, now time.Time) (string, string, time.Time, error) {
	expiresAt := now.Add(s.refreshTTL)
	jti := uuid.NewString()
	claims := refreshClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ID:        jti,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
		Type: "refresh",
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	token, err := t.SignedString([]byte(s.refreshSecret))
	return token, jti, expiresAt, err
}

func (s *JWTTokenService) ParseAccess(token string) (string, error) {
	var claims accessClaims
	_, err := jwt.ParseWithClaims(token, &claims, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.accessSecret), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		return "", err
	}
	if claims.Type != "access" {
		return "", errors.New("invalid token type")
	}
	return claims.Subject, nil
}

func (s *JWTTokenService) ParseRefresh(token string) (string, string, error) {
	var claims refreshClaims
	_, err := jwt.ParseWithClaims(token, &claims, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.refreshSecret), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		return "", "", err
	}
	if claims.Type != "refresh" {
		return "", "", errors.New("invalid token type")
	}
	return claims.Subject, claims.ID, nil
}

func (s *JWTTokenService) TokenHash(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
