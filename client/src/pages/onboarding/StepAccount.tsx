import { Link, useNavigate } from 'react-router'
import { FieldLabel, TextInput, WideBtnPrimary } from '../../components/ui'
import { useOnboarding } from './OnboardingLayout'

export default function StepAccount() {
  const { form, setForm } = useOnboarding()
  const navigate = useNavigate()
  const ok = form.email.includes('@') && form.password.length >= 8
  return (
    <div>
      <h1 className="text-2xl font-light text-[#16232E] mb-1 font-display">Create your account</h1>
      <p className="text-sm text-[#16232E]/50 mb-8">Your portfolio lives here. It takes about two minutes.</p>
      <div className="space-y-4">
        <div><FieldLabel htmlFor="email">Email address</FieldLabel><TextInput id="email" type="email" placeholder="you@example.com" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} autoComplete="email"/></div>
        <div>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <TextInput id="password" type="password" placeholder="8 characters minimum" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} autoComplete="new-password"/>
          {form.password.length > 0 && form.password.length < 8 && <p className="text-xs text-[#B4483D] mt-1.5">At least 8 characters required.</p>}
        </div>
      </div>
      <div className="mt-6"><WideBtnPrimary onClick={() => navigate('/onboarding/portfolio')} disabled={!ok}>Continue to portfolio setup →</WideBtnPrimary></div>
      <p className="text-xs text-center text-[#16232E]/35 mt-5">
        By continuing you agree to our <Link to="/legal/terms" className="underline underline-offset-2 hover:text-[#3E6E96]">Terms</Link> and <Link to="/legal/privacy" className="underline underline-offset-2 hover:text-[#3E6E96]">Privacy Policy</Link>.
      </p>
    </div>
  )
}
