# PROJECT_STATE.md — Estado técnico da main e Produção

Atualizar sempre que um commit funcional for validado em Produção.
Commits exclusivamente documentais não invalidam este estado.

---

## Commit funcional validado em Produção

**SHA:** `57d42823bd9f3ebbd07426898fae322f6185496d`
**Data de validação:** 2026-08-05

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
- Eixo A (fonte única `/termos` × PDF): **mergeado pela PR #18** — fonte
  contratual única e versionada em `src/lib/contract/`, consumida por
  `/termos` e pelo PDF; versão vigente `CONTRACT_VERSION = 2026-08-05`
- `/termos`, `/digital` e `/elegibilidade` validados em Produção por smoke
  test read-only (2026-08-05): HTTP 200 nas três rotas, versão 2026-08-05
  publicada, 16 cláusulas presentes, ausência confirmada das regras antigas
  críticas (6 mensalidades, avisos de 30/60 dias)
- Fluxo funcional de documentos validado em Produção por smoke controlado
  (2026-08-05): upload manual de contrato rejeitado, PDF sintético de
  declaração persistido com sucesso, documento listado no Admin e visível
  no Portal do Cliente, download administrativo aprovado, dois downloads do
  cliente aprovados, cabeçalhos de segurança/privacidade corretos, ausência
  de resposta 500 no intervalo observado

---

## Em andamento (não validado em Produção)

- Contrato e PDF — **prioridade P0**:
  - Eixo C (persistência e recuperação do PDF): **concluído**, mergeado pela PR #16
  - Conteúdo MVP 1.0: **congelado documentalmente** em `docs/CONTRACT_MVP_V1.md`
  - Eixo A (fonte única `/termos` × PDF): **concluído e mergeado** (PR #18),
    validado em Produção por smoke read-only
  - Eixo B (comprovante e arquitetura do aceite): pendente
  - Eixo D (formatação e paginação do PDF): pendente
  - Snapshot histórico de mensalidade e faixa no PDF: pendente (hoje
    recalculados de `pricing.ts`/dado atual, não de um valor congelado no
    aceite)
  - Lógica financeira de cancelamento (regra de 12 meses aprovada em
    `docs/DECISIONS.md`): ainda não migrada — segue operando pela regra
    anterior de 6 mensalidades
  - Validação ponta a ponta do fluxo completo com geração real de PDF em
    Produção: ainda não exercitada (o smoke read-only não gera PDF, por
    exigir evento real com efeitos persistentes)
- Painel Admin com dados do onboarding: implantado em Produção; validação visual manual ainda pendente
- Atribuição do ator no `DocumentAccessLog`: após o smoke controlado do
  fluxo de documentos, foi encontrada uma divergência de auditoria — os
  produtores administrativo e do cliente gravavam `sessionId` null,
  tornando os dois tipos de acesso indistinguíveis no banco. Correção
  implementada no código (ainda não integrada à main): cookies de cliente
  emitidos após a correção passam a carregar o id da `ClientSession` do
  login (propagado internamente como `clientSessionId`) e os dois
  produtores do lado cliente passam a gravar esse valor; o produtor
  administrativo continua gravando `sessionId` null. Cookies de cliente já
  emitidos antes da correção continuam válidos e continuam gravando null
  durante a janela de compatibilidade. Validação final em Produção ainda
  pendente.

---

## Próximo passo prioritário

O Eixo A está concluído e validado em Produção. A próxima prioridade entre
lógica financeira de cancelamento (12 meses), Eixo B e Eixo D deve ser
definida pela Administração de Desenvolvimento. Novo cliente real continua
bloqueado até a conclusão de todas essas pendências do bloqueador Contrato
e PDF.

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
