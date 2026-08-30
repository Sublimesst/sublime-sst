# PRODUCT_ROADMAP.md — Memória operacional de desenvolvimento futuro (Sublime SST / Sublime Digital)

Documento de memória consolidada para o roadmap **de produto (SaaS)** da
Sublime SST/Sublime Digital. Não é backlog vigente por si só, não autoriza
implementação e não substitui os documentos operacionais existentes.

---

## 1. Finalidade e governança

**Para que serve este documento:** preservar, de forma organizada e
rastreável, o que já foi decidido como pendência oficial, o que é apenas
ideia candidata ainda não aprovada, o que já foi implementado e não deve
voltar a ser proposto como novo, e o que ainda não tem evidência suficiente
para virar decisão. Sem isso, ideias discutidas em análises e planos
antigos se perdem, ou pior, voltam a ser propostas como se fossem novas.

**Diferença entre os documentos:**

| Documento | Papel |
|---|---|
| `docs/PROJECT_STATE.md` | Estado técnico real da `main`/Produção — o que já está implantado e validado, e o que está em andamento |
| `docs/MVP_BACKLOG.md` | Prioridades e critérios de aceite vigentes (P0/P1/Pós-MVP) — o backlog oficial ativo |
| `docs/DECISIONS.md` | Decisões de produto e governança já aprovadas, com motivo e fonte |
| `docs/PRODUCT_ROADMAP.md` (este) | Memória de longo prazo: reconcilia histórico, separa candidato de oficial, separa Growth/Control Plane do produto, e organiza pós-MVP e itens sob investigação |

**Regra de precedência:** o estado atual comprovado na `main` +
`PROJECT_STATE.md` + `DECISIONS.md` + `MVP_BACKLOG.md` vigente prevalece
sobre qualquer roadmap ou plano histórico incompatível
(`sublime-sst-roadmap.md`, `docs/plano-admin-e-area-parceiro.md`,
`docs/revisao-juridica-contrato-v4.md`). Documentos históricos são
referência, não backlog atual.

**Presença neste roadmap não é autorização de implementação.** Um item
listado aqui — mesmo como `PENDING_OFFICIAL` — só vira trabalho autorizado
quando entra formalmente em `docs/MVP_BACKLOG.md` (ou já está lá) e segue o
protocolo normal de sessão/branch do `CLAUDE.md`
(diagnóstico → implementação → revisão → commit → push → PR → merge →
validação em Produção, com autorização explícita em cada etapa sensível).

**Promoção de `CANDIDATE` para `PENDING_OFFICIAL` exige decisão humana.**
Nenhum agente promove um candidato por conta própria. A promoção deve ser
registrada em `docs/DECISIONS.md` (decisão) e refletida em
`docs/MVP_BACKLOG.md` (prioridade/critério de aceite).

---

## 2. Estado atual de transição / Go-Live

Resumo de estado — a fonte completa é `docs/PROJECT_STATE.md` e
`docs/DECISIONS.md`; este documento não reabre nem reinterpreta o mérito.

- **Decisão vigente:** `ACCEPT_COMPOSITE_EVIDENCE_WITH_CONTROLLED_FIRST_CUSTOMER`
  (`docs/DECISIONS.md`, 2026-08-22). O MVP não exige mais uma nova
  contratação financeira artificial completa como bloqueador isolado.
- **`CONTROLLED_FIRST_CUSTOMER`:** o primeiro cliente real contratado após
  2026-08-22 é tratado como Go-Live controlado, com checklist crítico de
  observação manual (20 itens, `docs/PROJECT_STATE.md`).
- **Risco aceito (`RISK_ACCEPTED_FOR_CONTROLLED_GO_LIVE`):** a cadeia
  integrada `PAYMENT_CONFIRMED`/`RECEIVED` → `financiallyComplete` →
  `Company.activatedAt` → geração/persistência do PDF → `Document`/hash →
  e-mail de boas-vindas ainda não foi exercitada ponta a ponta numa única
  contratação real com o código atual. Isso é risco aceito, não validação
  concluída.
- **`PAUSE_NEW_CUSTOMERS`:** condição de parada se ocorrer falha crítica em
  qualquer item do checklist do `CONTROLLED_FIRST_CUSTOMER` — interrompe
  entrada de novos clientes até diagnóstico, correção, validação e nova
  autorização explícita.
- **Validações operacionais ainda não exercitadas dinamicamente em
  Produção** (distintas de validação de desenvolvimento/sintética):
  - fluxo financeiro completo com o código atual (Eixos A/B/D e
    `Company.activatedAt` da PR #40) numa contratação real;
  - importação efetiva do arquivo `SOC-Modelo1.xls` dentro do software SOC
    (geração/download já validados em Produção — a importação em si, não);
  - cancelamento real sob a nova regra de vigência de 12 meses (PR #40).
- Nada nesta seção é uma feature nova — é registro de estado para não
  confundir validação operacional pendente com trabalho de roadmap.

---

## 3. P1 — antes da abertura pública

Todos os itens abaixo já constam como pendentes em `docs/MVP_BACKLOG.md`
("P1 — Antes da abertura pública"), confirmados nesta revalidação.

| Item | Estado | Origem | Objetivo | Dependências | Observação |
|---|---|---|---|---|---|
| Alinhar Termo de Parceria ao gate PJ-only do MVP | `PENDING_OFFICIAL` | `MVP_BACKLOG.md` P1 | Eliminar divergência entre o texto de `/termos-parceria` (ainda fala em "pessoa física ou jurídica") e o cadastro de Partner (PR #36), que hoje exige CNPJ e opera só PJ | Nenhuma técnica; é ajuste textual/jurídico | Pendência documental/jurídica, não decisão de produto nova |
| CTA para `/cliente/login` quando a sessão expirar | `PENDING_OFFICIAL` | `MVP_BACKLOG.md` P1 | Melhorar a experiência do cliente quando a sessão do Portal expira | Nenhuma bloqueante conhecida | — |
| Remover/ajustar "Ver ou pagar" em pagamentos já confirmados | `PENDING_OFFICIAL` | `MVP_BACKLOG.md` P1 | Evitar confusão visual quando o pagamento já foi confirmado | Nenhuma bloqueante conhecida | — |
| Corrigir semântica dos filtros de comissão no Admin | `PENDING_OFFICIAL` | `MVP_BACKLOG.md` P1 | Alinhar os filtros da tela de comissões ao significado real dos estados | Nenhuma bloqueante conhecida | — |
| Governança da transição de status para `active` | `PENDING_OFFICIAL` | `MVP_BACKLOG.md` P1 | Definir/fortalecer a governança de quando e como uma `Company` transiciona para `active` | Relacionado a `documentsDeliveredAt`/gate de visibilidade (PR #32) | Não redefinir regra de negócio nesta tarefa — só registrar pendência |
| Exportação CSV/Excel dos dados do Admin | `PENDING_OFFICIAL` | `MVP_BACKLOG.md` P1 | Exportação genérica dos demais dados do Admin, além do já concluído SOC (Worker/onboarding, PR #30) | Distinto do "Backoffice completo" (já concluído) | Escopo: dados do Admin em geral, não Worker/onboarding |
| Conectar a rota de download administrativo a um botão na UI do Admin | `PENDING_OFFICIAL` | `MVP_BACKLOG.md` P1 | A rota `/api/admin/empresas/[id]/documents/[documentId]/download` já existe e tem testes; falta o elemento de UI que a aciona | Nenhuma | Não bloqueia o MVP documental nem novo cliente isoladamente |
| Melhorias de UX do upload, mensagens de erro e conveniência operacional | `PENDING_OFFICIAL` | `MVP_BACKLOG.md` P1 | Refinar feedback e usabilidade do fluxo de upload de documentos | Nenhuma bloqueante conhecida | Escopo amplo — detalhar em tarefa própria quando priorizado |
| Revisão comercial, operacional e de coerência de `/privacidade` e `/termos` | `PENDING_OFFICIAL` | `MVP_BACKLOG.md` P1 | Revisão de coerência comercial/operacional (não jurídica formal) do texto público | Distinta da revisão jurídica formal por advogado (Pós-MVP) | O aviso de revisão jurídica já foi removido de `/termos`; isso não substitui a revisão formal |

---

## 4. Pós-MVP oficial

Itens confirmados em `docs/MVP_BACKLOG.md` ("Pós-MVP") e `docs/DECISIONS.md`.
Nenhuma prioridade relativa é inventada além do que as fontes já registram.

| Item | Estado | Origem |
|---|---|---|
| Revisão formal do contrato/termos/privacidade por advogado | `PENDING_OFFICIAL` | `MVP_BACKLOG.md` Pós-MVP; `docs/DECISIONS.md` ("Contrato e jurídico") |
| Versionamento avançado de documentos (correção de declaração já enviada) | `PENDING_OFFICIAL` | `MVP_BACKLOG.md` Pós-MVP; `docs/DECISIONS.md` ("Onboarding individual") |
| Exclusão controlada de dados com audit trail | `PENDING_OFFICIAL` | `MVP_BACKLOG.md` Pós-MVP |
| XLSX avançado com múltiplas abas | `PENDING_OFFICIAL` | `MVP_BACKLOG.md` Pós-MVP |
| Partner pessoa física | `PENDING_OFFICIAL` | `MVP_BACKLOG.md` Pós-MVP; `docs/DECISIONS.md` ("Programa de Parceiros MVP") — fora do MVP atual (somente PJ/CNPJ) |
| White Label para parceiros | `PENDING_OFFICIAL` | `MVP_BACKLOG.md` Pós-MVP — requer volume mínimo de clientes validado |
| Parceiro Estratégico / benefício por volume | `PENDING_OFFICIAL` | `MVP_BACKLOG.md` Pós-MVP |
| Melhorias de UX não bloqueadoras | `PENDING_OFFICIAL` | `MVP_BACKLOG.md` Pós-MVP |
| Evolução de backup/recovery (automação, maior retenção, solução paga/PITR) | `PENDING_OFFICIAL` | `docs/DECISIONS.md` ("Backup do banco — mínimo aceito para o MVP") — reavaliação condicionada a crescimento da base, aumento do risco financeiro e receita disponível; nenhum gatilho numérico foi definido nas fontes |

---

## 5. Candidatos em avaliação

Itens revalidados nesta tarefa: continuam sem implementação e sem promoção
a `docs/MVP_BACKLOG.md`. Nenhum destes é decisão aprovada.

**A. Performance e escalabilidade do Admin** — `CANDIDATE`
Paginação da listagem de empresas, otimização de queries, índices quando
necessários, carregamento parcial, evitar dataset completo em dashboards.
Origem: `docs/plano-admin-e-area-parceiro.md`. Revalidado nesta tarefa:
`src/app/api/admin/empresas/route.ts` não usa `take`/`skip` na consulta
principal de listagem — sem paginação confirmada.

**B. CRM operacional no Admin** — `CANDIDATE`
Responsável, próxima ação, prazo, observações internas, alertas por
lead/empresa. Origem: `docs/plano-admin-e-area-parceiro.md` (P0/P1 do plano
histórico, nunca promovido ao `MVP_BACKLOG.md` atual). Revalidado nesta
tarefa: `prisma/schema.prisma` não tem campos de `nextAction`/CRM no
modelo `Lead`.

**C. Checklist/pipeline operacional mais flexível** — `CANDIDATE`
Checklist de implantação com responsável, data prevista e observação por
item (tabela `ChecklistItem` proposta). Origem:
`docs/plano-admin-e-area-parceiro.md`.

**D. Evolução SOC → Sublime** — `CANDIDATE`
API/exportação/importação automatizada com o SOC, retorno de status para a
plataforma, ou importação de relatórios como alternativa. Distinto e
posterior à exportação Modelo I já concluída (PR #30). Origem: análise de
produto anterior; sem fonte em `MVP_BACKLOG.md`.

**E. Painel/visão do contador** — `CANDIDATE`
Foco fiscal/folha/eSocial, permissões segregadas, nunca expor informação
clínica. Origem: `sublime-sst-roadmap.md` (canal de contadores como motor
de crescimento) e análise de produto; não há painel de contador
implementado nem planejado em `MVP_BACKLOG.md`.

**F. Evoluções adicionais do Portal do Parceiro** — `CANDIDATE`
Itens que permaneceram apenas como candidatos em `docs/plano-admin-e-area-parceiro.md`
e não entraram no fluxo mínimo já concluído (PR #36): "Indicar cliente"
pelo próprio Portal do Parceiro (hoje só há vínculo no cadastro inicial),
extrato do parceiro enriquecido com mais detalhes de comissão,
impersonation administrativa auditada ("Ver como parceiro"). Distinto do
Parceiro Estratégico e White Label (Pós-MVP oficial, Seção 4).

**G. Rate limiting distribuído** — `CANDIDATE`
Origem: `sublime-sst-roadmap.md` (Sprint 7). Revalidado nesta tarefa:
`src/lib/rateLimit.ts` confirma limitador em memória (`new Map<string, ...>`,
comentário "Simple in-memory rate limiter for Edge runtime"), sem
persistência entre deploys. Redis/Upstash ou equivalente permanece apenas
candidato — nenhuma decisão arquitetural aprovada.

**H. Observabilidade** — `CANDIDATE`
Monitoramento de uptime e alertas de erro. Origem: `sublime-sst-roadmap.md`
(Sprint 7). Ferramentas citadas nas fontes (ex. UptimeRobot) são exemplos
históricos, não decisão de arquitetura aprovada.

**I. Marketplace de Clínicas** — `CANDIDATE`
Hipótese distante. Origem: `sublime-sst-roadmap.md` (Sprint 9). Mantida
como hipótese de longo prazo, com os pré-requisitos já documentados na
fonte (operação própria estabilizada com 100+ clientes, validação de
demanda com entrevistas, análise jurídica/tributária do split de
pagamento) — não tratada como prioridade atual.

---

## 6. Pontos UNKNOWN / investigação futura

Itens cuja evidência permanece insuficiente nesta tarefa. Nenhuma questão
jurídica é resolvida aqui.

- **Retenção NR-7 / prazo de guarda de registros ocupacionais** — `UNKNOWN`.
  `docs/revisao-juridica-contrato-v4.md` (2026-07-04) apontou conflito entre
  a retenção de 5 anos então praticada e a exigência de 20 anos da NR-7 para
  registros médicos ocupacionais. `docs/CONTRACT_MVP_V1.md` Seção 17 lista
  "Guarda e transferência de registros médicos ocupacionais" e "LGPD e
  tratamento de dados de saúde" como cláusulas sensíveis ainda pendentes de
  revisão jurídica formal — ou seja, o ponto segue sem resolução confirmada
  no conteúdo MVP 1.0 vigente.
- **Destino de prontuários/registros médicos na rescisão** — `UNKNOWN`.
  Mesma origem acima; `docs/CONTRACT_MVP_V1.md` Seção 17, item 12.
- **Cláusulas jurídicas específicas ainda não confirmadas** (mora, reajuste,
  limitação de responsabilidade, foro, validade probatória do aceite) —
  `UNKNOWN`. Listadas em `docs/CONTRACT_MVP_V1.md` Seção 17 como pendentes
  de revisão jurídica formal; não verificadas nesta tarefa.
- **Texto do Termo de Parceria versus regra de first-touch no código** —
  `UNKNOWN`. `docs/plano-admin-e-area-parceiro.md` (2026-07-07) apontou que
  a Cláusula 2ª do Termo de Parceria ("empresas que já constem na base não
  geram novo vínculo") pode divergir da regra de first-touch confirmada em
  `docs/DECISIONS.md`. O texto atual de `/termos-parceria` não foi lido
  nesta tarefa para confirmar se a divergência persiste.
- **Cobertura exata de FAQ com dados estruturados (`FAQPage`)** — `UNKNOWN`.
  Planejada em `sublime-sst-roadmap.md` (Sprint 4/5); implementação real não
  verificada nesta tarefa.
- **Cobertura completa dos eventos de analytics** — `UNKNOWN`. Lista de
  eventos planejada em `sublime-sst-roadmap.md` (Sprint 2); cobertura real
  no código não verificada nesta tarefa.
- **Confirmação do layout/posicionamento atual da home** — `UNKNOWN`. O
  reposicionamento da home (dois caminhos, consultoria e Digital) foi
  planejado em `sublime-sst-roadmap.md` (Sprint 1); o estado visual atual da
  home não foi verificado nesta tarefa. **Este ponto pertence à fronteira
  Growth/produto** — se ainda relevante, revalidar junto da frente Growth
  (Seção 9).

---

## 7. Segurança / infraestrutura — candidatos já observados

> **Este bloco não substitui uma auditoria de segurança dedicada.**

- Rate limiting em memória, sem persistência entre deploys (`CANDIDATE` —
  ver Seção 5.G).
- Maturidade de backup/recovery: mínimo aceito hoje é backup lógico manual
  (`docs/DECISIONS.md`, 2026-08-22); automação e solução paga permanecem
  `PENDING_OFFICIAL` para reavaliação Pós-MVP (Seção 4).
- Observabilidade (uptime, alertas de erro) ainda não implementada
  (`CANDIDATE` — ver Seção 5.H).

---

## 8. Reconciliação de documentos históricos

Estes documentos permanecem **referências históricas** e não devem ser
executados diretamente como backlog atual — qualquer item deles só é
trabalho autorizado se estiver refletido em `docs/MVP_BACKLOG.md` ou
promovido explicitamente por decisão humana.

| Documento | Bloco | Classificação | Nota |
|---|---|---|---|
| `sublime-sst-roadmap.md` (Sprint 0 — infraestrutura crítica) | Banco operacional, e-mail, RLS, GA4 básico | `DONE` | Superado pelo estado atual da `main`/Produção (`docs/PROJECT_STATE.md`) |
| `sublime-sst-roadmap.md` (Sprint 1 — reposicionamento da marca) | Home com dois caminhos, `/consultoria-sst`, `/sobre` | `UNKNOWN` | Estado visual atual não verificado nesta tarefa (ver Seção 6); fronteira com Growth |
| `sublime-sst-roadmap.md` (Sprint 2 — funil de elegibilidade) | Reordenação de etapas, eventos de analytics | `UNKNOWN` | Cobertura de eventos não verificada (Seção 6); implementação de funil em produção não reavaliada nesta tarefa |
| `sublime-sst-roadmap.md` (Sprint 3 — landing pages por nicho) | `/sst-para-contadores`, tecnologia, escritórios | `GROWTH_ONLY` | Aquisição/marketing — fora deste roadmap (Seção 9) |
| `sublime-sst-roadmap.md` (Sprint 4 — SEO e descoberta por IA) | SEO técnico, structured data, performance | `GROWTH_ONLY` | Fora deste roadmap (Seção 9) |
| `sublime-sst-roadmap.md` (Sprint 5 — conteúdo de autoridade) | Blog, artigos, FAQ | `GROWTH_ONLY` | Fora deste roadmap (Seção 9) |
| `sublime-sst-roadmap.md` (Sprint 6 — portal do cliente e onboarding) | Login, dashboard, upload/download, pagamentos recorrentes | `DONE` | Portal do Cliente, onboarding individual e cobrança já implementados e validados (`docs/PROJECT_STATE.md`) |
| `sublime-sst-roadmap.md` (Sprint 7 — preparação para escala) | Painel admin completo, automações, Redis, backup, uptime | `CANDIDATE` / `PENDING_OFFICIAL` misto | Rate limiting distribuído e observabilidade são candidatos (Seção 5.G/H); backup é pendência oficial (Seção 4); exportação/painel completo parcialmente concluído (SOC, Admin Workers) |
| `sublime-sst-roadmap.md` (Sprint 8 — White Label) | Painel white label, API para parceiros | `PENDING_OFFICIAL` | Já registrado em `MVP_BACKLOG.md` Pós-MVP (Seção 4) |
| `sublime-sst-roadmap.md` (Sprint 9 — Marketplace de Clínicas) | Marketplace com split de pagamento | `CANDIDATE` | Ver Seção 5.I |
| `docs/plano-admin-e-area-parceiro.md` (bugs B1–B6: motor de comissão, pipeline pós-pagamento, dashboard, cookies) | Correções críticas listadas em 2026-07-07 | `SUPERSEDED` | Pipeline pós-pagamento, cobrança de mensalidade, cookies assinados e fluxo de comissão evoluíram desde então (webhook, `activatedAt`, PR #40, Portal do Parceiro PR #36) — este documento não reflete o código atual e não deve ser lido como bug list vigente |
| `docs/plano-admin-e-area-parceiro.md` (P0.1–P0.8 do plano) | Ciclo de vida de comissão, recorrência Asaas, pipeline, stats, cookies assinados | `SUPERSEDED` | A arquitetura financeira e de assinatura atual (Asaas + webhook + `Company.activatedAt`) diverge do desenho descrito no plano; não usar como especificação |
| `docs/plano-admin-e-area-parceiro.md` (P1.9–P1.15: indicar cliente pelo portal, extrato enriquecido, checklist estendido, comissão manual, impersonation, ajuste Cláusula 2ª) | Itens de produtividade do parceiro/Admin | `CANDIDATE` | Ver Seção 5.B, 5.C, 5.F; ajuste da Cláusula 2ª também aparece como `UNKNOWN` (Seção 6) |
| `docs/plano-admin-e-area-parceiro.md` (P2/Futuro: audit trail, upload de documentos, white label, SOC, gamificação) | Itens de longo prazo do plano | `PENDING_OFFICIAL` / `CANDIDATE` misto | Audit trail é Pós-MVP oficial (Seção 4); upload de documentos já implementado (`DONE`, ver `docs/PROJECT_STATE.md`); white label é Pós-MVP oficial; SOC evoluído e gamificação são candidatos (Seção 5.D) |
| `docs/revisao-juridica-contrato-v4.md` (blocos A–E) | Contradições `/termos` × PDF, NR-7, gaps vs. contrato tradicional | `SUPERSEDED` (bloco A) / `UNKNOWN` (blocos B, C) | Bloco A (unificação `/termos` × PDF) foi resolvido pelo Eixo A (PR #18, fonte única); blocos B (NR-7, prontuários) e C (gaps jurídicos) permanecem como cláusulas sensíveis não resolvidas em `docs/CONTRACT_MVP_V1.md` Seção 17 — ver Seção 6 deste documento |
| `docs/revisao-juridica-contrato-v4.md` (bloco D — defeitos do contrato tradicional/"NR Soluções") | Correção de template do contrato tradicional (consultoria) | `UNKNOWN` | Fora do escopo do Sublime Digital/SaaS; pertence à operação de consultoria tradicional, não verificado nesta tarefa |

---

## 9. Fora do escopo deste roadmap

### Sublime Growth

Pertencem a outra frente, não detalhada aqui:

- rastreador de empresas/CNPJ novo;
- prospecção;
- SEO/GEO;
- criação de conteúdo;
- inteligência de mercado;
- automações de marketing;
- geração de leads.

Landing pages por nicho, SEO técnico e conteúdo de autoridade
(`sublime-sst-roadmap.md`, Sprints 3–5) pertencem a esta frente
(`GROWTH_ONLY`, ver Seção 8).

### Control Plane / Night Shift

Pertencem ao repositório de orquestração
(`Sublimesst/sublime-orchestration-control`), não detalhado aqui:

- Night Shift;
- automação Claude ↔ ChatGPT;
- Full Exact-Brief Gate;
- V1.1;
- futuras capacidades de publicação pré-autorizada;
- trusted external start.

---

## 10. Critérios de priorização futura

Sem pontuação numérica — critérios orientadores para decisão humana:

- risco para Produção;
- segurança/compliance;
- necessidade antes da abertura pública;
- impacto operacional;
- impacto na experiência/percepção de valor;
- dependências entre itens;
- volume de clientes atendido/afetado;
- esforço estimado de implementação;
- evidência de demanda real;
- receita/risco suficientes para justificar o custo adicional.

---

## 11. Processo de atualização

- Atualizar este roadmap após toda decisão relevante de produto.
- Atualizar após implementação/merge que altere o estado de um item aqui
  listado.
- Atualizar quando um `CANDIDATE` for promovido a `PENDING_OFFICIAL` (por
  decisão humana registrada em `docs/DECISIONS.md`) ou descartado.
- Decisão oficial de produto/governança continua registrada em
  `docs/DECISIONS.md`.
- Estado técnico real da `main`/Produção continua registrado em
  `docs/PROJECT_STATE.md`.
- Critérios e pendências do MVP continuam registrados em
  `docs/MVP_BACKLOG.md`.
- **Este documento nunca é, por si só, autorização de desenvolvimento** —
  qualquer item aqui listado segue o protocolo normal de sessão/branch e as
  autorizações explícitas exigidas pelo `CLAUDE.md`.
