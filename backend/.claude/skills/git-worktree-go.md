# Git Worktree — dash-fin (Worktrunk + LazyGit, Windows)

Guia de worktree para o Agent Executor usar no projeto prime-finance.

---

## Ferramenta principal: Worktrunk (`git-wt`)

Worktrunk é um gerenciador de worktrees instalado como `git-wt` no Windows.
LazyGit é usado apenas para visão visual — não para automação de agents.

Binários:
- `git-wt` — em `%LOCALAPPDATA%\Microsoft\WinGet\Packages\max-sixty.worktrunk_*\git-wt.exe`
- `lazygit` — em `%LOCALAPPDATA%\Microsoft\WinGet\Packages\JesseDuffield.lazygit_*\lazygit.exe`

---

## Convenção de nomes de branch

```
task/LINEAR-{ID}-{descricao-curta-kebab}

Exemplos:
  task/LINEAR-42-add-recurring-expense-notification
  task/LINEAR-15-fix-installment-split
  task/LINEAR-7-export-csv-filters
```

---

## Comandos Worktrunk para o Agent Executor

### Criar worktree e iniciar subagent

```powershell
# Cria worktree na branch task/LINEAR-XX-nome e executa claude nela
git-wt switch --create task/LINEAR-XX-nome -x claude -- `
  "Leia .claude/skills/ddd-expert.md, .claude/skills/project-expert.md e .claude/skills/lessons-learned.md antes de começar.
   Execute a TASK-X descrita em C:\Users\joaor\OneDrive\Documentos\SecondBrain\Projetos\dash-fin\plans\YYYY-MM-DD-titulo.md.
   Ao finalizar, rode: cd backend && go test ./... e confirme que todos os testes passam.
   Informe quando concluído."
```

### Listar worktrees ativas

```powershell
git-wt list
```

### Ver status visual (você, não o agent)

```powershell
lazygit
```

### Merge de worktree concluída na branch principal

```powershell
# Estando na worktree concluída:
git-wt merge main

# Ou especificando a branch:
git-wt merge main --branch task/LINEAR-XX-nome
```

### Remover worktree após merge

```powershell
git-wt remove task/LINEAR-XX-nome
```

---

## Fluxo completo do Agent Executor

```
1. Para cada task sem dependências pendentes:
   git-wt switch --create task/LINEAR-XX-nome -x claude -- "[instrução]"

2. Monitorar conclusão (o agent informa quando termina)

3. Quando task A termina e libera task B:
   git-wt switch --create task/LINEAR-XX-nome-b -x claude -- "[instrução B]"

4. Após todas as tasks de uma feature:
   Para cada worktree concluída:
     git-wt merge main
     git-wt remove task/LINEAR-XX-nome

5. Atualizar status no Linear via MCP
```

---

## Instrução padrão para subagents

Cole este bloco no início de cada instrução de subagent:

```
Antes de escrever qualquer código:
1. Leia .claude/skills/ddd-expert.md
2. Leia .claude/skills/project-expert.md
3. Leia .claude/skills/lessons-learned.md

Siga as convenções do projeto rigorosamente.
Ao finalizar, rode `go test ./...` na pasta backend/ e confirme que passa.
```

---

## Observações Windows

- O PATH pode não incluir `git-wt` em sessões novas — verifique com `where git-wt`
- Se não encontrar: adicione `%LOCALAPPDATA%\Microsoft\WinGet\Packages\max-sixty.worktrunk_*` ao PATH
- Use PowerShell (Warp) para os comandos — não WSL/bash
- Caminhos de arquivo: sempre com `\` ou aspas duplas com `/`
