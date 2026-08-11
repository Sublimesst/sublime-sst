# PROJECT_STATE.md — Estado técnico da main e Produção

Atualizar sempre que um commit funcional for validado em Produção.
Commits exclusivamente documentais não invalidam este estado.

---

## Commit funcional validado em Produção

**SHA:** `5951707b90aea2df8f0124ae09dcb6f6556e7b65`
**Data de validação:** 2026-08-11

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
- Atribuição do ator no `DocumentAccessLog`: correção mergeada pela PR #21 e
  implantada em Produção (2026-08-06). Validação final por smoke controlado:
  novo magic link solicitado após o deployment, novo login de cliente
  concluído com cookie emitido pelo código já corrigido, um único download
  do documento sintético já existente com HTTP 200, ausência de resposta
  500 nas chamadas observadas. A gravação do `DocumentAccessLog` com
  `sessionId` não nulo foi confirmada estruturalmente — pela ordem do
  código (a gravação é aguardada antes da resposta, sem tratamento de
  exceção ao redor) e pelo `clientSessionId` propagado exclusivamente do
  payload do cookie assinado por HMAC — sem leitura direta do banco nem dos
  logs da Vercel nesta validação. Nenhum novo upload, nenhuma alteração
  financeira ou na Asaas. O download administrativo não foi repetido nesse
  smoke final: a rota administrativa não sofreu alteração funcional nesta
  correção (só o comentário do código) e já havia sido validada no smoke
  anterior (2026-08-05); a interface do Admin ainda não tem um botão
  conectado a essa rota (ver `docs/MVP_BACKLOG.md`, P1)
- PR #23 (`fix(cancellation): reconcile subscription status`) mergeada e
  implantada em Produção (`bc11592`): no cancelamento oficial de uma
  Company com assinatura, a assinatura Asaas é encerrada antes da
  transição local, `Company.status` passa a `cancelled` e
  `Company.subscriptionStatus` passa a `inactive` na mesma transição;
  falha real da Asaas continua impedindo a transição local
- **Episódio financeiro controlado real ENCERRADO** (2026-08-07): após o
  deployment da PR #23, foi executado, com autorização explícita da
  Administração, um cancelamento controlado real de uma Company de teste
  com dinheiro real envolvido. Reconciliação final confirmou: assinatura
  Asaas encerrada (`INACTIVE`/excluída), cobrança futura previamente
  agendada eliminada, `Company.status=cancelled` e
  `subscriptionStatus=inactive` reconciliados, exatamente 1
  `CancellationRequest` (sem duplicidade), a `Commission` vinculada
  estornada, os dois pagamentos do teste (histórico total de R$ 348,00)
  com exatamente 1 estorno integral `DONE` cada na Asaas e refletidos como
  `refunded` no banco local via webhook `PAYMENT_REFUNDED` processado sem
  intervenção manual, total devolvido R$ 348,00, saldo final R$ 0,00,
  nenhuma divergência entre Asaas e a plataforma. Este teste valida a
  correção da PR #23 em Produção, mas não altera nem conclui a pendência
  da lógica financeira de cancelamento pela regra de 12 meses (ver
  "Em andamento" abaixo e `docs/MVP_BACKLOG.md`), e não constitui
  autorização permanente para novas operações financeiras em Produção —
  cada operação futura continua exigindo autorização explícita.
- **Tranche 1 da limpeza de dados pré-Produção EXECUTADA E VALIDADA**
  (2026-08-07): após diagnóstico read-only completo, aprovação de um
  manifest fechado e verificável (91 registros, distribuídos por 15
  tabelas, com `SNAPSHOT_AT = 2026-08-07T20:17:08.085Z`, contagens e
  digests SHA-256 por tabela mais um `GLOBAL_MANIFEST_DIGEST`) e um backup
  lógico fresco (`pg_dump` formato custom, posterior ao snapshot,
  checksum conferido, listagem via `pg_restore --list` validada), um
  operador autorizado executou o artefato de limpeza fora desta sessão.
  A execução rodou dentro de uma única transação Postgres
  `SERIALIZABLE`, com locks nas tabelas relevantes, introspecção em
  runtime do grafo real de foreign keys (sem divergência do aprovado),
  reconstrução do manifest dentro da própria transação, todos os guards
  de preservação, e `DELETE ... RETURNING` na ordem topológica aprovada.
  **Verificação read-only independente após a execução (2026-08-07)
  confirmou, tabela por tabela, que a
  contagem de registros removidos bate exatamente com o manifest
  aprovado (91 no total)**, que os dois cadastros pós-cutover protegidos
  (um episódio de teste/homologação com movimentação financeira real em
  Asaas Produção, já encerrado/reconciliado, e um segundo cadastro de
  teste com pendência externa na Asaas) continuam presentes, que os 7
  objetos de storage órfãos permanecem intocados, e que `Plan`/
  `CnaeCatalog` permanecem com a mesma contagem de antes. Esta tranche
  removeu exclusivamente os 91 registros de teste/homologação
  classificados como excluíveis, sem movimentação financeira real
  associada e sem pendência externa de Produção. **A base de dados NÃO
  deve ser descrita como totalmente limpa para Produção** — permanecem
  fora desta tranche o episódio de teste com movimentação financeira
  real em Asaas Produção, o cadastro de teste com pendência externa
  Asaas, e os 7 objetos órfãos de storage; nenhum deles corresponde a
  cliente real, e cada um tem destino próprio ainda pendente de
  decisão/execução em frentes separadas.
- **Onboarding Individual dos Trabalhadores — PR #26 mergeada e validada em
  Produção (2026-08-11):** rascunho persistente (`OnboardingData` em
  `em_preenchimento`, retomável antes do envio); cadastro individual de
  `Worker` por `Company` (relação 1:N), com CRUD completo (criar, ler,
  editar, excluir) enquanto o onboarding não foi enviado, limitado a até 20
  trabalhadores; campos obrigatórios do trabalhador revalidados no
  servidor no momento do envio. `Company.numFuncionarios` continua
  representando a quantidade **contratada** e nunca é sobrescrita pelo
  onboarding; a quantidade **declarada** é a contagem real de `Worker`
  cadastrados. Se contratado ≠ declarado, o envio sem confirmação explícita
  retorna `quantity_mismatch` (HTTP 409) sem gravar nada; com confirmação
  explícita, o envio é aceito sem reprecificar e sem alterar
  `Company.numFuncionarios`. No envio bem-sucedido, `OnboardingData.status`
  passa a `enviado`, `submittedAt` é preenchido, `OnboardingData.numFuncionarios`
  grava o snapshot da quantidade declarada no momento do envio, e uma
  `Company` em `pending`/`onboarding_pending` pode avançar para
  `in_production`. Depois do envio, o Portal do Cliente bloqueia qualquer
  mutação de dados gerais ou de `Worker` (HTTP 409,
  `onboarding_already_submitted`); a leitura (`GET`) da declaração enviada
  continua disponível. **Validação controlada em Produção (Gates A–E,
  2026-08-11):** exercitou o fluxo completo — rascunho, CRUD de Worker,
  tentativa de envio com divergência não confirmada (`quantity_mismatch`),
  envio final com confirmação explícita, e as quatro rotas de mutação
  pós-envio rejeitadas com `onboarding_already_submitted` — usando
  exclusivamente uma fixture 100% sintética (nenhum dado de cliente real e
  nenhuma operação Asaas ou financeira; no envio final, o fluxo normal
  tentou uma notificação interna de onboarding, sem verificação
  independente de entrega). A fixture foi integralmente
  removida ao final da validação: contagens globais do banco retornaram ao
  baseline anterior à criação da fixture, o schema de Produção terminou
  `ZERO_DIFF` contra `prisma/schema.prisma` de `main`, os 2 cadastros
  pré-existentes protegidos (ver Tranche 1 acima) permaneceram inalterados
  (confirmado por digest), e os 7 objetos órfãos de storage já conhecidos
  permanecem 7 e fora do escopo desta validação. **Admin Workers**
  (visualização/listagem operacional dos trabalhadores no backoffice) não
  foi implementado nesta tranche — concluído e validado separadamente pela
  PR #28 (ver item abaixo). **Exportação compatível com SOC** não foi
  implementada nesta tranche e segue pendente (ver `docs/MVP_BACKLOG.md`,
  "Backoffice completo").
- **Admin Workers — visualização/listagem read-only dos Workers no
  backoffice — PR #28 mergeada e validada em Produção (2026-08-11):** o
  detalhe da Company no Admin passou a exibir os `Worker` cadastrados no
  onboarding individual, carregados exclusivamente pelo relacionamento da
  Company consultada (isolamento estrutural, sem endpoint paralelo), com
  seleção explícita apenas dos campos já existentes (nome, data de
  nascimento, sexo, data de admissão, cargo, setor). A visualização é
  exclusivamente read-only: nenhuma rota administrativa de mutação de
  `Worker` foi criada, e nenhum controle de criar/editar/excluir `Worker`
  foi adicionado à UI. `Company.numFuncionarios` (contratado),
  `OnboardingData.numFuncionarios` (snapshot declarado no envio) e a
  contagem atual de `Worker` (`workers.length`) permanecem três conceitos
  independentes, exibidos separadamente. **Validação em Produção
  (2026-08-11), estritamente read-only:** smoke automatizado confirmou `/`
  e `/admin/empresas` respondendo HTTP 200, sem nenhum HTTP 500
  relacionado, e a proteção administrativa permanecendo ativa (401 sem
  credencial válida); a validação autenticada programática foi
  interrompida corretamente porque o secret de Produção não estava
  disponível no ambiente local, sem tentativa de contornar essa limitação.
  Em complemento, uma validação visual manual autenticada foi realizada
  por humano pelo fluxo normal do Admin, abrindo uma Company de teste já
  existente sem qualquer mutação: a seção "Trabalhadores cadastrados"
  estava visível, mostrando quantidade contratada, snapshot declarado e
  quantidade atual como conceitos separados, sem nenhum controle de
  criar/editar/excluir; a evidência observada tinha zero Workers atuais,
  validando corretamente o estado vazio (sem erro). Nenhuma escrita,
  fixture, alteração financeira, chamada à Asaas ou mudança de dados foi
  feita em nenhuma das duas validações. **O caminho visual com pelo menos
  1 Worker atualmente existente não foi exercitado dinamicamente em
  Produção nesta validação** — permanece coberto pelos 32 testes
  automatizados focados da tranche, pelo Preview aprovado e pela revisão
  estrutural do diff; essa limitação não invalida a tranche, classificada
  como **validada em Produção — read-only**. Esta tranche não conclui
  "Backoffice completo": exportação compatível com SOC continua pendente
  (ver `docs/MVP_BACKLOG.md`).

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

---

## Próximo passo prioritário

O Eixo A está concluído e validado em Produção. A próxima prioridade entre
lógica financeira de cancelamento (12 meses), Eixo B e Eixo D deve ser
definida pela Administração de Desenvolvimento. Novo cliente real continua
bloqueado até a conclusão de todas essas pendências do bloqueador Contrato
e PDF.

O Onboarding Individual dos Trabalhadores (PR #26) está concluído e
validado em Produção. Admin Workers (visualização/listagem read-only no
backoffice, PR #28) também está concluído e validado em Produção. A
exportação compatível com SOC continua pendente, dentro do bloqueador
"Backoffice completo" já registrado em `docs/MVP_BACKLOG.md` — esse
bloqueador segue pendente enquanto a exportação SOC não for implementada.
Os demais bloqueadores P0 permanecem conforme já priorizado nesse
documento.

---

## Não autorizado ainda

- Upload de documento real para clientes
- Alteração financeira em Produção
- Exclusão de branches antigas sem aprovação
- Abertura pública antes da conclusão dos bloqueadores P0
- Qualquer ação sobre o episódio de teste/homologação com movimentação
  financeira real em Asaas Produção já encerrado (preservação ou
  anonimização de campos identificadores) — aguarda política própria,
  não coberta pela Tranche 1
- Qualquer ação sobre o cadastro pós-cutover com pendência externa na
  Asaas (assinatura/cobrança ainda não resolvida) — permanece
  `PROTEGER/NÃO TOCAR` até resolução externa
- Investigação ou exclusão dos 7 objetos de storage órfãos — causa raiz
  ainda não determinada; tarefa separada
- Qualquer tranche de limpeza adicional além da Tranche 1 já executada

---

## Notas de ambiente

- Variáveis de ambiente: gerenciadas na Vercel e no `.env.local` local (não commitado)
- Banco: Supabase PostgreSQL (configuração via variáveis de ambiente — não hardcoded)
- Crons: agendados em `vercel.json`
