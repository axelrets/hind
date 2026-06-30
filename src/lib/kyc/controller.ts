import type { Deal, Slot, SlotSpec, Message, SessionDoD } from './types'
import { buildSlots, initSlots, computeDoD } from './slots'
import { makeChildSourceSlot, originRecurses } from './sourceOfFunds'
import { mockLLM, CONFIRM_THRESHOLD, type LLMClient } from './llm'
import { uid } from '../utils'

// The room controller (spec §3): a goal-directed state machine over the slot
// spec. It owns the turn loop — pick next slot → Talker phrases it → buyer
// answers → Extractor structures it → Judge decides → advance or chase. The LLM
// does the talking and judging; the slot spec keeps it on rails.

export interface KycSession {
  id: string
  deal: Deal
  specs: SlotSpec[]
  slots: Slot[]
  messages: Message[]
  currentKey: string | null
  confirming: string | null // slot key awaiting a low-confidence confirm
  status: 'active' | 'review' | 'signed'
}

function m(
  sessionId: string,
  role: Message['role'],
  text: string,
  slotKey?: string,
): Message {
  return { id: uid('m'), sessionId, role, text, slotKey, ts: new Date().toISOString() }
}

export const specOf = (s: KycSession, key: string): SlotSpec | undefined =>
  s.specs.find((x) => x.key === key)
export const slotOf = (s: KycSession, key: string): Slot =>
  s.slots.find((x) => x.key === key)!
export const dod = (s: KycSession): SessionDoD => computeDoD(s.slots)

function updateSlot(s: KycSession, key: string, patch: Partial<Slot>): KycSession {
  return { ...s, slots: s.slots.map((sl) => (sl.key === key ? { ...sl, ...patch } : sl)) }
}

function nextPending(s: KycSession): string | null {
  const sl = s.slots.find((x) => x.status === 'pending' || x.status === 'in_progress')
  return sl ? sl.key : null
}

function insertAfter<T>(arr: T[], afterKey: string, item: T, keyOf: (x: T) => string): T[] {
  const i = arr.findIndex((x) => keyOf(x) === afterKey)
  return i < 0 ? [...arr, item] : [...arr.slice(0, i + 1), item, ...arr.slice(i + 1)]
}

const MAX_SOF_DEPTH = 3

// Source-of-funds recursion (spec §5): if a satisfied origin itself needs
// tracing (securities), spawn a child slot for the invested capital right after
// it. The child is a source-of-funds slot too, so it chases — and recurses
// again — until the chain bottoms out at a non-recursing, evidenced origin.
function maybeRecurse(s: KycSession, key: string): KycSession {
  const spec = specOf(s, key)
  if (!spec || spec.guidanceType !== 'source_of_funds') return s
  const slot = slotOf(s, key)
  const bucket =
    slot.value && typeof slot.value === 'object'
      ? ((slot.value as Record<string, unknown>).originBucket as string | null)
      : null
  if (!originRecurses(bucket)) return s

  const childKey = `${key}.kapital`
  if (s.specs.some((sp) => sp.key === childKey)) return s // already spawned
  if ((key.match(/\.kapital/g)?.length ?? 0) >= MAX_SOF_DEPTH) return s // cap depth

  const childSlot: Slot = {
    key: childKey,
    status: 'pending',
    value: null,
    confidence: 0,
    evidence: [],
    flags: [],
    followUpCount: 0,
  }
  return {
    ...s,
    specs: insertAfter(s.specs, key, makeChildSourceSlot(key), (x) => x.key),
    slots: insertAfter(s.slots, key, childSlot, (x) => x.key),
    messages: [
      ...s.messages,
      m(s.id, 'agent', 'Tack! Eftersom det rör värdepapper följer jag kapitalet ett steg till.'),
    ],
  }
}

/** Move to the next unsatisfied slot and have the Talker phrase it. */
export async function advance(s: KycSession, llm: LLMClient = mockLLM): Promise<KycSession> {
  const key = nextPending(s)
  if (!key) {
    return {
      ...s,
      currentKey: null,
      status: 'review',
      messages: [
        ...s.messages,
        m(
          s.id,
          'agent',
          'Tack – det var allt jag behövde! Granska gärna dina svar och signera med BankID, så skickar jag det till din mäklare.',
        ),
      ],
    }
  }
  const spec = specOf(s, key)!
  const text = await llm.talk(spec)
  const withStatus = updateSlot(s, key, { status: 'in_progress' })
  return {
    ...withStatus,
    currentKey: key,
    messages: [...withStatus.messages, m(s.id, 'agent', text, key)],
  }
}

/** Start a fresh session: build slots, greet, ask the first question. */
export async function createSession(deal: Deal, llm: LLMClient = mockLLM): Promise<KycSession> {
  const specs = buildSlots(deal)
  const base: KycSession = {
    id: uid('ses'),
    deal,
    specs,
    slots: initSlots(specs),
    messages: [],
    currentKey: null,
    confirming: null,
    status: 'active',
  }
  base.messages.push(
    m(
      base.id,
      'agent',
      'Hej och välkommen! Jag guidar dig steg för steg – det tar ungefär 10 minuter. Dina uppgifter är skyddade och krävs enligt lag. Vi tar en sak i taget.',
    ),
  )
  return advance(base, llm)
}

/** Buyer answered the active slot (free text or a chosen option). */
export async function submitAnswer(
  s: KycSession,
  input: string,
  llm: LLMClient = mockLLM,
): Promise<KycSession> {
  const key = s.currentKey
  if (!key || !input.trim()) return s
  const spec = specOf(s, key)!
  let session: KycSession = { ...s, messages: [...s.messages, m(s.id, 'buyer', input.trim(), key)] }

  const value = await llm.extract(spec, input.trim())
  const slot = slotOf(session, key)
  const judged = await llm.judge(spec, value, slot.evidence.length)
  const flags = [...slot.flags, ...(judged.flags ?? [])]

  if (judged.satisfied) {
    // Low confidence → confirm rather than silently pass.
    if (judged.confidence < CONFIRM_THRESHOLD) {
      session = updateSlot(session, key, { value, confidence: judged.confidence, flags })
      return {
        ...session,
        confirming: key,
        messages: [
          ...session.messages,
          m(s.id, 'agent', `Bara så jag förstår rätt – du skrev ”${input.trim()}”. Stämmer det?`, key),
        ],
      }
    }
    session = updateSlot(session, key, { status: 'satisfied', value, confidence: judged.confidence, flags })
    session = maybeRecurse(session, key)
    return advance(session, llm)
  }

  // Not satisfied → chase; cap it so the buyer is never trapped (soft gate).
  const fc = slot.followUpCount + 1
  if (fc >= 3) {
    session = updateSlot(session, key, {
      status: 'flagged',
      value,
      flags: [...flags, 'oklart efter uppföljning'],
      followUpCount: fc,
    })
    session = { ...session, messages: [...session.messages, m(s.id, 'agent', 'Vi låter din mäklare titta på den här – vi går vidare.')] }
    return advance(session, llm)
  }
  session = updateSlot(session, key, { value, confidence: judged.confidence, followUpCount: fc })
  const followUp = judged.followUp ?? spec.question
  return { ...session, messages: [...session.messages, m(s.id, 'agent', followUp, key)] }
}

/** Resolve a low-confidence confirm: yes → satisfied; no → re-ask the slot. */
export async function confirmAnswer(
  s: KycSession,
  yes: boolean,
  llm: LLMClient = mockLLM,
): Promise<KycSession> {
  const key = s.confirming
  if (!key) return s
  if (yes) {
    const session = updateSlot(
      { ...s, confirming: null, messages: [...s.messages, m(s.id, 'buyer', 'Ja, stämmer', key)] },
      key,
      { status: 'satisfied', confidence: 0.9 },
    )
    return advance(session, llm)
  }
  const spec = specOf(s, key)
  return {
    ...s,
    confirming: null,
    messages: [
      ...s.messages,
      m(s.id, 'buyer', 'Nej', key),
      m(s.id, 'agent', 'Inga problem – beskriv gärna lite tydligare.', key),
      m(s.id, 'agent', spec?.question ?? 'Försök igen.', key),
    ],
  }
}

/** Buyer uploaded a document for the active slot. */
export async function uploadFile(
  s: KycSession,
  filename: string,
  llm: LLMClient = mockLLM,
): Promise<KycSession> {
  const key = s.currentKey
  if (!key) return s
  const spec = specOf(s, key)!
  const slot0 = slotOf(s, key)
  const evidence = [
    ...slot0.evidence,
    { id: uid('doc'), kind: spec.guidanceType ?? 'doc', filename, uploadedAt: new Date().toISOString() },
  ]
  let session = updateSlot(s, key, { evidence })
  session = { ...session, messages: [...session.messages, m(s.id, 'buyer', `📎 ${filename}`, key)] }

  const slot = slotOf(session, key)
  const judged = await llm.judge(spec, slot.value ?? filename, slot.evidence.length)
  if (judged.satisfied) {
    session = updateSlot(session, key, { status: 'satisfied', confidence: judged.confidence })
    session = maybeRecurse(session, key)
    return advance(session, llm)
  }
  session = updateSlot(session, key, { followUpCount: slot.followUpCount + 1 })
  return {
    ...session,
    messages: [...session.messages, m(s.id, 'agent', judged.followUp ?? 'Tack! Något mer behövs här.', key)],
  }
}

/** No dead ends: "I'm not sure / I don't have this" flags gracefully (soft gate). */
export async function deferSlot(s: KycSession, llm: LLMClient = mockLLM): Promise<KycSession> {
  const key = s.currentKey
  if (!key) return s
  let session = updateSlot(s, key, { status: 'flagged', flags: ['uppskjutet av köparen'] })
  session = {
    ...session,
    messages: [
      ...session.messages,
      m(s.id, 'buyer', 'Jag är inte säker / har inte detta just nu', key),
      m(s.id, 'agent', 'Inga problem – jag flaggar det så tittar din mäklare på det. Vi går vidare.'),
    ],
  }
  return advance(session, llm)
}

/** Mock BankID attestation at review → signed. */
export function sign(s: KycSession): KycSession {
  return {
    ...s,
    status: 'signed',
    messages: [
      ...s.messages,
      m(s.id, 'agent', 'Signerat med BankID ✓ Allt är inskickat till din mäklare. Du hör av oss bara om något behöver en andra titt.'),
    ],
  }
}
