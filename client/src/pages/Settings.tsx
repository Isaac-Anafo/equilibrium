import { useState } from 'react'
import { Btn, PageHeading, SectionLabel } from '../components/ui'
import { usePortfolio } from '../state/portfolio'

const LABELS = { bonds: 'Bonds', domestic: 'US Equity', intl: 'Intl Equity', real_estate: 'Real Estate' } as const
type AllocKey = keyof typeof LABELS

export default function Settings() {
  const { allocation, setAllocation, threshold, setThreshold, autoApprove, setAutoApprove, notifPrefs, setNotifPrefs } = usePortfolio()
  const [saved, setSaved] = useState(false)

  const total = Object.values(allocation).reduce((s, v) => s + v, 0)
  const totalOk = total === 100
  const thresholdOk = threshold > 0 && threshold <= 20
  const keys = Object.keys(LABELS) as AllocKey[]

  const save = () => {
    if (!totalOk || !thresholdOk) return
    setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-8">
      <PageHeading title="Settings" subtitle="Manage your portfolio strategy and preferences."/>

      {/* Target allocation */}
      <section className="mb-10">
        <SectionLabel>Target allocation</SectionLabel>
        <div className="bg-white border border-[#DCD8CF] rounded-sm p-5 space-y-5">
          {keys.map((k) => (
            <div key={k}>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs text-[#16232E]/70" htmlFor={`alloc-${k}`}>{LABELS[k]}</label>
                <div className="flex items-center gap-2">
                  <input id={`alloc-${k}`} type="number" min={0} max={100} value={allocation[k]}
                    onChange={(e) => setAllocation({ ...allocation, [k]: Math.max(0, Math.min(100, +e.target.value)) })}
                    className="w-14 text-right px-2 py-1 border border-[#DCD8CF] rounded-sm text-xs text-[#16232E] focus:outline-none focus:ring-1 focus:ring-[#3E6E96] font-mono"/>
                  <span className="text-xs text-[#16232E]/40 font-mono">%</span>
                </div>
              </div>
              <input type="range" min={0} max={60} value={allocation[k]} aria-label={`${LABELS[k]} target weight`}
                onChange={(e) => setAllocation({ ...allocation, [k]: +e.target.value })}
                className="w-full h-1 appearance-none rounded-full cursor-pointer accent-[#2F6E5B]"/>
            </div>
          ))}
          <div className={`flex items-center justify-between pt-3 border-t border-[#DCD8CF] text-xs ${totalOk ? 'text-[#2F6E5B]' : 'text-[#B4483D]'}`}>
            <span>{totalOk ? 'Allocations total 100% ✓' : `Allocations must total 100% — currently ${total}%`}</span>
            <span className="font-mono">{total}%</span>
          </div>
        </div>
      </section>

      {/* Drift threshold */}
      <section className="mb-10 pb-10 border-b border-[#DCD8CF]">
        <SectionLabel>Drift threshold</SectionLabel>
        <div className="bg-white border border-[#DCD8CF] rounded-sm p-5">
          <p className="text-xs text-[#16232E]/55 mb-3">Notify and propose rebalancing when any allocation drifts by more than this percentage.</p>
          <div className="flex items-center gap-2">
            <input type="number" min={0.5} max={20} step={0.5} value={threshold} aria-label="Drift threshold percentage"
              onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setThreshold(v) }}
              className="w-20 px-3 py-2 border border-[#DCD8CF] rounded-sm text-sm text-[#16232E] focus:outline-none focus:ring-2 focus:ring-[#3E6E96] font-mono"/>
            <span className="text-sm text-[#16232E]/50">%</span>
          </div>
          {!thresholdOk && <p className="text-xs text-[#B4483D] mt-2">Enter a value between 0.5% and 20%.</p>}
        </div>
      </section>

      {/* Auto-approve */}
      <section className="mb-10 pb-10 border-b border-[#DCD8CF]">
        <SectionLabel>Auto-approve trades</SectionLabel>
        <div className="bg-white border border-[#DCD8CF] rounded-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[#16232E] mb-0.5">Auto-approve trades under $500</div>
              <div className="text-xs text-[#16232E]/45">Small rebalancing trades will execute automatically. Larger trades always require your review.</div>
            </div>
            <button role="switch" aria-checked={autoApprove} aria-label="Auto-approve trades under $500" onClick={() => setAutoApprove(!autoApprove)}
              className={`ml-6 flex-shrink-0 rounded-full border-2 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3E6E96] relative h-[22px] w-10 ${autoApprove ? 'bg-[#2F6E5B] border-[#2F6E5B]' : 'bg-transparent border-[#DCD8CF]'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-150 ${autoApprove ? 'translate-x-[18px]' : 'translate-x-0.5'}`}/>
            </button>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="mb-10">
        <SectionLabel>Notifications</SectionLabel>
        <div className="bg-white border border-[#DCD8CF] rounded-sm overflow-hidden divide-y divide-[#DCD8CF]/60">
          {[{ label: 'Email notifications', sub: 'Drift alerts and trade confirmations sent to your email.', val: notifPrefs.email, set: (v: boolean) => setNotifPrefs({ ...notifPrefs, email: v }) },
            { label: 'Push notifications', sub: 'Browser push alerts for urgent drift events.', val: notifPrefs.push, set: (v: boolean) => setNotifPrefs({ ...notifPrefs, push: v }) }].map((n) => (
            <label key={n.label} className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#16232E]/[0.01]">
              <div>
                <div className="text-sm text-[#16232E]">{n.label}</div>
                <div className="text-xs text-[#16232E]/45 mt-0.5">{n.sub}</div>
              </div>
              <input type="checkbox" checked={n.val} onChange={(e) => n.set(e.target.checked)} className="ml-6 w-4 h-4 accent-[#2F6E5B] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#3E6E96] rounded-sm"/>
            </label>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-4">
        <Btn onClick={save} disabled={!totalOk || !thresholdOk}>Save changes</Btn>
        {saved && <span className="text-xs text-[#2F6E5B] flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1"/><polyline points="3,6 5.5,8.5 9.5,4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>Saved</span>}
      </div>
    </main>
  )
}
