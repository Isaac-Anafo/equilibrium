import { Link } from 'react-router'
import { Logo } from '../components/ui'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col items-center justify-center px-4 text-center">
      <div className="mb-10"><Logo to="/dashboard"/></div>
      <div className="text-5xl text-[#16232E]/20 mb-3 font-mono">404</div>
      <h1 className="text-2xl font-light text-[#16232E] mb-2 font-display">No such page in the ledger.</h1>
      <p className="text-sm text-[#16232E]/50 mb-7 max-w-sm">The page you asked for does not exist, or has been moved.</p>
      <div className="flex items-center gap-4 text-sm">
        <Link to="/dashboard" className="px-5 py-2.5 bg-[#2F6E5B] text-white rounded-sm hover:bg-[#265e4d] transition-colors">Go to dashboard</Link>
        <Link to="/" className="text-[#3E6E96] underline underline-offset-2 hover:no-underline">Sign in</Link>
      </div>
    </div>
  )
}
