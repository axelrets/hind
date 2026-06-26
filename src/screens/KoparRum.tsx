import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Sparkles,
  ShieldCheck,
  Send,
  Upload,
  CircleCheck,
  Circle,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { dokumentMeta, dokumentProgress } from '@/lib/dokument'
import { cn } from '@/lib/utils'

// Source-of-funds moments — Hind chases a vague first answer for detail.
const SOF = new Set(['k_kontantinsats', 'k_kallkontroll', 'k_ursprung'])

export function KoparRum() {
  const { id } = useParams()
  const dok = useStore((s) => s.dokument.find((d) => d.id === id))
  const objekt = useStore((s) => s.objekt.find((o) => o.id === dok?.objektId))
  const answerKrav = useStore((s) => s.answerKrav)
  const [text, setText] = useState('')
  const [pending, setPending] = useState<{ kravId: string; first: string } | null>(
    null,
  )

  if (!dok) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background px-8 text-center">
        <ShieldCheck className="size-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          Länken är inte längre giltig. Be din mäklare om en ny.
        </p>
      </div>
    )
  }

  const m = dokumentMeta[dok.typ]
  const total = dok.krav.length
  const klara = dok.krav.filter((k) => k.status === 'klar').length
  const progress = dokumentProgress(dok)
  // The next requirement Hind needs the buyer to handle.
  const current = dok.krav.find((k) => k.status !== 'klar')
  const chasing = !!current && pending?.kravId === current.id

  function submitText() {
    if (!current || !text.trim()) return
    const ans = text.trim()
    // For source-of-funds, a vague first answer triggers a follow-up before
    // Hind accepts it — the realtor never has to chase the buyer.
    if (SOF.has(current.id)) {
      if (pending?.kravId === current.id) {
        answerKrav(dok!.id, current.id, `${pending.first} — ${ans}`)
        setPending(null)
        setText('')
        return
      }
      if (ans.length < 30) {
        setPending({ kravId: current.id, first: ans })
        setText('')
        return
      }
    }
    answerKrav(dok!.id, current.id, ans)
    setText('')
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-indigo-50 to-background">
      {/* hind.io header */}
      <header className="shrink-0 border-b border-border/60 bg-white/70 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
            <Sparkles className="size-4" />
          </span>
          <span className="text-[15px] font-semibold">
            hind<span className="text-indigo-600">.io</span>
          </span>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-medium text-success">
            <ShieldCheck className="size-3" />
            Tryggt &amp; säkert
          </span>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {m.titel} · {objekt?.adress}
        </p>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span>
              {klara} av {total} klart
            </span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {current ? (
          <>
            {/* Hind prompts for the next missing item */}
            <div className="flex gap-2.5">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                <Sparkles className="size-4" />
              </span>
              <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-3.5 py-2.5 shadow-sm">
                <p className="text-sm font-medium leading-snug">
                  {chasing
                    ? `Tack – du skrev ”${pending!.first}”. Kan du specificera lite mer? Vilken bank eller källa, och över vilken period?`
                    : current.fraga}
                </p>
                {!chasing && current.beskrivning && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {current.beskrivning}
                  </p>
                )}
              </div>
            </div>

            {/* Answer control depends on the requirement type */}
            {current.typ === 'fritext' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  submitText()
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Skriv ditt svar…"
                  className="h-11 flex-1 rounded-full border border-border bg-card px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <button
                  type="submit"
                  disabled={!text.trim()}
                  aria-label="Skicka"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm transition active:scale-90 disabled:opacity-40"
                >
                  <Send className="size-5" />
                </button>
              </form>
            )}

            {current.typ === 'val' && (
              <div className="flex flex-wrap gap-2">
                {(current.alternativ ?? ['Ja', 'Nej']).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => answerKrav(dok.id, current.id, opt)}
                    className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition active:scale-95"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {current.typ === 'fil' && (
              <button
                type="button"
                onClick={() =>
                  answerKrav(dok.id, current.id, `${current.id}-uppladdad.pdf`)
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/60 py-4 text-sm font-medium text-indigo-700 transition active:scale-[0.99]"
              >
                <Upload className="size-5" />
                Ladda upp {current.fraga.toLowerCase()}
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center px-4 py-6 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
              <CircleCheck className="size-7" />
            </span>
            <h1 className="mt-3 text-lg font-semibold">Tack! Allt är inskickat</h1>
            <p className="mt-1 max-w-[280px] text-sm text-muted-foreground">
              Din mäklare har fått allt som behövs. Du hör av oss om något
              behöver kompletteras.
            </p>
          </div>
        )}

        {/* Always-visible checklist so the buyer sees what is left */}
        <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Det här behöver vi
          </p>
          <ul className="space-y-2">
            {dok.krav.map((k) => {
              const klar = k.status === 'klar'
              const aktiv = current?.id === k.id
              return (
                <li key={k.id} className="flex items-center gap-2.5">
                  {klar ? (
                    <CircleCheck className="size-4 shrink-0 text-success" />
                  ) : (
                    <Circle
                      className={cn(
                        'size-4 shrink-0',
                        aktiv ? 'text-indigo-500' : 'text-muted-foreground/40',
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      'flex-1 text-sm',
                      klar && 'text-muted-foreground line-through',
                      aktiv && 'font-medium',
                    )}
                  >
                    {k.fraga}
                  </span>
                  {klar && k.kalla && k.kalla !== 'kopare' && (
                    <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                      hämtad
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
