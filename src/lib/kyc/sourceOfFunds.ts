// Source-of-funds taxonomy (spec §5). The AI traces the money until it reaches
// a legitimate, evidenced origin. Vague answers are never accepted as final.
// Data, not code — new origins can be added without touching the engine.

import type { SlotSpec } from './types'

export interface OriginType {
  key: string
  label: string
  match: RegExp // detect the declared origin from free text
  followUps: string[] // specifying questions required before "satisfied"
  evidence: string // required evidence document
  guidanceType: 'source_of_funds'
  recurses?: boolean // securities → where the invested capital came from
}

export const ORIGIN_TAXONOMY: OriginType[] = [
  {
    // Checked before property_sale so "sålde aktier/fonder" is securities, not
    // a property sale (the generic "sål" would otherwise win).
    key: 'securities',
    label: 'Försäljning av värdepapper',
    match: /aktie|fond|värdepapper|krypto|bitcoin|portfölj/i,
    followUps: [
      'Vilket år sålde du, och varifrån kom kapitalet du ursprungligen investerade?',
    ],
    evidence: 'Avräkningsnota',
    guidanceType: 'source_of_funds',
    recurses: true,
  },
  {
    key: 'property_sale',
    label: 'Försäljning av bostad',
    match: /sål|salj|försälj|bostad|lägenhet|hus|villa|radhus|fastighet/i,
    followUps: ['Vilken bostad sålde du, vilket datum, och till vilket pris?'],
    evidence: 'Köpekontrakt eller likvidavräkning',
    guidanceType: 'source_of_funds',
  },
  {
    key: 'savings',
    label: 'Sparande',
    match: /spar|sparkonto|sparande|buffert|sparat/i,
    followUps: [
      'Vilken bank, över hur lång tid har du sparat, och från vilken inkomst?',
    ],
    evidence: 'Kontoutdrag',
    guidanceType: 'source_of_funds',
  },
  {
    key: 'inheritance',
    label: 'Arv',
    match: /arv|ärvd|ärvt|dödsbo|bortgång/i,
    followUps: ['Från vem kommer arvet och vilket år?'],
    evidence: 'Bouppteckning eller arvskifte',
    guidanceType: 'source_of_funds',
  },
  {
    key: 'gift',
    label: 'Gåva',
    match: /gåva|gava|present|gett mig|fick av/i,
    followUps: ['Från vem kommer gåvan och vilken relation har ni?'],
    evidence: 'Gåvobrev',
    guidanceType: 'source_of_funds',
  },
  {
    key: 'salary',
    label: 'Lön / inkomst',
    match: /lön|lon|inkomst|jobb|arbet|anställ/i,
    followUps: ['Vilken arbetsgivare och roll?'],
    evidence: 'Lönespecifikation',
    guidanceType: 'source_of_funds',
  },
]

/** Identify which legitimate origin bucket a free-text answer names, if any. */
export function classifyOrigin(text: string): OriginType | null {
  return ORIGIN_TAXONOMY.find((o) => o.match.test(text)) ?? null
}

/** The follow-up Hind asks to make a declared origin specific enough. */
export function originFollowUp(text: string): string {
  const o = classifyOrigin(text)
  if (o) return o.followUps[0]
  return 'Kan du specificera källan – vilken bank eller källa, belopp och tidsperiod?'
}

/** An answer is concrete enough only if it names an origin and carries detail
 *  (a figure/year). Otherwise the Judge chases it. */
export function originIsSpecific(text: string): boolean {
  const t = text.trim()
  return classifyOrigin(t) !== null && t.length >= 40 && /\d/.test(t)
}

/** Does the declared origin need its own source traced (recursion §5)? */
export function originRecurses(bucketKey: string | null): boolean {
  return ORIGIN_TAXONOMY.some((o) => o.key === bucketKey && o.recurses === true)
}

/** A child source-of-funds slot tracing where an investment's capital came
 *  from. It is itself a source-of-funds slot, so it chases — and recurses
 *  again if that capital was also securities — until the chain bottoms out. */
export function makeChildSourceSlot(parentKey: string): SlotSpec {
  return {
    key: `${parentKey}.kapital`,
    question: 'Och varifrån kom kapitalet du ursprungligen investerade?',
    whyItMatters: 'Källan måste spåras hela vägen till en laglig grund.',
    inputKind: 'text',
    evidenceRequired: 'optional',
    guidanceType: 'source_of_funds',
    validation: {
      deterministic: ['originBucketIdentified'],
      rubric:
        'Satisfied when the invested capital traces to a concrete legitimate origin.',
    },
    parentKey,
  }
}
