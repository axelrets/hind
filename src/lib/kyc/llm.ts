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
  confidence: number // 0–1
}

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

    const satisfied = hasValue && evidenceOk
    return {
      satisfied,
      missing: satisfied ? [] : needsEvidence && evidenceCount === 0 ? ['evidence'] : ['value'],
      followUp: satisfied ? null : null,
      confidence: satisfied ? 0.85 : 0.3,
    }
  },
}
