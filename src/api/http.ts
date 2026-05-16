const sessionStorageKey = 'zero-x2c-admin-session'

export class ApiError extends Error {
  public readonly status: number
  public readonly details: unknown

  constructor(status: number, message: string, details: unknown = null) {
    super(message)
    this.status = status
    this.details = details
  }
}

export function getStoredAccessToken(): string | null {
  const rawSession = localStorage.getItem(sessionStorageKey)
  if (!rawSession) {
    return null
  }

  try {
    const parsed = JSON.parse(rawSession) as { accessToken?: unknown }
    return typeof parsed.accessToken === 'string' ? parsed.accessToken : null
  } catch {
    return null
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  const token = getStoredAccessToken()

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(path, {
    ...options,
    headers,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') ?? ''
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    throw new ApiError(response.status, extractErrorMessage(body, response.status), body)
  }

  return body as T
}

export function jsonRequest<T>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH',
  body: unknown,
): Promise<T> {
  return apiRequest<T>(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

export function toQueryString(params: Record<string, string | number | null | undefined>): string {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  })

  const value = query.toString()
  return value ? `?${value}` : ''
}

function extractErrorMessage(body: unknown, status: number): string {
  if (typeof body === 'object' && body !== null) {
    const data = body as { error?: unknown; title?: unknown; detail?: unknown; errors?: unknown }
    if (typeof data.error === 'string') {
      return data.error
    }

    if (typeof data.detail === 'string') {
      return data.detail
    }

    if (typeof data.title === 'string') {
      return data.title
    }

    if (data.errors && typeof data.errors === 'object') {
      return 'Validation failed.'
    }
  }

  if (typeof body === 'string' && body.length > 0) {
    return body
  }

  if (status === 401) {
    return 'Authentication is required.'
  }

  if (status === 403) {
    return 'You do not have permission to perform this action.'
  }

  return `Request failed with status ${status}.`
}

export { sessionStorageKey }
