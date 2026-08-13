import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { PerfChart } from '../components/charts'
import { PageHeading, SectionLabel } from '../components/ui'
import { RANGES } from '../data/portfolio'
import type { ActivityEvent } from '../data/portfolio'
import { usePortfolio } from '../state/portfolio'

const ACTIVITY_META: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  rebalance: {
    color: 'text-[#2F6E5B]',
    label: 'Rebalance',
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><polyline points="2,7.5 6,3 9,9 12,5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><polyline points="10,5.5 12,5.5 12,7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  threshold: {
    color: 'text-[#D98E3F]',
    label: 'Drift threshold',
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2L13 12H2L7.5 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><line x1="7.5" y1="5.5" x2="7.5" y2="8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="7.5" cy="10.2" r="0.65" fill="currentColor"/></svg>,
  },
  allocation: {
    color: 'text-[#3E6E96]',
    label: 'Allocation',
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2.5" y="6.5" width="4" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8.5" y="2.5" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>,
  },
  auto_approve: {
    color: 'text-[#16232E]/45',
    label: 'Auto-approve',
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="4.5" width="11" height="6" rx="3" stroke="currentColor" strokeWidth="1.2"/><circle cx="10" cy="7.5" r="2" fill="currentColor"/></svg>,
  },
}

function parseTime(time: string): { group: 'Today' | 'Earlier'; label: string } {
  const t = time.trim()
  if (!t) return { group: 'Earlier', label: t }
  if (t.toLowerCase() === 'just now' || t.startsWith('Today')) {
    return { group: 'Today', label: t }
  }
  const d = new Date(time)
  if (!isNaN(d.getTime())) {
    const now = new Date()
    const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
    const timeLabel = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    if (isToday) return { group: 'Today', label: `Today, ${timeLabel}` }
    const sameYear = d.getFullYear() === now.getFullYear()
    const dateLabel = sameYear
      ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return { group: 'Earlier', label: `${dateLabel} · ${timeLabel}` }
  }
  return { group: 'Earlier', label: t }
}

function groupActivity(log: ActivityEvent[]) {
  const groups: { label: string; items: Array<ActivityEvent & { label: string }> }[] = []
  for (const ev of log) {
    const { group, label } = parseTime(ev.date)
    let g = groups.find((x) => x.label === group)
    if (!g) { g = { label: group, items: [] }; groups.push(g) }
    g.items.push({ ...ev, label })
  }
  return groups
}

export default function Analytics() {
  // The selected time range lives in the URL (?range=6M) so views are linkable.
  const [params, setParams] = useSearchParams()
  const range = RANGES.some((r) => r.label === params.get('range')) ? params.get('range')! : '1Y'
  const [showBenchmark, setShowBenchmark] = useState(true)
  const { metrics, performance, activityLog, loadState, loadPerformance } = usePortfolio()
  const loading = loadState === 'loading'

  useEffect(() => {
    if (loadState !== 'loaded') return
    void loadPerformance(range)
  }, [range, loadPerformance, loadState])

  const chartData = useMemo(() => performance, [performance])
  const displayedMetrics = metrics
  const activityGroups = useMemo(() => groupActivity(activityLog), [activityLog])
  const [openMetric, setOpenMetric] = useState<string | null>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('[data-metric-card]')) setOpenMetric(null)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <PageHeading title="Analytics" subtitle="Strategy performance over time. Click a metric for a plain-English explanation."/>

      {/* Metrics row */}
      <div className="mb-10">
        <SectionLabel>Risk &amp; return metrics</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 bg-white border border-[#DCD8CF] rounded-sm overflow-hidden">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`p-5 ${i < 3 ? 'border-r border-[#DCD8CF]' : ''}`}>
              <div className="h-3 w-20 bg-[#DCD8CF]/50 animate-pulse rounded mb-3"/>
              <div className="h-5 w-16 bg-[#DCD8CF]/50 animate-pulse rounded"/>
            </div>
          )) : displayedMetrics.map((m, i) => {
          const open = openMetric === m.key
          return (
            <div key={m.key} data-metric-card role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenMetric(open ? null : m.key) } }}
              className={`relative p-5 cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-[#3E6E96] focus-visible:outline-none ${i < 3 ? 'border-r border-[#DCD8CF]' : ''}`}
              onClick={() => setOpenMetric(open ? null : m.key)}>
              <div className={`text-xs text-[#16232E]/40 mb-1.5 flex items-center gap-1 ${open ? 'text-[#3E6E96]' : ''}`}>
                {m.label}
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="opacity-40"><circle cx="5.5" cy="5.5" r="5" stroke="currentColor" strokeWidth="0.9"/><line x1="5.5" y1="4.5" x2="5.5" y2="7.5" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/><circle cx="5.5" cy="3.5" r="0.5" fill="currentColor"/></svg>
              </div>
              <div className="text-xl font-medium text-[#16232E] font-mono">{m.value}</div>
              {open && (
                <div className={`absolute top-full z-10 mt-1.5 w-64 max-w-[calc(100vw-2rem)] bg-[#16232E] text-white text-xs rounded-sm px-3 py-2.5 shadow-lg leading-relaxed font-sans ${i % 2 === 1 ? 'right-0' : 'left-0'}`}>
                  <div className="font-medium mb-1 text-[#8FB3D0]">{m.label}</div>
                  {m.gloss}
                </div>
              )}
            </div>
          )
        })}
        </div>
      </div>

      {/* Performance chart */}
      <div className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <SectionLabel>Performance</SectionLabel>
          <div className="flex flex-wrap items-center gap-2">
            {RANGES.map((r) => (
              <button key={r.label} onClick={() => setParams({ range: r.label }, { replace: true })}
                className={`px-2.5 py-1 rounded-sm text-xs transition-colors focus-visible:ring-2 focus-visible:ring-[#3E6E96] font-mono ${range === r.label ? 'bg-[#16232E] text-white' : 'text-[#16232E]/40 hover:text-[#16232E]/70'}`}>
                {r.label}
              </button>
            ))}
            <div className="w-px h-4 bg-[#DCD8CF] mx-1"/>
            <button onClick={() => setShowBenchmark((b) => !b)} className={`flex items-center gap-1.5 text-xs transition-opacity ${showBenchmark ? 'text-[#16232E]/50' : 'text-[#16232E]/25'}`}>
              <div className="w-4 h-0.5 rounded bg-[#16232E]/30"/> Benchmark
            </button>
          </div>
        </div>
        <div className="bg-white border border-[#DCD8CF] rounded-sm p-5">
          {loading ? <div className="h-44 bg-[#DCD8CF]/30 animate-pulse rounded"/> : <PerfChart data={chartData} showBenchmark={showBenchmark}/>}
        </div>
      </div>

      {/* Change history */}
      <div>
        <SectionLabel>Change history</SectionLabel>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-[#DCD8CF]/30 animate-pulse rounded-sm"/>)}
          </div>
        ) : activityLog.length === 0 ? (
          <div className="bg-white border border-[#DCD8CF] rounded-sm p-8 text-center">
            <p className="text-sm text-[#16232E]/60">No changes yet.</p>
            <p className="text-xs text-[#16232E]/40 mt-1">Rebalances and changes you make to your strategy will show up here.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {activityGroups.map((g) => (
              <div key={g.label}>
                <div className="text-[10px] uppercase tracking-[0.1em] text-[#16232E]/35 mb-3">{g.label}</div>
                <div className="bg-white border border-[#DCD8CF] rounded-sm overflow-hidden divide-y divide-[#DCD8CF]/60">
                  {g.items.map((ev) => {
                    const meta = ACTIVITY_META[ev.type] ?? { color: 'text-[#16232E]/40', icon: null, label: ev.type }
                    return (
                      <div key={ev.date + ev.summary} className="flex items-start gap-3.5 px-4 py-3.5 hover:bg-[#16232E]/[0.015] transition-colors">
                        <div className={`mt-0.5 flex-shrink-0 ${meta.color}`}>{meta.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#16232E]/80 leading-snug">{ev.summary}</p>
                          <p className="text-[11px] text-[#16232E]/35 mt-1 font-mono uppercase tracking-[0.08em]">{meta.label}</p>
                        </div>
                        <div className="text-[11px] text-[#16232E]/35 font-mono mt-0.5 flex-shrink-0">{ev.label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
