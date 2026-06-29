import { useEffect, useRef, useState } from 'react'
import {
  Sparkles,
  ShieldCheck,
  Send,
  Upload,
  Check,
  CircleDot,
  Circle,
  AlertCircle,
  ChevronDown,
  HelpCircle,
  RotateCcw,
} from 'lucide-react'
import {
  createSession,
  submitAnswer,
  uploadFile,
  deferSlot,
  confirmAnswer,
  sign,
  specOf,
  dod,
  type KycSession,
} from '@/lib/kyc/controller'
import { retrieveGuidance } from '@/lib/kyc/guidance'
import type { Deal } from '@/lib/kyc/types'
import { cn } from '@/lib/utils'

const DEMO_DEAL: Deal = {
  id: 'demo',
  objectType: 'villa',
  paymentType: 'cash',
  buyerType: 'individual',
  role: 'buyer',
}
const STORE_KEY = 'kyc_demo_session_v1'

const LABELS: Record<string, string> = {
  'buyer.identity': 'Identitet',
  'buyer.contact': 'Kontakt',
  'buyer.occupation': 'Sysselsättning',
  'object.share': 'Ägarandel',
  'financing.method': 'Finansiering',
  'financing.loan': 'Lånelöfte',
  'funds.kontantinsats.origin': 'Kontantinsats',
  'funds.full.origin': 'Källkontroll',
  purpose: 'Syfte',
  'control.beneficial_owner': 'Verklig huvudman',
  'control.ombud': 'Ombud',
  'control.pep': 'PEP',
  'countries.citizenship': 'Medborgarskap',
  'countries.tax_residency': 'Skattehemvist',
  'company.orgnr': 'Org-nr',
  'company.beneficial_owner': 'Huvudman (bolag)',
  attestation: 'Signering',
}
const label = (k: string) => LABELS[k] ?? k

function uploadName(g?: string): string {
  if (g === 'loan_promise') return 'lanelofte.pdf'
  if (g === 'source_of_funds') return 'underlag.pdf'
  if (g === 'identity') return 'bankid-signatur'
  return 'dokument.pdf'
}

export function KycRum() {
  const [session, setSession] = useState<KycSession | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const started = useRef(false)

  // Resume from localStorage, else start a fresh session.
  useEffect(() => {
    if (started.current) return
    started.current = true
    const saved = localStorage.getItem(STORE_KEY)
    if (saved) {
      try {
        setSession(JSON.parse(saved) as KycSession)
        return
      } catch {
        /* fall through to fresh */
      }
    }
    void createSession(DEMO_DEAL).then(setSession)
  }, [])

  useEffect(() => {
    if (session) localStorage.setItem(STORE_KEY, JSON.stringify(session))
  }, [session])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setGuideOpen(false)
  }, [session?.messages.length, busy])

  async function run(fn: (s: KycSession) => Promise<KycSession>) {
    if (!session || busy) return
    setBusy(true)
    const next = await fn(session)
    setSession(next)
    setBusy(false)
  }

  function reset() {
    localStorage.removeItem(STORE_KEY)
    setSession(null)
    started.current = false
    void createSession(DEMO_DEAL).then(setSession)
    started.current = true
  }

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-b from-indigo-50 to-background">
        <Sparkles className="size-6 animate-pulse text-indigo-400" />
      </div>
    )
  }

  const d = dod(session)
  const total = session.slots.length
  const current = session.currentKey ? specOf(session, session.currentKey) : null
  const guide =
    current?.guidanceType && current.evidenceRequired !== 'none'
      ? retrieveGuidance(current.question, current.guidanceType)
      : null

  return (
    <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-indigo-50 to-background">
      {/* Calm header with a small, accessible progress pill */}
      <header className="relative shrink-0 border-b border-border/50 bg-white/70 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
            <Sparkles className="size-4" />
          </span>
          <span className="text-[15px] font-semibold">
            hind<span className="text-indigo-600">.io</span>
          </span>
          <button
            type="button"
            onClick={() => setListOpen((v) => !v)}
            className="ml-auto flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground/80"
          >
            <Check className="size-3.5 text-success" />
            {d.satisfied.length}/{total}
            <ChevronDown className={cn('size-3.5 transition', listOpen && 'rotate-180')} />
          </button>
        </div>

        {listOpen && (
          <div className="absolute left-0 right-0 top-full z-10 max-h-[55vh] overflow-y-auto border-b border-border bg-white p-3 shadow-xl">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Din checklista
            </p>
            <ul className="space-y-1">
              {session.slots.map((sl) => {
                const Icon =
                  sl.status === 'satisfied'
                    ? Check
                    : sl.status === 'flagged'
                      ? AlertCircle
                      : sl.key === session.currentKey
                        ? CircleDot
                        : Circle
                const color =
                  sl.status === 'satisfied'
                    ? 'text-success'
                    : sl.status === 'flagged'
                      ? 'text-warning-foreground'
                      : sl.key === session.currentKey
                        ? 'text-indigo-500'
                        : 'text-muted-foreground/40'
                return (
                  <li key={sl.key} className="flex items-center gap-2.5 px-1 py-0.5 text-sm">
                    <Icon className={cn('size-4 shrink-0', color)} />
                    <span className={cn(sl.status === 'satisfied' && 'text-muted-foreground')}>
                      {label(sl.key)}
                    </span>
                    {sl.status === 'flagged' && (
                      <span className="ml-auto text-[10px] text-warning-foreground">flaggad</span>
                    )}
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              onClick={reset}
              className="mt-2 flex items-center gap-1.5 px-1 text-xs text-muted-foreground"
            >
              <RotateCcw className="size-3" />
              Börja om
            </button>
          </div>
        )}
      </header>

      {/* The conversation — the surface */}
      <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {session.messages.map((msg, i) => {
          const isAgent = msg.role === 'agent'
          const isActiveQ =
            isAgent &&
            msg.slotKey != null &&
            msg.slotKey === session.currentKey &&
            i === session.messages.length - 1
          return (
            <div key={msg.id}>
              <div className={cn('flex gap-2.5', isAgent ? 'justify-start' : 'justify-end')}>
                {isAgent && (
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                    <Sparkles className="size-3.5" />
                  </span>
                )}
                <div
                  className={cn(
                    'max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
                    isAgent
                      ? 'rounded-tl-sm border border-border bg-card'
                      : 'rounded-br-sm bg-indigo-600 text-white',
                  )}
                >
                  {msg.text}
                </div>
              </div>

              {/* Under the active question: a calm "why" + optional guidance */}
              {isActiveQ && current && (
                <div className="mt-1.5 pl-9">
                  <p className="text-xs text-muted-foreground">{current.whyItMatters}</p>
                  {guide && (
                    <>
                      <button
                        type="button"
                        onClick={() => setGuideOpen((v) => !v)}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-600"
                      >
                        <HelpCircle className="size-3.5" />
                        Var hittar jag det här?
                      </button>
                      {guideOpen && (
                        <div className="mt-1.5 rounded-xl border border-border bg-muted/40 p-3 text-xs leading-relaxed">
                          <p className="font-medium text-foreground">{guide.what}</p>
                          <p className="mt-1 text-muted-foreground">{guide.whereToFind}</p>
                          <p className="mt-1 text-muted-foreground/80">{guide.looksLike}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {busy && (
          <div className="flex items-center gap-2 pl-9 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 animate-pulse" />
            Hind skriver…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input dock — adapts to the active slot; never a dead end */}
      <div className="shrink-0 border-t border-border bg-white/80 p-3 backdrop-blur">
        {session.status === 'signed' ? (
          <p className="py-2 text-center text-sm text-muted-foreground">Klart – tack!</p>
        ) : session.status === 'review' ? (
          <button
            type="button"
            onClick={() => setSession(sign(session))}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99]"
          >
            <ShieldCheck className="size-5" />
            Signera med BankID
          </button>
        ) : session.confirming ? (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => run((s) => confirmAnswer(s, true))}
              className="flex-1 rounded-full bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              Ja, stämmer
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run((s) => confirmAnswer(s, false))}
              className="flex-1 rounded-full border border-border bg-card py-2.5 text-sm font-medium shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              Nej
            </button>
          </div>
        ) : current?.inputKind === 'choice' ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {(current.choices ?? ['Ja', 'Nej']).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={busy}
                  onClick={() => run((s) => submitAnswer(s, opt))}
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {opt}
                </button>
              ))}
            </div>
            <DeferLink busy={busy} onDefer={() => run(deferSlot)} />
          </div>
        ) : current?.inputKind === 'file' ? (
          <div className="space-y-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => run((s) => uploadFile(s, uploadName(current.guidanceType)))}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/60 py-3.5 text-sm font-medium text-indigo-700 transition active:scale-[0.99] disabled:opacity-50"
            >
              <Upload className="size-5" />
              {current.guidanceType === 'identity' ? 'Verifiera med BankID' : 'Ladda upp'}
            </button>
            <DeferLink busy={busy} label="Jag skickar det senare" onDefer={() => run(deferSlot)} />
          </div>
        ) : (
          <div className="space-y-2">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const v = input
                setInput('')
                void run((s) => submitAnswer(s, v))
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={busy}
                placeholder="Skriv ditt svar…"
                className="h-11 flex-1 rounded-full border border-border bg-card px-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Skicka"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm transition active:scale-90 disabled:opacity-40"
              >
                <Send className="size-5" />
              </button>
            </form>
            {current?.evidenceRequired !== 'none' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run((s) => uploadFile(s, uploadName(current?.guidanceType)))}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 py-2.5 text-xs font-medium text-indigo-700 transition active:scale-[0.99] disabled:opacity-50"
              >
                <Upload className="size-4" />
                Ladda upp underlag
              </button>
            )}
            <DeferLink busy={busy} onDefer={() => run(deferSlot)} />
          </div>
        )}
      </div>
    </div>
  )
}

function DeferLink({
  busy,
  label = 'Jag är inte säker',
  onDefer,
}: {
  busy: boolean
  label?: string
  onDefer: () => void
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onDefer}
      className="block w-full text-center text-xs text-muted-foreground transition active:scale-95 disabled:opacity-50"
    >
      {label} →
    </button>
  )
}
