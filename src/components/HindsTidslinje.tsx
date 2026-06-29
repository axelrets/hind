import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, FileText, MessageSquare, CalendarClock, Send } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import { Timeline } from '@/components/Timeline'
import { saknadeKrav, dokumentPace } from '@/lib/dokument'
import { harledForslag, type Forslag } from '@/lib/forslag'

/** The object's living timeline: current status, executable next moves, and
 *  the captured history — all derived from the store. */
export function HindsTidslinje({ objektId }: { objektId: string }) {
  const navigate = useNavigate()
  // Select stable references; derive the per-object slices in the body so the
  // selectors never return a fresh array (which would loop useSyncExternalStore).
  const objekt = useStore((s) => s.objekt.find((o) => o.id === objektId))
  const allSpeculanter = useStore((s) => s.speculanter)
  const allDokument = useStore((s) => s.dokument)
  const allSteps = useStore((s) => s.nextSteps)
  const allTimeline = useStore((s) => s.timeline)
  const logHandelse = useStore((s) => s.logHandelse)

  const speculanter = allSpeculanter.filter((p) => p.objektId === objektId)
  const dokument = allDokument.filter((d) => d.objektId === objektId)
  const steps = allSteps.filter((n) => n.objektId === objektId && !n.klar)
  const events = allTimeline
    .filter((e) => e.objektId === objektId)
    .slice()
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))

  const [drafting, setDrafting] = useState<string | null>(null)
  const [draftText, setDraftText] = useState('')
  const [done, setDone] = useState<Set<string>>(new Set())

  const heta = speculanter.filter((s) => (s.kopvilja ?? 0) >= 70)
  const docFlags = dokument
    .map((d) => ({ d, saknas: saknadeKrav(d).length }))
    .filter((x) => x.saknas > 0)
  const sen = dokument.some((d) => dokumentPace(d).status === 'sen')

  const statusSummary = [
    `${speculanter.length} spekulanter`,
    heta.length ? `${heta.length} heta` : null,
    `${steps.length} öppna uppgifter`,
    docFlags.length
      ? `${docFlags.length} dokument att komplettera`
      : 'dokument kompletta',
  ]
    .filter(Boolean)
    .join(' · ')

  // Suggested next moves, derived from captured data, each executable.
  const drag = objekt ? harledForslag(objekt, speculanter, dokument) : []
  const synligaDrag = drag.filter((d) => !done.has(d.id))

  function exec(d: Forslag) {
    if (d.exec === 'intag' && d.dokId) {
      navigate(`/r/${d.dokId}`)
      return
    }
    setDrafting(d.id)
    setDraftText(d.draft ?? '')
  }

  function sendDraft(d: Forslag) {
    if (d.exec === 'boka') {
      logHandelse(objektId, {
        typ: 'samtal',
        titel: 'Besiktning – förfrågan skickad',
        beskrivning: draftText.trim(),
      })
    } else {
      const namn =
        speculanter.find((s) => s.id === d.speculantId)?.namn ?? 'köparen'
      logHandelse(objektId, {
        typ: 'sms',
        titel: `SMS till ${namn}`,
        beskrivning: draftText.trim(),
        speculantId: d.speculantId ?? null,
      })
    }
    setDone((prev) => new Set(prev).add(d.id))
    setDrafting(null)
  }

  return (
    <section className="px-4 pb-4">
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-base font-semibold">Hinds tidslinje</h2>
      </div>

      {/* Status — now */}
      <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Status
          </span>
          <Badge variant={sen ? 'warning' : 'muted'}>
            {sen ? 'Tar ovanligt lång tid' : 'Går som vanligt'}
          </Badge>
        </div>
        <p className="mt-1.5 text-sm text-foreground/80">{statusSummary}</p>
      </div>

      {/* Föreslagna drag — next, executable */}
      {synligaDrag.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="px-1 text-xs font-medium text-muted-foreground">
            Föreslagna drag
          </p>
          {synligaDrag.map((d) => (
            <div
              key={d.id}
              className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
            >
              <div className="flex items-center gap-2.5 p-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {d.exec === 'sms' ? (
                    <MessageSquare className="size-4" />
                  ) : d.exec === 'boka' ? (
                    <CalendarClock className="size-4" />
                  ) : (
                    <FileText className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight">
                    {d.text}
                  </p>
                  {d.hint && (
                    <p className="truncate text-xs text-muted-foreground">
                      {d.hint}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => exec(d)}
                  className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition active:scale-95"
                >
                  Utför
                </button>
              </div>
              {drafting === d.id && (
                <div className="border-t border-border bg-muted/30 p-2.5">
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Hinds utkast – granska och skicka
                  </p>
                  <textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-border bg-card p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => sendDraft(d)}
                      disabled={!draftText.trim()}
                      className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition active:scale-95 disabled:opacity-40"
                    >
                      <Send className="size-3.5" />
                      Skicka
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrafting(null)}
                      className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
                    >
                      Avbryt
                    </button>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      Du godkänner innan något skickas
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Historik — past, captured */}
      <div className="mt-4">
        <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">
          Historik
        </p>
        <Timeline events={events} />
      </div>
    </section>
  )
}
