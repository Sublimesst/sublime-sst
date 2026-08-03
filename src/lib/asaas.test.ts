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

  it('domínio oficial SEM www (apex) → available, successUrl continua a canônica com www', async () => {
    setProdEnv({ NEXT_PUBLIC_BASE_URL: 'https://sublimesst.com' })
    const { getCheckoutContinuationCallbackUrl } = await import('./asaas')
    expect(getCheckoutContinuationCallbackUrl()).toEqual({
      outcome: 'available',
      url: 'https://www.sublimesst.com/cadastro/continuar',
    })
  })

  it('NEXT_PUBLIC_BASE_URL com barra final é normalizada → available', async () => {
    setProdEnv({ NEXT_PUBLIC_BASE_URL: 'https://www.sublimesst.com/' })
    const { getCheckoutContinuationCallbackUrl } = await import('./asaas')
    expect(getCheckoutContinuationCallbackUrl().outcome).toBe('available')
  })

  it('NEXT_PUBLIC_BASE_URL com espaços é normalizada (trim) → available', async () => {
    setProdEnv({ NEXT_PUBLIC_BASE_URL: '  https://www.sublimesst.com  ' })
    const { getCheckoutContinuationCallbackUrl } = await import('./asaas')
    expect(getCheckoutContinuationCallbackUrl().outcome).toBe('available')
  })

  it('NEXT_PUBLIC_BASE_URL http (não https) → invalid_public_base_url', async () => {
    setProdEnv({ NEXT_PUBLIC_BASE_URL: 'http://www.sublimesst.com' })
    const { getCheckoutContinuationCallbackUrl } = await import('./asaas')
    expect(getCheckoutContinuationCallbackUrl()).toEqual({ outcome: 'invalid_public_base_url' })
  })

  it('domínio parecido/malicioso (substring) nunca é aceito → invalid_public_base_url', async () => {
    setProdEnv({ NEXT_PUBLIC_BASE_URL: 'https://sublimesst.com.evil.tld' })
    const { getCheckoutContinuationCallbackUrl } = await import('./asaas')
    expect(getCheckoutContinuationCallbackUrl()).toEqual({ outcome: 'invalid_public_base_url' })
  })

  it('domínio malicioso com userinfo (host@evil) nunca é aceito → invalid_public_base_url', async () => {
    setProdEnv({ NEXT_PUBLIC_BASE_URL: 'https://www.sublimesst.com@evil.tld' })
    const { getCheckoutContinuationCallbackUrl } = await import('./asaas')
    expect(getCheckoutContinuationCallbackUrl()).toEqual({ outcome: 'invalid_public_base_url' })
  })

  it('javascript: nunca é aceito → invalid_public_base_url', async () => {
    setProdEnv({ NEXT_PUBLIC_BASE_URL: 'javascript:alert(1)' })
    const { getCheckoutContinuationCallbackUrl } = await import('./asaas')
    expect(getCheckoutContinuationCallbackUrl()).toEqual({ outcome: 'invalid_public_base_url' })
  })

  it('porta inesperada (:444) nunca é aceita → invalid_public_base_url', async () => {
    setProdEnv({ NEXT_PUBLIC_BASE_URL: 'https://www.sublimesst.com:444' })
    const { getCheckoutContinuationCallbackUrl } = await import('./asaas')
    expect(getCheckoutContinuationCallbackUrl()).toEqual({ outcome: 'invalid_public_base_url' })
  })

  it('domínio parecido por prefixo (evil-sublimesst.com) nunca é aceito → invalid_public_base_url', async () => {
    setProdEnv({ NEXT_PUBLIC_BASE_URL: 'https://evil-sublimesst.com' })
    const { getCheckoutContinuationCallbackUrl } = await import('./asaas')
    expect(getCheckoutContinuationCallbackUrl()).toEqual({ outcome: 'invalid_public_base_url' })
  })

  it('domínio parecido com www + sufixo malicioso (www.sublimesst.com.evil.example) nunca é aceito → invalid_public_base_url', async () => {
    setProdEnv({ NEXT_PUBLIC_BASE_URL: 'https://www.sublimesst.com.evil.example' })
    const { getCheckoutContinuationCallbackUrl } = await import('./asaas')
    expect(getCheckoutContinuationCallbackUrl()).toEqual({ outcome: 'invalid_public_base_url' })
  })

  it('userinfo malicioso com domínio .example (www.sublimesst.com@evil.example) nunca é aceito → invalid_public_base_url', async () => {
    setProdEnv({ NEXT_PUBLIC_BASE_URL: 'https://www.sublimesst.com@evil.example' })
    const { getCheckoutContinuationCallbackUrl } = await import('./asaas')
    expect(getCheckoutContinuationCallbackUrl()).toEqual({ outcome: 'invalid_public_base_url' })
  })

  it('ASAAS_BASE_URL incorreta (sandbox em produção) → invalid_asaas_base_url', async () => {
    setProdEnv({ ASAAS_BASE_URL: 'https://sandbox.asaas.com/api/v3' })
    const { getCheckoutContinuationCallbackUrl } = await import('./asaas')
    expect(getCheckoutContinuationCallbackUrl()).toEqual({ outcome: 'invalid_asaas_base_url' })
  })

  it('ASAAS_BASE_URL de Produção com barra final → available', async () => {
    setProdEnv({ ASAAS_BASE_URL: 'https://api.asaas.com/v3/' })
    const { getCheckoutContinuationCallbackUrl } = await import('./asaas')
    expect(getCheckoutContinuationCallbackUrl().outcome).toBe('available')
  })

  it('ASAAS_API_KEY ausente → missing_asaas_api_key', async () => {
    setProdEnv({ ASAAS_API_KEY: '' })
    const { getCheckoutContinuationCallbackUrl } = await import('./asaas')
    expect(getCheckoutContinuationCallbackUrl()).toEqual({ outcome: 'missing_asaas_api_key' })
  })
})

describe('configurePaymentCallback', () => {
  const SUCCESS_URL = 'https://www.sublimesst.com/cadastro/continuar'

  // Resposta padrão do GET /payments/{id} — sintética, nunca um ID real.
  // `overrides` é solto de propósito (Record<string, unknown>) para permitir
  // construir respostas propositalmente inválidas nos testes de validação
  // (billingType/value/dueDate ausentes, do tipo errado, etc.).
  function chargeResponse(overrides: Record<string, unknown> = {}) {
    return {
      id: 'pay_synthetic_1',
      status: 'PENDING',
      billingType: 'UNDEFINED',
      value: 149,
      dueDate: '2026-08-05',
      invoiceUrl: 'https://www.asaas.com/i/synthetic',
      invoiceNumber: 'SYN-1',
      ...overrides,
    }
  }

  // Remove uma chave do objeto sintético (para simular campo ausente) sem
  // usar `delete obj.key` diretamente no spread acima.
  function chargeResponseWithout(key: string, overrides: Record<string, unknown> = {}) {
    const full = chargeResponse(overrides) as Record<string, unknown>
    delete full[key]
    return full
  }

  function mockGetThenPut(getBody: object, putResponse: { ok: boolean; status?: number; body?: object } = { ok: true }) {
    return vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => getBody } as Response)
      .mockResolvedValueOnce({
        ok: putResponse.ok,
        status: putResponse.status ?? 200,
        json: async () => putResponse.body ?? {},
      } as Response)
  }

  it('modo mock (sem ASAAS_API_KEY) → skipped_mock, nenhuma chamada de rede', async () => {
    process.env.ASAAS_API_KEY = ''
    const fetchSpy = vi.spyOn(global, 'fetch')
    const { configurePaymentCallback } = await import('./asaas')

    const result = await configurePaymentCallback('pay_abc123', SUCCESS_URL)

    expect(result).toEqual({ outcome: 'skipped_mock' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('A) faz GET antes do PUT — exatamente 2 chamadas, GET primeiro', async () => {
    setProdEnv()
    const fetchSpy = mockGetThenPut(chargeResponse())
    const { configurePaymentCallback } = await import('./asaas')

    await configurePaymentCallback('pay abc/123', SUCCESS_URL)

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    const [getUrl, getOptions] = fetchSpy.mock.calls[0]
    expect(String(getUrl)).toContain(encodeURIComponent('pay abc/123'))
    expect(getOptions?.method ?? 'GET').toBe('GET')
    const [, putOptions] = fetchSpy.mock.calls[1]
    expect(putOptions?.method).toBe('PUT')
  })

  it('A) GET falha → nenhum PUT ocorre, devolve error', async () => {
    setProdEnv()
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false, status: 404, json: async () => ({ errors: [{ code: 'invalid_id' }] }),
    } as Response)
    const { configurePaymentCallback } = await import('./asaas')

    const result = await configurePaymentCallback('pay_abc123', SUCCESS_URL)

    expect(result).toEqual({ outcome: 'error', httpStatus: 404, errorCode: 'invalid_id' })
    expect(fetchSpy).toHaveBeenCalledTimes(1) // só o GET, nunca chegou a tentar o PUT
  })

  it('B) payload do PUT contém exatamente billingType/value/dueDate atuais + callback — nada mais', async () => {
    setProdEnv()
    mockGetThenPut(chargeResponse({ billingType: 'UNDEFINED', value: 149, dueDate: '2026-08-05' }))
    const { configurePaymentCallback } = await import('./asaas')

    const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)

    expect(result).toEqual({ outcome: 'configured' })
    const fetchSpy = vi.mocked(global.fetch)
    const [, putOptions] = fetchSpy.mock.calls[1]
    const body = JSON.parse(putOptions?.body as string)
    expect(body).toEqual({
      billingType: 'UNDEFINED',
      value: 149,
      dueDate: '2026-08-05',
      callback: { successUrl: SUCCESS_URL, autoRedirect: true },
    })
    expect(body.customer).toBeUndefined()
    expect(body.subscription).toBeUndefined()
    expect(body.description).toBeUndefined()
    expect(body.discount).toBeUndefined()
    expect(body.interest).toBeUndefined()
    expect(body.fine).toBeUndefined()
    expect(body.split).toBeUndefined()
    expect(body.status).toBeUndefined()
  })

  it('B) billingType UNDEFINED é preservado, nunca substituído por outro valor', async () => {
    setProdEnv()
    mockGetThenPut(chargeResponse({ billingType: 'UNDEFINED' }))
    const { configurePaymentCallback } = await import('./asaas')
    await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)
    const [, putOptions] = vi.mocked(global.fetch).mock.calls[1]
    expect(JSON.parse(putOptions?.body as string).billingType).toBe('UNDEFINED')
  })

  it('B) valor/vencimento reenviados são os do GET, não valores fixos/defaults', async () => {
    setProdEnv()
    mockGetThenPut(chargeResponse({ value: 273.5, dueDate: '2099-01-01' }))
    const { configurePaymentCallback } = await import('./asaas')
    await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)
    const [, putOptions] = vi.mocked(global.fetch).mock.calls[1]
    const body = JSON.parse(putOptions?.body as string)
    expect(body.value).toBe(273.5)
    expect(body.dueDate).toBe('2099-01-01')
  })

  describe('C) status compatível com atualização', () => {
    it('PENDING permite atualizar', async () => {
      setProdEnv()
      mockGetThenPut(chargeResponse({ status: 'PENDING' }))
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'configured' })
    })

    it('OVERDUE permite atualizar', async () => {
      setProdEnv()
      mockGetThenPut(chargeResponse({ status: 'OVERDUE' }))
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'configured' })
    })

    it('CONFIRMED bloqueia — nenhum PUT é feito', async () => {
      setProdEnv()
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponse({ status: 'CONFIRMED' }) } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_status' })
      expect(fetchSpy).toHaveBeenCalledTimes(1) // só o GET, nenhum PUT
    })

    it('RECEIVED bloqueia', async () => {
      setProdEnv()
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponse({ status: 'RECEIVED' }) } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_status' })
    })

    it('REFUNDED bloqueia', async () => {
      setProdEnv()
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponse({ status: 'REFUNDED' }) } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_status' })
    })

    it('status desconhecido/futuro bloqueia', async () => {
      setProdEnv()
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponse({ status: 'ALGO_NOVO_DA_ASAAS' }) } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_status' })
    })
  })

  describe('F) validação de billingType (dados do GET)', () => {
    it('UNDEFINED é válido → configured', async () => {
      setProdEnv()
      mockGetThenPut(chargeResponse({ billingType: 'UNDEFINED' }))
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'configured' })
    })

    it('outro valor suportado (BOLETO) é válido → configured', async () => {
      setProdEnv()
      mockGetThenPut(chargeResponse({ billingType: 'BOLETO' }))
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'configured' })
    })

    it('string vazia é rejeitada → skipped_invalid_charge_data, nenhum PUT', async () => {
      setProdEnv()
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponse({ billingType: '' }) } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_charge_data', reason: 'invalid_billing_type' })
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    it('valor desconhecido (fora da allowlist) é rejeitado', async () => {
      setProdEnv()
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponse({ billingType: 'CRYPTO' }) } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_charge_data', reason: 'invalid_billing_type' })
    })

    it('null é rejeitado', async () => {
      setProdEnv()
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponseWithout('billingType', { billingType: null }) } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_charge_data', reason: 'invalid_billing_type' })
    })

    it('ausente (undefined) é rejeitado', async () => {
      setProdEnv()
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponseWithout('billingType') } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_charge_data', reason: 'invalid_billing_type' })
    })
  })

  describe('G) validação de value (dados do GET)', () => {
    it('149 é válido e preservado', async () => {
      setProdEnv()
      mockGetThenPut(chargeResponse({ value: 149 }))
      const { configurePaymentCallback } = await import('./asaas')
      await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)
      const [, putOptions] = vi.mocked(global.fetch).mock.calls[1]
      expect(JSON.parse(putOptions?.body as string).value).toBe(149)
    })

    it('decimal é válido e preservado sem arredondamento', async () => {
      setProdEnv()
      mockGetThenPut(chargeResponse({ value: 149.99 }))
      const { configurePaymentCallback } = await import('./asaas')
      await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)
      const [, putOptions] = vi.mocked(global.fetch).mock.calls[1]
      expect(JSON.parse(putOptions?.body as string).value).toBe(149.99)
    })

    it('zero é rejeitado', async () => {
      setProdEnv()
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponse({ value: 0 }) } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_charge_data', reason: 'invalid_value' })
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    it('negativo é rejeitado', async () => {
      setProdEnv()
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponse({ value: -10 }) } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_charge_data', reason: 'invalid_value' })
    })

    it('NaN é rejeitado', async () => {
      setProdEnv()
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponse({ value: NaN }) } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_charge_data', reason: 'invalid_value' })
    })

    it('Infinity é rejeitado', async () => {
      setProdEnv()
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponse({ value: Infinity }) } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_charge_data', reason: 'invalid_value' })
    })

    it('string numérica "149" é rejeitada (nunca convertida)', async () => {
      setProdEnv()
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponse({ value: '149' }) } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_charge_data', reason: 'invalid_value' })
    })

    it('ausente é rejeitado', async () => {
      setProdEnv()
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponseWithout('value') } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_charge_data', reason: 'invalid_value' })
    })
  })

  describe('H) validação de dueDate (dados do GET)', () => {
    it('data válida YYYY-MM-DD é preservada exatamente', async () => {
      setProdEnv()
      mockGetThenPut(chargeResponse({ dueDate: '2026-12-31' }))
      const { configurePaymentCallback } = await import('./asaas')
      await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)
      const [, putOptions] = vi.mocked(global.fetch).mock.calls[1]
      expect(JSON.parse(putOptions?.body as string).dueDate).toBe('2026-12-31')
    })

    it('formato DD/MM/YYYY é rejeitado', async () => {
      setProdEnv()
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponse({ dueDate: '31/12/2026' }) } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_charge_data', reason: 'invalid_due_date' })
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    it('timestamp ISO completo é rejeitado', async () => {
      setProdEnv()
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponse({ dueDate: '2026-08-05T12:00:00.000Z' }) } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_charge_data', reason: 'invalid_due_date' })
    })

    it('2026-02-30 (dia inexistente) é rejeitado', async () => {
      setProdEnv()
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponse({ dueDate: '2026-02-30' }) } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_charge_data', reason: 'invalid_due_date' })
    })

    it('mês 13 é rejeitado', async () => {
      setProdEnv()
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponse({ dueDate: '2026-13-01' }) } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_charge_data', reason: 'invalid_due_date' })
    })

    it('dia zero é rejeitado', async () => {
      setProdEnv()
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponse({ dueDate: '2026-08-00' }) } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_charge_data', reason: 'invalid_due_date' })
    })

    it('string vazia é rejeitada', async () => {
      setProdEnv()
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponse({ dueDate: '' }) } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_charge_data', reason: 'invalid_due_date' })
    })

    it('ausente é rejeitado', async () => {
      setProdEnv()
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponseWithout('dueDate') } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_charge_data', reason: 'invalid_due_date' })
    })

    it('2028-02-29 (ano bissexto) é válida e reenviada exatamente, sem conversão de timezone', async () => {
      setProdEnv()
      mockGetThenPut(chargeResponse({ dueDate: '2028-02-29' }))
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'configured' })
      const [, putOptions] = vi.mocked(global.fetch).mock.calls[1]
      expect(JSON.parse(putOptions?.body as string).dueDate).toBe('2028-02-29')
    })

    it('2000-02-29 (bissexto — divisível por 400) é válida', async () => {
      setProdEnv()
      mockGetThenPut(chargeResponse({ dueDate: '2000-02-29' }))
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'configured' })
    })

    it('2026-02-29 (não bissexto) bloqueia o PUT', async () => {
      setProdEnv()
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponse({ dueDate: '2026-02-29' }) } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_charge_data', reason: 'invalid_due_date' })
      expect(fetchSpy).toHaveBeenCalledTimes(1) // só o GET, nenhum PUT
    })

    it('1900-02-29 (divisível por 100 mas não por 400 — não bissexto) bloqueia o PUT', async () => {
      setProdEnv()
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => chargeResponse({ dueDate: '1900-02-29' }) } as Response)
      const { configurePaymentCallback } = await import('./asaas')
      expect(await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)).toEqual({ outcome: 'skipped_invalid_charge_data', reason: 'invalid_due_date' })
    })
  })

  describe('D) erros sanitizados', () => {
    it('HTTP 400 com error code → devolve somente httpStatus+errorCode, nunca a description', async () => {
      setProdEnv()
      mockGetThenPut(chargeResponse(), {
        ok: false, status: 400,
        body: { errors: [{ code: 'invalid_action', description: 'dado sensível de payload que nunca pode aparecer' }] },
      })
      const { configurePaymentCallback } = await import('./asaas')

      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)

      expect(result).toEqual({ outcome: 'error', httpStatus: 400, errorCode: 'invalid_action' })
      expect(JSON.stringify(result)).not.toContain('dado sensível')
    })

    it('resposta de erro sem JSON válido não quebra — devolve error sem errorCode', async () => {
      setProdEnv()
      vi.spyOn(global, 'fetch')
        .mockResolvedValueOnce({ ok: true, json: async () => chargeResponse() } as Response)
        .mockResolvedValueOnce({ ok: false, status: 500, json: async () => { throw new Error('not json') } } as unknown as Response)
      const { configurePaymentCallback } = await import('./asaas')

      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)
      expect(result).toEqual({ outcome: 'error', httpStatus: 500 })
    })

    it('errorCode é truncado e nunca inclui a description completa', async () => {
      setProdEnv()
      const longCode = 'x'.repeat(200)
      mockGetThenPut(chargeResponse(), { ok: false, status: 422, body: { errors: [{ code: longCode, description: 'texto longo irrelevante' }] } })
      const { configurePaymentCallback } = await import('./asaas')

      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL) as { outcome: string; errorCode?: string }
      expect(result.errorCode?.length).toBeLessThanOrEqual(60)
      expect(result.errorCode).not.toContain('texto longo')
    })

    it('string de errorCode normal permanece igual (nada removido)', async () => {
      setProdEnv()
      mockGetThenPut(chargeResponse(), { ok: false, status: 400, body: { errors: [{ code: 'plain_code_123' }] } })
      const { configurePaymentCallback } = await import('./asaas')
      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL) as { errorCode?: string }
      expect(result.errorCode).toBe('plain_code_123')
    })

    it('\\n no errorCode é removido (nunca chega ao resultado)', async () => {
      setProdEnv()
      mockGetThenPut(chargeResponse(), { ok: false, status: 400, body: { errors: [{ code: 'abc\ndef' }] } })
      const { configurePaymentCallback } = await import('./asaas')
      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL) as { errorCode?: string }
      expect(result.errorCode).toBe('abc def')
      expect(result.errorCode).not.toContain('\n')
    })

    it('\\r\\n no errorCode é removido', async () => {
      setProdEnv()
      mockGetThenPut(chargeResponse(), { ok: false, status: 400, body: { errors: [{ code: 'abc\r\ndef' }] } })
      const { configurePaymentCallback } = await import('./asaas')
      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL) as { errorCode?: string }
      expect(result.errorCode).toBe('abc def')
    })

    it('\\t no errorCode é removido', async () => {
      setProdEnv()
      mockGetThenPut(chargeResponse(), { ok: false, status: 400, body: { errors: [{ code: 'abc\tdef' }] } })
      const { configurePaymentCallback } = await import('./asaas')
      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL) as { errorCode?: string }
      expect(result.errorCode).toBe('abc def')
    })

    it('caracteres de controle ASCII (codepoint <= 0x1f) são removidos', async () => {
      setProdEnv()
      const withControls = 'abc' + String.fromCharCode(1) + String.fromCharCode(31) + 'def'
      mockGetThenPut(chargeResponse(), { ok: false, status: 400, body: { errors: [{ code: withControls }] } })
      const { configurePaymentCallback } = await import('./asaas')
      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL) as { errorCode?: string }
      expect(result.errorCode).toBe('abc def')
    })

    it('DEL (codepoint 0x7f) é removido', async () => {
      setProdEnv()
      const withDel = 'abc' + String.fromCharCode(127) + 'def'
      mockGetThenPut(chargeResponse(), { ok: false, status: 400, body: { errors: [{ code: withDel }] } })
      const { configurePaymentCallback } = await import('./asaas')
      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL) as { errorCode?: string }
      expect(result.errorCode).toBe('abc def')
    })

    it('múltiplos espaços são normalizados para um só', async () => {
      setProdEnv()
      mockGetThenPut(chargeResponse(), { ok: false, status: 400, body: { errors: [{ code: 'abc   def' }] } })
      const { configurePaymentCallback } = await import('./asaas')
      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL) as { errorCode?: string }
      expect(result.errorCode).toBe('abc def')
    })

    it('resultado final continua truncado em 60 caracteres mesmo após sanitização', async () => {
      setProdEnv()
      const longWithNewlines = 'a'.repeat(70) + '\n' + 'b'.repeat(10)
      mockGetThenPut(chargeResponse(), { ok: false, status: 400, body: { errors: [{ code: longWithNewlines }] } })
      const { configurePaymentCallback } = await import('./asaas')
      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL) as { errorCode?: string }
      expect(result.errorCode?.length).toBeLessThanOrEqual(60)
    })

    it('string composta só de caracteres de controle vira undefined', async () => {
      setProdEnv()
      const onlyControls = String.fromCharCode(1) + String.fromCharCode(2) + '\n\r\t'
      mockGetThenPut(chargeResponse(), { ok: false, status: 400, body: { errors: [{ code: onlyControls }] } })
      const { configurePaymentCallback } = await import('./asaas')
      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL) as { errorCode?: string }
      expect(result.errorCode).toBeUndefined()
    })

    it('errorCode sanitizado nunca contém \\n ou \\r — garante log de uma única linha', async () => {
      setProdEnv()
      mockGetThenPut(chargeResponse(), { ok: false, status: 400, body: { errors: [{ code: 'linha1\nlinha2\rlinha3' }] } })
      const { configurePaymentCallback } = await import('./asaas')
      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL) as { errorCode?: string }
      expect(result.errorCode).not.toMatch(/[\n\r]/)
    })

    it('errorCode contendo U+0085 (NEXT LINE) é sanitizado', async () => {
      setProdEnv()
      const withNextLine = 'abc' + String.fromCharCode(133) + 'def'
      mockGetThenPut(chargeResponse(), { ok: false, status: 400, body: { errors: [{ code: withNextLine }] } })
      const { configurePaymentCallback } = await import('./asaas')
      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL) as { errorCode?: string }
      expect(result.errorCode).toBe('abc def')
      expect(result.errorCode?.indexOf(String.fromCharCode(133))).toBe(-1)
    })

    it('errorCode contendo U+2028 (LINE SEPARATOR) é sanitizado', async () => {
      setProdEnv()
      const withLineSep = 'abc' + String.fromCharCode(8232) + 'def'
      mockGetThenPut(chargeResponse(), { ok: false, status: 400, body: { errors: [{ code: withLineSep }] } })
      const { configurePaymentCallback } = await import('./asaas')
      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL) as { errorCode?: string }
      expect(result.errorCode).toBe('abc def')
      expect(result.errorCode?.indexOf(String.fromCharCode(8232))).toBe(-1)
    })

    it('errorCode contendo U+2029 (PARAGRAPH SEPARATOR) é sanitizado', async () => {
      setProdEnv()
      const withParaSep = 'abc' + String.fromCharCode(8233) + 'def'
      mockGetThenPut(chargeResponse(), { ok: false, status: 400, body: { errors: [{ code: withParaSep }] } })
      const { configurePaymentCallback } = await import('./asaas')
      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL) as { errorCode?: string }
      expect(result.errorCode).toBe('abc def')
      expect(result.errorCode?.indexOf(String.fromCharCode(8233))).toBe(-1)
    })

    it('combinação dos três separadores Unicode é sanitizada e o resultado fica em uma única linha', async () => {
      setProdEnv()
      const combined = 'a' + String.fromCharCode(133) + 'b' + String.fromCharCode(8232) + 'c' + String.fromCharCode(8233) + 'd'
      mockGetThenPut(chargeResponse(), { ok: false, status: 400, body: { errors: [{ code: combined }] } })
      const { configurePaymentCallback } = await import('./asaas')
      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL) as { errorCode?: string }
      expect(result.errorCode).toBe('a b c d')
      const forbiddenCodes = [9, 10, 13, 133, 8232, 8233]
      const hasForbidden = Array.from(result.errorCode ?? '').some(ch => forbiddenCodes.includes(ch.codePointAt(0) ?? -1))
      expect(hasForbidden).toBe(false)
    })

    it('múltiplos separadores Unicode adjacentes viram um único espaço (normalização)', async () => {
      setProdEnv()
      const adjacent = 'abc' + String.fromCharCode(8232) + String.fromCharCode(8233) + String.fromCharCode(133) + 'def'
      mockGetThenPut(chargeResponse(), { ok: false, status: 400, body: { errors: [{ code: adjacent }] } })
      const { configurePaymentCallback } = await import('./asaas')
      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL) as { errorCode?: string }
      expect(result.errorCode).toBe('abc def')
    })

    it('truncamento em 60 caracteres continua aplicado após remover separadores Unicode', async () => {
      setProdEnv()
      const long = 'a'.repeat(70) + String.fromCharCode(8232) + 'b'.repeat(10)
      mockGetThenPut(chargeResponse(), { ok: false, status: 400, body: { errors: [{ code: long }] } })
      const { configurePaymentCallback } = await import('./asaas')
      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL) as { errorCode?: string }
      expect(result.errorCode?.length).toBeLessThanOrEqual(60)
    })

    it('string composta só pelos 3 separadores Unicode vira undefined', async () => {
      setProdEnv()
      const onlySeparators = String.fromCharCode(133) + String.fromCharCode(8232) + String.fromCharCode(8233)
      mockGetThenPut(chargeResponse(), { ok: false, status: 400, body: { errors: [{ code: onlySeparators }] } })
      const { configurePaymentCallback } = await import('./asaas')
      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL) as { errorCode?: string }
      expect(result.errorCode).toBeUndefined()
    })

    it('description sensível continua ausente mesmo quando o code tem separador Unicode', async () => {
      setProdEnv()
      const codeWithSep = 'err' + String.fromCharCode(8232) + 'or'
      mockGetThenPut(chargeResponse(), {
        ok: false, status: 400,
        body: { errors: [{ code: codeWithSep, description: 'dado sensível que nunca pode aparecer' }] },
      })
      const { configurePaymentCallback } = await import('./asaas')
      const result = await configurePaymentCallback('pay_synthetic_1', SUCCESS_URL)
      expect(JSON.stringify(result)).not.toContain('dado sensível')
      expect(JSON.stringify(result)).not.toContain(String.fromCharCode(8232))
    })

    it('nenhum paymentId completo aparece no resultado devolvido', async () => {
      setProdEnv()
      mockGetThenPut(chargeResponse(), { ok: false, status: 400, body: { errors: [{ code: 'x' }] } })
      const { configurePaymentCallback } = await import('./asaas')
      const result = await configurePaymentCallback('pay_realistic_full_id_987654', SUCCESS_URL)
      expect(JSON.stringify(result)).not.toContain('pay_realistic_full_id_987654')
    })
  })

  it('E) falha continua best-effort — nunca lança, resultado é sempre um objeto estruturado', async () => {
    setProdEnv()
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('rede indisponível'))
    const { configurePaymentCallback } = await import('./asaas')
    await expect(configurePaymentCallback('pay_abc123', SUCCESS_URL)).resolves.toEqual({ outcome: 'error' })
  })
})
