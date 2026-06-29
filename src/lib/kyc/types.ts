// KYC Digital Room — core types (build plan v0.1, Phase 0).
// The room is a goal-directed state machine over a slot spec, not a freeform
// chat. These types are the contract the controller, models and UI share.

export type ObjectType = 'bostadsratt' | 'villa' | 'fritidshus'
export type PaymentType = 'loan' | 'cash' | 'unknown'
export type BuyerType = 'individual' | 'company'
export type PartyRole = 'buyer' | 'seller'

export interface Deal {
  id: string
  objectType: ObjectType
  paymentType: PaymentType
  buyerType: BuyerType
  role: PartyRole
}

export type EvidenceRequirement = 'required' | 'optional' | 'none'
export type GuidanceType =
  | 'identity'
  | 'source_of_funds'
  | 'loan_promise'
  | 'beneficial_owner'
  | 'pep'
  | 'tax_residency'
  | 'purpose'

export interface SlotValidation {
  deterministic: string[] // names of deterministic checks the Judge runs first
  rubric: string // explicit per-slot rubric for the LLM-as-judge step
}

// Static requirement definition produced by the motor (buildSlots) — §4 schema.
export interface SlotSpec {
  key: string
  question: string
  whyItMatters: string
  inputKind: 'text' | 'choice' | 'file'
  choices?: string[]
  evidenceRequired: EvidenceRequirement
  guidanceType?: GuidanceType
  validation: SlotValidation
  parentKey?: string // source-of-funds recursion (Phase 3)
}

export type SlotStatus = 'pending' | 'in_progress' | 'satisfied' | 'flagged'

export interface Evidence {
  id: string
  kind: string
  filename: string
  uploadedAt: string
}

// Runtime state of a slot within a session.
export interface Slot {
  key: string
  status: SlotStatus
  value: Record<string, unknown> | string | null
  confidence: number // 0–1
  evidence: Evidence[]
  flags: string[]
  followUpCount: number
}

export type SessionStatus = 'active' | 'review' | 'signed' | 'accepted'

export interface IntakeSession {
  id: string
  dealId: string
  role: PartyRole
  status: SessionStatus
  slots: Slot[]
  createdAt: string
  signedAt: string | null
}

// The explicit definition-of-done — the visible checklist for buyer + agent.
// Soft gate: complete when every required slot is satisfied OR flagged.
export interface SessionDoD {
  requiredKeys: string[]
  satisfied: string[]
  flagged: string[]
  complete: boolean
}

export interface Message {
  id: string
  sessionId: string
  role: 'agent' | 'buyer' | 'system'
  text: string
  slotKey?: string
  ts: string
}

export type FeedbackType =
  | 'agent_edit'
  | 'agent_reject'
  | 'escape_hatch'
  | 'stuck'
  | 'abandon'

export interface FeedbackEvent {
  id: string
  sessionId: string
  slotKey?: string
  type: FeedbackType
  payload: Record<string, unknown>
  ts: string
}

export interface GuidanceEntry {
  id: string
  evidenceType: GuidanceType
  what: string
  why: string
  whereToFind: string
  looksLike: string
}
