import { describe, it, expect } from 'vitest'
import { getSteps, type StepsCompany } from './steps'

function company(overrides: Partial<StepsCompany> = {}): StepsCompany {
  return {
    status: 'onboarding_pending',
    documentsDeliveredAt: null,
    onboardingData: null,
    payments: [
      { type: 'implantacao', status: 'confirmed' },
      { type: 'mensalidade', status: 'confirmed' },
    ],
    ...overrides,
  }
}

function elaboracao(steps: ReturnType<typeof getSteps>) {
  return steps.find(s => s.label === 'Elaboração dos documentos')!
}

function entregues(steps: ReturnType<typeof getSteps>) {
  return steps.find(s => s.label === 'Documentos entregues')!
}

describe('getSteps (timeline do Portal Cliente)', () => {
  it('onboarding_pending, dados ainda não enviados → elaboração não iniciada, sem exigir ação nova além do onboarding já sinalizado em outro lugar', () => {
    const steps = getSteps(company({ status: 'onboarding_pending', onboardingData: null }), true)
    expect(elaboracao(steps).done).toBe(false)
    expect(elaboracao(steps).pending).toBe(false)
    expect(entregues(steps).done).toBe(false)
  })

  it('in_production com onboarding enviado → elaboração em andamento', () => {
    const steps = getSteps(
      company({ status: 'in_production', onboardingData: { status: 'enviado' } }),
      true
    )
    expect(elaboracao(steps).pending).toBe(true)
    expect(elaboracao(steps).done).toBe(false)
    expect(elaboracao(steps).description).toContain('elaborando')
    expect(entregues(steps).done).toBe(false)
  })

  it('in_review com onboarding enviado → mesma macroetapa de elaboração/revisão em andamento', () => {
    const steps = getSteps(
      company({ status: 'in_review', onboardingData: { status: 'enviado' } }),
      true
    )
    expect(elaboracao(steps).pending).toBe(true)
    expect(elaboracao(steps).done).toBe(false)
    expect(entregues(steps).done).toBe(false)
  })

  it('documents_delivered com documentsDeliveredAt preenchido → elaboração e entrega concluídas', () => {
    const steps = getSteps(
      company({
        status: 'documents_delivered',
        onboardingData: { status: 'enviado' },
        documentsDeliveredAt: new Date('2026-08-10'),
      }),
      true
    )
    expect(elaboracao(steps).done).toBe(true)
    expect(elaboracao(steps).pending).toBe(false)
    expect(entregues(steps).done).toBe(true)
  })

  it('active com documentsDeliveredAt já preenchido → etapa de entrega permanece reconhecida', () => {
    const steps = getSteps(
      company({
        status: 'active',
        onboardingData: { status: 'enviado' },
        documentsDeliveredAt: new Date('2026-08-01'),
      }),
      true
    )
    expect(entregues(steps).done).toBe(true)
    expect(elaboracao(steps).done).toBe(true)
  })

  it('onboarding enviado não volta a exigir preenchimento (etapa "Preenchimento dos dados" permanece concluída em qualquer status posterior)', () => {
    for (const status of ['in_production', 'in_review', 'documents_delivered', 'active']) {
      const steps = getSteps(company({ status, onboardingData: { status: 'enviado' } }), true)
      const preenchimento = steps.find(s => s.label === 'Preenchimento dos dados')!
      expect(preenchimento.done).toBe(true)
      expect(preenchimento.pending).toBe(false)
    }
  })

  it('nenhuma etapa de produção/revisão fica "pending" sem onboarding enviado (não força ação nova)', () => {
    const steps = getSteps(company({ status: 'in_production', onboardingData: null }), true)
    expect(elaboracao(steps).pending).toBe(false)
  })
})
