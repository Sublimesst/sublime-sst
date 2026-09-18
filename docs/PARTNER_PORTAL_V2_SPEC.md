# PARTNER_PORTAL_V2_SPEC.md — Especificação do Portal do Parceiro V2

**Tarefa de origem:** `PARTNER-PORTAL-V2-SPEC-001` (exclusivamente documental).
**Auditoria técnica anterior:** `PARTNER-PORTAL-V2-TECH-AUDIT-001` (concluída
sem alteração de arquivos; os gaps técnicos que ela apontou foram
reconciliados diretamente contra o código atual nesta especificação).

Este documento é a fonte de especificação do Portal do Parceiro V2. Deve ser
suficiente para que uma futura sessão do Claude Code implemente qualquer
tranche (PPV2-01 a PPV2-07) **sem depender da memória desta conversa**.

**Regra de precedência (herdada de `docs/PRODUCT_ROADMAP.md`):** o código
atual e o estado registrado em `docs/PROJECT_STATE.md` prevalecem sobre este
documento em caso de divergência. Este documento não autoriza implementação
por si só — cada tranche segue o protocolo normal do `CLAUDE.md`
(diagnóstico → implementação → revisão → commit → push → PR → merge →
validação em Produção, com autorização explícita em cada etapa sensível).

---

## 1. Objetivo

Evoluir o Portal do Parceiro existente (`src/app/parceiro/`,
`src/app/api/partner/`) — hoje um MVP funcional mínimo (PR #36) — para uma
**Central de Relacionamento do Parceiro**: um ambiente onde o parceiro (hoje
sempre PJ) acompanha suas indicações, entende com clareza o que vai receber
de comissão e quando, acessa materiais de campanha versionados e,
eventualmente (parceiro contador, mediante autorização explícita do
cliente), acompanha o status de SST da carteira de clientes que ele mesmo
trouxe.

Não é uma reescrita. É evolução da identidade visual e dos componentes já
existentes (`src/app/parceiro/dashboard/page.tsx` e afins), corrigindo antes
um defeito funcional que hoje torna a tela de comissões estruturalmente
enganosa (ver Seção 2).

## 2. Problema

1. **A liberação automática de comissão não existe.** `Commission` nasce com
   `status='em_carencia'` e `liberadaEm` gravado como a data-alvo futura
   (`now + 30 dias`) no momento da criação
   (`src/app/api/webhooks/asaas/route.ts:275-288`), mas **nenhuma rotina do
   sistema transiciona `status` de `em_carencia` para `liberada`** quando essa
   data chega. Confirmado por busca no código: os únicos locais que escrevem
   `status: 'liberada'` são no admin (`PATCH` de `liberada`→`paga`,
   `src/app/api/admin/comissoes/route.ts:154-157`, que exige que já esteja
   `liberada`) e não há nenhum cron ou job que faça a transição
   `em_carencia`→`liberada` (crons existentes em `vercel.json`:
   `remind-onboarding`, `remind-payment`, `document-expiry`,
   `process-cancellations` — nenhum deles toca `Commission`). Ou seja, sem
   intervenção manual direta no banco, **toda comissão fica presa em
   `em_carencia` para sempre**, mesmo depois do prazo de carência vencido. O
   dashboard do parceiro (`src/app/parceiro/dashboard/page.tsx`) já exibe
   "Liberadas" e "Pagas" como se o fluxo funcionasse ponta a ponta — hoje,
   estruturalmente, nunca vai mostrar nada além de zero nessas colunas.
2. **A tela de comissões do parceiro é pobre.** Mostra empresa, número da
   mensalidade, valor, status e referência — sem valor total esperado da
   série de 12, sem calendário/previsão de liberação por mensalidade, sem
   explicação do "porquê" de cada status.
3. **Indicar cliente só existe no cadastro inicial do parceiro.** Não há
   canal para o parceiro já ativo indicar uma nova empresa pelo próprio
   portal (confirmado: não existe rota `POST /api/partner/referrals` nem
   formulário equivalente no dashboard atual).
4. **Parceiro contador não tem identidade própria no sistema.** O único
   campo de classificação existente é `Partner.tier` (`comum | recorrente |
   estratégico`, `prisma/schema.prisma:385`), que descreve volume/relação
   comercial, não o tipo de parceiro. Não há hoje nenhum jeito de o sistema
   saber que um Partner é um escritório de contabilidade com necessidade de
   visão técnica da carteira.
5. **Não existe nenhum modelo de autorização de acesso técnico.**
   `Company.partnerId` (schema, comentário já presente na linha 120)
   representa vínculo comercial de indicação/comissão — nunca autorização de
   acesso a dado técnico ou de SST. Hoje, o único acesso do parceiro aos
   dados de uma `Company` indicada é a classificação comercial resumida no
   próprio dashboard (`classifyLead`,
   `src/app/api/partner/dashboard/route.ts:19-30`). Nenhum código hoje
   verifica ou concede autorização explícita do cliente para um terceiro
   (contador) ver dado técnico da empresa.
6. **Materiais são uma página estática única**
   (`src/app/parceiro/materiais/page.tsx`), sem versionamento nem histórico —
   suficiente para o MVP atual, insuficiente para "Materiais & Campanhas"
   como conceito de produto contínuo.

## 3. Princípios de produto

- **Evoluir, não reescrever.** Reaproveitar layout, componentes visuais,
  paleta e padrões de UI já usados em `src/app/parceiro/dashboard/page.tsx`
  (cards brancos com borda `border-gray-200`, `rounded-[12px]`, tipografia
  `text-teal`/`font-display`, badges de status coloridos). Nenhuma tranche
  desta especificação introduz um design system novo.
- **Corrigir antes de expandir.** A liberação automática de comissão
  (PPV2-01) é pré-requisito de produto para qualquer tela nova de comissões
  — não faz sentido enriquecer a visualização de um dado que hoje nunca
  transiciona corretamente.
- **Vínculo comercial ≠ autorização técnica.** `Company.partnerId` continua
  significando vínculo de indicação/comissão, e é o gate comercial
  obrigatório do MVP (Seção 13.2 — condição necessária para um Partner
  contador ser sequer elegível a receber autorização técnica de uma
  `Company`). Mas `Company.partnerId`, **sozinho**, nunca libera acesso
  técnico: nenhuma tranche desta especificação usa esse campo,
  isoladamente, para conceder acesso a dado técnico ou de SST — o segundo
  gate, sempre exigido em conjunto, é a autorização explícita e ativa do
  próprio cliente.
- **Autorização é do cliente, não do sistema nem do Admin.** Acesso do
  contador a dado técnico de uma `Company` só existe quando o cliente logado
  no Portal do Cliente concede explicitamente — nunca por inferência
  automática a partir de indicação, tier ou aprovação administrativa.
- **Minimização de dados clínicos é inegociável.** Nenhuma tela do Portal do
  Parceiro (em nenhuma tranche, presente ou futura) expõe prontuário, CID,
  diagnóstico, resultado de exame ou qualquer dado médico individualizado.
  "SST da Carteira" trabalha exclusivamente com status/vigência agregados de
  documentos e eventos eSocial — nunca com o conteúdo clínico por trás deles.
- **Fail-closed em autorização.** Ausência de autorização explícita e válida
  bloqueia a exibição — nunca assume liberação por omissão, por Admin, ou por
  vínculo comercial pré-existente.
- **Simplicidade sobre sofisticação prematura.** Campanhas começam como
  conteúdo versionado simples — não como CMS. Autorização do contador começa
  como concessão simples por `Company` com escopos fixos — não como sistema
  de permissões genérico.

## 4. Personas

### 4.1 Parceiro comum

Hoje, todo `Partner` cadastrado (`src/app/api/partners/route.ts`) — PJ com
CNPJ validado, aceite do Termo de Parceria, `status='active'` por
autoativação (`docs/DECISIONS.md`, "Novo Partner... entra diretamente como
`active`"). Indica clientes, acompanha status comercial da indicação e
recebe comissão de 10% sobre até 12 mensalidades. Não precisa e não deve ter
acesso a nenhum dado técnico ou de SST das empresas que indicou — o vínculo
é puramente comercial.

Exemplos: corretor de seguros, consultor de RH, indicador avulso, escritório
de contabilidade que ainda não pediu (ou não tem interesse em) acesso
técnico da carteira.

### 4.2 Parceiro contador

Um `Partner` que, além de indicar clientes, presta serviço contábil
recorrente a uma parte da própria carteira de indicações e por isso tem
interesse legítimo em acompanhar o status de SST desses clientes — nunca por
direito automático. No MVP, o acesso a uma `Company` específica exige
**dois gates cumulativos**: (1) esse Partner ser o vínculo comercial já
existente daquela `Company` (`Company.partnerId` aponta para ele) **e**
(2) autorização explícita e ativa concedida por aquele cliente,
individualmente, por `Company` (ver Seção 13.2). Nenhum dos dois gates,
isoladamente, é suficiente.

Diferença estrutural em relação ao parceiro comum: precisa de uma
classificação própria no sistema (ver Seção 13 e PPV2-05) para que a
interface de "SST da Carteira" só apareça a quem faz sentido, e para que o
fluxo de solicitar/receber autorização do cliente exista. **Não é o mesmo
conceito que `Partner.tier`** (que mede volume/relação comercial,
independente do tipo de parceiro).

## 5. Arquitetura de informação

Navegação alvo do Portal do Parceiro V2 (substituindo o dashboard único
atual por seções, mantendo o header e os componentes visuais existentes):

```
Portal do Parceiro V2
├── Visão Geral            (resumo: indicações, comissões, avisos — landing pós-login)
├── Indicações & Clientes  (lista completa de leads/empresas indicadas + "Indicar cliente")
├── Comissões              (extrato completo, calendário de liberação, histórico)
├── Materiais & Campanhas  (kit de materiais versionado, campanhas vigentes)
├── SST da Carteira        (somente parceiro contador com ≥1 autorização ativa)
└── Ajuda                  (FAQ do parceiro, contato)
```

Regras de navegação:

- "SST da Carteira" só aparece no menu para um Partner classificado como
  contador **e** com pelo menos uma `Company` que atenda simultaneamente
  aos dois gates da Seção 13.2 (vínculo comercial de indicação **e**
  autorização explícita ativa concedida pelo cliente daquela `Company`).
  Para parceiro comum, ou para contador sem nenhuma `Company` nessa
  condição, o item nem é renderizado — não aparece desabilitado nem com
  aviso de bloqueio, simplesmente não existe no menu.
- Todas as seções continuam atrás da mesma autenticação por sessão já
  existente (cookie `sublime_partner`, `src/lib/partnerAuth.ts`,
  revalidação de `status='active'` a cada request).
- Mobile first: a navegação colapsa para um menu inferior ou hambúrguer nas
  larguras estreitas (ver Seção 16).

## 6. Especificação detalhada de cada tela

### 6.1 Visão Geral

Landing pós-login. Substitui o topo atual do dashboard (cards de funil +
cards de comissão), mantendo os mesmos componentes visuais.

- Bloco "Seu link de indicação" (igual ao atual, sem mudança funcional).
- Cards de funil de indicações: Recebidas / Em andamento / Convertidas
  (mesma lógica de `classifyLead`, sem mudança).
- Cards de comissão: Total previsto / Liberadas (a receber) / Pagas — só
  fica correto na prática depois de PPV2-01.
- Avisos acionáveis (não decorativos): ex. "Você tem N indicações
  aguardando ação" (nenhuma ação nova requerida do parceiro nesta tranche;
  o aviso é informativo), "N comissões liberadas aguardando pagamento" —
  dados que já existem, apenas reorganizados.
- Atalho para "Indicar cliente" (PPV2-03) em destaque.
- Empty state: parceiro sem nenhuma indicação ainda vê uma chamada clara
  para copiar o link e para "Indicar cliente", não uma tela vazia.

### 6.2 Indicações & Clientes

Evolução da tabela de leads já existente
(`src/app/parceiro/dashboard/page.tsx:176-212`).

- Mesma classificação comercial amigável já implementada
  (`LEAD_CLASSIFICATION`, sem mudança de rótulos nesta tranche).
- Adiciona filtro por classificação e busca por nome da empresa (client-side
  sobre os dados já retornados por `GET /api/partner/dashboard` — sem nova
  paginação de servidor nesta tranche, dado o volume esperado por parceiro).
- Botão "Indicar cliente" abre o fluxo da Seção 10 / PPV2-03.
- Nunca exibe CNPJ, dados de Worker, onboarding, documentos ou qualquer
  identificador Asaas — mesma minimização já vigente em
  `GET /api/partner/dashboard` (comentário explícito no código-fonte,
  `src/app/api/partner/dashboard/route.ts:58-60`).

### 6.3 Comissões

Ver Seção 9 (especificação de comissões) para o detalhamento completo.
Resumo de tela: extrato com abas ou filtro por status (`Em carência`,
`Liberada`, `Paga`, `Em análise`, `Estornada`), calendário/linha do tempo de
mensalidade 1/12 a 12/12 por cliente convertido, e explicação inline do que
cada status significa (a mesma nota de rodapé já presente hoje, expandida).

### 6.4 Materiais & Campanhas

Ver Seção 11. Evolui a página estática atual
(`src/app/parceiro/materiais/page.tsx`) para uma lista de itens de
campanha versionados e datados, mantendo o mesmo layout visual.

### 6.5 SST da Carteira (somente parceiro contador autorizado)

Ver Seção 12 e o modelo de autorização (Seção 13). Lista somente as
`Company` para as quais o contador atende simultaneamente aos dois gates
da Seção 13.2 — vínculo comercial (`Company.partnerId` aponta para esse
Partner) **e** autorização explícita ativa concedida pelo cliente daquela
`Company` —, com status agregado read-only de PGR/PCMSO/LTCAT e eventos
eSocial — nunca download de documento nesta versão (ver Seção 12.3).

### 6.6 Ajuda

- FAQ curto do parceiro (como funciona a comissão, como indicar, prazos).
- Contato de suporte (reaproveitar o número de WhatsApp já usado no rodapé
  do dashboard atual, `src/app/parceiro/dashboard/page.tsx:257`).
- Não é escopo desta especificação detalhar o conteúdo textual do FAQ —
  fica para a tranche de implementação da fundação visual (PPV2-02).

## 7. Dados que cada ator pode visualizar

| Dado | Parceiro comum | Parceiro contador (gate 1 ou gate 2 ausente) | Parceiro contador (gates 1 e 2 satisfeitos nessa Company) |
|---|---|---|---|
| Nome da empresa indicada, classificação comercial, plano | Sim | Sim (é a mesma indicação) | Sim |
| CNPJ da empresa indicada | Não | Não | Não (fora do escopo desta spec — ver Seção 14) |
| Comissão própria (valor, status, calendário) | Sim | Sim | Sim |
| Documentos do cliente (PGR/PCMSO/LTCAT/OS-EPI) — conteúdo/download | Não | Não | Não (pós-MVP, PPV2-07) |
| Status/vigência agregados de PGR/PCMSO/LTCAT | Não | Não | Sim, somente nas `Company` que satisfazem os dois gates (Seção 13.2) |
| Eventos S-2210/S-2220/S-2240 (visão agregada) | Não | Não | Sim, somente nas `Company` que satisfazem os dois gates (Seção 13.2) |
| Dado de Worker (nome, cargo, admissão) | Não | Não | Não (fora do escopo desta spec) |
| Qualquer dado clínico/médico individual | Não | Não | **Nunca — nenhum ator do Portal do Parceiro** |

A coluna do meio ("gate 1 ou gate 2 ausente") é idêntica à do parceiro
comum — vale tanto para um contador sem nenhum vínculo comercial
autorizado quanto para um contador que é o vínculo comercial mas ainda não
recebeu autorização do cliente (ou já teve revogada). A única diferença de
um contador aparece na coluna da direita: existência do item de menu "SST
da Carteira" quando pelo menos uma `Company` satisfaz **simultaneamente**
os dois gates da Seção 13.2, e a visão agregada dentro daquela tela,
restrita a essas `Company`.

## 8. Linguagem/status amigáveis

Reaproveitar e estender o padrão já estabelecido em
`src/app/parceiro/dashboard/page.tsx` (`LEAD_CLASSIFICATION`,
`COMMISSION_STATUS`) — nunca expor enum técnico cru ao parceiro.

**Classificação de indicação (já implementada, mantida sem mudança):**
`indicacao_recebida`, `elegibilidade_avaliada`, `encaminhada_consultoria`,
`cadastro_em_andamento`, `contratacao_concluida`.

**Status de comissão (já implementado, mantido sem mudança de enum;
descrição inline pode ser enriquecida):** `em_carencia` ("Em carência"),
`liberada` ("Liberada"), `paga` ("Paga"), `bloqueada` ("Em análise"),
`estornada` ("Estornada").

**Status agregado de SST da Carteira (novo, PPV2-06)** — deriva de
`ImplantacaoChecklist` (`pgrStatus`/`pcmsoStatus`/`ltcatStatus`:
`pending | in_progress | done`) e de `EsocialLog`
(`status`: `pending | enviado | confirmado | erro`), nunca inventando um
enum paralelo:

| Fonte técnica | Rótulo amigável sugerido |
|---|---|
| `pending` | "Em elaboração" |
| `in_progress` | "Em revisão" |
| `done` | "Concluído" (data de conclusão exibida quando existir; "vigente até
  DD/MM/AAAA" só se houver fonte confiável e validada para essa data — ver
  regra fixa na Seção 12.2, nunca aproximação) |
| `EsocialLog.status = pending` | "Aguardando envio" |
| `EsocialLog.status = enviado` | "Enviado, aguardando confirmação" |
| `EsocialLog.status = confirmado` | "Confirmado no eSocial" |
| `EsocialLog.status = erro` | "Pendência — em tratamento" |

A definição final desses rótulos (incluindo eventual ajuste de texto) é
detalhe de implementação da tranche PPV2-06, não decisão fechada aqui — o
que esta especificação fixa, sem exceção, é: **nunca expor o enum técnico
bruto**, e **nunca inferir, aproximar ou inventar vigência/validade que o
dado subjacente não sustenta** — regra normativa fixa detalhada na
Seção 12.2, não um risco a resolver como a tranche preferir.

## 9. Especificação de comissões (PPV2-01 e PPV2-04)

### 9.1 PPV2-01 — Correção da liberação automática (pré-requisito, P0 desta frente)

**Problema exato:** `Commission.liberadaEm` é gravado no momento da criação
como a data-alvo (`now + 30 dias`,
`src/app/api/webhooks/asaas/route.ts:284-285`), mas nada lê esse campo para
transicionar `status` de `em_carencia` para `liberada` quando a data chega.

**Comportamento correto esperado** (a implementar em tranche própria, fora
desta tarefa documental):

- Uma rotina periódica (cron, seguindo o mesmo padrão já usado por
  `process-cancellations`: `CRON_SECRET`, comparação de tempo constante,
  fail-closed se o segredo estiver ausente) deve encontrar toda `Commission`
  com `status='em_carencia'` e `liberadaEm <= now`, e transicioná-la para
  `status='liberada'`.
- A transição deve ser idempotente e segura contra concorrência (mesmo
  padrão de guard atômico já usado no `PATCH` de `liberada`→`paga`,
  `updateMany` com filtro de status na cláusula `where`).
- Uma `Commission` que foi `bloqueada` (disputa/chargeback em andamento,
  ver `src/app/api/webhooks/asaas/route.ts:536-551`) nunca deve ser
  liberada automaticamente por essa rotina — só volta a `em_carencia` pela
  reversão já existente no webhook (linha 255-259), e só dali segue o fluxo
  normal.
- Uma `Commission` `estornada` nunca é tocada por essa rotina.
- Esta correção **não** deve gerar nenhuma comissão nova, alterar
  `mensalidadeLiq`, `percentual` ou `valorComissao` — é estritamente a
  transição de status baseada em data já gravada.
- **Esta tranche bloqueia PPV2-04 e qualquer expansão de UI da tela de
  comissões**: não faz sentido enriquecer a visualização de "Liberadas" e
  "Pagas" antes de o dado subjacente conseguir chegar lá.
- Notificação (equipe e/ou parceiro) na liberação é candidato razoável para
  esta tranche, mas não é requisito de aceite mínimo desta correção — a
  correção do dado tem prioridade sobre a notificação.

### 9.2 PPV2-04 — Comissões enriquecidas (depende de PPV2-01)

- Calendário/linha do tempo de mensalidade 1/12 a 12/12 por cliente
  convertido — usa `Commission.mensalidadeNum` (já existe) para desenhar a
  progressão; mensalidades futuras ainda não geradas aparecem como
  "prevista", não como uma `Commission` inventada no banco.
- Total esperado da série de 12 por cliente (soma projetada, deixando claro
  que é projeção, não uma garantia contratual nova).
- Explicação inline de cada estado (Em carência = aguardando os 30 dias de
  proteção contra estorno; Liberada = pronta para pagamento; Paga = já
  recebida; Em análise = disputa/chargeback em andamento na Asaas;
  Estornada = pagamento revertido, comissão cancelada).
- Filtro por cliente, por status, por período de referência
  (`Commission.referencia`, já existe).
- Nenhuma mudança de regra de negócio de comissão (10% × até 12
  mensalidades, carência de 30 dias) — só apresentação.

## 10. Fluxo "Indicar cliente" (PPV2-03)

Hoje só existe vínculo no cadastro inicial (`?ref=CODE` propagado até
`Lead.partnerId`). Não existe canal de indicação pelo portal já logado.

**Fluxo proposto:**

1. Parceiro logado clica em "Indicar cliente" (Visão Geral ou Indicações &
   Clientes).
2. Formulário simples, com minimização de dados desde o desenho: nome da
   empresa, CNPJ (opcional, sem validação de checksum obrigatória nesta
   etapa — é só uma indicação, não um cadastro formal), nome de contato,
   telefone/WhatsApp, e-mail (opcional), observação livre. **Coletar
   apenas os dados necessários ao contato comercial inicial** — nenhum
   campo novo além destes deve ser adicionado sem necessidade concreta
   demonstrada. O campo de observação livre nunca deve solicitar ou sugerir
   dado sensível ou médico (ex.: nenhum placeholder do tipo "descreva a
   situação de saúde da empresa"); a UI deve orientar o parceiro a não
   inserir esse tipo de informação ali (ex.: texto de apoio junto ao campo
   deixando claro que é só para contexto comercial).
3. Ao enviar, cria um registro que preserva a mesma regra de first-touch já
   vigente (`docs/DECISIONS.md`, "First-touch do Partner é determinado por
   `Lead.partnerId` já persistido") — a indicação pelo portal nunca deve
   contornar essa regra nem criar um caminho paralelo de atribuição.
4. A indicação aparece imediatamente na aba "Indicações & Clientes" do
   próprio parceiro, com status inicial equivalente a `indicacao_recebida`.
5. Equipe Sublime é notificada (mesmo padrão de notificação interna já
   usado em outros fluxos do sistema, ex. novo lead) para dar sequência
   comercial (contato, teste de elegibilidade, etc.) — este fluxo não cria
   sozinho um `Lead` com `status='eligible'`; a avaliação de elegibilidade
   continua seguindo o funil normal.

**Decisão de modelagem a resolver na tranche de implementação (não fechada
aqui):** se a indicação nasce como um novo `Lead` (com `source='partner'` e
`partnerId` preenchido) ou se reaproveita `PartnerReferral` (modelo já
existente no schema, hoje sem nenhuma rota que o crie — ver
`prisma/schema.prisma:421-441`). Ambas as opções preservam first-touch;
a escolha entre elas é detalhe técnico de PPV2-03, e deve considerar que
`PartnerReferral` já tem o shape mais próximo do formulário acima
(`companyName`, `cnpj`, `contactName`, `phone`, `email`, `observations`,
`status: pending|contacted|converted|lost`) sem exigir nova migration.

**Fora de escopo desta especificação:** decidir se o formulário de
indicação também aciona automaticamente um e-mail/WhatsApp para o cliente
final indicado — tratar como candidato de UX, não requisito de aceite.

## 11. Materiais & Campanhas (PPV2-02, expandido em versão posterior)

- MVP desta frente: lista de itens de campanha com título, descrição curta,
  peça (texto pronto/imagem/link), **data de início e de encerramento
  quando aplicável**, e um indicador simples de "vigente" vs. "encerrada".
- Versionado significa: quando uma campanha muda, cria-se uma nova entrada
  datada — nunca se edita silenciosamente o texto de uma campanha já
  comunicada, para preservar o que cada parceiro efetivamente recebeu.
- **Não criar CMS, não criar entidade sofisticada de campanha no MVP.** Uma
  tabela simples (ou, na primeira iteração, até mesmo conteúdo estático
  versionado no código, seguindo o mesmo espírito de
  `docs/CONTRACT_MVP_V1.md` para conteúdo contratual) é aceitável — a
  decisão de "tabela no banco vs. conteúdo estático versionado no
  repositório" fica para a tranche de implementação.
- Mantém o texto/kit já existente em `src/app/parceiro/materiais/page.tsx`
  como conteúdo migrado, não descartado.

## 12. SST da Carteira (PPV2-06)

### 12.1 Escopo da primeira versão (fixado pela decisão de produto aprovada)

- Status/vigência de PGR — vigência sujeita à regra fixa da Seção 12.2.
- Status/vigência de PCMSO — vigência sujeita à regra fixa da Seção 12.2.
- Status/vigência de LTCAT — vigência sujeita à regra fixa da Seção 12.2.
- Visão agregada dos eventos S-2210, S-2220 e S-2240 (contagem/estado por
  empresa, não o conteúdo do evento).
- Pendências operacionais apropriadas (ex.: "PGR em elaboração há mais
  tempo que o esperado" — fica a critério da tranche de implementação
  definir o que conta como "apropriada", desde que nunca exponha dado
  clínico).

### 12.2 Fonte de dado real e regra fixa de vigência (não inventar/aproximar)

- PGR/PCMSO/LTCAT: `ImplantacaoChecklist` (`pgrStatus`, `pcmsoStatus`,
  `ltcatStatus` — este último nullable quando `ltcatAddon=false`,
  `prisma/schema.prisma:196-233`). **Não existe hoje campo de vigência
  associado a esses status** — apenas `pending | in_progress | done` e
  datas de conclusão (`pgrConcluidoEm`, etc.).
- **Regra fixa, não sujeita a decisão de implementação:**
  - status (`pending | in_progress | done`, traduzido conforme a Seção 8)
    pode sempre ser exibido — é dado real já existente;
  - data de conclusão/última atualização (ex. `pgrConcluidoEm`) pode ser
    exibida quando existir — também é dado real já existente;
  - **"vigente até DD/MM/AAAA" só pode ser exibido quando existir uma
    fonte específica, confiável e validada para aquela data** (ex.: um
    campo de vigência introduzido e documentado especificamente para
    esse fim, com regra de negócio própria sobre como calculá-lo);
  - **é proibido derivar uma data de validade a partir apenas de**
    `pgrConcluidoEm` (ou equivalente), da data de upload do `Document`,
    ou de uma constante genérica (ex. "PGR vale por 2 anos") sem uma
    decisão de produto e documentação específica que aprove exatamente
    essa regra de cálculo;
  - se a implementação de PPV2-06 chegar ao ponto de não ter essa fonte
    confiável disponível, o comportamento correto é **mostrar status +
    data conhecida (conclusão/última atualização) e não mostrar nenhuma
    data de validade/vigência** — nunca inventar ou aproximar uma.
- Eventos eSocial: `EsocialLog` (`tipoEvento`: `S-2210 | S-2220 | S-2240`,
  `status`: `pending | enviado | confirmado | erro`,
  `prisma/schema.prisma:236-254`), filtrado por `companyId`.

### 12.3 Exclusão explícita nesta versão

- **Nenhum download de documento.** A tela mostra status agregado, nunca um
  link/botão para baixar PGR, PCMSO, LTCAT, OS/EPI ou qualquer arquivo.
- Downloads/recibos/documentos ficam para tranche posterior (PPV2-07),
  **depois** de validado o modelo de autorização e o isolamento entre
  parceiros — nunca antes.
- Nenhum dado de `Worker` (nome, cargo, data de nascimento/admissão) é
  exibido nesta tela.
- Nenhum dado de `Payment`/Asaas é exibido nesta tela — está fora do
  propósito de "SST da Carteira", que é técnico/operacional, não
  financeiro.

## 13. Modelo conceitual de autorização (PPV2-05)

### 13.1 Partner type (classificação própria, distinta de `tier`)

- Introduzir um campo de classificação de tipo de parceiro (nome exato do
  campo/enum é decisão de implementação — ex. `partnerType` ou
  `profile`), com pelo menos dois valores: parceiro comum (padrão) e
  parceiro contador.
- **Não reutilizar `Partner.tier`** (`comum | recorrente | estratégico`)
  para representar isso — `tier` mede volume/relação comercial; o novo
  campo mede o tipo de atuação do parceiro. Os dois eixos são
  independentes: um parceiro `tier=comum` pode ser contador, e um parceiro
  `tier=estratégico` pode não ser.
- O mecanismo exato de classificação/validação (quem define, em que
  momento, se há autoclassificação pelo próprio parceiro ou só ação
  administrativa) **não está fechado por esta especificação** — é decisão
  técnica a ser definida no início da tranche PPV2-05, respeitando os
  requisitos fixos abaixo.
- **Requisitos fixos, não sujeitos a decisão de implementação:**
  - não reutilizar `Partner.tier` para representar o tipo de parceiro;
  - a classificação como contador, isoladamente, **nunca** concede acesso
    técnico a nenhuma `Company` — ela só habilita o Partner a existir como
    candidato aos dois gates da Seção 13.2, nunca substitui nenhum dos
    dois;
  - acesso técnico continua dependendo, sempre, da autorização explícita e
    ativa do cliente (gate 2 da Seção 13.2), além do vínculo comercial
    (gate 1) — a classificação de tipo não altera isso.

### 13.2 Autorização de acesso técnico por Company — MVP exige dois gates cumulativos

**No MVP, acesso a dado técnico de uma `Company` por um Partner contador
exige, ao mesmo tempo, os dois gates abaixo — nenhum dos dois, isoladamente,
é suficiente:**

1. **Vínculo comercial compatível:** esse Partner é o indicador já vinculado
   àquela `Company` (`Company.partnerId` aponta para ele) — o mesmo vínculo
   que já rege comissão hoje.
2. **Autorização explícita e ativa:** o cliente daquela `Company`, logado no
   Portal do Cliente, concedeu explicitamente acesso técnico a esse mesmo
   Partner.

`Company.partnerId`, sozinho, **nunca** concede acesso técnico — continua
significando exclusivamente vínculo de indicação/comissão (Seção 3). E uma
autorização do cliente, sozinha, também não basta se o Partner autorizado
não for o vínculo comercial já existente daquela `Company`. **Neste MVP, o
cliente não pode autorizar livremente um Partner contador que não seja o
parceiro comercial já vinculado à sua `Company`** — a interface de
concessão do Portal do Cliente (Seção 13.3) deve restringir a escolha ao
Partner já vinculado, não oferecer uma lista aberta de contadores.

Um modelo mais amplo — cliente autorizando qualquer Partner contador,
independente de vínculo comercial prévio — é uma **evolução futura
possível, não aprovada por esta especificação** e não faz parte do MVP
desta frente (ver Seção 19).

Demais regras da entidade de autorização:

- Escopo(s) explícitos: nesta primeira versão, o único escopo necessário é
  "ver status/vigência agregados de SST" — não há escopo de download nesta
  versão, porque download não existe ainda.
- **Concedida exclusivamente pelo cliente logado no Portal do Cliente** —
  nunca pelo Admin em nome do cliente, nunca inferida automaticamente a
  partir de `Company.partnerId` ou de qualquer outro dado já existente (o
  vínculo comercial é pré-condição de elegibilidade para a concessão
  aparecer como opção, não uma concessão em si).
- **Revogável** a qualquer momento, pelo mesmo cliente que concedeu — a
  revogação deve ter efeito imediato (a próxima consulta do contador àquela
  `Company` já não retorna dado nenhum).
- Se o vínculo comercial mudar (ex.: `Company.partnerId` for alterado por
  algum motivo administrativo) de forma que o Partner autorizado deixe de
  ser o indicador vinculado, o acesso deixa de existir automaticamente pelo
  gate 1 — mesmo que a autorização em si não tenha sido revogada
  explicitamente. Esse comportamento fail-closed é intencional.
- Fail-closed: ausência de qualquer um dos dois gates para o par
  `(partner, company)` significa acesso negado — nunca acesso permitido por
  omissão de verificação de qualquer um dos dois.
- Auditoria: toda concessão e toda revogação deve ficar registrada (quem
  concedeu, quando, o que foi concedido/revogado) — mesmo espírito já usado
  em `DocumentAccessLog` para auditoria de acesso a documento, mas para o
  evento de autorização em si, não para o acesso ao dado técnico agregado
  (logar cada consulta de status agregado é decisão de implementação, não
  requisito de aceite mínimo desta versão).

### 13.3 Onde o cliente concede a autorização

- A interface de concessão vive no **Portal do Cliente**, não no Portal do
  Parceiro — o parceiro/contador nunca pode se autoconceder acesso, nem
  solicitar de um jeito que pareça uma concessão automática.
- Nesta versão, a tela do Portal do Cliente só pode oferecer a concessão
  para o Partner que já é o vínculo comercial daquela `Company` (gate 1 da
  Seção 13.2) — nunca uma lista aberta de qualquer Partner contador
  cadastrado no sistema.
- Especificação detalhada da tela do Portal do Cliente para conceder/
  revogar (ex.: "Dar acesso ao meu contador") é **fora do escopo desta
  especificação do Portal do Parceiro** — deve ser tratada como
  especificação companion antes ou durante a implementação de PPV2-05,
  porque PPV2-05 não se completa sem ela.

## 14. Privacidade / minimização de dados

- Nunca disponibilizar, em nenhuma tela do Portal do Parceiro, em nenhuma
  versão presente ou futura desta especificação: prontuário, CID,
  diagnóstico, resultado de exame ou qualquer dado médico individualizado.
  Esta restrição é permanente e não é revista por nenhuma tranche futura
  sem uma decisão de produto e jurídica explícita e separada.
- Minimização já vigente no dashboard atual (sem CNPJ do lead, sem Worker,
  sem onboarding, sem documentos, sem `checkoutUrl`/`invoiceUrl`, sem IDs
  Asaas — `src/app/api/partner/dashboard/route.ts`) é o piso, não o teto:
  toda tela nova desta especificação segue o mesmo princípio por padrão,
  e qualquer exceção precisa de justificativa explícita registrada na
  tranche que a implementar.
- "SST da Carteira" nunca expõe CNPJ completo do cliente ao contador nesta
  versão (mesma regra já vigente para o dashboard geral) — o contador
  identifica a empresa pelo nome, igual ao parceiro comum hoje.
- Isolamento entre parceiros: toda consulta de qualquer tela nova segue o
  mesmo padrão já vigente — filtrada exclusivamente pelo `Partner`
  autenticado na sessão (`getPartnerSession`,
  `src/lib/partnerAuth.ts`) — e, para "SST da Carteira" especificamente,
  adicionalmente filtrada pela existência de autorização ativa por
  `Company` (Seção 13).

## 15. UX/UI

- Identidade visual B2B profissional, alinhada à identidade Sublime já
  usada no restante do site e do Portal do Parceiro atual — sem visual
  genérico de dashboard de IA (sem gradientes roxo/azul saturados, sem
  ícones de "assistente"/"insights automáticos" fora de contexto).
- Reaproveitar paleta e componentes já em uso: `text-teal`, `bg-teal`,
  `font-display`, cards `bg-white border-gray-200 rounded-[12px]`, badges
  de status com `rounded-full` e cores por semântica (`amber` = atenção,
  `blue` = em andamento, `green` = concluído/positivo, `red` = negativo,
  `orange`/`purple` = neutro informativo) — mesmo vocabulário já visível em
  `LEAD_CLASSIFICATION` e `COMMISSION_STATUS`.
- Nenhuma tranche desta especificação introduz uma biblioteca de
  componentes, design system ou dependência visual nova sem necessidade
  concreta demonstrada.

## 16. Responsividade

- Mobile first: todas as telas novas (Visão Geral, Indicações & Clientes,
  Comissões, Materiais & Campanhas, SST da Carteira, Ajuda) devem ser
  usáveis e legíveis a partir de ~375px de largura, sem scroll horizontal
  fora de tabelas/containers dedicados.
- Tabelas densas (indicações, comissões, SST da Carteira) devem ter uma
  representação alternativa em telas estreitas (cards empilhados ou
  scroll horizontal contido, nunca a página inteira rolando lateralmente) —
  mesmo princípio já seguido implicitamente pelo layout atual
  (`max-w-[900px] mx-auto`).
- Navegação (Seção 5) colapsa para um padrão mobile-friendly (menu
  inferior fixo ou hambúrguer) abaixo do breakpoint em que a barra
  horizontal de seções deixa de caber.

## 17. Accessibility (básica)

- Contraste de texto/fundo em conformidade com WCAG AA para o texto
  principal (o padrão atual de `text-gray-400`/`text-gray-500` sobre fundo
  branco deve ser revisto nas telas novas se não atingir 4.5:1 para texto
  de corpo).
- Todo elemento interativo (botões, links, campos de formulário) deve ser
  alcançável e operável por teclado, com foco visível.
- Rótulos de formulário (ex. "Indicar cliente") associados corretamente aos
  campos (`<label>`/`aria-label`), não apenas placeholder.
- Ícones que carregam significado (ex. `LogOut`, `Copy`, `Check` já usados
  hoje) devem ter texto ou `aria-label` de apoio quando usados sozinhos.
- Esta especificação não exige uma auditoria de acessibilidade formal
  como critério de aceite — exige que nenhuma tela nova regrida abaixo do
  padrão básico acima.

## 18. Loading / empty / error (explícitos em toda tela nova)

Padrão mínimo a repetir em Visão Geral, Indicações & Clientes, Comissões,
Materiais & Campanhas, SST da Carteira:

- **Loading:** estado de carregamento visível (o padrão atual —
  `"Carregando…"` centralizado — é aceitável como piso; pode ser
  substituído por skeleton se a tranche de implementação preferir, sem
  obrigação).
- **Empty:** mensagem específica do contexto (ex.: "Nenhuma indicação
  ainda. Compartilhe seu link para começar." — já existe hoje para leads e
  comissões; replicar o mesmo padrão para Materiais & Campanhas e SST da
  Carteira: "Nenhuma empresa autorizada ainda." para o contador sem
  nenhuma autorização concedida, quando a tela hipoteticamente ainda for
  acessível a ele — mas ver Seção 5: sem autorização nenhuma, o item de
  menu nem aparece, então este empty state só é relevante para um contador
  que perdeu a última autorização ativa).
- **Error:** erro de rede/servidor não pode aparecer como tela em branco
  nem quebrar a aplicação — mensagem amigável com opção de tentar
  novamente, mesmo padrão de resiliência já esperado no restante do
  produto (o dashboard atual hoje só faz `console.error` silencioso no
  catch — as telas novas desta especificação devem melhorar isso,
  mostrando algo ao usuário, não só logar no console).

## 19. MVP versus pós-MVP

**Dentro do MVP desta frente (Portal do Parceiro V2):**

- PPV2-01 (correção da comissão) — pré-requisito técnico, não é "feature"
  do V2 em si, mas bloqueia o restante.
- PPV2-02 (fundação visual/UX — navegação em seções, Visão Geral).
- PPV2-03 (Indicar cliente).
- PPV2-04 (Comissões enriquecidas).
- PPV2-05 (Partner type + modelo de autorização — a infraestrutura, não
  necessariamente toda a superfície de UI de concessão no Portal do
  Cliente, que pode ser especificada e implementada em conjunto ou em
  tranche companion).
- PPV2-06 (SST da Carteira — status read-only, sem download).
- Materiais & Campanhas na versão simples descrita na Seção 11.

**Pós-MVP (explicitamente fora desta rodada):**

- PPV2-07 — documentos/recibos/download autorizado.
- Qualquer forma de CMS de campanhas.
- Painel/visão do contador com foco fiscal/folha (item `E` da Seção 5 de
  `docs/PRODUCT_ROADMAP.md` — `CANDIDATE`, não promovido).
- Impersonation administrativa ("Ver como parceiro") — candidato já
  registrado em `docs/PRODUCT_ROADMAP.md` Seção 5.F, não promovido por
  esta especificação.
- Parceiro Estratégico com benefício diferenciado por volume, White Label,
  Partner pessoa física — todos já registrados como Pós-MVP oficial em
  `docs/MVP_BACKLOG.md`, sem mudança de status por este documento.
- Qualquer notificação automática avançada (push, e-mail transacional novo
  para cada evento de comissão) além do mínimo já mencionado como
  candidato em PPV2-01.

## 20. Critérios de aceite

**PPV2-01:**
- Toda `Commission` com `status='em_carencia'` e `liberadaEm <= now`
  transiciona para `status='liberada'` sem intervenção manual, dentro de
  um ciclo do cron.
- Nenhuma `Commission` `bloqueada` ou `estornada` é tocada pela rotina.
- Transição idempotente e segura contra execução concorrente.
- Nenhuma regressão nas transições já existentes (`liberada`→`paga` no
  admin, `em_carencia`/`liberada`/`bloqueada`→`estornada` no webhook,
  `bloqueada`→`em_carencia` na reversão de disputa).

**PPV2-02:**
- Navegação em seções (Seção 5) implementada e funcional, com "SST da
  Carteira" ausente do menu para parceiro comum.
- Nenhuma regressão visual/funcional nas telas migradas (indicações,
  comissões, materiais) em relação ao comportamento atual, exceto pelas
  mudanças explicitamente descritas nesta especificação.

**PPV2-03:**
- Parceiro logado consegue registrar uma indicação pelo portal sem passar
  pelo link `?ref=CODE`.
- A indicação aparece na lista do próprio parceiro imediatamente.
- First-touch nunca é violado por uma indicação feita pelo portal (uma
  empresa/lead já vinculada a outro parceiro não pode ser "roubada" por
  este fluxo).

**PPV2-04:**
- Calendário de mensalidade 1/12–12/12 por cliente convertido exibido
  corretamente a partir de dado real (depende de PPV2-01 estar concluída
  para ser validável com dado verdadeiro, não só sintético).
- Estados de comissão explicados inline.

**PPV2-05:**
- Partner tem um campo de classificação de tipo, distinto de `tier`,
  persistido e consultável.
- Existe uma forma de conceder e de revogar autorização de um Partner
  contador para uma Company específica, controlada exclusivamente pelo
  cliente logado no Portal do Cliente, e restrita ao Partner que já é o
  vínculo comercial daquela `Company` (gate 1 da Seção 13.2) — a tela não
  oferece nenhum outro Partner contador como opção.
- Uma consulta ao dado técnico de uma Company retorna vazio/negado sempre
  que faltar **qualquer um** dos dois gates da Seção 13.2 (vínculo
  comercial ou autorização ativa) — nunca dado real com só um dos dois
  (fail-closed verificável por teste em ambas as combinações incompletas).
- Revogação tem efeito imediato (nenhum cache/sessão permite acesso após
  revogação).
- Mudança de `Company.partnerId` que desfaça o vínculo com o Partner
  autorizado também encerra o acesso, mesmo sem revogação explícita da
  autorização em si (efeito do gate 1 deixar de ser satisfeito).

**PPV2-06:**
- Contador com pelo menos uma `Company` satisfazendo os dois gates da
  Seção 13.2 simultaneamente vê "SST da Carteira" no menu; sem nenhuma
  `Company` nessa condição, não vê.
- Tela mostra status agregado de PGR/PCMSO/LTCAT e eventos S-2210/S-2220/
  S-2240 apenas das `Company` que atendem aos dois gates — nunca de
  nenhuma outra, mesmo que só um dos dois esteja presente.
- Nenhum link, botão ou rota de download de documento existe nesta tela.
- Nenhum dado de `Worker` ou `Payment` aparece nesta tela.
- Nenhuma data de vigência/validade é exibida sem fonte confiável e
  validada (regra fixa da Seção 12.2) — status e data de conclusão
  sozinhos são aceitáveis; uma vigência inventada ou aproximada não é.

## 21. Não objetivos

- Não implementa, nesta rodada, um modelo de autorização onde o cliente
  possa autorizar livremente qualquer Partner contador independente de
  vínculo comercial — o MVP exige sempre os dois gates cumulativos da
  Seção 13.2. Esse modelo mais amplo é, no máximo, evolução futura
  possível, não aprovada por esta especificação.
- Esta especificação não redesenha o Portal do Cliente, exceto pela
  necessidade pontual de uma tela/ação de concessão-revogação de
  autorização (Seção 13.3), que é especificada em separado.
- Não implementa download de documento pelo Portal do Parceiro em nenhuma
  tranche descrita aqui (PPV2-07 é candidato pós-MVP, não parte do MVP
  desta frente).
- Não altera a regra de negócio de comissão (10% × até 12 mensalidades,
  carência de 30 dias) — só corrige a execução técnica da liberação e
  melhora a apresentação.
- Não implementa Parceiro Estratégico, White Label ou Partner pessoa
  física.
- Não implementa CRM operacional completo no Admin (candidato separado,
  `docs/PRODUCT_ROADMAP.md` Seção 5.B).
- Não resolve nesta tarefa a divergência entre o texto de
  `/termos-parceria` e o gate PJ-only do cadastro (pendência já registrada
  em `docs/MVP_BACKLOG.md`, P1, tratada em tarefa própria).
- Não constitui, por si só, autorização de implementação de nenhuma
  tranche — cada uma segue o protocolo de sessão/branch do `CLAUDE.md`.

## 22. Dependências

- A ordem de implementação é **estritamente sequencial** (ver Seção 24) —
  nenhuma tranche desta especificação começa antes de a tranche anterior
  estar concluída, revisada, publicada e validada conforme seu próprio
  gate. Não há construção em paralelo entre tranches, mesmo quando o
  trabalho parece independente (ex.: PPV2-02 é majoritariamente UI, mas
  ainda assim só começa depois de PPV2-01 fechada).
- PPV2-02 a PPV2-04 dependem de PPV2-01 estar concluída e validada para
  que o dado de comissão mostrado seja real — o critério de aceite de
  "liberadas"/"pagas" refletindo a realidade só se completa depois de
  PPV2-01.
- PPV2-06 depende de PPV2-05 (Partner type + autorização) estar concluída
  — não há "SST da Carteira" sem saber quem é contador e sem saber quais
  `Company` foram autorizadas.
- PPV2-07 (pós-MVP) depende de PPV2-05 e PPV2-06 estarem validadas em
  Produção — a especificação de negócio já fixa essa ordem (Seção 4,
  Decisão de Produto 11 da tarefa de origem).
- A tela de concessão/revogação de autorização no Portal do Cliente
  (mencionada na Seção 13.3) é dependência bloqueante de PPV2-05, mesmo
  não sendo formalmente parte do Portal do Parceiro.

## 23. Riscos

- **Vigência de documentos técnicos não está confirmada no schema atual**
  (Seção 12.2) — "status/vigência de PGR/PCMSO/LTCAT" como decisão de
  produto pressupõe uma noção de vigência que hoje não existe
  estruturalmente em `ImplantacaoChecklist`. Isto não é mais um risco em
  aberto a resolver como a tranche preferir: a regra fixa da Seção 12.2 já
  determina o comportamento — exibir status e data de conclusão sempre que
  existirem, e nunca inventar ou aproximar uma data de vigência sem fonte
  confiável e validada. O risco residual é apenas de escopo/esforço: se a
  Administração quiser "vigente até DD/MM/AAAA" na prática, PPV2-06 pode
  precisar de um campo novo e de uma decisão de produto própria sobre como
  calculá-lo — isso é trabalho adicional a ser dimensionado no início da
  tranche, não uma licença para aproximar silenciosamente enquanto isso não
  existir.
- **Modelo de dados de autorização ainda não existe** (PPV2-05 cria algo do
  zero) — risco de subdimensionar escopos (a especificação hoje só prevê
  um escopo de leitura agregada; se o pós-MVP de download exigir escopos
  mais finos, o modelo de PPV2-05 precisa ter sido desenhado pensando
  nisso, para não exigir uma segunda migration invasiva).
- **PPV2-03 tem uma decisão de modelagem em aberto** (novo `Lead` vs.
  reaproveitar `PartnerReferral`) que pode mudar o esforço de
  implementação e a forma como a indicação se conecta ao funil comercial
  existente — precisa ser resolvida no início da tranche, não durante.
- **Risco operacional de comunicação:** parceiros que hoje já veem
  "Liberadas: R$ 0" (por causa do bug de PPV2-01) podem ter registrado essa
  expectativa como normal — corrigir a liberação pode gerar um salto
  perceptível no valor exibido de uma vez, o que pode gerar dúvida/contato
  de suporte. Não é um risco técnico, mas vale nota operacional para quem
  for comunicar a correção.
- **Autorização revogável em tempo real depende de a consulta de "SST da
  Carteira" nunca cachear resultado além do tempo de vida de uma request**
  — se uma implementação futura introduzir cache, precisa preservar o
  efeito imediato da revogação exigido na Seção 13.2.

## 24. Ordem de implementação

A sequência é **estritamente serial, sem paralelismo entre tranches**: cada
etapa só começa depois que a etapa anterior estiver **concluída, revisada,
publicada (PR mergeada) e validada** conforme o gate próprio dela — nunca
antes, mesmo quando a etapa seguinte parece tecnicamente independente (ex.:
PPV2-02 é majoritariamente UI, mas mesmo assim espera PPV2-01 fechada).
**Uma tranche por tarefa/branch — nunca misturar funcionalidades de mais de
uma tranche na mesma branch.**

1. **PPV2-01** — Correção da liberação automática de comissão. Bloqueia
   tudo que depende de dado de comissão real. Nenhuma outra tranche desta
   frente começa antes de PPV2-01 estar concluída/revisada/publicada/
   validada.
2. **PPV2-02** — Fundação visual/UX (navegação em seções, Visão Geral).
   Só começa depois de PPV2-01 validada — nunca em paralelo.
3. **PPV2-03** — Indicar cliente. Só começa depois de PPV2-02
   concluída/revisada/publicada/validada.
4. **PPV2-04** — Comissões enriquecidas. Só começa depois de PPV2-03
   concluída/revisada/publicada/validada (e, por depender de dado de
   comissão real, só se valida completamente com PPV2-01 já em Produção).
5. **PPV2-05** — Partner type + modelo de autorização (inclui a
   especificação e implementação companion da tela de concessão/revogação
   no Portal do Cliente). Só começa depois de PPV2-04
   concluída/revisada/publicada/validada.
6. **PPV2-06** — SST da Carteira, status read-only. Só começa depois de
   PPV2-05 concluída/revisada/publicada/validada.
7. **PPV2-07** (pós-MVP, candidato — não promovido, não faz parte do ciclo
   atual) — Documentos/recibos/download autorizado. Só poderia começar
   depois de PPV2-05 e PPV2-06 validadas em Produção, e depende de decisão
   de promoção própria, separada desta especificação.

Nenhuma etapa desta ordem está autorizada a avançar sem autorização
explícita da etapa anterior concluída e validada, conforme o protocolo do
`CLAUDE.md` (diagnóstico → implementação → revisão → commit → push → PR →
merge → validação em Produção, com autorização explícita em cada etapa
sensível).
