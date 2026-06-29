import { describe, it, expect } from 'vitest'
import { mockLLM, CONFIRM_THRESHOLD } from './llm'
import type { SlotSpec } from './types'

// Phase 2 / Phase 6 eval harness: run good/bad answers through the Extractor →
// Judge pipeline (as the controller does) and measure. The real LLM judge swaps
// in behind the same interface; this set becomes its regression baseline.

function spec(p: Partial<SlotSpec> & { key: string }): SlotSpec {
  return {
    question: '',
    whyItMatters: '',
    inputKind: 'text',
    evidenceRequired: 'none',
    validation: { deterministic: [], rubric: '' },
    ...p,
  }
}

async function judge(s: SlotSpec, input: string, evidence = 0) {
  const value = await mockLLM.extract(s, input)
  return mockLLM.judge(s, value, evidence)
}

const sof = spec({ key: 'funds.kontantinsats.origin', guidanceType: 'source_of_funds', evidenceRequired: 'optional' })
const sofCash = spec({ key: 'funds.full.origin', guidanceType: 'source_of_funds', evidenceRequired: 'required' })
const pep = spec({ key: 'control.pep', inputKind: 'choice', guidanceType: 'pep' })
const tax = spec({ key: 'countries.tax_residency', inputKind: 'choice', guidanceType: 'tax_residency' })
const bo = spec({ key: 'control.beneficial_owner', inputKind: 'choice', guidanceType: 'beneficial_owner' })
const purpose = spec({ key: 'purpose', guidanceType: 'purpose' })
const loanFile = spec({ key: 'financing.loan', inputKind: 'file', evidenceRequired: 'required', guidanceType: 'loan_promise' })

describe('Judge — source of funds (recursive core)', () => {
  it('rejects a vague origin and chases', async () => {
    const r = await judge(sof, 'sparande')
    expect(r.satisfied).toBe(false)
    expect(r.followUp).toMatch(/bank|sparform/i)
  })
  it('accepts a specific, evidenced-or-optional origin', async () => {
    const r = await judge(sof, 'sparat från lön 2019–2024 på SEB, cirka 600000 kr')
    expect(r.satisfied).toBe(true)
  })
  it('cash full-origin requires evidence (soft)', async () => {
    const detailed = 'sålde min bostad 2023 för 3 000 000 kr'
    expect((await judge(sofCash, detailed, 0)).satisfied).toBe(false)
    expect((await judge(sofCash, detailed, 1)).satisfied).toBe(true)
  })
})

describe('Judge — risk flags', () => {
  it('flags PEP = Ja', async () => {
    const r = await judge(pep, 'Ja')
    expect(r.satisfied).toBe(true)
    expect(r.flags?.join(' ')).toMatch(/PEP/)
  })
  it('no flag for PEP = Nej', async () => {
    expect((await judge(pep, 'Nej')).flags ?? []).toHaveLength(0)
  })
  it('flags foreign tax residency', async () => {
    expect((await judge(tax, 'Ja')).flags?.join(' ')).toMatch(/hemvist/i)
  })
  it('flags buying for someone else', async () => {
    expect((await judge(bo, 'För annans räkning')).flags?.length).toBeGreaterThan(0)
  })
})

describe('Judge — confidence drives confirm', () => {
  it('thin free-text is low-confidence (→ confirm)', async () => {
    const r = await judge(purpose, 'bostad')
    expect(r.satisfied).toBe(true)
    expect(r.confidence).toBeLessThan(CONFIRM_THRESHOLD)
  })
  it('specific free-text passes directly', async () => {
    const r = await judge(purpose, 'Permanentbostad för min familj')
    expect(r.confidence).toBeGreaterThanOrEqual(CONFIRM_THRESHOLD)
  })
})

describe('Judge — accuracy on the held-out set', () => {
  const CASES: [SlotSpec, string, number, boolean][] = [
    [sof, 'sparande', 0, false],
    [sof, 'arv', 0, false],
    [sof, 'sparat från lön 2019–2024 på SEB, 600000 kr', 0, true],
    [sof, 'arv från min mormor 2021, cirka 500000 kr', 0, true],
    [sofCash, 'sålde bostad 2023 för 3000000 kr', 0, false],
    [sofCash, 'sålde bostad 2023 för 3000000 kr', 1, true],
    [pep, 'Nej', 0, true],
    [loanFile, '', 0, false],
    [loanFile, '', 1, true],
    [purpose, 'Permanentbostad för min familj', 0, true],
  ]

  it('scores ≥ 90% on labeled good/bad answers', async () => {
    let correct = 0
    for (const [s, input, ev, expected] of CASES) {
      const r = await judge(s, input, ev)
      if (r.satisfied === expected) correct++
    }
    const acc = correct / CASES.length
    // eslint-disable-next-line no-console
    console.log(`Judge accuracy: ${(acc * 100).toFixed(0)}% (${correct}/${CASES.length})`)
    expect(acc).toBeGreaterThanOrEqual(0.9)
  })
})
