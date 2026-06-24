import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight } from 'lucide-react'
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
    <div className="pb-8">
      <header className="bg-gradient-to-br from-primary to-indigo-700 px-5 pb-7 pt-8 text-primary-foreground">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium capitalize opacity-80">{today}</p>
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium">
            <Sparkles className="size-3" />
            {supabaseEnabled ? 'AI live' : 'Demoläge'}
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {greeting()}, Hind 👋
        </h1>
        <p className="mt-1.5 text-sm opacity-85">
          Lugn morgon. Du har {seedAgenda.length} saker inbokade idag – fråga
          mig om vad du vill ta tag i.
        </p>
      </header>

      {/* ── Virtual Hind: what do you want to do? ── */}
      <section className="-mt-4 px-4">
        <Link
          to="/assistent"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-md transition active:scale-[0.99]"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-tight">
              Vad vill du göra?
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              Fråga Hind eller berätta om en visning…
            </span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-muted-foreground/50" />
        </Link>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {prompts.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => navigate('/assistent', { state: { q: p } })}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 shadow-sm transition active:scale-95"
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      {/* ── A calm overview of the day ── */}
      <section className="px-4 pt-7">
        <h2 className="mb-2.5 px-1 text-sm font-medium text-muted-foreground">
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
                    'flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition active:scale-[0.99]',
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
