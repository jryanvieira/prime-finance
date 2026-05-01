package auth

import "context"

// LogoutRequest is the input DTO for the logout use case.
type LogoutRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// LogoutUseCase handles user logout by revoking the refresh token.
type LogoutUseCase struct {
	tokenService TokenService
	refreshRepo  RefreshTokenRepository
}

func NewLogoutUseCase(tokenService TokenService, refreshRepo RefreshTokenRepository) *LogoutUseCase {
	return &LogoutUseCase{
		tokenService: tokenService,
		refreshRepo:  refreshRepo,
	}
}

func (uc *LogoutUseCase) Execute(ctx context.Context, req LogoutRequest) error {
	if req.RefreshToken == "" {
		return nil // best-effort
	}
	hash := uc.tokenService.TokenHash(req.RefreshToken)
	_ = uc.refreshRepo.RevokeByHash(ctx, hash, timeNow())
	return nil
}
