import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight, Clock, Building2, User } from 'lucide-react'
import type { NextStep } from '@/lib/types'
import { useStore } from '@/lib/store'
import { PriorityDot } from './meta'
import { cn, formatRelative } from '@/lib/utils'

export function NextStepCard({ step }: { step: NextStep }) {
  const navigate = useNavigate()
  const objekt = useStore((s) =>
    s.objekt.find((o) => o.id === step.objektId),
  )
  const speculant = useStore((s) =>
    s.speculanter.find((p) => p.id === step.speculantId),
  )
  const toggle = useStore((s) => s.toggleNextStep)

  const target = step.speculantId
    ? `/spekulanter/${step.speculantId}`
    : step.objektId
      ? `/objekt/${step.objektId}`
      : '/'

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-border bg-card p-3.5 shadow-sm transition',
        step.klar && 'opacity-55',
      )}
    >
      <button
        type="button"
        onClick={() => toggle(step.id)}
        aria-label={step.klar ? 'Markera som ej klar' : 'Markera som klar'}
        className={cn(
          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          step.klar
            ? 'border-success bg-success text-success-foreground'
            : 'border-muted-foreground/30 text-transparent hover:border-primary',
        )}
      >
        <Check className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={() => navigate(target)}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-center gap-2">
          <PriorityDot prioritet={step.prioritet} />
          <p
            className={cn(
              'text-sm font-medium leading-snug',
              step.klar && 'line-through',
            )}
          >
            {step.beskrivning}
          </p>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {objekt && (
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3" />
              {objekt.adress}
            </span>
          )}
          {speculant && (
            <span className="inline-flex items-center gap-1">
              <User className="size-3" />
              {speculant.namn}
            </span>
          )}
          {step.deadline && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {formatRelative(step.deadline)}
            </span>
          )}
        </div>
      </button>

      <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground/40" />
    </div>
  )
}
