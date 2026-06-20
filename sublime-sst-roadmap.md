# SUBLIME SST — Roadmap de Evolução do Portal
## Plano de Sprints para Desenvolvimento

**Versão:** 1.0
**Data:** 19 de junho de 2026
**Objetivo:** Transformar o MVP atual em uma plataforma comercial completa, pronta para escalar a aquisição de clientes via canais diretos, parceiros e busca orgânica.

---

## Premissas estratégicas

Antes dos sprints, as decisões abaixo orientam toda a priorização:

1. **O canal de contadores é o principal motor de crescimento.** Cada funcionalidade deve facilitar a vida do contador que indica e do cliente que contrata.
2. **O site é a máquina. A prospecção ativa é o combustível.** O portal precisa funcionar perfeitamente, mas não vai gerar clientes sozinho nos primeiros meses.
3. **Sublime SST (consultiva) e Sublime Digital (escalável) coexistem.** O site deve apresentar as duas frentes sem que uma diminua a outra.
4. **Cada sprint deve entregar valor comercial mensurável.** Nada de refatoração cosmética sem impacto em conversão ou operação.
5. **A equipe é enxuta (3 pessoas).** Priorizar o que dá resultado com o menor esforço possível.

---

## Estado atual do portal (pré-Sprint 0)

### O que funciona
- Site no ar em sublimesst.com com HTTPS
- Funil de elegibilidade em 3 etapas com motor client-side
- Resultado imediato (elegível ou análise personalizada)
- Formulário de parceiros com indicação de empresa
- Catálogo de 122 CNAEs GR1 com 21 aprovados
- Domínio Resend verificado para envio de e-mails
- Variáveis de ambiente configuradas na Vercel
- GitHub Desktop conectado para deploys

### O que não funciona ainda
- Tabelas do banco de dados não criadas (Prisma/Supabase)
- Notificações por e-mail não chegam (depende do banco)
- Nenhum dado de lead é persistido no servidor
- Supabase RLS não habilitado
- Sem analytics (GA4 configurado mas sem ID)
- Sem conteúdo de autoridade ou SEO

### O que precisa de revisão
- Página de privacidade e termos (provisórios, aguardam revisão jurídica)
- Posicionamento da home (focada demais no Digital, não mostra a consultoria)
- Sem página "Sobre" ou de confiança institucional
- Sem landing pages por nicho

---

## Sprint 0 — Infraestrutura crítica
**Duração estimada: 3-5 dias**
**Tema: fazer o que já existe funcionar de verdade**

### Objetivo
Garantir que todo lead que preenche o formulário seja salvo no banco e gere uma notificação para a equipe. Sem isso, o site é um folder bonito que não captura nada.

### Entregas

**0.1 — Banco de dados operacional**
- Executar `npx prisma db push` para criar as tabelas no Supabase
- Executar `npm run db:seed` para importar os 122 CNAEs
- Criar arquivo `.env.local` no ambiente de desenvolvimento com `DATABASE_URL`
- Verificar se a rota `/api/eligibility` retorna 200 após o banco estar pronto
- Verificar se a rota `/api/leads` salva o lead no banco

**0.2 — Notificações por e-mail funcionando**
- Testar envio pelo Resend após banco estar ativo
- Confirmar que e-mail chega em contato@sublimesst.com ao concluir o teste de elegibilidade
- Validar que os 4 tipos de notificação disparam corretamente: novo lead, resultado elegível, resultado backoffice, novo parceiro
- Verificar logs no Resend (resend.com → Logs)

**0.3 — Segurança básica**
- Habilitar Row Level Security (RLS) em todas as tabelas do Supabase
- Confirmar que rate limiting está ativo nas rotas de API
- Confirmar que honeypot anti-bot está nos formulários
- Verificar que `.gitignore` cobre todos os `.env.*`

**0.4 — Monitoramento mínimo**
- Configurar Google Analytics 4: criar propriedade, obter ID `G-XXXXXXXXXX`, adicionar como `NEXT_PUBLIC_GA4_ID` na Vercel
- Confirmar que eventos `eligibility_started`, `eligibility_completed`, `lead_captured` estão sendo disparados

### Critério de aceite
- Um teste completo do formulário de elegibilidade resulta em: lead salvo no banco + e-mail recebido + evento no GA4.
- Isso deve funcionar tanto para resultado elegível quanto para backoffice.

### Riscos
- Se a senha do Supabase foi esquecida, será necessário resetar via painel
- Rate limiting em memória reinicia entre deploys da Vercel (aceitar por ora; Redis é P3+)

---

## Sprint 1 — Reposicionamento da marca
**Duração estimada: 5-7 dias**
**Tema: o site precisa vender as duas frentes, não só o Digital**

### Objetivo
Reposicionar a home para apresentar a Sublime SST como marca ampla, com dois caminhos claros: consultoria personalizada e modelo digital. Criar a página de consultoria e a página "Sobre".

### Entregas

**1.1 — Home redesenhada**
- Novo hero com headline ampla: "Conformidade em SST com soluções adequadas ao perfil da sua operação."
- Seção com dois cards lado a lado:
  - Card 1: "Consultoria SST Personalizada" → CTA: "Solicitar orçamento personalizado"
  - Card 2: "Sublime Digital" → CTA: "Verificar elegibilidade"
- Seção "Para quem é cada solução" com critérios claros
- Remover linguagem que diminui o modelo tradicional ("burocrático", "presencial e lento")
- Manter WhatsApp flutuante e CTA de contato

**1.2 — Página /consultoria-sst (nova)**
- Explicar que a Sublime SST atende empresas de qualquer porte e risco
- Listar serviços: PGR, PCMSO, LTCAT, laudos, treinamentos, avaliação de riscos psicossociais
- CTA: formulário simples (nome, empresa, e-mail, WhatsApp, descrição da necessidade) + WhatsApp
- Notificação por e-mail quando formulário for preenchido
- Não mencionar preços — é sob medida

**1.3 — Página /sobre (nova)**
- Apresentação institucional com dados comprováveis
- Missão, abordagem, equipe (sem nomes obrigatórios — pode ser genérico)
- Contatos oficiais
- Não inventar dados, prêmios ou clientes que não existem

**1.4 — Ajustes na página /digital**
- Substituir "100% online" por "Contratação, gestão e organização documental digitais, com direcionamento para etapas presenciais quando aplicáveis"
- Remover comparação que chama modelo tradicional de burocrático
- Adicionar seção "O que está incluído" vs. "O que é sob demanda/orçamento separado"
- Incluir disclaimer de preços conforme backlog P1.4

**1.5 — Ajustes no rodapé e navegação**
- Adicionar links: Consultoria SST, Sobre, Contato
- Rodapé: "Soluções em Segurança e Saúde Ocupacional com atendimento consultivo e opções digitais para perfis elegíveis."

### Critério de aceite
- Visitante que chega na home entende em 10 segundos que a Sublime atende tanto empresas complexas quanto simples
- Cada frente tem CTA próprio e página de destino funcional

---

## Sprint 2 — Otimização do funil de elegibilidade
**Duração estimada: 5-7 dias**
**Tema: capturar mais leads e não perder nenhum**

### Objetivo
Refinar o funil de elegibilidade para maximizar a taxa de conversão, melhorar a experiência mobile e garantir que toda interação gere dados acionáveis.

### Entregas

**2.1 — Reordenação das etapas do teste**
- Etapa 1: perfil operacional (CNAE, funcionários, perguntas de risco) — o lead vê se vale a pena antes de dar dados pessoais
- Etapa 2: dados da empresa (CNPJ, nome)
- Etapa 3: dados de contato (nome, e-mail, WhatsApp) + resultado
- Justificativa: reduz abandono na etapa 1 (pedir CNPJ logo de cara assusta)

**2.2 — Saídas otimizadas**
- Resultado elegível: CTA para o Sublime Digital, preço visível, timer de 24h, botão de cadastro
- Resultado backoffice: CTA para orçamento personalizado → formulário simples OU WhatsApp direto
- Nunca usar linguagem de rejeição ("reprovado", "inapto", "rejeitado", "não elegível")
- Registrar origem, respostas e resultado no banco

**2.3 — Rastreamento completo**
- Eventos de analytics em cada interação:
  - `cta_custom_quote_click` — clicou em orçamento personalizado
  - `cta_digital_test_click` — iniciou teste de elegibilidade
  - `eligibility_started`, `eligibility_step_completed` (1, 2, 3)
  - `eligibility_result_eligible`, `eligibility_result_custom_quote`
  - `whatsapp_click`, `partner_form_submitted`, `lead_form_submitted`
- Preservar parâmetros UTM ao longo do funil
- Identificar `utm_source=chatgpt.com` quando aplicável

**2.4 — UX mobile**
- Testar e ajustar layout em 360px, 390px, 768px e desktop
- Garantir que teclado não sobrepõe campos em mobile
- Testar CNPJ mask, WhatsApp mask e validações em dispositivo real
- Testar comportamento em conexão lenta (3G)

### Critério de aceite
- Funil testado em 4 resoluções sem quebras
- Todo lead gera registro no banco + e-mail + evento no GA4
- Dashboard do GA4 mostra o funil completo com drop-offs por etapa

---

## Sprint 3 — Landing pages por nicho
**Duração estimada: 7-10 dias**
**Tema: transformar o site em laboratório comercial**

### Objetivo
Criar 3 landing pages específicas para os nichos prioritários, usando a mesma estrutura base mas com mensagem, dores e CTAs adaptados. Medir qual nicho converte melhor.

### Entregas

**3.1 — Infraestrutura de landing pages**
- Componente reutilizável de landing page com slots para: headline, subtítulo, dores, solução, inclusões, exclusões, CNAEs exemplo, FAQ, CTA
- Parâmetro de nicho preservado no lead (para medir conversão por origem)
- Cada página com URL própria para campanhas e SEO

**3.2 — Landing page /sst-para-contadores**
- Headline: "Ajude seus clientes a regularizarem SST e eSocial sem aumentar sua estrutura interna"
- Dores: eSocial obrigatório, clientes perguntando sobre SST, responsabilidade indireta, falta de tempo para resolver
- Proposta: Sublime como extensão do escritório contábil
- CTA duplo: "Quero ser parceiro" (formulário de parceiros) + "Indicar um cliente" (formulário simplificado)
- FAQ específico: como funciona a parceria, qual a recompensa, o contador precisa entender de SST?

**3.3 — Landing page /sst-para-empresas-de-tecnologia**
- Headline: "SST digital para empresas de tecnologia"
- Dores: empresa sabe que precisa de SST mas nunca priorizou, não sabe se é obrigatório para dev remoto, medo de fiscalização do eSocial
- Proposta: processo 100% online, rápido, sem burocracia
- CTA: "Verificar elegibilidade"
- CNAEs exemplo: desenvolvimento de software, consultoria em TI, processamento de dados

**3.4 — Landing page /sst-para-escritorios**
- Headline: "SST digital para escritórios, consultorias e empresas administrativas"
- Dores: SST parece complexa demais para um escritório pequeno, não sabe por onde começar, medo de multa
- Proposta: regularização simples e acessível para operações de baixo risco
- CTA: "Verificar elegibilidade"
- CNAEs exemplo: contabilidade, advocacia, arquitetura, publicidade, consultoria empresarial

### Métricas a acompanhar por nicho

| Métrica | O que mede |
|---------|-----------|
| Taxa de conversão da página | Qual mensagem gera mais ação |
| Custo por lead (quando houver tráfego pago) | Qual nicho é mais barato para captar |
| Percentual de empresas elegíveis | Qual nicho gera menos retrabalho |
| Indicações geradas | Qual nicho possui maior potencial de escala |

### Critério de aceite
- 3 páginas publicadas com URLs próprias e rastreamento de origem
- Lead gerado em cada página carrega o identificador do nicho
- GA4 permite filtrar conversões por página de origem

---

## Sprint 4 — SEO e descoberta por IA
**Duração estimada: 5-7 dias**
**Tema: ser encontrado por quem procura SST no Google e em IAs**

### Objetivo
Preparar a infraestrutura técnica de SEO e garantir que o site seja compreendido por buscadores e IAs como o ChatGPT.

### Entregas

**4.1 — SEO técnico**
- Configurar canonical URLs com `https://www.sublimesst.com`
- Revisar `robots.txt`: não bloquear OAI-SearchBot, GPTBot em páginas públicas
- Revisar `sitemap.xml` com todas as páginas públicas (incluindo landing pages de nicho)
- Cadastrar Google Search Console e Bing Webmaster Tools
- Considerar IndexNow para indexação acelerada

**4.2 — Metadata e Open Graph**
- Título e descrição únicos em cada página
- Tags Open Graph (og:title, og:description, og:image) em todas as páginas
- Imagem de compartilhamento social (1200x630px) com logo e tagline
- Favicon e apple-touch-icon configurados
- H1 único por página, com hierarquia correta (H1 → H2 → H3)
- Alt text em todas as imagens

**4.3 — Dados estruturados (JSON-LD)**
- `Organization`: dados da Sublime SST
- `Service`: descrição dos serviços (consultoria + digital)
- `BreadcrumbList`: navegação estruturada
- `FAQPage`: quando houver FAQ real e visível na página
- Validar todos os schemas com a ferramenta do Google

**4.4 — Performance (Core Web Vitals)**
- Medir com Lighthouse e PageSpeed Insights
- Otimizar imagens (WebP, lazy loading)
- Garantir LCP < 2.5s, FID < 100ms, CLS < 0.1
- Verificar se a logo base64 não está pesando demais

### Critério de aceite
- Google Search Console mostra o site sem erros de indexação
- Lighthouse score > 90 em performance, SEO e acessibilidade
- Schema validation sem erros

---

## Sprint 5 — Conteúdo de autoridade
**Duração estimada: 10-15 dias (produção contínua)**
**Tema: construir autoridade e gerar tráfego orgânico**

### Objetivo
Publicar os primeiros conteúdos informativos que posicionam a Sublime como referência em SST para pequenas empresas, gerando tráfego orgânico e fortalecendo a conversão.

### Entregas

**5.1 — Estrutura de conteúdo**
- Criar seção `/conteudos` ou `/blog` com listagem de artigos
- Template de artigo com: título, data de publicação, data de revisão, conteúdo, CTA contextual, artigos relacionados
- Cada artigo deve ter: resposta curta, explicação detalhada, aplicabilidade, fonte oficial quando necessária, CTA

**5.2 — Primeiros 6 conteúdos (prioridade)**
1. "O que é SST e por que sua empresa precisa se preocupar com isso"
2. "PGR e PCMSO: o que são, para que servem e quem precisa ter"
3. "SST para empresas de baixo risco: o que muda e o que é obrigatório"
4. "eSocial e SST: o que sua empresa precisa enviar e quais são os prazos"
5. "NR-1 atualizada: riscos psicossociais e o que muda para sua empresa"
6. "SST para MEI e microempresas: o que é obrigatório e o que é opcional"

**5.3 — FAQ estruturado**
- Criar página `/faq` com as perguntas mais frequentes
- Incluir schema FAQPage para SEO
- Tópicos: elegibilidade, preços, prazos, documentos necessários, eSocial, diferença entre consultoria e digital

**5.4 — Conteúdos futuros (backlog de conteúdo)**
- Grau de Risco e CNAE: como saber em qual sua empresa se enquadra
- LTCAT: o que é e quando sua empresa precisa
- ASO e exames ocupacionais: guia prático
- Consultoria personalizada vs. modelo digital: quando usar cada um
- Como contadores podem ajudar seus clientes com SST
- Sublime Digital: como funciona o processo passo a passo

### Critério de aceite
- 6 artigos publicados, com metadata, schema e CTA
- Cada artigo aparece indexado no Google em até 30 dias
- Pelo menos 1 artigo rankeando na primeira página para termos long-tail

---

## Sprint 6 — Área do cliente e onboarding digital
**Duração estimada: 10-15 dias**
**Tema: preparar a experiência pós-venda do Sublime Digital**

### Objetivo
Criar a experiência mínima de onboarding para clientes que contratam o Sublime Digital, incluindo coleta de dados, acompanhamento de status e entrega de documentos.

### Entregas

**6.1 — Portal do cliente (MVP)**
- Login simples (e-mail + código enviado por e-mail, sem senha)
- Dashboard com status do processo: contratado → dados recebidos → em análise → documentos prontos
- Upload de documentos pelo cliente (quando necessário)
- Download de documentos entregues (PGR, PCMSO, etc.)
- Histórico de pagamentos

**6.2 — Onboarding automatizado**
- Após contratação, enviar e-mail de boas-vindas com link para o portal
- Formulário de coleta de dados detalhados (informações que serão importadas para o SOC)
- Checklist visual para o cliente: "preencha seus dados → aguarde análise → receba seus documentos"
- Notificação automática quando documentos ficarem prontos

**6.3 — Integração com pagamentos**
- Ativar Asaas com credenciais reais (substituir mock)
- Checkout de implantação (R$100 promo ou R$190)
- Cobrança recorrente mensal automática
- Webhook para atualizar status do cliente quando pagamento for confirmado

### Critério de aceite
- Cliente contrata, paga, preenche dados e recebe documentos sem intervenção manual além da análise técnica e assinatura
- Toda a jornada gera notificações para a equipe e para o cliente

---

## Sprint 7 — Preparação para escala
**Duração estimada: 10-15 dias**
**Tema: infraestrutura para crescer sem quebrar**

### Entregas

**7.1 — Painel administrativo completo**
- Dashboard com métricas reais: leads/semana, conversão, receita, churn
- Gestão de clientes: lista, status, documentos, pagamentos
- Gestão de parceiros: indicações, conversões, comissões
- Exportação de dados para planilha

**7.2 — Automações operacionais**
- Lembrete automático para clientes que não completaram o cadastro (e-mail após 24h e 72h)
- Lembrete de renovação anual (30 dias antes do vencimento)
- Alerta interno quando exame periódico de um cliente estiver próximo do vencimento

**7.3 — Rate limiting robusto**
- Migrar de rate limiting em memória para Redis (Upstash ou similar)
- Configurar alertas para tentativas de abuso

**7.4 — Backup e monitoramento**
- Configurar backup automático do Supabase
- Alertas de erro via e-mail (quando deploy falha ou API retorna 500)
- Monitoramento de uptime (UptimeRobot ou similar, gratuito)

---

## Sprint 8 — White Label (futuro)
**Duração estimada: 15-20 dias**
**Tema: transformar parceiros em canais de distribuição em escala**

### Objetivo
Permitir que escritórios de contabilidade e outras empresas com carteira de clientes PJ ofereçam SST usando a operação da Sublime como backend.

### Entregas (alto nível)
- Painel do parceiro com visão dos clientes indicados e status de cada um
- Página de entrada personalizada por parceiro (sublimesst.com/parceiro/nome-do-escritorio)
- Relatórios de comissão e faturamento
- Contrato de parceria White Label
- API para integração com sistemas do parceiro (quando aplicável)

### Pré-requisitos
- Sprint 6 completo (portal do cliente funcionando)
- Pelo menos 50 clientes diretos atendidos com sucesso (validação do modelo)
- Processo operacional documentado e estabilizado

---

## Sprint 9 — Marketplace de Clínicas (futuro)
**Duração estimada: 20-30 dias**
**Tema: conectar empresas de SST a clínicas ocupacionais**

### Objetivo
Criar plataforma que conecte empresas de SST a clínicas para realização de exames, com split de pagamentos e ganho de eficiência tributária.

### Entregas (alto nível)
- Cadastro de clínicas com área de cobertura, exames disponíveis e preços
- Busca de clínicas por localização e tipo de exame
- Agendamento integrado
- Split de pagamento automático (cada parte recebe sua parcela)
- Dashboard para clínicas e para empresas de SST

### Pré-requisitos
- Operação própria estabilizada com 100+ clientes
- Validação da demanda com entrevistas com clínicas e empresas de SST parceiras
- Análise jurídica e tributária do modelo de split

---

## Visão geral do roadmap

| Sprint | Tema | Duração estimada | Impacto |
|--------|------|-----------------|---------|
| 0 | Infraestrutura crítica (banco + e-mail) | 3-5 dias | Sem isso, nada funciona |
| 1 | Reposicionamento da marca | 5-7 dias | Abre a porta para clientes consultivos |
| 2 | Otimização do funil | 5-7 dias | Mais leads capturados por visitante |
| 3 | Landing pages por nicho | 7-10 dias | Testa quais segmentos convertem melhor |
| 4 | SEO e descoberta por IA | 5-7 dias | Tráfego orgânico de longo prazo |
| 5 | Conteúdo de autoridade | 10-15 dias | Posicionamento + tráfego + confiança |
| 6 | Portal do cliente + pagamentos | 10-15 dias | Experiência pós-venda do Digital |
| 7 | Preparação para escala | 10-15 dias | Infraestrutura para crescer |
| 8 | White Label | 15-20 dias | Escala via parceiros (futuro) |
| 9 | Marketplace de Clínicas | 20-30 dias | Nova vertical de negócio (futuro) |

**Tempo total estimado (Sprints 0-7):** 8-12 semanas
**Sprints 8-9:** dependem de validação comercial e operacional prévia

---

## Como usar este documento

1. **Com o Claude Code:** cole o conteúdo do sprint atual como contexto ao pedir implementações. Exemplo: "Implemente o Sprint 1.1 — Home redesenhada conforme o roadmap."
2. **Para decisões de negócio:** use as premissas estratégicas e os critérios de aceite para avaliar se cada entrega realmente agrega valor.
3. **Para medir progresso:** cada sprint tem critérios de aceite objetivos. Sprint só está "pronto" quando todos forem cumpridos.
4. **Para comunicação com sócias:** compartilhe a visão geral do roadmap para alinhar expectativas sobre o que vem a seguir e em que ordem.

---

## Observações finais

- Os sprints 0-3 são os que mais impactam receita no curto prazo. Priorize-os.
- Os sprints 4-5 são investimentos de médio prazo que geram retorno composto (SEO demora mas cresce exponencialmente).
- Os sprints 6-7 só fazem sentido quando houver clientes reais pagando pelo Sublime Digital.
- Os sprints 8-9 são oportunidades de longo prazo que dependem da operação base estar sólida.
- Este documento deve ser revisado a cada 30 dias com base nos dados reais de conversão e operação.
