package auth

import (
	"context"
	"errors"

	domainUser "dash-fin/internal/domain/user"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

// LoginRequest is the input DTO for the login use case.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginUseCase handles user authentication.
type LoginUseCase struct {
	userRepo     domainUser.Repository
	hasher       domainUser.PasswordHasher
	tokenService TokenService
	refreshRepo  RefreshTokenRepository
}

func NewLoginUseCase(
	userRepo domainUser.Repository,
	hasher domainUser.PasswordHasher,
	tokenService TokenService,
	refreshRepo RefreshTokenRepository,
) *LoginUseCase {
	return &LoginUseCase{
		userRepo:     userRepo,
		hasher:       hasher,
		tokenService: tokenService,
		refreshRepo:  refreshRepo,
	}
}

func (uc *LoginUseCase) Execute(ctx context.Context, req LoginRequest) (*TokenPairResponse, error) {
	email := domainUser.NormalizeEmail(req.Email)
	if email == "" || req.Password == "" {
		return nil, ErrInvalidCredentials
	}

	u, err := uc.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	if !uc.hasher.Verify(u.PasswordHash, req.Password) {
		return nil, ErrInvalidCredentials
	}

	return uc.issueTokens(ctx, u.ID)
}

func (uc *LoginUseCase) issueTokens(ctx context.Context, userID string) (*TokenPairResponse, error) {
	now := timeNow()

	access, _, err := uc.tokenService.NewAccessToken(userID, now)
	if err != nil {
		return nil, err
	}

	refresh, _, refreshExp, err := uc.tokenService.NewRefreshToken(userID, now)
	if err != nil {
		return nil, err
	}

	hash := uc.tokenService.TokenHash(refresh)
	if err := uc.refreshRepo.Create(ctx, userID, hash, refreshExp); err != nil {
		return nil, err
	}

	return &TokenPairResponse{
		AccessToken:  access,
		RefreshToken: refresh,
	}, nil
}
