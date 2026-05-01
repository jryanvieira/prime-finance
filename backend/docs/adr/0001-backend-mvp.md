# ADR 0001: Backend MVP (Go + SQLite + JWT)

## Contexto

Queremos iniciar um backend para um dashboard financeiro com foco no MVP.

Requisitos principais:
- CRUD de **gastos**.
- CRUD de **gastos fixos** (recorrentes mensais).
- CRUD de **meios de pagamento** (dinheiro e cartões com “label” como Nubank/Inter/etc).
- Suporte a **parcelas**: ao criar um gasto parcelado, gerar os gastos mensais.

Decisões adicionais do MVP:
- **Backend apenas**.
- **Multiusuário** com autenticação.
- Persistência em **SQLite** (simples de rodar localmente).

## Decisão

### Linguagem e estilo
- Go, API REST + JSON.

### Persistência
- SQLite com:
  - `PRAGMA journal_mode = WAL`
  - `PRAGMA busy_timeout`
  - `PRAGMA foreign_keys = ON`

### Identificadores
- IDs públicos como UUID (string).

### Autenticação e usuários

#### Criação de usuários
- Cadastro por **email + senha**.
- Sem confirmação de e-mail no MVP.

#### Armazenamento de senha
- Guardar apenas `password_hash` (bcrypt) no banco.

#### Tokens
- **Access token (JWT curto)**: enviado em `Authorization: Bearer <token>`.
- **Refresh token (JWT longo)**: usado para renovar o access token.

#### Refresh token server-side (hash + revogação)
- Persistimos refresh tokens em tabela `refresh_tokens`, guardando **hash** do token (`sha256`) e metadados.
- Isso habilita:
  - **logout** (revogar refresh)
  - **rotação** de refresh token (reduz replay)

#### Rotação do refresh token
No `POST /v1/auth/refresh`:
- Validar assinatura/expiração do refresh JWT.
- Validar que o **hash** existe no banco, não está revogado e não expirou.
- **Revogar** o refresh token usado.
- Emitir **novo access** + **novo refresh** e persistir o hash do novo refresh.

#### Isolamento multiusuário
- O `user_id` vem do access token e é aplicado como filtro em todas as queries.

### Regras de domínio (MVP)

#### Gastos fixos (recorrência)
- Guardar apenas o **template** em `recurring_expenses`.
- A visão mensal (`GET /v1/months/{YYYY-MM}/expenses`) materializa recorrentes **on-the-fly** para o mês.
- Sem histórico/override por mês no MVP.

#### Parcelas
- Na criação de gasto parcelado: gerar **N** registros em `expenses`, um por mês.
- Data avança mês a mês mantendo o dia; se o dia não existir no mês, usar o **último dia do mês**.
- Se receber `total_amount_cents`, dividir em centavos distribuindo o resto nos primeiros meses.

## Alternativas consideradas

- Postgres no MVP: mais robusto, mas aumenta fricção de setup.
- Sessões server-side ao invés de JWT: simplifica revogação, mas aumenta estado e complexidade de infra.
- Materializar gastos fixos mês a mês: facilita overrides/histórico, mas adiciona tabelas e lógica.

## Consequências

- SQLite é ótimo para uso local/MVP; para escalar/concorrrência maior pode migrar para Postgres.
- Access+refresh com rotação e armazenamento por hash adiciona tabelas/lógica, mas melhora segurança e UX.
- Gastos fixos on-the-fly é simples, mas mudanças no template afetam meses “passados” na visualização.

