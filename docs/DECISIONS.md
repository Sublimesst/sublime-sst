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

## Programa de Parceiros MVP

**Nesta fase, o cadastro de Partner é somente para pessoa jurídica com CNPJ válido.**
- Status: implantada
- Motivo: manter o fluxo operacional inicial do programa de parceiros
  simples e compatível com o cadastro empresarial vigente, deixando
  eventual participação de pessoa física para decisão futura específica
- Fonte: `src/app/api/partners/route.ts`, `src/lib/utils.ts` (`validateCNPJ`)

**Novo Partner com dados obrigatórios válidos e aceite do Termo de Parceria entra diretamente como `active`.**
- Status: implantada
- `active` significa Partner apto a acessar o Portal do Parceiro e a
  receber novas atribuições de indicação pelo código; aprovação manual
  prévia deixou de ser o fluxo normal
- O Admin continua podendo inativar/reativar a qualquer momento, para
  moderação ou para registros legados criados antes desta decisão
- Motivo: reduzir fricção operacional no cadastro sem abrir mão da
  validação de CNPJ, do aceite do Termo e da moderação posterior pelo Admin
- Fonte: `src/app/api/partners/route.ts`

**First-touch do Partner é determinado por `Lead.partnerId` já persistido.**
- Status: implantada
- Um `partnerRef` (`?ref=CODE`) recebido posteriormente, inclusive no
  cadastro final da `Company`, nunca substitui uma atribuição já
  persistida no `Lead`; `Company.partnerId` herda exatamente o parceiro
  já vinculado ao `Lead`
- Motivo: impedir que um segundo parceiro "roube" uma indicação já
  atribuída ao primeiro parceiro que efetivamente trouxe o lead
- Fonte: `src/app/api/leads/route.ts`, `src/app/api/eligibility/route.ts`,
  `src/app/api/leads/register/route.ts`

**"Contratação concluída" no Portal do Parceiro exige o estado financeiro central `financiallyComplete`.**
- Status: implantada
- A existência isolada de uma `Company` vinculada ao Partner não
  representa conversão; a classificação comercial usa
  `deriveFinancialActivationState(...).financiallyComplete` (a mesma
  fonte read-only já usada pelo Portal do Cliente), nunca uma regra
  financeira paralela
- Fonte: `src/app/api/partner/dashboard/route.ts`, `src/lib/paymentPresentation.ts`

**O Portal do Parceiro opera com minimização de dados.**
- Status: implantada
- O payload do dashboard do parceiro não expõe CNPJ do lead, Workers,
  onboarding, documentos, `checkoutUrl`/`invoiceUrl` ou IDs Asaas; toda
  consulta é filtrada exclusivamente pelo Partner autenticado na sessão
  (isolamento entre parceiros)
- Fonte: `src/app/api/partner/dashboard/route.ts`, `src/lib/partnerAuth.ts`

---

## Dados e backoffice

**Todos os dados fornecidos por clientes e parceiros devem estar acessíveis ao backoffice.**
- Status: implantada para os dados de Worker/onboarding — acessíveis via
  Admin (PR #28) e via exportação compatível com SOC (PR #30); a
  exportação genérica CSV/Excel dos demais dados do Admin continua P1 do
  backlog
- Motivo: rastreabilidade operacional e conformidade
- Fonte: `/admin`, onboarding, `src/lib/socExport/`

**Parte dos dados pode estar na tela do Admin e parte em exportação compatível com Excel.**
- Status: implantada para Worker/onboarding via exportação SOC (PR #30);
  a exportação genérica CSV/Excel dos demais dados do Admin continua item
  P1 do backlog
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
  (PR #18); **quadro-resumo e demais adicionais no comprovante implementados
  pelo Eixo B (PR #38)**
- Motivo: alinhar o texto contratual ao escopo técnico real entregue pela
  operação, incluindo exclusões e condicionantes que hoje não constam do
  contrato publicado
- Fonte: `docs/CONTRACT_MVP_V1.md`, Seções 6 a 14

**O formato do comprovante de aceite eletrônico do MVP 1.0 está aprovado,
corrigindo o comprovante atualmente gerado pelo PDF.**
- Status: aprovado; frases proibidas ("implantação paga", "prova suficiente
  para todos os fins legais") já removidas do PDF pelo Eixo A; **arquitetura
  do comprovante (quadro-resumo, LTCAT, demais adicionais) implementada pelo
  Eixo B (PR #38)**
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

## Visibilidade de documentos técnicos no Portal Cliente

**Para todo `Document` que não seja `contrato`, `Company.documentsDeliveredAt != null` é a evidência persistente que autoriza sua exposição no Portal Cliente.**
- Status: implantada e validada em Produção (PR #32, 2026-08-14)
- Motivo: documentos técnicos podem ser persistidos internamente antes da entrega formal ao cliente; a autorização não deve ser deduzida exclusivamente de `Company.status`, da existência física do `Document`, ou do upload/persistência prévia
- Fonte: `src/lib/documentVisibility.ts`

**Depois de preenchido `documentsDeliveredAt`, a disponibilidade dos documentos técnicos não deve desaparecer somente porque a Company evoluiu para outro status operacional, como `active`, `overdue`, `suspended` ou `migrating`.**
- Status: implantada e validada em Produção (PR #32, 2026-08-14)
- Motivo: a entrega formal é um fato já ocorrido, não uma condição atrelada ao status corrente da Company
- Fonte: `src/lib/documentVisibility.ts`

**`contrato` é exceção explícita ao gate técnico.**
- Status: implantada
- Motivo: possui fluxo próprio de geração/persistência/hash/imutabilidade (`src/lib/contractPersistence.ts`) e continua acessível segundo esse fluxo, sem depender de `documentsDeliveredAt`
- Fonte: `src/lib/documentVisibility.ts`, `src/lib/contractPersistence.ts`

**A mesma regra de visibilidade é aplicada em defesa em profundidade: UI/dashboard, API de listagem e download direto.**
- Status: implantada e validada em Produção (PR #32, 2026-08-14)
- Motivo: conhecer o `documentId` não pode contornar o gate — a UI nunca é a única proteção
- Fonte: `src/lib/documentVisibility.ts`, dashboard do cliente, `src/app/api/cliente/documents/`, PR #32

**Download bloqueado por este gate não deve produzir `DocumentAccessLog`.**
- Status: implantada e validada em Produção (PR #32, 2026-08-14)
- Motivo: preservar a auditoria de acesso real sem registrar tentativas que nunca chegaram a acessar o conteúdo do documento
- Fonte: `src/app/api/cliente/documents/[id]/download/route.ts`

**`in_production` e `in_review` pertencem à mesma macroetapa exibida ao cliente no Portal — elaboração/revisão dos documentos técnicos — e não criam nova obrigação para o cliente cujo onboarding já foi enviado.**
- Status: implantada e validada em Produção (PR #32, 2026-08-14)
- Motivo: refletir corretamente o estágio operacional real da Company sem exigir ação repetida do cliente
- Fonte: `src/app/cliente/dashboard/steps.ts`

---

## Identificação do ator em DocumentAccessLog no MVP

**Cookies de cliente emitidos após a correção da atribuição do ator carregam o id da `ClientSession` do login no payload assinado, propagado internamente como `clientSessionId`.**
- Status: implementada e validada em Produção em 2026-08-06
- Motivo: o cookie de sessão do cliente é stateless por HMAC e, antes desta
  correção, não carregava nenhum identificador ligado ao login que o
  originou — isso impedia distinguir, no `DocumentAccessLog`, um acesso do
  cliente de um acesso administrativo
- Fonte: `src/lib/clientAuth.ts`, `src/app/api/cliente/auth/verify/route.ts`

**Os produtores de `DocumentAccessLog` do lado cliente gravam `sessionId` igual ao `clientSessionId` propagado; o produtor administrativo continua gravando `sessionId` null.**
- Status: implementada e validada em Produção em 2026-08-06
- Motivo: `null` explícito do lado administrativo passa a discriminar de
  fato o acesso administrativo do acesso do cliente, sem exigir nenhum
  campo novo de schema
- Fonte: rotas de documentos do cliente e do Admin

**Validação de Produção (2026-08-06):** após o merge da PR #21, um novo
magic link foi solicitado e um novo login de cliente foi concluído com
cookie já emitido pelo código corrigido. Um único download do documento
sintético já existente retornou HTTP 200. A criação do `DocumentAccessLog`
ocorre antes do retorno da resposta, sem tratamento de exceção ao redor —
o 200 observado só é possível se a gravação teve sucesso. O valor gravado
em `sessionId` provém exclusivamente do payload do cookie assinado por
HMAC, nunca de query, body ou header. Nenhuma leitura direta do banco foi
necessária para essa validação.

**Cookies de cliente emitidos antes da correção permanecem válidos e podem continuar gravando `sessionId` null durante a janela de compatibilidade.**
- Status: aceito como comportamento transitório
- Motivo: evitar forçar novo login de clientes já autenticados; a
  ambiguidade se resolve sozinha quando o cookie expira (30 dias) ou o
  cliente faz login novamente
- Fonte: `src/lib/clientAuth.ts`

**Registros de `DocumentAccessLog` já existentes, gravados antes da correção, permanecem ambíguos entre acesso administrativo e do cliente e não serão reescritos.**
- Status: aceito
- Motivo: não há mecanismo seguro para reatribuir retroativamente esses
  registros sem reconstruir a associação a partir de dado sensível (o
  token bruto nunca foi armazenado); o volume atual é de homologação, sem
  cliente real ainda contratado

**Nenhuma migration é necessária para esta correção — a coluna `DocumentAccessLog.sessionId` já existia como opcional antes desta decisão.**
- Status: implementada no código
- Motivo: o campo já suportava o valor necessário; a correção é só de
  aplicação (payload do cookie e propagação), não de schema

**Cookie bruto, token bruto e magic link nunca são gravados no `DocumentAccessLog` nem em nenhum outro log.**
- Status: implementada no código
- Motivo: o identificador gravado é o id (cuid) da `ClientSession`, opaco e
  não reversível ao token que autenticou o login
- Fonte: `src/lib/clientAuth.ts`, `src/app/api/cliente/auth/verify/route.ts`

**Um campo explícito de tipo de ator (`actorType`) no `DocumentAccessLog` fica registrado como possibilidade para P1, não implementado nesta correção.**
- Status: não implementada — avaliada e descartada para o MVP
- Motivo: exigiria migration e não resolve nenhuma ambiguidade que a
  atribuição por `sessionId` já não resolva para o volume atual; mantido
  como opção caso o número de produtores de `DocumentAccessLog` cresça
- Fonte: `prisma/schema.prisma`

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

---

## Onboarding individual dos trabalhadores

**`Company.numFuncionarios` representa a quantidade contratada e não é sobrescrita pelo onboarding.**
- Status: implantada e validada em Produção (2026-08-11)
- Motivo: preservar o valor comercialmente contratado como referência independente do que o cliente efetivamente declarar no onboarding
- Fonte: `src/app/api/cliente/onboarding/route.ts`

**A quantidade declarada é a quantidade de `Worker` existentes no momento do envio.**
- Status: implantada e validada em Produção (2026-08-11)
- Motivo: a declaração real do cliente é sempre derivada dos registros individuais de trabalhador, nunca de um número digitado separadamente
- Fonte: `src/lib/onboardingWorkers.ts`, `src/app/api/cliente/onboarding/route.ts`

**`OnboardingData.numFuncionarios` é o snapshot da quantidade declarada no momento do envio.**
- Status: implantada e validada em Produção (2026-08-11)
- Motivo: registrar de forma imutável quantos trabalhadores foram efetivamente declarados no envio, independente de mudanças posteriores na contagem de `Worker`
- Fonte: `prisma/schema.prisma`, `src/app/api/cliente/onboarding/route.ts`

**Se a quantidade contratada for diferente da declarada, o envio não é bloqueado definitivamente: exige confirmação explícita do cliente, sem reprecificar automaticamente e sem alterar silenciosamente a quantidade contratada.**
- Status: implantada e validada em Produção (2026-08-11)
- Motivo: permitir que o cliente prossiga conscientemente com uma divergência real (por exemplo, quadro de funcionários diferente do contratado) sem que o sistema tome decisões financeiras ou contratuais automáticas em seu lugar
- Fonte: `src/app/api/cliente/onboarding/route.ts` (código `quantity_mismatch`, HTTP 409)

**Antes do envio, o onboarding permanece em `em_preenchimento` e os dados gerais e os `Worker` podem ser modificados livremente pelo cliente.**
- Status: implantada e validada em Produção (2026-08-11)
- Motivo: permitir rascunho e retomada sem pressão de completude imediata
- Fonte: `src/lib/onboardingAccess.ts`

**Depois do envio (`status=enviado`), a declaração original fica disponível para leitura, mas o Portal não pode mais alterar dados gerais nem `Worker`.**
- Status: implantada e validada em Produção (2026-08-11)
- Motivo: preservar a integridade da declaração que fundamenta a produção dos documentos de SST (PGR/PCMSO), impedindo alteração unilateral pelo cliente após o envio
- Fonte: `src/lib/onboardingAccess.ts` (`onboarding_already_submitted`, HTTP 409)

**Correções operacionais posteriores à declaração original não devem apagá-la ou substituí-la silenciosamente; a arquitetura de versionamento/correção técnica posterior permanece fora desta tranche.**
- Status: decisão registrada; arquitetura de versionamento ainda não implementada
- Motivo: qualquer necessidade futura de corrigir uma declaração já enviada deve ser tratada por mecanismo próprio e auditável, não por sobrescrita direta
- Fonte: escopo da PR #26

**Dados pessoais não necessários ao MVP não fazem parte do `Worker` nesta tranche — nenhum CPF, telefone, e-mail ou dado médico foi adicionado.**
- Status: implantada
- Motivo: minimizar a superfície de dados pessoais sensíveis coletados até que exista necessidade funcional concreta (ex. geração do arquivo SOC) e tratamento LGPD correspondente
- Fonte: `prisma/schema.prisma` (`model Worker`)

---

## Exportação SOC — Modelo I

**A exportação compatível com o Modelo I de importação do SOC gera um arquivo `.xls` BIFF8 real, nunca XLSX renomeado.**
- Status: implantada e validada em Produção (PR #30, 2026-08-11)
- Motivo: o Modelo I fornecido para esta integração está em `.xls` BIFF8 e não havia evidência confirmando aceitação de `.xlsx`; no MVP, foi decidido reproduzir o formato original para minimizar risco de incompatibilidade
- Fonte: `src/lib/socExport/socExport.ts`

**No MVP, uma `Company` corresponde a uma única Unidade do SOC; Nome Unidade = `Company.razaoSocial`.**
- Status: implantada
- Motivo: o sistema não tem conceito de múltiplas unidades por empresa; `razaoSocial` é sempre presente e determinístico, ao contrário de `nomeFantasia` (opcional)
- Fonte: `src/app/api/admin/empresas/[id]/export/soc/route.ts`

**Nome Setor = `Worker.setor`; setor é obrigatório tanto para a exportação SOC quanto em NOVOS envios do onboarding.**
- Status: implantada
- Motivo: Nome Setor é campo obrigatório no Modelo I do SOC; tornar setor obrigatório também no envio do onboarding evita declarações futuras inexportáveis
- Declarações já enviadas antes desta mudança não são revalidadas retroativamente nem recebem backfill — permanecem preservadas e simplesmente não podem ser exportadas até correção operacional própria, fora de escopo desta tranche
- Fonte: `src/lib/onboardingWorkers.ts` (`isWorkerCompleteForSubmission`)

**Situação = código fixo `"S"` (Ativo) para todas as linhas, enquanto o sistema não tiver nenhum fluxo de desligamento/afastamento de Worker.**
- Status: implantada
- Motivo: os valores válidos do modelo são S=Ativo, N=Inativo, P=Pendente, A=Afastado, F=Férias; como não existe hoje nenhum mecanismo para marcar um Worker como desligado/afastado, todo Worker cadastrado representa, por construção, o quadro atual declarado — "S" é um fato estrutural do sistema, não um valor inventado por linha
- Fonte: `src/lib/socExport/socExport.ts`

**Somente os 8 campos marcados como obrigatórios no Modelo I real recebem valor (Nome Unidade, Nome Setor, Nome Cargo, Nome Funcionário, Dt.Nascimento, Sexo, Situação, Dt.Admissão); os demais 110 campos permanecem vazios.**
- Status: implantada
- Motivo: nenhum dos demais campos (13 condicionais dependentes da parametrização eSocial do cliente no SOC + 97 opcionais) tem origem determinística no sistema hoje sem inventar valor
- Fonte: `src/lib/socExport/socTemplate.ts`

**Nenhum dado pessoal adicional (CPF, RG, CTPS, telefone, e-mail) é coletado ou inventado apenas para completar a planilha SOC.**
- Status: implantada
- Motivo: minimização de dados pessoais — consistente com a decisão já registrada em "Onboarding individual dos trabalhadores" (nenhum CPF/telefone/e-mail/dado médico faz parte do `Worker`)
- Fonte: `prisma/schema.prisma` (`model Worker`), seção "Onboarding individual dos trabalhadores" acima

**A geração e o download do arquivo compatível com o Modelo I foram validados em Produção; a importação efetiva do arquivo dentro do software SOC ainda não foi exercitada.**
- Status: geração/download implantada e validada; importação real no SOC não validada — risco/validação operacional futura
- Motivo: a validação em Produção usou uma fixture sintética temporária (criada e removida sob autorização explícita, com backup lógico e guards de preservação) para confirmar a estrutura do arquivo gerado (BIFF8 real, 118 cabeçalhos, 8 campos obrigatórios corretos); não incluiu a importação do arquivo no SOC real
- Fonte: `docs/PROJECT_STATE.md`

---

## Limpeza de dados de homologação em Produção

**Dados de homologação/Sandbox só podem ser removidos de Produção via um
manifest fechado e verificável (snapshot fixo, contagens e digests
SHA-256 por tabela, `GLOBAL_MANIFEST_DIGEST`), executado em transação
única com guards de preservação, precedido de backup lógico fresco e
seguido de verificação read-only independente do resultado.**
- Status: implantada — método usado com sucesso na Tranche 1 (2026-08-07,
  91 registros removidos)
- Motivo: nenhum campo estrutural distingue homologação de dado real no
  schema atual; a única forma segura de remover dados de teste é
  delimitar o universo de forma auditável, com trilha de auditoria
  preservável, nunca por exclusão ampla/heurística em tempo de execução
- Regra permanente: qualquer cadastro de teste/homologação associado a
  movimentação financeira real, obrigação externa ou integração de
  Produção ainda não reconciliada fica fora de qualquer limpeza
  automática/em lote. Esses registros exigem classificação, decisão e
  tratamento próprios antes de eventual preservação, anonimização ou
  exclusão — não entram automaticamente em tranche de limpeza, mas isso
  não significa preservação eterna obrigatória: eventual anonimização ou
  exclusão futura depende de análise própria, feita separadamente
- Fonte: artefato de execução da Tranche 1, `docs/PROJECT_STATE.md`

---

## Eixo B — faixa histórica e campanha promocional (2026-08-15)

**A faixa histórica do quadro-resumo/comprovante deriva exclusivamente de
`Company.numFuncionarios` (já congelado no cadastro) por uma regra
estrutural do contrato, versionada por `contractVersion` — nunca por
`pricing.ts`.**
- Status: implantada
- As versões contratuais já suportadas (`2026-07-04` e `2026-08-05`) usam
  os mesmos limites já aprovados (1-5 / 6-10 / 11-20). Uma futura mudança
  de faixas exige uma nova versão contratual com sua própria configuração
  — nunca a edição retroativa da configuração de uma versão já existente.
  Uma `contractVersion` sem regra estrutural conhecida falha
  explicitamente na geração do quadro-resumo, nunca cai na faixa vigente
  do `pricing.ts` atual como substituto
- Motivo: eliminar o último ponto em que o comprovante de um contrato já
  aceito dependia, mesmo que estruturalmente, de `pricing.ts` — a faixa e
  o nome do plano exibidos passam a ser tão imutáveis quanto a mensalidade
  e a implantação já congeladas
- Fonte: `src/lib/contract/quadroResumo.ts` (`deriveFaixaHistorica`,
  `derivePlanoLabel`)

**O MVP possui um único mecanismo promocional (desconto de implantação por
prazo determinado) e não existe entidade de campanha comercial nomeada;
`implantacaoPromo` (Sim/Não) atende ao campo "identificação da campanha, se
aplicável" do quadro-resumo enquanto essa condição se mantiver.**
- Status: implantada
- Não foi criado nenhum campo/identificador artificial de campanha;
  `Company.promoDeadline` continua sendo apenas o prazo de conclusão do
  pagamento promocional, nunca um identificador de campanha, e
  `Lead.campaign` (atribuição de marketing) não foi reaproveitado para
  este fim
- Motivo: não há, hoje, nenhuma fonte de dado histórico confiável para uma
  campanha nomeada — inventar um identificador violaria o princípio de
  nunca reconstruir condição histórica a partir de dado inexistente
- Se no futuro existirem múltiplas campanhas promocionais identificáveis
  simultaneamente, isso exigirá uma decisão e modelagem de dados próprias,
  fora desta tranche
- Fonte: `src/lib/contract/quadroResumo.ts`, `docs/CONTRACT_MVP_V1.md`
  (Seção 5)
