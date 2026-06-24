import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/PageHeader'
import { SpeculantListItem } from '@/components/SpeculantListItem'
import type { Intresseniva } from '@/lib/types'

const order: Record<Intresseniva, number> = { hög: 0, medel: 1, låg: 2 }

export function Spekulanter() {
  const speculanter = useStore((s) => s.speculanter)
  const sorted = [...speculanter].sort((a, b) => {
    const o = order[a.intresseniva] - order[b.intresseniva]
    if (o !== 0) return o
    return b.createdAt.localeCompare(a.createdAt)
  })

  return (
    <div className="pb-6">
      <PageHeader
        title="Spekulanter"
        subtitle={`${speculanter.length} personer i pipeline`}
      />
      <div className="space-y-2.5 px-4 py-4">
        {sorted.map((p) => (
          <SpeculantListItem key={p.id} speculant={p} />
        ))}
      </div>
    </div>
  )
}
