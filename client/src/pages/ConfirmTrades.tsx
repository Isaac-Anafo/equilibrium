import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Badge, WideBtnPrimary } from '../components/ui'
import type { ProposedTrade } from '../data/portfolio'
import { usePortfolio } from '../state/portfolio'
import { useNotifications } from '../state/notifications'

type ConfirmState = 'idle' | 'executing' | 'success'

export default function ConfirmTrades() {
  const navigate = useNavigate()
  const { proposedTrades, executeTrades } = usePortfolio()
  const { push } = useNotifications()
  const [checked, setChecked] = useState(false)
  const [state, setState] = useState<ConfirmState>('idle')
  const [toast, setToast] = useState(false)
  const [executed, setExecuted] = useState<ProposedTrade[] | null>(null)

  const trades = executed ?? proposedTrades
  const totalAmount = trades.reduce((s, t) => s + t.amount, 0)
  const totalCost = trades.reduce((s, t) => s + t.cost, 0)

  const close = () => navigate('/rebalance')
  const goDashboard = () => navigate('/dashboard')

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const execute = () => {
    if (!checked || proposedTrades.length === 0) return
    setState('executing')
    setTimeout(() => {
      setExecuted(proposedTrades)
      executeTrades()
      push({
        id: crypto.randomUUID(),
        type: 'trade',
        text: `${proposedTrades.length} trades executed successfully. Portfolio rebalanced.`,
        time: 'Just now',
        unread: true,
      })
      setState('success'); setToast(true)
      setTimeout(() => setToast(false), 4000)
    }, 1800)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#16232E]/40 backdrop-blur-[2px] flex items-center justify-center px-4" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
        <div className="w-full max-w-[520px] bg-white border border-[#DCD8CF] rounded-sm shadow-lg overflow-hidden" role="dialog" aria-modal="true" aria-label="Confirm trades">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#DCD8CF]">
            <h2 className="text-lg font-light text-[#16232E] font-display">
              {state === 'success' ? 'Trades executed' : 'Confirm trades'}
            </h2>
            <button onClick={close} className="text-[#16232E]/30 hover:text-[#16232E]/60 transition-colors focus-visible:ring-2 focus-visible:ring-[#3E6E96] rounded-sm" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>

          <div className="px-6 py-5">
            {state === 'success' ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-[#2F6E5B]/10 flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" stroke="#2F6E5B" strokeWidth="1.5"/><polyline points="6,12 10,16 18,8" stroke="#2F6E5B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <p className="text-sm text-[#16232E]/70 mb-2">{executed?.length ?? 0} trades executed successfully.</p>
                <p className="text-xs text-[#16232E]/40 mb-6 font-mono">Total: ${totalAmount.toLocaleString()} · Cost: ${totalCost.toFixed(2)}</p>
                <button onClick={goDashboard} className="text-sm text-[#3E6E96] underline underline-offset-2 hover:no-underline">View updated dashboard →</button>
              </div>
            ) : trades.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-[#16232E]/70 mb-5">There are no pending trades to confirm.</p>
                <button onClick={close} className="text-sm text-[#3E6E96] underline underline-offset-2 hover:no-underline">Back to rebalance</button>
              </div>
            ) : (
              <>
                <div className="border border-[#DCD8CF] rounded-sm overflow-x-auto mb-5">
                  <table className="w-full min-w-[360px]">
                    <thead><tr className="border-b border-[#DCD8CF] bg-[#16232E]/[0.02]">
                      {['Asset','Action','Amount'].map((c, i) => <th key={c} className={`py-2 px-3.5 text-[10px] tracking-[0.08em] uppercase text-[#16232E]/40 font-normal ${i === 2 ? 'text-right' : 'text-left'}`}>{c}</th>)}
                    </tr></thead>
                    <tbody>
                      {trades.map((t) => (
                        <tr key={t.ticker} className="border-b border-[#DCD8CF]/50 last:border-b-0">
                          <td className="py-2.5 px-3.5"><span className="text-xs font-medium text-[#16232E] uppercase font-mono">{t.ticker}</span></td>
                          <td className="py-2.5 px-3.5"><Badge type={t.action === 'Buy' ? 'buy' : 'sell'}/></td>
                          <td className="py-2.5 px-3.5 text-right text-xs text-[#16232E] font-mono">${t.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-[#DCD8CF] mb-5">
                  <span className="text-xs text-[#16232E]/50">Estimated total value traded</span>
                  <span className="text-sm text-[#16232E] font-medium font-mono">${totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs text-[#16232E]/50">Estimated trading costs</span>
                  <span className="text-sm text-[#16232E] font-mono">${totalCost.toFixed(2)}</span>
                </div>

                <label className="flex items-start gap-3 cursor-pointer mb-6 group">
                  <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded-sm accent-[#2F6E5B] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#3E6E96]"/>
                  <span className="text-xs text-[#16232E]/65 leading-relaxed font-sans">
                    I understand these trades will be executed at market prices and that Equilibrium does not guarantee execution at the estimated amounts.
                  </span>
                </label>

                <WideBtnPrimary onClick={execute} disabled={!checked || state === 'executing'}>
                  {state === 'executing' ? 'Executing…' : 'Confirm & execute'}
                </WideBtnPrimary>
              </>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-[#16232E] text-white text-sm px-4 py-3 rounded-sm shadow-lg border-l-4 border-[#2F6E5B]" role="status">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" stroke="#2F6E5B" strokeWidth="1.2"/><polyline points="4,7 6,9 10,5" stroke="#2F6E5B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Trades executed · <button onClick={goDashboard} className="text-[#2F6E5B] underline underline-offset-2">View dashboard</button>
        </div>
      )}
    </>
  )
}
