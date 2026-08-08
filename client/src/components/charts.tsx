import { useEffect, useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { ChartPoint, HoldingsRow, LoadState, SortDir, SortKey } from '../data/portfolio'

export function DriftGauge({ drift, threshold, animated }: { drift: number; threshold: number; animated: boolean }) {
  const MAX = 12; const norm = (Math.max(-MAX, Math.min(MAX, drift)) + MAX) / (2 * MAX); const target = -180 + norm * 180
  const [angle, setAngle] = useState(-90)
  useEffect(() => {
    if (!animated) { setAngle(-90); return }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setAngle(target); return }
    const dur = 750; const from = -90; const ease = (t: number) => 1 - Math.pow(1 - t, 3); let raf: number
    const start = performance.now()
    const tick = (now: number) => { const t = Math.min((now - start) / dur, 1); setAngle(from + (target - from) * ease(t)); if (t < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [target, animated])
  const cx = 120, cy = 110, r = 90
  const pt = (deg: number, radius: number) => ({ x: cx + radius * Math.cos(deg * Math.PI / 180), y: cy + radius * Math.sin(deg * Math.PI / 180) })
  const arc = (s: number, e: number, ri: number, ro: number) => { const s1=pt(s,ro),e1=pt(e,ro),s2=pt(e,ri),e2=pt(s,ri); const lg=e-s>180?1:0; return `M ${s1.x} ${s1.y} A ${ro} ${ro} 0 ${lg} 1 ${e1.x} ${e1.y} L ${s2.x} ${s2.y} A ${ri} ${ri} 0 ${lg} 0 ${e2.x} ${e2.y} Z` }
  const needle = pt(angle, 76)
  const status = Math.abs(drift) <= threshold ? 'balanced' : Math.abs(drift) <= 8 ? 'caution' : 'action'
  const needleCls = { balanced: 'stroke-[#2F6E5B]', caution: 'stroke-[#D98E3F]', action: 'stroke-[#B4483D]' }[status]
  const hubCls = { balanced: 'fill-[#2F6E5B]', caution: 'fill-[#D98E3F]', action: 'fill-[#B4483D]' }[status]
  const valueCls = { balanced: 'text-[#2F6E5B]', caution: 'text-[#D98E3F]', action: 'text-[#B4483D]' }[status]
  const show = animated
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 240 130" className="w-full max-w-[240px] h-auto" aria-label={`Drift ${drift}%`}>
        <path d={arc(-180,0,r-16,r)} fill="#F7F5F0"/>
        {[{s:-180,e:-140,c:'#B4483D'},{s:-140,e:-110,c:'#D98E3F'},{s:-110,e:-70,c:'#2F6E5B'},{s:-70,e:-40,c:'#D98E3F'},{s:-40,e:0,c:'#B4483D'}].map((z,i) =>
          <path key={i} d={arc(z.s,z.e,r-16,r)} fill={z.c} fillOpacity="0.15"/>)}
        <path d={arc(-180,0,r-16,r)} fill="none" stroke="#DCD8CF" strokeWidth="0.5"/>
        {[-180,-150,-120,-90,-60,-30,0].map((d) => { const a=pt(d,r-18),b=pt(d,r-1); return <line key={d} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#DCD8CF" strokeWidth="1"/> })}
        <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} strokeWidth="2" strokeLinecap="round" className={`${needleCls} transition-opacity duration-300`} opacity={show ? 1 : 0}/>
        <circle cx={cx} cy={cy} r="5" className={`${hubCls} transition-opacity duration-300`} opacity={show ? 1 : 0}/><circle cx={cx} cy={cy} r="2.5" className="fill-white" opacity={show ? 1 : 0}/>
        <text x="18" y={cy+16} fontSize="9" className="font-mono" fill="#16232E" opacity="0.35" textAnchor="middle">−12%</text>
        <text x="222" y={cy+16} fontSize="9" className="font-mono" fill="#16232E" opacity="0.35" textAnchor="middle">+12%</text>
        <text x={cx} y={cy-r+10} fontSize="9" className="font-mono" fill="#2F6E5B" opacity="0.6" textAnchor="middle">0</text>
      </svg>
      <div className="text-center -mt-1">
        <div className={`text-2xl font-medium font-mono ${valueCls}`}>{drift > 0 ? '+' : ''}{drift}%</div>
        <div className="text-xs text-[#16232E]/40 mt-0.5 uppercase tracking-[0.08em]">portfolio drift</div>
      </div>
    </div>
  )
}

export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  const W = ['w-10', 'w-[120px]', 'w-15', 'w-15', 'w-15']
  return <tr className="border-b border-[#DCD8CF]/50">{Array.from({ length: cols }).map((_, i) => <td key={i} className="py-3 px-4"><div className={`h-3 rounded bg-[#DCD8CF]/50 animate-pulse ${W[i] ?? 'w-15'}`}/></td>)}</tr>
}

export function DeltaCell({ delta }: { delta: number }) {
  const col = Math.abs(delta) <= 0.5 ? 'text-[#16232E]' : delta > 0 ? 'text-[#B4483D]' : 'text-[#2F6E5B]'
  return <td className="py-3 px-4 text-right"><span className={`inline-flex items-center gap-1 text-xs font-medium font-mono ${col}`} aria-label={`${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`}>{delta > 0.5 ? '▲' : delta < -0.5 ? '▼' : '—'}{delta > 0 ? '+' : ''}{delta.toFixed(1)}%</span></td>
}

export function HoldingsTable({ rows, loading, sortKey, sortDir, onSort }: { rows: HoldingsRow[]; loading: LoadState; sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void }) {
  const sorted = useMemo(() => (
    [...rows].sort((a, b) => { const m = sortDir === 'asc' ? 1 : -1; if (sortKey === 'asset') return m * a.ticker.localeCompare(b.ticker); if (sortKey === 'current') return m * (a.current - b.current); if (sortKey === 'target') return m * (a.target - b.target); return m * (a.delta - b.delta) })
  ), [rows, sortKey, sortDir])
  const SH = ({ k, label, right = false }: { k: SortKey; label: string; right?: boolean }) => (
    <th onClick={() => onSort(k)} className={`py-2.5 px-4 text-[10px] tracking-[0.08em] uppercase text-[#16232E]/40 font-normal cursor-pointer hover:text-[#16232E]/70 transition-colors select-none ${right ? 'text-right' : 'text-left'}`}>
      {label}{sortKey === k && <span className="ml-1 text-[#16232E]/60">{sortDir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr className="border-b border-[#DCD8CF]"><SH k="asset" label="Asset"/><SH k="current" label="Current wt." right/><SH k="target" label="Target wt." right/><SH k="delta" label="Drift" right/><th className="py-2.5 px-4 text-right text-[10px] tracking-[0.08em] uppercase text-[#16232E]/40 font-normal">Value</th></tr></thead>
        <tbody>
          {loading === 'loading' ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i}/>) : sorted.map((h) => (
            <tr key={h.ticker} className="border-b border-[#DCD8CF]/50 hover:bg-[#16232E]/[0.018] transition-colors">
              <td className="py-3 px-4"><div className="flex items-center gap-2.5"><span className="text-xs font-medium text-[#16232E] uppercase font-mono">{h.ticker}</span><span className="text-xs text-[#16232E]/45 hidden sm:inline">{h.name}</span></div></td>
              <td className="py-3 px-4 text-right text-xs text-[#16232E] font-mono">{h.current.toFixed(1)}%</td>
              <td className="py-3 px-4 text-right text-xs text-[#16232E]/55 font-mono">{h.target.toFixed(1)}%</td>
              <DeltaCell delta={h.delta}/>
              <td className="py-3 px-4 text-right text-xs text-[#16232E]/70 font-mono">${h.value.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function PerfChart({ data, showBenchmark }: { data: ChartPoint[]; showBenchmark: boolean }) {
  const CT = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-[#DCD8CF] rounded-sm px-3 py-2 shadow-sm text-xs font-mono">
        <div className="text-[#16232E]/40 mb-1.5 font-sans text-[11px]">{label}</div>
        {payload.map((p) => <div key={p.name} className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${p.name === 'portfolio' ? 'bg-[#3E6E96]' : 'bg-[#16232E]'}`}/><span className="text-[#16232E]/60">{p.name === 'portfolio' ? 'Portfolio' : 'Benchmark'}</span><span className="text-[#16232E] ml-auto pl-3">{p.value.toFixed(2)}</span></div>)}
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#DCD8CF" strokeWidth={0.5}/>
        <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: '#16232E', opacity: 0.4 }} tickLine={false} axisLine={false} interval={Math.floor(data.length / 5)}/>
        <YAxis tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: '#16232E', opacity: 0.4 }} tickLine={false} axisLine={false} domain={['auto','auto']} tickFormatter={(v) => v.toFixed(0)}/>
        <Tooltip content={<CT/>}/>
        <Line type="monotone" dataKey="portfolio" stroke="#3E6E96" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: '#3E6E96', strokeWidth: 0 }} isAnimationActive={false}/>
        {showBenchmark && <Line type="monotone" dataKey="benchmark" stroke="#16232E" strokeWidth={1} strokeOpacity={0.25} dot={false} activeDot={{ r: 3, fill: '#16232E', strokeWidth: 0 }} isAnimationActive={false}/>}
      </LineChart>
    </ResponsiveContainer>
  )
}
