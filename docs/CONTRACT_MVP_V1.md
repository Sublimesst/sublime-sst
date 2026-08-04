# CONTRACT_MVP_V1.md — Contrato Sublime Digital · Conteúdo MVP 1.0

Especificação oficial do conteúdo do Contrato de Prestação de Serviços do
produto Sublime Digital, aprovada para o MVP.

Este documento **não é código, não é `/termos`, não é o PDF gerado** — é a
fonte de verdade documental que as implementações futuras (Eixos A, B e D)
devem seguir. Enquanto não implementado, `/termos` e `src/lib/contractPdf.ts`
continuam sendo o texto efetivamente publicado e gerado, mesmo onde divergir
do que está registrado aqui.

Preços e valores monetários: consultar exclusivamente `src/lib/pricing.ts`.
Este documento não fixa nem duplica valores em cláusulas gerais, exceto o
texto comercial da promoção, expressamente aprovado (Seção 5).

---

## 0. Status e governança

| Campo | Valor |
|---|---|
| Versão do conteúdo | **MVP 1.0** |
| Data de congelamento | 2026-08-04 |
| Status comercial/operacional | **Aprovado** |
| Status técnico (SST) | **Validado tecnicamente pela responsável de SST** |
| Status jurídico | **Revisão jurídica formal por advogado externo: ainda NÃO realizada.** Não bloqueadora do MVP — risco reconhecido e registrado (ver Seção 18 e `docs/DECISIONS.md`) |
| Status de implementação | **Ainda NÃO implementado** em `/termos` nem em `src/lib/contractPdf.ts` |
| Eixo C (persistência e recuperação do PDF) | **Concluído** — mergeado pela PR #16 |
| Eixo A (fonte única `/termos` × PDF) | **Pendente** |
| Eixo B (comprovante e arquitetura do aceite) | **Pendente** |
| Eixo D (formatação e paginação do PDF) | **Pendente** |

Este documento é a especificação de conteúdo aprovada — **não** uma peça
jurídica finalizada. Qualquer alteração de conteúdo aprovado aqui exige uma
**nova versão contratual** (nova `CONTRACT_VERSION`), nunca uma edição
retroativa desta especificação ou de um contrato já aceito.

**Novo cliente real permanece bloqueado.** O bloqueio somente poderá ser
revisto após a conclusão dos Eixos A, B e D e das validações previstas para
cada um deles. O congelamento documental registrado neste documento **não
significa** que o contrato já esteja implementado, nem que esteja apto para
uso com um novo cliente real.

---

## 1. Modelo comercial aprovado

- O aceite eletrônico ocorre **antes** do pagamento.
- Implantação e primeira mensalidade são **cobranças distintas**.
- A primeira mensalidade é cobrada **no ato da contratação**, não após a
  entrega de documentos ou liberação do portal.
- A ativação dos serviços e a liberação do onboarding dependem da
  **confirmação da implantação e da primeira mensalidade**.
- Aceite, pagamentos e ativação são **eventos distintos**, cada um com seu
  próprio registro e momento — nunca tratados como sinônimos ou fundidos em
  um único carimbo de data/hora.
- O Asaas é somente o **mecanismo operacional** de cobrança recorrente.
- O uso de assinatura (subscription) no Asaas é um detalhe de implementação
  de cobrança — **não altera** vigência contratual, permanência mínima ou
  regras de cancelamento, que são sempre definidas por este contrato, nunca
  pela mecânica de cobrança do provedor de pagamento.

---

## 2. Desistência antes da ativação

- Antes da ativação, o CONTRATANTE pode desistir da contratação pelo canal
  oficial de atendimento.
- Implantação e primeira mensalidade já pagas nesse cenário serão
  **reembolsadas**.
- O estorno será solicitado pelo **mesmo meio de pagamento** utilizado na
  contratação.
- O prazo de conclusão do estorno **dependerá da instituição financeira ou
  plataforma de pagamento**, fora do controle direto da CONTRATADA.
- **Após a ativação**, a taxa de implantação deixa de ser reembolsável.
- **A ativação inicia a vigência contratual** — é o marco que separa o
  período de desistência livre do período de permanência mínima.

---

## 3. Vigência, renovação e cancelamento

- **Vigência inicial mínima de 12 (doze) meses**, contados a partir da
  ativação.
- O preço do período inicial é pago em **12 (doze) cobranças mensais
  sucessivas**.
- A mensalização é uma **facilidade de pagamento** do valor total do período
  inicial — **não** é uma contratação mês a mês sem permanência mínima.

**Cancelamento durante a vigência inicial (os 12 primeiros meses):**

1. Qualquer solicitação de cancelamento apresentada durante a vigência
   inicial é tratada como **aviso de não renovação**.
2. O encerramento produz efeitos **ao final do 12º mês** — nunca antes,
   independentemente do momento em que a solicitação foi apresentada dentro
   do período inicial.
3. A solicitação **não elimina** as parcelas restantes necessárias para
   completar as 12 mensalidades do período inicial.
4. Os serviços permanecem disponíveis até o encerramento do período inicial,
   ressalvadas inadimplência, suspensão ou outra hipótese contratual
   aplicável.
5. Uma solicitação apresentada durante os **últimos 90 dias** da vigência
   inicial também produz o encerramento exatamente ao final dos 12 meses —
   mesmo efeito de uma solicitação apresentada em qualquer outro momento do
   período inicial, sem antecipação nem postergação.
6. Nesse caso, **não é exigido** nenhum período adicional de 90 dias após o
   término da vigência inicial — o restante do período inicial já cumpre
   essa função.

**Após a renovação automática (a partir do 13º mês, quando não houver
solicitação de cancelamento pendente):**

- o contrato se renova **automaticamente por prazo indeterminado**;
- o **aviso prévio de 90 dias** aplica-se exclusivamente aos pedidos de
  cancelamento apresentados **depois** de o contrato já ter sido renovado
  por prazo indeterminado — **nunca** aos pedidos feitos durante a vigência
  inicial, que seguem exclusivamente a regra dos itens 1 a 6 acima;
- durante esse aviso, mensalidades e prestação de serviços **permanecem
  normalmente**;
- **não há multa adicional** associada ao cumprimento do aviso prévio;
- **não há novo período de fidelidade** imposto a cada renovação automática
  — a permanência mínima de 12 meses aplica-se apenas ao período inicial.

**Justificativa operacional interna (não é cláusula, é fundamento de
governança):** os documentos técnicos e a implantação concentram custo e
valor técnico relevantes logo no início da relação contratual. A permanência
mínima evita que o contrato seja encerrado imediatamente após a entrega dos
principais documentos, sem que o serviço tenha sido remunerado
integralmente. Esta justificativa é registrada apenas para orientar decisões
de produto e eventual defesa técnica da cláusula — **nunca** deve ser
transformada, no contrato ou em qualquer comunicação ao cliente, em
linguagem acusatória ou que sugira má-fé por parte do CONTRATANTE.

---

## 4. Promoções

**Texto comercial aprovado para o banner:**

> "Implantação com até 50% de desconto — economize até R$ 150"

**Regras contratuais:**

- Percentual, prazo e valor promocional **não devem ficar fixados** nas
  cláusulas gerais do contrato — cláusulas gerais descrevem o mecanismo, não
  o número da campanha vigente.
- O **quadro-resumo** de cada contratação individual registra o valor normal
  e o valor efetivamente contratado (já refletindo eventual promoção).
- A promoção vale **somente** para a contratação em que foi efetivamente
  aceita.
- Mudanças futuras na campanha promocional **não afetam** contratações já
  formalizadas — o quadro-resumo já aceito é imutável.
- O desconto de implantação **não altera** mensalidade, adicionais,
  reajustes, renovações ou futuras contratações, salvo indicação expressa em
  contrário no próprio quadro-resumo.

---

## 5. Quadro-resumo da contratação

Campos obrigatórios do quadro-resumo individual de cada contratação (anexo ao
comprovante de aceite — ver Seção 15). Esta especificação usa **placeholders**
e nunca deve ser preenchida com dado real:

| Campo | Placeholder |
|---|---|
| Identificação da CONTRATADA | `[RAZÃO_SOCIAL_CONTRATADA]` / `[CNPJ_CONTRATADA]` (sem dado pessoal sensível associado) |
| Identificação da CONTRATANTE | `[RAZÃO_SOCIAL_CONTRATANTE]` / `[CNPJ_CONTRATANTE]` |
| Responsável pelo aceite | `[NOME_RESPONSAVEL]` |
| E-mail cadastrado | `[EMAIL_CADASTRADO]` |
| Estabelecimento abrangido | `[ENDEREÇO_ESTABELECIMENTO]` |
| Número declarado de trabalhadores | `[NUM_FUNCIONARIOS]` |
| Plano | `[PLANO: Digital Essencial ou Digital Premium]` |
| Faixa | `[FAIXA: 1-5 / 6-10 / 11-20]` |
| Mensalidade | `[VALOR_MENSALIDADE]` (cf. `pricing.ts`) |
| Implantação normal | `[VALOR_IMPLANTACAO_PADRAO]` (cf. `pricing.ts`) |
| Implantação efetivamente contratada | `[VALOR_IMPLANTACAO_ACEITO]` |
| Condição promocional | `[SIM/NÃO — identificação da campanha, se aplicável]` |
| LTCAT | `[ADICIONAL_CONTRATADO / INCLUÍDO_NO_PREMIUM / NÃO_CONTRATADO]` |
| Demais adicionais | `[LISTA_DE_ADICIONAIS_CONTRATADOS]` |
| Versão contratual | `[CONTRACT_VERSION]` |
| Vigência inicial | `12 meses a partir da ativação` |
| Renovação | `automática, prazo indeterminado, após o período inicial` |
| Aviso prévio | `durante a vigência inicial: qualquer solicitação encerra ao final do 12º mês (Seção 3); após a renovação: 90 dias` |

**Nunca reproduzir nesta especificação, em nenhum exemplo ou anexo:** CPF,
CNPJ completo, e-mail real, telefone, IP, endereço pessoal ou qualquer outro
dado pessoal — sempre placeholders.

---

## 6. Aplicabilidade técnica

- Os documentos e serviços serão entregues **conforme aplicabilidade técnica
  e legal** ao perfil real da empresa.
- A contratação de um plano **não significa** emissão automática de um
  documento tecnicamente inaplicável ou legalmente dispensado para aquele
  perfil.
- O enquadramento de risco, as atividades, os ambientes, as funções e as
  informações fornecidas pelo CONTRATANTE **determinam** a aplicabilidade
  real de cada documento.
- As obrigações remanescentes do CONTRATANTE **continuam válidas** mesmo
  quando um determinado programa/documento for dispensado pela análise
  técnica.

---

## 7. Plano Digital Essencial

**Implantação** (entrega única, quando aplicável ao perfil):

- PGR com LPP, ou documento técnico correspondente ao enquadramento;
- PCMSO;
- profissional médico necessário à coordenação técnica do PCMSO;
- triagem técnica preliminar remota (definição exata na Seção 12);
- ordens de serviço por função;
- fichas de controle de EPI, quando necessárias;
- organização inicial dos documentos no portal do cliente.

**Gestão mensal** (durante toda a vigência):

- gestão e transmissão dos eventos aplicáveis de SST do eSocial;
- eventos S-2210, S-2220 e S-2240, ou os que vierem a substituí-los;
- acompanhamento dos retornos de processamento;
- comunicação de rejeições e inconsistências ao CONTRATANTE;
- monitoramento de vencimentos de exames periódicos;
- alertas e orientações relacionados;
- portal do cliente com repositório de documentos;
- suporte pelos canais previstos no plano.

**LTCAT:**

- **Não incluído** no plano Essencial;
- pode ser contratado separadamente, como adicional;
- o valor efetivamente aceito deve constar no quadro-resumo da contratação;
- o preço do LTCAT adicional **não deve ser fixado** nas cláusulas gerais do
  contrato.

---

## 8. Plano Digital Premium

Inclui integralmente o escopo do plano **Essencial** (Seção 7) e, além
disso:

- um **LTCAT inicial por estabelecimento contratado** (regras e exclusões na
  Seção 9);
- PPP de novos trabalhadores durante a vigência, quando aplicável;
- apoio à abertura de até **1 (uma) CAT por mês**;
- **1 (um) relatório analítico** por ciclo de 12 meses;
- suporte via WhatsApp com **resposta inicial em até 24 horas corridas**.

**Limites do suporte (aplicável a ambos os planos, com prazos específicos por
plano):**

- o prazo informado é de **resposta inicial**, não necessariamente de
  solução definitiva;
- a solução pode depender de análise técnica, informações adicionais do
  CONTRATANTE, terceiros ou sistemas externos (ex.: eSocial, clínicas);
- o suporte **não substitui** atendimento de emergência, atendimento médico
  ou o cumprimento de obrigações urgentes que sejam, por lei, de
  responsabilidade do empregador.

---

## 9. LTCAT Premium

- **1 (um) LTCAT inicial por estabelecimento** contratado;
- **somente quando tecnicamente aplicável** ao perfil declarado;
- **somente quando compatível** com a modalidade digital (sem necessidade de
  avaliação quantitativa/medição ambiental presencial);
- limitado às atividades, funções, ambientes e condições **efetivamente
  declaradas** pelo CONTRATANTE;
- depende de documentos e evidências suficientes fornecidos pelo
  CONTRATANTE.

**Expressamente não incluídos no LTCAT do plano Premium:**

- visita presencial;
- deslocamento;
- avaliação quantitativa;
- medição ambiental;
- análise laboratorial;
- estabelecimento adicional além do contratado;
- função, ambiente ou atividade não declarada pelo CONTRATANTE;
- atualização decorrente de mudança substancial posterior.

**Quando os elementos fornecidos forem insuficientes:**

- a elaboração do LTCAT pode ser **suspensa**;
- poderá ser apresentada uma **proposta adicional** (ex.: avaliação
  presencial, escopo maior);
- a contratação do plano Premium **não obriga** a CONTRATADA a emitir um
  LTCAT tecnicamente inadequado ou sem lastro técnico suficiente.

---

## 10. Triagem técnica remota

Usar exatamente a seguinte definição no contrato:

> "Triagem técnica preliminar remota de exposições ocupacionais, realizada
> com base nas informações, documentos e evidências fornecidos pelo
> CONTRATANTE."

Usar exatamente o seguinte texto de ressalva:

> "A triagem remota não caracteriza nem descaracteriza insalubridade ou
> periculosidade, não substitui LTCAT, laudo técnico, avaliação quantitativa
> ou inspeção presencial quando esses documentos ou procedimentos forem
> legal ou tecnicamente necessários."

**Regra geral de suspensão/complementação (aplicável à triagem remota como um
todo, não só ao LTCAT):**

- informações insuficientes, inconsistentes ou incompatíveis com a
  modalidade digital podem suspender a conclusão do documento afetado;
- podem ser solicitados dados adicionais ao CONTRATANTE;
- pode ser proposta avaliação presencial ou migração de modalidade
  (Consultoria SST);
- isso **não cria** contratação automática de um serviço adicional — exige
  aceite expresso do CONTRATANTE.

---

## 11. PCMSO, médico, exames e clínicas

- PCMSO e o profissional médico necessário à sua coordenação técnica estão
  **incluídos** nos dois planos, quando aplicáveis ao perfil.
- **Não estão incluídos** na mensalidade nem na implantação:
  - consultas médicas;
  - exames ocupacionais;
  - exames complementares;
  - procedimentos clínicos;
  - clínicas, laboratórios ou unidades de atendimento;
  - tratamentos;
  - deslocamentos.
- Esses custos são **pagos separadamente** pelo CONTRATANTE, diretamente ao
  prestador do serviço.
- Indicação de clínica/profissional ou auxílio no agendamento **não
  significa** inclusão desse custo na mensalidade.

---

## 12. Gestão e transmissão do eSocial

**A Sublime efetivamente realiza:**

- coleta e organização das informações necessárias;
- análise de consistência;
- preparação dos eventos;
- transmissão ao eSocial;
- acompanhamento do retorno de processamento;
- comunicação de rejeições e necessidade de complementação ao CONTRATANTE.

**Essa execução é condicionada a:**

- envio completo e tempestivo das informações pelo CONTRATANTE;
- procurações, autorizações e acessos necessários, quando exigidos;
- comunicação imediata dos eventos relevantes pelo CONTRATANTE (ex.:
  admissões, afastamentos, acidentes);
- disponibilidade do próprio sistema do eSocial;
- atuação de clínicas, médicos, contadores e demais terceiros envolvidos.

**Responsabilidade:**

- a responsabilidade legal do empregador perante o eSocial e os órgãos
  competentes **não é transferida** à CONTRATADA;
- a CONTRATADA **não responde** por omissão ou atraso causado por
  informação ausente, incorreta ou fornecida fora do prazo pelo
  CONTRATANTE.

---

## 13. Gestão mensal e limites

- A gestão mensal **faz parte do plano** contratado e não deve ser omitida
  do contrato nem tratada como um "extra" implícito.
- Não constitui **fiscalização permanente e independente** da empresa
  CONTRATANTE.
- Depende da **colaboração ativa** do CONTRATANTE (envio de informações,
  comunicação de eventos).
- Não garante o cumprimento de obrigações que dependam de terceiros, órgãos
  públicos ou sistemas externos fora do controle da CONTRATADA.
- A ausência de comunicação do CONTRATANTE sobre um evento relevante
  **impede** a responsabilização da CONTRATADA pelas consequências desse
  evento específico.

---

## 14. Serviços adicionais e exclusões

**Exclusões comuns, salvo contratação expressa de serviço adicional:**

- visitas técnicas presenciais;
- avaliações quantitativas;
- medições ambientais;
- exames (custos diretos);
- custos de clínicas;
- treinamentos em NRs;
- laudos de insalubridade e periculosidade com validade pericial;
- perícias;
- defesa administrativa ou judicial;
- acompanhamento de fiscalização;
- investigação aprofundada de acidentes de trabalho;
- regularização de situações anteriores à contratação;
- unidades, funções ou trabalhadores não informados pelo CONTRATANTE;
- atividades incompatíveis com a modalidade digital.

**Regras gerais de adicionais:**

- todo serviço adicional depende de escopo, preço, prazo e aceite explícitos
  antes da execução;
- a recusa do CONTRATANTE em contratar um serviço adicional pode impedir a
  emissão de um documento que dependa tecnicamente dele — isso não configura
  descumprimento contratual por parte da CONTRATADA.

---

## 15. Comprovante de aceite eletrônico

Diretriz de implementação (Eixo B): utilizar preferencialmente campos e
dados já existentes no sistema, evitando novos desenvolvimentos além do
estritamente necessário para atender a esta especificação.

**Campos mínimos do comprovante:**

- empresa (CONTRATANTE);
- responsável pelo aceite;
- e-mail cadastrado;
- data e hora do aceite;
- IP registrado no momento do aceite;
- navegador ou dispositivo (user agent);
- versão contratual aceita;
- plano;
- faixa;
- mensalidade;
- implantação efetivamente contratada;
- condição promocional aplicada, se houver;
- LTCAT (adicional contratado / incluído no Premium / não contratado);
- vigência;
- hash de integridade do documento;
- forma de recuperação do documento original no portal do cliente.

**O comprovante NÃO deve incluir** (correção explícita frente ao PDF atual):

- a expressão "implantação paga";
- status financeiro do pagamento;
- data de pagamento;
- qualquer tratamento do comprovante como recibo financeiro;
- a afirmação "prova suficiente para todos os fins legais".

**Texto obrigatório sobre o momento do aceite:**

> "O aceite eletrônico foi registrado antes da confirmação financeira da
> contratação. A ativação dos serviços permanece condicionada à confirmação
> dos pagamentos aplicáveis."

**Texto obrigatório sobre valor probatório:**

> "As partes reconhecem o aceite eletrônico e os registros de integridade
> mantidos pela plataforma como meios de comprovação da manifestação de
> vontade, sem prejuízo de outros meios de prova admitidos pela
> legislação."

---

## 16. Estrutura contratual aprovada

Estrutura de 16 cláusulas aprovada para a nova versão do contrato (substitui
a estrutura atualmente publicada em `/termos`, ainda não atualizada):

1. Partes e definições
2. Objeto
3. Elegibilidade
4. Aplicabilidade
5. Serviços do plano
6. Adicionais e exclusões
7. Obrigações da CONTRATADA
8. Obrigações da CONTRATANTE
9. Valores, promoções, pagamento e ativação
10. Vigência, renovação e cancelamento
11. Inadimplência e suspensão
12. Responsabilidade e limitações
13. Triagem remota, LTCAT e insalubridade
14. LGPD e registros médicos
15. Aceite eletrônico, versão e integridade
16. Disposições gerais e foro

**Anexos:**

- Anexo I — Serviços dos planos (detalhamento das Seções 7–9 deste documento)
- Anexo II — Comprovante de aceite eletrônico (Seção 15 deste documento)

---

## 17. Cláusulas sensíveis para revisão jurídica futura

Registradas para priorização quando a revisão jurídica formal (Seção 0 e
`docs/DECISIONS.md`) for realizada:

1. Permanência obrigatória de 12 meses
2. Cobrança das parcelas restantes em caso de cancelamento antecipado
3. Aviso prévio de 90 dias
4. Renovação automática por prazo indeterminado
5. Taxa de implantação e regras de reembolso
6. Inadimplência, suspensão de serviço e negativação
7. Limitação financeira de responsabilidade da CONTRATADA
8. Triagem técnica remota (definição e efeitos)
9. LTCAT (escopo, exclusões e suspensão)
10. Insalubridade e periculosidade (declarações técnicas, limites)
11. LGPD e tratamento de dados de saúde
12. Guarda e transferência de registros médicos ocupacionais
13. Validade probatória do aceite eletrônico
14. Responsabilidade por clínicas, médicos e terceiros
15. Foro de eleição

---

## 18. Correspondência técnica futura

Requisitos obrigatórios para a implementação desta especificação (Eixos A,
B e D — não implementados nesta etapa):

- uma **única fonte versionada** de conteúdo contratual;
- `/termos` e o PDF do contrato consumindo essa **mesma fonte** (nunca dois
  textos mantidos independentemente, como hoje);
- tabela de preços sempre **importada de `pricing.ts`** — nunca duplicada ou
  hardcoded em outro lugar (inclusive no gerador de PDF, que hoje mantém uma
  tabela própria);
- quadro-resumo de cada contratação com os **valores efetivamente aceitos**
  (Seção 5);
- **versão contratual única** por aceite, nunca ambígua;
- **contrato integral** (16 cláusulas) no PDF — não um extrato parcial como
  o atual;
- PDF **persistido e recuperável** (já resolvido pelo Eixo C);
- alteração de conteúdo futura **sem modificar** contratos já aceitos
  (imutabilidade retroativa);
- **testes automatizados de correspondência** entre `/termos` e o PDF
  gerado.

---

*Este documento é a especificação de conteúdo do Contrato Sublime Digital —
MVP 1.0. Não substitui aconselhamento jurídico. Não deve ser citado como o
contrato vigente perante clientes — o contrato vigente permanece sendo o
texto publicado em `/termos` até a conclusão dos Eixos A, B e D.*
