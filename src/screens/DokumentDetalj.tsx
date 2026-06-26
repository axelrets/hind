import { useParams, Link } from 'react-router-dom'
import { Sparkles, Check, AlertCircle, Send } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  dokumentMeta,
  dokumentProgress,
  saknadeKrav,
  dokumentPace,
  kallaMeta,
  klassificera,
  betalningLabel,
} from '@/lib/dokument'
import { cn } from '@/lib/utils'

function renderContent(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) {
      return (
        <h3
          key={i}
          className="mt-4 text-sm font-semibold text-foreground first:mt-0"
        >
          {line.slice(3)}
        </h3>
      )
    }
    if (line.startsWith('- ')) {
      return (
        <p key={i} className="ml-1 text-sm leading-relaxed text-muted-foreground">
          • {line.slice(2)}
        </p>
      )
    }
    if (line.trim() === '') return <div key={i} className="h-1.5" />
    return (
      <p key={i} className="text-sm leading-relaxed text-foreground/90">
        {line}
      </p>
    )
  })
}

export function DokumentDetalj() {
  const { id } = useParams()
  const dok = useStore((s) => s.dokument.find((d) => d.id === id))
  const objekt = useStore((s) =>
    s.objekt.find((o) => o.id === dok?.objektId),
  )
  const allSpeculanter = useStore((s) => s.speculanter)
  const speculanter = allSpeculanter.filter(
    (p) => p.objektId === dok?.objektId,
  )

  if (!dok) {
    return (
      <div>
        <PageHeader title="Dokument" back />
        <p className="p-6 text-sm text-muted-foreground">
          Dokumentet hittades inte.
        </p>
      </div>
    )
  }

  const m = dokumentMeta[dok.typ]
  const progress = dokumentProgress(dok)
  const saknas = saknadeKrav(dok)
  const pace = dokumentPace(dok)
  const klass = objekt ? klassificera(objekt, speculanter) : null
  // Moments the buyer can satisfy via the BankID intake (everything but the
  // realtor's own paperwork).
  const koparSaknas = saknas.filter((k) => k.id !== 'j_avtal')
  const harKalla = saknas.some(
    (k) => k.id === 'k_kallkontroll' || k.id === 'k_bevis',
  )

  return (
    <div className="pb-10">
      <PageHeader title={m.titel} subtitle={objekt?.adress} back />

      <div className="space-y-4 px-4 py-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="border-transparent bg-primary/10 text-primary">
            <Sparkles className="size-3" />
            AI-utkast från Hind
          </Badge>
          <Badge variant={dok.status === 'klar' ? 'success' : 'muted'}>
            {dok.status === 'klar' ? 'Klar' : 'Utkast'}
          </Badge>
        </div>

        {/* Motor step 1: how Hind classified the deal → derived moments */}
        {klass && (
          <div className="rounded-2xl border border-border bg-muted/40 p-3.5">
            <p className="text-xs font-medium text-muted-foreground">
              Hind klassade affären
            </p>
            <p className="mt-0.5 text-sm font-medium">
              {klass.objektTyp} · {betalningLabel[klass.betalning]} ·{' '}
              {klass.koparTyp}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              → {dok.krav.length} moment krävs för detta dokument
              {klass.betalning === 'kontant' &&
                ' · källkontroll krävs (kontantköp)'}
            </p>
          </div>
        )}

        {/* Realtor dashboard: completion, pace, missing flags */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">Färdigställande</span>
            <span className="text-sm font-semibold tabular-nums">
              {progress}
              <span className="text-muted-foreground"> / 100</span>
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant={pace.ton}>{pace.label}</Badge>
            <span className="text-xs text-muted-foreground">
              {saknas.length === 0
                ? 'Allt inkommet'
                : `${saknas.length} punkter saknas`}
            </span>
          </div>
        </div>

        {/* Motor: action recommendation — offer to execute */}
        {koparSaknas.length > 0 ? (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Sparkles className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Hinds åtgärdsförslag</h2>
            </div>
            <p className="text-sm text-foreground/80">
              {harKalla
                ? `Källkontroll och ${koparSaknas.length - 1} andra moment saknas. Låt Hind samla in dem direkt från köparen via BankID-intag.`
                : `${koparSaknas.length} moment saknas. Låt Hind samla in dem direkt från köparen via BankID-intag.`}
            </p>
            <Button asChild size="lg" className="mt-3 w-full">
              <Link to={`/r/${dok.id}`}>
                <Send className="size-5" />
                Skicka BankID-intag till köparen
              </Link>
            </Button>
          </div>
        ) : (
          <Button asChild size="lg" variant="outline" className="w-full">
            <Link to={`/r/${dok.id}`}>
              <Send className="size-5" />
              Öppna köparvy (hind.io)
            </Link>
          </Button>
        )}

        {/* Form visualization — each field with its value + source or flag */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Formulär</h2>
          <ul className="space-y-2.5">
            {dok.krav.map((k) => {
              const klar = k.status === 'klar'
              return (
                <li key={k.id} className="flex items-start gap-3">
                  <span
                    className={cn(
                      'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
                      klar
                        ? 'bg-success/15 text-success'
                        : 'bg-destructive/15 text-destructive',
                    )}
                  >
                    {klar ? (
                      <Check className="size-3.5" />
                    ) : (
                      <AlertCircle className="size-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">
                      {k.fraga}
                    </p>
                    <p
                      className={cn(
                        'truncate text-xs',
                        klar ? 'text-muted-foreground' : 'text-destructive',
                      )}
                    >
                      {klar ? (k.varde ?? 'Ifyllt') : 'Saknas'}
                    </p>
                  </div>
                  {klar && k.kalla && (
                    <Badge variant="muted" className="shrink-0">
                      {kallaMeta[k.kalla]}
                    </Badge>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        {/* The generated document draft */}
        <div>
          <h2 className="mb-2 text-sm font-semibold">Genererat utkast</h2>
          <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            {renderContent(dok.innehall)}
          </article>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Detta är ett AI-genererat utkast. Granska och komplettera uppgifterna
          innan dokumentet signeras och journalförs.
        </p>
      </div>
    </div>
  )
}
