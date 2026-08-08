import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router'
import { DeltaCell } from '../components/charts'
import { Badge, Btn, SectionLabel } from '../components/ui'
import { usePortfolio } from '../state/portfolio'

export default function Rebalance() {
  const { holdings, proposedTrades, driftPct, threshold } = usePortfolio()
  const tradeTotalCost = proposedTrades.reduce((s, t) => s + t.cost, 0)
  const [expanded, setExpanded] = useState<string | null>(null)
  const navigate = useNavigate()
  const balanced = proposedTrades.length === 0

  return (
    <main className="max-w-3xl mx-auto px-6 py-8 pb-32">
      <div className="pb-6 border-b border-[#DCD8CF] mb-8">
        <h1 className="text-3xl font-light text-[#16232E] mb-1 font-display">Drift &amp; Rebalance</h1>
        <p className="text-sm text-[#16232E]/50">{balanced ? 'Your portfolio is currently within its target allocation.' : 'Your portfolio has drifted from its target allocation. Review the proposed trades below.'}</p>
      </div>

      {/* Per-asset drift table */}
      <div className="mb-10">
        <SectionLabel>Current vs. target allocation</SectionLabel>
        <div className="bg-white border border-[#DCD8CF] rounded-sm overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead><tr className="border-b border-[#DCD8CF]">
              {['Asset','Current','Target','Drift','Direction'].map((c, i) => (
                <th key={c} className={`py-2.5 px-4 text-[10px] tracking-[0.08em] uppercase text-[#16232E]/40 font-normal ${i > 0 ? 'text-right' : 'text-left'}`}>{c}</th>
              ))}
            </tr></thead>
            <tbody>
              {holdings.map((h) => {
                const dir: 'buy' | 'sell' | 'balanced' = Math.abs(h.delta) <= 0.5 ? 'balanced' : h.delta > 0 ? 'sell' : 'buy'
                return (
                  <tr key={h.ticker} className="border-b border-[#DCD8CF]/50 hover:bg-[#16232E]/[0.015] transition-colors">
                    <td className="py-3 px-4"><span className="text-xs font-medium text-[#16232E] uppercase font-mono">{h.ticker}</span><span className="text-xs text-[#16232E]/40 ml-2.5 hidden sm:inline">{h.name}</span></td>
                    <td className="py-3 px-4 text-right text-xs text-[#16232E] font-mono">{h.current.toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right text-xs text-[#16232E]/55 font-mono">{h.target.toFixed(1)}%</td>
                    <DeltaCell delta={h.delta}/>
                    <td className="py-3 px-4 text-right"><Badge type={dir}/></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {balanced ? (
        <div className="bg-white border border-[#DCD8CF] rounded-sm p-8 text-center mb-10">
          <div className="w-12 h-12 rounded-full bg-[#2F6E5B]/10 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" stroke="#2F6E5B" strokeWidth="1.5"/><polyline points="6,12 10,16 18,8" stroke="#2F6E5B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <p className="text-sm text-[#16232E]/70 mb-1">Your portfolio is within its target allocation.</p>
          <p className="text-xs text-[#16232E]/45 mb-5">Drift is {driftPct}% — below your {threshold}% threshold. No trades are proposed right now.</p>
          <Link to="/dashboard" className="inline-block text-sm text-[#3E6E96] underline underline-offset-2 hover:no-underline">Back to dashboard</Link>
        </div>
      ) : (
        <>
          {/* Proposed trades table */}
          <div className="mb-10">
            <SectionLabel>Proposed trades</SectionLabel>
            <div className="bg-white border border-[#DCD8CF] rounded-sm overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead><tr className="border-b border-[#DCD8CF]">
                  {['Asset','Action','Shares','Amount','Est. cost'].map((c, i) => (
                    <th key={c} className={`py-2.5 px-4 text-[10px] tracking-[0.08em] uppercase text-[#16232E]/40 font-normal ${i >= 2 ? 'text-right' : 'text-left'}`}>{c}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {proposedTrades.map((t) => (
                    <tr key={t.ticker} className="border-b border-[#DCD8CF]/50">
                      <td className="py-3 px-4"><span className="text-xs font-medium text-[#16232E] uppercase font-mono">{t.ticker}</span><span className="text-xs text-[#16232E]/40 ml-2.5 hidden sm:inline">{t.name}</span></td>
                      <td className="py-3 px-4"><Badge type={t.action === 'Buy' ? 'buy' : 'sell'}/></td>
                      <td className="py-3 px-4 text-right text-xs text-[#16232E] font-mono">{t.shares.toFixed(1)}</td>
                      <td className="py-3 px-4 text-right text-xs text-[#16232E] font-mono">${t.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-xs text-[#16232E]/55 font-mono">{t.cost === 0 ? '—' : `$${t.cost.toFixed(2)}`}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#16232E]/[0.02]">
                    <td colSpan={3} className="py-2.5 px-4 text-xs text-[#16232E]/40">Total estimated cost</td>
                    <td colSpan={2} className="py-2.5 px-4 text-right text-xs font-medium text-[#16232E] font-mono">${tradeTotalCost.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Rationale panels */}
          <div className="mb-10">
            <SectionLabel>Why these trades?</SectionLabel>
            <div className="bg-white border border-[#DCD8CF] rounded-sm overflow-hidden divide-y divide-[#DCD8CF]/60">
              {proposedTrades.map((t) => (
                <div key={t.ticker}>
                  <button
                    onClick={() => setExpanded(expanded === t.ticker ? null : t.ticker)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-[#16232E]/[0.015] transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3E6E96]"
                    aria-expanded={expanded === t.ticker}
                  >
                    <div className="flex items-center gap-3">
                      <Badge type={t.action === 'Buy' ? 'buy' : 'sell'}/>
                      <span className="text-sm text-[#16232E] font-mono text-[12px]">{t.ticker}</span>
                      <span className="text-xs text-[#16232E]/45 hidden sm:inline">{t.name}</span>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={`text-[#16232E]/30 transition-transform duration-200 ${expanded === t.ticker ? 'rotate-180' : ''}`}>
                      <polyline points="2,5 7,9 12,5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {expanded === t.ticker && (
                    <div className="px-4 pb-4 pt-1 text-sm text-[#16232E]/65 leading-relaxed border-t border-[#DCD8CF]/40 bg-[#16232E]/[0.01] font-sans">
                      {t.rationale}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sticky action bar */}
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#DCD8CF] px-6 py-4">
            <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="text-sm text-[#16232E]/50 flex-1 min-w-0">
                <span>{proposedTrades.length} trades · </span>
                <span className="font-mono">${tradeTotalCost.toFixed(2)}</span>
                <span> estimated cost</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Btn variant="ghost" onClick={() => navigate('/dashboard')}>Dismiss</Btn>
                <Btn onClick={() => navigate('/rebalance/confirm')}>Approve trades</Btn>
              </div>
            </div>
          </div>
        </>
      )}

      {/* /rebalance/confirm renders the confirmation dialog over this page */}
      <Outlet/>
    </main>
  )
}
