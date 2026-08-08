import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { PerfChart } from '../components/charts'
import { PageHeading, SectionLabel } from '../components/ui'
import { RANGES } from '../data/portfolio'
import { usePortfolio } from '../state/portfolio'

export default function Analytics() {
  // The selected time range lives in the URL (?range=6M) so views are linkable.
  const [params, setParams] = useSearchParams()
  const range = RANGES.some((r) => r.label === params.get('range')) ? params.get('range')! : '1Y'
  const [showBenchmark, setShowBenchmark] = useState(true)
  const [tooltip, setTooltip] = useState<string | null>(null)
  const { rebalanceLog, metrics, performance, loadState, loadPerformance } = usePortfolio()
  const loading = loadState === 'loading'

  useEffect(() => {
    if (loadState !== 'loaded') return
    void loadPerformance(range)
  }, [range, loadPerformance, loadState])

  const chartData = useMemo(() => performance, [performance])
  const displayedMetrics = metrics

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <PageHeading title="Analytics" subtitle="Strategy performance over time. Hover each metric for a plain-English explanation."/>

      {/* Metrics row */}
      <div className="mb-10">
        <SectionLabel>Risk &amp; return metrics</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 bg-white border border-[#DCD8CF] rounded-sm overflow-hidden">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`p-5 ${i < 3 ? 'border-r border-[#DCD8CF]' : ''}`}>
              <div className="h-3 w-20 bg-[#DCD8CF]/50 animate-pulse rounded mb-3"/>
              <div className="h-5 w-16 bg-[#DCD8CF]/50 animate-pulse rounded"/>
            </div>
          )) : displayedMetrics.map((m, i) => (
            <div key={m.key} className={`relative p-5 ${i < 3 ? 'border-r border-[#DCD8CF]' : ''}`}
              onMouseEnter={() => setTooltip(m.key)} onMouseLeave={() => setTooltip(null)}
              onFocus={() => setTooltip(m.key)} onBlur={() => setTooltip(null)} tabIndex={0}>
              <div className="text-xs text-[#16232E]/40 mb-1.5 flex items-center gap-1">
                {m.label}
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="opacity-40"><circle cx="5.5" cy="5.5" r="5" stroke="currentColor" strokeWidth="0.9"/><line x1="5.5" y1="4.5" x2="5.5" y2="7.5" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/><circle cx="5.5" cy="3.5" r="0.5" fill="currentColor"/></svg>
              </div>
              <div className="text-xl font-medium text-[#16232E] font-mono">{m.value}</div>
              {tooltip === m.key && (
                <div className={`absolute top-full z-10 mt-1.5 w-52 max-w-[calc(100vw-2rem)] bg-[#16232E] text-white text-xs rounded-sm px-3 py-2.5 shadow-lg leading-relaxed font-sans ${i % 2 === 1 ? 'right-0' : 'left-0'}`}>
                  <strong className="font-medium">{m.label}:</strong> {m.gloss}
                </div>
              )}
            </div>
          ))}
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

      {/* Rebalancing event log / timeline */}
      <div>
        <SectionLabel>Rebalancing history</SectionLabel>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-[#DCD8CF]/30 animate-pulse rounded-sm"/>)}
          </div>
        ) : rebalanceLog.length === 0 ? (
          <div className="bg-white border border-[#DCD8CF] rounded-sm p-8 text-center">
            <p className="text-sm text-[#16232E]/60">No rebalancing events yet.</p>
            <p className="text-xs text-[#16232E]/40 mt-1">Trades you execute will show up here.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-[#DCD8CF]" aria-hidden="true"/>
            <div className="space-y-0">
              {rebalanceLog.map((ev) => (
                <div key={ev.date} className="flex gap-4 group">
                  <div className="flex flex-col items-center z-10 pt-3.5">
                    <div className="w-5 h-5 rounded-full bg-white border-2 border-[#DCD8CF] group-hover:border-[#2F6E5B] transition-colors flex items-center justify-center flex-shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#DCD8CF] group-hover:bg-[#2F6E5B] transition-colors"/>
                    </div>
                  </div>
                  <div className="flex-1 pb-5">
                    <div className="bg-white border border-[#DCD8CF] rounded-sm px-4 py-3 hover:border-[#16232E]/20 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-medium text-[#16232E] mb-0.5">{ev.trigger}</div>
                          <div className="text-xs text-[#16232E]/40">{ev.trades} trade{ev.trades !== 1 ? 's' : ''} executed</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-[11px] text-[#16232E]/35 font-mono">{ev.date}</div>
                          <div className="text-[11px] text-[#16232E]/40 mt-0.5 font-mono">{ev.cost}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
