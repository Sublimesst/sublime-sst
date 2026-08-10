'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Trash2, AlertTriangle, Loader2 } from 'lucide-react'

export interface WorkerCardData {
  id: string
  nome: string | null
  dataNascimento: string | null // "YYYY-MM-DD"
  sexo: 'M' | 'F' | null
  dataAdmissao: string | null // "YYYY-MM-DD"
  cargo: string | null
  setor: string | null
}

interface WorkerCardProps {
  worker: WorkerCardData
  index: number
  isDuplicate: boolean
  saving: boolean
  removing: boolean
  // true durante a confirmação de divergência (mismatch_confirm) — a
  // declaração precisa corresponder exatamente ao estado que gerou o aviso,
  // então toda edição/remoção fica bloqueada até o cliente confirmar ou
  // voltar a editar.
  locked?: boolean
  onChange: (id: string, patch: Partial<WorkerCardData>) => void
  onBlurSave: (id: string) => void
  onRemove: (id: string) => void
}

const inputClass =
  'w-full px-3 py-2.5 border border-gray-200 rounded-[10px] text-[13px] focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal'

export function WorkerCard({ worker, index, isDuplicate, saving, removing, locked = false, onChange, onBlurSave, onRemove }: WorkerCardProps) {
  const [collapsed, setCollapsed] = useState(false)

  const title = worker.nome?.trim() ? worker.nome : `Trabalhador ${index + 1}`
  const subtitle = worker.cargo?.trim() || undefined

  return (
    <div className="card p-4 border border-gray-200">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 min-w-0 text-left flex-1"
        >
          {collapsed ? <ChevronDown size={15} className="shrink-0 text-gray-400" /> : <ChevronUp size={15} className="shrink-0 text-gray-400" />}
          <span className="text-[13px] font-medium text-gray-800 truncate">{title}</span>
          {subtitle && <span className="text-[12px] text-gray-400 truncate">· {subtitle}</span>}
          {isDuplicate && <AlertTriangle size={13} className="shrink-0 text-amber-500" />}
          {saving && <Loader2 size={12} className="shrink-0 animate-spin text-gray-400" />}
        </button>
        <button
          type="button"
          onClick={() => onRemove(worker.id)}
          disabled={removing || locked}
          className="text-gray-400 hover:text-red-500 shrink-0 p-1 disabled:opacity-40 disabled:hover:text-gray-400"
          aria-label="Remover trabalhador"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {isDuplicate && !collapsed && (
        <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1">
          <AlertTriangle size={12} /> Nome e data de nascimento iguais a outro trabalhador já cadastrado. Verifique se não é duplicidade.
        </p>
      )}

      {!collapsed && (
        <div className="grid grid-cols-1 gap-3 mt-3">
          <label className="block">
            <span className="text-[12px] font-medium text-gray-600 block mb-1">Nome completo *</span>
            <input
              type="text"
              className={inputClass}
              value={worker.nome ?? ''}
              onChange={(e) => onChange(worker.id, { nome: e.target.value })}
              onBlur={() => onBlurSave(worker.id)}
              placeholder="Nome do trabalhador"
              disabled={locked}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[12px] font-medium text-gray-600 block mb-1">Data de nascimento *</span>
              <input
                type="date"
                className={inputClass}
                value={worker.dataNascimento ?? ''}
                onChange={(e) => onChange(worker.id, { dataNascimento: e.target.value || null })}
                onBlur={() => onBlurSave(worker.id)}
                disabled={locked}
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-gray-600 block mb-1">Sexo *</span>
              <select
                className={`${inputClass} bg-white`}
                value={worker.sexo ?? ''}
                onChange={(e) => {
                  onChange(worker.id, { sexo: (e.target.value || null) as 'M' | 'F' | null })
                  onBlurSave(worker.id)
                }}
                disabled={locked}
              >
                <option value="">Selecione…</option>
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-[12px] font-medium text-gray-600 block mb-1">Data de admissão *</span>
            <input
              type="date"
              className={inputClass}
              value={worker.dataAdmissao ?? ''}
              onChange={(e) => onChange(worker.id, { dataAdmissao: e.target.value || null })}
              onBlur={() => onBlurSave(worker.id)}
              disabled={locked}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[12px] font-medium text-gray-600 block mb-1">Cargo / função *</span>
              <input
                type="text"
                className={inputClass}
                value={worker.cargo ?? ''}
                onChange={(e) => onChange(worker.id, { cargo: e.target.value })}
                onBlur={() => onBlurSave(worker.id)}
                placeholder="Ex: Analista"
                disabled={locked}
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-gray-600 block mb-1">Setor (opcional)</span>
              <input
                type="text"
                className={inputClass}
                value={worker.setor ?? ''}
                onChange={(e) => onChange(worker.id, { setor: e.target.value })}
                onBlur={() => onBlurSave(worker.id)}
                placeholder="Ex: Financeiro"
                disabled={locked}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

// Card somente leitura — usado quando o onboarding já foi enviado.
export function WorkerCardReadOnly({ worker, index }: { worker: WorkerCardData; index: number }) {
  const title = worker.nome?.trim() ? worker.nome : `Trabalhador ${index + 1}`
  return (
    <div className="card p-4 border border-gray-200 text-[13px]">
      <p className="font-medium text-gray-800 mb-2">{title}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
        <div><span className="text-gray-400">Nascimento:</span> {worker.dataNascimento ?? '—'}</div>
        <div><span className="text-gray-400">Sexo:</span> {worker.sexo === 'F' ? 'Feminino' : worker.sexo === 'M' ? 'Masculino' : '—'}</div>
        <div><span className="text-gray-400">Admissão:</span> {worker.dataAdmissao ?? '—'}</div>
        <div><span className="text-gray-400">Cargo:</span> {worker.cargo ?? '—'}</div>
        {worker.setor && <div className="col-span-2"><span className="text-gray-400">Setor:</span> {worker.setor}</div>}
      </div>
    </div>
  )
}
