import type { Metadata } from 'next'
import { ArticleLayout } from '@/components/ArticleLayout'

export const metadata: Metadata = {
  title: 'NR-1 atualizada: riscos psicossociais e o que muda para sua empresa',
  description: 'A atualização da NR-1 incluiu a gestão de riscos psicossociais como obrigação das empresas. Entenda o que são, quem precisa gerenciar e o que fazer.',
  alternates: { canonical: 'https://sublimesst.com/conteudos/nr1-riscos-psicossociais' },
  openGraph: {
    title: 'NR-1 atualizada: riscos psicossociais e o que muda para sua empresa',
    description: 'Tudo sobre a atualização da NR-1 e a obrigação de gerir riscos psicossociais no trabalho.',
    type: 'article',
    publishedTime: '2026-06-19',
  },
}

export default function ArtNR1() {
  return (
    <ArticleLayout
      slug="nr1-riscos-psicossociais"
      title="NR-1 atualizada: riscos psicossociais e o que muda para sua empresa"
      description="A atualização da NR-1 incluiu a gestão de riscos psicossociais. Entenda o que são, por que importam e o que sua empresa precisa fazer."
      publishedAt="2026-06-19"
      readTime="7 min"
      category="Normas"
      cta={{
        title: 'Precisa adequar o PGR aos riscos psicossociais?',
        body: 'A Sublime SST elabora PGR atualizado conforme a NR-1, incluindo avaliação de riscos psicossociais para o perfil da sua empresa.',
        href: '/consultoria-sst',
        label: 'Solicitar Orçamento',
      }}
      related={[
        { href: '/conteudos/pgr-e-pcmso', title: 'PGR e PCMSO: o que são, para que servem e quem precisa ter', readTime: '7 min' },
        { href: '/conteudos/o-que-e-sst', title: 'O que é SST e por que sua empresa precisa se preocupar', readTime: '6 min' },
        { href: '/conteudos/esocial-e-sst', title: 'eSocial e SST: o que sua empresa precisa enviar', readTime: '8 min' },
      ]}
    >
      <h2>Resposta direta</h2>
      <p>
        Em 2024, o Ministério do Trabalho e Emprego publicou a atualização da <strong>NR-1</strong> (Disposições
        Gerais e Gerenciamento de Riscos Ocupacionais) para incluir explicitamente os <strong>riscos psicossociais</strong>
        como obrigação das empresas. A norma entrou em vigor em <strong>26 de maio de 2025</strong>. Toda empresa
        com funcionários CLT precisa incluir a avaliação de riscos psicossociais no seu PGR.
      </p>

      <h2>O que são riscos psicossociais?</h2>
      <p>
        Riscos psicossociais são fatores relacionados à organização e ao ambiente de trabalho que podem afetar a
        saúde mental e o bem-estar dos trabalhadores. Eles incluem:
      </p>
      <ul>
        <li><strong>Sobrecarga de trabalho</strong> — volume excessivo de tarefas e prazos impossíveis</li>
        <li><strong>Falta de controle</strong> — trabalhador sem autonomia sobre suas tarefas ou ritmo</li>
        <li><strong>Assédio moral e sexual</strong> — comportamentos abusivos por parte de superiores ou colegas</li>
        <li><strong>Conflitos interpessoais</strong> — ambiente de trabalho hostil ou com relações tóxicas</li>
        <li><strong>Insegurança no emprego</strong> — ameaças constantes de demissão ou instabilidade</li>
        <li><strong>Falta de suporte social</strong> — ausência de apoio da chefia ou da equipe</li>
        <li><strong>Violência no trabalho</strong> — física ou psicológica, de clientes, pacientes ou colegas</li>
      </ul>
      <p>
        Esses fatores estão associados ao surgimento de transtornos de saúde mental como burnout, depressão e ansiedade
        — condições que crescem entre as principais causas de afastamento do trabalho no Brasil.
      </p>

      <h2>O que a atualização da NR-1 exige?</h2>
      <p>
        Com a atualização, as empresas passam a ser obrigadas a:
      </p>
      <ul>
        <li><strong>Identificar os riscos psicossociais</strong> presentes no ambiente e na organização do trabalho</li>
        <li><strong>Avaliar a exposição</strong> dos trabalhadores a esses riscos</li>
        <li><strong>Implementar medidas de controle</strong> para prevenir ou reduzir o impacto dos riscos identificados</li>
        <li><strong>Incluir os riscos psicossociais no PGR</strong> da empresa</li>
        <li><strong>Monitorar e revisar</strong> as medidas adotadas periodicamente</li>
      </ul>
      <p>
        A norma não define uma metodologia única para a avaliação — as empresas têm flexibilidade para escolher
        ferramentas adequadas ao seu porte e contexto, mas a avaliação precisa ser feita e documentada.
      </p>

      <h2>Qual o impacto prático para empresas de baixo risco?</h2>
      <p>
        Muitos gestores imaginam que riscos psicossociais são relevantes apenas para hospitais, call centers ou
        indústrias de alta pressão. Mas escritórios e empresas administrativas também estão sujeitos — especialmente
        em relação à sobrecarga de trabalho, gestão inadequada e conflitos interpessoais.
      </p>
      <p>
        Para empresas GR1 (escritórios, TI, consultoria), a avaliação tende a ser mais simples: o PGR já existente
        precisa ser revisado para incluir a análise dos fatores psicossociais. Não é necessário contratar um psicólogo
        organizacional em todos os casos — mas a avaliação precisa ser feita com critério.
      </p>

      <h2>O que acontece se a empresa não se adequar?</h2>
      <p>
        A partir da vigência da norma (maio de 2025), o descumprimento pode resultar em:
      </p>
      <ul>
        <li>Autuações em fiscalizações do Ministério do Trabalho</li>
        <li>Responsabilização em casos de adoecimento mental relacionado ao trabalho</li>
        <li>Passivo trabalhista em reclamações que envolvam burnout, assédio ou outros transtornos ocupacionais</li>
      </ul>

      <h2>Por onde começar?</h2>
      <p>
        Se sua empresa já tem PGR, o próximo passo é revisá-lo com um profissional habilitado para incluir a seção
        de riscos psicossociais. Se ainda não tem PGR, a elaboração do documento já deve contemplar esse módulo.
      </p>
      <p>
        A Sublime SST oferece consultoria especializada para adequar o PGR da sua empresa à NR-1 atualizada,
        incluindo avaliação de riscos psicossociais para o perfil específico da sua operação.
      </p>
    </ArticleLayout>
  )
}
