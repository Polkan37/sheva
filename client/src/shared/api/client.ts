const apiBaseUrl = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { headers: { Accept: 'application/json' }, signal })
  if (!response.ok) throw new ApiError(`API request failed: ${response.status}`, response.status)
  return response.json() as Promise<T>
}
