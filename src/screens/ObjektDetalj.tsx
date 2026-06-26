import { useParams, useNavigate, Link } from 'react-router-dom'
import { Mic, FileText, ChevronRight, Sparkles } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/PageHeader'
import { ObjektThumb } from '@/components/ObjektThumb'
import { StatusBadge } from '@/components/meta'
import { NextStepCard } from '@/components/NextStepCard'
import { SpeculantListItem } from '@/components/SpeculantListItem'
import { HindsTidslinje } from '@/components/HindsTidslinje'
import { Button } from '@/components/ui/button'
import { dokumentMeta } from '@/lib/dokument'
import type { DokumentTyp } from '@/lib/types'
import { formatSEK } from '@/lib/utils'
import { prioRank } from '@/lib/sort'

const DOK_TYPER: DokumentTyp[] = ['kundkannedom', 'maklarjournal']

export function ObjektDetalj() {
  const { id } = useParams()
  const navigate = useNavigate()
  const objekt = useStore((s) => s.objekt.find((o) => o.id === id))
  const allSpeculanter = useStore((s) => s.speculanter)
  const allDokument = useStore((s) => s.dokument)
  const allSteps = useStore((s) => s.nextSteps)
  const draftDokument = useStore((s) => s.draftDokument)

  const speculanter = allSpeculanter.filter((p) => p.objektId === id)
  const dokument = allDokument.filter((d) => d.objektId === id)
  const steps = allSteps
    .filter((n) => n.objektId === id && !n.klar)
    .slice()
    .sort((a, b) => prioRank(b.prioritet) - prioRank(a.prioritet))

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

      <HindsTidslinje objektId={objekt.id} />

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
        <h2 className="mb-2 text-base font-semibold">Dokument</h2>
        <div className="space-y-2.5">
          {DOK_TYPER.map((typ) => {
            const existing = dokument.find((d) => d.typ === typ)
            const m = dokumentMeta[typ]
            const Icon = m.icon
            if (existing) {
              return (
                <Link
                  key={typ}
                  to={`/dokument/${existing.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm transition active:scale-[0.99]"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium leading-tight">
                      {m.titel}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      AI-utkast · {m.beskrivning}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />
                </Link>
              )
            }
            return (
              <button
                key={typ}
                type="button"
                onClick={() => navigate(`/dokument/${draftDokument(id!, typ).id}`)}
                className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border bg-card/50 p-3 text-left transition active:scale-[0.99]"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium leading-tight">
                    {m.titel}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {m.beskrivning}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                  <Sparkles className="size-3.5" />
                  Skapa utkast
                </span>
              </button>
            )
          })}
        </div>
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
