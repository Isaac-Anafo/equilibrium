import { useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useOutletContext } from 'react-router'
import { AuthShell } from '../../components/ui'
import { EMPTY_HOLDING } from '../../data/portfolio'
import type { FormState } from '../../data/portfolio'

export interface OnboardingCtx {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
}

export const useOnboarding = () => useOutletContext<OnboardingCtx>()

const STEPS = [
  { n: 1, label: 'Account',   slug: 'account'   },
  { n: 2, label: 'Portfolio', slug: 'portfolio' },
  { n: 3, label: 'Holdings',  slug: 'holdings'  },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors duration-200 font-mono ${s.n < current ? 'bg-[#2F6E5B] text-white' : s.n === current ? 'bg-[#16232E] text-white' : 'bg-[#DCD8CF] text-[#16232E]/40'}`}>
              {s.n < current ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> : s.n}
            </div>
            <span className={`text-[10px] tracking-[0.06em] uppercase ${s.n === current ? 'text-[#16232E]' : 'text-[#16232E]/40'}`}>{s.label}</span>
          </div>
          {i < 2 && <div className={`h-px w-12 sm:w-16 mx-2 mb-4 transition-colors duration-300 ${s.n < current ? 'bg-[#2F6E5B]' : 'bg-[#DCD8CF]'}`}/>}
        </div>
      ))}
    </div>
  )
}

export default function OnboardingLayout() {
  const [form, setForm] = useState<FormState>({ email: '', password: '', portfolioName: '', riskProfile: null, holdings: [EMPTY_HOLDING()] })
  const { pathname } = useLocation()
  const slug = pathname.split('/').filter(Boolean).pop() ?? 'account'
  const step = STEPS.find((s) => s.slug === slug)?.n ?? 0
  const ctx = useMemo<OnboardingCtx>(() => ({ form, setForm }), [form])

  return (
    <AuthShell footer={
      <>
        Already have an account?{' '}
        <Link to="/" className="underline underline-offset-2 hover:text-[#3E6E96] text-[#16232E]/40 transition-colors">Sign in</Link>
      </>
    }>
      {step > 0 && <StepIndicator current={step}/>}
      <Outlet context={ctx}/>
    </AuthShell>
  )
}
