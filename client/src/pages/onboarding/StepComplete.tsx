import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { apiFetch } from '../../lib/api'
import { WideBtnPrimary } from '../../components/ui'
import { RISK_PROFILES } from '../../data/portfolio'
import { useAuth } from '../../state/auth'
import { useOnboarding } from './OnboardingLayout'

export default function StepComplete() {
  const { form } = useOnboarding()
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [accountCreated, setAccountCreated] = useState(false)
  if (!form.portfolioName.trim() || !form.riskProfile) return <Navigate to="/onboarding/portfolio" replace/>

  const profile = RISK_PROFILES.find((p) => p.id === form.riskProfile)
  const rows = [
    { l: 'Portfolio', v: form.portfolioName, mono: false },
    { l: 'Strategy',  v: profile?.label ?? '', mono: false },
    { l: 'Positions', v: String(form.holdings.filter((h) => h.ticker).length), mono: true },
  ]
  const handleCreateAccount = async () => {
    try {
      setError('')
      await signUp(form.email, form.password)
      setAccountCreated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account. Please try again.')
      return
    }
    const holdings = form.holdings.filter((h) => h.ticker.trim()).map((h) => ({
      ticker: h.ticker.trim(),
      name: h.name.trim() || h.ticker.trim(),
      shares: String(h.shares || '0'),
      price: String(h.price || '0'),
    }))
    try {
      await apiFetch('/portfolios', {
        method: 'POST',
        body: JSON.stringify({
          name: form.portfolioName.trim(),
          riskProfile: form.riskProfile,
          driftThreshold: 3.5,
          holdings,
        }),
      })
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your portfolio. Please try again.')
    }
  }
  return (
    <div className="text-center py-4">
      <div className="w-14 h-14 rounded-full bg-[#2F6E5B]/10 flex items-center justify-center mx-auto mb-5">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="13" stroke="#2F6E5B" strokeWidth="1.5"/><polyline points="8,14 12,18 20,10" stroke="#2F6E5B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <h1 className="text-2xl font-light text-[#16232E] mb-2 font-display">{form.portfolioName || 'Your portfolio'} is live.</h1>
      <p className="text-sm text-[#16232E]/50 mb-7">Your <span className="font-medium text-[#16232E]/70">{profile?.label}</span> portfolio is ready for its first drift check.</p>
      <div className="border border-[#DCD8CF] rounded-sm p-4 text-left mb-7 space-y-3">
        {rows.map((r, i) => (
          <div key={r.l}>{i > 0 && <div className="h-px bg-[#DCD8CF] mb-3"/>}<div className="flex justify-between items-center"><span className="text-xs uppercase tracking-[0.08em] text-[#16232E]/40">{r.l}</span><span className={`text-sm text-[#16232E] ${r.mono ? 'font-mono' : 'font-sans'}`}>{r.v}</span></div></div>
        ))}
      </div>
      {error && <p className="text-xs text-[#B4483D] mt-3 mb-3" role="alert">{error}</p>}
      <WideBtnPrimary onClick={handleCreateAccount}>Go to dashboard →</WideBtnPrimary>
      {accountCreated && (
        <button onClick={() => navigate('/dashboard')} className="mt-4 text-sm text-[#3E6E96] underline underline-offset-2 hover:no-underline">
          Continue to dashboard
        </button>
      )}
    </div>
  )
}
