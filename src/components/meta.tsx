import {
  Phone,
  Mail,
  MessageSquare,
  Users,
  StickyNote,
  Gavel,
  Mic,
  Wallet,
  Banknote,
  HelpCircle,
  Calendar,
  PenLine,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type {
  ObjektStatus,
  Intresseniva,
  Finansiering,
  Kopmognad,
  TimelineTyp,
  AgendaTyp,
  Prioritet,
} from '@/lib/types'
import { cn } from '@/lib/utils'

const statusMap: Record<
  ObjektStatus,
  { label: string; variant: 'muted' | 'default' | 'warning' | 'success' }
> = {
  kommande: { label: 'Kommande', variant: 'muted' },
  till_salu: { label: 'Till salu', variant: 'default' },
  budgivning: { label: 'Budgivning', variant: 'warning' },
  sald: { label: 'Såld', variant: 'success' },
}

export function StatusBadge({ status }: { status: ObjektStatus }) {
  const m = statusMap[status]
  return <Badge variant={m.variant}>{m.label}</Badge>
}

const intensityMap: Record<
  Intresseniva,
  'success' | 'warning' | 'muted'
> = {
  hög: 'success',
  medel: 'warning',
  låg: 'muted',
}

export function IntensityBadge({ niva }: { niva: Intresseniva }) {
  return <Badge variant={intensityMap[niva]}>Intresse: {niva}</Badge>
}

const kopmognadMap: Record<
  Kopmognad,
  { label: string; variant: 'success' | 'warning' | 'muted' }
> = {
  budredo: { label: 'Budredo', variant: 'success' },
  seriös: { label: 'Seriös köpare', variant: 'warning' },
  tidig: { label: 'Tidig i processen', variant: 'muted' },
  oklart: { label: 'Oklar mognad', variant: 'muted' },
}

export function KopmognadBadge({ v }: { v: Kopmognad }) {
  const m = kopmognadMap[v]
  return <Badge variant={m.variant}>{m.label}</Badge>
}

/** köpvilja (0–100) → ring/text colour. HET ≥ 70. */
export function kopviljaColor(score: number | null): string {
  if (score === null) return 'hsl(220 9% 64%)'
  if (score >= 70) return 'hsl(142 71% 38%)' // grön – HET
  if (score >= 40) return 'hsl(38 92% 50%)' // amber
  return 'hsl(220 9% 55%)' // grå
}

export const isHet = (score: number | null): boolean =>
  score !== null && score >= 70

export function HetBadge() {
  return (
    <Badge className="border-transparent bg-destructive/15 font-semibold text-destructive">
      HET
    </Badge>
  )
}

const finansieringMap: Record<
  Finansiering,
  { label: string; icon: LucideIcon }
> = {
  kontant: { label: 'Kontant', icon: Banknote },
  lånelöfte: { label: 'Lånelöfte', icon: Wallet },
  oklart: { label: 'Finansiering oklar', icon: HelpCircle },
}

export function FinansieringBadge({ v }: { v: Finansiering }) {
  const m = finansieringMap[v]
  const Icon = m.icon
  return (
    <Badge variant={v === 'oklart' ? 'muted' : 'outline'}>
      <Icon className="size-3" />
      {m.label}
    </Badge>
  )
}

const priorityColor: Record<Prioritet, string> = {
  hög: 'bg-destructive',
  medel: 'bg-warning',
  låg: 'bg-muted-foreground/40',
}

export function PriorityDot({ prioritet }: { prioritet: Prioritet }) {
  return (
    <span
      className={cn('inline-block size-2 rounded-full', priorityColor[prioritet])}
      aria-label={`Prioritet ${prioritet}`}
    />
  )
}

export const timelineMeta: Record<
  TimelineTyp,
  { icon: LucideIcon; hue: number; label: string }
> = {
  visning: { icon: Users, hue: 243, label: 'Visning' },
  samtal: { icon: Phone, hue: 152, label: 'Samtal' },
  mejl: { icon: Mail, hue: 205, label: 'Mejl' },
  sms: { icon: MessageSquare, hue: 270, label: 'SMS' },
  anteckning: { icon: StickyNote, hue: 38, label: 'Anteckning' },
  bud: { icon: Gavel, hue: 0, label: 'Bud' },
  rostdebrief: { icon: Mic, hue: 243, label: 'Röstdebrief' },
}

export const agendaMeta: Record<
  AgendaTyp,
  { icon: LucideIcon; hue: number; label: string }
> = {
  visning: { icon: Users, hue: 243, label: 'Visning' },
  samtal: { icon: Phone, hue: 152, label: 'Samtal' },
  mote: { icon: Calendar, hue: 205, label: 'Möte' },
  budgivning: { icon: Gavel, hue: 0, label: 'Budgivning' },
  uppfoljning: { icon: Mail, hue: 38, label: 'Uppföljning' },
  kontrakt: { icon: PenLine, hue: 270, label: 'Kontrakt' },
}
