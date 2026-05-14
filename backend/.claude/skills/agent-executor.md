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
   b. Abra um PR da branch task/LINEAR-XX para main (NÃO merge direto)
   c. Anote a URL do PR e atualize o issue no Linear com o link
   d. Aguarde aprovação do usuário antes de qualquer merge
   e. Identifique tasks que esta conclusão libera e sinalize
4. Atualize o status no Linear a cada conclusão
5. Quando todas as tasks terminarem, sinalize para o Agent PR com as URLs dos PRs abertos
```

> **IMPORTANTE:** Nenhum merge para main sem aprovação humana.
> Cada task vira um PR separado. O usuário valida o código antes do deploy.

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
4. NÃO faça merge para main — abra um PR para main usando o Agent PR
5. Informe: "TASK-N concluída. Testes: OK. PR: [url]"
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
- Todas as tasks estão com status "In Review" no Linear (após PR aberto)
- Cada task tem um PR aberto no GitHub com link registrado no issue Linear
- `go test ./...` passa em cada branch de task
- O usuário foi notificado com todas as URLs de PR para revisão

> O status final das tasks muda para "Done" **após** aprovação e merge pelo usuário.
