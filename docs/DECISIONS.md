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

## Contrato Sublime Digital — Conteúdo MVP 1.0

**O conteúdo do Contrato Sublime Digital MVP 1.0 está aprovado e congelado
documentalmente em `docs/CONTRACT_MVP_V1.md`.**
- Status: aprovado e **implementado** em `/termos` e em
  `src/lib/contractPdf.ts` pelo Eixo A — **mergeado pela PR #18** e
  validado por smoke test read-only em Produção
- Motivo: destravar as implementações futuras dos Eixos A, B e D com uma
  única especificação de referência, evitando decisões de conteúdo tomadas
  ad-hoc durante a implementação técnica
- Fonte: `docs/CONTRACT_MVP_V1.md`

**A validação técnica de SST do conteúdo MVP 1.0 foi concluída e aprovada
pela responsável de SST.**
- Status: implantada (validação) e implantada (implementação do conteúdo,
  Eixo A — PR #18)
- Motivo: garantir que o conteúdo reflita corretamente o escopo real dos
  planos Essencial e Premium antes de qualquer implementação
- Fonte: `docs/CONTRACT_MVP_V1.md`

**A revisão jurídica formal do conteúdo MVP 1.0 por advogado externo
permanece futura e não bloqueia o congelamento nem a implementação do
conteúdo.**
- Status: ainda não realizada — risco reconhecido
- Motivo: agilidade para o MVP, consistente com a decisão já registrada
  acima ("Contrato do MVP seguirá inicialmente sem revisão formal de
  advogado")
- Fonte: `docs/CONTRACT_MVP_V1.md`, Seção 17 (cláusulas sensíveis
  priorizadas para essa revisão futura)

**O modelo comercial de vigência, cancelamento e promoções do MVP 1.0 está
aprovado, substituindo expressamente o modelo atualmente publicado em
`src/lib/contractPdf.ts` e `/digital`.**
- Status: aprovado; **texto contratual implementado** em `/termos`, no PDF e
  em `/digital`/`/elegibilidade` (Eixo A); **lógica financeira de
  cancelamento ainda não migrada** — continua operando pela regra anterior
  de 6 mensalidades até tarefa própria
- **Regras anteriores expressamente superadas por esta decisão:**
  - compromisso mínimo de 6 (seis) mensalidades, contado a partir da entrega
    dos documentos de implantação;
  - aviso prévio de 60 (sessenta) dias para rescisão entre o 7º e o 12º mês
    de vigência;
  - aviso prévio de 30 (trinta) dias para rescisão após a primeira
    renovação.
- **Nova regra oficial, que passa a valer no lugar das anteriores:**
  - vigência inicial mínima de 12 (doze) meses, contados a partir da
    ativação (não da entrega de documentos);
  - preço do período inicial pago em 12 (doze) cobranças mensais
    sucessivas;
  - qualquer cancelamento solicitado durante a vigência inicial é tratado
    como aviso de não renovação e produz efeito ao final do 12º mês, sem
    eliminar as parcelas restantes;
  - renovação automática por prazo indeterminado após o período inicial;
  - aviso prévio único de 90 (noventa) dias, aplicável somente aos pedidos
    feitos após a renovação por prazo indeterminado;
  - nenhuma multa adicional e nenhum novo período de fidelidade a cada
    renovação
- Motivo: o modelo anterior fragmentava o prazo de aviso em três regras
  diferentes (30/60 dias) e amarrava o início da permanência mínima à
  entrega de documentos, não à ativação — o novo modelo unifica isso em uma
  única regra, mais previsível para o CONTRATANTE e mais simples de
  implementar
- Fonte: `docs/CONTRACT_MVP_V1.md`, Seções 1 a 4

**O escopo e os limites dos planos Digital Essencial e Digital Premium
(incluindo LTCAT do Premium) estão aprovados no nível de conteúdo.**
- Status: aprovado; **conteúdo implementado em `/termos` e no PDF pelo Eixo A**
  (PR #18); **quadro-resumo e demais adicionais no comprovante seguem
  pendentes — Eixo B**
- Motivo: alinhar o texto contratual ao escopo técnico real entregue pela
  operação, incluindo exclusões e condicionantes que hoje não constam do
  contrato publicado
- Fonte: `docs/CONTRACT_MVP_V1.md`, Seções 6 a 14

**O formato do comprovante de aceite eletrônico do MVP 1.0 está aprovado,
corrigindo o comprovante atualmente gerado pelo PDF.**
- Status: aprovado; frases proibidas ("implantação paga", "prova suficiente
  para todos os fins legais") já removidas do PDF pelo Eixo A; **arquitetura
  completa do comprovante (quadro-resumo, LTCAT, demais adicionais) segue
  pendente — Eixo B**
- Motivo: separar claramente o registro do aceite (anterior ao pagamento) do
  estado financeiro da contratação, e remover do comprovante qualquer
  linguagem de recibo ou de prova legal absoluta
- Fonte: `docs/CONTRACT_MVP_V1.md`, Seção 15

**A fonte contratual é única, versionada por `CONTRACT_VERSION`
(`src/lib/pricing.ts`), e reside em `src/lib/contract/` (Eixo A).**
- Status: implementada, **mergeada pela PR #18** em `main` e **validada em
  Produção por smoke test read-only** (2026-08-05)
- `/termos` e o PDF (`src/lib/contractPdf.ts`) consomem exatamente a mesma
  estrutura de 16 cláusulas — nunca dois textos mantidos independentemente
- Versão vigente: `2026-08-05`. A versão anterior (`2026-07-04`) permanece
  imutável no código. **A versão 2026-07-04 preserva o texto então
  publicado em `/termos`, mas não reproduz o antigo PDF de sete cláusulas.
  O PDF persistido e seu hash (`Company.contractHash`,
  `src/lib/contractPersistence.ts`) são o artefato histórico primário de
  qualquer contrato já aceito** — o array de cláusulas em código nunca é
  reescrito
- `pricing.ts` continua como fonte única de preços; `src/lib/contract/`
  nunca fixa valor monetário
- O PDF seleciona o conteúdo exclusivamente pela versão recebida da
  contratação (`data.contractVersion`), nunca pela versão vigente do
  código; versão ausente ou desconhecida faz a geração falhar
  explicitamente, nunca cair silenciosamente na versão atual
- Motivo: eliminar a divergência histórica entre `/termos` e o PDF e impedir
  que uma alteração de conteúdo futura afete, mesmo que involuntariamente,
  um contrato já aceito
- Fonte: `src/lib/contract/content.ts`, `docs/CONTRACT_MVP_V1.md`

**A remoção do aviso visual de revisão jurídica da página `/termos` não
significa que a revisão jurídica formal do contrato tenha sido realizada.**
- Status: aviso removido de Produção; revisão jurídica formal **continua
  futura**, conforme decisão já registrada acima ("Contrato do MVP seguirá
  inicialmente sem revisão formal de advogado")
- Motivo: o aviso descrevia um risco já registrado nesta seção de forma
  redundante e desatualizada frente ao texto MVP 1.0 já implementado; sua
  remoção é uma correção de exibição pública, não uma decisão jurídica nova
- Fonte: `docs/DECISIONS.md` (seção "Contrato e jurídico", acima)

---

## Política de upload administrativo de documentos no MVP

**Upload manual de documentos pelo Admin é permitido somente para arquivos PDF, até 10 MiB.**
- Status: implementada no código; validação em Produção pendente
- Motivo: reduzir superfície de risco do upload manual (tipo de arquivo, tamanho e conteúdo previsíveis) sem exigir infraestrutura adicional no MVP
- Fonte: `src/lib/documentUpload.ts`

**Tipos documentais permitidos no upload manual: `pgr`, `pcmso`, `declaracao`, `os_epi` e `ltcat`.**
- Status: implementada no código; validação em Produção pendente
- Motivo: restringir o upload manual aos documentos técnicos de implantação; qualquer outro valor é rejeitado
- Fonte: `src/lib/documentUpload.ts`

**O tipo `contrato` é reservado ao fluxo automatizado de aceite e persistência do contrato — nunca aceito via upload manual do Admin.**
- Status: implementada no código; validação em Produção pendente
- Motivo: o contrato tem fluxo próprio de geração, hash e imutabilidade (`src/lib/contractPersistence.ts`); permitir upload manual desse tipo abriria uma via paralela para substituir um documento que deve ser gerado e persistido só automaticamente
- Fonte: `src/lib/documentUpload.ts`, `src/lib/contractPersistence.ts`

**Download administrativo de documento deve buscar por `id` e `companyId` combinados, e sempre registrar `DocumentAccessLog`.**
- Status: implementada no código; validação em Produção pendente
- Motivo: impedir que um id de documento correto de outra empresa seja acessível pelo Admin, e manter auditoria completa de todo download, administrativo ou do cliente
- Fonte: `src/app/api/admin/empresas/[id]/documents/[documentId]/download/route.ts`

**O armazenamento atual dos bytes dos documentos em tabela do PostgreSQL (`DbStorageObject`) é interino, não uma decisão definitiva de storage.**
- Status: implementado (interino), sem prazo definido para substituição
- Motivo: funciona local e em produção sem configuração externa; a troca futura de provider (ex. Supabase Storage) já é abstraída por `StorageProvider` e não deve exigir mudança nos callers
- Fonte: `src/lib/storage/`

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
