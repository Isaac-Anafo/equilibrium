export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081/api/v1').replace(/\/$/, '')

const TOKEN_KEY = 'equilibrium.auth.token'
const REFRESH_KEY = 'equilibrium.auth.refresh'
const AUTH_EXPIRED_EVENT = 'equilibrium:auth-expired'
const PUBLIC_AUTH_PATHS = new Set(['/auth/signin', '/auth/signup', '/auth/refresh'])

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch { /* storage unavailable */ }
}

function readToken(): string | null {
  return readStorage(TOKEN_KEY)
}

function clearAuthStorage() {
  writeStorage(TOKEN_KEY, null)
  writeStorage(REFRESH_KEY, null)
}

let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = readStorage(REFRESH_KEY)
      if (!refreshToken) return null
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })
        if (!response.ok) throw new Error('refresh failed')
        const data = await response.json()
        if (!data?.accessToken) throw new Error('refresh failed')
        writeStorage(TOKEN_KEY, data.accessToken)
        writeStorage(REFRESH_KEY, data.refreshToken ?? refreshToken)
        return data.accessToken as string
      } catch {
        clearAuthStorage()
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
        return null
      }
    })().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T

  const contentType = response.headers.get('content-type') ?? ''
  const raw = contentType.includes('application/json') ? await response.json().catch(() => null) : await response.text().catch(() => '')

  if (!response.ok) {
    const message = (raw && typeof raw === 'object' && 'error' in raw && raw.error && typeof raw.error === 'object' && 'message' in raw.error)
      ? String((raw as { error: { message?: string } }).error.message)
      : (typeof raw === 'string' && raw ? raw : `Request failed (${response.status})`)
    const error = new Error(message) as Error & { status?: number }
    error.status = response.status
    throw error
  }

  return raw as T
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {})
  const token = readToken()

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (!(init.body instanceof FormData) && !headers.has('Content-Type') && init.body != null) {
    headers.set('Content-Type', 'application/json')
  }

  const url = `${API_BASE_URL}${path}`
  const response = await fetch(url, { ...init, headers })

  if (response.status === 401 && token && !PUBLIC_AUTH_PATHS.has(path)) {
    const fresh = await refreshAccessToken()
    if (fresh) {
      const retryHeaders = new Headers(headers)
      retryHeaders.set('Authorization', `Bearer ${fresh}`)
      const retry = await fetch(url, { ...init, headers: retryHeaders })
      return parseResponse<T>(retry)
    }
  }

  return parseResponse<T>(response)
}
