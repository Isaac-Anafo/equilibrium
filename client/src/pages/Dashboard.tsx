import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { DriftGauge, HoldingsTable, PerfChart } from '../components/charts'
import { SectionLabel } from '../components/ui'
import type { SortDir, SortKey } from '../data/portfolio'
import { usePortfolio } from '../state/portfolio'

export default function Dashboard() {
  const { value, totalReturn, dayReturn, driftPct, threshold, holdings, asOf, performance, loadState } = usePortfolio()
  const [sortKey, setSortKey] = useState<SortKey>('delta'); const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showBenchmark, setShowBenchmark] = useState(true)
  const [animated, setAnimated] = useState(false); const [dismissed, setDismissed] = useState(false)
  const loading = loadState === 'loading'
  const loaded = loadState === 'loaded'
  const chartData = performance
  const asOfLabel = asOf
    ? `${new Date(asOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${new Date(asOf).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })} ET`
    : ''

  useEffect(() => {
    if (loadState !== 'loaded') return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = setTimeout(() => setAnimated(true), reduce ? 0 : 100)
    return () => clearTimeout(t)
  }, [loadState])

  const handleSort = (k: SortKey) => { if (k === sortKey) setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(k); setSortDir('desc') } }

  if (loadState === 'no-portfolio') {
    return (
      <main className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-[#2F6E5B]/10 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="5" y="9" width="18" height="12" rx="2" stroke="#2F6E5B" strokeWidth="1.5"/><line x1="5" y1="14" x2="23" y2="14" stroke="#2F6E5B" strokeWidth="1.5"/><circle cx="14" cy="17" r="1.5" fill="#2F6E5B"/></svg>
        </div>
        <h1 className="text-2xl font-light text-[#16232E] mb-2 font-display">No portfolio yet</h1>
        <p className="text-sm text-[#16232E]/50 mb-6 max-w-sm mx-auto">Create a portfolio to start tracking allocation drift, rebalancing, and performance.</p>
        <Link to="/onboarding" className="inline-flex items-center gap-2 bg-[#2F6E5B] text-white text-sm px-5 py-2.5 rounded-sm hover:bg-[#245A49] transition-colors">Create your portfolio</Link>
      </main>
    )
  }

  if (loadState === 'error') {
    return (
      <main className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-[#B4483D]/10 flex items-center justify-center mx-auto mb-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 3L22 20H2L12 3Z" stroke="#B4483D" strokeWidth="1.5" strokeLinejoin="round"/><line x1="12" y1="10" x2="12" y2="14" stroke="#B4483D" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="17" r="0.8" fill="#B4483D"/></svg>
        </div>
        <h1 className="text-2xl font-light text-[#16232E] mb-2 font-display">Couldn't load your portfolio</h1>
        <p className="text-sm text-[#16232E]/50 mb-6">Something went wrong fetching your data. Please try again.</p>
        <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 bg-[#16232E] text-white text-sm px-5 py-2.5 rounded-sm hover:bg-[#2C3B47] transition-colors">Reload</button>
      </main>
    )
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-7">
      {/* Stat row */}
      <div className="flex flex-wrap items-end gap-x-10 gap-y-3 pb-6 border-b border-[#DCD8CF] mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.08em] text-[#16232E]/40 mb-1">Portfolio value</div>
          {loading ? <div className="h-9 w-44 bg-[#DCD8CF]/60 animate-pulse rounded"/> :
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <span className="text-3xl sm:text-4xl text-[#16232E] font-display font-light">${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              <span className="text-sm font-medium flex items-center gap-0.5 font-mono text-[#2F6E5B]">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1,8 5,2 9,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                +{dayReturn}% today
              </span>
            </div>}
        </div>
        <div className="pb-1">
          <div className="text-xs uppercase tracking-[0.08em] text-[#16232E]/40 mb-1">Total return</div>
          {loading ? <div className="h-6 w-28 bg-[#DCD8CF]/60 animate-pulse rounded"/> :
            <span className="text-xl text-[#2F6E5B] font-mono">+{totalReturn}% <span className="text-sm text-[#16232E]/40">(1 yr)</span></span>}
        </div>
        {loaded && asOfLabel && <div className="ml-auto pb-1"><div className="text-xs uppercase tracking-[0.08em] text-[#16232E]/40 mb-1">As of</div><span className="text-sm text-[#16232E]/60 font-mono">{asOfLabel}</span></div>}
      </div>

      {/* Drift banner */}
      {loaded && driftPct > threshold && !dismissed && (
        <div className="mb-6 flex items-center gap-4 pl-4 pr-4 py-3 border border-[#DCD8CF] rounded-sm bg-white border-l-[3px] border-l-[#D98E3F]" role="alert">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="flex-shrink-0 text-[#D98E3F]"><path d="M7.5 2L13 12H2L7.5 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><line x1="7.5" y1="6" x2="7.5" y2="9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="7.5" cy="10.5" r="0.7" fill="currentColor"/></svg>
          <span className="text-sm text-[#16232E]/80 flex-1">Your portfolio has drifted <span className="font-medium font-mono">{driftPct}%</span> from target.{' '}<Link to="/rebalance" className="text-[#3E6E96] underline underline-offset-2 hover:no-underline">Review rebalancing</Link></span>
          <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="text-[#16232E]/30 hover:text-[#16232E]/60 transition-colors flex-shrink-0"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
        </div>
      )}

      {/* Gauge + Holdings */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 mb-6">
        <div className="bg-white border border-[#DCD8CF] rounded-sm p-6 flex flex-col">
          <SectionLabel>Allocation drift</SectionLabel>
          {loading ? <div className="flex items-center justify-center h-40"><div className="w-36 h-20 bg-[#DCD8CF]/40 animate-pulse rounded-t-full"/></div>
            : <DriftGauge drift={driftPct} threshold={threshold} animated={animated}/>}
          {loaded && (
            <div className="mt-5 pt-4 border-t border-[#DCD8CF] grid grid-cols-3 text-center">
              {[{l:'Balanced',v:`±${threshold}%`,cls:'text-[#2F6E5B]'},{l:'Caution',v:`±${threshold}–8%`,cls:'text-[#D98E3F]'},{l:'Action',v:'>±8%',cls:'text-[#B4483D]'}].map((z) => (
                <div key={z.l}><div className={`text-[10px] font-medium mb-0.5 font-mono ${z.cls}`}>{z.v}</div><div className="text-[10px] text-[#16232E]/35">{z.l}</div></div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white border border-[#DCD8CF] rounded-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-[#DCD8CF] flex items-center justify-between">
            <SectionLabel>Holdings</SectionLabel>
            <span className="text-xs text-[#16232E]/30 font-mono">{loaded ? `${holdings.length} positions` : ''}</span>
          </div>
          <HoldingsTable rows={holdings} loading={loading ? 'loading' : 'loaded'} sortKey={sortKey} sortDir={sortDir} onSort={handleSort}/>
        </div>
      </div>

      {/* Performance chart */}
      <div className="bg-white border border-[#DCD8CF] rounded-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <SectionLabel>Performance</SectionLabel>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5"><div className="w-5 h-0.5 bg-[#3E6E96] rounded"/><span className="text-xs text-[#16232E]/50">Portfolio</span></div>
            <button onClick={() => setShowBenchmark((b) => !b)} className={`flex items-center gap-1.5 transition-opacity ${showBenchmark ? '' : 'opacity-40'}`} aria-pressed={showBenchmark}>
              <div className="w-5 h-0.5 rounded bg-[#16232E]/30"/><span className="text-xs text-[#16232E]/50">Benchmark</span>
            </button>
          </div>
        </div>
        {loading ? <div className="h-44 bg-[#DCD8CF]/30 animate-pulse rounded"/> : <PerfChart data={chartData} showBenchmark={showBenchmark}/>}
      </div>
    </main>
  )
}
