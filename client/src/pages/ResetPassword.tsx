import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { AuthShell, FieldLabel, TextInput, WideBtnPrimary } from '../components/ui'
import { apiFetch } from '../lib/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const ok = password.length >= 8

  if (!token) return <Navigate to="/forgot-password" replace/>

  const handleReset = async () => {
    if (!ok) return
    try {
      setError('')
      await apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword: password }) })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset your password. The link may be invalid or expired.')
    }
  }

  return (
    <AuthShell footer={<><Link to="/" className="underline underline-offset-2 hover:text-[#3E6E96] text-[#16232E]/40 transition-colors">Back to sign in</Link></>}>
      {done ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-[#2F6E5B]/10 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" stroke="#2F6E5B" strokeWidth="1.5"/><polyline points="6,12 10,16 18,8" stroke="#2F6E5B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h1 className="text-2xl font-light text-[#16232E] mb-2 font-display">Password updated</h1>
          <p className="text-sm text-[#16232E]/50 mb-7">Your password has been changed. You've been signed out everywhere — sign in again with your new password.</p>
          <Link to="/" className="inline-block text-sm text-[#3E6E96] underline underline-offset-2 hover:no-underline">Sign in</Link>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-light text-[#16232E] mb-1 font-display">Choose a new password</h1>
          <p className="text-sm text-[#16232E]/50 mb-8">Use at least 8 characters for your new password.</p>
          <div><FieldLabel htmlFor="rp-password">New password</FieldLabel><TextInput id="rp-password" type="password" placeholder="••••••••" value={password} onChange={(v) => { setPassword(v); setError('') }} autoComplete="new-password"/></div>
          {error && <p className="text-xs text-[#B4483D] mt-3">{error}</p>}
          <div className="mt-6"><WideBtnPrimary onClick={handleReset} disabled={!ok}>Reset password</WideBtnPrimary></div>
        </>
      )}
    </AuthShell>
  )
}
