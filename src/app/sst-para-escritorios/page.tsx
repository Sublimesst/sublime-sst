import type { Metadata } from 'next'
import { NichoLandingPage } from '@/components/NichoLandingPage'
import type { NichoConfig } from '@/components/NichoLandingPage'

export const metadata: Metadata = {
  title: 'SST para Escritórios, Consultorias e Empresas Administrativas | Sublime SST',
  description: 'SST simples e acessível para escritórios de advocacia, contabilidade, arquitetura, publicidade e empresas administrativas de baixo risco.',
}

const config: NichoConfig = {
  badge: 'Para escritórios e empresas administrativas',
  headline: 'SST digital para escritórios, consultorias e empresas administrativas.',
  subtitle: 'Regularize as obrigações de Segurança e Saúde Ocupacional da sua empresa de forma simples e com custo previsível — sem complicação, sem burocracia excessiva.',
  pains: [
    { icon: '😰', title: 'SST parece complexa demais para um escritório pequeno', body: 'PGR, PCMSO, GR1, eSocial... Parece muito para uma empresa que só tem mesa, cadeira e computador.' },
    { icon: '⚠️', title: 'Medo de multa sem saber o que é obrigatório', body: 'A fiscalização do Ministério do Trabalho pode acontecer a qualquer momento. Não saber o que é exigido é um risco real.' },
    { icon: '🔍', title: 'Não sabe por onde começar', body: 'Qual documento vem primeiro? Quem elabora? Quanto custa? As perguntas ficam sem resposta e o problema vai sendo adiado.' },
    { icon: '📅', title: 'eSocial exige dados de SST', body: 'O módulo de SST do eSocial é obrigatório. Sem PGR, o envio está incompleto — e isso pode gerar pendências.' },
    { icon: '💸', title: 'Orçamentos imprevisíveis assustam', body: 'Consultar uma empresa de SST costuma resultar em propostas sem preço claro. Escritórios pequenos precisam de previsibilidade.' },
    { icon: '🏃', title: 'Equipe pequena, sem alguém para cuidar disso', body: 'Em escritórios enxutos, ninguém tem tempo ou conhecimento para gerenciar SST internamente.' },
  ],
  solution: {
    title: 'Conformidade em SST com valor mensal fixo e processo digital.',
    body: 'O Sublime Digital organiza as obrigações de SST de escritórios e empresas administrativas de baixo risco de forma simples e acessível. Sem visita presencial, sem surpresas no preço.',
    bullets: [
      'PGR e PCMSO elaborados para o seu perfil operacional',
      'Processo de contratação e gestão inteiramente digitais',
      'Valor fixo mensal — saiba exatamente o que pagar todo mês',
      'Documentação organizada e pronta para fiscalizações',
      'Atendimento por WhatsApp e e-mail',
    ],
  },
  cnaes: [
    { code: '69.11-7', desc: 'Atividades jurídicas (advocacia)' },
    { code: '69.20-6', desc: 'Atividades de contabilidade e auditoria' },
    { code: '70.20-4', desc: 'Consultoria em gestão empresarial' },
    { code: '71.11-1', desc: 'Serviços de arquitetura' },
    { code: '73.11-4', desc: 'Agências de publicidade' },
    { code: '74.10-2', desc: 'Design e decoração de interiores' },
    { code: '82.11-3', desc: 'Serviços combinados de escritório' },
  ],
  inclusions: [
    { label: 'PGR — Programa de Gerenciamento de Riscos', included: true },
    { label: 'PCMSO — Programa de Controle Médico de Saúde Ocupacional', included: true },
    { label: 'Organização e arquivamento documental', included: true },
    { label: 'Atualizações anuais dos documentos', included: true },
    { label: 'Suporte remoto por WhatsApp e e-mail', included: true },
    { label: 'ASOs (coordenados com clínicas parceiras)', included: false },
    { label: 'Treinamentos presenciais (quando exigidos)', included: false },
  ],
  faq: [
    { q: 'Um escritório de advocacia ou contabilidade precisa de PGR?', a: 'Sim. Qualquer empresa com funcionários CLT é obrigada a ter PGR desde a atualização da NR-1 em 2021, independentemente do setor ou nível de risco.' },
    { q: 'O que é o Grau de Risco 1 (GR1) e como sei se minha empresa se enquadra?', a: 'O Grau de Risco é uma classificação da NR-4 que define o nível de perigo da atividade econômica. Escritórios e empresas administrativas normalmente são GR1 — mas o teste de elegibilidade confirma isso de forma rápida.' },
    { q: 'Preciso de visita técnica presencial?', a: 'Para a maioria dos escritórios GR1, não. O PGR e o PCMSO são elaborados com base nas informações coletadas digitalmente. Quando for necessária alguma etapa presencial, você será orientado.' },
    { q: 'Qual é o valor?', a: 'A assinatura anual é cobrada mensalmente e começa em R$ 142/mês para empresas com até 5 funcionários. Faça o teste de elegibilidade para ver o valor exato para o seu perfil.' },
  ],
  ctas: [
    { label: 'Verificar Elegibilidade', href: '/elegibilidade?utm_source=lp-escritorios&utm_campaign=nicho', variant: 'primary' },
    { label: 'Falar no WhatsApp', href: 'https://wa.me/5521997248630', variant: 'outline' },
  ],
  ctaSection: {
    title: 'Regularize a SST do seu escritório hoje.',
    subtitle: 'O teste é gratuito, leva menos de 5 minutos e não gera nenhum compromisso.',
  },
}

export default function SstEscritoriosPage() {
  return <NichoLandingPage config={config} />
}
