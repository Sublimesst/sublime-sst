import type { Metadata } from 'next'
import { ArticleLayout } from '@/components/ArticleLayout'

export const metadata: Metadata = {
  title: 'PGR e PCMSO: o que são, para que servem e quem precisa ter',
  description: 'Os dois documentos mais importantes da SST explicados de forma clara. Saiba o que é PGR, o que é PCMSO, quem é obrigado e o que acontece sem eles.',
  alternates: { canonical: 'https://sublimesst.com/conteudos/pgr-e-pcmso' },
  openGraph: {
    title: 'PGR e PCMSO: o que são, para que servem e quem precisa ter',
    description: 'Guia completo sobre os dois documentos mais importantes de SST para empresas brasileiras.',
    type: 'article',
    publishedTime: '2026-06-19',
  },
}

export default function ArtPgrPcmso() {
  return (
    <ArticleLayout
      slug="pgr-e-pcmso"
      title="PGR e PCMSO: o que são, para que servem e quem precisa ter"
      description="Os dois documentos mais importantes da SST explicados de forma clara. Saiba quem é obrigado, o que cada um cobre e como obtê-los."
      publishedAt="2026-06-19"
      readTime="7 min"
      category="Documentos"
      cta={{
        title: 'Precisa de PGR e PCMSO para sua empresa?',
        body: 'A Sublime SST elabora os documentos para empresas de todos os portes, do GR1 ao GR4. Solicite um orçamento ou verifique se sua empresa se enquadra no modelo digital.',
        href: '/elegibilidade',
        label: 'Verificar Elegibilidade',
      }}
      related={[
        { href: '/conteudos/o-que-e-sst', title: 'O que é SST e por que sua empresa precisa se preocupar com isso', readTime: '6 min' },
        { href: '/conteudos/esocial-e-sst', title: 'eSocial e SST: o que sua empresa precisa enviar', readTime: '8 min' },
        { href: '/conteudos/sst-para-baixo-risco', title: 'SST para empresas de baixo risco: o que é obrigatório', readTime: '6 min' },
      ]}
    >
      <h2>Resposta direta</h2>
      <p>
        <strong>PGR</strong> (Programa de Gerenciamento de Riscos) e <strong>PCMSO</strong> (Programa de Controle
        Médico de Saúde Ocupacional) são os dois documentos centrais da SST. Todo empregador com funcionários CLT
        é obrigado a ter ambos — independentemente do tamanho da empresa ou do tipo de atividade.
      </p>

      <h2>O que é o PGR?</h2>
      <p>
        O PGR é o documento que identifica, avalia e controla os <strong>riscos ocupacionais</strong> presentes no
        ambiente de trabalho da empresa. Ele é exigido pela <strong>NR-1</strong> (Norma Regulamentadora número 1),
        que foi atualizada em 2021 para tornar o programa obrigatório para todas as empresas com trabalhadores.
      </p>
      <p>O PGR deve conter:</p>
      <ul>
        <li>Identificação dos perigos e riscos no ambiente de trabalho (físicos, químicos, biológicos, ergonômicos, psicossociais)</li>
        <li>Avaliação da probabilidade e gravidade de cada risco</li>
        <li>Medidas de controle e prevenção adotadas ou planejadas</li>
        <li>Responsabilidades e prazos para implementação das medidas</li>
        <li>Cronograma de revisões periódicas</li>
      </ul>
      <p>
        O PGR deve ser <strong>revisado anualmente</strong> ou sempre que houver mudança significativa no processo
        produtivo, nas condições de trabalho ou após acidentes graves.
      </p>

      <h2>O que é o PCMSO?</h2>
      <p>
        O PCMSO é o programa que organiza e controla a <strong>saúde dos trabalhadores</strong>. É regulado pela
        <strong>NR-7</strong> e deve ser elaborado com base nos riscos identificados no PGR.
      </p>
      <p>O PCMSO define:</p>
      <ul>
        <li>Quais exames médicos os funcionários precisam fazer (admissional, periódico, demissional, de retorno)</li>
        <li>A periodicidade dos exames conforme o cargo e os riscos</li>
        <li>Os procedimentos em caso de afastamento ou acidente</li>
        <li>As responsabilidades do médico coordenador do programa</li>
      </ul>
      <p>
        O PCMSO é o documento que embasa a emissão dos <strong>ASOs (Atestados de Saúde Ocupacional)</strong> — os
        laudos individuais de aptidão de cada funcionário para o trabalho.
      </p>

      <h2>Qual a diferença entre PGR e PCMSO?</h2>
      <p>
        Uma forma simples de distinguir: o PGR foca no <strong>ambiente</strong> (o que pode causar risco no trabalho),
        enquanto o PCMSO foca nas <strong>pessoas</strong> (como monitorar a saúde dos trabalhadores expostos a esses riscos).
      </p>
      <p>
        Os dois programas são complementares e devem estar alinhados. Um PCMSO elaborado sem conhecer o PGR da empresa
        está incompleto.
      </p>

      <h2>Quem precisa ter PGR e PCMSO?</h2>
      <p>
        Toda empresa com <strong>pelo menos um funcionário CLT</strong>. Isso inclui:
      </p>
      <ul>
        <li>Escritórios de advocacia, contabilidade e consultoria</li>
        <li>Empresas de tecnologia</li>
        <li>Comércio varejista</li>
        <li>Indústrias de qualquer porte</li>
        <li>Prestadoras de serviços</li>
        <li>Microempresas com 1 ou 2 funcionários</li>
      </ul>
      <p>
        <strong>MEI sem funcionários</strong> não tem obrigação — mas MEI que contrata um empregado passa a ser obrigado.
      </p>

      <h2>O que acontece se a empresa não tiver PGR ou PCMSO?</h2>
      <p>As consequências práticas são:</p>
      <ul>
        <li><strong>Autuação fiscal</strong> — o Ministério do Trabalho pode multar a empresa durante uma fiscalização</li>
        <li><strong>Passivo trabalhista</strong> — a ausência dos documentos é argumento em reclamações na Justiça do Trabalho</li>
        <li><strong>Pendências no eSocial</strong> — sem o PGR, a empresa não consegue enviar corretamente os eventos de SST no eSocial</li>
        <li><strong>Invalidação de ASOs</strong> — sem o PCMSO, os atestados de saúde dos funcionários podem não ter validade legal</li>
      </ul>

      <h2>Como obter PGR e PCMSO?</h2>
      <p>
        Ambos os documentos devem ser elaborados por <strong>profissionais habilitados</strong>: o PGR geralmente é
        desenvolvido por técnico ou engenheiro de segurança do trabalho, e o PCMSO por médico do trabalho.
      </p>
      <p>
        Para empresas de baixo risco operacional (GR1) com até 20 funcionários, a Sublime SST oferece um modelo
        digital que organiza PGR e PCMSO de forma simplificada, com valor mensal fixo e sem necessidade de
        visitas presenciais na maioria dos casos.
      </p>
      <p>
        Para empresas com atividades de maior risco ou porte maior, a consultoria personalizada é o caminho mais
        adequado — com análise técnica específica para o perfil da operação.
      </p>
    </ArticleLayout>
  )
}
