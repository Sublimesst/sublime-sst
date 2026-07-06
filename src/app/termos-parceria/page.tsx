import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PARTNER_TERMS_VERSION } from '@/lib/pricing'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Termo de Parceria — Programa de Parceiros | Sublime SST',
  description: 'Condições do programa de parceiros da Sublime SST: comissão recorrente de 10% por indicação, regras de pagamento e vínculo de indicações.',
  alternates: { canonical: 'https://sublimesst.com/termos-parceria' },
}

const CLAUSULAS = [
  {
    titulo: '1ª — Das Partes e do Objeto',
    conteudo: `SUBLIME SEGURANCA E SAUDE OCUPACIONAL LTDA, CNPJ 65.051.167/0001-27, com sede na Av. Ataulfo de Paiva, 1235, Sala 303, Leblon, Rio de Janeiro/RJ ("SUBLIME"), e a pessoa física ou jurídica identificada no formulário de cadastro de parceiros ("PARCEIRO(A)").

Objeto: adesão ao Programa de Parceiros da Sublime SST, pelo qual o(a) PARCEIRO(A) indica potenciais clientes para os serviços da SUBLIME e é remunerado(a) por comissão sobre as contratações efetivadas, nas condições deste termo.`,
  },
  {
    titulo: '2ª — Da Indicação e do Vínculo',
    conteudo: `As indicações são vinculadas ao(à) PARCEIRO(A) por meio do link de indicação exclusivo (código de parceiro) disponibilizado após a ativação do cadastro, ou por indicação manual registrada junto à equipe da SUBLIME.

O vínculo é atribuído ao primeiro parceiro que registrar a indicação da empresa (critério de primeira indicação) e não é transferível. Empresas que já constem na base da SUBLIME como leads ou clientes não geram novo vínculo de indicação.`,
  },
  {
    titulo: '3ª — Da Comissão',
    conteudo: `Pela indicação convertida em contratação, o(a) PARCEIRO(A) fará jus a comissão de 10% (dez por cento) sobre o valor efetivamente pago pelo cliente indicado, limitada aos 12 (doze) primeiros pagamentos recorrentes de cada cliente. Esta regra se aplica tanto às contratações do produto Sublime Digital (mensalidade) quanto às contratações via Consultoria SST (valor recorrente ajustado com o cliente).

A comissão não incide sobre a taxa de implantação, sobre serviços avulsos/adicionais, nem sobre valores inadimplidos, cancelados ou estornados.

A SUBLIME poderá alterar, a seu critério, os percentuais de comissão, o número de pagamentos elegíveis e as demais condições financeiras deste programa a qualquer momento e sem aviso prévio, aplicando-se as novas condições às comissões futuras a partir da alteração — sem efeito retroativo sobre comissões já geradas.`,
  },
  {
    titulo: '4ª — Da Liberação e do Pagamento',
    conteudo: `Cada comissão fica em carência por 30 (trinta) dias após o pagamento da respectiva mensalidade, para cobertura de eventuais estornos ou cancelamentos. Havendo estorno do pagamento, a comissão correspondente é cancelada.

As comissões liberadas são pagas via PIX até o dia 10 (dez) do mês subsequente à liberação.

Para recebimento recorrente de comissões é necessário CNPJ ativo e emissão de nota fiscal correspondente aos valores a receber.`,
  },
  {
    titulo: '5ª — Do Portal do Parceiro',
    conteudo: `O(A) PARCEIRO(A) terá acesso ao Portal do Parceiro, onde acompanha suas indicações, o status de conversão e o extrato de comissões (previstas, em carência, liberadas e pagas).

O acesso é realizado por link de autenticação enviado ao e-mail cadastrado. O(A) PARCEIRO(A) é responsável por manter seu e-mail atualizado e por não compartilhar seus acessos.`,
  },
  {
    titulo: '6ª — Das Obrigações do(a) Parceiro(a)',
    conteudo: `• Indicar empresas com informações verdadeiras e com o conhecimento da empresa indicada;
• Não prometer, em nome da SUBLIME, condições, prazos ou escopos diferentes dos divulgados oficialmente;
• Não se apresentar como empregado(a), representante legal ou preposto(a) da SUBLIME;
• Utilizar os materiais de divulgação disponibilizados ou conteúdos compatíveis com eles;
• Não praticar spam, publicidade enganosa ou abordagens que violem a legislação (incluindo LGPD).`,
  },
  {
    titulo: '7ª — Da Natureza da Relação',
    conteudo: `Este termo não cria vínculo empregatício, societário, de representação comercial (Lei nº 4.886/65) ou de exclusividade entre as partes. O(A) PARCEIRO(A) atua por conta própria, sem subordinação, podendo indicar clientes para terceiros e cessar as indicações a qualquer momento.`,
  },
  {
    titulo: '8ª — Da Vigência e do Encerramento',
    conteudo: `A parceria vigora por prazo indeterminado a partir da ativação do cadastro e pode ser encerrada por qualquer das partes, a qualquer momento, mediante comunicação simples.

Encerrada a parceria, as comissões já geradas sobre mensalidades pagas até a data do encerramento permanecem devidas, observadas a carência e as condições deste termo. Não são geradas novas comissões após o encerramento.

A SUBLIME poderá suspender ou encerrar a parceria em caso de violação das obrigações da Cláusula 6ª, sem prejuízo das comissões legitimamente devidas até então.`,
  },
  {
    titulo: '9ª — Da Proteção de Dados (LGPD)',
    conteudo: `As partes se comprometem a tratar os dados pessoais envolvidos na parceria (dados do parceiro e das empresas indicadas) em conformidade com a Lei nº 13.709/2018, exclusivamente para as finalidades deste termo.

O(A) PARCEIRO(A) declara ter base adequada para compartilhar os dados de contato das empresas que indicar (conhecimento/consentimento do indicado).`,
  },
  {
    titulo: '10ª — Das Alterações do Programa',
    conteudo: `A SUBLIME poderá atualizar as condições do programa (percentuais de comissão, prazos, regras de elegibilidade e demais termos) a qualquer momento e sem aviso prévio, conforme previsto na Cláusula 3ª. As alterações não têm efeito retroativo sobre comissões já geradas e passam a valer para as indicações e pagamentos futuros a partir da publicação da nova versão neste Termo. A continuidade das indicações após a alteração implica concordância com as novas condições.`,
  },
  {
    titulo: '11ª — Da Aceitação Eletrônica e do Foro',
    conteudo: `Este termo é aceito eletronicamente no formulário de cadastro de parceiros, com registro de data, hora e endereço IP, nos termos do art. 10 da MP nº 2.200-2/2001 e da Lei nº 12.965/2014.

Fica eleito o foro da Comarca da Capital do Estado do Rio de Janeiro para dirimir controvérsias oriundas deste termo.`,
  },
]

export default function TermosParceriaPage() {
  return (
    <>
      <Navbar />
      <main className="py-16 px-6">
        <div className="max-w-[760px] mx-auto">
          <h1 className="font-display text-4xl text-gray-900 mb-2">Termo de Parceria</h1>
          <p className="text-[13px] text-gray-500 pb-6 mb-6 border-b border-gray-200">
            Versão {PARTNER_TERMS_VERSION} · Programa de Parceiros Sublime SST
          </p>

          <div className="bg-amber-50 border border-amber-300 rounded-[10px] px-5 py-4 mb-8 text-[13px] text-amber-800">
            ⚠️ Versão provisória sujeita a revisão jurídica. As condições aqui descritas são
            vinculantes para as partes que aceitaram o termo eletronicamente.
          </div>

          <div className="space-y-8">
            {CLAUSULAS.map(({ titulo, conteudo }) => (
              <div key={titulo}>
                <h2 className="text-[1rem] font-bold text-gray-900 mb-3">Cláusula {titulo}</h2>
                {conteudo.split('\n').map((line, i) =>
                  line.trim() ? (
                    <p key={i} className="text-[14px] text-gray-600 leading-relaxed mb-2">{line}</p>
                  ) : <br key={i} />
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 pt-6 border-t border-gray-200 space-y-1">
            <p className="text-[13px] text-gray-500 font-semibold">SUBLIME SEGURANCA E SAUDE OCUPACIONAL LTDA</p>
            <p className="text-[13px] text-gray-400">CNPJ 65.051.167/0001-27 · Av. Ataulfo de Paiva, 1235, Sala 303 — Leblon, Rio de Janeiro/RJ</p>
            <p className="text-[13px] text-gray-400">contato@sublimesst.com · (21) 99724-8630</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
