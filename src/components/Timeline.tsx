import { BadgeCheck } from 'lucide-react'
import type { TimelineEvent } from '@/lib/types'
import { timelineMeta } from './meta'
import { cn, formatRelative } from '@/lib/utils'

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
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
        return (
          <li key={e.id} className="relative flex gap-3 pb-5">
            {!last && (
              <span className="absolute left-[18px] top-10 h-[calc(100%-1.5rem)] w-px bg-border" />
            )}
            <span
              className="z-10 flex size-9 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: `hsl(${m.hue} 80% 95%)`,
                color: `hsl(${m.hue} 60% 42%)`,
              }}
            >
              <Icon className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug">{e.titel}</p>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {formatRelative(e.occurredAt)}
                </time>
              </div>
              {e.beskrivning && (
                <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                  {e.beskrivning}
                </p>
              )}
              <span
                className={cn(
                  'mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium',
                  e.synced ? 'text-success' : 'text-muted-foreground',
                )}
              >
                <BadgeCheck className="size-3.5" />
                {e.synced ? 'Synkad med Vitec' : 'Ej synkad'}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
