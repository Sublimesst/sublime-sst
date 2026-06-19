import type { Metadata } from 'next'
import { ArticleLayout } from '@/components/ArticleLayout'

export const metadata: Metadata = {
  title: 'eSocial e SST: o que sua empresa precisa enviar e quais são os prazos',
  description: 'O módulo de SST do eSocial é obrigatório. Saiba quais eventos precisam ser enviados, quando e o que acontece se a empresa não enviar ou enviar errado.',
  alternates: { canonical: 'https://sublimesst.com/conteudos/esocial-e-sst' },
  openGraph: {
    title: 'eSocial e SST: o que sua empresa precisa enviar e quais são os prazos',
    description: 'Guia completo sobre o módulo de SST do eSocial para empresas brasileiras.',
    type: 'article',
    publishedTime: '2026-06-19',
  },
}

export default function ArtEsocial() {
  return (
    <ArticleLayout
      slug="esocial-e-sst"
      title="eSocial e SST: o que sua empresa precisa enviar e quais são os prazos"
      description="O módulo de SST do eSocial é obrigatório. Saiba quais eventos precisam ser enviados, quando e o que acontece se não enviar."
      publishedAt="2026-06-19"
      readTime="8 min"
      category="eSocial"
      cta={{
        title: 'Regularize o SST da sua empresa e evite pendências no eSocial',
        body: 'Sem PGR e PCMSO, sua empresa não consegue enviar corretamente os eventos de SST. A Sublime SST organiza sua documentação e orienta sobre os envios.',
        href: '/elegibilidade',
        label: 'Verificar Elegibilidade',
      }}
      related={[
        { href: '/conteudos/pgr-e-pcmso', title: 'PGR e PCMSO: o que são, para que servem e quem precisa ter', readTime: '7 min' },
        { href: '/conteudos/o-que-e-sst', title: 'O que é SST e por que sua empresa precisa se preocupar', readTime: '6 min' },
        { href: '/conteudos/nr1-riscos-psicossociais', title: 'NR-1 atualizada: riscos psicossociais e o que muda', readTime: '7 min' },
      ]}
    >
      <h2>Resposta direta</h2>
      <p>
        O <strong>eSocial</strong> é o sistema do governo federal que centraliza o envio de informações trabalhistas,
        previdenciárias e fiscais. O módulo de SST dentro do eSocial tornou-se obrigatório e exige que as empresas
        enviem eventos relacionados à saúde dos trabalhadores — como ASOs, CATs e monitoramento de saúde.
        Sem os documentos de SST em dia, esses eventos não podem ser enviados corretamente.
      </p>

      <h2>Qual é a relação entre eSocial e SST?</h2>
      <p>
        O eSocial tem um grupo de eventos dedicado à SST, chamado <strong>Grupo S — Segurança e Saúde no Trabalho</strong>.
        Por meio desses eventos, as empresas comunicam ao governo as condições de saúde dos seus trabalhadores.
      </p>
      <p>
        O ponto crítico é que esses eventos só podem ser enviados corretamente se a empresa tiver <strong>PGR e PCMSO
        elaborados</strong>. Sem esses documentos, as informações enviadas ao eSocial estarão incompletas ou inconsistentes —
        o que pode gerar pendências e inconsistências nos registros do INSS.
      </p>

      <h2>Quais são os principais eventos de SST no eSocial?</h2>
      <ul>
        <li>
          <strong>S-2220 — Monitoramento da Saúde do Trabalhador</strong><br />
          Registra o resultado dos exames médicos periódicos (ASOs) de cada funcionário. É o evento mais frequente
          do grupo de SST.
        </li>
        <li>
          <strong>S-2210 — Comunicação de Acidente de Trabalho (CAT)</strong><br />
          Deve ser enviado sempre que ocorrer um acidente de trabalho ou doença ocupacional. Prazo: até o primeiro
          dia útil após o acidente. Em caso de óbito, o envio é imediato.
        </li>
        <li>
          <strong>S-2240 — Condições Ambientais do Trabalho</strong><br />
          Informa sobre a exposição dos trabalhadores a agentes nocivos (físicos, químicos, biológicos). É a base para
          o cálculo da aposentadoria especial e o LTCAT.
        </li>
        <li>
          <strong>S-1060 — Tabela de Ambientes de Trabalho</strong><br />
          Cadastra os ambientes onde os trabalhadores atuam, vinculados ao PGR da empresa.
        </li>
      </ul>

      <h2>Quem é obrigado a enviar os eventos de SST?</h2>
      <p>
        Toda empresa com funcionários CLT está obrigada a enviar os eventos de SST no eSocial. O calendário de
        obrigatoriedade foi escalonado por porte de empresa, mas desde 2023 todas as categorias de empregadores
        já foram incluídas — incluindo microempresas e MEI com funcionários.
      </p>

      <h2>Quais são os prazos?</h2>
      <ul>
        <li><strong>S-2220 (ASO)</strong> — deve ser enviado até o dia 15 do mês seguinte à realização do exame</li>
        <li><strong>S-2210 (CAT)</strong> — até o primeiro dia útil após o acidente (ou imediatamente em caso de óbito)</li>
        <li><strong>S-2240 (Condições ambientais)</strong> — deve ser mantido atualizado; qualquer alteração nas condições exige novo envio</li>
        <li><strong>S-1060 (Ambientes)</strong> — antes do envio de qualquer outro evento de SST</li>
      </ul>

      <h2>O que acontece se a empresa não enviar ou enviar errado?</h2>
      <p>
        O não envio ou envio incorreto dos eventos de SST pode gerar:
      </p>
      <ul>
        <li><strong>Pendências no INSS</strong> — especialmente no que diz respeito ao histórico de exposição a riscos</li>
        <li><strong>Dificuldades na homologação de demissões</strong> — sem os ASOs devidamente registrados, o processo trabalhista fica incompleto</li>
        <li><strong>Passivo trabalhista</strong> — histórico de saúde incompleto pode ser usado contra a empresa em litígios</li>
        <li><strong>Inconsistências na folha de pagamento</strong> — o eSocial cruza informações, e inconsistências na parte de SST podem impactar outros módulos</li>
      </ul>

      <h2>Como regularizar o SST para atender ao eSocial?</h2>
      <p>O passo a passo é:</p>
      <ul>
        <li>Elaborar o PGR da empresa (com profissional habilitado)</li>
        <li>Elaborar o PCMSO e definir o calendário de exames</li>
        <li>Cadastrar os ambientes de trabalho no eSocial (S-1060)</li>
        <li>Enviar o S-2240 com as condições ambientais</li>
        <li>Garantir que cada ASO dos funcionários seja enviado pelo evento S-2220 dentro do prazo</li>
      </ul>
      <p>
        Para empresas de baixo risco com até 20 funcionários, a Sublime SST organiza toda essa estrutura de forma
        digital — com a documentação adequada e orientação sobre os envios no eSocial.
      </p>
    </ArticleLayout>
  )
}
