import type { Metadata } from 'next'
import { ArticleLayout } from '@/components/ArticleLayout'

export const metadata: Metadata = {
  title: 'SST para empresas de baixo risco: o que muda e o que é obrigatório',
  description: 'Empresas GR1 têm obrigações de SST mais simples, mas continuam tendo obrigações. Entenda o que se aplica ao seu caso e o que pode ser dispensado.',
  alternates: { canonical: 'https://sublimesst.com/conteudos/sst-para-baixo-risco' },
  openGraph: {
    title: 'SST para empresas de baixo risco: o que muda e o que é obrigatório',
    description: 'Entenda as obrigações de SST para empresas GR1 no Brasil.',
    type: 'article',
    publishedTime: '2026-06-19',
  },
}

export default function ArtBaixoRisco() {
  return (
    <ArticleLayout
      slug="sst-para-baixo-risco"
      title="SST para empresas de baixo risco: o que muda e o que é obrigatório"
      description="Empresas GR1 têm obrigações de SST mais simples — mas continuam tendo obrigações. Descubra o que se aplica ao seu caso."
      publishedAt="2026-06-19"
      readTime="6 min"
      category="Grau de Risco"
      cta={{
        title: 'Sua empresa é GR1? Veja se pode usar o modelo digital',
        body: 'Empresas GR1 com até 20 funcionários podem se enquadrar no Sublime Digital — modelo simples, digital e com mensalidade fixa.',
        href: '/elegibilidade',
        label: 'Verificar Elegibilidade',
      }}
      related={[
        { href: '/conteudos/pgr-e-pcmso', title: 'PGR e PCMSO: o que são, para que servem e quem precisa ter', readTime: '7 min' },
        { href: '/conteudos/o-que-e-sst', title: 'O que é SST e por que sua empresa precisa se preocupar', readTime: '6 min' },
        { href: '/conteudos/sst-para-mei-e-microempresas', title: 'SST para MEI e microempresas: o que é obrigatório', readTime: '5 min' },
      ]}
    >
      <h2>Resposta direta</h2>
      <p>
        Empresas de <strong>baixo risco operacional</strong> — classificadas como <strong>Grau de Risco 1 (GR1)</strong>
        pela NR-4 — têm obrigações de SST mais simples do que empresas industriais ou de construção. Mas não estão
        isentas. PGR e PCMSO continuam sendo obrigatórios para qualquer empresa com funcionários CLT.
      </p>

      <h2>O que é o Grau de Risco (GR)?</h2>
      <p>
        O Grau de Risco é uma classificação definida pela <strong>NR-4</strong> que determina o nível de perigo da
        atividade econômica de uma empresa, com base no seu CNAE (Código Nacional de Atividade Econômica).
      </p>
      <p>
        A escala vai de <strong>GR1 (baixo risco)</strong> a <strong>GR4 (altíssimo risco)</strong>:
      </p>
      <ul>
        <li><strong>GR1</strong> — Escritórios, consultoria, tecnologia, advocacia, contabilidade, publicidade</li>
        <li><strong>GR2</strong> — Comércio varejista, serviços de alimentação, pequenas indústrias leves</li>
        <li><strong>GR3</strong> — Indústrias de médio porte, construção civil, serviços de saúde</li>
        <li><strong>GR4</strong> — Mineração, petroquímica, atividades com alto risco de acidentes graves</li>
      </ul>
      <p>
        O GR da empresa é determinado pelo CNAE principal. Para confirmar o grau da sua empresa, consulte a tabela
        da NR-4 ou use o teste de elegibilidade da Sublime SST.
      </p>

      <h2>O que é obrigatório para empresas GR1?</h2>
      <p>Para qualquer empresa GR1 com funcionários CLT:</p>
      <ul>
        <li><strong>PGR</strong> — obrigatório, pode ser mais simples para atividades de baixo risco</li>
        <li><strong>PCMSO</strong> — obrigatório, define os exames e a periodicidade</li>
        <li><strong>ASOs</strong> — atestados de saúde na admissão, no periódico e na demissão</li>
        <li><strong>Envio de dados ao eSocial</strong> — eventos de SST são obrigatórios no módulo de saúde</li>
        <li><strong>Registro de acidentes</strong> — qualquer acidente de trabalho deve ser registrado e comunicado</li>
      </ul>

      <h2>O que pode ser dispensado para GR1?</h2>
      <p>
        Empresas GR1 geralmente estão dispensadas de obrigações que se aplicam apenas a atividades de maior risco:
      </p>
      <ul>
        <li><strong>LTCAT</strong> — Laudo Técnico das Condições Ambientais (necessário apenas se houver agentes nocivos)</li>
        <li><strong>Laudos de insalubridade e periculosidade</strong> — quando não há exposição a agentes específicos</li>
        <li><strong>CIPA</strong> — obrigatória apenas para empresas com determinado número de funcionários por setor de risco</li>
        <li><strong>Treinamentos de NR-35 (trabalho em altura)</strong> — quando não há trabalho em altura</li>
        <li><strong>Equipamentos de Proteção Individual (EPIs) específicos</strong> — quando não há riscos que os exijam</li>
      </ul>
      <p>
        <em>Importante:</em> a dispensa sempre depende da análise concreta do ambiente de trabalho. O PGR é o documento
        que determina o que se aplica — e ele precisa ser elaborado por profissional habilitado para ter validade.
      </p>

      <h2>Qual a diferença prática para uma empresa GR1?</h2>
      <p>
        Para um escritório de advocacia, empresa de tecnologia ou consultoria empresarial, a SST é mais simples:
      </p>
      <ul>
        <li>Os riscos identificados no PGR geralmente são ergonômicos e psicossociais — sem agentes químicos ou físicos</li>
        <li>O PCMSO define exames periódicos básicos, sem exigências específicas de medicina especializada</li>
        <li>A documentação pode ser elaborada e gerenciada de forma digital, sem visitas técnicas presenciais obrigatórias na maioria dos casos</li>
        <li>O custo tende a ser menor e mais previsível</li>
      </ul>

      <h2>Como saber se minha empresa é GR1?</h2>
      <p>
        O GR da sua empresa é determinado pelo CNAE principal, que consta no cartão do CNPJ. Para verificar:
      </p>
      <ul>
        <li>Acesse o portal da Receita Federal e consulte o CNPJ da empresa</li>
        <li>Identifique o CNAE principal</li>
        <li>Consulte a tabela de GR da NR-4 ou use uma ferramenta como o teste de elegibilidade da Sublime SST</li>
      </ul>
      <p>
        A Sublime SST oferece um teste rápido e gratuito que identifica o GR da sua empresa e indica a solução
        mais adequada para regularizar a SST dentro do seu perfil operacional.
      </p>
    </ArticleLayout>
  )
}
