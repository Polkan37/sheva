import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, apiRequest, ApiError } from '@/shared/api/client'

function mockResponse(init: {
  ok: boolean
  status: number
  json?: () => Promise<unknown>
}) {
  return {
    ok: init.ok,
    status: init.status,
    json: init.json ?? (() => Promise.resolve({})),
  } as Response
}

describe('apiRequest', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns parsed JSON on success', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ ok: true, status: 200, json: () => Promise.resolve({ hello: 'world' }) }),
    )

    const result = await apiRequest<{ hello: string }>('/api/test')
    expect(result).toEqual({ hello: 'world' })
  })

  it('returns undefined for a 204 No Content response without parsing the body', async () => {
    const json = vi.fn()
    vi.mocked(fetch).mockResolvedValue(mockResponse({ ok: true, status: 204, json }))

    const result = await apiRequest('/api/test')
    expect(result).toBeUndefined()
    expect(json).not.toHaveBeenCalled()
  })

  it('sends Content-Type header and JSON body when options.body is set', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ ok: true, status: 200 }))

    await apiRequest('/api/test', { method: 'POST', body: JSON.stringify({ a: 1 }) })

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(init?.headers).toMatchObject({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    })
  })

  it('omits Content-Type header when there is no body', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ ok: true, status: 200 }))

    await apiRequest('/api/test')

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(init?.headers).not.toHaveProperty('Content-Type')
  })

  it('allows custom headers to override defaults', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ ok: true, status: 200 }))

    await apiRequest('/api/test', { headers: { Accept: 'text/plain' } })

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(init?.headers).toMatchObject({ Accept: 'text/plain' })
  })

  it('throws ApiError with server-provided message on failure', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ ok: false, status: 404, json: () => Promise.resolve({ message: 'Not found' }) }),
    )

    await expect(apiRequest('/api/missing')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Not found',
      status: 404,
    })
  })

  it('throws ApiError with a default message when the error body has no message field', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ ok: false, status: 500, json: () => Promise.resolve({}) }),
    )

    await expect(apiRequest('/api/broken')).rejects.toMatchObject({
      message: 'API request failed: 500',
      status: 500,
    })
  })

  it('throws ApiError with a default message when the error body is not valid JSON', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ ok: false, status: 502, json: () => Promise.reject(new Error('bad json')) }),
    )

    await expect(apiRequest('/api/broken')).rejects.toMatchObject({
      message: 'API request failed: 502',
      status: 502,
    })
  })

  it('is an instance of Error and ApiError', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ ok: false, status: 400 }))

    try {
      await apiRequest('/api/broken')
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(ApiError)
    }
  })
})

describe('apiFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('forwards the abort signal to the underlying request', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ ok: true, status: 200 }))
    const controller = new AbortController()

    await apiFetch('/api/test', controller.signal)

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(init?.signal).toBe(controller.signal)
  })

  it('works without a signal', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ ok: true, status: 200 }))

    await apiFetch('/api/test')

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(init?.signal).toBeUndefined()
  })
})
