import { useEffect, useRef, useState } from 'react'
import { isAbortError, streamChat, type ChatTurn } from '../lib/chat'
import { useAuth } from '../state/auth'

interface Message extends ChatTurn {
  error?: boolean
}

const GREETING: Message = {
  role: 'assistant',
  content:
    "Hi, I'm Equilibrium Assistant. Ask me about your portfolio, drift, rebalancing, asset allocation, or how the app's rebalance engine works.",
}

const SUGGESTIONS = ['Is my portfolio balanced?', 'What is portfolio drift?', 'Should I rebalance right now?']

export default function ChatWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const cancelStream = () => {
    abortRef.current?.abort()
    abortRef.current = null
  }

  const handleClose = () => {
    cancelStream()
    setOpen(false)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, open])

  if (!user) return null

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || streaming) return
    setInput('')
    const history: ChatTurn[] = messages
      .filter((m) => !m.error && m.content)
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }))
    setMessages((prev) => [...prev, { role: 'user', content }])
    setStreaming(true)
    const controller = new AbortController()
    abortRef.current = controller
    let trimmed = false
    try {
      await streamChat(
        content,
        history,
        (chunk) => {
          setMessages((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last.role === 'assistant' && !last.error) {
              next[next.length - 1] = { ...last, content: last.content + chunk }
            } else {
              next.push({ role: 'assistant', content: chunk })
            }
            return next
          })
        },
        controller.signal,
        () => {
          trimmed = true
        },
      )
      if (trimmed) {
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last.role === 'assistant') {
            next[next.length - 1] = { ...last, content: `${last.content}\n\n(answer trimmed at the length limit)` }
          }
          return next
        })
      }
    } catch (err) {
      if (isAbortError(err)) return
      const message = err instanceof Error ? err.message : 'Could not reach the chat assistant.'
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last.role === 'assistant' && !last.content) {
          next[next.length - 1] = { role: 'assistant', content: message, error: true }
        } else {
          next.push({ role: 'assistant', content: message, error: true })
        }
        return next
      })
    } finally {
      abortRef.current = null
      setStreaming(false)
    }
  }

  return (
    <>
      <button
        onClick={() => {
          if (open) cancelStream()
          setOpen((o) => !o)
        }}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#2F6E5B] text-white shadow-lg hover:bg-[#265e4d] active:bg-[#1e4e40] transition-colors duration-150 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#3E6E96] focus-visible:ring-offset-2">
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 4h14v11H8l-4 3V4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M8 8h6M8 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] h-[520px] max-w-[calc(100vw-3rem)] flex flex-col bg-white border border-[#DCD8CF] rounded-sm shadow-xl overflow-hidden">
          <div className="bg-[#16232E] text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div>
              <div className="text-sm font-medium font-display">Equilibrium Assistant</div>
              <div className="text-[10px] text-white/50 uppercase tracking-[0.06em] mt-0.5">Investing &amp; rebalancing help</div>
            </div>
            <button onClick={handleClose} aria-label="Close chat" className="text-white/50 hover:text-white transition-colors p-1 rounded-sm focus-visible:ring-2 focus-visible:ring-[#3E6E96]">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#F7F5F0] flex flex-col">
            {messages.map((m, i) => (
              <div key={i} className={`whitespace-pre-wrap text-sm leading-relaxed max-w-[85%] rounded-sm px-3 py-2 font-sans ${m.role === 'user' ? 'self-end bg-[#2F6E5B] text-white' : `self-start border border-[#DCD8CF] bg-white ${m.error ? 'text-[#B4483D]' : 'text-[#16232E]'}`}`}>
                {m.content}
              </div>
            ))}
            {streaming && (
              <div className="self-start bg-white border border-[#DCD8CF] rounded-sm px-3 py-2 text-[#16232E]/50 text-sm animate-pulse">
                Writing…
              </div>
            )}
          </div>

          <div className="border-t border-[#DCD8CF] px-4 py-3 shrink-0">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-[11px] text-[#3E6E96] bg-[#3E6E96]/5 border border-[#3E6E96]/20 rounded-sm px-2 py-1 hover:bg-[#3E6E96]/10 transition-colors font-sans">
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
                placeholder="Ask about investing…"
                aria-label="Message the assistant"
                className="flex-1 px-3 py-2 bg-white border border-[#DCD8CF] text-[#16232E] placeholder:text-[#16232E]/30 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#3E6E96] focus:border-transparent transition-shadow duration-150 font-sans"
              />
              <button onClick={() => handleSend()} disabled={streaming || !input.trim()}
                aria-label="Send message"
                className="w-10 h-10 rounded-sm bg-[#2F6E5B] text-white flex items-center justify-center hover:bg-[#265e4d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#3E6E96] focus-visible:ring-offset-2 font-sans">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8l11-5-3 10-3-4-4-1 10-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
