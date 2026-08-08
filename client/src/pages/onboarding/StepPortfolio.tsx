import { Navigate, useNavigate } from 'react-router'
import { FieldLabel, TextInput, WideBtnPrimary } from '../../components/ui'
import { RISK_PROFILES } from '../../data/portfolio'
import { useOnboarding } from './OnboardingLayout'

export default function StepPortfolio() {
  const { form, setForm } = useOnboarding()
  const navigate = useNavigate()
  if (!form.email.includes('@')) return <Navigate to="/onboarding/account" replace/>
  const ok = form.portfolioName.trim().length > 0 && form.riskProfile !== null
  return (
    <div>
      <h1 className="text-2xl font-light text-[#16232E] mb-1 font-display">Name your portfolio</h1>
      <p className="text-sm text-[#16232E]/50 mb-8">Choose a name and a target allocation strategy. You can adjust this later.</p>
      <div className="mb-6"><FieldLabel htmlFor="pname">Portfolio name</FieldLabel><TextInput id="pname" placeholder="e.g. Retirement · Index Core" value={form.portfolioName} onChange={(v) => setForm((f) => ({ ...f, portfolioName: v }))}/></div>
      <span className="block text-xs tracking-[0.08em] uppercase text-[#16232E]/50 mb-3">Risk profile</span>
      <div className="space-y-2.5">
        {RISK_PROFILES.map((p) => {
          const sel = form.riskProfile === p.id
          return (
            <button key={p.id} onClick={() => setForm((f) => ({ ...f, riskProfile: p.id }))} aria-pressed={sel}
              className={`w-full text-left px-4 py-3.5 border rounded-sm transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#3E6E96] ${sel ? 'border-[#2F6E5B] bg-[#2F6E5B]/[0.04] ring-1 ring-[#2F6E5B]/30' : 'border-[#DCD8CF] bg-white hover:border-[#16232E]/30'}`}>
              <div className="flex items-start gap-3.5">
                <div className={`mt-0.5 flex-shrink-0 ${sel ? 'text-[#2F6E5B]' : 'text-[#16232E]/30'}`}>{p.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-medium ${sel ? 'text-[#2F6E5B]' : 'text-[#16232E]'}`}>{p.label}</span>
                    <span className="text-xs text-[#16232E]/40 font-mono">{p.return}</span>
                  </div>
                  <p className="text-xs text-[#16232E]/50 mt-0.5">{p.description}</p>
                  <p className="text-[11px] text-[#16232E]/35 mt-1.5 font-mono">{p.allocation}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-1 ${sel ? 'border-[#2F6E5B] bg-[#2F6E5B]' : 'border-[#DCD8CF]'}`}>
                  {sel && <svg className="w-full h-full" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" fill="white"/></svg>}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      <div className="flex gap-3 mt-7">
        <button onClick={() => navigate('/onboarding/account')} className="px-4 py-3 border border-[#DCD8CF] rounded-sm text-sm text-[#16232E]/60 hover:border-[#16232E]/30 hover:text-[#16232E] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3E6E96]">← Back</button>
        <div className="flex-1"><WideBtnPrimary onClick={() => navigate('/onboarding/holdings')} disabled={!ok}>Add holdings →</WideBtnPrimary></div>
      </div>
    </div>
  )
}
