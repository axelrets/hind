import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Mic, Sparkles, Loader2, CircleCheck } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { chat, type ChatTurn, type AiSource } from '@/lib/api'
import { persistDebrief } from '@/lib/persist'
import { supabaseEnabled } from '@/lib/supabase'
import { cn, uid } from '@/lib/utils'

interface Saved {
  namn: string
  speculantId: string
  objektAdress: string
}

interface Msg {
  id: string
  role: 'user' | 'assistant'
  content: string
  saved?: Saved | null
}

// Same quick prompts as the home screen — they seed the first message.
const suggestions = [
  'Sammanfatta dagens visning på Götgatan',
  'Vem ska jag ringa först idag?',
  'Lägg in en ny spekulant från visningen',
]

export function Assistent() {
  const navigate = useNavigate()
  const location = useLocation()
  const objekt = useStore((s) => s.objekt)
  const commitDebrief = useStore((s) => s.commitDebrief)

  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [source, setSource] = useState<AiSource>(
    supabaseEnabled ? 'live' : 'demo',
  )

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const didInit = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    const userMsg: Msg = { id: uid('m'), role: 'user', content: trimmed }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setSending(true)

    const turns: ChatTurn[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }))
    const result = await chat(
      turns,
      objekt.map((o) => ({ id: o.id, adress: o.adress })),
    )

    // Claude chose to save a spekulant → commit it through the same loop the
    // voice debrief uses, and land it in Supabase.
    let savedInfo: Saved | null = null
    if (result.saved && objekt.length) {
      const { objektId: rawId, ...structured } = result.saved
      const objektId = objekt.find((o) => o.id === rawId)?.id ?? objekt[0].id
      const committed = commitDebrief(objektId, structured)
      void persistDebrief(objektId, structured, trimmed, committed)
      savedInfo = {
        namn: structured.namn,
        speculantId: committed.speculant.id,
        objektAdress: objekt.find((o) => o.id === objektId)?.adress ?? '',
      }
    }

    const assistantMsg: Msg = {
      id: uid('m'),
      role: 'assistant',
      content:
        result.reply ||
        (savedInfo ? `Klart – jag har lagt in ${savedInfo.namn}.` : '…'),
      saved: savedInfo,
    }
    setMessages((prev) => [...prev, assistantMsg])
    setSource(result.source)
    setSending(false)
  }

  // Auto-send a query passed in from the home-screen chips.
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    const q = (location.state as { q?: string } | null)?.q
    if (q) void send(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Tillbaka"
          className="-ml-1 flex size-9 items-center justify-center rounded-full hover:bg-accent"
        >
          <ArrowLeft className="size-5" />
        </button>
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold leading-tight">Hind</p>
          <p className="text-[11px] text-muted-foreground">AI-medhjälpare</p>
        </div>
        <Badge variant={source === 'live' ? 'success' : 'muted'}>
          {source === 'live' ? 'Live' : 'Demo'}
        </Badge>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !sending ? (
          <div className="flex flex-col items-center px-2 pt-8 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-7" />
            </span>
            <h1 className="mt-4 text-lg font-semibold">Vad vill du göra?</h1>
            <p className="mt-1 max-w-[280px] text-sm text-muted-foreground">
              Berätta om en visning så lägger jag in spekulanten åt dig – eller
              fråga mig om dagen, vem du bör ringa, eller be om ett utkast.
            </p>
            <div className="mt-6 w-full space-y-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5 text-left text-sm shadow-sm transition active:scale-[0.99]"
                >
                  <Sparkles className="size-4 shrink-0 text-primary" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id}>
                <div
                  className={cn(
                    'flex',
                    m.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                      m.role === 'user'
                        ? 'rounded-br-sm bg-primary text-primary-foreground'
                        : 'rounded-bl-sm border border-border bg-card',
                    )}
                  >
                    {m.content}
                  </div>
                </div>
                {m.saved && (
                  <Link
                    to={`/spekulanter/${m.saved.speculantId}`}
                    className="mt-1.5 flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm shadow-sm"
                  >
                    <CircleCheck className="size-4 shrink-0 text-success" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium leading-tight">
                        {m.saved.namn}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        Sparad spekulant · {m.saved.objektAdress}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-primary">
                      Visa profil
                    </span>
                  </Link>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Hind skriver…
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <button
          type="button"
          onClick={() => navigate('/debrief')}
          aria-label="Spela in röstdebrief"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-primary transition active:scale-95"
        >
          <Mic className="size-5" />
        </button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Skriv till Hind…"
          className="h-11 flex-1 rounded-full"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          aria-label="Skicka"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition active:scale-95 disabled:opacity-40"
        >
          <Send className="size-5" />
        </button>
      </form>
    </div>
  )
}
