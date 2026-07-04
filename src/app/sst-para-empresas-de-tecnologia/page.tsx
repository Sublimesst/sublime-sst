import type { Metadata } from 'next'
import { NichoLandingPage } from '@/components/NichoLandingPage'
import type { NichoConfig } from '@/components/NichoLandingPage'

export const metadata: Metadata = {
  title: 'SST para Empresas de Tecnologia | Sublime SST',
  description: 'SST digital para empresas de TI, desenvolvimento de software e consultoria. Regularize suas obrigações de forma simples, sem burocracia presencial.',
}

const config: NichoConfig = {
  badge: 'Para empresas de tecnologia',
  headline: 'SST digital para empresas de tecnologia.',
  subtitle: 'Sua empresa de TI tem funcionários? Organize suas obrigações de Segurança e Saúde Ocupacional de forma simples, rápida e sem sair do escritório — planos a partir de R$ 199/mês.',
  pains: [
    { icon: '❓', title: 'Não sabe se é obrigatório', body: 'Empresa de tecnologia também precisa de PGR e PCMSO? A resposta é sim — e o desconhecimento não exime de responsabilidade.' },
    { icon: '📋', title: 'eSocial exige envio de dados de SST', body: 'O módulo de SST do eSocial é obrigatório e exige documentação. Sem o PGR, o envio não está completo.' },
    { icon: '💸', title: 'Medo de multa mas sem tempo para resolver', body: 'A equipe está focada em produto e cliente. SST vai ficando para depois — até virar um problema.' },
    { icon: '🏢', title: 'Time remoto ou híbrido complica a gestão', body: 'Com parte do time em home office, fica difícil saber quais obrigações se aplicam e como documentá-las.' },
    { icon: '🔍', title: 'Não sabe por onde começar', body: 'PGR, PCMSO, GR1, NR-1... siglas demais para quem nunca precisou lidar com isso antes.' },
    { icon: '💰', title: 'Preço variável assusta', body: 'Orçamentos de SST costumam ser imprevisíveis. Empresa de tech prefere valor fixo mensal e previsível.' },
  ],
  solution: {
    title: 'Regularização completa em SST, sem visita presencial.',
    body: 'O Sublime Digital foi pensado para empresas como a sua — operações de baixo risco, equipe enxuta, foco em resultado. Cuidamos de PGR, PCMSO e organização documental de forma totalmente digital.',
    bullets: [
      'PGR e PCMSO elaborados conforme NR-1 e NR-7',
      'Documentação organizada e acessível digitalmente',
      'Atendimento 100% remoto por WhatsApp e e-mail',
      'Valor fixo mensal — sem surpresas no final do mês',
      'Cobertura para equipes presenciais, híbridas e remotas',
    ],
  },
  cnaes: [
    { code: '62.01-5', desc: 'Desenvolvimento de programas de computador sob encomenda' },
    { code: '62.02-3', desc: 'Desenvolvimento e licenciamento de programas de computador' },
    { code: '62.03-1', desc: 'Desenvolvimento e licenciamento de programas para dispositivos móveis' },
    { code: '62.04-0', desc: 'Consultoria em tecnologia da informação' },
    { code: '63.11-9', desc: 'Processamento de dados, hosting e serviços relacionados' },
    { code: '74.90-1', desc: 'Atividades profissionais e técnicas não especificadas' },
  ],
  inclusions: [
    { label: 'PGR — Programa de Gerenciamento de Riscos', included: true },
    { label: 'PCMSO — Programa de Controle Médico de Saúde Ocupacional', included: true },
    { label: 'Organização e arquivamento documental', included: true },
    { label: 'Atualizações anuais dos documentos', included: true },
    { label: 'Suporte remoto por WhatsApp e e-mail', included: true },
    { label: 'ASOs (coordenados com clínicas parceiras)', included: false },
    { label: 'Treinamentos presenciais', included: false },
    { label: 'LTCAT (quando aplicável)', included: false },
  ],
  faq: [
    { q: 'Empresa de tecnologia precisa de PGR?', a: 'Sim. O PGR é obrigatório para todas as empresas com funcionários CLT, independentemente do setor ou nível de risco. A atualização da NR-1 tornou o programa obrigatório a partir de 2021.' },
    { q: 'O modelo digital funciona para times em home office?', a: 'Sim. O PGR e o PCMSO cobrem os trabalhadores independentemente do local de trabalho — incluindo home office. Elaboramos a documentação considerando o perfil real da sua operação.' },
    { q: 'Minha empresa tem CNAE de TI — está dentro do GR1?', a: 'A maioria dos CNAEs de tecnologia é GR1 pela NR-4. Faça o teste de elegibilidade para confirmar se sua empresa se enquadra no modelo digital.' },
    { q: 'Em quanto tempo fico regularizado?', a: 'Após a contratação e o preenchimento dos dados da empresa no portal, os documentos ficam prontos em até 5 dias úteis.' },
  ],
  ctas: [
    { label: 'Verificar Elegibilidade', href: '/elegibilidade?utm_source=lp-tecnologia&utm_campaign=nicho', variant: 'primary' },
    { label: 'Falar no WhatsApp', href: 'https://wa.me/5521997248630', variant: 'outline' },
  ],
  ctaSection: {
    title: 'Sua empresa de tecnologia pode estar pronta para o modelo digital.',
    subtitle: 'Faça o teste gratuito e descubra em menos de 5 minutos.',
  },
}

export default function SstTecnologiaPage() {
  return <NichoLandingPage config={config} />
}
