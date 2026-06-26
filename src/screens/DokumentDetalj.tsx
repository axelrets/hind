import { useParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { dokumentMeta } from '@/lib/dokument'

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

        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          {renderContent(dok.innehall)}
        </article>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Detta är ett AI-genererat utkast. Granska och komplettera uppgifterna
          innan dokumentet signeras och journalförs.
        </p>
      </div>
    </div>
  )
}
