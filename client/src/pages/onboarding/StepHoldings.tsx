import { useCallback, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { WideBtnPrimary } from '../../components/ui'
import { EMPTY_HOLDING } from '../../data/portfolio'
import type { Holding } from '../../data/portfolio'
import { useOnboarding } from './OnboardingLayout'

function HoldingRow({ holding, index, onChange, onRemove, isOnly }: { holding: Holding; index: number; onChange: (h: Holding) => void; onRemove: () => void; isOnly: boolean }) {
  return (
    <tr className="group border-b border-[#DCD8CF]/60 last:border-b-0">
      <td className="py-2.5 pr-2 w-24"><input aria-label={`Ticker ${index + 1}`} placeholder="AAPL" value={holding.ticker} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...holding, ticker: e.target.value.toUpperCase() })} className="w-full px-2.5 py-1.5 bg-transparent border border-transparent focus:bg-white focus:border-[#DCD8CF] rounded-sm text-xs uppercase tracking-widest text-[#16232E] placeholder:text-[#16232E]/25 focus:outline-none focus:ring-1 focus:ring-[#3E6E96] transition-all font-mono" maxLength={5}/></td>
      <td className="py-2.5 pr-2"><input aria-label={`Name ${index + 1}`} placeholder="Security name" value={holding.name} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...holding, name: e.target.value })} className="w-full px-2.5 py-1.5 bg-transparent border border-transparent focus:bg-white focus:border-[#DCD8CF] rounded-sm text-xs text-[#16232E] placeholder:text-[#16232E]/25 focus:outline-none focus:ring-1 focus:ring-[#3E6E96] transition-all font-sans"/></td>
      <td className="py-2.5 pr-2 w-24"><input aria-label={`Shares ${index + 1}`} placeholder="0.00" value={holding.shares} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...holding, shares: e.target.value })} className="w-full px-2.5 py-1.5 bg-transparent border border-transparent focus:bg-white focus:border-[#DCD8CF] rounded-sm text-xs text-right text-[#16232E] placeholder:text-[#16232E]/25 focus:outline-none focus:ring-1 focus:ring-[#3E6E96] transition-all font-mono" inputMode="decimal"/></td>
      <td className="py-2.5 w-24"><input aria-label={`Price ${index + 1}`} placeholder="$0.00" value={holding.price} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...holding, price: e.target.value })} className="w-full px-2.5 py-1.5 bg-transparent border border-transparent focus:bg-white focus:border-[#DCD8CF] rounded-sm text-xs text-right text-[#16232E] placeholder:text-[#16232E]/25 focus:outline-none focus:ring-1 focus:ring-[#3E6E96] transition-all font-mono" inputMode="decimal"/></td>
      <td className="py-2.5 pl-2 w-8 text-center">
        <button onClick={onRemove} disabled={isOnly && !holding.ticker && !holding.name} aria-label={`Remove row ${index + 1}`} className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-sm text-[#16232E]/30 hover:text-[#B4483D] hover:bg-[#B4483D]/10 flex items-center justify-center transition-all focus-visible:opacity-100 disabled:hidden">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </td>
    </tr>
  )
}

function FileDropzone({ onFileSelect }: { onFileSelect: (file: File) => void }) {
  const [dragging, setDragging] = useState(false); const [fileName, setFileName] = useState<string | null>(null); const inputRef = useRef<HTMLInputElement>(null)
  const handle = useCallback((file: File) => { setFileName(file.name); onFileSelect(file) }, [onFileSelect])
  return (
    <div role="button" tabIndex={0} aria-label="Upload CSV" onClick={() => inputRef.current?.click()} onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }} onDragOver={(e) => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handle(f) }}
      className={`border border-dashed rounded-sm px-4 py-5 text-center cursor-pointer transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#3E6E96] ${dragging ? 'border-[#3E6E96] bg-[#3E6E96]/5' : 'border-[#DCD8CF] hover:border-[#16232E]/30 hover:bg-[#16232E]/[0.02]'}`}>
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handle(f) }} aria-hidden="true"/>
      <svg className="mx-auto mb-2 text-[#16232E]/25" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><line x1="12" y1="12" x2="12" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><polyline points="9 15 12 12 15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      {fileName ? <p className="text-xs text-[#2F6E5B] font-mono">{fileName}</p>
        : <><p className="text-xs text-[#16232E]/50">Drop a CSV here, or <span className="text-[#3E6E96] underline underline-offset-2">browse</span></p><p className="text-[11px] text-[#16232E]/30 mt-1 font-mono">ticker, shares, price per share</p></>}
    </div>
  )
}

function parseCSV(text: string): Holding[] {
  const out: Holding[] = []
  for (const line of text.split(/\r?\n/)) {
    const cols = line.split(',').map((c) => c.trim())
    if (cols.length < 1 || !cols[0]) continue
    const ticker = cols[0].toUpperCase()
    if (ticker === 'TICKER') continue
    const shares = cols[1] && !isNaN(Number(cols[1])) ? cols[1] : ''
    const price = cols[2] && !isNaN(Number(cols[2])) ? cols[2] : ''
    out.push({ id: crypto.randomUUID(), ticker, name: '', shares, price })
  }
  return out
}

export default function StepHoldings() {
  const { form, setForm } = useOnboarding()
  const navigate = useNavigate()
  const [csvMsg, setCsvMsg] = useState<{ ok: boolean; text: string } | null>(null)
  if (!form.portfolioName.trim() || !form.riskProfile) return <Navigate to="/onboarding/portfolio" replace/>

  const holdings = form.holdings
  const filled = holdings.filter((h) => h.ticker).length
  const hasData = holdings.some((h) => h.ticker || h.name)
  const addRow = () => setForm((f) => ({ ...f, holdings: [...f.holdings, EMPTY_HOLDING()] }))
  const update = (id: string, u: Holding) => setForm((f) => ({ ...f, holdings: f.holdings.map((h) => h.id === id ? u : h) }))
  const remove = (id: string) => setForm((f) => ({ ...f, holdings: f.holdings.length > 1 ? f.holdings.filter((h) => h.id !== id) : f.holdings }))
  const finish = () => navigate('/onboarding/complete')

  const handleFileSelect = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseCSV(String(reader.result ?? ''))
      if (parsed.length === 0) {
        setCsvMsg({ ok: false, text: 'No valid rows found. Expected format: ticker, shares, price per share.' })
        return
      }
      setForm((f) => {
        const map = new Map(f.holdings.map((h) => [h.ticker, h]))
        for (const h of parsed) map.set(h.ticker, h)
        return { ...f, holdings: [...map.values()] }
      })
      setCsvMsg({ ok: true, text: `Added ${parsed.length} position${parsed.length !== 1 ? 's' : ''} from ${file.name}.` })
    }
    reader.onerror = () => setCsvMsg({ ok: false, text: 'Could not read that file. Try again or enter positions manually.' })
    reader.readAsText(file)
  }, [setForm])

  return (
    <div>
      <h1 className="text-2xl font-light text-[#16232E] mb-1 font-display">Add your holdings</h1>
      <p className="text-sm text-[#16232E]/50 mb-6">Enter positions manually or upload a CSV. You can always add more after setup.</p>
      <div className="border border-[#DCD8CF] rounded-sm overflow-x-auto mb-3">
        <table className="w-full min-w-[520px]">
          <thead><tr className="border-b border-[#DCD8CF] bg-[#16232E]/[0.02]">{['Ticker','Name','Shares','Price',''].map((c,i) => <th key={i} className={`py-2 px-2.5 text-[10px] tracking-[0.08em] uppercase text-[#16232E]/40 font-normal ${i>=2&&i<=3?'text-right':'text-left'}`}>{c}</th>)}</tr></thead>
          <tbody>
            {holdings.map((h, i) => <HoldingRow key={h.id} holding={h} index={i} onChange={(u) => update(h.id, u)} onRemove={() => remove(h.id)} isOnly={holdings.length === 1}/>)}
            {!hasData && holdings.length === 1 && <tr><td colSpan={5}><div className="px-3 py-2"><span className="text-xs text-[#16232E]/30 italic">Enter a ticker above to get started</span></div></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mb-5">
        <button onClick={addRow} className="flex items-center gap-1.5 text-xs text-[#3E6E96] hover:text-[#16232E] transition-colors focus-visible:ring-2 focus-visible:ring-[#3E6E96] rounded-sm">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="6" stroke="currentColor" strokeWidth="1"/><line x1="6.5" y1="3.5" x2="6.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="3.5" y1="6.5" x2="9.5" y2="6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          Add another holding
        </button>
        <span className="text-[11px] text-[#16232E]/30 font-mono">{filled} position{filled !== 1 ? 's' : ''}</span>
      </div>
      <FileDropzone onFileSelect={handleFileSelect}/>
      {csvMsg && (
        <p className={`text-xs mt-2 ${csvMsg.ok ? 'text-[#2F6E5B]' : 'text-[#B4483D]'}`} role="status">{csvMsg.text}</p>
      )}
      <div className="flex gap-3 mt-6">
        <button onClick={() => navigate('/onboarding/portfolio')} className="px-4 py-3 border border-[#DCD8CF] rounded-sm text-sm text-[#16232E]/60 hover:border-[#16232E]/30 hover:text-[#16232E] transition-colors focus-visible:ring-2 focus-visible:ring-[#3E6E96]">← Back</button>
        <div className="flex-1"><WideBtnPrimary onClick={finish}>Create portfolio</WideBtnPrimary></div>
      </div>
      <p className="text-xs text-center text-[#16232E]/30 mt-4">
        You can skip this step and add holdings later.{' '}
        <button onClick={finish} className="underline underline-offset-2 hover:text-[#3E6E96] transition-colors">Skip for now</button>
      </p>
    </div>
  )
}
