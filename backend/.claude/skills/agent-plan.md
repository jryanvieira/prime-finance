# Agent Plan — Planejamento Detalhado para Execução Paralela

Você lê uma spec aprovada e gera um plano de execução otimizado para subagents paralelos.

## Antes de começar

1. Leia `.claude/skills/ddd-expert.md`
2. Leia `.claude/skills/project-expert.md`
3. Leia `.claude/skills/lessons-learned.md`
4. Leia a spec aprovada no Obsidian

## Princípios do plano

- Tasks devem ser **atômicas e independentes** o máximo possível
- Cada task deve conter **tudo** que o subagent precisa para trabalhar sozinho
- Mapeie dependências explicitamente — "task B só começa após task A estar merged"
- Prefira tasks que possam rodar em paralelo a tasks sequenciais

## O que cada task deve conter

```markdown
### TASK-N: [Nome Descritivo]

**Branch:** task/LINEAR-XX-nome-curto
**Pode iniciar:** imediatamente | após TASK-X merged
**Depende de:** — | TASK-X
**Libera:** TASK-Y, TASK-Z | nenhuma

**Contexto do domínio:**
[O que o subagent precisa saber — trecho do project-expert relevante]

**Arquivos a criar/modificar:**
- `internal/domain/xxx/xxx.go` — [o que fazer]
- `internal/application/xxx/create.go` — [o que fazer]

**Interfaces esperadas ao final:**
[Código Go com os tipos/interfaces que devem existir]

**Testes que devem passar:**
- `go test ./internal/domain/xxx/...`
- Cenário: dado X, quando Y, então Z

**Critério de conclusão:**
[Descrição objetiva e verificável]
```

## Formato de saída

Use o template em:
`C:\Users\joaor\OneDrive\Documentos\SecondBrain\Projetos\prime-finance\plans\_template-plan.md`

Nome do arquivo: `YYYY-MM-DD-titulo-kebab.md`
Local: `C:\Users\joaor\OneDrive\Documentos\SecondBrain\Projetos\prime-finance\plans\`

## Após salvar o plano

1. Crie sub-issues no Linear para cada task:
   ```
   mcp linear save_issue: {
     title: "TASK-N: [nome]",
     description: "[conteúdo completo da task]",
     parent_id: "LINEAR-XX"  // issue principal
   }
   ```
2. Mostre o grafo de execução ao usuário
3. Aguarde aprovação antes de sinalizar conclusão

## Checklist de qualidade do plano

- [ ] Todas as tasks têm critério de conclusão verificável?
- [ ] O grafo de dependências está correto e sem ciclos?
- [ ] Tasks paralelas não modificam os mesmos arquivos?
- [ ] Cada task tem contexto suficiente para o subagent trabalhar 100% sozinho?
- [ ] Os comandos `go test` estão especificados por task?
