package auth

import (
	"context"

	domainUser "dash-fin/internal/domain/user"
)

// SignupRequest is the input DTO for the signup use case.
type SignupRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

// TokenPairResponse is the output DTO containing access and refresh tokens.
type TokenPairResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// SignupUseCase handles user registration.
type SignupUseCase struct {
	userRepo     domainUser.Repository
	hasher       domainUser.PasswordHasher
	tokenService TokenService
	refreshRepo  RefreshTokenRepository
}

func NewSignupUseCase(
	userRepo domainUser.Repository,
	hasher domainUser.PasswordHasher,
	tokenService TokenService,
	refreshRepo RefreshTokenRepository,
) *SignupUseCase {
	return &SignupUseCase{
		userRepo:     userRepo,
		hasher:       hasher,
		tokenService: tokenService,
		refreshRepo:  refreshRepo,
	}
}

func (uc *SignupUseCase) Execute(ctx context.Context, req SignupRequest) (*TokenPairResponse, error) {
	// 1. Create email VO
	emailVO, err := domainUser.NewEmail(req.Email)
	if err != nil {
		return nil, err
	}

	// 2. Create user entity (validations + hashing happen inside)
	newUser, err := domainUser.NewUser(req.Name, emailVO, req.Password, uc.hasher)
	if err != nil {
		return nil, err
	}

	// 3. Persist
	if err := uc.userRepo.Save(ctx, newUser); err != nil {
		return nil, err
	}

	// 4. Issue tokens
	return uc.issueTokens(ctx, newUser.ID)
}

func (uc *SignupUseCase) issueTokens(ctx context.Context, userID string) (*TokenPairResponse, error) {
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
