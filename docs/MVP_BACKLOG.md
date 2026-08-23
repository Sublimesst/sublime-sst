# MVP_BACKLOG.md — Prioridades e critérios de aceite

Consultar no início de sessões com escopo, planejamento ou priorização.
Preços e valores: consultar código de pricing e contrato vigente — não estão neste arquivo.

---

## P0 — Antes de um novo cliente real

### Contrato

- **Estado:** Eixos A, B, C e D e a lógica financeira de cancelamento (12 meses) concluídos. O critério pré-Go-Live que exigia uma nova contratação financeira artificial completa foi atendido por decisão de evidência composta (`docs/DECISIONS.md`, decisão `ACCEPT_COMPOSITE_EVIDENCE_WITH_CONTROLLED_FIRST_CUSTOMER`, 2026-08-22) — isso não significa que a lacuna de integração ponta a ponta esteja tecnicamente concluída: ela permanece `RISK_ACCEPTED_FOR_CONTROLLED_GO_LIVE` e sua validação residual foi transferida para o `CONTROLLED_FIRST_CUSTOMER` (ver "Pendente" abaixo)
- **Concluído:**
  - Persistência idempotente e recuperável do PDF do contrato (Eixo C — PR #16)
  - Decisões comerciais do MVP 1.0 aprovadas (vigência, cancelamento, promoções — `docs/DECISIONS.md`)
  - Conteúdo do contrato MVP 1.0 aprovado e congelado documentalmente (`docs/CONTRACT_MVP_V1.md`)
  - Validação técnica de SST do conteúdo concluída
  - Fonte única de conteúdo entre `/termos` e o PDF (Eixo A — PR #18, mergeado e validado em Produção)
  - `/termos` consumindo a fonte única, com as 16 cláusulas do MVP 1.0
  - PDF consumindo a mesma fonte única
  - Contrato integral de 16 cláusulas no PDF, não mais um extrato parcial
  - Versionamento `2026-08-05` (`CONTRACT_VERSION`), com a versão `2026-07-04` preservada imutável
  - Remoção das regras públicas antigas (6 mensalidades, avisos de 30/60 dias) de `/termos`, do PDF, de `/digital` e de `/elegibilidade`
  - Testes automatizados de correspondência do Eixo A (versão, cláusulas, ausência de frases proibidas, seleção de versão)
  - Smoke test read-only em Produção (2026-08-05): `/termos`, `/digital` e `/elegibilidade` respondendo 200 com o conteúdo vigente; vigência de 12 meses e regras de cancelamento publicadas conforme aprovado
  - Snapshot histórico de mensalidade, faixa e valor normal da implantação no PDF, com preservação do valor efetivamente contratado (Eixo B — PR #38)
  - Quadro-resumo completo no comprovante, incluindo LTCAT e demais adicionais (Eixo B — PR #38)
  - Versionamento por `contractVersion` de `vigenciaInicial`/`renovacao`/`avisoPrevio` no quadro-resumo, corrigindo o `LEGACY_MISMATCH_PREEXISTENTE` (Eixo B — PR #42, mergeada em `73be188`, 2026-08-17)
  - Layout, formatação e paginação do PDF — cabeçalhos, rodapés, "Página X de Y", páginas fantasma/footer-only, títulos órfãos, listas, quadro-resumo, comprovante, bloco CONTRATADA, aviso de autenticidade e cenários de campos extensos (Eixo D — PR #41, mergeada e implantada em Produção em 2026-08-17, SHA `d794ae9e44bbffd0b1b32a5ee0e6f12f4128761a`; validação estrutural/visual sobre matriz sintética concluída antes do merge, deployment Production `success` e smoke read-only de disponibilidade aprovados após o merge — sem geração real de PDF em Produção nesta validação)
  - Lógica financeira de cancelamento migrada para a regra de vigência de 12 meses aprovada (`docs/DECISIONS.md`) — PR #40, mergeada por merge commit e implantada em Produção em 2026-08-18 (SHA `1423ebe9f740b2bd98de8942b5eb913426fb089f`), reconciliada sem conflito contra a main vigente antes do merge. Smoke pós-deploy aprovado com ressalva observacional: `/` e `/termos` responderam 200, e a única chamada `GET /api/cron/process-cancellations` sem autenticação retornou o 401 esperado (fail-closed), mas a sessão não tinha acesso a logs de runtime da Vercel para confirmar por log a não-execução do processor — evidência aceita por HTTP + revisão estrutural do código, sem confirmação independente por log. Nenhum cancelamento real, chamada Asaas ou cron autenticado foi exercitado sob a nova regra em Produção nesta tranche (ver `docs/PROJECT_STATE.md`)
- **Pendente:**
  - **Nova contratação financeira artificial completa dispensada** como
    bloqueador isolado do MVP (decisão `ACCEPT_COMPOSITE_EVIDENCE_WITH_CONTROLLED_FIRST_CUSTOMER`,
    `docs/DECISIONS.md`, 2026-08-22) — um novo E2E real acrescentaria, sim,
    evidência de integração ponta a ponta genuinamente nova, mas a
    Administração avaliou que o custo, o risco operacional e os registros
    artificiais de obtê-la artificialmente agora não se justificam frente à
    soma das evidências independentes já existentes (ver `docs/DECISIONS.md`
    para o racional completo)
  - **Isso não equivale a afirmar que a cadeia integrada atual —
    `PAYMENT_CONFIRMED`/`RECEIVED` → `financiallyComplete` →
    `Company.activatedAt` → `generateContractPdf` → `persistContractPdf` →
    `Document`/`DbStorageObject`/`contractHash` → `sendWelcomeEmail` com PDF
    anexado — já foi exercitada ponta a ponta numa única contratação real
    com o código atual.** Essa lacuna integrada permanece
    `RISK_ACCEPTED_FOR_CONTROLLED_GO_LIVE` (`docs/DECISIONS.md`) e será
    observada no primeiro cliente real (`CONTROLLED_FIRST_CUSTOMER`, ver
    `docs/PROJECT_STATE.md` para o checklist crítico e a condição de parada
    `PAUSE_NEW_CUSTOMERS`)
- **Critério de aceite:**
  - Conteúdo comercial e operacional alinhado com o produto atual
  - Correspondência verificada com `/termos`
  - Mecanismo de imutabilidade do aceite implementado
  - PDF legível gerado automaticamente
  - Comprovante eletrônico persistido
  - **Critério de encerramento da validação integrada residual** (não é pré-condição para iniciar o `CONTROLLED_FIRST_CUSTOMER`, é o critério para encerrar formalmente a lacuna `RISK_ACCEPTED_FOR_CONTROLLED_GO_LIVE` depois dele): cadeia integrada observada com sucesso durante o `CONTROLLED_FIRST_CUSTOMER` (evidência real, não sintética); falha crítica aciona `PAUSE_NEW_CUSTOMERS` em vez de encerrar este critério
- **Dependências:** `docs/CONTRACT_MVP_V1.md` (conteúdo já aprovado)
- **Bloqueia novo cliente:** não isoladamente — os Eixos A-D e a lógica financeira de cancelamento (PR #40) estão concluídos, e o critério de Go-Live passou a aceitar evidência composta (`docs/DECISIONS.md`); o primeiro cliente real é tratado como `CONTROLLED_FIRST_CUSTOMER` sob observação obrigatória, com `PAUSE_NEW_CUSTOMERS` como condição de parada em caso de falha crítica (ver `docs/PROJECT_STATE.md`). Os demais critérios P0 pendentes ("Fechamento técnico", abaixo) continuam bloqueando independentemente desta decisão

### Documentos do cliente

- **Estado:** concluído e validado em Produção
- **Implementado:**
  - Upload administrativo funcional
  - Upload restrito a PDF
  - Tamanho máximo de 10 MiB
  - Validação de extensão
  - Validação de MIME
  - Validação de assinatura PDF
  - Bloqueio do upload manual do tipo `contrato` (reservado ao fluxo automatizado de aceite)
  - Isolamento por `Company`
  - Listagem e download no Portal do Cliente
  - Download administrativo
  - `DocumentAccessLog` para downloads (cliente e administrativo)
  - Testes automatizados das rotas e do `DbStorageProvider`
  - Correção da atribuição do ator no `DocumentAccessLog` (cliente com
    cookie novo grava o id da própria sessão; Admin continua gravando null)
  - Integração à main e deploy da correção de atribuição do ator (PR #21)
  - Novo login por magic link após o deploy, com cookie emitido pelo código corrigido
  - Download do cliente com cookie novo, validado em Produção
  - Validação final de ausência de respostas 500
- **Critério de aceite:**
  - Upload administrativo funcional
  - Isolamento por `Company`
  - Download disponível no Portal do Cliente
  - `DocumentAccessLog` registrado
  - Validação de tipo e tamanho de arquivo
- **Bloqueia novo cliente:** não

### Onboarding individual dos trabalhadores

- **Estado:** concluído e validado em Produção
- **Implementado:**
  - Rascunho persistente e retomável antes do envio
  - Cadastro individual de `Worker` por `Company` (CRUD completo enquanto não enviado)
  - Limite de até 20 trabalhadores por `Company`
  - Validação dos campos obrigatórios do trabalhador revalidada no servidor no envio
  - Quantidade contratada (`Company.numFuncionarios`) e quantidade declarada (contagem de `Worker`) mantidas separadas
  - Divergência contratado × declarado exige confirmação explícita do cliente (`quantity_mismatch`, HTTP 409, sem gravação, se não confirmada)
  - Confirmação explícita não reprecifica nem altera `Company.numFuncionarios`
  - Snapshot final da quantidade declarada gravado em `OnboardingData.numFuncionarios` no envio
  - Imutabilidade no Portal do Cliente após o envio (mutações de dados gerais e de `Worker` bloqueadas; leitura continua disponível)
  - Validação controlada em Produção (Gates A–E, 2026-08-11) com fixture 100% sintética, integralmente removida ao final
- **Critério de aceite:** atendido para esta tranche
- **Concluído em tranche separada:** Admin Workers (visualização/listagem
  read-only dos Workers no detalhe da Company, no Admin) — PR #28,
  mergeada e validada em Produção em 2026-08-11; exportação compatível
  com SOC — PR #30, mergeada e validada em Produção em 2026-08-11 (ver
  seção "Backoffice completo" abaixo)
- **Bloqueia novo cliente:** sim

### Backoffice completo

- **Estado:** concluído e validado em Produção
- **Concluído:**
  - Visualização/listagem read-only dos Workers do onboarding individual
    no detalhe da Company, no Admin — PR #28, validada em Produção em
    2026-08-11
  - Exportação compatível com SOC dos dados de Worker/onboarding — PR
    #30, mergeada e validada em Produção em 2026-08-11 (geração e
    download do arquivo `.xls` compatível com o Modelo I; a importação
    efetiva do arquivo no software SOC ainda não foi validada — ver
    `docs/PROJECT_STATE.md`)
- **Critério de aceite:**
  - Todos os dados fornecidos por clientes e parceiros acessíveis via Admin ou exportação
    compatível com Excel
- **Critério atendido:** dados de Worker/onboarding acessíveis via Admin
  (PR #28) e via exportação compatível com Excel/SOC (PR #30). A
  exportação genérica CSV/Excel dos demais dados do Admin é item
  separado, registrado em P1 (não incluído neste critério)
- **Bloqueia novo cliente:** não (concluído)

### Fechamento técnico

- **Estado:** concluído
- **Concluído (evidência da tarefa `MVP-CLOSURE-20260821`, aceita pelo
  Supervisor — sem reexecução de testes/TypeScript/build nesta tarefa
  documental):**
  - Zero regressões confirmadas: suíte 953 passed / 958 total / 5 failed,
    as 5 falhas as mesmas pré-existentes de `eligibility.test.ts`, zero
    regressão nova
  - Build limpo, TypeScript sem erros novos: `npm run build` PASS, 67 rotas
    geradas; TypeScript com 23 erros, iguais à baseline documentada, todos
    confinados a arquivos de teste, zero erro novo em código de Produção
  - `npm ci` concluído com sucesso, `package.json`/`package-lock.json`
    inalterados, working tree rastreada limpa
  - Smoke test do fluxo completo: substituído pela decisão
    `ACCEPT_COMPOSITE_EVIDENCE_WITH_CONTROLLED_FIRST_CUSTOMER`
    (`docs/DECISIONS.md`, tarefa `MVP-FINAL-E2E-001`, 2026-08-22) — uma nova
    contratação financeira artificial completa deixou de ser requisito
    pré-Go-Live; a cadeia integrada atual não deve ser declarada como já
    validada ponta a ponta, permanece `RISK_ACCEPTED_FOR_CONTROLLED_GO_LIVE`,
    e sua validação residual ocorre no `CONTROLLED_FIRST_CUSTOMER` (ver
    `docs/PROJECT_STATE.md`); falha crítica nesse cliente aciona
    `PAUSE_NEW_CUSTOMERS`
  - Backup automático pago do Supabase: **deixou de ser critério do MVP por
    decisão empresarial** (`docs/DECISIONS.md`, 2026-08-22) — a estratégia
    mínima de recuperação aceita neste estágio é o backup lógico manual já
    utilizado/validado no projeto (ver `docs/runbooks/backup-supabase.md`);
    automação de backup, maior retenção e/ou solução paga (incluindo PITR)
    ficam para reavaliação pós-MVP, conforme crescimento da base de clientes,
    aumento do risco financeiro e receita disponível
- **Fechamento técnico não bloqueia mais o primeiro cliente controlado**
  (`CONTROLLED_FIRST_CUSTOMER`, ver `docs/PROJECT_STATE.md`)
- **Bloqueia novo cliente:** não (concluído)

---

## P1 — Antes da abertura pública

- Portal do Parceiro / fluxo mínimo MVP
  — **Estado:** concluído, mergeado pela PR #36 (merge commit
  `e9feabb15843dec1c4861579f57c4dcd52997c98`) e validado em Produção por
  smoke read-only em 2026-08-14 (ver `docs/PROJECT_STATE.md`). Cadastro
  restrito a PJ com CNPJ obrigatório/validado/normalizado; autoativação do
  Partner após cadastro válido e aceite do Termo (aprovação manual deixou
  de ser o fluxo normal); login por magic-link já existente preservado;
  painel de indicações e extrato de comissões no dashboard do parceiro;
  first-touch determinado por `Lead.partnerId`, herdado pela `Company` sem
  possibilidade de sobrescrita por um `partnerRef` posterior; classificação
  de conversão ("contratação concluída") condicionada ao estado financeiro
  central `financiallyComplete`, nunca à simples existência da `Company`;
  isolamento das indicações/comissões pelo Partner autenticado na sessão;
  minimização de dados no payload do Portal. Recursos avançados do
  programa de parceiros (Parceiro Estratégico, white label, Partner PF)
  seguem fora de escopo — ver Pós-MVP.

- Alinhar Termo de Parceria ao gate operacional PJ-only do MVP
  — **Estado:** pendente. O texto vigente de `/termos-parceria` ainda
  identifica o parceiro como "a pessoa física ou jurídica identificada no
  formulário de cadastro de parceiros", enquanto o cadastro (PR #36) já
  exige CNPJ obrigatório e opera nesta fase somente para PJ. Divergência
  registrada aqui como pendência documental/jurídica; o Termo não foi
  alterado nesta tranche.

- Portal reconhece status `in_production` e exibe conteúdo correspondente
  — **Estado:** concluído e validado em Produção — PR #32, 2026-08-14

- Redirecionamento pós-checkout para usuário do Portal
  — **Estado:** concluído e mergeado — PR #34, 2026-08-14 (merge commit
  `0094eed2cf9a1913ba3ec6953c03cd5cdbf4910a`). Validação estrutural/
  read-only aceita para encerramento; caminho positivo end-to-end não
  exercitado dinamicamente em Produção (ver `docs/PROJECT_STATE.md`)

- CTA para `/cliente/login` em sessão expirada
  — **Estado:** pendente

- Remover "Ver ou pagar" de pagamentos já confirmados
  — **Estado:** pendente

- Corrigir semântica dos filtros de comissão no Admin
  — **Estado:** pendente

- Governança da transição de status para `active`
  — **Estado:** pendente

- Exportação CSV/Excel dos dados do Admin
  — **Estado:** pendente

- Conectar a rota de download administrativo existente
  (`/api/admin/empresas/[id]/documents/[documentId]/download`) a um botão
  na interface do Admin — hoje a rota existe e tem testes, mas não há
  elemento de UI que a acione
  — **Estado:** pendente · Não bloqueia o MVP documental nem novo cliente isoladamente

- Melhorias de UX do upload, mensagens de erro e conveniência operacional
  — **Estado:** pendente

- Revisão comercial, operacional e de coerência de `/privacidade` e `/termos`
  — **Estado:** pendente. O aviso de revisão jurídica de `/termos` foi
  autorizado para remoção e removido nesta correção pós-merge; isso não
  substitui a revisão jurídica formal por advogado, que segue em Pós-MVP

---

## Pós-MVP

- Revisão formal por advogado (contrato, termos, privacidade)
- Versionamento avançado de documentos
- Exclusão controlada de dados com audit trail
- XLSX avançado com múltiplas abas
- Parceiro Estratégico (benefício/tier diferenciado por volume de clientes) — não implementado
- Partner pessoa física — não implementado, fora do MVP atual (somente PJ/CNPJ)
- White label para parceiros — requer volume mínimo de clientes validado
- Melhorias de UX não bloqueadoras
