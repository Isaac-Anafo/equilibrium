import { Link } from 'react-router'

export function Logo({ to }: { to?: string }) {
  const inner = (
    <>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="10" stroke="#2F6E5B" strokeWidth="1.5"/>
        <line x1="11" y1="4" x2="11" y2="18" stroke="#2F6E5B" strokeWidth="1.5" strokeLinecap="round"/>
        <ellipse cx="11" cy="11" rx="5" ry="10" stroke="#2F6E5B" strokeWidth="1"/>
      </svg>
      <span className="text-lg tracking-tight text-[#16232E] font-display font-normal">Equilibrium</span>
    </>
  )
  const cls = 'flex items-center gap-2.5 focus-visible:ring-2 focus-visible:ring-[#3E6E96] rounded-sm'
  if (!to) return <div className={cls}>{inner}</div>
  return <Link to={to} className={cls} aria-label="Equilibrium home">{inner}</Link>
}

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs tracking-[0.08em] uppercase text-[#16232E]/50 mb-1.5 font-sans">
      {children}
    </label>
  )
}

export function TextInput({ id, type = 'text', placeholder, value, onChange, autoComplete }: { id: string; type?: string; placeholder?: string; value: string; onChange: (v: string) => void; autoComplete?: string }) {
  return (
    <input id={id} type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete}
      className="w-full px-3.5 py-2.5 bg-white border border-[#DCD8CF] text-[#16232E] placeholder:text-[#16232E]/30 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#3E6E96] focus:border-transparent transition-shadow duration-150 font-sans"
      />
  )
}

export function Btn({ onClick, children, disabled = false, variant = 'primary', small = false }: { onClick?: () => void; children: React.ReactNode; disabled?: boolean; variant?: 'primary' | 'ghost' | 'destructive'; small?: boolean }) {
  const base = `${small ? 'px-4 py-2 text-xs' : 'px-5 py-2.5 text-sm'} font-medium rounded-sm transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3E6E96] focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed`
  const styles = {
    primary:     'bg-[#2F6E5B] text-white hover:bg-[#265e4d] active:bg-[#1e4e40]',
    ghost:       'border border-[#DCD8CF] text-[#16232E]/70 hover:border-[#16232E]/30 hover:text-[#16232E] bg-transparent',
    destructive: 'border border-[#B4483D]/40 text-[#B4483D] hover:bg-[#B4483D]/5 bg-transparent',
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} font-sans`}>
      {children}
    </button>
  )
}

export function WideBtnPrimary({ onClick, children, disabled = false }: { onClick?: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full py-3 bg-[#2F6E5B] text-white text-sm font-medium rounded-sm hover:bg-[#265e4d] active:bg-[#1e4e40] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3E6E96] focus-visible:ring-offset-2 font-sans">{children}</button>
  )
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-[0.08em] text-[#16232E]/40 mb-3">{children}</div>
  )
}

export function PageHeading({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="pb-6 border-b border-[#DCD8CF] mb-8 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-light text-[#16232E] mb-1 font-display">{title}</h1>
        <p className="text-sm text-[#16232E]/50">{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

export function Badge({ type }: { type: 'buy' | 'sell' | 'balanced' | 'drift' }) {
  const map = {
    buy:      { label: 'Buy',      bg: 'bg-[#3E6E96]/10', text: 'text-[#3E6E96]' },
    sell:     { label: 'Sell',     bg: 'bg-[#B4483D]/10', text: 'text-[#B4483D]' },
    balanced: { label: 'Balanced', bg: 'bg-[#2F6E5B]/10', text: 'text-[#2F6E5B]' },
    drift:    { label: 'Drift',    bg: 'bg-[#D98E3F]/10', text: 'text-[#D98E3F]' },
  }
  const { label, bg, text } = map[type]
  return (
    <span className={`inline-block px-2 py-0.5 rounded-sm text-[10px] font-medium uppercase tracking-[0.06em] ${bg} ${text} font-sans`}>
      {label}
    </span>
  )
}

/** Centred paper card used by the sign-in and onboarding routes. */
export function AuthShell({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-10"><Logo to="/"/></div>
      <div className="w-full max-w-[440px] bg-white border border-[#DCD8CF] rounded-sm px-5 sm:px-8 py-8 shadow-[0_1px_3px_rgba(22,35,46,0.06)]">
        {children}
      </div>
      <p className="mt-8 text-xs text-[#16232E]/25">{footer ?? '© 2026 Equilibrium Financial, Inc.'}</p>
    </div>
  )
}
