import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Mic, ArrowUp } from 'lucide-react'
import { agendaMeta } from '@/components/meta'
import { seedAgenda } from '@/lib/seed'
import { supabaseEnabled } from '@/lib/supabase'
import { cn } from '@/lib/utils'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 10) return 'God morgon'
  if (h < 18) return 'Hej'
  return 'God kväll'
}

// Tapping a prompt opens the chat with that question already sent.
const prompts = [
  'Vem ska jag ringa först idag?',
  'Lägg in en ny spekulant',
  'Sammanfatta dagens visning',
]

export function Hem() {
  const navigate = useNavigate()
  const [input, setInput] = useState('')

  // Hand the typed message to the chat, which auto-sends it.
  function ask(text: string) {
    const q = text.trim()
    if (!q) return
    navigate('/assistent', { state: { q } })
  }

  const today = new Date().toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const now = Date.now()
  const nextIdx = seedAgenda.findIndex(
    (it) => new Date(it.start).getTime() >= now,
  )

  return (
    <div className="min-h-full bg-gradient-to-br from-violet-500 via-indigo-500 to-emerald-400 px-4 pb-12 pt-8">
      {/* Greeting — directly on the gradient */}
      <header className="px-1 text-white">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium capitalize text-white/80">{today}</p>
          <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
            <Sparkles className="size-3" />
            {supabaseEnabled ? 'AI live' : 'Demoläge'}
          </span>
        </div>
        <h1 className="mt-5 text-[27px] font-semibold leading-tight tracking-tight">
          {greeting()}, Hind 👋
        </h1>
        <p className="mt-2 max-w-[300px] text-sm leading-relaxed text-white/85">
          Lugn morgon. Du har {seedAgenda.length} saker inbokade idag – fråga
          mig vad du vill ta tag i.
        </p>
      </header>

      {/* Workbench: start here — type, talk, or pick a suggestion */}
      <section className="mt-7">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(input)
          }}
          className="rounded-[26px] border border-white/50 bg-white p-2 shadow-2xl"
        >
          <div className="flex items-end gap-2.5">
            <span className="mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-sm">
              <Sparkles className="size-5" />
            </span>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  ask(input)
                }
              }}
              rows={1}
              placeholder="Fråga Hind eller berätta om en visning…"
              aria-label="Skriv till Hind"
              className="no-scrollbar max-h-28 min-h-[2.75rem] flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-snug text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => navigate('/debrief')}
              aria-label="Prata in en visning"
              className="mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-indigo-600 transition active:scale-90"
            >
              <Mic className="size-5" />
            </button>
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Skicka till Hind"
              className="mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm transition active:scale-90 disabled:opacity-40"
            >
              <ArrowUp className="size-5" />
            </button>
          </div>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {prompts.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => ask(p)}
              className="rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition active:scale-95"
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      {/* A calm overview of the day — frosted glass panel */}
      <section className="mt-7 rounded-3xl border border-white/40 bg-white/80 p-4 shadow-2xl backdrop-blur-xl">
        <h2 className="mb-3 px-1 text-sm font-semibold text-foreground/70">
          Det här står på din agenda idag
        </h2>
        <ol className="space-y-2">
          {seedAgenda.map((item, i) => {
            const m = agendaMeta[item.typ]
            const Icon = m.icon
            const start = new Date(item.start)
            const time = start.toLocaleTimeString('sv-SE', {
              hour: '2-digit',
              minute: '2-digit',
            })
            const past = start.getTime() < now
            const isNext = i === nextIdx
            const target = item.speculantId
              ? `/spekulanter/${item.speculantId}`
              : item.objektId
                ? `/objekt/${item.objektId}`
                : '/'
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate(target)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl border border-white/60 bg-white/70 p-3 text-left shadow-sm transition active:scale-[0.99]',
                    past && 'opacity-50',
                    isNext && 'border-primary/40 ring-1 ring-primary/15',
                  )}
                >
                  <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                    {time}
                  </span>
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: `hsl(${m.hue} 70% 94%)`,
                      color: `hsl(${m.hue} 60% 40%)`,
                    }}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium leading-snug">
                      {item.titel}
                    </span>
                    {item.plats && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.plats}
                      </span>
                    )}
                  </span>
                  {isNext && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Härnäst
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
