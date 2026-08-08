// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskProfile = 'conservative' | 'balanced' | 'growth'
export type SortKey = 'asset' | 'current' | 'target' | 'delta'
export type SortDir = 'asc' | 'desc'
export type LoadState = 'loading' | 'loaded' | 'error'

export interface Holding {
  id: string; ticker: string; name: string; shares: string; price: string
}
export interface FormState {
  email: string; password: string; portfolioName: string; riskProfile: RiskProfile | null; holdings: Holding[]
}
export type TradeAction = 'Buy' | 'Sell'
export interface HoldingsRow {
  ticker: string; name: string; current: number; target: number; value: number; delta: number
}
export interface ProposedTrade {
  ticker: string; name: string; action: TradeAction; shares: number; amount: number; cost: number; rationale: string
}
export interface RebalanceEvent {
  date: string; trigger: string; trades: number; cost: string
}
export interface TargetAllocation {
  bonds: number; domestic: number; intl: number; real_estate: number
}
export interface ChartPoint {
  date: string; portfolio: number; benchmark: number
}

// ─── Static config ────────────────────────────────────────────────────────────

export const RISK_PROFILES = [
  { id: 'conservative' as RiskProfile, label: 'Conservative', description: 'Capital preservation. Lower volatility, lower expected return.', allocation: '70% bonds · 20% domestic equity · 10% intl', return: '4–6% est. annual',
    icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="4" y="12" width="4" height="12" rx="1" fill="currentColor" opacity="0.4"/><rect x="12" y="8" width="4" height="16" rx="1" fill="currentColor" opacity="0.65"/><rect x="20" y="4" width="4" height="20" rx="1" fill="currentColor"/></svg> },
  { id: 'balanced'      as RiskProfile, label: 'Balanced',     description: 'Steady compounding. Diversified across asset classes.',          allocation: '40% bonds · 40% domestic equity · 20% intl', return: '6–9% est. annual',
    icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="2" fill="none"/><line x1="14" y1="5" x2="14" y2="23" stroke="currentColor" strokeWidth="2"/><line x1="5" y1="14" x2="23" y2="14" stroke="currentColor" strokeWidth="2"/></svg> },
  { id: 'growth'        as RiskProfile, label: 'Growth',       description: 'Long-horizon appreciation. Higher volatility accepted.',          allocation: '10% bonds · 55% domestic equity · 35% intl', return: '8–12% est. annual',
    icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><polyline points="4,22 10,14 16,17 24,6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" fill="none"/><polyline points="20,6 24,6 24,10" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" fill="none"/></svg> },
]

export const EMPTY_HOLDING = (): Holding => ({ id: crypto.randomUUID(), ticker: '', name: '', shares: '', price: '' })

export const RANGES: { label: string; weeks: number }[] = [
  { label: '1M', weeks: 4 }, { label: '6M', weeks: 26 }, { label: '1Y', weeks: 52 }, { label: 'All', weeks: 156 },
]
