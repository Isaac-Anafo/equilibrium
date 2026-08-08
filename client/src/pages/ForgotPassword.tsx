import { useState } from 'react'
import { Link } from 'react-router'
import { AuthShell, FieldLabel, TextInput, WideBtnPrimary } from '../components/ui'
import { apiFetch } from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const ok = email.includes('@')
  const handleSend = async () => {
    try {
      await apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
    } catch {
      // endpoint is intentionally vague; still show the generic confirmation
    }
    setSent(true)
  }
  return (
    <AuthShell footer={<><Link to="/" className="underline underline-offset-2 hover:text-[#3E6E96] text-[#16232E]/40 transition-colors">Back to sign in</Link></>}>
      {sent ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-[#2F6E5B]/10 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" stroke="#2F6E5B" strokeWidth="1.5"/><polyline points="6,12 10,16 18,8" stroke="#2F6E5B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h1 className="text-2xl font-light text-[#16232E] mb-2 font-display">Check your inbox</h1>
          <p className="text-sm text-[#16232E]/50 mb-7">If an account exists for <span className="font-medium text-[#16232E]/70">{email}</span>, a reset link is on its way.</p>
          <Link to="/" className="inline-block text-sm text-[#3E6E96] underline underline-offset-2 hover:no-underline">Back to sign in</Link>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-light text-[#16232E] mb-1 font-display">Reset your password</h1>
          <p className="text-sm text-[#16232E]/50 mb-8">Enter the email on your account and we'll send you a reset link.</p>
          <div><FieldLabel htmlFor="fp-email">Email address</FieldLabel><TextInput id="fp-email" type="email" placeholder="you@example.com" value={email} onChange={setEmail} autoComplete="email"/></div>
          <div className="mt-6"><WideBtnPrimary onClick={handleSend} disabled={!ok}>Send reset link</WideBtnPrimary></div>
        </>
      )}
    </AuthShell>
  )
}
