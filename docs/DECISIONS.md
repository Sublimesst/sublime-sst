# DECISIONS.md — Decisões aprovadas de produto e governança

Consultar ao tratar regras de negócio, produto ou governança técnica.
Fonte técnica oficial: repositório Git (código e histórico).
Preços e valores: consultar código de pricing e contrato vigente — não estão neste arquivo.

---

## Produto e marca

**Sublime SST é a marca ampla.**
- Status: implantada
- Motivo: posicionamento para qualquer porte e complexidade operacional
- Fonte: home, `/sobre`, `CLAUDE.md`

**Sublime Digital é o produto digital padronizado para perfis elegíveis.**
- Status: implantada
- Motivo: produto de baixo custo para perfis de risco muito baixo
- Fonte: `/digital`, funil de elegibilidade, schema Prisma

**Contratação Digital limitada aos critérios de elegibilidade vigentes.**
- Status: implantada
- Motivo: controle de risco operacional e legal
- Fonte: `src/app/elegibilidade/`, tabela `Cnae` no banco

---

## Fluxo financeiro

**Implantação e primeira mensalidade são necessárias para liberar o onboarding.**
- Status: implantada
- Motivo: comprometimento mínimo confirmado antes de iniciar serviço
- Fonte: `src/app/api/webhooks/asaas/`, lógica de status da Company

**Comissão de parceiro incide somente sobre mensalidades; implantação não gera comissão.**
- Status: implantada
- Motivo: simplificação do modelo de remuneração
- Fonte: lógica de cálculo de comissão no Admin

---

## Portal e autenticação

**Portal do Cliente utiliza magic link sem senha.**
- Status: implantada
- Motivo: simplicidade de UX para clientes sem conta prévia
- Fonte: `src/app/api/cliente/auth/`, `src/middleware.ts`

---

## Dados e backoffice

**Todos os dados fornecidos por clientes e parceiros devem estar acessíveis ao backoffice.**
- Status: parcialmente implantada (exportação pendente — veja P1 do backlog)
- Motivo: rastreabilidade operacional e conformidade
- Fonte: `/admin`, onboarding

**Parte dos dados pode estar na tela do Admin e parte em exportação compatível com Excel.**
- Status: ainda não implementada (exportação é item P1 do backlog)
- Motivo: equilíbrio entre usabilidade e volume de dados

---

## Contrato e jurídico

**Contrato do MVP seguirá inicialmente sem revisão formal de advogado.**
- Status: temporária
- Motivo: agilidade para o primeiro cliente; revisão formal é obrigatória futuramente
- Risco reconhecido: aceite sem validação jurídica plena

**Revisão por advogado é obrigatória antes da escala.**
- Status: ainda não implementada
- Motivo: conformidade legal e proteção contratual
- Dependência: geração de receita suficiente para custear

---

## Governança técnica

**Repositório Git é a fonte técnica oficial.**
- Status: implantada
- Motivo: rastreabilidade, versionamento e auditoria
- Regra: em caso de divergência, o código atual e as evidências atuais de Produção prevalecem sobre documentos

**Uma tarefa funcional por branch; nova branch usa nova sessão principal do Claude Code.**
- Status: implantada
- Motivo: isolamento de contexto e facilidade de revisão

**Nenhuma alteração em Produção sem autorização explícita.**
- Status: implantada
- Motivo: controle de risco e rastreabilidade de mudanças
