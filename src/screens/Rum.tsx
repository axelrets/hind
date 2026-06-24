import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Sparkles, Mic, MicOff, Loader2, Check } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Review } from '@/components/DebriefReview'
import { Rostdebrief } from '@/screens/Rostdebrief'
import { createRealtimeSession, structure, type AiSource } from '@/lib/api'
import { persistDebrief } from '@/lib/persist'
import { supabaseEnabled } from '@/lib/supabase'
import { HindRealtime, type RoomState } from '@/lib/realtime'
import type {
  StructuredDebrief,
  Intresseniva,
  Finansiering,
  Prioritet,
} from '@/lib/types'
import { cn } from '@/lib/utils'

type Screen = 'intro' | 'connecting' | 'live' | 'review' | 'fallback'
type Mode = 'guided' | 'free'

/** Tool args (loose JSON from the model) → a safe StructuredDebrief. */
function coerce(r: Record<string, unknown>): StructuredDebrief {
  const ns = (r.nastaSteg ?? {}) as {
    beskrivning?: string
    deadline?: string | null
    prioritet?: Prioritet
  }
  return {
    namn: String(r.namn ?? 'Ny spekulant'),
    telefon: (r.telefon as string | null) ?? null,
    epost: (r.epost as string | null) ?? null,
    budgetMin: (r.budgetMin as number | null) ?? null,
    budgetMax: (r.budgetMax as number | null) ?? null,
    onskemal: Array.isArray(r.onskemal) ? (r.onskemal as string[]) : [],
    invandningar: Array.isArray(r.invandningar)
      ? (r.invandningar as string[])
      : [],
    intresseniva: (r.intresseniva as Intresseniva) ?? 'medel',
    finansiering: (r.finansiering as Finansiering) ?? 'oklart',
    sammanfattning: String(r.sammanfattning ?? ''),
    nastaSteg: {
      beskrivning: String(ns.beskrivning ?? ''),
      deadline: ns.deadline ?? null,
      prioritet: (ns.prioritet as Prioritet) ?? 'medel',
    },
  }
}

export function Rum() {
  const navigate = useNavigate()
  const objekt = useStore((s) => s.objekt)
  const commitDebrief = useStore((s) => s.commitDebrief)

  // Demo / no Supabase → go straight to the working one-shot debrief.
  const [screen, setScreen] = useState<Screen>(
    supabaseEnabled ? 'intro' : 'fallback',
  )
  const [objektId, setObjektId] = useState<string>(objekt[0]?.id ?? '')
  const [mode, setMode] = useState<Mode>('guided')
  const [roomState, setRoomState] = useState<RoomState>('connecting')
  const [caption, setCaption] = useState('')
  const [muted, setMuted] = useState(false)

  const [form, setForm] = useState<StructuredDebrief | null>(null)
  const [source, setSource] = useState<AiSource>('demo')
  const [transcript, setTranscript] = useState('')

  const rtRef = useRef<HindRealtime | null>(null)

  useEffect(() => {
    return () => rtRef.current?.stop()
  }, [])

  async function start(startMode: Mode) {
    setMode(startMode)
    setScreen('connecting')
    const session = await createRealtimeSession(
      objekt.map((o) => ({ id: o.id, adress: o.adress })),
      startMode,
    )
    if (!session) {
      setScreen('fallback')
      return
    }
    const rt = new HindRealtime({
      onState: setRoomState,
      onHindCaption: setCaption,
      onUserTranscript: setCaption,
      onError: (m) => console.warn('Realtime:', m),
    })
    rtRef.current = rt
    try {
      await rt.connect(session.token, session.model, startMode)
      setScreen('live')
    } catch (err) {
      console.warn('WebRTC connect misslyckades, faller tillbaka:', err)
      rt.stop()
      rtRef.current = null
      setScreen('fallback')
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    rtRef.current?.setMode(next)
  }

  function toggleMute() {
    const next = !muted
    setMuted(next)
    rtRef.current?.toggleMute(next)
  }

  async function end() {
    const rt = rtRef.current
    if (!rt) return
    setScreen('connecting')
    setRoomState('thinking')
    const { saved, transcript: tx } = await rt.finish()
    rt.stop()
    rtRef.current = null
    setTranscript(tx)

    let f: StructuredDebrief | null = null
    if (saved) {
      const { objektId: rawId, ...rest } = saved as Record<string, unknown>
      if (typeof rawId === 'string' && objekt.some((o) => o.id === rawId)) {
        setObjektId(rawId)
      }
      f = coerce(rest)
      setSource('live')
    } else if (tx) {
      const s = await structure(tx)
      f = s.data
      setSource(s.source)
    }
    if (!f) {
      setScreen('fallback')
      return
    }
    setForm(f)
    setScreen('review')
  }

  function handleSave() {
    if (!form || !objektId) return
    const committed = commitDebrief(objektId, form)
    void persistDebrief(objektId, form, transcript || '(röstsamtal)', committed)
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

  if (screen === 'fallback') return <Rostdebrief />

  // ── Review (light) ──
  if (screen === 'review' && form) {
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
          <p className="text-sm font-semibold">Granska debrief</p>
          <span className="w-9" />
        </header>
        <div className="no-scrollbar flex-1 overflow-y-auto">
          <Review
            form={form}
            setForm={setForm}
            transcript={transcript}
            source={source}
          />
        </div>
        <div className="border-t border-border p-4">
          <Button size="lg" className="w-full" onClick={handleSave}>
            <Check className="size-5" />
            Spara &amp; synka till Vitec
          </Button>
        </div>
      </div>
    )
  }

  // ── Immersive room (intro / connecting / live) ──
  const speaking = roomState === 'speaking'
  const listening = roomState === 'listening' && screen === 'live'
  const status =
    screen === 'connecting'
      ? roomState === 'thinking'
        ? 'Tänker…'
        : 'Kopplar upp…'
      : speaking
        ? 'Hind talar…'
        : 'Hind lyssnar…'

  return (
    <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-indigo-950 via-violet-950 to-slate-900 text-white">
      <header className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Stäng"
          className="flex size-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
        >
          <X className="size-5" />
        </button>
        <p className="text-sm font-semibold text-white/90">Ljudrum med Hind</p>
        {screen === 'live' ? (
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Slå på mikrofon' : 'Stäng av mikrofon'}
            className="flex size-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
          >
            {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>
        ) : (
          <span className="w-9" />
        )}
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        {/* Hind orb */}
        <div className="relative flex size-40 items-center justify-center">
          {(speaking || listening || screen === 'connecting') && (
            <>
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-white/15" />
              <span
                className="absolute inset-0 animate-pulse-ring rounded-full bg-white/10"
                style={{ animationDelay: '0.6s' }}
              />
            </>
          )}
          <div
            className={cn(
              'relative flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-emerald-300 shadow-2xl transition-transform',
              speaking && 'scale-105',
            )}
          >
            <Sparkles className="size-11 text-white" />
          </div>
        </div>

        {screen === 'connecting' && (
          <div className="mt-10 flex items-center gap-2 text-white/70">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">{status}</span>
          </div>
        )}

        {screen === 'live' && (
          <>
            <p className="mt-9 text-sm font-medium text-white/60">{status}</p>
            <p className="mt-3 min-h-[3.5rem] max-w-[300px] text-base leading-relaxed text-white/90">
              {caption || (mode === 'free' ? 'Prata på – jag lyssnar.' : '…')}
            </p>
          </>
        )}

        {screen === 'intro' && (
          <>
            <h1 className="mt-9 text-xl font-semibold">Kliv in i lugnet</h1>
            <p className="mt-2 max-w-[290px] text-sm text-white/70">
              Hind ställer några korta frågor om visningen – eller börja bara
              prata fritt. Allt blir en spekulantprofil på slutet.
            </p>

            <div className="no-scrollbar mt-7 flex w-full max-w-[320px] gap-2 overflow-x-auto">
              {objekt.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setObjektId(o.id)}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    objektId === o.id
                      ? 'border-white bg-white text-indigo-950'
                      : 'border-white/30 text-white/80',
                  )}
                >
                  {o.adress}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      {screen === 'intro' && (
        <div className="flex flex-col gap-2.5 p-5">
          <button
            type="button"
            onClick={() => start('guided')}
            className="flex items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-semibold text-indigo-950 shadow-lg transition active:scale-[0.98]"
          >
            <Sparkles className="size-4" />
            Prata med Hind
          </button>
          <button
            type="button"
            onClick={() => start('free')}
            className="flex items-center justify-center gap-2 rounded-full border border-white/30 py-3.5 text-sm font-semibold text-white transition active:scale-[0.98]"
          >
            <Mic className="size-4" />
            Börja prata fritt
          </button>
        </div>
      )}

      {screen === 'live' && (
        <div className="flex flex-col items-center gap-4 p-5">
          <div className="flex gap-1 rounded-full bg-white/10 p-1 text-xs">
            <button
              type="button"
              onClick={() => switchMode('guided')}
              className={cn(
                'rounded-full px-3 py-1.5 font-medium transition-colors',
                mode === 'guided' ? 'bg-white text-indigo-950' : 'text-white/70',
              )}
            >
              Guidad
            </button>
            <button
              type="button"
              onClick={() => switchMode('free')}
              className={cn(
                'rounded-full px-3 py-1.5 font-medium transition-colors',
                mode === 'free' ? 'bg-white text-indigo-950' : 'text-white/70',
              )}
            >
              Prata fritt
            </button>
          </div>
          <button
            type="button"
            onClick={() => void end()}
            className="w-full max-w-[320px] rounded-full bg-emerald-400 py-3.5 text-sm font-semibold text-emerald-950 shadow-lg transition active:scale-[0.98]"
          >
            Avsluta & sammanfatta
          </button>
        </div>
      )}
    </div>
  )
}
