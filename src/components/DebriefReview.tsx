import type { ReactNode } from 'react'
import { X, Sparkles, Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import type { AiSource } from '@/lib/api'
import type {
  StructuredDebrief,
  Intresseniva,
  Finansiering,
  Prioritet,
} from '@/lib/types'
import { cn } from '@/lib/utils'

/** Segmented control for the small enum fields. */
export function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-colors',
            value === o.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

function Chips({
  label,
  items,
  variant,
  onRemove,
}: {
  label: string
  items: string[]
  variant: 'success' | 'warning'
  onRemove: (i: number) => void
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.length === 0 && (
          <span className="text-sm text-muted-foreground">–</span>
        )}
        {items.map((it, i) => (
          <Badge key={`${it}-${i}`} variant={variant}>
            {it}
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label={`Ta bort ${it}`}
              className="ml-0.5"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  )
}

/** Editable structured-debrief card. Shared by the one-shot flow and the room. */
export function Review({
  form,
  setForm,
  transcript,
  source,
}: {
  form: StructuredDebrief
  setForm: (f: StructuredDebrief) => void
  transcript: string
  source: AiSource
}) {
  const set = <K extends keyof StructuredDebrief>(
    key: K,
    value: StructuredDebrief[K],
  ) => setForm({ ...form, [key]: value })

  return (
    <div className="space-y-5 px-4 py-4">
      <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">
        <Sparkles className="size-4" />
        {source === 'live'
          ? 'Strukturerat av Hind. Granska och justera.'
          : 'Exempelresultat (demoläge). Granska och justera.'}
      </div>

      <Field label="Namn">
        <Input value={form.namn} onChange={(e) => set('namn', e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Telefon">
          <Input
            value={form.telefon ?? ''}
            onChange={(e) => set('telefon', e.target.value || null)}
          />
        </Field>
        <Field label="Budget (max)">
          <Input
            inputMode="numeric"
            value={form.budgetMax ?? ''}
            onChange={(e) =>
              set(
                'budgetMax',
                e.target.value ? Number(e.target.value.replace(/\D/g, '')) : null,
              )
            }
          />
        </Field>
      </div>

      <Field label="Intressenivå">
        <Seg<Intresseniva>
          value={form.intresseniva}
          onChange={(v) => set('intresseniva', v)}
          options={[
            { value: 'hög', label: 'Hög' },
            { value: 'medel', label: 'Medel' },
            { value: 'låg', label: 'Låg' },
          ]}
        />
      </Field>

      <Field label="Finansiering">
        <Seg<Finansiering>
          value={form.finansiering}
          onChange={(v) => set('finansiering', v)}
          options={[
            { value: 'lånelöfte', label: 'Lånelöfte' },
            { value: 'kontant', label: 'Kontant' },
            { value: 'oklart', label: 'Oklart' },
          ]}
        />
      </Field>

      <Chips
        label="Önskemål"
        items={form.onskemal}
        variant="success"
        onRemove={(i) =>
          set('onskemal', form.onskemal.filter((_, idx) => idx !== i))
        }
      />
      <Chips
        label="Invändningar"
        items={form.invandningar}
        variant="warning"
        onRemove={(i) =>
          set('invandningar', form.invandningar.filter((_, idx) => idx !== i))
        }
      />

      <Field label="Sammanfattning">
        <Textarea
          value={form.sammanfattning}
          onChange={(e) => set('sammanfattning', e.target.value)}
        />
      </Field>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Pencil className="size-3.5" />
          Föreslaget nästa drag
        </p>
        <Input
          value={form.nastaSteg.beskrivning}
          onChange={(e) =>
            set('nastaSteg', {
              ...form.nastaSteg,
              beskrivning: e.target.value,
            })
          }
        />
        <div className="mt-2">
          <Seg<Prioritet>
            value={form.nastaSteg.prioritet}
            onChange={(v) =>
              set('nastaSteg', { ...form.nastaSteg, prioritet: v })
            }
            options={[
              { value: 'hög', label: 'Hög' },
              { value: 'medel', label: 'Medel' },
              { value: 'låg', label: 'Låg' },
            ]}
          />
        </div>
      </div>

      {transcript && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">
            Visa transkribering
          </summary>
          <p className="mt-2 leading-relaxed">{transcript}</p>
        </details>
      )}
    </div>
  )
}
