# CLAUDE.md — Sublime SST

Estas instruções valem somente para sessões do Claude Code abertas neste repositório.
Não alterar memória global nem configuração de outros projetos.

---

## Leitura obrigatória no início de toda sessão

- `CLAUDE.md` (este arquivo)
- `docs/PROJECT_STATE.md`

Leitura condicional:

- `docs/MVP_BACKLOG.md` — quando houver prioridade, escopo ou planejamento
- `docs/DECISIONS.md` — quando houver regra de negócio ou decisão de produto
- Runbook específico — somente na operação referenciada
- Documentos jurídicos — somente na frente de contrato

---

## Repositório e stack

- **GitHub:** `Sublimesst/sublime-sst` — branch principal: `main`
- **Deploy:** Vercel (automático a cada push no main) — **Site:** https://www.sublimesst.com
- **Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma v5 · Supabase (PostgreSQL) · Vercel · Resend
- ⚠️ A pasta `sublime-sst-corrigido` na Área de Trabalho é cópia antiga sem git — ignorar

---

## Protocolo de sessão e branch

1. Confirmar branch, HEAD, `git status` e ambiente antes de qualquer ação.
2. Uma funcionalidade ou objetivo técnico por branch.
3. Nova tarefa/branch começa em nova sessão principal.
4. Uma sessão acompanha a mesma branch até merge e validação em Produção.
5. Se a sessão acabar antes do merge, continuar a mesma branch em nova sessão após ler
   `docs/PROJECT_STATE.md` e o diff atual (`git diff main...HEAD`).

---

## Sequência obrigatória

```
diagnóstico → implementação → revisão → commit → push → PR → merge → validação em Produção
```

Nenhum avanço para a etapa seguinte sem autorização explícita.

---

## Requer autorização explícita

Nunca executar sem autorização:

- merge, deploy ou abertura pública
- escrita, alteração ou exclusão em Produção
- pagamento ou operação financeira real
- exclusão de branches

---

## Regras de negócio permanentes

- **Sublime SST** = marca ampla; consultoria sob medida para qualquer porte e complexidade
- **Sublime Digital** = produto digital padronizado para perfis elegíveis de risco muito baixo
- Critérios de elegibilidade: até 20 funcionários · CNAEs aprovados · perfil compatível · sem riscos críticos
- Sempre oferecer dois caminhos: teste digital ou orçamento personalizado
- Nunca afirmar obrigatoriedade universal — usar "conforme aplicabilidade" ou "após análise do perfil"
- Não alterar catálogo de CNAEs sem validação humana
- Não automatizar contratação sem aprovação humana
- Não publicar segredos nem inventar dados jurídicos
- Preços e valores: consultar o código de pricing e o contrato vigente — não copiar para documentos de memória

---

## Qualidade e segurança

- Nenhum novo erro de TypeScript, teste ou build
- Distinguir falhas pré-existentes de regressões introduzidas
- Usar dados sintéticos em testes — nunca dados reais de clientes
- Não imprimir, armazenar ou logar segredos e dados pessoais
- Não criar arquivos temporários no repositório
- Não tocar nos arquivos não rastreados herdados (untracked antigos)
- Código e Produção prevalecem sobre documentos em caso de divergência

---

## Relatórios e prompts

- Relatórios devem informar: evidências, divergências, decisão tomada e critério de parada
- Prompts enviados ao Claude devem indicar Modelo e Esforço no cabeçalho
