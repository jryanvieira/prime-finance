# Project Expert — prime-finance

Mapa real do projeto gerado a partir do diagnóstico do repositório.
Consulte antes de qualquer modificação no código.

---

## O que é este projeto

Dashboard financeiro pessoal. Permite ao usuário:
- Registrar despesas (únicas e parceladas) e receitas
- Acompanhar orçamentos por categoria
- Gerenciar metas financeiras com contribuições
- Ver fluxo de caixa mensal (despesas + receitas + recorrentes)
- Importar extratos do Nubank via CSV
- Exportar despesas em CSV

**Stack:** Go 1.25 · Chi v5 · SQLite (modernc.org/sqlite) · JWT auth · bcrypt
**Banco:** SQLite com migrations em `backend/migrations/`
**Deploy:** Fly.io (`backend/fly.toml`)
**Frontend:** existe separado (não é este repositório)

---

## Estrutura de diretórios

```
backend/
├── cmd/api/main.go              ← entrypoint; composição manual de todas as dependências
├── internal/
│   ├── config/config.go         ← lê variáveis de ambiente (.env via godotenv)
│   ├── domain/                  ← núcleo de negócio; zero dependências externas
│   │   ├── expense/
│   │   ├── income/
│   │   ├── budget/
│   │   ├── goal/
│   │   ├── category/
│   │   ├── paymentmethod/
│   │   ├── recurringexpense/
│   │   ├── user/
│   │   └── shared/              ← SplitTotalIntoInstallments, ParseDate, AddMonthsKeepingDay, ParseNubankCSV
│   ├── application/             ← use cases; um arquivo por caso de uso
│   │   ├── auth/                ← signup, login, refresh, logout, get_me, complete_onboarding, token_service
│   │   ├── budget/
│   │   ├── cashflow/            ← cross-context: agrega expense + income + recurringexpense
│   │   ├── category/
│   │   ├── expense/             ← create, list, update, delete, export_csv, import_csv, category_summary, month
│   │   ├── goal/
│   │   ├── income/
│   │   ├── paymentmethod/
│   │   └── recurringexpense/
│   ├── infrastructure/
│   │   ├── auth/jwt_token_service.go
│   │   ├── crypto/bcrypt_hasher.go
│   │   ├── database/            ← Open (sqlite) + Migrate
│   │   └── repositories/sqlite/ ← uma implementação por contexto
│   └── presentation/http/
│       ├── router.go            ← Chi router; todas as rotas em /v1
│       ├── middleware.go        ← RequireAuth (JWT)
│       ├── json.go              ← helpers encode/decode
│       └── handler_[contexto].go
├── pkg/
│   ├── events/event.go          ← interfaces Event, EventHandler, EventDispatcher (não usadas ainda)
│   └── timeutil/clock.go        ← abstração de clock para testes
└── migrations/                  ← SQL puro; aplicado na inicialização
```

---

## Bounded Contexts e suas interfaces

### Identity (`domain/user`)

```go
type User struct {
    ID, Name, PasswordHash string
    Email                  Email   // value object validado
    OnboardingCompleted    bool
    CreatedAt, UpdatedAt   time.Time
}
// Construtor: NewUser(name, email, password, hasher) — aplica bcrypt via PasswordHasher interface
// Reconstrução: ReconstructUser(...) — sem validação, usado pelo repositório
```

### Expense (`domain/expense`)

```go
type Expense struct {
    ID, UserID, Date, Description string
    AmountCents                   int64
    PaymentMethodID, Category     *string
    // Parcelamentos (nil para despesa única):
    InstallmentGroupID            *string
    InstallmentsCount, InstallmentIndex *int
    MonthlyAmountCents, TotalAmountCents *int64
}
// NewExpense(...) — despesa única
// NewInstallmentExpense(...) — uma parcela de um grupo
// Update(...) — mutação com validação
```

**Repositório:**
```go
type Repository interface {
    Create(ctx, *Expense) error
    GetByID(ctx, userID, id string) (*Expense, error)
    ListByDateRange(ctx, userID, from, to string) ([]*Expense, error)
    CategorySummary(ctx, userID, from, to string) ([]*CategorySummaryItem, error)
    Update(ctx, *Expense) error
    Delete(ctx, userID, id string) error
    DeleteByInstallmentGroup(ctx, userID, groupID string) (int64, error)
}
```

### Budget (`domain/budget`)

Upsert por `(user_id, category, period)` — não tem `NewBudget`, usa upsert direto.

### Goal (`domain/goal`)

Tem operação `Contribute` separada dos campos base. Aggregate com `CurrentAmount` e `TargetAmount`.

### RecurringExpense (`domain/recurringexpense`)

Despesas fixas mensais. Usadas pelo `CashflowUseCase` para projeções.

### Shared (`domain/shared`)

Funções utilitárias usadas pelos use cases:
- `SplitTotalIntoInstallments(totalCents, n)` — divide com resto nos primeiros meses
- `ParseDate(s string)` / `MustFormatDate(t time.Time)` — formato `YYYY-MM-DD`
- `AddMonthsKeepingDay(t, n)` — soma meses preservando o dia (usado no create de parcelas)
- `ParseNubankCSV(r io.Reader)` — parser do extrato Nubank; detecta parcelas pelo padrão `"Parcela X/Y"`
- `FilterIgnoredRows(rows)` — filtra linhas ignoradas (ex: "Pagamento Recebido")

---

## Rotas HTTP (Chi, prefixo `/v1`)

| Método | Rota | Use Case |
|---|---|---|
| POST | `/auth/signup` | SignupUseCase |
| POST | `/auth/login` | LoginUseCase |
| POST | `/auth/refresh` | RefreshUseCase |
| POST | `/auth/logout` | LogoutUseCase |
| GET | `/users/me` | GetMeUseCase |
| PATCH | `/users/me/onboarding` | CompleteOnboardingUseCase |
| CRUD | `/expenses` | Create/List/Update/DeleteExpenseUseCase |
| DELETE | `/installment-groups/{group_id}` | DeleteInstallmentGroupUseCase |
| GET | `/months/{month}/expenses` | MonthExpensesUseCase |
| GET | `/months/{month}/category-summary` | CategorySummaryUseCase |
| POST | `/import/csv` | ImportCSVUseCase |
| GET | `/export/csv` | ExportCSVUseCase |
| CRUD | `/incomes` | Income use cases |
| CRUD | `/budgets` | Budget use cases (PUT = upsert) |
| CRUD | `/goals` | Goal use cases |
| POST | `/goals/{id}/contribute` | ContributeGoalUseCase |
| CRUD | `/categories` | Category use cases |
| CRUD | `/payment-methods` | PaymentMethod use cases |
| CRUD | `/recurring-expenses` | RecurringExpense use cases |
| GET | `/cashflow` | CashflowUseCase |

**Auth:** JWT Bearer token via middleware `RequireAuth`. Todas as rotas exceto `/auth/*` são protegidas.

---

## Decisões arquiteturais estabelecidas

| Decisão | Motivo | NÃO mudar sem discussão |
|---|---|---|
| Composição manual no `main.go` | Sem container de DI — explicitude total | Não introduzir wire/fx sem aprovação |
| SQLite como banco | Projeto pessoal, simplicidade operacional | Não migrar para Postgres sem decisão explícita |
| Dinheiro em centavos (`int64`) | Precisão — sem float para valores financeiros | Nunca usar `float64` para valores monetários |
| Um arquivo por use case | Facilita localização e testes isolados | Não agrupar use cases em arquivos genéricos |
| Migrations em SQL puro | Sem ORM, controle total | Não introduzir GORM/sqlx sem aprovação |
| `pkg/events` com interfaces prontas | Infraestrutura de eventos definida, aguardando uso | Ao implementar eventos, usar estas interfaces |

---

## O que NÃO existe ainda (oportunidades)

- Testes de use cases e repositórios (apenas `domain/shared` tem testes)
- Uso real das interfaces de `pkg/events` — nenhum aggregate dispara eventos
- `Category` como value object formal — hoje é `*string` dentro de `Expense`
- Rate limiting, observabilidade (apenas `slog` estruturado)

---

## Convenções de código

- Erros de domínio: `var ErrXxx = errors.New("contexto: descrição")`
- IDs: `uuid.NewString()` do pacote `github.com/google/uuid`
- Timestamps: sempre `time.Now().UTC()`
- Datas de transações: string `"YYYY-MM-DD"` (não `time.Time`) — compatível com SQLite
- Logger: `slog` estruturado (JSON em produção)
- Testes: stdlib `testing` — sem testify
