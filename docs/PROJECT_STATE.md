# PROJECT_STATE.md — Estado técnico da main e Produção

Atualizar sempre que um commit funcional for validado em Produção.
Commits exclusivamente documentais não invalidam este estado.

---

## Commit funcional validado em Produção

**SHA:** `0602de40a589751e0a9f2dd68b1231edcb8c2711`
**Data aproximada de validação:** 2026-08-03

**Regra de integridade:** este commit deve ser ancestral da main atual.
Qualquer commit funcional posterior exige revalidação e atualização deste arquivo.
Commits exclusivamente documentais não alteram o estado funcional validado.

---

## Funcionalidades implantadas e validadas

- Contratação controlada end-to-end concluída
- Funil de elegibilidade e cadastro
- Cobrança da implantação e da primeira mensalidade
- Callback de retorno do Asaas
- Reconciliação por webhook
- Comissão de parceiro incide somente sobre mensalidade (implantação não gera comissão)
- Portal Cliente via magic link (login, dashboard, onboarding)
- Company do teste atingiu estágio `in_production`
- Fluxo financeiro sem duplicidade confirmada

---

## Em andamento (não validado em Produção)

- Contrato e PDF — **prioridade P0**:
  - Eixo C (persistência e recuperação do PDF): **concluído**, mergeado pela PR #16
  - Conteúdo MVP 1.0: **congelado documentalmente** em `docs/CONTRACT_MVP_V1.md` — ainda não implementado
  - Eixo A (fonte única `/termos` × PDF): pendente
  - Eixo B (comprovante e arquitetura do aceite): pendente
  - Eixo D (formatação e paginação do PDF): pendente
- Fluxo completo de documentos pendente de teste controlado
- Painel Admin com dados do onboarding: implantado em Produção; validação visual manual ainda pendente

---

## Próximo passo prioritário

Implementar o Eixo A (fonte única entre `/termos` e o PDF) a partir do
conteúdo já congelado em `docs/CONTRACT_MVP_V1.md`, seguido dos Eixos B e D.
Novo cliente real continua bloqueado até a conclusão dos quatro eixos do
bloqueador Contrato e PDF.

---

## Não autorizado ainda

- Upload de documento real para clientes
- Alteração financeira em Produção
- Exclusão de branches antigas sem aprovação
- Abertura pública antes da conclusão dos bloqueadores P0

---

## Notas de ambiente

- Variáveis de ambiente: gerenciadas na Vercel e no `.env.local` local (não commitado)
- Banco: Supabase PostgreSQL (configuração via variáveis de ambiente — não hardcoded)
- Crons: agendados em `vercel.json`
