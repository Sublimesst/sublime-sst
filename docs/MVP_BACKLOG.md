# MVP_BACKLOG.md — Prioridades e critérios de aceite

Consultar no início de sessões com escopo, planejamento ou priorização.
Preços e valores: consultar código de pricing e contrato vigente — não estão neste arquivo.

---

## P0 — Antes de um novo cliente real

### Contrato

- **Estado:** parcialmente concluído
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
- **Pendente:**
  - Snapshot histórico de mensalidade e faixa no PDF (hoje recalculados de `pricing.ts`/dado atual, não de um valor congelado no aceite)
  - Quadro-resumo completo no comprovante (Eixo B)
  - LTCAT adicional e demais adicionais no comprovante (Eixo B)
  - Lógica financeira de cancelamento migrada para a regra de 12 meses aprovada
  - Layout, formatação e paginação do PDF (Eixo D)
  - Validação ponta a ponta do fluxo completo (aceite → pagamento → PDF → e-mail/portal)
- **Critério de aceite:**
  - Conteúdo comercial e operacional alinhado com o produto atual
  - Correspondência verificada com `/termos`
  - Mecanismo de imutabilidade do aceite implementado
  - PDF legível gerado automaticamente
  - Comprovante eletrônico persistido
- **Dependências:** `docs/CONTRACT_MVP_V1.md` (conteúdo já aprovado, aguardando implementação)
- **Bloqueia novo cliente:** sim

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
  mergeada e validada em Produção em 2026-08-11
- **Fora desta tranche (pendente em frente separada):** exportação
  compatível com SOC, backoffice completo — ver seção "Backoffice
  completo" abaixo
- **Bloqueia novo cliente:** sim

### Backoffice completo

- **Estado:** pendente
- **Concluído:**
  - Visualização/listagem read-only dos Workers do onboarding individual
    no detalhe da Company, no Admin — PR #28, validada em Produção em
    2026-08-11
- **Pendente (inclui, sem se limitar a):**
  - Exportação compatível com SOC dos dados de Worker/onboarding
- **Critério de aceite:**
  - Todos os dados fornecidos por clientes e parceiros acessíveis via Admin ou exportação
    compatível com Excel
- **Bloqueia novo cliente:** sim

### Fechamento técnico

- **Estado:** pendente
- **Critério de aceite:**
  - Zero regressões confirmadas
  - Build limpo, TypeScript sem erros novos
  - Backup automático do Supabase configurado
  - Smoke test do fluxo completo executado
- **Bloqueia novo cliente:** sim

---

## P1 — Antes da abertura pública

- Portal reconhece status `in_production` e exibe conteúdo correspondente
  — **Estado:** pendente · Bloqueia abertura pública: sim

- Redirecionamento pós-checkout para usuário do Portal
  — **Estado:** pendente · Bloqueia abertura pública: sim

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
- Área logada do parceiro (login, painel de indicados, extrato de comissões)
- White label para parceiros — requer volume mínimo de clientes validado
- Melhorias de UX não bloqueadoras
