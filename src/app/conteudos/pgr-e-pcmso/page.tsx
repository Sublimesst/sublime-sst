import type { Metadata } from 'next'
import { ArticleLayout } from '@/components/ArticleLayout'

export const metadata: Metadata = {
  title: 'PGR e PCMSO: o que são, para que servem e quem precisa ter',
  description: 'Os dois documentos mais importantes da SST explicados de forma clara. Saiba o que é PGR, o que é PCMSO, quem é obrigado e o que acontece sem eles.',
  alternates: { canonical: 'https://www.sublimesst.com/conteudos/pgr-e-pcmso' },
  openGraph: {
    title: 'PGR e PCMSO: o que são, para que servem e quem precisa ter',
    description: 'Guia completo sobre os dois documentos mais importantes de SST para empresas brasileiras.',
    type: 'article',
    publishedTime: '2026-06-19',
    modifiedTime: '2026-09-08',
  },
}

export default function ArtPgrPcmso() {
  return (
    <ArticleLayout
      slug="pgr-e-pcmso"
      title="PGR e PCMSO: o que são, para que servem e quem precisa ter"
      description="Os dois documentos mais importantes da SST explicados de forma clara. Saiba quem é obrigado, o que cada um cobre e como obtê-los."
      publishedAt="2026-06-19"
      updatedAt="2026-09-08"
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
        Médico de Saúde Ocupacional) são programas centrais da SST. Sua aplicação depende do perfil da empresa:
        a NR-1 e a NR-7 preveem dispensas, que devem ser verificadas conforme o enquadramento e os riscos da operação.
      </p>

      <h2>O que é o PGR?</h2>
      <p>
        O PGR é o documento que identifica, avalia e controla os <strong>riscos ocupacionais</strong> presentes no
        ambiente de trabalho da empresa. Ele é exigido pela <strong>NR-1</strong> (Norma Regulamentadora número 1),
        respeitadas as dispensas previstas para MEI e, sob condições específicas, para ME e EPP.
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
        O gerenciamento de riscos é <strong>contínuo</strong>. A avaliação de riscos deve ser revista nos prazos
        e nas situações previstos na NR-1, incluindo mudanças na operação, acidentes ou doenças relacionadas
        ao trabalho e inadequação das medidas de prevenção. Não existe uma regra geral de renovação anual do PGR.
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
        Quando aplicáveis, os programas são complementares e devem estar alinhados aos riscos da operação.
        Uma dispensa de elaboração precisa ser verificada pelos critérios da norma.
      </p>

      <h2>Quem precisa ter PGR e PCMSO?</h2>
      <p>
        Empresas com <strong>funcionários CLT</strong> devem verificar o enquadramento, considerando atividade,
        grau de risco, ambiente e exposições. Essa avaliação pode envolver:
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
        O <strong>MEI é dispensado de elaborar o PGR</strong>, inclusive quando tem empregado. ME e EPP dos graus
        de risco 1 e 2 podem ser dispensadas se o levantamento preliminar não identificar exposições a agentes
        físicos, químicos e biológicos e forem feitas as declarações digitais exigidas.
      </p>
      <p>
        A dispensa de PCMSO para MEI, ME e EPP dos graus de risco 1 e 2 também depende das declarações digitais
        e da ausência das exposições e dos riscos relacionados a fatores ergonômicos previstos na NR-1.
        <strong> Mesmo dispensada do PCMSO, a empresa deve realizar exames ocupacionais e emitir o ASO.</strong>
      </p>

      <h2>O que acontece se a empresa não tiver PGR ou PCMSO?</h2>
      <p>Quando os programas são exigidos e não são elaborados ou implementados, podem ocorrer:</p>
      <ul>
        <li><strong>Autuação fiscal</strong> — o Ministério do Trabalho pode multar a empresa durante uma fiscalização</li>
        <li><strong>Passivo trabalhista</strong> — a ausência dos documentos é argumento em reclamações na Justiça do Trabalho</li>
        <li><strong>Informações inconsistentes</strong> — a falta de avaliação dos riscos pode comprometer os registros de SST e os eventos aplicáveis no eSocial</li>
        <li><strong>Falhas no acompanhamento da saúde</strong> — exames e ASO continuam necessários mesmo nos casos de dispensa do PCMSO</li>
      </ul>

      <h2>Como obter PGR e PCMSO?</h2>
      <p>
        Ambos os documentos devem ser elaborados por <strong>profissionais habilitados</strong>: o PGR geralmente é
        desenvolvido por técnico ou engenheiro de segurança do trabalho, e o PCMSO por médico do trabalho.
      </p>
      <p>
        Para empresas de baixo risco operacional (GR1) com até 20 funcionários, a Sublime SST oferece um modelo
        digital que organiza as entregas aplicáveis, conforme os critérios de elegibilidade e a compatibilidade
        da operação com atendimento sem visita técnica presencial.
      </p>
      <p>
        Para empresas com atividades de maior risco ou porte maior, a consultoria personalizada é o caminho mais
        adequado — com análise técnica específica para o perfil da operação.
      </p>
      <h2>Fontes oficiais</h2>
      <ul>
        <li><a href="https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/pgr/principal">MTE — PGR: aplicação, dispensas e revisão</a></li>
        <li><a href="https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/perguntas-frequentes/seguranca-e-saude-no-trabalho/sou-mei-e-tenho-um">Gov.br — MEI, dispensa do PCMSO e exames ocupacionais</a></li>
      </ul>
    </ArticleLayout>
  )
}
