import type { Metadata } from 'next'
import { ArticleLayout } from '@/components/ArticleLayout'

export const metadata: Metadata = {
  title: 'O que é SST e por que sua empresa precisa se preocupar com isso',
  description: 'Entenda o que é Segurança e Saúde Ocupacional, quais empresas são obrigadas e quais as consequências de não estar em conformidade com a legislação trabalhista.',
  alternates: { canonical: 'https://sublimesst.com/conteudos/o-que-e-sst' },
  openGraph: {
    title: 'O que é SST e por que sua empresa precisa se preocupar com isso',
    description: 'Guia completo sobre Segurança e Saúde Ocupacional para empresas brasileiras.',
    type: 'article',
    publishedTime: '2026-06-19',
  },
}

export default function ArtSST() {
  return (
    <ArticleLayout
      slug="o-que-e-sst"
      title="O que é SST e por que sua empresa precisa se preocupar com isso"
      description="Entenda o que é Segurança e Saúde Ocupacional, quais empresas são obrigadas e quais as consequências de não estar em conformidade."
      publishedAt="2026-06-19"
      readTime="6 min"
      category="Fundamentos"
      cta={{
        title: 'Descubra o que sua empresa precisa',
        body: 'Faça o teste de elegibilidade e veja se sua empresa se enquadra no modelo digital da Sublime SST — rápido, gratuito e sem compromisso.',
        href: '/elegibilidade',
        label: 'Verificar Elegibilidade',
      }}
      related={[
        { href: '/conteudos/pgr-e-pcmso', title: 'PGR e PCMSO: o que são, para que servem e quem precisa ter', readTime: '7 min' },
        { href: '/conteudos/sst-para-baixo-risco', title: 'SST para empresas de baixo risco: o que muda e o que é obrigatório', readTime: '6 min' },
        { href: '/conteudos/esocial-e-sst', title: 'eSocial e SST: o que sua empresa precisa enviar', readTime: '8 min' },
      ]}
    >
      <h2>Resposta direta</h2>
      <p>
        SST é a sigla para <strong>Segurança e Saúde no Trabalho</strong>. É o conjunto de normas, programas e práticas
        que as empresas são obrigadas a adotar para proteger a integridade física e mental dos seus trabalhadores.
        No Brasil, a SST é regulamentada pelo Ministério do Trabalho e Emprego por meio das <strong>Normas Regulamentadoras (NRs)</strong>.
      </p>
      <p>
        Toda empresa que tenha ao menos <strong>um funcionário CLT</strong> tem obrigações de SST. Não existe exceção
        por tamanho, setor ou tipo de atividade.
      </p>

      <h2>O que está incluído na SST?</h2>
      <p>A Segurança e Saúde no Trabalho engloba várias obrigações práticas:</p>
      <ul>
        <li><strong>PGR</strong> — Programa de Gerenciamento de Riscos: identifica e controla os riscos no ambiente de trabalho</li>
        <li><strong>PCMSO</strong> — Programa de Controle Médico de Saúde Ocupacional: organiza os exames e acompanhamento da saúde dos trabalhadores</li>
        <li><strong>ASOs</strong> — Atestados de Saúde Ocupacional: documentos emitidos após os exames médicos dos funcionários</li>
        <li><strong>Treinamentos</strong> — Capacitações obrigatórias conforme as NRs aplicáveis à atividade da empresa</li>
        <li><strong>Registros e laudos</strong> — Documentação técnica específica conforme o grau de risco da empresa</li>
      </ul>

      <h2>Quem é obrigado a ter SST?</h2>
      <p>
        A obrigação existe para <strong>qualquer empresa com funcionários contratados pelo regime CLT</strong>,
        independentemente de ser MEI, microempresa, pequena, média ou grande empresa.
      </p>
      <p>
        O que varia com o tamanho e o tipo de atividade é a <strong>complexidade das obrigações</strong>: empresas com
        atividades de baixo risco e poucos funcionários têm uma lista menor de exigências. Empresas com atividades
        industriais, químicas ou de construção têm obrigações mais robustas.
      </p>
      <p>
        Empresas <strong>somente com sócios</strong>, sem funcionários CLT, geralmente não têm obrigações de SST —
        mas devem verificar caso a caso, especialmente se houver terceiros prestando serviços regularmente.
      </p>

      <h2>Por que isso importa para o seu negócio?</h2>
      <p>Existem três razões principais pelas quais a SST deve ser prioridade:</p>

      <h3>1. Obrigação legal — com multas reais</h3>
      <p>
        O descumprimento das normas de SST pode resultar em autuações durante fiscalizações do Ministério do Trabalho.
        As multas variam conforme a infração e o porte da empresa, e podem chegar a valores significativos mesmo para
        pequenas empresas.
      </p>

      <h3>2. Passivo trabalhista</h3>
      <p>
        Em reclamações trabalhistas, a ausência de documentação de SST é frequentemente usada como argumento para
        aumentar indenizações. Não ter PGR ou PCMSO pode ser interpretado como negligência do empregador — mesmo
        que nenhum acidente tenha ocorrido.
      </p>

      <h3>3. eSocial exige dados de SST</h3>
      <p>
        Desde 2021, o módulo de SST do eSocial passou a ser obrigatório. Empresas sem os documentos de SST
        adequados não conseguem enviar corretamente os eventos de saúde ocupacional — o que gera pendências
        perante a Receita Federal e o INSS.
      </p>

      <h2>SST é complicado para uma empresa pequena?</h2>
      <p>
        Depende do perfil da empresa. Para escritórios, consultorias, empresas de tecnologia e outras atividades
        administrativas — classificadas como <strong>Grau de Risco 1 (GR1)</strong> na NR-4 —, as obrigações são
        mais simples e podem ser gerenciadas de forma digital, sem visitas técnicas presenciais.
      </p>
      <p>
        Para empresas com atividades industriais, uso de máquinas, produtos químicos ou trabalho em altura, a SST
        exige mais estrutura e acompanhamento técnico especializado.
      </p>

      <h2>Como saber o que sua empresa precisa?</h2>
      <p>
        O ponto de partida é identificar o <strong>CNAE</strong> da empresa (código de atividade econômica) e o
        <strong>número de funcionários</strong>. Com isso, é possível determinar o Grau de Risco aplicável e quais
        documentos e programas são obrigatórios.
      </p>
      <p>
        A Sublime SST oferece uma avaliação gratuita que identifica o perfil da sua empresa e indica a solução
        mais adequada — seja consultoria personalizada ou o modelo digital para perfis de baixo risco.
      </p>
    </ArticleLayout>
  )
}
