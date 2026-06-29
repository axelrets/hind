import type { Deal, Slot, SlotSpec, Message, SessionDoD } from './types'
import { buildSlots, initSlots, computeDoD } from './slots'
import { mockLLM, type LLMClient } from './llm'
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

  if (judged.satisfied) {
    session = updateSlot(session, key, { status: 'satisfied', value, confidence: judged.confidence })
    return advance(session, llm)
  }
  // Not satisfied → chase with a follow-up, stay on the slot.
  session = updateSlot(session, key, {
    value,
    confidence: judged.confidence,
    followUpCount: slot.followUpCount + 1,
  })
  const followUp = judged.followUp ?? spec.question
  return { ...session, messages: [...session.messages, m(s.id, 'agent', followUp, key)] }
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
