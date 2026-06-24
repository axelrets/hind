import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import type { Objekt } from '@/lib/types'
import { useStore } from '@/lib/store'
import { StatusBadge } from './meta'
import { ObjektThumb } from './ObjektThumb'
import { formatSEK } from '@/lib/utils'

export function ObjektListCard({ objekt }: { objekt: Objekt }) {
  const count = useStore(
    (s) => s.speculanter.filter((p) => p.objektId === objekt.id).length,
  )
  return (
    <Link
      to={`/objekt/${objekt.id}`}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm transition active:scale-[0.99]"
    >
      <ObjektThumb hue={objekt.hue} className="size-16" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold">{objekt.adress}</p>
          <StatusBadge status={objekt.status} />
        </div>
        <p className="truncate text-[13px] text-muted-foreground">
          {objekt.omrade}
        </p>
        <div className="mt-1 flex items-center gap-3 text-[13px]">
          <span className="tnum font-semibold">{formatSEK(objekt.pris)}</span>
          <span className="text-muted-foreground">
            {objekt.rum} rok · {objekt.boarea} m²
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
            <Users className="size-3.5" />
            {count}
          </span>
        </div>
      </div>
    </Link>
  )
}
