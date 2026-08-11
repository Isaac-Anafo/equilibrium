import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router'
import { Logo } from '../components/ui'
import ChatWidget from '../components/ChatWidget'
import { useAuth } from '../state/auth'
import { useNotifications } from '../state/notifications'

const NAV = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Rebalance', to: '/rebalance' },
  { label: 'Analytics', to: '/analytics' },
  { label: 'Settings',  to: '/settings'  },
]

function initialsOf(email: string) {
  const parts = email.split('@')[0].split(/[._\-\s]+/).filter(Boolean)
  const letters = parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('')
  return letters || 'EQ'
}

function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="w-7 h-7 rounded-full bg-[#2F6E5B]/70 text-white text-xs flex items-center justify-center hover:bg-[#2F6E5B] transition-colors focus-visible:ring-2 focus-visible:ring-[#3E6E96] font-mono">
        {initialsOf(user?.email ?? 'EQ')}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-56 bg-white border border-[#DCD8CF] rounded-sm shadow-lg py-1 z-50">
          <div className="px-4 py-2.5 border-b border-[#DCD8CF]/60">
            <div className="text-xs font-medium text-[#16232E] truncate">{user?.email ?? 'Signed in'}</div>
            <div className="text-[10px] text-[#16232E]/40 mt-0.5 uppercase tracking-[0.06em]">Equilibrium account</div>
          </div>
          <Link to="/settings" onClick={() => setOpen(false)} role="menuitem"
            className="block px-4 py-2.5 text-xs text-[#16232E]/70 hover:bg-[#16232E]/[0.03] hover:text-[#16232E] transition-colors">Settings</Link>
          <button role="menuitem" onClick={() => { setOpen(false); signOut() }}
            className="w-full text-left px-4 py-2.5 text-xs text-[#B4483D] hover:bg-[#B4483D]/5 transition-colors">Sign out</button>
        </div>
      )}
    </div>
  )
}

function AppHeader() {
  const { unread } = useNotifications()
  return (
    <header className="bg-[#16232E] border-b border-[#2C3B47] sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between gap-4 h-[52px]">
        <div className="flex items-center gap-6">
          <Logo to="/dashboard"/>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => `px-3 py-1.5 rounded-sm text-xs transition-colors font-sans ${isActive ? 'text-white bg-white/10' : 'text-white/40 hover:text-white/70'}`}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <NavLink to="/notifications"
            className={({ isActive }) => `relative transition-colors focus-visible:ring-2 focus-visible:ring-[#3E6E96] rounded-sm p-1 ${isActive ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
            aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}>
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
              <path d="M8.5 1.5a5.5 5.5 0 00-5.5 5.5v3l-1 1.5h13l-1-1.5V7a5.5 5.5 0 00-5.5-5.5z" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M7 13.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            {unread > 0 && <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#D98E3F]" aria-hidden="true"/>}
          </NavLink>
          <UserMenu/>
        </div>
      </div>
      {/* Mobile nav */}
      <nav className="md:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
        {[...NAV, { label: 'Alerts', to: '/notifications' }].map((item) => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) => `px-2.5 py-1 rounded-sm text-[11px] whitespace-nowrap transition-colors ${isActive ? 'text-white bg-white/10' : 'text-white/40'}`}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}

function RouteFallback() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="h-8 w-56 rounded bg-[#DCD8CF]/60 animate-pulse mb-4"/>
      <div className="h-40 rounded-sm bg-[#DCD8CF]/30 animate-pulse"/>
    </div>
  )
}

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#F7F5F0] font-sans">
      <AppHeader/>
      <Suspense fallback={<RouteFallback/>}>
        <Outlet/>
      </Suspense>
      <ChatWidget/>
      <ScrollRestoration/>
    </div>
  )
}
