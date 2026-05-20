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
	alertApp "dash-fin/internal/application/alert"
	infraMailer "dash-fin/internal/infrastructure/mailer"
	pkgmailer "dash-fin/pkg/mailer"
	authApp "dash-fin/internal/application/auth"
	budgetApp "dash-fin/internal/application/budget"
	cashflowApp "dash-fin/internal/application/cashflow"
	categoryApp "dash-fin/internal/application/category"
	expenseApp "dash-fin/internal/application/expense"
	goalApp "dash-fin/internal/application/goal"
	hsApp "dash-fin/internal/application/healthscore"
	incomeApp "dash-fin/internal/application/income"
	pmApp "dash-fin/internal/application/paymentmethod"
	reApp "dash-fin/internal/application/recurringexpense"

	// Config
	"dash-fin/internal/config"

	// Infrastructure layer
	infraAuth "dash-fin/internal/infrastructure/auth"
	"dash-fin/internal/infrastructure/crypto"
	"dash-fin/internal/infrastructure/database"
	infraPDF "dash-fin/internal/infrastructure/pdf"
	sqliteRepo "dash-fin/internal/infrastructure/repositories/sqlite"

	// Presentation layer
	httpPresentation "dash-fin/internal/presentation/http"

	"dash-fin/pkg/timeutil"
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
	budgetRepo := sqliteRepo.NewBudgetRepository(db)
	goalRepo := sqliteRepo.NewGoalRepository(db)
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

	// ── Email ───────────────────────────────────────────────────────

	var emailMailer pkgmailer.Mailer
	if cfg.ResendAPIKey != "" {
		emailMailer = infraMailer.NewResendMailer(cfg.ResendAPIKey, cfg.MailFrom)
		logger.Info("email alerts enabled", "from", cfg.MailFrom)
	}

	// ── Application (Use Cases) ─────────────────────────────────────

	signupUC := authApp.NewSignupUseCase(userRepo, hasher, tokenService, refreshTokenRepo)
	loginUC := authApp.NewLoginUseCase(userRepo, hasher, tokenService, refreshTokenRepo)
	refreshUC := authApp.NewRefreshUseCase(tokenService, refreshTokenRepo)
	logoutUC := authApp.NewLogoutUseCase(tokenService, refreshTokenRepo)

	createExpenseUC := expenseApp.NewCreateExpenseUseCase(expenseRepo, budgetRepo, userRepo, emailMailer)
	listExpensesUC := expenseApp.NewListExpensesUseCase(expenseRepo)
	updateExpenseUC := expenseApp.NewUpdateExpenseUseCase(expenseRepo)
	deleteExpenseUC := expenseApp.NewDeleteExpenseUseCase(expenseRepo)
	deleteInstGroupUC := expenseApp.NewDeleteInstallmentGroupUseCase(expenseRepo)
	updateInstGroupUC := expenseApp.NewUpdateInstallmentGroupUseCase(expenseRepo)
	importCSVUC := expenseApp.NewImportCSVUseCase(expenseRepo)
	monthExpensesUC := expenseApp.NewMonthExpensesUseCase(expenseRepo)
	exportCSVUC := expenseApp.NewExportCSVUseCase(expenseRepo)
	categorySummaryUC := expenseApp.NewCategorySummaryUseCase(expenseRepo)

	getMeUC := authApp.NewGetMeUseCase(userRepo)
	completeOnboardingUC := authApp.NewCompleteOnboardingUseCase(userRepo)

	listBudgetsUC := budgetApp.NewListBudgetsUseCase(budgetRepo)
	upsertBudgetUC := budgetApp.NewUpsertBudgetUseCase(budgetRepo)
	deleteBudgetUC := budgetApp.NewDeleteBudgetUseCase(budgetRepo)

	cashflowUC := cashflowApp.NewCashflowUseCase(expenseRepo, incomeRepo, reRepo)
	monthlySummaryUC := cashflowApp.NewMonthlySummaryUseCase(expenseRepo, incomeRepo, budgetRepo, reRepo)
	exportPDFUC := cashflowApp.NewExportPDFUseCase(monthlySummaryUC, expenseRepo, infraPDF.NewPDFGenerator())
	categoryHistoryUC := expenseApp.NewCategoryHistoryUseCase(expenseRepo)
	listAlertsUC := alertApp.NewListAlertsUseCase(reRepo, expenseRepo, timeutil.RealClock{})

	listGoalsUC := goalApp.NewListGoalsUseCase(goalRepo)
	createGoalUC := goalApp.NewCreateGoalUseCase(goalRepo)
	updateGoalUC := goalApp.NewUpdateGoalUseCase(goalRepo)
	contributeGoalUC := goalApp.NewContributeGoalUseCase(goalRepo)
	deleteGoalUC := goalApp.NewDeleteGoalUseCase(goalRepo)

	calculateHealthScoreUC := hsApp.NewCalculateHealthScoreUseCase(
		expenseRepo, incomeRepo, budgetRepo, reRepo, goalRepo, timeutil.RealClock{},
	)

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

	sendRecurringUC := alertApp.NewSendRecurringAlertsUseCase(reRepo, userRepo, emailMailer, timeutil.RealClock{})
	sendWeeklyUC := alertApp.NewSendWeeklySummaryUseCase(userRepo, expenseRepo, emailMailer, timeutil.RealClock{})

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
		UpdateInstGroupUC: updateInstGroupUC,
		ImportCSVUC:       importCSVUC,
		MonthExpensesUC:   monthExpensesUC,
		ExportCSVUC:       exportCSVUC,
		CategorySummaryUC: categorySummaryUC,

		GetMeUC:              getMeUC,
		CompleteOnboardingUC: completeOnboardingUC,

		ListBudgetsUC:  listBudgetsUC,
		UpsertBudgetUC: upsertBudgetUC,
		DeleteBudgetUC: deleteBudgetUC,

		CashflowUC:        cashflowUC,
		MonthlySummaryUC:  monthlySummaryUC,
		ExportPDFUC:       exportPDFUC,
		CategoryHistoryUC: categoryHistoryUC,
		ListAlertsUC:      listAlertsUC,

		ListGoalsUC:      listGoalsUC,
		CreateGoalUC:     createGoalUC,
		UpdateGoalUC:     updateGoalUC,
		ContributeGoalUC: contributeGoalUC,
		DeleteGoalUC:     deleteGoalUC,

		CalculateHealthScoreUC: calculateHealthScoreUC,

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
		AccessTTL:      cfg.AccessTokenTTL,
		RefreshTTL:     cfg.RefreshTokenTTL,
		CookieSecure:   cfg.CookieSecure,
	})

	// ── HTTP Server ─────────────────────────────────────────────────

	srv := &http.Server{
		Addr:              cfg.HTTPAddr(),
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	srvCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go runDailyAt(srvCtx, logger, 8, 0, func() {
		if err := sendRecurringUC.Execute(srvCtx); err != nil {
			logger.Error("send recurring alerts failed", "error", err)
		}
	})
	go runWeeklyOnMondayAt(srvCtx, logger, 8, 0, func() {
		if err := sendWeeklyUC.Execute(srvCtx); err != nil {
			logger.Error("send weekly summary failed", "error", err)
		}
	})

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

func runDailyAt(ctx context.Context, logger *slog.Logger, hour, minute int, fn func()) {
	now := time.Now().UTC()
	next := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, time.UTC)
	if !next.After(now) {
		next = next.Add(24 * time.Hour)
	}
	select {
	case <-ctx.Done():
		return
	case <-time.After(time.Until(next)):
	}
	logger.Info("running daily job")
	fn()
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			logger.Info("running daily job")
			fn()
		}
	}
}

func runWeeklyOnMondayAt(ctx context.Context, logger *slog.Logger, hour, minute int, fn func()) {
	now := time.Now().UTC()
	daysUntilMonday := (int(time.Monday) - int(now.Weekday()) + 7) % 7
	if daysUntilMonday == 0 {
		next := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, time.UTC)
		if !next.After(now) {
			daysUntilMonday = 7
		}
	}
	next := time.Date(now.Year(), now.Month(), now.Day()+daysUntilMonday, hour, minute, 0, 0, time.UTC)
	select {
	case <-ctx.Done():
		return
	case <-time.After(time.Until(next)):
	}
	logger.Info("running weekly job")
	fn()
	ticker := time.NewTicker(7 * 24 * time.Hour)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			logger.Info("running weekly job")
			fn()
		}
	}
}
