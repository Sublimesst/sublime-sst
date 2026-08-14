'use client'

import { useState, useEffect } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { formatDate, maskCNPJ } from '@/lib/utils'

interface Partner {
  id: string; name: string; office: string; email: string; whatsapp: string
  city: string; state: string; status: string; code: string; createdAt: string
  clientsEstimate: number | null
  cnpj: string | null
  termsAcceptedAt: string | null; termsVersion: string | null
  referrals: { id: string; companyName: string; status: string }[]
}

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Partner | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionInfo, setActionInfo] = useState('')

  const load = async () => {
    setLoading(true)
    const secret = sessionStorage.getItem('admin_secret') ?? ''
    const res = await fetch('/api/partners', { headers: { 'x-admin-secret': secret } })
    const data = await res.json()
    if (data.success) setPartners(data.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (id: string, status: 'active' | 'inactive') => {
    setSaving(true)
    setActionError('')
    setActionInfo('')
    const secret = sessionStorage.getItem('admin_secret') ?? ''
    try {
      const res = await fetch('/api/partners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ id, status }),
      })
      const data = await res.json()
      if (data.success) {
        setPartners(ps => ps.map(p => p.id === id ? { ...p, status } : p))
        setSelected(s => s?.id === id ? { ...s, status } : s)
        if (status === 'active') {
          setActionInfo(data.data.emailSent
            ? '✓ Parceiro ativado — e-mail de boas-vindas enviado.'
            : data.data.emailSent === false
              ? '⚠️ Parceiro ativado, mas o e-mail de boas-vindas FALHOU. Verifique RESEND_API_KEY/logs e avise o parceiro manualmente.'
              : '✓ Status atualizado.')
        }
      } else {
        setActionError(data.error ?? 'Erro ao atualizar status.')
      }
    } catch {
      setActionError('Erro de rede ao atualizar status.')
    } finally {
      setSaving(false)
    }
  }

  const exportCSV = () => {
    const rows = [
      ['ID','Nome','Escritório','Email','WhatsApp','Cidade','Estado','Status','Clientes','Indicações','Data'],
      ...partners.map(p => [p.id, p.name, p.office, p.email, p.whatsapp, p.city, p.state, p.status, p.clientsEstimate ?? '', p.referrals.length, formatDate(p.createdAt)]),
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'parceiros.csv'; a.click()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[1.4rem] font-bold text-gray-900">Parceiros</h1>
          <p className="text-[13px] text-gray-500">{partners.length} parceiros cadastrados</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
          <button className="btn btn-outline-dark btn-sm" onClick={exportCSV}><Download size={14} /> Exportar</button>
        </div>
      </div>

      <div className="flex gap-5">
        <div className="flex-1 bg-white rounded-[12px] border border-gray-200 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Parceiro','Escritório','Contato','Indicações','Status','Data'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
              ) : partners.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhum parceiro cadastrado.</td></tr>
              ) : partners.map(p => (
                <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${selected?.id === p.id ? 'bg-teal-pale' : ''}`}
                  onClick={() => setSelected(selected?.id === p.id ? null : p)}>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.office}</td>
                  <td className="px-4 py-3">
                    <div className="text-[12px]">{p.email}</div>
                    <div className="text-[11px] text-gray-400">{p.whatsapp}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-blue-100 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full">{p.referrals.length}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${p.status === 'active' ? 'bg-green-100 text-green-700' : p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>
                      {p.status === 'active' ? 'Ativo' : p.status === 'pending' ? 'Pendente' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-[12px]">{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="w-72 shrink-0 bg-white rounded-[12px] border border-gray-200 p-5 self-start">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold">Detalhes</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 text-lg">×</button>
            </div>
            <div className="space-y-3 text-[13px]">
              <div><span className="text-gray-500 block text-[11px] uppercase tracking-wide">Nome</span>{selected.name}</div>
              <div><span className="text-gray-500 block text-[11px] uppercase tracking-wide">Escritório</span>{selected.office}</div>
              <div><span className="text-gray-500 block text-[11px] uppercase tracking-wide">E-mail</span><a href={`mailto:${selected.email}`} className="text-teal">{selected.email}</a></div>
              <div><span className="text-gray-500 block text-[11px] uppercase tracking-wide">WhatsApp</span><a href={`https://wa.me/${selected.whatsapp.replace(/\D/g,'')}`} target="_blank" className="text-teal">{selected.whatsapp}</a></div>
              <div><span className="text-gray-500 block text-[11px] uppercase tracking-wide">Localização</span>{selected.city}/{selected.state}</div>
              {selected.clientsEstimate && <div><span className="text-gray-500 block text-[11px] uppercase tracking-wide">Clientes aprox.</span>{selected.clientsEstimate}</div>}
              {/* CNPJ mascarado — minimização de dados, o Admin raramente precisa do valor bruto para conferência visual */}
              {selected.cnpj && <div><span className="text-gray-500 block text-[11px] uppercase tracking-wide">CNPJ</span>{maskCNPJ(selected.cnpj)}</div>}

              {/* Evidência do aceite eletrônico do Termo de Parceria */}
              {selected.termsAcceptedAt && (
                <div className="text-[11px] bg-teal-pale rounded-[6px] px-2.5 py-1.5">
                  <span className="text-gray-500 block text-[10px] uppercase tracking-wide mb-0.5">Aceite do Termo de Parceria</span>
                  Aceito em {formatDate(selected.termsAcceptedAt)}{selected.termsVersion ? ` · versão ${selected.termsVersion}` : ''}
                </div>
              )}

              {selected.referrals.length > 0 && (
                <>
                  <div className="h-px bg-gray-200 my-3" />
                  <div><span className="text-gray-500 block text-[11px] uppercase tracking-wide mb-2">Indicações</span>
                    {selected.referrals.map(r => (
                      <div key={r.id} className="text-[12px] bg-gray-50 rounded-[6px] px-3 py-2 mb-1">
                        {r.companyName}
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div className="h-px bg-gray-200 my-3" />

              {/* Código/link de indicação */}
              <div>
                <span className="text-gray-500 block text-[11px] uppercase tracking-wide mb-1">Link de indicação</span>
                <code className="block text-[11px] bg-gray-50 border border-gray-200 rounded-[6px] px-2 py-1.5 break-all">
                  sublimesst.com/elegibilidade?ref={selected.code}
                </code>
              </div>

              {/* Ativação */}
              {selected.status !== 'active' ? (
                <button
                  onClick={() => updateStatus(selected.id, 'active')}
                  disabled={saving}
                  className="btn btn-primary w-full btn-sm text-[12px]"
                >
                  {saving ? 'Salvando…' : '✓ Ativar parceiro'}
                </button>
              ) : (
                <button
                  onClick={() => updateStatus(selected.id, 'inactive')}
                  disabled={saving}
                  className="btn btn-outline-dark w-full btn-sm text-[12px]"
                >
                  {saving ? 'Salvando…' : 'Inativar parceiro'}
                </button>
              )}
              {selected.status !== 'active' && (
                <p className="text-[11px] text-amber-700 bg-amber-50 rounded-[6px] px-2.5 py-1.5">
                  Sem ativação, o parceiro não consegue acessar o portal e as indicações dele não são rastreadas.
                </p>
              )}
              {actionError && <p className="text-[11px] text-red-600">{actionError}</p>}
              {actionInfo && <p className="text-[11px] text-teal-700 bg-teal-pale rounded-[6px] px-2.5 py-1.5">{actionInfo}</p>}

              <a href={`https://wa.me/${selected.whatsapp.replace(/\D/g,'')}`} target="_blank"
                className="btn btn-outline-dark w-full btn-sm text-[12px] block text-center">
                Contatar via WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
