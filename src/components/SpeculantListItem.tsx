import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { Speculant } from '@/lib/types'
import { useStore } from '@/lib/store'
import { Avatar } from '@/components/ui/avatar'
import { KopviljaRing } from '@/components/KopviljaRing'
import { isHet, HetBadge } from '@/components/meta'
import { formatMkr, hueFromString, initials } from '@/lib/utils'

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
      <KopviljaRing score={speculant.kopvilja} size={44} />
      <Avatar hue={hueFromString(speculant.namn)}>
        {initials(speculant.namn)}
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold">{speculant.namn}</p>
          {isHet(speculant.kopvilja) && <HetBadge />}
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
