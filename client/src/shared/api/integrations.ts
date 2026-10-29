
import { apiFetch, apiRequest } from './client'
import type {
  IntegrationsResponse,
  YasnoIntegration,
} from '../../entities/Integration/types'

export type IntegrationSettings = {
  id: string
  uid: string
  name: string
  type: string
  description: string | null
  enabled: boolean
  status: string
  lastError: string | null
  lastSyncAt: string | null
  createdAt: string
  updatedAt: string
}

export type IntegrationInput = Pick<
  IntegrationSettings,
  | 'uid'
  | 'name'
  | 'type'
  | 'description'
  | 'enabled'
>

type IntegrationSettingsResponse = {
  integrations: IntegrationSettings[]
}


export function getIntegrations(signal?: AbortSignal) {
  return apiFetch<IntegrationsResponse>(
    '/api/integrations',
    signal,
  )
}

export async function getYasno(
  signal?: AbortSignal,
): Promise<YasnoIntegration> {
  const { integrations } = await getIntegrations(signal)

  const yasno = integrations.find(
    (integration) => integration.uid === 'yasno',
  )

  if (!yasno) {
    throw new Error('Yasno integration not found')
  }

  return yasno as YasnoIntegration
}

export function getIntegrationSettings(
  signal?: AbortSignal,
) {
  return apiFetch<IntegrationSettingsResponse>(
    '/api/integrations/settings',
    signal,
  )
}

export function createIntegration(data: IntegrationInput) {
  return apiRequest<IntegrationSettings>(
    '/api/integrations',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  )
}

export function updateIntegration(
  id: string,
  data: Partial<IntegrationInput>,
) {
  return apiRequest<IntegrationSettings>(
    `/api/integrations/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  )
}

export function deleteIntegration(id: string) {
  return apiRequest<void>(
    `/api/integrations/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}
