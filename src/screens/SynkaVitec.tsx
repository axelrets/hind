import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  User,
  Clock,
  ListChecks,
  CircleCheck,
  Loader2,
  RefreshCw,
  ArrowRight,
  Home,
  Building2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SyncState {
  objektId?: string
  speculantId?: string
  timelineId?: string
  namn?: string
  nastaSteg?: string
}

export function SynkaVitec() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSynced = useStore((s) => s.setSynced)
  const st = (location.state as SyncState | null) ?? {}

  const rows: { icon: LucideIcon; label: string }[] = [
    { icon: User, label: `Spekulant: ${st.namn ?? 'Ny spekulant'}` },
    { icon: Clock, label: 'Tidslinjehändelse' },
    { icon: ListChecks, label: `Nästa steg: ${st.nastaSteg ?? '–'}` },
  ]

  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!st.timelineId) {
      navigate('/', { replace: true })
      return
    }
    let i = 0
    const iv = window.setInterval(() => {
      i += 1
      setIdx(i)
      if (i >= rows.length) {
        window.clearInterval(iv)
        setSynced(st.timelineId as string)
        window.setTimeout(() => setDone(true), 450)
      }
    }, 820)
    return () => window.clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center bg-background px-6">
      {/* Hind → Vitec */}
      <div className="flex items-center gap-3">
        <div className="flex size-16 flex-col items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <span className="text-lg font-bold">H</span>
          <span className="text-[9px] opacity-80">Hind</span>
        </div>
        <div className="flex flex-col items-center text-muted-foreground">
          {done ? (
            <CircleCheck className="size-6 text-success" />
          ) : (
            <RefreshCw className="size-6 animate-spin" />
          )}
          <ArrowRight className="size-4" />
        </div>
        <div className="flex size-16 flex-col items-center justify-center rounded-2xl border border-border bg-card">
          <span className="text-sm font-bold text-foreground">Vitec</span>
          <span className="text-[9px] text-muted-foreground">Express</span>
        </div>
      </div>

      <h1 className="mt-7 text-xl font-semibold">
        {done ? 'Synkroniserad med Vitec' : 'Synkar till Vitec…'}
      </h1>
      <p className="mt-1 max-w-[280px] text-center text-sm text-muted-foreground">
        {done
          ? 'Hind håller systemet uppdaterat automatiskt – ingen dubbelregistrering.'
          : 'Skriver tillbaka det du just fångade.'}
      </p>

      <div className="mt-7 w-full max-w-[300px] space-y-2.5">
        {rows.map((r, i) => {
          const rowDone = idx > i || done
          const active = idx === i && !done
          const Icon = r.icon
          return (
            <div
              key={r.label}
              className={cn(
                'flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-all',
                rowDone
                  ? 'border-success/40'
                  : active
                    ? 'border-primary/40'
                    : 'border-border opacity-50',
              )}
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm">{r.label}</span>
              {rowDone ? (
                <CircleCheck className="size-5 shrink-0 text-success" />
              ) : active ? (
                <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
              ) : (
                <span className="size-5 shrink-0 rounded-full border-2 border-muted-foreground/30" />
              )}
            </div>
          )
        })}
      </div>

      {done && (
        <div className="mt-8 flex w-full max-w-[300px] flex-col gap-2 animate-fade-in">
          {st.objektId && (
            <Button asChild className="w-full">
              <button
                type="button"
                onClick={() => navigate(`/objekt/${st.objektId}`)}
              >
                <Building2 className="size-4" />
                Visa objektet
              </button>
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/')}
          >
            <Home className="size-4" />
            Till hem
          </Button>
        </div>
      )}
    </div>
  )
}
