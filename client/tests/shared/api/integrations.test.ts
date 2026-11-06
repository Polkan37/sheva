import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api/client', () => ({
  apiFetch: vi.fn(),
  apiRequest: vi.fn(),
}))

import { apiFetch, apiRequest } from '@/shared/api/client'
import {
  createIntegration,
  deleteIntegration,
  getIntegrations,
  getIntegrationSettings,
  getYasno,
  updateIntegration,
} from '@/shared/api/integrations'

describe('integrations api', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('getIntegrations fetches the integrations endpoint', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ integrations: [] })
    const controller = new AbortController()

    await getIntegrations(controller.signal)

    expect(apiFetch).toHaveBeenCalledWith('/api/integrations', controller.signal)
  })

  it('getYasno returns the yasno integration when present', async () => {
    const yasno = { uid: 'yasno', id: '1' }
    vi.mocked(apiFetch).mockResolvedValue({ integrations: [{ uid: 'ukrhmc' }, yasno] })

    const result = await getYasno()

    expect(result).toBe(yasno)
  })

  it('getYasno throws when no yasno integration is present', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ integrations: [{ uid: 'ukrhmc' }] })

    await expect(getYasno()).rejects.toThrow('Yasno integration not found')
  })

  it('getIntegrationSettings fetches the settings endpoint', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ integrations: [] })
    const controller = new AbortController()

    await getIntegrationSettings(controller.signal)

    expect(apiFetch).toHaveBeenCalledWith('/api/integrations/settings', controller.signal)
  })

  it('createIntegration posts the integration payload', async () => {
    vi.mocked(apiRequest).mockResolvedValue({})
    const input = {
      uid: 'yasno',
      name: 'Yasno',
      type: 'power_outages',
      description: null,
      enabled: true,
    }

    await createIntegration(input)

    expect(apiRequest).toHaveBeenCalledWith('/api/integrations', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  })

  it('updateIntegration patches the integration by encoded id', async () => {
    vi.mocked(apiRequest).mockResolvedValue({})

    await updateIntegration('id 1', { enabled: false })

    expect(apiRequest).toHaveBeenCalledWith('/api/integrations/id%201', {
      method: 'PATCH',
      body: JSON.stringify({ enabled: false }),
    })
  })

  it('deleteIntegration issues a DELETE to the integration endpoint', async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined)

    await deleteIntegration('id-1')

    expect(apiRequest).toHaveBeenCalledWith('/api/integrations/id-1', { method: 'DELETE' })
  })
})
