import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

function setProdEnv(overrides: Partial<NodeJS.ProcessEnv> = {}) {
  process.env.VERCEL_ENV = 'production'
  process.env.ASAAS_BASE_URL = 'https://api.asaas.com/v3'
  process.env.NEXT_PUBLIC_BASE_URL = 'https://www.sublimesst.com'
  process.env.ASAAS_API_KEY = 'real-key-nao-real-para-teste'
  Object.assign(process.env, overrides)
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.restoreAllMocks()
  vi.resetModules()
})

describe('getCheckoutContinuationCallbackUrl', () => {
  it('Produção com configuração exata → available com a URL fixa', async () => {
    setProdEnv()
    const { getCheckoutContinuationCallbackUrl } = await import('./asaas')
    expect(getCheckoutContinuationCallbackUrl()).toEqual({
      outcome: 'available',
      url: 'https://www.sublimesst.com/cadastro/continuar',
    })
  })

  it('Preview → skipped_environment, nunca usa a base pública para callback', async () => {
    setProdEnv({ VERCEL_ENV: 'preview' })
    const { getCheckoutContinuationCallbackUrl } = await import('./asaas')
    expect(getCheckoutContinuationCallbackUrl()).toEqual({ outcome: 'skipped_environment' })
  })

  it('development/test (VERCEL_ENV ausente) → skipped_environment, sem chamada de rede', async () => {
    setProdEnv({ VERCEL_ENV: undefined })
    const { getCheckoutContinuationCallbackUrl } = await import('./asaas')
    expect(getCheckoutContinuationCallbackUrl()).toEqual({ outcome: 'skipped_environment' })
  })

  it('NEXT_PUBLIC_BASE_URL incorreta → invalid_config', async () => {
    setProdEnv({ NEXT_PUBLIC_BASE_URL: 'https://sublimesst.com' }) // sem www
    const { getCheckoutContinuationCallbackUrl } = await import('./asaas')
    expect(getCheckoutContinuationCallbackUrl()).toEqual({ outcome: 'invalid_config' })
  })

  it('ASAAS_BASE_URL incorreta (sandbox em produção) → invalid_config', async () => {
    setProdEnv({ ASAAS_BASE_URL: 'https://sandbox.asaas.com/api/v3' })
    const { getCheckoutContinuationCallbackUrl } = await import('./asaas')
    expect(getCheckoutContinuationCallbackUrl()).toEqual({ outcome: 'invalid_config' })
  })

  it('ASAAS_API_KEY ausente → invalid_config', async () => {
    setProdEnv({ ASAAS_API_KEY: '' })
    const { getCheckoutContinuationCallbackUrl } = await import('./asaas')
    expect(getCheckoutContinuationCallbackUrl()).toEqual({ outcome: 'invalid_config' })
  })
})

describe('configurePaymentCallback', () => {
  it('modo mock (sem ASAAS_API_KEY) → skipped_mock, nenhuma chamada de rede', async () => {
    process.env.ASAAS_API_KEY = ''
    const fetchSpy = vi.spyOn(global, 'fetch')
    const { configurePaymentCallback } = await import('./asaas')

    const result = await configurePaymentCallback('pay_abc123', 'https://www.sublimesst.com/cadastro/continuar')

    expect(result).toEqual({ outcome: 'skipped_mock' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('usa PUT com payload mínimo e paymentId codificado na URL', async () => {
    setProdEnv()
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response)
    const { configurePaymentCallback } = await import('./asaas')

    const result = await configurePaymentCallback('pay abc/123', 'https://www.sublimesst.com/cadastro/continuar')

    expect(result).toEqual({ outcome: 'configured' })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, options] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain(encodeURIComponent('pay abc/123'))
    expect(options?.method).toBe('PUT')
    expect(JSON.parse(options?.body as string)).toEqual({
      callback: { successUrl: 'https://www.sublimesst.com/cadastro/continuar', autoRedirect: true },
    })
  })

  it('falha na Asaas nunca lança — devolve outcome error', async () => {
    setProdEnv()
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false, status: 500, json: async () => ({ errors: [] }),
    } as Response)
    const { configurePaymentCallback } = await import('./asaas')

    const result = await configurePaymentCallback('pay_abc123', 'https://www.sublimesst.com/cadastro/continuar')
    expect(result).toEqual({ outcome: 'error' })
  })
})
