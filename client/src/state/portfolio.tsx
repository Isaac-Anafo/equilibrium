import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api'
import type { ChartPoint, HoldingsRow, ProposedTrade, RebalanceEvent, TargetAllocation } from '../data/portfolio'
import { useAuth } from './auth'

export interface MetricView { key: string; label: string; value: string; gloss: string }

export type PortfolioLoadState = 'loading' | 'loaded' | 'no-portfolio' | 'error'

export interface PortfolioState {
  value: number
  totalReturn: number
  dayReturn: number
  driftPct: number
  threshold: number
  holdings: HoldingsRow[]
  proposedTrades: ProposedTrade[]
  rebalanceLog: RebalanceEvent[]
  autoApprove: boolean
  allocation: TargetAllocation
  notifPrefs: { email: boolean; push: boolean }
  asOf: string | null
}

interface PortfolioStore extends PortfolioState {
  loadState: PortfolioLoadState
  metrics: MetricView[]
  performance: ChartPoint[]
  executeTrades: () => void
  setThreshold: (n: number) => void
  setAutoApprove: (b: boolean) => void
  setAllocation: (a: TargetAllocation) => void
  setNotifPrefs: (p: { email: boolean; push: boolean }) => void
  loadPerformance: (range: string) => Promise<void>
}

interface SummaryData {
  value: number; totalReturn: number; dayReturn: number; driftPct: number; threshold: number; asOf?: string
}
interface ProposalData {
  ticker: string; name: string; action: string; shares: number; amount: number; cost: number; rationale: string
}
interface LogData { date: string; trigger: string; trades: number; cost: string }
interface ExecuteResponse {
  executedTrades: number; totalAmount: number; totalCost: number; portfolioValue: number; event: LogData
  positions: Array<{ ticker: string; name: string; current: number; target: number; delta: number; value: number }>
}

const Ctx = createContext<PortfolioStore | null>(null)

function emptyState(): PortfolioState {
  return {
    value: 0,
    totalReturn: 0,
    dayReturn: 0,
    driftPct: 0,
    threshold: 3.5,
    holdings: [],
    proposedTrades: [],
    rebalanceLog: [],
    autoApprove: false,
    allocation: { bonds: 40, domestic: 40, intl: 15, real_estate: 5 },
    notifPrefs: { email: true, push: false },
    asOf: null,
  }
}

function nowLabel() {
  const d = new Date()
  const h = d.getHours()
  const hh = h % 12 || 12
  return `Today, ${hh}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function buildLocalExecution(s: PortfolioState): Partial<PortfolioState> {
  const trades = s.proposedTrades
  const totalCost = trades.reduce((sum, t) => sum + t.cost, 0)
  const mapped = s.holdings.map((h) => {
    const tr = trades.find((t) => t.ticker === h.ticker)
    return tr ? { ...h, value: h.value + (tr.action === 'Buy' ? tr.amount : -tr.amount) } : h
  })
  const total = mapped.reduce((sum, h) => sum + h.value, 0)
  const holdings = mapped.map((h) => {
    const current = +((h.value / total) * 100).toFixed(1)
    return { ...h, current, delta: +(current - h.target).toFixed(1) }
  })
  const driftPct = +Math.max(...holdings.map((h) => Math.abs(h.delta))).toFixed(1)
  const event: RebalanceEvent = {
    date: nowLabel(),
    trigger: 'Approved rebalance',
    trades: trades.length,
    cost: `$${totalCost.toFixed(2)}`,
  }
  return { value: total, holdings, driftPct, proposedTrades: [], rebalanceLog: [event, ...s.rebalanceLog] }
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  const [portfolioId, setPortfolioId] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<PortfolioLoadState>('loading')
  const [metrics, setMetrics] = useState<MetricView[]>([])
  const [performance, setPerformance] = useState<ChartPoint[]>([])
  const [state, setState] = useState<PortfolioState>(emptyState)

  const applyPerformance = useCallback(async (id: string, range: string) => {
    try {
      const data = await apiFetch<Array<{ date: string; portfolio: number; benchmark: number }>>(
        `/portfolios/${id}/performance?range=${range}`,
      )
      setPerformance(data.map((p) => ({ date: p.date, portfolio: Number(p.portfolio), benchmark: Number(p.benchmark) })))
    } catch {
      // keep current chart data if the request fails
    }
  }, [])

  useEffect(() => {
    let active = true
    if (!token) {
      setPortfolioId(null)
      setState(emptyState())
      setMetrics([])
      setPerformance([])
      setLoadState('loaded')
      return () => { active = false }
    }

    const loadPortfolio = async () => {
      if (active) setLoadState('loading')
      try {
        const portfolio = await apiFetch<{ id: string; name: string; riskProfile: string }>('/portfolios/me')
        if (!active) return
        const id = portfolio.id
        setPortfolioId(id)

        const [summary, holdings, allocation, thresholdRes, autoApproveRes] = await Promise.all([
          apiFetch<SummaryData>('/portfolios/' + id + '/summary'),
          apiFetch<Array<{ ticker: string; name: string; current: number; target: number; value: number; delta: number }>>('/portfolios/' + id + '/holdings'),
          apiFetch<TargetAllocation>('/portfolios/' + id + '/target-allocation'),
          apiFetch<{ threshold: number }>('/portfolios/' + id + '/settings/drift-threshold'),
          apiFetch<{ autoApprove: boolean }>('/portfolios/' + id + '/settings/auto-approve'),
        ])

        if (!active) return
        setState((s) => ({
          ...s,
          value: Number(summary.value ?? s.value),
          totalReturn: Number(summary.totalReturn ?? s.totalReturn),
          dayReturn: Number(summary.dayReturn ?? s.dayReturn),
          driftPct: Number(summary.driftPct ?? s.driftPct),
          threshold: Number(thresholdRes.threshold ?? summary.threshold ?? s.threshold),
          asOf: summary.asOf ?? s.asOf,
          holdings: holdings.map((h) => ({
            ticker: h.ticker,
            name: h.name,
            current: Number(h.current),
            target: Number(h.target),
            value: Number(h.value),
            delta: Number(h.delta),
          })),
          allocation: {
            bonds: Number(allocation.bonds),
            domestic: Number(allocation.domestic),
            intl: Number(allocation.intl),
            real_estate: Number(allocation.real_estate),
          },
          autoApprove: Boolean(autoApproveRes.autoApprove),
        }))

        await Promise.allSettled([
          apiFetch<ProposalData[]>('/portfolios/' + id + '/rebalance/proposals').then((trades) => {
            if (!active) return
            setState((s) => ({
              ...s,
              proposedTrades: trades.map((t) => ({
                ticker: t.ticker,
                name: t.name,
                action: t.action === 'Sell' ? 'Sell' as const : 'Buy' as const,
                shares: Number(t.shares),
                amount: Number(t.amount),
                cost: Number(t.cost),
                rationale: t.rationale,
              })),
            }))
          }),
          apiFetch<LogData[]>('/portfolios/' + id + '/rebalance/log').then((log) => {
            if (!active) return
            setState((s) => ({
              ...s,
              rebalanceLog: log.map((ev) => ({ date: ev.date, trigger: ev.trigger, trades: Number(ev.trades), cost: ev.cost })),
            }))
          }),
          apiFetch<{ email: boolean; push: boolean }>('/notifications/preferences').then((p) => {
            if (!active) return
            setState((s) => ({ ...s, notifPrefs: { email: Boolean(p.email), push: Boolean(p.push) } }))
          }),
          apiFetch<MetricView[]>('/portfolios/' + id + '/metrics').then((m) => {
            if (!active) return
            setMetrics(m)
          }),
          applyPerformance(id, '1Y'),
        ])

        if (active) setLoadState('loaded')
      } catch (err) {
        if (!active) return
        const status = (err as { status?: number } | null)?.status
        setLoadState(status === 404 ? 'no-portfolio' : 'error')
      }
    }

    void loadPortfolio()
    return () => { active = false }
  }, [token, applyPerformance])

  const executeTrades = useCallback(() => {
    setState((s) => {
      if (s.proposedTrades.length === 0) return s
      const local = buildLocalExecution(s)

      void (async () => {
        if (portfolioId) {
          try {
            const res = await apiFetch<ExecuteResponse>('/portfolios/' + portfolioId + '/rebalance/execute', {
              method: 'POST',
              body: JSON.stringify({ requestId: crypto.randomUUID() }),
            })
            setState((s2) => ({
              ...s2,
              value: Number(res.portfolioValue),
              holdings: res.positions.map((p) => ({
                ticker: p.ticker,
                name: p.name,
                current: Number(p.current),
                target: Number(p.target),
                delta: Number(p.delta),
                value: Number(p.value),
              })),
              proposedTrades: [],
              rebalanceLog: [
                { date: res.event.date, trigger: res.event.trigger, trades: Number(res.event.trades), cost: res.event.cost },
                ...s2.rebalanceLog,
              ],
            }))
            return
          } catch {
            // fall back to the local simulation if the request fails
          }
        }
        setState((s2) => ({ ...s2, ...local }))
      })()

      return s
    })
  }, [portfolioId])

  const setThreshold = useCallback(async (threshold: number) => {
    setState((s) => ({ ...s, threshold }))
    if (!portfolioId) return
    try {
      await apiFetch<{ threshold: number }>(`/portfolios/${portfolioId}/settings/drift-threshold`, {
        method: 'PUT',
        body: JSON.stringify({ threshold }),
      })
    } catch {
      // keep local state update if the request fails
    }
  }, [portfolioId])

  const setAutoApprove = useCallback(async (autoApprove: boolean) => {
    setState((s) => ({ ...s, autoApprove }))
    if (!portfolioId) return
    try {
      await apiFetch<{ autoApprove: boolean }>(`/portfolios/${portfolioId}/settings/auto-approve`, {
        method: 'PUT',
        body: JSON.stringify({ autoApprove }),
      })
    } catch {
      // keep local state update if the request fails
    }
  }, [portfolioId])

  const setAllocation = useCallback(async (allocation: TargetAllocation) => {
    setState((s) => ({ ...s, allocation }))
    if (!portfolioId) return
    try {
      await apiFetch<{ bonds: number; domestic: number; intl: number; real_estate: number }>(`/portfolios/${portfolioId}/target-allocation`, {
        method: 'PUT',
        body: JSON.stringify({
          bonds: Number(allocation.bonds),
          domestic: Number(allocation.domestic),
          intl: Number(allocation.intl),
          real_estate: Number(allocation.real_estate),
        }),
      })
    } catch {
      // keep local state update if the request fails
    }
  }, [portfolioId])

  const setNotifPrefs = useCallback((notifPrefs: { email: boolean; push: boolean }) => {
    setState((s) => ({ ...s, notifPrefs }))
    if (!token) return
    void apiFetch('/notifications/preferences', { method: 'PUT', body: JSON.stringify(notifPrefs) }).catch(() => {})
  }, [token])

  const loadPerformance = useCallback(async (range: string) => {
    if (!portfolioId) return
    await applyPerformance(portfolioId, range)
  }, [portfolioId, applyPerformance])

  const value = useMemo<PortfolioStore>(
    () => ({
      ...state,
      loadState,
      metrics,
      performance,
      executeTrades,
      setThreshold,
      setAutoApprove,
      setAllocation,
      setNotifPrefs,
      loadPerformance,
    }),
    [state, loadState, metrics, performance, executeTrades, setThreshold, setAutoApprove, setAllocation, setNotifPrefs, loadPerformance],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePortfolio() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePortfolio must be used inside PortfolioProvider')
  return ctx
}
