# MVP_BACKLOG.md — Prioridades e critérios de aceite

Consultar no início de sessões com escopo, planejamento ou priorização.
Preços e valores: consultar código de pricing e contrato vigente — não estão neste arquivo.

---

## P0 — Antes de um novo cliente real

### Contrato

- **Estado:** pendente
- **Critério de aceite:**
  - Conteúdo comercial e operacional alinhado com o produto atual
  - Correspondência verificada com `/termos`
  - Mecanismo de imutabilidade do aceite implementado
  - PDF legível gerado automaticamente
  - Comprovante eletrônico persistido
- **Dependências:** definição do escopo do produto Sublime Digital
- **Bloqueia novo cliente:** sim

### Documentos do cliente

- **Estado:** pendente
- **Critério de aceite:**
  - Upload administrativo funcional
  - Isolamento por `Company`
  - Download disponível no Portal do Cliente
  - `DocumentAccessLog` registrado
  - Validação de tipo e tamanho de arquivo
- **Bloqueia novo cliente:** sim

### Backoffice completo

- **Estado:** pendente
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

- Melhorias de UX do upload, mensagens de erro e conveniência operacional
  — **Estado:** pendente

- Revisão comercial, operacional e de coerência de `/privacidade` e `/termos`; remover aviso de rascunho somente após aprovação interna
  — **Estado:** pendente · Dependência: aprovação humana

---

## Pós-MVP

- Revisão formal por advogado (contrato, termos, privacidade)
- Versionamento avançado de documentos
- Exclusão controlada de dados com audit trail
- XLSX avançado com múltiplas abas
- Área logada do parceiro (login, painel de indicados, extrato de comissões)
- White label para parceiros — requer volume mínimo de clientes validado
- Melhorias de UX não bloqueadoras
