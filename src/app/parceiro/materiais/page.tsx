'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, MessageCircle, Mail } from 'lucide-react'

interface Partner {
  name: string
  code: string
}

export default function MateriaisPage() {
  const router = useRouter()
  const [partner, setPartner] = useState<Partner | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/partner/dashboard')
      .then(r => {
        if (r.status === 401) { router.push('/parceiro/login'); return null }
        return r.json()
      })
      .then(d => { if (d?.success) setPartner(d.data.partner) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [router])

  function copy(key: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-[14px] text-gray-400">Carregando…</p>
    </div>
  )

  if (!partner) return null

  const refUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/elegibilidade?ref=${partner.code}`
    : `/elegibilidade?ref=${partner.code}`

  const whatsappText = `Olá! Tudo bem?

Estou te indicando a *Sublime SST*, uma empresa especializada em SST para pequenas empresas (até 20 funcionários, risco 1).

Eles oferecem *PGR + PCMSO + eSocial + documentos completos* de forma 100% digital e acessível, sem aquela burocracia de empresa tradicional.

Faça o teste gratuito de elegibilidade e veja se sua empresa se encaixa:
${refUrl}

Qualquer dúvida, pode me chamar! 😊`

  const emailSubject = `Conformidade SST simplificada para sua empresa — Sublime Digital`

  const emailBody = `Olá,

Estou entrando em contato para apresentar a Sublime SST — uma solução digital de Segurança e Saúde no Trabalho desenvolvida especialmente para pequenas empresas de baixo risco (GR1, até 20 funcionários CLT).

O produto Sublime Digital inclui:
• PGR — Programa de Gerenciamento de Riscos
• PCMSO com médico coordenador
• Gestão de eventos eSocial SST (S-2210, S-2220, S-2240)
• Declaração técnica e Ordens de Serviço
• Portal digital para acompanhamento

Sem contratos confusos, sem visitas presenciais desnecessárias — tudo online com um modelo de assinatura mensal.

Faça o teste gratuito de elegibilidade em menos de 2 minutos:
${refUrl}

Estou à disposição para esclarecer dúvidas.

Atenciosamente`

  const sections = [
    {
      key: 'refLink',
      title: '🔗 Link de indicação',
      icon: Copy,
      description: 'Compartilhe em qualquer canal. Conversões são rastreadas automaticamente.',
      content: refUrl,
      copyLabel: 'Copiar link',
    },
    {
      key: 'whatsapp',
      title: '💬 Texto pronto para WhatsApp',
      icon: MessageCircle,
      description: 'Copie e cole diretamente no WhatsApp para seus contatos.',
      content: whatsappText,
      copyLabel: 'Copiar texto WhatsApp',
    },
    {
      key: 'emailSubject',
      title: '📧 Assunto do e-mail',
      icon: Mail,
      description: '',
      content: emailSubject,
      copyLabel: 'Copiar assunto',
    },
    {
      key: 'emailBody',
      title: '📝 Corpo do e-mail',
      icon: Mail,
      description: 'Template profissional para prospecção por e-mail.',
      content: emailBody,
      copyLabel: 'Copiar corpo do e-mail',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[800px] mx-auto px-6 h-[68px] flex items-center justify-between">
          <div>
            <p className="font-display text-[15px] text-gray-900">Kit de Materiais</p>
            <p className="text-[11px] text-gray-400">Sublime SST — Parceiro {partner.name}</p>
          </div>
          <a href="/parceiro/dashboard" className="text-[13px] text-gray-500 hover:text-gray-800">
            ← Dashboard
          </a>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-6 py-8 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-[10px] px-5 py-4 text-[13px] text-blue-800">
          Seu código de parceiro: <strong className="font-mono">{partner.code}</strong>.
          Todos os contatos que acessarem seu link serão vinculados a você automaticamente.
        </div>

        {sections.map(s => (
          <div key={s.key} className="bg-white rounded-[12px] border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[14px] font-semibold text-gray-800">{s.title}</p>
              <button
                onClick={() => copy(s.key, s.content)}
                className="btn btn-outline-dark btn-sm"
              >
                {copied === s.key ? <><Check size={12} /> Copiado!</> : <><Copy size={12} /> {s.copyLabel}</>}
              </button>
            </div>
            {s.description && <p className="text-[12px] text-gray-500 mb-3">{s.description}</p>}
            <pre className="bg-gray-50 rounded-[8px] p-3 text-[12px] text-gray-700 whitespace-pre-wrap font-sans border border-gray-100 max-h-[220px] overflow-y-auto">
              {s.content}
            </pre>
          </div>
        ))}

        <div className="bg-white rounded-[12px] border border-gray-200 p-5">
          <p className="text-[14px] font-semibold text-gray-800 mb-3">📌 Dicas de abordagem</p>
          <ul className="space-y-2 text-[13px] text-gray-600">
            <li>✅ Foque em escritórios de contabilidade, consultorias e advogados trabalhistas com clientes PME</li>
            <li>✅ Empresas entre 3–15 funcionários em atividades administrativas, de serviços ou comércio varejista são o perfil ideal</li>
            <li>✅ Reforce que o produto é 100% online e não exige visita presencial — isso diferencia do concorrente tradicional</li>
            <li>✅ O teste de elegibilidade é gratuito e leva menos de 2 minutos — zero atrito para o lead</li>
            <li>⚠️ Evite indicar empresas com atividades de risco (obras, indústria pesada, trabalho em altura) — não passarão no teste</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
