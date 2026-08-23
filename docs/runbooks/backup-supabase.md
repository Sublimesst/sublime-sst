# Runbook — Backup e Restore do Supabase (Sublime SST)

> Documento operacional. Não é uma automação — é um guia para seguir manualmente
> no painel do Supabase. Nenhum passo aqui apaga, sobrescreve ou altera dados de
> produção; qualquer comando de restore real só deve ser executado depois de
> uma decisão consciente, fora deste documento.

## Objetivo

Deixar registrado o procedimento operacional de backup/restore do banco de
produção (Supabase Postgres) e o critério mínimo aceito para o estágio atual
do MVP.

**Decisão vigente (`docs/DECISIONS.md`, 2026-08-22):** backup automático pago
do Supabase e Point-in-Time Recovery (PITR) **não são pré-condição para
vender ao primeiro cliente**. O mínimo operacional aceito neste estágio é o
backup lógico manual já utilizado/validado no projeto (mesmo método usado nas
tranches de limpeza de dados e nas validações de schema em Produção — ver
`docs/PROJECT_STATE.md`): `pg_dump` em formato custom, checksum conferido,
listagem via `pg_restore --list` validada, executado manualmente antes de
qualquer operação de risco em Produção. Automação de backup, maior retenção
e/ou solução paga (incluindo PITR) ficam para reavaliação pós-MVP — ver
"Pós-MVP / gatilho de reavaliação" abaixo.

## Escopo

Cobre o banco Postgres do projeto Supabase usado em produção (`DATABASE_URL` em
`.env.local`/Vercel, host `aws-1-sa-east-1.pooler.supabase.com`, região
**sa-east-1 / São Paulo**). Cobre também os bytes de documentos hoje guardados
dentro desse mesmo banco (tabela `storage_objects_db`, ver seção de Dados
Críticos). **Não cobre** e-mail (Resend), pagamentos (Asaas) ou qualquer dado
que viva fora do Postgres — esses têm suas próprias fontes de verdade nos
respectivos painéis.

## Dados críticos

Todas as tabelas abaixo estão em `prisma/schema.prisma`. Nenhuma foi alterada
para gerar este documento.

| Tabela (`@@map`) | Model Prisma | Por que é crítica |
|---|---|---|
| `companies` | `Company` | Cadastro completo do cliente: CNPJ, contrato aceito (`contractHash`), status do pipeline, IDs da Asaas (`asaasCustomerId`/`asaasSubscriptionId`). Perda = perde a relação contratual inteira. |
| `leads` | `Lead` | Todo o funil de captação (pré-cliente). |
| `eligibility_assessments` | `EligibilityAssessment` | Prova de que o cliente foi avaliado e é elegível — relevante para defesa jurídica/técnica. |
| `payments` | `Payment` | **Dado financeiro.** Cobranças de implantação e mensalidade, `asaasId`, valores em centavos. |
| `commissions` | `Commission` | **Dado financeiro.** Base de cálculo do que se deve pagar a cada parceiro. |
| `partners` | `Partner` | Dados cadastrais dos parceiros (CNPJ, e-mail, aceite do Termo de Parceria). |
| `partner_referrals` | `PartnerReferral` | Indicações manuais de parceiros — perda = perde histórico de indicação/comissão futura. |
| `documents` | `Document` | Metadados dos documentos entregues ao cliente (PGR, PCMSO etc.) — referencia `storage_objects_db`. |
| `storage_objects_db` | `DbStorageObject` | **Contém os BYTES reais dos documentos** (provider interino "db", ver `src/lib/storage/dbProvider.ts`). Se essa tabela for perdida, os arquivos entregues aos clientes somem — mesmo que o metadado em `documents` sobreviva. |
| `document_access_logs` | `DocumentAccessLog` | **Log de auditoria LGPD** — comprova quem acessou/baixou o quê e quando. |
| `cancellation_requests` | `CancellationRequest` | Trilha de pedidos de cancelamento (motivo, valores, responsável). |
| `client_sessions` | `ClientSession` | Sessões de magic link do portal do cliente (dado efêmero — baixo impacto se perdido, só força novo login). |
| `partner_sessions` | `PartnerSession` | Idem, para parceiros. |
| `onboarding_data` | `OnboardingData` | Dados operacionais preenchidos pelo cliente no onboarding (PCMSO anterior, PGR prévio etc.). |
| `implantacao_checklist` | `ImplantacaoChecklist` | Progresso da implantação (PGR/PCMSO/OS+EPI/LTCAT) — perda atrasa operação, não é dado do cliente final. |
| `esocial_logs` | `EsocialLog` | Log de envios ao eSocial — relevante para compliance. |
| `cnae_catalog` | `CnaeCatalog` | Catálogo de CNAEs GR1 — hoje a fonte real é o JSON (`src/lib/cnae_catalog.json`), essa tabela é auxiliar/legado (ver nota abaixo). |
| `plans` | `Plan` | Planos e preços — fonte real é `src/lib/pricing.ts`; tabela é auxiliar. |
| `contact_requests` | `ContactRequest` | Solicitações de contato — baixo volume, baixo risco. |

**Resumo por categoria pedida:**
- **Dados financeiros:** `payments`, `commissions`
- **Dados de clientes:** `companies`, `leads`, `eligibility_assessments`, `onboarding_data`
- **Documentos:** `documents` (metadado) + `storage_objects_db` (bytes reais)
- **Logs de acesso:** `document_access_logs`
- **Cobranças:** `payments` (campo `asaasId`, `type='implantacao'|'mensalidade'`)
- **Comissões:** `commissions`
- **Cancelamentos:** `cancellation_requests`
- **Sessões (não são "dados de negócio", mas fazem parte do banco):** `client_sessions`, `partner_sessions`

## Riscos

- **Documentos vivem dentro do próprio Postgres** (`storage_objects_db`, bytes em `Bytes`). Isso significa que um backup de banco que cubra essa tabela já cobre os documentos — mas também significa que o banco de produção é hoje o único lugar onde eles existem. Não há cópia redundante em um object storage separado.
- Hoje **não há confirmação registrada** de que o backup automático do Supabase está ativo, nem da retenção configurada, nem de que o plano atual (Free ou superior) oferece o recurso — nenhuma capacidade do plano Free deve ser presumida sem checar o painel. Por decisão de 2026-08-22 (`docs/DECISIONS.md`), isso deixou de bloquear o MVP: o backup lógico manual é o mínimo aceito enquanto essa confirmação não existir.
- Point-in-Time Recovery (PITR) normalmente é recurso pago/plano superior no Supabase — precisa ser confirmado no painel, não pode ser assumido, e não é requisito do MVP (ver "Pós-MVP / gatilho de reavaliação" abaixo).
- Um restore mal feito (restaurar por cima do banco de produção, ou apontar a aplicação para o banco errado) é uma operação destrutiva grave — por isso este runbook **exige testar restore só em projeto separado**, nunca em produção.

## Checklist de configuração Supabase

Faça isso **só de leitura** — nenhum destes passos altera dados, é conferência de configuração.

1. **Confirmar o projeto/região corretos**
   - Entre em [supabase.com/dashboard](https://supabase.com/dashboard)
   - Confirme que o projeto aberto corresponde ao host do `DATABASE_URL` de produção (`aws-1-sa-east-1.pooler.supabase.com` → projeto na região **South America (São Paulo)**)
   - **Anote/print:** nome do projeto, referência do projeto (aparece na URL do dashboard, ex. `qilwlosflxjfdticoamg`), região exibida em Project Settings → General

2. **Verificar backups automáticos**
   - Menu lateral → **Database** → **Backups**
   - Veja se existe uma lista de backups diários já acontecendo (data/hora do mais recente)
   - **Anote/print:** se há backups listados, data do mais recente, e se a tela menciona o plano atual (Free/Pro/Team) — frequência, retenção e disponibilidade de PITR variam por plano e não devem ser presumidas; confirmar diretamente na tela o que o plano atual oferece

3. **Verificar retenção**
   - Na mesma tela de **Backups**, veja quantos dias/quantos backups ficam disponíveis para restore
   - **Anote/print:** número de dias de retenção mostrado

4. **Verificar se PITR está disponível/ativo**
   - Ainda em **Database → Backups**, procure a seção "Point in Time Recovery"
   - Se aparecer como recurso bloqueado/grayed out, é sinal de que exige upgrade de plano
   - **Anote/print:** se PITR está disponível, ativo, ou bloqueado por plano

5. **Confirmar quem tem acesso ao painel**
   - **Project Settings → Team** (ou **Organization → Members**)
   - **Anote/print:** lista de membros com acesso e o papel de cada um (Owner/Admin/Developer)

Não é necessário fazer nada além de olhar e registrar essas 5 telas.

## Plano mínimo do MVP atual

**MVP atual (mínimo aceito, sem contratação de recurso pago novo):**

- **Estratégia:** backup lógico manual (`pg_dump` formato custom) executado
  como procedimento operacional conhecido antes de qualquer operação de
  risco em Produção (rollout de schema, tranche de limpeza de dados,
  migration) — mesmo método já usado e validado nas tranches anteriores (ver
  `docs/PROJECT_STATE.md`), com checksum conferido e listagem via
  `pg_restore --list` validada.
- **Backup automático do Supabase e sua frequência/retenção:** não
  confirmados neste documento — disponibilidade, frequência e retenção não
  devem ser presumidas para o plano atual sem checar o painel (ver
  "Checklist de configuração Supabase" acima). Verificação só é necessária
  quando houver necessidade operacional concreta de confirmar o mecanismo;
  não é pré-condição para o primeiro cliente.
- **PITR:** não é requisito do MVP — ver "Pós-MVP / gatilho de reavaliação"
  abaixo.
- **Documentos em `storage_objects_db`:** como os bytes moram no mesmo
  Postgres, eles já estão cobertos pelo mesmo backup lógico manual do banco —
  não é necessário nenhum backup separado enquanto esse provider estiver em
  uso. É importante só ter clareza de que restaurar o banco também restaura
  (ou perde) os documentos junto.
- **Se migrar para Supabase Storage no futuro:** nesse dia, o backup de banco
  **deixa de cobrir os arquivos automaticamente** — Supabase Storage é um
  serviço separado do Postgres, com sua própria política de backup/retenção
  (hoje o Supabase não replica automaticamente Storage do mesmo jeito que
  Postgres). Neste runbook fica registrado: **quando `src/lib/storage/index.ts`
  trocar de `DbStorageProvider` para um provider de Supabase Storage, este
  documento precisa ser revisado** para incluir backup do bucket
  separadamente.
- **Quem deve ter acesso ao painel Supabase:** o mínimo de pessoas possível
  com papel de **Owner/Admin** — idealmente as sócias e/ou quem for
  responsável técnico. Acesso de leitura (se o Supabase permitir um papel
  mais restrito) para qualquer pessoa adicional que precise só consultar.
- **Cuidados com LGPD:** o banco contém dados pessoais de clientes
  (CPF/CNPJ, e-mail, WhatsApp) e, potencialmente, dados sensíveis via
  documentos de PCMSO. Backups (automáticos ou manuais) são cópias desses
  mesmos dados pessoais — precisam do mesmo cuidado de acesso restrito que o
  banco de produção. Evitar exportar backups para fora do painel Supabase ou
  do ambiente controlado (ex.: baixar dump para laptop pessoal) sem
  necessidade — se for preciso, criptografar e apagar depois do uso.

**Pós-MVP / gatilho de reavaliação:** automação de backup, maior retenção
paga e/ou PITR devem ser reavaliados quando houver:

- crescimento relevante do número de clientes;
- aumento do impacto financeiro de uma eventual perda de dados;
- receita recorrente suficiente para custear o plano pago;
- necessidade operacional real de menor RPO/RTO (recuperação mais rápida ou
  mais recente do que o backup manual permite).

Nenhuma dessas condições está confirmada como atendida nesta tarefa
documental — a reavaliação é responsabilidade de tarefa futura própria,
conforme `docs/DECISIONS.md` (2026-08-22).

## Procedimento de restore em ambiente separado

**Importante: nunca restaurar por cima do projeto de produção.** Este procedimento cria um projeto novo e descartável só para validar que o backup funciona.

1. Criar um **novo projeto Supabase separado** (ex.: `sublime-sst-restore-test`), mesma região (sa-east-1) — confirmar no painel se o plano a ser usado no projeto de teste é adequado para o volume atual de dados, sem presumir nenhuma capacidade específica
2. No painel do projeto de **produção**, ir em **Database → Backups**, escolher o backup mais recente e verificar no próprio painel se existe a opção de restore **apontando para o projeto novo** (a disponibilidade dessa opção depende do plano atual e não deve ser presumida — confirmar antes de prosseguir; se só permitir restore no próprio projeto de origem, anotar essa limitação como pendência P1, ver seção abaixo)
3. Aguardar o restore terminar (pode levar minutos)
4. Pegar a nova `DATABASE_URL` do projeto de teste (**Project Settings → Database → Connection string**)
5. **Não apontar a aplicação Vercel/produção para essa URL.** Rodar consultas de validação só localmente, com uma cópia separada de `.env.local` que aponte para o projeto de teste (nunca sobrescrever o `.env.local` real)
6. Rodar `npx prisma studio` (ou queries SQL diretas no SQL Editor do Supabase) contra essa `DATABASE_URL` de teste para inspecionar os dados restaurados

## Checklist pós-restore

Depois do restore no projeto de teste, validar:

- [ ] Contagem de linhas em `companies`, `leads`, `payments`, `commissions` bate (aproximadamente) com o que se espera de produção na data do backup
- [ ] Pegar 2-3 `companies` conhecidas e conferir que os campos essenciais vieram certos: `cnpj`, `status`, `asaasCustomerId`, `asaasSubscriptionId`
- [ ] **Integridade Company → Payment → Commission → Document:**
  - Escolher uma `Company` com pagamento confirmado
  - Confirmar que existe `Payment` com `companyId` correto e `status='confirmed'`
  - Se essa empresa tiver parceiro, confirmar que existe `Commission` com `paymentId` apontando para o `Payment` acima
  - Confirmar que existe ao menos um `Document` com `companyId` dessa empresa
- [ ] **Validar `storage_objects_db`:** pegar o `storageKey` de um `Document` (`documents.storageKey`) e confirmar que existe uma linha correspondente em `storage_objects_db.key` com `data` (bytes) não vazio — isso confirma que o arquivo em si (não só o metadado) sobreviveu ao restore
- [ ] Conferir que `document_access_logs` também restaurou (auditoria LGPD não pode sumir)
- [ ] Depois de validado, **apagar o projeto de teste** (Project Settings → General → Delete Project) para não deixar uma cópia extra de dados pessoais rodando indefinidamente

## Frequência de revisão

- Repetir o checklist de configuração (backups ativos, retenção, PITR) **a cada 3 meses**, ou imediatamente após qualquer mudança de plano Supabase
- O teste de restore completo (com projeto separado, via painel do Supabase) não é pré-condição para o primeiro cliente (ver "Decisão vigente" no topo deste documento) — recomenda-se repeti-lo **1x a cada 6 meses**, ou depois de qualquer migração de schema grande, assim que a reavaliação pós-MVP ocorrer

## Pendências / P1

- [ ] Confirmar no painel se o plano atual do Supabase permite restaurar backup para um projeto diferente do de origem (necessário para o procedimento de teste acima ser 100% seguro sem qualquer risco à produção)
- [ ] Avaliar upgrade de plano Supabase se a retenção atual for menor que 7 dias
- [ ] Reavaliar necessidade de PITR quando houver volume real de clientes pagantes
- [ ] Quando migrar de `DbStorageProvider` para Supabase Storage (ou outro provider externo), revisar este runbook para cobrir backup do novo storage separadamente
- [ ] Definir e documentar formalmente quem são os Owners/Admins do projeto Supabase (hoje não registrado em nenhum documento do projeto)
