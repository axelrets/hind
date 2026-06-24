import { BadgeCheck } from 'lucide-react'
import type { TimelineEvent } from '@/lib/types'
import { timelineMeta } from './meta'
import { cn, formatRelative } from '@/lib/utils'

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
        Inga händelser ännu.
      </p>
    )
  }
  return (
    <ol className="relative">
      {events.map((e, i) => {
        const m = timelineMeta[e.typ]
        const Icon = m.icon
        const last = i === events.length - 1
        const fresh = e.typ === 'rostdebrief'
        return (
          <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && (
              <span className="absolute bottom-0 left-[17px] top-9 w-px bg-border" />
            )}
            <span
              className="z-10 flex size-9 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: `hsl(${m.hue} 70% 94%)`,
                color: `hsl(${m.hue} 60% 40%)`,
              }}
            >
              <Icon className="size-4" />
            </span>
            <div
              className={cn(
                'min-w-0 flex-1 rounded-lg pt-1',
                fresh && '-mt-1 animate-fade-in rounded-lg bg-accent/60 p-2 pt-2',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug">{e.titel}</p>
                <time className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                  {formatRelative(e.occurredAt)}
                </time>
              </div>
              {e.beskrivning && (
                <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                  {e.beskrivning}
                </p>
              )}
              <div className="mt-1.5">
                {e.synced ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                    <BadgeCheck className="size-3.5" />
                    Synkad med Vitec
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    Ej synkad
                  </span>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
