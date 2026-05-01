package auth

import (
	"context"
	"errors"
)

var ErrInvalidRefreshToken = errors.New("invalid refresh token")

// RefreshRequest is the input DTO for the refresh use case.
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// RefreshUseCase handles token refresh with rotation.
type RefreshUseCase struct {
	tokenService TokenService
	refreshRepo  RefreshTokenRepository
}

func NewRefreshUseCase(tokenService TokenService, refreshRepo RefreshTokenRepository) *RefreshUseCase {
	return &RefreshUseCase{
		tokenService: tokenService,
		refreshRepo:  refreshRepo,
	}
}

func (uc *RefreshUseCase) Execute(ctx context.Context, req RefreshRequest) (*TokenPairResponse, error) {
	if req.RefreshToken == "" {
		return nil, ErrInvalidRefreshToken
	}

	userID, _, err := uc.tokenService.ParseRefresh(req.RefreshToken)
	if err != nil || userID == "" {
		return nil, ErrInvalidRefreshToken
	}

	now := timeNow()
	hash := uc.tokenService.TokenHash(req.RefreshToken)

	stored, err := uc.refreshRepo.GetByHash(ctx, hash)
	if err != nil {
		return nil, ErrInvalidRefreshToken
	}

	if stored.RevokedAt != nil || stored.ExpiresAt.Before(now) || stored.UserID != userID {
		return nil, ErrInvalidRefreshToken
	}

	// Rotate: revoke old + issue new
	_ = uc.refreshRepo.RevokeByHash(ctx, hash, now)

	access, _, err := uc.tokenService.NewAccessToken(userID, now)
	if err != nil {
		return nil, err
	}

	refresh, _, refreshExp, err := uc.tokenService.NewRefreshToken(userID, now)
	if err != nil {
		return nil, err
	}

	newHash := uc.tokenService.TokenHash(refresh)
	if err := uc.refreshRepo.Create(ctx, userID, newHash, refreshExp); err != nil {
		return nil, err
	}

	return &TokenPairResponse{
		AccessToken:  access,
		RefreshToken: refresh,
	}, nil
}
