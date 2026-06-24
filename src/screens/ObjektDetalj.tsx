import { useParams, Link } from 'react-router-dom'
import { Mic, FileText } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/PageHeader'
import { ObjektThumb } from '@/components/ObjektThumb'
import { StatusBadge } from '@/components/meta'
import { NextStepCard } from '@/components/NextStepCard'
import { SpeculantListItem } from '@/components/SpeculantListItem'
import { Timeline } from '@/components/Timeline'
import { Button } from '@/components/ui/button'
import { formatSEK } from '@/lib/utils'
import { prioRank } from '@/lib/sort'

export function ObjektDetalj() {
  const { id } = useParams()
  const objekt = useStore((s) => s.objekt.find((o) => o.id === id))
  const speculanter = useStore((s) =>
    s.speculanter.filter((p) => p.objektId === id),
  )
  const events = useStore((s) =>
    s.timeline
      .filter((e) => e.objektId === id)
      .slice()
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
  )
  const steps = useStore((s) =>
    s.nextSteps
      .filter((n) => n.objektId === id && !n.klar)
      .slice()
      .sort((a, b) => prioRank(b.prioritet) - prioRank(a.prioritet)),
  )

  if (!objekt) {
    return (
      <div>
        <PageHeader title="Objekt" back />
        <p className="p-6 text-sm text-muted-foreground">Objektet hittades inte.</p>
      </div>
    )
  }

  return (
    <div className="pb-6">
      <PageHeader title={objekt.adress} subtitle={objekt.omrade} back />

      <div className="px-4 py-4">
        <div className="flex gap-3">
          <ObjektThumb hue={objekt.hue} className="size-24" />
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
            <div className="flex items-center gap-2">
              <StatusBadge status={objekt.status} />
            </div>
            <p className="tnum text-xl font-semibold">{formatSEK(objekt.pris)}</p>
            <p className="text-sm text-muted-foreground">
              {objekt.rum} rok · {objekt.boarea} m² ·{' '}
              {Math.round(objekt.pris / objekt.boarea).toLocaleString('sv-SE')} kr/m²
            </p>
          </div>
        </div>

        <Button asChild variant="outline" className="mt-3 w-full justify-start">
          <button type="button">
            <FileText className="size-4" />
            Mäklarbild &amp; föreningsinfo
            <span className="ml-auto text-xs text-muted-foreground">v2</span>
          </button>
        </Button>
      </div>

      {steps.length > 0 && (
        <section className="px-4 pb-4">
          <h2 className="mb-2 text-base font-semibold">Nästa drag</h2>
          <div className="space-y-2.5">
            {steps.map((step) => (
              <NextStepCard key={step.id} step={step} />
            ))}
          </div>
        </section>
      )}

      <section className="px-4 pb-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Spekulanter</h2>
          <span className="text-xs text-muted-foreground">
            {speculanter.length} st
          </span>
        </div>
        <div className="space-y-2.5">
          {speculanter.map((p) => (
            <SpeculantListItem key={p.id} speculant={p} />
          ))}
          {speculanter.length === 0 && (
            <p className="text-sm text-muted-foreground">Inga spekulanter ännu.</p>
          )}
        </div>
      </section>

      <section className="px-4 pb-4">
        <h2 className="mb-3 text-base font-semibold">Tidslinje</h2>
        <Timeline events={events} />
      </section>

      <div className="px-4">
        <Button asChild className="w-full" size="lg">
          <Link to="/debrief" state={{ objektId: objekt.id }}>
            <Mic className="size-5" />
            Ny röstdebrief för detta objekt
          </Link>
        </Button>
      </div>
    </div>
  )
}
