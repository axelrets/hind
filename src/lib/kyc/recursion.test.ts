import { describe, it, expect } from 'vitest'
import { createSession, submitAnswer, confirmAnswer, type KycSession } from './controller'
import type { Deal } from './types'

// Phase 3: source-of-funds recursion. A securities origin must spawn a child
// slot tracing the invested capital, recursing until it bottoms out.

const deal: Deal = {
  id: 't',
  objectType: 'villa',
  paymentType: 'cash',
  buyerType: 'individual',
  role: 'buyer',
}

// Drive the controller to a target slot by answering everything before it.
async function walkTo(s: KycSession, target: string): Promise<KycSession> {
  let cur = s
  let guard = 0
  while (cur.currentKey && cur.currentKey !== target && guard++ < 40) {
    if (cur.confirming) {
      cur = await confirmAnswer(cur, true)
      continue
    }
    const spec = cur.specs.find((x) => x.key === cur.currentKey)!
    const ans =
      spec.inputKind === 'choice'
        ? (spec.choices?.[0] ?? 'Ja')
        : 'Tydligt svar med detalj 123456'
    cur = await submitAnswer(cur, ans)
  }
  return cur
}

const CHILD = 'funds.kontantinsats.origin.kapital'

describe('Source-of-funds recursion (§5)', () => {
  it('a securities origin spawns a child slot for the invested capital', async () => {
    let s = await createSession(deal)
    s = await walkTo(s, 'funds.kontantinsats.origin')
    expect(s.currentKey).toBe('funds.kontantinsats.origin')

    s = await submitAnswer(s, 'aktier jag ägt sedan 2015, värda cirka 400000 kr')
    expect(s.specs.some((sp) => sp.key === CHILD)).toBe(true)
    expect(s.slots.some((sl) => sl.key === CHILD)).toBe(true)
    // Hind immediately asks the child question
    expect(s.currentKey).toBe(CHILD)
  })

  it('a non-recursing origin (savings) spawns no child', async () => {
    let s = await createSession(deal)
    s = await walkTo(s, 'funds.kontantinsats.origin')
    s = await submitAnswer(s, 'sparat från lön 2019-2024 på SEB, cirka 500000 kr')
    expect(s.specs.some((sp) => sp.key.endsWith('.kapital'))).toBe(false)
  })

  it('the chain bottoms out (securities → savings, no grandchild)', async () => {
    let s = await createSession(deal)
    s = await walkTo(s, 'funds.kontantinsats.origin')
    s = await submitAnswer(s, 'aktier jag ägt sedan 2015, värda cirka 400000 kr')
    expect(s.currentKey).toBe(CHILD)
    s = await submitAnswer(s, 'sparat från lön 2010-2015 på Swedbank, 400000 kr')
    expect(s.specs.some((sp) => sp.key.endsWith('.kapital.kapital'))).toBe(false)
  })
})
