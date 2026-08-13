import { useMemo } from 'react'
import { PageHeading } from '../components/ui'
import type { Notif } from '../state/notifications'
import { useNotifications } from '../state/notifications'

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  drift: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2L13 12H2L7.5 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><line x1="7.5" y1="5.5" x2="7.5" y2="8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="7.5" cy="10.2" r="0.65" fill="currentColor"/></svg>,
  trade: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><polyline points="2,7.5 6,3 9,9 12,5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><polyline points="10,5.5 12,5.5 12,7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  system: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.2"/><line x1="7.5" y1="5" x2="7.5" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="7.5" cy="10" r="0.7" fill="currentColor"/></svg>,
}

function parseTime(time: string): { group: 'Today' | 'Earlier'; label: string } {
  const t = time.trim()
  if (!t) return { group: 'Earlier', label: t }
  if (t.toLowerCase() === 'just now' || t.startsWith('Today')) {
    return { group: 'Today', label: t }
  }
  const d = new Date(time)
  if (!isNaN(d.getTime())) {
    const now = new Date()
    const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
    const timeLabel = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    if (isToday) return { group: 'Today', label: `Today, ${timeLabel}` }
    const sameYear = d.getFullYear() === now.getFullYear()
    const dateLabel = sameYear
      ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return { group: 'Earlier', label: `${dateLabel} · ${timeLabel}` }
  }
  return { group: 'Earlier', label: t }
}

export default function Notifications() {
  const { notifs, unread, markRead, markAllRead } = useNotifications()
  const groups = useMemo(() => {
    const today: Array<Notif & { label: string }> = []
    const past: Array<Notif & { label: string }> = []
    for (const n of notifs) {
      const { group, label } = parseTime(n.time)
      const item = { ...n, label }
      if (group === 'Today') today.push(item)
      else past.push(item)
    }
    return [
      { label: 'Today', items: today },
      { label: 'Earlier', items: past },
    ].filter((g) => g.items.length > 0)
  }, [notifs])

  return (
    <main className="max-w-2xl mx-auto px-6 py-8">
      <PageHeading
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
        action={unread > 0 ? <button onClick={markAllRead} className="text-xs text-[#3E6E96] underline underline-offset-2 hover:no-underline pb-1">Mark all read</button> : undefined}
      />

      <div className="space-y-8">
        {groups.length === 0 && (
          <div className="bg-white border border-[#DCD8CF] rounded-sm p-8 text-center">
            <p className="text-sm text-[#16232E]/60">No notifications yet.</p>
            <p className="text-xs text-[#16232E]/40 mt-1">Drift alerts and trade confirmations will appear here.</p>
          </div>
        )}
        {groups.map((g) => (
          <div key={g.label}>
            <div className="text-[10px] uppercase tracking-[0.1em] text-[#16232E]/35 mb-3">{g.label}</div>
            <div className="bg-white border border-[#DCD8CF] rounded-sm overflow-hidden divide-y divide-[#DCD8CF]/60">
              {g.items.map((n) => (
                <div
                  key={n.id}
                  onClick={n.unread ? () => markRead(n.id) : undefined}
                  title={n.unread ? 'Mark as read' : undefined}
                  role={n.unread ? 'button' : undefined}
                  tabIndex={n.unread ? 0 : undefined}
                  onKeyDown={n.unread ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); markRead(n.id) } } : undefined}
                  className={`flex items-start gap-3.5 px-4 py-3.5 transition-colors ${n.unread
                    ? 'cursor-pointer bg-[#3E6E96]/[0.02] hover:bg-[#3E6E96]/[0.06]'
                    : 'hover:bg-[#16232E]/[0.015]'}`}
                >
                  <div className={`mt-0.5 flex-shrink-0 ${n.type === 'drift' ? 'text-[#D98E3F]' : n.type === 'trade' ? 'text-[#2F6E5B]' : 'text-[#16232E]/40'}`}>
                    {NOTIF_ICONS[n.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#16232E]/80 leading-snug">{n.text}</p>
                    <p className="text-[11px] text-[#16232E]/35 mt-1 font-mono">{n.label}</p>
                  </div>
                  {n.unread ? (
                    <div className="flex items-center gap-2.5 flex-shrink-0 mt-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); markRead(n.id) }}
                        className="text-[11px] text-[#3E6E96] underline underline-offset-2 hover:no-underline"
                      >
                        Mark read
                      </button>
                      <div className="w-2 h-2 rounded-full bg-[#3E6E96]" aria-label="Unread" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
