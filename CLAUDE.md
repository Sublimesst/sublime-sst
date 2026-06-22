# CLAUDE.md — Sublime SST

Arquivo de contexto do projeto. Atualizar ao fim de cada sessão significativa.
Lido automaticamente pelo Claude Code; no chat.claude.ai, anexe ou cole no início da conversa.

---

## Repositório e deploy

- **Caminho local:** `C:\Users\leona\OneDrive\Documentos\sublime-sst`
- **GitHub:** `Sublimesst/sublime-sst` — branch `main`
- **Deploy:** Vercel (automático a cada push no main)
- **Site:** https://www.sublimesst.com
- ⚠️ A pasta `sublime-sst-corrigido` na Área de Trabalho é uma cópia antiga sem git — não usar

---

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma v5 · Supabase (PostgreSQL) · Vercel · Resend (e-mail)

---

## Regras imutáveis do negócio

- **Sublime SST** = marca ampla, não limitada a PME; oferece consultoria sob medida para qualquer nível de complexidade
- **Sublime Digital** = produto específico: digital, padronizado e econômico, exclusivo para empresas elegíveis de risco muito baixo
- Critérios do Sublime Digital: até 20 funcionários · CNAEs aprovados · perfil operacional compatível · sem riscos críticos no teste
- **Preços fixos:** 1–5 func = R$ 142/mês · 6–10 = R$ 250/mês · 11–20 = R$ 430/mês · Implantação = R$ 190 (ou R$ 100 em promoção de 24h)
- Sempre oferecer dois caminhos: teste digital **ou** orçamento personalizado
- Nunca afirmar obrigatoriedade universal — usar "conforme aplicabilidade" ou "após análise do perfil"
- Não alterar os 122 CNAEs do catálogo nem os 17 aprovados sem validação humana
- Não automatizar contratação sem aprovação humana
- Não publicar segredos nem inventar dados jurídicos

---

## Banco de dados

- Supabase PostgreSQL — pooler `aws-1-sa-east-1.pooler.supabase.com:5432`
- `.env.local` existe no repositório com `DATABASE_URL` (não commitado — está no `.gitignore`)
- **Para rodar Prisma localmente:**
  ```powershell
  $env:DATABASE_URL = (Get-Content .env.local | Select-String "^DATABASE_URL=" | ForEach-Object { $_ -replace '^DATABASE_URL="(.+)"$','$1' })
  node_modules\.bin\prisma db push
  ```
- Seed executado: 122 CNAEs · 17 aprovados · 3 planos
- RLS habilitado: 11 tabelas protegidas no Supabase

---

## Variáveis de ambiente na Vercel

| Variável | Finalidade |
|---|---|
| `DATABASE_URL` | Supabase — senha com caracteres especiais codificados (`%2B`, `%40`, `%25`) |
| `RESEND_API_KEY` | Envio de e-mails (domínio sublimesst.com verificado) |
| `ADMIN_SECRET` | Acesso ao painel `/admin` |
| `CRON_SECRET` | Autenticação dos cron jobs da Vercel |
| `ASAAS_API_KEY` | Pagamentos (sandbox ou produção) |
| `ASAAS_WEBHOOK_TOKEN` | Validação do webhook de pagamento |
| `NEXT_PUBLIC_GA4_ID` | Google Analytics 4 — ID: G-Q3YPSB9D8Y |
| `NEXT_PUBLIC_BASE_URL` | `https://www.sublimesst.com` |
| `NEXT_PUBLIC_WA_NUMBER` | `5521997248630` |

---

## Páginas no ar

| Rota | Descrição |
|---|---|
| `/` | Home — reposicionada com dois caminhos (Digital e Consultoria) |
| `/digital` | Planos, preços e critérios do Sublime Digital |
| `/consultoria-sst` | Formulário de orçamento personalizado |
| `/sobre` | Institucional — dados comprováveis, processo e contatos |
| `/elegibilidade` | Teste em 3 etapas (perfil → CNAE/CNPJ → contato/resultado) |
| `/parceiros` | Cadastro de parceiros contadores |
| `/conteudos` | Hub de conteúdo SST (6 artigos publicados) |
| `/faq` | Perguntas frequentes com FAQPage JSON-LD |
| `/cliente/login` | Portal do cliente — autenticação via magic link |
| `/cliente/dashboard` | Status do processo do cliente |
| `/cliente/onboarding` | Formulário de dados pós-contratação |
| `/admin` | Painel admin (leads, empresas, parceiros, CNAEs) |
| `/sst-para-contadores` | Landing page por nicho |
| `/sst-para-empresas-de-tecnologia` | Landing page por nicho |
| `/sst-para-escritorios` | Landing page por nicho |
| `/privacidade` | Política de privacidade |
| `/termos` | Termos de uso |

---

## Arquitetura — Portal do cliente (Sprint 6)

- Auth via magic link: `POST /api/cliente/auth` gera token (15 min) e envia e-mail
- `GET /api/cliente/auth/verify?token=...` valida token e seta cookie `sublime_client` (30 dias, httpOnly)
- Middleware em `src/middleware.ts` protege `/cliente/dashboard` e `/cliente/onboarding`
- Webhook Asaas em `POST /api/webhooks/asaas` confirma pagamento e dispara e-mail de boas-vindas

## Arquitetura — Automações (Sprint 7)

- `GET /api/cron/remind-onboarding` — lembra clientes com pagamento confirmado mas sem onboarding preenchido
- `GET /api/cron/remind-payment` — lembra clientes com pagamento pendente há 48h+
- Agendados em `vercel.json` para rodar diariamente às 10h e 11h UTC
- Protegidos pelo header `Authorization: Bearer CRON_SECRET`

---

## Sprints concluídos

| Sprint | Tema |
|---|---|
| 0 | Infraestrutura — banco, e-mail, rate limiting, remoção de exposição técnica |
| 1 | Reposicionamento de marca — home, `/consultoria-sst`, `/sobre`, `/digital` |
| 2 | Funil de elegibilidade — 3 etapas, UTM, analytics |
| 3 | Landing pages por nicho — contadores, tecnologia, escritórios |
| 4 | SEO — JSON-LD, robots.txt, sitemap.xml, Open Graph |
| 5 | Conteúdo de autoridade — `/conteudos`, 6 artigos, `/faq` |
| 6 | Portal do cliente — magic link, dashboard, onboarding, webhook Asaas |
| 7 | Painel admin de empresas + crons de lembrete automático |

---

## Tarefas manuais já executadas

- ✅ Supabase RLS habilitado (11 tabelas)
- ✅ Vercel: todas as variáveis de ambiente configuradas
- ✅ Asaas webhook apontando para `sublimesst.com/api/webhooks/asaas`
- ✅ Google Analytics 4 configurado (G-Q3YPSB9D8Y)
- ✅ Google Search Console verificado via GA4

---

## Próximos sprints (dependem de validação comercial)

- **Sprint 8 — White Label:** painel do parceiro, páginas personalizadas — requer 50+ clientes
- **Sprint 9 — Marketplace de Clínicas:** requer 100+ clientes e análise jurídica

---

## Agenda da próxima sessão (prioridade em ordem)

### 1. Refinamento do contrato
- Revisar o modelo gerado (`Contrato_Sublime_Digital_MODELO.docx`) após reunião com sócios
- Ajustar cláusulas conforme decisões tomadas internamente
- Preencher campos em vermelho: CNPJ da Sublime SST, endereço, representante legal, foro

### 2. Estruturação do produto digital
- Definir com clareza o que está **incluído** no Sublime Digital (sem custo adicional)
- Definir o que é **upsell / pago à parte** (ex: PCMSO com médico, LTCAT, visita presencial)
- Definir o que está **fora do escopo** de qualquer plano
- Atualizar a página `/digital` com essa clareza após decisão dos sócios
- Definir prazo típico de implantação para comunicar ao cliente

### 3. Programa de parceria — estruturação completa
- Modelo de remuneração: % mensal (ex: 10%) ou valor fixo — decidir e formalizar
- Periodicidade do pagamento da comissão (mensal? trimestral?)
- Fluxo operacional: como o parceiro indica → como a Sublime registra → como a comissão é calculada e paga
- Backoffice para controle de comissões (tela interna no `/admin`)
- **Área logada para o parceiro indicador:** login, painel de acompanhamento dos indicados, extrato de comissões
- Avaliar se mostrar ou não a remuneração publicamente no site (recomendação: não mostrar para cliente final)

### 4. Área logada do cliente — funcionalidades
- Mapear o que o cliente precisa acessar após contratar:
  - Status do processo de implantação
  - Documentos gerados (PGR, laudos, etc.)
  - Formulário de onboarding / coleta de dados
  - Histórico de pagamentos
  - Canal de comunicação com a equipe
- Definir o que já está construído (portal básico existe) vs. o que precisa ser desenvolvido

---

## Itens P0 do backlog ainda pendentes (requerem ação manual)

- **P0.3 — Jurídico:** revisão humana de `/privacidade` e `/termos`; remover aviso de rascunho/MVP após aprovação
- **P0.4 — Backup Supabase:** configurar política de backup automático no painel do Supabase

---

## Contexto comercial e operacional (atualizado 2026-06-22)

### Estágio atual
- Site no ar mas ainda **não aberto para clientes reais** — sendo usado para posicionamento interno
- Zero leads gerados até o momento
- Sem concorrentes monitorados ativamente

### Bloqueadores para o primeiro cliente
1. Produto não está completamente definido: falta especificar o que está incluído no Sublime Digital, o que é upsell e o que não é coberto
2. Contrato de prestação de serviço ainda não existe
3. Asaas integrado mas não ativado para clientes — aguarda definição do produto e contrato
4. Apenas 17 CNAEs aprovados — muito conservador, reduz demais o público elegível

### Produto (o que se sabe até agora)
- Equipe interna elabora laudos pertinentes (ex: SAC) e envia ao cliente
- PCMSO com médico do trabalho: terceirizado quando necessário, custo de R$ 150 por laudo (repassado ou absorvido — a definir)
- Documentos entregues por e-mail hoje; objetivo futuro: disponibilizar na área logada do cliente
- Prazo de implantação: a ser definido com a equipe interna

### Parceiros
- 2 parceiros contadores ativos (1 solo + 1 pequeno escritório) — sem contrato formal, sem indicações ainda
- Modelo de remuneração discutido informalmente: 1ª mensalidade ou % mensal (ex: 10%) — a formalizar
- Sprint 8 (white label) não é urgente ainda

### CNAEs
- Sócia técnica em SST pode validar e expandir a lista branca além dos 17 atuais
- Todos os CNAEs de baixo risco (GR1) podem ser aprovados após validação dela
- Ação pendente: gerar lista formatada para revisão da sócia

### Preferências técnicas
- Orçamento apertado: preferência por ferramentas gratuitas ou muito baratas
- Stack atual já está dentro desse critério (Supabase free, Vercel free, Resend free, Asaas sem mensalidade)
- Evoluir ferramentas conforme a empresa gerar resultados
