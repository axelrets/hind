import { useParams, Link } from 'react-router-dom'
import { Sparkles, Check, AlertCircle, ExternalLink } from 'lucide-react'
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

        <Button asChild size="lg" className="w-full">
          <Link to={`/r/${dok.id}`}>
            <ExternalLink className="size-5" />
            Öppna köparvy (hind.io)
          </Link>
        </Button>

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
