import { Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ChatMessage, Plan } from '@soiree/shared'
import { api } from '../../lib/api'

interface Props {
  plan: Plan
}

export default function AskTab({ plan }: Props) {
  const [msgs, setMsgs] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: `Hi! I'm Soirée. I can see your budget, timeline and vendors for ${plan.brief.title || 'your event'}. What would you like help with?`,
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  // Load chat history from backend on mount
  useEffect(() => {
    let active = true
    api.plans
      .getChat(plan.id)
      .then((res) => {
        if (active && res.messages && res.messages.length > 0) {
          setMsgs(res.messages)
        }
      })
      .catch(() => {
        // Keep default initial greeting
      })
    return () => {
      active = false
    }
  }, [plan.id])

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [msgs, busy])

  const send = async (q: string) => {
    if (!q.trim() || busy) return
    const text = q.trim()
    setInput('')
    setBusy(true)

    // Optimistically show user message
    setMsgs((m) => [...m, { role: 'user', text }])

    try {
      const res = await api.plans.sendChat(plan.id, text)
      setMsgs((m) => [...m, res.reply])
    } catch {
      setMsgs((m) => [
        ...m,
        { role: 'assistant', text: 'Sorry, I encountered an issue retrieving an answer. Please try again.' },
      ])
    } finally {
      setBusy(false)
    }
  }

  const suggestions = [
    'How can I save money?',
    'What should I do next?',
    'Which vendors should I book first?',
    'Give me a unique theme idea',
  ]

  return (
    <div className="panel chat" style={{ padding: 22 }}>
      <div className="messages" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.text}
          </div>
        ))}
        {busy && (
          <div className="msg assistant">
            <span className="typing">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        <div ref={end} />
      </div>
      <div>
        <div className="suggest">
          {suggestions.map((s) => (
            <button key={s} className="chip" onClick={() => void send(s)} disabled={busy}>
              {s}
            </button>
          ))}
        </div>
        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault()
            void send(input)
          }}
        >
          <input
            className="input"
            aria-label="Ask Soirée"
            placeholder="Ask anything about your budget, vendors or timeline…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <button className="btn btn-primary" type="submit" disabled={busy || !input.trim()} aria-label="Send">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
