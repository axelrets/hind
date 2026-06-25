import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X, Sparkles, Mic, MicOff, Loader2, Check, ChevronRight } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Review } from '@/components/DebriefReview'
import { KopviljaRing } from '@/components/KopviljaRing'
import { isHet, HetBadge } from '@/components/meta'
import { Rostdebrief } from '@/screens/Rostdebrief'
import { createRealtimeSession, structure, type AiSource } from '@/lib/api'
import { persistDebrief } from '@/lib/persist'
import { supabaseEnabled } from '@/lib/supabase'
import { HindRealtime, type RoomState } from '@/lib/realtime'
import type {
  StructuredDebrief,
  Intresseniva,
  Finansiering,
  Kopmognad,
  Prioritet,
} from '@/lib/types'
import { cn } from '@/lib/utils'

type Screen = 'intro' | 'connecting' | 'live' | 'review' | 'recap' | 'fallback'
type Mode = 'guided' | 'free'

interface Captured {
  id: string
  namn: string
  kopvilja: number | null
}

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
    kopvilja:
      typeof r.kopvilja === 'number'
        ? Math.max(0, Math.min(100, r.kopvilja as number))
        : 0,
    kopmognad: (r.kopmognad as Kopmognad) ?? 'oklart',
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
  const setSynced = useStore((s) => s.setSynced)

  // Demo / no Supabase → go straight to the working one-shot debrief.
  const [screen, setScreen] = useState<Screen>(
    supabaseEnabled ? 'intro' : 'fallback',
  )
  const [objektId, setObjektId] = useState<string>(objekt[0]?.id ?? '')
  const [mode, setMode] = useState<Mode>('guided')
  const [roomState, setRoomState] = useState<RoomState>('connecting')
  const [caption, setCaption] = useState('')
  const [muted, setMuted] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  const [form, setForm] = useState<StructuredDebrief | null>(null)
  const [source, setSource] = useState<AiSource>('demo')
  const [transcript, setTranscript] = useState('')
  const [recap, setRecap] = useState<Captured[]>([])

  const rtRef = useRef<HindRealtime | null>(null)
  // Spekulanter committed live as Hind saves each one (avoids stale state).
  const committedRef = useRef<Captured[]>([])
  const objektIdRef = useRef(objektId)
  objektIdRef.current = objektId

  useEffect(() => {
    return () => rtRef.current?.stop()
  }, [])

  // Commit one spekulant the moment Hind saves it (auto-fill + Vitec sync).
  function commitSaved(args: Record<string, unknown>) {
    const { objektId: rawId, ...rest } = args
    const oid =
      typeof rawId === 'string' && objekt.some((o) => o.id === rawId)
        ? rawId
        : objektIdRef.current
    const structured = coerce(rest)
    const committed = commitDebrief(oid, structured)
    void persistDebrief(oid, structured, '(röstsamtal)', committed)
    setSynced(committed.event.id)
    committedRef.current = [
      ...committedRef.current,
      {
        id: committed.speculant.id,
        namn: structured.namn,
        kopvilja: structured.kopvilja,
      },
    ]
    setSavedCount(committedRef.current.length)
  }

  async function start(startMode: Mode) {
    setMode(startMode)
    setScreen('connecting')
    committedRef.current = []
    setSavedCount(0)
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
      onSaved: commitSaved,
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
    const { transcript: tx } = await rt.finish()
    rt.stop()
    rtRef.current = null
    setTranscript(tx)

    // Hind saved one or more spekulanter during the call → recap them.
    if (committedRef.current.length > 0) {
      setRecap(committedRef.current)
      setScreen('recap')
      return
    }
    // Nothing captured via tool calls → structure the transcript as a single
    // spekulant for review, or fall back to the one-shot recorder.
    if (tx) {
      const s = await structure(tx)
      setForm(s.data)
      setSource(s.source)
      setScreen('review')
      return
    }
    setScreen('fallback')
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

  // ── Recap of everyone Hind captured ──
  if (screen === 'recap') {
    return (
      <div className="flex h-full min-h-0 flex-col bg-background">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="w-9" />
          <p className="text-sm font-semibold">Debrief klar</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Stäng"
            className="flex size-9 items-center justify-center rounded-full hover:bg-accent"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-5">
          <div className="flex flex-col items-center text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="size-6" />
            </span>
            <h1 className="mt-3 text-lg font-semibold">
              {recap.length} spekulant{recap.length === 1 ? '' : 'er'} sparade
            </h1>
            <p className="mt-1 max-w-[280px] text-sm text-muted-foreground">
              Allt är strukturerat och synkat till Vitec. Tryck för att öppna en
              profil.
            </p>
          </div>
          <div className="mt-5 space-y-2">
            {recap.map((c) => (
              <Link
                key={c.id}
                to={`/spekulanter/${c.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm transition active:scale-[0.99]"
              >
                <KopviljaRing score={c.kopvilja} size={40} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {c.namn}
                </span>
                {isHet(c.kopvilja) && <HetBadge />}
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />
              </Link>
            ))}
          </div>
        </div>
        <div className="border-t border-border p-4">
          <Button
            size="lg"
            className="w-full"
            onClick={() => navigate('/spekulanter')}
          >
            Till spekulanter
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
            {savedCount > 0 && (
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                <Check className="size-3.5" />
                {savedCount} spekulant{savedCount === 1 ? '' : 'er'} sparade
              </p>
            )}
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
