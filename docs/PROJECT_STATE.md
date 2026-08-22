# PROJECT_STATE.md — Estado técnico da main e Produção

Atualizar sempre que um commit funcional for validado em Produção.
Commits exclusivamente documentais não invalidam este estado.

---

## Commit funcional validado em Produção

**SHA:** `1423ebe9f740b2bd98de8942b5eb913426fb089f`
**Data de validação:** 2026-08-18

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
- **Exportação compatível com SOC — PR #30 mergeada e validada em
  Produção (2026-08-11):** ação "Exportar para SOC" no detalhe da Company
  no Admin gera um arquivo `.xls` BIFF8 real (assinatura OLE2/CFB), aba
  `ModeloI`, título `Modelo 1`, reproduzindo os 118 cabeçalhos exatos do
  Modelo I do SOC, uma linha por `Worker`, filename fixo minimizado
  `SOC-Modelo1.xls` (sem identificador fiscal ou interno). Somente os 8
  campos marcados como obrigatórios no modelo real recebem valor — Nome
  Unidade (`Company.razaoSocial`), Nome Setor (`Worker.setor`), Nome
  Cargo, Nome Funcionário, Dt.Nascimento, Sexo, Situação (fixo `"S"`,
  único valor possível hoje porque o sistema não tem nenhum conceito de
  desligamento/afastamento de Worker) e Dt.Admissão; os demais 110 campos
  permanecem vazios, sem inventar valor nem coletar dado pessoal
  (CPF/RG/CTPS/telefone/e-mail) só para completar a planilha. Setor
  passou a ser obrigatório também em NOVOS envios do onboarding
  (`isWorkerCompleteForSubmission`); declarações já enviadas antes desta
  mudança não são revalidadas nem recebem backfill. Zero Workers ou
  qualquer Worker incompleto bloqueia a exportação inteira da Company,
  sem gerar arquivo parcial. Endpoint administrativo é read-only,
  protegido pela mesma autenticação admin já existente, isolado por
  Company. **Validação em Produção (2026-08-11):** smoke sem credencial
  confirmou a rota protegida (401); como as 2 Companies preexistentes em
  Produção tinham zero Workers, foi criada, com autorização explícita,
  uma fixture sintética temporária mínima (1 Lead, 1 Company, 1 Worker
  completo) — precedida de backup lógico custom de Produção com checksum
  e `pg_restore --list` validados, criada em transação `SERIALIZABLE` com
  guards de preservação. O usuário acessou normalmente o Admin de
  Produção, confirmou visualmente o Worker sintético e baixou o arquivo
  real via "Exportar para SOC"; o arquivo `SOC-Modelo1.xls` foi analisado
  externamente e confirmado: BIFF8 real, aba `ModeloI`, 118 cabeçalhos,
  exatamente os 8 campos obrigatórios preenchidos, demais 110 vazios,
  datas `DD/MM/AAAA`, sexo e situação corretos, nenhuma linha inesperada.
  Em seguida os 3 registros sintéticos foram removidos pelos IDs exatos
  do manifest, em nova transação `SERIALIZABLE` com guards — baseline
  pós-limpeza confirmado idêntico ao anterior à fixture (`Company=2`,
  `Worker=0`, `Lead=2`, `Payment=4`, `OnboardingData=1`,
  `ClientSession=4`, `Commission=1`, `CancellationRequest=1`,
  `Document=1`), digest dos 2 registros preexistentes protegidos com
  `MATCH` exato, zero Asaas, zero e-mail, zero operação financeira, zero
  storage tocado. Backup e manifest preservados fora do repositório como
  evidência. **Ressalva:** esta validação confirma a geração e o download
  do arquivo compatível com o Modelo I em Produção — a importação efetiva
  desse arquivo dentro do software SOC ainda não foi exercitada e
  permanece como validação operacional futura. Esta tranche conclui
  "Backoffice completo" (ver `docs/MVP_BACKLOG.md`).
- **Portal Cliente — status `in_production`/`in_review` e liberação segura
  de documentos — PR #32 mergeada e validada em Produção (2026-08-14):** o
  Portal passou a reconhecer `in_production` e `in_review` como a mesma
  macroetapa de elaboração/revisão dos documentos técnicos, sem criar
  nenhuma ação obrigatória nova para o cliente cujo onboarding já foi
  enviado. `Company.documentsDeliveredAt != null` passou a ser a evidência
  persistente e única de entrega formal dos documentos técnicos (`pgr`,
  `pcmso`, `declaracao`, `os_epi`, `ltcat`); `contrato` permanece fora
  desse gate, acessível pelo seu fluxo próprio. A mesma regra central
  (`src/lib/documentVisibility.ts`) é aplicada em defesa em profundidade
  no dashboard, na listagem (`GET /api/cliente/documents`) e no download
  direto (`GET /api/cliente/documents/[id]/download`); download de
  documento técnico ainda não liberado é recusado com HTTP 404 antes do
  acesso ao storage e sem criar `DocumentAccessLog`; download liberado
  continua gerando o log normalmente. A liberação, uma vez registrada,
  permanece reconhecida mesmo que o status evolua depois para `active` ou
  outro estágio posterior — não depende do valor atual de `status`.
  **Validação controlada em Produção (2026-08-14):** precedida de backup
  lógico fresco (`pg_dump` formato custom, checksum validado, `pg_restore
  --list` aprovado) e de baseline com guards das 2 Companies
  pré-existentes, foi criada, com autorização explícita, uma fixture 100%
  sintética e temporária (Lead, Company, OnboardingData, Payments locais,
  dois Documents com storage sintético, ClientSession) para exercitar 5
  gates diretamente no deployment real: `in_production` (dashboard e API
  corretos, contrato acessível, técnico oculto e bloqueado com 404 sem
  log), `in_review` (mesma macroetapa), `documents_delivered` com
  `documentsDeliveredAt` ainda nulo (confirma que o status isolado não
  libera o documento técnico), `documentsDeliveredAt` preenchido (técnico
  passa a aparecer e a ser baixável, com `DocumentAccessLog`
  correspondente), e `active` (documento já entregue permanece
  disponível). Por fim, `cancelled` foi testado diretamente na fixture
  para confirmar que o mesmo cookie antes válido deixa de conceder acesso
  ao Portal — validação restrita ao gate de autenticação já existente, não
  ao fluxo administrativo de cancelamento. A autenticação da fixture usou
  uma `ClientSession` sintética consumida pela rota real
  `/api/cliente/auth/verify` do deployment de Produção (sem magic link nem
  e-mail). Nenhum HTTP 500 relacionado foi observado, nenhuma chamada à
  Asaas ou operação financeira ocorreu, e a fixture foi integralmente
  removida ao final: contagens de todas as tabelas tocadas retornaram
  exatamente ao baseline, todos os registros da fixture ficaram
  confirmadamente ausentes, e os 2 registros pré-existentes protegidos
  permaneceram idênticos por comparação de digest. **Esta validação
  exercitou diretamente os estados da fixture para validar o comportamento
  do Portal — não revalida o workflow administrativo de transição de
  status (`reviewedBy` obrigatório, preenchimento automático de
  `documentsDeliveredAt`), que não foi alterado por esta PR e permanece
  coberto pela evidência anterior.**
- **Redirecionamento pós-checkout para o Portal — PR #34 mergeada em
  Produção (merge commit `0094eed2cf9a1913ba3ec6953c03cd5cdbf4910a`,
  2026-08-14):** `/cadastro/continuar` passou a consultar a fonte
  financeira central já existente (`/api/contratacao/status`) e, somente
  quando a resposta indica simultaneamente `financiallyComplete === true`
  e `step === 'completed'`, dispara `router.replace('/cliente/dashboard')`
  — navegação única, protegida contra disparo repetido por
  polling/foco/`visibilitychange`/verificação manual (reaproveita o
  `createSingleShotGuard` já existente, sem lógica nova de guarda). O
  cookie `sublime_checkout_continuation` permanece exclusivamente como
  sessão de continuação da contratação; nenhuma conversão para
  autenticação do Portal foi feita. `/cliente/dashboard` mantém sua
  própria autenticação (`sublime_client`) inalterada — sem sessão válida
  do Portal, o dashboard continua encaminhando para `/cliente/login` pela
  regra já existente. **Validação local pré-merge:** testes focados 88/88
  aprovados; suíte completa 736/741 (as 5 falhas de `eligibility.test.ts`
  confirmadas pré-existentes na baseline via comparação com `git stash`);
  TypeScript standalone com os mesmos 41 erros pré-existentes da baseline,
  nenhuma regressão nova; `npm run build` aprovado; `git diff --check`
  limpo. **Após o merge, deployment Production Vercel `Ready`:** confirmado
  por smoke read-only — `/cadastro/continuar` respondeu HTTP 200, sem
  cookie de sessão `/api/contratacao/status` respondeu 401 corretamente e
  a UI exibiu "Sessão expirada" sem erro de aplicação; `/cliente/login`
  respondeu HTTP 200 e renderizou normalmente; o bundle JS publicado de
  `/cadastro/continuar` foi lido publicamente e contém a string
  `/cliente/dashboard`, consistente com o código da PR #34. Nenhuma
  escrita de banco, nenhuma chamada Asaas e nenhuma operação financeira
  ocorreram nesta validação. **Validação estrutural/read-only aceita para
  encerramento; caminho positivo end-to-end
  (`financiallyComplete=true`+`step=completed` → redirect → dashboard ou
  login) não foi exercitado dinamicamente em Produção** — não havia sessão
  de continuação legítima nem `Company` de teste elegível disponível sem
  mutação, e uma tentativa posterior de preparar fixture sintética
  controlada (autorizada, mínima: 1 `Lead` + 1 `Company` + 2 `Payment`
  confirmados, sem `ClientSession`) foi interrompida antes de qualquer
  escrita porque o ambiente da sessão não possuía os meios seguros
  (credenciais de banco de Produção, acesso ao painel Supabase) exigidos
  pelo gate de backup prévio — nenhuma fixture foi criada, nenhum cleanup
  foi necessário. **Decisão explícita do responsável pelo projeto:**
  aceitar o encerramento desta tranche com a validação estrutural/read-only
  obtida, evitando ampliar a superfície de risco de Produção (credenciais
  de banco na sessão, fixture sem os gates operacionais completos) apenas
  para provar uma navegação — risco residual de validação aceito
  conscientemente, não uma alegação de teste dinâmico realizado.
- **Portal do Parceiro — Fluxo Mínimo MVP — PR #36 mergeada por merge
  commit e implantada em Produção (`e9feabb15843dec1c4861579f57c4dcd52997c98`,
  2026-08-14):** fecha o fluxo mínimo do Portal do Parceiro já existente
  (não reconstrói o portal, não altera regra financeira de `Commission`).
  Cadastro de parceiro restrito a PJ nesta fase: CNPJ obrigatório, validado
  por checksum e normalizado (dígitos) no servidor para novos registros;
  duplicidade de novos Partners (e-mail e CNPJ) checada dentro de uma
  transação `Serializable` (mesma técnica de `runSerializable` já usada em
  onboarding/workers), com retry em conflito de serialização — proteção
  real contra corrida de escrita, ainda sem constraint única no schema.
  Novo Partner com dados obrigatórios válidos e aceite do Termo de
  Parceria entra diretamente em `status=active` — aprovação manual deixou
  de ser o fluxo normal; o Admin continua podendo inativar/reativar a
  qualquer momento, e Partner `inactive` não acessa o Portal nem recebe
  nova atribuição por código. First-touch permanece determinado por
  `Lead.partnerId` já persistido: um `partnerRef` chegando só no cadastro
  final da Company nunca sobrescreve nem apaga uma atribuição anterior;
  `Company.partnerId` herda exatamente o parceiro já vinculado ao Lead.
  No dashboard do parceiro, a classificação comercial das indicações é
  amigável (nunca expõe `Lead.status`/`Company.status` técnicos) e
  "contratação concluída" depende de `deriveFinancialActivationState(...)
  .financiallyComplete` (fonte financeira central read-only já usada pelo
  Portal do Cliente) — a existência isolada de uma `Company` não é
  conversão. Payload do Portal do Parceiro minimizado (sem CNPJ do lead,
  Workers, onboarding, documentos, `checkoutUrl`/`invoiceUrl` ou IDs
  Asaas); toda consulta é filtrada pelo `Partner` autenticado na sessão
  (isolamento entre parceiros). Admin passou a exibir CNPJ mascarado e a
  evidência do aceite do Termo (data/versão) no detalhe do parceiro. Copy
  pública de `/parceiros` atualizada para refletir a autoativação e o
  gate PJ/CNPJ, sem mais sugerir aprovação humana como etapa normal antes
  do acesso ao Portal. **Validação pré-merge:** 55/55 testes focados
  aprovados; suíte completa 769 passed / 5 failed (as 5 falhas de
  `eligibility.test.ts` confirmadas pré-existentes na baseline via
  `git stash` contra `origin/main`); TypeScript com os mesmos 23 erros
  pré-existentes da baseline, nenhuma regressão nova; `npm run build`
  aprovado; `git diff --check` limpo. **Validação read-only em Produção
  (2026-08-14), aceita para encerramento desta tranche:** `origin/main`
  confirmado no merge commit da PR #36; deployment Production associado
  com status `success`; `GET /parceiros` → HTTP 200, com o CNPJ obrigatório
  publicado e a copy PJ/autoativação confirmada no conteúdo renderizado;
  `GET /parceiro/login` → HTTP 200, formulário de magic link presente;
  `/parceiro/dashboard` sem sessão não expõe nenhum dado e encaminha para
  `/parceiro/login`; `GET /api/partner/dashboard` sem sessão → HTTP 401
  genérico; `GET /api/partners` sem `x-admin-secret` → HTTP 401 genérico;
  nenhuma resposta 5xx nem erro de console observado; validação 100%
  read-only (só GET), sem nenhum POST/PATCH/DELETE, cadastro, magic link,
  login, fixture, escrita em banco ou chamada Asaas. **Esta validação NÃO
  exercitou dinamicamente em Produção:** criação real de Partner,
  autoativação server-side, persistência/normalização real do CNPJ,
  deduplicação concorrente real no Postgres, envio do e-mail de boas-
  vindas, magic link autenticado, dashboard autenticado com dados reais,
  first-touch em Produção, isolamento dinâmico entre dois Partners reais,
  classificação comercial com `Company`/`Payments` reais, ou inativação/
  revogação dinâmica — esses pontos permanecem cobertos apenas por código
  revisado e pelos testes automatizados da tranche, pendentes de eventual
  autorização humana para smoke mutante controlado em tranche própria.
  **Risco residual registrado:** Partners eventualmente cadastrados antes
  desta mudança, com CNPJ salvo em formato mascarado (não normalizado),
  podem não ser encontrados pela nova checagem de duplicidade por CNPJ
  normalizado — nenhum backfill/migration foi feito para esse caso.
- **Contrato — Eixo B (quadro-resumo e snapshot histórico do comprovante de
  aceite) — PR #38 mergeada por merge commit e implantada em Produção
  (`50d85a24fdfb14417658ed3b9c1ee6be9ebd3ebc`, 2026-08-15):** o PDF do
  comprovante de aceite passou a incluir o quadro-resumo completo da
  contratação (Seção 5 de `docs/CONTRACT_MVP_V1.md`), com snapshot histórico
  da mensalidade e do valor normal da implantação, preservação do valor
  efetivamente contratado, faixa histórica versionada por `contractVersion`
  (nunca recalculada de `pricing.ts` atual), label histórico do plano,
  indicação Sim/Não de promoção conforme o produto efetivamente contratado,
  situação do LTCAT e demais adicionais (fixo "Nenhum" no MVP atual, sem
  inventar dado). Novo campo `Company.implantacaoValorPadrao Int?` no schema.
  Comportamento **fail-closed**: ausência de histórico confiável para
  reconstruir o quadro-resumo interrompe a geração do PDF explicitamente, em
  vez de cair silenciosamente em valor atual de `pricing.ts`. Também corrigiu
  a escala monetária exibida no PDF. O rollout do schema em Produção e o
  deployment da PR #38 foram executados e validados por smokes read-only
  antes deste handoff documental, incluindo backup lógico fresco e
  recuperável como proteção específica da operação de rollout (o P0 de
  backup automático/DR permanece separado e pendente — ver
  `docs/MVP_BACKLOG.md`). Nenhuma operação financeira ou chamada à Asaas foi
  realizada nesta validação. **Esta validação não exercitou contratação
  financeira ponta a ponta real** — o caminho completo aceite → pagamento →
  PDF → e-mail/Portal com geração real de PDF em Produção continua pendente
  (ver "Em andamento" abaixo).
- **Contrato — versionamento histórico do quadro-resumo — PR #42 mergeada
  (`73be188`, 2026-08-17):** corrigiu o `LEGACY_MISMATCH_PREEXISTENTE`
  identificado após a PR #38 — `vigenciaInicial`, `renovacao` e
  `avisoPrevio` do quadro-resumo eram constantes globais que refletiam
  somente a regra vigente (`2026-08-05`), mesmo quando o aceite tinha
  `contractVersion=2026-07-04`. Esses três campos passaram a derivar de
  `contractVersion` pelo mesmo padrão de mapa versionado já usado para
  faixa e plano (`src/lib/contract/quadroResumo.ts`), com `fail-closed`
  via `VersaoContratualDesconhecidaError` para versão desconhecida. A
  versão `2026-07-04` preserva sua regra histórica própria, a versão
  `2026-08-05` preserva a regra vigente, e nenhuma cláusula histórica foi
  reescrita.
- **Contrato — Eixo D (layout e paginação do PDF) — PR #41 mergeada e
  implantada em Produção (`d794ae9e44bbffd0b1b32a5ee0e6f12f4128761a`,
  2026-08-17):** estabilizou layout, formatação, paginação, cabeçalhos,
  rodapés, numeração "Página X de Y", páginas fantasma/footer-only,
  títulos órfãos, listas/bullets, uso de espaço, quadro-resumo,
  comprovante, bloco CONTRATADA, aviso de autenticidade, caracteres
  inválidos e cenários de campos extensos no PDF do contrato. **Antes do
  merge:** matriz sintética de PDFs reconciliada com a PR #42 (cenários
  01–06 com 8 páginas, cenário 07 extremo com 9 páginas justificadas pelo
  conteúdo, cenário 08 histórico `2026-07-04` com 7 páginas, revalidado
  após a PR #42), validação estrutural, validação visual humana, testes
  automatizados e build aprovados. **Depois do merge:** deployment
  Production Vercel `success` associado ao SHA acima; smoke read-only de
  disponibilidade — `/` → 200, `/termos` → 200, `/digital` → 200,
  `/elegibilidade` → 200, `/api/contratacao/status` sem sessão → 401
  esperado — sem gerar nem inspecionar nenhum PDF real em Produção.
  Nenhuma escrita em Produção, nenhuma alteração de banco, schema ou
  migration, nenhuma chamada à Asaas, nenhum pagamento e nenhuma
  contratação ou cancelamento real nesta validação. **Este smoke não
  constitui validação funcional do layout do PDF em Produção** — essa
  evidência é a matriz sintética pré-merge; a geração real de um PDF
  dentro do fluxo E2E completo em Produção continua pendente (ver "Em
  andamento" abaixo). **Com a conclusão da PR #42 e da PR #41, os Eixos A,
  B, C e D da frente Contrato/PDF estão tecnicamente concluídos** — isso
  não representa Go-Live geral liberado nem validação E2E completa (ver
  "Em andamento" abaixo e `docs/MVP_BACKLOG.md`).
- **Lógica financeira de cancelamento — regra de vigência de 12 meses — PR
  #40 mergeada por merge commit e implantada em Produção
  (`1423ebe9f740b2bd98de8942b5eb913426fb089f`, 2026-08-18):** substitui a
  regra anterior de 6 mensalidades (`docs/DECISIONS.md`) pela vigência
  inicial mínima de 12 meses de calendário a partir da ativação.
  `Company.activatedAt` passou a ser o marco imutável de ativação, gravado
  atomicamente com a confirmação do `Payment` relevante (implantação ou 1ª
  mensalidade) no webhook Asaas, protegido contra corrida/retry e nunca
  inferido por `createdAt`, aceite contratual, entrega documental ou
  pagamento posterior; `Company` legada sem `activatedAt` confiável
  permanece fail-closed (bloqueio explícito com erro estruturado, exigindo
  revisão humana, sem operação automática). Cancelamento solicitado durante
  os 12 meses iniciais é tratado como aviso de não renovação, com efeito
  exatamente ao final do 12º mês — nunca antes, nunca somando 90 dias
  adicionais — enquanto serviço e cobrança continuam normalmente até a data
  efetiva; após a renovação automática por prazo indeterminado, passa a
  valer o aviso prévio único de 90 dias; desistência pré-ativação continua
  fluxo distinto, processada imediatamente. O encerramento efetivo é
  aplicado por um processor idempotente, acionado por cron diário
  autenticado (`CRON_SECRET`, comparação de tempo constante, fail-closed se
  o segredo estiver ausente/vazio), sempre Asaas-first (assinatura
  cancelada na Asaas antes de qualquer transição local). `Payment` não é
  alterado apenas pelo agendamento do cancelamento; `Commission` não sofre
  clawback só pelo encerramento contratual — a reversão continua sendo
  responsabilidade exclusiva de refund/chargeback via webhook, já validada
  pela PR #23. **Reconciliação pré-merge:** a branch da PR #40 foi
  incorporada localmente contra a main vigente (então em
  `b6c596fbd8c3a7da6ef0050ba9945f13eb4f05c6`, após os Eixos A-D de
  Contrato/PDF) sem conflitos e sem nenhuma correção funcional adicional
  necessária; 264/264 testes focados e 953/958 da suíte ampla (as mesmas 5
  falhas pré-existentes de `eligibility.test.ts`, sem relação com esta
  tranche), TypeScript nos mesmos 23 erros pré-existentes sem nenhum novo,
  build de produção aprovado, `git diff --check` limpo. **Gate A (schema):**
  o schema aditivo desta tranche (`Company.activatedAt` e os 6 novos campos
  de `CancellationRequest`) já havia sido aplicado e validado em Produção
  antes deste merge; a reconciliação confirmou que o schema candidato final
  permaneceu byte-idêntico ao delta já aplicado, sem exigir nova
  migration/DDL no rollout. **Gate B:** `DUE_PENDING_CANCELLATIONS=0`
  confirmado imediatamente antes do merge. **Gate C:** `CRON_SECRET` já
  configurado em Produção; valor nunca lido, exibido ou alterado em nenhuma
  etapa desta tranche. **Smoke pós-deploy em Produção (2026-08-18):** main
  confirmada estável no SHA do merge; deployment Vercel de Produção
  associado ao mesmo SHA, ambiente Production, status `success`; `/` e
  `/termos` responderam HTTP 200; exatamente uma chamada `GET
  /api/cron/process-cancellations` sem `Authorization`, sem cookie e sem
  `CRON_SECRET` retornou HTTP 401 com o corpo padrão de erro — o
  comportamento fail-closed esperado, correspondente ao retorno antecipado
  do código antes de `processDueCancellations()`; nenhum HTTP 5xx foi
  observado em nenhuma das requisições do smoke. **Limitação aceita desta
  validação:** a sessão que executou o smoke não tinha acesso a logs de
  runtime da Vercel — a ausência de execução do processor após a chamada
  não autenticada é sustentada estruturalmente pela ordem do código já
  revisado e pelo HTTP 401/corpo observado, mas **não foi confirmada
  independentemente por log de runtime**; essa limitação foi aceita para
  encerramento desta tranche e não exigiu criação de token/acesso adicional
  à Vercel. **Esta validação não exercitou nenhum cancelamento real sob a
  nova regra de 12 meses** — nenhum pedido de cancelamento, nenhuma chamada
  Asaas e nenhum cron autenticado foram executados em Produção nesta
  tranche; a cobertura da lógica financeira em si vem exclusivamente dos
  264 testes automatizados focados e da revisão estrutural do código.

---

## Em andamento (não validado em Produção)

- Contrato e PDF — **prioridade P0**:
  - Eixo C (persistência e recuperação do PDF): **concluído**, mergeado pela PR #16
  - Conteúdo MVP 1.0: **congelado documentalmente** em `docs/CONTRACT_MVP_V1.md`
  - Eixo A (fonte única `/termos` × PDF): **concluído e mergeado** (PR #18),
    validado em Produção por smoke read-only
  - Eixo B (comprovante e arquitetura do aceite): **concluído**, mergeado
    pela PR #38, com quadro-resumo, snapshot histórico de mensalidade e
    faixa, LTCAT e demais adicionais no comprovante — versionamento
    histórico dos campos de vigência/renovação/aviso prévio do
    quadro-resumo **concluído pela PR #42**
  - Eixo D (formatação e paginação do PDF): **tecnicamente concluído**,
    mergeado pela PR #41 e implantado em Produção (2026-08-17) — validação
    estrutural/visual sobre matriz sintética concluída antes do merge;
    deployment Production `success` e smoke read-only de disponibilidade
    aprovados após o merge, sem geração nem inspeção de PDF real em
    Produção
  - Lógica financeira de cancelamento (regra de 12 meses): **concluída**,
    mergeada pela PR #40 e implantada em Produção (2026-08-18) — ver item
    acima em "Funcionalidades implantadas e validadas"; nenhum cancelamento
    real sob a nova regra foi exercitado em Produção
  - Validação ponta a ponta do fluxo completo com geração real de PDF em
    Produção: **nova contratação financeira artificial dispensada como
    bloqueador isolado** (decisão `ACCEPT_COMPOSITE_EVIDENCE_WITH_CONTROLLED_FIRST_CUSTOMER`,
    `docs/DECISIONS.md`, 2026-08-22) — a cadeia integrada atual
    (`PAYMENT_CONFIRMED`/`RECEIVED` → `financiallyComplete` →
    `Company.activatedAt` → `generateContractPdf` → `persistContractPdf` →
    `Document`/`DbStorageObject`/`contractHash` → `sendWelcomeEmail` com PDF
    anexado) **continua sem ter sido exercitada ponta a ponta numa única
    contratação real com o código atual** — isso permanece
    `RISK_ACCEPTED_FOR_CONTROLLED_GO_LIVE`, não eliminado nem afirmado como
    validado, e será observado no primeiro cliente real
    (`CONTROLLED_FIRST_CUSTOMER`, ver seção própria abaixo)

---

## Próximo passo prioritário

Os Eixos A, B, C e D da frente Contrato/PDF estão concluídos (PR #18, #38,
#42, #16 e #41), e a lógica financeira de cancelamento pela regra de 12
meses também está concluída e implantada em Produção (PR #40, mergeada e
validada por smoke em 2026-08-18 — ver "Funcionalidades implantadas e
validadas" acima). Em 2026-08-22, a Administração aprovou a decisão
`ACCEPT_COMPOSITE_EVIDENCE_WITH_CONTROLLED_FIRST_CUSTOMER`
(`docs/DECISIONS.md`): o bloqueador Contrato/PDF **deixa de exigir uma nova
contratação financeira artificial completa** como pré-requisito isolado —
um novo E2E real acrescentaria evidência de integração ponta a ponta
genuinamente nova, mas a Administração avaliou que o custo, o risco
operacional e os registros artificiais de obtê-la agora não se justificam
frente à soma das evidências independentes já existentes (ver
`docs/DECISIONS.md` para o racional completo). **Isso não significa que a
cadeia integrada atual já foi validada ponta a ponta em Produção com o
código vigente** — essa lacuna permanece `RISK_ACCEPTED_FOR_CONTROLLED_GO_LIVE`,
explicitamente registrada, não apagada nem reclassificada como já
comprovada. A validação integrada remanescente é transferida para o
primeiro cliente real, tratado como `CONTROLLED_FIRST_CUSTOMER` sob
observação obrigatória (ver seção própria abaixo), com `PAUSE_NEW_CUSTOMERS`
como condição de parada em caso de falha crítica. Nenhum cancelamento real
sob a nova regra de 12 meses foi exercitado em Produção — isso continua
pendente, sem relação com esta decisão. Novo cliente real deixa de estar
bloqueado isoladamente por este item; permanece bloqueado pelos demais P0
pendentes (ver `docs/MVP_BACKLOG.md`).

O Onboarding Individual dos Trabalhadores (PR #26), Admin Workers
(visualização/listagem read-only no backoffice, PR #28) e a Exportação
compatível com SOC (PR #30) estão concluídos e validados em Produção. O
bloqueador "Backoffice completo" está concluído (ver
`docs/MVP_BACKLOG.md`). Contrato e PDF não bloqueia mais isoladamente o
`CONTROLLED_FIRST_CUSTOMER`, pela decisão de evidência composta registrada
acima; o bloqueador P0 "Fechamento técnico" permanece conforme já
priorizado em `docs/MVP_BACKLOG.md`, sem alteração nesta tarefa — a
importação efetiva do arquivo SOC dentro do software externo ainda não
foi validada e segue como risco/validação operacional futura, sem
bloquear novo cliente por esse motivo específico.

---

## CONTROLLED_FIRST_CUSTOMER — Go-Live controlado (decisão de 2026-08-22)

Conforme `docs/DECISIONS.md` (decisão
`ACCEPT_COMPOSITE_EVIDENCE_WITH_CONTROLLED_FIRST_CUSTOMER`), o primeiro
cliente real contratado após 2026-08-22 é tratado como Go-Live controlado.
Nenhum monitoramento automatizado novo foi implementado para isso — este é
o checklist conceitual a ser observado manualmente durante essa primeira
contratação real.

**Checklist crítico a observar durante o `CONTROLLED_FIRST_CUSTOMER`:**

1. aceite contratual;
2. `Company` criada normalmente;
3. snapshots contratuais/comerciais congelados corretamente;
4. cobrança de implantação criada;
5. assinatura/primeira mensalidade criada;
6. confirmação do pagamento (implantação e mensalidade);
7. webhook(s) Asaas aceito(s) — evento correspondente a cada pagamento confirmado observado individualmente (`HTTP 200`), nunca presumindo um único evento cobrindo os dois pagamentos;
8. `Payment` local reconciliado;
9. `financiallyComplete` no momento esperado;
10. `Company.activatedAt` no momento esperado;
11. transição operacional da `Company` (`pending`→`onboarding_pending`);
12. contrato gerado automaticamente;
13. PDF persistido;
14. `Document` criado;
15. `contractHash` presente;
16. recebimento do e-mail de boas-vindas confirmado (evidência humana na caixa postal, sem expor o endereço neste documento);
17. anexo PDF recebido e abrível;
18. magic link/Portal funcionando;
19. contrato listado no Portal;
20. download do contrato funcional.

**Condição de parada — `PAUSE_NEW_CUSTOMERS`:** se ocorrer falha crítica em
qualquer um dos itens abaixo, a entrada de novos clientes deve ser
interrompida até diagnóstico, correção, validação da correção e nova
autorização explícita de continuidade:

- pagamento confirmado sem reconciliação local (`Payment` não atualizado);
- `Company.activatedAt` ausente quando financeiramente completo;
- contrato não gerado;
- PDF não persistido;
- `Document`/`contractHash` inconsistente;
- e-mail crítico não entregue após investigação;
- contrato indisponível no Portal do Cliente.

Nenhuma automação foi implementada para detectar essas condições nesta
tarefa — a observação do `CONTROLLED_FIRST_CUSTOMER` é manual.

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
