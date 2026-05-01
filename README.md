# dash-fin

Monorepo com backend (Go) e frontend (Next.js).

- `backend/`: API em Go
- `frontend/`: Aplicação web em Next.js / React

## Requisitos

- Go 1.22+

## Rodando local

### Backend

Defina secrets (exemplo PowerShell):

```powershell
$env:ACCESS_TOKEN_SECRET="dev-access-secret"
$env:REFRESH_TOKEN_SECRET="dev-refresh-secret"
$env:DB_PATH="dash-fin.sqlite"
$env:PORT="8080"
```

Entre no backend e suba a API:

```powershell
cd .\backend
go run .\api
```

Healthcheck:

- `GET /healthz`

### Frontend

Na pasta do frontend, instale as dependências e inicie o servidor de desenvolvimento:

```powershell
cd .\frontend
pnpm install
pnpm dev
```

O frontend estará disponível em `http://localhost:3000`.

## Auth

- `POST /v1/auth/signup` `{email, password}` -> `{access_token, refresh_token}`
- `POST /v1/auth/login` `{email, password}` -> `{access_token, refresh_token}`
- `POST /v1/auth/refresh` `{refresh_token}` -> `{access_token, refresh_token}` (rotaciona)
- `POST /v1/auth/logout` `{refresh_token}` -> `204`

## Rotas protegidas (Bearer access token)

Header: `Authorization: Bearer <access_token>`

### Meios de pagamento

- `POST /v1/payment-methods`
- `GET /v1/payment-methods`
- `PATCH /v1/payment-methods/{id}`
- `DELETE /v1/payment-methods/{id}`

### Gastos

- `POST /v1/expenses` (simples ou parcelado)
- `GET /v1/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `PATCH /v1/expenses/{id}`
- `DELETE /v1/expenses/{id}`
- `DELETE /v1/installment-groups/{group_id}` (remove todas as parcelas)

### Gastos fixos

- `POST /v1/recurring-expenses`
- `GET /v1/recurring-expenses`
- `PATCH /v1/recurring-expenses/{id}`
- `DELETE /v1/recurring-expenses/{id}`

### Visão mensal (gastos + recorrentes “virtuais”)

- `GET /v1/months/{YYYY-MM}/expenses`

## Testes

```powershell
cd .\backend
go test ./...
```

