import type { Metadata } from 'next'
import Link from 'next/link'
import { ArticleLayout } from '@/components/ArticleLayout'

const PUBLICATION_DATE = '2026-09-08'
const SLUG = 'empresa-contratou-funcionario-obrigacoes-sst'
const URL = `https://www.sublimesst.com/conteudos/${SLUG}`
const TITLE = 'Contratei um funcionário: o que fazer na SST?'
const DESCRIPTION = 'Contratou um funcionário? Veja o que verificar em SST, quando pode haver dispensas e como organizar exames, documentos e eSocial com tranquilidade.'
const PILOT_CTA = '/elegibilidade?utm_source=organic&utm_medium=content&utm_campaign=primeiro-funcionario-sst&utm_content=cta-principal'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: {
    title: TITLE, description: DESCRIPTION, url: URL, type: 'article',
    publishedTime: PUBLICATION_DATE, modifiedTime: PUBLICATION_DATE,
    images: [{ url: 'https://www.sublimesst.com/og-image.jpg', width: 1200, height: 630, alt: 'Sublime SST' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

export default function PrimeiroFuncionarioArticle() {
  return (
    <ArticleLayout
      slug={SLUG}
      title="Contratei um funcionário. E agora, o que preciso organizar em SST?"
      description={DESCRIPTION}
      publishedAt={PUBLICATION_DATE}
      updatedAt={PUBLICATION_DATE}
      readTime="8 min"
      category="Primeiro funcionário"
      reviewedBy={{ name: 'Ariane', jobTitle: 'Técnica em Segurança do Trabalho' }}
      related={[
        { href: '/conteudos/pgr-e-pcmso', title: 'PGR e PCMSO: o que são, para que servem e quem precisa ter', readTime: '7 min' },
        { href: '/conteudos/esocial-e-sst', title: 'eSocial e SST: o que sua empresa precisa enviar', readTime: '8 min' },
      ]}
    >
      <div className="text-gray-600 leading-relaxed [&_p]:my-4 [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-gray-900 [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:font-bold [&_h3]:text-lg [&_h3]:text-gray-900 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-2 [&_strong]:text-gray-900">
        <p>Contratar um funcionário é um passo importante para qualquer empresa — e também traz alguns cuidados de Saúde e Segurança do Trabalho que precisam ser verificados desde o início.</p>
        <p>Em geral, a empresa deve avaliar o exame admissional e o ASO, as informações de SST que podem precisar ser enviadas ao eSocial e a aplicação de documentos como PGR e PCMSO. <strong>Mas nem toda empresa tem exatamente as mesmas obrigações.</strong> O enquadramento depende da atividade, do grau de risco, do ambiente, da função exercida e das exposições ocupacionais existentes.</p>
        <p>O melhor primeiro passo, portanto, não é comprar uma lista pronta de documentos. É entender o perfil da sua operação e organizar apenas o que realmente se aplica ao seu caso.</p>
        <blockquote className="border-l-4 border-teal pl-5 my-6"><strong>Em resumo:</strong> antes de o funcionário iniciar as atividades, verifique o exame admissional; identifique os riscos ligados à função e ao ambiente; confirme se PGR e PCMSO são aplicáveis ou se existe alguma dispensa condicionada; e defina quem cuidará das informações de SST no eSocial.</blockquote>
        <p><Link href={PILOT_CTA} className="btn btn-primary">Verificar o perfil da minha empresa</Link></p>
        <h2>1. Comece pelo perfil real da empresa</h2>
        <p>O CNPJ, sozinho, não conta toda a história. Para entender o que precisa ser organizado, é importante considerar:</p>
        <ul>
        <li>a atividade efetivamente realizada;</li>
        <li>a função do funcionário;</li>
        <li>o local e a forma de trabalho;</li>
        <li>a presença de agentes físicos, químicos ou biológicos;</li>
        <li>os fatores ergonômicos;</li>
        <li>máquinas, equipamentos ou atividades específicas;</li>
        <li>a necessidade de visita técnica;</li>
        <li>o porte e o grau de risco da empresa.</li>
        </ul>
        <p>Essa avaliação evita dois problemas comuns: deixar de cumprir uma obrigação aplicável ou contratar documentos e serviços sem necessidade.</p>
        <h2>2. O exame admissional deve entrar no planejamento antes do início do trabalho</h2>
        <p>A NR-7 estabelece que o exame clínico admissional deve ser realizado antes de o empregado assumir suas atividades. Para cada exame clínico ocupacional, o médico emite o Atestado de Saúde Ocupacional, o ASO.<a href="https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-07-atualizada-2022-1.pdf" className="text-petrol underline">[1]</a></p>
        <p>O exame não deve ser tratado apenas como uma formalidade. Ele relaciona a condição de saúde do trabalhador à função que será exercida e aos riscos ocupacionais que precisam ser considerados.</p>
        <p>Ao organizar a admissão, confirme:</p>
        <ul>
        <li>qual é a função e quais atividades serão realizadas;</li>
        <li>quais informações o serviço de saúde ocupacional precisa receber;</li>
        <li>onde o exame será feito;</li>
        <li>se há exames complementares indicados para os riscos identificados;</li>
        <li>como o ASO e as informações necessárias serão armazenados e acompanhados.</li>
        </ul>
        <aside className="my-6 rounded-brand border border-teal p-5 bg-teal-pale">
        <p><strong>Mesmo quando a empresa está dispensada de elaborar o PCMSO, os exames ocupacionais e a emissão do ASO não desaparecem.</strong> A própria NR-7 mantém essa obrigação para MEI, ME e EPP enquadrados nas condições de dispensa.</p>
        </aside>
        <h2>3. PGR e PCMSO: pode haver dispensa, mas ela não deve ser presumida</h2>
        <p>O Programa de Gerenciamento de Riscos, PGR, organiza o gerenciamento dos riscos ocupacionais da empresa. Como regra geral, empregadores com trabalhadores contratados pela CLT devem verificar essa obrigação. A NR-1, porém, prevê exceções.<a href="https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/pgr/principal" className="text-petrol underline">[2]</a></p>
        <p>O MEI é dispensado de elaborar o PGR. Já microempresas e empresas de pequeno porte dos graus de risco 1 e 2 podem ser dispensadas quando o levantamento preliminar não identifica exposições ocupacionais a agentes físicos, químicos e biológicos e as declarações digitais exigidas são realizadas.<a href="https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/pgr/principal" className="text-petrol underline">[2]</a></p>
        <p>Também pode haver dispensa de elaboração do PCMSO para MEI, ME e EPP dos graus de risco 1 e 2 quando as condições previstas na NR-1 são atendidas, incluindo a ausência das exposições e dos fatores de risco ergonômicos indicados pela norma. Ainda assim, a empresa deve realizar os exames ocupacionais e emitir o ASO.<a href="https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/perguntas-frequentes/seguranca-e-saude-no-trabalho/sou-mei-e-tenho-um" className="text-petrol underline">[3]</a></p>
        <p>Na prática, isso significa que frases como “empresa pequena não precisa de SST” ou “todo CNPJ com funcionário precisa dos mesmos laudos” são simplificações perigosas. A resposta correta depende da avaliação do caso.</p>
        <h2>4. Entenda quais informações de SST aparecem no eSocial</h2>
        <p>Os principais eventos de SST no eSocial são:</p>
        <ul>
        <li><strong>S-2210 — Comunicação de Acidente de Trabalho:</strong> utilizado para o envio da CAT;</li>
        <li><strong>S-2220 — Monitoramento da Saúde do Trabalhador:</strong> reúne informações relacionadas ao ASO e aos exames ocupacionais;</li>
        <li><strong>S-2240 — Condições Ambientais do Trabalho — Agentes Nocivos:</strong> registra informações sobre a exposição do trabalhador aos agentes nocivos previstos no sistema.<a href="https://www.gov.br/esocial/pt-br/empresas/manual-web-geral" className="text-petrol underline">[4]</a></li>
        </ul>
        <p>A responsabilidade pelo envio é da empresa, mas a operação pode ser delegada a terceiros por procuração eletrônica com o perfil adequado. Por isso, contador, empresa e prestador de SST precisam combinar com clareza quem produz as informações técnicas, quem transmite os eventos e quem acompanha as atualizações.<a href="https://www.gov.br/esocial/pt-br/empresas/perguntas-frequentes/perguntas-frequentes-producao-empresas-e-ambiente-de-testes/" className="text-petrol underline">[5]</a></p>
        <p>O objetivo não é fazer o empresário decorar códigos do eSocial. É garantir que as informações corretas sejam produzidas, enviadas e mantidas de forma organizada.</p>
        <h2>5. Checklist prático para a contratação</h2>
        <p>Use esta lista como ponto de partida:</p>
        <ul>
        <li>Confirmar a atividade da empresa, o local de trabalho e a função do empregado.</li>
        <li>Identificar riscos e características específicas da operação.</li>
        <li>Providenciar o exame admissional antes do início das atividades.</li>
        <li>Receber e organizar o ASO.</li>
        <li>Verificar se PGR e PCMSO são aplicáveis ou se a empresa atende às condições formais de dispensa.</li>
        <li>Confirmar se há outras obrigações técnicas ligadas à atividade ou ao ambiente.</li>
        <li>Definir quem produzirá e quem enviará as informações de SST ao eSocial.</li>
        <li>Manter dados, documentos e mudanças da operação atualizados.</li>
        <li>Programar o acompanhamento dos próximos exames e eventos.</li>
        </ul>
        <p>Essa lista não substitui a análise técnica. Ela ajuda a empresa a fazer as perguntas certas antes de começar.</p>
        <h2>6. E se a empresa for MEI e tiver um empregado?</h2>
        <p>O MEI é dispensado de elaborar o PGR, mas isso não significa ausência total de cuidados com SST. Quando o MEI atende às condições previstas para dispensa do PCMSO, ainda precisa realizar e custear os exames ocupacionais e manter o ASO correspondente.<a href="https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/perguntas-frequentes/seguranca-e-saude-no-trabalho/sou-mei-e-tenho-um" className="text-petrol underline">[3]</a></p>
        <p>A função exercida, o ambiente e as exposições continuam sendo relevantes. Por isso, o enquadramento deve ser confirmado antes de decidir quais entregas são necessárias.</p>
        <h2>7. A Sublime pode cuidar dessa organização para você</h2>
        <p>A Sublime foi desenhada para tirar o peso operacional da SST das mãos do empresário.</p>
        <p>Em vez de entregar apenas um sistema ou uma lista de documentos, cuidamos da organização, das informações, dos documentos e do acompanhamento necessário para que você siga focado no seu negócio com mais tranquilidade.</p>
        <p><strong>Você cuida do seu negócio. A Sublime cuida da SST.</strong></p>
        <h3>Para empresas compatíveis com o modelo digital</h3>
        <p>A Sublime Digital atende empresas em todo o Brasil quando a operação pode ser conduzida sem visita presencial e se enquadra nos critérios do serviço.</p>
        <p>O teste de elegibilidade já existente ajuda a identificar o caminho adequado para sua empresa.</p>
        <p><Link href={PILOT_CTA} className="btn btn-primary">Verificar o perfil da minha empresa</Link></p>
        <h3>Para demandas presenciais ou de maior complexidade</h3>
        <p>Quando o caso exige visita, avaliação personalizada ou uma solução mais complexa, a Sublime Consultoria oferece atendimento sob medida, com foco principal no Rio de Janeiro.</p>
        <p><Link href="/consultoria-sst" className="text-petrol underline">Falar sobre atendimento personalizado</Link></p>
        <h2>Perguntas frequentes</h2>
        <h3>Toda empresa que contrata um funcionário precisa de PGR e PCMSO?</h3>
        <p>Não necessariamente da mesma forma. O PGR é uma obrigação geral para empregadores com trabalhadores CLT, mas a NR-1 prevê dispensas para MEI e, sob condições específicas, para ME e EPP dos graus de risco 1 e 2. O PCMSO também pode ter dispensa condicionada. É necessário avaliar atividade, grau de risco, exposições e declarações aplicáveis antes de concluir.</p>
        <h3>Se a empresa estiver dispensada do PCMSO, ainda precisa fazer exame admissional?</h3>
        <p>Sim. A dispensa do PCMSO não elimina a realização dos exames médicos ocupacionais nem a emissão do ASO. O exame clínico admissional deve ocorrer antes de o empregado assumir as atividades.<a href="https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-07-atualizada-2022-1.pdf" className="text-petrol underline">[1]</a></p>
        <h3>O contador pode enviar os eventos de SST?</h3>
        <p>A empresa é responsável pela transmissão, mas pode delegar o envio a terceiros por procuração eletrônica. A origem e a fidelidade das informações técnicas precisam ser preservadas. O ideal é definir claramente o papel da empresa, do contador e do prestador de SST.<a href="https://www.gov.br/esocial/pt-br/empresas/perguntas-frequentes/perguntas-frequentes-producao-empresas-e-ambiente-de-testes/" className="text-petrol underline">[5]</a></p>
        <h3>A Sublime Digital atende fora do Rio de Janeiro?</h3>
        <p>Sim. A Sublime Digital tem alcance nacional para empresas compatíveis com o atendimento digital e que não exijam visita presencial. Demandas presenciais ou de maior complexidade seguem para análise da Consultoria, cuja atuação prioritária é no Rio de Janeiro.</p>
        <h3>Preciso entender todas essas regras antes de contratar a Sublime?</h3>
        <p>Não. A proposta da Sublime é justamente ajudar a identificar o que se aplica e cuidar da organização da SST. O teste inicial serve para entender o perfil da empresa e indicar o caminho adequado.</p>
        <h2>Fechamento</h2>
        <p>Contratar um funcionário não precisa transformar a SST em mais uma preocupação difícil de administrar.</p>
        <p>Com o enquadramento correto, os exames organizados, os documentos aplicáveis e as responsabilidades bem definidas, sua empresa pode seguir essa etapa com mais segurança e tranquilidade.</p>
        <p><Link href={PILOT_CTA} className="btn btn-primary">Verificar o perfil da minha empresa</Link></p>
        <p><strong>Para contadores:</strong> quer uma forma simples de orientar e encaminhar seus clientes? <Link href="/parceiros?utm_source=organic&amp;utm_medium=content&amp;utm_campaign=primeiro-funcionario-sst&amp;utm_content=cta-contador" className="text-petrol underline">Sou contador e quero orientar um cliente</Link></p>
      </div>
    </ArticleLayout>
  )
}
