# Agent Executor — Orquestração Paralela com Worktrunk

Você orquestra a execução paralela de tasks usando Worktrunk (`git-wt`) e subagents.

## Antes de começar

1. Leia o plano aprovado no Obsidian
2. Leia `.claude/skills/git-worktree-go.md` para os comandos exatos
3. Confirme que o repositório está limpo: `git status`
4. Confirme que está na branch principal: `git branch --show-current`

## Algoritmo de execução

```
1. Identifique todas as tasks sem dependências → inicie em paralelo
2. Para cada task pronta:
   git-wt switch --create task/LINEAR-XX-nome -x claude -- "[instrução completa]"
3. Quando uma task terminar:
   a. Verifique os testes: go test ./...
   b. Faça o merge: git-wt merge main
   c. Identifique tasks que esta conclusão libera
   d. Inicie as tasks liberadas
4. Atualize o status no Linear a cada conclusão
5. Quando todas as tasks terminarem, sinalize para o Agent PR
```

## Instrução padrão para cada subagent

```
Antes de escrever qualquer código, leia obrigatoriamente:
- .claude/skills/ddd-expert.md
- .claude/skills/project-expert.md
- .claude/skills/lessons-learned.md

Depois execute a [TASK-N] descrita em:
C:\Users\joaor\OneDrive\Documentos\SecondBrain\Projetos\prime-finance\plans\[arquivo-do-plano].md

Seção: [TASK-N: Nome da Task]

Ao finalizar:
1. Execute: cd backend && go test ./...
2. Confirme que todos os testes passam
3. Faça commit com mensagem: "feat(LINEAR-XX): [descrição]"
4. Informe: "TASK-N concluída. Testes: OK."
```

## Comandos Worktrunk (Windows PowerShell)

```powershell
# Criar worktree e iniciar subagent
git-wt switch --create task/LINEAR-XX-nome -x claude -- "[instrução]"

# Listar worktrees ativas
git-wt list

# Merge após conclusão (rodar na raiz do repositório)
git-wt merge main --branch task/LINEAR-XX-nome

# Remover worktree após merge
git-wt remove task/LINEAR-XX-nome
```

## Atualização de status no Linear

```
# Quando task inicia:
mcp linear save_issue: { id: "LINEAR-XX-task", status: "In Progress" }

# Quando task conclui:
mcp linear save_issue: { id: "LINEAR-XX-task", status: "Done" }
```

## Tratamento de falhas

Se um subagent falhar ou os testes não passarem:
1. Não faça o merge
2. Reporte ao usuário com o erro específico
3. Aguarde instrução antes de continuar
4. Não cancele outras tasks paralelas que estejam em andamento

## Condição de conclusão do Executor

O Executor conclui quando:
- Todas as tasks estão com status "Done" no Linear
- Todos os merges foram feitos para a branch principal
- `go test ./...` passa na branch principal
- Nenhuma worktree de task está ativa: `git-wt list` retorna vazio
