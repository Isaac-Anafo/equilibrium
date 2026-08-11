import { API_BASE_URL, authHeaders, refreshAccessToken } from './api'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

function extractError(raw: string): string | null {
  try {
    const data = JSON.parse(raw)
    const msg = data?.error?.message ?? data?.message
    return typeof msg === 'string' && msg ? msg : null
  } catch {
    return null
  }
}

export async function streamChat(
  message: string,
  history: ChatTurn[],
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
  onTruncated?: () => void,
): Promise<void> {
  const body = JSON.stringify({ message, history })

  let response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body,
    signal,
  })

  if (response.status === 401) {
    const fresh = await refreshAccessToken()
    if (fresh) {
      response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${fresh}` },
        body,
        signal,
      })
    }
  }

  if (!response.ok) {
    const raw = await response.text().catch(() => '')
    throw new Error(extractError(raw) ?? `Request failed (${response.status})`)
  }

  if (!response.body) return

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''
    for (const event of events) {
      const dataLine = event.split('\n').find((line) => line.startsWith('data:'))
      if (!dataLine) continue
      const payload = dataLine.slice(5).trim()
      if (payload === '[DONE]') return
      let data: { delta?: string; done?: boolean; error?: string; truncated?: boolean }
      try {
        data = JSON.parse(payload)
      } catch {
        continue
      }
      if (data.error) throw new Error(data.error)
      if (data.truncated) {
        onTruncated?.()
        return
      }
      if (data.done) return
      if (data.delta) onDelta(data.delta)
    }
  }
}