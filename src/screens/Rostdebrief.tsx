import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Mic, Square, X, Check, Loader2, Sparkles, CircleCheck } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Review } from '@/components/DebriefReview'
import { transcribe, structure, type AiSource } from '@/lib/api'
import { persistDebrief } from '@/lib/persist'
import { supabaseEnabled } from '@/lib/supabase'
import type { StructuredDebrief } from '@/lib/types'
import { cn } from '@/lib/utils'

type Phase = 'idle' | 'recording' | 'processing' | 'review'

/**
 * One-shot voice debrief: record a monologue → Whisper → Claude → review → save.
 * Used directly, and as the graceful fallback inside the audio room (Rum) when
 * the OpenAI Realtime API isn't available (demo mode / no model access).
 */
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
    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
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
                {phase === 'recording' ? 'Lyssnar…' : 'Debriefa visningen'}
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
