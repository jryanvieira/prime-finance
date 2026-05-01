package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	// Application layer
	authApp "dash-fin/internal/application/auth"
	categoryApp "dash-fin/internal/application/category"
	expenseApp "dash-fin/internal/application/expense"
	incomeApp "dash-fin/internal/application/income"
	pmApp "dash-fin/internal/application/paymentmethod"
	reApp "dash-fin/internal/application/recurringexpense"

	// Config
	"dash-fin/internal/config"

	// Infrastructure layer
	infraAuth "dash-fin/internal/infrastructure/auth"
	"dash-fin/internal/infrastructure/crypto"
	"dash-fin/internal/infrastructure/database"
	sqliteRepo "dash-fin/internal/infrastructure/repositories/sqlite"

	// Presentation layer
	httpPresentation "dash-fin/internal/presentation/http"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	cfg, err := config.FromEnv()
	if err != nil {
		logger.Error("invalid config", "error", err)
		os.Exit(2)
	}

	// ── Infrastructure ──────────────────────────────────────────────

	ctx := context.Background()

	db, err := database.Open(ctx, database.OpenOptions{Path: cfg.DBPath})
	if err != nil {
		logger.Error("failed to open database", "error", err)
		os.Exit(2)
	}
	defer db.Close()

	// Run migrations
	ex, _ := os.Executable()
	migrationsDir := filepath.Join(filepath.Dir(ex), "..", "..", "migrations")
	if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
		migrationsDir = "migrations"
	}
	if err := database.Migrate(ctx, db, migrationsDir); err != nil {
		logger.Error("migration failed", "error", err)
		os.Exit(2)
	}

	// Repositories
	userRepo := sqliteRepo.NewUserRepository(db)
	expenseRepo := sqliteRepo.NewExpenseRepository(db)
	incomeRepo := sqliteRepo.NewIncomeRepository(db)
	categoryRepo := sqliteRepo.NewCategoryRepository(db)
	pmRepo := sqliteRepo.NewPaymentMethodRepository(db)
	reRepo := sqliteRepo.NewRecurringExpenseRepository(db)
	refreshTokenRepo := sqliteRepo.NewRefreshTokenRepository(db)

	// Services
	hasher := crypto.NewBcryptHasher(0)
	tokenService := infraAuth.NewJWTTokenService(infraAuth.JWTConfig{
		AccessSecret:  cfg.AccessTokenSecret,
		RefreshSecret: cfg.RefreshTokenSecret,
		AccessTTL:     cfg.AccessTokenTTL,
		RefreshTTL:    cfg.RefreshTokenTTL,
	})

	// ── Application (Use Cases) ─────────────────────────────────────

	signupUC := authApp.NewSignupUseCase(userRepo, hasher, tokenService, refreshTokenRepo)
	loginUC := authApp.NewLoginUseCase(userRepo, hasher, tokenService, refreshTokenRepo)
	refreshUC := authApp.NewRefreshUseCase(tokenService, refreshTokenRepo)
	logoutUC := authApp.NewLogoutUseCase(tokenService, refreshTokenRepo)

	createExpenseUC := expenseApp.NewCreateExpenseUseCase(expenseRepo)
	listExpensesUC := expenseApp.NewListExpensesUseCase(expenseRepo)
	updateExpenseUC := expenseApp.NewUpdateExpenseUseCase(expenseRepo)
	deleteExpenseUC := expenseApp.NewDeleteExpenseUseCase(expenseRepo)
	deleteInstGroupUC := expenseApp.NewDeleteInstallmentGroupUseCase(expenseRepo)
	importCSVUC := expenseApp.NewImportCSVUseCase(expenseRepo)
	monthExpensesUC := expenseApp.NewMonthExpensesUseCase(expenseRepo)

	createIncomeUC := incomeApp.NewCreateIncomeUseCase(incomeRepo)
	listIncomesUC := incomeApp.NewListIncomesUseCase(incomeRepo)
	updateIncomeUC := incomeApp.NewUpdateIncomeUseCase(incomeRepo)
	deleteIncomeUC := incomeApp.NewDeleteIncomeUseCase(incomeRepo)

	listCategoriesUC := categoryApp.NewListCategoriesUseCase(categoryRepo)
	createCategoryUC := categoryApp.NewCreateCategoryUseCase(categoryRepo)
	deleteCategoryUC := categoryApp.NewDeleteCategoryUseCase(categoryRepo)

	createPMUC := pmApp.NewCreatePaymentMethodUseCase(pmRepo)
	listPMUC := pmApp.NewListPaymentMethodsUseCase(pmRepo)
	updatePMUC := pmApp.NewUpdatePaymentMethodUseCase(pmRepo)
	deletePMUC := pmApp.NewDeletePaymentMethodUseCase(pmRepo)

	createREUC := reApp.NewCreateRecurringExpenseUseCase(reRepo)
	listREUC := reApp.NewListRecurringExpensesUseCase(reRepo)
	updateREUC := reApp.NewUpdateRecurringExpenseUseCase(reRepo)
	deleteREUC := reApp.NewDeleteRecurringExpenseUseCase(reRepo)

	// ── Presentation ────────────────────────────────────────────────

	router := httpPresentation.NewRouter(httpPresentation.RouterDeps{
		SignupUC:  signupUC,
		LoginUC:   loginUC,
		RefreshUC: refreshUC,
		LogoutUC:  logoutUC,

		CreateExpenseUC:   createExpenseUC,
		ListExpensesUC:    listExpensesUC,
		UpdateExpenseUC:   updateExpenseUC,
		DeleteExpenseUC:   deleteExpenseUC,
		DeleteInstGroupUC: deleteInstGroupUC,
		ImportCSVUC:       importCSVUC,
		MonthExpensesUC:   monthExpensesUC,

		CreateIncomeUC: createIncomeUC,
		ListIncomesUC:  listIncomesUC,
		UpdateIncomeUC: updateIncomeUC,
		DeleteIncomeUC: deleteIncomeUC,

		ListCategoriesUC: listCategoriesUC,
		CreateCategoryUC: createCategoryUC,
		DeleteCategoryUC: deleteCategoryUC,

		CreatePMUC: createPMUC,
		ListPMUC:   listPMUC,
		UpdatePMUC: updatePMUC,
		DeletePMUC: deletePMUC,

		CreateREUC: createREUC,
		ListREUC:   listREUC,
		UpdateREUC: updateREUC,
		DeleteREUC: deleteREUC,

		TokenService: tokenService,

		RecurringListUC: listREUC,
		IncomeListUC:    listIncomesUC,

		AllowedOrigins: cfg.AllowedOrigins,
	})

	// ── HTTP Server ─────────────────────────────────────────────────

	srv := &http.Server{
		Addr:              cfg.HTTPAddr(),
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	srvCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		logger.Info("http server listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("http server failed", "error", err)
			stop()
		}
	}()

	<-srvCtx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
	_ = db.Close()
	logger.Info("shutdown complete")
}
