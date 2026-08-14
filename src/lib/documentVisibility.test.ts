import { describe, it, expect } from 'vitest'
import { isDocumentVisibleToClient } from './documentVisibility'

describe('isDocumentVisibleToClient', () => {
  it('contrato sempre visível, mesmo sem entrega formal (documentsDeliveredAt null)', () => {
    expect(isDocumentVisibleToClient('contrato', null)).toBe(true)
  })

  it('contrato visível também depois da entrega formal', () => {
    expect(isDocumentVisibleToClient('contrato', new Date())).toBe(true)
  })

  it.each(['pgr', 'pcmso', 'declaracao', 'os_epi', 'ltcat'])(
    'documento técnico "%s" invisível antes da entrega formal (documentsDeliveredAt null)',
    tipo => {
      expect(isDocumentVisibleToClient(tipo, null)).toBe(false)
    }
  )

  it.each(['pgr', 'pcmso', 'declaracao', 'os_epi', 'ltcat'])(
    'documento técnico "%s" visível depois da entrega formal',
    tipo => {
      expect(isDocumentVisibleToClient(tipo, new Date('2026-08-10'))).toBe(true)
    }
  )

  it('fail-closed: tipoDocumento desconhecido/inesperado nunca liberado antes da entrega formal', () => {
    expect(isDocumentVisibleToClient('tipo_nunca_cadastrado', null)).toBe(false)
  })
})
