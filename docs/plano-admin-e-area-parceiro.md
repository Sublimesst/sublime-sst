# Plano — Backoffice/Admin e Área do Parceiro como base operacional

**Data:** 2026-07-07 · **Status:** AGUARDANDO APROVAÇÃO — nenhum código alterado
**Meta:** "Fazer o parceiro indicar, o cliente entrar, o time operar e a comissão ser rastreável sem perda de dados."

---

## 1. Diagnóstico do estado atual

### ✅ O que já está bem construído (não quebrar)

| Área | O que funciona |
|---|---|
| Funil de indicação | `?ref=CODE` → sessionStorage → vínculo do lead **desde o teste** (first-touch), inclusive não-elegível → consultoria. Validado ponta a ponta (10/10 checks) |
| Cadastro/ativação de parceiro | Cadastro com aceite eletrônico do Termo (data/IP/versão), guard de duplicidade, ativação no admin com e-mail de boas-vindas **com await + feedback visual** (✓ enviado / ⚠️ falhou) |
| Portal do parceiro | Magic link, dashboard com link de indicação, lista de leads, extrato básico, kit de materiais segmentado |
| Admin base | Gate senha+2FA (OTP stateless), leads com filtros/CSV, empresas com 10 estados de pipeline + enforcement de `reviewedBy`, detalhe com checklist de implantação e log eSocial, parceiros com ativar/inativar, CNAE (122 aprovados) |
| Webhook Asaas | Idempotência atômica, token timing-safe, PDF do contrato + hash SHA-256, estorno de pagamento estorna comissão |
| Crons | remind-onboarding, remind-payment, document-expiry (60/30/7d) |
| Schema | Todas as entidades necessárias existem: Lead, Partner, PartnerReferral, Company, Payment, Commission, ImplantacaoChecklist, EsocialLog + índices |

### 🔴 BUGS / QUEBRAS (comprometem a operação real)

| # | Problema | Evidência |
|---|---|---|
| B1 | **Motor de comissões é código morto de ponta a ponta.** (a) Nenhuma rota cria `Payment` tipo `mensalidade` — o register cria só `implantacao`; (b) `asaas.ts` **não tem assinatura/recorrência** (sem `/subscriptions`); (c) webhook ignora pagamentos desconhecidos ("payment not found in db") — se a assinatura for criada à mão no painel Asaas, os eventos chegam e são descartados; (d) **nada transiciona `em_carencia → liberada`** (`liberadaEm` é gravada, o status nunca muda); (e) não existe tela de comissões no admin nem forma de marcar `paga`. Resultado: parceiro veria "Liberadas: R$ 0" para sempre e o financeiro não teria o que pagar | greps confirmados 2026-07-07 |
| B2 | **Pipeline pós-pagamento quebrado:** webhook seta `pending → active` direto; `onboarding_pending` é estado morto; o cron remind-onboarding nunca encontra ninguém | webhook linha ~74 |
| B3 | **Dashboard admin mente nos números:** stats calculadas sobre a 1ª página de leads (a API ignora `?limit=10` e retorna 50 fixo) e rotuladas como totais ("Elegíveis", "Cadastros") | admin/page.tsx |
| B4 | `PAYMENT_OVERDUE` marca payment `failed` mas **não propaga** `overdue` para a Company — inadimplente invisível no pipeline | webhook |
| B5 | Cookie de sessão do parceiro/cliente é **base64 sem assinatura** (forjável se o atacante souber um partnerId) — correção prometida e ainda não feita | partner/auth/verify |
| B6 | `/api/leads` GET **não inclui a relação partner** → admin mostra "Origem: partner" mas não QUEM indicou | leads/route.ts |

### 🟡 INCOMPLETO (funciona, mas não sustenta operação real)

- Onboarding preenchido **não notifica a equipe** (grep confirmado); pagamento confirmado também não (só o cliente recebe boas-vindas)
- Parceiro **não tem como indicar manualmente pelo portal** — só no formulário de cadastro inicial
- Admin/empresas: listagem sem parceiro vinculado, faixa, alertas ou prazos; detalhe sem bloco de pagamentos, sem observações internas editáveis, sem ações rápidas
- Checklist de implantação: itens têm status/concluídoEm/Por, mas **sem responsável, data prevista e observação por item** (pedido do checklist operacional)
- Extrato do parceiro: sem valor da mensalidade, %, mês de referência e previsão de liberação (dados existem no banco, falta exibir)
- Documentos do cliente: **verificar** se o portal entrega arquivos reais ou é placeholder (upload/publicação de documentos não foi implementado em nenhuma sessão)

### ⚖️ INCONSISTÊNCIA termo × código

Cláusula 2ª do Termo de Parceria: *"empresas que já constem na base não geram novo vínculo"*. O código atual **vincula** lead já existente sem parceiro quando ele volta por link (`first-touch se partnerId vazio`). Precisa alinhar: ou o código passa a não vincular leads pré-existentes, ou a cláusula é ajustada para "não geram novo vínculo se já vinculadas a outro parceiro ou já clientes".

---

## 2. Mapa dos fluxos atuais

```
CAPTAÇÃO
 /elegibilidade[?ref=CODE] ─ etapa2 → POST /api/leads (lead captured, partnerId✓)
   └ resultado → POST /api/eligibility (assessed → eligible|backoffice, partnerId✓, e-mail equipe✓)
       ├ ELEGÍVEL → /cadastro → POST /api/leads/register (Company pending + Payment implantacao + checkout)
       │     └ webhook PAYMENT_CONFIRMED → Company ACTIVE(❗deveria ser onboarding_pending)
       │           + PDF/hash + welcome ao cliente (equipe não notificada❗)
       └ NÃO ELEGÍVEL → handoff consultoria (dados salvos, WhatsApp) — SEM ponte p/ Company/Consultoria no sistema

PARCEIRO
 /parceiros (aceite termo✓) → pending → admin ativa → e-mail boas-vindas✓ → /parceiro/login (magic link)
   └ indicação manual SÓ no cadastro → PartnerReferral + Lead✓ (sem canal pós-cadastro❗)

COMISSÃO (hoje: inalcançável)
 Payment mensalidade(❗nunca criado) → webhook → Commission em_carencia
   → (❗nada libera) → (❗nada marca paga) → estorno✓
```

---

## 3+4+5. Arquitetura proposta (Admin e Parceiro)

### Admin — evolução das telas existentes (nada de reescrever)

1. **Dashboard** → endpoint agregado `GET /api/admin/stats` (contagens via `prisma.count` por status: leads novos/indicados, pgto pendente, aguardando onboarding, em produção, em revisão, entregues, ativos, inadimplentes, migração, comissões em carência/liberadas, checklist atrasado). Cards clicáveis → telas filtradas.
2. **Leads** → coluna/painel "Parceiro" (include partner no GET), campo `notes` editável, ações: *Marcar em contato* · *Encaminhar p/ Consultoria* · *Descartar (novo status `discarded` + motivo)*. "Próxima ação" = campo texto simples + data (novos campos `nextAction`, `nextActionAt`).
3. **Empresas (lista)** → colunas: parceiro, faixa, status pgto (badge do payment mais recente), alerta (checklist atrasado/doc vencendo).
4. **Empresa (detalhe)** → adicionar: bloco Pagamentos (lista `payments` + link fatura), bloco Parceiro, Observações internas (novo campo `internalNotes`), ações rápidas (reenviar boas-vindas, copiar link portal, encaminhar p/ consultoria/migração), e o checklist estendido (§5 abaixo).
5. **Comissões (NOVA `/admin/comissoes`)** → tabela: parceiro · cliente · mensalidade nº/12 · base · valor · status · referência · liberação prevista · ações (*Marcar paga* com data, *Bloquear* com motivo) · filtros por status/parceiro · **exportar CSV p/ financeiro** · criação manual (p/ Consultoria).
6. **Notificações internas** (todas com await): pagamento confirmado ✚ onboarding preenchido ✚ comissão liberada (no cron) ✚ inadimplência (no webhook overdue). Já existem: novo lead, elegível/backoffice, novo parceiro, indicação, doc vencendo (cliente — adicionar cópia p/ equipe).

### Parceiro — evolução

1. **Dashboard** → adicionar: botão **"Indicar cliente"** (modal → `POST /api/partner/referrals` reusando o fluxo PartnerReferral+Lead), contadores (indicados / em análise / convertidos / ativos), aviso de adimplência (já existe no rodapé — subir para o card de comissões).
2. **Leads do parceiro** → mapear status internos → rótulos amigáveis: captured/assessed=*Em análise* · eligible=*Elegível p/ Digital* · backoffice=*Encaminhado p/ Consultoria* · registered=*Contratação em andamento* · converted=*Cliente contratado* · discarded=*Não avançou*. Expor só: empresa, data, plano provável, status, comissão estimada. (Nunca: documentos, dados de funcionários, saúde.)
3. **Extrato** → colunas extras: valor da mensalidade, %, mês de referência, liberação prevista (`liberadaEm`), status ampliado (prevista=em_carencia · liberada · paga · bloqueada · estornada · encerrada-12m é derivável do `mensalidadeNum`).
4. **Materiais** → acrescentar texto WhatsApp "cliente final" + bloco "regras de ouro" (usar sempre o link; o que não fazer — espelho da Cláusula 6ª).

### §5 Checklist operacional por empresa (proposta de schema)

Estender `ImplantacaoChecklist` com `responsavel`, `dataPrevista`, `observacao` por item **ou** (melhor) nova tabela genérica `ChecklistItem {companyId, chave, status, responsavel, dataPrevista, concluidoEm, concluidoPor, observacao}` pré-populada com os 16 itens do checklist mínimo (pagamento, onboarding, elegibilidade revisada, cadastro conferido, CNAE, funcionários/cargos, PGR, PCMSO, declaração, OS, EPI, LTCAT*, revisão técnica, publicação, cliente avisado, gestão ativa). Tabela nova evita migração destrutiva e permite itens futuros. "Tarefas atrasadas" no dashboard = itens com `dataPrevista < hoje` e status ≠ done.

---

## 6. Regras de negócio já refletidas ✓

Cadastro sem indicação ✓ · pending→ativação manual ✓ · e-mail na ativação ✓ · magic link ✓ · link exclusivo ✓ · vínculo via link e manual ✓ · vínculo preservado no não-elegível ✓ · parceiro não vê dados sensíveis ✓ (dashboard expõe só empresa/status/plano) · 10%×12 ✓ · implantação sem comissão ✓ (engine filtra `type==='mensalidade'`) · comissão só com pagamento confirmado ✓ · carência 30d ✓ · estorno cancela ✓ · alterações sem aviso prévio ✓ (termo).

## 7. Decisões de negócio pendentes (bloqueiam partes do P0)

| # | Decisão | Recomendação |
|---|---|---|
| D1 | **Como criar a recorrência no Asaas?** (i) API `/subscriptions` na ativação (automático, mais código) vs (ii) assinatura criada manualmente no painel Asaas + webhook **auto-registra** pagamento desconhecido reconciliando por `customer`/`externalReference` | (ii) para os primeiros clientes — menos código, webhook vira fonte de verdade; migrar p/ (i) depois |
| D2 | **Pipeline pós-pagamento:** confirmar `pending →(pago)→ onboarding_pending →(onboarding preenchido)→ in_production → in_review → documents_delivered → active` | Sim — `active` passa a significar "entregue e em gestão mensal" |
| D3 | Termo×código sobre lead pré-existente (ver Inconsistência acima) | Ajustar cláusula: "não geram vínculo se já vinculadas ou já clientes" (mantém first-touch) |
| D4 | Comissão da Consultoria: sem Asaas, entrada é manual — quem lança e com que evidência? | Tela de comissão manual no admin (P1) com campo "base de cálculo/observação" |
| D5 | Quem executa o pagamento das comissões e em que dia (processo financeiro) | Fora do sistema; CSV de liberadas resolve |
| D6 | Leads frios/duplicados (§4 do briefing): bloqueio automático ou manual? | Manual no P0 (status `bloqueada`+motivo na tela de comissões); automático fica p/ Futuro |
| D7 | Documentos do cliente: upload real no portal (storage) entra agora ou segue manual por e-mail? | P2 — não bloqueia primeiros clientes |

## 8. Backlog priorizado

**P0 — coloca a operação de pé (sem isso, cliente/parceiro real quebra)**
1. Ciclo de vida da comissão: cron diário `em_carencia→liberada` (+ e-mail equipe) · página `/admin/comissoes` (listar, marcar paga, bloquear, CSV) — *M*
2. Recorrência Asaas conforme D1(ii): webhook auto-registra mensalidade desconhecida vinculando por customer/externalReference — *M* (bloqueado por D1 + ASAAS_API_KEY na Vercel)
3. Pipeline D2: webhook → `onboarding_pending`; onboarding submetido → `in_production` + notify equipe — *S*
4. `GET /api/admin/stats` agregado + dashboard com números reais — *S*
5. Leads admin: include partner + coluna/painel + ações (descartar/em contato) — *S*
6. Assinatura HMAC nos cookies `sublime_partner`/`sublime_client` (compatível com sessões existentes: aceitar formato antigo por 30d) — *S*
7. Notificações: pagamento confirmado e onboarding preenchido → equipe — *S*
8. Overdue: webhook → `Company.overdue` + card no dashboard + notify — *S*

**P1 — produtividade e confiança**
9. "Indicar cliente" no portal do parceiro (`POST /api/partner/referrals`) — *S/M*
10. Extrato do parceiro enriquecido + status amigáveis de leads — *S*
11. Checklist estendido (tabela `ChecklistItem` + UI no detalhe + atrasadas no dashboard) — *M*
12. Detalhe da empresa: pagamentos, parceiro, observações internas, ações rápidas — *M*
13. Comissão manual (Consultoria) no admin — *S*
14. "Ver como parceiro" (impersonation admin, audit-logged) — *S*
15. Ajuste Cláusula 2ª (D3) — *S*

**P2** — audit trail por empresa (tabela `AuditLog`) · upload/publicação de documentos no portal (D7) · materiais: texto cliente final + regras de ouro · exportações extras
**Futuro (explicitamente fora)** — white label, gamificação, automações complexas, SOC, dashboards sofisticados

## 9. Plano de execução por etapas

| Etapa | Conteúdo | Pré-requisito | Risco |
|---|---|---|---|
| E1 | P0.4, P0.5, P0.7 (stats, partner nos leads, notifies) | — | Baixo: aditivo, sem migração |
| E2 | P0.3 + P0.8 (pipeline + overdue) | D2 aprovada | Médio: muda semântica de `active` — revisar crons e admin/empresas |
| E3 | P0.1 (comissões: cron + tela + CSV) | — | Baixo: tabela já existe; só transições e leitura |
| E4 | P0.2 (recorrência) | **D1 + ASAAS_API_KEY** | Alto: dinheiro real — testar em sandbox com assinatura de verdade antes |
| E5 | P0.6 (cookies assinados) | — | Médio: não derrubar sessões ativas (janela de compatibilidade) |
| E6 | P1 na ordem 9→15 | D3/D4 p/ itens 13/15 | Baixo |

Migrações Prisma previstas: `Lead.nextAction/nextActionAt` + status `discarded` (string, sem migração) · `Company.internalNotes` · tabela `ChecklistItem` (P1) · tabela `AuditLog` (P2). Todas aditivas — `db push` sem perda.

## 10. Checklist de testes manuais (pós-implementação)

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | Cadastro parceiro (sem/com indicação) + ativação | E-mails equipe+parceiro; aceite gravado; feedback ✓ no admin |
| T2 | Login parceiro (magic link) | Dashboard abre; cookie novo assinado; sessão antiga ainda válida |
| T3 | Indicação via link → teste elegível e não-elegível | Lead vinculado nos 2 casos; visível no admin com nome do parceiro |
| T4 | "Indicar cliente" pelo portal | Lead criado vinculado + notify equipe + aparece na lista do parceiro |
| T5 | Cadastro completo + pagamento implantação (sandbox) | Company → `onboarding_pending`; equipe notificada; welcome ao cliente |
| T6 | Onboarding preenchido | Company → `in_production`; equipe notificada |
| T7 | Pagamento de mensalidade (assinatura sandbox) | Payment mensalidade auto-registrado; Commission `em_carencia` criada |
| T8 | Cron de liberação (simular `liberadaEm` no passado) | Status `liberada`; e-mail equipe; aparece no extrato e em /admin/comissoes |
| T9 | Marcar comissão paga + exportar CSV | `pagaEm` gravada; extrato do parceiro mostra "Paga" |
| T10 | Estorno de mensalidade | Commission → `estornada`; extrato reflete |
| T11 | Mensalidade vencida (overdue sandbox) | Company `overdue`; card no dashboard; equipe notificada |
| T12 | Dashboard admin | Números batem com contagens reais do banco |
