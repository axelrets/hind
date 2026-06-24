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
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type {
  ObjektStatus,
  Intresseniva,
  Finansiering,
  TimelineTyp,
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
