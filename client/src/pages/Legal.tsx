import { Link, useParams } from 'react-router'
import { AuthShell } from '../components/ui'

const TOPICS: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: 'Terms of Service',
    body: [
      'This is a design preview of the Equilibrium portfolio-rebalancing service. No real accounts, orders, or financial advice are involved.',
      'By using this preview you agree that displayed values are illustrative fixtures, that simulated trades are not executed, and that nothing here constitutes an offer of investment advice.',
      'The full service will be governed by separate terms provided at launch.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    body: [
      'Equilibrium only stores what is needed to run the product: your account email, portfolio settings, and notifications.',
      'In this preview, data is kept in your browser\u2019s local storage and never leaves your device.',
      'When the live service launches, a full privacy policy will describe collection, use, and your rights.',
    ],
  },
}

export default function Legal() {
  const { topic } = useParams()
  const t = TOPICS[topic ?? ''] ?? TOPICS.terms
  return (
    <AuthShell footer={<Link to="/" className="underline underline-offset-2 hover:text-[#3E6E96] text-[#16232E]/40 transition-colors">Back to sign in</Link>}>
      <h1 className="text-2xl font-light text-[#16232E] mb-4 font-display">{t.title}</h1>
      <div className="text-sm text-[#16232E]/60 leading-relaxed space-y-3">
        {t.body.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </AuthShell>
  )
}
