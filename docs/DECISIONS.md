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
