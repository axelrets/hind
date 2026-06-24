import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/PageHeader'
import { ObjektListCard } from '@/components/ObjektListCard'

export function Objekt() {
  const objekt = useStore((s) => s.objekt)
  return (
    <div className="pb-6">
      <PageHeader title="Objekt" subtitle={`${objekt.length} aktiva uppdrag`} />
      <div className="space-y-2.5 px-4 py-4">
        {objekt.map((o) => (
          <ObjektListCard key={o.id} objekt={o} />
        ))}
      </div>
    </div>
  )
}
