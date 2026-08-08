import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { AuthShell, FieldLabel, TextInput, WideBtnPrimary } from '../components/ui'
import { useAuth } from '../state/auth'

export default function SignIn() {
  const navigate = useNavigate()
  const { user, signIn } = useAuth()
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('')
  const canSubmit = email.includes('@') && password.length >= 1
  if (user) return <Navigate to="/dashboard" replace/>
  const handleSignIn = async () => {
    if (!canSubmit) return
    if (password.length < 8) { setError('Incorrect email or password.'); return }
    try {
      setError('')
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect email or password.')
    }
  }
  return (
    <AuthShell>
      <h1 className="text-2xl font-light text-[#16232E] mb-1 font-display">Welcome back</h1>
      <p className="text-sm text-[#16232E]/50 mb-8">Sign in to your portfolio.</p>
      <div className="space-y-4">
        <div><FieldLabel htmlFor="si-email">Email address</FieldLabel><TextInput id="si-email" type="email" placeholder="you@example.com" value={email} onChange={setEmail} autoComplete="email"/></div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <FieldLabel htmlFor="si-password">Password</FieldLabel>
            <Link to="/forgot-password" className="text-[11px] text-[#3E6E96] hover:underline underline-offset-2 transition-colors">Forgot password?</Link>
          </div>
          <TextInput id="si-password" type="password" placeholder="••••••••" value={password} onChange={(v) => { setPassword(v); setError('') }} autoComplete="current-password"/>
        </div>
      </div>
      {error && <p className="text-xs text-[#B4483D] mt-3">{error}</p>}
      <div className="mt-6"><WideBtnPrimary onClick={handleSignIn} disabled={!canSubmit}>Sign in</WideBtnPrimary></div>
      <p className="text-xs text-center text-[#16232E]/35 mt-5">
        No account yet?{' '}
        <Link to="/onboarding" className="underline underline-offset-2 hover:text-[#3E6E96] text-[#16232E]/50 transition-colors">Create one</Link>
      </p>
    </AuthShell>
  )
}
