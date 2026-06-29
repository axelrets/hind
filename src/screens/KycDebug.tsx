import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { buildSlots } from '@/lib/kyc/slots'
import type { Deal, PaymentType, BuyerType, PartyRole, ObjectType } from '@/lib/kyc/types'
import { cn } from '@/lib/utils'

function Toggle<T extends string>({
  value,
  set,
  opts,
}: {
  value: T
  set: (v: T) => void
  opts: [T, string][]
}) {
  return (
    <div className="inline-flex rounded-full border border-border bg-card p-0.5 text-xs">
      {opts.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => set(v)}
          className={cn(
            'rounded-full px-3 py-1.5 font-medium transition',
            value === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// Phase 0 demo surface: the motor's output for a deal, live as you change it.
export function KycDebug() {
  const [payment, setPayment] = useState<PaymentType>('cash')
  const [buyerType, setBuyerType] = useState<BuyerType>('individual')
  const [role, setRole] = useState<PartyRole>('buyer')
  const [objectType, setObjectType] = useState<ObjectType>('villa')

  const deal: Deal = { id: 'seed', objectType, paymentType: payment, buyerType, role }
  const slots = buildSlots(deal)
  const required = slots.filter((s) => s.evidenceRequired === 'required').length

  return (
    <div className="pb-12">
      <PageHeader title="KYC-rummet" subtitle="Phase 0 · buildSlots (motorn)" back />
      <div className="space-y-4 px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <Toggle value={role} set={setRole} opts={[['buyer', 'Köpare'], ['seller', 'Säljare']]} />
          <Toggle value={payment} set={setPayment} opts={[['cash', 'Kontant'], ['loan', 'Bolån']]} />
          <Toggle value={buyerType} set={setBuyerType} opts={[['individual', 'Privatperson'], ['company', 'Bolag']]} />
          <Toggle value={objectType} set={setObjectType} opts={[['villa', 'Villa'], ['bostadsratt', 'Bostadsrätt']]} />
        </div>

        <p className="text-sm text-muted-foreground">
          {slots.length} moment härledda · {required} kräver bevis
        </p>

        <ol className="space-y-2">
          {slots.map((s, i) => (
            <li key={s.key} className="rounded-xl border border-border bg-card p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {i + 1}. {s.key}
                </span>
                <Badge variant={s.evidenceRequired === 'required' ? 'warning' : 'muted'}>
                  {s.evidenceRequired === 'required'
                    ? 'Bevis krävs'
                    : s.inputKind === 'file'
                      ? 'Uppladdning'
                      : s.inputKind === 'choice'
                        ? 'Val'
                        : 'Fritext'}
                </Badge>
              </div>
              <p className="mt-1 text-sm font-medium leading-snug">{s.question}</p>
              <p className="text-xs text-muted-foreground">{s.whyItMatters}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
