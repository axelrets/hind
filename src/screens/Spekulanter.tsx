import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/PageHeader'
import { SpeculantListItem } from '@/components/SpeculantListItem'

export function Spekulanter() {
  const speculanter = useStore((s) => s.speculanter)
  // Hot-first: highest AI-bedömd köpvilja on top.
  const sorted = [...speculanter].sort((a, b) => {
    const k = (b.kopvilja ?? -1) - (a.kopvilja ?? -1)
    if (k !== 0) return k
    return b.createdAt.localeCompare(a.createdAt)
  })
  const heta = speculanter.filter((p) => (p.kopvilja ?? 0) >= 70).length

  return (
    <div className="pb-6">
      <PageHeader
        title="Spekulanter"
        subtitle={`${speculanter.length} i pipeline · ${heta} heta`}
      />
      <div className="space-y-2.5 px-4 py-4">
        {sorted.map((p) => (
          <SpeculantListItem key={p.id} speculant={p} />
        ))}
      </div>
    </div>
  )
}
