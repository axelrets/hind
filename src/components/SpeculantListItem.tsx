import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { Speculant } from '@/lib/types'
import { useStore } from '@/lib/store'
import { Avatar } from '@/components/ui/avatar'
import { cn, formatMkr, hueFromString, initials } from '@/lib/utils'

const dotColor: Record<Speculant['intresseniva'], string> = {
  hög: 'bg-success',
  medel: 'bg-warning',
  låg: 'bg-muted-foreground/40',
}

export function SpeculantListItem({ speculant }: { speculant: Speculant }) {
  const objekt = useStore((s) =>
    s.objekt.find((o) => o.id === speculant.objektId),
  )
  const budget =
    speculant.budgetMax !== null
      ? `Budget ≤ ${formatMkr(speculant.budgetMax)}`
      : 'Budget ej satt'

  return (
    <Link
      to={`/spekulanter/${speculant.id}`}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm transition active:scale-[0.99]"
    >
      <Avatar hue={hueFromString(speculant.namn)}>
        {initials(speculant.namn)}
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold">{speculant.namn}</p>
          <span className="flex items-center gap-1 text-xs capitalize text-muted-foreground">
            <span
              className={cn('size-2 rounded-full', dotColor[speculant.intresseniva])}
            />
            {speculant.intresseniva}
          </span>
        </div>
        <p className="truncate text-[13px] text-muted-foreground">
          {objekt ? objekt.adress : 'Ingen koppling'}
        </p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{budget}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />
    </Link>
  )
}
