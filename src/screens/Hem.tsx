import { Link, useNavigate } from 'react-router-dom'
import { Mic, Sparkles, Building2, Users } from 'lucide-react'
import { useStore } from '@/lib/store'
import { NextStepCard } from '@/components/NextStepCard'
import { agendaMeta } from '@/components/meta'
import { seedAgenda } from '@/lib/seed'
import { supabaseEnabled } from '@/lib/supabase'
import { prioRank } from '@/lib/sort'
import { cn } from '@/lib/utils'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 10) return 'God morgon'
  if (h < 18) return 'Hej'
  return 'God kväll'
}

// Quick "ask the assistant" chips — each launches a real screen, so the prompt
// always leads somewhere that works rather than a fake chat box.
const prompts: { label: string; to: string }[] = [
  { label: 'Sammanfatta dagens visning', to: '/debrief' },
  { label: 'Vem ska jag ringa först?', to: '/spekulanter' },
  { label: 'Visa dagens objekt', to: '/objekt' },
]

export function Hem() {
  const navigate = useNavigate()
  const nextSteps = useStore((s) => s.nextSteps)
  const objektCount = useStore((s) => s.objekt.length)
  const spekulantCount = useStore((s) => s.speculanter.length)

  const sorted = [...nextSteps].sort((a, b) => {
    if (a.klar !== b.klar) return a.klar ? 1 : -1
    const p = prioRank(b.prioritet) - prioRank(a.prioritet)
    if (p !== 0) return p
    return (a.deadline ?? '').localeCompare(b.deadline ?? '')
  })
  const kvar = nextSteps.filter((n) => !n.klar).length

  const today = new Date().toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const now = Date.now()
  // First item that hasn't started yet — highlighted as "Härnäst".
  const nextIdx = seedAgenda.findIndex(
    (it) => new Date(it.start).getTime() >= now,
  )

  return (
    <div className="pb-6">
      <header className="bg-gradient-to-br from-primary to-indigo-700 px-5 pb-6 pt-7 text-primary-foreground">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium capitalize opacity-80">{today}</p>
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium">
            <Sparkles className="size-3" />
            {supabaseEnabled ? 'AI live' : 'Demoläge'}
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {greeting()}, Hind 👋
        </h1>
        <p className="mt-1 text-sm opacity-85">
          Du har <span className="font-semibold">{seedAgenda.length} på agendan</span>{' '}
          och <span className="font-semibold">{kvar} nästa drag</span> idag.
        </p>
      </header>

      {/* ── Today's plate: the calendar feed ── */}
      <section className="px-4 pt-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Det här står på din agenda idag</h2>
          <span className="text-xs text-muted-foreground">
            {seedAgenda.length} händelser
          </span>
        </div>
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
                    'flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left shadow-sm transition active:scale-[0.99]',
                    past && 'opacity-55',
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

      {/* ── AI assistant prompt ── */}
      <section className="px-4 pt-5">
        <h2 className="mb-2 text-base font-semibold">
          Vad behöver du hjälp med just nu?
        </h2>
        <Link
          to="/debrief"
          className="flex items-center gap-3 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/50 p-3.5 shadow-sm transition active:scale-[0.99]"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Fråga Hind</span>
            <span className="block text-xs text-muted-foreground">
              Spela in en röstdebrief – appen fyller i sig själv
            </span>
          </span>
          <Mic className="size-5 shrink-0 text-primary" />
        </Link>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {prompts.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => navigate(p.to)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 shadow-sm transition active:scale-95"
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Next steps ── */}
      <section className="px-4 pt-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Nästa drag</h2>
          <span className="text-xs text-muted-foreground">{kvar} kvar</span>
        </div>
        <div className="space-y-2.5">
          {sorted.map((step) => (
            <NextStepCard key={step.id} step={step} />
          ))}
        </div>
      </section>

      {/* ── Quick links ── */}
      <div className="grid grid-cols-2 gap-3 px-4 pt-4">
        <Link
          to="/objekt"
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
        >
          <Building2 className="size-5 text-primary" />
          <span>
            <span className="block text-lg font-semibold leading-none">
              {objektCount}
            </span>
            <span className="text-xs text-muted-foreground">objekt</span>
          </span>
        </Link>
        <Link
          to="/spekulanter"
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
        >
          <Users className="size-5 text-primary" />
          <span>
            <span className="block text-lg font-semibold leading-none">
              {spekulantCount}
            </span>
            <span className="text-xs text-muted-foreground">spekulanter</span>
          </span>
        </Link>
      </div>
    </div>
  )
}
