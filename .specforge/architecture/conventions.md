# Conventions — prime-finance

Convenções de código estabelecidas. Todos os agentes seguem estas regras.

## Stack

| Componente | Tecnologia | Versão |
|---|---|---|
| Linguagem | Go | 1.25 |
| Web framework | Chi | v5 (`go-chi/chi/v5`) |
| Banco | SQLite | modernc.org/sqlite |
| Auth | JWT | `golang-jwt/jwt/v5` |
| Crypto | bcrypt | `golang.org/x/crypto` |
| Frontend | Next.js + TypeScript + Tailwind + shadcn/ui | — |

## Identidade e Timestamps

```go
// IDs — sempre uuid.NewString()
import "github.com/google/uuid"
id := uuid.NewString()

// Timestamps — sempre UTC
createdAt := time.Now().UTC()

// Datas de transação — string, nunca time.Time
date := "2026-01-15"  // formato YYYY-MM-DD
```

## Dinheiro

```go
// SEMPRE int64, centavos
AmountCents int64  // R$ 10,50 → 1050

// NUNCA float64
// Amount float64 → proibido
```

## Erros de Domínio

```go
// errors.go de cada contexto
var (
    ErrExpenseNotFound    = errors.New("expense: not found")
    ErrExpenseInvalid     = errors.New("expense: invalid")
    ErrEmptyDescription   = errors.New("expense: empty description")
    ErrInvalidAmount      = errors.New("expense: amount must be positive")
)
```

## Testes

- Stdlib `testing` — sem testify
- Tabela de casos (`[]struct{ name, input, expected }`) para múltiplos cenários
- Testes de integração usam SQLite in-memory real (sem mocks de banco)
- Nomenclatura: `TestNewExpense_ValidInput`, `TestNewExpense_ZeroAmount`

```go
func TestNewExpense_ZeroAmount(t *testing.T) {
    _, err := NewExpense("user-id", "2026-01-15", "groceries", 0)
    if !errors.Is(err, ErrInvalidAmount) {
        t.Errorf("expected ErrInvalidAmount, got %v", err)
    }
}
```

## Logger

```go
// slog estruturado (JSON em produção)
slog.Info("expense created", "id", expense.ID, "userID", expense.UserID)
slog.Error("failed to create expense", "error", err)
```

## Composição

- Composição manual no `cmd/api/main.go`
- Sem container de DI (sem wire, sem fx)
- Todas as dependências instanciadas e injetadas explicitamente

## Migrations

- SQL puro em `backend/migrations/`
- Sem ORM
- Aplicadas em ordem numérica na inicialização

## Caminhos Importantes

| Recurso | Caminho |
|---|---|
| Backend entrypoint | `backend/cmd/api/main.go` |
| Domínio | `backend/internal/domain/` |
| Use cases | `backend/internal/application/` |
| Repositórios SQLite | `backend/internal/infrastructure/repositories/sqlite/` |
| Handlers HTTP | `backend/internal/presentation/http/` |
| Migrations | `backend/migrations/` |
| Frontend páginas | `frontend/app/(app)/` |
| Componentes frontend | `frontend/components/` |
| Gate completo | `cd backend && go test ./...` |
