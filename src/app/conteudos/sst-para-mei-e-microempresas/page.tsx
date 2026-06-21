import type { Metadata } from 'next'
import { ArticleLayout } from '@/components/ArticleLayout'

export const metadata: Metadata = {
  title: 'SST para MEI e microempresas: o que é obrigatório e o que é opcional',
  description: 'MEI com funcionário precisa de PGR? E a microempresa com 2 CLTs? Esclareça as dúvidas mais comuns sobre SST para pequenos negócios brasileiros.',
  alternates: { canonical: 'https://sublimesst.com/conteudos/sst-para-mei-e-microempresas' },
  openGraph: {
    title: 'SST para MEI e microempresas: o que é obrigatório e o que é opcional',
    description: 'Guia completo de SST para microempreendedores individuais e microempresas no Brasil.',
    type: 'article',
    publishedTime: '2026-06-19',
  },
}

export default function ArtMei() {
  return (
    <ArticleLayout
      slug="sst-para-mei-e-microempresas"
      title="SST para MEI e microempresas: o que é obrigatório e o que é opcional"
      description="MEI precisa de PGR? E a microempresa com 3 funcionários? Esclareça as dúvidas mais comuns sobre SST para pequenos negócios."
      publishedAt="2026-06-19"
      readTime="5 min"
      category="MEI e ME"
      cta={{
        title: 'Tem funcionários? Descubra o que sua empresa precisa',
        body: 'Faça o teste gratuito e veja se sua empresa se enquadra no modelo digital — simples, digital e com assinatura anual a partir de R$ 142/mês.',
        href: '/elegibilidade',
        label: 'Verificar Elegibilidade',
      }}
      related={[
        { href: '/conteudos/pgr-e-pcmso', title: 'PGR e PCMSO: o que são, para que servem e quem precisa ter', readTime: '7 min' },
        { href: '/conteudos/sst-para-baixo-risco', title: 'SST para empresas de baixo risco: o que é obrigatório', readTime: '6 min' },
        { href: '/conteudos/esocial-e-sst', title: 'eSocial e SST: o que sua empresa precisa enviar', readTime: '8 min' },
      ]}
    >
      <h2>Resposta direta</h2>
      <p>
        <strong>MEI sem funcionários não tem obrigações de SST.</strong> Mas MEI que contrata um empregado passa
        a ter. E toda microempresa (ME) com pelo menos um funcionário CLT é obrigada a ter PGR, PCMSO e cumprir
        as demais exigências da legislação trabalhista. Não existe isenção por tamanho para quem tem trabalhador contratado.
      </p>

      <h2>MEI precisa de SST?</h2>
      <p>
        O MEI (Microempreendedor Individual) pode contratar <strong>um único funcionário</strong> com salário mínimo
        ou piso da categoria. A partir do momento em que essa contratação ocorre, o MEI passa a ter <strong>todas
        as obrigações trabalhistas de um empregador</strong> — incluindo SST.
      </p>
      <p>
        Isso significa:
      </p>
      <ul>
        <li>PGR obrigatório (conforme NR-1)</li>
        <li>PCMSO obrigatório (conforme NR-7)</li>
        <li>ASO na admissão, periódico e na demissão do funcionário</li>
        <li>Registro no eSocial, incluindo eventos de SST</li>
      </ul>
      <p>
        <strong>MEI sem funcionários</strong> não tem essas obrigações — a legislação de SST é dirigida ao vínculo
        empregatício, e sem funcionários CLT não há exigência.
      </p>

      <h2>Microempresa com 1, 2 ou 3 funcionários precisa de SST?</h2>
      <p>
        Sim. Não existe limite mínimo de funcionários para a obrigatoriedade de SST. Uma microempresa com 1 CLT
        já precisa de PGR e PCMSO.
      </p>
      <p>
        A boa notícia é que para empresas de baixo risco operacional (GR1), a estrutura de SST é mais simples:
        o PGR tende a ser mais enxuto, o PCMSO define exames básicos e a documentação pode ser gerenciada
        de forma digital, sem necessidade de visitas técnicas presenciais na maioria dos casos.
      </p>

      <h2>O que é opcional para MEI e microempresas?</h2>
      <p>
        Para empresas de baixo risco e com poucos funcionários, geralmente estão dispensadas:
      </p>
      <ul>
        <li><strong>CIPA</strong> — obrigatória apenas a partir de determinado número de funcionários por setor de risco</li>
        <li><strong>LTCAT</strong> — necessário apenas quando há exposição a agentes nocivos</li>
        <li><strong>Laudos de insalubridade/periculosidade</strong> — somente quando há exposição a agentes específicos</li>
        <li><strong>Treinamentos presenciais de NRs específicas</strong> — quando as atividades não envolvem os riscos cobertos (trabalho em altura, eletricidade, etc.)</li>
      </ul>

      <h2>Quanto custa a SST para uma microempresa?</h2>
      <p>
        O custo varia conforme o perfil da empresa, o número de funcionários e o tipo de serviço contratado.
        Para microempresas de baixo risco, a Sublime SST oferece planos mensais a partir de <strong>R$ 142/mês</strong>
        (para empresas com até 5 funcionários) — com PGR, PCMSO, organização documental e suporte incluídos.
      </p>
      <p>
        O modelo digital é especialmente adequado para escritórios pequenos, consultorias e empresas administrativas
        GR1 que precisam de uma solução simples, previsível e sem a burocracia de contratar vários fornecedores.
      </p>

      <h2>Qual o risco de não regularizar?</h2>
      <p>
        Mesmo para MEI com um único funcionário, as consequências de não ter SST em dia são reais:
      </p>
      <ul>
        <li>Autuações em fiscalizações trabalhistas</li>
        <li>Passivo em reclamações trabalhistas — a falta de ASO é frequentemente usada como argumento</li>
        <li>Pendências no eSocial que afetam a regularidade perante o INSS</li>
        <li>Responsabilização em caso de acidente, mesmo sendo um empregador de pequeno porte</li>
      </ul>
      <p>
        O tamanho da empresa não elimina a responsabilidade do empregador — mas simplifica a estrutura necessária
        para cumpri-la adequadamente.
      </p>
    </ArticleLayout>
  )
}
