import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from './auth'

export interface Notif {
  id: string
  type: 'drift' | 'trade' | 'system'
  text: string
  time: string
  unread: boolean
}

interface NotifStore {
  notifs: Notif[]
  unread: number
  markAllRead: () => void
  push: (n: Notif) => void
}

const Ctx = createContext<NotifStore | null>(null)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  const [notifs, setNotifs] = useState<Notif[]>([])

  useEffect(() => {
    if (!token) return

    void apiFetch<Array<{ id: string; type: string; text: string; time: string; unread: boolean }>>('/notifications')
      .then((items) => {
        setNotifs(items.map((n) => ({
          id: n.id,
          type: (n.type === 'drift' || n.type === 'trade' || n.type === 'system') ? n.type : 'system',
          text: n.text,
          time: n.time,
          unread: n.unread,
        })))
      })
      .catch(() => {
        // leave the list empty if the endpoint is unavailable
      })
  }, [token])

  const markAllRead = useCallback(() => {
    setNotifs((ns) => ns.map((n) => (n.unread ? { ...n, unread: false } : n)))
    const token = (() => {
      try { return localStorage.getItem('equilibrium.auth.token') }
      catch { return null }
    })()
    if (!token) return
    void apiFetch('/notifications/read-all', { method: 'POST' }).catch(() => {})
  }, [])

  const push = useCallback((n: Notif) => setNotifs((ns) => [n, ...ns]), [])
  const value = useMemo(
    () => ({ notifs, unread: notifs.reduce((n, x) => n + (x.unread ? 1 : 0), 0), markAllRead, push }),
    [notifs, markAllRead, push],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNotifications() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider')
  return ctx
}
