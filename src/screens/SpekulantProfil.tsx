import { useParams, Link } from 'react-router-dom'
import { Phone, Mail, MessageSquare, ChevronRight, Check, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/PageHeader'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  IntensityBadge,
  FinansieringBadge,
  KopmognadBadge,
  HetBadge,
  isHet,
} from '@/components/meta'
import { KopviljaRing } from '@/components/KopviljaRing'
import { NextStepCard } from '@/components/NextStepCard'
import { Timeline } from '@/components/Timeline'
import { ObjektThumb } from '@/components/ObjektThumb'
import { formatMkr, hueFromString, initials } from '@/lib/utils'

function budgetText(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `${formatMkr(min)} – ${formatMkr(max)}`
  if (max !== null) return `Upp till ${formatMkr(max)}`
  if (min !== null) return `Från ${formatMkr(min)}`
  return 'Ej angiven'
}

function ContactBtn({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: typeof Phone
  label: string
}) {
  return (
    <a
      href={href}
      className="flex flex-1 flex-col items-center gap-1 rounded-lg border border-border bg-card py-2.5 text-xs font-medium text-foreground shadow-sm transition active:scale-95"
    >
      <Icon className="size-5 text-primary" />
      {label}
    </a>
  )
}

export function SpekulantProfil() {
  const { id } = useParams()
  const speculant = useStore((s) => s.speculanter.find((p) => p.id === id))
  const objekt = useStore((s) =>
    s.objekt.find((o) => o.id === speculant?.objektId),
  )
  const allTimeline = useStore((s) => s.timeline)
  const allSteps = useStore((s) => s.nextSteps)
  const events = allTimeline
    .filter((e) => e.speculantId === id)
    .slice()
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  const steps = allSteps.filter((n) => n.speculantId === id && !n.klar)

  if (!speculant) {
    return (
      <div>
        <PageHeader title="Spekulant" back />
        <p className="p-6 text-sm text-muted-foreground">
          Spekulanten hittades inte.
        </p>
      </div>
    )
  }

  return (
    <div className="pb-6">
      <PageHeader
        title={speculant.namn}
        subtitle={objekt ? objekt.adress : undefined}
        back
      />

      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar
            hue={hueFromString(speculant.namn)}
            className="size-14 text-base"
          >
            {initials(speculant.namn)}
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {isHet(speculant.kopvilja) && <HetBadge />}
            <KopmognadBadge v={speculant.kopmognad} />
            <IntensityBadge niva={speculant.intresseniva} />
            <FinansieringBadge v={speculant.finansiering} />
          </div>
          <div className="shrink-0 text-center">
            <KopviljaRing score={speculant.kopvilja} size={52} />
            <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
              köpvilja
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {speculant.telefon && (
            <ContactBtn
              href={`tel:${speculant.telefon.replace(/\s/g, '')}`}
              icon={Phone}
              label="Ring"
            />
          )}
          {speculant.telefon && (
            <ContactBtn
              href={`sms:${speculant.telefon.replace(/\s/g, '')}`}
              icon={MessageSquare}
              label="SMS"
            />
          )}
          {speculant.epost && (
            <ContactBtn
              href={`mailto:${speculant.epost}`}
              icon={Mail}
              label="Mejl"
            />
          )}
        </div>
      </div>

      <div className="space-y-4 px-4">
        {speculant.sammanfattning && (
          <p className="rounded-lg bg-muted/60 p-3 text-sm leading-relaxed text-foreground">
            {speculant.sammanfattning}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Budget</p>
            <p className="font-medium">
              {budgetText(speculant.budgetMin, speculant.budgetMax)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Telefon</p>
            <p className="font-medium">{speculant.telefon ?? '–'}</p>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Önskemål
          </p>
          <div className="flex flex-wrap gap-1.5">
            {speculant.onskemal.length > 0 ? (
              speculant.onskemal.map((o) => (
                <Badge key={o} variant="success">
                  <Check className="size-3" />
                  {o}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">–</span>
            )}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Invändningar
          </p>
          <div className="flex flex-wrap gap-1.5">
            {speculant.invandningar.length > 0 ? (
              speculant.invandningar.map((o) => (
                <Badge key={o} variant="warning">
                  <X className="size-3" />
                  {o}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Inga noterade</span>
            )}
          </div>
        </div>
      </div>

      {objekt && (
        <div className="px-4 pt-4">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Kopplat objekt
          </p>
          <Link
            to={`/objekt/${objekt.id}`}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
          >
            <ObjektThumb hue={objekt.hue} className="size-12" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{objekt.adress}</p>
              <p className="truncate text-[13px] text-muted-foreground">
                {objekt.omrade}
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground/40" />
          </Link>
        </div>
      )}

      {steps.length > 0 && (
        <div className="px-4 pt-4">
          <p className="mb-2 text-sm font-semibold">Nästa drag</p>
          <div className="space-y-2.5">
            {steps.map((step) => (
              <NextStepCard key={step.id} step={step} />
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pt-4">
        <Separator className="mb-4" />
        <p className="mb-3 text-sm font-semibold">Aktivitet</p>
        <Timeline events={events} />
      </div>
    </div>
  )
}
