import { Link } from 'react-router-dom'
import { Mic, Sparkles, ChevronRight, Building2, Users } from 'lucide-react'
import { useStore } from '@/lib/store'
import { NextStepCard } from '@/components/NextStepCard'
import { supabaseEnabled } from '@/lib/supabase'
import { prioRank } from '@/lib/sort'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 10) return 'God morgon'
  if (h < 18) return 'Hej'
  return 'God kväll'
}

export function Hem() {
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
          Du har <span className="font-semibold">{kvar} nästa drag</span> att ta
          tag i idag.
        </p>

        <Link
          to="/debrief"
          className="mt-5 flex items-center gap-3 rounded-xl bg-white/15 p-3 backdrop-blur transition active:scale-[0.99]"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-white text-primary">
            <Mic className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">
              Spela in en röstdebrief
            </span>
            <span className="block text-xs opacity-85">
              Efter visningen – så fyller appen i sig själv
            </span>
          </span>
          <ChevronRight className="size-5 opacity-80" />
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 px-4 py-4">
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

      <section className="px-4">
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
    </div>
  )
}
