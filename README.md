# Sublime SST — MVP Digital

Site e funil digital da **Sublime SST**, com destaque para o produto **Sublime Digital**.

> Conformidade em SST de forma simples, segura e digital para pequenas empresas brasileiras.

---

## 📋 Sumário

1. [Visão geral](#visão-geral)
2. [Stack técnica](#stack-técnica)
3. [Instalação local](#instalação-local)
4. [Deploy na Vercel](#deploy-na-vercel)
5. [Variáveis de ambiente](#variáveis-de-ambiente)
6. [Ativar Asaas (pagamentos)](#ativar-asaas)
7. [Ativar Google Sheets](#ativar-google-sheets)
8. [Conectar domínio sublimesst.com](#conectar-domínio)
9. [Banco de dados](#banco-de-dados)
10. [Regras de elegibilidade](#regras-de-elegibilidade)
11. [Páginas e rotas](#páginas-e-rotas)
12. [Área administrativa](#área-administrativa)
13. [Testes](#testes)
14. [Pendências e backlog](#pendências-e-backlog)

---

## Visão geral

O MVP consiste em:

- **Site institucional** com funil de conversão completo
- **Teste de elegibilidade** em 3 etapas com captura de lead antes do resultado
- **Motor de elegibilidade** com regras rígidas (GR1 → lista branca → ≤20 func. → sem riscos críticos)
- **Cadastro complementar** para empresas elegíveis com integração Asaas (mock ativo)
- **Página de parceiros contadores** com formulário + indicação
- **Backoffice admin** com listagem de leads, status, CNAEs e parceiros
- **Catálogo de CNAEs GR1** importado da NR-4

---

## Stack técnica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS |
| ORM | Prisma |
| Banco | PostgreSQL (Supabase recomendado) |
| Pagamentos | Asaas (adapter com mock) |
| Validação | Zod |
| Forms | React Hook Form |
| Deploy | Vercel |

---

## Instalação local

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/sublime-sst.git
cd sublime-sst

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais

# 4. Suba o banco de dados (PostgreSQL local ou Supabase)
# Com Supabase: copie a DATABASE_URL do painel

# 5. Execute as migrações
npx prisma db push

# 6. Popule o catálogo CNAE e planos
npm run db:seed

# 7. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse: http://localhost:3000

**Admin:** http://localhost:3000/admin  
(use qualquer senha com 6+ caracteres no MVP — em produção, configure `ADMIN_SECRET`)

---

## Deploy na Vercel

```bash
# 1. Instale a CLI da Vercel
npm i -g vercel

# 2. Faça login
vercel login

# 3. Deploy
vercel

# 4. Configure as variáveis de ambiente no painel da Vercel:
# https://vercel.com/dashboard → seu projeto → Settings → Environment Variables
# Adicione todas as variáveis do .env.example
```

**Passos no painel da Vercel:**
1. Acesse vercel.com → New Project → importe o repositório
2. Em "Environment Variables", adicione todas as variáveis do `.env.example`
3. Em "Build & Development Settings", o framework já detecta Next.js automaticamente
4. Clique em "Deploy"

---

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `DATABASE_URL` | URL do PostgreSQL / Supabase | ✅ |
| `ADMIN_SECRET` | Senha do admin | ✅ |
| `ASAAS_API_KEY` | Chave da API Asaas | Produção |
| `ASAAS_ENV` | `sandbox` ou `production` | Produção |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | ID da planilha | Opcional |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | JSON da service account | Opcional |
| `NEXT_PUBLIC_GA4_ID` | ID do Google Analytics 4 | Opcional |
| `SMTP_*` | Configurações de e-mail | Opcional |

---

## Ativar Asaas

1. Acesse https://www.asaas.com e crie uma conta
2. No painel Asaas: **Configurações → Integrações → API**
3. Gere uma chave de API (sandbox para testes, production para produção)
4. No `.env.local`:
   ```
   ASAAS_API_KEY=$aact_SuaChaveAqui
   ASAAS_ENV=sandbox
   ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3
   ```
5. Para produção, mude para:
   ```
   ASAAS_ENV=production
   ASAAS_BASE_URL=https://api.asaas.com/v3
   ```
6. Configure o Webhook no painel Asaas apontando para:
   `https://sublimesst.com/api/payments/webhook`

---

## Ativar Google Sheets

1. Acesse https://console.cloud.google.com
2. Crie um projeto → Ative a API "Google Sheets API"
3. Crie uma **Service Account** → gere a chave JSON
4. Crie uma planilha no Google Sheets
5. Compartilhe a planilha com o e-mail da service account (papel: Editor)
6. No `.env.local`:
   ```
   GOOGLE_SHEETS_SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
   GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
   ```

---

## Conectar domínio

**Na Vercel:**
1. Painel do projeto → Settings → Domains
2. Adicione `sublimesst.com` e `www.sublimesst.com`
3. Copie os registros DNS exibidos

**No seu registrador de domínio (ex: Registro.br, GoDaddy):**
1. Adicione registro **A** apontando para o IP da Vercel
2. Adicione registro **CNAME** `www` → `cname.vercel-dns.com`
3. Aguarde propagação (até 48h)

---

## Banco de dados

### Entidades principais

| Tabela | Descrição |
|--------|-----------|
| `leads` | Dados de contato capturados antes do resultado |
| `eligibility_assessments` | Resultados do teste de elegibilidade |
| `companies` | Empresas que completaram o cadastro |
| `plans` | Planos disponíveis (1-5, 6-10, 11-20 func.) |
| `cnae_catalog` | Catálogo de CNAEs GR1 da NR-4 |
| `partners` | Parceiros contadores cadastrados |
| `partner_referrals` | Indicações feitas por parceiros |
| `payments` | Pagamentos via Asaas |
| `contact_requests` | Solicitações de contato |

### Comandos úteis

```bash
npx prisma studio          # Interface visual do banco
npx prisma db push         # Sincronizar schema sem migração
npx prisma migrate dev     # Criar migração
npm run db:seed            # Popular catálogo CNAE e planos
```

---

## Regras de elegibilidade

```
CNAE informado pelo usuário
        ↓
① CNAE está no catálogo GR1 da NR-4?
        ↓ NÃO → Backoffice (CNAE_NAO_GR1)
        ↓ SIM
② CNAE aprovado na lista branca interna?
   (online_catalog_status = 'approved')
        ↓ NÃO → Backoffice (CNAE_PENDENTE_VALIDACAO_RT ou CNAE_BLOQUEADO)
        ↓ SIM
③ Até 20 funcionários?
        ↓ NÃO → Backoffice (MAIS_DE_20_FUNCIONARIOS)
        ↓ SIM
④ Todas as respostas críticas = NÃO?
   (máquinas, químicos, altura, externas)
        ↓ ALGUM SIM → Backoffice (motivo específico)
        ↓ TODOS NÃO
        ✅ ELEGÍVEL → Modelo online aprovado
```

**Importante:**
- Lead é capturado **antes** do resultado ser exibido
- Resultado negativo nunca usa palavras como "reprovado", "inapto" ou "rejeitado"
- Todos os dados são salvos independentemente do resultado
- Motivos de encaminhamento ao backoffice são registrados

---

## Páginas e rotas

| Rota | Descrição |
|------|-----------|
| `/` | Home institucional com funil |
| `/digital` | Landing page do Sublime Digital |
| `/elegibilidade` | Teste de elegibilidade (3 etapas) |
| `/cadastro` | Cadastro complementar para elegíveis |
| `/parceiros` | Programa de parceiros contadores |
| `/integrations` | Integrações futuras |
| `/privacidade` | Política de privacidade (provisória) |
| `/termos` | Termos de uso (provisórios) |
| `/admin` | Dashboard administrativo |
| `/admin/leads` | Gestão de leads |
| `/admin/partners` | Gestão de parceiros |
| `/admin/cnae` | Gestão do catálogo CNAE |

**API Routes:**

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/eligibility` | POST | Avaliação de elegibilidade |
| `/api/leads` | POST/GET | Captura e listagem de leads |
| `/api/leads/register` | POST | Cadastro de empresa elegível |
| `/api/partners` | POST/GET | Parceiros |
| `/api/cnae` | GET | Busca de CNAEs |

---

## Área administrativa

Acesse: `/admin`

**Senha MVP:** qualquer senha com 6+ caracteres (configure `ADMIN_SECRET` para produção)

Funcionalidades disponíveis:
- ✅ Dashboard com estatísticas
- ✅ Listagem de leads com busca e filtro por status
- ✅ Painel de detalhes do lead com motivos de encaminhamento
- ✅ Exportação CSV de leads e parceiros
- ✅ Gestão do catálogo CNAE (aprovar/bloquear)
- ✅ Listagem de parceiros e indicações
- ✅ Botão de contato rápido via WhatsApp

---

## Testes

```bash
npm run test
```

Casos de teste implementados (`src/lib/eligibility.test.ts`):

1. ✅ GR1 + lista branca + ≤20 func. + respostas negativas → **aprovado**
2. ✅ Mais de 20 funcionários → **backoffice**
3. ✅ Qualquer resposta crítica "Sim" → **backoffice**
4. ✅ CNAE não GR1 → **backoffice**
5. ✅ CNAE GR1 pendente de validação → **backoffice**
6. ✅ CNAE GR1 bloqueado → **backoffice**

---

## Pendências e backlog

### 🔴 Antes de publicar (obrigatório)

- [ ] Revisão jurídica da Política de Privacidade
- [ ] Revisão jurídica dos Termos de Uso
- [ ] Configurar `ADMIN_SECRET` forte em produção
- [ ] Configurar `DATABASE_URL` em produção (Supabase)
- [ ] Remover flag de mock do Asaas e inserir credenciais reais
- [ ] Adicionar favicon e OG image reais

### 🟡 Próximas versões (backlog)

- [ ] Portal completo do cliente
- [ ] Painel completo do parceiro com histórico de indicações
- [ ] Geração automática de documentos (PCMSO, PGR)
- [ ] Integração com eSocial
- [ ] Cobrança recorrente mensal via Asaas
- [ ] Regras de comissão automatizadas para parceiros
- [ ] White label
- [ ] API pública completa
- [ ] Notificações por e-mail (SMTP)
- [ ] Webhook Asaas para atualização de status de pagamento
- [ ] Exportação automática para Google Sheets
- [ ] Integração com CRM (HubSpot / RD Station)
- [ ] Marketplace de clínicas de saúde ocupacional
- [ ] Múltiplos níveis de acesso no admin

---

## Contato

**Sublime SST — Segurança e Saúde Ocupacional**

- 📱 WhatsApp: [(21) 99724-8630](https://wa.me/5521997248630)
- ✉️ E-mail: contato@sublimesst.com
- 🌐 Site: [sublimesst.com](https://sublimesst.com)
