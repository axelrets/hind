import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Mic,
  Square,
  X,
  Check,
  Loader2,
  Sparkles,
  CircleCheck,
  Pencil,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  transcribe,
  structure,
  type AiSource,
} from '@/lib/api'
import { persistDebrief } from '@/lib/persist'
import { supabaseEnabled } from '@/lib/supabase'
import type {
  StructuredDebrief,
  Intresseniva,
  Finansiering,
  Prioritet,
} from '@/lib/types'
import { cn } from '@/lib/utils'

type Phase = 'idle' | 'recording' | 'processing' | 'review'

function Seg<T extends string>({
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

export function Rostdebrief() {
  const navigate = useNavigate()
  const location = useLocation()
  const objekt = useStore((s) => s.objekt)
  const commitDebrief = useStore((s) => s.commitDebrief)

  const stateObjektId = (location.state as { objektId?: string } | null)
    ?.objektId
  const [objektId, setObjektId] = useState<string>(
    stateObjektId ?? objekt[0]?.id ?? '',
  )

  const [phase, setPhase] = useState<Phase>('idle')
  const [seconds, setSeconds] = useState(0)
  const [step, setStep] = useState<'transcribe' | 'structure'>('transcribe')
  const [transcript, setTranscript] = useState('')
  const [source, setSource] = useState<AiSource>('demo')
  const [form, setForm] = useState<StructuredDebrief | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [])

  function startTimer() {
    setSeconds(0)
    timerRef.current = window.setInterval(
      () => setSeconds((s) => s + 1),
      1000,
    )
  }
  function stopTimer() {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
  }

  async function process(blob: Blob) {
    setPhase('processing')
    setStep('transcribe')
    const t = await transcribe(blob)
    setTranscript(t.transcript)
    setStep('structure')
    const s = await structure(t.transcript)
    setForm(s.data)
    setSource(s.source === 'live' && t.source === 'live' ? 'live' : s.source)
    setPhase('review')
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop())
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || 'audio/webm',
        })
        void process(blob)
      }
      mr.start()
      recorderRef.current = mr
      setPhase('recording')
      startTimer()
    } catch {
      // No mic / permission denied → proceed with demo fallback.
      void process(new Blob())
    }
  }

  function stopRecording() {
    stopTimer()
    const mr = recorderRef.current
    if (mr && mr.state !== 'inactive') {
      mr.stop()
    } else {
      void process(new Blob())
    }
  }

  function handleSave() {
    if (!form || !objektId) return
    const committed = commitDebrief(objektId, form)
    void persistDebrief(objektId, form, transcript, committed)
    navigate('/synka', {
      state: {
        objektId,
        speculantId: committed.speculant.id,
        timelineId: committed.event.id,
        namn: form.namn,
        nastaSteg: form.nastaSteg.beskrivning,
        source,
      },
    })
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Stäng"
          className="flex size-9 items-center justify-center rounded-full hover:bg-accent"
        >
          <X className="size-5" />
        </button>
        <p className="text-sm font-semibold">Röstdebrief</p>
        <span className="flex w-9 justify-end">
          <Badge variant={supabaseEnabled ? 'success' : 'muted'}>
            {supabaseEnabled ? 'Live' : 'Demo'}
          </Badge>
        </span>
      </header>

      {/* Object selector */}
      <div className="border-b border-border px-4 py-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Objekt</p>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {objekt.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setObjektId(o.id)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                objektId === o.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-foreground',
              )}
            >
              {o.adress}
            </button>
          ))}
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto">
        {(phase === 'idle' || phase === 'recording') && (
          <div className="flex h-full flex-col items-center justify-center gap-8 px-6 py-10">
            <div className="text-center">
              <p className="text-lg font-semibold">
                {phase === 'recording'
                  ? 'Lyssnar…'
                  : 'Debriefa visningen'}
              </p>
              <p className="mt-1 max-w-[260px] text-sm text-muted-foreground">
                {phase === 'recording'
                  ? 'Prata fritt om spekulanten – appen strukturerar det åt dig.'
                  : 'Tryck och berätta om mötet med spekulanten på vanlig svenska.'}
              </p>
            </div>

            {phase === 'recording' ? (
              <div className="flex flex-col items-center gap-6">
                <div className="flex h-16 items-center gap-[3px]">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-[3px] animate-pulse rounded-full bg-primary"
                      style={{
                        height: `${20 + Math.abs(Math.sin(i * 0.9)) * 70}%`,
                        animationDelay: `${i * 55}ms`,
                      }}
                    />
                  ))}
                </div>
                <p className="tnum text-2xl font-semibold">
                  {mm}:{ss}
                </p>
                <button
                  type="button"
                  onClick={stopRecording}
                  aria-label="Stoppa inspelning"
                  className="flex size-20 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30 transition active:scale-95"
                >
                  <Square className="size-7 fill-current" />
                </button>
                <p className="text-xs text-muted-foreground">
                  Tryck för att avsluta
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5">
                <div className="relative">
                  <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/30" />
                  <button
                    type="button"
                    onClick={startRecording}
                    aria-label="Starta inspelning"
                    className="relative flex size-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 transition active:scale-95"
                  >
                    <Mic className="size-9" />
                  </button>
                </div>
                {!supabaseEnabled && (
                  <p className="max-w-[260px] text-center text-xs text-muted-foreground">
                    Demoläge: en exempel-debrief spelas upp så du ser hela
                    flödet utan API-nycklar.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {phase === 'processing' && (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-8">
            <Sparkles className="size-9 text-primary" />
            <div className="w-full max-w-[280px] space-y-3">
              <ProcRow
                label="Transkriberar tal"
                done={step === 'structure'}
                active={step === 'transcribe'}
              />
              <ProcRow
                label="Strukturerar med AI"
                done={false}
                active={step === 'structure'}
              />
            </div>
            {transcript && (
              <p className="line-clamp-3 max-w-[300px] text-center text-xs italic text-muted-foreground">
                “{transcript}”
              </p>
            )}
          </div>
        )}

        {phase === 'review' && form && (
          <Review
            form={form}
            setForm={setForm}
            transcript={transcript}
            source={source}
          />
        )}
      </div>

      {phase === 'review' && form && (
        <div className="border-t border-border p-4">
          <Button size="lg" className="w-full" onClick={handleSave}>
            <Check className="size-5" />
            Spara &amp; synka till Vitec
          </Button>
        </div>
      )}
    </div>
  )
}

function ProcRow({
  label,
  done,
  active,
}: {
  label: string
  done: boolean
  active: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      {done ? (
        <CircleCheck className="size-5 text-success" />
      ) : active ? (
        <Loader2 className="size-5 animate-spin text-primary" />
      ) : (
        <span className="size-5 rounded-full border-2 border-muted-foreground/30" />
      )}
      <span
        className={cn(
          'text-sm',
          done || active ? 'font-medium text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
    </div>
  )
}

function Review({
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
          ? 'Strukturerat av Whisper + Claude. Granska och justera.'
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

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none">
          Visa transkribering
        </summary>
        <p className="mt-2 leading-relaxed">{transcript}</p>
      </details>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
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
