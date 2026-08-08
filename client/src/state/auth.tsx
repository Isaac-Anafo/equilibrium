import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api'

export interface AuthUser { email: string; displayName?: string | null }

interface AuthStore {
  user: AuthUser | null
  token: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => void
}

const USER_KEY = 'equilibrium.auth.user'
const TOKEN_KEY = 'equilibrium.auth.token'
const REFRESH_KEY = 'equilibrium.auth.refresh'
const AUTH_EXPIRED_EVENT = 'equilibrium:auth-expired'
const Ctx = createContext<AuthStore | null>(null)

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function persist(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch { /* storage unavailable */ }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser())
  const [token, setToken] = useState<string | null>(() => readStoredToken())

  useEffect(() => {
    try {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
      else localStorage.removeItem(USER_KEY)
    } catch { /* storage unavailable */ }
  }, [user])

  useEffect(() => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    } catch { /* storage unavailable */ }
  }, [token])

  useEffect(() => {
    if (!token) return
    apiFetch<AuthUser>('/auth/me')
      .then((me) => setUser(me))
      .catch(() => {
        setUser(null)
        setToken(null)
        persist(REFRESH_KEY, null)
      })
  }, [token])

  useEffect(() => {
    const onAuthExpired = () => {
      setUser(null)
      setToken(null)
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await apiFetch<{ accessToken: string; refreshToken: string; user: AuthUser }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setToken(response.accessToken)
    persist(TOKEN_KEY, response.accessToken)
    persist(REFRESH_KEY, response.refreshToken)
    setUser(response.user)
    persist(USER_KEY, JSON.stringify(response.user))
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const response = await apiFetch<{ accessToken: string; refreshToken: string; user: AuthUser }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName: null }),
    })
    setToken(response.accessToken)
    persist(TOKEN_KEY, response.accessToken)
    persist(REFRESH_KEY, response.refreshToken)
    setUser(response.user)
    persist(USER_KEY, JSON.stringify(response.user))
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    setToken(null)
    persist(REFRESH_KEY, null)
  }, [])

  const value = useMemo(() => ({ user, token, signIn, signUp, signOut }), [user, token, signIn, signUp, signOut])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
