import type { Metadata } from 'next'
import { ArticleLayout } from '@/components/ArticleLayout'

export const metadata: Metadata = {
  title: 'eSocial e SST: o que sua empresa precisa enviar e quais são os prazos',
  description: 'O módulo de SST do eSocial é obrigatório. Saiba quais eventos precisam ser enviados, quando e o que acontece se a empresa não enviar ou enviar errado.',
  alternates: { canonical: 'https://www.sublimesst.com/conteudos/esocial-e-sst' },
  openGraph: {
    title: 'eSocial e SST: o que sua empresa precisa enviar e quais são os prazos',
    description: 'Guia completo sobre o módulo de SST do eSocial para empresas brasileiras.',
    type: 'article',
    publishedTime: '2026-06-19',
    modifiedTime: '2026-09-08',
  },
}

export default function ArtEsocial() {
  return (
    <ArticleLayout
      slug="esocial-e-sst"
      title="eSocial e SST: o que sua empresa precisa enviar e quais são os prazos"
      description="O módulo de SST do eSocial é obrigatório. Saiba quais eventos precisam ser enviados, quando e o que acontece se não enviar."
      publishedAt="2026-06-19"
      updatedAt="2026-09-08"
      readTime="8 min"
      category="eSocial"
      cta={{
        title: 'Regularize o SST da sua empresa e evite pendências no eSocial',
        body: 'A Sublime SST verifica as entregas aplicáveis, organiza as informações técnicas e orienta sobre os envios ao eSocial.',
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
        Os eventos aplicáveis precisam de informações técnicas corretas e atualizadas.
      </p>

      <h2>Qual é a relação entre eSocial e SST?</h2>
      <p>
        O eSocial tem eventos dedicados à <strong>Segurança e Saúde no Trabalho</strong>.
        Por meio desses eventos, as empresas comunicam ao governo as condições de saúde dos seus trabalhadores.
      </p>
      <p>
        PGR e PCMSO devem ser avaliados conforme a aplicação e as dispensas previstas nas NR-1 e NR-7.
        A dispensa de um programa não elimina os exames ocupacionais, o ASO ou os eventos de SST aplicáveis.
        O envio deve se apoiar nas informações técnicas exigidas para cada evento.
      </p>

      <h2>Quais são os principais eventos de SST no eSocial?</h2>
      <ul>
        <li>
          <strong>S-2220 — Monitoramento da Saúde do Trabalhador</strong><br />
          Registra informações do ASO e dos exames ocupacionais, incluindo o admissional e os demais exames
          abrangidos pelo evento. Não corresponde ao envio do prontuário médico completo.
        </li>
        <li>
          <strong>S-2210 — Comunicação de Acidente de Trabalho (CAT)</strong><br />
          Deve ser enviado sempre que ocorrer um acidente de trabalho ou doença ocupacional. Prazo: até o primeiro
          dia útil após o acidente. Em caso de óbito, o envio é imediato.
        </li>
        <li>
          <strong>S-2240 — Condições Ambientais do Trabalho — Agentes Nocivos</strong><br />
          Informa as condições de trabalho e a exposição aos agentes nocivos previstos na Tabela 24 do eSocial,
          compondo o PPP eletrônico. As informações devem ter suporte técnico, incluindo o LTCAT quando exigido;
          o evento não substitui o laudo.
        </li>
      </ul>

      <h2>Quem é obrigado a enviar os eventos de SST?</h2>
      <p>
        Empregadores, inclusive MEI com empregado, devem verificar os eventos exigidos conforme o vínculo,
        o regime previdenciário e a situação que gera cada informação. Nem todos os eventos são enviados
        em todas as situações: a CAT, por exemplo, depende da ocorrência correspondente.
      </p>
      <p>
        A responsabilidade pelo envio é da empresa. A transmissão pode ser delegada a terceiros por
        procuração eletrônica com o perfil adequado. Empresa, contador e prestador de SST devem combinar
        quem produz as informações técnicas, quem transmite e quem acompanha os recibos e as atualizações.
      </p>

      <h2>Quais são os prazos?</h2>
      <ul>
        <li><strong>S-2220 (ASO)</strong> — deve ser enviado até o dia 15 do mês seguinte à realização do exame</li>
        <li><strong>S-2210 (CAT)</strong> — até o primeiro dia útil após o acidente (ou imediatamente em caso de óbito)</li>
        <li><strong>S-2240 (Condições ambientais)</strong> — até o dia 15 do mês seguinte à admissão ou ao início da obrigatoriedade; alterações devem ser informadas até o dia 15 do mês seguinte à mudança</li>
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
        <li>Verificar a aplicação ou dispensa condicionada de PGR e PCMSO</li>
        <li>Organizar os exames ocupacionais e as informações técnicas da operação</li>
        <li>Definir o responsável pela transmissão e a procuração necessária</li>
        <li>Enviar o S-2240 com as condições ambientais, conforme a obrigação aplicável</li>
        <li>Garantir que cada ASO dos funcionários seja enviado pelo evento S-2220 dentro do prazo</li>
      </ul>
      <p>
        Para empresas de baixo risco com até 20 funcionários, a Sublime SST organiza toda essa estrutura de forma
        digital — com a documentação adequada e orientação sobre os envios no eSocial.
      </p>
      <h2>Fontes oficiais</h2>
      <ul>
        <li><a href="https://www.gov.br/esocial/pt-br/empresas/manual-web-geral">eSocial — Manual Web Geral: eventos de SST e prazos</a></li>
        <li><a href="https://www.gov.br/esocial/pt-br/empresas/perguntas-frequentes/perguntas-frequentes-producao-empresas-e-ambiente-de-testes/">eSocial — Perguntas frequentes: responsabilidade e procuração</a></li>
        <li><a href="https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/pgr/principal">MTE — Aplicação e dispensas do PGR</a></li>
      </ul>
    </ArticleLayout>
  )
}
