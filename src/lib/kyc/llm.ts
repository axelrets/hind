import type { SlotSpec } from './types'
import { classifyOrigin, originFollowUp, originIsSpecific } from './sourceOfFunds'

// The three model jobs are separate and independently replaceable (spec §2):
// Talker phrases questions, Extractor turns text into structured fields, Judge
// decides "satisfied". v1 ships a deterministic mock behind this interface; the
// real LLM impl (edge function) arrives later with no caller changes.

export interface JudgeResult {
  satisfied: boolean
  missing: string[]
  followUp: string | null
  confidence: number // 0–1; below CONFIRM_THRESHOLD → controller asks a confirm
  flags?: string[] // risk/attention flags surfaced to the agent (PEP, foreign, …)
}

// Below this, the Judge is not confident enough to silently pass — confirm first.
export const CONFIRM_THRESHOLD = 0.7

export interface LLMClient {
  /** Phrase the active slot warmly; answer a buyer question if asked. */
  talk(spec: SlotSpec, buyerQuestion?: string): Promise<string>
  /** Free text → structured value for this slot. */
  extract(spec: SlotSpec, transcript: string): Promise<Record<string, unknown> | string>
  /** Deterministic checks first, rubric second. Never silently passes vague. */
  judge(
    spec: SlotSpec,
    value: Record<string, unknown> | string | null,
    evidenceCount: number,
  ): Promise<JudgeResult>
}

const asText = (v: unknown): string =>
  typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v)

export const mockLLM: LLMClient = {
  async talk(spec, buyerQuestion) {
    if (buyerQuestion) {
      return `${spec.question} (${spec.whyItMatters})`
    }
    return spec.question
  },

  async extract(spec, transcript) {
    const text = transcript.trim()
    if (spec.guidanceType === 'source_of_funds') {
      const origin = classifyOrigin(text)
      return { raw: text, originBucket: origin?.key ?? null }
    }
    return text
  },

  async judge(spec, value, evidenceCount) {
    const text = asText(value)
    const hasValue = text.trim().length > 0
    const needsEvidence = spec.evidenceRequired === 'required'
    const evidenceOk = !needsEvidence || evidenceCount > 0

    // Source-of-funds: deterministic origin check + specificity, then chase.
    if (spec.guidanceType === 'source_of_funds') {
      if (!hasValue) {
        return { satisfied: false, missing: ['origin'], followUp: spec.question, confidence: 0.2 }
      }
      if (!originIsSpecific(text)) {
        return {
          satisfied: false,
          missing: ['specifics'],
          followUp: originFollowUp(text),
          confidence: 0.4,
        }
      }
      const satisfied = evidenceOk
      return {
        satisfied,
        missing: satisfied ? [] : ['evidence'],
        followUp: satisfied ? null : 'Ladda gärna upp underlaget, eller markera att du skickar det senare.',
        confidence: satisfied ? 0.9 : 0.6,
      }
    }

    // Choice answers are explicit (high confidence); some raise an agent flag.
    if (spec.inputKind === 'choice') {
      const yes = /\bja\b/i.test(text)
      const flags: string[] = []
      if (spec.key === 'control.pep' && yes) flags.push('PEP – kräver skärpta åtgärder')
      if (spec.key === 'countries.tax_residency' && yes)
        flags.push('Skatterättslig hemvist utanför Sverige')
      if (spec.key === 'countries.citizenship' && yes) flags.push('Dubbelt medborgarskap')
      if (spec.key === 'control.ombud' && yes) flags.push('Företräds av ombud')
      if (spec.key === 'control.beneficial_owner' && /annans/i.test(text))
        flags.push('Köper för annans räkning – verklig huvudman måste fastställas')
      return { satisfied: hasValue, missing: hasValue ? [] : ['value'], followUp: null, confidence: 0.92, flags }
    }

    // File slots — satisfied once evidence is attached.
    if (spec.inputKind === 'file') {
      const ok = evidenceCount > 0
      return { satisfied: ok, missing: ok ? [] : ['evidence'], followUp: null, confidence: ok ? 0.9 : 0.3 }
    }

    // Free text — confidence scales with specificity; a thin answer is satisfied
    // but low-confidence, so the controller confirms rather than silently passing.
    if (!hasValue) return { satisfied: false, missing: ['value'], followUp: null, confidence: 0.2 }
    const conf = text.trim().length >= 12 ? 0.85 : 0.55
    return {
      satisfied: evidenceOk,
      missing: evidenceOk ? [] : ['evidence'],
      followUp: null,
      confidence: evidenceOk ? conf : 0.5,
    }
  },
}
